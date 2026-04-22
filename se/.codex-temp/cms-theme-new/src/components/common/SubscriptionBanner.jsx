import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useAuth } from '../../context/AuthContext';
import { FiAlertTriangle, FiInfo } from './icons';
import { getPlanPath } from '../../utils/authRedirect';
import { getPlanDefinition, getSubscriptionStatusLabel } from '../../utils/subscriptionCatalog';

const getTrialDaysRemaining = trialEndDate => {
  if (!trialEndDate) return null;
  const today = new Date();
  const end = new Date(trialEndDate);
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(Math.ceil((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)), 0);
};

const formatUsageLabel = ({ label, used, limit }) => {
  if (limit === null || limit === undefined) {
    return `${label}: ${used} / Unlimited`;
  }
  return `${label}: ${used} / ${limit}`;
};

const clampPercentage = (used, limit) => {
  if (limit === null || limit === undefined || Number(limit) <= 0) return 0;
  return Math.min((Number(used || 0) / Number(limit)) * 100, 100);
};

export default function SubscriptionBanner() {
  const { user } = useAuth();
  const { subscription, institution, isReadOnly, usageFor, limitFor } = useAppSettings();
  const canViewPlan = user?.role === 'institution_owner';

  const usageItems = useMemo(() => (
    [
      { key: 'students', label: 'Students' },
      { key: 'staffAccounts', label: 'Staff' },
      { key: 'operatorAccounts', label: 'Operators' },
    ].map(item => ({
      ...item,
      used: usageFor(item.key),
      limit: limitFor(item.key),
    }))
      .filter(item => item.limit !== null && item.limit !== undefined)
  ), [limitFor, usageFor]);

  if (user?.role !== 'institution_owner') return null;
  if (!subscription && !institution) return null;

  const trialDaysRemaining = getTrialDaysRemaining(subscription?.trialEndDate);
  const planLabel = getPlanDefinition(subscription?.plan?.key || subscription?.planKey || 'starter').label;
  const statusLabel = getSubscriptionStatusLabel(subscription?.status || 'active');
  const institutionLabel = institution?.branding?.institutionName || institution?.name || 'Institution';
  const enterpriseLicenseStatus = subscription?.enterpriseLicense?.status || 'not_issued';

  return (
    <div className={`mx-3 mb-0 border px-4 py-3 sm:mx-4 md:mx-6 ${isReadOnly ? 'border-amber-300 bg-amber-50' : 'border-primary-100 bg-primary-50/60'}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${isReadOnly ? 'bg-amber-100 text-amber-800' : 'bg-white text-primary-700'}`}>
              {isReadOnly ? <FiAlertTriangle className="text-sm" /> : <FiInfo className="text-sm" />}
              {institutionLabel}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
              {planLabel} - {statusLabel}
            </span>
          </div>

          <p className="mt-2 text-sm font-medium text-text-primary">
            {isReadOnly
              ? 'The subscription is in read-only mode. Viewing is available, but new changes are blocked until billing is restored.'
              : subscription?.pendingPlanKey === 'enterprise' && enterpriseLicenseStatus === 'issued'
                ? 'Enterprise access has been issued by Ematix. Redeem the enterprise license key to activate the new plan.'
                : subscription?.pendingPlanKey === 'enterprise'
                  ? 'Enterprise access has been approved by Ematix. The institution stays on the current plan until the enterprise license is issued and redeemed.'
              : subscription?.status === 'trialing'
                ? `Trial active${trialDaysRemaining !== null ? ` with ${trialDaysRemaining} day(s) remaining.` : '.'}`
                : 'Your institution is operating under the current Ematix subscription plan.'}
          </p>

          {usageItems.length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {usageItems.map(item => (
                <div key={item.key} className="border border-white/80 bg-white/90 px-3 py-2">
                  <div className="flex items-center justify-between gap-3 text-xs font-medium text-text-secondary">
                    <span>{item.label}</span>
                    <span>{formatUsageLabel(item)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden bg-slate-100">
                    <div
                      className={`h-full ${clampPercentage(item.used, item.limit) >= 90 ? 'bg-amber-500' : 'bg-primary-700'}`}
                      style={{ width: `${clampPercentage(item.used, item.limit)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {canViewPlan ? (
          <div className="shrink-0">
            <Link to={getPlanPath(institution?.portalKey || user?.institutionPortalKey || user?.institutionSlug || '')} className="btn-secondary inline-flex items-center justify-center px-4 py-2 text-sm">
              View Plan
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
