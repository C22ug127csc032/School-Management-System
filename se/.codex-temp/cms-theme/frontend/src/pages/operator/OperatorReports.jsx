import React, { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { EmptyState, ExportActions, PageHeader, PageSpinner, Table, StatCard } from '../../components/common';
import {
  FiBarChart2,
  FiCoffee,
  FiCreditCard,
  FiDollarSign,
  FiShoppingBag,
  FiTrendingUp,
} from '../../components/common/icons';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

const formatCurrency = value => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;

const mergeDailySales = (shopDaily = [], canteenDaily = []) => {
  const lookup = new Map();

  [...shopDaily, ...canteenDaily].forEach(entry => {
    if (!lookup.has(entry._id)) {
      lookup.set(entry._id, { date: entry._id, shop: 0, canteen: 0 });
    }
  });

  shopDaily.forEach(entry => {
    lookup.get(entry._id).shop = entry.total || 0;
  });
  canteenDaily.forEach(entry => {
    lookup.get(entry._id).canteen = entry.total || 0;
  });

  return Array.from(lookup.values()).sort((left, right) => new Date(left.date) - new Date(right.date));
};

export default function OperatorReports() {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });
  const [reports, setReports] = useState({ shop: null, canteen: null });

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      try {
        const [shopResponse, canteenResponse] = await Promise.all([
          api.get('/reports/shop', { params: { ...params, type: 'shop' } }),
          api.get('/reports/shop', { params: { ...params, type: 'canteen' } }),
        ]);

        setReports({
          shop: shopResponse.data,
          canteen: canteenResponse.data,
        });
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load commerce reports');
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [filters.endDate, filters.startDate]);

  const analytics = useMemo(() => {
    const shopSummary = reports.shop?.summary || {};
    const canteenSummary = reports.canteen?.summary || {};
    const combinedRevenue = Number(shopSummary.totalRevenue || 0) + Number(canteenSummary.totalRevenue || 0);
    const combinedSales = Number(shopSummary.totalSales || 0) + Number(canteenSummary.totalSales || 0);
    const combinedAverage = combinedSales ? combinedRevenue / combinedSales : 0;
    const trendSeries = mergeDailySales(reports.shop?.dailySales, reports.canteen?.dailySales);
    const combinedSalesRows = [
      ...((reports.shop?.sales || []).map(sale => ({ ...sale, outlet: 'Shop' }))),
      ...((reports.canteen?.sales || []).map(sale => ({ ...sale, outlet: 'Canteen' }))),
    ]
      .sort((left, right) => new Date(right.date) - new Date(left.date))
      .slice(0, 12);

    const topItems = [
      ...((reports.shop?.topItems || []).map(item => ({ ...item, outlet: 'Shop' }))),
      ...((reports.canteen?.topItems || []).map(item => ({ ...item, outlet: 'Canteen' }))),
    ].sort((left, right) => Number(right.revenue || 0) - Number(left.revenue || 0));

    return {
      combinedRevenue,
      combinedSales,
      combinedAverage,
      trendSeries,
      combinedSalesRows,
      topItems,
      comparisonBar: {
        labels: ['Shop', 'Canteen'],
        datasets: [
          {
            label: 'Revenue',
            data: [shopSummary.totalRevenue || 0, canteenSummary.totalRevenue || 0],
            backgroundColor: ['#1E4DB7', '#E53935'],
            borderRadius: 12,
          },
          {
            label: 'Bills',
            data: [shopSummary.totalSales || 0, canteenSummary.totalSales || 0],
            backgroundColor: ['#7EA3FF', '#FF9C97'],
            borderRadius: 12,
          },
        ],
      },
      revenueShare: {
        labels: ['Shop', 'Canteen'],
        datasets: [
          {
            data: [shopSummary.totalRevenue || 0, canteenSummary.totalRevenue || 0],
            backgroundColor: ['#1E4DB7', '#E53935'],
            borderWidth: 0,
          },
        ],
      },
      paymentMix: {
        labels: ['Shop Cash', 'Shop Wallet', 'Canteen Cash', 'Canteen Wallet'],
        datasets: [
          {
            data: [
              reports.shop?.paymentBreakdown?.cash || 0,
              reports.shop?.paymentBreakdown?.wallet || 0,
              reports.canteen?.paymentBreakdown?.cash || 0,
              reports.canteen?.paymentBreakdown?.wallet || 0,
            ],
            backgroundColor: ['#1E4DB7', '#7EA3FF', '#E53935', '#FF9C97'],
            borderWidth: 0,
          },
        ],
      },
    };
  }, [reports]);

  if (loading) {
    return <PageSpinner />;
  }

  const exportConfig = {
    fileName: 'commerce-reports',
    title: 'Commerce Reports Export',
    subtitle: 'Combined operator report for shop and canteen performance.',
    summary: [
      { label: 'Start Date', value: filters.startDate || 'Not Set' },
      { label: 'End Date', value: filters.endDate || 'Not Set' },
      { label: 'Combined Revenue', value: formatCurrency(analytics.combinedRevenue) },
      { label: 'Total Bills', value: analytics.combinedSales },
      { label: 'Average Bill', value: formatCurrency(analytics.combinedAverage) },
      { label: 'Top Performer', value: (reports.shop?.summary?.totalRevenue || 0) >= (reports.canteen?.summary?.totalRevenue || 0) ? 'Shop' : 'Canteen' },
    ],
    sections: [
      {
        title: 'Outlet Comparison',
        columns: [
          { header: 'Outlet', value: row => row.outlet },
          { header: 'Revenue', value: row => formatCurrency(row.revenue), align: 'right' },
          { header: 'Bills', value: row => row.bills, align: 'right' },
        ],
        rows: [
          { outlet: 'Shop', revenue: reports.shop?.summary?.totalRevenue || 0, bills: reports.shop?.summary?.totalSales || 0 },
          { outlet: 'Canteen', revenue: reports.canteen?.summary?.totalRevenue || 0, bills: reports.canteen?.summary?.totalSales || 0 },
        ],
      },
      {
        title: 'Daily Trend',
        columns: [
          { header: 'Date', value: row => row.date },
          { header: 'Shop Revenue', value: row => formatCurrency(row.shop), align: 'right' },
          { header: 'Canteen Revenue', value: row => formatCurrency(row.canteen), align: 'right' },
        ],
        rows: analytics.trendSeries,
      },
      {
        title: 'Top Selling Items',
        columns: [
          { header: 'Outlet', value: row => row.outlet },
          { header: 'Item', value: row => row._id || '-' },
          { header: 'Qty', value: row => row.quantity || 0, align: 'right' },
          { header: 'Revenue', value: row => formatCurrency(row.revenue), align: 'right' },
        ],
        rows: analytics.topItems,
      },
      {
        title: 'Recent Transactions',
        columns: [
          { header: 'Outlet', value: row => row.outlet },
          { header: 'Bill No', value: row => row.billNo || '-' },
          { header: 'Student', value: row => row.student ? `${row.student.firstName || ''} ${row.student.lastName || ''}`.trim() : 'Walk-in student' },
          { header: 'Amount', value: row => formatCurrency(row.totalAmount), align: 'right' },
          { header: 'Mode', value: row => row.paymentMode || '-' },
          { header: 'Date', value: row => new Date(row.date).toLocaleDateString('en-IN') },
        ],
        rows: analytics.combinedSalesRows,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commerce Reports"
        subtitle="Focused reports for shop and canteen performance with branch comparison, payment mix, and daily trend visibility."
        action={<ExportActions getExportConfig={() => exportConfig} disabled={!analytics.combinedSalesRows.length && !analytics.topItems.length && !analytics.trendSeries.length} />}
      />

      <section className="rounded-[1.75rem] border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="section-title mb-1">Report Filters</h3>
            <p className="text-sm text-text-secondary">Filter the shop and canteen report together by date range.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={filters.startDate} onChange={event => setFilters(previous => ({ ...previous, startDate: event.target.value }))} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={filters.endDate} onChange={event => setFilters(previous => ({ ...previous, endDate: event.target.value }))} />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={() => setFilters({ startDate: '', endDate: '' })} className="btn-secondary w-full">
                Reset
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<FiDollarSign />} label="Combined Revenue" value={formatCurrency(analytics.combinedRevenue)} color="green" sub="Shop and canteen together" />
        <StatCard icon={<FiBarChart2 />} label="Total Bills" value={analytics.combinedSales} color="blue" sub="Total transactions in range" />
        <StatCard icon={<FiCreditCard />} label="Average Bill" value={formatCurrency(analytics.combinedAverage)} color="purple" sub="Across both commerce desks" />
        <StatCard icon={<FiTrendingUp />} label="Top Performer" value={(reports.shop?.summary?.totalRevenue || 0) >= (reports.canteen?.summary?.totalRevenue || 0) ? 'Shop' : 'Canteen'} color="yellow" sub="Higher revenue in current range" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card xl:col-span-2">
          <h3 className="section-title">Outlet Comparison</h3>
          <Bar
            data={analytics.comparisonBar}
            options={{
              responsive: true,
              plugins: { legend: { position: 'bottom' } },
              scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true },
              },
            }}
          />
        </section>

        <section className="card">
          <h3 className="section-title">Revenue Share</h3>
          <Doughnut
            data={analytics.revenueShare}
            options={{
              responsive: true,
              plugins: { legend: { position: 'bottom' } },
            }}
          />
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="card">
          <h3 className="section-title">Daily Trend</h3>
          {analytics.trendSeries.length > 0 ? (
            <Line
              data={{
                labels: analytics.trendSeries.map(entry => entry.date),
                datasets: [
                  {
                    label: 'Shop Revenue',
                    data: analytics.trendSeries.map(entry => entry.shop),
                    borderColor: '#1E4DB7',
                    backgroundColor: 'rgba(30, 77, 183, 0.12)',
                    fill: true,
                    tension: 0.35,
                  },
                  {
                    label: 'Canteen Revenue',
                    data: analytics.trendSeries.map(entry => entry.canteen),
                    borderColor: '#E53935',
                    backgroundColor: 'rgba(229, 57, 53, 0.1)',
                    fill: true,
                    tension: 0.35,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { position: 'bottom' } },
                interaction: { mode: 'index', intersect: false },
                scales: {
                  x: { grid: { display: false } },
                  y: { beginAtZero: true, ticks: { callback: value => `₹ ${value}` } },
                },
              }}
            />
          ) : (
            <EmptyState message="Not enough trend data yet for this date range." icon={<FiTrendingUp />} />
          )}
        </section>

        <section className="card">
          <h3 className="section-title">Payment Mix</h3>
          <Doughnut
            data={analytics.paymentMix}
            options={{
              responsive: true,
              plugins: { legend: { position: 'bottom' } },
            }}
          />
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Shop</p>
              <p className="mt-2 text-sm text-text-secondary">Cash {formatCurrency(reports.shop?.paymentBreakdown?.cash)} · Wallet {formatCurrency(reports.shop?.paymentBreakdown?.wallet)}</p>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Canteen</p>
              <p className="mt-2 text-sm text-text-secondary">Cash {formatCurrency(reports.canteen?.paymentBreakdown?.cash)} · Wallet {formatCurrency(reports.canteen?.paymentBreakdown?.wallet)}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="card">
          <h3 className="section-title mb-4">Top Selling Items</h3>
          {analytics.topItems.length > 0 ? (
            <Table headers={['Outlet', 'Item', 'Qty', 'Revenue']}>
              {analytics.topItems.slice(0, 10).map((item, index) => (
                <tr key={`${item.outlet}-${item._id || index}`} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <span className={item.outlet === 'Shop' ? 'badge-blue' : 'badge-red'}>{item.outlet}</span>
                  </td>
                  <td className="table-cell font-semibold text-text-primary">{item._id}</td>
                  <td className="table-cell">{item.quantity}</td>
                  <td className="table-cell font-semibold text-text-primary">{formatCurrency(item.revenue)}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState message="No item sales available for this date range." icon={<FiShoppingBag />} />
          )}
        </section>

        <section className="card">
          <h3 className="section-title mb-4">Recent Transactions</h3>
          {analytics.combinedSalesRows.length > 0 ? (
            <Table headers={['Outlet', 'Bill No', 'Student', 'Amount', 'Mode', 'Date']}>
              {analytics.combinedSalesRows.map(sale => (
                <tr key={`${sale.outlet}-${sale._id}`} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <span className={sale.outlet === 'Shop' ? 'badge-blue' : 'badge-red'}>
                      {sale.outlet === 'Shop' ? <FiShoppingBag className="mr-1" /> : <FiCoffee className="mr-1" />}
                      {sale.outlet}
                    </span>
                  </td>
                  <td className="table-cell font-mono text-xs">{sale.billNo}</td>
                  <td className="table-cell">
                    {sale.student ? `${sale.student.firstName} ${sale.student.lastName}` : 'Walk-in student'}
                  </td>
                  <td className="table-cell font-semibold text-text-primary">{formatCurrency(sale.totalAmount)}</td>
                  <td className="table-cell capitalize">{sale.paymentMode}</td>
                  <td className="table-cell text-sm text-text-secondary">
                    {new Date(sale.date).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState message="No transactions found for the selected range." icon={<FiBarChart2 />} />
          )}
        </section>
      </div>
    </div>
  );
}
