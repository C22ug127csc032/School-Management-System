import React from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppSettingsProvider, useAppSettings } from './context/AppSettingsContext';

import AdminLayout from './components/layout/AdminLayout';
import OperatorLayout from './components/layout/OperatorLayout';
import StudentLayout from './components/layout/StudentLayout';
import ParentLayout from './components/layout/ParentLayout';
import EmatixLayout from './components/layout/EmatixLayout';

import Login from './pages/Login';
import OperatorLogin from './pages/OperatorLogin';
import StudentLogin from './pages/StudentLogin';
import ParentLogin from './pages/ParentLogin';
import ParentRegister from './pages/parent/ParentRegister';
import NotFound from './pages/NotFound';
import EmatixLogin from './pages/EmatixLogin';
import EmatixVerifyEmail from './pages/EmatixVerifyEmail';
import InstitutionSignup from './pages/InstitutionSignup';

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

import StudentDashboard from './pages/student/StudentDashboard';
import StudentFees from './pages/student/StudentFees';
import StudentLedger from './pages/student/StudentLedger';
import StudentLeave from './pages/student/StudentLeave';
import StudentOutpass from './pages/student/StudentOutpass';
import StudentCirculars from './pages/student/StudentCirculars';
import StudentProfile from './pages/student/StudentProfile';
import StudentWallet from './pages/student/StudentWallet';

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

import PlatformOverview from './pages/platform/PlatformOverview';
import PlatformInstitutions from './pages/platform/PlatformInstitutions';
import PlatformAuditLogs from './pages/platform/PlatformAuditLogs';
import PlatformLandingPage from './pages/platform/PlatformLandingPage';
import LandingPage from './pages/LandingPage';
import TenantSubscriptionPage from './pages/TenantSubscriptionPage';

import { FiAlertOctagon } from './components/common/icons';
import {
  buildScopedLoginPath,
  buildScopedTenantPath,
  getHomePathForRole,
  getLoginPathForRole,
  getPlanPath,
  getUpgradePath,
  OPERATOR_ROLES,
  SHOP_CANTEEN_ADMIN_ROLES,
} from './utils/authRedirect';
import { getStoredInstitutionPortalKey } from './utils/tenant';

const Loader = () => (
  <div className="flex min-h-screen items-center justify-center bg-light-bg">
    <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary-200 border-t-primary-700" />
  </div>
);

const GENERIC_TENANT_PREFIXES = ['/admin', '/operator', '/student', '/parent', '/plan', '/upgrade'];

const CanonicalTenantRouteGuard = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (loading || !user || user.platformRole === 'ematix_master_admin') {
      return;
    }

    const portalKey = user.institutionPortalKey || user.institutionSlug || getStoredInstitutionPortalKey();
    if (!portalKey) {
      return;
    }

    const pathname = location.pathname || '';
    const alreadyScoped = pathname === `/${portalKey}` || pathname.startsWith(`/${portalKey}/`);
    const isGenericTenantPath = GENERIC_TENANT_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));

    if (!alreadyScoped && isGenericTenantPath) {
      navigate(
        `${buildScopedTenantPath(pathname, portalKey)}${location.search || ''}${location.hash || ''}`,
        { replace: true }
      );
    }
  }, [loading, location.hash, location.pathname, location.search, navigate, user]);

  return null;
};

