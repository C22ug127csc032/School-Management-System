import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  EmptyState,
  ExportActions,
  FilterBar,
  ListControls,
  Modal,
  PageHeader,
  PageSpinner,
  Pagination,
  StatusBadge,
  Table,
} from '../../components/common';
import { FiCalendar, FiCheck, FiX } from '../../components/common/icons';
import toast from 'react-hot-toast';

const leaveSortOptions = [
  { value: 'latest:desc', label: 'Newest First' },
  { value: 'oldest:asc', label: 'Oldest First' },
  { value: 'fromDate:asc', label: 'Start Date' },
  { value: 'status:asc', label: 'Status A-Z' },
  { value: 'days:desc', label: 'More Days First' },
];

const parseSortValue = value => {
  const [sortBy = 'latest', sortOrder = 'desc'] = String(value || 'latest:desc').split(':');
  return { sortBy, sortOrder };
};

export default function LeaveManagement() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [remark, setRemark] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [controls, setControls] = useState({
    search: '',
    sort: 'latest:desc',
    startDate: '',
    endDate: '',
  });

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const { sortBy, sortOrder } = parseSortValue(controls.sort);
      const response = await api.get('/leave', {
        params: {
          status: filter || undefined,
          appliedByRole: user?.role === 'class_teacher' ? 'parent' : undefined,
          search: controls.search || undefined,
          startDate: controls.startDate || undefined,
          endDate: controls.endDate || undefined,
          sortBy,
          sortOrder,
          page,
          limit: pageSize,
        },
      });
      setLeaves(response.data.leaves || []);
      setTotal(response.data.total || 0);
      setPages(response.data.pages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [controls.endDate, controls.search, controls.sort, controls.startDate, filter, page, pageSize, user?.role]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleAction = async (id, status) => {
    try {
      await api.put(`/leave/${id}/status`, { status, remarks: remark });
      toast.success(`Leave ${status}`);
      setSelected(null);
      setRemark('');
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update leave request');
    }
  };

  const pendingCount = useMemo(
    () => leaves.filter(leave => leave.status === 'pending').length,
    [leaves]
  );

  const exportConfig = useMemo(() => ({
    fileName: `leave-management-${filter || 'all'}`,
    title: 'Leave Management Export',
    subtitle: 'Student leave requests filtered by approval status and date range.',
    summary: [
      { label: 'Status Filter', value: filter || 'All' },
      { label: 'Records in View', value: leaves.length },
      { label: 'Total Matching Records', value: total },
      { label: 'Pending in View', value: pendingCount },
      { label: 'Date From', value: controls.startDate || 'Not Set' },
      { label: 'Date To', value: controls.endDate || 'Not Set' },
    ],
    sections: [
      {
        title: 'Leave Requests',
        columns: [
          { header: 'Student', value: leave => `${leave.student?.firstName || ''} ${leave.student?.lastName || ''}`.trim() || '-' },
          { header: 'Reg No', value: leave => leave.student?.regNo || '-' },
          { header: 'Roll No', value: leave => leave.student?.rollNo || '-' },
          { header: 'Type', value: leave => leave.leaveType || '-' },
          { header: 'From', value: leave => new Date(leave.fromDate).toLocaleDateString('en-IN') },
          { header: 'To', value: leave => new Date(leave.toDate).toLocaleDateString('en-IN') },
          { header: 'Days', value: leave => leave.noOfDays || 0, align: 'right' },
          { header: 'Reason', value: leave => leave.reason || '-' },
          { header: 'Status', value: leave => leave.status || '-' },
          { header: 'Remarks', value: leave => leave.remarks || '-' },
        ],
        rows: leaves,
      },
    ],
  }), [controls.endDate, controls.startDate, filter, leaves, pendingCount, total]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        subtitle="Review leave requests with server-side search, sorting, and paging."
        action={<ExportActions getExportConfig={() => exportConfig} disabled={loading || leaves.length === 0} />}
      />

      <div className="card space-y-4">
        <FilterBar>
          {['', 'pending', 'approved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => {
                setFilter(status);
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </FilterBar>

        <ListControls
          searchValue={controls.search}
          onSearchChange={search => {
            setControls(current => ({ ...current, search }));
            setPage(1);
          }}
          searchPlaceholder="Search by student name, roll no, reg no, admission no, or phone"
          sortValue={controls.sort}
          onSortChange={sort => {
            setControls(current => ({ ...current, sort }));
            setPage(1);
          }}
          sortOptions={leaveSortOptions}
          pageSize={pageSize}
          onPageSizeChange={value => {
            setPageSize(value);
            setPage(1);
          }}
          resultCount={total}
          extraFilters={
            <div className="flex flex-wrap gap-3">
              <input
                type="date"
                className="input w-40"
                value={controls.startDate}
                onChange={event => {
                  setControls(current => ({ ...current, startDate: event.target.value }));
                  setPage(1);
                }}
              />
              <input
                type="date"
                className="input w-40"
                value={controls.endDate}
                onChange={event => {
                  setControls(current => ({ ...current, endDate: event.target.value }));
                  setPage(1);
                }}
              />
            </div>
          }
        />

        {loading ? (
          <PageSpinner />
        ) : (
          <>
            <Table
              headers={['Student', 'Reg No', 'Roll No', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Actions']}
              empty={leaves.length === 0 ? <EmptyState message="No leave requests found" icon={<FiCalendar />} /> : null}
            >
              {leaves.map(leave => (
                <tr key={leave._id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <p className="font-medium">{leave.student?.firstName} {leave.student?.lastName}</p>
                  </td>
                  <td className="table-cell font-mono text-xs text-gray-500">{leave.student?.regNo || '-'}</td>
                  <td className="table-cell font-mono text-xs text-gray-500">{leave.student?.rollNo || '-'}</td>
                  <td className="table-cell capitalize">{leave.leaveType}</td>
                  <td className="table-cell">{new Date(leave.fromDate).toLocaleDateString('en-IN')}</td>
                  <td className="table-cell">{new Date(leave.toDate).toLocaleDateString('en-IN')}</td>
                  <td className="table-cell text-center">{leave.noOfDays}</td>
                  <td className="table-cell max-w-xs truncate" title={leave.reason}>{leave.reason}</td>
                  <td className="table-cell"><StatusBadge status={leave.status} /></td>
                  <td className="table-cell">
                    {leave.status === 'pending' ? (
                      <button
                        onClick={() => {
                          setSelected(leave);
                          setRemark('');
                        }}
                        className="text-primary-600 hover:underline text-sm"
                      >
                        Review
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </Table>

            <Pagination page={page} pages={pages} onPage={setPage} />
          </>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Review Leave Request">
        {selected && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
              <p><span className="text-gray-500">Student:</span> <strong>{selected.student?.firstName} {selected.student?.lastName}</strong></p>
              <p><span className="text-gray-500">Period:</span> {new Date(selected.fromDate).toLocaleDateString('en-IN')} - {new Date(selected.toDate).toLocaleDateString('en-IN')} ({selected.noOfDays} days)</p>
              <p><span className="text-gray-500">Reason:</span> {selected.reason}</p>
            </div>
            <div>
              <label className="label">Remarks (optional)</label>
              <textarea className="input" rows={3} value={remark} onChange={event => setRemark(event.target.value)} placeholder="Add remarks..." />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => handleAction(selected._id, 'approved')} className="btn-success flex-1 flex items-center justify-center gap-2"><FiCheck /> Approve</button>
              <button onClick={() => handleAction(selected._id, 'rejected')} className="btn-danger flex-1 flex items-center justify-center gap-2"><FiX /> Reject</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
