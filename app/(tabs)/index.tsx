import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EventCard, SearchBar } from '@/components/events';
import { FilterDrawer } from '@/components/filters';
import { GlowingLogo } from '@/components/ui/glowing-logo';
import { Colors, Spacing, Typography, Magenta } from '@/constants/theme';
import { EventWithStats } from '@/types/database';
import { useEventsFilterStore } from '@/stores/eventsFilterStore';
import { useFilteredEventsInfinite } from '@/hooks/useFilteredEvents';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

export default function EventsFeedScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { debouncedSearch, hasActiveFilters } = useEventsFilterStore();
  const [filterVisible, setFilterVisible] = useState(false);

  const { searchQuery, handleSearchChange } = useDebouncedSearch();

  const {
    events,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFilteredEventsInfinite();

  const handleEventPress = useCallback(
    (eventId: string) => {
      router.push(`/event/${eventId}`);
    },
    [router]
  );

  const renderEvent = useCallback(
    ({ item }: { item: EventWithStats }) => (
      <EventCard event={item} onPress={() => handleEventPress(item.id!)} />
    ),
    [handleEventPress]
  );

  const keyExtractor = useCallback((item: EventWithStats) => item.id!, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const ListFooter = useMemo(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Magenta[500]} />
      </View>
    );
  }, [isFetchingNextPage]);

  const EmptyState = useMemo(
    () => (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>{debouncedSearch ? '🔍' : '📅'}</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {debouncedSearch ? 'No events found' : 'No upcoming events'}
        </Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {debouncedSearch
            ? 'Try a different search term'
            : 'Check back later for new events'}
        </Text>
      </View>
    ),
    [debouncedSearch, colors]
  );

  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorState}>
          <Text style={styles.emptyEmoji}>😕</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Something went wrong
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {error instanceof Error ? error.message : 'Failed to load events'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRow}>
          <GlowingLogo size={32} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Crowdia</Text>
        </View>
      </View>

      {/* Search + Filter Button */}
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearchChange}
        placeholder="Search events..."
        onFilterPress={() => setFilterVisible(true)}
        hasActiveFilters={hasActiveFilters()}
      />

      {/* Filter Drawer */}
      <FilterDrawer
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
      />

      {/* Events List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Magenta[500]} />
        </View>
      ) : (
        <FlashList
          data={events}
          renderItem={renderEvent}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={refetch}
              tintColor={Magenta[500]}
              colors={[Magenta[500]]}
            />
          }
          ListEmptyComponent={EmptyState}
          ListFooterComponent={ListFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  listContent: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: Typography.sm,
    textAlign: 'center',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
});
