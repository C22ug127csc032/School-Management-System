import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { FiCheck, FiPlus, FiX } from 'react-icons/fi';
import api from '../../api/axios.js';
import useListParams from '../../hooks/useListParams.js';
import { PageHeader, DataTable, StatusBadge, Pagination, Modal } from '../../components/common/index.jsx';
import { formatIndianDate, getIndianDateInputValue } from '../../utils/dateTime.js';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import useTeacherScope from '../../hooks/useTeacherScope.js';

export default function LeavePage() {
  const academicYear = useAcademicYear();
  const { isTeacherRole, isAdminRole, classTeacherOf } = useTeacherScope();
  const canReviewStudentLeaves = isAdminRole || Boolean(classTeacherOf);
  const canUseTeacherLeave = isTeacherRole || isAdminRole;
  const [activeTab, setActiveTab] = useState(canReviewStudentLeaves ? 'student' : 'teacher');
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState(1);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ leaveType: 'sick', fromDate: getIndianDateInputValue(), toDate: getIndianDateInputValue(), reason: '' });
  const [saving, setSaving] = useState(false);
  const { page, setPage, filters, setFilter, sortBy, sortOrder, setSort, params } = useListParams({
    initialFilters: { status: 'pending' },
    initialLimit: 10,
    initialSortBy: 'createdAt',
    initialSortOrder: 'desc',
  });

  useEffect(() => {
    if (activeTab === 'student' && !canReviewStudentLeaves) setActiveTab('teacher');
    if (activeTab === 'teacher' && !canUseTeacherLeave) setActiveTab('student');
  }, [activeTab, canReviewStudentLeaves, canUseTeacherLeave]);

  const load = useCallback(() => {
    setLoading(true);
    const isStudentTab = activeTab === 'student';
    const endpoint = isStudentTab ? '/leave' : '/substitutions/teacher-leaves';
    const requestParams = isStudentTab
      ? {
          ...params,
          academicYear,
          ...(canReviewStudentLeaves && !isAdminRole ? { classId: classTeacherOf || '__none__' } : {}),
        }
      : {
          status: filters.status || '',
        };

    api.get(endpoint, { params: requestParams })
      .then(response => {
        setLeaves(response.data.data || []);
        setPages(isStudentTab ? (response.data.pages || 1) : 1);
      })
      .catch(error => toast.error(error.response?.data?.message || 'Failed.'))
      .finally(() => setLoading(false));
  }, [activeTab, params, academicYear, canReviewStudentLeaves, isAdminRole, classTeacherOf, filters.status]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (id, status) => {
    try {
      const endpoint = activeTab === 'student' ? `/leave/${id}` : `/substitutions/teacher-leaves/${id}`;
      await api.put(endpoint, { status });
      toast.success(`Leave ${status}.`);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed.');
    }
  };

  const studentColumns = useMemo(() => [
    {
      key: 'student',
      label: 'Student',
      render: leave => leave.student ? (
        <div>
          <p className="font-semibold">{leave.student.firstName} {leave.student.lastName}</p>
          <p className="text-xs text-text-secondary">Grade {leave.student.grade} - {leave.student.section}</p>
        </div>
      ) : '-',
    },
    { key: 'type', label: 'Type', render: leave => <span className="badge-blue">{leave.leaveType}</span> },
    {
      key: 'dates',
      label: 'Dates',
      sortable: true,
      sortKey: 'fromDate',
      render: leave => (
        <div>
          <p className="text-sm">{formatIndianDate(leave.fromDate)} to {formatIndianDate(leave.toDate)}</p>
          <p className="text-xs text-text-secondary">{leave.noOfDays} day(s)</p>
        </div>
      ),
    },
    { key: 'reason', label: 'Reason', render: leave => <p className="max-w-xs text-xs">{leave.reason}</p> },
    { key: 'applied', label: 'Applied', render: leave => leave.appliedByRole },
    { key: 'status', label: 'Status', sortable: true, sortKey: 'status', render: leave => <StatusBadge status={leave.status} /> },
    {
      key: 'actions',
      label: '',
      render: leave => leave.status === 'pending' && canReviewStudentLeaves ? (
        <div className="flex gap-1">
          <button onClick={() => handleAction(leave._id, 'approved')} className="btn-success btn-sm"><FiCheck />Approve</button>
          <button onClick={() => handleAction(leave._id, 'rejected')} className="btn-danger btn-sm"><FiX />Reject</button>
        </div>
      ) : null,
    },
  ], [canReviewStudentLeaves]);

  const teacherColumns = useMemo(() => [
    {
      key: 'teacher',
      label: 'Teacher',
      render: leave => leave.teacher ? (
        <div>
          <p className="font-semibold">{leave.teacher.firstName} {leave.teacher.lastName}</p>
          <p className="text-xs text-text-secondary">{leave.teacher.employeeId}</p>
        </div>
      ) : '-',
    },
    { key: 'type', label: 'Type', render: leave => <span className="badge-blue">{leave.leaveType}</span> },
    {
      key: 'dates',
      label: 'Dates',
      render: leave => {
        const days = Math.max(1, Math.floor((new Date(leave.toDate) - new Date(leave.fromDate)) / 86400000) + 1);
        return (
          <div>
            <p className="text-sm">{formatIndianDate(leave.fromDate)} to {formatIndianDate(leave.toDate)}</p>
            <p className="text-xs text-text-secondary">{days} day(s)</p>
          </div>
        );
      },
    },
    { key: 'reason', label: 'Reason', render: leave => <p className="max-w-xs text-xs">{leave.reason}</p> },
    { key: 'status', label: 'Status', render: leave => <StatusBadge status={leave.status} /> },
    {
      key: 'actions',
      label: '',
      render: leave => leave.status === 'pending' && isAdminRole ? (
        <div className="flex gap-1">
          <button onClick={() => handleAction(leave._id, 'approved')} className="btn-success btn-sm"><FiCheck />Approve</button>
          <button onClick={() => handleAction(leave._id, 'rejected')} className="btn-danger btn-sm"><FiX />Reject</button>
        </div>
      ) : null,
    },
  ], [isAdminRole]);

  const handleApply = async () => {
    if (!form.reason) return toast.error('Reason required.');
    setSaving(true);
    try {
      await api.post('/substitutions/teacher-leaves', {
        ...form,
        academicYear,
      });
      toast.success('Leave request sent to admin.');
      setModal(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="float-in">
      <PageHeader
        title="Leave Requests"
        subtitle={
          activeTab === 'student'
            ? 'Review student leave applications'
            : (isAdminRole ? 'Approve teacher leave requests' : 'Send your leave requests to admin')
        }
        actions={activeTab === 'teacher' && isTeacherRole ? <button onClick={() => setModal(true)} className="btn-primary"><FiPlus />Apply Leave</button> : null}
      />
      <div className="campus-panel mb-4 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {canReviewStudentLeaves && (
              <button 
                onClick={() => setActiveTab('student')} 
                className={`btn-sm px-6 ${activeTab === 'student' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Review Student Leaves
              </button>
            )}
            {canUseTeacherLeave && (
              <button 
                onClick={() => setActiveTab('teacher')} 
                className={`btn-sm px-6 ${activeTab === 'teacher' ? 'btn-primary' : 'btn-secondary'}`}
              >
                {isAdminRole ? 'Staff Leave Requests' : 'My Leave Applications'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-2">Filter Status:</span>
            {['', 'pending', 'approved', 'rejected'].map(status => (
              <button key={status} onClick={() => setFilter('status', status)} className={`btn-sm ${filters.status === status ? 'btn-primary' : 'btn-secondary'}`}>{status || 'All'}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="campus-panel overflow-hidden">
        <DataTable
          columns={activeTab === 'student' ? studentColumns : teacherColumns}
          data={leaves}
          loading={loading}
          emptyMessage="No leave requests."
          sortBy={activeTab === 'student' ? sortBy : ''}
          sortOrder={activeTab === 'student' ? sortOrder : 'asc'}
          onSort={activeTab === 'student' ? setSort : undefined}
        />
        <div className="border-t border-border px-4 py-3">
          <Pagination page={page} pages={pages} onPage={setPage} />
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Apply for Leave" footer={<><button onClick={() => setModal(false)} className="btn-secondary btn-sm">Cancel</button><button onClick={handleApply} disabled={saving} className="btn-primary btn-sm">{saving ? 'Applying...' : 'Apply Leave'}</button></>}>
        <div className="space-y-4">
          <div className="form-group"><label className="label">Leave Type</label><select className="input" value={form.leaveType} onChange={e => setForm(c => ({ ...c, leaveType: e.target.value }))}><option value="sick">Sick Leave</option><option value="casual">Casual Leave</option><option value="duty">Duty Leave</option><option value="emergency">Emergency</option></select></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="form-group"><label className="label">From Date</label><input type="date" className="input" value={form.fromDate} onChange={e => setForm(c => ({ ...c, fromDate: e.target.value }))} /></div>
            <div className="form-group"><label className="label">To Date</label><input type="date" className="input" value={form.toDate} onChange={e => setForm(c => ({ ...c, toDate: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="label">Reason *</label><textarea className="input" rows="3" value={form.reason} onChange={e => setForm(c => ({ ...c, reason: e.target.value }))} /></div>
          <p className="text-xs text-text-secondary">Teacher leave requests will be sent to admin for approval.</p>
        </div>
      </Modal>
    </div>
  );
}
