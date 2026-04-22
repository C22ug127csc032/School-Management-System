import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import api from '../../api/axios';
import { ExportActions, PageSpinner } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import {
  FiAlertCircle,
  FiArrowRight,
  FiBook,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiEdit3,
  FiFileText,
  FiHome,
  FiPackage,
  FiTrendingDown,
  FiTrendingUp,
  FiUser,
  FiUserPlus,
  FiUsers,
} from '../../components/common/icons';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can, hasFeature } = useAppSettings();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentStats, setStudentStats] = useState(null);
  const [feesSummary, setFeesSummary] = useState(null);

  const isSuperAdmin = ['institution_owner', 'super_admin'].includes(user?.role);
  const isAccountant = user?.role === 'accountant';
  const isAdmissionStaff = user?.role === 'admission_staff';
  const hasFeesSummaryAccess = can('admin_payments_view', ['institution_owner', 'admin', 'accountant']);
  const hasLibraryAccess = can('admin_library_manage', ['institution_owner', 'admin', 'librarian']);
  const canManageStudents = can('admin_students_view', ['institution_owner', 'admin', 'class_teacher', 'admission_staff']);
  const canCreateStudents = can('admin_students_create', ['institution_owner', 'admin', 'admission_staff']);
  const canManageFees = can('admin_fee_assign', ['institution_owner', 'admin', 'accountant']);
  const canManagePayments = can('admin_payments_view', ['institution_owner', 'admin', 'accountant']);
  const canManageExpense = can('admin_expense_manage', ['institution_owner', 'admin', 'accountant']);
  const canManageAttendance = can('admin_checkin_manage', ['institution_owner', 'admin', 'class_teacher', 'hostel_warden']);
  const canManageLeave = can('admin_leave_manage', ['institution_owner', 'admin', 'class_teacher', 'hostel_warden']);
  const canManageOutpass = can('admin_outpass_manage', ['institution_owner', 'admin', 'class_teacher', 'hostel_warden']);
  const canManageInventory = can('admin_inventory_manage', ['institution_owner', 'admin']);
  const canManageReports = can('admin_reports_view', ['institution_owner', 'admin', 'accountant']);
  const canManageCirculars = can('admin_circular_manage', ['institution_owner', 'admin', 'class_teacher']);
  const canManageStaff = can('admin_staff_manage', ['institution_owner']);
  const showFinance = !isAdmissionStaff;
  const hasReportsFeature = hasFeature('reports');
  const hasFinanceFeature = hasFeature('finance');

  useEffect(() => {
    const requests = [
      hasReportsFeature ? api.get('/reports/dashboard') : Promise.resolve(null),
      api.get('/students/stats/summary'),
      hasFeesSummaryAccess && hasFinanceFeature ? api.get('/fees/summary') : Promise.resolve(null),
    ];

    Promise.allSettled(requests)
      .then(([dash, stats, fees]) => {
        setData(dash.status === 'fulfilled' ? dash.value?.data?.dashboard || null : null);
        setStudentStats(stats.status === 'fulfilled' ? stats.value?.data?.stats || null : null);
        setFeesSummary(fees.status === 'fulfilled' ? fees.value?.data?.summary || null : null);
      })
      .catch(err => console.error('Dashboard error:', err))
      .finally(() => setLoading(false));
  }, [hasFeesSummaryAccess, hasFinanceFeature, hasReportsFeature]);

  if (loading) return <PageSpinner />;

  const fmt = n => '₹' + (n || 0).toLocaleString('en-IN');

  const chartOpts = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } },
  };

  const quickActions = isAccountant
    ? [
        { label: 'Record Manual Payment', icon: FiCreditCard, path: '/admin/payments', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700' },
        { label: 'View Fees List', icon: FiDollarSign, path: '/admin/fees/list', color: 'bg-green-50 hover:bg-green-100 text-green-700' },
        { label: 'Add Expense', icon: FiTrendingDown, path: '/admin/expense', color: 'bg-orange-50 hover:bg-orange-100 text-orange-700' },
        { label: 'View Reports', icon: FiTrendingUp, path: '/admin/reports', color: 'bg-red-50 hover:bg-red-100 text-red-700' },
      ]
    : isAdmissionStaff
      ? [
          { label: 'Add New Student', icon: FiUserPlus, path: '/admin/students/add', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
          { label: 'View Students', icon: FiUsers, path: '/admin/students', color: 'bg-sky-50 hover:bg-sky-100 text-sky-700' },
        ]
      : [
          ...(canCreateStudents ? [
            { label: 'Add New Student', icon: FiUser, path: '/admin/students/add', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
          ] : []),
          ...(canManageFees ? [
            { label: 'Assign Fees', icon: FiEdit3, path: '/admin/fees/assign', color: 'bg-green-50 hover:bg-green-100 text-green-700' },
          ] : []),
          ...(canManagePayments ? [
            { label: 'Manual Payment', icon: FiCreditCard, path: '/admin/payments', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700' },
          ] : []),
          ...(canManageCirculars ? [
            { label: 'Publish Circular', icon: FiFileText, path: '/admin/circulars', color: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700' },
          ] : []),
          ...(hasLibraryAccess ? [
            { label: 'Issue Book', icon: FiBook, path: '/admin/library', color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700' },
          ] : []),
          ...(canManageReports ? [
            { label: 'View Reports', icon: FiTrendingUp, path: '/admin/reports', color: 'bg-red-50 hover:bg-red-100 text-red-700' },
          ] : []),
          ...(canManageAttendance ? [
            { label: 'Check In Student', icon: FiClock, path: '/admin/checkin', color: 'bg-teal-50 hover:bg-teal-100 text-teal-700' },
          ] : []),
      ];

  const exportConfig = {
    fileName: 'admin-dashboard-overview',
    title: 'Admin Dashboard Overview Export',
    subtitle: 'Operational summary from the main administration dashboard.',
    summary: [
      { label: 'Total Students', value: studentStats?.total || data?.totalStudents || 0 },
      { label: 'Active Students', value: studentStats?.active || data?.activeStudents || 0 },
      { label: 'Admission Pending', value: studentStats?.pending || 0 },
      { label: 'New This Month', value: studentStats?.newThisMonth || 0 },
      { label: 'Total Collected', value: fmt(data?.totalFeesCollected) },
      { label: 'This Month Collection', value: fmt(data?.monthlyCollection) },
      { label: 'Pending Dues', value: fmt(feesSummary?.totalDue || data?.pendingDues) },
      { label: 'Overdue Records', value: data?.overdueCount || 0 },
      { label: 'Expense This Month', value: fmt(data?.expenseThisMonth) },
    ],
    sections: [
      {
        title: 'Recent Payments',
        columns: [
          { header: 'Student', value: payment => `${payment.student?.firstName || ''} ${payment.student?.lastName || ''}`.trim() || '-' },
          { header: 'Reg No', value: payment => payment.student?.regNo || '-' },
          { header: 'Date', value: payment => new Date(payment.paymentDate).toLocaleDateString('en-IN') },
          { header: 'Amount', value: payment => fmt(payment.amount), align: 'right' },
        ],
        rows: data?.recentPayments || [],
      },
      ...(feesSummary ? [{
        title: 'Fee Status Breakdown',
        columns: [
          { header: 'Status', value: row => row.status },
          { header: 'Count', value: row => row.value, align: 'right' },
        ],
        rows: [
          { status: 'Paid', value: feesSummary.paid || 0 },
          { status: 'Partial', value: feesSummary.partial || 0 },
          { status: 'Pending', value: feesSummary.pending || 0 },
          { status: 'Overdue', value: feesSummary.overdue || data?.overdueCount || 0 },
        ],
      }] : []),
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back! Here is what is happening today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportActions getExportConfig={() => exportConfig} disabled={!data} />
          <div className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Students
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`stat-card ${canManageStudents ? 'cursor-pointer hover:shadow-md transition-shadow' : 'opacity-70 cursor-default'}`} onClick={() => canManageStudents && navigate('/admin/students')}>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shrink-0"><FiUser /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{studentStats?.total || data?.totalStudents || 0}</p>
              <p className="text-sm text-gray-500">Total Students</p>
            </div>
          </div>
          <div className={`stat-card ${canManageStudents ? 'cursor-pointer hover:shadow-md transition-shadow' : 'opacity-70 cursor-default'}`} onClick={() => canManageStudents && navigate('/admin/students')}>
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-2xl shrink-0"><FiCheckCircle /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{studentStats?.active || data?.activeStudents || 0}</p>
              <p className="text-sm text-gray-500">Active Students</p>
            </div>
          </div>
          <div className={`stat-card ${canManageStudents ? 'cursor-pointer hover:shadow-md transition-shadow' : 'opacity-70 cursor-default'}`} onClick={() => canManageStudents && navigate('/admin/students')}>
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-2xl shrink-0"><FiClock /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{studentStats?.pending || 0}</p>
              <p className="text-sm text-gray-500">Admission Pending</p>
            </div>
          </div>
          <div className={`stat-card ${canCreateStudents ? 'cursor-pointer hover:shadow-md transition-shadow' : 'opacity-70 cursor-default'}`} onClick={() => canCreateStudents && navigate('/admin/students/add')}>
            <div className="w-12 h-12 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center text-2xl shrink-0"><FiUserPlus /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{studentStats?.newThisMonth || 0}</p>
              <p className="text-sm text-gray-500">New This Month</p>
            </div>
          </div>
        </div>
      </div>

      {showFinance && (
        <>
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Finance
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className={`stat-card ${canManagePayments ? 'cursor-pointer hover:shadow-md transition-shadow' : 'opacity-70 cursor-default'}`} onClick={() => canManagePayments && navigate('/admin/payments')}>
                <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-2xl shrink-0"><FiDollarSign /></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{fmt(data?.totalFeesCollected)}</p>
                  <p className="text-sm text-gray-500">Total Collected</p>
                </div>
              </div>
              <div className={`stat-card ${canManagePayments ? 'cursor-pointer hover:shadow-md transition-shadow' : 'opacity-70 cursor-default'}`} onClick={() => canManagePayments && navigate('/admin/payments')}>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shrink-0"><FiCalendar /></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{fmt(data?.monthlyCollection)}</p>
                  <p className="text-sm text-gray-500">This Month</p>
                </div>
              </div>
              <div className={`stat-card ${canManageFees ? 'cursor-pointer hover:shadow-md transition-shadow' : 'opacity-70 cursor-default'}`} onClick={() => canManageFees && navigate('/admin/fees/list')}>
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-2xl shrink-0"><FiAlertCircle /></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{fmt(feesSummary?.totalDue || data?.pendingDues)}</p>
                  <p className="text-sm text-gray-500">Pending Dues</p>
                  <p className="text-xs text-red-400 mt-0.5">{data?.overdueCount || 0} overdue</p>
                </div>
              </div>
              <div className={`stat-card ${canManageExpense ? 'cursor-pointer hover:shadow-md transition-shadow' : 'opacity-70 cursor-default'}`} onClick={() => canManageExpense && navigate('/admin/expense')}>
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-2xl shrink-0"><FiTrendingDown /></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{fmt(data?.expenseThisMonth)}</p>
                  <p className="text-sm text-gray-500">Expenses This Month</p>
                </div>
              </div>
            </div>
          </div>

          <div className={`grid gap-6 ${isAccountant ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-3'}`}>
            <div className="card">
              <h3 className="section-title">Fee Collection</h3>
              <Doughnut
                options={chartOpts}
                data={{
                  labels: ['Collected', 'Pending Dues'],
                  datasets: [{
                    data: [
                      data?.totalFeesCollected || 0,
                      feesSummary?.totalDue || data?.pendingDues || 0,
                    ],
                    backgroundColor: ['#22c55e', '#ef4444'],
                    borderWidth: 0,
                  }],
                }}
              />
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-green-600 font-medium">Collected</p>
                  <p className="text-sm font-bold text-green-700">{fmt(data?.totalFeesCollected)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-red-600 font-medium">Pending</p>
                  <p className="text-sm font-bold text-red-700">{fmt(feesSummary?.totalDue || data?.pendingDues)}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="section-title">Fee Status Breakdown</h3>
              <Bar
                options={{
                  ...chartOpts,
                  plugins: { legend: { display: false } },
                }}
                data={{
                  labels: ['Paid', 'Partial', 'Pending', 'Overdue'],
                  datasets: [{
                    data: [
                      feesSummary?.paid || 0,
                      feesSummary?.partial || 0,
                      feesSummary?.pending || 0,
                      feesSummary?.overdue || data?.overdueCount || 0,
                    ],
                    backgroundColor: ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444'],
                    borderRadius: 6,
                  }],
                }}
              />
            </div>

            <div className="card">
              <h3 className="section-title">Quick Actions</h3>
              <div className="space-y-2">
                {quickActions.map(action => (
                  <button
                    key={action.path}
                    onClick={() => navigate(action.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${action.color}`}
                  >
                    <action.icon className="text-base shrink-0" />
                    {action.label}
                    <FiArrowRight className="ml-auto text-gray-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="section-title mb-0">Recent Payments</h3>
                <button
                  onClick={() => navigate('/admin/payments')}
                  className="text-xs text-primary-600 hover:underline"
                >
                  View all →
                </button>
              </div>
              <div className="space-y-0">
                {data?.recentPayments?.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="flex justify-center mb-2">
                      <FiCreditCard className="text-3xl" />
                    </div>
                    <p className="text-sm">No payments yet</p>
                  </div>
                )}
                {data?.recentPayments?.map(payment => (
                  <div
                    key={payment._id}
                    className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold shrink-0">
                        {payment.student?.firstName?.[0] || 'S'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {payment.student?.firstName} {payment.student?.lastName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {payment.student?.regNo} • {new Date(payment.paymentDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-green-600">{fmt(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="section-title mb-0">Fee Overview</h3>
                <button
                  onClick={() => navigate('/admin/fees/list')}
                  className="text-xs text-primary-600 hover:underline"
                >
                  View all →
                </button>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: 'Total Fees Billed',
                    value: fmt(feesSummary?.totalBilled),
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                  },
                  {
                    label: 'Total Collected',
                    value: fmt(feesSummary?.totalCollected || data?.totalFeesCollected),
                    color: 'text-green-600',
                    bg: 'bg-green-50',
                  },
                  {
                    label: 'Total Pending',
                    value: fmt(feesSummary?.totalDue || data?.pendingDues),
                    color: 'text-red-600',
                    bg: 'bg-red-50',
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    className={`flex justify-between items-center px-4 py-3 rounded-xl ${item.bg}`}
                  >
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className={`text-base font-bold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>

              {(data?.overdueCount > 0) && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <FiAlertCircle className="text-2xl" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">
                      {data.overdueCount} overdue fee records
                    </p>
                    <button
                      onClick={() => navigate('/admin/fees/list')}
                      className="text-xs text-red-600 hover:underline mt-0.5"
                    >
                      View overdue records →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {isAdmissionStaff && (
        <div className="card">
          <h3 className="section-title">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickActions.map(action => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${action.color}`}
              >
                <action.icon className="text-base shrink-0" />
                {action.label}
                <FiArrowRight className="ml-auto text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {!isAccountant && !isAdmissionStaff && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Module Overview
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {[
              ...(canManageLeave ? [{
                icon: FiCalendar, label: 'Leave',
                desc: 'Manage student leaves',
                path: '/admin/leave',
                color: 'border-blue-200 bg-blue-50',
                iconBg: 'bg-blue-100 text-blue-600',
              }] : []),
              ...(canManageOutpass ? [{
                icon: FiArrowRight, label: 'Outpass',
                desc: 'Manage student outpass requests',
                path: '/admin/outpass',
                color: 'border-purple-200 bg-purple-50',
                iconBg: 'bg-purple-100 text-purple-600',
              }] : []),
              ...(canManageInventory ? [{
                icon: FiPackage, label: 'Inventory',
                desc: 'Stock management',
                path: '/admin/inventory',
                color: 'border-yellow-200 bg-yellow-50',
                iconBg: 'bg-yellow-100 text-yellow-600',
              }] : []),
              ...(hasLibraryAccess ? [{
                icon: FiBook, label: 'Library',
                desc: 'Books & issue records',
                path: '/admin/library',
                color: 'border-green-200 bg-green-50',
                iconBg: 'bg-green-100 text-green-600',
              }] : []),
              ...(canManageExpense ? [{
                icon: FiTrendingDown, label: 'Expenses',
                desc: 'Institution expenses',
                path: '/admin/expense',
                color: 'border-red-200 bg-red-50',
                iconBg: 'bg-red-100 text-red-600',
              }] : []),
              ...(canManageStaff ? [{
                icon: FiUsers, label: 'Staff',
                desc: 'Manage staff roles',
                path: '/admin/staff',
                color: 'border-indigo-200 bg-indigo-50',
                iconBg: 'bg-indigo-100 text-indigo-600',
              }] : []),
              ...(canManageReports ? [{
                icon: FiTrendingUp, label: 'Reports',
                desc: 'All reports & analytics',
                path: '/admin/reports',
                color: 'border-teal-200 bg-teal-50',
                iconBg: 'bg-teal-100 text-teal-600',
              }] : []),
              ...(canManageCirculars ? [{
                icon: FiFileText, label: 'Circulars',
                desc: 'Notices and announcements',
                path: '/admin/circulars',
                color: 'border-orange-200 bg-orange-50',
                iconBg: 'bg-orange-100 text-orange-600',
              }] : []),
            ].map(module => (
              <button
                key={module.path}
                onClick={() => navigate(module.path)}
                className={`p-4 rounded-xl border text-left transition-all hover:shadow-md hover:scale-[1.02] ${module.color}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 ${module.iconBg}`}>
                  <module.icon />
                </div>
                <p className="text-sm font-semibold text-gray-800">{module.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{module.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
