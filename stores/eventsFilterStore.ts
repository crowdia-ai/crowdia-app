import { create } from 'zustand';
import type { SortOption, TimeFilter } from '@/components/events/FilterBar';

interface EventsFilterState {
  searchQuery: string;
  debouncedSearch: string;
  sortBy: SortOption;
  timeFilter: TimeFilter;
  since: string;

  // Actions
  setSearchQuery: (query: string) => void;
  setDebouncedSearch: (query: string) => void;
  setSortBy: (sort: SortOption) => void;
  setTimeFilter: (filter: TimeFilter) => void;
  resetFilters: () => void;
  refreshSince: () => void;
}

const getInitialSince = () => new Date().toISOString();

export const useEventsFilterStore = create<EventsFilterState>((set) => ({
  searchQuery: '',
  debouncedSearch: '',
  sortBy: 'date_asc',
  timeFilter: 'all',
  since: getInitialSince(),

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setDebouncedSearch: (query: string) =>
    set({
      debouncedSearch: query,
      since: new Date().toISOString(),
    }),

  setSortBy: (sort: SortOption) =>
    set({
      sortBy: sort,
      since: new Date().toISOString(),
    }),

  setTimeFilter: (filter: TimeFilter) =>
    set({
      timeFilter: filter,
      since: new Date().toISOString(),
    }),

  resetFilters: () =>
    set({
      searchQuery: '',
      debouncedSearch: '',
      sortBy: 'date_asc',
      timeFilter: 'all',
      since: new Date().toISOString(),
    }),

  refreshSince: () => set({ since: new Date().toISOString() }),
}));
