import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, ArcElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import api from '../../api/axios';
import {
  ExportActions,
  PageSpinner, StatCard, FilterBar,
  EmptyState, PageHeader, Table, StatusBadge, SearchableSelect,
  ListControls, Pagination,
} from '../../components/common';
import useListControls from '../../hooks/useListControls';
import { useAppSettings } from '../../context/AppSettingsContext';
import {
  FiAlertCircle,
  FiBarChart2,
  FiBook,
  FiCheckCircle,
  FiClock,
  FiClipboard,
  FiCreditCard,
  FiDollarSign,
  FiPackage,
  FiShoppingBag,
  FiTrendingDown,
  FiTrendingUp,
  FiUser,
} from '../../components/common/icons';

ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, ArcElement,
  Title, Tooltip, Legend
);

const TABS = [
  { label: 'Overview', capability: 'admin_reports_tab_overview', fallbackRoles: ['institution_owner', 'admin', 'accountant'] },
  { label: 'Fees', capability: 'admin_reports_tab_fees', fallbackRoles: ['institution_owner', 'admin', 'accountant'] },
  { label: 'Payments', capability: 'admin_reports_tab_payments', fallbackRoles: ['institution_owner', 'admin', 'accountant'] },
  { label: 'Expenses', capability: 'admin_reports_tab_expenses', fallbackRoles: ['institution_owner', 'admin', 'accountant'] },
  { label: 'Inventory', capability: 'admin_reports_tab_inventory', fallbackRoles: ['institution_owner', 'admin', 'accountant'] },
  { label: 'Library', capability: 'admin_reports_tab_library', fallbackRoles: ['institution_owner', 'admin'] },
  { label: 'Shop & Canteen', capability: 'admin_reports_tab_shop', fallbackRoles: ['institution_owner', 'admin'] },
  { label: 'Attendance', capability: 'admin_reports_tab_attendance', fallbackRoles: ['institution_owner', 'admin'] },
];

const listConfigByTab = {
  Fees: {
    searchFields: [
      fee => `${fee.student?.firstName || ''} ${fee.student?.lastName || ''}`,
      fee => fee.student?.regNo,
      fee => fee.student?.rollNo,
      fee => fee.academicYear,
      fee => fee.status,
    ],
    sortOptions: [
      {
        value: 'student-asc',
        label: 'Sort: Student A-Z',
        compare: (a, b) =>
          `${a.student?.firstName || ''} ${a.student?.lastName || ''}`.localeCompare(
            `${b.student?.firstName || ''} ${b.student?.lastName || ''}`,
            undefined,
            { sensitivity: 'base' }
          ),
      },
      {
        value: 'due-desc',
        label: 'Sort: Highest Due',
        compare: (a, b) => (b.totalDue || 0) - (a.totalDue || 0),
      },
    ],
  },
  Payments: {
    searchFields: [
      'receiptNo',
      payment => `${payment.student?.firstName || ''} ${payment.student?.lastName || ''}`,
      payment => payment.student?.regNo,
      payment => payment.student?.rollNo,
      'paymentMode',
      'status',
    ],
    sortOptions: [
      {
        value: 'date-desc',
        label: 'Sort: Latest First',
        compare: (a, b) => new Date(b.paymentDate) - new Date(a.paymentDate),
      },
      {
        value: 'amount-desc',
        label: 'Sort: Highest Amount',
        compare: (a, b) => (b.amount || 0) - (a.amount || 0),
      },
    ],
  },
  Expenses: {
    searchFields: ['title', 'category', 'paymentMode'],
    sortOptions: [
      {
        value: 'date-desc',
        label: 'Sort: Latest First',
        compare: (a, b) => new Date(b.date) - new Date(a.date),
      },
      {
        value: 'amount-desc',
        label: 'Sort: Highest Amount',
        compare: (a, b) => (b.amount || 0) - (a.amount || 0),
      },
    ],
  },
  Inventory: {
    searchFields: ['name', 'category', 'unit'],
    sortOptions: [
      {
        value: 'name-asc',
        label: 'Sort: Name A-Z',
        compare: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }),
      },
      {
        value: 'stock-asc',
        label: 'Sort: Low Stock First',
        compare: (a, b) => (a.currentStock || 0) - (b.currentStock || 0),
      },
    ],
  },
  Library: {
    searchFields: [
      issue => `${issue.student?.firstName || ''} ${issue.student?.lastName || ''}`,
      issue => issue.student?.regNo,
      issue => issue.student?.rollNo,
      issue => issue.book?.title,
      issue => issue.book?.author,
      'status',
    ],
    sortOptions: [
      {
        value: 'due-asc',
        label: 'Sort: Due Soonest',
        compare: (a, b) => new Date(a.dueDate) - new Date(b.dueDate),
      },
      {
        value: 'fine-desc',
        label: 'Sort: Highest Fine',
        compare: (a, b) => (b.fine || 0) - (a.fine || 0),
      },
    ],
  },
  'Shop & Canteen': {
    searchFields: [
      'billNo',
      sale => `${sale.student?.firstName || ''} ${sale.student?.lastName || ''}`,
      'paymentMode',
      'status',
    ],
    sortOptions: [
      {
        value: 'date-desc',
        label: 'Sort: Latest First',
        compare: (a, b) => new Date(b.date) - new Date(a.date),
      },
      {
        value: 'amount-desc',
        label: 'Sort: Highest Amount',
        compare: (a, b) => (b.totalAmount || 0) - (a.totalAmount || 0),
      },
    ],
  },
  Attendance: {
    searchFields: [
      record => `${record.student?.firstName || ''} ${record.student?.lastName || ''}`,
      record => record.student?.regNo,
      record => record.student?.rollNo,
      'type',
      'location',
      'remarks',
    ],
    sortOptions: [
      {
        value: 'time-desc',
        label: 'Sort: Latest First',
        compare: (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      },
      {
        value: 'student-asc',
        label: 'Sort: Student A-Z',
        compare: (a, b) =>
          `${a.student?.firstName || ''} ${a.student?.lastName || ''}`.localeCompare(
            `${b.student?.firstName || ''} ${b.student?.lastName || ''}`,
            undefined,
            { sensitivity: 'base' }
          ),
      },
    ],
  },
};

