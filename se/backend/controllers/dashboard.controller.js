import Student      from '../models/Student.model.js';
import Teacher      from '../models/Teacher.model.js';
import Class        from '../models/Class.model.js';
import { StudentFees } from '../models/Fees.model.js';
import { Payment }     from '../models/Payment.model.js';
import { Leave }       from '../models/Academic.model.js';
import { Substitution } from '../models/Substitution.model.js';
import Attendance   from '../models/Attendance.model.js';
import User         from '../models/User.model.js';
import { Expense }  from '../models/Operations.model.js';
import { resolveAcademicYear } from '../utils/academicYear.js';
import { getSettings } from '../utils/appSettings.js';

const ROLE_ORDER = ['super_admin', 'admin', 'principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'admission_staff', 'student', 'parent'];

function buildConfigHealth(settings) {
  const checks = [
    ['School name', settings?.schoolName],
    ['School code', settings?.schoolCode],
    ['Board name', settings?.boardName],
    ['School phone', settings?.schoolPhone],
    ['School email', settings?.schoolEmail],
    ['Academic year', settings?.currentAcademicYear],
    ['Working days', Array.isArray(settings?.workingDays) && settings.workingDays.length > 0],
    ['School timings', settings?.schoolStartTime && settings?.schoolEndTime],
    ['Holiday calendar', settings?.governmentHolidayCalendarUrl],
    ['School logo', settings?.schoolLogo],
  ];

  const completed = checks.filter(([, value]) => Boolean(value)).length;
  const total = checks.length;

  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    missing: checks.filter(([, value]) => !value).map(([label]) => label),
  };
}

export const getDashboard = async (req, res) => {
  try {
    const ay    = resolveAcademicYear(req.query.academicYear);
    const now   = new Date();
    const role  = req.user.role;
    const isT   = ['teacher', 'class_teacher'].includes(role);
    const isCT  = role === 'class_teacher';
    
    if (role === 'super_admin') {
      const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
      const todayEnd   = new Date(now); todayEnd.setHours(23,59,59,999);
      const settings = await getSettings();

      const [
        totalStudents, activeStudents, totalTeachers, totalClasses,
        pendingLeaves, todaySubs, monthPayments, pendingFees,
        totalAccounts, activeAccounts, inactiveAccounts, firstLoginPending,
        userCountsByRole
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
        User.countDocuments({}),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ isActive: false }),
        User.countDocuments({ isFirstLogin: true, isActive: true }),
        User.aggregate([
          { $group: { _id: '$role', count: { $sum: 1 } } },
        ]),
      ]);

      const roleCounts = ROLE_ORDER.reduce((acc, currentRole) => {
        acc[currentRole] = 0;
        return acc;
      }, {});
      userCountsByRole.forEach(item => {
        roleCounts[item._id] = item.count;
      });

      const staffAccounts =
        (roleCounts.super_admin || 0) +
        (roleCounts.admin || 0) +
        (roleCounts.principal || 0) +
        (roleCounts.teacher || 0) +
        (roleCounts.class_teacher || 0) +
        (roleCounts.accountant || 0) +
        (roleCounts.librarian || 0) +
        (roleCounts.admission_staff || 0);

      const configHealth = buildConfigHealth(settings);

      return res.json({
        success: true,
        data: {
          isSuperAdmin: true,
          school: {
            name: settings?.schoolName || 'School Name',
            code: settings?.schoolCode || 'SCH001',
            board: settings?.boardName || 'Not configured',
            academicYear: settings?.currentAcademicYear || ay,
          },
          configHealth,
          accounts: {
            total: totalAccounts,
            active: activeAccounts,
            inactive: inactiveAccounts,
            firstLoginPending,
            staff: staffAccounts,
            students: roleCounts.student || 0,
            parents: roleCounts.parent || 0,
          },
          roles: roleCounts,
          operations: {
            students: { total: totalStudents, active: activeStudents },
            teachers: totalTeachers,
            classes: totalClasses,
            pendingLeaves,
            todaySubstitutions: todaySubs,
            monthCollection: monthPayments[0]?.total || 0,
            pendingDues: pendingFees[0]?.total || 0,
          },
        },
      });
    }

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

