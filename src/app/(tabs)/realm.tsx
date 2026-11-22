import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useObserve } from 'expo-observe';
import { usePizzaLogs } from '@/hooks/use-pizza-logs';
import { useDraftLogStore } from '@/state/draft-log';
import { FadeUp } from '@/components/fade-up';
import { RealmMap, type RealmSelection } from '@/components/realm-map';
import { PillButton } from '@/components/sticker';
import { LOG_BUTTON_CLEARANCE } from '@/components/log-button';
import { colors, fonts, fontSize, spacing, STICKER_SHADOW_RGB } from '@/constants/theme';
import {
  KINGDOMS,
  PLACES,
  kingdomById,
  kingdomForPoint,
  kingdomLeader,
  kingdomsLed,
  placesInKingdom,
  pointsByKingdom,
  type Eaten,
  type Kingdom,
  type Leader,
  type Place,
} from '@/features/realm';
import { DEMO_RIVAL, DEMO_SELF_EATEN } from '@/features/realm-demo';

// The screen follows My Pizza: a white page, a red headline in sign
// capitals, plain figures, and no boxes. The map under the header is drawn
// by the app (components/realm-map): the land as a thin red outline, a finer
// red line for each kingdom border, and nothing else until the user moves
// in. What it shows is heat. Every pizza eaten is a soft glow where it was
// eaten, sized by the points it earned, so points piling up in a
// neighborhood read as a hot spot. Red is you. Charcoal is the rival.

// Roughly what the detail panel covers at the bottom of the map, so a
// selection is centered in the part that stays open.
const PANEL_COVER = 250;

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

  // Bumped on every visit to the tab so the header replays its landing.
  const [runId, setRunId] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setRunId((n) => n + 1);
    }, [])
  );

  // Your pizzas come from your own logs. The rival is invented for now (see
  // features/realm-demo). A development build falls back to a sample for
  // you when none of your logs are inside the realm, which is always the
  // case on a simulator, so the heat can still be judged there.
  const { data: logs } = usePizzaLogs();
  const { yourEaten, usingSample } = useMemo(() => {
    const real: Eaten[] = (logs ?? [])
      .filter((log) => log.lat != null && log.lng != null)
      .map((log) => ({ lat: log.lat!, lng: log.lng!, points: log.pointsEarned }));
    const inRealm = real.filter((e) => kingdomForPoint(e.lat, e.lng) !== null);
    if (inRealm.length === 0 && __DEV__) return { yourEaten: DEMO_SELF_EATEN, usingSample: true };
    return { yourEaten: inRealm, usingSample: false };
  }, [logs]);
  const rivalEaten = DEMO_RIVAL.eaten;

  // Where each player has eaten, so the places list can mark those spots.
  const yourSpots = useMemo(() => new Set(yourEaten.map(spotKey)), [yourEaten]);
  const rivalSpots = useMemo(() => new Set(rivalEaten.map(spotKey)), [rivalEaten]);

  const yourPoints = useMemo(() => pointsByKingdom(yourEaten), [yourEaten]);
  const rivalPoints = useMemo(() => pointsByKingdom(rivalEaten), [rivalEaten]);
  const led = kingdomsLed(yourPoints, rivalPoints);
  const sum = (totals: Record<string, number>) =>
    Object.values(totals).reduce((a, b) => a + b, 0);

  const select = useCallback((next: RealmSelection) => {
    if (next && process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
    setSelection(next);
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
        <Text style={styles.fallbackText}>
          The kingdom map is not on the web yet. {KINGDOMS.length} kingdoms, {PLACES.length} pizza
          places.
        </Text>
      </View>
    );
  }

  const restBottom = insets.bottom + LOG_BUTTON_CLEARANCE;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <FadeUp runId={runId}>
          <Text style={styles.title}>The realm.</Text>
        </FadeUp>
        <FadeUp runId={runId} delay={120} style={styles.versus}>
          <Side
            name="You"
            dot={colors.brand}
            points={sum(yourPoints)}
            kingdoms={led.you}
            pointsColor={colors.brand}
          />
          <Side
            name={DEMO_RIVAL.name}
            dot={colors.ink}
            points={sum(rivalPoints)}
            kingdoms={led.rival}
            pointsColor={colors.textPrimary}
          />
        </FadeUp>
        {usingSample ? (
          <Text style={styles.sampleNote}>
            Sample heat for you. Your logged pizzas are outside Seattle.
          </Text>
        ) : null}
      </View>

      <View style={styles.mapWrap}>
        <RealmMap
          yourEaten={yourEaten}
          rivalEaten={rivalEaten}
          selection={selection}
          onSelect={select}
          restBottom={restBottom}
          panelBottom={restBottom + PANEL_COVER}
        />

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
                theirs={rivalPoints[selection.kingdom.id] ?? 0}
                leader={kingdomLeader(selection.kingdom.id, yourPoints, rivalPoints)}
                yourSpots={yourSpots}
                rivalSpots={rivalSpots}
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

/** One player in the header: who, how many points on the map, how many kingdoms led. */
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
      accessibilityLabel={`${name}: ${points} Pizza Points, leads ${kingdoms} ${kingdoms === 1 ? 'kingdom' : 'kingdoms'}`}
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
        Leads {kingdoms} {kingdoms === 1 ? 'kingdom' : 'kingdoms'}
      </Text>
    </View>
  );
}

const LEADER_LINE: Record<Exclude<Leader, null>, string> = {
  you: 'You lead',
  rival: `${DEMO_RIVAL.name} leads`,
  tie: 'Tied',
};

function KingdomPanel({
  kingdom,
  yours,
  theirs,
  leader,
  yourSpots,
  rivalSpots,
  onSelectPlace,
}: {
  kingdom: Kingdom;
  yours: number;
  theirs: number;
  leader: Leader;
  yourSpots: Set<string>;
  rivalSpots: Set<string>;
  onSelectPlace: (place: Place) => void;
}) {
  const [showPlaces, setShowPlaces] = useState(false);
  const places = useMemo(
    () => [...placesInKingdom(kingdom.id)].sort((a, b) => a.name.localeCompare(b.name)),
    [kingdom.id]
  );

  return (
    <View style={styles.panel}>
      <Text style={styles.kicker}>Kingdom · {leader ? LEADER_LINE[leader] : 'Unclaimed'}</Text>
      <Text style={styles.panelTitle}>{kingdom.name}</Text>
      <View style={styles.figureRow}>
        <Figure value={yours} label="You" color={colors.brand} />
        <Figure value={theirs} label={DEMO_RIVAL.name} color={colors.textPrimary} />
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
                  {/* Who has eaten here. */}
                  {yourSpots.has(key) ? (
                    <View style={[styles.dot, { backgroundColor: colors.brand }]} />
                  ) : null}
                  {rivalSpots.has(key) ? (
                    <View style={[styles.dot, { backgroundColor: colors.ink }]} />
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
  const kingdom = kingdomById(place.kingdomId);
  return (
    <View style={styles.panel}>
      <Text style={styles.kicker}>Pizza place{kingdom ? ` · ${kingdom.name}` : ''}</Text>
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
  // Two equal columns, you and the rival, each centered. The dot beside the
  // name is the key to the heat colors on the map.
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
  sampleNote: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  mapWrap: {
    flex: 1,
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
