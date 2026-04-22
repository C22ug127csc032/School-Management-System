import mongoose from 'mongoose';

// ClassSubject links a specific Class (section) to a Subject + Teacher.
// For standard classes: all subjects are assigned uniformly.
// For Grade 11 & 12: subjects are assigned per group (science_biology, commerce, etc.)
// The 'class' field already carries the groupName on the Class document.
// This ensures e.g. Biology is only in 11-A (science_biology), not 11-B (science_maths).

const classSubjectSchema = new mongoose.Schema({
  class:         { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subject:       { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacher:       { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  periodsPerWeek:{ type: Number, default: 5, min: 1 },
  academicYear:  { type: String, required: true },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

// A class can have each subject only once
classSubjectSchema.index({ class: 1, subject: 1, academicYear: 1 }, {
  unique: true,
  partialFilterExpression: { isActive: true },
});

export default mongoose.model('ClassSubject', classSubjectSchema);
