import { Substitution, TeacherLeave } from '../models/Substitution.model.js';
import TimetableSlot from '../models/TimetableSlot.model.js';
import Teacher   from '../models/Teacher.model.js';
import Period    from '../models/Period.model.js';
import { resolveAcademicYear } from '../utils/academicYear.js';

// GET /api/substitutions?date=&academicYear=
export const getSubstitutions = async (req, res) => {
  try {
    const { date, academicYear } = req.query;
    const ay    = resolveAcademicYear(academicYear);
    const query = { academicYear: ay };
    if (date) {
      const d = new Date(date);
      query.date = { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) };
    }
    const subs = await Substitution.find(query)
      .populate('period',             'periodNo name startTime endTime')
      .populate('class',              'grade section displayName')
      .populate('absentTeacher',      'firstName lastName employeeId')
      .populate('substituteTeacher',  'firstName lastName employeeId')
      .populate('subject',            'name code color')
      .populate('assignedBy',         'name')
      .sort({ date: -1 });
    res.json({ success: true, data: subs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/substitutions/today-summary
export const getTodaySummary = async (req, res) => {
  try {
    const ay  = resolveAcademicYear(req.query.academicYear);
    const now = new Date();
    const start = new Date(now); start.setHours(0,0,0,0);
    const end   = new Date(now); end.setHours(23,59,59,999);

    const subs = await Substitution.find({ academicYear: ay, date: { $gte: start, $lte: end } })
      .populate('period',             'periodNo name startTime endTime')
      .populate('class',              'grade section displayName')
      .populate('absentTeacher',      'firstName lastName')
      .populate('substituteTeacher',  'firstName lastName')
      .populate('subject',            'name code color');

    res.json({ success: true, data: subs, count: subs.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/substitutions
export const createSubstitution = async (req, res) => {
  try {
    const { date, periodId, classId, absentTeacherId, substituteTeacherId, subjectId, notes } = req.body;
    const ay = resolveAcademicYear(req.body.academicYear);

    // Check substitute is free
    const d = new Date(date);
    const start = new Date(d); start.setHours(0,0,0,0);
    const end   = new Date(d); end.setHours(23,59,59,999);

    const alreadySubbing = await Substitution.findOne({
      date: { $gte: start, $lte: end },
      period: periodId,
      substituteTeacher: substituteTeacherId,
    });
    if (alreadySubbing)
      return res.status(409).json({ success: false, message: 'Substitute teacher is already assigned to another class in this period.' });

    // Check substitute is not in their own regular timetable at this time
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });
    const regularSlot = await TimetableSlot.findOne({
      teacher: substituteTeacherId, period: periodId, day: dayName, academicYear: ay, isActive: true,
    });
    if (regularSlot)
      return res.status(409).json({ success: false, message: 'Substitute teacher already has a regular class in this period.' });

    const sub = await Substitution.create({
      date: d, period: periodId, class: classId,
      absentTeacher: absentTeacherId, substituteTeacher: substituteTeacherId,
      subject: subjectId, academicYear: ay, notes, assignedBy: req.user._id,
    });

    const populated = await Substitution.findById(sub._id)
      .populate('period',             'periodNo name startTime endTime')
      .populate('class',              'grade section displayName')
      .populate('absentTeacher',      'firstName lastName employeeId')
      .populate('substituteTeacher',  'firstName lastName employeeId')
      .populate('subject',            'name code color');

    res.status(201).json({ success: true, data: populated, message: 'Substitution assigned.' });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'This substitute is already assigned for this period.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/substitutions/:id
export const deleteSubstitution = async (req, res) => {
  try {
    await Substitution.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
    res.json({ success: true, message: 'Substitution cancelled.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/substitutions/suggest?absentTeacherId=&periodId=&date=&classId=
export const suggestSubstitutes = async (req, res) => {
  try {
    const { absentTeacherId, periodId, date, classId, academicYear } = req.query;
    const ay      = resolveAcademicYear(academicYear);
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });

    // Find the original timetable slot to know gradeLevel & subject
    const originalSlot = await TimetableSlot.findOne({
      teacher: absentTeacherId, period: periodId, day: dayName, academicYear: ay, isActive: true,
    }).populate('subject','name code').populate('class','gradeLevel');

    // Teachers already busy in this period
    const busySlots = await TimetableSlot.find({ period: periodId, day: dayName, academicYear: ay, isActive: true }).select('teacher');
    const busyIds   = busySlots.map(s => String(s.teacher));

    // Also exclude teachers already subbing
    const d = new Date(date);
    const start = new Date(d); start.setHours(0,0,0,0);
    const end   = new Date(d); end.setHours(23,59,59,999);
    const alreadySubbing = await Substitution.find({
      date: { $gte: start, $lte: end }, period: periodId, status: { $ne: 'cancelled' },
    }).select('substituteTeacher');
    const subbingIds = alreadySubbing.map(s => String(s.substituteTeacher));

    const excludeIds = [...new Set([...busyIds, ...subbingIds, String(absentTeacherId)])];

    // Build candidate query
    const query = { isActive: true, _id: { $nin: excludeIds } };
    if (originalSlot?.class?.gradeLevel) query.eligibleGradeLevels = originalSlot.class.gradeLevel;
    if (originalSlot?.subject?._id)       query.eligibleSubjects    = originalSlot.subject._id;

    const candidates = await Teacher.find(query)
      .populate('eligibleSubjects','name code')
      .sort({ firstName: 1 })
      .limit(10);

    res.json({
      success: true,
      data: candidates,
      originalSlot,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Teacher Leave ──────────────────────────────────────────────────────────────
export const getTeacherLeaves = async (req, res) => {
  try {
    const { teacherId, status } = req.query;
    const query = {};
    const isTeachingRole = ['teacher', 'class_teacher'].includes(req.user?.role);
    if (isTeachingRole && req.user?.teacherRef) query.teacher = req.user.teacherRef;
    else if (teacherId) query.teacher = teacherId;
    if (status)    query.status  = status;
    const leaves = await TeacherLeave.find(query)
      .populate('teacher',    'firstName lastName employeeId')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createTeacherLeave = async (req, res) => {
  try {
    if (!req.user?.teacherRef) {
      return res.status(400).json({ success: false, message: 'Teacher profile not linked to this account.' });
    }
    const leave = await TeacherLeave.create({ ...req.body, teacher: req.user.teacherRef });
    res.status(201).json({ success: true, data: leave, message: 'Leave request submitted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateTeacherLeaveStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const leave = await TeacherLeave.findByIdAndUpdate(
      req.params.id,
      { status, remarks, approvedBy: req.user._id, approvedAt: new Date() },
      { new: true },
    ).populate('teacher', 'firstName lastName employeeId');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found.' });
    res.json({ success: true, data: leave, message: `Leave ${status}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default {
  getSubstitutions, getTodaySummary, createSubstitution, deleteSubstitution, suggestSubstitutes,
  getTeacherLeaves, createTeacherLeave, updateTeacherLeaveStatus,
};
