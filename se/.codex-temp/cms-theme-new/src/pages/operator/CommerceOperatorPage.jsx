import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { downloadSaleReceipt } from '../../api/axios';
import toast from 'react-hot-toast';
import {
  EmptyState,
  ExportActions,
  Modal,
  PageHeader,
  SearchableSelect,
  StatCard,
  Table,
} from '../../components/common';
import {
  FiBarChart2,
  FiCheckCircle,
  FiClipboard,
  FiCoffee,
  FiCreditCard,
  FiDownload,
  FiDollarSign,
  FiMinus,
  FiPackage,
  FiPlus,
  FiSearch,
  FiShoppingBag,
  FiShoppingCart,
  FiTrendingUp,
  FiX,
} from '../../components/common/icons';

const WORKSPACE_THEME = {
  shop: {
    title: 'Shop Counter',
    subtitle: 'Handle stationeries, campus essentials, and quick student billing from one polished sales point.',
    icon: FiShoppingBag,
    heroClass: 'from-primary-500 via-primary-dark to-sidebar',
    glowClass: 'bg-primary-200/20',
    accentSurface: 'bg-primary-50 border-primary-100',
    accentText: 'text-primary-700',
    valueText: 'text-primary-600',
    tabActive: 'border border-transparent bg-primary-500 text-white shadow-sm',
    tabIdle: 'border border-border bg-white text-text-secondary hover:border-primary-100 hover:text-primary-600',
    actionButton: 'border border-transparent bg-primary-500 text-white hover:bg-primary-dark',
    subtleButton: 'border border-primary-100 bg-primary-50 text-primary-700 hover:bg-primary-100',
    badge: 'bg-white/15 text-white border-white/15',
    type: 'shop',
    itemLabel: 'Shop Items',
    stockLabel: 'stationery units',
  },
  canteen: {
    title: 'Canteen Counter',
    subtitle: 'Run daily food billing, menu updates, and student purchases in a focused commerce workspace.',
    icon: FiCoffee,
    heroClass: 'from-sidebar via-primary-dark to-accent',
    glowClass: 'bg-accent/20',
    accentSurface: 'bg-red-50 border-red-100',
    accentText: 'text-accent',
    valueText: 'text-accent',
    tabActive: 'border border-transparent bg-accent text-white shadow-sm',
    tabIdle: 'border border-border bg-white text-text-secondary hover:border-red-100 hover:text-accent',
    actionButton: 'border border-transparent bg-accent text-white hover:bg-accent-dark',
    subtleButton: 'border border-red-100 bg-red-50 text-accent hover:bg-red-100',
    badge: 'bg-white/15 text-white border-white/15',
    type: 'canteen',
    itemLabel: 'Menu Items',
    stockLabel: 'servings ready',
  },
};

const PAYMENT_MODE_OPTIONS = [
  { value: 'wallet', label: 'Wallet', searchText: 'wallet payment wallet' },
  { value: 'cash', label: 'Cash', searchText: 'cash payment cash' },
];

const STOCK_ACTION_OPTIONS = [
  { value: 'add', label: 'Add Stock', searchText: 'add stock' },
  { value: 'remove', label: 'Remove Stock', searchText: 'remove stock' },
  { value: 'set', label: 'Set Exact Stock', searchText: 'set stock exact' },
];

const formatCurrency = value => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;

const InfoPill = ({ label, value, theme }) => (
  <div className={`rounded-2xl border px-4 py-3 backdrop-blur-sm ${theme.badge}`}>
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{label}</p>
    <p className="mt-2 text-lg font-semibold text-white">{value}</p>
  </div>
);

