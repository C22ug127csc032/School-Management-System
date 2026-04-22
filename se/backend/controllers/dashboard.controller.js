import Student      from '../models/Student.model.js';
import Teacher      from '../models/Teacher.model.js';
import Class        from '../models/Class.model.js';
import { StudentFees } from '../models/Fees.model.js';
import { Payment }     from '../models/Payment.model.js';
import { Leave }       from '../models/Academic.model.js';
import { Substitution } from '../models/Substitution.model.js';
import Attendance   from '../models/Attendance.model.js';
import { resolveAcademicYear } from '../utils/academicYear.js';

export const getDashboard = async (req, res) => {
  try {
    const ay    = resolveAcademicYear(req.query.academicYear);
    const now   = new Date();
    const role  = req.user.role;
    const isT   = ['teacher', 'class_teacher'].includes(role);
    const isCT  = role === 'class_teacher';
    
    // Admin / Global Stats
    if (!isT) {
      const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
      const todayEnd   = new Date(now); todayEnd.setHours(23,59,59,999);

      const [
        totalStudents, activeStudents, totalTeachers, totalClasses,
        pendingLeaves, todaySubs, monthPayments, pendingFees
      ] = await Promise.all([
        Student.countDocuments({ academicYear: ay }),
        Student.countDocuments({ academicYear: ay, status: 'active' }),
        Teacher.countDocuments({ isActive: true }),
        Class.countDocuments({ academicYear: ay, isActive: true }),
        Leave.countDocuments({ status: 'pending' }),
        Substitution.countDocuments({ date: { $gte: todayStart, $lte: todayEnd }, academicYear: ay }),
        Payment.aggregate([
          { $match: { academicYear: ay, paymentDate: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        StudentFees.aggregate([
          { $match: { academicYear: ay, status: { $in: ['pending','partial','overdue'] } } },
          { $group: { _id: null, total: { $sum: '$dueAmount' } } },
        ]),
      ]);

      return res.json({
        success: true,
        data: {
          students:      { total: totalStudents, active: activeStudents },
          teachers:      totalTeachers,
          classes:       totalClasses,
          pendingLeaves,
          todaySubstitutions: todaySubs,
          monthCollection:    monthPayments[0]?.total || 0,
          pendingDues:        pendingFees[0]?.total   || 0,
          staffCount:         totalTeachers, // Simplify for now
        },
      });
    }

    // Teacher / Class Teacher Stats
    const teacherId = req.user.teacherRef;
    const TimetableSlot = (await import('../models/TimetableSlot.model.js')).default;
    const { Homework }  = await import('../models/Academic.model.js');
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });

    let myStudentsCount = 0;
    let pendingLeavesT = 0;

    if (isCT) {
      const teacher = await Teacher.findById(teacherId);
      if (teacher?.classTeacherOf) {
        const studentIds = await Student.find({ classRef: teacher.classTeacherOf, academicYear: ay, status: 'active' }).distinct('_id');
        myStudentsCount = studentIds.length;
        pendingLeavesT  = await Leave.countDocuments({ student: { $in: studentIds }, status: 'pending' });
      }
    }

    const [todaySlots, pendingHw] = await Promise.all([
      TimetableSlot.countDocuments({ teacher: teacherId, day: dayName, academicYear: ay, isActive: true }),
      Homework.countDocuments({ teacher: teacherId, dueDate: { $gte: now }, isActive: true }),
    ]);

    res.json({
      success: true,
      data: {
        isTeacher: true,
        isClassTeacher: isCT,
        studentsCount: myStudentsCount,
        pendingLeaves: pendingLeavesT,
        todayPeriods:  todaySlots,
        pendingHomework: pendingHw
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTeacherDashboard = async (req, res) => {
  try {
    const teacherId = req.query.teacherId || req.user.teacherRef;
    const ay        = resolveAcademicYear(req.query.academicYear);
    const now       = new Date();
    const dayName   = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });

    const TimetableSlot = (await import('../models/TimetableSlot.model.js')).default;
    const { Homework }  = await import('../models/Academic.model.js');

    const [todaySlots, pendingHw] = await Promise.all([
      TimetableSlot.find({ teacher: teacherId, day: dayName, academicYear: ay, isActive: true })
        .populate('subject','name code color').populate('class','grade section displayName').populate('period','periodNo name startTime endTime')
        .sort({ 'period.periodNo': 1 }),
      Homework.countDocuments({ teacher: teacherId, dueDate: { $gte: now }, isActive: true }),
    ]);

    res.json({ success: true, data: { todaySchedule: todaySlots, pendingHomework: pendingHw } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default { getDashboard, getTeacherDashboard };
