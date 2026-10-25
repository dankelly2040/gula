import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { AppleMaps } from 'expo-maps';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useObserve } from 'expo-observe';
import { useCurrentLocation } from '@/hooks/use-discover';
import { useDraftLogStore } from '@/state/draft-log';
import { PillButton } from '@/components/sticker';
import { LOG_BUTTON_CLEARANCE } from '@/components/log-button';
import { colors, fontSize, radii, spacing, sticker } from '@/constants/theme';
import {
  KINGDOMS,
  PLACES,
  TIERS,
  TIER_ORDER,
  countByTier,
  kingdomById,
  kingdomFill,
  placesInKingdom,
  visibleLabelKingdoms,
  visibleTiers,
  type Kingdom,
  type Place,
  type Tier,
} from '@/features/realm';

// The realm is the whole city, so the camera opens on Seattle no matter
// where the user is. Location only adds the blue dot.
const SEATTLE = { latitude: 47.6205, longitude: -122.3321 };
const CITY_ZOOM = 10.4;

// expo-maps exposes the marker type but not the polygon type on the namespace.
type AppleMapsPolygon = NonNullable<AppleMaps.MapProps['polygons']>[number];
type AppleMapsAnnotation = NonNullable<AppleMaps.MapProps['annotations']>[number];

type Selection = { kind: 'kingdom'; kingdom: Kingdom } | { kind: 'place'; place: Place } | null;

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

