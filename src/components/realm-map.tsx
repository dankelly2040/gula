import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Path,
  Points,
  RadialGradient,
  Skia,
  Text as SkiaText,
  useFont,
  vec,
  type SkFont,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Easing,
  Extrapolation,
  interpolate,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import linesJson from '@/data/realm-lines.json';
import { colors } from '@/constants/theme';
import type { City, CityPlace, Line } from '@/features/city';
import { cellCorners, growBounds, type Bounds, type LatLng } from '@/features/grid';
import {
  DISTRICTS,
  LATE_LABEL_DISTRICTS,
  PLACES,
  SEATTLE,
  heatSources,
  kingdomForPoint,
  type Eaten,
  type Kingdom,
  type Place,
} from '@/features/realm';

// The Realm map, drawn by the app instead of a map service, so nothing is on
// it that was not put there. It shows the real city: water in the faintest
// grey with the shore as a thin red line, streets as quiet grey lines, and
// place names. The city comes from OpenStreetMap tiles (features/city), read
// as plain coordinates and drawn here in the app's own look. Heat goes on
// top. Kingdoms are cells of the world grid, but the grid itself is not
// drawn: only the kingdom the user opens shows its shape.
//
// Until the city has loaded, or when it cannot be loaded, the map falls back
// to what ships with the app: Seattle's outline and district names.
//
// Everything is drawn once into paths in "base" coordinates (the region
// fitted to the view). Moving and zooming only changes one transform on the
// UI thread, and line widths are divided by the zoom so they stay the same
// thickness on screen.

// The district borders in the file are not drawn since the grid: a district
// is no longer a kingdom.
const LINES = linesJson as { outline: LatLng[][]; borders: LatLng[][] };

export type RealmSelection =
  | { kind: 'kingdom'; kingdom: Kingdom }
  | { kind: 'place'; place: Place }
  | null;

/** A name to write on the map, at a coordinate. */
type Props = {
  /** The part of the world the map is fitted to. See homeRegion in features/realm. */
  region: Bounds;
  /** Where the phone is, when the user has allowed location. */
  me: { lat: number; lng: number } | null;
  /** The real city for this region, once it has loaded. */
  city: City | null;
  yourEaten: Eaten[];
  rivalEaten: Eaten[];
  selection: RealmSelection;
  onSelect: (next: RealmSelection) => void;
  /**
   * Called when the user has dragged the map well away from the middle of
   * its region. The owner answers with a region around this coordinate, and
   * the map keeps the same view over it, so the drag can go on to the next
   * part of the world.
   */
  onMove: (center: { lat: number; lng: number }) => void;
  /** Space at the bottom that other UI always covers (tab bar, log button). */
  restBottom: number;
  /** Space at the bottom the detail panel covers while something is selected. */
  panelBottom: number;
};

// --- Line weights, in screen points -------------------------------------------
const OUTLINE_WIDTH = 1.4;
const SHORE_WIDTH = 1.2;
const MAJOR_ROAD_WIDTH = 0.9;
const MINOR_ROAD_WIDTH = 0.5;
const FOCUS_WIDTH = 2;

// --- Zoom ---------------------------------------------------------------------
const MIN_SCALE = 1;
const MAX_SCALE = 16;
const LABELS_FROM = 1.45; // district names fade in as the user moves in
const LATE_LABELS_FROM = 2.6; // the six in the crowded middle wait longer
const PLACES_FROM = 3.4; // pizza places appear closer still
const PLACE_TAP_REACH = 18; // screen points

// --- Heat ---------------------------------------------------------------------
// A glow's size on screen at city zoom, from the points eaten at that spot.
const HEAT_MIN_RADIUS = 15;
const HEAT_RADIUS_PER_POINT = 0.42;
const HEAT_MAX_RADIUS = 52;
// Glows grow as the user zooms in, but slower than the map does, so a hot
// spot stays a spot.
const HEAT_ZOOM_GROWTH = 0.55;

