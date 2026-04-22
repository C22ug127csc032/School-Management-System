import mongoose from 'mongoose';

const attendanceEntrySchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  status:  { type: String, enum: ['present','absent','late','half_day'], default: 'present' },
  remarks: { type: String },
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  class:        { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  date:         { type: Date, required: true },
  academicYear: { type: String, required: true },
  markedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  entries:      [attendanceEntrySchema],
  isHoliday:    { type: Boolean, default: false },
  holidayReason:{ type: String },
}, { timestamps: true });

attendanceSchema.index({ class: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
