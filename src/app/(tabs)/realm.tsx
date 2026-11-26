import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useObserve } from 'expo-observe';
import { usePizzaLogs } from '@/hooks/use-pizza-logs';
import { usePizzaPlaces } from '@/hooks/use-discover';
import {
  MY_COORDS_KEY,
  coordinateName,
  useCityName,
  useKingdomName,
  useMyCoords,
} from '@/hooks/use-realm-names';
import { useCity } from '@/hooks/use-city';
import { CITY_CREDIT } from '@/lib/city-tiles';
import { getCurrentCoords, type Coords } from '@/lib/location';
import { useDraftLogStore } from '@/state/draft-log';
import { FadeUp } from '@/components/fade-up';
import { CITY_OVERDRAW, RealmMap, type RealmSelection } from '@/components/realm-map';
import { CircleButton, PillButton } from '@/components/sticker';
import { LOG_BUTTON_CLEARANCE } from '@/components/log-button';
import { colors, fonts, fontSize, spacing, STICKER_SHADOW_RGB } from '@/constants/theme';
import { cellGroundRadius, growBounds } from '@/features/grid';
import {
  districtById,
  homeRegion,
  kingdomForPoint,
  placesInKingdom,
  pointsByKingdom,
  regionAround,
  withinBounds,
  type Eaten,
  type Kingdom,
  type Place,
} from '@/features/realm';

// The screen follows My Pizza: a white page, a red headline in sign
// capitals, plain figures, and no boxes. The map under the header is drawn
// by the app (components/realm-map): the real city in the app's own look,
// with the shore as a thin red line, streets in quiet grey and place names.
// It opens on the city of the player's latest pizza. What it shows is heat. Every pizza eaten is a soft glow where it was
// eaten, sized by the points it earned, so points piling up in a
// neighborhood read as a hot spot. Red is you.
//
// Only the player's own pizzas are on the map. The app cannot read another
// player's pizzas yet: that needs the server (public logs summed per
// kingdom). An invented rival stood in for one until November 2026 and was
// removed before beta testers joined, so that nothing on the map is made up.
// The map can still draw a second player in charcoal (`rivalEaten`), and the
// rules for one are in features/realm (`kingdomLeader`, `kingdomsLed`).

// Roughly what the detail panel covers at the bottom of the map, so a
// selection is centered in the part that stays open.
const PANEL_COVER = 250;


const NO_PIZZA: Eaten[] = [];

/** Matches a logged pizza to a place on the list. About 11 meters of slack. */
function spotKey(at: { lat: number; lng: number }): string {
  return `${at.lat.toFixed(4)},${at.lng.toFixed(4)}`;
}

