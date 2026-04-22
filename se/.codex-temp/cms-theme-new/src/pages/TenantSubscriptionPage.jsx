import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { PageHeader, PageSpinner } from '../components/common';
import { useAppSettings } from '../context/AppSettingsContext';
import { useAuth } from '../context/AuthContext';
import { EMATIX_WORDMARK } from '../utils/branding';
import { getHomePathForRole } from '../utils/authRedirect';
import {
  FEATURE_LABEL_MAP,
  PLAN_CATALOG,
  canUpgradeToPlan,
  getBillingStatusLabel,
  getEnterpriseLicenseStatusLabel,
  getPlanDefinition,
  getSubscriptionStatusLabel,
} from '../utils/subscriptionCatalog';
import { loadRazorpay } from '../utils/loadRazorpay';

const formatLimit = value => (value === null || value === undefined ? 'Unlimited' : value.toLocaleString('en-IN'));

export default function TenantSubscriptionPage({ mode = 'plan' }) {
  const { user } = useAuth();
  const {
    institution,
    subscription,
    isReadOnly,
    usageFor,
    limitFor,
    refreshSettings,
  } = useAppSettings();
  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [redeemingLicense, setRedeemingLicense] = useState(false);

  const canManagePlan = user?.role === 'institution_owner';
  const activePlanKey = subscription?.plan?.key || subscription?.planKey || 'starter';
  const currentPlan = useMemo(() => getPlanDefinition(activePlanKey), [activePlanKey]);
  const enabledFeatureLabels = useMemo(
    () => (subscription?.enabledModules || []).map(featureKey => FEATURE_LABEL_MAP[featureKey] || featureKey),
    [subscription]
  );
  const currentOrPendingPlanKey = subscription?.pendingPlanKey || activePlanKey;
  const isEnterpriseTrack = currentOrPendingPlanKey === 'enterprise';
  const effectiveStatus = billing?.status || subscription?.status || '';
  const isTrialing = String(effectiveStatus || '').toLowerCase() === 'trialing';
  const showReactivationOptions = isReadOnly || ['overdue', 'cancelled', 'suspended'].includes(String(effectiveStatus || '').toLowerCase());
  const institutionLabel = institution?.branding?.portalTitle || institution?.branding?.institutionName || institution?.name || 'Institution';
  const enterpriseLicenseStatus = billing?.enterpriseLicense?.status || subscription?.enterpriseLicense?.status || 'not_issued';
  const showEnterpriseRedeemForm = isEnterpriseTrack && enterpriseLicenseStatus === 'issued';
  const showEnterpriseWaitingState = subscription?.pendingPlanKey === 'enterprise' && enterpriseLicenseStatus !== 'issued';
  const enterpriseAccessActive = activePlanKey === 'enterprise' && enterpriseLicenseStatus === 'redeemed';
  const planCards = useMemo(() => {
    if (isTrialing) {
      return PLAN_CATALOG.filter(plan => plan.key !== 'starter');
    }

    if (showReactivationOptions) {
      return PLAN_CATALOG.filter(
        plan => plan.key !== 'starter' && (plan.key === activePlanKey || canUpgradeToPlan(activePlanKey, plan.key))
      );
    }

    return PLAN_CATALOG.filter(
      plan => plan.key !== 'starter' && canUpgradeToPlan(activePlanKey, plan.key)
    );
  }, [activePlanKey, isTrialing, showReactivationOptions]);

  useEffect(() => {
    let active = true;

    const loadBilling = async () => {
      setBillingLoading(true);
      try {
        const response = await api.get('/saas/subscription/billing-history');
        if (active) {
          setBilling(response.data?.billing || null);
        }
      } catch {
        if (active) {
          setBilling(null);
        }
      } finally {
        if (active) {
          setBillingLoading(false);
        }
      }
    };

    loadBilling();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncPendingSubscription = async () => {
      if (!subscription?.billingSubscriptionId || subscription?.billingStatus !== 'pending') {
        return;
      }

      try {
        await api.post('/saas/subscription/verify-checkout', {
          subscriptionId: subscription.billingSubscriptionId,
        });
        if (!cancelled) {
          await refreshSettings({ silent: true });
        }
      } catch {
        // Let the webhook complete the update if checkout sync is not ready yet.
      }
    };

    syncPendingSubscription();

    return () => {
      cancelled = true;
    };
  }, [refreshSettings, subscription?.billingStatus, subscription?.billingSubscriptionId]);

  const usageItems = [
    { key: 'students', label: 'Students' },
    { key: 'staffAccounts', label: 'Staff Accounts' },
    { key: 'operatorAccounts', label: 'Operator Accounts' },
  ];

  const handleCheckout = async planKey => {
    setCheckoutPlan(planKey);
    try {
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        toast.error('Unable to load Razorpay checkout right now.');
        return;
      }

      const response = await api.post('/saas/subscription/checkout', { planKey });
      const checkout = response.data?.checkout;
      if (!checkout?.subscriptionId || !checkout?.key) {
        toast.error('Subscription checkout is not available for this plan yet.');
        return;
      }

      const options = {
        key: checkout.key,
        subscription_id: checkout.subscriptionId,
        name: 'Ematix',
        description: `${checkout.plan?.label || planKey} plan subscription`,
        notes: {
          institutionSlug: checkout.institution?.slug || institution?.slug || '',
          institutionPortalKey: checkout.institution?.portalKey || institution?.portalKey || institution?.slug || '',
        },
        theme: {
          color: institution?.branding?.primaryColor || '#1d4ed8',
        },
        handler: async responsePayload => {
          try {
            await api.post('/saas/subscription/verify-checkout', {
              subscriptionId: responsePayload?.razorpay_subscription_id || checkout.subscriptionId,
              paymentId: responsePayload?.razorpay_payment_id || '',
              signature: responsePayload?.razorpay_signature || '',
            });
            toast.success('Subscription activated successfully.');
          } catch (syncError) {
            toast.success('Authorization received. Billing sync is pending; webhook will complete the update shortly.');
            if (syncError?.response?.data?.message) {
              toast.error(syncError.response.data.message);
            }
          } finally {
            await refreshSettings({ silent: true });
          }
        },
        modal: {
          ondismiss: () => {
            toast('Checkout closed before completion.');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to start subscription checkout');
    } finally {
      setCheckoutPlan('');
    }
  };

  const handleRedeemLicense = async event => {
    event.preventDefault();
    if (!licenseKey.trim()) {
      toast.error('Enter the enterprise license key provided by Ematix.');
      return;
    }

    setRedeemingLicense(true);
    try {
      await api.post('/saas/subscription/redeem-license', {
        licenseKey,
      });
      toast.success('Enterprise license activated successfully.');
      setLicenseKey('');
      await refreshSettings({ silent: true });
      const response = await api.get('/saas/subscription/billing-history');
      setBilling(response.data?.billing || null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to redeem enterprise license');
    } finally {
      setRedeemingLicense(false);
    }
  };

  if (billingLoading && !subscription) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === 'upgrade' ? 'Upgrade Plan' : 'Subscription & Billing'}
        subtitle="Review limits, billing state, upgrade eligibility, and enterprise licensing from one controlled workspace."
      />

      <div className={`border px-5 py-4 shadow-sm ${isReadOnly ? 'border-amber-300 bg-amber-50' : 'border-border bg-white'}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-700">
              {institutionLabel}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">
              {currentPlan.label} Plan
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              {isReadOnly
                ? 'The institution is currently in read-only mode. Restore billing or activate a valid enterprise license to resume changes.'
                : subscription?.pendingPlanKey === 'enterprise' && enterpriseLicenseStatus === 'issued'
                  ? `Enterprise access is ready for this institution. Redeem the issued enterprise license key to move from ${currentPlan.label} to Enterprise.`
                  : subscription?.pendingPlanKey === 'enterprise'
                    ? 'Enterprise access has been approved by Ematix. The institution can continue on the current plan until the enterprise license key is issued and redeemed.'
                : subscription?.pendingPlanKey
                  ? `A ${getPlanDefinition(subscription.pendingPlanKey).label} upgrade is pending billing confirmation.`
                  : 'Use this page to review the current plan, limits, and billing position for the institution.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to={getHomePathForRole(user?.role, institution?.portalKey || user?.institutionPortalKey || user?.institutionSlug || '')} className="btn-secondary px-5 py-3">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {isTrialing ? (
        <div className="border border-primary-100 bg-primary-50 p-5 shadow-sm">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">Ematix Trial Access</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Your institution is currently in trial mode. You can purchase any paid plan at any time during the 14-day trial if you are ready to continue.
              </p>
            </div>
            <img src={EMATIX_WORDMARK} alt="Ematix" className="max-h-16 w-full max-w-[220px] object-contain sm:max-w-[260px]" />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="border border-border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-text-primary">Usage & Limits</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {usageItems.map(item => {
                const used = usageFor(item.key);
                const limit = limitFor(item.key);
                const width = limit && limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

                return (
                  <div key={item.key} className="border border-border bg-slate-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold text-text-primary">
                      {used} / {formatLimit(limit)}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden bg-white">
                      <div className={`h-full ${width >= 90 ? 'bg-amber-500' : 'bg-primary-700'}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border border-border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-text-primary">Current Plan Details</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="border border-border bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Plan</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">{isTrialing ? 'Trial Access' : currentPlan.label}</p>
                <p className="mt-1 text-xs text-text-secondary">{isTrialing ? '14-day free trial' : currentPlan.priceLabel}</p>
              </div>
              <div className="border border-border bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Students</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">{formatLimit(currentPlan.limits.students)}</p>
              </div>
              <div className="border border-border bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Staff / Operators</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">
                  {formatLimit(currentPlan.limits.staffAccounts)} / {formatLimit(currentPlan.limits.operatorAccounts)}
                </p>
              </div>
            </div>
          </div>

          <div className="border border-border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-text-primary">Enabled Modules</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {enabledFeatureLabels.length ? enabledFeatureLabels.map(label => (
                <span key={label} className="border border-border bg-slate-50 px-3 py-2 text-xs font-medium text-text-primary">
                  {label}
                </span>
              )) : (
                <p className="text-sm text-text-secondary">No modules are currently enabled.</p>
              )}
            </div>
          </div>

          {isTrialing || showReactivationOptions || planCards.length ? (
            <div className="border border-border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {isTrialing ? 'Available Plans' : showReactivationOptions ? 'Plan Reactivation' : 'Upgrade Options'}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {isTrialing
                    ? 'Buy any paid plan during trial. Enterprise remains managed by Ematix Master Admin.'
                    : showReactivationOptions
                      ? 'Reactivate the last used plan or move to a higher plan. Lower plans are intentionally hidden.'
                      : 'Only higher plans are shown. Downgrades are intentionally blocked.'}
                </p>
              </div>
              {!isTrialing ? (
                <span className="border border-border bg-slate-50 px-3 py-2 text-xs font-medium text-text-secondary">
                  Last used: {currentPlan.label}
                </span>
              ) : (
                <span className="border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700">
                  Current access: Trial
                </span>
              )}
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {planCards.length ? planCards.map(plan => (
                <div key={plan.key} className="border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-text-primary">{plan.label}</p>
                      <p className="mt-1 text-sm text-text-secondary">{plan.priceLabel}</p>
                    </div>
                    {!isTrialing && plan.key === activePlanKey ? (
                      <span className="border border-primary-200 bg-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-700">
                        Last Used
                      </span>
                    ) : subscription?.pendingPlanKey === plan.key ? (
                      <span className="border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                        Pending
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-text-secondary">
                    <p>Students: {formatLimit(plan.limits.students)}</p>
                    <p>Staff: {formatLimit(plan.limits.staffAccounts)}</p>
                    <p>Operators: {formatLimit(plan.limits.operatorAccounts)}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {plan.features.slice(0, 6).map(featureKey => (
                      <span key={featureKey} className="border border-border bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-text-primary">
                        {FEATURE_LABEL_MAP[featureKey] || featureKey}
                      </span>
                    ))}
                    {plan.features.length > 6 ? (
                      <span className="border border-border bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary">
                        +{plan.features.length - 6} more
                      </span>
                    ) : null}
                  </div>
                  {plan.key === 'enterprise' ? (
                    <div className="mt-5 space-y-3">
                      <div className="border border-border bg-slate-50 px-3 py-3 text-sm text-text-secondary">
                        Enterprise access is controlled directly by Ematix Master Admin and is activated through a managed enterprise license.
                      </div>
                      <button
                        type="button"
                        disabled={!canManagePlan}
                        onClick={() => toast('Contact Ematix Master Admin to request enterprise onboarding.')}
                        className="btn-secondary w-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Request Enterprise Access
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canManagePlan || checkoutPlan === plan.key || subscription?.pendingPlanKey === plan.key}
                      onClick={() => handleCheckout(plan.key)}
                      className="btn-primary mt-5 w-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {checkoutPlan === plan.key
                        ? 'Opening Razorpay Subscription Checkout...'
                        : subscription?.pendingPlanKey === plan.key
                          ? 'Awaiting Billing Confirmation'
                          : !isTrialing && plan.key === activePlanKey
                            ? `Reactivate ${plan.label}`
                            : isTrialing
                              ? `Buy ${plan.label}`
                              : `Move to ${plan.label}`}
                    </button>
                  )}
                </div>
              )) : (
                <div className="border border-border bg-slate-50 px-4 py-4 text-sm text-text-secondary xl:col-span-2">
                  No reactivation options are available right now.
                </div>
              )}
            </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="border border-border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-text-primary">Billing Snapshot</p>
            <div className="mt-4 space-y-3 text-sm text-text-secondary">
              <div className="flex items-center justify-between gap-3">
                <span>Status</span>
                <span className="font-semibold text-text-primary">{getSubscriptionStatusLabel(billing?.status || subscription?.status)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Billing State</span>
                <span className="font-semibold text-text-primary">{getBillingStatusLabel(billing?.billingStatus || subscription?.billingStatus)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Pending Upgrade</span>
                <span className="font-semibold text-text-primary">
                  {billing?.pendingPlanKey || subscription?.pendingPlanKey
                    ? getPlanDefinition(billing?.pendingPlanKey || subscription?.pendingPlanKey).label
                    : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Trial End</span>
                <span className="font-semibold text-text-primary">
                  {billing?.trialEndDate ? new Date(billing.trialEndDate).toLocaleDateString('en-IN') : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Next Billing</span>
                <span className="font-semibold text-text-primary">
                  {billing?.nextBillingDate ? new Date(billing.nextBillingDate).toLocaleDateString('en-IN') : '-'}
                </span>
              </div>
            </div>
          </div>

          {isEnterpriseTrack ? (
            <div className="border border-border bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-text-primary">Enterprise License Access</p>
              <p className="mt-1 text-sm text-text-secondary">
                Enterprise access is controlled by Ematix Master Admin. Once the enterprise license validity ends, the institution moves automatically into read-only mode.
              </p>
              <div className="mt-4 border border-border bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Current Enterprise License</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">
                  {getEnterpriseLicenseStatusLabel(billing?.enterpriseLicense?.status || subscription?.enterpriseLicense?.status)}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {(billing?.enterpriseLicense?.validUntil || subscription?.enterpriseLicense?.validUntil)
                    ? `Valid until ${new Date(billing?.enterpriseLicense?.validUntil || subscription?.enterpriseLicense?.validUntil).toLocaleDateString('en-IN')}`
                    : 'No enterprise license is active for this institution.'}
                </p>
              </div>
              {showEnterpriseRedeemForm ? (
                <form onSubmit={handleRedeemLicense} className="mt-4 space-y-3">
                  <div>
                    <label className="label">Redeem Enterprise License Key</label>
                    <input
                      className="input"
                      value={licenseKey}
                      onChange={event => setLicenseKey(event.target.value)}
                      placeholder="Paste enterprise license key"
                    />
                  </div>
                  <button type="submit" disabled={redeemingLicense || !canManagePlan} className="btn-primary w-full px-5 py-3 disabled:opacity-60">
                    {redeemingLicense ? 'Activating License...' : 'Activate Enterprise License'}
                  </button>
                </form>
              ) : showEnterpriseWaitingState ? (
                <div className="mt-4 border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                  Ematix has marked this institution for Enterprise access. The license key still needs to be issued before activation can be completed.
                </div>
              ) : enterpriseAccessActive ? (
                <div className="mt-4 border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                  Enterprise access is active for this institution and the license has already been redeemed.
                </div>
              ) : null}
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}
