import React from 'react';
import SearchableSelect from './SearchableSelect';

export default function ListControls({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  sortValue,
  onSortChange,
  sortOptions = [],
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  resultCount,
  extraFilters,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 border border-border bg-slate-50 p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        {typeof searchValue === 'string' && onSearchChange && (
          <input
            className="input w-full sm:w-64"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
          />
        )}

        {sortOptions.length > 0 && onSortChange && (
          <SearchableSelect
            className="w-full sm:w-48"
            value={sortValue}
            onChange={onSortChange}
            placeholder="Sort records"
            searchPlaceholder="Search sort options..."
            options={sortOptions.map(option => ({
              value: option.value,
              label: option.label,
              searchText: option.label,
            }))}
          />
        )}

        {onPageSizeChange && (
          <SearchableSelect
            className="w-full sm:w-36"
            value={String(pageSize)}
            onChange={value => onPageSizeChange(Number(value))}
            placeholder="Page size"
            searchPlaceholder="Search sizes..."
            options={pageSizeOptions.map(option => ({
              value: String(option),
              label: `${option} / page`,
              searchText: String(option),
            }))}
          />
        )}

        {extraFilters}
      </div>

      {typeof resultCount === 'number' && (
        <p className="px-1 text-xs font-medium uppercase tracking-[0.08em] text-text-secondary">
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
