import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiAlertCircle,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiLayers,
  FiRefreshCw,
  FiSend,
  FiUser,
} from 'react-icons/fi';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatIndianDate, formatIndianDateTime } from '../../utils/dateTime.js';

function usePortalData(path, defaultValue) {
  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const response = await api.get(path);
      setData(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load portal data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [path]);

  return { data, loading, reload };
}

async function loadRazorpayScript() {
  if (window.Razorpay) return true;

  return new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function ModuleHeader({ eyebrow = 'Portal Module', title, subtitle, action }) {
  return (
    <div className="campus-panel overflow-hidden p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">{subtitle}</p>
        </div>
        {action || null}
      </div>
    </div>
  );
}

function MetricRow({ items }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map(item => (
        <div key={item.label} className="stat-card">
          <div className="stat-icon">{item.icon}</div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{item.label}</p>
            <p className="text-xl font-bold text-text-primary">{item.value}</p>
            {item.helper ? <p className="text-xs text-text-secondary">{item.helper}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingState({ label = 'Loading module...' }) {
  return (
    <div className="campus-panel p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
        <FiRefreshCw className="animate-spin text-xl" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-600">{label}</p>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="campus-panel p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <FiLayers className="text-xl" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const normalized = String(status || '').toLowerCase();
  const className =
    normalized === 'paid' || normalized === 'present' || normalized === 'approved' || normalized === 'returned'
      ? 'badge-green'
      : normalized === 'partial' || normalized === 'late'
        ? 'badge-yellow'
        : normalized === 'pending' || normalized === 'issued'
          ? 'badge-blue'
          : 'badge-red';
  return <span className={className}>{String(status || '-').replace(/_/g, ' ')}</span>;
}

function StudentContextCard({ student, extra }) {
  return (
    <div className="campus-panel p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Student Context</p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">{student?.fullName || '-'}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {student?.className || '-'} • Admission No: {student?.admissionNo || '-'} • Academic Year: {student?.academicYear || '-'}
          </p>
        </div>
        {extra || null}
      </div>
    </div>
  );
}

export function PortalStudentProfilePage({ viewerLabel = 'Student Profile' }) {
  const { data, loading } = usePortalData('/portal/overview', null);

  if (loading) return <LoadingState label="Loading student profile..." />;

  const student = data?.student;

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Profile"
        title={viewerLabel}
        subtitle="Academic profile, admission details, and registered family contact information for the linked student."
      />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="campus-panel p-6">
          <h2 className="text-lg font-bold text-slate-900">Academic Information</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoField label="Student Name" value={student?.fullName} />
            <InfoField label="Admission Number" value={student?.admissionNo} />
            <InfoField label="Class" value={student?.className} />
            <InfoField label="Academic Year" value={student?.academicYear} />
            <InfoField label="Roll Number" value={student?.rollNo} />
            <InfoField label="Register Number" value={student?.registerNo} />
            <InfoField label="Admission Date" value={formatIndianDate(student?.admissionDate) || '-'} />
            <InfoField label="Status" value={String(student?.status || '-').replace(/_/g, ' ')} />
          </div>
        </div>
        <div className="campus-panel p-6">
          <h2 className="text-lg font-bold text-slate-900">Parent / Guardian Details</h2>
          <div className="mt-5 space-y-4">
            <InfoBlock title="Father" lines={[student?.father?.name, student?.father?.phone, student?.father?.email]} />
            <InfoBlock title="Mother" lines={[student?.mother?.name, student?.mother?.phone, student?.mother?.email]} />
            <InfoBlock title="Guardian" lines={[student?.guardian?.name, student?.guardian?.relation, student?.guardian?.phone]} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PortalFeesPage() {
  const { data, loading, reload } = usePortalData('/portal/fees', null);
  const [payingId, setPayingId] = useState('');
  const [partialAmounts, setPartialAmounts] = useState({});

  if (loading) return <LoadingState label="Loading fees..." />;

  const { student, feeAssignments = [], payments = [], summary, onlinePayment } = data || {};

  const handleOnlinePayment = async feeItem => {
    if (!onlinePayment?.enabled) {
      return toast.error('Online payment is not configured yet.');
    }

     const enteredAmount = Number(partialAmounts[feeItem._id] || feeItem.dueAmount || 0);
     if (!enteredAmount || enteredAmount <= 0) {
       return toast.error('Enter a valid online payment amount.');
     }
     if (enteredAmount > Number(feeItem.dueAmount || 0)) {
       return toast.error('Online payment amount cannot be more than the due amount.');
     }

    setPayingId(feeItem._id);
    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        return toast.error('Unable to load Razorpay checkout.');
      }

      const orderResponse = await api.post('/portal/fees/create-order', {
        studentFeesId: feeItem._id,
        amount: enteredAmount,
      });

      const order = orderResponse.data.data;
      const razorpay = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.orderId,
        prefill: order.prefill,
        theme: { color: '#1E3EA0' },
        handler: async response => {
          try {
            await api.post('/portal/fees/verify-payment', {
              studentFeesId: feeItem._id,
              ...response,
            });
            toast.success('Payment completed successfully.');
            reload();
          } catch (error) {
            toast.error(error.response?.data?.message || 'Payment verification failed.');
          } finally {
            setPayingId('');
          }
        },
        modal: {
          ondismiss: () => setPayingId(''),
        },
      });

      razorpay.open();
    } catch (error) {
      setPayingId('');
      toast.error(error.response?.data?.message || 'Unable to start online payment.');
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Finance"
        title="Assigned Fees"
        subtitle="Track assigned fee structures, due amounts, recorded payments, and online-payment readiness for the linked student."
      />
      <StudentContextCard
        student={student}
        extra={
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-semibold text-slate-900">Online Payment</p>
            <p className="mt-1 text-slate-500">{onlinePayment?.message || 'Payment gateway not configured.'}</p>
          </div>
        }
      />
      <MetricRow
        items={[
          { label: 'Total Assigned', value: `Rs ${Number(summary?.totalAssigned || 0).toLocaleString('en-IN')}`, icon: <FiCreditCard className="text-2xl text-primary-700" /> },
          { label: 'Total Paid', value: `Rs ${Number(summary?.totalPaid || 0).toLocaleString('en-IN')}`, icon: <FiCheckCircle className="text-2xl text-emerald-600" /> },
          { label: 'Current Due', value: `Rs ${Number(summary?.totalDue || 0).toLocaleString('en-IN')}`, icon: <FiAlertCircle className="text-2xl text-amber-600" /> },
          { label: 'Gateway', value: onlinePayment?.enabled ? 'Razorpay Ready' : 'Setup Pending', icon: <FiSend className="text-2xl text-indigo-600" /> },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DataCard title="Assigned Fee Heads">
          {feeAssignments.length === 0 ? (
            <EmptyState title="No fees assigned yet" description="Assigned fee structures will appear here once the accounts team publishes them." />
          ) : (
            <div className="space-y-4">
              {feeAssignments.map(item => (
                <div key={item._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-base font-bold text-slate-900">{item.structure?.name || item.term || 'Fee Assignment'}</p>
                      <p className="mt-1 text-sm text-slate-500">Due Date: {formatIndianDate(item.dueDate) || 'Not set'} • Term: {item.term || 'General'}</p>
                    </div>
                    <StatusPill status={item.status} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <SmallStat label="Total" value={`Rs ${Number(item.totalAmount || 0).toLocaleString('en-IN')}`} />
                    <SmallStat label="Paid" value={`Rs ${Number(item.paidAmount || 0).toLocaleString('en-IN')}`} />
                    <SmallStat label="Due" value={`Rs ${Number(item.dueAmount || 0).toLocaleString('en-IN')}`} />
                  </div>
                  {Number(item.dueAmount || 0) > 0 && (
                    <div className="mt-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,16rem)_auto] sm:items-end">
                        <div className="form-group mb-0">
                          <label className="label">Online Payment Amount</label>
                          <input
                            type="number"
                            min="1"
                            max={Number(item.dueAmount || 0)}
                            step="0.01"
                            className="input"
                            value={partialAmounts[item._id] ?? item.dueAmount}
                            onChange={event => setPartialAmounts(current => ({ ...current, [item._id]: event.target.value }))}
                          />
                          <p className="mt-2 text-xs text-slate-500">
                            Enter full or partial amount up to Rs {Number(item.dueAmount || 0).toLocaleString('en-IN')}.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOnlinePayment(item)}
                        disabled={!onlinePayment?.enabled || payingId === item._id}
                        className="btn-primary"
                      >
                        <FiCreditCard />
                        {payingId === item._id ? 'Opening Payment...' : 'Pay Online'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DataCard>
        <DataCard title="Payment History">
          {payments.length === 0 ? (
            <EmptyState title="No payments recorded" description="Receipts and payment history will appear here after fee collection entries are recorded." />
          ) : (
            <div className="space-y-4">
              {payments.map(item => (
                <div key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">Receipt {item.receiptNo || '-'}</p>
                      <p className="text-sm text-slate-500">{formatIndianDateTime(item.paymentDate)} • {String(item.paymentMode || '-').toUpperCase()}</p>
                    </div>
                    <p className="text-lg font-black text-primary-700">Rs {Number(item.amount || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DataCard>
      </div>
    </div>
  );
}

export function PortalAttendancePage() {
  const { data, loading } = usePortalData('/portal/attendance', null);

  if (loading) return <LoadingState label="Loading attendance..." />;

  const { student, summary, records = [] } = data || {};

  return (
    <div className="space-y-6">
      <ModuleHeader eyebrow="Attendance" title="Attendance Summary" subtitle="Review daily attendance status for the linked student." />
      <StudentContextCard student={student} />
      <MetricRow
        items={[
          { label: 'Present', value: summary?.present || 0, icon: <FiCheckCircle className="text-2xl text-emerald-600" /> },
          { label: 'Absent', value: summary?.absent || 0, icon: <FiAlertCircle className="text-2xl text-red-600" /> },
          { label: 'Late', value: summary?.late || 0, icon: <FiClock className="text-2xl text-amber-600" /> },
          { label: 'Total Days', value: summary?.total || 0, icon: <FiCalendar className="text-2xl text-primary-700" /> },
        ]}
      />
      <DataCard title="Daily Attendance Log">
        {records.length === 0 ? (
          <EmptyState title="No attendance records yet" description="Attendance entries will appear here once the class teacher marks them." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {records.map(item => (
                  <tr key={`${item.date}-${item.status}`}>
                    <td className="table-cell">{formatIndianDate(item.date)}</td>
                    <td className="table-cell"><StatusPill status={item.status} /></td>
                    <td className="table-cell">{item.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>
    </div>
  );
}

export function PortalTimetablePage() {
  const { data, loading } = usePortalData('/portal/timetable', null);

  if (loading) return <LoadingState label="Loading timetable..." />;

  const { student, periods = [], grid = {} } = data || {};

  return (
    <div className="space-y-6">
      <ModuleHeader eyebrow="Schedule" title="Class Timetable" subtitle="Weekly timetable for the linked student’s class." />
      <StudentContextCard student={student} />
      {!periods.length ? (
        <EmptyState title="No timetable published" description="Class periods will appear here after the timetable is generated for the selected academic year." />
      ) : (
        <div className="campus-panel overflow-x-auto p-4">
          <table className="tt-grid min-w-[860px]">
            <thead>
              <tr>
                <th className="tt-header-cell tt-day-header">Day</th>
                {periods.map(period => (
                  <th key={period._id} className="tt-header-cell">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{period.name || `Period ${period.periodNo}`}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-900">{period.startTime} - {period.endTime}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(grid).map(day => (
                <tr key={day}>
                  <td className="tt-header-cell tt-day-header">{day}</td>
                  {periods.map(period => {
                    const slot = grid?.[day]?.[String(period._id)];
                    return (
                      <td key={`${day}-${period._id}`} className="tt-header-cell">
                        {!slot ? (
                          <div className="tt-slot tt-slot-empty">
                            <span className="text-xs font-semibold text-slate-400">Free</span>
                          </div>
                        ) : (
                          <div className="tt-slot">
                            <p className="tt-slot-subject">{slot.subject?.name || '-'}</p>
                            <p className="tt-slot-teacher">{slot.teacher ? `${slot.teacher.firstName} ${slot.teacher.lastName}` : '-'}</p>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function PortalHomeworkPage() {
  const { data, loading } = usePortalData('/portal/homework', null);

  if (loading) return <LoadingState label="Loading homework..." />;

  const { student, homework = [] } = data || {};

  return (
    <div className="space-y-6">
      <ModuleHeader eyebrow="Homework" title="Assigned Work" subtitle="Subject-wise homework for the linked student’s class." />
      <StudentContextCard student={student} />
      {homework.length === 0 ? (
        <EmptyState title="No homework assigned" description="Homework will appear here when teachers assign it for this class." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {homework.map(item => (
            <div key={item._id} className="campus-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">{item.subject?.name || 'Subject'}</p>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">{item.title}</h2>
                </div>
                <StatusPill status={new Date(item.dueDate) < new Date() ? 'due' : 'active'} />
              </div>
              <p className="mt-3 text-sm text-slate-500">{item.description || 'No additional description provided.'}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SmallStat label="Due Date" value={formatIndianDate(item.dueDate)} />
                <SmallStat label="Teacher" value={item.teacher ? `${item.teacher.firstName} ${item.teacher.lastName}` : '-'} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PortalCircularsPage() {
  const { data, loading } = usePortalData('/portal/circulars', null);

  if (loading) return <LoadingState label="Loading circulars..." />;

  const { student, circulars = [] } = data || {};

  return (
    <div className="space-y-6">
      <ModuleHeader eyebrow="Circulars" title="School Notices" subtitle="Circulars, notices, events, and class announcements visible to this portal." />
      <StudentContextCard student={student} />
      {circulars.length === 0 ? (
        <EmptyState title="No circulars available" description="Published notices for this audience and class will appear here." />
      ) : (
        <div className="space-y-4">
          {circulars.map(item => (
            <div key={item._id} className="campus-panel p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">{item.type}</p>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">{item.title}</h2>
                </div>
                <p className="text-sm font-semibold text-slate-500">{formatIndianDate(item.publishDate)}</p>
              </div>
              <p className="mt-3 text-sm text-slate-600">{item.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PortalExamsPage() {
  const { data, loading } = usePortalData('/portal/exams', null);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (!selectedExamId) {
      setReport(null);
      return;
    }

    setReportLoading(true);
    api.get(`/portal/report-cards/${selectedExamId}`)
      .then(response => setReport(response.data.data))
      .catch(error => {
        setReport(null);
        toast.error(error.response?.data?.message || 'Failed to load report card.');
      })
      .finally(() => setReportLoading(false));
  }, [selectedExamId]);

  if (loading) return <LoadingState label="Loading exams and marks..." />;

  const { student, exams = [], schedules = [] } = data || {};

  return (
    <div className="space-y-6">
      <ModuleHeader eyebrow="Assessments" title="Exams and Report Cards" subtitle="Exam schedule and published marks for the linked student." />
      <StudentContextCard student={student} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <DataCard title="Published Exams">
          {exams.length === 0 ? (
            <EmptyState title="No published exams" description="Published exams and report availability will appear here." />
          ) : (
            <div className="space-y-4">
              {exams.map(item => (
                <button
                  type="button"
                  key={item._id}
                  onClick={() => setSelectedExamId(item._id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${selectedExamId === item._id ? 'border-primary-600 bg-primary-50' : 'border-slate-200 bg-slate-50 hover:border-primary-300'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-500">{item.examType?.replace(/_/g, ' ')} • {formatIndianDate(item.startDate) || 'Date pending'}</p>
                    </div>
                    <StatusPill status={item.reportReady ? 'ready' : 'pending'} />
                  </div>
                  {item.summary ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <SmallStat label="Percentage" value={`${item.summary.percentage}%`} />
                      <SmallStat label="Result" value={item.summary.result} />
                      <SmallStat label="Subjects" value={item.summary.subjects} />
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </DataCard>
        <DataCard title="Exam Schedule">
          {schedules.length === 0 ? (
            <EmptyState title="No schedule published" description="Exam dates and subjects for this class will show here once published." />
          ) : (
            <div className="space-y-4">
              {schedules.map(item => (
                <div key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="font-bold text-slate-900">{item.paperName || item.subject?.name || 'Subject'}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.exam?.name || 'Exam'} • {formatIndianDate(item.date)}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.startTime || '-'} to {item.endTime || '-'}</p>
                  {item.componentSubjects?.length ? (
                    <p className="mt-1 text-xs text-slate-500">{item.componentSubjects.map(subject => subject?.name).filter(Boolean).join(', ')}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </DataCard>
      </div>
      <DataCard title="Report Card Preview">
        {reportLoading ? (
          <LoadingState label="Loading report card..." />
        ) : !selectedExamId ? (
          <EmptyState title="Select an exam" description="Choose an exam from the list above to preview marks and overall result." />
        ) : !report ? (
          <EmptyState title="Report card not available" description="Marks may not be published yet for the selected exam." />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-4">
              <SmallStat label="Total" value={`${report.summary.totalObtained} / ${report.summary.totalMax}`} />
              <SmallStat label="Percentage" value={`${report.summary.percentage}%`} />
              <SmallStat label="Result" value={report.summary.result} />
              <SmallStat label="Subjects" value={report.summary.totalSubjects} />
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="table-header">Subject</th>
                    <th className="table-header">Marks</th>
                    <th className="table-header">Grade</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.marks.map(item => (
                    <tr key={item._id}>
                      <td className="table-cell">{item.subject?.name || '-'}</td>
                      <td className="table-cell">{item.isAbsent ? 'Absent' : `${item.marksObtained} / ${item.maxMarks}`}</td>
                      <td className="table-cell">{item.grade || '-'}</td>
                      <td className="table-cell"><StatusPill status={item.isAbsent ? 'absent' : item.isPassed ? 'pass' : 'fail'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DataCard>
    </div>
  );
}

export function PortalLibraryPage() {
  const { data, loading } = usePortalData('/portal/library', null);

  if (loading) return <LoadingState label="Loading library records..." />;

  const { student, issues = [], summary } = data || {};

  return (
    <div className="space-y-6">
      <ModuleHeader eyebrow="Library" title="Book Issue Status" subtitle="Issued books, return records, and fines for the linked student." />
      <StudentContextCard student={student} />
      <MetricRow
        items={[
          { label: 'Active Issues', value: summary?.active || 0, icon: <FiBookOpen className="text-2xl text-primary-700" /> },
          { label: 'Returned', value: summary?.returned || 0, icon: <FiCheckCircle className="text-2xl text-emerald-600" /> },
          { label: 'Total Fine', value: `Rs ${Number(summary?.totalFine || 0).toLocaleString('en-IN')}`, icon: <FiAlertCircle className="text-2xl text-amber-600" /> },
          { label: 'Records', value: issues.length, icon: <FiFileText className="text-2xl text-indigo-600" /> },
        ]}
      />
      <DataCard title="Library Transactions">
        {issues.length === 0 ? (
          <EmptyState title="No library activity" description="Book issues and returns will appear here once the student uses the library." />
        ) : (
          <div className="space-y-4">
            {issues.map(item => (
              <div key={item._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{item.book?.title || '-'}</p>
                    <p className="text-sm text-slate-500">{item.book?.author || '-'} • Accession: {item.book?.accessionNo || '-'}</p>
                  </div>
                  <StatusPill status={item.status} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <SmallStat label="Issued" value={formatIndianDate(item.issueDate)} />
                  <SmallStat label="Due" value={formatIndianDate(item.dueDate)} />
                  <SmallStat label="Fine" value={`Rs ${Number(item.fine || 0).toLocaleString('en-IN')}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </DataCard>
    </div>
  );
}

export function PortalLeavesPage() {
  const { user } = useAuth();
  const { data, loading, reload } = usePortalData('/portal/leaves', null);
  const [form, setForm] = useState({ leaveType: 'personal', fromDate: '', toDate: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const submitLeave = async e => {
    e.preventDefault();
    if (!form.fromDate || !form.toDate || !form.reason.trim()) {
      return toast.error('Fill all leave fields first.');
    }

    setSaving(true);
    try {
      await api.post('/portal/leaves', form);
      toast.success('Leave request submitted.');
      setForm({ leaveType: 'personal', fromDate: '', toDate: '', reason: '' });
      reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading leave records..." />;

  const { student, leaves = [] } = data || {};

  return (
    <div className="space-y-6">
      <ModuleHeader eyebrow="Leave" title="Leave Management" subtitle="Submit leave requests and review approval status for the linked student." />
      <StudentContextCard student={student} />
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <DataCard title={`New Leave Request (${user?.role === 'parent' ? 'Parent' : 'Student'})`}>
          <form onSubmit={submitLeave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-group mb-0">
                <label className="label">Leave Type</label>
                <select className="input" value={form.leaveType} onChange={e => setForm(current => ({ ...current, leaveType: e.target.value }))}>
                  {['personal', 'medical', 'family', 'exam', 'other'].map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="label">From Date</label>
                <input className="input" type="date" value={form.fromDate} onChange={e => setForm(current => ({ ...current, fromDate: e.target.value }))} />
              </div>
              <div className="form-group mb-0">
                <label className="label">To Date</label>
                <input className="input" type="date" value={form.toDate} onChange={e => setForm(current => ({ ...current, toDate: e.target.value }))} />
              </div>
              <div className="form-group mb-0 sm:col-span-2">
                <label className="label">Reason</label>
                <textarea className="input min-h-[120px]" value={form.reason} onChange={e => setForm(current => ({ ...current, reason: e.target.value }))} />
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              <FiSend />
              {saving ? 'Submitting...' : 'Submit Leave Request'}
            </button>
          </form>
        </DataCard>
        <DataCard title="Leave History">
          {leaves.length === 0 ? (
            <EmptyState title="No leave requests yet" description="Leave approvals and request history will appear here." />
          ) : (
            <div className="space-y-4">
              {leaves.map(item => (
                <div key={item._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-bold capitalize text-slate-900">{item.leaveType || 'Leave'}</p>
                      <p className="text-sm text-slate-500">
                        {formatIndianDate(item.fromDate)} to {formatIndianDate(item.toDate)} • {item.noOfDays || '-'} day(s)
                      </p>
                    </div>
                    <StatusPill status={item.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{item.reason}</p>
                  {item.remarks ? <p className="mt-2 text-xs font-medium text-slate-500">Reviewer note: {item.remarks}</p> : null}
                </div>
              ))}
            </div>
          )}
        </DataCard>
      </div>
    </div>
  );
}

function DataCard({ title, children }) {
  return (
    <div className="campus-panel p-6">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function SmallStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value || '-'}</p>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value || '-'}</p>
    </div>
  );
}

function InfoBlock({ title, lines }) {
  const filtered = lines.filter(Boolean);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{title}</p>
      {filtered.length ? filtered.map(line => (
        <p key={`${title}-${line}`} className="mt-1 text-sm font-semibold text-slate-900">{line}</p>
      )) : <p className="mt-2 text-sm text-slate-500">Not available</p>}
    </div>
  );
}
