import express from 'express';
import { protect, adminOnly, allStaff, teachingStaff, teacherUp, leaveReviewers, superAdminOnly,
         libStaff, financeStaff, feeStructureStaff, feeAssignStaff,
         timetableManagers, timetableViewers, substitutionMgr, inventoryStaff,
         settingsManagers, staffManagers, reportStaff } from '../middleware/auth.middleware.js';
import classCtrl       from '../controllers/class.controller.js';
import subjectCtrl     from '../controllers/subject.controller.js';
import teacherCtrl     from '../controllers/teacher.controller.js';
import studentCtrl     from '../controllers/student.controller.js';
import csCtrl          from '../controllers/classSubject.controller.js';
import periodCtrl      from '../controllers/period.controller.js';
import ttCtrl          from '../controllers/timetable.controller.js';
import subCtrl         from '../controllers/substitution.controller.js';
import { attendanceController as attCtrl } from '../controllers/attendance.controller.js';
import feesCtrl        from '../controllers/fees.controller.js';
import miscCtrl        from '../controllers/misc.controller.js';
import dashCtrl        from '../controllers/dashboard.controller.js';
import settingsCtrl    from '../controllers/settings.controller.js';
import staffCtrl       from '../controllers/staff.controller.js';

// ── Classes ──────────────────────────────────────────────────────────────────
export const classRoutes = express.Router();
classRoutes.use(protect);
classRoutes.get('/grades', allStaff, classCtrl.getGradeList);
classRoutes.get('/',       allStaff, classCtrl.getClasses);
classRoutes.get('/:id',   allStaff, classCtrl.getClassById);
classRoutes.post('/',      adminOnly, classCtrl.createClass);
classRoutes.put('/:id',   adminOnly, classCtrl.updateClass);
classRoutes.put('/:id/deactivate', adminOnly, classCtrl.deactivateClass);
classRoutes.delete('/:id',adminOnly, classCtrl.deleteClass);

// ── Subjects ──────────────────────────────────────────────────────────────────
export const subjectRoutes = express.Router();
subjectRoutes.use(protect);
subjectRoutes.get('/',     allStaff,  subjectCtrl.getSubjects);
subjectRoutes.get('/:id', allStaff,  subjectCtrl.getSubjectById);
subjectRoutes.post('/',    adminOnly, subjectCtrl.createSubject);
subjectRoutes.put('/:id', adminOnly, subjectCtrl.updateSubject);
subjectRoutes.put('/:id/deactivate', adminOnly, subjectCtrl.deactivateSubject);
subjectRoutes.delete('/:id', adminOnly, subjectCtrl.deleteSubject);

// ── Teachers ──────────────────────────────────────────────────────────────────
export const teacherRoutes = express.Router();
teacherRoutes.use(protect);
teacherRoutes.get('/free',   timetableManagers, teacherCtrl.getAvailableTeachers);
teacherRoutes.get('/',       allStaff,          teacherCtrl.getTeachers);
teacherRoutes.get('/:id',   allStaff,          teacherCtrl.getTeacherById);
teacherRoutes.post('/',      staffManagers,     teacherCtrl.createTeacher);
teacherRoutes.put('/:id',   staffManagers,     teacherCtrl.updateTeacher);
teacherRoutes.delete('/:id',staffManagers,     teacherCtrl.deleteTeacher);

// —— Staff ————————————————————————————————————————————————————————————————————————————————
export const staffRoutes = express.Router();
staffRoutes.use(protect);
staffRoutes.get('/',       staffManagers, staffCtrl.getStaff);
staffRoutes.post('/',      staffManagers, staffCtrl.createStaff);
staffRoutes.put('/:id',    staffManagers, staffCtrl.updateStaff);
staffRoutes.delete('/:id', staffManagers, staffCtrl.deactivateStaff);

// ── Students ──────────────────────────────────────────────────────────────────
export const studentRoutes = express.Router();
studentRoutes.use(protect);
studentRoutes.get('/stats',           allStaff,     studentCtrl.getStudentStats);
studentRoutes.post('/generate-roll-nos', adminOnly, studentCtrl.generateRollNumbers);
studentRoutes.get('/',                allStaff,     studentCtrl.getStudents);
studentRoutes.get('/:id',            allStaff,     studentCtrl.getStudentById);
studentRoutes.post('/',               adminOnly,    studentCtrl.createStudent);
studentRoutes.put('/:id',            adminOnly,    studentCtrl.updateStudent);
studentRoutes.put('/:id/activate',   adminOnly,    studentCtrl.activateStudent);
studentRoutes.put('/:id/status',     adminOnly,    studentCtrl.updateStatus);

