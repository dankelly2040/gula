import { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { AppleMaps } from 'expo-maps';
import {
  useCurrentLocation,
  useDiscover,
  usePizzaPlaces,
  type SearchRegion,
} from '../../hooks/use-discover';
import { useDraftLogStore } from '../../state/draft-log';
import { getZoneForScore } from '../../constants/enums';
import { PillButton } from '../../components/sticker';
import { colors, spacing, fontSize, radii, sticker, gradients } from '../../constants/theme';
import { LOG_BUTTON_CLEARANCE } from '../../components/log-button';
import type { PizzaLog, Spot } from '../../db/types';
import type { PizzaPlace } from '../../lib/pizza-places';
import { useObserve } from 'expo-observe';

type ViewMode = 'map' | 'list';

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.round(meters * 3.28084)} ft`;
  return `${miles.toFixed(1)} mi`;
}

// Re-search when the map camera settles somewhere meaningfully new.
const SEARCH_DEBOUNCE_MS = 600;
const DEFAULT_RADIUS_METERS = 4000;

function radiusForZoom(zoom: number): number {
  // ~4 km at zoom 13, doubling per zoom-out step, clamped to sane bounds.
  return Math.min(30000, Math.max(1500, DEFAULT_RADIUS_METERS * 2 ** (13 - zoom)));
}

function distanceBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = (a.lat - b.lat) * 111_000;
  const dLng = (a.lng - b.lng) * 111_000 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

export default function Discover() {
  const { markInteractive } = useObserve();
  useEffect(() => {
    markInteractive();
  }, [markInteractive]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('map');

  const {
    data: coords,
    isLoading: locationLoading,
    isRefetching: locationRetrying,
    refetch: retryLocation,
  } = useCurrentLocation();
  const discover = useDiscover(coords);

  // Pizza-place search follows the map camera; it starts at the user.
  const [searchRegion, setSearchRegion] = useState<SearchRegion | null>(null);
  const effectiveRegion =
    searchRegion ?? (coords ? { ...coords, radiusMeters: DEFAULT_RADIUS_METERS } : null);
  const placesQuery = usePizzaPlaces(effectiveRegion);

  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchedRef = useRef<SearchRegion | null>(null);
  lastSearchedRef.current = effectiveRegion;

  const handleCameraMove = (event: { coordinates: { latitude?: number; longitude?: number }; zoom: number }) => {
    const { latitude, longitude } = event.coordinates;
    if (latitude == null || longitude == null) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const next: SearchRegion = {
        lat: latitude,
        lng: longitude,
        radiusMeters: radiusForZoom(event.zoom),
      };
      const last = lastSearchedRef.current;
      // Only re-search when the camera moved meaningfully relative to the area.
      if (last && distanceBetween(next, last) < Math.max(1000, last.radiusMeters * 0.3)) return;
      setSearchRegion(next);
    }, SEARCH_DEBOUNCE_MS);
  };

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  const logs: PizzaLog[] = discover.data?.logs ?? [];
  const spots: Spot[] = discover.data?.spots ?? [];
  const places: PizzaPlace[] = placesQuery.data ?? [];

  const startLogAt = (place: PizzaPlace) => {
    const draft = useDraftLogStore.getState();
    draft.reset();
    draft.setSpot(null, place.name);
    draft.setCoords(place.lat, place.lng);
    router.push('/log/capture');
  };

  const markers = useMemo<AppleMaps.Marker[]>(() => {
    const spotMarkers = spots
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({
        id: `spot:${s.id}`,
        coordinates: { latitude: s.lat!, longitude: s.lng! },
        title: s.name,
        systemImage: 'fork.knife',
        tintColor: colors.brand,
      }));
    const logMarkers = logs
      .filter((l) => l.lat != null && l.lng != null)
      .map((l) => {
        const zone = getZoneForScore(l.moneyShot);
        return {
          id: `log:${l.id}`,
          coordinates: { latitude: l.lat!, longitude: l.lng! },
          title: `${l.spotName ?? 'Pizza'} · ${l.moneyShot} ${zone.label}`,
          systemImage: 'flame.fill',
          tintColor: zone.color,
        };
      });
    // Suggested places are quieter than community spots on the map.
    const placeMarkers = places.map((p, i) => ({
      id: `place:${i}`,
      coordinates: { latitude: p.lat, longitude: p.lng },
      title: p.name,
      systemImage: 'storefront',
      tintColor: colors.textSecondary,
    }));
    return [...spotMarkers, ...logMarkers, ...placeMarkers];
  }, [spots, logs, places]);

  const renderBody = () => {
    // Location resolving (the OS permission prompt appears over this).
    if (locationLoading || locationRetrying) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand} size="large" />
          <Text style={styles.loadingText}>Finding great pizza near you</Text>
        </View>
      );
    }

    // Permission denied or location unavailable.
    if (coords == null) {
      return (
        <View style={styles.centered}>
          <SymbolView
            name="location.fill"
            size={56}
            tintColor={colors.textMuted}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>Find pizza near you</Text>
          <Text style={styles.emptyText}>
            Local Pizza uses your location to surface public logs and spots worth trying nearby. We only
            check while you have Discover open.
          </Text>
          <PillButton onPress={() => retryLocation()} label="Enable location" />
          <Pressable onPress={() => Linking.openSettings()}>
            <Text style={styles.settingsLink}>Denied it earlier? Open settings</Text>
          </Pressable>
        </View>
      );
    }

    // Nearby data loading.
    if (discover.isLoading && placesQuery.isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand} size="large" />
          <Text style={styles.loadingText}>Checking what the community is eating</Text>
        </View>
      );
    }

    // Nothing nearby (also covers fetch errors, which fall back to empty
    // lists). Once the user has panned the map, keep it mounted regardless.
    if (logs.length === 0 && spots.length === 0 && places.length === 0 && searchRegion === null) {
      return (
        <View style={styles.centered}>
          <SymbolView
            name="fork.knife.circle"
            size={56}
            tintColor={colors.textMuted}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>No pizza logged near you yet, be the first</Text>
          <Text style={styles.emptyText}>
            Log a slice and put your neighborhood on the map.
          </Text>
          <PillButton onPress={() => router.push('/log/capture')} label="Log a slice" />
        </View>
      );
    }

    if (viewMode === 'map') {
      return (
        <View style={styles.mapWrap}>
          <AppleMaps.View
            style={styles.map}
            cameraPosition={{
              coordinates: { latitude: coords.lat, longitude: coords.lng },
              zoom: 13,
            }}
            markers={markers}
            properties={{ isMyLocationEnabled: true }}
            uiSettings={{ myLocationButtonEnabled: true, compassEnabled: true }}
            onCameraMove={handleCameraMove}
            onMarkerClick={(marker) => {
              if (marker.id?.startsWith('spot:')) {
                router.push(`/spot/${marker.id.slice(5)}`);
              } else if (marker.id?.startsWith('place:')) {
                const place = places[Number(marker.id.slice(6))];
                if (place) startLogAt(place);
              }
            }}
          />
        </View>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + LOG_BUTTON_CLEARANCE },
        ]}
      >
        {logs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Nearby logs</Text>
            {logs.map((log) => {
              const zone = getZoneForScore(log.moneyShot);
              return (
                <View key={log.id} style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {log.spotName ?? 'Unknown spot'}
                    </Text>
                    <Text style={styles.rowSubtitle}>{relativeTime(log.timestamp)}</Text>
                  </View>
                  <View style={[styles.scoreBadge, { backgroundColor: zone.color + '20' }]}>
                    <Text style={[styles.scoreValue, { color: zone.color }]}>
                      {log.moneyShot}
                    </Text>
                    <Text style={[styles.scoreLabel, { color: zone.color }]}>{zone.label}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {spots.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, logs.length > 0 && styles.sectionTitleSpaced]}>
              Spots to try
            </Text>
            {spots.map((spot) => (
              <Pressable
                key={spot.id}
                style={styles.row}
                onPress={() => router.push(`/spot/${spot.id}`)}
              >
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {spot.name}
                  </Text>
                  {spot.address ? (
                    <Text style={styles.rowSubtitle} numberOfLines={1}>
                      {spot.address}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </>
        )}

        {places.length > 0 && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                (logs.length > 0 || spots.length > 0) && styles.sectionTitleSpaced,
              ]}
            >
              Pizza places nearby
            </Text>
            {places.map((place, i) => (
              <Pressable key={`${place.name}:${i}`} style={styles.row} onPress={() => startLogAt(place)}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {formatDistance(place.distanceMeters)}
                    {place.address ? ` · ${place.address}` : ''}
                  </Text>
                </View>
                <SymbolView name="plus.circle.fill" size={22} tintColor={colors.brand} />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    );
  };

  const showToggle =
    coords != null &&
    !locationLoading &&
    !discover.isLoading &&
    (logs.length > 0 || spots.length > 0 || places.length > 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>Discover</Text>

      {showToggle && (
        <View style={styles.segmentRow}>
          {(['map', 'list'] as const).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.segment, viewMode === mode && styles.segmentActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text
                style={[styles.segmentText, viewMode === mode && styles.segmentTextActive]}
              >
                {mode === 'map' ? 'Map' : 'List'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    experimental_backgroundImage: gradients.screen,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    padding: 3,
    marginBottom: spacing.md,
    ...sticker.border,
    ...sticker.shadowSm,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  segmentActive: {
    backgroundColor: colors.brand,
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.surface,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyIcon: {
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  settingsLink: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    color: colors.brand,
    fontWeight: '600',
  },
  mapWrap: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  map: {
    flex: 1,
  },
  listContent: {
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionTitleSpaced: {
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    ...sticker.border,
    ...sticker.shadowSm,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  scoreValue: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
