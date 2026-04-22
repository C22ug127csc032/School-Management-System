import ClassSubject from '../models/ClassSubject.model.js';
import Class from '../models/Class.model.js';

export const isHigherSecondaryClass = (cls) =>
  ['11', '12'].includes(String(cls?.grade));

export const isGroupClass = (cls) =>
  cls?.classType === 'group';

export const getActiveClassSubjectAssignments = async (classId, academicYear) => {
  const query = { class: classId, isActive: true };
  if (academicYear) query.academicYear = academicYear;
  return ClassSubject.find(query)
    .populate('subject', 'name code color type applicableGradeLevels periodsPerWeek applicableGroups isGroupSpecific')
    .populate('teacher', 'name firstName lastName employeeId eligibleGradeLevels eligibleSubjects')
    .sort({ createdAt: 1 });
};

export const getActiveClassSubjectIds = async (classId, academicYear) => {
  const query = { class: classId, isActive: true };
  if (academicYear) query.academicYear = academicYear;
  const assignments = await ClassSubject.find(query).select('subject');
  return assignments.map(a => String(a.subject));
};

// Validate that a subject can be assigned to a class
// For 11 & 12: checks group compatibility
export const validateSubjectForClass = async (classId, subjectId) => {
  const cls = await Class.findById(classId);
  const { default: Subject } = await import('../models/Subject.model.js');
  const subject = await Subject.findById(subjectId);

  if (!cls || !subject) return { valid: false, reason: 'Class or subject not found' };

  // Check grade level
  if (subject.applicableGradeLevels?.length &&
      !subject.applicableGradeLevels.includes(cls.gradeLevel))
    return { valid: false, reason: `Subject not applicable for ${cls.gradeLevel} level` };

  // For group classes (11 & 12): check group compatibility
  if (cls.classType === 'group' && subject.applicableGroups?.length) {
    if (!subject.applicableGroups.includes(cls.groupName)) {
      return {
        valid: false,
        reason: `Subject "${subject.name}" is not applicable for the "${cls.groupName}" group. It belongs to: ${subject.applicableGroups.join(', ')}`,
      };
    }
  }

  return { valid: true, cls, subject };
};
