const normalizeValue = value => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.toLowerCase();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return value.map(normalizeValue).join(' ');
  return String(value).toLowerCase();
};

const compareValues = (left, right) => {
  if (left === right) return 0;

  if (left === null || left === undefined || left === '') return 1;
  if (right === null || right === undefined || right === '') return -1;

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
};

export const applyClientListOperations = ({
  data,
  search = '',
  searchFields = [],
  filters = {},
  filterFns = {},
  sortBy = '',
  sortOrder = 'asc',
  sortAccessors = {},
}) => {
  let rows = [...data];

  if (search.trim() && searchFields.length) {
    const needle = search.trim().toLowerCase();
    rows = rows.filter(item => searchFields.some(field => {
      const value = typeof field === 'function' ? field(item) : item?.[field];
      return normalizeValue(value).includes(needle);
    }));
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) return;

    const filterFn = filterFns[key];
    rows = rows.filter(item => (filterFn ? filterFn(item, value) : item?.[key] === value));
  });

  if (sortBy) {
    const accessor = sortAccessors[sortBy];

    rows.sort((a, b) => {
      const left = accessor ? accessor(a) : a?.[sortBy];
      const right = accessor ? accessor(b) : b?.[sortBy];
      const comparison = compareValues(left, right);
      return sortOrder === 'desc' ? comparison * -1 : comparison;
    });
  }

  return rows;
};
