import TimetableSlot, { TIMETABLE_DAYS } from '../models/TimetableSlot.model.js';
import Teacher      from '../models/Teacher.model.js';
import Class        from '../models/Class.model.js';
import Subject      from '../models/Subject.model.js';
import Period       from '../models/Period.model.js';
import ClassSubject from '../models/ClassSubject.model.js';
import { resolveAcademicYear } from '../utils/academicYear.js';
import { getActiveClassSubjectIds, validateSubjectForClass, isHigherSecondaryClass } from '../utils/classSubject.js';
import { getActivePeriodsForDisplay } from '../utils/periods.js';

const checkConstraints = async (teacherId, classId, periodId, day, academicYear, excludeId = null) => {
  const base = { day, period: periodId, academicYear, isActive: true };
  const excl = excludeId ? { _id: { $ne: excludeId } } : {};

  const teacherBusy = await TimetableSlot.findOne({ ...base, ...excl, teacher: teacherId });
  if (teacherBusy) return { valid: false, reason: 'Teacher is already assigned to another class at this time.' };

  const classBusy = await TimetableSlot.findOne({ ...base, ...excl, class: classId });
  if (classBusy) return { valid: false, reason: 'This class already has a subject in this period.' };

  const teacher = await Teacher.findById(teacherId);
  if (teacher) {
    const dayCount = await TimetableSlot.countDocuments({
      teacher: teacherId,
      day,
      academicYear,
      isActive: true,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (dayCount >= teacher.maxPeriodsPerDay) {
      return { valid: false, reason: `Teacher has reached max periods per day (${teacher.maxPeriodsPerDay}).` };
    }

    const weekCount = await TimetableSlot.countDocuments({
      teacher: teacherId,
      academicYear,
      isActive: true,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (weekCount >= teacher.maxPeriodsPerWeek) {
      return { valid: false, reason: `Teacher has reached max periods per week (${teacher.maxPeriodsPerWeek}).` };
    }
  }

  return { valid: true };
};

const validateEligibility = async (teacherId, classId, subjectId) => {
  const [teacher, cls, subject] = await Promise.all([
    Teacher.findById(teacherId).populate('eligibleSubjects'),
    Class.findById(classId),
    Subject.findById(subjectId),
  ]);

  if (!teacher) return { valid: false, status: 404, reason: 'Teacher not found.' };
  if (!cls) return { valid: false, status: 404, reason: 'Class not found.' };
  if (!subject) return { valid: false, status: 404, reason: 'Subject not found.' };

  if (teacher.eligibleGradeLevels?.length && !teacher.eligibleGradeLevels.includes(cls.gradeLevel)) {
    return { valid: false, status: 400, reason: 'Teacher is not eligible to teach this grade level.' };
  }

  if (teacher.eligibleSubjects?.length) {
    const ids = teacher.eligibleSubjects.map(s => String(s._id || s));
    if (!ids.includes(String(subjectId))) {
      return { valid: false, status: 400, reason: 'Teacher is not eligible to teach this subject.' };
    }
  }

  if (isHigherSecondaryClass(cls) || cls.classType === 'group') {
    const allowed = await getActiveClassSubjectIds(classId, academicYear => academicYear);
    if (allowed.length > 0 && !allowed.includes(String(subjectId))) {
      const subjectForClass = await validateSubjectForClass(classId, subjectId);
      if (!subjectForClass.valid) {
        return { valid: false, status: 400, reason: subjectForClass.reason };
      }
    }
  }

  return { valid: true, teacher, cls, subject };
};

export const getClassTimetable = async (req, res) => {
  try {
    const { classId } = req.params;
    const ay = resolveAcademicYear(req.query.academicYear);

    const slots = await TimetableSlot.find({ class: classId, academicYear: ay, isActive: true })
      .populate('subject', 'name code color type')
      .populate('teacher', 'firstName lastName employeeId')
      .populate('period', 'periodNo name startTime endTime type isBreak')
      .sort({ day: 1 });

    const grid = {};
    TIMETABLE_DAYS.forEach(d => {
      grid[d] = {};
    });

    slots.forEach(slot => {
      if (slot.period) grid[slot.day][String(slot.period._id)] = slot;
    });

    const periods = await getActivePeriodsForDisplay(ay);
    res.json({ success: true, data: { slots, grid, periods } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTeacherTimetable = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const ay = resolveAcademicYear(req.query.academicYear);

    const slots = await TimetableSlot.find({ teacher: teacherId, academicYear: ay, isActive: true })
      .populate('subject', 'name code color type')
      .populate('class', 'grade section displayName groupName')
      .populate('period', 'periodNo name startTime endTime type isBreak')
      .sort({ day: 1 });

    const grid = {};
    TIMETABLE_DAYS.forEach(d => {
      grid[d] = {};
    });

    slots.forEach(slot => {
      if (slot.period) grid[slot.day][String(slot.period._id)] = slot;
    });

    const periods = await getActivePeriodsForDisplay(ay);
    res.json({ success: true, data: { slots, grid, periods } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const upsertSlot = async (req, res) => {
  try {
    const { classId, subjectId, teacherId, periodId, day, academicYear, weekType, specialResourceId } = req.body;
    const ay = resolveAcademicYear(academicYear);

    const eligible = await validateEligibility(teacherId, classId, subjectId);
    if (!eligible.valid) {
      return res.status(eligible.status || 400).json({ success: false, message: eligible.reason });
    }

    const period = await Period.findById(periodId);
    if (!period) return res.status(404).json({ success: false, message: 'Period not found.' });
    if (period.isBreak) return res.status(400).json({ success: false, message: 'Cannot assign subject to a break period.' });

    const constraint = await checkConstraints(teacherId, classId, periodId, day, ay);
    if (!constraint.valid) {
      return res.status(409).json({ success: false, message: constraint.reason });
    }

    await TimetableSlot.deleteMany({
      $or: [
        { teacher: teacherId, period: periodId, day, academicYear: ay, isActive: false },
        { class: classId, period: periodId, day, academicYear: ay, isActive: false },
      ],
    });

    const slot = await TimetableSlot.create({
      class: classId,
      subject: subjectId,
      teacher: teacherId,
      period: periodId,
      day,
      academicYear: ay,
      weekType: weekType || 'all',
      specialResource: specialResourceId || null,
    });

    const populated = await TimetableSlot.findById(slot._id)
      .populate('subject', 'name code color type')
      .populate('teacher', 'firstName lastName employeeId')
      .populate('period', 'periodNo name startTime endTime')
      .populate('class', 'grade section displayName');

    res.status(201).json({ success: true, data: populated, message: 'Slot assigned.' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Conflict: This slot is already occupied.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSlot = async (req, res) => {
  try {
    const { subjectId, teacherId, periodId, day, academicYear, weekType } = req.body;
    const ay = resolveAcademicYear(academicYear);
    const slot = await TimetableSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found.' });

    const newTeacher = teacherId || String(slot.teacher);
    const newClass = String(slot.class);
    const newSubject = subjectId || String(slot.subject);
    const newPeriod = periodId || String(slot.period);
    const newDay = day || slot.day;

    const eligible = await validateEligibility(newTeacher, newClass, newSubject);
    if (!eligible.valid) {
      return res.status(eligible.status || 400).json({ success: false, message: eligible.reason });
    }

    const constraint = await checkConstraints(newTeacher, newClass, newPeriod, newDay, ay, req.params.id);
    if (!constraint.valid) {
      return res.status(409).json({ success: false, message: constraint.reason });
    }

    Object.assign(slot, {
      subject: newSubject,
      teacher: newTeacher,
      period: newPeriod,
      day: newDay,
      weekType: weekType || slot.weekType,
    });
    await slot.save();

    const populated = await TimetableSlot.findById(slot._id)
      .populate('subject', 'name code color type')
      .populate('teacher', 'firstName lastName employeeId')
      .populate('period', 'periodNo name startTime endTime')
      .populate('class', 'grade section displayName');

    res.json({ success: true, data: populated, message: 'Slot updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteSlot = async (req, res) => {
  try {
    await TimetableSlot.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Slot removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const clearClassTimetable = async (req, res) => {
  try {
    const { classId } = req.params;
    const ay = resolveAcademicYear(req.body.academicYear || req.query.academicYear);

    const result = await TimetableSlot.updateMany(
      { class: classId, academicYear: ay, isActive: true },
      { isActive: false }
    );

    res.json({
      success: true,
      message: `Removed ${result.modifiedCount || 0} timetable slots.`,
      data: { cleared: result.modifiedCount || 0 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const autoGenerateTimetable = async (req, res) => {
  try {
    const { classId } = req.params;
    const { academicYear, overwrite } = req.body;
    const ay = resolveAcademicYear(academicYear);

    const [cls, periods, assignments] = await Promise.all([
      Class.findById(classId),
      getActivePeriodsForDisplay(ay, { isBreak: false }),
      ClassSubject.find({ class: classId, academicYear: ay, isActive: true })
        .populate('subject')
        .populate('teacher'),
    ]);

    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
    if (!periods.length) return res.status(400).json({ success: false, message: 'No periods configured. Please generate periods first.' });
    if (!assignments.length) return res.status(400).json({ success: false, message: 'No subjects assigned to this class. Please assign subjects first.' });
    if (assignments.some(a => !a.teacher)) {
      return res.status(400).json({ success: false, message: 'Some subjects have no teacher assigned. Please assign teachers to all subjects.' });
    }

    if (overwrite) {
      await TimetableSlot.updateMany({ class: classId, academicYear: ay }, { isActive: false });
    }

    const slotsCreated = [];
    const conflicts = [];

    const days = TIMETABLE_DAYS.slice(0, 6);
    const planner = assignments.map(a => ({
      subjectId: String(a.subject._id),
      subjectName: a.subject?.name || 'Subject',
      teacherId: String(a.teacher._id),
      remaining: Math.max(0, a.periodsPerWeek || 5),
    }));

    const daySubjectUsage = Object.fromEntries(days.map(day => [day, new Set()]));
    const shuffle = items => [...items].sort(() => Math.random() - 0.5);

    for (const day of days) {
      for (const period of periods) {
        const candidates = shuffle(
          planner
            .filter(item => item.remaining > 0 && !daySubjectUsage[day].has(item.subjectId))
            .sort((a, b) => b.remaining - a.remaining)
        );

        if (!candidates.length) {
          if (planner.some(item => item.remaining > 0)) {
            conflicts.push({
              day,
              periodNo: period.periodNo,
              reason: 'No unique subject available for this day without repeating a subject.',
            });
          }
          continue;
        }

        let placed = false;

        for (const candidate of candidates) {
          const constraint = await checkConstraints(candidate.teacherId, classId, period._id, day, ay);
          if (!constraint.valid) {
            conflicts.push({
              day,
              periodNo: period.periodNo,
              reason: constraint.reason,
              subjectId: candidate.subjectId,
              subjectName: candidate.subjectName,
            });
            continue;
          }

          try {
            await TimetableSlot.deleteMany({
              $or: [
                { teacher: candidate.teacherId, period: period._id, day, academicYear: ay, isActive: false },
                { class: classId, period: period._id, day, academicYear: ay, isActive: false },
              ],
            });

            const slot = await TimetableSlot.create({
              class: classId,
              subject: candidate.subjectId,
              teacher: candidate.teacherId,
              period: period._id,
              day,
              academicYear: ay,
            });

            slotsCreated.push(slot);
            candidate.remaining -= 1;
            daySubjectUsage[day].add(candidate.subjectId);
            placed = true;
            break;
          } catch (e) {
            conflicts.push({
              day,
              periodNo: period.periodNo,
              reason: e.message,
              subjectId: candidate.subjectId,
              subjectName: candidate.subjectName,
            });
          }
        }

        if (!placed && planner.some(item => item.remaining > 0)) {
          conflicts.push({
            day,
            periodNo: period.periodNo,
            reason: 'Unable to place a unique subject in this period with the current teacher constraints.',
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Auto-generation complete. ${slotsCreated.length} slots created, ${conflicts.length} conflicts.`,
      data: { created: slotsCreated.length, conflicts },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTeacherWorkload = async (req, res) => {
  try {
    const ay = resolveAcademicYear(req.query.academicYear);
    const teachers = await Teacher.find({ isActive: true }).select('firstName lastName employeeId maxPeriodsPerWeek');

    const workload = await Promise.all(teachers.map(async t => {
      const slots = await TimetableSlot.countDocuments({ teacher: t._id, academicYear: ay, isActive: true });
      return {
        teacher: { _id: t._id, name: `${t.firstName} ${t.lastName}`, employeeId: t.employeeId },
        assigned: slots,
        max: t.maxPeriodsPerWeek,
        utilization: Math.round((slots / t.maxPeriodsPerWeek) * 100),
      };
    }));

    res.json({ success: true, data: workload });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getConflicts = async (req, res) => {
  try {
    const ay = resolveAcademicYear(req.params.academicYear || req.query.academicYear);
    const pipeline = [
      { $match: { academicYear: ay, isActive: true } },
      { $group: { _id: { teacher: '$teacher', day: '$day', period: '$period' }, count: { $sum: 1 }, slots: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } },
    ];
    const teacherConflicts = await TimetableSlot.aggregate(pipeline);
    res.json({ success: true, data: { teacherConflicts, total: teacherConflicts.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default {
  getClassTimetable,
  getTeacherTimetable,
  upsertSlot,
  updateSlot,
  deleteSlot,
  clearClassTimetable,
  autoGenerateTimetable,
  getTeacherWorkload,
  getConflicts,
};
