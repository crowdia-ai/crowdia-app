import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Magenta,
  Charcoal,
} from '@/constants/theme';
import { useEventsFilterStore } from '@/stores/eventsFilterStore';
import type { TimeFilter, SortOption } from '@/stores/eventsFilterStore';
import { useCategories } from '@/hooks/useCategories';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'nightlife': 'moon',
  'concert': 'musical-notes',
  'party': 'sparkles',
  'theater': 'ticket',
  'comedy': 'happy',
  'art': 'color-palette',
  'food-wine': 'wine',
  'tour': 'walk',
  'festival': 'bonfire',
  'workshop': 'construct',
  'cultural': 'library',
  'sports': 'football',
  'family': 'people',
  'networking': 'chatbubbles',
  'film': 'film',
  'other': 'ellipse',
};

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_weekend', label: 'Weekend' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date_asc', label: 'Soonest First' },
  { value: 'date_desc', label: 'Latest First' },
  { value: 'popular', label: 'Most Popular' },
];

interface FilterDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function FilterDrawer({ visible, onClose }: FilterDrawerProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const panelHeight = screenHeight * 0.65;
  const translateY = useSharedValue(panelHeight);
  const backdropOpacity = useSharedValue(0);

  const {
    timeFilter,
    setTimeFilter,
    sortBy,
    setSortBy,
    categoryIds,
    toggleCategory,
    resetFilters,
    hasActiveFilters,
  } = useEventsFilterStore();

  const { data: categories } = useCategories();

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [visible]);

  const handleClose = () => {
    translateY.value = withTiming(panelHeight, {
      duration: 250,
      easing: Easing.in(Easing.cubic),
    }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
    backdropOpacity.value = withTiming(0, { duration: 250 });
  };

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Panel */}
        <Animated.View
          style={[
            styles.panel,
            {
              height: panelHeight,
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + Spacing.md,
            },
            panelStyle,
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Filters</Text>
            {hasActiveFilters() && (
              <Pressable
                onPress={resetFilters}
                style={({ pressed }) => [pressed && { opacity: 0.8 }]}
              >
                <Text style={[styles.resetText, { color: Magenta[500] }]}>Reset</Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* When section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                When
              </Text>
              <View style={styles.chipRow}>
                {TIME_FILTERS.map((filter) => {
                  const isActive = timeFilter === filter.value;
                  return (
                    <Pressable
                      key={filter.value}
                      onPress={() => setTimeFilter(filter.value)}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: isActive
                            ? Magenta[500]
                            : colors.inputBackground,
                        },
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isActive ? '#fff' : colors.textSecondary,
                          },
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Sort By section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Sort By
              </Text>
              <View style={styles.radioList}>
                {SORT_OPTIONS.map((option) => {
                  const isActive = sortBy === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setSortBy(option.value)}
                      style={({ pressed }) => [
                        styles.radioRow,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <View
                        style={[
                          styles.radioOuter,
                          {
                            borderColor: isActive
                              ? Magenta[500]
                              : colors.textMuted,
                          },
                        ]}
                      >
                        {isActive && <View style={styles.radioInner} />}
                      </View>
                      <Text
                        style={[
                          styles.radioLabel,
                          { color: isActive ? colors.text : colors.textSecondary },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Category section */}
            {categories && categories.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Category
                </Text>
                <View style={styles.chipGrid}>
                  {categories.map((cat) => {
                    const isActive = categoryIds.includes(cat.id);
                    const slug = cat.slug?.toLowerCase() ?? 'other';
                    const iconName =
                      CATEGORY_ICONS[slug] || CATEGORY_ICONS['other'];
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => toggleCategory(cat.id)}
                        style={({ pressed }) => [
                          styles.chip,
                          {
                            backgroundColor: isActive
                              ? Magenta[500]
                              : colors.inputBackground,
                          },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Ionicons
                          name={iconName}
                          size={14}
                          color={isActive ? '#fff' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: isActive ? '#fff' : colors.textSecondary,
                            },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panel: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
  },
  resetText: {
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    fontSize: Typography.sm,
    fontWeight: '500',
  },
  radioList: {
    gap: Spacing.md,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Magenta[500],
  },
  radioLabel: {
    fontSize: Typography.sm,
    fontWeight: '500',
  },
});
