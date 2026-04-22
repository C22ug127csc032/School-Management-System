import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { EmptyState, ExportActions, PageHeader, PageSpinner, StatCard } from '../../components/common';
import {
  FiAlertCircle,
  FiBarChart2,
  FiCoffee,
  FiCreditCard,
  FiDollarSign,
  FiPackage,
  FiShoppingBag,
  FiTrendingUp,
} from '../../components/common/icons';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const formatCurrency = value => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;

const mergeDailySales = (shopDaily = [], canteenDaily = []) => {
  const lookup = new Map();

  [...shopDaily, ...canteenDaily].forEach(entry => {
    if (!lookup.has(entry._id)) {
      lookup.set(entry._id, { date: entry._id, shop: 0, canteen: 0 });
    }
  });

  shopDaily.forEach(entry => {
    const row = lookup.get(entry._id);
    row.shop = entry.total || 0;
  });

  canteenDaily.forEach(entry => {
    const row = lookup.get(entry._id);
    row.canteen = entry.total || 0;
  });

  return Array.from(lookup.values()).sort((left, right) => new Date(left.date) - new Date(right.date));
};

export default function OperatorDashboard() {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState({
    shopReport: null,
    canteenReport: null,
    shopItems: [],
    canteenItems: [],
    shopToday: null,
    canteenToday: null,
  });

  useEffect(() => {
    const loadSnapshot = async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);

      try {
        const [
          shopReportResponse,
          canteenReportResponse,
          shopItemsResponse,
          canteenItemsResponse,
          shopTodayResponse,
          canteenTodayResponse,
        ] = await Promise.all([
          api.get('/reports/shop', { params: { type: 'shop' } }),
          api.get('/reports/shop', { params: { type: 'canteen' } }),
          api.get('/shop/items?type=shop'),
          api.get('/shop/items?type=canteen'),
          api.get(`/shop/sales?type=shop&date=${today}`),
          api.get(`/shop/sales?type=canteen&date=${today}`),
        ]);

        setSnapshot({
          shopReport: shopReportResponse.data,
          canteenReport: canteenReportResponse.data,
          shopItems: shopItemsResponse.data.items || [],
          canteenItems: canteenItemsResponse.data.items || [],
          shopToday: shopTodayResponse.data,
          canteenToday: canteenTodayResponse.data,
        });
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load operator dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadSnapshot();
  }, []);

  const dashboardMetrics = useMemo(() => {
    const shopSummary = snapshot.shopReport?.summary || {};
    const canteenSummary = snapshot.canteenReport?.summary || {};
    const shopToday = snapshot.shopToday?.todaySummary || {};
    const canteenToday = snapshot.canteenToday?.todaySummary || {};

    const combinedRevenue = Number(shopSummary.totalRevenue || 0) + Number(canteenSummary.totalRevenue || 0);
    const combinedSales = Number(shopSummary.totalSales || 0) + Number(canteenSummary.totalSales || 0);
    const todayTransactions = Number(shopToday.count || 0) + Number(canteenToday.count || 0);
    const averageBill = combinedSales ? combinedRevenue / combinedSales : 0;
    const allItems = [...snapshot.shopItems, ...snapshot.canteenItems];
    const lowStockItems = allItems.filter(item => Number(item.stock || 0) <= Number(item.minStockAlert || 0));

    return {
      combinedRevenue,
      combinedSales,
      todayTransactions,
      averageBill,
      lowStockItems,
      lineData: mergeDailySales(snapshot.shopReport?.dailySales, snapshot.canteenReport?.dailySales),
      recentSales: [
        ...((snapshot.shopToday?.sales || []).map(sale => ({ ...sale, outlet: 'Shop' }))),
        ...((snapshot.canteenToday?.sales || []).map(sale => ({ ...sale, outlet: 'Canteen' }))),
      ]
        .sort((left, right) => new Date(right.date) - new Date(left.date))
        .slice(0, 8),
      outlets: [
        {
          key: 'shop',
          label: 'Shop Counter',
          icon: FiShoppingBag,
          revenue: Number(shopSummary.totalRevenue || 0),
          bills: Number(shopSummary.totalSales || 0),
          items: snapshot.shopItems.length,
          link: '/operator/shop',
          surface: 'border-primary-100 bg-primary-50',
          text: 'text-primary-700',
        },
        {
          key: 'canteen',
          label: 'Canteen Counter',
          icon: FiCoffee,
          revenue: Number(canteenSummary.totalRevenue || 0),
          bills: Number(canteenSummary.totalSales || 0),
          items: snapshot.canteenItems.length,
          link: '/operator/canteen',
          surface: 'border-red-100 bg-red-50',
          text: 'text-accent',
        },
      ],
    };
  }, [snapshot]);

  if (loading) {
    return <PageSpinner />;
  }

  const lineChartData = {
    labels: dashboardMetrics.lineData.map(entry => entry.date),
    datasets: [
      {
        label: 'Shop Revenue',
        data: dashboardMetrics.lineData.map(entry => entry.shop),
        borderColor: '#1E4DB7',
        backgroundColor: 'rgba(30, 77, 183, 0.12)',
        tension: 0.35,
        fill: true,
      },
      {
        label: 'Canteen Revenue',
        data: dashboardMetrics.lineData.map(entry => entry.canteen),
        borderColor: '#E53935',
        backgroundColor: 'rgba(229, 57, 53, 0.10)',
        tension: 0.35,
        fill: true,
      },
    ],
  };
  const exportConfig = {
    fileName: 'operator-dashboard',
    title: 'Commerce Overview Export',
    subtitle: 'Operator dashboard snapshot for shop and canteen activity.',
    summary: [
      { label: 'Combined Revenue', value: formatCurrency(dashboardMetrics.combinedRevenue) },
      { label: 'Total Bills', value: dashboardMetrics.combinedSales },
      { label: 'Average Bill', value: formatCurrency(dashboardMetrics.averageBill) },
      { label: 'Today Transactions', value: dashboardMetrics.todayTransactions },
      { label: 'Low Stock Alerts', value: dashboardMetrics.lowStockItems.length },
    ],
    sections: [
      {
        title: 'Outlet Snapshot',
        columns: [
          { header: 'Outlet', value: outlet => outlet.label },
          { header: 'Revenue', value: outlet => formatCurrency(outlet.revenue), align: 'right' },
          { header: 'Bills', value: outlet => outlet.bills, align: 'right' },
          { header: 'Active Items', value: outlet => outlet.items, align: 'right' },
        ],
        rows: dashboardMetrics.outlets,
      },
      {
        title: 'Revenue Trend',
        columns: [
          { header: 'Date', value: row => row.date },
          { header: 'Shop Revenue', value: row => formatCurrency(row.shop), align: 'right' },
          { header: 'Canteen Revenue', value: row => formatCurrency(row.canteen), align: 'right' },
        ],
        rows: dashboardMetrics.lineData,
      },
      {
        title: 'Recent Transactions',
        columns: [
          { header: 'Outlet', value: sale => sale.outlet },
          { header: 'Bill No', value: sale => sale.billNo || '-' },
          { header: 'Student', value: sale => sale.student ? `${sale.student.firstName || ''} ${sale.student.lastName || ''}`.trim() : 'Walk-in student' },
          { header: 'Amount', value: sale => formatCurrency(sale.totalAmount), align: 'right' },
          { header: 'Mode', value: sale => sale.paymentMode || '-' },
        ],
        rows: dashboardMetrics.recentSales,
      },
      {
        title: 'Restock Watchlist',
        columns: [
          { header: 'Item', value: item => item.name || '-' },
          { header: 'Type', value: item => item.type === 'shop' ? 'Shop' : 'Canteen' },
          { header: 'Current Stock', value: item => item.stock || 0, align: 'right' },
          { header: 'Alert Level', value: item => item.minStockAlert || 0, align: 'right' },
          { header: 'Unit', value: item => item.unit || 'units' },
        ],
        rows: dashboardMetrics.lowStockItems,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commerce Overview"
        subtitle="A focused view of shop and canteen performance, daily activity, and items that need attention."
        action={
          <div className="flex flex-wrap gap-2">
            <ExportActions getExportConfig={() => exportConfig} disabled={!dashboardMetrics.outlets.length && !dashboardMetrics.recentSales.length && !dashboardMetrics.lowStockItems.length} />
            <Link to="/operator/shop" className="btn-primary text-sm">Open Shop</Link>
            <Link to="/operator/canteen" className="btn-secondary text-sm">Open Canteen</Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<FiDollarSign />} label="Combined Revenue" value={formatCurrency(dashboardMetrics.combinedRevenue)} color="green" sub="Shop + canteen revenue" />
        <StatCard icon={<FiBarChart2 />} label="Total Bills" value={dashboardMetrics.combinedSales} color="blue" sub="All completed commerce bills" />
        <StatCard icon={<FiCreditCard />} label="Average Bill" value={formatCurrency(dashboardMetrics.averageBill)} color="purple" sub="Across both counters" />
        <StatCard icon={<FiAlertCircle />} label="Low Stock Alerts" value={dashboardMetrics.lowStockItems.length} color="red" sub="Items below alert level" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="card">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="section-title mb-1">Revenue Trend</h3>
              <p className="text-sm text-text-secondary">Daily comparison between shop and canteen revenue.</p>
            </div>
            <Link to="/operator/reports" className="inline-flex items-center gap-2 rounded-xl border border-primary-100 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-100">
              <FiTrendingUp />
              Detailed reports
            </Link>
          </div>
          {dashboardMetrics.lineData.length > 0 ? (
            <Line
              data={lineChartData}
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
            <EmptyState message="Not enough sales history yet to plot the trend." icon={<FiTrendingUp />} />
          )}
        </section>

        <section className="card space-y-4">
          <div>
            <h3 className="section-title mb-1">Outlet Snapshot</h3>
            <p className="text-sm text-text-secondary">Quick access to both counters with a cleaner performance summary.</p>
          </div>
          {dashboardMetrics.outlets.map(outlet => (
            <Link
              key={outlet.key}
              to={outlet.link}
              className={`block rounded-[1.4rem] border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${outlet.surface}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white ${outlet.text}`}>
                    <outlet.icon className="text-lg" />
                  </span>
                  <div>
                    <p className="font-semibold text-text-primary">{outlet.label}</p>
                    <p className="text-sm text-text-secondary">{outlet.items} active items</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${outlet.text}`}>Open</span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/70 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Revenue</p>
                  <p className={`mt-2 text-xl font-bold ${outlet.text}`}>{formatCurrency(outlet.revenue)}</p>
                </div>
                <div className="rounded-2xl bg-white/70 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Bills</p>
                  <p className="mt-2 text-xl font-bold text-text-primary">{outlet.bills}</p>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="card">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="section-title mb-1">Recent Transactions</h3>
              <p className="text-sm text-text-secondary">Latest bills recorded across the shop and canteen counters.</p>
            </div>
            <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
              {dashboardMetrics.todayTransactions} today
            </span>
          </div>
          {dashboardMetrics.recentSales.length > 0 ? (
            <div className="space-y-3">
              {dashboardMetrics.recentSales.map(sale => (
                <div key={sale._id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-slate-50 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={sale.outlet === 'Shop' ? 'badge-blue' : 'badge-red'}>
                        {sale.outlet}
                      </span>
                      <p className="truncate font-semibold text-text-primary">{sale.billNo}</p>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {sale.student ? `${sale.student.firstName} ${sale.student.lastName}` : 'Walk-in student'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-text-primary">{formatCurrency(sale.totalAmount)}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">{sale.paymentMode}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No recent operator activity available yet." icon={<FiPackage />} />
          )}
        </section>

        <section className="card">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="section-title mb-1">Restock Watchlist</h3>
              <p className="text-sm text-text-secondary">Products and menu items that need quick attention.</p>
            </div>
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
              {dashboardMetrics.lowStockItems.length} alerts
            </span>
          </div>
          {dashboardMetrics.lowStockItems.length > 0 ? (
            <div className="space-y-3">
              {dashboardMetrics.lowStockItems.slice(0, 8).map(item => (
                <div key={item._id} className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <div>
                    <p className="font-semibold text-text-primary">{item.name}</p>
                    <p className="text-sm text-text-secondary">
                      {item.type === 'shop' ? 'Shop' : 'Canteen'} · alert at {item.minStockAlert}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-accent">{item.stock}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-red-500">{item.unit || 'units'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Everything is currently above the stock alert threshold." icon={<FiPackage />} />
          )}
        </section>
      </div>
    </div>
  );
}
