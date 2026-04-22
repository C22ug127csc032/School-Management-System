import { useEffect, useMemo, useState } from 'react';

const getValueByPath = (item, path) =>
  String(path.split('.').reduce((acc, part) => acc?.[part], item) ?? '');

const defaultCompare = (left, right) =>
  String(left ?? '').localeCompare(String(right ?? ''), undefined, {
    sensitivity: 'base',
    numeric: true,
  });

export default function useListControls({
  items = [],
  searchFields = [],
  sortOptions = [],
  initialSort,
  initialPageSize = 10,
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(initialSort || sortOptions[0]?.value || '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    if (!sortOptions.length) return;
    if (!sortOptions.some(option => option.value === sort)) {
      setSort(sortOptions[0].value);
    }
  }, [sort, sortOptions]);

  useEffect(() => {
    setPage(1);
  }, [search, sort, pageSize, items.length]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter(item =>
      searchFields.some(field => {
        const value = typeof field === 'function'
          ? field(item)
          : getValueByPath(item, field);
        return String(value || '').toLowerCase().includes(query);
      })
    );
  }, [items, search, searchFields]);

  const sortedItems = useMemo(() => {
    const currentSort = sortOptions.find(option => option.value === sort);
    if (!currentSort) return filteredItems;

    const list = [...filteredItems];
    list.sort((a, b) => {
      if (currentSort.compare) return currentSort.compare(a, b);

      const left = currentSort.getValue ? currentSort.getValue(a) : a;
      const right = currentSort.getValue ? currentSort.getValue(b) : b;
      return defaultCompare(left, right);
    });

    return list;
  }, [filteredItems, sort, sortOptions]);

  const pages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const safePage = Math.min(page, pages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [pageSize, safePage, sortedItems]);

  return {
    search,
    setSearch,
    sort,
    setSort,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    totalItems: sortedItems.length,
    pages,
    items: paginatedItems,
    allItems: sortedItems,
  };
}
