import { Leave, Outpass, Circular, Homework, Exam, ExamSchedule, Mark } from '../models/Academic.model.js';
import { Book, BookIssue, Inventory, InventoryTxn, Expense } from '../models/Operations.model.js';
import Student from '../models/Student.model.js';
import Teacher from '../models/Teacher.model.js';
import User from '../models/User.model.js';
import ClassModel from '../models/Class.model.js';
import ClassSubject from '../models/ClassSubject.model.js';
import Subject from '../models/Subject.model.js';
import { TIMETABLE_DAYS } from '../models/TimetableSlot.model.js';
import { resolveAcademicYear } from '../utils/academicYear.js';
import { getActivePeriodsForDisplay } from '../utils/periods.js';
import { createPaginatedResponse, createSearchRegex, parseListQuery, resolveSort } from '../utils/query.js';
import { getSettings } from '../utils/appSettings.js';
import { fetchGovernmentHolidayRecords, mergeHolidayRecords } from '../utils/holidayCalendar.js';

const isTeachingRole = role => ['teacher', 'class_teacher'].includes(role);
const INDIA_TIMEZONE = 'Asia/Kolkata';
const toDateKey = value => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-CA', { timeZone: INDIA_TIMEZONE });
};

const getWeekdayName = value => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: INDIA_TIMEZONE });
};

const parseDateKey = dateKey => new Date(`${dateKey}T00:00:00+05:30`);
const TIMETABLE_DAY_ORDER = TIMETABLE_DAYS.reduce((acc, day, index) => ({ ...acc, [day]: index }), {});
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

