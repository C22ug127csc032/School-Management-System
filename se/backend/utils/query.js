export const escapeRegex = value => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createSearchRegex = value => new RegExp(escapeRegex(value), 'i');

export const toPositiveInt = (value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

export const parseListQuery = (
  query,
  {
    defaultPage = 1,
    defaultLimit = 20,
    maxLimit = 100,
    defaultSortBy = 'createdAt',
    defaultSortOrder = 'desc',
  } = {}
) => {
  const page = toPositiveInt(query.page, defaultPage, { min: 1 });
  const limit = toPositiveInt(query.limit, defaultLimit, { min: 1, max: maxLimit });
  const sortBy = query.sortBy || defaultSortBy;
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : defaultSortOrder === 'asc' ? 'asc' : 'desc';

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sortBy,
    sortOrder,
  };
};

const normalizeSortSpec = (sortSpec, sortOrder) => {
  if (typeof sortSpec === 'string') {
    return { [sortSpec]: sortOrder === 'asc' ? 1 : -1 };
  }

  if (typeof sortSpec === 'function') {
    return normalizeSortSpec(sortSpec(sortOrder), sortOrder);
  }

  if (sortSpec && typeof sortSpec === 'object') {
    return Object.entries(sortSpec).reduce((acc, [key, value]) => {
      if (typeof value === 'number') {
        acc[key] = value < 0
          ? (sortOrder === 'asc' ? -1 : 1)
          : (sortOrder === 'asc' ? 1 : -1);
        return acc;
      }

      acc[key] = sortOrder === 'asc' ? 1 : -1;
      return acc;
    }, {});
  }

  return {};
};

export const resolveSort = (sortBy, sortOrder, allowedSorts = {}, fallbackSortBy) => {
  const key = allowedSorts[sortBy] ? sortBy : fallbackSortBy;
  const sortSpec = allowedSorts[key];
  return {
    sortBy: key,
    sort: normalizeSortSpec(sortSpec, sortOrder),
  };
};

export const createPaginatedResponse = ({ data, total, page, limit, extra = {} }) => ({
  success: true,
  data,
  total,
  page,
  limit,
  pages: Math.max(1, Math.ceil(total / limit)),
  ...extra,
});
