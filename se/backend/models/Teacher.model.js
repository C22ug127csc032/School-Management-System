import mongoose from 'mongoose';
import { isValidIndianPhone, normalizePhone } from '../utils/phone.js';

const teacherSchema = new mongoose.Schema({
  // Identity
  employeeId:    { type: String, required: true, unique: true },
  firstName:     { type: String, required: true, trim: true },
  lastName:      { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true },
  phone: {
    type: String, required: true, unique: true,
    set: normalizePhone,
    validate: { validator: isValidIndianPhone, message: 'Invalid 10-digit Indian mobile number' },
  },
  photo:         { type: String },

  // Professional
  gender:        { type: String, enum: ['male','female','other'], default: 'male' },
  dob:           { type: Date },
  qualification: { type: String },
  designation:   { type: String, default: 'Teacher' },
  department:    { type: String },
  joiningDate:   { type: Date },
  experienceYears: { type: Number, default: 0 },
  address:       { type: String },

  // Teaching scope
  eligibleGradeLevels: [{
    type: String,
    enum: ['pre_primary','primary','middle','secondary','higher_secondary'],
  }],
  eligibleClasses:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  eligibleSubjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],

  // Workload rules
  maxPeriodsPerDay:  { type: Number, default: 6 },
  maxPeriodsPerWeek: { type: Number, default: 30 },

  // Class teacher assignment
  isClassTeacher: { type: Boolean, default: false },
  classTeacherOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },

  // Special capabilities
  isLabEligible:     { type: Boolean, default: false },
  isPTEligible:      { type: Boolean, default: false },
  isLibraryEligible: { type: Boolean, default: false },

  // User account reference
  userRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

teacherSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

export default mongoose.model('Teacher', teacherSchema);
