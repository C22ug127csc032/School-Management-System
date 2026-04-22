import AppSetting from '../models/AppSetting.model.js';

const KEY = 'global';

export const getSettings = async () => {
  let s = await AppSetting.findOne({ key: KEY });
  if (!s) s = await AppSetting.create({ key: KEY });
  return s;
};

export const updateSettings = async (data) => {
  return AppSetting.findOneAndUpdate({ key: KEY }, { $set: data }, { new: true, upsert: true });
};

export const getSetting = async (field) => {
  const s = await getSettings();
  return s[field];
};

export const getAllowedRolesForCapability = async (capabilityKey) => {
  const s = await getSettings();
  if (s.capabilities && s.capabilities[capabilityKey])
    return s.capabilities[capabilityKey];
  const { CAPABILITY_DEFAULTS } = await import('./roles.js');
  return CAPABILITY_DEFAULTS[capabilityKey] || ['super_admin'];
};

export const getMasterOptions = async (masterKey) => {
  const s = await getSettings();
  return (s[masterKey] || []).filter(o => o.isActive);
};