// ── Class-Subject assignments ─────────────────────────────────────────────────
export const classSubjectRoutes = express.Router();
classSubjectRoutes.use(protect);
classSubjectRoutes.get('/available-subjects', adminOnly, csCtrl.getAvailableSubjectsForClass);
classSubjectRoutes.get('/teacher/:teacherId',        allStaff,  csCtrl.getTeacherClassSubjects);
classSubjectRoutes.get('/',                   allStaff,  csCtrl.getClassSubjects);
classSubjectRoutes.post('/',                  adminOnly, csCtrl.assignSubject);
classSubjectRoutes.put('/:id',               adminOnly, csCtrl.updateClassSubject);
classSubjectRoutes.delete('/:id',            adminOnly, csCtrl.removeSubject);

// ── Periods ───────────────────────────────────────────────────────────────────
export const periodRoutes = express.Router();
periodRoutes.use(protect);
periodRoutes.get('/',             allStaff,        periodCtrl.getPeriods);
periodRoutes.post('/generate',    timetableManagers, periodCtrl.generatePeriods);
periodRoutes.post('/',            timetableManagers, periodCtrl.createPeriod);
periodRoutes.put('/:id',         timetableManagers, periodCtrl.updatePeriod);
periodRoutes.delete('/:id',      timetableManagers, periodCtrl.deletePeriod);

// ── Timetable ─────────────────────────────────────────────────────────────────
export const timetableRoutes = express.Router();
timetableRoutes.use(protect);
timetableRoutes.get('/workload',              timetableViewers,  ttCtrl.getTeacherWorkload);
timetableRoutes.get('/conflicts/:academicYear', timetableManagers, ttCtrl.getConflicts);
timetableRoutes.get('/class/:classId',        timetableViewers,  ttCtrl.getClassTimetable);
timetableRoutes.get('/teacher/:teacherId',    timetableViewers,  ttCtrl.getTeacherTimetable);
timetableRoutes.post('/slot',                 timetableManagers, ttCtrl.upsertSlot);
timetableRoutes.put('/slot/:id',             timetableManagers, ttCtrl.updateSlot);
timetableRoutes.delete('/slot/:id',          timetableManagers, ttCtrl.deleteSlot);
timetableRoutes.delete('/class/:classId',    timetableManagers, ttCtrl.clearClassTimetable);
timetableRoutes.post('/auto-generate/:classId', timetableManagers, ttCtrl.autoGenerateTimetable);

// ── Substitutions ─────────────────────────────────────────────────────────────
export const substitutionRoutes = express.Router();
substitutionRoutes.use(protect);
substitutionRoutes.get('/today',        allStaff,         subCtrl.getTodaySummary);
substitutionRoutes.get('/suggest',      substitutionMgr,  subCtrl.suggestSubstitutes);
substitutionRoutes.get('/',             allStaff,         subCtrl.getSubstitutions);
substitutionRoutes.post('/',            substitutionMgr,  subCtrl.createSubstitution);
substitutionRoutes.delete('/:id',      substitutionMgr,  subCtrl.deleteSubstitution);
// Teacher leave
substitutionRoutes.get('/teacher-leaves',         allStaff,        subCtrl.getTeacherLeaves);
substitutionRoutes.post('/teacher-leaves',        teachingStaff,   subCtrl.createTeacherLeave);
substitutionRoutes.put('/teacher-leaves/:id',     substitutionMgr, subCtrl.updateTeacherLeaveStatus);

// ── Attendance ────────────────────────────────────────────────────────────────
export const attendanceRoutes = express.Router();
attendanceRoutes.use(protect);
attendanceRoutes.get('/student-summary', allStaff, attCtrl.getStudentAttendanceSummary);
attendanceRoutes.get('/',                allStaff, attCtrl.getAttendance);
attendanceRoutes.post('/',               teachingStaff, attCtrl.markAttendance);

// ── Fees ──────────────────────────────────────────────────────────────────────
export const feesRoutes = express.Router();
feesRoutes.use(protect);
feesRoutes.get('/structures',         allStaff,         feesCtrl.getStructures);
feesRoutes.post('/structures',        feeStructureStaff, feesCtrl.createStructure);
feesRoutes.put('/structures/:id',    feeStructureStaff, feesCtrl.updateStructure);
feesRoutes.delete('/structures/:id', feeStructureStaff, feesCtrl.deleteStructure);
feesRoutes.post('/assign',           feeAssignStaff,   feesCtrl.assignFees);
feesRoutes.get('/student',           allStaff,         feesCtrl.getStudentFees);
feesRoutes.post('/payment',          financeStaff,     feesCtrl.recordPayment);
feesRoutes.get('/payments',          financeStaff,     feesCtrl.getPayments);
feesRoutes.get('/ledger/:studentId', allStaff,         feesCtrl.getLedger);

