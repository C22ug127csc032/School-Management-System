import { Leave, Outpass, Circular, Homework, Exam, ExamSchedule, Mark } from '../models/Academic.model.js';
import { Book, BookIssue, Inventory, InventoryTxn, Expense } from '../models/Operations.model.js';
import Student from '../models/Student.model.js';
import Teacher from '../models/Teacher.model.js';
import ClassSubject from '../models/ClassSubject.model.js';
import { resolveAcademicYear } from '../utils/academicYear.js';
import { createPaginatedResponse, createSearchRegex, parseListQuery, resolveSort } from '../utils/query.js';

const isTeachingRole = role => ['teacher', 'class_teacher'].includes(role);

const getLinkedTeacherIds = async req => {
  if (!isTeachingRole(req.user?.role)) return [];

  const linkedIds = new Set();
  if (req.user?.teacherRef) linkedIds.add(String(req.user.teacherRef));

  const linkedTeachers = await Teacher.find({
    $or: [
      ...(req.user?.teacherRef ? [{ _id: req.user.teacherRef }] : []),
      { userRef: req.user._id },
    ],
  }).select('_id');

  linkedTeachers.forEach(teacher => linkedIds.add(String(teacher._id)));
  return [...linkedIds];
};

const getTeacherScope = async (req, linkedTeacherIds = null) => {
  if (!isTeachingRole(req.user?.role)) return null;

  const teacherIds = linkedTeacherIds || await getLinkedTeacherIds(req);
  if (!teacherIds.length) return null;

  const primaryTeacherId = teacherIds.find(id => String(id) === String(req.user?.teacherRef)) || teacherIds[0];
  return Teacher.findById(primaryTeacherId)
    .populate('classTeacherOf', 'grade section displayName groupName')
    .populate('eligibleSubjects', 'name code');
};

const buildAssignmentQuery = (teacherIds, academicYear, classId, subjectId) => ({
  teacher: Array.isArray(teacherIds) ? { $in: teacherIds } : teacherIds,
  academicYear,
  isActive: true,
  ...(classId ? { class: classId } : {}),
  ...(subjectId ? { subject: subjectId } : {}),
});

const findScopedTeachingAssignment = async (req, academicYear, classId, subjectId) => {
  if (!isTeachingRole(req.user.role)) return null;

  const linkedTeacherIds = await getLinkedTeacherIds(req);
  if (!linkedTeacherIds.length) return null;

  const directAssignment = await ClassSubject.findOne(
    buildAssignmentQuery(linkedTeacherIds, academicYear, classId, subjectId)
  );
  if (directAssignment) return directAssignment;

  if (req.user.role !== 'class_teacher') return null;

  const teacher = await getTeacherScope(req, linkedTeacherIds);
  const classTeacherOf = String(teacher?.classTeacherOf?._id || teacher?.classTeacherOf || '');
  const eligibleSubjectIds = (teacher?.eligibleSubjects || []).map(subject => String(subject?._id || subject));

  if (!classTeacherOf || String(classId || '') !== classTeacherOf) return null;
  if (subjectId && !eligibleSubjectIds.includes(String(subjectId))) return null;

  return ClassSubject.findOne({
    class: classId,
    academicYear,
    isActive: true,
    ...(subjectId ? { subject: subjectId } : {}),
  });
};

const canManageExamClass = async (req, academicYear, classId, subjectId) => {
  if (!isTeachingRole(req.user.role)) return true;

  const linkedTeacherIds = await getLinkedTeacherIds(req);
  if (!linkedTeacherIds.length) return false;

  if (req.user.role === 'class_teacher') {
    const teacher = await getTeacherScope(req, linkedTeacherIds);
    const classTeacherOf = String(teacher?.classTeacherOf?._id || teacher?.classTeacherOf || '');
    return Boolean(classTeacherOf) && String(classId || '') === classTeacherOf;
  }

  const assignment = await ClassSubject.findOne(buildAssignmentQuery(linkedTeacherIds, academicYear, classId, subjectId));
  return Boolean(assignment);
};

