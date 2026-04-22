import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppSettingsProvider, useAppSettings } from './context/AppSettingsContext';

// Layouts
import AdminLayout from './components/layout/AdminLayout';
import OperatorLayout from './components/layout/OperatorLayout';
import StudentLayout from './components/layout/StudentLayout';
import ParentLayout from './components/layout/ParentLayout';

// Auth Pages
import Login from './pages/Login';
import OperatorLogin from './pages/OperatorLogin';
import StudentLogin from './pages/StudentLogin';
import ParentLogin from './pages/ParentLogin';
import NotFound from './pages/NotFound';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import Students from './pages/admin/Students';
import StudentDetail from './pages/admin/StudentDetail';
import AddStudent from './pages/admin/AddStudent';
import FeesStructure from './pages/admin/FeesStructure';
import AssignFees from './pages/admin/AssignFees';
import PaymentsAdmin from './pages/admin/PaymentsAdmin';
import FeesList from './pages/admin/FeesList';
import LeaveManagement from './pages/admin/LeaveManagement';
import CheckInOut from './pages/admin/CheckInOut';
import InventoryPage from './pages/admin/InventoryPage';
import { CircularsAdmin, CoursesPage, ExpensePage, LibraryAdmin, OutpassManagement, StaffManagement } from './pages/admin/AdminPages';
import LibraryDashboard from './pages/admin/LibraryDashboard';
import HostelWardenDashboard from './pages/admin/HostelWardenDashboard';
import ReportsPage from './pages/admin/ReportsPage';
import NotificationsPage from './pages/admin/NotificationsPage';
import SettingsPage from './pages/admin/SettingsPage';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentFees from './pages/student/StudentFees';
import StudentLedger from './pages/student/StudentLedger';
import StudentLeave from './pages/student/StudentLeave';
import StudentOutpass from './pages/student/StudentOutpass';
import StudentCirculars from './pages/student/StudentCirculars';
import StudentProfile from './pages/student/StudentProfile';
import StudentWallet from './pages/student/StudentWallet';

// Parent Pages
import ParentRegister from './pages/parent/ParentRegister';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentStudentView from './pages/parent/ParentStudentView';
import ParentFees from './pages/parent/ParentFees';
import ParentPayments from './pages/parent/ParentPayments';
import ParentLedger from './pages/parent/ParentLedger';
import ParentWallet from './pages/parent/ParentWallet';
import ParentLeave from './pages/parent/ParentLeave';
import ParentOutpass from './pages/parent/ParentOutpass';
import ParentCheckIn from './pages/parent/ParentCheckIn';
import ParentCirculars from './pages/parent/ParentCirculars';

import SetPassword from './pages/student/SetPassword';

import CanteenOperator from './pages/admin/CanteenOperator';
import ShopOperator from './pages/admin/ShopOperator';
import OperatorDashboard from './pages/operator/OperatorDashboard';
import OperatorReports from './pages/operator/OperatorReports';

import { FiAlertOctagon } from './components/common/icons';
import {
  getHomePathForRole,
  OPERATOR_ROLES,
  SHOP_CANTEEN_ADMIN_ROLES,
} from './utils/authRedirect';

// ── Loader ────────────────────────────────────────────────────────────────────
const Loader = () => (
  <div className="flex min-h-screen items-center justify-center bg-light-bg">
    <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary-200 border-t-primary-700" />
  </div>
);

// ── Protected Route ───────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, roles, capability, redirectTo = '/login' }) => {
  const { user, loading } = useAuth();
  const settings = useAppSettings();
  if (loading) return <Loader />;
  if (!user) return <Navigate to={redirectTo} replace />;
  if (settings?.loading && capability) return <Loader />;
  if (capability && !settings.can(capability, roles || []))
    return <Navigate to="/unauthorized" replace />;
  if (!capability && roles && !roles.includes(user.role))
    return <Navigate to="/unauthorized" replace />;
  return children;
};

const ADMIN_ROLES = [
  'super_admin', 'admin', 'class_teacher', 'hostel_warden', 'librarian',
  'accountant', 'admission_staff',
];

const RoleHomeRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={getHomePathForRole(user?.role)} replace />;
};

