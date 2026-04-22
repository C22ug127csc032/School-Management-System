import React, { useState, useEffect } from 'react';
import api, { downloadPaymentReceipt } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import { PageSpinner, StatusBadge, StatCard, EmptyState, SearchableSelect } from '../../components/common';
import toast from 'react-hot-toast';
import { getFirstActiveValue, toSelectOptions } from '../../utils/appSettings';
import {
  FiCalendar,
  FiClock,
  FiCreditCard,
  FiDownload,
  FiFileText,
  FiLogOut,
} from '../../components/common/icons';

// ─── PARENT REGISTER ──────────────────────────────────────────────────────────
export function ParentRegister() {
  const { getMasterOptions } = useAppSettings();
  const relationOptions = toSelectOptions(getMasterOptions('parent_relations', [
    { value: 'father', label: 'Father' },
    { value: 'mother', label: 'Mother' },
    { value: 'guardian', label: 'Guardian' },
  ]));
  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '',
    studentRegNo: '', relation: getFirstActiveValue(relationOptions, 'father'),
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post('/parent/register', form);
      localStorage.setItem('token', r.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${r.data.token}`;
      toast.success('Registered successfully!');
      window.location.href = '/parent';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700
      flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center
            text-green-700 text-2xl font-bold mx-auto mb-3 shadow-xl">P</div>
          <h1 className="text-2xl font-bold text-white">Parent Registration</h1>
          <p className="text-green-300 text-sm mt-1">Link your account to your child</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input type="tel" className="input" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Password *</label>
              <input type="password" className="input" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Student Registration No *</label>
              <input className="input font-mono" placeholder="e.g. REG12345678"
                value={form.studentRegNo}
                onChange={e => setForm(f => ({ ...f, studentRegNo: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Relation</label>
              <SearchableSelect
                value={form.relation}
                onChange={relation => setForm(f => ({ ...f, relation }))}
                placeholder="Select relation"
                searchPlaceholder="Search relations..."
                options={relationOptions}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Registering...' : 'Register'}
            </button>
            <p className="text-center text-sm text-gray-500">
              Already registered?{' '}
              <a href="/login" className="text-green-600 hover:underline">Login here</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── PARENT DASHBOARD ─────────────────────────────────────────────────────────
export function ParentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/parent/dashboard')
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;
  const fmt = n => '₹' + (n || 0).toLocaleString('en-IN');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Welcome, {user?.name}!</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Monitoring: <strong>{data?.student?.firstName} {data?.student?.lastName}</strong>
          {' '}— {data?.student?.regNo}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={<FiCreditCard />} label="Total Fee Due" value={fmt(data?.summary?.totalDue)} color="red" />
        <StatCard icon={<FiCalendar />} label="Pending Leaves" value={data?.summary?.pendingLeaves || 0} color="yellow" />
        <StatCard icon={<FiFileText />} label="Fee Records" value={data?.summary?.totalFees || 0} color="blue" />
      </div>
      <div className="card">
        <h3 className="section-title">Recent Check-In / Out</h3>
        {data?.checkins?.length === 0 && <EmptyState message="No check-in records" icon={<FiClock />} />}
        {data?.checkins?.map(c => (
          <div key={c._id}
            className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
            <div>
              <span className={`badge-${c.type === 'check_in' ? 'green' : 'yellow'} text-xs`}>
                {c.type.replace('_', ' ')}
              </span>
              <span className="text-sm text-gray-500 ml-2 capitalize">{c.location}</span>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(c.timestamp).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 className="section-title">Latest Circulars</h3>
        {data?.circulars?.map(c => (
          <div key={c._id} className="py-2 border-b border-gray-50 last:border-0">
            <p className="text-sm font-medium text-gray-800">{c.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(c.publishDate).toLocaleDateString('en-IN')}
            </p>
          </div>
        ))}
        {!data?.circulars?.length && <EmptyState message="No circulars" icon={<FiFileText />} />}
      </div>
    </div>
  );
}

// ─── PARENT STUDENT VIEW ──────────────────────────────────────────────────────
export function ParentStudentView() {
  const [student, setStudent] = useState(null);
  useEffect(() => {
    api.get('/parent/student').then(r => setStudent(r.data.student));
  }, []);
  if (!student) return <PageSpinner />;

  const Row = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value || '–'}</span>
    </div>
  );

  return (
    <div>
      <h1 className="page-title mb-6">My Child's Profile</h1>
      <div className="flex items-center gap-4 p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="w-16 h-16 rounded-xl bg-green-100 text-green-700 text-2xl font-bold
          flex items-center justify-center shrink-0">
          {student.photo
            ? <img src={student.photo} alt="" className="w-16 h-16 rounded-xl object-cover" />
            : student.firstName[0]}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {student.firstName} {student.lastName}
          </h2>
          <p className="text-gray-500 text-sm">{student.regNo} • {student.course?.name}</p>
          <StatusBadge status={student.status} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="section-title">Academic</h3>
          <Row label="Course"     value={student.course?.name} />
          <Row label="Semester"   value={student.semester} />
          <Row label="Batch"      value={student.batch} />
          <Row label="Roll No"    value={student.rollNo} />
          <Row label="Hostel"
            value={student.isHosteler
              ? `Yes – Room ${student.hostelRoom || 'N/A'}` : 'No'} />
        </div>
        <div className="card">
          <h3 className="section-title">Contact</h3>
          <Row label="Phone"     value={student.phone} />
          <Row label="Email"     value={student.email} />
          <Row label="City"      value={student.address?.city} />
          <Row label="Admission"
            value={student.admissionDate
              ? new Date(student.admissionDate).toLocaleDateString('en-IN') : null} />
        </div>
      </div>
    </div>
  );
}

// ─── PARENT FEES ──────────────────────────────────────────────────────────────
export function ParentFees() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/parent/fees').then(r => setFees(r.data.fees)).finally(() => setLoading(false));
  }, []);
  if (loading) return <PageSpinner />;
  const fmt = n => '₹' + (n || 0).toLocaleString('en-IN');

  return (
    <div>
      <h1 className="page-title mb-6">Fee Details</h1>
      <div className="space-y-4">
        {fees.map(f => (
          <div key={f._id} className="card">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-gray-800">
                  {f.academicYear} — Sem {f.semester}
                </p>
                <p className="text-xs text-gray-400">
                  Due: {f.dueDate ? new Date(f.dueDate).toLocaleDateString('en-IN') : 'N/A'}
                </p>
              </div>
              <StatusBadge status={f.status} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-blue-700">{fmt(f.totalAmount)}</p>
                <p className="text-xs text-blue-500">Total</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-green-700">{fmt(f.totalPaid)}</p>
                <p className="text-xs text-green-500">Paid</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-red-700">{fmt(f.totalDue)}</p>
                <p className="text-xs text-red-500">Due</p>
              </div>
            </div>
          </div>
        ))}
        {fees.length === 0 && <EmptyState message="No fee records" icon={<FiCreditCard />} />}
      </div>
    </div>
  );
}

// ─── PARENT PAYMENTS ──────────────────────────────────────────────────────────
export function ParentPayments() {
  const [payments, setPayments] = useState([]);
  useEffect(() => {
    api.get('/parent/payments').then(r => setPayments(r.data.payments));
  }, []);
  const handleReceiptDownload = async paymentReceiptNo => {
    try {
      await downloadPaymentReceipt(paymentReceiptNo);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download receipt');
    }
  };
  const fmt = n => '₹' + (n || 0).toLocaleString('en-IN');

  return (
    <div>
      <h1 className="page-title mb-6">Payment History</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-header">Receipt</th>
              <th className="table-header">Date</th>
              <th className="table-header">Amount</th>
              <th className="table-header">Mode</th>
              <th className="table-header">Status</th>
              <th className="table-header">Receipt No</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {payments.map(p => (
              <tr key={p._id} className="hover:bg-gray-50">
                <td className="table-cell font-mono text-xs">{p.receiptNo}</td>
                <td className="table-cell">
                  {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                </td>
                <td className="table-cell font-semibold text-green-600">{fmt(p.amount)}</td>
                <td className="table-cell capitalize">{p.paymentMode}</td>
                <td className="table-cell"><StatusBadge status={p.status} /></td>
                <td className="table-cell">
                  <button
                    type="button"
                    onClick={() => handleReceiptDownload(p.receiptNo)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-500 bg-white text-primary-600 transition hover:bg-primary-600 hover:text-white"
                    aria-label={`Download receipt ${p.receiptNo}`}
                    title="Download receipt"
                  >
                    <FiDownload className="text-sm" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && <EmptyState message="No payments yet" icon={<FiCreditCard />} />}
      </div>
    </div>
  );
}

// ─── PARENT LEAVE ─────────────────────────────────────────────────────────────
export function ParentLeave() {
  const { getMasterOptions } = useAppSettings();
  const leaveTypeOptions = toSelectOptions(getMasterOptions('leave_types', [
    { value: 'sick', label: 'Sick' },
    { value: 'personal', label: 'Personal' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'other', label: 'Other' },
  ]));
  const [leaves, setLeaves] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    leaveType: getFirstActiveValue(leaveTypeOptions, 'personal'), fromDate: '', toDate: '', reason: '',
  });

  const fetch = () => api.get('/parent/leave').then(r => setLeaves(r.data.leaves));
  useEffect(() => { fetch(); }, []);

  const apply = async e => {
    e.preventDefault();
    await api.post('/parent/leave', form);
    toast.success('Leave applied');
    setShow(false);
    setForm({ leaveType: getFirstActiveValue(leaveTypeOptions, 'personal'), fromDate: '', toDate: '', reason: '' });
    fetch();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">Leave Requests</h1>
        <button onClick={() => setShow(true)} className="btn-primary">+ Apply Leave</button>
      </div>
      <div className="space-y-3">
        {leaves.map(l => (
          <div key={l._id} className="card flex flex-wrap justify-between items-start gap-3">
            <div>
              <p className="font-medium capitalize">{l.leaveType} Leave</p>
              <p className="text-sm text-gray-500">
                {new Date(l.fromDate).toLocaleDateString('en-IN')} –{' '}
                {new Date(l.toDate).toLocaleDateString('en-IN')} ({l.noOfDays} days)
              </p>
              <p className="text-sm text-gray-600 mt-1">{l.reason}</p>
              {l.remarks && <p className="text-xs text-gray-400 mt-1">Remarks: {l.remarks}</p>}
            </div>
            <StatusBadge status={l.status} />
          </div>
        ))}
        {leaves.length === 0 && <EmptyState message="No leave requests" icon={<FiCalendar />} />}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Apply Leave for Child</h3>
            <form onSubmit={apply} className="space-y-3">
              <div>
                <label className="label">Type</label>
                <SearchableSelect
                  value={form.leaveType}
                  onChange={leaveType => setForm(f => ({ ...f, leaveType }))}
                  placeholder="Select leave type"
                  searchPlaceholder="Search leave types..."
                  options={leaveTypeOptions}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">From *</label>
                  <input type="date" className="input" value={form.fromDate}
                    onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">To *</label>
                  <input type="date" className="input" value={form.toDate}
                    onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="label">Reason *</label>
                <textarea className="input" rows={3} value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required />
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShow(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">Apply</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PARENT OUTPASS ───────────────────────────────────────────────────────────
export function ParentOutpass() {
  const [list, setList] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    exitDate: '', exitTime: '', expectedReturn: '', reason: '', destination: '',
  });

  const fetch = () => api.get('/parent/outpass').then(r => setList(r.data.outpasses));
  useEffect(() => { fetch(); }, []);

  const apply = async e => {
    e.preventDefault();
    await api.post('/parent/outpass', form);
    toast.success('Outpass requested');
    setShow(false);
    fetch();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">Outpass Requests</h1>
        <button onClick={() => setShow(true)} className="btn-primary">+ Request Outpass</button>
      </div>
      <div className="space-y-3">
        {list.map(o => (
          <div key={o._id} className="card flex flex-wrap justify-between items-start gap-3">
            <div>
              <p className="font-medium">{o.reason}</p>
              <p className="text-sm text-gray-500">
                Exit: {new Date(o.exitDate).toLocaleDateString('en-IN')} ·
                Return: {new Date(o.expectedReturn).toLocaleDateString('en-IN')}
              </p>
              {o.destination && <p className="text-sm text-gray-400">To: {o.destination}</p>}
              {o.remarks && <p className="text-xs text-gray-400">Remarks: {o.remarks}</p>}
            </div>
            <StatusBadge status={o.status} />
          </div>
        ))}
        {list.length === 0 && <EmptyState message="No outpass requests" icon={<FiLogOut />} />}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Request Outpass for Child</h3>
            <form onSubmit={apply} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Exit Date *</label>
                  <input type="date" className="input" value={form.exitDate}
                    onChange={e => setForm(f => ({ ...f, exitDate: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Exit Time</label>
                  <input type="time" className="input" value={form.exitTime}
                    onChange={e => setForm(f => ({ ...f, exitTime: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Expected Return *</label>
                  <input type="date" className="input" value={form.expectedReturn}
                    onChange={e => setForm(f => ({ ...f, expectedReturn: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Destination</label>
                  <input className="input" value={form.destination}
                    onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Reason *</label>
                <textarea className="input" rows={2} value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required />
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShow(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PARENT CHECK-IN HISTORY ──────────────────────────────────────────────────
export function ParentCheckIn() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = user?.studentRef?._id || user?.studentRef;
    if (!id) { setLoading(false); return; }
    api.get(`/checkin?studentId=${id}&limit=50`)
      .then(r => setRecords(r.data.records))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <PageSpinner />;

  return (
    <div>
      <h1 className="page-title mb-6">Check-In / Out History</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-header">Type</th>
              <th className="table-header">Location</th>
              <th className="table-header">Date & Time</th>
              <th className="table-header">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {records.map(r => (
              <tr key={r._id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <span className={`badge-${r.type === 'check_in' ? 'green' : 'yellow'}`}>
                    {r.type.replace('_', ' ')}
                  </span>
                </td>
                <td className="table-cell capitalize">{r.location}</td>
                <td className="table-cell">
                  {new Date(r.timestamp).toLocaleString('en-IN')}
                </td>
                <td className="table-cell text-gray-500">{r.remarks || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && <EmptyState message="No check-in records" icon={<FiClock />} />}
      </div>
    </div>
  );
}

// ─── PARENT CIRCULARS ─────────────────────────────────────────────────────────
export function ParentCirculars() {
  const [circulars, setCirculars] = useState([]);
  useEffect(() => {
    api.get('/parent/circulars').then(r => setCirculars(r.data.circulars));
  }, []);

  const typeColors = {
    circular: 'badge-blue', announcement: 'badge-yellow',
    exam_schedule: 'badge-red', event: 'badge-green', holiday: 'badge-gray',
  };

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
            <p className="text-xs text-gray-400 mt-2">
              {new Date(c.publishDate).toLocaleDateString('en-IN')}
            </p>
          </div>
        ))}
        {circulars.length === 0 && <EmptyState message="No circulars" icon={<FiFileText />} />}
      </div>
    </div>
  );
}
