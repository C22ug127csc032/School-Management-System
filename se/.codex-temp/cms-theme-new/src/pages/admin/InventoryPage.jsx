import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import {
  EmptyState,
  ExportActions,
  ListControls,
  Modal,
  PageHeader,
  PageSpinner,
  Pagination,
  SearchableSelect,
  Table,
} from '../../components/common';
import { FiClock, FiEdit3, FiPackage, FiTrash2 } from '../../components/common/icons';
import { useAppSettings } from '../../context/AppSettingsContext';
import toast from 'react-hot-toast';
import { getFirstActiveValue, toSelectOptions } from '../../utils/appSettings';

const initialItemForm = {
  name: '',
  quantity: '',
  code: '',
  category: 'academic',
  unit: 'pcs',
  openingStock: '',
  currentStock: '',
  minStockAlert: '5',
};

const initialTxnForm = {
  inventoryId: '',
  quantity: '',
  unitPrice: '',
  vendorName: '',
  vendorPhone: '',
  invoiceNo: '',
  reference: '',
  remarks: '',
};

const formatCurrency = value => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

const parseSortValue = value => {
  const [sortBy = 'name', sortOrder = 'asc'] = String(value || 'name:asc').split(':');
  return { sortBy, sortOrder };
};

export default function InventoryPage() {
  const { getMasterOptions } = useAppSettings();
  const inventoryCategoryOptions = toSelectOptions(getMasterOptions('inventory_categories', [
    { value: 'academic', label: 'Academic' },
    { value: 'hostel', label: 'Hostel' },
    { value: 'general_stocks', label: 'General Stocks' },
    { value: 'shop', label: 'Shop' },
    { value: 'canteen', label: 'Canteen' },
  ]));
  const formatCategoryLabel = useCallback(
    value => inventoryCategoryOptions.find(option => option.value === value)?.label || value || '-',
    [inventoryCategoryOptions]
  );

  const [items, setItems] = useState([]);
  const [inventoryCatalog, setInventoryCatalog] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('items');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [itemForm, setItemForm] = useState({
    ...initialItemForm,
    category: getFirstActiveValue(inventoryCategoryOptions, initialItemForm.category),
  });
  const [txnForm, setTxnForm] = useState(initialTxnForm);

  const [itemControls, setItemControls] = useState({
    search: '',
    category: '',
    lowStock: '',
    sort: 'name:asc',
  });
  const [itemPage, setItemPage] = useState(1);
  const [itemPageSize, setItemPageSize] = useState(20);
  const [itemTotal, setItemTotal] = useState(0);
  const [itemPages, setItemPages] = useState(1);

  const [transactionControls, setTransactionControls] = useState({
    search: '',
    category: '',
    inventoryId: '',
    startDate: '',
    endDate: '',
    sort: 'latest:desc',
  });
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionPageSize, setTransactionPageSize] = useState(20);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [transactionPages, setTransactionPages] = useState(1);

  const categorySelectOptions = useMemo(
    () => inventoryCategoryOptions,
    [inventoryCategoryOptions]
  );

  const categoryFilterOptions = useMemo(
    () => [
      { value: '', label: 'All Categories', searchText: 'all categories' },
      ...inventoryCategoryOptions,
    ],
    [inventoryCategoryOptions]
  );

  const lowStockFilterOptions = [
    { value: '', label: 'All Stock Levels', searchText: 'all stock levels' },
    { value: 'true', label: 'Low Stock Only', searchText: 'low stock only' },
  ];

  const itemSortOptions = [
    { value: 'name:asc', label: 'Name A-Z' },
    { value: 'name:desc', label: 'Name Z-A' },
    { value: 'category:asc', label: 'Category A-Z' },
    { value: 'stock:desc', label: 'Higher Stock First' },
    { value: 'purchasePrice:desc', label: 'Higher Buying Price' },
    { value: 'sellingPrice:desc', label: 'Higher Selling Price' },
    { value: 'recent:desc', label: 'Recently Added' },
  ];

  const transactionSortOptions = [
    { value: 'latest:desc', label: 'Newest First' },
    { value: 'oldest:asc', label: 'Oldest First' },
    { value: 'vendor:asc', label: 'Vendor A-Z' },
    { value: 'quantity:desc', label: 'Higher Quantity First' },
    { value: 'total:desc', label: 'Higher Total First' },
  ];

  const inventoryOptions = useMemo(
    () => [
      { value: '', label: 'All Items', searchText: 'all items' },
      ...inventoryCatalog.map(item => ({
        value: item._id,
        label: `${item.name} (${formatCategoryLabel(item.category)})`,
        searchText: `${item.name} ${item.code || ''} ${item.category || ''}`,
      })),
    ],
    [formatCategoryLabel, inventoryCatalog]
  );

  const purchaseEntryOptions = useMemo(
    () => inventoryCatalog.map(item => ({
      value: item._id,
      label: `${item.name} (${formatCategoryLabel(item.category)})`,
      searchText: `${item.name} ${item.code || ''} ${item.category || ''}`,
    })),
    [formatCategoryLabel, inventoryCatalog]
  );

  const fetchInventoryCatalog = useCallback(async () => {
    try {
      const response = await api.get('/inventory', {
        params: {
          page: 1,
          limit: 500,
          sortBy: 'name',
          sortOrder: 'asc',
        },
      });
      setInventoryCatalog(response.data.items || []);
    } catch {
      setInventoryCatalog([]);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const itemSort = parseSortValue(itemControls.sort);
      const transactionSort = parseSortValue(transactionControls.sort);
      const [itemsResponse, statsResponse, transactionsResponse] = await Promise.all([
        api.get('/inventory', {
          params: {
            page: itemPage,
            limit: itemPageSize,
            category: itemControls.category || undefined,
            search: itemControls.search || undefined,
            lowStock: itemControls.lowStock || undefined,
            sortBy: itemSort.sortBy,
            sortOrder: itemSort.sortOrder,
          },
        }),
        api.get('/inventory/stats'),
        api.get('/inventory/transactions', {
          params: {
            page: transactionPage,
            limit: transactionPageSize,
            inventoryId: transactionControls.inventoryId || undefined,
            category: transactionControls.category || undefined,
            search: transactionControls.search || undefined,
            startDate: transactionControls.startDate || undefined,
            endDate: transactionControls.endDate || undefined,
            sortBy: transactionSort.sortBy,
            sortOrder: transactionSort.sortOrder,
          },
        }),
      ]);

      setItems(itemsResponse.data.items || []);
      setItemTotal(itemsResponse.data.total || 0);
      setItemPages(itemsResponse.data.pages || 1);
      setStats(statsResponse.data.stats || []);
      setLowStockItems(statsResponse.data.lowStockItems || []);
      setTransactions(transactionsResponse.data.transactions || []);
      setTransactionTotal(transactionsResponse.data.total || 0);
      setTransactionPages(transactionsResponse.data.pages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [
    itemControls.category,
    itemControls.lowStock,
    itemControls.search,
    itemControls.sort,
    itemPage,
    itemPageSize,
    transactionControls.category,
    transactionControls.endDate,
    transactionControls.inventoryId,
    transactionControls.search,
    transactionControls.sort,
    transactionControls.startDate,
    transactionPage,
    transactionPageSize,
  ]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    fetchInventoryCatalog();
  }, [fetchInventoryCatalog]);

  const totalStockValue = useMemo(
    () => stats.reduce((sum, group) => sum + Number(group.totalValue || 0), 0),
    [stats]
  );

  const openCreateModal = () => {
    setEditingItem(null);
    setItemForm({
      ...initialItemForm,
      category: getFirstActiveValue(inventoryCategoryOptions, initialItemForm.category),
    });
    setShowItemModal(true);
  };

  const openEditModal = item => {
    setEditingItem(item);
    setItemForm({
      name: item.name || '',
      quantity: item.currentStock ?? '',
      code: item.code || '',
      category: item.category || 'academic',
      unit: item.unit || 'pcs',
      openingStock: item.openingStock ?? '',
      currentStock: item.currentStock ?? '',
      minStockAlert: item.minStockAlert ?? '5',
    });
    setShowItemModal(true);
  };

  const closeItemModal = () => {
    setShowItemModal(false);
    setEditingItem(null);
    setItemForm({
      ...initialItemForm,
      category: getFirstActiveValue(inventoryCategoryOptions, initialItemForm.category),
    });
  };

  const openTransactionModal = () => {
    setTxnForm(current => ({
      ...initialTxnForm,
      inventoryId: current.inventoryId && inventoryCatalog.some(item => item._id === current.inventoryId)
        ? current.inventoryId
        : (inventoryCatalog[0]?._id || ''),
    }));
    setShowTxnModal(true);
  };

  const closeTxnModal = () => {
    setShowTxnModal(false);
    setTxnForm(initialTxnForm);
  };

  const saveItem = async event => {
    event.preventDefault();
    const quantity = Number(itemForm.quantity || 0);
    const openingStock = Number(itemForm.openingStock || quantity || 0);
    const currentStock = Number(itemForm.currentStock || quantity || openingStock || 0);

    const payload = {
      name: itemForm.name,
      code: itemForm.code,
      category: itemForm.category,
      unit: itemForm.unit,
      openingStock,
      currentStock,
      minStockAlert: Number(itemForm.minStockAlert || 0),
    };

    try {
      if (editingItem?._id) {
        await api.put(`/inventory/${editingItem._id}`, payload);
        toast.success('Inventory item updated');
      } else {
        await api.post('/inventory', payload);
        toast.success('Inventory item added');
      }
      closeItemModal();
      fetchInventory();
      fetchInventoryCatalog();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save inventory item');
    }
  };

  const deleteItem = async item => {
    const confirmed = window.confirm(`Delete ${item.name}?`);
    if (!confirmed) return;

    try {
      await api.delete(`/inventory/${item._id}`);
      toast.success('Inventory item deleted');
      fetchInventory();
      fetchInventoryCatalog();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete inventory item');
    }
  };

  const addTransaction = async event => {
    event.preventDefault();

    try {
      await api.post('/inventory/transactions', {
        inventoryId: txnForm.inventoryId,
        quantity: Number(txnForm.quantity || 0),
        unitPrice: Number(txnForm.unitPrice || 0),
        vendorName: txnForm.vendorName,
        vendorPhone: txnForm.vendorPhone,
        invoiceNo: txnForm.invoiceNo,
        reference: txnForm.reference,
        remarks: txnForm.remarks,
      });
      toast.success('Transaction recorded');
      closeTxnModal();
      fetchInventory();
      fetchInventoryCatalog();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record transaction');
    }
  };

  const headerAction = tab === 'items' ? (
    <button onClick={openCreateModal} className="btn-primary">
      + Add Item
    </button>
  ) : (
    <button onClick={openTransactionModal} className="btn-primary" disabled={!inventoryCatalog.length}>
      + Add Transaction
    </button>
  );

  const exportConfig = useMemo(() => ({
    fileName: `inventory-${tab}`,
    title: tab === 'items' ? 'Inventory Items Export' : 'Inventory Transactions Export',
    subtitle: 'Campus inventory management export for stocks and vendor purchase records.',
    summary: [
      { label: 'Current Tab', value: tab === 'items' ? 'Items' : 'Transactions' },
      { label: 'Total Items', value: itemTotal },
      { label: 'Low Stock Alerts', value: lowStockItems.length },
      { label: 'Estimated Stock Value', value: formatCurrency(totalStockValue) },
      { label: 'Category Groups', value: stats.length },
      { label: 'Transaction Count', value: transactionTotal },
    ],
    sections: tab === 'items'
      ? [
          {
            title: 'Inventory Items',
            columns: [
              { header: 'Name', value: item => item.name || '-' },
              { header: 'Code', value: item => item.code || '-' },
              { header: 'Category', value: item => formatCategoryLabel(item.category) },
              { header: 'Current Stock', value: item => item.currentStock || 0, align: 'right' },
              { header: 'Minimum Alert', value: item => item.minStockAlert || 0, align: 'right' },
              { header: 'Unit', value: item => item.unit || '-' },
              { header: 'Buying Price', value: item => formatCurrency(item.purchasePrice), align: 'right' },
              { header: 'Selling Price', value: item => formatCurrency(item.sellingPrice), align: 'right' },
            ],
            rows: items,
          },
          {
            title: 'Category Snapshot',
            columns: [
              { header: 'Category', value: group => formatCategoryLabel(group._id || 'uncategorized') },
              { header: 'Items', value: group => group.count || 0, align: 'right' },
              { header: 'Total Value', value: group => formatCurrency(group.totalValue), align: 'right' },
            ],
            rows: stats,
          },
        ]
      : [
          {
            title: 'Inventory Transactions',
            columns: [
              { header: 'Item', value: txn => txn.inventory?.name || '-' },
              { header: 'Code', value: txn => txn.inventory?.code || '-' },
              { header: 'Category', value: txn => formatCategoryLabel(txn.inventory?.category) },
              { header: 'Vendor', value: txn => txn.vendorName || '-' },
              { header: 'Vendor Phone', value: txn => txn.vendorPhone || '-' },
              { header: 'Quantity', value: txn => `${txn.quantity || 0} ${txn.inventory?.unit || ''}`.trim(), align: 'right' },
              { header: 'Buying Price', value: txn => formatCurrency(txn.unitPrice), align: 'right' },
              { header: 'Total', value: txn => formatCurrency(txn.totalAmount), align: 'right' },
              { header: 'Invoice / Ref', value: txn => txn.invoiceNo || txn.reference || '-' },
              { header: 'Date', value: txn => new Date(txn.date).toLocaleString('en-IN') },
              { header: 'Remarks', value: txn => txn.remarks || '-' },
            ],
            rows: transactions,
          },
        ],
  }), [
    formatCategoryLabel,
    itemTotal,
    items,
    lowStockItems.length,
    stats,
    tab,
    totalStockValue,
    transactionTotal,
    transactions,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Manage academic, hostel, and general stocks with paginated inventory and transaction review."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportActions getExportConfig={() => exportConfig} disabled={loading || (tab === 'items' ? items.length === 0 : transactions.length === 0)} />
            {headerAction}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
        <div className="card">
          <p className="text-2xl font-bold text-gray-900">{itemTotal}</p>
          <p className="text-sm text-gray-500">Academic, hostel, and general stock items</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
          <p className="text-sm text-gray-500">Low stock alerts</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalStockValue)}</p>
          <p className="text-sm text-gray-500">Estimated stock value</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {['items', 'transactions'].map(value => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
              tab === value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <PageSpinner />
        ) : tab === 'items' ? (
          <div className="space-y-4 p-5">
            <ListControls
              searchValue={itemControls.search}
              onSearchChange={search => {
                setItemControls(current => ({ ...current, search }));
                setItemPage(1);
              }}
              searchPlaceholder="Search by item name, code, vendor, or location"
              sortValue={itemControls.sort}
              onSortChange={sort => {
                setItemControls(current => ({ ...current, sort }));
                setItemPage(1);
              }}
              sortOptions={itemSortOptions}
              pageSize={itemPageSize}
              onPageSizeChange={value => {
                setItemPageSize(value);
                setItemPage(1);
              }}
              resultCount={itemTotal}
              extraFilters={
                <div className="flex flex-wrap gap-3">
                  <SearchableSelect
                    className="w-44"
                    value={itemControls.category}
                    onChange={category => {
                      setItemControls(current => ({ ...current, category }));
                      setItemPage(1);
                    }}
                    placeholder="All Categories"
                    searchPlaceholder="Search categories..."
                    options={categoryFilterOptions}
                  />
                  <SearchableSelect
                    className="w-44"
                    value={itemControls.lowStock}
                    onChange={lowStock => {
                      setItemControls(current => ({ ...current, lowStock }));
                      setItemPage(1);
                    }}
                    placeholder="All Stock Levels"
                    searchPlaceholder="Search stock filters..."
                    options={lowStockFilterOptions}
                  />
                </div>
              }
            />

            <Table
              headers={['Name', 'Code', 'Category', 'Current Stock', 'Min Alert', 'Unit', 'Buying Price', 'Selling Price', 'Actions']}
              empty={items.length === 0 ? <EmptyState message="No inventory items found" icon={<FiPackage />} /> : null}
            >
              {items.map(item => {
                const isLow = Number(item.currentStock || 0) <= Number(item.minStockAlert || 0);
                return (
                  <tr key={item._id} className={isLow ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="table-cell">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.supplier || 'No default vendor'}</p>
                    </td>
                    <td className="table-cell font-mono text-xs text-gray-500">{item.code || '-'}</td>
                    <td className="table-cell capitalize text-gray-700">{formatCategoryLabel(item.category)}</td>
                    <td className="table-cell font-medium text-gray-900">{item.currentStock || 0}</td>
                    <td className="table-cell">
                      <span className={isLow ? 'font-semibold text-red-600' : 'text-gray-600'}>{item.minStockAlert || 0}</span>
                    </td>
                    <td className="table-cell text-gray-600">{item.unit || '-'}</td>
                    <td className="table-cell font-medium text-gray-900">{formatCurrency(item.purchasePrice)}</td>
                    <td className="table-cell font-medium text-green-700">{formatCurrency(item.sellingPrice)}</td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-500 bg-white text-primary-600 transition hover:bg-primary-600 hover:text-white"
                          aria-label={`Edit ${item.name}`}
                          title="Edit inventory item"
                        >
                          <FiEdit3 className="text-sm" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(item)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500 bg-white text-red-500 transition hover:bg-red-500 hover:text-white"
                          aria-label={`Delete ${item.name}`}
                          title="Delete inventory item"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </Table>

            <Pagination page={itemPage} pages={itemPages} onPage={setItemPage} />
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              This page records only stock purchased from outside vendors. These entries are managed by admin and super-admin users.
            </div>

            <ListControls
              searchValue={transactionControls.search}
              onSearchChange={search => {
                setTransactionControls(current => ({ ...current, search }));
                setTransactionPage(1);
              }}
              searchPlaceholder="Search by vendor, phone, invoice, reference, or remarks"
              sortValue={transactionControls.sort}
              onSortChange={sort => {
                setTransactionControls(current => ({ ...current, sort }));
                setTransactionPage(1);
              }}
              sortOptions={transactionSortOptions}
              pageSize={transactionPageSize}
              onPageSizeChange={value => {
                setTransactionPageSize(value);
                setTransactionPage(1);
              }}
              resultCount={transactionTotal}
              extraFilters={
                <div className="flex flex-wrap gap-3">
                  <SearchableSelect
                    className="w-44"
                    value={transactionControls.category}
                    onChange={category => {
                      setTransactionControls(current => ({ ...current, category }));
                      setTransactionPage(1);
                    }}
                    placeholder="All Categories"
                    searchPlaceholder="Search categories..."
                    options={categoryFilterOptions}
                  />
                  <SearchableSelect
                    className="w-52"
                    value={transactionControls.inventoryId}
                    onChange={inventoryId => {
                      setTransactionControls(current => ({ ...current, inventoryId }));
                      setTransactionPage(1);
                    }}
                    placeholder="All Items"
                    searchPlaceholder="Search items..."
                    options={inventoryOptions}
                  />
                  <input
                    type="date"
                    className="input w-40"
                    value={transactionControls.startDate}
                    onChange={event => {
                      setTransactionControls(current => ({ ...current, startDate: event.target.value }));
                      setTransactionPage(1);
                    }}
                  />
                  <input
                    type="date"
                    className="input w-40"
                    value={transactionControls.endDate}
                    onChange={event => {
                      setTransactionControls(current => ({ ...current, endDate: event.target.value }));
                      setTransactionPage(1);
                    }}
                  />
                </div>
              }
            />

            <Table
              headers={['Item', 'Category', 'Vendor', 'Quantity', 'Buying Price', 'Total', 'Invoice / Ref', 'Date', 'Remarks']}
              empty={transactions.length === 0 ? <EmptyState message="No purchase transactions found" icon={<FiClock />} /> : null}
            >
              {transactions.map(txn => (
                <tr key={txn._id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <p className="font-medium text-gray-900">{txn.inventory?.name || '-'}</p>
                    <p className="text-xs text-gray-400">{txn.inventory?.code || '-'}</p>
                  </td>
                  <td className="table-cell capitalize text-gray-700">{formatCategoryLabel(txn.inventory?.category)}</td>
                  <td className="table-cell">
                    <p className="font-medium text-gray-900">{txn.vendorName || '-'}</p>
                    <p className="text-xs text-gray-500">{txn.vendorPhone || '-'}</p>
                  </td>
                  <td className="table-cell">{txn.quantity} {txn.inventory?.unit || ''}</td>
                  <td className="table-cell">{formatCurrency(txn.unitPrice)}</td>
                  <td className="table-cell font-medium text-green-700">{formatCurrency(txn.totalAmount)}</td>
                  <td className="table-cell text-gray-500">{txn.invoiceNo || txn.reference || '-'}</td>
                  <td className="table-cell text-gray-500">{new Date(txn.date).toLocaleString('en-IN')}</td>
                  <td className="table-cell text-gray-500">{txn.remarks || '-'}</td>
                </tr>
              ))}
            </Table>

            <Pagination page={transactionPage} pages={transactionPages} onPage={setTransactionPage} />
          </div>
        )}
      </div>

      {stats.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map(group => (
            <div key={group._id || 'uncategorized'} className="card">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{formatCategoryLabel(group._id || 'uncategorized')}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{group.count || 0}</p>
              <p className="text-sm text-gray-500">items</p>
              <p className="mt-2 text-sm font-medium text-green-700">{formatCurrency(group.totalValue || 0)}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={showItemModal} onClose={closeItemModal} title={editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}>
        <form onSubmit={saveItem} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={itemForm.name} onChange={event => setItemForm(current => ({ ...current, name: event.target.value }))} required />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input type="number" min="0" className="input" value={itemForm.quantity} onChange={event => setItemForm(current => ({ ...current, quantity: event.target.value }))} placeholder="Quick stock entry" />
            </div>
            <div>
              <label className="label">Code</label>
              <input className="input" value={itemForm.code} onChange={event => setItemForm(current => ({ ...current, code: event.target.value }))} placeholder="Auto-generated if empty" />
            </div>
            <div>
              <label className="label">Category</label>
              <SearchableSelect
                value={itemForm.category}
                onChange={category => setItemForm(current => ({ ...current, category }))}
                placeholder="Select category"
                searchPlaceholder="Search categories..."
                options={categorySelectOptions}
              />
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="input" value={itemForm.unit} onChange={event => setItemForm(current => ({ ...current, unit: event.target.value }))} />
            </div>
            <div>
              <label className="label">Opening Stock</label>
              <input type="number" min="0" className="input" value={itemForm.openingStock} onChange={event => setItemForm(current => ({ ...current, openingStock: event.target.value }))} />
            </div>
            <div>
              <label className="label">Current Stock</label>
              <input type="number" min="0" className="input" value={itemForm.currentStock} onChange={event => setItemForm(current => ({ ...current, currentStock: event.target.value }))} />
            </div>
            <div>
              <label className="label">Minimum Alert</label>
              <input type="number" min="0" className="input" value={itemForm.minStockAlert} onChange={event => setItemForm(current => ({ ...current, minStockAlert: event.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeItemModal} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingItem ? 'Update Item' : 'Add Item'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={showTxnModal} onClose={closeTxnModal} title="Outside Vendor Purchase Entry">
        <form onSubmit={addTransaction} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">Item *</label>
              <SearchableSelect
                value={txnForm.inventoryId}
                onChange={inventoryId => setTxnForm(current => ({ ...current, inventoryId }))}
                placeholder="Select item"
                searchPlaceholder="Search items..."
                options={purchaseEntryOptions}
                required
              />
            </div>
            <div>
              <label className="label">Quantity *</label>
              <input type="number" min="1" className="input" value={txnForm.quantity} onChange={event => setTxnForm(current => ({ ...current, quantity: event.target.value }))} required />
            </div>
            <div>
              <label className="label">Buying Price *</label>
              <input type="number" min="0" className="input" value={txnForm.unitPrice} onChange={event => setTxnForm(current => ({ ...current, unitPrice: event.target.value }))} required />
            </div>
            <div>
              <label className="label">Vendor Name *</label>
              <input className="input" value={txnForm.vendorName} onChange={event => setTxnForm(current => ({ ...current, vendorName: event.target.value }))} required />
            </div>
            <div>
              <label className="label">Vendor Phone</label>
              <input className="input" value={txnForm.vendorPhone} onChange={event => setTxnForm(current => ({ ...current, vendorPhone: event.target.value }))} />
            </div>
            <div>
              <label className="label">Invoice No</label>
              <input className="input" value={txnForm.invoiceNo} onChange={event => setTxnForm(current => ({ ...current, invoiceNo: event.target.value }))} />
            </div>
            <div>
              <label className="label">Reference</label>
              <input className="input" value={txnForm.reference} onChange={event => setTxnForm(current => ({ ...current, reference: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Remarks</label>
              <textarea className="input min-h-[96px]" value={txnForm.remarks} onChange={event => setTxnForm(current => ({ ...current, remarks: event.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeTxnModal} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Purchase Entry</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
