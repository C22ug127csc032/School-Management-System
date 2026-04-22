import mongoose from 'mongoose';

const periodSchema = new mongoose.Schema({
  periodNo:   { type: Number, required: true, min: 0 },
  name:       { type: String, required: true }, // e.g. "Period 1", "Lunch"
  startTime:  { type: String, required: true }, // "08:00"
  endTime:    { type: String, required: true }, // "08:45"
  type: {
    type: String,
    enum: ['teaching', 'short_break', 'lunch_break', 'assembly', 'activity'],
    default: 'teaching',
  },
  isBreak:    { type: Boolean, default: false },
  durationMins: { type: Number },
  academicYear: { type: String, required: true },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

periodSchema.index(
  { periodNo: 1, academicYear: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
  }
);

export default mongoose.model('Period', periodSchema);
