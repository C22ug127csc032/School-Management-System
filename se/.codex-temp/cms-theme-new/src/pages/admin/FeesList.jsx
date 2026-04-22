import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import {
  EmptyState,
  ExportActions,
  FilterBar,
  ListControls,
  Pagination,
  PageHeader,
  PageSpinner,
  SearchableSelect,
  StatCard,
  StatusBadge,
  Table,
} from '../../components/common';
import {
  FiAlertOctagon,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
} from '../../components/common/icons';

const feeSortOptions = [
  { value: 'createdAt:desc', label: 'Newest First' },
  { value: 'due:desc', label: 'Highest Due' },
  { value: 'paid:desc', label: 'Highest Paid' },
  { value: 'amount:desc', label: 'Highest Total' },
  { value: 'academicYear:desc', label: 'Latest Academic Year' },
];

const parseFeeSortValue = value => {
  const [sortBy = 'createdAt', sortOrder = 'desc'] = String(value || 'createdAt:desc').split(':');
  return { sortBy, sortOrder };
};

export default function FeesList() {
  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    academicYear: '',
    department: '',
    search: '',
    sort: 'createdAt:desc',
  });

  const fmt = n => `Rs. ${(n || 0).toLocaleString('en-IN')}`;

  useEffect(() => {
    api.get('/courses')
      .then(response => {
        const nextDepartments = [...new Set(
          (response.data.courses || [])
            .map(course => course.department?.trim())
            .filter(Boolean)
        )].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
        setDepartments(nextDepartments);
      })
      .catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const { sortBy, sortOrder } = parseFeeSortValue(filters.sort);

    Promise.all([
      api.get('/fees/all', {
        params: {
          page,
          limit: pageSize,
          status: filters.status || undefined,
          academicYear: filters.academicYear || undefined,
          department: filters.department || undefined,
          search: filters.search || undefined,
          sortBy,
          sortOrder,
        },
      }),
      api.get('/fees/summary', {
        params: {
          status: filters.status || undefined,
          academicYear: filters.academicYear || undefined,
          department: filters.department || undefined,
        },
      }),
    ])
      .then(([feesRes, summaryRes]) => {
        setFees(feesRes.data.fees || []);
        setTotal(feesRes.data.total || 0);
        setPages(feesRes.data.pages || 1);
        setSummary(summaryRes.data.summary || {});
      })
      .finally(() => setLoading(false));
  }, [filters, page, pageSize]);
  useEffect(() => {
    if (page > pages && pages > 0) {
      setPage(pages);
    }
  }, [page, pages]);

  const exportConfig = useMemo(() => ({
    fileName: `fees-list-${filters.department || filters.status || 'all-records'}`,
    title: 'Fees List Export',
    subtitle: 'Filtered fee records across assigned student semesters.',
    summary: [
      { label: 'Rows in Current Page', value: fees.length },
      { label: 'Total Matching Records', value: total },
      { label: 'Total Billed', value: fmt(summary.totalBilled) },
      { label: 'Collected', value: fmt(summary.totalCollected) },
      { label: 'Pending Dues', value: fmt(summary.totalDue) },
      { label: 'Overdue Count', value: summary.overdueCount || 0 },
      { label: 'Department Filter', value: filters.department || 'All Departments' },
      { label: 'Status Filter', value: filters.status || 'All Status' },
      { label: 'Academic Year Filter', value: filters.academicYear || 'All Years' },
      { label: 'Search', value: filters.search || 'Not Applied' },
    ],
    sections: [
      {
        title: 'Fees Records',
        columns: [
          { header: 'Student', value: fee => `${fee.student?.firstName || ''} ${fee.student?.lastName || ''}`.trim() || '-' },
          { header: 'Reg No', value: fee => fee.student?.regNo || '-' },
          { header: 'Roll No', value: fee => fee.student?.rollNo || '-' },
          { header: 'Course', value: fee => fee.student?.course?.name || 'Unassigned Course' },
          { header: 'Department', value: fee => fee.student?.course?.department || 'No Department' },
          { header: 'Year / Semester', value: fee => `${fee.academicYear || '-'} / Sem ${fee.semester || '-'}` },
          { header: 'Total', value: fee => fmt(fee.totalAmount), align: 'right' },
          { header: 'Paid', value: fee => fmt(fee.totalPaid), align: 'right' },
          { header: 'Balance', value: fee => fmt(fee.totalDue), align: 'right' },
          { header: 'Status', value: fee => fee.status || '-' },
        ],
        rows: fees,
      },
    ],
  }), [fees, filters, summary, total]);

  return (
    <div>
      <PageHeader
        title="Fees List"
        action={<ExportActions getExportConfig={() => exportConfig} disabled={loading || fees.length === 0} />}
      />

      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<FiDollarSign />} label="Total Billed" value={fmt(summary.totalBilled)} color="blue" />
        <StatCard icon={<FiCheckCircle />} label="Collected" value={fmt(summary.totalCollected)} color="green" />
        <StatCard icon={<FiClock />} label="Pending Dues" value={fmt(summary.totalDue)} color="yellow" />
        <StatCard icon={<FiAlertOctagon />} label="Overdue" value={summary.overdueCount || 0} color="red" />
      </div>

      <div className="card">
        <FilterBar>
          <SearchableSelect
            className="w-36"
            value={filters.status}
            onChange={status => {
              setFilters(current => ({ ...current, status }));
              setPage(1);
            }}
            placeholder="All Status"
            searchPlaceholder="Search statuses..."
            options={[
              { value: '', label: 'All Status', searchText: 'all status' },
              ...['pending', 'partial', 'paid', 'overdue'].map(status => ({
                value: status,
                label: status,
                searchText: status,
              })),
            ]}
          />

          <input
            className="input w-48"
            placeholder="Search Academic Year"
            value={filters.academicYear}
            onChange={e => {
              setFilters(current => ({ ...current, academicYear: e.target.value }));
              setPage(1);
            }}
          />

          <SearchableSelect
            className="w-48"
            value={filters.department}
            onChange={department => {
              setFilters(current => ({ ...current, department }));
              setPage(1);
            }}
            placeholder="All Departments"
            searchPlaceholder="Search departments..."
            options={[
              { value: '', label: 'All Departments', searchText: 'all departments' },
              ...departments.map(department => ({
                value: department,
                label: department,
                searchText: department,
              })),
            ]}
          />
        </FilterBar>

        <ListControls
          searchValue={filters.search}
          onSearchChange={search => {
            setFilters(current => ({ ...current, search }));
            setPage(1);
          }}
          searchPlaceholder="Search student / reg no / roll no / course..."
          sortValue={filters.sort}
          onSortChange={sort => {
            setFilters(current => ({ ...current, sort }));
            setPage(1);
          }}
          sortOptions={feeSortOptions}
          pageSize={pageSize}
          onPageSizeChange={value => {
            setPageSize(value);
            setPage(1);
          }}
          resultCount={total}
        />

        {loading ? (
          <PageSpinner />
        ) : fees.length === 0 ? (
          <EmptyState message="No fees records found" />
        ) : (
          <div className="space-y-4">
            <Table headers={['Student', 'Course', 'Year/Sem', 'Total', 'Paid', 'Balance', 'Status']}>
              {fees.map(fee => (
                <tr key={fee._id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <p className="font-medium">
                      {fee.student?.firstName} {fee.student?.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{fee.student?.regNo}</p>
                  </td>
                  <td className="table-cell text-sm text-gray-500">
                    <p>{fee.student?.course?.name || 'Unassigned Course'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {fee.student?.course?.department || 'No Department'}
                    </p>
                  </td>
                  <td className="table-cell text-sm">
                    {fee.academicYear} / Sem {fee.semester}
                  </td>
                  <td className="table-cell font-medium">{fmt(fee.totalAmount)}</td>
                  <td className="table-cell text-green-600">{fmt(fee.totalPaid)}</td>
                  <td className="table-cell text-red-600 font-medium">{fmt(fee.totalDue)}</td>
                  <td className="table-cell">
                    <StatusBadge status={fee.status} />
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination page={page} pages={pages || 1} onPage={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
