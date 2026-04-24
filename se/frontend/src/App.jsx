import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import ParentLayout from './components/layout/ParentLayout.jsx';
import StudentLayout from './components/layout/StudentLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ParentRegisterPage from './pages/ParentRegisterPage.jsx';
import ParentPortalPage from './pages/ParentPortalPage.jsx';
import StudentPortalPage from './pages/StudentPortalPage.jsx';
import {
  PortalAttendancePage,
  PortalCircularsPage,
  PortalExamsPage,
  PortalFeesPage,
  PortalHomeworkPage,
  PortalLeavesPage,
  PortalLibraryPage,
  PortalStudentProfilePage,
  PortalTimetablePage,
} from './pages/portal/PortalModulePages.jsx';

// Admin pages
import DashboardPage from './pages/admin/DashboardPage.jsx';
import StudentsPage from './pages/admin/StudentsPage.jsx';
import NewAdmissionPage from './pages/admin/NewAdmissionPage.jsx';
import StudentProfilePage from './pages/admin/StudentProfilePage.jsx';
import StudentEditPage from './pages/admin/StudentEditPage.jsx';
import ClassesPage from './pages/admin/ClassesPage.jsx';
import SubjectsPage from './pages/admin/SubjectsPage.jsx';
import TeachersPage from './pages/admin/TeachersPage.jsx';
import SubjectAllocationPage from './pages/admin/SubjectAllocationPage.jsx';
import TimetablePage from './pages/admin/TimetablePage.jsx';
import TeacherTimetablePage from './pages/admin/TeacherTimetablePage.jsx';
import PeriodsPage from './pages/admin/PeriodsPage.jsx';
import WorkloadPage from './pages/admin/WorkloadPage.jsx';
import SubstitutionsPage from './pages/admin/SubstitutionsPage.jsx';
import AttendancePage from './pages/admin/AttendancePage.jsx';
import LeavePage from './pages/admin/LeavePage.jsx';
import { FeeStructuresPage, AssignFeesPage, FeesListPage } from './pages/admin/FeesPages.jsx';
import { LibraryPage, CircularsPage, ExpensesPage } from './pages/admin/MiscPages.jsx';
import HomeworkPage from './pages/admin/HomeworkPage.jsx';
import ExamsPage from './pages/admin/ExamsPage.jsx';
import ExamSchedulePage from './pages/admin/ExamSchedulePage.jsx';
import ReportCardsPage from './pages/admin/ReportCardsPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';
import StaffPage from './pages/admin/StaffPage.jsx';
import UnderConstructionPage from './pages/admin/UnderConstructionPage.jsx';
import UnauthorizedPage from './pages/admin/UnauthorizedPage.jsx';
import { ACCESS, ROLES, SETTINGS_MANAGERS, STAFF_MANAGERS, STAFF_ROLES } from './utils/roleAccess.js';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  const homeRoute = user
    ? (user.role === 'student' ? '/student' : user.role === 'parent' ? '/parent' : '/admin')
    : '/login';

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage portalType="chooser" /> : <Navigate to={homeRoute} replace />} />
      <Route path="/login/admin" element={!user ? <LoginPage portalType="admin" /> : <Navigate to={homeRoute} replace />} />
      <Route path="/login/student" element={!user ? <LoginPage portalType="student" /> : <Navigate to={homeRoute} replace />} />
      <Route path="/login/parent" element={!user ? <LoginPage portalType="parent" /> : <Navigate to={homeRoute} replace />} />
      <Route path="/register/parent" element={!user ? <ParentRegisterPage /> : <Navigate to={homeRoute} replace />} />

      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={STAFF_ROLES}><AdminLayout /></ProtectedRoute>
      }>
        <Route index element={<ProtectedRoute allowedRoles={ACCESS.dashboard}><DashboardPage /></ProtectedRoute>} />

        <Route path="students" element={<ProtectedRoute allowedRoles={ACCESS.students_view}><StudentsPage /></ProtectedRoute>} />
        <Route path="students/new" element={<ProtectedRoute allowedRoles={ACCESS.students_manage}><NewAdmissionPage /></ProtectedRoute>} />
        <Route path="students/:id" element={<ProtectedRoute allowedRoles={ACCESS.students_view}><StudentProfilePage /></ProtectedRoute>} />
        <Route path="students/:id/edit" element={<ProtectedRoute allowedRoles={ACCESS.students_manage}><StudentEditPage /></ProtectedRoute>} />

        <Route path="classes" element={<ProtectedRoute allowedRoles={ACCESS.classes}><ClassesPage /></ProtectedRoute>} />
        <Route path="subjects" element={<ProtectedRoute allowedRoles={ACCESS.subjects}><SubjectsPage /></ProtectedRoute>} />
        <Route path="teachers" element={<ProtectedRoute allowedRoles={ACCESS.teachers}><TeachersPage /></ProtectedRoute>} />
        <Route path="class-subjects" element={<ProtectedRoute allowedRoles={ACCESS.subject_allocation}><SubjectAllocationPage /></ProtectedRoute>} />

        <Route path="timetable" element={<ProtectedRoute allowedRoles={ACCESS.timetable_manage}><TimetablePage /></ProtectedRoute>} />
        <Route path="timetable/teacher" element={<ProtectedRoute allowedRoles={ACCESS.timetable_view}><TeacherTimetablePage /></ProtectedRoute>} />
        <Route path="timetable/periods" element={<ProtectedRoute allowedRoles={ACCESS.timetable_manage}><PeriodsPage /></ProtectedRoute>} />
        <Route path="timetable/workload" element={<ProtectedRoute allowedRoles={ACCESS.timetable_view}><WorkloadPage /></ProtectedRoute>} />
        <Route path="substitutions" element={<ProtectedRoute allowedRoles={ACCESS.substitutions}><SubstitutionsPage /></ProtectedRoute>} />

        <Route path="attendance" element={<ProtectedRoute allowedRoles={ACCESS.attendance}><AttendancePage /></ProtectedRoute>} />
        <Route path="leave" element={<ProtectedRoute allowedRoles={ACCESS.leave}><LeavePage /></ProtectedRoute>} />
        <Route path="outpass" element={<UnderConstructionPage title="Outpass" description="Student outpass approvals and gate-pass tracking need a dedicated workflow before release." />} />

        <Route path="exams" element={<ProtectedRoute allowedRoles={ACCESS.exams}><ExamsPage /></ProtectedRoute>} />
        <Route path="exam-schedule" element={<ProtectedRoute allowedRoles={ACCESS.exams}><ExamSchedulePage /></ProtectedRoute>} />
        <Route path="homework" element={<ProtectedRoute allowedRoles={ACCESS.homework}><HomeworkPage /></ProtectedRoute>} />
        <Route path="report-cards" element={<ProtectedRoute allowedRoles={ACCESS.report_cards}><ReportCardsPage /></ProtectedRoute>} />

        <Route path="fees/structures" element={<ProtectedRoute allowedRoles={ACCESS.fees_structure}><FeeStructuresPage /></ProtectedRoute>} />
        <Route path="fees/assign" element={<ProtectedRoute allowedRoles={ACCESS.fees_assign}><AssignFeesPage /></ProtectedRoute>} />
        <Route path="fees/list" element={<ProtectedRoute allowedRoles={ACCESS.fees_list}><FeesListPage /></ProtectedRoute>} />
        <Route path="fees/payments" element={<ProtectedRoute allowedRoles={ACCESS.payments}><FeesListPage /></ProtectedRoute>} />
        <Route path="expenses" element={<ProtectedRoute allowedRoles={ACCESS.expenses}><ExpensesPage /></ProtectedRoute>} />

        <Route path="library" element={<ProtectedRoute allowedRoles={ACCESS.library}><LibraryPage /></ProtectedRoute>} />
        <Route path="inventory" element={<UnderConstructionPage title="Inventory" description="Inventory item tracking and stock transactions still need a complete production workflow." />} />
        <Route path="circulars" element={<ProtectedRoute allowedRoles={ACCESS.circulars}><CircularsPage /></ProtectedRoute>} />

        <Route path="staff" element={<ProtectedRoute allowedRoles={STAFF_MANAGERS}><StaffPage /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute allowedRoles={SETTINGS_MANAGERS}><SettingsPage /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute allowedRoles={ACCESS.reports}><ReportCardsPage /></ProtectedRoute>} />
      </Route>

      <Route path="/student" element={
        <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
          <StudentLayout />
        </ProtectedRoute>
      }>
        <Route index element={<StudentPortalPage />} />
        <Route path="profile" element={<PortalStudentProfilePage viewerLabel="My Profile" />} />
        <Route path="fees" element={<PortalFeesPage />} />
        <Route path="attendance" element={<PortalAttendancePage />} />
        <Route path="timetable" element={<PortalTimetablePage />} />
        <Route path="exams" element={<PortalExamsPage />} />
        <Route path="homework" element={<PortalHomeworkPage />} />
        <Route path="circulars" element={<PortalCircularsPage />} />
        <Route path="library" element={<PortalLibraryPage />} />
        <Route path="leave" element={<PortalLeavesPage />} />
      </Route>

      <Route path="/parent" element={
        <ProtectedRoute allowedRoles={[ROLES.PARENT]}>
          <ParentLayout />
        </ProtectedRoute>
      }>
        <Route index element={<ParentPortalPage />} />
        <Route path="student" element={<PortalStudentProfilePage viewerLabel="My Child" />} />
        <Route path="fees" element={<PortalFeesPage />} />
        <Route path="attendance" element={<PortalAttendancePage />} />
        <Route path="timetable" element={<PortalTimetablePage />} />
        <Route path="marks" element={<PortalExamsPage />} />
        <Route path="homework" element={<PortalHomeworkPage />} />
        <Route path="updates" element={<PortalCircularsPage />} />
        <Route path="library" element={<PortalLibraryPage />} />
        <Route path="leave" element={<PortalLeavesPage />} />
      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/" element={<Navigate to={homeRoute} replace />} />
      <Route path="*" element={<Navigate to={homeRoute} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
