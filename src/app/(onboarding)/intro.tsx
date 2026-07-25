import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { colors, spacing, fontSize, radii } from '../../constants/theme';

type Panel = {
  key: string;
  symbol: SFSymbol;
  title: string;
  body: string;
};

const PANELS: Panel[] = [
  {
    key: 'log',
    symbol: 'camera.fill',
    title: 'Log a slice with a photo',
    body: 'Snap your slice before the first bite. Every pizza you eat becomes part of your record.',
  },
  {
    key: 'score',
    symbol: 'slider.horizontal.3',
    title: 'Score it from Vom to Nirvana',
    body: 'One honest slider, six zones. Was it a regret or a religious experience? You decide.',
  },
  {
    key: 'rank',
    symbol: 'trophy.fill',
    title: 'Climb your ranking and earn points',
    body: 'Build your personal hall of fame, keep your streak alive, and rack up points with every log.',
  },
];

export default function Intro() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList<Panel>>(null);

  const isLastPage = page === PANELS.length - 1;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== page && next >= 0 && next < PANELS.length) setPage(next);
  };

  const handleNext = () => {
    if (isLastPage) {
      router.push('/(onboarding)/taste');
      return;
    }
    listRef.current?.scrollToIndex({ index: page + 1, animated: true });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.skipButton}
          onPress={() => router.push('/(onboarding)/taste')}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={PANELS}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => (
          <View style={[styles.panel, { width }]}>
            <SymbolView
              name={item.symbol}
              size={72}
              tintColor={colors.brand}
              style={styles.panelSymbol}
            />
            <Text style={styles.panelTitle}>{item.title}</Text>
            <Text style={styles.panelBody}>{item.body}</Text>
          </View>
        )}
      />

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {PANELS.map((panel, index) => (
            <View
              key={panel.key}
              style={[styles.dot, index === page && styles.dotActive]}
            />
          ))}
        </View>

        <Pressable style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>
            {isLastPage ? 'Get started' : 'Next'}
          </Text>
        </Pressable>
      </View>
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
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  panel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  panelSymbol: {
    marginBottom: spacing.lg,
  },
  panelTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  panelBody: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    // border (#E3D3B8) is nearly invisible on the flour bg; textMuted reads
    // as an inactive dot without competing with the brand-colored active dot.
    backgroundColor: colors.textMuted,
  },
  dotActive: {
    backgroundColor: colors.brand,
    width: 20,
  },
  primaryButton: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
