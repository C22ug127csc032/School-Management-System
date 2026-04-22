export const LANDING_SECTION_ORDER = [
  'hero',
  'stats',
  'overview',
  'modules',
  'features',
  'preview',
  'pricing',
  'cta',
  'testimonials',
  'faq',
  'contact',
  'footer',
];

export const LANDING_SECTION_LABELS = {
  hero: 'Hero',
  stats: 'Trust / Stats',
  overview: 'Product Overview',
  modules: 'Modules Showcase',
  features: 'Features',
  preview: 'Product Preview',
  pricing: 'Pricing',
  cta: 'Free Trial / CTA',
  testimonials: 'Testimonials',
  faq: 'FAQ',
  contact: 'Contact / Demo',
  footer: 'Footer',
};

export const EMPTY_LANDING_PAGE = {
  hero: null,
  stats: null,
  overview: null,
  modules: null,
  features: null,
  preview: null,
  pricing: null,
  cta: null,
  testimonials: null,
  faq: null,
  contact: null,
  footer: null,
  sectionVisibility: Object.fromEntries(LANDING_SECTION_ORDER.map(sectionKey => [sectionKey, true])),
  sectionOrder: [...LANDING_SECTION_ORDER],
};

export const normalizeLandingPagePayload = payload => {
  const source = payload && typeof payload === 'object' ? payload : {};
  const sectionVisibility = {
    ...EMPTY_LANDING_PAGE.sectionVisibility,
    ...(source.sectionVisibility || {}),
  };
  const sectionOrder = Array.isArray(source.sectionOrder) ? source.sectionOrder : LANDING_SECTION_ORDER;
  const normalizedOrder = Array.from(
    new Set([
      ...sectionOrder.filter(sectionKey => LANDING_SECTION_ORDER.includes(sectionKey)),
      ...LANDING_SECTION_ORDER,
    ])
  );

  return {
    ...EMPTY_LANDING_PAGE,
    ...source,
    sectionVisibility,
    sectionOrder: normalizedOrder,
  };
};

export const cloneLandingPagePayload = payload =>
  JSON.parse(JSON.stringify(normalizeLandingPagePayload(payload)));

export const updateValueAtPath = (source, path, nextValue) => {
  const nextState = cloneLandingPagePayload(source);
  const segments = String(path || '').split('.').filter(Boolean);
  if (!segments.length) {
    return nextState;
  }

  let cursor = nextState;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const nextSegment = segments[index + 1];
    if (!(segment in cursor) || cursor[segment] === null || cursor[segment] === undefined) {
      cursor[segment] = /^\d+$/.test(nextSegment) ? [] : {};
    }
    cursor = cursor[segment];
  }

  cursor[segments[segments.length - 1]] = nextValue;
  return nextState;
};

export const moveSection = (currentOrder, sectionKey, direction) => {
  const order = Array.isArray(currentOrder) ? [...currentOrder] : [...LANDING_SECTION_ORDER];
  const currentIndex = order.indexOf(sectionKey);
  if (currentIndex === -1) return order;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= order.length) {
    return order;
  }

  const nextOrder = [...order];
  [nextOrder[currentIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[currentIndex]];
  return nextOrder;
};

export default {
  cloneLandingPagePayload,
  EMPTY_LANDING_PAGE,
  LANDING_SECTION_LABELS,
  LANDING_SECTION_ORDER,
  moveSection,
  normalizeLandingPagePayload,
  updateValueAtPath,
};