export default function ReportsPage() {
  const { can, hasFeature } = useAppSettings();
  const [tab, setTab]         = useState('Overview');
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState({});
  const [filters, setFilters] = useState({
    startDate: '', endDate: '', academicYear: '', status: '', type: 'shop',
  });

  const fmt = n => '₹' + (n || 0).toLocaleString('en-IN');
  const chartOpts = { responsive: true, plugins: { legend: { position: 'bottom' } } };
  const visibleTabs = useMemo(
    () => TABS
      .filter(tabConfig => can(tabConfig.capability, tabConfig.fallbackRoles))
      .map(tabConfig => tabConfig.label),
    [can]
  );
  const hasReportsFeature = hasFeature('reports');

  useEffect(() => {
    if (!visibleTabs.length) return;
    if (!visibleTabs.includes(tab)) {
      setTab(visibleTabs[0]);
    }
  }, [tab, visibleTabs]);

  const load = useCallback(async () => {
    if (!visibleTabs.length || !hasReportsFeature) {
      setData({});
      return;
    }
    setLoading(true);
    try {
      const params = { ...filters };
      let r;
      if      (tab === 'Overview')      r = await api.get('/reports/dashboard');
      else if (tab === 'Fees')          r = await api.get('/reports/fees',       { params });
      else if (tab === 'Payments')      r = await api.get('/reports/payments',   { params });
      else if (tab === 'Expenses')      r = await api.get('/reports/expenses',   { params });
      else if (tab === 'Inventory')     r = await api.get('/reports/inventory',  { params });
      else if (tab === 'Library')       r = await api.get('/reports/library',    { params });
      else if (tab === 'Shop & Canteen')r = await api.get('/reports/shop',       { params: { ...params, type: filters.type } });
      else if (tab === 'Attendance')    r = await api.get('/reports/attendance', { params });
      setData(tab === 'Overview' ? r.data.dashboard : r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, hasReportsFeature, tab, visibleTabs]);

  useEffect(() => { load(); }, [load]);

  if (!hasReportsFeature) {
    return (
      <EmptyState
        icon={<FiBarChart2 />}
        message="Reports are not enabled in the current subscription plan."
      />
    );
  }

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const currentRows =
    tab === 'Fees' ? (data.fees || [])
    : tab === 'Payments' ? (data.payments || [])
    : tab === 'Expenses' ? (data.expenses || [])
    : tab === 'Inventory' ? (data.items || [])
    : tab === 'Library' ? (data.issues || [])
    : tab === 'Shop & Canteen' ? (data.sales || [])
    : tab === 'Attendance' ? (data.records || [])
    : [];
  const currentListConfig = listConfigByTab[tab] || { searchFields: [], sortOptions: [] };
  const tableList = useListControls({
    items: currentRows,
    searchFields: currentListConfig.searchFields,
    sortOptions: currentListConfig.sortOptions,
    initialSort: currentListConfig.sortOptions?.[0]?.value,
    initialPageSize: 20,
  });

  const exportConfig = useMemo(() => {
    const base = {
      fileName: `reports-${tab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      title: `${tab} Report Export`,
      subtitle: 'College management analytics export generated from the current report view.',
      summary: [
        { label: 'Current Tab', value: tab },
        { label: 'Start Date', value: filters.startDate || 'Not Set' },
        { label: 'End Date', value: filters.endDate || 'Not Set' },
      ],
      sections: [],
    };

    if (tab === 'Overview') {
      return {
        ...base,
        title: 'Overview Report Export',
        summary: [
          { label: 'Total Students', value: data.totalStudents || 0 },
          { label: 'Active Students', value: data.activeStudents || 0 },
          { label: 'Monthly Collection', value: fmt(data.monthlyCollection) },
          { label: 'Total Fees Collected', value: fmt(data.totalFeesCollected) },
          { label: 'Pending Dues', value: fmt(data.pendingDues) },
          { label: 'Overdue Records', value: data.overdueCount || 0 },
        ],
        sections: [
          {
            title: 'Recent Payments',
            columns: [
              { header: 'Student', value: payment => `${payment.student?.firstName || ''} ${payment.student?.lastName || ''}`.trim() || '-' },
              { header: 'Date', value: payment => new Date(payment.paymentDate).toLocaleDateString('en-IN') },
              { header: 'Amount', value: payment => fmt(payment.amount), align: 'right' },
            ],
            rows: data.recentPayments || [],
          },
        ],
      };
    }

    if (tab === 'Fees') {
      return {
        ...base,
        summary: [
          ...base.summary,
          { label: 'Academic Year', value: filters.academicYear || 'All Years' },
          { label: 'Visible Rows', value: tableList.totalItems },
          { label: 'Total Billed', value: fmt(data.summary?.totalBilled) },
          { label: 'Collected', value: fmt(data.summary?.totalCollected) },
          { label: 'Total Due', value: fmt(data.summary?.totalDue) },
          { label: 'Overdue Count', value: data.summary?.overdue || 0 },
        ],
        sections: [
          {
            title: 'Fees Records',
            columns: [
              { header: 'Student', value: row => `${row.student?.firstName || ''} ${row.student?.lastName || ''}`.trim() || '-' },
              { header: 'Reg No', value: row => row.student?.regNo || '-' },
              { header: 'Roll No', value: row => row.student?.rollNo || '-' },
              { header: 'Academic Year', value: row => row.academicYear || '-' },
              { header: 'Semester', value: row => row.semester || '-' },
              { header: 'Total', value: row => fmt(row.totalAmount), align: 'right' },
              { header: 'Paid', value: row => fmt(row.totalPaid), align: 'right' },
              { header: 'Due', value: row => fmt(row.totalDue), align: 'right' },
              { header: 'Status', value: row => row.status || '-' },
            ],
            rows: tableList.allItems,
          },
        ],
      };
    }

    if (tab === 'Payments') {
      return {
        ...base,
        summary: [
          ...base.summary,
          { label: 'Visible Rows', value: tableList.totalItems },
          { label: 'Total Collected', value: fmt(data.totalAmount) },
          { label: 'Modes Covered', value: Object.keys(data.byMode || {}).length },
        ],
        sections: [
          {
            title: 'Payments',
            columns: [
              { header: 'Receipt', value: row => row.receiptNo || '-' },
              { header: 'Student', value: row => `${row.student?.firstName || ''} ${row.student?.lastName || ''}`.trim() || '-' },
              { header: 'Reg No', value: row => row.student?.regNo || '-' },
              { header: 'Roll No', value: row => row.student?.rollNo || '-' },
              { header: 'Date', value: row => new Date(row.paymentDate).toLocaleDateString('en-IN') },
              { header: 'Amount', value: row => fmt(row.amount), align: 'right' },
              { header: 'Mode', value: row => row.paymentMode?.toUpperCase() || '-' },
              { header: 'Status', value: row => row.status || '-' },
            ],
            rows: tableList.allItems,
          },
          {
            title: 'Payment Mode Breakdown',
            columns: [
              { header: 'Mode', value: row => row.mode },
              { header: 'Amount', value: row => fmt(row.amount), align: 'right' },
            ],
            rows: Object.entries(data.byMode || {}).map(([mode, amount]) => ({ mode, amount })),
          },
        ],
      };
    }

    if (tab === 'Expenses') {
      return {
        ...base,
        summary: [
          ...base.summary,
          { label: 'Visible Rows', value: tableList.totalItems },
          { label: 'Total Expense Amount', value: fmt(data.totalAmount) },
          { label: 'Categories', value: data.byCategory?.length || 0 },
        ],
        sections: [
          {
            title: 'Expenses',
            columns: [
              { header: 'Title', value: row => row.title || '-' },
              { header: 'Category', value: row => row.category || '-' },
              { header: 'Date', value: row => new Date(row.date).toLocaleDateString('en-IN') },
              { header: 'Mode', value: row => row.paymentMode?.toUpperCase() || '-' },
              { header: 'Amount', value: row => fmt(row.amount), align: 'right' },
            ],
            rows: tableList.allItems,
          },
          {
            title: 'Expense Category Breakdown',
            columns: [
              { header: 'Category', value: row => row._id || '-' },
              { header: 'Amount', value: row => fmt(row.total), align: 'right' },
            ],
            rows: data.byCategory || [],
          },
        ],
      };
    }

    if (tab === 'Inventory') {
      return {
        ...base,
        summary: [
          ...base.summary,
          { label: 'Visible Rows', value: tableList.totalItems },
          { label: 'Total Stock Value', value: fmt(data.totalValue) },
          { label: 'Low Stock Alerts', value: data.lowStockItems?.length || 0 },
          { label: 'Categories', value: data.byCategory?.length || 0 },
        ],
        sections: [
          {
            title: 'Inventory Items',
            columns: [
              { header: 'Name', value: row => row.name || '-' },
              { header: 'Category', value: row => row.category || '-' },
              { header: 'Current Stock', value: row => `${row.currentStock || 0} ${row.unit || ''}`.trim() },
              { header: 'Min Alert', value: row => row.minStockAlert || 0, align: 'right' },
              { header: 'Unit Price', value: row => fmt(row.purchasePrice), align: 'right' },
              { header: 'Total Value', value: row => fmt((row.currentStock || 0) * (row.purchasePrice || 0)), align: 'right' },
            ],
            rows: tableList.allItems,
          },
        ],
      };
    }

    if (tab === 'Library') {
      return {
        ...base,
        summary: [
          ...base.summary,
          { label: 'Visible Rows', value: tableList.totalItems },
          { label: 'Total Books', value: data.summary?.totalBooks || 0 },
          { label: 'Issued', value: data.summary?.totalIssued || 0 },
          { label: 'Returned', value: data.summary?.totalReturned || 0 },
          { label: 'Overdue', value: data.summary?.overdue || 0 },
          { label: 'Fine Collected', value: fmt(data.summary?.totalFine) },
        ],
        sections: [
          {
            title: 'Library Issues',
            columns: [
              { header: 'Student', value: row => `${row.student?.firstName || ''} ${row.student?.lastName || ''}`.trim() || '-' },
              { header: 'Reg No', value: row => row.student?.regNo || '-' },
              { header: 'Roll No', value: row => row.student?.rollNo || '-' },
              { header: 'Book', value: row => row.book?.title || '-' },
              { header: 'Author', value: row => row.book?.author || '-' },
              { header: 'Issued', value: row => new Date(row.issueDate).toLocaleDateString('en-IN') },
              { header: 'Due', value: row => new Date(row.dueDate).toLocaleDateString('en-IN') },
              { header: 'Status', value: row => row.status || '-' },
              { header: 'Fine', value: row => row.fine ? fmt(row.fine) : '-', align: 'right' },
            ],
            rows: tableList.allItems,
          },
        ],
      };
    }

    if (tab === 'Shop & Canteen') {
      return {
        ...base,
        summary: [
          ...base.summary,
          { label: 'Sales Type', value: filters.type || 'shop' },
          { label: 'Visible Rows', value: tableList.totalItems },
          { label: 'Total Revenue', value: fmt(data.summary?.totalRevenue) },
          { label: 'Total Sales', value: data.summary?.totalSales || 0 },
          { label: 'Credit Pending', value: fmt(data.summary?.totalCredit) },
        ],
        sections: [
          {
            title: 'Shop And Canteen Sales',
            columns: [
              { header: 'Bill No', value: row => row.billNo || '-' },
              { header: 'Student', value: row => row.student ? `${row.student.firstName || ''} ${row.student.lastName || ''}`.trim() : 'Walk-in' },
              { header: 'Date', value: row => new Date(row.date).toLocaleDateString('en-IN') },
              { header: 'Amount', value: row => fmt(row.totalAmount), align: 'right' },
              { header: 'Mode', value: row => row.paymentMode || '-' },
              { header: 'Status', value: row => row.status || '-' },
            ],
            rows: tableList.allItems,
          },
        ],
      };
    }

    return {
      ...base,
      summary: [
        ...base.summary,
        { label: 'Visible Rows', value: tableList.totalItems },
        { label: 'Total Records', value: data.total || 0 },
      ],
      sections: [
        {
          title: 'Attendance Records',
          columns: [
            { header: 'Student', value: row => `${row.student?.firstName || ''} ${row.student?.lastName || ''}`.trim() || '-' },
            { header: 'Reg No', value: row => row.student?.regNo || '-' },
            { header: 'Roll No', value: row => row.student?.rollNo || '-' },
            { header: 'Type', value: row => row.type?.replace('_', ' ') || '-' },
            { header: 'Location', value: row => row.location || '-' },
            { header: 'Date & Time', value: row => new Date(row.timestamp).toLocaleString('en-IN') },
            { header: 'Remarks', value: row => row.remarks || '-' },
          ],
          rows: tableList.allItems,
        },
      ],
    };
  }, [data, filters.academicYear, filters.endDate, filters.startDate, filters.type, fmt, tab, tableList.allItems, tableList.totalItems]);

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Comprehensive system-wide reports with filtered exports for PDF and Excel."
        action={<ExportActions getExportConfig={() => exportConfig} disabled={loading || (tab !== 'Overview' && tableList.totalItems === 0 && !currentRows.length)} />}
      />

      {!visibleTabs.length && (
        <EmptyState
          message="No report tabs are enabled for your role. Ask an admin to grant report tab access in Settings."
          icon={<FiBarChart2 />}
        />
      )}

      {/* Tab Bar */}
      {visibleTabs.length > 0 && (
      <div className="flex gap-1 flex-wrap border-b border-gray-200 mb-6 overflow-x-auto">
        {visibleTabs.map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setData({}); }}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
              ${tab === t
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>
      )}

      {/* Filters */}
      {visibleTabs.length > 0 && tab !== 'Overview' && (
        <div className="space-y-4">
          <FilterBar>
            <input type="date" className="input w-40" value={filters.startDate}
              onChange={e => setFilter('startDate', e.target.value)} />
            <input type="date" className="input w-40" value={filters.endDate}
              onChange={e => setFilter('endDate', e.target.value)} />
            {tab === 'Fees' && (
              <input className="input w-36" placeholder="Academic Year e.g. 2024-25"
                value={filters.academicYear}
                onChange={e => setFilter('academicYear', e.target.value)} />
            )}
            {tab === 'Shop & Canteen' && (
              <SearchableSelect
                className="w-36"
                value={filters.type}
                onChange={value => setFilter('type', value)}
                placeholder="Select type"
                searchPlaceholder="Search sales types..."
                options={[
                  { value: 'shop', label: 'Shop', searchText: 'shop' },
                  { value: 'canteen', label: 'Canteen', searchText: 'canteen' },
                ]}
              />
            )}
          </FilterBar>

          <ListControls
            searchValue={tableList.search}
            onSearchChange={tableList.setSearch}
            searchPlaceholder={`Search ${tab.toLowerCase()} records...`}
            sortValue={tableList.sort}
            onSortChange={tableList.setSort}
            sortOptions={currentListConfig.sortOptions || []}
            pageSize={tableList.pageSize}
            onPageSizeChange={tableList.setPageSize}
            resultCount={tableList.totalItems}
          />
        </div>
      )}

      {loading ? <PageSpinner /> : (
        <>
          {/* ── OVERVIEW ──────────────────────────────────────────────── */}
          {tab === 'Overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<FiUser />} label="Total Students"    value={data.totalStudents   || 0} color="blue" />
                <StatCard icon={<FiCheckCircle />} label="Active Students"   value={data.activeStudents  || 0} color="green" />
                <StatCard icon={<FiDollarSign />} label="Monthly Collection"value={fmt(data.monthlyCollection)} color="purple" />
                <StatCard icon={<FiAlertCircle />} label="Overdue Records"  value={data.overdueCount    || 0} color="red" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="section-title">Fee Collection vs Dues</h3>
                  <Doughnut
                    options={chartOpts}
                    data={{
                      labels: ['Collected', 'Pending Dues'],
                      datasets: [{
                        data: [data.totalFeesCollected || 0, data.pendingDues || 0],
                        backgroundColor: ['#22c55e', '#ef4444'],
                        borderWidth: 0,
                      }],
                    }}
                  />
                </div>
                <div className="card">
                  <h3 className="section-title">Recent Payments</h3>
                  <div className="space-y-2 mt-2">
                    {data.recentPayments?.map(p => (
                      <div key={p._id}
                        className="flex justify-between items-center py-2
                          border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium">
                            {p.student?.firstName} {p.student?.lastName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <span className="font-semibold text-green-600 text-sm">
                          {fmt(p.amount)}
                        </span>
                      </div>
                    ))}
                    {!data.recentPayments?.length && (
                      <EmptyState message="No recent payments" icon={<FiCreditCard />} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── FEES ───────────────────────────────────────────────────── */}
          {tab === 'Fees' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<FiDollarSign />} label="Total Billed"  value={fmt(data.summary?.totalBilled)}    color="blue" />
                <StatCard icon={<FiCheckCircle />} label="Collected"     value={fmt(data.summary?.totalCollected)}  color="green" />
                <StatCard icon={<FiClock />} label="Total Due"     value={fmt(data.summary?.totalDue)}        color="yellow" />
                <StatCard icon={<FiAlertCircle />} label="Overdue Count" value={data.summary?.overdue || 0}         color="red" />
              </div>
              <div className="card">
                <h3 className="section-title">Status Breakdown</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {['paid', 'partial', 'pending', 'overdue'].map(s => (
                    <div key={s} className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-800">
                        {data.summary?.[s] || 0}
                      </p>
                      <p className="text-xs text-gray-500 capitalize mt-1">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card overflow-x-auto">
                <Table headers={['Student', 'Reg No', 'Roll No', 'Year/Sem', 'Total', 'Paid', 'Due', 'Status']}>
                  {tableList.items.map(f => (
                    <tr key={f._id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">
                        {f.student?.firstName} {f.student?.lastName}
                      </td>
                      <td className="table-cell font-mono text-xs text-gray-500">
                        {f.student?.regNo}
                      </td>
                      <td className="table-cell font-mono text-xs text-gray-500">
                        {f.student?.rollNo || '–'}
                      </td>
                      <td className="table-cell text-sm">
                        {f.academicYear} / {f.semester}
                      </td>
                      <td className="table-cell">{fmt(f.totalAmount)}</td>
                      <td className="table-cell text-green-600">{fmt(f.totalPaid)}</td>
                      <td className="table-cell text-red-600 font-medium">{fmt(f.totalDue)}</td>
                      <td className="table-cell"><StatusBadge status={f.status} /></td>
                    </tr>
                  ))}
                </Table>
                {!data.fees?.length && <EmptyState message="No fee records" />}
                <Pagination page={tableList.page} pages={tableList.pages} onPage={tableList.setPage} />
              </div>
            </div>
          )}

          {/* ── PAYMENTS ───────────────────────────────────────────────── */}
          {tab === 'Payments' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="section-title">Total Collected</h3>
                  <p className="text-4xl font-bold text-green-600">{fmt(data.totalAmount)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {data.payments?.length || 0} transactions
                  </p>
                </div>
                <div className="card">
                  <h3 className="section-title">By Payment Mode</h3>
                  {Object.entries(data.byMode || {}).map(([mode, amt]) => (
                    <div key={mode}
                      className="flex justify-between items-center py-2
                        border-b border-gray-50 last:border-0">
                      <span className="text-sm uppercase font-medium text-gray-600">
                        {mode}
                      </span>
                      <span className="font-semibold text-gray-800">{fmt(amt)}</span>
                    </div>
                  ))}
                  {!Object.keys(data.byMode || {}).length && (
                    <EmptyState message="No data" />
                  )}
                </div>
              </div>
              {data.byMode && Object.keys(data.byMode).length > 0 && (
                <div className="card">
                  <h3 className="section-title">Collection by Mode</h3>
                  <Bar
                    options={chartOpts}
                    data={{
                      labels: Object.keys(data.byMode),
                      datasets: [{
                        label: 'Amount (₹)',
                        data: Object.values(data.byMode),
                        backgroundColor: '#3b82f6',
                      }],
                    }}
                  />
                </div>
              )}
              <div className="card overflow-x-auto">
                <Table headers={['Receipt', 'Student', 'Reg No', 'Roll No', 'Date', 'Amount', 'Mode', 'Status']}>
                  {tableList.items.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="table-cell font-mono text-xs">{p.receiptNo}</td>
                      <td className="table-cell">
                        <p className="font-medium">
                          {p.student?.firstName} {p.student?.lastName}
                        </p>
                      </td>
                      <td className="table-cell font-mono text-xs text-gray-500">
                        {p.student?.regNo || '–'}
                      </td>
                      <td className="table-cell font-mono text-xs text-gray-500">
                        {p.student?.rollNo || '–'}
                      </td>
                      <td className="table-cell">
                        {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="table-cell font-semibold text-green-600">
                        {fmt(p.amount)}
                      </td>
                      <td className="table-cell uppercase text-xs">{p.paymentMode}</td>
                      <td className="table-cell"><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </Table>
                {!data.payments?.length && <EmptyState message="No payments" icon={<FiCreditCard />} />}
                <Pagination page={tableList.page} pages={tableList.pages} onPage={tableList.setPage} />
              </div>
            </div>
          )}

          {/* ── EXPENSES ───────────────────────────────────────────────── */}
          {tab === 'Expenses' && (
            <div className="space-y-5">
              <div className="card flex items-center gap-5 p-5">
                <p className="text-4xl font-bold text-red-600">{fmt(data.totalAmount)}</p>
                <p className="text-sm text-gray-500">
                  Total Expenses<br />{data.expenses?.length || 0} entries
                </p>
              </div>
              {data.byCategory?.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card">
                    <h3 className="section-title">By Category</h3>
                    <Doughnut
                      options={chartOpts}
                      data={{
                        labels: data.byCategory.map(c => c._id),
                        datasets: [{
                          data: data.byCategory.map(c => c.total),
                          backgroundColor: [
                            '#3b82f6','#22c55e','#f59e0b',
                            '#ef4444','#8b5cf6','#ec4899','#06b6d4',
                          ],
                          borderWidth: 0,
                        }],
                      }}
                    />
                  </div>
                  <div className="card">
                    <h3 className="section-title">Category Breakdown</h3>
                    {data.byCategory.map(c => (
                      <div key={c._id}
                        className="flex justify-between items-center py-2
                          border-b border-gray-50 last:border-0">
                        <span className="text-sm capitalize text-gray-600">{c._id}</span>
                        <span className="font-semibold text-gray-800">{fmt(c.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="card overflow-x-auto">
                <Table headers={['Title', 'Category', 'Date', 'Mode', 'Amount']}>
                  {tableList.items.map(e => (
                    <tr key={e._id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{e.title}</td>
                      <td className="table-cell capitalize">{e.category}</td>
                      <td className="table-cell">
                        {new Date(e.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="table-cell uppercase text-xs">{e.paymentMode}</td>
                      <td className="table-cell font-semibold text-red-600">
                        {fmt(e.amount)}
                      </td>
                    </tr>
                  ))}
                </Table>
                {!data.expenses?.length && <EmptyState message="No expenses" icon={<FiTrendingDown />} />}
                <Pagination page={tableList.page} pages={tableList.pages} onPage={tableList.setPage} />
              </div>
            </div>
          )}

          {/* ── INVENTORY ──────────────────────────────────────────────── */}
          {tab === 'Inventory' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard icon={<FiPackage />} label="Total Stock Value" value={fmt(data.totalValue)}            color="blue" />
                <StatCard icon={<FiAlertCircle />} label="Low Stock Items"  value={data.lowStockItems?.length || 0} color="red" />
                <StatCard icon={<FiBarChart2 />} label="Categories"       value={data.byCategory?.length    || 0} color="purple" />
              </div>
              {data.lowStockItems?.length > 0 && (
                <div className="card border-red-200 bg-red-50">
                  <h3 className="section-title text-red-700 inline-flex items-center gap-2"><FiAlertCircle /> Low Stock Alerts</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                    {data.lowStockItems.map(i => (
                      <div key={i._id} className="bg-white p-3 rounded-lg border border-red-100">
                        <p className="text-sm font-medium text-gray-800">{i.name}</p>
                        <p className="text-xl font-bold text-red-600">{i.currentStock}</p>
                        <p className="text-xs text-gray-400">
                          Min: {i.minStockAlert} · {i.category}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="card overflow-x-auto">
                <Table headers={['Name', 'Category', 'Stock', 'Unit Price', 'Total Value']}>
                  {tableList.items.map(i => (
                    <tr key={i._id}
                      className={`hover:bg-gray-50
                        ${i.currentStock <= i.minStockAlert ? 'bg-red-50' : ''}`}>
                      <td className="table-cell font-medium">{i.name}</td>
                      <td className="table-cell capitalize">{i.category}</td>
                      <td className="table-cell">
                        <span className={i.currentStock <= i.minStockAlert
                          ? 'text-red-600 font-bold' : 'font-medium'}>
                          {i.currentStock} {i.unit}
                        </span>
                      </td>
                      <td className="table-cell">{fmt(i.purchasePrice)}</td>
                      <td className="table-cell font-medium">
                        {fmt(i.currentStock * i.purchasePrice)}
                      </td>
                    </tr>
                  ))}
                </Table>
                {!data.items?.length && <EmptyState message="No inventory items" icon={<FiPackage />} />}
                <Pagination page={tableList.page} pages={tableList.pages} onPage={tableList.setPage} />
              </div>
            </div>
          )}

          {/* ── LIBRARY ────────────────────────────────────────────────── */}
          {tab === 'Library' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<FiBook />} label="Total Books"  value={data.summary?.totalBooks    || 0} color="purple" />
                <StatCard icon={<FiTrendingUp />} label="Issued"       value={data.summary?.totalIssued   || 0} color="blue" />
                <StatCard icon={<FiCheckCircle />} label="Returned"     value={data.summary?.totalReturned || 0} color="green" />
                <StatCard icon={<FiAlertCircle />} label="Overdue"     value={data.summary?.overdue       || 0} color="red" />
              </div>
              {data.summary?.totalFine > 0 && (
                <div className="card bg-yellow-50 border-yellow-200">
                  <p className="text-sm text-yellow-700">
                    Total Fine Collected:{' '}
                    <strong className="text-xl">{fmt(data.summary?.totalFine)}</strong>
                  </p>
                </div>
              )}
              <div className="card overflow-x-auto">
                <Table headers={['Student', 'Reg No', 'Roll No', 'Book', 'Author', 'Issued', 'Due', 'Status', 'Fine']}>
                  {tableList.items.map(i => (
                    <tr key={i._id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <p className="font-medium">
                          {i.student?.firstName} {i.student?.lastName}
                        </p>
                      </td>
                      <td className="table-cell font-mono text-xs text-gray-500">
                        {i.student?.regNo || '–'}
                      </td>
                      <td className="table-cell font-mono text-xs text-gray-500">
                        {i.student?.rollNo || '–'}
                      </td>
                      <td className="table-cell font-medium">{i.book?.title}</td>
                      <td className="table-cell text-gray-500">{i.book?.author}</td>
                      <td className="table-cell">
                        {new Date(i.issueDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="table-cell">
                        {new Date(i.dueDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="table-cell"><StatusBadge status={i.status} /></td>
                      <td className="table-cell">
                        {i.fine > 0
                          ? <span className="text-red-600 font-medium">{fmt(i.fine)}</span>
                          : '–'}
                      </td>
                    </tr>
                  ))}
                </Table>
                {!data.issues?.length && <EmptyState message="No issue records" icon={<FiBook />} />}
                <Pagination page={tableList.page} pages={tableList.pages} onPage={tableList.setPage} />
              </div>
            </div>
          )}

          {/* ── SHOP & CANTEEN ─────────────────────────────────────────── */}
          {tab === 'Shop & Canteen' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard icon={<FiDollarSign />} label="Total Revenue"  value={fmt(data.summary?.totalRevenue)} color="green" />
                <StatCard icon={<FiClipboard />} label="Total Sales"    value={data.summary?.totalSales || 0}   color="blue" />
                <StatCard icon={<FiCreditCard />} label="Credit Pending" value={fmt(data.summary?.totalCredit)}  color="yellow" />
              </div>
              {data.dailySales?.length > 0 && (
                <div className="card">
                  <h3 className="section-title">Daily Sales (Last 30 days)</h3>
                  <Bar
                    options={chartOpts}
                    data={{
                      labels: [...(data.dailySales || [])].reverse().map(d => d._id),
                      datasets: [{
                        label: 'Revenue (₹)',
                        data: [...(data.dailySales || [])].reverse().map(d => d.total),
                        backgroundColor: '#22c55e',
                      }],
                    }}
                  />
                </div>
              )}
              <div className="card overflow-x-auto">
                <Table headers={['Bill No', 'Student', 'Date', 'Amount', 'Mode', 'Status']}>
                  {tableList.items.map(s => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="table-cell font-mono text-xs">{s.billNo}</td>
                      <td className="table-cell">
                        {s.student
                          ? `${s.student.firstName} ${s.student.lastName}`
                          : 'Walk-in'}
                      </td>
                      <td className="table-cell">
                        {new Date(s.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="table-cell font-medium">{fmt(s.totalAmount)}</td>
                      <td className="table-cell capitalize">{s.paymentMode}</td>
                      <td className="table-cell"><StatusBadge status={s.status} /></td>
                    </tr>
                  ))}
                </Table>
                {!data.sales?.length && <EmptyState message="No sales records" icon={<FiShoppingBag />} />}
                <Pagination page={tableList.page} pages={tableList.pages} onPage={tableList.setPage} />
              </div>
            </div>
          )}

          {/* ── ATTENDANCE ─────────────────────────────────────────────── */}
          {tab === 'Attendance' && (
            <div className="space-y-5">
              <div className="card">
                <p className="text-sm text-gray-500 mb-1">Total Records</p>
                <p className="text-3xl font-bold text-gray-800">{data.total || 0}</p>
              </div>
              <div className="card overflow-x-auto">
                <Table headers={['Student', 'Reg No', 'Roll No', 'Type', 'Location', 'Date & Time', 'Remarks']}>
                  {tableList.items.map(r => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <p className="font-medium">
                          {r.student?.firstName} {r.student?.lastName}
                        </p>
                      </td>
                      <td className="table-cell font-mono text-xs text-gray-500">
                        {r.student?.regNo || '–'}
                      </td>
                      <td className="table-cell font-mono text-xs text-gray-500">
                        {r.student?.rollNo || '–'}
                      </td>
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
                </Table>
                {!data.records?.length && (
                  <EmptyState message="No attendance records" icon={<FiClock />} />
                )}
                <Pagination page={tableList.page} pages={tableList.pages} onPage={tableList.setPage} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


