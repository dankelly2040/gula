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
import {
  KINGDOMS,
  LATE_LABEL_KINGDOMS,
  PLACES,
  heatSources,
  kingdomForPoint,
  type Eaten,
  type Kingdom,
  type Place,
} from '@/features/realm';

// The Realm map, drawn by the app instead of a map service, so nothing is on
// it that was not put there: a white page, the land as one thin red outline,
// a finer red line along every border between kingdoms, and heat.
//
// Everything is drawn once into paths in "base" coordinates (the whole city
// fitted to the view). Moving and zooming only changes one transform on the
// UI thread, and line widths are divided by the zoom so they stay the same
// thickness on screen.

type LatLng = [number, number];
const LINES = linesJson as { outline: LatLng[][]; borders: LatLng[][] };

export type RealmSelection =
  | { kind: 'kingdom'; kingdom: Kingdom }
  | { kind: 'place'; place: Place }
  | null;

type Props = {
  yourEaten: Eaten[];
  rivalEaten: Eaten[];
  selection: RealmSelection;
  onSelect: (next: RealmSelection) => void;
  /** Space at the bottom that other UI always covers (tab bar, log button). */
  restBottom: number;
  /** Space at the bottom the detail panel covers while something is selected. */
  panelBottom: number;
};

// --- Line weights, in screen points -------------------------------------------
const OUTLINE_WIDTH = 1.4;
const BORDER_WIDTH = 0.6;
const FOCUS_WIDTH = 2;

// --- Zoom ---------------------------------------------------------------------
const MIN_SCALE = 1;
const MAX_SCALE = 16;
const LABELS_FROM = 1.45; // kingdom names fade in as the user moves in
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

const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

// --- Projection -----------------------------------------------------------------
// At city scale a plain "degrees times cos(latitude)" projection is exact
// enough, and it is trivially reversible for taps.

const ALL_POINTS = LINES.outline.flat();
const MIN_LAT = Math.min(...ALL_POINTS.map((p) => p[0]));
const MAX_LAT = Math.max(...ALL_POINTS.map((p) => p[0]));
const MIN_LNG = Math.min(...ALL_POINTS.map((p) => p[1]));
const MAX_LNG = Math.max(...ALL_POINTS.map((p) => p[1]));
const LNG_SQUASH = Math.cos((((MIN_LAT + MAX_LAT) / 2) * Math.PI) / 180);
const WORLD_WIDTH = (MAX_LNG - MIN_LNG) * LNG_SQUASH;
const WORLD_HEIGHT = MAX_LAT - MIN_LAT;

type Projection = {
  toBase: (lat: number, lng: number) => { x: number; y: number };
  toLatLng: (x: number, y: number) => { lat: number; lng: number };
};

