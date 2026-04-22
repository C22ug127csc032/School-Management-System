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
  { label: 'My Child', copy: 'Profile, admission, and contact details', icon: FiUser, to: '/parent/student' },
  { label: 'Fees', copy: 'Assigned fees, due amounts, and payment records', icon: FiCreditCard, to: '/parent/fees' },
  { label: 'Attendance', copy: 'Daily presence and attendance summary', icon: FiCalendar, to: '/parent/attendance' },
  { label: 'Timetable', copy: 'Class schedule and subject periods', icon: FiClock, to: '/parent/timetable' },
  { label: 'Marks', copy: 'Published exam results and report cards', icon: FiGrid, to: '/parent/marks' },
  { label: 'Homework', copy: 'Homework published for the class', icon: FiBookOpen, to: '/parent/homework' },
  { label: 'Circulars', copy: 'School notices and parent updates', icon: FiFileText, to: '/parent/updates' },
  { label: 'Library', copy: 'Issued books, due dates, and fines', icon: FiLayers, to: '/parent/library' },
];

export default function ParentPortalPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/portal/overview')
      .then(response => setOverview(response.data.data))
      .catch(error => toast.error(error.response?.data?.message || 'Failed to load parent portal.'))
      .finally(() => setLoading(false));
  }, []);

  const highlights = overview?.highlights || {};
  const student = overview?.student || user?.studentRef;

  const heroStats = useMemo(() => ([
    { label: 'Current Due', value: `Rs ${Number(highlights.totalDueAmount || 0).toLocaleString('en-IN')}` },
    { label: 'Present Days', value: highlights.presentDays ?? 0 },
    { label: 'Homework Items', value: highlights.homeworkCount ?? 0 },
    { label: 'Library Issues', value: highlights.activeLibraryIssues ?? 0 },
  ]), [highlights]);

  if (loading) {
    return (
      <div className="campus-panel p-10 text-center">
        <p className="text-sm font-semibold text-slate-500">Loading parent dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="campus-panel overflow-hidden p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Parent Dashboard</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{user?.name || 'Parent Account'}</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
              Monitor your child&apos;s fees, attendance, timetable, marks, homework, notices, and library activity from one portal.
            </p>
          </div>
          <div className="rounded-[26px] border border-primary-100 bg-primary-50 px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-700">Linked Student</p>
            <p className="mt-2 text-lg font-black text-slate-900">{student?.fullName || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || '-'}</p>
            <p className="mt-1 text-sm text-slate-600">{student?.className || student?.classRef?.displayName || `${student?.grade || '-'} ${student?.section || ''}`.trim()}</p>
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
          <h2 className="text-lg font-bold text-slate-900">Student Snapshot</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoTile label="Admission Number" value={student?.admissionNo || '-'} />
            <InfoTile label="Academic Year" value={student?.academicYear || '-'} />
            <InfoTile label="Attendance Days" value={highlights.attendanceDays ?? 0} />
            <InfoTile label="Pending Leaves" value={highlights.pendingLeaves ?? 0} />
          </div>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Recent Activity</p>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <p>Latest payment count: <strong>{overview?.recent?.payments?.length || 0}</strong></p>
              <p>Latest homework updates: <strong>{overview?.recent?.homework?.length || 0}</strong></p>
              <p>Recent circulars visible: <strong>{overview?.recent?.circulars?.length || 0}</strong></p>
            </div>
          </div>
        </div>

        <div className="campus-panel p-6">
          <h2 className="text-lg font-bold text-slate-900">Important Dates</h2>
          <div className="mt-4 space-y-4">
            <DateRow label="Admission Date" value={formatIndianDate(student?.admissionDate) || '-'} />
            <DateRow label="Latest Circular" value={formatIndianDate(overview?.recent?.circulars?.[0]?.publishDate) || 'No circular yet'} />
            <DateRow label="Nearest Homework Due" value={formatIndianDate(overview?.recent?.homework?.[0]?.dueDate) || 'No homework pending'} />
            <DateRow label="Next Exam Window" value={formatIndianDate(overview?.recent?.exams?.[0]?.startDate) || 'No exam published'} />
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