const buildExamCalendarDays = ({ exam, schedules = [], holidayRecords = [] }) => {
  if (!exam?.startDate || !exam?.endDate) return [];

  const scheduleMap = schedules.reduce((map, schedule) => {
    const key = toDateKey(schedule.date);
    if (!key) return map;
    if (!map[key]) map[key] = [];
    map[key].push(schedule);
    return map;
  }, {});

  const holidayMap = holidayRecords.reduce((map, record) => {
    const key = toDateKey(record.date);
    if (!key) return map;
    map[key] = record.holidayReason || 'Holiday';
    return map;
  }, {});

  const calendarDays = [];
  let cursor = parseDateKey(toDateKey(exam.startDate));
  const end = parseDateKey(toDateKey(exam.endDate));

  while (cursor <= end) {
    const dateKey = toDateKey(cursor);
    const weekday = getWeekdayName(cursor);
    const isSunday = weekday === 'Sunday';
    const holidayReason = holidayMap[dateKey] || '';
    const isHoliday = Boolean(holidayReason);
    const entries = (scheduleMap[dateKey] || []).sort((left, right) => {
      const leftPeriodNo = Number(left.period?.periodNo ?? 999);
      const rightPeriodNo = Number(right.period?.periodNo ?? 999);
      return leftPeriodNo - rightPeriodNo;
    });
    const entry = entries[0] || null;
    const blocked = isSunday || isHoliday;

    calendarDays.push({
      date: dateKey,
      weekday,
      isSunday,
      isHoliday,
      holidayReason,
      blockedLabel: isHoliday ? holidayReason : (isSunday ? 'Sunday' : ''),
      status: isHoliday ? 'holiday' : (isSunday ? 'sunday' : 'working_day'),
      blocked,
      entries,
      entry,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return calendarDays;
};

const shiftExamScheduleSeriesForHoliday = async ({ examId, classId, holidayDate, blockedHolidayRecords = [] }) => {
  const holidayDateKey = toDateKey(holidayDate);
  if (!holidayDateKey) return { movedDays: 0, movedEntries: 0 };

  const startOfHoliday = parseDateKey(holidayDateKey);
  const affectedSchedules = await ExamSchedule.find({
    exam: examId,
    class: classId,
    date: { $gte: startOfHoliday },
    slotType: { $in: ['exam', 'revision'] },
  })
    .populate('period', 'periodNo')
    .sort({ date: 1, startTime: 1, createdAt: 1 });

  if (!affectedSchedules.length) {
    return { movedDays: 0, movedEntries: 0 };
  }

  const blockedDateKeys = new Set((blockedHolidayRecords || []).map(record => toDateKey(record.date)).filter(Boolean));
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

const getLinkedTeacherIds = async req => {
  if (!isTeachingRole(req.user?.role)) return [];

  const linkedIds = new Set();
  if (req.user?.teacherRef) linkedIds.add(String(req.user.teacherRef));

  const linkedTeachers = await Teacher.find({
    $or: [
      ...(req.user?.teacherRef ? [{ _id: req.user.teacherRef }] : []),
      { userRef: req.user._id },
    ],
  }).select('_id');

  linkedTeachers.forEach(teacher => linkedIds.add(String(teacher._id)));
  return [...linkedIds];
};

const getTeacherScope = async (req, linkedTeacherIds = null) => {
  if (!isTeachingRole(req.user?.role)) return null;

  const teacherIds = linkedTeacherIds || await getLinkedTeacherIds(req);
  if (!teacherIds.length) return null;

  const primaryTeacherId = teacherIds.find(id => String(id) === String(req.user?.teacherRef)) || teacherIds[0];
  return Teacher.findById(primaryTeacherId)
    .populate('classTeacherOf', 'grade section displayName groupName')
    .populate('eligibleSubjects', 'name code');
};

const getMergedTeacherScope = async (req, linkedTeacherIds = null) => {
  if (!isTeachingRole(req.user?.role)) return null;

  const teacherIds = linkedTeacherIds || await getLinkedTeacherIds(req);
  if (!teacherIds.length) return null;

  const teachers = await Teacher.find({ _id: { $in: teacherIds } })
    .populate('classTeacherOf', 'grade section displayName groupName')
    .populate('eligibleSubjects', 'name code');

  if (!teachers.length) return null;

  const classTeacherOfIds = [];
  const classTeacherMap = new Map();
  const eligibleSubjectIds = [];
  const eligibleSubjectMap = new Map();

  teachers.forEach(teacher => {
    const classTeacherId = String(teacher?.classTeacherOf?._id || teacher?.classTeacherOf || '');
    if (classTeacherId && !classTeacherMap.has(classTeacherId)) {
      classTeacherMap.set(classTeacherId, teacher.classTeacherOf);
      classTeacherOfIds.push(classTeacherId);
    }

    (teacher?.eligibleSubjects || []).forEach(subject => {
      const subjectId = String(subject?._id || subject || '');
      if (subjectId && !eligibleSubjectMap.has(subjectId)) {
        eligibleSubjectMap.set(subjectId, subject);
        eligibleSubjectIds.push(subjectId);
      }
    });
  });

  const primaryTeacherId = teacherIds.find(id => String(id) === String(req.user?.teacherRef)) || teacherIds[0];
  const primaryTeacher = teachers.find(teacher => String(teacher._id) === String(primaryTeacherId)) || teachers[0];

  return {
    teacherIds,
    teachers,
    primaryTeacher,
    classTeacherOfIds,
    classTeacherOf: primaryTeacher?.classTeacherOf || teachers[0]?.classTeacherOf || null,
    eligibleSubjectIds,
    eligibleSubjects: [...eligibleSubjectMap.values()],
  };
};

const hasClassTeacherAccess = teacherScope =>
  Boolean(teacherScope?.classTeacherOfIds?.length || teacherScope?.classTeacherOf);

const buildAssignmentQuery = (teacherIds, academicYear, classId, subjectId) => ({
  teacher: Array.isArray(teacherIds) ? { $in: teacherIds } : teacherIds,
  academicYear,
  isActive: true,
  ...(classId ? { class: classId } : {}),
  ...(subjectId ? { subject: subjectId } : {}),
});

const getRelatedSubjectIds = async subjectId => {
  if (!subjectId) return [];

  const subject = await Subject.findById(subjectId).select('subjectRole parentSubject');
  if (!subject) return [subjectId];

  if (subject.subjectRole === 'main') {
    const childIds = await Subject.find({ parentSubject: subject._id, isActive: true }).distinct('_id');
    return [...new Set([String(subject._id), ...childIds.map(String)])];
  }

  if (subject.subjectRole === 'sub' && subject.parentSubject) {
    const siblingIds = await Subject.find({ parentSubject: subject.parentSubject, isActive: true }).distinct('_id');
    return [...new Set([String(subject.parentSubject), String(subject._id), ...siblingIds.map(String)])];
  }

  return [String(subject._id)];
};

const findScopedTeachingAssignment = async (req, academicYear, classId, subjectId) => {
  if (!isTeachingRole(req.user.role)) return null;

  const linkedTeacherIds = await getLinkedTeacherIds(req);
  if (!linkedTeacherIds.length) return null;
  const relatedSubjectIds = await getRelatedSubjectIds(subjectId);

  const directAssignment = await ClassSubject.findOne(
    {
      teacher: { $in: linkedTeacherIds },
      academicYear,
      isActive: true,
      ...(classId ? { class: classId } : {}),
      ...(relatedSubjectIds.length ? { subject: { $in: relatedSubjectIds } } : {}),
    }
  );
  if (directAssignment) return directAssignment;

  const teacherScope = await getMergedTeacherScope(req, linkedTeacherIds);
  if (!hasClassTeacherAccess(teacherScope)) return null;

  const managesClass = teacherScope?.classTeacherOfIds?.includes(String(classId || ''));
  const eligibleSubjectIds = teacherScope?.eligibleSubjectIds || [];

  if (!managesClass) return null;
  if (subjectId && !eligibleSubjectIds.includes(String(subjectId))) return null;

  return ClassSubject.findOne({
    class: classId,
    academicYear,
    isActive: true,
    teacher: null,
    ...(subjectId ? { subject: subjectId } : {}),
  });
};

const canManageExamClass = async (req, academicYear, classId, subjectId) => {
  if (!isTeachingRole(req.user.role)) return true;

  const linkedTeacherIds = await getLinkedTeacherIds(req);
  if (!linkedTeacherIds.length) return false;

  const teacherScope = await getMergedTeacherScope(req, linkedTeacherIds);
  if (hasClassTeacherAccess(teacherScope)) {
    return teacherScope.classTeacherOfIds.includes(String(classId || ''));
  }

  const assignment = await ClassSubject.findOne(buildAssignmentQuery(linkedTeacherIds, academicYear, classId, subjectId));
  return Boolean(assignment);
};

// ── LEAVE ─────────────────────────────────────────────────────────────────────
export const getLeaves = async (req, res) => {
  try {
    const { studentId, status, academicYear, classId } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      defaultLimit: 20,
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
    });
    const { sort } = resolveSort(sortBy, sortOrder, {
      createdAt: 'createdAt',
      fromDate: 'fromDate',
      status: 'status',
    }, 'createdAt');

    const query = {};
    if (studentId) query.student = studentId;
    if (status)    query.status  = status;

    // RBAC: Class Teacher and Super Admin/Admin
    const ay = resolveAcademicYear(academicYear);
    const teacher = await getTeacherScope(req);
    const classTeacherOf = teacher?.classTeacherOf?._id || teacher?.classTeacherOf;

    // If teacher role, we must scope to their students (unless they are a standard admin/principal)
    const isFullAdmin = ['super_admin','admin','principal'].includes(req.user.role);
    
    if (!isFullAdmin) {
      if (classTeacherOf) {
        // Teacher can see their own class students
        const classStudentIds = await Student.find({
          classRef: classTeacherOf,
          academicYear: ay,
        }).distinct('_id');
        query.student = { $in: classStudentIds };
      } else {
        // If not a class teacher and not admin, return empty or unauthorized
        return res.json(createPaginatedResponse({ data: [], total: 0, page, limit }));
      }
    } else if (classId) {
      // Admins can filter by classId
      const classStudentIds = await Student.find({
        classRef: classId,
        academicYear: ay,
      }).distinct('_id');
      query.student = studentId
        ? { $in: classStudentIds.filter(id => String(id) === String(studentId)) }
        : { $in: classStudentIds };
    }

    const total = await Leave.countDocuments(query);
    const leaves = await Leave.find(query)
      .populate('student','firstName lastName admissionNo grade section')
      .populate('approvedBy','name')
      .skip(skip).limit(limit)
      .sort(sort);
    res.json(createPaginatedResponse({ data: leaves, total, page, limit }));
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createLeave = async (req, res) => {
  try {
    const leave = await Leave.create({ ...req.body, appliedBy: req.user._id, appliedByRole: req.user.role === 'parent' ? 'parent' : 'student' });
    res.status(201).json({ success: true, data: leave, message: 'Leave request submitted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const leave = await Leave.findByIdAndUpdate(req.params.id, { status, remarks, approvedBy: req.user._id, approvedAt: new Date() }, { new: true })
      .populate('student','firstName lastName');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found.' });
    res.json({ success: true, data: leave, message: `Leave ${status}.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── OUTPASS ───────────────────────────────────────────────────────────────────
export const getOutpasses = async (req, res) => {
  try {
    const { status, date } = req.query;
    const query = {};
    if (status) query.status = status;
    if (date) { const d = new Date(date); query.date = { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(new Date(date).setHours(23,59,59,999)) }; }
    const outpasses = await Outpass.find(query)
      .populate('student','firstName lastName admissionNo grade section phone')
      .populate('approvedBy','name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: outpasses });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createOutpass = async (req, res) => {
  try {
    const op = await Outpass.create({ ...req.body });
    res.status(201).json({ success: true, data: op, message: 'Outpass request created.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const updateOutpassStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const op = await Outpass.findByIdAndUpdate(req.params.id, { status, approvedBy: req.user._id, approvedAt: new Date() }, { new: true })
      .populate('student','firstName lastName');
    if (!op) return res.status(404).json({ success: false, message: 'Outpass not found.' });
    res.json({ success: true, data: op, message: `Outpass ${status}.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── CIRCULARS ─────────────────────────────────────────────────────────────────
export const getCirculars = async (req, res) => {
  try {
    const { type, audience, search } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      defaultLimit: 20,
      defaultSortBy: 'publishDate',
      defaultSortOrder: 'desc',
    });
    const { sort } = resolveSort(sortBy, sortOrder, {
      publishDate: 'publishDate',
      title: 'title',
      type: 'type',
    }, 'publishDate');
    const query = { isPublished: true };
    if (type)     query.type = type;
    if (audience) query.audience = audience;
    if (search) {
      const re = createSearchRegex(search);
      query.$or = [{ title: re }, { content: re }];
    }
    const total = await Circular.countDocuments(query);
    const circulars = await Circular.find(query)
      .populate('publishedBy','name')
      .populate('classRefs', 'grade section displayName groupName')
      .skip(skip).limit(limit)
      .sort(sort);
    res.json(createPaginatedResponse({ data: circulars, total, page, limit }));
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createCircular = async (req, res) => {
  try {
    const payload = { ...req.body, publishedBy: req.user._id };

    if (isTeachingRole(req.user.role)) {
      // Teachers/Class Teachers can only send to Student/Parent audience of their assigned classes
      payload.audience = ['student', 'parent'];
      
      const teacher = await getTeacherScope(req);
      const ay = resolveAcademicYear(req.body.academicYear);
      const linkedTeacherIds = await getLinkedTeacherIds(req);
      const assignedClassIds = await ClassSubject.distinct('class', buildAssignmentQuery(linkedTeacherIds, ay));
      const allowedClassIds = new Set([
        ...(teacher?.classTeacherOf ? [String(teacher.classTeacherOf._id || teacher.classTeacherOf)] : []),
        ...assignedClassIds.map(String),
      ]);
      
      const requestedClassIds = (req.body.classRefs || []).map(String).filter(Boolean);
      
      // Filter out classes they don't teach/manage
      payload.classRefs = requestedClassIds.length
        ? requestedClassIds.filter(classId => allowedClassIds.has(classId))
        : [...allowedClassIds];

      if (payload.classRefs.length === 0) {
        return res.status(403).json({ success: false, message: 'You must select a class you are assigned to.' });
      }
    }

    const circular = await Circular.create(payload);
    res.status(201).json({ success: true, data: circular, message: 'Circular published.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const deleteCircular = async (req, res) => {
  try {
    await Circular.findByIdAndUpdate(req.params.id, { isPublished: false });
    res.json({ success: true, message: 'Circular removed.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── HOMEWORK ──────────────────────────────────────────────────────────────────
export const getHomework = async (req, res) => {
  try {
    const { classId, subjectId, teacherId, academicYear } = req.query;
    const ay = resolveAcademicYear(academicYear);
    const query = { academicYear: ay, isActive: true };
    if (classId)   query.class   = classId;
    if (subjectId) query.subject = subjectId;
    if (isTeachingRole(req.user.role)) {
      const linkedTeacherIds = await getLinkedTeacherIds(req);
      if (!linkedTeacherIds.length) return res.json({ success: true, data: [] });
      query.teacher = { $in: linkedTeacherIds };
    }
    else if (teacherId) query.teacher = teacherId;
    const hw = await Homework.find(query)
      .populate('class','grade section displayName')
      .populate('subject','name code color')
      .populate('teacher','firstName lastName')
      .sort({ dueDate: 1 });
    res.json({ success: true, data: hw });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createHomework = async (req, res) => {
  try {
    const ay = resolveAcademicYear(req.body.academicYear);
    if (isTeachingRole(req.user.role)) {
      const linkedTeacherIds = await getLinkedTeacherIds(req);
      if (!linkedTeacherIds.length) {
        return res.status(403).json({ success: false, message: 'You can only assign homework for your own teacher profile.' });
      }

      if (!linkedTeacherIds.includes(String(req.body.teacher))) {
        return res.status(403).json({ success: false, message: 'You can only assign homework for your own teacher profile.' });
      }

      const assignment = await findScopedTeachingAssignment(req, ay, req.body.class, req.body.subject);
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You can only assign homework for your own subject and class.' });
      }

      req.body.teacher = String(assignment.teacher || req.body.teacher || linkedTeacherIds[0]);
    }

    const hw = await Homework.create({ ...req.body, academicYear: ay });
    const populated = await Homework.findById(hw._id)
      .populate('class','grade section displayName').populate('subject','name code color');
    res.status(201).json({ success: true, data: populated, message: 'Homework assigned.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const deleteHomework = async (req, res) => {
  try {
    if (isTeachingRole(req.user.role)) {
      const linkedTeacherIds = await getLinkedTeacherIds(req);
      const homework = await Homework.findById(req.params.id).select('teacher');
      if (!homework) return res.status(404).json({ success: false, message: 'Homework not found.' });
      if (!linkedTeacherIds.includes(String(homework.teacher))) {
        return res.status(403).json({ success: false, message: 'You can only remove your own homework.' });
      }
    }

    await Homework.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Homework removed.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── EXAMS ─────────────────────────────────────────────────────────────────────
export const getExams = async (req, res) => {
  try {
    const ay = resolveAcademicYear(req.query.academicYear);
    const exams = await Exam.find({ academicYear: ay }).sort({ startDate: 1 });
    res.json({ success: true, data: exams });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createExam = async (req, res) => {
  try {
    const ay   = resolveAcademicYear(req.body.academicYear);
    const exam = await Exam.create({ ...req.body, academicYear: ay, createdBy: req.user._id });
    res.status(201).json({ success: true, data: exam, message: 'Exam created.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

    const update = {};
    ['name', 'examType', 'startDate', 'endDate', 'grades', 'isPublished'].forEach(key => {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    });
    if (update.name !== undefined) update.name = String(update.name || '').trim();
    if (update.startDate === '') update.startDate = null;
    if (update.endDate === '') update.endDate = null;
    if (update.grades && !Array.isArray(update.grades)) update.grades = [];

    const updated = await Exam.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );
    res.json({ success: true, data: updated, message: 'Exam updated.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

    await Promise.all([
      ExamSchedule.deleteMany({ exam: exam._id }),
      Mark.deleteMany({ exam: exam._id }),
    ]);
    await Exam.findByIdAndDelete(exam._id);

    res.json({ success: true, message: 'Exam deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const getExamSchedule = async (req, res) => {
  try {
    const { examId, classId, includeCalendar } = req.query;
    const ay = resolveAcademicYear(req.query.academicYear);
    const query = {};
    if (examId)  query.exam  = examId;
    if (classId) query.class = classId;
    const schedule = await ExamSchedule.find(query)
      .populate('exam','name examType').populate('class','grade section displayName')
      .populate('subject','name code color')
      .populate('period', 'periodNo name startTime endTime isBreak')
      .populate('endPeriod', 'periodNo name startTime endTime isBreak')
      .populate('componentSubjects', 'name code color')
      .sort({ date: 1, startTime: 1, paperName: 1 });

    schedule.sort((left, right) => {
      const leftDayOrder = TIMETABLE_DAY_ORDER[left.day] ?? 99;
      const rightDayOrder = TIMETABLE_DAY_ORDER[right.day] ?? 99;
      if (leftDayOrder !== rightDayOrder) return leftDayOrder - rightDayOrder;

      const leftPeriodNo = Number(left.period?.periodNo ?? 999);
      const rightPeriodNo = Number(right.period?.periodNo ?? 999);
      if (leftPeriodNo !== rightPeriodNo) return leftPeriodNo - rightPeriodNo;

      const leftDate = left.date ? new Date(left.date).getTime() : 0;
      const rightDate = right.date ? new Date(right.date).getTime() : 0;
      return leftDate - rightDate;
    });

    if (includeCalendar === 'true' && examId && classId) {
      const [exam, periods] = await Promise.all([
        Exam.findById(examId).select('name startDate endDate'),
        getActivePeriodsForDisplay(ay, { isBreak: false }),
      ]);
      const settings = await getSettings();
      const holidayRecords = exam?.startDate && exam?.endDate
        ? await fetchGovernmentHolidayRecords({
          startDate: exam.startDate,
          endDate: exam.endDate,
          calendarUrl: settings?.governmentHolidayCalendarUrl,
        })
        : [];

      return res.json({
        success: true,
        data: {
          schedules: schedule,
          calendarDays: buildExamCalendarDays({ exam, schedules: schedule, holidayRecords }),
          slotTemplates: periods,
        },
      });
    }

    res.json({ success: true, data: schedule });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createExamSchedule = async (req, res) => {
  try {
    const payload = { ...req.body };
    payload.slotType = payload.slotType || 'exam';
    payload.note = String(payload.note || '').trim();
    payload.scheduleType = payload.scheduleType || 'exam';
    const hasWeeklySlot = Boolean(payload.day);
    const scheduleDate = payload.date ? new Date(payload.date) : null;

    if (!['exam', 'revision', 'holiday', 'no_session'].includes(payload.slotType)) {
      return res.status(400).json({ success: false, message: 'slotType is invalid.' });
    }

    if (!hasWeeklySlot && (!scheduleDate || Number.isNaN(scheduleDate.getTime()))) {
      return res.status(400).json({ success: false, message: 'A valid exam date is required.' });
    }

    if (hasWeeklySlot && !TIMETABLE_DAYS.includes(payload.day)) {
      return res.status(400).json({ success: false, message: 'A valid timetable day is required.' });
    }

    if (!hasWeeklySlot && payload.slotType === 'exam' && getWeekdayName(scheduleDate) === 'Sunday') {
      return res.status(400).json({ success: false, message: 'Exams cannot be scheduled on Sunday.' });
    }

    const settings = await getSettings();
    let blockedHolidayReason = '';
    if (!hasWeeklySlot && scheduleDate) {
      const governmentHolidayRecord = await fetchGovernmentHolidayRecords({
        startDate: scheduleDate,
        endDate: scheduleDate,
        calendarUrl: settings?.governmentHolidayCalendarUrl,
      }).then(records => records[0] || null);

      blockedHolidayReason = governmentHolidayRecord?.holidayReason || '';
    }

    if (blockedHolidayReason && (payload.slotType === 'exam' || payload.slotType === 'revision')) {
      return res.status(400).json({
        success: false,
        message: `${payload.slotType === 'revision' ? 'Revision' : 'Exams'} cannot be scheduled on a holiday${blockedHolidayReason ? `: ${blockedHolidayReason}` : '.'}`,
      });
    }

    const academicYear = resolveAcademicYear(payload.academicYear);
    let selectedPeriod = null;
    let selectedEndPeriod = null;
    if (payload.periodId) {
      const periodOptions = await getActivePeriodsForDisplay(academicYear, { isBreak: false });
      selectedPeriod = periodOptions.find(period => String(period._id) === String(payload.periodId));
      selectedEndPeriod = periodOptions.find(period => String(period._id) === String(payload.endPeriodId || payload.periodId));
      if (!selectedPeriod) {
        return res.status(400).json({ success: false, message: 'Select a valid timetable slot.' });
      }
      if (!selectedEndPeriod) {
        return res.status(400).json({ success: false, message: 'Select a valid ending period.' });
      }
      if (Number(selectedEndPeriod.periodNo) < Number(selectedPeriod.periodNo)) {
        return res.status(400).json({ success: false, message: 'Ending period must be the same as or after the starting period.' });
      }
      payload.period = selectedPeriod._id;
      payload.endPeriod = selectedEndPeriod._id;
      payload.slotName = selectedPeriod._id === selectedEndPeriod._id
        ? selectedPeriod.name
        : `${selectedPeriod.name} - ${selectedEndPeriod.name}`;
    } else if (payload.slotType === 'holiday' || payload.slotType === 'no_session') {
      payload.period = null;
      payload.endPeriod = null;
      payload.slotName = 'Full Day';
    } else if (payload.slotName) {
      payload.slotName = String(payload.slotName).trim();
    } else {
      return res.status(400).json({ success: false, message: 'A timetable slot is required.' });
    }

    if (payload.slotType === 'exam' || payload.slotType === 'revision') {
      payload.startTime = selectedPeriod?.startTime || payload.startTime || '';
      payload.endTime = selectedEndPeriod?.endTime || payload.endTime || '';
      if (!payload.startTime || !payload.endTime) {
        return res.status(400).json({ success: false, message: 'Unable to resolve the timetable slot timing.' });
      }
    } else {
      payload.startTime = '';
      payload.endTime = '';
      payload.hall = '';
      payload.endPeriod = selectedEndPeriod?._id || payload.endPeriod || null;
    }

    if (payload.slotType === 'holiday' || payload.slotType === 'no_session') {
      payload.subject = null;
      payload.componentSubjects = [];
      payload.paperName = '';
      payload.maxMarks = 100;
      payload.passMarks = 35;
    }

    if (!payload.paperName && payload.subject) {
      const subjectAssignment = await ClassSubject.findOne({ class: payload.class, subject: payload.subject, isActive: true })
        .populate('subject', 'name');
      payload.paperName = subjectAssignment?.subject?.name || payload.paperName;
    }

    if ((payload.slotType === 'exam' || payload.slotType === 'revision') && !payload.subject && !(payload.componentSubjects || []).length) {
      return res.status(400).json({ success: false, message: `Subject is required for a ${payload.slotType === 'revision' ? 'revision' : 'exam'} slot.` });
    }

    if ((payload.slotType === 'exam' || payload.slotType === 'revision') && !payload.paperName) {
      return res.status(400).json({ success: false, message: `Paper name is required for the ${payload.slotType === 'revision' ? 'revision' : 'exam'} slot.` });
    }

    if (!hasWeeklySlot && (payload.slotType === 'exam' || payload.slotType === 'revision')) {
      await ExamSchedule.deleteMany({
        exam: payload.exam,
        class: payload.class,
        date: {
          $gte: new Date(new Date(scheduleDate).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(scheduleDate).setHours(23, 59, 59, 999)),
        },
        slotType: { $in: ['holiday', 'no_session'] },
      });
    }

    const existingQuery = {
      exam: payload.exam,
      class: payload.class,
    };

    if (hasWeeklySlot) {
      payload.day = String(payload.day);
      payload.date = null;
      existingQuery.day = payload.day;
    } else {
      payload.day = undefined;
      const startOfDay = new Date(new Date(scheduleDate).setHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date(scheduleDate).setHours(23, 59, 59, 999));
      existingQuery.date = { $gte: startOfDay, $lte: endOfDay };
    }

    if (payload.slotType === 'exam' || payload.slotType === 'revision') {
      existingQuery.period = payload.period;
    } else {
      existingQuery.period = null;
    }

    if (!hasWeeklySlot && payload.slotType === 'holiday') {
      const existingFullDayHoliday = await ExamSchedule.findOne({
        exam: payload.exam,
        class: payload.class,
        date: {
          $gte: new Date(new Date(scheduleDate).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(scheduleDate).setHours(23, 59, 59, 999)),
        },
        slotType: 'holiday',
      }).select('_id');

      const blockedHolidayRecords = await mergeHolidayRecords(
        await ExamSchedule.find({
          exam: payload.exam,
          class: payload.class,
          slotType: 'holiday',
          date: { $gte: new Date(new Date(scheduleDate).setHours(0, 0, 0, 0)) },
        }).select('date note'),
        await fetchGovernmentHolidayRecords({
          startDate: scheduleDate,
          endDate: addDays(scheduleDate, 60),
          calendarUrl: settings?.governmentHolidayCalendarUrl,
        }),
      ).map(record => ({
        date: record.date,
        holidayReason: record.note || record.holidayReason || 'Holiday',
      }));

      if (!existingFullDayHoliday) {
        await shiftExamScheduleSeriesForHoliday({
          examId: payload.exam,
          classId: payload.class,
          holidayDate: scheduleDate,
          blockedHolidayRecords,
        });

        await ExamSchedule.deleteMany({
          exam: payload.exam,
          class: payload.class,
          date: {
            $gte: new Date(new Date(scheduleDate).setHours(0, 0, 0, 0)),
            $lte: new Date(new Date(scheduleDate).setHours(23, 59, 59, 999)),
          },
          slotType: { $in: ['exam', 'revision'] },
        });
      }
    }

    const existing = await ExamSchedule.findOne(existingQuery).select('_id');

    const s = existing
      ? await ExamSchedule.findByIdAndUpdate(existing._id, payload, { new: true, runValidators: true })
      : await ExamSchedule.create(payload);
    const p = await ExamSchedule.findById(s._id)
      .populate('exam', 'name examType')
      .populate('subject','name code color')
      .populate('period', 'periodNo name startTime endTime isBreak')
      .populate('endPeriod', 'periodNo name startTime endTime isBreak')
      .populate('componentSubjects', 'name code color')
      .populate('class','grade section displayName');
    res.status(existing ? 200 : 201).json({ success: true, data: p });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const announceExamSchedule = async (req, res) => {
  try {
    const { examId, classId } = req.body;
    if (!examId || !classId) {
      return res.status(400).json({ success: false, message: 'examId and classId are required.' });
    }

    const [exam, cls, schedules] = await Promise.all([
      Exam.findById(examId),
      ClassModel.findById(classId),
      ExamSchedule.find({ exam: examId, class: classId })
        .populate('period', 'periodNo name startTime endTime')
        .populate('endPeriod', 'periodNo name startTime endTime')
        .populate('subject', 'name code')
        .populate('componentSubjects', 'name code')
        .sort({ date: 1, startTime: 1, paperName: 1 }),
    ]);

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
    if (!schedules.length) {
      return res.status(400).json({ success: false, message: 'Create the exam schedule before announcing it.' });
    }

    exam.isPublished = true;
    await exam.save();

    schedules.sort((left, right) => {
      const leftDayOrder = TIMETABLE_DAY_ORDER[left.day] ?? 99;
      const rightDayOrder = TIMETABLE_DAY_ORDER[right.day] ?? 99;
      if (leftDayOrder !== rightDayOrder) return leftDayOrder - rightDayOrder;

      const leftPeriodNo = Number(left.period?.periodNo ?? 999);
      const rightPeriodNo = Number(right.period?.periodNo ?? 999);
      if (leftPeriodNo !== rightPeriodNo) return leftPeriodNo - rightPeriodNo;

      const leftDate = left.date ? new Date(left.date).getTime() : 0;
      const rightDate = right.date ? new Date(right.date).getTime() : 0;
      return leftDate - rightDate;
    });

    const lines = schedules.map((item, index) => {
      const slotLabel = item.period && item.endPeriod
        ? (String(item.period._id) === String(item.endPeriod._id)
          ? item.period.name
          : `${item.period.name} - ${item.endPeriod.name}`)
        : (item.period?.name || item.slotName || 'Slot');
      const date = item.day || (item.date ? new Date(item.date).toLocaleDateString('en-IN') : 'Date pending');
      if (item.slotType === 'exam') {
        const paper = item.paperName || item.subject?.name || 'Subject';
        const time = [item.startTime, item.endTime].filter(Boolean).join(' - ') || 'Time pending';
        const hall = item.hall ? `, Hall: ${item.hall}` : '';
        return `${index + 1}. ${date} ${slotLabel}: ${paper} - ${time}${hall}`;
      }

      const label = item.slotType === 'revision'
        ? 'Revision'
        : (item.slotType === 'holiday' ? 'Holiday' : 'No Session');
      const time = [item.startTime, item.endTime].filter(Boolean).join(' - ');
      return `${index + 1}. ${date} ${slotLabel}: ${label}${time ? ` - ${time}` : ''}${item.note ? ` (${item.note})` : ''}`;
    });

    const title = `Exam Schedule Announced: ${exam.name} - ${cls.displayName}`;
    const content = [
      `The exam schedule for ${exam.name} has been announced for ${cls.displayName}.`,
      '',
      ...lines,
    ].join('\n');

    const existingCircular = await Circular.findOne({
      title,
      type: 'exam',
      isPublished: true,
      classRefs: classId,
      audience: { $all: ['teacher', 'student', 'parent'] },
    });

    let circular;
    if (existingCircular) {
      existingCircular.content = content;
      existingCircular.publishDate = new Date();
      existingCircular.publishedBy = req.user._id;
      circular = await existingCircular.save();
    } else {
      circular = await Circular.create({
        title,
        content,
        type: 'exam',
        audience: ['teacher', 'student', 'parent'],
        classRefs: [classId],
        publishDate: new Date(),
        isPublished: true,
        publishedBy: req.user._id,
      });
    }

    res.json({
      success: true,
      data: { exam, class: cls, circular, schedules },
      message: 'Exam schedule announced to the class teacher, students, and parents.',
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const getMarks = async (req, res) => {
  try {
    const { examId, studentId, classId, subjectId } = req.query;
    const ay = resolveAcademicYear(req.query.academicYear);
    const query = {};
    if (examId)    query.exam    = examId;
    if (studentId) query.student = studentId;
    if (classId)   query.class   = classId;
    if (subjectId) query.subject = subjectId;

    if (isTeachingRole(req.user.role) && req.user.teacherRef) {
      const canAccess = await canManageExamClass(req, ay, classId, subjectId);
      if (!canAccess) return res.json({ success: true, data: [] });

      const teacher = await getTeacherScope(req);
      const managesAsClassTeacher = String(teacher?.classTeacherOf?._id || teacher?.classTeacherOf || '') === String(classId || '');
      if (!managesAsClassTeacher) {
        const linkedTeacherIds = await getLinkedTeacherIds(req);
        const assignments = await ClassSubject.find(buildAssignmentQuery(linkedTeacherIds, ay, classId, subjectId))
          .populate({
            path: 'subject',
            select: 'subjectRole parentSubject',
            populate: { path: 'parentSubject', select: '_id' },
          })
          .select('subject');

        const allowedSubjectIds = [...new Set(assignments.map(item => {
          const assignmentSubject = item.subject;
          if (!assignmentSubject) return '';
          if (assignmentSubject.subjectRole === 'sub' && assignmentSubject.parentSubject?._id) return String(assignmentSubject.parentSubject._id);
          return String(assignmentSubject._id || assignmentSubject);
        }).filter(Boolean))];

        if (!allowedSubjectIds.length) return res.json({ success: true, data: [] });
        query.subject = subjectId
          ? { $in: allowedSubjectIds.filter(item => item === String(subjectId)) }
          : { $in: allowedSubjectIds };
      }
    }

    const marks = await Mark.find(query)
      .populate('student','firstName lastName admissionNo rollNo')
      .populate('subject','name code')
      .populate('enteredBy', 'name role')
      .populate('publishedBy', 'name role')
      .sort({ 'student.firstName': 1, createdAt: 1 });
    res.json({ success: true, data: marks });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const saveMarks = async (req, res) => {
  try {
    const { marks } = req.body; // array of marks rows with theory/internal components
    const isTeacherEntry = isTeachingRole(req.user.role);
    const workflowStatus = isTeacherEntry ? 'submitted_to_class_teacher' : 'published';
    const results = [];
    for (const m of marks) {
      if (isTeachingRole(req.user.role) && req.user.teacherRef) {
        const canAccess = await canManageExamClass(req, resolveAcademicYear(m.academicYear), m.classId, m.subjectId);
        if (!canAccess) {
          return res.status(403).json({ success: false, message: 'You can only save marks for your own subject and class.' });
        }
      }

      const subjectDoc = await Subject.findById(m.subjectId).select('name code');
      const structure = getMarksStructure(subjectDoc);
      const theoryMaxMarks = Number(m.theoryMaxMarks ?? structure.theoryMaxMarks);
      const assessmentMaxMarks = Number(m.assessmentMaxMarks ?? structure.assessmentMaxMarks);
      const theoryMarks = m.isAbsent ? 0 : Number(m.theoryMarks ?? 0);
      const assessmentMarks = m.isAbsent ? 0 : Number(m.assessmentMarks ?? 0);

      if (!Number.isFinite(theoryMarks) || !Number.isFinite(assessmentMarks)) {
        return res.status(400).json({ success: false, message: 'Theory and internal marks must be valid numbers.' });
      }
      if (theoryMarks < 0 || assessmentMarks < 0) {
        return res.status(400).json({ success: false, message: 'Marks cannot be less than 0.' });
      }
      if (theoryMarks > theoryMaxMarks) {
        return res.status(400).json({ success: false, message: `${subjectDoc?.name || 'Subject'} theory marks cannot be more than ${theoryMaxMarks}.` });
      }
      if (assessmentMarks > assessmentMaxMarks) {
        return res.status(400).json({ success: false, message: `${subjectDoc?.name || 'Subject'} internal/practical marks cannot be more than ${assessmentMaxMarks}.` });
      }

      const marksObtained = theoryMarks + assessmentMarks;
      const maxMarks = theoryMaxMarks + assessmentMaxMarks;
      const grade = calcGrade(marksObtained, maxMarks);
      const isPassed = !m.isAbsent && marksObtained >= (m.passMarks || 35);
      const existingMark = await Mark.findOne({ exam: m.examId, student: m.studentId, subject: m.subjectId }).select('enteredBy workflowStatus');
      if (
        existingMark &&
        isTeacherEntry &&
        String(existingMark.enteredBy || '') !== String(req.user._id)
      ) {
        const enteredByUser = await User.findById(existingMark.enteredBy).select('name');
        return res.status(409).json({
          success: false,
          message: 'This combined subject mark was already submitted by another related subject teacher.',
          enteredBy: enteredByUser?.name || '',
        });
      }
      const doc = await Mark.findOneAndUpdate(
        { exam: m.examId, student: m.studentId, subject: m.subjectId },
        {
          ...m,
          exam: m.examId,
          student: m.studentId,
          subject: m.subjectId,
          class: m.classId,
          theoryMarks,
          theoryMaxMarks,
          assessmentMarks,
          assessmentMaxMarks,
          marksObtained,
          maxMarks,
          grade,
          isPassed,
          workflowStatus,
          enteredBy: req.user._id,
          publishedBy: workflowStatus === 'published' ? req.user._id : null,
          publishedAt: workflowStatus === 'published' ? new Date() : null,
        },
        { upsert: true, new: true },
      );
      results.push(doc);
    }
    res.json({
      success: true,
      data: results,
      message: isTeacherEntry
        ? `${results.length} subject mark(s) submitted to the class teacher.`
        : `${results.length} mark(s) saved and published.`,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const publishMarks = async (req, res) => {
  try {
    const { examId, classId, studentId, academicYear } = req.body;
    const ay = resolveAcademicYear(academicYear);

    if (!examId || !classId || !studentId) {
      return res.status(400).json({ success: false, message: 'examId, classId, and studentId are required.' });
    }

    const teacherScope = await getMergedTeacherScope(req);
    const isFullAdmin = ['super_admin', 'admin', 'principal'].includes(req.user.role);
    const managesClass = isFullAdmin || teacherScope?.classTeacherOfIds?.includes(String(classId || ''));
    if (!managesClass) {
      return res.status(403).json({ success: false, message: 'Only the class teacher or admin can publish marks for this class.' });
    }

    const requiredAssignments = await ClassSubject.find({
      class: classId,
      academicYear: ay,
      isActive: true,
    }).populate({
      path: 'subject',
      select: 'subjectRole parentSubject',
      populate: { path: 'parentSubject', select: '_id' },
    });

    const requiredSubjectIds = [...new Set(requiredAssignments.map(item => {
      const subject = item.subject;
      if (!subject) return '';
      if (subject.subjectRole === 'sub' && subject.parentSubject?._id) return String(subject.parentSubject._id);
      return String(subject._id || subject);
    }).filter(Boolean))];
    if (!requiredSubjectIds.length) {
      return res.status(400).json({ success: false, message: 'No active subjects are assigned to this class.' });
    }

    const marks = await Mark.find({
      exam: examId,
      class: classId,
      student: studentId,
      subject: { $in: requiredSubjectIds },
    });

    const marksBySubject = new Map(marks.map(mark => [String(mark.subject), mark]));
    const missingSubjectIds = requiredSubjectIds.filter(subjectId => !marksBySubject.has(subjectId));
    if (missingSubjectIds.length) {
      return res.status(400).json({ success: false, message: 'All subject teachers must submit marks before publishing to the student and parent portals.' });
    }

    await Mark.updateMany(
      {
        exam: examId,
        class: classId,
        student: studentId,
        subject: { $in: requiredSubjectIds },
      },
      {
        $set: {
          workflowStatus: 'published',
          publishedBy: req.user._id,
          publishedAt: new Date(),
        },
      },
    );

    const publishedMarks = await Mark.find({
      exam: examId,
      class: classId,
      student: studentId,
      subject: { $in: requiredSubjectIds },
    })
      .populate('subject', 'name code')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: publishedMarks,
      message: 'Marks published successfully to the student and parent portals.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteMarks = async (req, res) => {
  try {
    const { examId, studentId, classId } = req.query;
    const ay = resolveAcademicYear(req.query.academicYear);

    if (!examId || !studentId || !classId) {
      return res.status(400).json({ success: false, message: 'examId, classId, and studentId are required.' });
    }

    if (isTeachingRole(req.user.role) && req.user.teacherRef) {
      const canAccess = await canManageExamClass(req, ay, classId);
      if (!canAccess) {
        return res.status(403).json({ success: false, message: 'You can only delete marks for your own class.' });
      }
    }

    const result = await Mark.deleteMany({
      exam: examId,
      student: studentId,
      class: classId,
    });

    return res.json({
      success: true,
      deletedCount: result.deletedCount || 0,
      message: result.deletedCount ? 'Saved marks deleted.' : 'No saved marks found to delete.',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getReportCard = async (req, res) => {
  try {
    const { examId, studentId } = req.query;
    if (!examId || !studentId) {
      return res.status(400).json({ success: false, message: 'examId and studentId are required.' });
    }

    const [exam, student, marks] = await Promise.all([
      Exam.findById(examId),
      Student.findById(studentId).populate('classRef', 'grade section displayName'),
      Mark.find({ exam: examId, student: studentId })
        .populate('subject', 'name code')
        .sort({ createdAt: 1 }),
    ]);

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    if (isTeachingRole(req.user.role)) {
      const teacher = await getTeacherScope(req);
      const classTeacherOf = String(teacher?.classTeacherOf?._id || teacher?.classTeacherOf || '');
      const linkedTeacherIds = await getLinkedTeacherIds(req);
      const assignedClassIds = await ClassSubject.distinct('class', buildAssignmentQuery(linkedTeacherIds, exam.academicYear));
      const allowedClassIds = new Set([
        ...assignedClassIds.map(String),
        ...(classTeacherOf ? [classTeacherOf] : []),
      ]);
      if (!allowedClassIds.has(String(student.classRef?._id || ''))) {
        return res.status(403).json({ success: false, message: 'You can only view report cards for your assigned classes.' });
      }
    }

    const totalObtained = marks.reduce((sum, mark) => sum + (mark.isAbsent ? 0 : Number(mark.marksObtained || 0)), 0);
    const totalMax = marks.reduce((sum, mark) => sum + Number(mark.maxMarks || 0), 0);
    const percentage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
    const passedCount = marks.filter(mark => mark.isPassed).length;
    const failedCount = marks.filter(mark => !mark.isPassed && !mark.isAbsent).length;
    const absentCount = marks.filter(mark => mark.isAbsent).length;

    res.json({
      success: true,
      data: {
        exam: {
          _id: exam._id,
          name: exam.name,
          examType: exam.examType,
          academicYear: exam.academicYear,
          startDate: exam.startDate,
          endDate: exam.endDate,
        },
        student: {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNo: student.admissionNo,
          rollNo: student.rollNo,
          className: student.classRef?.displayName || `Grade ${student.grade}${student.section ? `-${student.section}` : ''}`,
        },
        marks: marks.map(mark => ({
          _id: mark._id,
          subject: mark.subject,
          theoryMarks: mark.theoryMarks ?? mark.marksObtained,
          theoryMaxMarks: mark.theoryMaxMarks ?? mark.maxMarks,
          assessmentMarks: mark.assessmentMarks ?? 0,
          assessmentMaxMarks: mark.assessmentMaxMarks ?? 0,
          marksObtained: mark.marksObtained,
          maxMarks: mark.maxMarks,
          grade: mark.grade,
          isPassed: mark.isPassed,
          isAbsent: mark.isAbsent,
          remarks: mark.remarks || '',
        })),
        summary: {
          totalSubjects: marks.length,
          totalObtained,
          totalMax,
          percentage,
          result: failedCount === 0 ? 'PASS' : 'FAIL',
          passedCount,
          failedCount,
          absentCount,
        },
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const calcGrade = (obtained, max) => {
  const pct = (obtained / max) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
};

const normalizeMarkSubjectName = subject => String(subject?.name || subject?.code || '').trim().toLowerCase();
const isSocialScienceMarkSubject = subject => {
  const value = normalizeMarkSubjectName(subject);
  return value.includes('social science') || value.includes('socialscience');
};
const isScienceMarkSubject = subject => {
  const value = normalizeMarkSubjectName(subject);
  return !isSocialScienceMarkSubject(subject) && value.includes('science');
};
const getMarksStructure = subject => {
  if (isScienceMarkSubject(subject)) {
    return { theoryMaxMarks: 75, assessmentMaxMarks: 25, totalMaxMarks: 100, assessmentLabel: 'Practical / Internal' };
  }

  return { theoryMaxMarks: 90, assessmentMaxMarks: 10, totalMaxMarks: 100, assessmentLabel: 'Internal' };
};

// ── LIBRARY ───────────────────────────────────────────────────────────────────
export const getBooks = async (req, res) => {
  try {
    const { search, category } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      defaultLimit: 20,
      defaultSortBy: 'title',
      defaultSortOrder: 'asc',
    });
    const { sort } = resolveSort(sortBy, sortOrder, {
      title: 'title',
      author: 'author',
      category: 'category',
      availableCopies: 'availableCopies',
      totalCopies: 'totalCopies',
      createdAt: 'createdAt',
    }, 'title');
    const query = { isActive: true };
    if (category) query.category = category;
    if (search) {
      const re = createSearchRegex(search);
      query.$or = [{ title: re }, { author: re }, { isbn: re }, { accessionNo: re }];
    }
    const total = await Book.countDocuments(query);
    const books = await Book.find(query).skip(skip).limit(limit).sort(sort);
    res.json(createPaginatedResponse({ data: books, total, page, limit }));
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createBook = async (req, res) => {
  try {
    const book = await Book.create(req.body);
    res.status(201).json({ success: true, data: book, message: 'Book added.' });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'ISBN or Accession No already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });
    res.json({ success: true, data: book });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const issueBook = async (req, res) => {
  try {
    const { bookId, studentId, teacherId, borrowerType, dueDate } = req.body;
    const book = await Book.findById(bookId);
    if (!book || book.availableCopies <= 0)
      return res.status(400).json({ success: false, message: 'Book not available.' });
    const issue = await BookIssue.create({ book: bookId, borrowerType: borrowerType || 'student', student: studentId, teacher: teacherId, dueDate: new Date(dueDate), issuedBy: req.user._id });
    book.availableCopies--;
    await book.save();
    const populated = await BookIssue.findById(issue._id).populate('book','title author isbn').populate('student','firstName lastName admissionNo');
    res.status(201).json({ success: true, data: populated, message: 'Book issued.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const returnBook = async (req, res) => {
  try {
    const issue = await BookIssue.findById(req.params.id).populate('book');
    if (!issue) return res.status(404).json({ success: false, message: 'Issue record not found.' });
    const today = new Date();
    let fine = 0;
    if (today > issue.dueDate) {
      const days = Math.ceil((today - issue.dueDate) / 86400000);
      fine = days * 2; // ₹2 per day
    }
    issue.returnDate = today;
    issue.status     = 'returned';
    issue.fine       = fine;
    issue.returnedTo = req.user._id;
    await issue.save();
    issue.book.availableCopies++;
    await issue.book.save();
    res.json({ success: true, data: issue, fine, message: fine ? `Book returned with fine ₹${fine}.` : 'Book returned.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const getIssues = async (req, res) => {
  try {
    const { status, studentId } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      defaultLimit: 20,
      defaultSortBy: 'issueDate',
      defaultSortOrder: 'desc',
    });
    const { sort } = resolveSort(sortBy, sortOrder, {
      issueDate: 'issueDate',
      dueDate: 'dueDate',
      status: 'status',
    }, 'issueDate');
    const query = {};
    if (status)    query.status  = status;
    if (studentId) query.student = studentId;
    const total = await BookIssue.countDocuments(query);
    const issues = await BookIssue.find(query)
      .populate('book','title author isbn accessionNo')
      .populate('student','firstName lastName admissionNo')
      .skip(skip).limit(limit)
      .sort(sort);
    res.json(createPaginatedResponse({ data: issues, total, page, limit }));
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── INVENTORY ─────────────────────────────────────────────────────────────────
export const getInventory = async (req, res) => {
  try {
    const { category } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    const items = await Inventory.find(query).sort({ name: 1 });
    res.json({ success: true, data: items });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.create(req.body);
    res.status(201).json({ success: true, data: item, message: 'Item added.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const recordInventoryTxn = async (req, res) => {
  try {
    const { itemId, type, quantity, remarks } = req.body;
    const item = await Inventory.findById(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
    if (type === 'purchase' || type === 'return') item.currentStock += Number(quantity);
    else if (type === 'issue') {
      if (item.currentStock < Number(quantity)) return res.status(400).json({ success: false, message: 'Insufficient stock.' });
      item.currentStock -= Number(quantity);
    }
    await item.save();
    const txn = await InventoryTxn.create({ item: itemId, type, quantity, balance: item.currentStock, remarks, recordedBy: req.user._id });
    res.status(201).json({ success: true, data: { item, txn }, message: 'Transaction recorded.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── EXPENSE ───────────────────────────────────────────────────────────────────
export const getExpenses = async (req, res) => {
  try {
    const { academicYear, category, search } = req.query;
    const ay = resolveAcademicYear(academicYear);
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      defaultLimit: 20,
      defaultSortBy: 'date',
      defaultSortOrder: 'desc',
    });
    const { sort } = resolveSort(sortBy, sortOrder, {
      date: 'date',
      amount: 'amount',
      title: 'title',
      category: 'category',
      createdAt: 'createdAt',
    }, 'date');
    const query = { academicYear: ay };
    if (category) query.category = category;
    if (search) {
      const re = createSearchRegex(search);
      query.$or = [{ title: re }, { category: re }, { description: re }];
    }
    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query).populate('recordedBy','name').skip(skip).limit(limit).sort(sort);
    const totalAmount = (await Expense.aggregate([{ $match: query }, { $group: { _id: null, sum: { $sum: '$amount' } } }]))[0]?.sum || 0;
    res.json(createPaginatedResponse({ data: expenses, total, page, limit, extra: { totalAmount } }));
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createExpense = async (req, res) => {
  try {
    const ay  = resolveAcademicYear(req.body.academicYear);
    const exp = await Expense.create({ ...req.body, academicYear: ay, recordedBy: req.user._id });
    res.status(201).json({ success: true, data: exp, message: 'Expense recorded.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export default {
  getLeaves, createLeave, updateLeaveStatus,
  getOutpasses, createOutpass, updateOutpassStatus,
  getCirculars, createCircular, deleteCircular,
  getHomework, createHomework, deleteHomework,
  getExams, createExam, updateExam, deleteExam, getExamSchedule, createExamSchedule, announceExamSchedule, getMarks, saveMarks, publishMarks, deleteMarks, getReportCard,
  getBooks, createBook, updateBook, issueBook, returnBook, getIssues,
  getInventory, createInventoryItem, recordInventoryTxn,
  getExpenses, createExpense,
};
