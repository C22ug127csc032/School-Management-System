import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiX } from 'react-icons/fi';

const normalizeText = value => String(value || '').toLowerCase();

export default function SearchableSelect({
  options = [],
  persistentOptions = [],
  value = '',
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Type to search...',
  emptyMessage = 'No options found',
  className = '',
  disabled = false,
  required = false,
}) {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openUpwards, setOpenUpwards] = useState(false);
  const [panelMaxHeight, setPanelMaxHeight] = useState(240);

  const normalizedValue = String(value ?? '');
  const selectedOption = useMemo(
    () => options.find(option => String(option.value ?? '') === normalizedValue) || null,
    [options, normalizedValue]
  );
  const selectedLabel = selectedOption?.label || '';

  useEffect(() => {
    if (!open) {
      setQuery(currentQuery => (currentQuery === selectedLabel ? currentQuery : selectedLabel));
    }
  }, [open, selectedLabel]);

  useEffect(() => {
    const handlePointerDown = event => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const updatePanelPlacement = () => {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const preferredHeight = 240;
      const gap = 12;
      const spaceBelow = Math.max(viewportHeight - rect.bottom - gap, 120);
      const spaceAbove = Math.max(rect.top - gap, 120);
      const shouldOpenUpwards = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
      const nextPanelMaxHeight = Math.max(Math.min(shouldOpenUpwards ? spaceAbove : spaceBelow, preferredHeight), 120);

      setOpenUpwards(currentValue => (currentValue === shouldOpenUpwards ? currentValue : shouldOpenUpwards));
      setPanelMaxHeight(currentValue => (currentValue === nextPanelMaxHeight ? currentValue : nextPanelMaxHeight));
    };

    updatePanelPlacement();
    window.addEventListener('resize', updatePanelPlacement);
    window.addEventListener('scroll', updatePanelPlacement, true);

    return () => {
      window.removeEventListener('resize', updatePanelPlacement);
      window.removeEventListener('scroll', updatePanelPlacement, true);
    };
  }, [open]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    if (!normalizedQuery) return options;

    return options.filter(option => {
      const haystack = `${option.label || ''} ${option.searchText || ''}`;
      return normalizeText(haystack).includes(normalizedQuery);
    });
  }, [options, query]);

  const visibleOptions = useMemo(() => {
    const seenValues = new Set();
    return [...filteredOptions, ...persistentOptions].filter(option => {
      const optionValue = String(option?.value ?? '');
      if (seenValues.has(optionValue)) return false;
      seenValues.add(optionValue);
      return true;
    });
  }, [filteredOptions, persistentOptions]);

  const handleSelect = nextValue => {
    onChange?.(nextValue);
    setOpen(false);
  };

  const displayValue = open ? query : selectedLabel;
  const canClear = !disabled && typeof onChange === 'function' && (Boolean(normalizedValue) || Boolean(query));

  const handleClear = event => {
    event.preventDefault();
    event.stopPropagation();
    onChange?.('');
    setQuery('');
    setOpen(true);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  return (
    <div ref={containerRef} className={`relative ${className}`.trim()}>
      {required && (
        <input
          tabIndex={-1}
          value={normalizedValue ? '__selected__' : ''}
          onChange={() => {}}
          required
          className="pointer-events-none absolute left-0 top-0 h-0 w-0 opacity-0"
          aria-hidden="true"
        />
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="input pr-16"
          value={displayValue}
          placeholder={open ? searchPlaceholder : placeholder}
          disabled={disabled}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setQuery('');
          }}
          onChange={event => {
            if (!open) setOpen(true);
            setQuery(event.target.value);
          }}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              setOpen(false);
              setQuery(selectedLabel);
            }
          }}
        />
        {canClear && (
          <button
            type="button"
            onMouseDown={handleClear}
            className="absolute inset-y-0 right-8 flex items-center pr-1 text-text-secondary transition-colors hover:text-text-primary"
            aria-label="Clear selection"
          >
            <FiX />
          </button>
        )}
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary">
          <FiChevronDown className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </div>

      {open && !disabled && (
        <div
          className={`absolute z-[70] w-full overflow-auto border border-border bg-white shadow-md ${
            openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ maxHeight: `${panelMaxHeight}px` }}
        >
          {visibleOptions.length ? (
            visibleOptions.map(option => (
              <button
                key={`${option.value}`}
                type="button"
                className={`flex w-full items-start justify-between border-b border-slate-100 px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-slate-50 ${
                  String(option.value ?? '') === normalizedValue ? 'bg-primary-50 text-primary-700' : 'text-text-primary'
                }`}
                onMouseDown={event => {
                  event.preventDefault();
                  handleSelect(option.value);
                }}
              >
                <span>{option.label}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2.5 text-sm text-text-secondary">{emptyMessage}</div>
          )}
        </div>
      )}
    </div>
  );
}
