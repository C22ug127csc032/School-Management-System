import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { downloadPaymentReceipt } from '../../api/axios';
import { PageSpinner, StatusBadge } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import toast from 'react-hot-toast';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiClock,
  FiDownload,
  FiEdit3,
} from '../../components/common/icons';
import { formatSettingLabel } from '../../utils/appSettings';

const TABS = ['Profile', 'Fees', 'Payments', 'Ledger', 'Leave', 'Outpass'];

const Row = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-medium text-gray-800 text-right max-w-xs">
      {value || '–'}
    </span>
  </div>
);

export default function StudentDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { can, getMasterOptions } = useAppSettings();
  const [student, setStudent]     = useState(null);
  const [fees, setFees]           = useState([]);
  const [payments, setPayments]   = useState([]);
  const [ledger, setLedger]       = useState([]);
  const [leaves, setLeaves]       = useState([]);
  const [outpasses, setOutpasses] = useState([]);
  const [tab, setTab]             = useState('Profile');
  const [loading, setLoading]     = useState(true);
  const admissionTypeLookup = useMemo(
    () => new Map(
      getMasterOptions('student_admission_types', []).map(option => [
        String(option?.value || '').trim(),
        option?.label || option?.value || '',
      ])
    ),
    [getMasterOptions]
  );

  const handleReceiptDownload = async paymentReceiptNo => {
    try {
      await downloadPaymentReceipt(paymentReceiptNo);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download receipt');
    }
  };

  useEffect(() => {
    Promise.all([
      api.get(`/students/${id}`),
      api.get(`/fees/student/${id}`),
      api.get(`/payments/student/${id}`),
      api.get(`/ledger/student/${id}`),
      api.get(`/leave?studentId=${id}`),
      api.get(`/outpass?studentId=${id}`),
    ]).then(([s, f, p, l, lv, op]) => {
      setStudent(s.data.student);
      setFees(f.data.fees);
      setPayments(p.data.payments);
      setLedger(l.data.entries);
      setLeaves(lv.data.leaves);
      setOutpasses(op.data.outpasses);
    })
    .catch(() => toast.error('Failed to load student'))
    .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageSpinner />;
  if (!student) return (
    <div className="text-center py-20 text-gray-400">Student not found</div>
  );

  const fmt = n => `₹${(n || 0).toLocaleString('en-IN')}`;
  const isPending = !student.regNo ||
                    student.status === 'admission_pending';
  const canEditStudent = can('admin_students_edit', ['institution_owner', 'admin', 'admission_staff', 'class_teacher']);
  const formatAdmissionType = value => {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) return '';
    return admissionTypeLookup.get(normalizedValue) || formatSettingLabel(normalizedValue);
  };

  const displayClassName = (() => {
    const courseCode = String(student?.course?.code || '').trim().toUpperCase();
    const section = String(student?.section || '').trim().toUpperCase();
    const semester = Number(student?.semester) || 0;
    const academicYear = semester ? Math.max(1, Math.ceil(semester / 2)) : 0;

    if (courseCode && academicYear && section) {
      return `${courseCode} ${academicYear}-${section}`;
    }

    return student?.className;
  })();

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => navigate(-1)}
          className="btn-secondary text-sm inline-flex items-center gap-2">
          <FiArrowLeft /> Back
        </button>
        <h1 className="page-title">
          {student.firstName} {student.lastName}
        </h1>
        {isPending
          ? <span className="inline-flex items-center gap-1 text-xs text-yellow-700
              bg-yellow-50 border border-yellow-200 px-2.5 py-1 rounded-full font-medium">
              <FiClock className="shrink-0" />
              Enrollment Pending
            </span>
          : <StatusBadge status={student.status} />
        }
        {canEditStudent && (
          <button
            onClick={() => navigate(`/admin/students/${id}/edit`)}
            className="btn-primary text-sm inline-flex items-center gap-2 ml-auto"
          >
            <FiEdit3 /> {user?.role === 'class_teacher' ? 'Update Enrollment' : 'Edit Student'}
          </button>
        )}
      </div>

      {/* ── Enrollment Pending Warning ── */}
      {isPending && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border
          border-yellow-200 rounded-xl mb-6">
          <FiClock className="text-yellow-500 text-xl mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              University Enrollment Pending
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">
              This student has admission no <strong>{student.admissionNo || 'Not assigned'}</strong>.
              After university enrollment, click{' '}
              <strong>{user?.role === 'class_teacher' ? 'Update Enrollment' : 'Edit Student'}</strong> and fill in the official
              Register Number. Roll Number and Section are assigned during roll number generation.
            </p>
          </div>
          <button
            onClick={() => navigate(`/admin/students/${id}/edit`)}
            className="ml-auto px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200
              text-yellow-800 text-xs font-semibold rounded-lg
              border border-yellow-300 whitespace-nowrap"
          >
            Edit Now →
          </button>
        </div>
      )}

      {/* ── Student Summary Card ── */}
      <div className="card mb-6 flex flex-wrap gap-6 items-start">
        <div className="w-20 h-20 rounded-xl bg-primary-100 text-primary-700
          text-3xl font-bold flex items-center justify-center shrink-0 overflow-hidden">
          {student.photo
            ? <img src={student.photo} alt=""
                className="w-20 h-20 object-cover" />
            : student.firstName[0]}
        </div>
        <div className="grid grid-cols-1 gap-4 flex-1 min-w-0 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Admission No', student.admissionNo || '–'],
            ['Reg No',    isPending ? 'Pending' : student.regNo],
            ['Phone',     student.phone],
            ['Course',    student.course?.name],
            ['Admission', student.admissionDate
              ? new Date(student.admissionDate).toLocaleDateString('en-IN') : '–'],
            ['Email',     student.email || '–'],
            ['Hostel',    student.isHosteler
              ? `Yes – Room ${student.hostelRoom || 'N/A'}` : 'No'],
            ['Batch',     student.batch || '–'],
            ['Semester',  student.semester ? `Sem ${student.semester}` : '–'],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <p className="text-xs text-gray-400 font-medium">{k}</p>
              <p className={`text-sm font-medium mt-0.5 break-words
                ${k === 'Reg No' && isPending
                  ? 'text-yellow-600' : 'text-gray-800'}`}>
                {v || '–'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap
              border-b-2 transition-colors
              ${tab === t
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {tab === 'Profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Personal */}
          <div className="card">
            <h3 className="section-title">Personal Details</h3>
            <Row label="DOB"
              value={student.dob
                ? new Date(student.dob).toLocaleDateString('en-IN') : null} />
            <Row label="Gender"      value={student.gender} />
            <Row label="Blood Group" value={student.bloodGroup} />
            <Row label="Aadhar No"   value={student.aadharNo} />
            <Row label="Religion"    value={student.religion} />
            <Row label="Category"    value={student.category} />
            <Row label="Nationality" value={student.nationality} />
            {student.annualIncome && (
              <Row label="Annual Income"
                value={student.annualIncome.replace(/_/g, ' ')} />
            )}
          </div>

          {/* Academic */}
          <div className="card">
            <h3 className="section-title">Academic Details</h3>
            <Row label="Admission No" value={student.admissionNo} />
            <Row label="Register No"
              value={isPending ? 'Not assigned yet' : student.regNo} />
            <Row label="Roll No"
              value={student.rollNo || 'Not assigned yet'} />
            <Row label="Section"
              value={student.section || 'Not assigned yet'} />
            <Row label="Class"        value={displayClassName} />
            <Row label="Semester"
              value={student.semester ? `Semester ${student.semester}` : null} />
            <Row label="Academic Year" value={student.academicYear} />
            <Row label="Batch"         value={student.batch} />
            <Row label="Admission Type"
              value={formatAdmissionType(student.admissionType)} />
          </div>

          {/* Address */}
          <div className="card">
            <h3 className="section-title">Address</h3>
            <Row label="Street"  value={student.address?.street} />
            <Row label="City"    value={student.address?.city} />
            <Row label="State"   value={student.address?.state} />
            <Row label="Pincode" value={student.address?.pincode} />
          </div>

          {/* Parent Details — no email shown */}
          <div className="card">
            <h3 className="section-title">Parent Details</h3>

            {/* Father */}
            {(student.father?.name || student.father?.phone) && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase
                  tracking-wider mb-1.5">Father</p>
                <Row label="Name"       value={student.father?.name} />
                <Row label="Phone"      value={student.father?.phone} />
                <Row label="Occupation" value={student.father?.occupation} />
              </div>
            )}

            {/* Mother */}
            {(student.mother?.name || student.mother?.phone) && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase
                  tracking-wider mb-1.5 mt-3 pt-3 border-t border-gray-50">
                  Mother
                </p>
                <Row label="Name"       value={student.mother?.name} />
                <Row label="Phone"      value={student.mother?.phone} />
                <Row label="Occupation" value={student.mother?.occupation} />
              </div>
            )}

            {/* Guardian */}
            {student.guardian?.name && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase
                  tracking-wider mb-1.5 mt-3 pt-3 border-t border-gray-50">
                  Guardian
                </p>
                <Row label="Name"     value={student.guardian?.name} />
                <Row label="Relation" value={student.guardian?.relation} />
                <Row label="Phone"    value={student.guardian?.phone} />
              </div>
            )}

            {/* No parent details warning */}
            {!student.father?.name && !student.mother?.name &&
              !student.guardian?.name && (
              <div className="p-3 bg-yellow-50 border border-yellow-200
                rounded-xl">
                <p className="text-xs text-yellow-700">
                  <FiAlertCircle className="inline mr-1 align-[-2px]" />
                  No parent details added. Parent cannot register
                  without father/mother phone number.{' '}
                  <button
                    onClick={() => navigate(`/admin/students/${id}/edit`)}
                    className="underline font-medium"
                  >
                    Edit to add →
                  </button>
                </p>
              </div>
            )}

            {/* Father phone missing warning */}
            {(student.father?.name || student.mother?.name) &&
              !student.father?.phone && !student.mother?.phone && (
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200
                rounded-xl">
                <p className="text-xs text-orange-700">
                  <FiAlertCircle className="inline mr-1 align-[-2px]" />
                  Parent phone number missing. Parent cannot register
                  without a phone number.{' '}
                  <button
                    onClick={() => navigate(`/admin/students/${id}/edit`)}
                    className="underline font-medium"
                  >
                    Add phone →
                  </button>
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── FEES TAB ── */}
      {tab === 'Fees' && (
        <div className="space-y-4">
          {fees.map(f => (
            <div key={f._id} className="card">
              <div className="flex flex-wrap gap-3 justify-between items-start mb-3">
                <p className="font-semibold text-gray-800">
                  {f.academicYear} — Sem {f.semester}
                </p>
                <StatusBadge status={f.status} />
              </div>
              <div className="grid grid-cols-1 gap-4 mb-3 sm:grid-cols-3">
                <div className="text-center p-3 bg-blue-50 rounded-xl">
                  <p className="text-lg font-bold text-blue-700">
                    {fmt(f.totalAmount)}
                  </p>
                  <p className="text-xs text-blue-500">Billed</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl">
                  <p className="text-lg font-bold text-green-700">
                    {fmt(f.totalPaid)}
                  </p>
                  <p className="text-xs text-green-500">Paid</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-xl">
                  <p className="text-lg font-bold text-red-700">
                    {fmt(f.totalDue)}
                  </p>
                  <p className="text-xs text-red-500">Due</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-2 text-xs text-gray-500">
                        Fee Head
                      </th>
                      <th className="text-right p-2 text-xs text-gray-500">
                        Amount
                      </th>
                      <th className="text-right p-2 text-xs text-gray-500">
                        Paid
                      </th>
                      <th className="text-right p-2 text-xs text-gray-500">
                        Due
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.feeHeads?.map((h, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="p-2">{h.headName}</td>
                        <td className="p-2 text-right">{fmt(h.amount)}</td>
                        <td className="p-2 text-right text-green-600">
                          {fmt(h.paid)}
                        </td>
                        <td className="p-2 text-right text-red-600">
                          {fmt(h.due)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="p-2 font-bold text-gray-800">Total</td>
                      <td className="p-2 text-right font-bold text-blue-700">
                        {fmt(f.totalAmount)}
                      </td>
                      <td className="p-2 text-right font-bold text-green-700">
                        {fmt(f.totalPaid)}
                      </td>
                      <td className="p-2 text-right font-bold text-red-700">
                        {fmt(f.totalDue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
          {fees.length === 0 && (
            <div className="card text-center py-10 text-gray-400">
              No fees assigned yet
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {tab === 'Payments' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Receipt No</th>
                <th className="table-header">Date</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Mode</th>
                <th className="table-header">Status</th>
                <th className="table-header">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map(p => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-xs">
                    {p.receiptNo}
                  </td>
                  <td className="table-cell">
                    {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                  </td>
                  <td className="table-cell font-semibold text-green-600">
                    {fmt(p.amount)}
                  </td>
                  <td className="table-cell capitalize">{p.paymentMode}</td>
                  <td className="table-cell">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => handleReceiptDownload(p.receiptNo)}
                      className="action-icon-button action-icon-button-primary"
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
          {payments.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              No payments found
            </div>
          )}
        </div>
      )}

      {/* ── LEDGER TAB ── */}
      {tab === 'Ledger' && (
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
              {ledger.map((e, i) => (
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
          {ledger.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              No ledger entries
            </div>
          )}
        </div>
      )}

      {/* ── LEAVE TAB ── */}
      {tab === 'Leave' && (
        <div className="space-y-3">
          {leaves.map(l => (
            <div key={l._id}
              className="card flex flex-wrap gap-4 justify-between items-start">
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
                  Applied by:{' '}
                  <span className="capitalize font-medium">
                    {l.appliedByRole || 'student'}
                  </span>
                </p>
              </div>
              <StatusBadge status={l.status} />
            </div>
          ))}
          {leaves.length === 0 && (
            <div className="card text-center py-10 text-gray-400">
              No leave records
            </div>
          )}
        </div>
      )}

      {/* ── OUTPASS TAB ── */}
      {tab === 'Outpass' && (
        <div className="space-y-3">
          {outpasses.map(o => (
            <div key={o._id}
              className="card flex flex-wrap gap-4 justify-between items-start">
              <div>
                <p className="font-medium text-gray-800">{o.reason}</p>
                <p className="text-sm text-gray-500">
                  Exit: {new Date(o.exitDate).toLocaleDateString('en-IN')} •{' '}
                  Return: {new Date(o.expectedReturn).toLocaleDateString('en-IN')}
                </p>
                {o.destination && (
                  <p className="text-sm text-gray-500">
                    Destination: {o.destination}
                  </p>
                )}
                {o.remarks && (
                  <p className="text-xs text-gray-400 mt-1">
                    Remarks: {o.remarks}
                  </p>
                )}
              </div>
              <StatusBadge status={o.status} />
            </div>
          ))}
          {outpasses.length === 0 && (
            <div className="card text-center py-10 text-gray-400">
              No outpass records
            </div>
          )}
        </div>
      )}

    </div>
  );
}
