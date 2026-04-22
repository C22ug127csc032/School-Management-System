export const isValidIndianPhone = (v) => /^[6-9]\d{9}$/.test(v);
export const normalizePhone = (v) => {
  if (!v) return v;
  const digits = v.replace(/\D/g, '');
  return digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
};