const YOU_RGB = '200, 16, 46'; // colors.brand
const RIVAL_RGB = '31, 27, 27'; // colors.ink
// The city is the ground the heat sits on, so it stays quiet: no blue, water
// one step off white, streets in thin ink. Only the shore is red.
const WATER_COLOR = '#F2F3F5';
const MAJOR_ROAD_COLOR = `rgba(${RIVAL_RGB}, 0.26)`;
const MINOR_ROAD_COLOR = `rgba(${RIVAL_RGB}, 0.13)`;

const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

// --- Projection -----------------------------------------------------------------
// At city scale a plain "degrees times cos(latitude)" projection is exact
// enough, and it is trivially reversible for taps.

// The map can be dragged this far past the region, as a share of its size,
// so the city is loaded and drawn that far out as well.
export const CITY_OVERDRAW = 0.35;
// When the view comes to rest this far from the middle of the region, as a
// share of the region's size, the map asks for a region around the view. It
// is less than CITY_OVERDRAW, so the ask always comes before the hard stop.
const MOVE_AFTER = 0.2;

// Place names arrive in three steps as the user moves in. Each step only
// takes the names that have room at that zoom.
const NAME_STEPS: (number | undefined)[] = [undefined, 2.2, 4.5];

type Projection = {
  toBase: (lat: number, lng: number) => { x: number; y: number };
  toLatLng: (x: number, y: number) => { lat: number; lng: number };
};

function fit(width: number, height: number, restBottom: number, region: Bounds): Projection {
  const squash = Math.cos((((region.minLat + region.maxLat) / 2) * Math.PI) / 180);
  const worldWidth = (region.maxLng - region.minLng) * squash;
  const worldHeight = region.maxLat - region.minLat;
  const padX = 22;
  const padTop = 18;
  const usableHeight = height - padTop - restBottom - 12;
  const k = Math.min((width - padX * 2) / worldWidth, usableHeight / worldHeight);
  const left = (width - worldWidth * k) / 2;
  const top = padTop + (usableHeight - worldHeight * k) / 2;
  return {
    toBase: (lat, lng) => ({
      x: left + (lng - region.minLng) * squash * k,
      y: top + (region.maxLat - lat) * k,
    }),
    toLatLng: (x, y) => ({
      lat: region.maxLat - (y - top) / k,
      lng: region.minLng + (x - left) / (squash * k),
    }),
  };
}

function overlaps(a: Bounds, b: Bounds): boolean {
  return (
    a.minLat <= b.maxLat && a.maxLat >= b.minLat && a.minLng <= b.maxLng && a.maxLng >= b.minLng
  );
}

/** Lines given as [lat, lng, lat, lng, ...] as one path. */
function cityPath(lines: Line[], project: Projection, close: boolean) {
  const builder = Skia.PathBuilder.Make();
  for (const line of lines) {
    for (let i = 0; i < line.length; i += 2) {
      const { x, y } = project.toBase(line[i], line[i + 1]);
      if (i === 0) builder.moveTo(x, y);
      else builder.lineTo(x, y);
    }
    if (close) builder.close();
  }
  return builder.detach();
}

type NameLabel = { id: string; text: string; x: number; y: number; from?: number };

const KIND_ORDER: Record<CityPlace['kind'], number> = { city: 0, suburb: 1, town: 1 };

/**
 * Chooses which place names to write and when. The most important names go
 * first; a name is only taken at a step if, at that step's zoom, it does not
 * touch a name already taken.
 */
