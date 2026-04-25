import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiSearch, FiChevronDown, FiLoader, FiAlertTriangle } from 'react-icons/fi';

// ── Modal ─────────────────────────────────────────────────────────────────────
function ModalFrame({ open, onClose, title, children, footer, size = 'md', headerContent }) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' };

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box w-full ${widths[size]}`}>
        {headerContent || (
          <div className="modal-header">
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            <button onClick={onClose} className="btn-icon"><FiX /></button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  return (
    <ModalFrame open={open} onClose={onClose} title={title} footer={footer} size={size}>
      {children}
    </ModalFrame>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title = 'Confirm', message, loading, danger = true }) {
  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      size="sm"
      headerContent={
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <FiAlertTriangle className={danger ? 'text-red-600' : 'text-amber-500'} />
            <h3 className="text-base font-semibold">{title}</h3>
          </div>
          <button onClick={onClose} className="btn-icon"><FiX /></button>
        </div>
      }
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={danger ? 'btn-danger btn-sm' : 'btn-warning btn-sm'}>
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{message}</p>
    </ModalFrame>
  );
}

// ── Searchable Select ─────────────────────────────────────────────────────────
export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  labelKey = 'label',
  valueKey = 'value',
  disabled,
  optionClassName,
  selectedClassName,
}) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  const selected = options.find(o => o[valueKey] === value);
  const resolvedSelectedClassName = typeof selectedClassName === 'function'
    ? selectedClassName(selected)
    : (selectedClassName || '');

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => String(o[labelKey] || '').toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="input flex items-center justify-between text-left"
      >
        <span className={selected ? resolvedSelectedClassName : 'text-slate-400'}>{selected ? selected[labelKey] : placeholder}</span>
        <FiChevronDown className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full border border-border bg-white shadow-md">
          <div className="border-b border-border p-2">
            <div className="flex items-center gap-2 border border-slate-300 bg-white px-2">
              <FiSearch className="shrink-0 text-slate-400 text-xs" />
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search..." className="w-full py-1.5 text-xs outline-none" />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">No results</p>
            ) : filtered.map(o => {
              const resolvedOptionClassName = typeof optionClassName === 'function'
                ? optionClassName(o)
                : (optionClassName || '');
              return (
                <button
                  key={o[valueKey]} type="button"
                  onClick={() => { onChange(o[valueKey]); setOpen(false); setQuery(''); }}
                  className={`w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${o[valueKey] === value ? 'bg-primary-50 font-semibold text-primary-700' : ''} ${resolvedOptionClassName}`}
                >{o[labelKey]}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const s = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return <div className={`${s[size]} animate-spin rounded-full border-2 border-primary-200 border-t-primary-700`} />;
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 py-20 px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300">
        {Icon && <Icon className="text-4xl" />}
      </div>
      <p className="mb-2 text-xl font-bold text-slate-900">{title}</p>
      {description && <p className="mb-8 max-w-sm mx-auto text-sm font-medium text-slate-500 leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    active:     'badge-green',  approved: 'badge-green',  paid: 'badge-green',  issued: 'badge-blue',
    pending:    'badge-yellow', partial:  'badge-yellow',
    inactive:   'badge-gray',  returned: 'badge-gray',   completed: 'badge-gray',
    rejected:   'badge-red',   overdue:  'badge-red',    absent: 'badge-red',
    transferred:'badge-purple',
    admission_pending: 'badge-yellow',
  };
  return <span className={map[status] || 'badge-gray'}>{status?.replace(/_/g, ' ')}</span>;
}

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm font-medium text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  autoComplete = 'off',
}) {
  return (
    <div className={`relative ${className}`.trim()}>
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        className="input pl-9"
        type="search"
        name="list-search"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        data-form-type="other"
      />
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options = [],
  placeholder = 'All',
  className = '',
}) {
  return (
    <select
      className={`input ${className}`.trim()}
      value={value ?? ''}
      onChange={event => onChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map(option => {
        const optionValue = option?.value ?? option;
        const optionLabel = option?.label ?? option;

        return (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        );
      })}
    </select>
  );
}

// ── Stats Card ────────────────────────────────────────────────────────────────
export function Field({
  label,
  required = false,
  error = '',
  hint = '',
  className = '',
  children,
}) {
  return (
    <div className={`form-group ${className}`.trim()}>
      {label && (
        <label className="label">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function SelectField({
  label,
  required = false,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  ...props
}) {
  return (
    <Field label={label} required={required} className={className}>
      <select
        className="input"
        value={value ?? ''}
        onChange={onChange}
        required={required}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map(option => {
          const valueOption = option?.value ?? option;
          const labelOption = option?.label ?? option;

          return (
            <option key={valueOption} value={valueOption}>
              {labelOption}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

export function StatCard({ icon: Icon, label, value, sub, color = 'text-primary-700', border = '#1D3A57' }) {
  return (
    <div className="stat-card float-in" style={{ borderLeftColor: border }}>
      <div className="stat-icon">
        <Icon className={`text-2xl ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{label}</p>
        <p className="text-2xl font-bold text-text-primary">{value ?? '—'}</p>
        {sub && <p className="text-xs text-text-secondary">{sub}</p>}
      </div>
    </div>
  );
}

// ── Table wrapper ─────────────────────────────────────────────────────────────
export function DataTable({
  columns,
  data,
  loading,
  emptyMessage = 'No records found.',
  sortBy = '',
  sortOrder = 'asc',
  onSort,
  getRowKey,
}) {
  if (loading) return <PageLoader />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map(column => {
              const isSortable = Boolean(column.sortable && onSort);
              const activeSortKey = column.sortKey || column.key;
              const isActive = sortBy === activeSortKey;
              const sortIndicator = isActive ? (sortOrder === 'asc' ? '↑' : '↓') : '↕';

              return (
                <th
                  key={column.key}
                  className={`table-header ${column.align === 'center' ? 'text-center' : ''}`}
                  style={column.width ? { width: column.width } : {}}
                >
                  {isSortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(activeSortKey)}
                      className={`inline-flex items-center gap-1 text-left transition hover:text-text-primary ${column.align === 'center' ? 'mx-auto' : ''}`}
                    >
                      <span>{column.label}</span>
                      <span className={`text-xs ${isActive ? 'text-primary-700' : 'text-slate-300'}`}>{sortIndicator}</span>
                    </button>
                  ) : column.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="py-12 text-center text-sm text-slate-400">{emptyMessage}</td></tr>
          ) : data.map((row, i) => (
            <tr key={getRowKey ? getRowKey(row, i) : row._id || i}>
              {columns.map(c => <td key={c.key} className="table-cell">{c.render ? c.render(row) : row[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="btn-secondary btn-sm">‹ Prev</button>
      <span className="px-3 text-sm text-text-secondary">Page {page} of {pages}</span>
      <button onClick={() => onPage(page + 1)} disabled={page >= pages} className="btn-secondary btn-sm">Next ›</button>
    </div>
  );
}
