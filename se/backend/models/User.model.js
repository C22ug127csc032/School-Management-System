import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { isValidIndianPhone, normalizePhone } from '../utils/phone.js';

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, unique: true, sparse: true, lowercase: true },
  phone: {
    type: String, required: true, unique: true,
    set: normalizePhone,
    validate: { validator: isValidIndianPhone, message: 'Invalid 10-digit Indian mobile number' },
  },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['super_admin','admin','principal','teacher','class_teacher','accountant','librarian','admission_staff','student','parent'],
    default: 'student',
  },
  isActive:     { type: Boolean, default: true },
  avatar:       { type: String },
  isFirstLogin: { type: Boolean, default: false },
  studentRef:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  teacherRef:   { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  relation:     { type: String, default: '' },
  staffId:      { type: String },
  department:   { type: String },
  otp:          { type: String },
  otpExpire:    { type: Date },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model('User', userSchema);
