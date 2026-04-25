import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiActivity,
  FiAlertCircle,
  FiArrowRight,
  FiBarChart2,
  FiBook,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiClipboard,
  FiDollarSign,
  FiFileText,
  FiGrid,
  FiLock,
  FiSettings,
  FiShield,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import api from '../../api/axios.js';
import { PageLoader } from '../../components/common/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import { canAccessRole, ROLES } from '../../utils/roleAccess.js';

const MODULES = [
  { to: '/admin/students/new', label: 'New Admission', caption: 'Register and activate a student profile', icon: FiZap, accessKey: 'students_manage' },
  { to: '/admin/students', label: 'Student Directory', caption: 'Browse and manage student records', icon: FiUsers, accessKey: 'students_view' },
  { to: '/admin/attendance', label: 'Attendance', caption: 'Mark and review attendance status', icon: FiCalendar, accessKey: 'attendance' },
  { to: '/admin/timetable', label: 'Timetable', caption: 'Schedule classes and review periods', icon: FiClock, accessKey: 'timetable_manage' },
  { to: '/admin/exams', label: 'Exam Marks', caption: 'Capture and review assessment marks', icon: FiClipboard, accessKey: 'exams' },
  { to: '/admin/homework', label: 'Homework', caption: 'Assign work and monitor pending tasks', icon: FiBook, accessKey: 'homework' },
  { to: '/admin/fees/list', label: 'Fees Collection', caption: 'Review payments and outstanding dues', icon: FiDollarSign, accessKey: 'fees_list' },
  { to: '/admin/report-cards', label: 'Report Cards', caption: 'Generate and publish progress reports', icon: FiFileText, accessKey: 'report_cards' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const academicYear = useAcademicYear();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/dashboard', { params: { academicYear } })
      .then(response => setData(response.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [academicYear]);

  const allowedModules = useMemo(() => {
    return MODULES.filter(item => canAccessRole(user?.role, item.accessKey));
  }, [user?.role]);

  if (loading) return <PageLoader />;

  if (user?.role === ROLES.SUPER_ADMIN && data?.isSuperAdmin) {
    const superStats = [
      { label: 'Active Accounts', value: data?.accounts?.active ?? 0, hint: `${data?.accounts?.inactive ?? 0} inactive`, icon: FiShield },
      { label: 'Students With Access', value: data?.accounts?.students ?? 0, hint: 'Portal-ready student accounts', icon: FiUsers },
      { label: 'Parents Linked', value: data?.accounts?.parents ?? 0, hint: 'Family portal accounts', icon: FiUser },
      { label: 'Setup Complete', value: `${data?.configHealth?.percent ?? 0}%`, hint: `${data?.configHealth?.completed ?? 0}/${data?.configHealth?.total ?? 0} governance checks`, icon: FiSettings },
    ];

    const controlCards = [
      {
        title: 'Access Governance',
        icon: FiLock,
        value: `${data?.roles?.admin ?? 0} admin`,
        subvalue: `${data?.roles?.principal ?? 0} principal, ${data?.roles?.teacher ?? 0} teacher, ${data?.roles?.class_teacher ?? 0} class teacher`,
        tone: 'text-amber-700',
      },
      {
        title: 'School Operations',
        icon: FiActivity,
        value: `${data?.operations?.students?.active ?? 0} active students`,
        subvalue: `${data?.operations?.pendingLeaves ?? 0} pending leave requests, ${data?.operations?.todaySubstitutions ?? 0} substitutions today`,
        tone: 'text-sky-700',
      },
      {
        title: 'Finance Visibility',
        icon: FiDollarSign,
        value: formatCurrency(data?.operations?.monthCollection ?? 0),
        subvalue: `${formatCurrency(data?.operations?.pendingDues ?? 0)} still outstanding`,
        tone: 'text-emerald-700',
      },
    ];

    const attentionItems = [
      {
        title: 'First login pending',
        text: `${data?.accounts?.firstLoginPending ?? 0} account(s) still need first-time password completion.`,
      },
      {
        title: 'Configuration health',
        text: data?.configHealth?.missing?.length
          ? `Missing setup items: ${data.configHealth.missing.join(', ')}.`
          : 'Core school configuration is complete and ready for live operations.',
      },
      {
        title: 'Coverage snapshot',
        text: `${data?.operations?.teachers ?? 0} teachers, ${data?.operations?.classes ?? 0} active classes, and ${data?.accounts?.staff ?? 0} staff accounts are currently on the platform.`,
      },
    ];

    const platformActions = [
      { title: 'Review access and staff', to: '/admin/staff' },
      { title: 'Finish school setup', to: '/admin/settings' },
      { title: 'Open operational dashboard', to: '/admin/students' },
    ];

    return (
      <div className="space-y-8">
        <HeroPanel
          eyebrow="Platform Control Center"
          title={`Super admin workspace for ${data?.school?.name || 'your school'}`}
          description="This view behaves like a real-world super admin layer: access governance, configuration health, and operational visibility live together instead of being hidden inside a normal school admin dashboard."
          meta={[
            { label: 'School Code', value: data?.school?.code || 'SCH001' },
            { label: 'Board', value: data?.school?.board || 'Not configured' },
            { label: 'Academic Year', value: data?.school?.academicYear || academicYear },
          ]}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {superStats.map(item => (
            <MetricCard key={item.label} {...item} />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="campus-panel p-6">
            <SectionHeading title="Platform Actions" caption="The decisions a real super admin makes most often" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {platformActions.map(item => (
                <QuickLinkCard key={item.to} title={item.title} to={item.to} />
              ))}
            </div>
          </div>

          <div className="campus-panel p-6">
            <SectionHeading title="Needs Attention" caption="Short governance notes from live system data" />
            <div className="mt-5 space-y-4">
              {attentionItems.map(item => (
                <InsightRow key={item.title} icon={FiAlertCircle} title={item.title} text={item.text} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="campus-panel p-6">
            <SectionHeading title="Governance Summary" caption="Control-plane visibility over people, access, and finance" />
            <div className="mt-5 space-y-4">
              {controlCards.map(item => (
                <div key={item.title} className="rounded-[22px] border border-slate-200 bg-slate-50/75 p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white ${item.tone}`}>
                      <item.icon className="text-lg" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{item.title}</p>
                      <p className="mt-1 text-xl font-black text-slate-900">{item.value}</p>
                      <p className="text-sm text-slate-500">{item.subvalue}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="campus-panel p-6">
            <SectionHeading title="Role Distribution" caption="How access is currently spread across the institution" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['Super Admin', data?.roles?.super_admin],
                ['Admin', data?.roles?.admin],
                ['Principal', data?.roles?.principal],
                ['Teacher', data?.roles?.teacher],
                ['Class Teacher', data?.roles?.class_teacher],
                ['Accountant', data?.roles?.accountant],
                ['Librarian', data?.roles?.librarian],
                ['Admission Staff', data?.roles?.admission_staff],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[20px] border border-slate-200 bg-white/85 px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value ?? 0}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isTeacherView = Boolean(data?.isTeacher);

  if (isTeacherView) {
    const teacherStats = [
      { label: 'Class Students', value: data?.studentsCount ?? 0, hint: 'Students in your class', icon: FiUsers },
      { label: 'Today\'s Periods', value: data?.todayPeriods ?? 0, hint: 'Scheduled teaching slots', icon: FiClock },
      { label: 'Pending Homework', value: data?.pendingHomework ?? 0, hint: 'Homework still active', icon: FiBook },
      { label: 'Leave Requests', value: data?.pendingLeaves ?? 0, hint: 'Student requests to review', icon: FiCalendar },
    ];

    const teacherActions = [
      { title: 'Open Today\'s Schedule', to: '/admin/timetable/teacher', access: 'timetable_view' },
      { title: 'Manage Homework', to: '/admin/homework', access: 'homework' },
      { title: 'Review Leave Requests', to: '/admin/leave', access: 'leave' },
    ].filter(item => canAccessRole(user?.role, item.access));

    return (
      <div className="space-y-8">
        <HeroPanel
          eyebrow="Teacher Dashboard"
          title={`Welcome back, ${user?.name}`}
          description="Focus on teaching flow, class workload, and the student tasks that need your attention today."
          meta={[
            { label: 'Academic Year', value: academicYear },
            { label: 'Role', value: user?.role?.replace(/_/g, ' ') },
          ]}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {teacherStats.map(item => (
            <MetricCard key={item.label} {...item} />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="campus-panel p-6">
            <SectionHeading title="Teaching Focus" caption="The most relevant parts of the system for today" />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {teacherActions.map(item => (
                <QuickLinkCard key={item.to} title={item.title} to={item.to} />
              ))}
            </div>
          </div>

          <div className="campus-panel p-6">
            <SectionHeading title="Today at a Glance" caption="Quick reading of your classroom day" />
            <div className="mt-5 space-y-4">
              <InsightRow
                icon={FiCheckCircle}
                title="Classroom readiness"
                text={`${data?.studentsCount ?? 0} students, ${data?.todayPeriods ?? 0} scheduled periods, and ${data?.pendingHomework ?? 0} active homework items.`}
              />
              <InsightRow
                icon={FiAlertCircle}
                title="Attention needed"
                text={data?.pendingLeaves ? `${data.pendingLeaves} leave request(s) are still waiting for review.` : 'No pending leave requests right now.'}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const adminStats = [
    { label: 'Total Students', value: data?.students?.total ?? 0, hint: `${data?.students?.active ?? 0} active this year`, icon: FiUsers },
    { label: 'Teachers', value: data?.teachers ?? 0, hint: 'Faculty members on record', icon: FiUser },
    { label: 'Classes', value: data?.classes ?? 0, hint: 'Active grade-section groups', icon: FiGrid },
    { label: 'Pending Leaves', value: data?.pendingLeaves ?? 0, hint: 'Requests waiting for action', icon: FiCalendar },
  ];

  const adminInsights = [
    {
      title: 'Finance Snapshot',
      icon: FiDollarSign,
      value: formatCurrency(data?.monthCollection ?? 0),
      subvalue: `${formatCurrency(data?.pendingDues ?? 0)} pending dues`,
      tone: 'text-emerald-700',
    },
    {
      title: 'Operations Load',
      icon: FiClock,
      value: `${data?.todaySubstitutions ?? 0}`,
      subvalue: 'Substitutions scheduled today',
      tone: 'text-sky-700',
    },
    {
      title: 'School Workforce',
      icon: FiBarChart2,
      value: `${data?.staffCount ?? 0}`,
      subvalue: 'Staff and faculty in active use',
      tone: 'text-indigo-700',
    },
  ];

  const healthChecks = [
    {
      title: 'Enrollment Health',
      text: `${data?.students?.active ?? 0} active students out of ${data?.students?.total ?? 0} total student records for ${academicYear}.`,
      status: 'stable',
    },
    {
      title: 'Collections This Month',
      text: `${formatCurrency(data?.monthCollection ?? 0)} collected so far with ${formatCurrency(data?.pendingDues ?? 0)} still outstanding.`,
      status: 'watch',
    },
    {
      title: 'Administrative Load',
      text: `${data?.pendingLeaves ?? 0} leave request(s) and ${data?.todaySubstitutions ?? 0} substitution item(s) need operational visibility.`,
      status: 'stable',
    },
  ];

  return (
    <div className="space-y-8">
      <HeroPanel
        eyebrow="School Command Center"
        title={`Welcome back, ${user?.name}`}
        description="Track the school’s academic, operational, and financial position from one clean dashboard."
        meta={[
          { label: 'Academic Year', value: academicYear },
          { label: 'Role', value: user?.role?.replace(/_/g, ' ') },
          { label: 'Active Students', value: String(data?.students?.active ?? 0) },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminStats.map(item => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="campus-panel p-6">
          <SectionHeading title="Essential Modules" caption="The areas most people need every day" />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {allowedModules.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="group rounded-[24px] border border-slate-200 bg-white/85 p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary-300 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                    <item.icon className="text-xl" />
                  </div>
                  <FiArrowRight className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-600" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{item.label}</h3>
                <p className="mt-2 text-sm text-slate-500">{item.caption}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="campus-panel p-6">
            <SectionHeading title="School Insights" caption="Fast operational reading" />
            <div className="mt-5 space-y-4">
              {adminInsights.map(item => (
                <div key={item.title} className="rounded-[22px] border border-slate-200 bg-slate-50/75 p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white ${item.tone}`}>
                      <item.icon className="text-lg" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{item.title}</p>
                      <p className="mt-1 text-xl font-black text-slate-900">{item.value}</p>
                      <p className="text-sm text-slate-500">{item.subvalue}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="campus-panel p-6">
            <SectionHeading title="Operational Health" caption="Short status notes for the day" />
            <div className="mt-5 space-y-4">
              {healthChecks.map(item => (
                <InsightRow
                  key={item.title}
                  icon={item.status === 'watch' ? FiAlertCircle : FiTrendingUp}
                  title={item.title}
                  text={item.text}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroPanel({ eyebrow, title, description, meta }) {
  return (
    <div className="campus-panel overflow-hidden p-6 sm:p-7">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-500 sm:text-base">{description}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[360px]">
          {meta.map(item => (
            <div key={item.label} className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
              <p className="mt-1 text-base font-semibold capitalize text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon className="text-2xl text-primary-700" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

function SectionHeading({ title, caption }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
      <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
      <p className="text-sm font-medium text-slate-500">{caption}</p>
    </div>
  );
}

function InsightRow({ icon: Icon, title, text }) {
  return (
    <div className="flex items-start gap-3 rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-primary-700">
        <Icon className="text-lg" />
      </div>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function QuickLinkCard({ title, to }) {
  return (
    <Link to={to} className="rounded-[22px] border border-slate-200 bg-white/85 p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary-300 hover:shadow-lg">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Action</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <FiArrowRight className="text-slate-300" />
      </div>
    </Link>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
