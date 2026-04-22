import mongoose from 'mongoose';

// ── Payment ──────────────────────────────────────────────────────────────────
const paymentSchema = new mongoose.Schema({
  student:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentFees:  { type: mongoose.Schema.Types.ObjectId, ref: 'StudentFees' },
  receiptNo:    { type: String, unique: true },
  amount:       { type: Number, required: true },
  paymentMode:  { type: String, enum: ['cash','online','cheque','dd','neft'], default: 'cash' },
  paymentDate:  { type: Date, default: Date.now },
  academicYear: { type: String },
  term:         { type: String },
  transactionRef:{ type: String },
  remarks:      { type: String },
  collectedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  feeHeadsBreakdown: [{
    headName: String,
    amount:   Number,
  }],
}, { timestamps: true });

paymentSchema.pre('save', async function (next) {
  if (!this.receiptNo) {
    const count = await this.constructor.countDocuments();
    const year  = new Date().getFullYear().toString().slice(-2);
    this.receiptNo = `RCP${year}${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export const Payment = mongoose.model('Payment', paymentSchema);

// ── Ledger ───────────────────────────────────────────────────────────────────
const ledgerSchema = new mongoose.Schema({
  student:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type:         { type: String, enum: ['debit','credit'], required: true },
  amount:       { type: Number, required: true },
  balance:      { type: Number, default: 0 },
  description:  { type: String },
  refModel:     { type: String },
  refId:        { type: mongoose.Schema.Types.ObjectId },
  academicYear: { type: String },
  date:         { type: Date, default: Date.now },
  recordedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Ledger = mongoose.model('Ledger', ledgerSchema);

export default { Payment, Ledger };