// ── LEAVE ─────────────────────────────────────────────────────────────────────
export const getLeaves = async (req, res) => {
  try {
    const { studentId, status, academicYear, classId } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      defaultLimit: 20,
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
    });
    const { sort } = resolveSort(sortBy, sortOrder, {
      createdAt: 'createdAt',
      fromDate: 'fromDate',
      status: 'status',
    }, 'createdAt');

    const query = {};
    if (studentId) query.student = studentId;
    if (status)    query.status  = status;

    // RBAC: Class Teacher and Super Admin/Admin
    const ay = resolveAcademicYear(academicYear);
    const teacher = await getTeacherScope(req);
    const classTeacherOf = teacher?.classTeacherOf?._id || teacher?.classTeacherOf;

    // If teacher role, we must scope to their students (unless they are a standard admin/principal)
    const isFullAdmin = ['super_admin','admin','principal'].includes(req.user.role);
    
    if (!isFullAdmin) {
      if (classTeacherOf) {
        // Teacher can see their own class students
        const classStudentIds = await Student.find({
          classRef: classTeacherOf,
          academicYear: ay,
        }).distinct('_id');
        query.student = { $in: classStudentIds };
      } else {
        // If not a class teacher and not admin, return empty or unauthorized
        return res.json(createPaginatedResponse({ data: [], total: 0, page, limit }));
      }
    } else if (classId) {
      // Admins can filter by classId
      const classStudentIds = await Student.find({
        classRef: classId,
        academicYear: ay,
      }).distinct('_id');
      query.student = studentId
        ? { $in: classStudentIds.filter(id => String(id) === String(studentId)) }
        : { $in: classStudentIds };
    }

    const total = await Leave.countDocuments(query);
    const leaves = await Leave.find(query)
      .populate('student','firstName lastName admissionNo grade section')
      .populate('approvedBy','name')
      .skip(skip).limit(limit)
      .sort(sort);
    res.json(createPaginatedResponse({ data: leaves, total, page, limit }));
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createLeave = async (req, res) => {
  try {
    const leave = await Leave.create({ ...req.body, appliedBy: req.user._id, appliedByRole: req.user.role === 'parent' ? 'parent' : 'student' });
    res.status(201).json({ success: true, data: leave, message: 'Leave request submitted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const leave = await Leave.findByIdAndUpdate(req.params.id, { status, remarks, approvedBy: req.user._id, approvedAt: new Date() }, { new: true })
      .populate('student','firstName lastName');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found.' });
    res.json({ success: true, data: leave, message: `Leave ${status}.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── OUTPASS ───────────────────────────────────────────────────────────────────
export const getOutpasses = async (req, res) => {
  try {
    const { status, date } = req.query;
    const query = {};
    if (status) query.status = status;
    if (date) { const d = new Date(date); query.date = { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(new Date(date).setHours(23,59,59,999)) }; }
    const outpasses = await Outpass.find(query)
      .populate('student','firstName lastName admissionNo grade section phone')
      .populate('approvedBy','name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: outpasses });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createOutpass = async (req, res) => {
  try {
    const op = await Outpass.create({ ...req.body });
    res.status(201).json({ success: true, data: op, message: 'Outpass request created.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const updateOutpassStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const op = await Outpass.findByIdAndUpdate(req.params.id, { status, approvedBy: req.user._id, approvedAt: new Date() }, { new: true })
      .populate('student','firstName lastName');
    if (!op) return res.status(404).json({ success: false, message: 'Outpass not found.' });
    res.json({ success: true, data: op, message: `Outpass ${status}.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── CIRCULARS ─────────────────────────────────────────────────────────────────
export const getCirculars = async (req, res) => {
  try {
    const { type, audience, search } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      defaultLimit: 20,
      defaultSortBy: 'publishDate',
      defaultSortOrder: 'desc',
    });
    const { sort } = resolveSort(sortBy, sortOrder, {
      publishDate: 'publishDate',
      title: 'title',
      type: 'type',
    }, 'publishDate');
    const query = { isPublished: true };
    if (type)     query.type = type;
    if (audience) query.audience = audience;
    if (search) {
      const re = createSearchRegex(search);
      query.$or = [{ title: re }, { content: re }];
    }
    const total = await Circular.countDocuments(query);
    const circulars = await Circular.find(query)
      .populate('publishedBy','name')
      .populate('classRefs', 'grade section displayName groupName')
      .skip(skip).limit(limit)
      .sort(sort);
    res.json(createPaginatedResponse({ data: circulars, total, page, limit }));
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createCircular = async (req, res) => {
  try {
    const payload = { ...req.body, publishedBy: req.user._id };

    if (isTeachingRole(req.user.role)) {
      // Teachers/Class Teachers can only send to Student/Parent audience of their assigned classes
      payload.audience = ['student', 'parent'];
      
      const teacher = await getTeacherScope(req);
      const ay = resolveAcademicYear(req.body.academicYear);
      const linkedTeacherIds = await getLinkedTeacherIds(req);
      const assignedClassIds = await ClassSubject.distinct('class', buildAssignmentQuery(linkedTeacherIds, ay));
      const allowedClassIds = new Set([
        ...(teacher?.classTeacherOf ? [String(teacher.classTeacherOf._id || teacher.classTeacherOf)] : []),
        ...assignedClassIds.map(String),
      ]);
      
      const requestedClassIds = (req.body.classRefs || []).map(String).filter(Boolean);
      
      // Filter out classes they don't teach/manage
      payload.classRefs = requestedClassIds.length
        ? requestedClassIds.filter(classId => allowedClassIds.has(classId))
        : [...allowedClassIds];

      if (payload.classRefs.length === 0) {
        return res.status(403).json({ success: false, message: 'You must select a class you are assigned to.' });
      }
    }

    const circular = await Circular.create(payload);
    res.status(201).json({ success: true, data: circular, message: 'Circular published.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const deleteCircular = async (req, res) => {
  try {
    await Circular.findByIdAndUpdate(req.params.id, { isPublished: false });
    res.json({ success: true, message: 'Circular removed.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── HOMEWORK ──────────────────────────────────────────────────────────────────
export const getHomework = async (req, res) => {
  try {
    const { classId, subjectId, teacherId, academicYear } = req.query;
    const ay = resolveAcademicYear(academicYear);
    const query = { academicYear: ay, isActive: true };
    if (classId)   query.class   = classId;
    if (subjectId) query.subject = subjectId;
    if (isTeachingRole(req.user.role)) {
      const linkedTeacherIds = await getLinkedTeacherIds(req);
      if (!linkedTeacherIds.length) return res.json({ success: true, data: [] });
      query.teacher = { $in: linkedTeacherIds };
    }
    else if (teacherId) query.teacher = teacherId;
    const hw = await Homework.find(query)
      .populate('class','grade section displayName')
      .populate('subject','name code color')
      .populate('teacher','firstName lastName')
      .sort({ dueDate: 1 });
    res.json({ success: true, data: hw });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createHomework = async (req, res) => {
  try {
    const ay = resolveAcademicYear(req.body.academicYear);
    if (isTeachingRole(req.user.role)) {
      const linkedTeacherIds = await getLinkedTeacherIds(req);
      if (!linkedTeacherIds.length) {
        return res.status(403).json({ success: false, message: 'You can only assign homework for your own teacher profile.' });
      }

      if (!linkedTeacherIds.includes(String(req.body.teacher))) {
        return res.status(403).json({ success: false, message: 'You can only assign homework for your own teacher profile.' });
      }

      const assignment = await findScopedTeachingAssignment(req, ay, req.body.class, req.body.subject);
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You can only assign homework for your own subject and class.' });
      }

      req.body.teacher = String(assignment.teacher || req.body.teacher || linkedTeacherIds[0]);
    }

    const hw = await Homework.create({ ...req.body, academicYear: ay });
    const populated = await Homework.findById(hw._id)
      .populate('class','grade section displayName').populate('subject','name code color');
    res.status(201).json({ success: true, data: populated, message: 'Homework assigned.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const deleteHomework = async (req, res) => {
  try {
    if (isTeachingRole(req.user.role)) {
      const linkedTeacherIds = await getLinkedTeacherIds(req);
      const homework = await Homework.findById(req.params.id).select('teacher');
      if (!homework) return res.status(404).json({ success: false, message: 'Homework not found.' });
      if (!linkedTeacherIds.includes(String(homework.teacher))) {
        return res.status(403).json({ success: false, message: 'You can only remove your own homework.' });
      }
    }

    await Homework.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Homework removed.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── EXAMS ─────────────────────────────────────────────────────────────────────
export const getExams = async (req, res) => {
  try {
    const ay = resolveAcademicYear(req.query.academicYear);
    const exams = await Exam.find({ academicYear: ay }).sort({ startDate: 1 });
    res.json({ success: true, data: exams });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createExam = async (req, res) => {
  try {
    const ay   = resolveAcademicYear(req.body.academicYear);
    const exam = await Exam.create({ ...req.body, academicYear: ay, createdBy: req.user._id });
    res.status(201).json({ success: true, data: exam, message: 'Exam created.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const getExamSchedule = async (req, res) => {
  try {
    const { examId, classId } = req.query;
    const query = {};
    if (examId)  query.exam  = examId;
    if (classId) query.class = classId;
    const schedule = await ExamSchedule.find(query)
      .populate('exam','name examType').populate('class','grade section displayName')
      .populate('subject','name code color').sort({ date: 1 });
    res.json({ success: true, data: schedule });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createExamSchedule = async (req, res) => {
  try {
    const s = await ExamSchedule.create(req.body);
    const p = await ExamSchedule.findById(s._id)
      .populate('subject','name code').populate('class','grade section displayName');
    res.status(201).json({ success: true, data: p });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const getMarks = async (req, res) => {
  try {
    const { examId, studentId, classId, subjectId } = req.query;
    const ay = resolveAcademicYear(req.query.academicYear);
    const query = {};
    if (examId)    query.exam    = examId;
    if (studentId) query.student = studentId;
    if (classId)   query.class   = classId;
    if (subjectId) query.subject = subjectId;

    if (isTeachingRole(req.user.role) && req.user.teacherRef) {
      const canAccess = await canManageExamClass(req, ay, classId, subjectId);
      if (!canAccess) return res.json({ success: true, data: [] });
    }

    const marks = await Mark.find(query)
      .populate('student','firstName lastName admissionNo rollNo')
      .populate('subject','name code').sort({ 'student.firstName': 1 });
    res.json({ success: true, data: marks });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const saveMarks = async (req, res) => {
  try {
    const { marks } = req.body; // array of {examId, studentId, subjectId, classId, marksObtained, maxMarks, isAbsent}
    const results = [];
    for (const m of marks) {
      if (isTeachingRole(req.user.role) && req.user.teacherRef) {
        const canAccess = await canManageExamClass(req, resolveAcademicYear(m.academicYear), m.classId, m.subjectId);
        if (!canAccess) {
          return res.status(403).json({ success: false, message: 'You can only save marks for your own subject and class.' });
        }
      }

      const grade = calcGrade(m.marksObtained, m.maxMarks);
      const isPassed = !m.isAbsent && m.marksObtained >= (m.passMarks || 35);
      const doc = await Mark.findOneAndUpdate(
        { exam: m.examId, student: m.studentId, subject: m.subjectId },
        { ...m, exam: m.examId, student: m.studentId, subject: m.subjectId, class: m.classId, grade, isPassed, enteredBy: req.user._id },
        { upsert: true, new: true },
      );
      results.push(doc);
    }
    res.json({ success: true, data: results, message: `${results.length} marks saved.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const getReportCard = async (req, res) => {
  try {
    const { examId, studentId } = req.query;
    if (!examId || !studentId) {
      return res.status(400).json({ success: false, message: 'examId and studentId are required.' });
    }

    const [exam, student, marks] = await Promise.all([
      Exam.findById(examId),
      Student.findById(studentId).populate('classRef', 'grade section displayName'),
      Mark.find({ exam: examId, student: studentId })
        .populate('subject', 'name code')
        .sort({ createdAt: 1 }),
    ]);

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    if (isTeachingRole(req.user.role)) {
      const teacher = await getTeacherScope(req);
      const classTeacherOf = String(teacher?.classTeacherOf?._id || teacher?.classTeacherOf || '');
      const linkedTeacherIds = await getLinkedTeacherIds(req);
      const assignedClassIds = await ClassSubject.distinct('class', buildAssignmentQuery(linkedTeacherIds, exam.academicYear));
      const allowedClassIds = new Set([
        ...assignedClassIds.map(String),
        ...(classTeacherOf ? [classTeacherOf] : []),
      ]);
      if (!allowedClassIds.has(String(student.classRef?._id || ''))) {
        return res.status(403).json({ success: false, message: 'You can only view report cards for your assigned classes.' });
      }
    }

    const totalObtained = marks.reduce((sum, mark) => sum + (mark.isAbsent ? 0 : Number(mark.marksObtained || 0)), 0);
    const totalMax = marks.reduce((sum, mark) => sum + Number(mark.maxMarks || 0), 0);
    const percentage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
    const passedCount = marks.filter(mark => mark.isPassed).length;
    const failedCount = marks.filter(mark => !mark.isPassed && !mark.isAbsent).length;
    const absentCount = marks.filter(mark => mark.isAbsent).length;

    res.json({
      success: true,
      data: {
        exam: {
          _id: exam._id,
          name: exam.name,
          examType: exam.examType,
          academicYear: exam.academicYear,
          startDate: exam.startDate,
          endDate: exam.endDate,
        },
        student: {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNo: student.admissionNo,
          rollNo: student.rollNo,
          className: student.classRef?.displayName || `Grade ${student.grade}${student.section ? `-${student.section}` : ''}`,
        },
        marks: marks.map(mark => ({
          _id: mark._id,
          subject: mark.subject,
          marksObtained: mark.marksObtained,
          maxMarks: mark.maxMarks,
          grade: mark.grade,
          isPassed: mark.isPassed,
          isAbsent: mark.isAbsent,
          remarks: mark.remarks || '',
        })),
        summary: {
          totalSubjects: marks.length,
          totalObtained,
          totalMax,
          percentage,
          result: failedCount === 0 ? 'PASS' : 'FAIL',
          passedCount,
          failedCount,
          absentCount,
        },
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const calcGrade = (obtained, max) => {
  const pct = (obtained / max) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
};

// ── LIBRARY ───────────────────────────────────────────────────────────────────
export const getBooks = async (req, res) => {
  try {
    const { search, category } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      defaultLimit: 20,
      defaultSortBy: 'title',
      defaultSortOrder: 'asc',
    });
    const { sort } = resolveSort(sortBy, sortOrder, {
      title: 'title',
      author: 'author',
      category: 'category',
      availableCopies: 'availableCopies',
      totalCopies: 'totalCopies',
      createdAt: 'createdAt',
    }, 'title');
    const query = { isActive: true };
    if (category) query.category = category;
    if (search) {
      const re = createSearchRegex(search);
      query.$or = [{ title: re }, { author: re }, { isbn: re }, { accessionNo: re }];
    }
    const total = await Book.countDocuments(query);
    const books = await Book.find(query).skip(skip).limit(limit).sort(sort);
    res.json(createPaginatedResponse({ data: books, total, page, limit }));
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createBook = async (req, res) => {
  try {
    const book = await Book.create(req.body);
    res.status(201).json({ success: true, data: book, message: 'Book added.' });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'ISBN or Accession No already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!book) return res.status(404).json({ success: false, message: 'Book not found.' });
    res.json({ success: true, data: book });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const issueBook = async (req, res) => {
  try {
    const { bookId, studentId, teacherId, borrowerType, dueDate } = req.body;
    const book = await Book.findById(bookId);
    if (!book || book.availableCopies <= 0)
      return res.status(400).json({ success: false, message: 'Book not available.' });
    const issue = await BookIssue.create({ book: bookId, borrowerType: borrowerType || 'student', student: studentId, teacher: teacherId, dueDate: new Date(dueDate), issuedBy: req.user._id });
    book.availableCopies--;
    await book.save();
    const populated = await BookIssue.findById(issue._id).populate('book','title author isbn').populate('student','firstName lastName admissionNo');
    res.status(201).json({ success: true, data: populated, message: 'Book issued.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const returnBook = async (req, res) => {
  try {
    const issue = await BookIssue.findById(req.params.id).populate('book');
    if (!issue) return res.status(404).json({ success: false, message: 'Issue record not found.' });
    const today = new Date();
    let fine = 0;
    if (today > issue.dueDate) {
      const days = Math.ceil((today - issue.dueDate) / 86400000);
      fine = days * 2; // ₹2 per day
    }
    issue.returnDate = today;
    issue.status     = 'returned';
    issue.fine       = fine;
    issue.returnedTo = req.user._id;
    await issue.save();
    issue.book.availableCopies++;
    await issue.book.save();
    res.json({ success: true, data: issue, fine, message: fine ? `Book returned with fine ₹${fine}.` : 'Book returned.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const getIssues = async (req, res) => {
  try {
    const { status, studentId } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      defaultLimit: 20,
      defaultSortBy: 'issueDate',
      defaultSortOrder: 'desc',
    });
    const { sort } = resolveSort(sortBy, sortOrder, {
      issueDate: 'issueDate',
      dueDate: 'dueDate',
      status: 'status',
    }, 'issueDate');
    const query = {};
    if (status)    query.status  = status;
    if (studentId) query.student = studentId;
    const total = await BookIssue.countDocuments(query);
    const issues = await BookIssue.find(query)
      .populate('book','title author isbn accessionNo')
      .populate('student','firstName lastName admissionNo')
      .skip(skip).limit(limit)
      .sort(sort);
    res.json(createPaginatedResponse({ data: issues, total, page, limit }));
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── INVENTORY ─────────────────────────────────────────────────────────────────
export const getInventory = async (req, res) => {
  try {
    const { category } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    const items = await Inventory.find(query).sort({ name: 1 });
    res.json({ success: true, data: items });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.create(req.body);
    res.status(201).json({ success: true, data: item, message: 'Item added.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const recordInventoryTxn = async (req, res) => {
  try {
    const { itemId, type, quantity, remarks } = req.body;
    const item = await Inventory.findById(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
    if (type === 'purchase' || type === 'return') item.currentStock += Number(quantity);
    else if (type === 'issue') {
      if (item.currentStock < Number(quantity)) return res.status(400).json({ success: false, message: 'Insufficient stock.' });
      item.currentStock -= Number(quantity);
    }
    await item.save();
    const txn = await InventoryTxn.create({ item: itemId, type, quantity, balance: item.currentStock, remarks, recordedBy: req.user._id });
    res.status(201).json({ success: true, data: { item, txn }, message: 'Transaction recorded.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── EXPENSE ───────────────────────────────────────────────────────────────────
export const getExpenses = async (req, res) => {
  try {
    const { academicYear, category, search } = req.query;
    const ay = resolveAcademicYear(academicYear);
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      defaultLimit: 20,
      defaultSortBy: 'date',
      defaultSortOrder: 'desc',
    });
    const { sort } = resolveSort(sortBy, sortOrder, {
      date: 'date',
      amount: 'amount',
      title: 'title',
      category: 'category',
      createdAt: 'createdAt',
    }, 'date');
    const query = { academicYear: ay };
    if (category) query.category = category;
    if (search) {
      const re = createSearchRegex(search);
      query.$or = [{ title: re }, { category: re }, { description: re }];
    }
    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query).populate('recordedBy','name').skip(skip).limit(limit).sort(sort);
    const totalAmount = (await Expense.aggregate([{ $match: query }, { $group: { _id: null, sum: { $sum: '$amount' } } }]))[0]?.sum || 0;
    res.json(createPaginatedResponse({ data: expenses, total, page, limit, extra: { totalAmount } }));
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export const createExpense = async (req, res) => {
  try {
    const ay  = resolveAcademicYear(req.body.academicYear);
    const exp = await Expense.create({ ...req.body, academicYear: ay, recordedBy: req.user._id });
    res.status(201).json({ success: true, data: exp, message: 'Expense recorded.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

export default {
  getLeaves, createLeave, updateLeaveStatus,
  getOutpasses, createOutpass, updateOutpassStatus,
  getCirculars, createCircular, deleteCircular,
  getHomework, createHomework, deleteHomework,
  getExams, createExam, getExamSchedule, createExamSchedule, getMarks, saveMarks, getReportCard,
  getBooks, createBook, updateBook, issueBook, returnBook, getIssues,
  getInventory, createInventoryItem, recordInventoryTxn,
  getExpenses, createExpense,
};
