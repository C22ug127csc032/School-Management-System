import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import AuthSplitLayout from '../components/common/AuthSplitLayout';
import PortalCopyright from '../components/common/PortalCopyright';

const INITIAL_FORM = {
  institutionName: '',
  ownerName: '',
  email: '',
  phone: '',
  password: '',
  city: '',
  state: '',
};

export default function InstitutionSignup() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [result, setResult] = useState(null);

  const institutionPortalKey = result?.institution?.portalKey || result?.institution?.slug || '';
  const institutionPortalUrl = result?.institution?.portalUrl || '';
  const phoneVerified = Boolean(result?.onboarding?.phoneVerified);
  const emailVerified = Boolean(result?.onboarding?.emailVerified);
  const isActivated = phoneVerified && emailVerified;

  const checklist = useMemo(() => ([
    {
      key: 'register',
      label: 'Institution registered',
      done: Boolean(result?.institution?._id),
    },
    {
      key: 'phone',
      label: 'Phone OTP verified',
      done: phoneVerified,
    },
    {
      key: 'email',
      label: 'Email verified',
      done: emailVerified,
    },
  ]), [emailVerified, phoneVerified, result?.institution?._id]);

  const updateOnboardingState = payload => {
    setResult(current => current ? ({
      ...current,
      institution: payload?.institution || current.institution,
      onboarding: {
        ...(current.onboarding || {}),
        ...(payload?.onboarding || {}),
      },
    }) : current);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/saas/register', form);
      setResult(response.data);
      setOtp('');
      toast.success('Institution registered. Complete phone OTP and email verification.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to start institution signup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async event => {
    event.preventDefault();
    if (!result?.institution?._id) return;
    if (!otp.trim()) {
      toast.error('Enter the OTP sent to the owner phone number.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const response = await api.post('/saas/verify-phone', {
        institutionId: result.institution._id,
        otp: otp.trim(),
      });
      updateOnboardingState(response.data);
      toast.success(response.data?.message || 'Phone verified successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to verify phone OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!result?.institution?._id) return;
    setResendingOtp(true);
    try {
      const response = await api.post('/saas/verify-phone/send-otp', {
        institutionId: result.institution._id,
      });
      updateOnboardingState({
        onboarding: {
          maskedPhone: response.data?.maskedPhone || result?.onboarding?.maskedPhone,
        },
      });
      toast.success(response.data?.message || 'OTP sent successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to resend phone OTP');
    } finally {
      setResendingOtp(false);
    }
  };

  const handleResendEmail = async () => {
    if (!result?.institution?._id) return;
    setResendingEmail(true);
    try {
      const response = await api.post('/saas/verify-email/resend', {
        institutionId: result.institution._id,
      });
      toast.success(response.data?.message || 'Verification email sent successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to resend verification email');
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <AuthSplitLayout
      badge="Ematix Trial"
      welcomeTitle="Start Trial"
      welcomeDescription="Launch a 14-day Ematix college trial from a public onboarding flow, then verify both phone and email to activate access."
      welcomeNote="Use this public page for new institutions. Platform admin login is separate."
      panelTitle="Register Institution"
      panelSubtitle="Create the first owner account, verify the onboarding steps, and continue into the institution portal."
      footer={<PortalCopyright variant="full" className="text-text-secondary" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Institution Name</label>
            <input className="input" value={form.institutionName} onChange={event => setForm(current => ({ ...current, institutionName: event.target.value }))} required />
          </div>
          <div>
            <label className="label">Owner Name</label>
            <input className="input" value={form.ownerName} onChange={event => setForm(current => ({ ...current, ownerName: event.target.value }))} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} required />
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" value={form.city} onChange={event => setForm(current => ({ ...current, city: event.target.value }))} />
          </div>
          <div>
            <label className="label">State</label>
            <input className="input" value={form.state} onChange={event => setForm(current => ({ ...current, state: event.target.value }))} />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Starting trial...' : 'Register Institution'}
        </button>
      </form>

      {result?.institution ? (
        <div className="mt-5 space-y-4">
          <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">{result.institution.name}</p>
            <p className="mt-1">Temporary Portal URL Key: {result.institution.portalKey || result.institution.slug}</p>
            {institutionPortalUrl ? <p className="mt-1 break-all">Portal Login URL: {institutionPortalUrl}</p> : null}
            <p className="mt-1">Phone OTP: sent to {result.onboarding?.maskedPhone}</p>
            <p className="mt-1">Email verification: sent to the owner address.</p>
          </div>

          <div className="border border-border bg-white p-4">
            <p className="text-sm font-semibold text-text-primary">Activation Checklist</p>
            <div className="mt-3 space-y-2">
              {checklist.map(item => (
                <div key={item.key} className={`flex items-center justify-between border px-3 py-2 text-sm ${item.done ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-border bg-slate-50 text-text-secondary'}`}>
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.done ? 'Done' : 'Pending'}</span>
                </div>
              ))}
            </div>
          </div>

          {!phoneVerified ? (
            <form onSubmit={handleVerifyPhone} className="border border-border bg-white p-4">
              <p className="text-sm font-semibold text-text-primary">Verify Phone OTP</p>
              <p className="mt-1 text-sm text-text-secondary">Enter the OTP sent to {result.onboarding?.maskedPhone || 'the registered phone number'}.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  className="input flex-1"
                  value={otp}
                  onChange={event => setOtp(event.target.value)}
                  placeholder="Enter OTP"
                />
                <button type="submit" disabled={verifyingOtp} className="btn-primary px-5 py-3">
                  {verifyingOtp ? 'Verifying...' : 'Verify Phone'}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={handleResendOtp} disabled={resendingOtp} className="btn-secondary px-4 py-2 text-sm">
                  {resendingOtp ? 'Sending...' : 'Resend OTP'}
                </button>
                <button type="button" onClick={handleResendEmail} disabled={resendingEmail} className="btn-secondary px-4 py-2 text-sm">
                  {resendingEmail ? 'Sending...' : 'Resend Email'}
                </button>
              </div>
            </form>
          ) : null}

          {phoneVerified && !emailVerified ? (
            <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Phone verified successfully.</p>
              <p className="mt-1">Now click the email verification link sent to the owner inbox. If needed, resend the email below.</p>
              <button type="button" onClick={handleResendEmail} disabled={resendingEmail} className="btn-secondary mt-3 px-4 py-2 text-sm">
                {resendingEmail ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          ) : null}

          {isActivated ? (
            <div className="border border-primary-200 bg-primary-50 p-4">
              <p className="text-sm font-semibold text-primary-800">Trial activated successfully.</p>
              <p className="mt-1 text-sm text-primary-700">Continue into the institution admin portal using the temporary portal URL assigned by Ematix.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to={`/${institutionPortalKey}/admin/login`} className="btn-primary px-5 py-3">
                  Go to Institution Login
                </Link>
                <Link to="/ematix/login" className="btn-secondary px-5 py-3">
                  Go to Ematix Login
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </AuthSplitLayout>
  );
}
