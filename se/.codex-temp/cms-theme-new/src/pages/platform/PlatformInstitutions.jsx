import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { Modal, PageHeader } from '../../components/common';
import { FiCheck, FiCopy } from '../../components/common/icons';
import {
  FEATURE_OPTIONS,
  getEnterpriseLicenseStatusLabel,
  getPlanDefinition,
  getSubscriptionStatusLabel,
} from '../../utils/subscriptionCatalog';

const PLAN_OPTIONS = ['starter', 'basic', 'standard', 'premium', 'enterprise'];
const STATUS_OPTIONS = ['trialing', 'active', 'overdue', 'suspended', 'cancelled'];
const LEGACY_BRANDING_THEME = {
  primary: '#122539',
  secondary: '#1A3550',
  tertiary: '#D91F26',
};
const DEFAULT_BRANDING_THEME = {
  primary: '#2D56C5',
  secondary: '#233C78',
  tertiary: '#7B96F9',
};

const toDateInput = value => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const resolveThemeColor = (value, legacyDefault, nextDefault) => {
  const text = String(value || '').trim();
  const normalizedValue = /^#([0-9a-f]{6})$/i.test(text) ? text.toUpperCase() : nextDefault;
  return normalizedValue === legacyDefault ? nextDefault : (normalizedValue || nextDefault);
};

const buildFormState = detail => ({
  planKey: detail?.subscription?.pendingPlanKey || detail?.subscription?.planKey || 'starter',
  status: detail?.subscription?.status || detail?.institution?.status || 'trialing',
  portalKey: detail?.institution?.portalKey || detail?.institution?.slug || '',
  readOnlyMode: Boolean(detail?.subscription?.readOnlyMode),
  extendTrialDays: '',
  studentAddon: detail?.subscription?.manualSeatAddons?.students ?? '',
  staffAddon: detail?.subscription?.manualSeatAddons?.staffAccounts ?? '',
  operatorAddon: detail?.subscription?.manualSeatAddons?.operatorAccounts ?? '',
  notes: detail?.subscription?.notes || '',
  institutionName: detail?.institution?.branding?.institutionName || detail?.institution?.name || '',
  portalTitle: detail?.institution?.branding?.portalTitle || detail?.institution?.branding?.institutionName || detail?.institution?.name || '',
  iconUrl: detail?.institution?.branding?.iconUrl || '',
  logoUrl: detail?.institution?.branding?.logoUrl || '',
  primaryColor: resolveThemeColor(detail?.institution?.branding?.primaryColor, LEGACY_BRANDING_THEME.primary, DEFAULT_BRANDING_THEME.primary),
  secondaryColor: resolveThemeColor(detail?.institution?.branding?.secondaryColor, LEGACY_BRANDING_THEME.secondary, DEFAULT_BRANDING_THEME.secondary),
  tertiaryColor: resolveThemeColor(detail?.institution?.branding?.tertiaryColor, LEGACY_BRANDING_THEME.tertiary, DEFAULT_BRANDING_THEME.tertiary),
  enabledFeatures: detail?.subscription?.featureOverrides?.enabled || [],
  disabledFeatures: detail?.subscription?.featureOverrides?.disabled || [],
  licenseValidFrom: toDateInput(detail?.subscription?.enterpriseLicense?.validFrom) || toDateInput(new Date()),
  licenseValidUntil: toDateInput(detail?.subscription?.enterpriseLicense?.validUntil),
});

const SummaryTile = ({ label, value, helper }) => (
  <div className="border border-border bg-slate-50 px-4 py-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-secondary">{label}</p>
    <p className="mt-2 text-lg font-semibold text-text-primary">{value}</p>
    {helper ? <p className="mt-1 text-xs text-text-secondary">{helper}</p> : null}
  </div>
);