const AdminHome = () => {
  const { user } = useAuth();
  if (user?.role === 'class_teacher') {
    return <Navigate to="/admin/students" replace />;
  }
  if (user?.role === 'librarian') {
    return <Navigate to="/admin/library/dashboard" replace />;
  }
  if (user?.role === 'hostel_warden') {
    return <Navigate to="/admin/hostel/dashboard" replace />;
  }
  return <Dashboard />;
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppSettingsProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '4px',
                border: '1px solid #CED7E2',
                background: '#FFFFFF',
                color: '#182431',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
              },
            }}
          />
          <Routes>

          {/* ── Public Routes ─────────────────────────────────────────── */}
          <Route path="/login" element={<StudentLogin />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/operator/login" element={<OperatorLogin />} />
          <Route path="/parent/login" element={<ParentLogin />} />
          <Route path="/parent/register" element={<ParentRegister />} />
          <Route path="/unauthorized" element={
            <div className="public-page">
              <div className="public-panel flex min-h-[70vh] max-w-2xl flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center border border-red-200 bg-red-50 text-red-700">
                  <FiAlertOctagon className="text-4xl" />
                </div>
                <p className="institution-tag">Access Restricted</p>
                <p className="mt-4 text-3xl font-semibold text-text-primary sm:text-4xl">Access Denied</p>
                <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
                  Your account does not have permission to open this page. Return to the public login screen and continue from there.
                </p>
                <Link to="/login" className="btn-primary mt-6 px-6 py-3">
                  Go to Login
                </Link>
              </div>
            </div>
          } />

          {/* ── Admin Routes ──────────────────────────────────────────── */}
          <Route path="/admin" element={
            <ProtectedRoute roles={ADMIN_ROLES} redirectTo="/admin/login">
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminHome />} />
            <Route path="students" element={<Students />} />
            <Route path="students/add" element={
              <ProtectedRoute capability="admin_students_create" roles={['super_admin', 'admin', 'admission_staff']}>
                <AddStudent />
              </ProtectedRoute>
            } />
            <Route path="students/:id/edit" element={
              <ProtectedRoute capability="admin_students_edit" roles={['super_admin', 'admin', 'admission_staff', 'class_teacher']}>
                <AddStudent />
              </ProtectedRoute>
            } />
            <Route path="students/:id" element={<StudentDetail />} />
            <Route path="fees/structure" element={
              <ProtectedRoute capability="admin_fee_structure_manage" roles={['super_admin', 'admin']}>
                <FeesStructure />
              </ProtectedRoute>
            } />
            <Route path="fees/assign" element={
              <ProtectedRoute capability="admin_fee_assign" roles={['super_admin', 'admin']}>
                <AssignFees />
              </ProtectedRoute>
            } />
            <Route path="fees/list" element={
              <ProtectedRoute capability="admin_fees_list_view" roles={['super_admin', 'admin', 'accountant']}>
                <FeesList />
              </ProtectedRoute>
            } />
            <Route path="payments" element={
              <ProtectedRoute capability="admin_payments_view" roles={['super_admin', 'admin', 'accountant']}>
                <PaymentsAdmin />
              </ProtectedRoute>
            } />
            <Route path="leave" element={
              <ProtectedRoute capability="admin_leave_manage" roles={['super_admin', 'admin', 'class_teacher', 'hostel_warden']}>
                <LeaveManagement />
              </ProtectedRoute>
            } />
            <Route path="outpass" element={
              <ProtectedRoute capability="admin_outpass_manage" roles={['super_admin', 'admin', 'class_teacher', 'hostel_warden']}>
                <OutpassManagement />
              </ProtectedRoute>
            } />
            <Route path="checkin" element={
              <ProtectedRoute capability="admin_checkin_manage" roles={['super_admin', 'admin', 'hostel_warden', 'class_teacher']}>
                <CheckInOut />
              </ProtectedRoute>
            } />
            <Route path="inventory" element={
              <ProtectedRoute capability="admin_inventory_manage" roles={['super_admin', 'admin']}>
                <InventoryPage />
              </ProtectedRoute>
            } />
            <Route path="expense" element={
              <ProtectedRoute capability="admin_expense_manage" roles={['super_admin', 'admin', 'accountant']}>
                <ExpensePage />
              </ProtectedRoute>
            } />
            <Route path="circulars" element={
              <ProtectedRoute capability="admin_circular_manage" roles={['super_admin', 'admin', 'class_teacher']}>
                <CircularsAdmin />
              </ProtectedRoute>
            } />
            <Route path="library/dashboard" element={
              <ProtectedRoute capability="admin_library_dashboard" roles={['librarian']}>
                <LibraryDashboard />
              </ProtectedRoute>
            } />
            <Route path="library" element={
              <ProtectedRoute capability="admin_library_manage" roles={['super_admin', 'admin', 'librarian']}>
                <LibraryAdmin />
              </ProtectedRoute>
            } />
            <Route path="hostel/dashboard" element={
              <ProtectedRoute capability="admin_dashboard" roles={['hostel_warden']}>
                <HostelWardenDashboard />
              </ProtectedRoute>
            } />
            <Route path="staff" element={
              <ProtectedRoute capability="admin_staff_manage" roles={['super_admin']}>
                <StaffManagement />
              </ProtectedRoute>
            } />
            <Route path="courses" element={
              <ProtectedRoute capability="admin_courses_manage" roles={['super_admin']}>
                <CoursesPage />
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute capability="admin_reports_view" roles={['super_admin', 'admin', 'accountant']}>
                <ReportsPage />
              </ProtectedRoute>
            } />
            <Route path="notifications" element={
              <ProtectedRoute capability="admin_notifications_view" roles={['super_admin', 'admin', 'class_teacher', 'hostel_warden', 'librarian', 'accountant', 'admission_staff']}>
                <NotificationsPage />
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute capability="admin_settings_manage" roles={['super_admin', 'admin']}>
                <SettingsPage />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="/operator" element={
            <ProtectedRoute roles={OPERATOR_ROLES} redirectTo="/operator/login">
              <OperatorLayout />
            </ProtectedRoute>
          }>
            <Route index element={<RoleHomeRedirect />} />
            <Route path="dashboard" element={
              <ProtectedRoute capability="operator_dashboard_view" roles={SHOP_CANTEEN_ADMIN_ROLES} redirectTo="/operator/login">
                <OperatorDashboard />
              </ProtectedRoute>
            } />
            <Route path="shop" element={
              <ProtectedRoute capability="operator_shop_view" roles={['shop_operator', ...SHOP_CANTEEN_ADMIN_ROLES]} redirectTo="/operator/login">
                <ShopOperator />
              </ProtectedRoute>
            } />
            <Route path="canteen" element={
              <ProtectedRoute capability="operator_canteen_view" roles={['canteen_operator', ...SHOP_CANTEEN_ADMIN_ROLES]} redirectTo="/operator/login">
                <CanteenOperator />
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute capability="operator_reports_view" roles={SHOP_CANTEEN_ADMIN_ROLES} redirectTo="/operator/login">
                <OperatorReports />
              </ProtectedRoute>
            } />
          </Route>

          {/* ── Student Routes ────────────────────────────────────────── */}
          <Route path="/student" element={
            <ProtectedRoute roles={['student']}>
              <StudentLayout />
            </ProtectedRoute>
          }>
            <Route index element={<StudentDashboard />} />
            <Route path="set-password" element={<SetPassword />} />   {/* ← add this */}
            <Route path="fees" element={<StudentFees />} />
            <Route path="ledger" element={<StudentLedger />} />
            <Route path="leave" element={<StudentLeave />} />
            <Route path="outpass" element={<StudentOutpass />} />
            <Route path="circulars" element={<StudentCirculars />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="wallet" element={<StudentWallet />} />
          </Route>

          {/* ── Parent Routes ─────────────────────────────────────────── */}
          <Route path="/parent" element={
            <ProtectedRoute roles={['parent']} redirectTo="/parent/login">
              <ParentLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ParentDashboard />} />
            <Route path="student" element={<ParentStudentView />} />
            <Route path="fees" element={<ParentFees />} />
            <Route path="payments" element={<ParentPayments />} />
            <Route path="ledger" element={<ParentLedger />} />
            <Route path="wallet" element={<ParentWallet />} />
            <Route path="leave" element={<ParentLeave />} />
            <Route path="outpass" element={<ParentOutpass />} />
            <Route path="checkin" element={<ParentCheckIn />} />
            <Route path="circulars" element={<ParentCirculars />} />
          </Route>

          {/* ── Fallback ──────────────────────────────────────────────── */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />

          </Routes>
        </BrowserRouter>
      </AppSettingsProvider>
    </AuthProvider>
  );
}
