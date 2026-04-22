import Period from '../models/Period.model.js';
import { resolveAcademicYear } from '../utils/academicYear.js';
import { getActivePeriodsForDisplay } from '../utils/periods.js';

// GET /api/periods
export const getPeriods = async (req, res) => {
  try {
    const ay = resolveAcademicYear(req.query.academicYear);
    const periods = await getActivePeriodsForDisplay(ay);
    res.json({ success: true, data: periods });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/periods
export const createPeriod = async (req, res) => {
  try {
    const { periodNo, name, startTime, endTime, type, isBreak, academicYear } = req.body;
    const ay = resolveAcademicYear(academicYear);
    const parsedPeriodNo = Number(periodNo);

    if (!Number.isInteger(parsedPeriodNo) || parsedPeriodNo < 0) {
      return res.status(400).json({ success: false, message: 'Period number must be 0 or greater.' });
    }

    const period = await Period.create({ periodNo: parsedPeriodNo, name, startTime, endTime, type, isBreak, academicYear: ay });
    res.status(201).json({ success: true, data: period });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'Period number already exists for this academic year.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/periods/generate — auto-generate periods from settings
export const generatePeriods = async (req, res) => {
  try {
    const {
      academicYear, schoolStartTime, schoolEndTime,
      periodsPerDay, periodDurationMins,
      shortBreakAfterPeriod, shortBreakDurationMins,
      lunchBreakAfterPeriod, lunchBreakDurationMins,
    } = req.body;

    const ay = resolveAcademicYear(academicYear);

    // Deactivate existing periods for this year
    await Period.updateMany({ academicYear: ay }, { isActive: false });

    const [startH, startM] = schoolStartTime.split(':').map(Number);
    let currentMins = startH * 60 + startM;

    const periods = [];
    let periodNo  = 1;

    for (let i = 1; i <= periodsPerDay + 2; i++) {
      // Short break
      if (i === shortBreakAfterPeriod + 1) {
        const s = `${String(Math.floor(currentMins / 60)).padStart(2,'0')}:${String(currentMins % 60).padStart(2,'0')}`;
        currentMins += shortBreakDurationMins;
        const e = `${String(Math.floor(currentMins / 60)).padStart(2,'0')}:${String(currentMins % 60).padStart(2,'0')}`;
        periods.push({ periodNo: periodNo++, name: 'Short Break', startTime: s, endTime: e, type: 'short_break', isBreak: true, academicYear: ay });
        continue;
      }
      // Lunch break
      if (i === lunchBreakAfterPeriod + 2) {
        const s = `${String(Math.floor(currentMins / 60)).padStart(2,'0')}:${String(currentMins % 60).padStart(2,'0')}`;
        currentMins += lunchBreakDurationMins;
        const e = `${String(Math.floor(currentMins / 60)).padStart(2,'0')}:${String(currentMins % 60).padStart(2,'0')}`;
        periods.push({ periodNo: periodNo++, name: 'Lunch Break', startTime: s, endTime: e, type: 'lunch_break', isBreak: true, academicYear: ay });
        continue;
      }
      if (periods.filter(p => !p.isBreak).length >= periodsPerDay) break;

      const s = `${String(Math.floor(currentMins / 60)).padStart(2,'0')}:${String(currentMins % 60).padStart(2,'0')}`;
      currentMins += periodDurationMins;
      const e = `${String(Math.floor(currentMins / 60)).padStart(2,'0')}:${String(currentMins % 60).padStart(2,'0')}`;
      const teachingNo = periods.filter(p => !p.isBreak).length + 1;
      periods.push({ periodNo: periodNo++, name: `Period ${teachingNo}`, startTime: s, endTime: e, type: 'teaching', isBreak: false, academicYear: ay });
    }

    const created = await Period.insertMany(periods);
    res.json({ success: true, data: created, message: `${created.length} periods generated.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/periods/:id
export const updatePeriod = async (req, res) => {
  try {
    if (req.body.periodNo !== undefined) {
      const parsedPeriodNo = Number(req.body.periodNo);
      if (!Number.isInteger(parsedPeriodNo) || parsedPeriodNo < 0) {
        return res.status(400).json({ success: false, message: 'Period number must be 0 or greater.' });
      }
      req.body.periodNo = parsedPeriodNo;
    }

    const period = await Period.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!period) return res.status(404).json({ success: false, message: 'Period not found.' });
    res.json({ success: true, data: period });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'Period number already exists for this academic year.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/periods/:id
export const deletePeriod = async (req, res) => {
  try {
    await Period.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Period removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default { getPeriods, createPeriod, generatePeriods, updatePeriod, deletePeriod };
