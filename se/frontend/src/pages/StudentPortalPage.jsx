import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiLayers,
  FiUser,
} from 'react-icons/fi';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatIndianDate } from '../utils/dateTime.js';

const MODULES = [
  { label: 'My Profile', copy: 'Admission, class, and family details', icon: FiUser, to: '/student/profile' },
  { label: 'Fees', copy: 'See assigned fees and payment records', icon: FiCreditCard, to: '/student/fees' },
  { label: 'Attendance', copy: 'Daily attendance status and totals', icon: FiCalendar, to: '/student/attendance' },
  { label: 'Timetable', copy: 'Weekly class periods and subjects', icon: FiClock, to: '/student/timetable' },
  { label: 'Exams', copy: 'Exam schedules and report cards', icon: FiGrid, to: '/student/exams' },
  { label: 'Homework', copy: 'Track assigned work and due items', icon: FiBookOpen, to: '/student/homework' },
  { label: 'Circulars', copy: 'School notices and announcements', icon: FiFileText, to: '/student/circulars' },
  { label: 'Library', copy: 'Issued books and fine details', icon: FiLayers, to: '/student/library' },
];

export default function StudentPortalPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/portal/overview')
      .then(response => setOverview(response.data.data))
      .catch(error => toast.error(error.response?.data?.message || 'Failed to load student portal.'))
      .finally(() => setLoading(false));
  }, []);

  const student = overview?.student || user?.studentRef;
  const highlights = overview?.highlights || {};

  const heroStats = useMemo(() => ([
    { label: 'Present Days', value: highlights.presentDays ?? 0 },
    { label: 'Homework', value: highlights.homeworkCount ?? 0 },
    { label: 'Exams', value: highlights.publishedExams ?? 0 },
    { label: 'Current Due', value: `Rs ${Number(highlights.totalDueAmount || 0).toLocaleString('en-IN')}` },
  ]), [highlights]);

  if (loading) {
    return (
      <div className="campus-panel p-10 text-center">
        <p className="text-sm font-semibold text-slate-500">Loading student dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="campus-panel overflow-hidden p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Student Dashboard</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              {student?.fullName || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || user?.name || 'Student'}
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
              Your personal school workspace for timetable, homework, exams, attendance, fees, library, and circulars.
            </p>
          </div>
          <div className="rounded-[26px] border border-primary-100 bg-primary-50 px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-700">Class</p>
            <p className="mt-2 text-lg font-black text-slate-900">{student?.className || student?.classRef?.displayName || '-'}</p>
            <p className="mt-1 text-sm text-slate-600">Admission No: {student?.admissionNo || '-'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {heroStats.map(item => (
          <div key={item.label} className="stat-card">
            <div className="stat-icon"><FiLayers className="text-2xl text-primary-700" /></div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{item.label}</p>
              <p className="text-xl font-bold text-text-primary">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="campus-panel p-6">
          <h2 className="text-lg font-bold text-slate-900">Academic Snapshot</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoTile label="Academic Year" value={student?.academicYear || '-'} />
            <InfoTile label="Admission Date" value={formatIndianDate(student?.admissionDate) || '-'} />
            <InfoTile label="Attendance Days" value={highlights.attendanceDays ?? 0} />
            <InfoTile label="Library Issues" value={highlights.activeLibraryIssues ?? 0} />
          </div>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Rollout Summary</p>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <p>Visible circulars: <strong>{overview?.recent?.circulars?.length || 0}</strong></p>
              <p>Upcoming exams: <strong>{overview?.recent?.exams?.length || 0}</strong></p>
              <p>Pending leaves: <strong>{highlights.pendingLeaves ?? 0}</strong></p>
            </div>
          </div>
        </div>

        <div className="campus-panel p-6">
          <h2 className="text-lg font-bold text-slate-900">Important Dates</h2>
          <div className="mt-4 space-y-4">
            <DateRow label="Nearest Homework Due" value={formatIndianDate(overview?.recent?.homework?.[0]?.dueDate) || 'No homework pending'} />
            <DateRow label="Next Exam Window" value={formatIndianDate(overview?.recent?.exams?.[0]?.startDate) || 'No exam published'} />
            <DateRow label="Latest Circular" value={formatIndianDate(overview?.recent?.circulars?.[0]?.publishDate) || 'No circular yet'} />
            <DateRow label="Latest Payment" value={formatIndianDate(overview?.recent?.payments?.[0]?.paymentDate) || 'No payment history'} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {MODULES.map(module => (
          <Link key={module.label} to={module.to} className="campus-panel group p-5 transition hover:-translate-y-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
              <module.icon className="text-xl" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">{module.label}</h2>
            <p className="mt-2 text-sm text-slate-500">{module.copy}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function DateRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
