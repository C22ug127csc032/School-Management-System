export const toSelectOptions = (options = []) =>
  (Array.isArray(options) ? options : [])
    .filter(option => option?.isActive !== false)
    .map((option, index) => ({
      value: option?.value ?? '',
      label: option?.label ?? option?.value ?? '',
      searchText: `${option?.label ?? option?.value ?? ''} ${option?.value ?? ''}`.trim(),
      sortOrder: Number(option?.sortOrder || index + 1),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

export const getFirstActiveValue = (options = [], fallbackValue = '') => {
  const activeOption = (Array.isArray(options) ? options : []).find(option => option?.isActive !== false);
  return activeOption?.value ?? fallbackValue;
};

export const formatSettingLabel = value =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, match => match.toUpperCase());
