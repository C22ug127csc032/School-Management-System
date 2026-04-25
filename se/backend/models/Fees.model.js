import mongoose from 'mongoose';

// ── Fee Head ─────────────────────────────────────────────────────────────────
const feeHeadSchema = new mongoose.Schema({
  headName:   { type: String, required: true },
  amount:     { type: Number, required: true },
  isOptional: { type: Boolean, default: false },
  applicableTo: { type: String, enum: ['all', 'hosteler', 'day_scholar', 'transport', 'no_transport'], default: 'all' },
}, { _id: false });

const installmentSchema = new mongoose.Schema({
  installmentNo: { type: Number },
  label:         { type: String },
  dueDate:       { type: Date, required: true },
  amount:        { type: Number, required: true },
}, { _id: false });

// ── Fee Structure ─────────────────────────────────────────────────────────────
const feeStructureSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  classRef:     { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  grade:        { type: String },   // Can apply to entire grade
  academicYear: { type: String, required: true },
  term:         { type: String },   // 'Term 1', 'Annual', etc.
  feeHeads:     [feeHeadSchema],
  totalAmount:  { type: Number, default: 0 },
  hasInstallments:  { type: Boolean, default: false },
  installments:     [installmentSchema],
  fineEnabled:      { type: Boolean, default: false },
  fineType:         { type: String, enum: ['flat','percentage'], default: 'flat' },
  fineAmount:       { type: Number, default: 0 },
  fineGraceDays:    { type: Number, default: 0 },
  isActive:         { type: Boolean, default: true },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

feeStructureSchema.pre('save', function (next) {
  this.totalAmount = this.feeHeads.reduce((sum, h) => sum + (h.amount || 0), 0);
  next();
});

export const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);

// ── Student Fee Assignment ────────────────────────────────────────────────────
const studentFeesSchema = new mongoose.Schema({
  student:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  structure:    { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure' },
  academicYear: { type: String, required: true },
  term:         { type: String },
  feeHeads:     [feeHeadSchema],
  totalAmount:  { type: Number, default: 0 },
  paidAmount:   { type: Number, default: 0 },
  dueAmount:    { type: Number, default: 0 },
  discountAmount:{ type: Number, default: 0 },
  discountReason:{ type: String },
  fineAmount:   { type: Number, default: 0 },
  dueDate:      { type: Date },
  status:       { type: String, enum: ['pending','partial','paid','overdue'], default: 'pending' },
  assignedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

studentFeesSchema.index({ student: 1, academicYear: 1, structure: 1 }, { unique: true, sparse: true });

export const StudentFees = mongoose.model('StudentFees', studentFeesSchema);

export default { FeeStructure, StudentFees };
