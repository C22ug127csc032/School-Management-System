import { getSettings, updateSettings } from '../utils/appSettings.js';

// GET /api/settings
export const getAppSettings = async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/settings
export const updateAppSettings = async (req, res) => {
  try {
    const allowed = [
      'schoolName','schoolCode','schoolAddress','schoolPhone','schoolEmail',
      'schoolLogo','affiliationNo','boardName','currentAcademicYear','governmentHolidayCalendarUrl',
      'schoolStartTime','schoolEndTime','periodsPerDay','periodDurationMins',
      'workingDays','shortBreakAfterPeriod','lunchBreakAfterPeriod',
      'shortBreakDurationMins','lunchBreakDurationMins',
    ];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const settings = await updateSettings(update);
    res.json({ success: true, settings, message: 'Settings updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/settings/masters/:masterKey
export const updateMasters = async (req, res) => {
  try {
    const { masterKey } = req.params;
    const allowed = [
      'student_genders','student_blood_groups','student_categories','student_religions',
      'finance_payment_modes','leave_types','expense_categories','inventory_categories',
    ];
    if (!allowed.includes(masterKey))
      return res.status(400).json({ success: false, message: 'Invalid master key.' });
    const settings = await updateSettings({ [masterKey]: req.body.options });
    res.json({ success: true, settings, message: `${masterKey} updated.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default { getAppSettings, updateAppSettings, updateMasters };