const PaymentChip = ({ active, label, icon, className, activeClass }) => (
  <div
    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition duration-200 ${
      active
        ? activeClass
        : 'border-border bg-white text-text-secondary hover:border-primary-100 hover:text-primary-600'
    } ${className}`}
  >
    {icon}
    <span>{label}</span>
  </div>
);

export default function CommerceOperatorPage({ type = 'shop' }) {
  const theme = WORKSPACE_THEME[type] || WORKSPACE_THEME.shop;
  const HeroIcon = theme.icon;

  const [tab, setTab] = useState('billing');
  const [identifier, setIdentifier] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [searching, setSearching] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentMode, setPaymentMode] = useState('wallet');
  const [processing, setProcessing] = useState(false);
  const [lastBill, setLastBill] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [sales, setSales] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [itemForm, setItemForm] = useState({
    name: '',
    price: '',
    unit: type === 'canteen' ? 'portion' : 'piece',
    stock: '',
    minStockAlert: 5,
  });
  const [stockDialog, setStockDialog] = useState({
    open: false,
    item: null,
    quantity: '',
    action: 'add',
  });

  const fetchItems = useCallback(async () => {
    try {
      const response = await api.get(`/shop/items?type=${type}`);
      const nextItems = response.data.items || [];
      setItems(nextItems);
      setMenuItems(nextItems.filter(item => item.isAvailable && item.stock > 0));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load items');
    }
  }, [type]);

  const fetchSales = useCallback(async () => {
    try {
      const response = await api.get(`/shop/sales?type=${type}&date=${saleDate}`);
      setSales(response.data.sales || []);
      setTodaySummary(response.data.todaySummary || null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load sales');
    }
  }, [saleDate, type]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const lowStockCount = useMemo(
    () => items.filter(item => Number(item.stock || 0) <= Number(item.minStockAlert || 0)).length,
    [items]
  );

  const availableCount = useMemo(
    () => items.filter(item => item.isAvailable).length,
    [items]
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.total || 0), 0),
    [cart]
  );

  const handleSearch = async event => {
    event.preventDefault();
    if (!identifier.trim()) return;

    setSearching(true);
    setStudentData(null);
    setCart([]);
    setLastBill(null);

    try {
      const response = await api.get(`/shop/find/${identifier.trim()}`);
      setStudentData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Student not found');
    } finally {
      setSearching(false);
    }
  };

  const addToCart = item => {
    setCart(previous => {
      const existingItem = previous.find(entry => entry.itemId === item._id);
      if (existingItem) {
        if (existingItem.qty >= item.stock) {
          toast.error(`Only ${item.stock} ${item.unit || 'units'} available`);
          return previous;
        }
        return previous.map(entry =>
          entry.itemId === item._id
            ? {
                ...entry,
                qty: entry.qty + 1,
                total: (entry.qty + 1) * entry.unitPrice,
              }
            : entry
        );
      }

      return [
        ...previous,
        {
          itemId: item._id,
          name: item.name,
          qty: 1,
          unitPrice: item.price,
          total: item.price,
          maxStock: item.stock,
        },
      ];
    });
  };

  const removeFromCart = itemId => {
    setCart(previous => {
      const existingItem = previous.find(entry => entry.itemId === itemId);
      if (!existingItem) return previous;
      if (existingItem.qty === 1) {
        return previous.filter(entry => entry.itemId !== itemId);
      }

      return previous.map(entry =>
        entry.itemId === itemId
          ? {
              ...entry,
              qty: entry.qty - 1,
              total: (entry.qty - 1) * entry.unitPrice,
            }
          : entry
      );
    });
  };

  const handleBill = async () => {
    if (!studentData) {
      toast.error('Find a student first');
      return;
    }
    if (!cart.length) {
      toast.error('Add items to the cart');
      return;
    }
    if (paymentMode === 'wallet' && cartTotal > Number(studentData.wallet?.balance || 0)) {
      toast.error(`Insufficient wallet balance. Available: ${formatCurrency(studentData.wallet?.balance)}`);
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post('/shop/sell', {
        studentId: studentData.student._id,
        items: cart.map(entry => ({ itemId: entry.itemId, qty: entry.qty })),
        paymentMode,
        type,
      });

      setLastBill(response.data.sale);
      toast.success(`Bill ${response.data.sale.billNo} created`);

      if (paymentMode === 'wallet') {
        setStudentData(previous => ({
          ...previous,
          wallet: {
            ...previous.wallet,
            balance: response.data.walletBalance,
          },
        }));
      }

      setCart([]);
      fetchItems();
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to complete billing');
    } finally {
      setProcessing(false);
    }
  };

  const handleSaleReceiptDownload = async billNo => {
    try {
      await downloadSaleReceipt(billNo);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to download receipt');
    }
  };

  const handleReset = () => {
    setIdentifier('');
    setStudentData(null);
    setCart([]);
    setLastBill(null);
  };

  const handleAddItem = async event => {
    event.preventDefault();
    try {
      await api.post('/shop/items', {
        ...itemForm,
        type,
      });
      toast.success(`${type === 'canteen' ? 'Menu item' : 'Item'} added`);
      setShowAddItem(false);
      setItemForm({
        name: '',
        price: '',
        unit: type === 'canteen' ? 'portion' : 'piece',
        stock: '',
        minStockAlert: 5,
      });
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to add item');
    }
  };

  const openStockDialog = (item, action = 'add') => {
    setStockDialog({
      open: true,
      item,
      quantity: '',
      action,
    });
  };

  const closeStockDialog = () => {
    setStockDialog({
      open: false,
      item: null,
      quantity: '',
      action: 'add',
    });
  };

  const handleStockUpdate = async event => {
    event.preventDefault();
    if (!stockDialog.item) return;

    const quantity = Number(stockDialog.quantity);
    if (Number.isNaN(quantity) || quantity < 0) {
      toast.error('Enter a valid stock quantity');
      return;
    }

    try {
      await api.post(`/shop/items/${stockDialog.item._id}/stock`, {
        quantity,
        action: stockDialog.action,
      });
      toast.success('Stock updated');
      closeStockDialog();
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update stock');
    }
  };

  const handleQuickStockUpdate = async (itemId, quantity, action) => {
    try {
      await api.post(`/shop/items/${itemId}/stock`, { quantity, action });
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update stock');
    }
  };

  const handleToggleAvailable = async (itemId, currentValue) => {
    try {
      await api.put(`/shop/items/${itemId}`, { isAvailable: !currentValue });
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update visibility');
    }
  };

  const exportConfig = {
    fileName: `${type}-${tab}-workspace`,
    title: `${theme.title} Export`,
    subtitle: 'Commerce operator workspace export based on the current tab.',
    summary: [
      { label: 'Workspace', value: theme.title },
      { label: 'Current Tab', value: tab },
      { label: 'Today Revenue', value: formatCurrency(todaySummary?.totalRevenue) },
      { label: 'Today Transactions', value: todaySummary?.count || 0 },
      { label: 'Available Items', value: availableCount },
      { label: 'Low Stock Alerts', value: lowStockCount },
    ],
    sections: tab === 'items'
      ? [
          {
            title: `${theme.itemLabel}`,
            columns: [
              { header: 'Name', value: item => item.name || '-' },
              { header: 'Price', value: item => formatCurrency(item.price), align: 'right' },
              { header: 'Stock', value: item => `${item.stock || 0} ${item.unit || 'units'}`.trim(), align: 'right' },
              { header: 'Minimum Alert', value: item => item.minStockAlert || 0, align: 'right' },
              { header: 'Available', value: item => item.isAvailable ? 'Yes' : 'No' },
            ],
            rows: items,
          },
        ]
      : tab === 'sales'
        ? [
            {
              title: 'Sales Register',
              columns: [
                { header: 'Bill No', value: sale => sale.billNo || '-' },
                { header: 'Student', value: sale => sale.student ? `${sale.student.firstName || ''} ${sale.student.lastName || ''}`.trim() : 'Walk-in student' },
                { header: 'Amount', value: sale => formatCurrency(sale.totalAmount), align: 'right' },
                { header: 'Mode', value: sale => sale.paymentMode || '-' },
                { header: 'Status', value: sale => sale.status || '-' },
                { header: 'Date', value: sale => new Date(sale.date).toLocaleString('en-IN') },
              ],
              rows: sales,
            },
          ]
        : [
            {
              title: 'Current Billing Cart',
              columns: [
                { header: 'Item', value: item => item.name || '-' },
                { header: 'Quantity', value: item => item.qty || 0, align: 'right' },
                { header: 'Unit Price', value: item => formatCurrency(item.unitPrice), align: 'right' },
                { header: 'Total', value: item => formatCurrency(item.total), align: 'right' },
              ],
              rows: cart,
            },
          ],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl text-white ${theme.actionButton}`}>
              <HeroIcon className="text-lg" />
            </span>
            <span>{theme.title}</span>
          </span>
        }
        subtitle={theme.subtitle}
        action={<ExportActions getExportConfig={() => exportConfig} disabled={tab === 'items' ? items.length === 0 : tab === 'sales' ? sales.length === 0 : cart.length === 0} />}
      />

      <section className={`relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-r ${theme.heroClass} p-6 text-white shadow-[0_30px_70px_-40px_rgba(15,23,42,0.75)]`}>
        <div className={`absolute -left-12 top-10 h-40 w-40 rounded-full ${theme.glowClass}`} />
        <div className="absolute right-8 top-6 h-24 w-24 rounded-[1.75rem] border border-white/10 bg-white/10 backdrop-blur-sm" />
        <div className="absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-white/10" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85">
              Commerce Workspace
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {type === 'shop' ? 'Fast campus store billing and stock control.' : 'Modern canteen billing with menu and sales control.'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">
              Search students, issue bills in seconds, update inventory, and review same-day transactions from a cleaner operator workflow.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <InfoPill label="Today Revenue" value={formatCurrency(todaySummary?.totalRevenue)} theme={theme} />
              <InfoPill label="Active Items" value={availableCount} theme={theme} />
              <InfoPill label="Low Stock" value={lowStockCount} theme={theme} />
            </div>
          </div>

          <div className="grid gap-4 rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
            <div className="rounded-[1.35rem] bg-white/95 p-4 text-text-primary shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                Counter Snapshot
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-2xl font-bold">{todaySummary?.count || 0}</p>
                  <p className="text-xs text-text-secondary">Bills processed today</p>
                </div>
                <div>
                  <p className={`text-2xl font-bold ${theme.valueText}`}>{formatCurrency(todaySummary?.cashRevenue)}</p>
                  <p className="text-xs text-text-secondary">Cash collections</p>
                </div>
                <div>
                  <p className={`text-2xl font-bold ${theme.valueText}`}>{formatCurrency(todaySummary?.walletRevenue)}</p>
                  <p className="text-xs text-text-secondary">Wallet collections</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{menuItems.length}</p>
                  <p className="text-xs text-text-secondary">{theme.stockLabel}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">Student Billing</p>
                <p className="mt-2 text-sm font-semibold text-white">Wallet and cash ready</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">Operations</p>
                <p className="mt-2 text-sm font-semibold text-white">Items, stock, and sales aligned</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'billing', label: 'Billing', icon: FiClipboard },
          { key: 'items', label: theme.itemLabel, icon: FiPackage },
          { key: 'sales', label: 'Sales', icon: FiBarChart2 },
        ].map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 ${
              tab === item.key ? theme.tabActive : theme.tabIdle
            }`}
          >
            <item.icon className="text-base" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<HeroIcon />} label="Available Items" value={availableCount} color="blue" sub={`${menuItems.length} ready to bill`} />
        <StatCard icon={<FiPackage />} label="Low Stock Alerts" value={lowStockCount} color="yellow" sub="Review and restock quickly" />
        <StatCard icon={<FiDollarSign />} label="Wallet Collections" value={formatCurrency(todaySummary?.walletRevenue)} color="green" sub="Student wallet usage today" />
        <StatCard icon={<FiTrendingUp />} label="Today's Transactions" value={todaySummary?.count || 0} color="purple" sub={`${formatCurrency(todaySummary?.totalRevenue)} total billed`} />
      </div>

      {tab === 'billing' && (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <section className="card">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="section-title mb-1">Find Student</h3>
                  <p className="text-sm text-text-secondary">Search by phone, roll number, or admission number before starting the bill.</p>
                </div>
                {studentData && (
                  <button type="button" onClick={handleReset} className="text-sm font-semibold text-text-secondary transition hover:text-text-primary">
                    Clear selection
                  </button>
                )}
              </div>
              <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    className="input pl-11"
                    placeholder="Enter phone number, roll no, or admission no"
                    value={identifier}
                    onChange={event => setIdentifier(event.target.value)}
                  />
                </div>
                <button type="submit" disabled={searching} className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${theme.actionButton}`}>
                  <FiSearch />
                  {searching ? 'Searching...' : 'Find Student'}
                </button>
              </form>

              {studentData ? (
                <div className={`mt-5 rounded-[1.5rem] border p-4 shadow-sm ${theme.accentSurface}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white text-lg font-bold text-primary-600 shadow-sm">
                        {studentData.student.photo ? (
                          <img src={studentData.student.photo} alt={studentData.student.firstName} className="h-full w-full object-cover" />
                        ) : (
                          studentData.student.firstName?.[0]
                        )}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-text-primary">
                          {studentData.student.firstName} {studentData.student.lastName}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {studentData.student.studentIdentifier || studentData.student.rollNo || studentData.student.admissionNo}
                        </p>
                        <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                          {studentData.student.course || 'Course not assigned'}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Wallet Balance</p>
                      <p className={`mt-2 text-2xl font-bold ${theme.valueText}`}>{formatCurrency(studentData.wallet?.balance)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  <EmptyState message="Select a student to unlock the billing area." icon={<FiShoppingCart />} />
                </div>
              )}
            </section>

            <section className="card">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="section-title mb-1">{theme.itemLabel}</h3>
                  <p className="text-sm text-text-secondary">Tap items to add them to the cart. Live stock is shown on each card.</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${theme.accentSurface} ${theme.accentText}`}>
                  {menuItems.length} items ready
                </span>
              </div>

              {!studentData ? (
                <EmptyState message="Find a student first to begin billing." icon={<HeroIcon />} />
              ) : menuItems.length === 0 ? (
                <EmptyState message={`No ${type === 'canteen' ? 'menu items' : 'shop items'} available for billing right now.`} icon={<FiPackage />} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {menuItems.map(item => {
                    const cartEntry = cart.find(entry => entry.itemId === item._id);
                    return (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => addToCart(item)}
                        className={`relative overflow-hidden rounded-[1.4rem] border p-4 text-left shadow-sm transition duration-200 ${
                          cartEntry
                            ? `${theme.accentSurface} shadow-md`
                            : 'border-border bg-white hover:-translate-y-0.5 hover:border-primary-100 hover:shadow-md'
                        }`}
                      >
                        <div className={`absolute -right-5 -top-5 h-20 w-20 rounded-full ${theme.glowClass}`} />
                        <div className="relative z-10">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-text-primary">{item.name}</p>
                              <p className={`mt-2 text-lg font-bold ${theme.valueText}`}>{formatCurrency(item.price)}</p>
                            </div>
                            {cartEntry && (
                              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${theme.actionButton}`}>
                                {cartEntry.qty}
                              </span>
                            )}
                          </div>
                          <div className="mt-4 flex items-center justify-between text-xs text-text-secondary">
                            <span>{item.stock} {item.unit || 'units'} left</span>
                            <span>Tap to add</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            {lastBill && (
              <section className={`rounded-[1.5rem] border p-5 shadow-sm ${theme.accentSurface}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.accentText}`}>Latest Bill</p>
                    <p className="mt-2 text-xl font-bold text-text-primary">{lastBill.billNo}</p>
                    <p className="mt-1 text-sm text-text-secondary">Successfully recorded in the sales ledger.</p>
                  </div>
                  <button type="button" onClick={() => setLastBill(null)} className="text-text-secondary transition hover:text-text-primary">
                    <FiX />
                  </button>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">Amount</p>
                    <p className={`mt-2 text-3xl font-bold ${theme.valueText}`}>{formatCurrency(lastBill.totalAmount)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaleReceiptDownload(lastBill.billNo)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary-500 bg-white text-primary-600 transition hover:bg-primary-600 hover:text-white"
                      aria-label={`Download receipt ${lastBill.billNo}`}
                      title="Download receipt"
                    >
                      <FiDownload className="text-base" />
                    </button>
                    <span className="badge-green">
                      <FiCheckCircle className="mr-1" />
                      Recorded
                    </span>
                  </div>
                </div>
              </section>
            )}

            <section className="card">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="section-title mb-0 inline-flex items-center gap-2">
                  <FiShoppingCart />
                  Current Cart
                </h3>
                {cart.length > 0 && (
                  <button type="button" onClick={() => setCart([])} className="text-sm font-semibold text-text-secondary transition hover:text-text-primary">
                    Clear
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <EmptyState message="Add products from the menu to start building the bill." icon={<FiShoppingCart />} />
              ) : (
                <div className="space-y-3">
                  {cart.map(entry => (
                    <div key={entry.itemId} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-slate-50 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-primary">{entry.name}</p>
                        <p className="text-xs text-text-secondary">{formatCurrency(entry.unitPrice)} x {entry.qty}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => removeFromCart(entry.itemId)} className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition hover:border-red-200 hover:bg-red-50 hover:text-accent">
                          <FiMinus />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-text-primary">{entry.qty}</span>
                        <button type="button" onClick={() => addToCart(menuItems.find(item => item._id === entry.itemId) || entry)} className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition hover:border-primary-100 hover:bg-primary-50 hover:text-primary-600">
                          <FiPlus />
                        </button>
                      </div>
                      <p className={`w-20 text-right text-sm font-bold ${theme.valueText}`}>{formatCurrency(entry.total)}</p>
                    </div>
                  ))}

                  <div className="rounded-2xl border border-border bg-white px-4 py-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-text-secondary">Total</span>
                      <span className={`text-2xl font-bold ${theme.valueText}`}>{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {PAYMENT_MODE_OPTIONS.map(option => (
                      <button key={option.value} type="button" onClick={() => setPaymentMode(option.value)}>
                        <PaymentChip
                          active={paymentMode === option.value}
                          label={option.label}
                          icon={option.value === 'wallet' ? <FiCreditCard /> : <FiDollarSign />}
                          className="w-full"
                          activeClass={theme.actionButton}
                        />
                      </button>
                    ))}
                  </div>

                  {studentData && paymentMode === 'wallet' && (
                    <div className={`rounded-2xl border px-4 py-3 text-sm ${theme.accentSurface}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-text-secondary">Wallet balance available</span>
                        <span className={`font-bold ${theme.valueText}`}>{formatCurrency(studentData.wallet?.balance)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleBill}
                    disabled={processing || !studentData || (paymentMode === 'wallet' && cartTotal > Number(studentData?.wallet?.balance || 0))}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${theme.actionButton}`}
                  >
                    <FiCheckCircle />
                    {processing ? 'Processing Bill...' : `Charge ${formatCurrency(cartTotal)} via ${paymentMode === 'wallet' ? 'Wallet' : 'Cash'}`}
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {tab === 'items' && (
        <section className="card">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="section-title mb-1">{theme.itemLabel}</h3>
              <p className="text-sm text-text-secondary">Add new entries, control stock, and toggle item visibility without leaving the counter.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setShowAddItem(true)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 ${theme.actionButton}`}>
                <FiPlus />
                Add {type === 'canteen' ? 'Menu Item' : 'Item'}
              </button>
            </div>
          </div>

          <div className="mb-5 grid gap-4 md:grid-cols-3">
            <div className={`rounded-[1.4rem] border p-4 ${theme.accentSurface}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Catalog Size</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{items.length}</p>
              <p className="text-sm text-text-secondary">Registered {type === 'canteen' ? 'menu items' : 'products'}</p>
            </div>
            <div className={`rounded-[1.4rem] border p-4 ${theme.accentSurface}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Available</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{availableCount}</p>
              <p className="text-sm text-text-secondary">Visible for billing</p>
            </div>
            <div className="rounded-[1.4rem] border border-red-100 bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">Need Attention</p>
              <p className="mt-2 text-3xl font-bold text-accent">{lowStockCount}</p>
              <p className="text-sm text-red-500">Below minimum alert level</p>
            </div>
          </div>

          {items.length === 0 ? (
            <EmptyState message={`No ${type === 'canteen' ? 'menu items' : 'items'} added yet.`} icon={<FiPackage />} />
          ) : (
            <Table headers={['Item', 'Code', 'Price', 'Stock', 'Visibility', 'Actions']}>
              {items.map(item => (
                <tr key={item._id} className={Number(item.stock || 0) <= Number(item.minStockAlert || 0) ? 'bg-red-50/60' : 'hover:bg-gray-50'}>
                  <td className="table-cell">
                    <div>
                      <p className="font-semibold text-text-primary">{item.name}</p>
                      <p className="text-xs text-text-secondary">
                        Alert at {item.minStockAlert} {item.unit || 'units'}
                      </p>
                    </div>
                  </td>
                  <td className="table-cell font-mono text-xs text-text-secondary">{item.code || '-'}</td>
                  <td className={`table-cell font-semibold ${theme.valueText}`}>{formatCurrency(item.price)}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleQuickStockUpdate(item._id, 1, 'remove')} className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition hover:border-red-200 hover:bg-red-50 hover:text-accent">
                        <FiMinus />
                      </button>
                      <span className={`min-w-[5rem] text-center text-sm font-bold ${Number(item.stock || 0) <= Number(item.minStockAlert || 0) ? 'text-accent' : 'text-text-primary'}`}>
                        {item.stock} {item.unit || 'units'}
                      </span>
                      <button type="button" onClick={() => handleQuickStockUpdate(item._id, 1, 'add')} className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition hover:border-primary-100 hover:bg-primary-50 hover:text-primary-600">
                        <FiPlus />
                      </button>
                    </div>
                  </td>
                  <td className="table-cell">
                    <button type="button" onClick={() => handleToggleAvailable(item._id, item.isAvailable)} className={item.isAvailable ? 'badge-green' : 'badge-gray'}>
                      {item.isAvailable ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openStockDialog(item, 'add')} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition duration-200 ${theme.subtleButton}`}>
                        Adjust Stock
                      </button>
                      <button type="button" onClick={() => handleToggleAvailable(item._id, item.isAvailable)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:border-red-100 hover:bg-red-50 hover:text-accent">
                        {item.isAvailable ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </section>
      )}

      {tab === 'sales' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={<FiDollarSign />} label="Today Revenue" value={formatCurrency(todaySummary?.totalRevenue)} color="green" sub="Combined billed amount" />
            <StatCard icon={<FiCreditCard />} label="Wallet Collections" value={formatCurrency(todaySummary?.walletRevenue)} color="blue" sub="Paid through wallet" />
            <StatCard icon={<FiClipboard />} label="Cash Collections" value={formatCurrency(todaySummary?.cashRevenue)} color="yellow" sub="Direct cash payments" />
            <StatCard icon={<FiBarChart2 />} label="Bills Processed" value={todaySummary?.count || 0} color="purple" sub="Transactions for the chosen day" />
          </div>

          <section className="card">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="section-title mb-1">Sales Register</h3>
                <p className="text-sm text-text-secondary">Review the bills processed on any selected date.</p>
              </div>
              <div className="w-full sm:w-56">
                <label className="label">Date</label>
                <input type="date" className="input" value={saleDate} onChange={event => setSaleDate(event.target.value)} />
              </div>
            </div>

            {sales.length === 0 ? (
              <EmptyState message="No sales recorded for the selected date." icon={<FiTrendingUp />} />
            ) : (
              <Table headers={['Bill No', 'Student', 'Items', 'Amount', 'Mode', 'Time', 'Receipt']}>
                {sales.map(sale => (
                  <tr key={sale._id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono text-xs">{sale.billNo}</td>
                    <td className="table-cell">
                      <div>
                        <p className="font-semibold text-text-primary">
                          {sale.student ? `${sale.student.firstName} ${sale.student.lastName}` : 'Walk-in student'}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {sale.student?.rollNo || sale.student?.admissionNo || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="table-cell text-sm text-text-secondary">
                      {sale.items?.map(item => `${item.name} x${item.qty}`).join(', ')}
                    </td>
                    <td className={`table-cell font-semibold ${theme.valueText}`}>{formatCurrency(sale.totalAmount)}</td>
                    <td className="table-cell">
                      <span className={sale.paymentMode === 'wallet' ? 'badge-blue' : 'badge-green'}>
                        {sale.paymentMode}
                      </span>
                    </td>
                    <td className="table-cell text-sm text-text-secondary">
                      {new Date(sale.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="table-cell">
                      <button
                        type="button"
                        onClick={() => handleSaleReceiptDownload(sale.billNo)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-500 bg-white text-primary-600 transition hover:bg-primary-600 hover:text-white"
                        aria-label={`Download receipt ${sale.billNo}`}
                        title="Download receipt"
                      >
                        <FiDownload className="text-sm" />
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </section>
        </div>
      )}

      <Modal open={showAddItem} onClose={() => setShowAddItem(false)} title={`Add ${type === 'canteen' ? 'Menu Item' : 'Item'}`}>
        <form onSubmit={handleAddItem} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={itemForm.name} onChange={event => setItemForm(previous => ({ ...previous, name: event.target.value }))} required />
            </div>
            <div>
              <label className="label">Price *</label>
              <input type="number" min="0" className="input" value={itemForm.price} onChange={event => setItemForm(previous => ({ ...previous, price: event.target.value }))} required />
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="input" value={itemForm.unit} onChange={event => setItemForm(previous => ({ ...previous, unit: event.target.value }))} />
            </div>
            <div>
              <label className="label">Opening Stock</label>
              <input type="number" min="0" className="input" value={itemForm.stock} onChange={event => setItemForm(previous => ({ ...previous, stock: event.target.value }))} />
            </div>
            <div>
              <label className="label">Minimum Stock Alert</label>
              <input type="number" min="0" className="input" value={itemForm.minStockAlert} onChange={event => setItemForm(previous => ({ ...previous, minStockAlert: event.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowAddItem(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Item</button>
          </div>
        </form>
      </Modal>

      <Modal open={stockDialog.open} onClose={closeStockDialog} title={stockDialog.item ? `Adjust Stock - ${stockDialog.item.name}` : 'Adjust Stock'}>
        <form onSubmit={handleStockUpdate} className="space-y-4">
          <div>
            <label className="label">Stock Action</label>
            <SearchableSelect
              value={stockDialog.action}
              onChange={action => setStockDialog(previous => ({ ...previous, action }))}
              placeholder="Select stock action"
              searchPlaceholder="Search stock actions..."
              options={STOCK_ACTION_OPTIONS}
            />
          </div>
          <div>
            <label className="label">Quantity</label>
            <input
              type="number"
              min="0"
              className="input"
              value={stockDialog.quantity}
              onChange={event => setStockDialog(previous => ({ ...previous, quantity: event.target.value }))}
              required
            />
          </div>
          <div className="rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-secondary">
            Current stock: <span className="font-semibold text-text-primary">{stockDialog.item?.stock || 0}</span>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeStockDialog} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Update Stock</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
