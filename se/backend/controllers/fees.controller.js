import { FeeStructure, StudentFees } from '../models/Fees.model.js';
import { Payment, Ledger }          from '../models/Payment.model.js';
import Student from '../models/Student.model.js';
import { resolveAcademicYear } from '../utils/academicYear.js';

// ── Fee Structures ────────────────────────────────────────────────────────────
export const getStructures = async (req, res) => {
  try {
    const ay = resolveAcademicYear(req.query.academicYear);
    const structures = await FeeStructure.find({ academicYear: ay, isActive: true })
      .populate('classRef','grade section displayName')
      .sort({ name: 1 });
    res.json({ success: true, data: structures });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createStructure = async (req, res) => {
  try {
    const ay  = resolveAcademicYear(req.body.academicYear);
    const s   = await FeeStructure.create({ ...req.body, academicYear: ay, createdBy: req.user._id });
    res.status(201).json({ success: true, data: s, message: 'Fee structure created.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const updateStructure = async (req, res) => {
  try {
    const s = await FeeStructure.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!s) return res.status(404).json({ success: false, message: 'Structure not found.' });
    res.json({ success: true, data: s, message: 'Fee structure updated.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const deleteStructure = async (req, res) => {
  try {
    await FeeStructure.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Fee structure deactivated.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Student Fee Assignment ─────────────────────────────────────────────────────
export const assignFees = async (req, res) => {
  try {
    const { studentId, classId, structureId, academicYear, term, dueDate, discountAmount, discountReason } = req.body;
    const ay = resolveAcademicYear(academicYear);
    const structure = await FeeStructure.findById(structureId);
    if (!structure) return res.status(404).json({ success: false, message: 'Fee structure not found.' });

    const disc  = Number(discountAmount || 0);
    const total = structure.totalAmount - disc;
    const effectiveTerm = term || structure.term || structure.name;

    if (classId) {
      const students = await Student.find({
        academicYear: ay,
        classRef: classId,
        status: 'active',
      }).select('_id firstName lastName');

      if (!students.length) {
        return res.status(404).json({ success: false, message: 'No active students found in this class.' });
      }

      const studentIds = students.map(student => student._id);
      const existingFees = await StudentFees.find({
        student: { $in: studentIds },
        academicYear: ay,
        structure: structureId,
      }).select('student');

      const existingStudentIds = new Set(existingFees.map(item => String(item.student)));
      const studentsToAssign = students.filter(student => !existingStudentIds.has(String(student._id)));

      if (!studentsToAssign.length) {
        return res.status(409).json({
          success: false,
          message: 'Fees already assigned for all active students in this class for this period.',
        });
      }

      const assignedFees = [];
      for (const student of studentsToAssign) {
        const sf = await StudentFees.create({
          student: student._id,
          structure: structureId,
          academicYear: ay,
          term: effectiveTerm,
          feeHeads: structure.feeHeads,
          totalAmount: total,
          dueAmount: total,
          paidAmount: 0,
          discountAmount: disc,
          discountReason,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          assignedBy: req.user._id,
        });

        await Ledger.create({
          student: student._id,
          type: 'debit',
          amount: total,
          description: `Fee assigned: ${structure.name} (${ay})`,
          refModel: 'StudentFees',
          refId: sf._id,
          academicYear: ay,
          recordedBy: req.user._id,
        });

        assignedFees.push(sf);
      }

      return res.status(201).json({
        success: true,
        data: {
          created: assignedFees.length,
          skipped: students.length - studentsToAssign.length,
        },
        message: `Fees assigned to ${assignedFees.length} student(s). ${students.length - studentsToAssign.length} already had fees for this period.`,
      });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const existing = await StudentFees.findOne({ student: studentId, academicYear: ay, structure: structureId });
    if (existing) return res.status(409).json({ success: false, message: 'Fees already assigned for this period.' });

    const sf = await StudentFees.create({
      student: studentId, structure: structureId, academicYear: ay,
      term: effectiveTerm, feeHeads: structure.feeHeads,
      totalAmount: total, dueAmount: total, paidAmount: 0,
      discountAmount: disc, discountReason,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assignedBy: req.user._id,
    });

    await Ledger.create({
      student: studentId, type: 'debit', amount: total,
      description: `Fee assigned: ${structure.name} (${ay})`,
      refModel: 'StudentFees', refId: sf._id, academicYear: ay, recordedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: sf, message: 'Fees assigned.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const getStudentFees = async (req, res) => {
  try {
    const { studentId, classId, academicYear } = req.query;
    const ay = resolveAcademicYear(academicYear);
    const query = {};
    if (studentId) query.student = studentId;
    if (ay)        query.academicYear = ay;
    if (classId) {
      const studentIds = await Student.find({
        classRef: classId,
        academicYear: ay,
        status: 'active',
      }).distinct('_id');
      query.student = studentId
        ? { $in: studentIds.filter(id => String(id) === String(studentId)) }
        : { $in: studentIds };
    }
    const fees = await StudentFees.find(query)
      .populate('student','firstName lastName admissionNo grade section classRef')
      .populate('structure','name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: fees });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const recordPayment = async (req, res) => {
  try {
    const { studentId, studentFeesId, amount, paymentMode, paymentDate, transactionRef, remarks, academicYear, term } = req.body;
    const ay = resolveAcademicYear(academicYear);

    const payment = await Payment.create({
      student: studentId, studentFees: studentFeesId || null,
      amount: Number(amount), paymentMode, paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      transactionRef, remarks, academicYear: ay, term, collectedBy: req.user._id,
    });

    // Update student fees record
    if (studentFeesId) {
      const sf = await StudentFees.findById(studentFeesId);
      if (sf) {
        sf.paidAmount += Number(amount);
        sf.dueAmount   = Math.max(0, sf.totalAmount - sf.paidAmount);
        sf.status      = sf.dueAmount <= 0 ? 'paid' : sf.paidAmount > 0 ? 'partial' : 'pending';
        await sf.save();
      }
    }

    // Ledger credit
    await Ledger.create({
      student: studentId, type: 'credit', amount: Number(amount),
      description: `Payment received. Receipt: ${payment.receiptNo}`,
      refModel: 'Payment', refId: payment._id, academicYear: ay, recordedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: payment, message: `Payment recorded. Receipt: ${payment.receiptNo}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const getPayments = async (req, res) => {
  try {
    const { studentId, academicYear, page = 1, limit = 30 } = req.query;
    const ay = resolveAcademicYear(academicYear);
    const query = { academicYear: ay };
    if (studentId) query.student = studentId;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('student','firstName lastName admissionNo')
      .populate('collectedBy','name')
      .skip(skip).limit(parseInt(limit))
      .sort({ createdAt: -1 });
    res.json({ success: true, data: payments, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const getLedger = async (req, res) => {
  try {
    const { studentId } = req.params;
    const entries = await Ledger.find({ student: studentId }).sort({ createdAt: -1 });
    const balance = entries.reduce((sum, e) => e.type === 'credit' ? sum + e.amount : sum - e.amount, 0);
    res.json({ success: true, data: entries, balance });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const feesController = { getStructures, createStructure, updateStructure, deleteStructure, assignFees, getStudentFees, recordPayment, getPayments, getLedger };
export default feesController;