// ── Leave ─────────────────────────────────────────────────────────────────────
export const leaveRoutes = express.Router();
leaveRoutes.use(protect);
leaveRoutes.get('/',         leaveReviewers, miscCtrl.getLeaves);
leaveRoutes.post('/',        protect,        miscCtrl.createLeave);
leaveRoutes.put('/:id',     leaveReviewers, miscCtrl.updateLeaveStatus);

// ── Outpass ───────────────────────────────────────────────────────────────────
export const outpassRoutes = express.Router();
outpassRoutes.use(protect);
outpassRoutes.get('/',       allStaff,  miscCtrl.getOutpasses);
outpassRoutes.post('/',      protect,   miscCtrl.createOutpass);
outpassRoutes.put('/:id',   allStaff,  miscCtrl.updateOutpassStatus);

// ── Circulars ─────────────────────────────────────────────────────────────────
export const circularRoutes = express.Router();
circularRoutes.use(protect);
circularRoutes.get('/',       protect, miscCtrl.getCirculars);
circularRoutes.post('/',      teachingStaff, miscCtrl.createCircular);
circularRoutes.delete('/:id', adminOnly, miscCtrl.deleteCircular);

// ── Homework ──────────────────────────────────────────────────────────────────
export const homeworkRoutes = express.Router();
homeworkRoutes.use(protect);
homeworkRoutes.get('/',       protect,        miscCtrl.getHomework);
homeworkRoutes.post('/',      teachingStaff,  miscCtrl.createHomework);
homeworkRoutes.delete('/:id', teachingStaff,  miscCtrl.deleteHomework);

// ── Exams ─────────────────────────────────────────────────────────────────────
export const examRoutes = express.Router();
examRoutes.use(protect);
examRoutes.get('/',           allStaff, miscCtrl.getExams);
examRoutes.post('/',          superAdminOnly, miscCtrl.createExam);
examRoutes.get('/schedule',   allStaff, miscCtrl.getExamSchedule);
examRoutes.post('/schedule',  superAdminOnly, miscCtrl.createExamSchedule);
examRoutes.post('/announce',  superAdminOnly, miscCtrl.announceExamSchedule);
examRoutes.get('/marks',      allStaff, miscCtrl.getMarks);
examRoutes.get('/report-card', allStaff, miscCtrl.getReportCard);
examRoutes.post('/marks',     teachingStaff, miscCtrl.saveMarks);

// ── Library ───────────────────────────────────────────────────────────────────
export const libraryRoutes = express.Router();
libraryRoutes.use(protect);
libraryRoutes.get('/books',      libStaff, miscCtrl.getBooks);
libraryRoutes.post('/books',     libStaff, miscCtrl.createBook);
libraryRoutes.put('/books/:id', libStaff, miscCtrl.updateBook);
libraryRoutes.get('/issues',    libStaff, miscCtrl.getIssues);
libraryRoutes.post('/issue',    libStaff, miscCtrl.issueBook);
libraryRoutes.put('/return/:id',libStaff, miscCtrl.returnBook);

// ── Inventory ─────────────────────────────────────────────────────────────────
export const inventoryRoutes = express.Router();
inventoryRoutes.use(protect);
inventoryRoutes.get('/',           inventoryStaff, miscCtrl.getInventory);
inventoryRoutes.post('/',          inventoryStaff, miscCtrl.createInventoryItem);
inventoryRoutes.post('/transaction', inventoryStaff, miscCtrl.recordInventoryTxn);

// ── Expense ───────────────────────────────────────────────────────────────────
export const expenseRoutes = express.Router();
expenseRoutes.use(protect);
expenseRoutes.get('/',  financeStaff, miscCtrl.getExpenses);
expenseRoutes.post('/', financeStaff, miscCtrl.createExpense);

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardRoutes = express.Router();
dashboardRoutes.use(protect);
dashboardRoutes.get('/',        allStaff, dashCtrl.getDashboard);
dashboardRoutes.get('/teacher', protect,  dashCtrl.getTeacherDashboard);

// ── Settings ──────────────────────────────────────────────────────────────────
export const settingsRoutes = express.Router();
settingsRoutes.use(protect);
settingsRoutes.get('/',                    protect,         settingsCtrl.getAppSettings);
settingsRoutes.put('/',                    settingsManagers, settingsCtrl.updateAppSettings);
settingsRoutes.put('/masters/:masterKey', settingsManagers, settingsCtrl.updateMasters);
