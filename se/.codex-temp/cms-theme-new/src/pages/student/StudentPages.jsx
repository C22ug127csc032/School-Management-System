import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { ExportActions, PageSpinner, StatusBadge, StatCard, EmptyState } from '../../components/common';
import {
  FiAlertCircle,
  FiBell,
  FiBook,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiDollarSign,
  FiEye,
  FiInfo,
  FiLogOut,
  HiOutlineHandRaised,
} from '../../components/common/icons';
import toast from 'react-hot-toast';

// ─── STUDENT DASHBOARD ───────────────────────────────────────────────────────
export function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!user?.studentRef) {
      setData({ fees: [], pendingLeaves: 0, circulars: [], circularCount: 0 });
      setLoading(false);
      return;
    }

    const studentId = user.studentRef._id || user.studentRef;
    const courseId = user.studentRef?.course?._id || user.studentRef?.course || null;

    try {
      const [feesRes, leavesRes, circularsRes] = await Promise.all([
        api.get(`/fees/student/${studentId}`),
        api.get('/leave', { params: { studentId, status: 'pending', limit: 1 } }),
        api.get('/circulars', {
          params: {
            audience: 'students',
            ...(courseId ? { course: courseId } : {}),
            limit: 5,
          },
        }),
      ]);

      setData({
        fees: feesRes.data.fees || [],
        pendingLeaves: leavesRes.data.total ?? (leavesRes.data.leaves || []).length,
        circulars: circularsRes.data.circulars || [],
        circularCount: circularsRes.data.total ?? (circularsRes.data.circulars || []).length,
      });
    } catch {
      setData({ fees: [], pendingLeaves: 0, circulars: [], circularCount: 0 });
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboard();
    const onFocus = () => fetchDashboard();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchDashboard]);

  if (loading) return <PageSpinner />;

  const pendingDues = data?.fees?.filter(f => f.status !== 'paid' && (f.totalDue || 0) > 0) || [];
  const totalDue = pendingDues.reduce((s, f) => s + (f.totalDue || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          Welcome, {user?.name}!{' '}
          <HiOutlineHandRaised className="text-amber-500" />
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's your academic summary</p>
      </div>

      {/* View Only Notice */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50
        border border-blue-200 rounded-xl">
        <FiEye className="text-blue-500 text-base shrink-0" />
        <p className="text-sm text-blue-700">
          You are in <strong>view only</strong> mode.
          Contact your parent to apply leave or request outpass.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={<FiDollarSign />} label="Total Due"     value={'₹' + totalDue.toLocaleString('en-IN')} color="red" />
        <StatCard icon={<FiClipboard />} label="Fee Records"    value={data?.fees?.length || 0}                 color="blue" />
        <StatCard icon={<FiClock />}     label="Pending Dues"   value={pendingDues.length}                      color="yellow" />
        <StatCard icon={<FiCalendar />}  label="Pending Leaves" value={data?.pendingLeaves || 0}                color="yellow" />
        <StatCard icon={<FiBell />}      label="Circulars"      value={data?.circularCount || 0}                color="purple" />
      </div>

      <div className="card">
        <h3 className="section-title">Recent Circulars</h3>
        {data?.circulars?.slice(0, 3).map(c => (
          <div key={c._id} className="py-3 border-b border-gray-50 last:border-0">
            <p className="font-medium text-gray-800 text-sm">{c.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(c.publishDate).toLocaleDateString('en-IN')}
            </p>
          </div>
        ))}
        {!data?.circulars?.length && (
          <EmptyState message="No circulars" icon={<FiBell />} />
        )}
      </div>
    </div>
  );
}
export function StudentFees() {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFees = async () => {
    const id = user?.studentRef?._id || user?.studentRef;
    if (!id) { setLoading(false); return; }
    const r = await api.get(`/fees/student/${id}`);
    setFees(r.data.fees.filter(f => f.status !== 'pending'));
    setLoading(false);
  };

  useEffect(() => { fetchFees(); }, [user]);

  if (loading) return <PageSpinner />;
  const fmt = n => '₹' + (n || 0).toLocaleString('en-IN');
  const getEffectiveTotal = fee => Number(fee?.totalAmount || 0) + Number(fee?.totalFine || 0);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">My Fees</h1>
        <ExportActions
          getExportConfig={() => ({
            fileName: 'student-my-fees',
            title: 'Student Fees Export',
            subtitle: 'Semester-wise fee records for the logged-in student.',
            summary: [
              { label: 'Fee Records', value: fees.length },
              { label: 'Total Billed', value: fmt(fees.reduce((sum, fee) => sum + getEffectiveTotal(fee), 0)) },
              { label: 'Total Paid', value: fmt(fees.reduce((sum, fee) => sum + Number(fee.totalPaid || 0), 0)) },
              { label: 'Total Due', value: fmt(fees.reduce((sum, fee) => sum + Number(fee.totalDue || 0), 0)) },
              { label: 'Late Fine Total', value: fmt(fees.reduce((sum, fee) => sum + Number(fee.totalFine || 0), 0)) },
            ],
            sections: [
              {
                title: 'My Fees',
                columns: [
                  { header: 'Academic Year', value: fee => fee.academicYear || '-' },
                  { header: 'Semester', value: fee => fee.semester || '-' },
                  { header: 'Due Date', value: fee => fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : 'N/A' },
                  { header: 'Total', value: fee => fmt(getEffectiveTotal(fee)), align: 'right' },
                  { header: 'Paid', value: fee => fmt(fee.totalPaid), align: 'right' },
                  { header: 'Due', value: fee => fmt(fee.totalDue), align: 'right' },
                  { header: 'Late Fine', value: fee => fee.totalFine > 0 ? fmt(fee.totalFine) : '-', align: 'right' },
                  { header: 'Status', value: fee => fee.status || '-' },
                ],
                rows: fees,
              },
              ...fees.map(fee => ({
                title: `${fee.academicYear || 'Semester'} Sem ${fee.semester || '-'}`,
                columns: [
                  { header: 'Fee Head', value: head => head.headName || '-' },
                  { header: 'Amount', value: head => fmt(head.amount), align: 'right' },
                  { header: 'Paid', value: head => head.paid > 0 ? fmt(head.paid) : '-', align: 'right' },
                  { header: 'Due', value: head => head.due > 0 ? fmt(head.due) : '-', align: 'right' },
                ],
                rows: fee.feeHeads || [],
              })),
            ],
          })}
          disabled={fees.length === 0}
        />
      </div>

      {/* View Only Notice */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50
        border border-blue-200 rounded-xl mb-6">
        <FiEye className="text-blue-500 text-base shrink-0" />
        <p className="text-sm text-blue-700">
          View only. To make a payment, ask your parent to login
          at <strong>Parent Portal</strong>.
        </p>
      </div>

      <div className="space-y-6">
        {fees.map(f => (
          <div key={f._id} className="card">

            {/* Top: Year / Semester / Status */}
            <div className="flex flex-wrap justify-between items-start mb-4">
              <div>
                <p className="font-bold text-gray-900 text-base">
                  {f.academicYear} — Semester {f.semester}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Due Date:{' '}
                  {f.dueDate
                    ? new Date(f.dueDate).toLocaleDateString('en-IN')
                    : 'N/A'}
                </p>
              </div>
              <StatusBadge status={f.status} />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-500 font-medium mb-1">Total</p>
                <p className="text-lg font-bold text-blue-700">{fmt(getEffectiveTotal(f))}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-green-500 font-medium mb-1">Paid</p>
                <p className="text-lg font-bold text-green-700">{fmt(f.totalPaid)}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-xs text-red-500 font-medium mb-1">Due</p>
                <p className="text-lg font-bold text-red-700">{fmt(f.totalDue)}</p>
              </div>
            </div>

            {/* Fee Structure Table */}
            <div className="rounded-xl border border-gray-100 overflow-hidden mb-4">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Fee Structure
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Fee Head</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Amount</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Paid</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {f.feeHeads?.map((h, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-700 font-medium">{h.headName}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{fmt(h.amount)}</td>
                      <td className="px-4 py-2.5 text-right text-green-600 font-medium">
                        {h.paid > 0 ? fmt(h.paid) : '–'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-600 font-medium">
                        {h.due > 0
                          ? fmt(h.due)
                          : <span className="text-green-500 text-xs font-semibold">Paid</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-4 py-3 font-bold text-gray-800">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">{fmt(getEffectiveTotal(f))}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(f.totalPaid)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-700">
                      {f.totalDue > 0
                        ? fmt(f.totalDue)
                        : <span className="text-green-600">Fully Paid</span>
                      }
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Fine Alert */}
            {f.totalFine > 0 && (
              <div className="mb-4 px-4 py-2.5 bg-orange-50 border border-orange-200
                rounded-xl flex items-center gap-2">
                <FiAlertCircle className="text-orange-500 shrink-0" />
                <p className="text-sm text-orange-700">
                  Late fine applied: <strong>{fmt(f.totalFine)}</strong>
                </p>
              </div>
            )}

            {/* NO Pay Button for student — view only */}
            {f.status !== 'paid' && f.totalDue > 0 && (
              <div className="text-center py-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-500">
                  <FiInfo className="inline mr-1 align-[-2px]" />
                  Ask your parent to login and pay{' '}
                  <strong className="text-red-600">{fmt(f.totalDue)}</strong>
                </p>
              </div>
            )}

            {/* Fully Paid */}
            {f.status === 'paid' && (
              <div className="text-center py-3 bg-green-50 rounded-xl border border-green-200">
                <p className="text-green-700 font-semibold text-sm">
                  <FiCheckCircle className="inline mr-1 align-[-2px]" />
                  All fees paid for this semester
                </p>
              </div>
            )}

          </div>
        ))}

        {fees.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <div className="flex justify-center mb-3">
              <FiDollarSign className="text-4xl" />
            </div>
            <p className="font-medium">No fee records found</p>
            <p className="text-sm mt-1">Contact admin to assign your fees</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STUDENT LEDGER ───────────────────────────────────────────────────────────
export function StudentLedger() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = user?.studentRef?._id || user?.studentRef;
    if (!id) { setLoading(false); return; }
    api.get(`/ledger/student/${id}`)
      .then(r => setEntries(r.data.entries))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <PageSpinner />;
  const fmt = n => '₹' + (n || 0).toLocaleString('en-IN');

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">My Ledger</h1>
        <ExportActions
          getExportConfig={() => ({
            fileName: 'student-ledger',
            title: 'Student Ledger Export',
            subtitle: 'Running ledger entries for the logged-in student.',
            summary: [
              { label: 'Entries', value: entries.length },
              { label: 'Total Debits', value: fmt(entries.filter(entry => entry.type === 'debit').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)) },
              { label: 'Total Credits', value: fmt(entries.filter(entry => entry.type === 'credit').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)) },
              { label: 'Closing Balance', value: fmt(entries[entries.length - 1]?.runningBalance || 0) },
            ],
            sections: [
              {
                title: 'Ledger Entries',
                columns: [
                  { header: 'Date', value: entry => new Date(entry.date).toLocaleDateString('en-IN') },
                  { header: 'Category', value: entry => entry.category?.replace('_', ' ') || '-' },
                  { header: 'Description', value: entry => entry.description || '-' },
                  { header: 'Debit', value: entry => entry.type === 'debit' ? fmt(entry.amount) : '-', align: 'right' },
                  { header: 'Credit', value: entry => entry.type === 'credit' ? fmt(entry.amount) : '-', align: 'right' },
                  { header: 'Balance', value: entry => fmt(entry.runningBalance), align: 'right' },
                ],
                rows: entries,
              },
            ],
          })}
          disabled={entries.length === 0}
        />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-header">Date</th>
              <th className="table-header">Category</th>
              <th className="table-header">Description</th>
              <th className="table-header">Debit</th>
              <th className="table-header">Credit</th>
              <th className="table-header">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.map((e, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="table-cell">
                  {new Date(e.date).toLocaleDateString('en-IN')}
                </td>
                <td className="table-cell capitalize">
                  {e.category?.replace('_', ' ')}
                </td>
                <td className="table-cell text-gray-500">{e.description}</td>
                <td className="table-cell text-red-600 font-medium">
                  {e.type === 'debit' ? fmt(e.amount) : ''}
                </td>
                <td className="table-cell text-green-600 font-medium">
                  {e.type === 'credit' ? fmt(e.amount) : ''}
                </td>
                <td className="table-cell font-semibold">
                  {fmt(e.runningBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <EmptyState message="No ledger entries" icon={<FiBook />} />
        )}
      </div>
    </div>
  );
}

// ─── STUDENT LEAVE — VIEW ONLY ────────────────────────────────────────────────
export function StudentLeave() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const id = user?.studentRef?._id || user?.studentRef;

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    api.get('/leave', { params: { studentId: id } })
      .then(r => setLeaves(r.data.leaves))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="page-title">Leave Requests</h1>
      </div>

      {/* View Only Notice */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50
        border border-blue-200 rounded-xl mb-6">
        <FiEye className="text-blue-500 text-base shrink-0" />
        <p className="text-sm text-blue-700">
          View only. Only your <strong>parent</strong> can apply leave on your behalf.
        </p>
      </div>

      <div className="space-y-3">
        {leaves.map(l => (
          <div key={l._id}
            className="card flex flex-wrap justify-between items-start gap-3">
            <div>
              <p className="font-medium text-gray-800 capitalize">
                {l.leaveType} Leave
              </p>
              <p className="text-sm text-gray-500">
                {new Date(l.fromDate).toLocaleDateString('en-IN')} –{' '}
                {new Date(l.toDate).toLocaleDateString('en-IN')}{' '}
                ({l.noOfDays} days)
              </p>
              <p className="text-sm text-gray-600 mt-1">{l.reason}</p>
              {l.remarks && (
                <p className="text-xs text-gray-400 mt-1">
                  Remarks: {l.remarks}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Applied by: <span className="capitalize font-medium">
                  {l.appliedByRole || 'parent'}
                </span>
              </p>
            </div>
            <StatusBadge status={l.status} />
          </div>
        ))}
        {leaves.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <div className="flex justify-center mb-3">
              <FiCalendar className="text-4xl" />
            </div>
            <p className="font-medium">No leave requests yet</p>
            <p className="text-sm mt-1">
              Your parent can apply leave from the Parent Portal
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STUDENT OUTPASS — VIEW ONLY ──────────────────────────────────────────────
export function StudentOutpass() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const id = user?.studentRef?._id || user?.studentRef;

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    api.get('/outpass', { params: { studentId: id } })
      .then(r => setList(r.data.outpasses))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="page-title">Outpass</h1>
      </div>

      {/* View Only Notice */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50
        border border-blue-200 rounded-xl mb-6">
        <FiEye className="text-blue-500 text-base shrink-0" />
        <p className="text-sm text-blue-700">
          View only. Only your <strong>parent</strong> can request outpass on your behalf.
        </p>
      </div>

      <div className="space-y-3">
        {list.map(o => (
          <div key={o._id}
            className="card flex flex-wrap justify-between items-start gap-3">
            <div>
              <p className="font-medium text-gray-800">{o.reason}</p>
              <p className="text-sm text-gray-500">
                Exit: {new Date(o.exitDate).toLocaleDateString('en-IN')} •{' '}
                Expected Return:{' '}
                {new Date(o.expectedReturn).toLocaleDateString('en-IN')}
              </p>
              {o.destination && (
                <p className="text-sm text-gray-400">
                  Destination: {o.destination}
                </p>
              )}
              {o.remarks && (
                <p className="text-xs text-gray-400">Remarks: {o.remarks}</p>
              )}
            </div>
            <StatusBadge status={o.status} />
          </div>
        ))}
        {list.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <div className="flex justify-center mb-3">
              <FiLogOut className="text-4xl" />
            </div>
            <p className="font-medium">No outpass requests yet</p>
            <p className="text-sm mt-1">
              Your parent can request outpass from the Parent Portal
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STUDENT CIRCULARS ─────────────────────────────────────────────────────────
export function StudentCirculars() {
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/circulars')
      .then(r => setCirculars(r.data.circulars))
      .finally(() => setLoading(false));
  }, []);

  const typeColors = {
    circular:     'badge-blue',
    announcement: 'badge-yellow',
    exam_schedule:'badge-red',
    event:        'badge-green',
    holiday:      'badge-gray',
  };

  if (loading) return <PageSpinner />;

  return (
    <div>
      <h1 className="page-title mb-6">Circulars & Announcements</h1>
      <div className="space-y-4">
        {circulars.map(c => (
          <div key={c._id} className="card">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-800">{c.title}</h3>
              <span className={typeColors[c.type] || 'badge-gray'}>
                {c.type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{c.content}</p>
            <p className="text-xs text-gray-400 mt-3">
              {new Date(c.publishDate).toLocaleDateString('en-IN')}
            </p>
          </div>
        ))}
        {circulars.length === 0 && (
          <EmptyState message="No circulars published" icon={<FiBell />} />
        )}
      </div>
    </div>
  );
}

// ─── STUDENT PROFILE ──────────────────────────────────────────────────────────
export function StudentProfile() {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = user?.studentRef?._id || user?.studentRef;
    if (!id) { setLoading(false); return; }
    api.get(`/students/${id}`)
      .then(r => setStudent(r.data.student))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <PageSpinner />;
  if (!student) return <EmptyState message="Profile not found" />;

  const Row = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value || '–'}</span>
    </div>
  );

  return (
    <div>
      <h1 className="page-title mb-6">My Profile</h1>
      <div className="flex items-center gap-5 mb-6 p-5 bg-white rounded-xl
        shadow-sm border border-gray-100">
        <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700
          text-3xl font-bold flex items-center justify-center shrink-0 overflow-hidden">
          {student.photo
            ? <img src={student.photo} alt=""
                className="w-24 h-24 rounded-full object-cover" />
            : student.firstName[0]}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {student.firstName} {student.lastName}
          </h2>
          <p className="text-gray-500 text-sm">{student.regNo}</p>
          <p className="text-gray-500 text-sm">{student.course?.name}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="section-title">Personal</h3>
          <Row label="Phone"       value={student.phone} />
          <Row label="Email"       value={student.email} />
          <Row label="DOB"
            value={student.dob
              ? new Date(student.dob).toLocaleDateString('en-IN') : null} />
          <Row label="Gender"      value={student.gender} />
          <Row label="Blood Group" value={student.bloodGroup} />
          <Row label="Category"    value={student.category} />
        </div>
        <div className="card">
          <h3 className="section-title">Academic</h3>
          <Row label="Reg No"        value={student.regNo} />
          <Row label="Course"        value={student.course?.name} />
          <Row label="Semester"      value={student.semester} />
          <Row label="Batch"         value={student.batch} />
          <Row label="Roll No"       value={student.rollNo} />
          <Row label="Academic Year" value={student.academicYear} />
        </div>
        <div className="card">
          <h3 className="section-title">Parent Details</h3>
          <Row label="Father"       value={student.father?.name} />
          <Row label="Father Phone" value={student.father?.phone} />
          <Row label="Mother"       value={student.mother?.name} />
          <Row label="Mother Phone" value={student.mother?.phone} />
        </div>
        <div className="card">
          <h3 className="section-title">Address</h3>
          <Row label="Street"  value={student.address?.street} />
          <Row label="City"    value={student.address?.city} />
          <Row label="State"   value={student.address?.state} />
          <Row label="Pincode" value={student.address?.pincode} />
        </div>
      </div>
    </div>
  );
}
