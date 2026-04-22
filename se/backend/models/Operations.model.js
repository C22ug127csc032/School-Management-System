import mongoose from 'mongoose';

// ── Book ─────────────────────────────────────────────────────────────────────
const bookSchema = new mongoose.Schema({
  title:          { type: String, required: true },
  author:         { type: String, required: true },
  isbn:           { type: String, unique: true, sparse: true },
  publisher:      { type: String },
  edition:        { type: String },
  year:           { type: Number },
  category:       { type: String },
  subject:        { type: String },
  language:       { type: String, default: 'English' },
  totalCopies:    { type: Number, default: 1 },
  availableCopies:{ type: Number, default: 1 },
  shelfNo:        { type: String },
  accessionNo:    { type: String, unique: true, sparse: true },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

export const Book = mongoose.model('Book', bookSchema);

// ── Book Issue ────────────────────────────────────────────────────────────────
const bookIssueSchema = new mongoose.Schema({
  book:       { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  borrowerType:{ type: String, enum: ['student','teacher'], default: 'student' },
  student:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  teacher:    { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  issueDate:  { type: Date, default: Date.now },
  dueDate:    { type: Date, required: true },
  returnDate: { type: Date },
  fine:       { type: Number, default: 0 },
  finePaid:   { type: Boolean, default: false },
  status:     { type: String, enum: ['issued','returned','overdue'], default: 'issued' },
  issuedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  returnedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks:    { type: String },
}, { timestamps: true });

export const BookIssue = mongoose.model('BookIssue', bookIssueSchema);

// ── Inventory ─────────────────────────────────────────────────────────────────
const inventorySchema = new mongoose.Schema({
  name:        { type: String, required: true },
  category:    { type: String, required: true },
  unit:        { type: String, default: 'piece' },
  currentStock:{ type: Number, default: 0 },
  minStock:    { type: Number, default: 5 },
  description: { type: String },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

export const Inventory = mongoose.model('Inventory', inventorySchema);

// ── Inventory Transaction ─────────────────────────────────────────────────────
const inventoryTxnSchema = new mongoose.Schema({
  item:        { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  type:        { type: String, enum: ['purchase','issue','return','adjustment'], required: true },
  quantity:    { type: Number, required: true },
  balance:     { type: Number, default: 0 },
  remarks:     { type: String },
  date:        { type: Date, default: Date.now },
  recordedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const InventoryTxn = mongoose.model('InventoryTxn', inventoryTxnSchema);

// ── Expense ───────────────────────────────────────────────────────────────────
const expenseSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  category:    { type: String, required: true },
  amount:      { type: Number, required: true },
  paymentMode: { type: String, default: 'cash' },
  date:        { type: Date, default: Date.now },
  academicYear:{ type: String },
  description: { type: String },
  billNo:      { type: String },
  attachment:  { type: String },
  recordedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Expense = mongoose.model('Expense', expenseSchema);

export default { Book, BookIssue, Inventory, InventoryTxn, Expense };