export default function Realm() {
  const { markInteractive } = useObserve();
  useEffect(() => {
    markInteractive();
  }, [markInteractive]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selection, setSelection] = useState<Selection>(null);
  const [zoom, setZoom] = useState(CITY_ZOOM);

  // Non-blocking: the map renders before, and without, a location answer.
  useCurrentLocation();

  const polygons = useMemo<AppleMapsPolygon[]>(
    () =>
      KINGDOMS.flatMap((kingdom) =>
        kingdom.rings.map((ring, i) => ({
          id: `kingdom:${kingdom.id}#${i}`,
          coordinates: ring.map(([latitude, longitude]) => ({ latitude, longitude })),
          color: hexWithAlpha(kingdomFill(kingdom), 0.55),
          lineColor: colors.ink,
          lineWidth: 1,
        }))
      ),
    []
  );

  // Kingdom names sit at each district's centroid, like a realm map's labels.
  const labels = useMemo<AppleMapsAnnotation[]>(
    () =>
      visibleLabelKingdoms(zoom).map((kingdom) => ({
        id: `label:${kingdom.id}`,
        coordinates: { latitude: kingdom.center[0], longitude: kingdom.center[1] },
        text: kingdom.name,
        textColor: colors.ink,
        backgroundColor: 'rgba(255, 251, 242, 0.88)',
      })),
    [zoom]
  );

  const markers = useMemo<AppleMaps.Marker[]>(() => {
    const tiers = new Set(visibleTiers(zoom));
    return PLACES.filter((p) => tiers.has(p.tier)).map((p) => ({
      id: `place:${p.id}`,
      coordinates: { latitude: p.lat, longitude: p.lng },
      title: p.name,
      systemImage: TIERS[p.tier].symbol,
      tintColor: TIERS[p.tier].color,
    }));
  }, [zoom]);

  const select = (next: Selection) => {
    if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
    setSelection(next);
  };

  const startLogAt = (place: Place) => {
    const draft = useDraftLogStore.getState();
    draft.reset();
    draft.setSpot(null, place.name);
    draft.setCoords(place.lat, place.lng);
    router.push('/log/capture');
  };

  if (process.env.EXPO_OS !== 'ios') {
    return (
      <View style={[styles.fallback, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.title}>Realm</Text>
        <Text style={styles.fallbackText}>
          The kingdom map is iOS only for now. {KINGDOMS.length} kingdoms, {PLACES.length} pizza
          places.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppleMaps.View
        style={StyleSheet.absoluteFill}
        cameraPosition={{ coordinates: SEATTLE, zoom: CITY_ZOOM }}
        polygons={polygons}
        annotations={labels}
        markers={markers}
        properties={{ isMyLocationEnabled: true }}
        uiSettings={{ compassEnabled: true, myLocationButtonEnabled: false }}
        onCameraMove={(event) => setZoom(event.zoom)}
        onPolygonClick={(polygon) => {
          const id = polygon.id?.slice('kingdom:'.length).split('#')[0];
          const kingdom = kingdomById(id);
          if (kingdom) select({ kind: 'kingdom', kingdom });
        }}
        onAnnotationClick={(annotation) => {
          const kingdom = kingdomById(annotation.id?.slice('label:'.length));
          if (kingdom) select({ kind: 'kingdom', kingdom });
        }}
        onMarkerClick={(marker) => {
          const id = marker.id?.slice('place:'.length);
          const place = PLACES.find((p) => p.id === id);
          if (place) select({ kind: 'place', place });
        }}
        onMapClick={() => setSelection(null)}
      />

      <View pointerEvents="box-none" style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.plaque}>
          <Text style={styles.title}>Realm</Text>
          <Text style={styles.subtitle}>
            {KINGDOMS.length} kingdoms · {PLACES.length} pizza places
          </Text>
        </View>
        <Legend />
      </View>

      {selection ? (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOutDown.duration(160)}
          style={[styles.sheet, { bottom: insets.bottom + LOG_BUTTON_CLEARANCE }]}
        >
          {selection.kind === 'kingdom' ? (
            <KingdomCard kingdom={selection.kingdom} />
          ) : (
            <PlaceCard place={selection.place} onLog={() => startLogAt(selection.place)} />
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}

function Legend() {
  return (
    <View style={styles.legend}>
      {TIER_ORDER.map((tier) => (
        <View key={tier} style={styles.legendItem}>
          <SymbolView name={TIERS[tier].symbol as never} size={13} tintColor={TIERS[tier].color} />
          <Text style={styles.legendText}>{TIERS[tier].label}</Text>
        </View>
      ))}
    </View>
  );
}

function KingdomCard({ kingdom }: { kingdom: Kingdom }) {
  const places = placesInKingdom(kingdom.id);
  const counts = countByTier(places);
  return (
    <View style={styles.card}>
      <View style={[styles.swatch, { backgroundColor: kingdomFill(kingdom) }]} />
      <View style={styles.cardBody}>
        <Text style={styles.cardKicker}>Kingdom</Text>
        <Text style={styles.cardTitle}>{kingdom.name}</Text>
        <Text style={styles.cardMeta}>
          {places.length} {places.length === 1 ? 'pizza place' : 'pizza places'} · unclaimed
        </Text>
        <View style={styles.tierRow}>
          {TIER_ORDER.map((tier) => (
            <TierPill key={tier} tier={tier} count={counts[tier]} />
          ))}
        </View>
      </View>
    </View>
  );
}

function PlaceCard({ place, onLog }: { place: Place; onLog: () => void }) {
  const tier = TIERS[place.tier];
  const kingdom = kingdomById(place.kingdomId);
  return (
    <View style={styles.card}>
      <View style={[styles.swatch, { backgroundColor: hexWithAlpha(tier.color, 0.25) }]}>
        <SymbolView name={tier.symbol as never} size={22} tintColor={tier.color} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardKicker}>
          {tier.label} · {tier.points} {tier.points === 1 ? 'point' : 'points'}
          {kingdom ? ` in ${kingdom.name}` : ''}
        </Text>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {place.name}
        </Text>
        {place.address ? (
          <Text style={styles.cardMeta} numberOfLines={1} selectable>
            {place.address}
          </Text>
        ) : null}
        <PillButton onPress={onLog} icon="plus" label="Log a slice here" style={styles.logButton} />
      </View>
    </View>
  );
}

function TierPill({ tier, count }: { tier: Tier; count: number }) {
  const muted = count === 0;
  return (
    <View style={[styles.tierPill, muted && styles.tierPillMuted]}>
      <SymbolView
        name={TIERS[tier].symbol as never}
        size={12}
        tintColor={muted ? colors.textMuted : TIERS[tier].color}
      />
      <Text style={[styles.tierPillText, muted && styles.tierPillTextMuted]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  plaque: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    ...sticker.border,
    ...sticker.shadow,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.full,
    ...sticker.border,
    ...sticker.shadowSm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  sheet: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    ...sticker.border,
    ...sticker.shadowLg,
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    ...sticker.border,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardKicker: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tierRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.bgElevated,
  },
  tierPillMuted: {
    backgroundColor: colors.bg,
  },
  tierPillText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  tierPillTextMuted: {
    color: colors.textMuted,
  },
  logButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  fallback: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  fallbackText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