function fit(width: number, height: number, restBottom: number): Projection {
  const padX = 22;
  const padTop = 18;
  const usableHeight = height - padTop - restBottom - 12;
  const k = Math.min((width - padX * 2) / WORLD_WIDTH, usableHeight / WORLD_HEIGHT);
  const left = (width - WORLD_WIDTH * k) / 2;
  const top = padTop + (usableHeight - WORLD_HEIGHT * k) / 2;
  return {
    toBase: (lat, lng) => ({
      x: left + (lng - MIN_LNG) * LNG_SQUASH * k,
      y: top + (MAX_LAT - lat) * k,
    }),
    toLatLng: (x, y) => ({
      lat: MAX_LAT - (y - top) / k,
      lng: MIN_LNG + (x - left) / (LNG_SQUASH * k),
    }),
  };
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
  yourEaten,
  rivalEaten,
  selection,
  onSelect,
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

  const width = size?.width ?? 0;
  const height = size?.height ?? 0;

  const scene = useMemo(() => {
    if (!size) return null;
    const project = fit(size.width, size.height, restBottom);
    const kingdomPaths = new Map(
      KINGDOMS.map((k) => [k.id, linePath(k.rings, project, true)] as const)
    );
    return {
      project,
      outline: linePath(LINES.outline, project, true),
      borders: linePath(LINES.borders, project, false),
      kingdomPaths,
      labels: KINGDOMS.map((k) => ({
        id: k.id,
        text: k.name.toUpperCase(),
        late: LATE_LABEL_KINGDOMS.has(k.id),
        ...project.toBase(k.center[0], k.center[1]),
      })),
      places: PLACES.map((p) => vec(project.toBase(p.lat, p.lng).x, project.toBase(p.lat, p.lng).y)),
    };
  }, [size, restBottom]);

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
      const bounds = scene.kingdomPaths.get(selection.kingdom.id)!.getBounds();
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
    const kingdom = kingdomForPoint(lat, lng);
    onSelect(kingdom ? { kind: 'kingdom', kingdom } : null);
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
        tx.set(withDecay({ velocity: e.velocityX, clamp: [l.minX, l.maxX] }));
        ty.set(withDecay({ velocity: e.velocityY, clamp: [l.minY, l.maxY] }));
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
  }, [width, height, scene, onSelect]);

  // --- Values every frame derives from the zoom -----------------------------------
  const camera = useDerivedValue(() => [
    { translateX: tx.value },
    { translateY: ty.value },
    { scale: scale.value },
  ]);
  const outlineWidth = useDerivedValue(() => OUTLINE_WIDTH / scale.value);
  const borderWidth = useDerivedValue(() => BORDER_WIDTH / scale.value);
  const focusWidth = useDerivedValue(() => FOCUS_WIDTH / scale.value);
  const placeOuter = useDerivedValue(() => 8 / scale.value);
  const placeInner = useDerivedValue(() => 4.6 / scale.value);
  const placesOpacity = useDerivedValue(() =>
    interpolate(scale.value, [PLACES_FROM - 0.5, PLACES_FROM], [0, 1], Extrapolation.CLAMP)
  );
  const selectedOuter = useDerivedValue(() => 9 / scale.value);
  const selectedInner = useDerivedValue(() => 5 / scale.value);

  const focusPath =
    scene && selection
      ? scene.kingdomPaths.get(
          selection.kind === 'kingdom' ? selection.kingdom.id : (selection.place.kingdomId ?? '')
        )
      : undefined;
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
        accessibilityLabel="Map of Seattle's kingdoms, with heat where pizza has been eaten"
      >
        {scene ? (
          <Canvas style={styles.fill}>
            <Group transform={camera}>
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

              <Path
                path={scene.borders}
                style="stroke"
                strokeWidth={borderWidth}
                strokeJoin="round"
                strokeCap="round"
                color={colors.brand}
              />
              <Path
                path={scene.outline}
                style="stroke"
                strokeWidth={outlineWidth}
                strokeJoin="round"
                color={colors.brand}
              />
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

              {labelFont
                ? scene.labels.map((label) => (
                    <KingdomLabel
                      key={label.id}
                      text={label.text}
                      x={label.x}
                      y={label.y}
                      late={label.late}
                      font={labelFont}
                      scale={scale}
                    />
                  ))
                : null}
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

/** A kingdom's name in the sign capitals, the same size at every zoom. */
function KingdomLabel({
  text,
  x,
  y,
  late,
  font,
  scale,
}: {
  text: string;
  x: number;
  y: number;
  late: boolean;
  font: SkFont;
  scale: SharedValue<number>;
}) {
  const textWidth = useMemo(() => font.measureText(text).width, [font, text]);
  const from = late ? LATE_LABELS_FROM : LABELS_FROM;
  const transform = useDerivedValue(() => [
    { translateX: x },
    { translateY: y },
    { scale: 1 / scale.value },
  ]);
  const opacity = useDerivedValue(() =>
    interpolate(scale.value, [from, from + 0.3], [0, 1], Extrapolation.CLAMP)
  );
  return (
    <Group transform={transform} opacity={opacity}>
      {/* A white edge keeps the name readable over lines and heat. */}
      <SkiaText
        text={text}
        x={-textWidth / 2}
        y={4}
        font={font}
        style="stroke"
        strokeWidth={3.5}
        strokeJoin="round"
        color={colors.surface}
      />
      <SkiaText text={text} x={-textWidth / 2} y={4} font={font} color={colors.ink} />
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
