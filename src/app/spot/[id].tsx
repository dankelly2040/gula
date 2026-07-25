import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '../../lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppleMaps } from 'expo-maps';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePizzaLogs } from '../../hooks/use-pizza-logs';
import { PizzaCard } from '../../components/pizza-card';
import { useDraftLogStore } from '../../state/draft-log';
import { supabase } from '../../lib/supabase';
import { PillButton } from '../../components/sticker';
import { colors, spacing, fontSize, radii, sticker } from '../../constants/theme';
import type { Spot } from '../../db/types';
import type { DiscoverData } from '../../hooks/use-discover';

export default function SpotDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: logs } = usePizzaLogs();

  // Prefer the spot already sitting in the discover cache.
  const cachedSpot = useMemo<Spot | null>(() => {
    if (!id) return null;
    const entries = queryClient.getQueriesData<DiscoverData>({ queryKey: ['discover'] });
    for (const [, data] of entries) {
      const found = data?.spots.find((s) => s.id === id);
      if (found) return found;
    }
    return null;
  }, [queryClient, id]);

  const { data: fetchedSpot } = useQuery({
    queryKey: ['spot', id],
    enabled: cachedSpot == null && !!id,
    queryFn: async (): Promise<Spot | null> => {
      try {
        const { data, error } = await supabase
          .from('spots')
          .select('id, name, address, lat, lng')
          .eq('id', id)
          .maybeSingle();
        if (error || !data) return null;
        return data as Spot;
      } catch {
        return null;
      }
    },
  });

  const spot = cachedSpot ?? fetchedSpot ?? null;
  const myLogs = (logs ?? []).filter((l) => l.spotId === id);
  const name = spot?.name ?? myLogs[0]?.spotName ?? 'Pizza spot';

  const handleLogHere = () => {
    if (!id) return;
    const draft = useDraftLogStore.getState();
    draft.reset();
    draft.setSpot(id, name);
    router.push('/log/capture');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Pressable onPress={() => goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.name}>{name}</Text>
        {spot?.address ? <Text style={styles.address}>{spot.address}</Text> : null}

        {spot?.lat != null && spot?.lng != null && (
          <View style={styles.mapWrap}>
            <AppleMaps.View
              style={styles.map}
              cameraPosition={{
                coordinates: { latitude: spot.lat, longitude: spot.lng },
                zoom: 15,
              }}
              markers={[
                {
                  id: spot.id,
                  coordinates: { latitude: spot.lat, longitude: spot.lng },
                  title: spot.name,
                  systemImage: 'fork.knife',
                  tintColor: colors.brand,
                },
              ]}
            />
          </View>
        )}

        <PillButton onPress={handleLogHere} label="Log a slice here" style={styles.logButton} />

        <Text style={styles.sectionTitle}>Your logs here</Text>
        {myLogs.length === 0 ? (
          <Text style={styles.emptyText}>
            You have not logged a slice at this spot yet.
          </Text>
        ) : (
          <View style={styles.logList}>
            {myLogs.map((log) => (
              <PizzaCard key={log.id} log={log} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  name: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  address: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  // Sticker frame around the map viewport; the map itself stays native.
  mapWrap: {
    height: 180,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    ...sticker.border,
    ...sticker.shadowSm,
  },
  map: {
    flex: 1,
  },
  logButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  logList: {
    gap: spacing.sm,
  },
});
