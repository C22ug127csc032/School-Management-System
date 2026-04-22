import React, { useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiInbox, FiX } from './icons';
export { default as ListControls } from './ListControls';
export { default as SearchableSelect } from './SearchableSelect';
export { default as ExportActions } from './ExportActions';

export const Spinner = ({ size = 'md' }) => {
  const s = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size];
  return <div className={`animate-spin rounded-full border-2 border-primary-200 border-t-primary-700 ${s}`} />;
};

export const PageSpinner = () => (
  <div className="flex items-center justify-center px-4 py-16 sm:py-20"><Spinner size="lg" /></div>
);

export const StatusBadge = ({ status }) => {
  const map = {
    active: 'badge-green', inactive: 'badge-gray', paid: 'badge-green',
    partial: 'badge-yellow', pending: 'badge-yellow', overdue: 'badge-red',
    approved: 'badge-green', rejected: 'badge-red', success: 'badge-green',
    failed: 'badge-red', returned: 'badge-blue', issued: 'badge-yellow',
    graduated: 'badge-blue', dropped: 'badge-gray',
  };
  return <span className={map[status] || 'badge-gray'}>{status?.replace('_', ' ')}</span>;
};

export const EmptyState = ({ message = 'No data found', icon = <FiInbox /> }) => (
  <div className="float-in border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-text-secondary shadow-sm sm:px-6 sm:py-14">
    <div className="mb-4 flex justify-center text-4xl text-primary-400">{icon}</div>
    <p className="text-sm font-semibold uppercase tracking-[0.08em]">{message}</p>
  </div>
);

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="campus-panel float-in mb-5 flex flex-col gap-4 px-4 py-4 sm:mb-6 sm:px-5 sm:py-5 lg:flex-row lg:items-start lg:justify-between">
    <div className="max-w-3xl min-w-0">
      <span className="institution-tag mb-3">Campus Workspace</span>
      <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{subtitle}</p>}
    </div>
    {action && <div className="w-full lg:w-auto lg:self-center">{action}</div>}
  </div>
);

export const StatCard = ({ icon, label, value, color = 'blue', sub }) => {
  const colors = {
    blue: 'bg-primary-50 text-primary-700 border border-primary-100',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    yellow: 'bg-amber-50 text-amber-700 border border-amber-100',
    red: 'bg-red-50 text-red-700 border border-red-100',
    purple: 'bg-violet-50 text-violet-700 border border-violet-100',
  };
  return (
    <div className="stat-card">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center text-xl ${colors[color]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{label}</p>
        <p className="mt-1 text-xl font-semibold text-text-primary sm:text-2xl">{value}</p>
        {sub && <p className="mt-1 text-xs text-text-secondary">{sub}</p>}
      </div>
    </div>
  );
};

export const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="fixed inset-0 bg-slate-950/45" onClick={onClose} />
        <div className={`relative z-10 w-full overflow-visible border border-border bg-white shadow-md ${sizes[size]}`}>
          <div className="flex items-center justify-between border-b border-border bg-slate-50 px-4 py-4 sm:px-5">
            <h3 className="text-base font-semibold uppercase tracking-[0.08em] text-text-primary">{title}</h3>
            <button onClick={onClose} className="text-xl leading-none text-text-secondary transition-colors hover:text-text-primary">
              <FiX />
            </button>
          </div>
          <div className="overflow-visible p-4 sm:p-5">{children}</div>
        </div>
      </div>
    </div>
  );
};

export const ScrollableTableArea = ({
  children,
  className = '',
  contentClassName = '',
  hint = 'Scroll to view more',
}) => {
  const scrollRef = useRef(null);
  const [scrollState, setScrollState] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;

    const updateScrollState = () => {
      const maxScrollLeft = Math.max(element.scrollWidth - element.clientWidth, 0);
      const nextState = {
        hasOverflow: maxScrollLeft > 12,
        canScrollLeft: element.scrollLeft > 8,
        canScrollRight: element.scrollLeft < maxScrollLeft - 8,
      };

      setScrollState(current => (
        current.hasOverflow === nextState.hasOverflow &&
        current.canScrollLeft === nextState.canScrollLeft &&
        current.canScrollRight === nextState.canScrollRight
          ? current
          : nextState
      ));
    };

    updateScrollState();
    element.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateScrollState);
      observer.observe(element);
      if (element.firstElementChild) observer.observe(element.firstElementChild);
    }

    return () => {
      element.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      observer?.disconnect();
    };
  }, [children]);

  return (
    <div className={`relative ${className}`}>
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 z-[1] w-8 bg-gradient-to-r from-white via-white/90 to-transparent transition-opacity ${
          scrollState.hasOverflow && scrollState.canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l from-white via-white/90 to-transparent transition-opacity ${
          scrollState.hasOverflow && scrollState.canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div ref={scrollRef} className={`overflow-x-auto ${contentClassName}`}>
        {children}
      </div>
      {scrollState.hasOverflow && (
        <div
          aria-hidden="true"
          className="border-t border-border bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-700 sm:px-4"
        >
          <span className="sm:hidden">Swipe horizontally to see more columns</span>
          <span className="hidden sm:inline">{hint}</span>
        </div>
      )}
    </div>
  );
};

export const Table = ({ headers, children, empty, minWidth = 'min-w-[720px]' }) => (
  <div className="overflow-hidden border border-border bg-white shadow-sm">
    <ScrollableTableArea>
      <table className={`${minWidth} w-full`}>
        <thead className="border-b border-border bg-slate-100">
          <tr>{headers.map((h, i) => <th key={i} className="table-header">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </ScrollableTableArea>
    {empty}
  </div>
);

export const FormField = ({ label, error, children, required }) => (
  <div>
    <label className="label">{label}{required && <span className="ml-0.5 text-red-600">*</span>}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

export const FilterBar = ({ children }) => (
  <div className="mb-4 flex flex-col gap-3 border border-border bg-slate-50 p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">{children}</div>
);

export const Pagination = ({ page, pages, onPage }) => {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      <button disabled={page === 1} onClick={() => onPage(page - 1)} className="btn-secondary flex min-w-[120px] items-center justify-center gap-1 px-3 py-2 text-sm disabled:opacity-40">
        <FiChevronLeft /> Prev
      </button>
      <span className="w-full text-center text-sm font-medium text-text-secondary sm:w-auto">Page {page} of {pages}</span>
      <button disabled={page === pages} onClick={() => onPage(page + 1)} className="btn-secondary flex min-w-[120px] items-center justify-center gap-1 px-3 py-2 text-sm disabled:opacity-40">
        Next <FiChevronRight />
      </button>
    </div>
  );
};