export default function Realm() {
  const { markInteractive } = useObserve();
  useEffect(() => {
    markInteractive();
  }, [markInteractive]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selection, setSelection] = useState<RealmSelection>(null);

  // Where the phone is. Read on every visit to the tab, and only when the
  // user has already allowed location; the locate button is what asks.
  const queryClient = useQueryClient();
  const { data: me = null, refetch: findMe } = useMyCoords();
  // Where the user has taken the map: set when they drag it away from its
  // region, and by the locate button when they are outside it.
  const [around, setAround] = useState<Coords | null>(null);

  // Bumped on every visit to the tab so the header replays its landing.
  const [runId, setRunId] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setRunId((n) => n + 1);
      void findMe();
    }, [findMe])
  );

  // Your pizzas come from your own logs: every one that has a location, in
  // any city.
  const { data: logs } = usePizzaLogs();
  const { yourEaten, latest } = useMemo(() => {
    const located = (logs ?? []).filter((log) => log.lat != null && log.lng != null);
    if (located.length === 0) return { yourEaten: NO_PIZZA, latest: null };
    const newest = located.reduce((a, b) => (a.timestamp >= b.timestamp ? a : b));
    return {
      yourEaten: located.map((log) => ({
        lat: log.lat!,
        lng: log.lng!,
        points: log.pointsEarned,
      })),
      latest: { lat: newest.lat!, lng: newest.lng! },
    };
  }, [logs]);

  // The map opens where you are, when location is allowed, framed on the
  // pizzas you have eaten around there. Without location it opens on the city
  // of your latest pizza, and with no located pizza either, on Seattle.
  const region = useMemo(() => {
    if (around) return regionAround(around.lat, around.lng);
    return homeRegion(yourEaten, me ?? latest);
  }, [around, yourEaten, latest, me]);
  const city = useCityName(region);

  // Where you have eaten, so the places list can mark those spots.
  const yourSpots = useMemo(() => new Set(yourEaten.map(spotKey)), [yourEaten]);

  // A kingdom is yours once a pizza you ate there has earned points.
  const yourPoints = useMemo(() => pointsByKingdom(yourEaten), [yourEaten]);
  const totalPoints = Object.values(yourPoints).reduce((a, b) => a + b, 0);
  const claimed = Object.values(yourPoints).filter((points) => points > 0).length;

  // Every point on the map is in a kingdom, so a tap always names one. A
  // second tap on the open kingdom closes it.
  // The real city for the region, and a little past it, since the map can
  // be dragged a little past it.
  const cityBounds = useMemo(() => growBounds(region, CITY_OVERDRAW), [region]);
  const { data: cityData = null } = useCity(cityBounds);

  // The locate button: find the phone, asking for permission if it has to,
  // bring that place onto the map, and open the kingdom the user is in.
  const locate = useCallback(async () => {
    if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
    const coords = await getCurrentCoords();
    if (!coords) {
      Alert.alert(
        'Location is off',
        'Allow location for Pizza Quest in Settings to see where you are on the map.'
      );
      return;
    }
    queryClient.setQueryData(MY_COORDS_KEY, coords);
    if (!withinBounds(region, coords.lat, coords.lng)) setAround(coords);
    setSelection({ kind: 'kingdom', kingdom: kingdomForPoint(coords.lat, coords.lng) });
  }, [queryClient, region]);

  const select = useCallback((next: RealmSelection) => {
    if (next && process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
    setSelection((open) =>
      next?.kind === 'kingdom' && open?.kind === 'kingdom' && open.kingdom.id === next.kingdom.id
        ? null
        : next
    );
  }, []);

  const startLogAt = (place: Place) => {
    const draft = useDraftLogStore.getState();
    draft.reset();
    draft.setSpot(null, place.name);
    draft.setCoords(place.lat, place.lng);
    router.push('/log/capture');
  };

  if (process.env.EXPO_OS === 'web') {
    return (
      <View style={[styles.fallback, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.title}>The realm.</Text>
        <Text style={styles.fallbackText}>The kingdom map is not on the web yet.</Text>
      </View>
    );
  }

  const restBottom = insets.bottom + LOG_BUTTON_CLEARANCE;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <FadeUp runId={runId}>
          {/* The city the map shows, so the grid is never without a place. */}
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {city ? `The realm of ${city}.` : 'The realm.'}
          </Text>
        </FadeUp>
        <FadeUp runId={runId} delay={120} style={styles.versus}>
          <Side
            name="You"
            dot={colors.brand}
            points={totalPoints}
            kingdoms={claimed}
            pointsColor={colors.brand}
          />
        </FadeUp>
      </View>

      <View style={styles.mapWrap}>
        <RealmMap
          region={region}
          me={me}
          city={cityData}
          yourEaten={yourEaten}
          rivalEaten={NO_PIZZA}
          selection={selection}
          onSelect={select}
          onMove={setAround}
          restBottom={restBottom}
          panelBottom={restBottom + PANEL_COVER}
        />

        {/* The city's data is OpenStreetMap's, and its license asks for this line. */}
        {cityData ? (
          <Text style={styles.credit} pointerEvents="none">
            {CITY_CREDIT}
          </Text>
        ) : null}

        <View style={styles.locate}>
          <CircleButton onPress={locate} label="Show where I am" size={44}>
            <Ionicons name="navigate" size={19} color={colors.ink} />
          </CircleButton>
        </View>

        {selection ? (
          <Animated.View
            entering={FadeInDown.duration(220)}
            exiting={FadeOutDown.duration(160)}
            style={[styles.sheet, { bottom: restBottom }]}
          >
            {selection.kind === 'kingdom' ? (
              <KingdomPanel
                // A fresh panel per kingdom, so the places list starts closed.
                key={selection.kingdom.id}
                kingdom={selection.kingdom}
                yours={yourPoints[selection.kingdom.id] ?? 0}
                yourSpots={yourSpots}
                onSelectPlace={(place) => select({ kind: 'place', place })}
              />
            ) : (
              <PlacePanel place={selection.place} onLog={() => startLogAt(selection.place)} />
            )}
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

/** The player in the header: who, how many points on the map, how many kingdoms claimed. */
function Side({
  name,
  dot,
  points,
  kingdoms,
  pointsColor,
}: {
  name: string;
  dot: string;
  points: number;
  kingdoms: number;
  pointsColor: string;
}) {
  return (
    <View
      style={styles.side}
      accessible
      accessibilityLabel={`${name}: ${points} Pizza Points, ${kingdoms} ${kingdoms === 1 ? 'kingdom' : 'kingdoms'} claimed`}
    >
      <View style={styles.sideName}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={styles.sideNameText} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Text style={[styles.sidePoints, { color: pointsColor }]}>{points}</Text>
      <Text style={styles.figureLabel}>Pizza Points</Text>
      <Text style={styles.sideKingdoms}>
        {kingdoms} {kingdoms === 1 ? 'kingdom' : 'kingdoms'} claimed
      </Text>
    </View>
  );
}

function KingdomPanel({
  kingdom,
  yours,
  yourSpots,
  onSelectPlace,
}: {
  kingdom: Kingdom;
  yours: number;
  yourSpots: Set<string>;
  onSelectPlace: (place: Place) => void;
}) {
  const [showPlaces, setShowPlaces] = useState(false);
  const name = useKingdomName(kingdom);

  // Seattle's places ship with the app. For a kingdom with none on that
  // list, which is every kingdom in another city, the panel asks the phone's
  // map search for the pizza places around the middle of the kingdom and
  // keeps the ones inside it. Those are shown and never stored.
  const shipped = placesInKingdom(kingdom.id);
  const [lat, lng] = kingdom.center;
  const { data: found } = usePizzaPlaces(
    shipped.length === 0 ? { lat, lng, radiusMeters: Math.round(cellGroundRadius(lat)) } : null
  );
  const places = useMemo(() => {
    const list: Place[] =
      shipped.length > 0
        ? shipped
        : (found ?? [])
            .filter((p) => kingdomForPoint(p.lat, p.lng).id === kingdom.id)
            .map((p) => ({
              id: `found:${p.name}:${p.lat},${p.lng}`,
              name: p.name,
              lat: p.lat,
              lng: p.lng,
              address: p.address,
              brand: null,
              tier: 2,
              kingdomId: null,
            }));
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [shipped, found, kingdom.id]);

  return (
    <View style={styles.panel}>
      <Text style={styles.kicker}>Kingdom · {yours > 0 ? 'Yours' : 'Unclaimed'}</Text>
      {/* The name can take a moment to arrive; the line keeps its height. */}
      <Text style={styles.panelTitle} numberOfLines={1}>
        {name === undefined ? ' ' : (name ?? coordinateName(kingdom.center))}
      </Text>
      <View style={styles.figureRow}>
        <Figure value={yours} label="You" color={colors.brand} />
        {/* The one figure that opens: the places in this kingdom. */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showPlaces }}
          accessibilityLabel={`${places.length} pizza places. ${showPlaces ? 'Hide' : 'Show'} the list`}
          hitSlop={8}
          style={styles.figure}
          onPress={() => {
            if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
            setShowPlaces((open) => !open);
          }}
        >
          <Text style={[styles.figureValue, { color: colors.textPrimary }]}>{places.length}</Text>
          <Text style={[styles.figureLabel, styles.figureLabelLink]} numberOfLines={1}>
            Pizza places
          </Text>
          <View style={[styles.figureRule, showPlaces && styles.figureRuleOn]} />
        </Pressable>
      </View>

      {showPlaces ? (
        <Animated.View entering={FadeInDown.duration(200)}>
          <ScrollView style={styles.placeList} showsVerticalScrollIndicator={false}>
            {places.map((place, i) => {
              const key = spotKey(place);
              return (
                <Pressable
                  key={place.id}
                  accessibilityRole="button"
                  style={[styles.placeRow, i > 0 && styles.placeRowDivider]}
                  onPress={() => onSelectPlace(place)}
                >
                  <View style={styles.placeText}>
                    <Text style={styles.placeName} numberOfLines={1}>
                      {place.name}
                    </Text>
                    {place.address ? (
                      <Text style={styles.placeAddress} numberOfLines={1}>
                        {place.address}
                      </Text>
                    ) : null}
                  </View>
                  {/* A red dot marks a place where you have eaten. */}
                  {yourSpots.has(key) ? (
                    <View style={[styles.dot, { backgroundColor: colors.brand }]} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      ) : null}
    </View>
  );
}

function PlacePanel({ place, onLog }: { place: Place; onLog: () => void }) {
  const district = districtById(place.kingdomId);
  return (
    <View style={styles.panel}>
      <Text style={styles.kicker}>Pizza place{district ? ` · ${district.name}` : ''}</Text>
      <Text style={styles.panelTitle} numberOfLines={2}>
        {place.name}
      </Text>
      {place.address ? (
        <Text style={styles.meta} numberOfLines={1} selectable>
          {place.address}
        </Text>
      ) : null}
      <PillButton onPress={onLog} icon="plus" label="Log a slice here" style={styles.logButton} />
    </View>
  );
}

/** A plain figure over its label. Zero goes grey. */
function Figure({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.figure} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.figureValue, { color: value === 0 ? colors.textMuted : color }]}>
        {value}
      </Text>
      <Text style={styles.figureLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bg,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 21,
    lineHeight: 28,
    textTransform: 'uppercase',
    color: colors.brand,
    marginBottom: spacing.md,
  },
  // The player's figures, centered. The dot beside the name is the key to
  // the heat color on the map.
  versus: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  side: {
    flex: 1,
    flexBasis: 0,
    alignItems: 'center',
  },
  sideName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  sideNameText: {
    flexShrink: 1,
    fontFamily: fonts.label,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textPrimary,
  },
  sidePoints: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 42,
    textAlign: 'center',
  },
  sideKingdoms: {
    marginTop: 4,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mapWrap: {
    flex: 1,
  },
  // On a white backing, so a place name under it does not make it unreadable.
  credit: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    fontSize: 8.5,
    color: colors.textSecondary,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  locate: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.lg,
  },
  sheet: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
  },
  // The one surface on the screen: it has to sit on a map. White, no
  // outline, lifted by a soft shadow.
  panel: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + spacing.xs,
    borderRadius: 22,
    borderCurve: 'continuous',
    gap: 4,
    boxShadow: `0 10px 30px rgba(${STICKER_SHADOW_RGB}, 0.2)`,
  },
  kicker: {
    fontFamily: fonts.label,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  panelTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 25,
    textTransform: 'uppercase',
    color: colors.brand,
  },
  meta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  figureRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  figure: {
    flex: 1,
    flexBasis: 0,
    alignItems: 'center',
  },
  figureValue: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 31,
    textAlign: 'center',
  },
  figureLabel: {
    fontFamily: fonts.label,
    fontSize: 9.5,
    lineHeight: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Red marks the label that can be tapped; the rule shows when it is open.
  figureLabelLink: {
    color: colors.brand,
  },
  figureRule: {
    height: 2,
    width: 28,
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  figureRuleOn: {
    backgroundColor: colors.brand,
  },
  placeList: {
    maxHeight: 232,
    marginTop: spacing.sm,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  placeRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  placeText: {
    flex: 1,
  },
  placeName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  placeAddress: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  logButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
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
