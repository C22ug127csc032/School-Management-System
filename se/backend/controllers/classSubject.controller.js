import ClassSubject from '../models/ClassSubject.model.js';
import Class        from '../models/Class.model.js';
import Subject      from '../models/Subject.model.js';
import Teacher      from '../models/Teacher.model.js';
import { validateSubjectForClass, getActiveClassSubjectAssignments } from '../utils/classSubject.js';
import { resolveAcademicYear } from '../utils/academicYear.js';

// GET /api/class-subjects?classId=&academicYear=
export const getClassSubjects = async (req, res) => {
  try {
    const { classId, academicYear } = req.query;
    if (!classId) return res.status(400).json({ success: false, message: 'classId is required.' });
    const ay           = resolveAcademicYear(academicYear);
    const assignments  = await getActiveClassSubjectAssignments(classId, ay);
    const cls          = await Class.findById(classId);
    res.json({ success: true, data: assignments, class: cls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/class-subjects/teacher/:teacherId?academicYear=&classId=
export const getTeacherClassSubjects = async (req, res) => {
  try {
    const teacherId = ['teacher', 'class_teacher'].includes(req.user.role) && req.user.teacherRef
      ? String(req.user.teacherRef)
      : req.params.teacherId;
    const { academicYear, classId } = req.query;
    const ay = resolveAcademicYear(academicYear);

    const query = {
      teacher: teacherId,
      academicYear: ay,
      isActive: true,
    };
    if (classId) query.class = classId;

    const assignments = await ClassSubject.find(query)
      .populate({
        path: 'subject',
        select: 'name code color type subjectRole parentSubject applicableGradeLevels applicableGroups',
        populate: { path: 'parentSubject', select: 'name code subjectRole color' },
      })
      .populate('teacher', 'firstName lastName employeeId')
      .populate('class', 'grade section displayName groupName gradeLevel')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/class-subjects — assign a subject to a class
export const assignSubject = async (req, res) => {
  try {
    const { classId, subjectId, teacherId, periodsPerWeek, academicYear } = req.body;
    const ay = resolveAcademicYear(academicYear);

    // Validate subject-class compatibility (including group check for 11 & 12)
    const validation = await validateSubjectForClass(classId, subjectId);
    if (!validation.valid)
      return res.status(400).json({ success: false, message: validation.reason });

    // Teacher eligibility check
    if (teacherId) {
      const teacher = await Teacher.findById(teacherId).populate('eligibleSubjects');
      if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });

      const cls = await Class.findById(classId);
      if (!teacher.eligibleGradeLevels?.includes(cls.gradeLevel))
        return res.status(400).json({ success: false, message: 'Teacher is not eligible for this grade level.' });

      if (teacher.eligibleSubjects?.length) {
        const eligible = teacher.eligibleSubjects.map(s => String(s._id || s));
        if (!eligible.includes(String(subjectId)))
          return res.status(400).json({ success: false, message: 'Teacher is not eligible to teach this subject.' });
      }
    }

    // Check for existing assignment
    const existing = await ClassSubject.findOne({ class: classId, subject: subjectId, academicYear: ay });
    if (existing) {
      if (existing.isActive)
        return res.status(409).json({ success: false, message: 'Subject already assigned to this class.' });
      // Reactivate
      existing.isActive       = true;
      existing.teacher        = teacherId || null;
      existing.periodsPerWeek = periodsPerWeek || 5;
      await existing.save();
      const populated = await ClassSubject.findById(existing._id)
        .populate({
          path: 'subject',
          select: 'name code color type subjectRole parentSubject',
          populate: { path: 'parentSubject', select: 'name code subjectRole color' },
        })
        .populate('teacher','firstName lastName employeeId');
      return res.json({ success: true, data: populated, message: 'Subject assignment restored.' });
    }

    const assignment = await ClassSubject.create({
      class: classId, subject: subjectId,
      teacher: teacherId || null,
      periodsPerWeek: periodsPerWeek || 5,
      academicYear: ay,
    });

    const populated = await ClassSubject.findById(assignment._id)
      .populate({
        path: 'subject',
        select: 'name code color type subjectRole parentSubject',
        populate: { path: 'parentSubject', select: 'name code subjectRole color' },
      })
      .populate('teacher','firstName lastName employeeId');

    res.status(201).json({ success: true, data: populated, message: 'Subject assigned to class.' });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'Subject already assigned to this class.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/class-subjects/:id — update teacher or periodsPerWeek
export const updateClassSubject = async (req, res) => {
  try {
    const { teacherId, periodsPerWeek } = req.body;
    const assignment = await ClassSubject.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });

    if (teacherId) {
      const teacher = await Teacher.findById(teacherId).populate('eligibleSubjects');
      if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });

      const cls = await Class.findById(assignment.class);
      if (cls && teacher.eligibleGradeLevels?.length && !teacher.eligibleGradeLevels.includes(cls.gradeLevel)) {
        return res.status(400).json({ success: false, message: 'Teacher is not eligible for this grade level.' });
      }

      if (teacher.eligibleSubjects?.length) {
        const eligible = teacher.eligibleSubjects.map(s => String(s._id || s));
        if (!eligible.includes(String(assignment.subject))) {
          return res.status(400).json({ success: false, message: 'Teacher is not eligible to teach this subject.' });
        }
      }
    }

    if (teacherId !== undefined) assignment.teacher = teacherId || null;
    if (periodsPerWeek !== undefined) assignment.periodsPerWeek = periodsPerWeek;
    await assignment.save();

    const populated = await ClassSubject.findById(assignment._id)
      .populate({
        path: 'subject',
        select: 'name code color type subjectRole parentSubject',
        populate: { path: 'parentSubject', select: 'name code subjectRole color' },
      })
      .populate('teacher','firstName lastName employeeId');
    res.json({ success: true, data: populated, message: 'Assignment updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/class-subjects/:id
export const removeSubject = async (req, res) => {
  try {
    const assignment = await ClassSubject.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    res.json({ success: true, message: 'Subject removed from class.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/class-subjects/available-subjects?classId=&academicYear=
// Returns subjects NOT yet assigned to this class (based on group/grade eligibility)
export const getAvailableSubjectsForClass = async (req, res) => {
  try {
    const { classId, academicYear } = req.query;
    const ay  = resolveAcademicYear(academicYear);
    const cls = await Class.findById(classId);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    // Already assigned subject IDs
    const assigned = await ClassSubject.find({ class: classId, academicYear: ay, isActive: true }).select('subject');
    const assignedIds = assigned.map(a => String(a.subject));

    // Build subject query based on class
    const query = {
      isActive: true,
      applicableGradeLevels: cls.gradeLevel,
      _id: { $nin: assignedIds },
      subjectRole: { $ne: 'main' },
    };

    if (cls.classType === 'group' && cls.groupName) {
      // For group classes: return common subjects + group-specific subjects for THIS group
      query.$or = [
        { applicableGroups: { $exists: false } },          // legacy/common subjects
        { applicableGroups: { $size: 0 } },                // common to all groups
        { applicableGroups: cls.groupName },                // specific to this group
      ];
    }

    const subjects = await Subject.find(query).populate('parentSubject', 'name code subjectRole').sort({ name: 1 });
    res.json({ success: true, data: subjects, classInfo: cls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default { getClassSubjects, getTeacherClassSubjects, assignSubject, updateClassSubject, removeSubject, getAvailableSubjectsForClass };