export default function PlatformInstitutions() {
  const [search, setSearch] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [form, setForm] = useState(buildFormState(null));
  const [modalOpen, setModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issuingLicense, setIssuingLicense] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [assetFiles, setAssetFiles] = useState({ icon: null, logo: null });
  const [portalKeyStatus, setPortalKeyStatus] = useState({
    loading: false,
    available: true,
    checked: false,
    message: '',
  });

  const fetchInstitutions = async currentSearch => {
    setLoading(true);
    try {
      const response = await api.get('/platform/institutions', {
        params: {
          ...(currentSearch ? { search: currentSearch } : {}),
          _ts: Date.now(),
        },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
      setInstitutions(response.data?.institutions || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstitutionDetail = async institutionId => {
    setDetailLoading(true);
    try {
      const response = await api.get(`/platform/institutions/${institutionId}`, {
        params: { _ts: Date.now() },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
      const detail = {
        institution: response.data?.institution || null,
        subscription: response.data?.subscription || null,
        usage: response.data?.usage || null,
        owner: response.data?.owner || null,
        auditLogs: response.data?.auditLogs || [],
      };
      setSelectedDetail(detail);
      setForm(buildFormState(detail));
      return detail;
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions('');
  }, []);

  const rows = useMemo(() => institutions, [institutions]);

  const openManageModal = async item => {
    const institutionId = item?.institution?._id;
    if (!institutionId) return;

    setSelectedInstitutionId(institutionId);
    setSelectedDetail(null);
    setForm(buildFormState(null));
    setAssetFiles({ icon: null, logo: null });
    setModalOpen(true);
    await fetchInstitutionDetail(institutionId);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedInstitutionId('');
    setSelectedDetail(null);
    setForm(buildFormState(null));
    setAssetFiles({ icon: null, logo: null });
  };

  const handleFormChange = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const handleCopy = async (key, value) => {
    const text = String(value || '').trim();
    if (!text) {
      toast.error('Nothing is available to copy yet.');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(key);
      window.setTimeout(() => {
        setCopiedField(current => (current === key ? '' : current));
      }, 1600);
    } catch {
      toast.error('Unable to copy right now. Please try again.');
    }
  };

  useEffect(() => {
    if (!modalOpen || !selectedInstitutionId) {
      setPortalKeyStatus({
        loading: false,
        available: true,
        checked: false,
        message: '',
      });
      return undefined;
    }

    const nextPortalKey = String(form.portalKey || '').trim().toLowerCase();
    const currentPortalKey = String(selectedDetail?.institution?.portalKey || selectedDetail?.institution?.slug || '').trim().toLowerCase();

    if (!nextPortalKey) {
      setPortalKeyStatus({
        loading: false,
        available: false,
        checked: false,
        message: 'Institution URL key is required.',
      });
      return undefined;
    }

    if (nextPortalKey === currentPortalKey) {
      setPortalKeyStatus({
        loading: false,
        available: true,
        checked: true,
        message: 'Current institution URL key.',
      });
      return undefined;
    }

    const timerId = window.setTimeout(async () => {
      setPortalKeyStatus(current => ({ ...current, loading: true, checked: false, message: 'Checking availability...' }));
      try {
        const response = await api.get('/platform/institutions/check-portal-key', {
          params: {
            portalKey: nextPortalKey,
            excludeInstitutionId: selectedInstitutionId,
          },
        });
        setPortalKeyStatus({
          loading: false,
          available: Boolean(response.data?.available),
          checked: true,
          message: response.data?.message || '',
        });
      } catch (error) {
        setPortalKeyStatus({
          loading: false,
          available: false,
          checked: true,
          message: error?.response?.data?.message || 'Unable to validate the institution URL key right now.',
        });
      }
    }, 250);

    return () => window.clearTimeout(timerId);
  }, [form.portalKey, modalOpen, selectedDetail?.institution?.portalKey, selectedDetail?.institution?.slug, selectedInstitutionId]);

  const toggleFeatureSelection = (key, featureKey) => {
    setForm(current => {
      const currentValues = Array.isArray(current[key]) ? current[key] : [];
      const nextValues = currentValues.includes(featureKey)
        ? currentValues.filter(value => value !== featureKey)
        : [...currentValues, featureKey];
      const oppositeKey = key === 'enabledFeatures' ? 'disabledFeatures' : 'enabledFeatures';
      const oppositeValues = Array.isArray(current[oppositeKey]) ? current[oppositeKey] : [];

      return {
        ...current,
        [key]: nextValues,
        [oppositeKey]: oppositeValues.filter(value => value !== featureKey),
      };
    });
  };

  const handleSave = async () => {
    if (!selectedInstitutionId) return;
    if (!String(form.portalKey || '').trim()) {
      toast.error('Institution URL key is required.');
      return;
    }
    if (portalKeyStatus.loading) {
      toast.error('Wait for the institution URL key availability check to complete.');
      return;
    }
    if (!portalKeyStatus.available) {
      toast.error(portalKeyStatus.message || 'Choose an available institution URL key before saving.');
      return;
    }

    setSaving(true);
    try {
      const portalResponse = await api.put(`/platform/institutions/${selectedInstitutionId}/portal-key`, {
        portalKey: String(form.portalKey || '').trim().toLowerCase(),
      });

      const subscriptionResponse = await api.put(`/platform/institutions/${selectedInstitutionId}/subscription`, {
        planKey: form.planKey,
        status: form.status,
        readOnlyMode: form.readOnlyMode,
        extendTrialDays: form.extendTrialDays ? Number(form.extendTrialDays) : 0,
        manualSeatAddons: {
          students: form.studentAddon === '' ? undefined : Number(form.studentAddon),
          staffAccounts: form.staffAddon === '' ? undefined : Number(form.staffAddon),
          operatorAccounts: form.operatorAddon === '' ? undefined : Number(form.operatorAddon),
        },
        featureOverrides: {
          enabled: form.enabledFeatures,
          disabled: form.disabledFeatures,
        },
        notes: form.notes,
      });

      const brandingResponse = await api.put(`/platform/institutions/${selectedInstitutionId}/branding`, {
        branding: {
          institutionName: form.institutionName,
          portalTitle: form.portalTitle,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          tertiaryColor: form.tertiaryColor,
        },
      });

      let assetsResponse = null;
      if (assetFiles.icon || assetFiles.logo) {
        const formData = new FormData();
        if (assetFiles.icon) {
          formData.append('icon', assetFiles.icon);
        }
        if (assetFiles.logo) {
          formData.append('logo', assetFiles.logo);
        }
        assetsResponse = await api.post(`/platform/institutions/${selectedInstitutionId}/branding-assets`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      const refreshedDetail = await fetchInstitutionDetail(selectedInstitutionId);
      const latestInstitution =
        refreshedDetail?.institution
        || assetsResponse?.data?.institution
        || brandingResponse?.data?.institution
        || subscriptionResponse?.data?.institution
        || portalResponse?.data?.institution
        || null;

      if (latestInstitution) {
        setSelectedDetail(current => ({
          institution: latestInstitution,
          subscription: refreshedDetail?.subscription || subscriptionResponse?.data?.subscription || current?.subscription || null,
          usage: refreshedDetail?.usage || current?.usage || null,
          owner: refreshedDetail?.owner || current?.owner || null,
          auditLogs: refreshedDetail?.auditLogs || current?.auditLogs || [],
        }));
      }

      setAssetFiles({ icon: null, logo: null });
      window.dispatchEvent(new Event('app-settings-updated'));
      toast.success('Institution settings updated.');
      await fetchInstitutions(search.trim());
      closeModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to update institution');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateLicense = async () => {
    if (!selectedInstitutionId) return;
    if (!form.licenseValidFrom || !form.licenseValidUntil) {
      toast.error('Select both start and expiry dates for the enterprise license.');
      return;
    }

    setIssuingLicense(true);
    try {
      await api.post(`/platform/institutions/${selectedInstitutionId}/enterprise-license`, {
        planKey: form.planKey,
        validFrom: form.licenseValidFrom,
        validUntil: form.licenseValidUntil,
      });
      toast.success('Enterprise license generated successfully.');
      await fetchInstitutions(search.trim());
      await fetchInstitutionDetail(selectedInstitutionId);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to generate enterprise license');
    } finally {
      setIssuingLicense(false);
    }
  };

  const basePlanFeatures = useMemo(
    () => getPlanDefinition(form.planKey).features || [],
    [form.planKey]
  );
  const enterprisePlanSelected = form.planKey === 'enterprise';
  const showTrialExtension = form.status === 'trialing';
  const portalPreviewUrl = form.portalKey
    ? `${window.location.origin}/${String(form.portalKey).trim().toLowerCase()}/admin/login`
    : '';

  return (
    <div className="space-y-4">
      <PageHeader
        title="Institutions"
        subtitle="Search, review, and control subscription, enterprise licensing, branding, and access from the Ematix control plane."
      />

      <div className="flex flex-col gap-3 border border-border bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="flex-1">
          <p className="text-sm font-semibold text-text-primary">Tenant Directory</p>
          <p className="mt-1 text-xs text-text-secondary">Search by institution, portal URL key, internal slug, email, or phone and open the full subscription control view.</p>
        </div>
        <div className="flex gap-2">
          <input
            className="input min-w-[220px]"
            placeholder="Search by name, portal key, slug, email, phone"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
          <button type="button" onClick={() => fetchInstitutions(search.trim())} className="btn-primary px-5 py-3">
            Search
          </button>
        </div>
      </div>

      <div className="overflow-hidden border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-semibold">Institution</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Enterprise License</th>
                <th className="px-4 py-3 font-semibold">Usage</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-text-secondary" colSpan={6}>Loading institutions...</td>
                </tr>
              ) : rows.length ? rows.map(item => (
                <tr key={item.institution?._id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-text-primary">{item.institution?.name}</p>
                    <p className="text-xs text-text-secondary">URL key: {item.institution?.portalKey || item.institution?.slug}</p>
                    <p className="text-xs text-slate-400">Slug: {item.institution?.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{getPlanDefinition(item.subscription?.planKey || 'starter').label}</p>
                    <p className="text-xs text-text-secondary">
                      {item.subscription?.pendingPlanKey
                        ? `Pending: ${getPlanDefinition(item.subscription.pendingPlanKey).label}`
                        : 'No pending plan'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-text-primary">{getSubscriptionStatusLabel(item.subscription?.status || item.institution?.status || '-')}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">
                      {item.subscription?.enterpriseLicense?.status
                        ? getEnterpriseLicenseStatusLabel(item.subscription.enterpriseLicense.status)
                        : 'Not Issued'}
                    </p>
                    <p className="text-xs text-text-secondary">{item.subscription?.enterpriseLicense?.validUntil ? `Valid until ${new Date(item.subscription.enterpriseLicense.validUntil).toLocaleDateString('en-IN')}` : 'No license issued'}</p>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    Students {item.usage?.students ?? 0} | Staff {item.usage?.staffAccounts ?? 0} | Operators {item.usage?.operatorAccounts ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => openManageModal(item)} className="btn-secondary px-4 py-2 text-xs">
                      Manage
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-4 text-text-secondary" colSpan={6}>No institutions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={selectedDetail?.institution?.name ? `${selectedDetail.institution.name} Control` : 'Institution Control'}
        size="xl"
      >
        {detailLoading ? (
          <div className="py-12 text-center text-sm text-text-secondary">Loading institution details...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryTile label="Owner" value={selectedDetail?.owner?.name || 'Not assigned'} helper={selectedDetail?.owner?.email || selectedDetail?.owner?.phone || '-'} />
              <SummaryTile label="Students" value={selectedDetail?.usage?.students ?? 0} helper="Current active student count" />
              <SummaryTile label="Staff" value={selectedDetail?.usage?.staffAccounts ?? 0} helper="Current admin and staff accounts" />
              <SummaryTile label="Operators" value={selectedDetail?.usage?.operatorAccounts ?? 0} helper="Current shop and canteen operators" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5">
                <section className="border border-border bg-white p-4">
                  <p className="text-sm font-semibold text-text-primary">Portal URL</p>
                  <div className="mt-4">
                    <label className="label">Institution URL Key</label>
                    <input
                      className="input"
                      value={form.portalKey}
                      onChange={event => handleFormChange('portalKey', event.target.value.toLowerCase())}
                      placeholder="example-college"
                    />
                    <p className={`mt-2 text-xs ${
                      !portalKeyStatus.checked && portalKeyStatus.loading
                        ? 'text-primary-700'
                        : portalKeyStatus.available
                          ? 'text-emerald-700'
                          : 'text-red-700'
                    }`}
                    >
                      {portalKeyStatus.message || 'Use a clean institution URL key for direct portal access.'}
                    </p>
                    {portalPreviewUrl ? (
                      <div className="mt-3 border border-border bg-slate-50 px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-secondary">Portal Login Preview</p>
                          <button type="button" onClick={() => handleCopy('portal-url', portalPreviewUrl)} className="btn-secondary px-3 py-1.5 text-xs normal-case tracking-normal">
                            {copiedField === 'portal-url' ? (
                              <span className="inline-flex items-center gap-1"><FiCheck className="text-sm" /> Copied</span>
                            ) : (
                              <span className="inline-flex items-center gap-1"><FiCopy className="text-sm" /> Copy</span>
                            )}
                          </button>
                        </div>
                        <p className="mt-2 break-all text-sm text-text-primary">{portalPreviewUrl}</p>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="border border-border bg-white p-4">
                  <p className="text-sm font-semibold text-text-primary">Subscription Control</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Plan</label>
                      <select className="input" value={form.planKey} onChange={event => handleFormChange('planKey', event.target.value)}>
                        {PLAN_OPTIONS.map(option => (
                          <option key={option} value={option}>{getPlanDefinition(option).label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select className="input" value={form.status} onChange={event => handleFormChange('status', event.target.value)}>
                        {STATUS_OPTIONS.map(option => (
                          <option key={option} value={option}>{getSubscriptionStatusLabel(option)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3 border border-border bg-slate-50 px-4 py-3">
                    <input
                      id="readOnlyMode"
                      type="checkbox"
                      checked={form.readOnlyMode}
                      onChange={event => handleFormChange('readOnlyMode', event.target.checked)}
                    />
                    <label htmlFor="readOnlyMode" className="text-sm font-medium text-text-primary">Force read-only mode</label>
                  </div>
                  {showTrialExtension ? (
                    <div className="mt-4">
                      <label className="label">Extend Trial By Days</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={form.extendTrialDays}
                        onChange={event => handleFormChange('extendTrialDays', event.target.value)}
                        placeholder="Example: 7"
                      />
                    </div>
                  ) : null}
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="label">Student Add-on</label>
                      <input className="input" type="number" min="0" value={form.studentAddon} onChange={event => handleFormChange('studentAddon', event.target.value)} />
                    </div>
                    <div>
                      <label className="label">Staff Add-on</label>
                      <input className="input" type="number" min="0" value={form.staffAddon} onChange={event => handleFormChange('staffAddon', event.target.value)} />
                    </div>
                    <div>
                      <label className="label">Operator Add-on</label>
                      <input className="input" type="number" min="0" value={form.operatorAddon} onChange={event => handleFormChange('operatorAddon', event.target.value)} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="label">Notes</label>
                    <textarea
                      className="input min-h-[100px]"
                      value={form.notes}
                      onChange={event => handleFormChange('notes', event.target.value)}
                      placeholder="Billing remarks, enterprise follow-up, support notes..."
                    />
                  </div>
                </section>

                <section className="border border-border bg-white p-4">
                  <p className="text-sm font-semibold text-text-primary">Enterprise License</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {enterprisePlanSelected
                      ? 'Issue a manual enterprise license key for this institution. The institution must redeem it from their plan page.'
                      : 'Select Enterprise in the plan dropdown to enable enterprise license generation.'}
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Valid From</label>
                      <input className="input" type="date" disabled={!enterprisePlanSelected} value={form.licenseValidFrom} onChange={event => handleFormChange('licenseValidFrom', event.target.value)} />
                    </div>
                    <div>
                      <label className="label">Valid Until</label>
                      <input className="input" type="date" disabled={!enterprisePlanSelected} value={form.licenseValidUntil} onChange={event => handleFormChange('licenseValidUntil', event.target.value)} />
                    </div>
                  </div>
                  <button type="button" onClick={handleGenerateLicense} disabled={issuingLicense || !enterprisePlanSelected} className="btn-primary mt-4 px-5 py-3 disabled:opacity-60">
                    {issuingLicense ? 'Generating...' : 'Generate Enterprise License'}
                  </button>
                  <div className="mt-4 border border-border bg-slate-50 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-secondary">Current License</p>
                      {selectedDetail?.subscription?.enterpriseLicense?.code ? (
                        <button type="button" onClick={() => handleCopy('enterprise-license', selectedDetail.subscription.enterpriseLicense.code)} className="btn-secondary px-3 py-1.5 text-xs normal-case tracking-normal">
                          {copiedField === 'enterprise-license' ? (
                            <span className="inline-flex items-center gap-1"><FiCheck className="text-sm" /> Copied</span>
                          ) : (
                            <span className="inline-flex items-center gap-1"><FiCopy className="text-sm" /> Copy</span>
                          )}
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-2 text-lg font-semibold text-text-primary">{selectedDetail?.subscription?.enterpriseLicense?.code || 'Not issued yet'}</p>
                    <p className="mt-1 text-sm text-text-secondary">
                      Status: {selectedDetail?.subscription?.enterpriseLicense?.status
                        ? getEnterpriseLicenseStatusLabel(selectedDetail.subscription.enterpriseLicense.status)
                        : 'Not Issued'}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {selectedDetail?.subscription?.enterpriseLicense?.validUntil
                        ? `Valid until ${new Date(selectedDetail.subscription.enterpriseLicense.validUntil).toLocaleDateString('en-IN')}`
                        : 'No enterprise license validity assigned yet.'}
                    </p>
                  </div>
                </section>
              </div>

              <div className="space-y-5">
                <section className="border border-border bg-white p-4">
                  <p className="text-sm font-semibold text-text-primary">Branding</p>
                  <div className="mt-4">
                    <label className="label">Branding Name</label>
                    <input className="input" value={form.institutionName} onChange={event => handleFormChange('institutionName', event.target.value)} placeholder="Institution branding name" />
                    <p className="mt-2 text-xs text-text-secondary">This name is used as the institution-facing brand label across the tenant portal chrome and branded outputs.</p>
                  </div>
                  <div className="mt-4">
                    <label className="label">Portal Title</label>
                    <input className="input" value={form.portalTitle} onChange={event => handleFormChange('portalTitle', event.target.value)} placeholder="Institution portal title" />
                    <p className="mt-2 text-xs text-text-secondary">This title controls the browser tab title and branded portal title text, for example: KIOT Portal.</p>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Institution Icon</label>
                      <input
                        className="input"
                        type="file"
                        accept="image/*"
                        onChange={event => setAssetFiles(current => ({ ...current, icon: event.target.files?.[0] || null }))}
                      />
                      {form.iconUrl ? (
                        <div className="mt-3 flex items-center gap-3 border border-border bg-slate-50 px-3 py-3">
                          <img src={form.iconUrl} alt="Institution icon" className="h-12 w-12 object-contain" />
                          <p className="text-xs text-text-secondary">Current icon shown on paid tenant sidebars, login pages, and browser tab branding.</p>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-text-secondary">If no icon is uploaded after trial, the tenant falls back to the institution first letter.</p>
                      )}
                    </div>
                    <div>
                      <label className="label">Institution Logo</label>
                      <input
                        className="input"
                        type="file"
                        accept="image/*"
                        onChange={event => setAssetFiles(current => ({ ...current, logo: event.target.files?.[0] || null }))}
                      />
                      {form.logoUrl ? (
                        <div className="mt-3 flex items-center gap-3 border border-border bg-slate-50 px-3 py-3">
                          <img src={form.logoUrl} alt="Institution logo" className="h-12 max-w-[140px] object-contain" />
                          <p className="text-xs text-text-secondary">Current logo used on paid tenant auth surfaces where institution branding is displayed.</p>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-text-secondary">Upload an institution logo to replace Ematix trial branding once the tenant moves to a paid plan.</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="label">Primary Color</label>
                      <input className="input" type="color" value={form.primaryColor} onChange={event => handleFormChange('primaryColor', event.target.value)} />
                      <p className="mt-2 text-xs text-text-secondary">Primary color drives major actions, highlights, badges, and top border accents inside the institution portal.</p>
                    </div>
                    <div>
                      <label className="label">Secondary Color</label>
                      <input className="input" type="color" value={form.secondaryColor} onChange={event => handleFormChange('secondaryColor', event.target.value)} />
                      <p className="mt-2 text-xs text-text-secondary">Secondary color supports the portal shell depth, sidebar tone, and darker secondary visual areas.</p>
                    </div>
                    <div>
                      <label className="label">Tertiary Color</label>
                      <input className="input" type="color" value={form.tertiaryColor} onChange={event => handleFormChange('tertiaryColor', event.target.value)} />
                      <p className="mt-2 text-xs text-text-secondary">Tertiary color adds the lighter accent used for selected markers, supportive badges, sidebar active highlights, and subscription callouts across the tenant portal.</p>
                    </div>
                  </div>
                </section>

                <section className="border border-border bg-white p-4">
                  <p className="text-sm font-semibold text-text-primary">Base Plan Features</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {basePlanFeatures.map(featureKey => (
                      <span key={featureKey} className="border border-border bg-slate-50 px-3 py-2 text-xs font-medium text-text-primary">
                        {FEATURE_OPTIONS.find(option => option.key === featureKey)?.label || featureKey}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="border border-border bg-white p-4">
                  <p className="text-sm font-semibold text-text-primary">Manual Feature Overrides</p>
                  <p className="mt-1 text-xs text-text-secondary">Turn specific modules on or off without editing raw keys.</p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">Force Enable</p>
                      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                        {FEATURE_OPTIONS.map(feature => (
                          <label key={`enabled-${feature.key}`} className="flex items-start gap-3 border border-border bg-slate-50 px-3 py-3">
                            <input type="checkbox" checked={form.enabledFeatures.includes(feature.key)} onChange={() => toggleFeatureSelection('enabledFeatures', feature.key)} />
                            <span>
                              <span className="block text-sm font-medium text-text-primary">{feature.label}</span>
                              <span className="block text-xs text-text-secondary">{feature.description}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-red-700">Force Disable</p>
                      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                        {FEATURE_OPTIONS.map(feature => (
                          <label key={`disabled-${feature.key}`} className="flex items-start gap-3 border border-border bg-slate-50 px-3 py-3">
                            <input type="checkbox" checked={form.disabledFeatures.includes(feature.key)} onChange={() => toggleFeatureSelection('disabledFeatures', feature.key)} />
                            <span>
                              <span className="block text-sm font-medium text-text-primary">{feature.label}</span>
                              <span className="block text-xs text-text-secondary">{feature.description}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
              <button type="button" onClick={closeModal} className="btn-secondary px-5 py-3">
                Close
              </button>
              <button type="button" onClick={handleSave} disabled={saving || portalKeyStatus.loading} className="btn-primary px-5 py-3 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
