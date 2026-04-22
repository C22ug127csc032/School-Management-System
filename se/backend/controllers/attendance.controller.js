// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose';
import Attendance from '../models/Attendance.model.js';
import Student    from '../models/Student.model.js';
import { resolveAcademicYear } from '../utils/academicYear.js';

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
    const { classId, date, entries, academicYear } = req.body;
    const ay = resolveAcademicYear(academicYear);
    const d  = new Date(date);

    const existing = await Attendance.findOne({
      class: classId,
      date: { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(new Date(date).setHours(23,59,59,999)) },
    });

    if (existing) {
      existing.entries   = entries;
      existing.markedBy  = req.user._id;
      await existing.save();
      return res.json({ success: true, data: existing, message: 'Attendance updated.' });
    }

    const record = await Attendance.create({
      class: classId, date: new Date(date), academicYear: ay,
      entries, markedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: record, message: 'Attendance marked.' });
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