export const getSchoolReports = async (req, res) => {
  try {
    const ay = resolveAcademicYear(req.query.academicYear);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const today = new Date();

    const [
      totalStudents,
      activeStudents,
      admissionPending,
      transferredStudents,
      totalClasses,
      totalTeachers,
      pendingLeaves,
      attendanceDocs,
      totalIncomeAgg,
      monthlyIncomeAgg,
      paymentModeAgg,
      duesAgg,
      feeStatusAgg,
      totalExpenseAgg,
      monthlyExpenseAgg,
      expenseCategoryAgg,
    ] = await Promise.all([
      Student.countDocuments({ academicYear: ay }),
      Student.countDocuments({ academicYear: ay, status: 'active' }),
      Student.countDocuments({ academicYear: ay, status: 'admission_pending' }),
      Student.countDocuments({ academicYear: ay, status: 'transferred' }),
      Class.countDocuments({ academicYear: ay, isActive: true }),
      Teacher.countDocuments({ isActive: true }),
      Leave.countDocuments({ status: 'pending' }),
      Attendance.find({ academicYear: ay }).select('entries'),
      Payment.aggregate([
        { $match: { academicYear: ay } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { academicYear: ay, paymentDate: { $gte: monthStart, $lte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { academicYear: ay } },
        { $group: { _id: '$paymentMode', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      StudentFees.aggregate([
        { $match: { academicYear: ay, status: { $in: ['pending', 'partial', 'overdue'] } } },
        { $group: { _id: null, total: { $sum: '$dueAmount' } } },
      ]),
      StudentFees.aggregate([
        { $match: { academicYear: ay } },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totalAmount' }, dueAmount: { $sum: '$dueAmount' } } },
        { $sort: { count: -1 } },
      ]),
      Expense.aggregate([
        { $match: { academicYear: ay } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { academicYear: ay, date: { $gte: monthStart, $lte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { academicYear: ay } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    const attendanceTotals = attendanceDocs.reduce((acc, doc) => {
      (doc.entries || []).forEach(entry => {
        acc.total += 1;
        if (entry.status === 'present') acc.present += 1;
        if (entry.status === 'absent') acc.absent += 1;
        if (entry.status === 'late') acc.late += 1;
        if (entry.status === 'half_day') acc.halfDay += 1;
      });
      return acc;
    }, { total: 0, present: 0, absent: 0, late: 0, halfDay: 0 });

    const attendanceRate = attendanceTotals.total
      ? Number(((attendanceTotals.present / attendanceTotals.total) * 100).toFixed(1))
      : 0;

    const totalIncome = totalIncomeAgg[0]?.total || 0;
    const monthlyIncome = monthlyIncomeAgg[0]?.total || 0;
    const totalExpense = totalExpenseAgg[0]?.total || 0;
    const monthlyExpense = monthlyExpenseAgg[0]?.total || 0;
    const outstandingDues = duesAgg[0]?.total || 0;

    res.json({
      success: true,
      data: {
        academicYear: ay,
        summary: {
          totalIncome,
          monthlyIncome,
          totalExpense,
          monthlyExpense,
          netBalance: totalIncome - totalExpense,
          outstandingDues,
          collectionEfficiency: totalIncome + outstandingDues > 0
            ? Number(((totalIncome / (totalIncome + outstandingDues)) * 100).toFixed(1))
            : 0,
        },
        students: {
          total: totalStudents,
          active: activeStudents,
          admissionPending,
          transferred: transferredStudents,
        },
        operations: {
          classes: totalClasses,
          teachers: totalTeachers,
          pendingLeaves,
          attendanceRate,
          attendanceBreakdown: attendanceTotals,
        },
        feeStatus: feeStatusAgg,
        paymentModes: paymentModeAgg,
        expenseCategories: expenseCategoryAgg,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default { getDashboard, getTeacherDashboard, getSchoolReports };