function placeNames(
  places: CityPlace[],
  project: Projection,
  font: SkFont,
  /** A point the names must stay clear of: the user's own mark and its word. */
  keepClear: { x: number; y: number } | null
): NameLabel[] {
  const ordered = [...places].sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.rank - b.rank || a.name.localeCompare(b.name)
  );
  const waiting = ordered.map((place) => {
    const text = place.name.toUpperCase();
    return { text, width: font.measureText(text).width + 14, ...project.toBase(place.lat, place.lng) };
  });
  const taken: (NameLabel & { width: number })[] = [];
  const height = 20;
  const markReach = 30;
  for (const from of NAME_STEPS) {
    const zoom = from ?? 1;
    for (let i = 0; i < waiting.length; i++) {
      const name = waiting[i];
      if (!name) continue;
      const clear = taken.every(
        (other) =>
          Math.abs(other.x - name.x) * zoom >= (other.width + name.width) / 2 ||
          Math.abs(other.y - name.y) * zoom >= height
      );
      const onMark =
        keepClear !== null &&
        Math.abs(keepClear.x - name.x) * zoom < name.width / 2 + markReach / 2 &&
        Math.abs(keepClear.y - name.y) * zoom < markReach;
      if (!clear || onMark) continue;
      taken.push({ id: `${name.text}:${i}`, text: name.text, x: name.x, y: name.y, from, width: name.width });
      waiting[i] = null as never;
    }
  }
  return taken;
}

function linePath(lines: LatLng[][], project: Projection, close: boolean) {
  const builder = Skia.PathBuilder.Make();
  for (const line of lines) {
    line.forEach(([lat, lng], i) => {
      const { x, y } = project.toBase(lat, lng);
      if (i === 0) builder.moveTo(x, y);
      else builder.lineTo(x, y);
    });
    if (close) builder.close();
  }
  return builder.detach();
}

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, value));
}

