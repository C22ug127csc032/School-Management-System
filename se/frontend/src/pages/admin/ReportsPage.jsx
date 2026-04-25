import React, { useEffect, useState } from 'react';
import { FiBarChart2, FiBookOpen, FiCalendar, FiDollarSign, FiTrendingDown, FiTrendingUp, FiUsers } from 'react-icons/fi';
import api from '../../api/axios.js';
import { PageHeader, PageLoader } from '../../components/common/index.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function ReportsPage() {
  const academicYear = useAcademicYear();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/dashboard/reports', { params: { academicYear } })
      .then(response => setData(response.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [academicYear]);

  if (loading) return <PageLoader />;

  const summaryCards = [
    {
      label: 'Total Fee Collection',
      value: formatCurrency(data?.summary?.totalIncome),
      sub: `${formatCurrency(data?.summary?.monthlyIncome)} collected this month`,
      icon: FiDollarSign,
      tone: 'text-emerald-700',
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(data?.summary?.totalExpense),
      sub: `${formatCurrency(data?.summary?.monthlyExpense)} spent this month`,
      icon: FiTrendingDown,
      tone: 'text-rose-700',
    },
    {
      label: 'Net Balance',
      value: formatCurrency(data?.summary?.netBalance),
      sub: `${data?.summary?.collectionEfficiency ?? 0}% collection efficiency`,
      icon: FiTrendingUp,
      tone: 'text-sky-700',
    },
    {
      label: 'Outstanding Dues',
      value: formatCurrency(data?.summary?.outstandingDues),
      sub: 'Pending student fee amount',
      icon: FiBarChart2,
      tone: 'text-amber-700',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="School-side financial, admissions, and operational reporting for the current academic year."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(card => (
          <div key={card.label} className="stat-card" style={{ borderLeftColor: '#1D3A57' }}>
            <div className="stat-icon">
              <card.icon className={`text-2xl ${card.tone}`} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{card.label}</p>
              <p className="text-2xl font-bold text-text-primary">{card.value}</p>
              <p className="text-xs text-text-secondary">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="campus-panel p-6">
          <SectionHeading title="Finance Summary" caption="The numbers that belong in a real reports section" />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <InfoTile icon={FiDollarSign} label="Income this year" value={formatCurrency(data?.summary?.totalIncome)} />
            <InfoTile icon={FiTrendingDown} label="Expenses this year" value={formatCurrency(data?.summary?.totalExpense)} />
            <InfoTile icon={FiTrendingUp} label="Net balance" value={formatCurrency(data?.summary?.netBalance)} />
            <InfoTile icon={FiBarChart2} label="Collection efficiency" value={`${data?.summary?.collectionEfficiency ?? 0}%`} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <MiniList
              title="Payment Mode Breakdown"
              rows={(data?.paymentModes || []).map(item => ({
                label: String(item._id || 'unknown').replace(/_/g, ' '),
                value: formatCurrency(item.total),
                meta: `${item.count} receipt(s)`,
              }))}
              emptyMessage="No payments recorded yet."
            />
            <MiniList
              title="Expense Category Breakdown"
              rows={(data?.expenseCategories || []).map(item => ({
                label: String(item._id || 'uncategorized').replace(/_/g, ' '),
                value: formatCurrency(item.total),
                meta: `${item.count} entry(s)`,
              }))}
              emptyMessage="No expenses recorded yet."
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="campus-panel p-6">
            <SectionHeading title="Student & Admission Reports" caption="Institution-level enrollment view" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoTile icon={FiUsers} label="Total students" value={data?.students?.total ?? 0} />
              <InfoTile icon={FiUsers} label="Active students" value={data?.students?.active ?? 0} />
              <InfoTile icon={FiCalendar} label="Admission pending" value={data?.students?.admissionPending ?? 0} />
              <InfoTile icon={FiBookOpen} label="Transferred" value={data?.students?.transferred ?? 0} />
            </div>
          </div>

          <div className="campus-panel p-6">
            <SectionHeading title="Operational Reports" caption="Daily school-health indicators" />
            <div className="mt-5 space-y-4">
              <InsightRow label="Classes in operation" value={data?.operations?.classes ?? 0} />
              <InsightRow label="Teachers on record" value={data?.operations?.teachers ?? 0} />
              <InsightRow label="Pending leave requests" value={data?.operations?.pendingLeaves ?? 0} />
              <InsightRow label="Attendance rate" value={`${data?.operations?.attendanceRate ?? 0}%`} />
            </div>
          </div>

          <div className="campus-panel p-6">
            <SectionHeading title="Fee Status Report" caption="Assigned fee records by current payment state" />
            <div className="mt-5 space-y-3">
              {(data?.feeStatus || []).length ? data.feeStatus.map(item => (
                <div key={item._id} className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <div>
                    <p className="font-semibold capitalize text-slate-900">{String(item._id || 'unknown').replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate-500">{item.count} record(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{formatCurrency(item.amount)}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(item.dueAmount)} due</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-text-secondary">No fee assignments found for this academic year.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ title, caption }) {
  return (
    <div className="border-b border-slate-100 pb-4">
      <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
      <p className="mt-1 text-sm font-medium text-slate-500">{caption}</p>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white/85 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-primary-700">
          <Icon className="text-lg" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function InsightRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-3">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function MiniList({ title, rows, emptyMessage }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50/55 p-4">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <div className="mt-4 space-y-3">
        {rows.length ? rows.map(row => (
          <div key={`${title}-${row.label}`} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium capitalize text-slate-700">{row.label}</p>
              <p className="text-xs text-slate-500">{row.meta}</p>
            </div>
            <p className="shrink-0 font-bold text-slate-900">{row.value}</p>
          </div>
        )) : <p className="text-sm text-text-secondary">{emptyMessage}</p>}
      </div>
    </div>
  );
}
