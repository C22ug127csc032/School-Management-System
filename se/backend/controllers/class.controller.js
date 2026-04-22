import mongoose from 'mongoose';
import Class from '../models/Class.model.js';
import Teacher from '../models/Teacher.model.js';
import Student from '../models/Student.model.js';
import ClassSubject from '../models/ClassSubject.model.js';
import Attendance from '../models/Attendance.model.js';
import TimetableSlot from '../models/TimetableSlot.model.js';
import { Substitution } from '../models/Substitution.model.js';
import { FeeStructure } from '../models/Fees.model.js';
import { Circular, Homework, ExamSchedule, Mark } from '../models/Academic.model.js';
import { resolveAcademicYear } from '../utils/academicYear.js';

const GRADE_ORDER = ['Pre-KG','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
const normalizeSection = value => String(value || '').trim().toUpperCase();

// GET /api/classes
export const getClasses = async (req, res) => {
  try {
    const { academicYear, grade, gradeLevel, includeInactive, classTeacherId, teacherId } = req.query;
    const ay = resolveAcademicYear(academicYear);
    const query = { academicYear: ay };
    if (!includeInactive) query.isActive = true;
    if (grade) query.grade = grade;
    if (gradeLevel) query.gradeLevel = gradeLevel;
    if (classTeacherId) {
      if (mongoose.Types.ObjectId.isValid(classTeacherId)) {
        query.classTeacher = classTeacherId;
      } else {
        query.classTeacher = new mongoose.Types.ObjectId();
      }
    }
    if (teacherId) {
      if (mongoose.Types.ObjectId.isValid(teacherId)) {
        const [teacherClassIds, teacher] = await Promise.all([
          ClassSubject.distinct('class', {
            teacher: teacherId,
            academicYear: ay,
            isActive: true,
          }),
          Teacher.findById(teacherId).select('classTeacherOf'),
        ]);

        const accessibleClassIds = [
          ...teacherClassIds.map(String),
          ...(teacher?.classTeacherOf ? [String(teacher.classTeacherOf)] : []),
        ];

        query._id = { $in: [...new Set(accessibleClassIds)] };
      } else {
        query._id = new mongoose.Types.ObjectId();
      }
    }

    const classes = await Class.find(query)
      .populate('classTeacher', 'firstName lastName employeeId');

    const studentCounts = await Student.aggregate([
      {
        $match: {
          academicYear: ay,
          status: { $in: ['active', 'admission_pending'] },
        },
      },
      {
        $group: {
          _id: '$classRef',
          studentCount: { $sum: 1 },
          activeStudentCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const countsByClassId = new Map(
      studentCounts
        .filter(item => item._id)
        .map(item => [String(item._id), item])
    );

    const classRows = classes.map(cls => {
      const counts = countsByClassId.get(String(cls._id));
      const studentCount = counts?.studentCount || 0;
      const activeStudentCount = counts?.activeStudentCount || 0;

      return {
        ...cls.toObject(),
        studentCount,
        activeStudentCount,
        seatsAvailable: Math.max((cls.capacity || 0) - studentCount, 0),
        isCapacityExceeded: studentCount > (cls.capacity || 0),
      };
    }).sort((a, b) => {
      const gradeDiff = GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade);
      if (gradeDiff !== 0) return gradeDiff;

      const sectionDiff = String(a.section || '').localeCompare(String(b.section || ''), undefined, { numeric: true, sensitivity: 'base' });
      if (sectionDiff !== 0) return sectionDiff;

      return String(a.groupName || '').localeCompare(String(b.groupName || ''), undefined, { numeric: true, sensitivity: 'base' });
    });

    res.json({ success: true, data: classRows, count: classRows.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/classes/:id
export const getClassById = async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id)
      .populate('classTeacher', 'firstName lastName employeeId phone');
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
    res.json({ success: true, data: cls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/classes
export const createClass = async (req, res) => {
  try {
    const { grade, section, classType, groupName, academicYear, classTeacher, room, capacity } = req.body;
    const ay = resolveAcademicYear(academicYear);
    const normalizedSection = normalizeSection(section);

    // Validate group for 11 & 12
    if (['11','12'].includes(grade) && classType === 'group' && !groupName)
      return res.status(400).json({ success: false, message: 'Group name required for Grade 11 & 12 group classes.' });

    const cls = await Class.create({
      grade, section: normalizedSection, classType: classType || 'standard',
      groupName: groupName || null,
      academicYear: ay, classTeacher, room, capacity,
    });

    // If this teacher is assigned as class teacher, update Teacher doc
    if (classTeacher) {
      await Teacher.findByIdAndUpdate(classTeacher, {
        isClassTeacher: true, classTeacherOf: cls._id,
      });
    }

    const populated = await Class.findById(cls._id).populate('classTeacher', 'firstName lastName employeeId');
    res.status(201).json({ success: true, data: populated, message: 'Class created successfully.' });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'A class with this grade, section, and year already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/classes/:id
export const updateClass = async (req, res) => {
  try {
    const { classTeacher, ...rest } = req.body;
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    // Handle class teacher change
    if (classTeacher !== undefined) {
      // Remove old teacher's class teacher assignment
      if (cls.classTeacher && String(cls.classTeacher) !== String(classTeacher)) {
        await Teacher.findByIdAndUpdate(cls.classTeacher, {
          isClassTeacher: false, classTeacherOf: null,
        });
      }
      if (classTeacher) {
        await Teacher.findByIdAndUpdate(classTeacher, {
          isClassTeacher: true, classTeacherOf: cls._id,
        });
      }
      rest.classTeacher = classTeacher || null;
    }

    if (rest.section !== undefined) {
      rest.section = normalizeSection(rest.section);
    }

    Object.assign(cls, rest);
    cls.displayName = null; // force regeneration in pre-save
    await cls.save();

    const populated = await Class.findById(cls._id).populate('classTeacher', 'firstName lastName employeeId');
    res.json({ success: true, data: populated, message: 'Class updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/classes/:id/deactivate
export const deactivateClass = async (req, res) => {
  try {
    const cls = await Class.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });
    res.json({ success: true, message: 'Class deactivated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/classes/:id
export const deleteClass = async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

    const dependencyChecks = await Promise.all([
      Student.countDocuments({ classRef: cls._id }),
      ClassSubject.countDocuments({ class: cls._id }),
      Attendance.countDocuments({ class: cls._id }),
      TimetableSlot.countDocuments({ class: cls._id }),
      Substitution.countDocuments({ class: cls._id }),
      FeeStructure.countDocuments({ classRef: cls._id }),
      Circular.countDocuments({ classRefs: cls._id }),
      Homework.countDocuments({ class: cls._id }),
      ExamSchedule.countDocuments({ class: cls._id }),
      Mark.countDocuments({ class: cls._id }),
    ]);

    const hasDependencies = dependencyChecks.some(count => count > 0);
    if (hasDependencies) {
      return res.status(400).json({
        success: false,
        message: 'This class has linked records. Please deactivate it instead of deleting it permanently.',
      });
    }

    if (cls.classTeacher) {
      await Teacher.findByIdAndUpdate(cls.classTeacher, {
        isClassTeacher: false,
        classTeacherOf: null,
      });
    }

    await Class.findByIdAndDelete(cls._id);
    res.json({ success: true, message: 'Class deleted permanently.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/classes/grades — unique grade list
export const getGradeList = async (req, res) => {
  try {
    const ay = resolveAcademicYear(req.query.academicYear);
    const grades = await Class.distinct('grade', { academicYear: ay, isActive: true });
    const order = ['Pre-KG','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
    grades.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    res.json({ success: true, data: grades });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default { getClasses, getClassById, createClass, updateClass, deactivateClass, deleteClass, getGradeList };
