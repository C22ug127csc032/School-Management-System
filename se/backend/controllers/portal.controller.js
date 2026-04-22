import crypto from 'crypto';
import Student from '../models/Student.model.js';
import Attendance from '../models/Attendance.model.js';
import TimetableSlot, { TIMETABLE_DAYS } from '../models/TimetableSlot.model.js';
import { StudentFees } from '../models/Fees.model.js';
import { Payment, Ledger } from '../models/Payment.model.js';
import { Leave, Circular, Homework, Exam, ExamSchedule, Mark } from '../models/Academic.model.js';
import { BookIssue } from '../models/Operations.model.js';
import { getActivePeriodsForDisplay } from '../utils/periods.js';

const PORTAL_ROLES = ['parent', 'student'];

const ensurePortalUser = req => PORTAL_ROLES.includes(req.user?.role);

const resolveLinkedStudent = async req => {
  if (!ensurePortalUser(req)) return null;

  const directStudentId = req.user?.studentRef;
  if (directStudentId) {
    const student = await Student.findById(directStudentId).populate('classRef', 'grade section displayName groupName academicYear');
    if (student) return student;
  }

  if (req.user?.role === 'parent') {
    return Student.findOne({ parentRefs: req.user._id }).populate('classRef', 'grade section displayName groupName academicYear');
  }

  return null;
};

const toStudentSummary = student => ({
  id: student._id,
  firstName: student.firstName,
  lastName: student.lastName,
  fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
  admissionNo: student.admissionNo,
  rollNo: student.rollNo,
  registerNo: student.registerNo,
  className: student.classRef?.displayName || `${student.grade || '-'} ${student.section || ''}`.trim(),
  grade: student.grade,
  section: student.section,
  academicYear: student.academicYear,
  status: student.status,
  phone: student.phone,
  email: student.email,
  photo: student.photo,
  admissionDate: student.admissionDate,
  dob: student.dob,
  gender: student.gender,
  bloodGroup: student.bloodGroup,
  address: student.address,
  father: student.father,
  mother: student.mother,
  guardian: student.guardian,
});

const buildAttendanceSummary = attendanceRecords => {
  const summary = { present: 0, absent: 0, late: 0, half_day: 0, total: 0 };

  attendanceRecords.forEach(record => {
    const entry = record.entries?.find(item => String(item.student) === String(record.studentId));
    if (!entry) return;
    summary[entry.status] = (summary[entry.status] || 0) + 1;
    summary.total += 1;
  });

  return summary;
};

const examMatchesStudent = (exam, student) => {
  if (!exam) return false;
  if (!Array.isArray(exam.grades) || exam.grades.length === 0) return true;
  return exam.grades.includes(student.grade);
};

const hasRazorpayConfig = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const getRazorpayAuthHeader = () => {
  const creds = `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`;
  return `Basic ${Buffer.from(creds).toString('base64')}`;
};

const createPortalReceipt = studentFees => {
  const stamp = Date.now().toString().slice(-8);
  return `portal_${String(studentFees._id).slice(-8)}_${stamp}`;
};

const recordPortalPayment = async ({ student, studentFees, amount, paymentId, orderId, userId }) => {
  const payment = await Payment.create({
    student: student._id,
    studentFees: studentFees._id,
    amount: Number(amount),
    paymentMode: 'online',
    paymentDate: new Date(),
    academicYear: studentFees.academicYear,
    term: studentFees.term,
    transactionRef: paymentId,
    remarks: `Paid via Razorpay order ${orderId}`,
    collectedBy: userId,
  });

  studentFees.paidAmount += Number(amount);
  studentFees.dueAmount = Math.max(0, Number(studentFees.totalAmount || 0) - Number(studentFees.paidAmount || 0));
  studentFees.status = studentFees.dueAmount <= 0 ? 'paid' : studentFees.paidAmount > 0 ? 'partial' : 'pending';
  await studentFees.save();

  await Ledger.create({
    student: student._id,
    type: 'credit',
    amount: Number(amount),
    description: `Portal payment received. Receipt: ${payment.receiptNo}`,
    refModel: 'Payment',
    refId: payment._id,
    academicYear: studentFees.academicYear,
    recordedBy: userId,
  });

  return payment;
};

