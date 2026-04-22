import mongoose from 'mongoose';

// ── Teacher Leave ──────────────────────────────────────────────────────────────
const teacherLeaveSchema = new mongoose.Schema({
  teacher:  { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  fromDate: { type: Date, required: true },
  toDate:   { type: Date, required: true },
  reason:   { type: String, required: true },
  leaveType:{ type: String, default: 'personal' },
  status:   { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  approvedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:{ type: Date },
  remarks:  { type: String },
}, { timestamps: true });

export const TeacherLeave = mongoose.model('TeacherLeave', teacherLeaveSchema);

// ── Substitution ──────────────────────────────────────────────────────────────
const substitutionSchema = new mongoose.Schema({
  date:            { type: Date, required: true },
  period:          { type: mongoose.Schema.Types.ObjectId, ref: 'Period', required: true },
  class:           { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  absentTeacher:   { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  substituteTeacher:{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  subject:         { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  academicYear:    { type: String, required: true },
  assignedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:          { type: String, enum: ['assigned','completed','cancelled'], default: 'assigned' },
  notes:           { type: String },
}, { timestamps: true });

substitutionSchema.index({ date: 1, period: 1, substituteTeacher: 1 }, { unique: true });

export const Substitution = mongoose.model('Substitution', substitutionSchema);

export default { TeacherLeave, Substitution };
