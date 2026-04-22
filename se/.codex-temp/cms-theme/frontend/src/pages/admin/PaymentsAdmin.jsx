import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { downloadPaymentReceipt } from '../../api/axios';
import {
  EmptyState,
  ExportActions,
  ListControls,
  Modal,
  PageHeader,
  PageSpinner,
  Pagination,
  SearchableSelect,
  StatusBadge,
  Table,
} from '../../components/common';
import { FiCreditCard, FiDownload } from '../../components/common/icons';
import { useAppSettings } from '../../context/AppSettingsContext';
import toast from 'react-hot-toast';
import { getFirstActiveValue, toSelectOptions } from '../../utils/appSettings';
import { getStudentIdentifier, toStudentSelectOption } from '../../utils/studentDisplay';

const paymentSortOptions = [
  { value: 'latest:desc', label: 'Newest First' },
  { value: 'oldest:asc', label: 'Oldest First' },
  { value: 'amount:desc', label: 'Higher Amount First' },
  { value: 'mode:asc', label: 'Mode A-Z' },
  { value: 'status:asc', label: 'Status A-Z' },
];

const parseSortValue = value => {
  const [sortBy = 'latest', sortOrder = 'desc'] = String(value || 'latest:desc').split(':');
  return { sortBy, sortOrder };
};

