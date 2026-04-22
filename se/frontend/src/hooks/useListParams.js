import { useMemo, useState, useCallback } from 'react';

const removeEmptyValues = params => {
  const next = { ...params };

  Object.keys(next).forEach(key => {
    const value = next[key];
    if (
      value === ''
      || value === null
      || value === undefined
      || (Array.isArray(value) && value.length === 0)
    ) {
      delete next[key];
    }
  });

  return next;
};

export default function useListParams({
  initialFilters = {},
  initialPage = 1,
  initialLimit = 20,
  initialSearch = '',
  initialSortBy = '',
  initialSortOrder = 'asc',
} = {}) {
  const [page, setPageState] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);
  const [search, setSearchState] = useState(initialSearch);
  const [filters, setFiltersState] = useState(initialFilters);
  const [sortBy, setSortByState] = useState(initialSortBy);
  const [sortOrder, setSortOrderState] = useState(initialSortOrder);

  const setPage = useCallback(nextPage => {
    setPageState(nextPage);
  }, []);

  const setLimit = useCallback(nextLimit => {
    setLimitState(nextLimit);
    setPageState(1);
  }, []);

  const setSearch = useCallback(value => {
    setSearchState(value);
    setPageState(1);
  }, []);

  const setFilter = useCallback((key, value) => {
    setFiltersState(current => ({ ...current, [key]: value }));
    setPageState(1);
  }, []);

  const setFilters = useCallback(updater => {
    setFiltersState(current => (typeof updater === 'function' ? updater(current) : updater));
    setPageState(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(initialFilters);
    setSearchState(initialSearch);
    setSortByState(initialSortBy);
    setSortOrderState(initialSortOrder);
    setPageState(initialPage);
    setLimitState(initialLimit);
  }, [initialFilters, initialSearch, initialSortBy, initialSortOrder, initialPage, initialLimit]);

  const setSort = useCallback(nextSortBy => {
    setPageState(1);
    setSortByState(currentSortBy => {
      setSortOrderState(currentSortOrder => {
        if (currentSortBy === nextSortBy) {
          return currentSortOrder === 'asc' ? 'desc' : 'asc';
        }

        return 'asc';
      });

      return nextSortBy;
    });
  }, []);

  const params = useMemo(() => removeEmptyValues({
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    ...filters,
  }), [page, limit, search, sortBy, sortOrder, filters]);

  return {
    page,
    setPage,
    limit,
    setLimit,
    search,
    setSearch,
    filters,
    setFilter,
    setFilters,
    resetFilters,
    sortBy,
    sortOrder,
    setSort,
    params,
  };
}
