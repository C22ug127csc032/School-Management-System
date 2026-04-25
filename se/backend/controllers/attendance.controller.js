// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose';
import Attendance from '../models/Attendance.model.js';
import Student    from '../models/Student.model.js';
import { ExamSchedule } from '../models/Academic.model.js';
import { resolveAcademicYear } from '../utils/academicYear.js';

const INDIA_TIMEZONE = 'Asia/Kolkata';

const toDateKey = value => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-CA', { timeZone: INDIA_TIMEZONE });
};

const parseDateKey = dateKey => new Date(`${dateKey}T00:00:00+05:30`);

const getWeekdayName = value => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: INDIA_TIMEZONE });
};

const addDays = (date, count) => {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
};

const getNextWorkingDate = (afterDate, blockedDateKeys) => {
  let cursor = addDays(afterDate, 1);

  while (blockedDateKeys.has(toDateKey(cursor)) || getWeekdayName(cursor) === 'Sunday') {
    cursor = addDays(cursor, 1);
  }

  return cursor;
};

const shiftScheduledExamSeriesForHoliday = async ({ classId, holidayDate }) => {
  const holidayDateKey = toDateKey(holidayDate);
  if (!holidayDateKey) return { movedDays: 0, movedEntries: 0 };

  const startOfHoliday = parseDateKey(holidayDateKey);
  const affectedSchedules = await ExamSchedule.find({
    class: classId,
    date: { $gte: startOfHoliday },
    slotType: { $in: ['exam', 'revision'] },
  })
    .populate('period', 'periodNo')
    .sort({ date: 1, startTime: 1, createdAt: 1 });

  if (!affectedSchedules.length) {
    return { movedDays: 0, movedEntries: 0 };
  }

  const blockedHolidayRecords = await Attendance.find({
    class: classId,
    isHoliday: true,
    date: { $gte: startOfHoliday },
  }).select('date');

  const blockedDateKeys = new Set(blockedHolidayRecords.map(record => toDateKey(record.date)).filter(Boolean));
  blockedDateKeys.add(holidayDateKey);

  const orderedDateKeys = [...new Set(affectedSchedules.map(item => toDateKey(item.date)).filter(Boolean))].sort();
  let previousAssignedDate = startOfHoliday;
  const dateMap = new Map();

  orderedDateKeys.forEach(originalDateKey => {
    const nextWorkingDate = getNextWorkingDate(previousAssignedDate, blockedDateKeys);
    dateMap.set(originalDateKey, nextWorkingDate);
    previousAssignedDate = nextWorkingDate;
  });

  const affectedByDateDesc = [...affectedSchedules].sort((left, right) => {
    const leftTime = new Date(left.date).getTime();
    const rightTime = new Date(right.date).getTime();
    if (leftTime !== rightTime) return rightTime - leftTime;

    const leftPeriod = Number(left.period?.periodNo ?? 999);
    const rightPeriod = Number(right.period?.periodNo ?? 999);
    return rightPeriod - leftPeriod;
  });

  for (const schedule of affectedByDateDesc) {
    const originalDateKey = toDateKey(schedule.date);
    const targetDate = dateMap.get(originalDateKey);
    if (!targetDate) continue;

    schedule.date = parseDateKey(toDateKey(targetDate));
    schedule.day = undefined;
    await schedule.save();
  }

  return { movedDays: dateMap.size, movedEntries: affectedSchedules.length };
};

export const getAttendance = async (req, res) => {
  try {
    const { classId, date, month, year, academicYear } = req.query;
    const ay    = resolveAcademicYear(academicYear);
    const query = {};
    if (classId) {
      if (mongoose.Types.ObjectId.isValid(classId)) {
        query.class = classId;
      } else {
        query.class = new mongoose.Types.ObjectId();
      }
    }
    if (date) {
      const d = new Date(date);
      query.date = { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) };
    } else if (month && year) {
      query.date = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59),
      };
    }
    if (!date && !month) query.academicYear = ay;

    const records = await Attendance.find(query)
      .populate('entries.student', 'firstName lastName admissionNo rollNo')
      .populate('class', 'grade section displayName')
      .sort({ date: -1 });
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAttendance = async (req, res) => {
  try {
    const { classId, date, entries = [], academicYear, isHoliday = false, holidayReason = '' } = req.body;
    const ay = resolveAcademicYear(academicYear);
    const d  = new Date(date);
    const trimmedHolidayReason = String(holidayReason || '').trim();

    if (isHoliday && !trimmedHolidayReason) {
      return res.status(400).json({ success: false, message: 'Holiday name is required when marking a holiday.' });
    }

    const existing = await Attendance.findOne({
      class: classId,
      date: { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(new Date(date).setHours(23,59,59,999)) },
    });
    const wasHoliday = Boolean(existing?.isHoliday);

    if (existing) {
      existing.entries   = isHoliday ? [] : entries;
      existing.markedBy  = req.user._id;
      existing.academicYear = ay;
      existing.isHoliday = Boolean(isHoliday);
      existing.holidayReason = isHoliday ? trimmedHolidayReason : '';
      await existing.save();

      let message = isHoliday ? 'Holiday saved.' : 'Attendance updated.';
      if (isHoliday && !wasHoliday) {
        const shiftSummary = await shiftScheduledExamSeriesForHoliday({ classId, holidayDate: new Date(date) });
        if (shiftSummary.movedEntries) {
          message = `Holiday saved. Shifted ${shiftSummary.movedEntries} scheduled entry${shiftSummary.movedEntries === 1 ? '' : 'ies'} to the next working days.`;
        }
      }

      return res.json({ success: true, data: existing, message });
    }

    const record = await Attendance.create({
      class: classId, date: new Date(date), academicYear: ay,
      entries: isHoliday ? [] : entries, markedBy: req.user._id,
      isHoliday: Boolean(isHoliday),
      holidayReason: isHoliday ? trimmedHolidayReason : '',
    });

    let message = isHoliday ? 'Holiday saved.' : 'Attendance marked.';
    if (isHoliday) {
      const shiftSummary = await shiftScheduledExamSeriesForHoliday({ classId, holidayDate: new Date(date) });
      if (shiftSummary.movedEntries) {
        message = `Holiday saved. Shifted ${shiftSummary.movedEntries} scheduled entry${shiftSummary.movedEntries === 1 ? '' : 'ies'} to the next working days.`;
      }
    }

    res.status(201).json({ success: true, data: record, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getStudentAttendanceSummary = async (req, res) => {
  try {
    const { studentId, academicYear, month, year } = req.query;
    const ay = resolveAcademicYear(academicYear);
    const dateQuery = month && year
      ? { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0, 23, 59, 59) }
      : undefined;

    const query = {};
    if (dateQuery) query.date = dateQuery;
    else query.academicYear = ay;

    const records = await Attendance.find(query);
    let present = 0, absent = 0, late = 0, total = 0;
    records.forEach(r => {
      const entry = r.entries.find(e => String(e.student) === String(studentId));
      if (entry) {
        total++;
        if (entry.status === 'present') present++;
        else if (entry.status === 'absent')  absent++;
        else if (entry.status === 'late')    late++;
      }
    });
    res.json({ success: true, data: { total, present, absent, late, percentage: total ? Math.round((present / total) * 100) : 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const attendanceController = { getAttendance, markAttendance, getStudentAttendanceSummary };
