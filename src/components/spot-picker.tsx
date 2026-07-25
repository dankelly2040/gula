import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  Host,
  BottomSheet,
  Group,
  VStack,
  TextField,
  RNHostView,
  Text as NativeText,
  type TextFieldRef,
} from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  foregroundStyle,
  frame,
  padding,
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
  submitLabel,
} from '@expo/ui/swift-ui/modifiers';
import { Ionicons } from '@expo/vector-icons';
import { useDraftLogStore } from '../state/draft-log';
import { useSpotSearch, useCreateSpot } from '../hooks/use-spots';
import type { Spot } from '../db/types';
import { colors, spacing, fontSize, radii } from '../constants/theme';

/**
 * Spot picker for the details screen. The collapsed row opens a native
 * bottom sheet (SwiftUI sheet with medium/large detents) containing the
 * search field and results. Search-as-you-type against cloud + local
 * spots, with an "Add" row to create a new spot at the draft's
 * coordinates. Selection closes the sheet and collapses to a chip with a
 * clear button.
 */
export function SpotPicker() {
  const spotName = useDraftLogStore((s) => s.spotName);
  const setSpot = useDraftLogStore((s) => s.setSpot);
  const lat = useDraftLogStore((s) => s.lat);
  const lng = useDraftLogStore((s) => s.lng);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const { data: results = [], isFetching } = useSpotSearch(query);
  const createSpot = useCreateSpot();
  const searchFieldRef = useRef<TextFieldRef>(null);

  const resetQuery = () => {
    setQuery('');
    void searchFieldRef.current?.clear();
  };

  const selectSpot = (spot: Spot) => {
    setSpot(spot.id, spot.name);
    resetQuery();
    setSheetOpen(false);
  };

  const handleCreate = async () => {
    if (createSpot.isPending || trimmed.length === 0) return;
    try {
      const spot = await createSpot.mutateAsync({
        name: trimmed,
        address: null,
        lat,
        lng,
      });
      selectSpot(spot);
    } catch {
      // Keep the search state so the user can retry.
    }
  };

  const hasExactMatch = results.some(
    (r) => r.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  const showAddRow = trimmed.length > 0 && !hasExactMatch;

  return (
    <View>
      {spotName ? (
        // Collapsed state: a spot is selected.
        <View style={styles.selectedChip}>
          <Ionicons name="location" size={16} color={colors.brand} />
          <Text style={styles.selectedText} numberOfLines={1}>
            {spotName}
          </Text>
          <Pressable
            hitSlop={8}
            onPress={() => {
              setSpot(null, null);
              resetQuery();
            }}
            accessibilityLabel="Clear spot"
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.triggerRow}
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Search pizza spots"
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={styles.triggerText} numberOfLines={1}>
            {trimmed.length > 0 ? trimmed : 'Search pizza spots'}
          </Text>
          <Ionicons name="chevron-up" size={16} color={colors.textMuted} />
        </Pressable>
      )}

      {/* The sheet lives in a zero-size host; SwiftUI presents it modally. */}
      <Host style={styles.sheetHost} pointerEvents="none">
        <BottomSheet
          isPresented={sheetOpen}
          onIsPresentedChange={setSheetOpen}
        >
          <Group
            modifiers={[
              frame({ maxWidth: Infinity, alignment: 'topLeading' }),
              padding({ top: spacing.lg, leading: spacing.md, trailing: spacing.md }),
              presentationDetents(['medium', 'large']),
              presentationDragIndicator('visible'),
              presentationBackground(colors.bgCard),
            ]}
          >
            <VStack spacing={spacing.sm} alignment="leading">
              <TextField
                ref={searchFieldRef}
                autoFocus
                placeholder="Search pizza spots"
                onTextChange={setQuery}
                modifiers={[
                  submitLabel('search'),
                  padding({ horizontal: spacing.md, vertical: spacing.md }),
                  background(colors.bgInput),
                  cornerRadius(radii.md),
                  foregroundStyle(colors.textPrimary),
                ]}
              >
                <TextField.Placeholder>
                  <NativeText modifiers={[foregroundStyle(colors.textMuted)]}>
                    Search pizza spots
                  </NativeText>
                </TextField.Placeholder>
              </TextField>

              <RNHostView>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {isFetching && (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={colors.textMuted} />
                    </View>
                  )}

                  {trimmed.length > 0 && (
                    <View style={styles.results}>
                      {results.map((spot) => (
                        <Pressable
                          key={spot.id}
                          style={styles.resultRow}
                          onPress={() => selectSpot(spot)}
                        >
                          <Ionicons
                            name="pizza-outline"
                            size={18}
                            color={colors.textSecondary}
                          />
                          <View style={styles.resultText}>
                            <Text style={styles.resultName} numberOfLines={1}>
                              {spot.name}
                            </Text>
                            {spot.address ? (
                              <Text style={styles.resultAddress} numberOfLines={1}>
                                {spot.address}
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                      ))}

                      {showAddRow && (
                        <Pressable
                          style={styles.resultRow}
                          onPress={handleCreate}
                          disabled={createSpot.isPending}
                        >
                          <Ionicons
                            name="add-circle-outline"
                            size={18}
                            color={colors.brand}
                          />
                          <View style={styles.resultText}>
                            <Text style={styles.addText} numberOfLines={1}>
                              {createSpot.isPending ? 'Adding...' : `Add "${trimmed}"`}
                            </Text>
                          </View>
                        </Pressable>
                      )}
                    </View>
                  )}
                </ScrollView>
              </RNHostView>
            </VStack>
          </Group>
        </BottomSheet>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgInput,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
  },
  triggerText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  sheetHost: {
    position: 'absolute',
  },
  loadingRow: {
    paddingVertical: spacing.sm,
    alignItems: 'flex-start',
  },
  results: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  resultAddress: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  addText: {
    fontSize: fontSize.md,
    color: colors.brand,
    fontWeight: '600',
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.bgCard,
    borderColor: colors.brand,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: '100%',
  },
  selectedText: {
    flexShrink: 1,
    fontSize: fontSize.md,
    color: colors.brand,
    fontWeight: '600',
  },
});
