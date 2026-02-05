import { useCallback, useEffect, useRef } from 'react';
import { useEventsFilterStore } from '@/stores/eventsFilterStore';

/**
 * Shared debounced search hook for search inputs that write to the events filter store.
 * Debounces by 300ms before updating debouncedSearch.
 */
export function useDebouncedSearch() {
  const {
    searchQuery,
    setSearchQuery,
    setDebouncedSearch,
  } = useEventsFilterStore();

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setDebouncedSearch(text);
      }, 300);
    },
    [setSearchQuery, setDebouncedSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { searchQuery, handleSearchChange };
}
