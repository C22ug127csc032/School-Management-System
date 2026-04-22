import mongoose from 'mongoose';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const timetableSlotSchema = new mongoose.Schema({
  class:    { type: mongoose.Schema.Types.ObjectId, ref: 'Class',   required: true },
  subject:  { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacher:  { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  period:   { type: mongoose.Schema.Types.ObjectId, ref: 'Period',  required: true },
  day:      { type: String, enum: DAYS, required: true },
  weekType: { type: String, enum: ['all','odd','even'], default: 'all' },
  academicYear: { type: String, required: true },
  specialResource: { type: mongoose.Schema.Types.ObjectId, ref: 'SpecialResource' },
  isFixed:  { type: Boolean, default: false },  // locked lab/library slots
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Core conflict-prevention indexes
timetableSlotSchema.index({ teacher: 1, day: 1, period: 1, academicYear: 1, weekType: 1 }, { unique: true, sparse: true });
timetableSlotSchema.index({ class:   1, day: 1, period: 1, academicYear: 1, weekType: 1 }, { unique: true, sparse: true });

export const TIMETABLE_DAYS = DAYS;
export default mongoose.model('TimetableSlot', timetableSlotSchema);
