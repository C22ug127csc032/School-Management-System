import mongoose from 'mongoose';

// ── Student Leave ─────────────────────────────────────────────────────────────
const leaveSchema = new mongoose.Schema({
  student:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  appliedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appliedByRole:{ type: String, enum: ['student','parent'], default: 'parent' },
  leaveType:    { type: String, default: 'personal' },
  fromDate:     { type: Date, required: true },
  toDate:       { type: Date, required: true },
  noOfDays:     { type: Number },
  reason:       { type: String, required: true },
  status:       { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  approvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:   { type: Date },
  remarks:      { type: String },
}, { timestamps: true });

leaveSchema.pre('save', function (next) {
  if (this.fromDate && this.toDate)
    this.noOfDays = Math.floor((this.toDate - this.fromDate) / 86400000) + 1;
  next();
});

export const Leave = mongoose.model('Leave', leaveSchema);

// ── Outpass ───────────────────────────────────────────────────────────────────
const outpassSchema = new mongoose.Schema({
  student:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  date:       { type: Date, required: true },
  reason:     { type: String, required: true },
  outTime:    { type: String },
  inTime:     { type: String },
  actualOutTime:{ type: Date },
  actualInTime:{ type: Date },
  parentNote: { type: String },
  status:     { type: String, enum: ['pending','approved','rejected','out','returned'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  gatePassNo: { type: String },
}, { timestamps: true });

export const Outpass = mongoose.model('Outpass', outpassSchema);

// ── Circular / Announcement ────────────────────────────────────────────────────
const circularSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  content:     { type: String, required: true },
  type:        { type: String, enum: ['circular','notice','event','exam','holiday'], default: 'circular' },
  audience:    [{ type: String }],  // ['all'], ['student','parent'], ['teacher']
  classRefs:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }], // empty = all classes
  attachments: [{ type: String }],
  publishDate: { type: Date, default: Date.now },
  expiryDate:  { type: Date },
  isPublished: { type: Boolean, default: true },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Circular = mongoose.model('Circular', circularSchema);

// ── Notification ──────────────────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  title:   { type: String, required: true },
  message: { type: String, required: true },
  type:    { type: String, default: 'info' },
  forRole: [{ type: String }],
  forUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isRead:  { type: Boolean, default: false },
  link:    { type: String },
}, { timestamps: true });

export const Notification = mongoose.model('Notification', notificationSchema);

// ── Homework ──────────────────────────────────────────────────────────────────
const homeworkSchema = new mongoose.Schema({
  class:        { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subject:      { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacher:      { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  title:        { type: String, required: true },
  description:  { type: String },
  dueDate:      { type: Date, required: true },
  attachments:  [{ type: String }],
  academicYear: { type: String },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

export const Homework = mongoose.model('Homework', homeworkSchema);

// ── Exam ─────────────────────────────────────────────────────────────────────
const examSchema = new mongoose.Schema({
  name:         { type: String, required: true }, // 'Unit Test 1', 'Half Yearly'
  examType:     { type: String, enum: ['unit_test','quarterly','half_yearly','annual','mock','other'], default: 'unit_test' },
  academicYear: { type: String, required: true },
  startDate:    { type: Date },
  endDate:      { type: Date },
  grades:       [{ type: String }], // ['9','10'] — which grades this exam is for
  isPublished:  { type: Boolean, default: false },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Exam = mongoose.model('Exam', examSchema);

// ── Exam Schedule (per subject) ───────────────────────────────────────────────
const examScheduleSchema = new mongoose.Schema({
  exam:    { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  class:   { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  scheduleType: { type: String, enum: ['test', 'exam'], default: 'test' },
  day: { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], default: undefined },
  period: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', default: null },
  endPeriod: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', default: null },
  slotName: { type: String, trim: true, default: '' },
  slotType: { type: String, enum: ['exam', 'revision', 'holiday', 'no_session'], default: 'exam' },
  paperName: { type: String, trim: true, default: '' },
  componentSubjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  date:    { type: Date, default: null },
  startTime: { type: String },
  endTime:   { type: String },
  maxMarks:  { type: Number, default: 100 },
  passMarks: { type: Number, default: 35 },
  hall:      { type: String },
  note:      { type: String, trim: true, default: '' },
}, { timestamps: true });

examScheduleSchema.index(
  { exam: 1, class: 1, day: 1, period: 1 },
  {
    unique: true,
    partialFilterExpression: {
      day: { $type: 'string' },
      period: { $type: 'objectId' },
    },
  }
);
examScheduleSchema.index(
  { exam: 1, class: 1, date: 1, period: 1 },
  {
    unique: true,
    partialFilterExpression: {
      date: { $type: 'date' },
      period: { $type: 'objectId' },
    },
  }
);
examScheduleSchema.index(
  { exam: 1, class: 1, date: 1, slotName: 1 },
  {
    unique: true,
    partialFilterExpression: {
      date: { $type: 'date' },
      slotName: { $type: 'string' },
    },
  }
);

export const ExamSchedule = mongoose.model('ExamSchedule', examScheduleSchema);

// ── Marks ─────────────────────────────────────────────────────────────────────
const marksSchema = new mongoose.Schema({
  exam:         { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  examSchedule: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamSchedule' },
  student:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject:      { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  class:        { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  theoryMarks:  { type: Number, default: 0 },
  theoryMaxMarks: { type: Number, default: 100 },
  assessmentMarks: { type: Number, default: 0 },
  assessmentMaxMarks: { type: Number, default: 0 },
  marksObtained:{ type: Number, required: true },
  maxMarks:     { type: Number, default: 100 },
  grade:        { type: String },
  isPassed:     { type: Boolean },
  isAbsent:     { type: Boolean, default: false },
  remarks:      { type: String },
  workflowStatus: {
    type: String,
    enum: ['draft', 'submitted_to_class_teacher', 'published'],
    default: 'draft',
  },
  enteredBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedAt:  { type: Date },
}, { timestamps: true });

marksSchema.index({ exam: 1, student: 1, subject: 1 }, { unique: true });

export const Mark = mongoose.model('Mark', marksSchema);

export default { Leave, Outpass, Circular, Notification, Homework, Exam, ExamSchedule, Mark };