export default function PaymentsAdmin() {
  const { getMasterOptions } = useAppSettings();
  const paymentModeOptions = toSelectOptions(getMasterOptions('finance_payment_modes', [
    { value: 'online', label: 'Online' },
    { value: 'cash', label: 'Cash' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'dd', label: 'DD' },
    { value: 'neft', label: 'NEFT' },
  ]));
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    mode: '',
    search: '',
    department: '',
    sort: 'latest:desc',
  });
  const [showManual, setShowManual] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentFeesOptions, setStudentFeesOptions] = useState([]);
  const [manualForm, setManualForm] = useState({
    studentId: '',
    studentFeesId: '',
    amount: '',
    paymentMode: getFirstActiveValue(paymentModeOptions, 'cash'),
    description: '',
  });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const { sortBy, sortOrder } = parseSortValue(filters.sort);
      const response = await api.get('/payments', {
        params: {
          page,
          limit: pageSize,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          mode: filters.mode || undefined,
          search: filters.search || undefined,
          department: filters.department || undefined,
          sortBy,
          sortOrder,
        },
      });
      setPayments(response.data.payments || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    api.get('/students?limit=500').then(response => {
      setStudents(response.data.students || []);
    });
  }, []);

  useEffect(() => {
    if (!manualForm.studentId) {
      setStudentFeesOptions([]);
      return;
    }

    api.get(`/fees/student/${manualForm.studentId}`)
      .then(response => {
        setStudentFeesOptions((response.data.fees || []).filter(fee => fee.totalDue > 0));
      })
      .catch(() => setStudentFeesOptions([]));
  }, [manualForm.studentId]);

  const selectedFee = studentFeesOptions.find(fee => fee._id === manualForm.studentFeesId);
  const departments = [...new Set(
    students
      .map(student => student.course?.department?.trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const studentOptions = useMemo(
    () => students.map(toStudentSelectOption),
    [students]
  );
  const departmentOptions = useMemo(
    () => [
      { value: '', label: 'All Departments', searchText: 'all departments' },
      ...departments.map(department => ({
        value: department,
        label: department,
        searchText: department,
      })),
    ],
    [departments]
  );
  const modeOptions = useMemo(
    () => [
      { value: '', label: 'All Modes', searchText: 'all modes' },
      ...paymentModeOptions,
    ],
    [paymentModeOptions]
  );
  const assignedFeeOptions = useMemo(
    () => [
      {
        value: '',
        label: manualForm.studentId ? 'Select assigned fee' : 'Select student first',
        searchText: '',
      },
      ...studentFeesOptions.map(fee => ({
        value: fee._id,
        label: `${fee.academicYear} / Sem ${fee.semester} - Due Rs. ${(fee.totalDue || 0).toLocaleString('en-IN')}`,
        searchText: `${fee.academicYear} ${fee.semester} ${(fee.totalDue || 0)} due assigned fee`,
      })),
    ],
    [manualForm.studentId, studentFeesOptions]
  );
  const manualModeOptions = useMemo(
    () => paymentModeOptions.filter(option => option.value !== 'online'),
    [paymentModeOptions]
  );

  const groupedPayments = payments.reduce((groups, payment) => {
    const department = payment.student?.course?.department || 'Unassigned Department';
    const existingGroup = groups.find(group => group.key === department);

    if (existingGroup) {
      existingGroup.payments.push(payment);
      return groups;
    }

    groups.push({
      key: department,
      title: department,
      payments: [payment],
    });
    return groups;
  }, []);

  const handleReceiptDownload = async paymentReceiptNo => {
    try {
      await downloadPaymentReceipt(paymentReceiptNo);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download receipt');
    }
  };

  const handleManual = async e => {
    e.preventDefault();
    if (!manualForm.studentFeesId) {
      toast.error('Select the assigned fee record');
      return;
    }

    await api.post('/payments/manual', manualForm);
    toast.success('Payment recorded');
    setShowManual(false);
    setManualForm({
      studentId: '',
      studentFeesId: '',
      amount: '',
      paymentMode: getFirstActiveValue(paymentModeOptions, 'cash'),
      description: '',
    });
    fetchPayments();
  };

  const renderPaymentsTable = paymentRows => (
    <Table headers={['Receipt No', 'Student', 'Date', 'Amount', 'Mode', 'Status', 'Receipt']}>
      {paymentRows.map(payment => (
        <tr key={payment._id} className="hover:bg-gray-50">
          <td className="table-cell font-mono text-xs">{payment.receiptNo}</td>
          <td className="table-cell">
            <p className="font-medium">{payment.student?.firstName} {payment.student?.lastName}</p>
            <p className="text-xs text-gray-400">{getStudentIdentifier(payment.student) || '-'}</p>
            <p className="text-xs text-gray-400 mt-0.5">{payment.student?.course?.name || 'No Course'}</p>
          </td>
          <td className="table-cell">{new Date(payment.paymentDate).toLocaleDateString('en-IN')}</td>
          <td className="table-cell font-semibold text-green-600">Rs. {payment.amount?.toLocaleString('en-IN')}</td>
          <td className="table-cell uppercase text-xs">{payment.paymentMode}</td>
          <td className="table-cell"><StatusBadge status={payment.status} /></td>
          <td className="table-cell">
            <button
              type="button"
              onClick={() => handleReceiptDownload(payment.receiptNo)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-500 bg-white text-primary-600 transition hover:bg-primary-600 hover:text-white"
              aria-label={`Download receipt ${payment.receiptNo}`}
              title="Download receipt"
            >
              <FiDownload className="text-sm" />
            </button>
          </td>
        </tr>
      ))}
    </Table>
  );

  const exportConfig = useMemo(() => ({
    fileName: `payments-${filters.department || filters.mode || 'all'}`,
    title: 'Payments Export',
    subtitle: 'Filtered payment transactions with receipt references.',
    summary: [
      { label: 'Rows in Current View', value: payments.length },
      { label: 'Total Records', value: total },
      { label: 'Amount in Current View', value: `Rs. ${payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0).toLocaleString('en-IN')}` },
      { label: 'Date From', value: filters.startDate || 'Not Set' },
      { label: 'Date To', value: filters.endDate || 'Not Set' },
      { label: 'Mode Filter', value: filters.mode || 'All Modes' },
      { label: 'Department Filter', value: filters.department || 'All Departments' },
      { label: 'Search', value: filters.search || 'Not Applied' },
    ],
    sections: [
      {
        title: 'Payments',
        columns: [
          { header: 'Receipt No', value: payment => payment.receiptNo || '-' },
          { header: 'Student', value: payment => `${payment.student?.firstName || ''} ${payment.student?.lastName || ''}`.trim() || '-' },
          { header: 'Identifier', value: payment => getStudentIdentifier(payment.student) || '-' },
          { header: 'Course', value: payment => payment.student?.course?.name || 'No Course' },
          { header: 'Department', value: payment => payment.student?.course?.department || 'Unassigned Department' },
          { header: 'Date', value: payment => new Date(payment.paymentDate).toLocaleDateString('en-IN') },
          { header: 'Amount', value: payment => `Rs. ${Number(payment.amount || 0).toLocaleString('en-IN')}`, align: 'right' },
          { header: 'Mode', value: payment => payment.paymentMode?.toUpperCase() || '-' },
          { header: 'Status', value: payment => payment.status || '-' },
        ],
        rows: payments,
      },
    ],
  }), [filters.department, filters.endDate, filters.mode, filters.search, filters.startDate, payments, total]);

  return (
    <div>
      <PageHeader
        title="Payments"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportActions getExportConfig={() => exportConfig} disabled={loading || payments.length === 0} />
            <button onClick={() => setShowManual(true)} className="btn-primary">
              + Manual Payment
            </button>
          </div>
        }
      />

      <div className="card">
        <ListControls
          searchValue={filters.search}
          onSearchChange={search => {
            setFilters(current => ({ ...current, search }));
            setPage(1);
          }}
          searchPlaceholder="Search student, reg no, phone, or department"
          sortValue={filters.sort}
          onSortChange={sort => {
            setFilters(current => ({ ...current, sort }));
            setPage(1);
          }}
          sortOptions={paymentSortOptions}
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
                value={filters.startDate}
                onChange={e => {
                  setFilters(current => ({ ...current, startDate: e.target.value }));
                  setPage(1);
                }}
              />
              <input
                type="date"
                className="input w-40"
                value={filters.endDate}
                onChange={e => {
                  setFilters(current => ({ ...current, endDate: e.target.value }));
                  setPage(1);
                }}
              />
              <SearchableSelect
                className="w-36"
                value={filters.mode}
                onChange={mode => {
                  setFilters(current => ({ ...current, mode }));
                  setPage(1);
                }}
                placeholder="All Modes"
                searchPlaceholder="Search modes..."
                options={modeOptions}
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
                options={departmentOptions}
              />
            </div>
          }
        />

        {loading ? (
          <PageSpinner />
        ) : (
          <div className="space-y-8">
            {groupedPayments.map(group => (
              <section key={group.key} className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-slate-50">
                  <h2 className="text-xl font-bold text-slate-900">{group.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {group.payments.length} payment{group.payments.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {renderPaymentsTable(group.payments)}
              </section>
            ))}
          </div>
        )}

        {!loading && payments.length === 0 && (
          <EmptyState message="No payments found" icon={<FiCreditCard />} />
        )}

        <Pagination page={page} pages={Math.ceil(total / pageSize) || 1} onPage={setPage} />
      </div>

      <Modal open={showManual} onClose={() => setShowManual(false)} title="Manual Payment Entry">
        <form onSubmit={handleManual} className="space-y-4">
          <div>
            <label className="label">Student *</label>
            <SearchableSelect
              value={manualForm.studentId}
              onChange={studentId => setManualForm(current => ({ ...current, studentId, studentFeesId: '' }))}
              placeholder="Select Student..."
              searchPlaceholder="Search by name, reg no, roll no, admission no..."
              options={studentOptions}
              required
            />
          </div>
          <div>
            <label className="label">Assigned Fees *</label>
            <SearchableSelect
              value={manualForm.studentFeesId}
              onChange={studentFeesId => setManualForm(current => ({ ...current, studentFeesId }))}
              placeholder={manualForm.studentId ? 'Select assigned fee' : 'Select student first'}
              searchPlaceholder="Search assigned fees..."
              options={assignedFeeOptions}
              required
              disabled={!manualForm.studentId}
            />
          </div>
          {selectedFee && (
            <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
              <p className="text-blue-800 font-medium">Total Fees: Rs. {(selectedFee.totalAmount || 0).toLocaleString('en-IN')}</p>
              <p className="text-green-700">Paid: Rs. {(selectedFee.totalPaid || 0).toLocaleString('en-IN')}</p>
              <p className="text-red-700">Remaining: Rs. {(selectedFee.totalDue || 0).toLocaleString('en-IN')}</p>
            </div>
          )}
          <div>
            <label className="label">Amount *</label>
            <input
              type="number"
              className="input"
              value={manualForm.amount}
              onChange={e => setManualForm(current => ({ ...current, amount: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Mode</label>
            <SearchableSelect
              value={manualForm.paymentMode}
              onChange={paymentMode => setManualForm(current => ({ ...current, paymentMode }))}
              placeholder="Select mode"
              searchPlaceholder="Search modes..."
              options={manualModeOptions}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <input
              className="input"
              value={manualForm.description}
              onChange={e => setManualForm(current => ({ ...current, description: e.target.value }))}
            />
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowManual(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Record Payment</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
