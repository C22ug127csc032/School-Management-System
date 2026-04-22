import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const SummaryCard = ({ label, value, hint }) => (
  <div className="border border-border bg-white p-5 shadow-sm">
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">{label}</p>
    <p className="mt-3 text-3xl font-semibold text-text-primary">{value}</p>
    {hint ? <p className="mt-2 text-xs text-text-secondary">{hint}</p> : null}
  </div>
);

const INITIAL_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
};

export default function PlatformOverview() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const response = await api.get('/platform/overview');
      setOverview(response.data?.overview || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const planBreakdown = useMemo(() => (
    overview?.planBreakdown
      ? Object.entries(overview.planBreakdown)
      : []
  ), [overview]);

  const handleChange = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const handleCreateMasterAdmin = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/platform/master-admins', form);
      toast.success('Master admin created successfully.');
      setForm(INITIAL_FORM);
      await loadOverview();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create master admin');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="border border-border bg-white p-6 text-sm text-text-secondary">Loading platform overview...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Institutions" value={overview?.institutions ?? 0} hint="All registered colleges on Ematix." />
        <SummaryCard label="Live Accounts" value={overview?.activeSubscriptions ?? 0} hint="Trialing, active, and overdue tenants." />
        <SummaryCard label="Pending Trials" value={overview?.pendingTrials ?? 0} hint="Signups awaiting verification or activation." />
        <SummaryCard label="Read-Only" value={overview?.readOnlyInstitutions ?? 0} hint="Institutions currently blocked from writes." />
        <SummaryCard label="Enterprise Expiring" value={overview?.expiringEnterpriseLicenses ?? 0} hint="Enterprise licenses ending within 30 days." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <section className="border border-border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">Plan Distribution</p>
                <p className="mt-1 text-xs text-text-secondary">Current subscription mix across all institutions.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {planBreakdown.map(([planKey, value]) => (
                <div key={planKey} className="border border-border bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">{planKey}</p>
                  <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-text-primary">Recent Institutions</p>
            <p className="mt-1 text-xs text-text-secondary">Latest colleges added to the platform.</p>
            <div className="mt-4 overflow-hidden border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-text-secondary">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Institution</th>
                    <th className="px-4 py-3 font-semibold">Portal URL Key</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.recentInstitutions || []).map(item => (
                    <tr key={item._id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium text-text-primary">{item.name}</td>
                      <td className="px-4 py-3 text-text-secondary">{item.portalKey || item.slug}</td>
                      <td className="px-4 py-3 capitalize text-text-primary">{String(item.status || '-').replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-text-secondary">{new Date(item.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                  {!overview?.recentInstitutions?.length ? (
                    <tr>
                      <td className="px-4 py-4 text-text-secondary" colSpan={4}>No institutions added yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="border border-border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-text-primary">Create Ematix Master Admin</p>
            <p className="mt-1 text-xs text-text-secondary">Add platform operators who can manage plans, licensing, and tenant access.</p>
            <form onSubmit={handleCreateMasterAdmin} className="mt-4 space-y-4">
              <div>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={event => handleChange('name', event.target.value)} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" value={form.email} onChange={event => handleChange('email', event.target.value)} required />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={form.phone} onChange={event => handleChange('phone', event.target.value)} required />
                </div>
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" value={form.password} onChange={event => handleChange('password', event.target.value)} required />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full px-5 py-3 disabled:opacity-60">
                {saving ? 'Creating...' : 'Create Master Admin'}
              </button>
            </form>
          </section>

          <section className="border border-border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-text-primary">Current Master Admins</p>
            <p className="mt-1 text-xs text-text-secondary">These accounts can access the full Ematix control plane.</p>
            <div className="mt-4 space-y-3">
              {(overview?.masterAdminAccounts || []).map(item => (
                <div key={item._id} className="border border-border bg-slate-50 px-4 py-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-text-primary">{item.name}</p>
                      <p className="text-sm text-text-secondary">{item.email}</p>
                    </div>
                    <div className="text-sm text-text-secondary">
                      <p>{item.phone}</p>
                      <p className="text-xs uppercase tracking-[0.12em]">{item.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!overview?.masterAdminAccounts?.length ? (
                <p className="text-sm text-text-secondary">No master admin accounts found.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