const UpgradeRequired = () => {
  const { user } = useAuth();
  const { institution, subscription, usageFor, limitFor } = useAppSettings();
  const portalKey = institution?.portalKey || user?.institutionPortalKey || user?.institutionSlug || '';
  const usageItems = [
    { key: 'students', label: 'Students' },
    { key: 'staffAccounts', label: 'Staff' },
    { key: 'operatorAccounts', label: 'Operators' },
  ]
    .map(item => ({
      ...item,
      used: usageFor(item.key),
      limit: limitFor(item.key),
    }))
    .filter(item => item.limit !== null && item.limit !== undefined);

  const trialDaysRemaining = subscription?.trialEndDate
    ? Math.max(
      Math.ceil(
        (new Date(subscription.trialEndDate).setHours(0, 0, 0, 0)
          - new Date(new Date().setHours(0, 0, 0, 0)))
          / (24 * 60 * 60 * 1000)
      ),
      0
    )
    : null;

  return (
    <div className="public-page">
      <div className="public-panel flex min-h-[70vh] max-w-2xl flex-col items-center justify-center text-center">
        <p className="institution-tag">Subscription Required</p>
        <p className="mt-4 text-3xl font-semibold text-text-primary sm:text-4xl">Upgrade Needed</p>
        <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
          This feature is not available in the current plan. Upgrade or request a manual Ematix override to continue.
        </p>
        {subscription?.plan?.label ? (
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-primary-700">
            Current plan: {subscription.plan.label}
          </p>
        ) : null}
        {institution?.name ? (
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-text-secondary">
            Institution: {institution.name}
          </p>
        ) : null}
        {subscription?.status === 'trialing' && trialDaysRemaining !== null ? (
          <p className="mt-2 text-sm text-amber-700">
            Trial remaining: <span className="font-semibold">{trialDaysRemaining} day(s)</span>
          </p>
        ) : null}
        {usageItems.length ? (
          <div className="mt-6 grid w-full gap-3 text-left">
            {usageItems.map(item => {
              const width = item.limit > 0 ? Math.min((item.used / item.limit) * 100, 100) : 0;
              return (
                <div key={item.key} className="border border-border bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
                    <span>{item.label}</span>
                    <span>{item.used} / {item.limit}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden bg-white">
                    <div
                      className={`${width >= 90 ? 'bg-amber-500' : 'bg-primary-700'} h-full`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        <Link to={getLoginPathForRole(user?.role, portalKey)} className="btn-primary mt-6 px-6 py-3">
          Go to Login
        </Link>
      </div>
    </div>
  );
};

const ProtectedRoute = ({
  children,
  roles,
  capability,
  featureKey,
  redirectTo = '/login',
  platformOnly = false,
}) => {
  const { user, loading } = useAuth();
  const settings = useAppSettings();
  const storedPortalKey = getStoredInstitutionPortalKey();

  const resolveRedirectPath = path => {
    if (!storedPortalKey) return path;
    if (path === '/admin/login') return buildScopedLoginPath('admin', storedPortalKey);
    if (path === '/operator/login') return buildScopedLoginPath('operator', storedPortalKey);
    if (path === '/parent/login') return buildScopedLoginPath('parent', storedPortalKey);
    if (path === '/login') return buildScopedLoginPath('student', storedPortalKey);
    if (path === '/plan') return getPlanPath(storedPortalKey);
    if (path === '/upgrade') return getUpgradePath(storedPortalKey);
    return path;
  };

  if (loading) return <Loader />;
  if (!user) return <Navigate to={resolveRedirectPath(redirectTo)} replace />;

  if (platformOnly) {
    return user.platformRole === 'ematix_master_admin'
      ? children
      : <Navigate to="/unauthorized" replace />;
  }

  if (user.platformRole === 'ematix_master_admin') {
    return <Navigate to="/ematix" replace />;
  }

  if (settings?.loading && (capability || featureKey)) return <Loader />;
  if (featureKey && !settings.hasFeature(featureKey)) {
    return <Navigate to={resolveRedirectPath('/upgrade')} replace />;
  }
  if (capability && !settings.can(capability, roles || [])) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (!capability && roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

const ADMIN_ROLES = [
  'institution_owner', 'super_admin', 'admin', 'class_teacher', 'hostel_warden', 'librarian',
  'accountant', 'admission_staff',
];

const RoleHomeRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={getHomePathForRole(user?.role, user?.institutionPortalKey || user?.institutionSlug || '')} replace />;
};

const AdminHome = () => {
  const { user } = useAuth();
  const portalKey = user?.institutionPortalKey || user?.institutionSlug || '';
  if (user?.role === 'class_teacher') return <Navigate to={buildScopedTenantPath('/admin/students', portalKey)} replace />;
  if (user?.role === 'librarian') return <Navigate to={buildScopedTenantPath('/admin/library/dashboard', portalKey)} replace />;
  if (user?.role === 'hostel_warden') return <Navigate to={buildScopedTenantPath('/admin/hostel/dashboard', portalKey)} replace />;
  return <Dashboard />;
};

const UnauthorizedPage = () => (
  <div className="public-page">
    <div className="public-panel flex min-h-[70vh] max-w-2xl flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center border border-red-200 bg-red-50 text-red-700">
        <FiAlertOctagon className="text-4xl" />
      </div>
      <p className="institution-tag">Access Restricted</p>
      <p className="mt-4 text-3xl font-semibold text-text-primary sm:text-4xl">Access Denied</p>
      <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
        Your account does not have permission to open this page. Return to the correct portal and continue from there.
      </p>
      <Link to={buildScopedLoginPath('student', getStoredInstitutionPortalKey())} className="btn-primary mt-6 px-6 py-3">
        Go to Login
      </Link>
    </div>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <AppSettingsProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <CanonicalTenantRouteGuard />
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
            <Route path="/login" element={<StudentLogin />} />
            <Route path="/admin/login" element={<Login />} />
            <Route path="/operator/login" element={<OperatorLogin />} />
            <Route path="/parent/login" element={<ParentLogin />} />
            <Route path="/parent/register" element={<ParentRegister />} />

            <Route path="/:portalKey/student/login" element={<StudentLogin />} />
            <Route path="/:portalKey/admin/login" element={<Login />} />
            <Route path="/:portalKey/operator/login" element={<OperatorLogin />} />
            <Route path="/:portalKey/parent/login" element={<ParentLogin />} />
            <Route path="/:portalKey/parent/register" element={<ParentRegister />} />

            <Route path="/i/:slug/student/login" element={<StudentLogin />} />
            <Route path="/i/:slug/admin/login" element={<Login />} />
            <Route path="/i/:slug/operator/login" element={<OperatorLogin />} />
            <Route path="/i/:slug/parent/login" element={<ParentLogin />} />
            <Route path="/i/:slug/parent/register" element={<ParentRegister />} />

            <Route path="/ematix/login" element={<EmatixLogin />} />
            <Route path="/ematix/signup" element={<Navigate to="/trial" replace />} />
            <Route path="/trial" element={<InstitutionSignup />} />
            <Route path="/ematix/verify-email" element={<EmatixVerifyEmail />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route
              path="/upgrade"
              element={(
                <ProtectedRoute roles={[...ADMIN_ROLES, ...OPERATOR_ROLES, 'student', 'parent']} redirectTo="/login">
                  <UpgradeRequired />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/plan"
              element={(
                <ProtectedRoute roles={['institution_owner']} redirectTo="/admin/login">
                  <TenantSubscriptionPage mode="plan" />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/:portalKey/plan"
              element={(
                <ProtectedRoute roles={['institution_owner']} redirectTo="/admin/login">
                  <TenantSubscriptionPage mode="plan" />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/:portalKey/upgrade"
              element={(
                <ProtectedRoute roles={[...ADMIN_ROLES, ...OPERATOR_ROLES, 'student', 'parent']} redirectTo="/admin/login">
                  <UpgradeRequired />
                </ProtectedRoute>
              )}
            />

            <Route
              path="/ematix"
              element={(
                <ProtectedRoute platformOnly redirectTo="/ematix/login">
                  <EmatixLayout />
                </ProtectedRoute>
              )}
            >
              <Route index element={<PlatformOverview />} />
              <Route path="landing-page" element={<PlatformLandingPage />} />
              <Route path="institutions" element={<PlatformInstitutions />} />
              <Route path="audit-logs" element={<PlatformAuditLogs />} />
            </Route>

            <Route
              path="/admin"
              element={(
                <ProtectedRoute roles={ADMIN_ROLES} redirectTo="/admin/login">
                  <AdminLayout />
                </ProtectedRoute>
              )}
            >
              <Route index element={<AdminHome />} />
              <Route path="students" element={<ProtectedRoute featureKey="student_management"><Students /></ProtectedRoute>} />
              <Route path="students/add" element={<ProtectedRoute featureKey="student_management" capability="admin_students_create" roles={['institution_owner', 'admin', 'admission_staff']}><AddStudent /></ProtectedRoute>} />
              <Route path="students/:id/edit" element={<ProtectedRoute featureKey="student_management" capability="admin_students_edit" roles={['institution_owner', 'admin', 'admission_staff', 'class_teacher']}><AddStudent /></ProtectedRoute>} />
              <Route path="students/:id" element={<ProtectedRoute featureKey="student_management"><StudentDetail /></ProtectedRoute>} />
              <Route path="fees/structure" element={<ProtectedRoute featureKey="finance" capability="admin_fee_structure_manage" roles={['institution_owner', 'admin']}><FeesStructure /></ProtectedRoute>} />
              <Route path="fees/assign" element={<ProtectedRoute featureKey="finance" capability="admin_fee_assign" roles={['institution_owner', 'admin']}><AssignFees /></ProtectedRoute>} />
              <Route path="fees/list" element={<ProtectedRoute featureKey="finance" capability="admin_fees_list_view" roles={['institution_owner', 'admin', 'accountant']}><FeesList /></ProtectedRoute>} />
              <Route path="payments" element={<ProtectedRoute featureKey="finance" capability="admin_payments_view" roles={['institution_owner', 'admin', 'accountant']}><PaymentsAdmin /></ProtectedRoute>} />
              <Route path="leave" element={<ProtectedRoute featureKey="hostel_leave" capability="admin_leave_manage" roles={['institution_owner', 'admin', 'class_teacher', 'hostel_warden']}><LeaveManagement /></ProtectedRoute>} />
              <Route path="outpass" element={<ProtectedRoute featureKey="hostel_leave" capability="admin_outpass_manage" roles={['institution_owner', 'admin', 'class_teacher', 'hostel_warden']}><OutpassManagement /></ProtectedRoute>} />
              <Route path="checkin" element={<ProtectedRoute featureKey="hostel_checkin" capability="admin_checkin_manage" roles={['institution_owner', 'admin', 'hostel_warden', 'class_teacher']}><CheckInOut /></ProtectedRoute>} />
              <Route path="inventory" element={<ProtectedRoute featureKey="inventory" capability="admin_inventory_manage" roles={['institution_owner', 'admin']}><InventoryPage /></ProtectedRoute>} />
              <Route path="expense" element={<ProtectedRoute featureKey="expense" capability="admin_expense_manage" roles={['institution_owner', 'admin', 'accountant']}><ExpensePage /></ProtectedRoute>} />
              <Route path="circulars" element={<ProtectedRoute featureKey="circulars_notifications" capability="admin_circular_manage" roles={['institution_owner', 'admin', 'class_teacher']}><CircularsAdmin /></ProtectedRoute>} />
              <Route path="library/dashboard" element={<ProtectedRoute featureKey="library" capability="admin_library_dashboard" roles={['librarian']}><LibraryDashboard /></ProtectedRoute>} />
              <Route path="library" element={<ProtectedRoute featureKey="library" capability="admin_library_manage" roles={['institution_owner', 'admin', 'librarian']}><LibraryAdmin /></ProtectedRoute>} />
              <Route path="hostel/dashboard" element={<ProtectedRoute featureKey="hostel_checkin" capability="admin_dashboard" roles={['hostel_warden']}><HostelWardenDashboard /></ProtectedRoute>} />
              <Route path="staff" element={<ProtectedRoute featureKey="staff_roles" capability="admin_staff_manage" roles={['institution_owner']}><StaffManagement /></ProtectedRoute>} />
              <Route path="courses" element={<ProtectedRoute featureKey="academic" capability="admin_courses_manage" roles={['institution_owner']}><CoursesPage /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute featureKey="reports" capability="admin_reports_view" roles={['institution_owner', 'admin', 'accountant']}><ReportsPage /></ProtectedRoute>} />
              <Route path="notifications" element={<ProtectedRoute featureKey="circulars_notifications" capability="admin_notifications_view" roles={['institution_owner', 'admin', 'class_teacher', 'hostel_warden', 'librarian', 'accountant', 'admission_staff']}><NotificationsPage /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute featureKey="settings" capability="admin_settings_manage" roles={['institution_owner', 'admin']}><SettingsPage /></ProtectedRoute>} />
            </Route>
            <Route
              path="/:portalKey/admin"
              element={(
                <ProtectedRoute roles={ADMIN_ROLES} redirectTo="/admin/login">
                  <AdminLayout />
                </ProtectedRoute>
              )}
            >
              <Route index element={<AdminHome />} />
              <Route path="students" element={<ProtectedRoute featureKey="student_management"><Students /></ProtectedRoute>} />
              <Route path="students/add" element={<ProtectedRoute featureKey="student_management" capability="admin_students_create" roles={['institution_owner', 'admin', 'admission_staff']}><AddStudent /></ProtectedRoute>} />
              <Route path="students/:id/edit" element={<ProtectedRoute featureKey="student_management" capability="admin_students_edit" roles={['institution_owner', 'admin', 'admission_staff', 'class_teacher']}><AddStudent /></ProtectedRoute>} />
              <Route path="students/:id" element={<ProtectedRoute featureKey="student_management"><StudentDetail /></ProtectedRoute>} />
              <Route path="fees/structure" element={<ProtectedRoute featureKey="finance" capability="admin_fee_structure_manage" roles={['institution_owner', 'admin']}><FeesStructure /></ProtectedRoute>} />
              <Route path="fees/assign" element={<ProtectedRoute featureKey="finance" capability="admin_fee_assign" roles={['institution_owner', 'admin']}><AssignFees /></ProtectedRoute>} />
              <Route path="fees/list" element={<ProtectedRoute featureKey="finance" capability="admin_fees_list_view" roles={['institution_owner', 'admin', 'accountant']}><FeesList /></ProtectedRoute>} />
              <Route path="payments" element={<ProtectedRoute featureKey="finance" capability="admin_payments_view" roles={['institution_owner', 'admin', 'accountant']}><PaymentsAdmin /></ProtectedRoute>} />
              <Route path="leave" element={<ProtectedRoute featureKey="hostel_leave" capability="admin_leave_manage" roles={['institution_owner', 'admin', 'class_teacher', 'hostel_warden']}><LeaveManagement /></ProtectedRoute>} />
              <Route path="outpass" element={<ProtectedRoute featureKey="hostel_leave" capability="admin_outpass_manage" roles={['institution_owner', 'admin', 'class_teacher', 'hostel_warden']}><OutpassManagement /></ProtectedRoute>} />
              <Route path="checkin" element={<ProtectedRoute featureKey="hostel_checkin" capability="admin_checkin_manage" roles={['institution_owner', 'admin', 'hostel_warden', 'class_teacher']}><CheckInOut /></ProtectedRoute>} />
              <Route path="inventory" element={<ProtectedRoute featureKey="inventory" capability="admin_inventory_manage" roles={['institution_owner', 'admin']}><InventoryPage /></ProtectedRoute>} />
              <Route path="expense" element={<ProtectedRoute featureKey="expense" capability="admin_expense_manage" roles={['institution_owner', 'admin', 'accountant']}><ExpensePage /></ProtectedRoute>} />
              <Route path="circulars" element={<ProtectedRoute featureKey="circulars_notifications" capability="admin_circular_manage" roles={['institution_owner', 'admin', 'class_teacher']}><CircularsAdmin /></ProtectedRoute>} />
              <Route path="library/dashboard" element={<ProtectedRoute featureKey="library" capability="admin_library_dashboard" roles={['librarian']}><LibraryDashboard /></ProtectedRoute>} />
              <Route path="library" element={<ProtectedRoute featureKey="library" capability="admin_library_manage" roles={['institution_owner', 'admin', 'librarian']}><LibraryAdmin /></ProtectedRoute>} />
              <Route path="hostel/dashboard" element={<ProtectedRoute featureKey="hostel_checkin" capability="admin_dashboard" roles={['hostel_warden']}><HostelWardenDashboard /></ProtectedRoute>} />
              <Route path="staff" element={<ProtectedRoute featureKey="staff_roles" capability="admin_staff_manage" roles={['institution_owner']}><StaffManagement /></ProtectedRoute>} />
              <Route path="courses" element={<ProtectedRoute featureKey="academic" capability="admin_courses_manage" roles={['institution_owner']}><CoursesPage /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute featureKey="reports" capability="admin_reports_view" roles={['institution_owner', 'admin', 'accountant']}><ReportsPage /></ProtectedRoute>} />
              <Route path="notifications" element={<ProtectedRoute featureKey="circulars_notifications" capability="admin_notifications_view" roles={['institution_owner', 'admin', 'class_teacher', 'hostel_warden', 'librarian', 'accountant', 'admission_staff']}><NotificationsPage /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute featureKey="settings" capability="admin_settings_manage" roles={['institution_owner', 'admin']}><SettingsPage /></ProtectedRoute>} />
            </Route>

            <Route
              path="/operator"
              element={(
                <ProtectedRoute roles={OPERATOR_ROLES} redirectTo="/operator/login" featureKey="commerce_pos">
                  <OperatorLayout />
                </ProtectedRoute>
              )}
            >
              <Route index element={<RoleHomeRedirect />} />
              <Route path="dashboard" element={<ProtectedRoute featureKey="commerce_pos" capability="operator_dashboard_view" roles={SHOP_CANTEEN_ADMIN_ROLES} redirectTo="/operator/login"><OperatorDashboard /></ProtectedRoute>} />
              <Route path="shop" element={<ProtectedRoute featureKey="commerce_pos" capability="operator_shop_view" roles={['shop_operator', ...SHOP_CANTEEN_ADMIN_ROLES]} redirectTo="/operator/login"><ShopOperator /></ProtectedRoute>} />
              <Route path="canteen" element={<ProtectedRoute featureKey="commerce_pos" capability="operator_canteen_view" roles={['canteen_operator', ...SHOP_CANTEEN_ADMIN_ROLES]} redirectTo="/operator/login"><CanteenOperator /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute featureKey="reports" capability="operator_reports_view" roles={SHOP_CANTEEN_ADMIN_ROLES} redirectTo="/operator/login"><OperatorReports /></ProtectedRoute>} />
            </Route>
            <Route
              path="/:portalKey/operator"
              element={(
                <ProtectedRoute roles={OPERATOR_ROLES} redirectTo="/operator/login" featureKey="commerce_pos">
                  <OperatorLayout />
                </ProtectedRoute>
              )}
            >
              <Route index element={<RoleHomeRedirect />} />
              <Route path="dashboard" element={<ProtectedRoute featureKey="commerce_pos" capability="operator_dashboard_view" roles={SHOP_CANTEEN_ADMIN_ROLES} redirectTo="/operator/login"><OperatorDashboard /></ProtectedRoute>} />
              <Route path="shop" element={<ProtectedRoute featureKey="commerce_pos" capability="operator_shop_view" roles={['shop_operator', ...SHOP_CANTEEN_ADMIN_ROLES]} redirectTo="/operator/login"><ShopOperator /></ProtectedRoute>} />
              <Route path="canteen" element={<ProtectedRoute featureKey="commerce_pos" capability="operator_canteen_view" roles={['canteen_operator', ...SHOP_CANTEEN_ADMIN_ROLES]} redirectTo="/operator/login"><CanteenOperator /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute featureKey="reports" capability="operator_reports_view" roles={SHOP_CANTEEN_ADMIN_ROLES} redirectTo="/operator/login"><OperatorReports /></ProtectedRoute>} />
            </Route>

            <Route
              path="/student"
              element={(
                <ProtectedRoute roles={['student']} featureKey="student_portal">
                  <StudentLayout />
                </ProtectedRoute>
              )}
            >
              <Route index element={<StudentDashboard />} />
              <Route path="set-password" element={<SetPassword />} />
              <Route path="fees" element={<ProtectedRoute featureKey="finance"><StudentFees /></ProtectedRoute>} />
              <Route path="ledger" element={<ProtectedRoute featureKey="ledger"><StudentLedger /></ProtectedRoute>} />
              <Route path="leave" element={<ProtectedRoute featureKey="hostel_leave"><StudentLeave /></ProtectedRoute>} />
              <Route path="outpass" element={<ProtectedRoute featureKey="hostel_leave"><StudentOutpass /></ProtectedRoute>} />
              <Route path="circulars" element={<ProtectedRoute featureKey="circulars_notifications"><StudentCirculars /></ProtectedRoute>} />
              <Route path="profile" element={<StudentProfile />} />
              <Route path="wallet" element={<ProtectedRoute featureKey="wallet"><StudentWallet /></ProtectedRoute>} />
            </Route>
            <Route
              path="/:portalKey/student"
              element={(
                <ProtectedRoute roles={['student']} featureKey="student_portal">
                  <StudentLayout />
                </ProtectedRoute>
              )}
            >
              <Route index element={<StudentDashboard />} />
              <Route path="set-password" element={<SetPassword />} />
              <Route path="fees" element={<ProtectedRoute featureKey="finance"><StudentFees /></ProtectedRoute>} />
              <Route path="ledger" element={<ProtectedRoute featureKey="ledger"><StudentLedger /></ProtectedRoute>} />
              <Route path="leave" element={<ProtectedRoute featureKey="hostel_leave"><StudentLeave /></ProtectedRoute>} />
              <Route path="outpass" element={<ProtectedRoute featureKey="hostel_leave"><StudentOutpass /></ProtectedRoute>} />
              <Route path="circulars" element={<ProtectedRoute featureKey="circulars_notifications"><StudentCirculars /></ProtectedRoute>} />
              <Route path="profile" element={<StudentProfile />} />
              <Route path="wallet" element={<ProtectedRoute featureKey="wallet"><StudentWallet /></ProtectedRoute>} />
            </Route>

            <Route
              path="/parent"
              element={(
                <ProtectedRoute roles={['parent']} redirectTo="/parent/login" featureKey="parent_portal">
                  <ParentLayout />
                </ProtectedRoute>
              )}
            >
              <Route index element={<ParentDashboard />} />
              <Route path="student" element={<ParentStudentView />} />
              <Route path="fees" element={<ProtectedRoute featureKey="finance"><ParentFees /></ProtectedRoute>} />
              <Route path="payments" element={<ProtectedRoute featureKey="finance"><ParentPayments /></ProtectedRoute>} />
              <Route path="ledger" element={<ProtectedRoute featureKey="ledger"><ParentLedger /></ProtectedRoute>} />
              <Route path="wallet" element={<ProtectedRoute featureKey="wallet"><ParentWallet /></ProtectedRoute>} />
              <Route path="leave" element={<ProtectedRoute featureKey="hostel_leave"><ParentLeave /></ProtectedRoute>} />
              <Route path="outpass" element={<ProtectedRoute featureKey="hostel_leave"><ParentOutpass /></ProtectedRoute>} />
              <Route path="checkin" element={<ProtectedRoute featureKey="hostel_checkin"><ParentCheckIn /></ProtectedRoute>} />
              <Route path="circulars" element={<ProtectedRoute featureKey="circulars_notifications"><ParentCirculars /></ProtectedRoute>} />
            </Route>
            <Route
              path="/:portalKey/parent"
              element={(
                <ProtectedRoute roles={['parent']} redirectTo="/parent/login" featureKey="parent_portal">
                  <ParentLayout />
                </ProtectedRoute>
              )}
            >
              <Route index element={<ParentDashboard />} />
              <Route path="student" element={<ParentStudentView />} />
              <Route path="fees" element={<ProtectedRoute featureKey="finance"><ParentFees /></ProtectedRoute>} />
              <Route path="payments" element={<ProtectedRoute featureKey="finance"><ParentPayments /></ProtectedRoute>} />
              <Route path="ledger" element={<ProtectedRoute featureKey="ledger"><ParentLedger /></ProtectedRoute>} />
              <Route path="wallet" element={<ProtectedRoute featureKey="wallet"><ParentWallet /></ProtectedRoute>} />
              <Route path="leave" element={<ProtectedRoute featureKey="hostel_leave"><ParentLeave /></ProtectedRoute>} />
              <Route path="outpass" element={<ProtectedRoute featureKey="hostel_leave"><ParentOutpass /></ProtectedRoute>} />
              <Route path="checkin" element={<ProtectedRoute featureKey="hostel_checkin"><ParentCheckIn /></ProtectedRoute>} />
              <Route path="circulars" element={<ProtectedRoute featureKey="circulars_notifications"><ParentCirculars /></ProtectedRoute>} />
            </Route>

            <Route path="/" element={<LandingPage />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </BrowserRouter>
      </AppSettingsProvider>
    </AuthProvider>
  );
}
