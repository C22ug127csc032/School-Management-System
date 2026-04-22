export const normalizePhoneInput = value => {
  let digits = String(value || '').replace(/\D/g, '');

  if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }

  if (digits.length > 10 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
};

export const isValidIndianPhone = value => /^[6-9]\d{9}$/.test(normalizePhoneInput(value));

export const normalizeIdentifierInput = value => {
  const trimmed = String(value || '').trim();
  if (trimmed.includes('@')) return trimmed.toLowerCase();
  return normalizePhoneInput(trimmed);
};

export const sanitizePhoneField = value => normalizePhoneInput(value);