export function RealmMap({
  region,
  me,
  city,
  yourEaten,
  rivalEaten,
  selection,
  onSelect,
  onMove,
  restBottom,
  panelBottom,
}: Props) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const labelFont = useFont(
    require('@expo-google-fonts/montserrat/800ExtraBold/Montserrat_800ExtraBold.ttf'),
    10.5
  );

  // The camera: screen = base * scale + (tx, ty).
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const grab = useSharedValue({ scale: 1, tx: 0, ty: 0, x: 0, y: 0 });
  // How many of the two glides after a drag are still running.
  const glides = useSharedValue(0);

  const width = size?.width ?? 0;
  const height = size?.height ?? 0;

  const scene = useMemo(() => {
    if (!size) return null;
    const project = fit(size.width, size.height, restBottom, region);
    // Seattle's outline, names and places, when any of Seattle can come into view.
    const seattle = overlaps(growBounds(region, CITY_OVERDRAW), SEATTLE);
    return {
      project,
      outline: seattle ? linePath(LINES.outline, project, true) : null,
      labels: seattle
        ? DISTRICTS.map((d) => ({
            id: d.id,
            text: d.name.toUpperCase(),
            late: LATE_LABEL_DISTRICTS.has(d.id),
            ...project.toBase(d.center[0], d.center[1]),
          }))
        : [],
      places: PLACES.map((p) => vec(project.toBase(p.lat, p.lng).x, project.toBase(p.lat, p.lng).y)),
    };
  }, [size, restBottom, region]);

  // The real city, as paths. This is the big piece of work on the screen, so
  // it only runs again for a new city or a new view size.
  const ground = useMemo(() => {
    if (!scene || !city) return null;
    return {
      water: cityPath(city.water, scene.project, true),
      shore: cityPath(city.coast, scene.project, false),
      majorRoads: cityPath(city.majorRoads, scene.project, false),
      minorRoads: cityPath(city.minorRoads, scene.project, false),
    };
  }, [scene, city]);

  const mePoint = scene && me ? scene.project.toBase(me.lat, me.lng) : null;
  const cityNames = useMemo(() => {
    if (!scene || !city || !labelFont) return [];
    const drawn = growBounds(region, CITY_OVERDRAW);
    const inside = city.places.filter(
      (p) =>
        p.lat >= drawn.minLat && p.lat <= drawn.maxLat && p.lng >= drawn.minLng && p.lng <= drawn.maxLng
    );
    return placeNames(inside, scene.project, labelFont, mePoint);
    // The mark's point is two numbers, new on every render; its coordinates say when it moved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, city, region, labelFont, mePoint?.x, mePoint?.y]);

  // The view the map asked to keep when it called onMove: a coordinate, the
  // point of the screen it was at, and the zoom.
  const carried = useSharedValue<{
    lat: number;
    lng: number;
    x: number;
    y: number;
    scale: number;
  } | null>(null);

  // A region the map asked for keeps the view it had, so a drag goes on
  // without a jump. Any other new region is a new map: the camera goes back
  // to the whole of it.
  useEffect(() => {
    const keep = carried.get();
    carried.set(null);
    if (keep && scene) {
      const at = scene.project.toBase(keep.lat, keep.lng);
      scale.set(keep.scale);
      tx.set(keep.x - at.x * keep.scale);
      ty.set(keep.y - at.y * keep.scale);
      return;
    }
    scale.set(1);
    tx.set(0);
    ty.set(0);
    // The scene is the one made for this region in the same render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, scale, tx, ty, carried]);

  // Called when a drag or a pinch comes to rest. If the middle of the open
  // part of the view is far from the middle of the region, ask for a region
  // around it.
  const settle = (restTx: number, restTy: number, zoom: number) => {
    // One ask at a time: the answer to the first has not been drawn yet.
    if (!scene || carried.get()) return;
    const x = width / 2;
    const y = (height - restBottom) / 2;
    const { lat, lng } = scene.project.toLatLng((x - restTx) / zoom, (y - restTy) / zoom);
    const offLat = Math.abs(lat - (region.minLat + region.maxLat) / 2);
    const offLng = Math.abs(lng - (region.minLng + region.maxLng) / 2);
    if (
      offLat < (region.maxLat - region.minLat) * MOVE_AFTER &&
      offLng < (region.maxLng - region.minLng) * MOVE_AFTER
    ) {
      return;
    }
    carried.set({ lat, lng, x, y, scale: zoom });
    onMove({ lat, lng });
  };

  // The kingdom the selection is in, as a shape.
  const focusKingdom =
    selection?.kind === 'kingdom'
      ? selection.kingdom
      : selection?.kind === 'place'
        ? kingdomForPoint(selection.place.lat, selection.place.lng)
        : null;
  const focusPath = useMemo(
    () => (scene && focusKingdom ? linePath([cellCorners(focusKingdom)], scene.project, true) : null),
    // The id says which kingdom it is; the object is new on every tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scene, focusKingdom?.id]
  );

  const heat = useMemo(() => {
    if (!scene) return [];
    const glows = (owner: 'you' | 'rival', eaten: Eaten[]) =>
      heatSources(eaten).map((source) => ({
        key: `${owner}:${source.lat},${source.lng}`,
        rgb: owner === 'you' ? YOU_RGB : RIVAL_RGB,
        radius: Math.min(
          HEAT_MAX_RADIUS,
          HEAT_MIN_RADIUS + source.points * HEAT_RADIUS_PER_POINT
        ),
        ...scene.project.toBase(source.lat, source.lng),
      }));
    // Rival first, so your heat draws on top where the two overlap.
    return [...glows('rival', rivalEaten), ...glows('you', yourEaten)];
  }, [scene, rivalEaten, yourEaten]);

  // --- Camera moves to a selection ----------------------------------------------
  const focusKey =
    selection?.kind === 'kingdom'
      ? `k:${selection.kingdom.id}`
      : selection?.kind === 'place'
        ? `p:${selection.place.id}`
        : null;

  useEffect(() => {
    if (!scene || !selection || !size) return;
    // The part of the view the panel leaves open.
    const openHeight = size.height - panelBottom;
    let target: { x: number; y: number; scale: number };

    if (selection.kind === 'kingdom') {
      const bounds = linePath([cellCorners(selection.kingdom)], scene.project, true).getBounds();
      const fitScale = Math.min(
        (size.width * 0.7) / Math.max(bounds.width, 1),
        (openHeight * 0.7) / Math.max(bounds.height, 1)
      );
      target = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
        scale: clamp(fitScale, 1.9, 7),
      };
    } else {
      const at = scene.project.toBase(selection.place.lat, selection.place.lng);
      target = { ...at, scale: Math.max(scale.get(), 6.5) };
    }

    const move = { duration: 460, easing: EASE_IN_OUT };
    scale.set(withTiming(target.scale, move));
    tx.set(withTiming(size.width / 2 - target.x * target.scale, move));
    ty.set(withTiming(openHeight / 2 - target.y * target.scale, move));
    // Only a new selection moves the camera, not a resize or a re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  // --- Gestures -------------------------------------------------------------------
  const handleTap = (bx: number, by: number, zoom: number) => {
    if (!scene) return;
    if (zoom >= PLACES_FROM) {
      const reach = PLACE_TAP_REACH / zoom;
      let best: Place | null = null;
      let bestDistance = reach;
      PLACES.forEach((place, i) => {
        const d = Math.hypot(scene.places[i].x - bx, scene.places[i].y - by);
        if (d < bestDistance) {
          best = place;
          bestDistance = d;
        }
      });
      if (best) {
        onSelect({ kind: 'place', place: best });
        return;
      }
    }
    const { lat, lng } = scene.project.toLatLng(bx, by);
    onSelect({ kind: 'kingdom', kingdom: kingdomForPoint(lat, lng) });
  };

  const gesture = useMemo(() => {
    // How far the map may be dragged off: a third of the view past each edge.
    const limits = (s: number) => {
      'worklet';
      return {
        minX: width - width * s - width * 0.35,
        maxX: width * 0.35,
        minY: height - height * s - height * 0.35,
        maxY: height * 0.35,
      };
    };

    const pan = Gesture.Pan()
      .maxPointers(1)
      .onStart(() => {
        grab.set({ scale: scale.get(), tx: tx.get(), ty: ty.get(), x: 0, y: 0 });
      })
      .onUpdate((e) => {
        const start = grab.get();
        const l = limits(scale.get());
        tx.set(clamp(start.tx + e.translationX, l.minX, l.maxX));
        ty.set(clamp(start.ty + e.translationY, l.minY, l.maxY));
      })
      .onEnd((e) => {
        const l = limits(scale.get());
        // When both glides have stopped by themselves, see if the map has to
        // follow. A glide that a new touch cut short does not count.
        glides.set(2);
        const rest = (finished?: boolean) => {
          'worklet';
          if (!finished) return;
          glides.set(glides.get() - 1);
          if (glides.get() === 0) scheduleOnRN(settle, tx.get(), ty.get(), scale.get());
        };
        tx.set(withDecay({ velocity: e.velocityX, clamp: [l.minX, l.maxX] }, rest));
        ty.set(withDecay({ velocity: e.velocityY, clamp: [l.minY, l.maxY] }, rest));
      });

    // Two fingers zoom about the point between them, and carry the map along
    // if that point moves.
    const pinch = Gesture.Pinch()
      .onStart((e) => {
        grab.set({ scale: scale.get(), tx: tx.get(), ty: ty.get(), x: e.focalX, y: e.focalY });
      })
      .onUpdate((e) => {
        const start = grab.get();
        const next = clamp(start.scale * e.scale, MIN_SCALE, MAX_SCALE);
        const ratio = next / start.scale;
        const l = limits(next);
        scale.set(next);
        tx.set(clamp(e.focalX - (start.x - start.tx) * ratio, l.minX, l.maxX));
        ty.set(clamp(e.focalY - (start.y - start.ty) * ratio, l.minY, l.maxY));
      })
      .onEnd(() => {
        scheduleOnRN(settle, tx.get(), ty.get(), scale.get());
      });

    const tap = Gesture.Tap()
      .maxDistance(8)
      .onEnd((e, success) => {
        if (!success) return;
        const s = scale.get();
        scheduleOnRN(handleTap, (e.x - tx.get()) / s, (e.y - ty.get()) / s, s);
      });

    return Gesture.Race(Gesture.Simultaneous(pan, pinch), tap);
    // handleTap closes over the scene and the callback, which change with them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, scene, onSelect, onMove, region, restBottom]);

  // --- Values every frame derives from the zoom -----------------------------------
  const camera = useDerivedValue(() => [
    { translateX: tx.value },
    { translateY: ty.value },
    { scale: scale.value },
  ]);
  const outlineWidth = useDerivedValue(() => OUTLINE_WIDTH / scale.value);
  const shoreWidth = useDerivedValue(() => SHORE_WIDTH / scale.value);
  const majorRoadWidth = useDerivedValue(() => MAJOR_ROAD_WIDTH / scale.value);
  const minorRoadWidth = useDerivedValue(() => MINOR_ROAD_WIDTH / scale.value);
  const focusWidth = useDerivedValue(() => FOCUS_WIDTH / scale.value);
  const placeOuter = useDerivedValue(() => 8 / scale.value);
  const placeInner = useDerivedValue(() => 4.6 / scale.value);
  const placesOpacity = useDerivedValue(() =>
    interpolate(scale.value, [PLACES_FROM - 0.5, PLACES_FROM], [0, 1], Extrapolation.CLAMP)
  );
  const selectedOuter = useDerivedValue(() => 9 / scale.value);
  const selectedInner = useDerivedValue(() => 5 / scale.value);
  const meRing = useDerivedValue(() => 13 / scale.value);
  const meRingWidth = useDerivedValue(() => 1.4 / scale.value);
  const meOuter = useDerivedValue(() => 8 / scale.value);
  const meInner = useDerivedValue(() => 5.5 / scale.value);

  const selectedPlace =
    scene && selection?.kind === 'place'
      ? scene.project.toBase(selection.place.lat, selection.place.lng)
      : null;

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.fill}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          if (w !== size?.width || h !== size?.height) setSize({ width: w, height: h });
        }}
        accessible
        accessibilityRole="image"
        accessibilityLabel="Map of kingdoms, with heat where pizza has been eaten"
      >
        {scene ? (
          <Canvas style={styles.fill}>
            <Group transform={camera}>
              {/* The city: water, streets, then the shore on top of both. */}
              {ground ? (
                <>
                  <Path path={ground.water} color={WATER_COLOR} />
                  <Path
                    path={ground.minorRoads}
                    style="stroke"
                    strokeWidth={minorRoadWidth}
                    strokeJoin="round"
                    strokeCap="round"
                    color={MINOR_ROAD_COLOR}
                  />
                  <Path
                    path={ground.majorRoads}
                    style="stroke"
                    strokeWidth={majorRoadWidth}
                    strokeJoin="round"
                    strokeCap="round"
                    color={MAJOR_ROAD_COLOR}
                  />
                  <Path
                    path={ground.shore}
                    style="stroke"
                    strokeWidth={shoreWidth}
                    strokeJoin="round"
                    strokeCap="round"
                    color={colors.brand}
                  />
                </>
              ) : scene.outline ? (
                <Path
                  path={scene.outline}
                  style="stroke"
                  strokeWidth={outlineWidth}
                  strokeJoin="round"
                  color={colors.brand}
                />
              ) : null}

              {heat.map((glow) => (
                <HeatGlow
                  key={glow.key}
                  x={glow.x}
                  y={glow.y}
                  radius={glow.radius}
                  rgb={glow.rgb}
                  scale={scale}
                />
              ))}

              {focusPath ? <Path path={focusPath} color={`rgba(${YOU_RGB}, 0.07)`} /> : null}
              {focusPath ? (
                <Path
                  path={focusPath}
                  style="stroke"
                  strokeWidth={focusWidth}
                  strokeJoin="round"
                  color={colors.brand}
                />
              ) : null}

              {/* Pizza places: small rings that appear when the user is close. */}
              <Group opacity={placesOpacity}>
                <Points
                  points={scene.places}
                  mode="points"
                  strokeCap="round"
                  strokeWidth={placeOuter}
                  color={colors.ink}
                />
                <Points
                  points={scene.places}
                  mode="points"
                  strokeCap="round"
                  strokeWidth={placeInner}
                  color={colors.surface}
                />
              </Group>
              {selectedPlace ? (
                <>
                  <Circle cx={selectedPlace.x} cy={selectedPlace.y} r={selectedOuter} color={colors.surface} />
                  <Circle cx={selectedPlace.x} cy={selectedPlace.y} r={selectedInner} color={colors.brand} />
                </>
              ) : null}

              {labelFont && !ground
                ? scene.labels.map((label) => (
                    <MapLabel
                      key={label.id}
                      text={label.text}
                      x={label.x}
                      y={label.y}
                      from={label.late ? LATE_LABELS_FROM : LABELS_FROM}
                      font={labelFont}
                      scale={scale}
                    />
                  ))
                : null}
              {labelFont
                ? cityNames.map((label) => (
                    <MapLabel
                      key={label.id}
                      text={label.text}
                      x={label.x}
                      y={label.y}
                      from={label.from}
                      font={labelFont}
                      scale={scale}
                    />
                  ))
                : null}

              {/* You are here: a red dot in a ring, with the word under it. */}
              {mePoint ? (
                <>
                  <Circle
                    cx={mePoint.x}
                    cy={mePoint.y}
                    r={meRing}
                    style="stroke"
                    strokeWidth={meRingWidth}
                    color={colors.brand}
                  />
                  <Circle cx={mePoint.x} cy={mePoint.y} r={meOuter} color={colors.surface} />
                  <Circle cx={mePoint.x} cy={mePoint.y} r={meInner} color={colors.brand} />
                  {labelFont ? (
                    <MapLabel
                      text="YOU"
                      x={mePoint.x}
                      y={mePoint.y}
                      below={27}
                      color={colors.brand}
                      font={labelFont}
                      scale={scale}
                    />
                  ) : null}
                </>
              ) : null}
            </Group>
          </Canvas>
        ) : null}
      </View>
    </GestureDetector>
  );
}

/** One hot spot: a radial fade from strong at the middle to nothing at the edge. */
function HeatGlow({
  x,
  y,
  radius,
  rgb,
  scale,
}: {
  x: number;
  y: number;
  radius: number;
  rgb: string;
  scale: SharedValue<number>;
}) {
  // On screen the glow grows as scale^HEAT_ZOOM_GROWTH, so in base
  // coordinates it shrinks as the camera moves in.
  const r = useDerivedValue(() => radius * Math.pow(scale.value, HEAT_ZOOM_GROWTH - 1));
  return (
    <Circle cx={x} cy={y} r={r}>
      <RadialGradient
        c={vec(x, y)}
        r={r}
        colors={[`rgba(${rgb}, 0.5)`, `rgba(${rgb}, 0.2)`, `rgba(${rgb}, 0)`]}
        positions={[0, 0.45, 1]}
      />
    </Circle>
  );
}

/**
 * A name in the sign capitals, the same size at every zoom. With `from` it
 * stays hidden until the user has moved in that far. `below` moves it down
 * from its point, in screen points.
 */
function MapLabel({
  text,
  x,
  y,
  from,
  below = 4,
  color = colors.ink,
  font,
  scale,
}: {
  text: string;
  x: number;
  y: number;
  from?: number;
  below?: number;
  color?: string;
  font: SkFont;
  scale: SharedValue<number>;
}) {
  const textWidth = useMemo(() => font.measureText(text).width, [font, text]);
  const transform = useDerivedValue(() => [
    { translateX: x },
    { translateY: y },
    { scale: 1 / scale.value },
  ]);
  const opacity = useDerivedValue(() =>
    from === undefined
      ? 1
      : interpolate(scale.value, [from, from + 0.3], [0, 1], Extrapolation.CLAMP)
  );
  return (
    <Group transform={transform} opacity={opacity}>
      {/* A white edge keeps the name readable over lines and heat. */}
      <SkiaText
        text={text}
        x={-textWidth / 2}
        y={below}
        font={font}
        style="stroke"
        strokeWidth={3.5}
        strokeJoin="round"
        color={colors.surface}
      />
      <SkiaText text={text} x={-textWidth / 2} y={below} font={font} color={color} />
    </Group>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
