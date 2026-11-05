import { useState, useEffect, useRef, useCallback } from 'react';

export interface PaginatedResult<T> {
  data: T[];
  hasNextPage?: boolean;
  totalRecords?: number;
}

export interface UsePaginatedDropdownOptions<T> {
  fetchPage: (params: { page: number; limit: number; search: string }) => Promise<PaginatedResult<T>>;
  limit?: number;
  getId?: (item: T) => string;
}

export function usePaginatedDropdown<T>({
  fetchPage,
  limit = 10,
  getId = (item: any) => item.id || item.value || JSON.stringify(item),
}: UsePaginatedDropdownOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // The server's total for the current search (when it reports one), so a dropdown can say "10 of 57".
  const [totalRecords, setTotalRecords] = useState<number | undefined>(undefined);

  const isFetchingRef = useRef(false);
  const activeSearchRef = useRef('');
  // Latest request wins: an older response (for example one started before a record was added) must never overwrite a newer one.
  const requestIdRef = useRef(0);

  // Callers usually pass inline closures (fetchPage / getId), which are new on every render.
  // Reading them through refs keeps executeFetch / handleSearch / loadInitial identities stable, so
  // effects that depend on them do not re-fire (and re-call the API) on every render.
  const fetchPageRef = useRef(fetchPage);
  fetchPageRef.current = fetchPage;
  const getIdRef = useRef(getId);
  getIdRef.current = getId;
  const itemsLengthRef = useRef(0);
  itemsLengthRef.current = items.length;

  // Core fetch function
  const executeFetch = useCallback(
    async (targetPage: number, targetSearch: string, isAppend = false) => {
      // "Load more" waits for the running fetch; a first page / refresh / new search starts right away and supersedes it.
      if (isAppend && isFetchingRef.current) return;
      const requestId = ++requestIdRef.current;
      isFetchingRef.current = true;

      if (targetPage === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const result = await fetchPageRef.current({
          page: targetPage,
          limit,
          search: targetSearch,
        });

        // Ignore a response that was superseded by a newer request, or that belongs to an older search.
        if (requestId !== requestIdRef.current || targetSearch !== activeSearchRef.current) {
          return;
        }

        const newItems = result.data || [];

        setItems((prev) => {
          if (!isAppend || targetPage === 1) {
            return newItems;
          }
          // Deduplicate by ID
          const idOf = getIdRef.current;
          const existingIds = new Set(prev.map(idOf));
          const filteredNew = newItems.filter((item) => !existingIds.has(idOf(item)));
          return [...prev, ...filteredNew];
        });

        setTotalRecords(typeof result.totalRecords === 'number' ? result.totalRecords : undefined);

        // Determine if more records are available
        if (typeof result.hasNextPage === 'boolean') {
          setHasMore(result.hasNextPage);
        } else if (typeof result.totalRecords === 'number') {
          setHasMore(targetPage * limit < result.totalRecords);
        } else {
          setHasMore(newItems.length >= limit);
        }

        setPage(targetPage);
      } catch (err) {
        console.warn('usePaginatedDropdown fetch error:', err);
      } finally {
        if (requestId === requestIdRef.current) {
          isFetchingRef.current = false;
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [limit]
  );

  // Search handler (called by SearchableSelect onSearch)
  const handleSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      activeSearchRef.current = trimmed;
      setSearchQuery(trimmed);
      setPage(1);
      setHasMore(true);
      executeFetch(1, trimmed, false);
    },
    [executeFetch]
  );

  // Load next page on scroll
  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore || isFetchingRef.current) {
      return;
    }
    const nextPage = page + 1;
    executeFetch(nextPage, activeSearchRef.current, true);
  }, [page, isLoading, isLoadingMore, hasMore, executeFetch]);

  // Initial load or onOpen
  // Reads state through refs so its identity never changes: an empty result must not make an
  // effect that depends on loadInitial re-run and fetch again in a loop.
  const loadInitial = useCallback(() => {
    if (itemsLengthRef.current === 0 && !isFetchingRef.current) {
      executeFetch(1, activeSearchRef.current, false);
    }
  }, [executeFetch]);

  // Refresh helper
  const refresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    executeFetch(1, activeSearchRef.current, false);
  }, [executeFetch]);

  return {
    items,
    setItems,
    isLoading,
    isLoadingMore,
    hasMore,
    totalRecords,
    searchQuery,
    handleSearch,
    loadMore,
    loadInitial,
    refresh,
  };
}