export const getPortalOverview = async (req, res) => {
  try {
    const student = await resolveLinkedStudent(req);
    if (!student) {
      return res.status(404).json({ success: false, message: 'No linked student found for this account.' });
    }

    const [fees, payments, attendanceRecords, homework, circulars, exams, leaves, libraryIssues] = await Promise.all([
      StudentFees.find({ student: student._id, academicYear: student.academicYear })
        .populate('structure', 'name')
        .sort({ dueDate: 1, createdAt: -1 }),
      Payment.find({ student: student._id, academicYear: student.academicYear }).sort({ createdAt: -1 }).limit(5),
      Attendance.find({ academicYear: student.academicYear, 'entries.student': student._id }).select('date entries'),
      student.classRef
        ? Homework.find({ class: student.classRef._id, academicYear: student.academicYear, isActive: true })
          .populate('subject', 'name code color')
          .sort({ dueDate: 1 })
          .limit(6)
        : [],
      Circular.find({
        isPublished: true,
        $and: [
          { $or: [{ audience: { $size: 0 } }, { audience: 'all' }, { audience: req.user.role }] },
          { $or: [{ classRefs: { $size: 0 } }, { classRefs: student.classRef?._id }] },
        ],
      })
        .sort({ publishDate: -1 })
        .limit(6),
      Exam.find({ academicYear: student.academicYear, isPublished: true }).sort({ startDate: -1 }).limit(6),
      Leave.find({ student: student._id }).sort({ createdAt: -1 }).limit(6),
      BookIssue.find({ student: student._id }).populate('book', 'title author').sort({ createdAt: -1 }).limit(6),
    ]);

    const filteredExams = exams.filter(exam => examMatchesStudent(exam, student));
    const dueFees = fees.filter(item => Number(item.dueAmount || 0) > 0);
    const attendanceSummary = buildAttendanceSummary(
      attendanceRecords.map(record => ({ ...record.toObject(), studentId: student._id }))
    );

    res.json({
      success: true,
      data: {
        student: toStudentSummary(student),
        highlights: {
          assignedFees: fees.length,
          totalDueAmount: dueFees.reduce((sum, item) => sum + Number(item.dueAmount || 0), 0),
          totalPaidAmount: payments.reduce((sum, item) => sum + Number(item.amount || 0), 0),
          attendanceDays: attendanceSummary.total,
          presentDays: attendanceSummary.present,
          homeworkCount: homework.length,
          circularCount: circulars.length,
          publishedExams: filteredExams.length,
          pendingLeaves: leaves.filter(item => item.status === 'pending').length,
          activeLibraryIssues: libraryIssues.filter(item => item.status === 'issued').length,
        },
        recent: {
          fees: fees.slice(0, 3),
          payments,
          homework,
          circulars,
          exams: filteredExams,
          leaves,
          libraryIssues,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPortalFees = async (req, res) => {
  try {
    const student = await resolveLinkedStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'No linked student found for this account.' });

    const [fees, payments] = await Promise.all([
      StudentFees.find({ student: student._id, academicYear: student.academicYear })
        .populate('structure', 'name')
        .sort({ dueDate: 1, createdAt: -1 }),
      Payment.find({ student: student._id, academicYear: student.academicYear }).sort({ createdAt: -1 }),
    ]);

    res.json({
      success: true,
      data: {
        student: toStudentSummary(student),
        feeAssignments: fees,
        payments,
        summary: {
          totalAssigned: fees.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0),
          totalPaid: payments.reduce((sum, item) => sum + Number(item.amount || 0), 0),
          totalDue: fees.reduce((sum, item) => sum + Number(item.dueAmount || 0), 0),
        },
        onlinePayment: {
          enabled: hasRazorpayConfig(),
          provider: 'razorpay',
          keyId: process.env.RAZORPAY_KEY_ID || '',
          currency: 'INR',
          message: hasRazorpayConfig()
            ? 'Online payment is available through Razorpay.'
            : 'Razorpay is not configured in the backend yet.',
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createPortalFeeOrder = async (req, res) => {
  try {
    if (!hasRazorpayConfig()) {
      return res.status(400).json({ success: false, message: 'Razorpay is not configured yet.' });
    }

    const student = await resolveLinkedStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'No linked student found for this account.' });

    const { studentFeesId, amount } = req.body;
    const studentFees = await StudentFees.findOne({ _id: studentFeesId, student: student._id, academicYear: student.academicYear });
    if (!studentFees) return res.status(404).json({ success: false, message: 'Fee assignment not found.' });

    const payableAmount = Number(amount || studentFees.dueAmount || 0);
    if (payableAmount <= 0) {
      return res.status(400).json({ success: false, message: 'No due amount available for payment.' });
    }
    if (payableAmount > Number(studentFees.dueAmount || 0)) {
      return res.status(400).json({ success: false, message: 'Payment amount cannot exceed the current due amount.' });
    }

    const receipt = createPortalReceipt(studentFees);
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: getRazorpayAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(payableAmount * 100),
        currency: 'INR',
        receipt,
        notes: {
          studentId: String(student._id),
          studentFeesId: String(studentFees._id),
          academicYear: studentFees.academicYear || '',
          portalRole: req.user.role,
        },
      }),
    });

    const order = await response.json();
    if (!response.ok) {
      return res.status(400).json({ success: false, message: order.error?.description || 'Failed to create Razorpay order.' });
    }

    res.json({
      success: true,
      data: {
        key: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        name: process.env.SCHOOL_NAME || 'School ERP',
        description: `${studentFees.structure ? 'Fee Payment' : 'School Fee'} - ${student.fullName || `${student.firstName} ${student.lastName}`}`,
        prefill: {
          name: req.user.name,
          email: req.user.email || student.email || student.father?.email || student.mother?.email || '',
          contact: req.user.phone || student.father?.phone || student.mother?.phone || student.guardian?.phone || student.phone || '',
        },
        notes: {
          studentFeesId: String(studentFees._id),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const verifyPortalFeePayment = async (req, res) => {
  try {
    if (!hasRazorpayConfig()) {
      return res.status(400).json({ success: false, message: 'Razorpay is not configured yet.' });
    }

    const student = await resolveLinkedStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'No linked student found for this account.' });

    const { studentFeesId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!studentFeesId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Incomplete payment verification payload.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid Razorpay signature.' });
    }

    const [studentFees, existingPayment, paymentResponse] = await Promise.all([
      StudentFees.findOne({ _id: studentFeesId, student: student._id, academicYear: student.academicYear }),
      Payment.findOne({ transactionRef: razorpay_payment_id }),
      fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
        method: 'GET',
        headers: { Authorization: getRazorpayAuthHeader() },
      }),
    ]);

    if (!studentFees) return res.status(404).json({ success: false, message: 'Fee assignment not found.' });
    if (existingPayment) {
      return res.json({ success: true, data: existingPayment, message: 'Payment was already verified earlier.' });
    }

    const paymentData = await paymentResponse.json();
    if (!paymentResponse.ok) {
      return res.status(400).json({ success: false, message: paymentData.error?.description || 'Unable to fetch Razorpay payment details.' });
    }

    if (String(paymentData.order_id) !== String(razorpay_order_id)) {
      return res.status(400).json({ success: false, message: 'Razorpay order mismatch.' });
    }
    if (!['authorized', 'captured'].includes(String(paymentData.status || '').toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Payment is not completed yet.' });
    }

    const amount = Number(paymentData.amount || 0) / 100;
    if (amount <= 0 || amount > Number(studentFees.dueAmount || 0)) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount received from gateway.' });
    }

    const payment = await recordPortalPayment({
      student,
      studentFees,
      amount,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      userId: req.user._id,
    });

    res.json({ success: true, data: payment, message: `Payment verified. Receipt: ${payment.receiptNo}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPortalAttendance = async (req, res) => {
  try {
    const student = await resolveLinkedStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'No linked student found for this account.' });

    const attendanceRecords = await Attendance.find({ academicYear: student.academicYear, 'entries.student': student._id })
      .select('date entries')
      .sort({ date: -1 });

    const rows = attendanceRecords.map(record => {
      const entry = record.entries?.find(item => String(item.student) === String(student._id));
      return entry ? { date: record.date, status: entry.status, remarks: entry.remarks || '' } : null;
    }).filter(Boolean);

    const summary = rows.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      acc.total += 1;
      return acc;
    }, { present: 0, absent: 0, late: 0, half_day: 0, total: 0 });

    res.json({ success: true, data: { student: toStudentSummary(student), summary, records: rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPortalTimetable = async (req, res) => {
  try {
    const student = await resolveLinkedStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'No linked student found for this account.' });
    if (!student.classRef?._id) {
      return res.json({ success: true, data: { student: toStudentSummary(student), periods: [], grid: {}, slots: [] } });
    }

    const [slots, periods] = await Promise.all([
      TimetableSlot.find({ class: student.classRef._id, academicYear: student.academicYear, isActive: true })
        .populate('subject', 'name code color type')
        .populate('teacher', 'firstName lastName employeeId')
        .populate('period', 'periodNo name startTime endTime type isBreak')
        .sort({ day: 1 }),
      getActivePeriodsForDisplay(student.academicYear),
    ]);

    const grid = {};
    TIMETABLE_DAYS.forEach(day => {
      grid[day] = {};
    });

    slots.forEach(slot => {
      if (slot.period?._id) grid[slot.day][String(slot.period._id)] = slot;
    });

    res.json({ success: true, data: { student: toStudentSummary(student), periods, grid, slots } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPortalHomework = async (req, res) => {
  try {
    const student = await resolveLinkedStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'No linked student found for this account.' });
    if (!student.classRef?._id) return res.json({ success: true, data: [] });

    const homework = await Homework.find({ class: student.classRef._id, academicYear: student.academicYear, isActive: true })
      .populate('class', 'displayName grade section')
      .populate('subject', 'name code color')
      .populate('teacher', 'firstName lastName')
      .sort({ dueDate: 1 });

    res.json({ success: true, data: { student: toStudentSummary(student), homework } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPortalCirculars = async (req, res) => {
  try {
    const student = await resolveLinkedStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'No linked student found for this account.' });

    const circulars = await Circular.find({
      isPublished: true,
      $and: [
        { $or: [{ audience: { $size: 0 } }, { audience: 'all' }, { audience: req.user.role }] },
        { $or: [{ classRefs: { $size: 0 } }, { classRefs: student.classRef?._id }] },
      ],
    })
      .populate('publishedBy', 'name')
      .populate('classRefs', 'displayName grade section')
      .sort({ publishDate: -1 });

    res.json({ success: true, data: { student: toStudentSummary(student), circulars } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPortalExams = async (req, res) => {
  try {
    const student = await resolveLinkedStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'No linked student found for this account.' });

    const exams = await Exam.find({ academicYear: student.academicYear, isPublished: true }).sort({ startDate: -1 });
    const filteredExams = exams.filter(exam => examMatchesStudent(exam, student));
    const examIds = filteredExams.map(exam => exam._id);

    const [schedules, marks] = await Promise.all([
      student.classRef?._id
        ? ExamSchedule.find({ class: student.classRef._id, exam: { $in: examIds } })
          .populate('exam', 'name examType')
          .populate('subject', 'name code color')
          .sort({ date: 1 })
        : [],
      Mark.find({ student: student._id, exam: { $in: examIds } }).select('exam marksObtained maxMarks isPassed isAbsent'),
    ]);

    const marksByExam = marks.reduce((map, mark) => {
      const key = String(mark.exam);
      map[key] = map[key] || { totalObtained: 0, totalMax: 0, subjects: 0, failed: 0, absent: 0 };
      map[key].subjects += 1;
      map[key].totalObtained += mark.isAbsent ? 0 : Number(mark.marksObtained || 0);
      map[key].totalMax += Number(mark.maxMarks || 0);
      map[key].failed += (!mark.isPassed && !mark.isAbsent) ? 1 : 0;
      map[key].absent += mark.isAbsent ? 1 : 0;
      return map;
    }, {});

    const examCards = filteredExams.map(exam => {
      const summary = marksByExam[String(exam._id)];
      return {
        ...exam.toObject(),
        reportReady: Boolean(summary),
        summary: summary ? {
          ...summary,
          percentage: summary.totalMax > 0 ? Number(((summary.totalObtained / summary.totalMax) * 100).toFixed(2)) : 0,
          result: summary.failed === 0 ? 'PASS' : 'FAIL',
        } : null,
      };
    });

    res.json({ success: true, data: { student: toStudentSummary(student), exams: examCards, schedules } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPortalReportCard = async (req, res) => {
  try {
    const student = await resolveLinkedStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'No linked student found for this account.' });

    const exam = await Exam.findById(req.params.examId);
    if (!exam || !examMatchesStudent(exam, student)) {
      return res.status(404).json({ success: false, message: 'Report card not found for this student.' });
    }

    const marks = await Mark.find({ exam: exam._id, student: student._id })
      .populate('subject', 'name code')
      .sort({ createdAt: 1 });

    const totalObtained = marks.reduce((sum, mark) => sum + (mark.isAbsent ? 0 : Number(mark.marksObtained || 0)), 0);
    const totalMax = marks.reduce((sum, mark) => sum + Number(mark.maxMarks || 0), 0);
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
        student: toStudentSummary(student),
        marks: marks.map(mark => ({
          _id: mark._id,
          subject: mark.subject,
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
          percentage: totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0,
          result: failedCount === 0 ? 'PASS' : 'FAIL',
          failedCount,
          absentCount,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPortalLibrary = async (req, res) => {
  try {
    const student = await resolveLinkedStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'No linked student found for this account.' });

    const issues = await BookIssue.find({ student: student._id })
      .populate('book', 'title author accessionNo isbn')
      .sort({ issueDate: -1 });

    res.json({
      success: true,
      data: {
        student: toStudentSummary(student),
        issues,
        summary: {
          active: issues.filter(item => item.status === 'issued').length,
          returned: issues.filter(item => item.status === 'returned').length,
          totalFine: issues.reduce((sum, item) => sum + Number(item.fine || 0), 0),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPortalLeaves = async (req, res) => {
  try {
    const student = await resolveLinkedStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'No linked student found for this account.' });

    const leaves = await Leave.find({ student: student._id })
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { student: toStudentSummary(student), leaves } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createPortalLeave = async (req, res) => {
  try {
    const student = await resolveLinkedStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'No linked student found for this account.' });

    const leave = await Leave.create({
      student: student._id,
      appliedBy: req.user._id,
      appliedByRole: req.user.role === 'parent' ? 'parent' : 'student',
      leaveType: req.body.leaveType || 'personal',
      fromDate: req.body.fromDate,
      toDate: req.body.toDate,
      reason: req.body.reason,
    });

    res.status(201).json({ success: true, data: leave, message: 'Leave request submitted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default {
  getPortalOverview,
  getPortalFees,
  getPortalAttendance,
  getPortalTimetable,
  getPortalHomework,
  getPortalCirculars,
  getPortalExams,
  getPortalReportCard,
  getPortalLibrary,
  getPortalLeaves,
  createPortalLeave,
  createPortalFeeOrder,
  verifyPortalFeePayment,
};
