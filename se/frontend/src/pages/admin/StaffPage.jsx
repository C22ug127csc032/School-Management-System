import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiEdit2, FiPlus, FiTrash2, FiUsers } from 'react-icons/fi';
import api from '../../api/axios.js';
import useListParams from '../../hooks/useListParams.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  DataTable,
  FilterSelect,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  StatusBadge,
} from '../../components/common/index.jsx';

const STAFF_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'principal', label: 'Principal' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'admission_staff', label: 'Admission Staff' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const ROLE_LABELS = STAFF_ROLE_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  staffId: '',
  role: 'accountant',
  department: '',
  password: '',
  isActive: true,
};

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const {
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilter,
    sortBy,
    sortOrder,
    setSort,
    params,
  } = useListParams({
    initialFilters: { role: '', status: '' },
    initialLimit: 20,
    initialSortBy: 'name',
    initialSortOrder: 'asc',
  });

  const load = useCallback(() => {
    setLoading(true);
    api.get('/staff', { params })
      .then(response => {
        setStaff(response.data.data || []);
        setTotal(response.data.total || 0);
        setPages(response.data.pages || 1);
      })
      .catch(error => {
        toast.error(error.response?.data?.message || 'Failed to load staff.');
      })
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = (item = null) => {
    if (item) {
      setForm({
        name: item.name || '',
        email: item.email || '',
        phone: item.phone || '',
        staffId: item.staffId || '',
        role: item.role || 'accountant',
        department: item.department || '',
        password: '',
        isActive: item.isActive ?? true,
      });
      setEditItem(item);
    } else {
      setForm(emptyForm);
      setEditItem(null);
    }

    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.staffId || !form.role) {
      toast.error('Name, phone, staff ID, and role are required.');
      return;
    }

    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/staff/${editItem._id}`, form);
        toast.success('Staff updated.');
      } else {
        await api.post('/staff', form);
        toast.success('Staff created.');
      }

      setModal(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save staff.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async id => {
    if (!window.confirm('Deactivate this staff account?')) return;

    try {
      await api.delete(`/staff/${id}`);
      toast.success('Staff deactivated.');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed.');
    }
  };

  const activeCount = useMemo(() => staff.filter(member => member.isActive).length, [staff]);
  const isSuperAdmin = user?.role === 'super_admin';
  const columns = [
    {
      key: 'staff',
      label: 'Staff',
      sortable: true,
      sortKey: 'name',
      render: member => (
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary-200 bg-primary-50 text-sm font-bold text-primary-700">
            {member.name?.charAt(0) || 'S'}
          </div>
          <div>
            <p className="font-semibold text-text-primary">{member.name}</p>
            <p className="text-xs text-text-secondary">{member.staffId || 'No Staff ID'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: member => (
        <div>
          <p className="text-sm text-text-primary">{member.phone}</p>
          <p className="text-xs text-text-secondary">{member.email || 'No email added'}</p>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      sortKey: 'role',
      render: member => <span className="badge-blue">{ROLE_LABELS[member.role] || member.role}</span>,
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      sortKey: 'department',
      render: member => member.department || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: member => <StatusBadge status={member.isActive ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      label: '',
      render: member => (
        <div className="flex items-center gap-1">
          <button onClick={() => openModal(member)} className="btn-icon btn-sm" title="Edit staff">
            <FiEdit2 />
          </button>
          <button onClick={() => handleDeactivate(member._id)} className="btn-icon btn-sm text-red-600" title="Deactivate staff">
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="float-in">
      <PageHeader
        title={isSuperAdmin ? 'Access & Staff' : 'Staff'}
        subtitle={isSuperAdmin ? 'Govern school-office access, role coverage, and login readiness from the super admin layer.' : 'Manage non-teaching staff accounts, roles, and login access.'}
        actions={<button onClick={() => openModal()} className="btn-primary"><FiPlus />Add Staff</button>}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <StatCard icon={FiUsers} label={isSuperAdmin ? 'Visible Access Roles' : 'Visible Staff'} value={total} sub="Matching the current filters" />
        <StatCard icon={FiUsers} label="Active On Page" value={activeCount} sub="Currently active accounts" />
        <StatCard icon={FiUsers} label="Roles Covered" value={STAFF_ROLE_OPTIONS.length} sub={isSuperAdmin ? 'Administrative roles under platform governance' : 'School office and admin roles'} />
      </div>

      <div className="campus-panel mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, phone, email, staff ID..."
          />
          <FilterSelect
            value={filters.role}
            onChange={value => setFilter('role', value)}
            options={STAFF_ROLE_OPTIONS}
            placeholder="All Roles"
          />
          <FilterSelect
            value={filters.status}
            onChange={value => setFilter('status', value)}
            options={STATUS_OPTIONS}
            placeholder="All Status"
          />
        </div>
      </div>

      <div className="campus-panel overflow-hidden">
        <DataTable
          columns={columns}
          data={staff}
          loading={loading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={setSort}
          emptyMessage="No staff records found."
        />
        <div className="border-t border-border px-4 py-3">
          <Pagination page={page} pages={pages} onPage={setPage} />
        </div>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editItem ? 'Edit Staff' : 'Add Staff'}
        size="lg"
        footer={(
          <>
            <button onClick={() => setModal(false)} className="btn-secondary btn-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
              {saving ? 'Saving...' : editItem ? 'Update' : 'Create'}
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="form-group">
              <label className="label">Full Name *</label>
              <input className="input" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Staff ID *</label>
              <input className="input" value={form.staffId} onChange={event => setForm(current => ({ ...current, staffId: event.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Phone *</label>
              <input className="input" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Role *</label>
              <select className="input" value={form.role} onChange={event => setForm(current => ({ ...current, role: event.target.value }))}>
                {STAFF_ROLE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Department</label>
              <input className="input" value={form.department} onChange={event => setForm(current => ({ ...current, department: event.target.value }))} />
            </div>
          </div>

          <div className="rounded border border-border bg-slate-50 p-3">
            <div className="form-group mb-0">
              <label className="label">{editItem ? 'Reset Password' : 'Password'}</label>
              <input
                className="input"
                type="password"
                placeholder={editItem ? 'Leave blank to keep the current password' : 'Leave blank to use Staff ID'}
                value={form.password}
                onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
              />
              <p className="mt-1 text-xs text-text-secondary">
                {editItem
                  ? 'Enter a new password only if this staff member needs a reset.'
                  : 'If left blank, the initial login password will be the Staff ID.'}
              </p>
            </div>
          </div>

          {editItem && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))}
                className="accent-primary-700"
              />
              Keep this staff account active
            </label>
          )}
        </div>
      </Modal>
    </div>
  );
}
