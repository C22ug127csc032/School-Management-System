import mongoose from 'mongoose';
import { isValidIndianPhone, normalizePhone } from '../utils/phone.js';

const studentSchema = new mongoose.Schema({
  // ── Identifiers ──────────────────────────────────────────────────────────
  admissionNo:   { type: String, unique: true, sparse: true },
  rollNo:        { type: String },
  registerNo:    { type: String, trim: true, default: '' },

  // ── Personal ─────────────────────────────────────────────────────────────
  firstName:   { type: String, required: true, trim: true },
  lastName:    { type: String, required: true, trim: true },
  dob:         { type: Date },
  gender:      { type: String },
  bloodGroup:  { type: String },
  religion:    { type: String },
  category:    { type: String },
  nationality: { type: String, default: 'Indian' },
  aadharNo:    { type: String },
  photo:       { type: String },
  photoPublicId: { type: String },
  address: {
    street: String, city: String, state: String, pincode: String,
  },

  // ── Contact ──────────────────────────────────────────────────────────────
  phone: {
    type: String, unique: true, sparse: true,
    set: normalizePhone,
    validate: {
      validator: value => !value || isValidIndianPhone(value),
      message: 'Invalid 10-digit Indian mobile number',
    },
  },
  email: { type: String },

  // ── Family ───────────────────────────────────────────────────────────────
  father: { name: String, phone: String, occupation: String, email: String },
  mother: { name: String, phone: String, occupation: String, email: String },
  guardian: { name: String, relation: String, phone: String },
  annualIncome: { type: String, default: '' },

  // ── Academic ─────────────────────────────────────────────────────────────
  classRef:     { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  grade:        { type: String },   // '6', '10', '11'
  section:      { type: String },   // 'A', 'B'
  groupName:    { type: String },   // 'science_biology', 'commerce', etc. (for 11 & 12)
  academicYear: { type: String },
  admissionDate:{ type: Date, default: Date.now },
  admissionType:{ type: String, default: 'regular' },
  previousSchool:{ type: String },
  siblingRef:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],

  // ── Transport ────────────────────────────────────────────────────────────
  hasTransport:  { type: Boolean, default: false },
  transportRoute:{ type: String },
  busNo:         { type: String },
  pickupPoint:   { type: String },

  // ── Hostel ───────────────────────────────────────────────────────────────
  isHosteler:  { type: Boolean, default: false },
  hostelRoom:  { type: String },

  // ── Status ───────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['active','inactive','transferred','alumni','admission_pending'],
    default: 'admission_pending',
  },

  // ── References ───────────────────────────────────────────────────────────
  userRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  parentRefs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // ── Finance ──────────────────────────────────────────────────────────────
  advanceAmount:   { type: Number, default: 0 },
  advanceAdjusted: { type: Boolean, default: false },

  // ── Parent OTP (temp) ─────────────────────────────────────────────────────
  parentRegOTP:       { type: String },
  parentRegOTPExpire: { type: Date },

  // ── Documents ────────────────────────────────────────────────────────────
  documents: [{
    name:  String,
    url:   String,
    type:  String,
    uploadedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

studentSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

export default mongoose.model('Student', studentSchema);
