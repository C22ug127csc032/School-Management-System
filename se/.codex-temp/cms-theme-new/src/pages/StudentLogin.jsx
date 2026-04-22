import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import AuthSplitLayout from '../components/common/AuthSplitLayout';
import PortalCopyright from '../components/common/PortalCopyright';
import { FiLock, FiPhone, FiShield, FiUser } from '../components/common/icons';
import { getHomePathForRole } from '../utils/authRedirect';
import { isValidIndianPhone, normalizeIdentifierInput, sanitizePhoneField } from '../utils/phone';
import { getStoredInstitutionPortalKey } from '../utils/tenant';
import { getPortalBranding } from '../utils/branding';
import useCanonicalPortalRedirect from '../hooks/useCanonicalPortalRedirect';
import usePortalInstitution from '../hooks/usePortalInstitution';

const INVALID_LOGIN_MESSAGE = 'Invalid email, phone number, or password';

const InputIcon = ({ icon: Icon }) => (
  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-text-secondary">
    <Icon className="text-base" />
  </span>
);

const AUTH_INPUT_CLASS = 'w-full rounded-[0.75rem] border border-border bg-white px-11 py-3 text-sm text-text-primary shadow-sm outline-none transition duration-200 placeholder:text-slate-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-100';
const AUTH_PRIMARY_BUTTON_CLASS = 'inline-flex w-full items-center justify-center rounded-[0.75rem] bg-primary-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-primary-200/40 transition duration-200 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50';
const AUTH_SECONDARY_BUTTON_CLASS = 'inline-flex items-center justify-center rounded-[0.75rem] border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700 transition duration-200 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50';

export default function StudentLogin() {
  const { login, completeLogin } = useAuth();
  const navigate = useNavigate();
  const { portalKey, slug } = useParams();
  const scopedPortalKey = portalKey || slug;
  const resolvingPortal = useCanonicalPortalRedirect(scopedPortalKey, '/student/login');
  const scopedInstitution = usePortalInstitution(scopedPortalKey);
  const brandIdentity = getPortalBranding({ institution: scopedInstitution, institutionStatus: scopedInstitution?.status });

  const [form, setForm] = useState({ portalKey: scopedPortalKey || getStoredInstitutionPortalKey(), phone: '', password: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const activePortalKey = String(scopedPortalKey || form.portalKey || '').trim().toLowerCase();

  const handlePasswordLogin = async event => {
    event.preventDefault();
    setLoading(true);
    setLoginFailed(false);

    try {
      if (!activePortalKey) {
        toast.error('Enter your institution URL key to continue');
        return;
      }
      const identifier = normalizeIdentifierInput(form.phone);
      const data = await login(identifier, form.password, { portalKey: activePortalKey, slug: activePortalKey });

      if (data.user.role !== 'student') {
        setLoginFailed(true);
        toast.error(INVALID_LOGIN_MESSAGE);
        return;
      }

      const user = completeLogin(data);
      toast.success(`Welcome, ${user.name}!`);

      if (user.isFirstLogin) {
        navigate(getHomePathForRole(user.role, activePortalKey || user?.institutionPortalKey || user?.institutionSlug || '').replace(/\/student$/, '/student/set-password'));
        return;
      }

      navigate(getHomePathForRole(user.role, activePortalKey || user?.institutionPortalKey || user?.institutionSlug || ''));
    } catch (error) {
      setLoginFailed(error.response?.status === 401);
      toast.error(INVALID_LOGIN_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!activePortalKey) {
      toast.error('Enter your institution URL key to continue');
      return;
    }
    const phone = sanitizePhoneField(form.phone);
    if (!phone) {
      toast.error('Enter a phone number first');
      return;
    }
    if (!isValidIndianPhone(phone)) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }

    setSendingOTP(true);
    try {
      await api.post('/auth/send-otp', { phone, portalKey: activePortalKey, slug: activePortalKey });
      setForm(previous => ({ ...previous, phone }));
      setOtpSent(true);
      toast.success(`OTP sent to ${phone}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleOTPLogin = async event => {
    event.preventDefault();
    const phone = sanitizePhoneField(form.phone);
    if (!isValidIndianPhone(phone)) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        portalKey: activePortalKey,
        slug: activePortalKey,
        phone,
        otp: form.otp,
      });

      if (response.data.user.role !== 'student') {
        toast.error(INVALID_LOGIN_MESSAGE);
        return;
      }

      const user = completeLogin(response.data);
      toast.success(`Welcome, ${user.name}!`);

      if (user.isFirstLogin) {
        navigate(getHomePathForRole(user.role, activePortalKey || user?.institutionPortalKey || user?.institutionSlug || '').replace(/\/student$/, '/student/set-password'));
        return;
      }

      navigate(getHomePathForRole(user.role, activePortalKey || user?.institutionPortalKey || user?.institutionSlug || ''));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  if (resolvingPortal) {
    return null;
  }

  return (
    <AuthSplitLayout
      badge="Student Portal"
      welcomeTitle="Student Portal"
      welcomeDescription="Welcome back. Check fees, notices, ledger, wallet, and academic records in one place."
      welcomeNote="Use your Admission No. as the first password. If needed, continue with OTP access."
      brandIdentity={brandIdentity}
      panelTitle="Sign in"
      panelSubtitle="Use your registered email or phone number to continue into the student portal."
      footer={<PortalCopyright variant="full" className="text-text-secondary" />}
    >
      {!showOTP ? (
        <form onSubmit={handlePasswordLogin} className="space-y-5">
          {!scopedPortalKey ? (
            <div>
              <label className="label">Institution URL Key</label>
              <input
                type="text"
                className={AUTH_INPUT_CLASS}
                placeholder="Enter your college URL key"
                value={form.portalKey}
                onChange={event => setForm(previous => ({ ...previous, portalKey: event.target.value.toLowerCase() }))}
                required
              />
            </div>
          ) : null}
          <div className="rounded-[1rem] border border-primary-100 bg-slate-50 p-4">
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <label className="label">Email or Phone Number</label>
                <div className="relative">
                  <InputIcon icon={FiUser} />
                  <input
                    type="text"
                    name="identifier"
                    autoComplete="username"
                    className={AUTH_INPUT_CLASS}
                    placeholder="Enter your email or phone number"
                    value={form.phone}
                    onChange={event => {
                      setForm(previous => ({ ...previous, phone: event.target.value }));
                      setLoginFailed(false);
                    }}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <InputIcon icon={FiLock} />
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    className={AUTH_INPUT_CLASS}
                    placeholder="Enter password"
                    value={form.password}
                    onChange={event => {
                      setForm(previous => ({ ...previous, password: event.target.value }));
                      setLoginFailed(false);
                    }}
                    required
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-[0.9rem] border border-border bg-white px-4 py-3">
            <p className="text-xs leading-5 text-text-secondary">First-time login password is your Admission No.</p>
            <button
              type="button"
              onClick={() => {
                setShowOTP(true);
                setLoginFailed(false);
                setForm(previous => ({ ...previous, password: '' }));
              }}
              className="shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-primary-600 transition hover:text-primary-700"
            >
              Use OTP
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={AUTH_PRIMARY_BUTTON_CLASS}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOTPLogin} className="space-y-5">
          {!scopedPortalKey ? (
            <div>
              <label className="label">Institution URL Key</label>
              <input
                type="text"
                className={AUTH_INPUT_CLASS}
                placeholder="Enter your college URL key"
                value={form.portalKey}
                onChange={event => setForm(previous => ({ ...previous, portalKey: event.target.value.toLowerCase() }))}
                required
              />
            </div>
          ) : null}
          <div className="rounded-[1rem] border border-primary-100 bg-slate-50 p-4">
            <label className="label">Phone Number</label>
            <div className="relative">
              <InputIcon icon={FiPhone} />
              <input
                type="tel"
                className={AUTH_INPUT_CLASS}
                placeholder="Enter your phone number"
                value={form.phone}
                onChange={event => setForm(previous => ({ ...previous, phone: sanitizePhoneField(event.target.value) }))}
                inputMode="numeric"
                maxLength={10}
                required
              />
            </div>
            <button
              type="button"
              onClick={handleSendOTP}
              disabled={sendingOTP || otpSent}
              className={`${AUTH_SECONDARY_BUTTON_CLASS} mt-3 w-full`}
            >
              {sendingOTP ? 'Sending...' : otpSent ? 'OTP Sent' : 'Send OTP'}
            </button>
          </div>

          {otpSent ? (
            <div className="rounded-[1rem] border border-border bg-white p-4">
              <label className="label">Enter OTP</label>
              <div className="relative">
                <InputIcon icon={FiShield} />
                <input
                  type="text"
                  className={`${AUTH_INPUT_CLASS} text-center text-xl font-semibold tracking-[0.5em]`}
                  placeholder="------"
                  maxLength={6}
                  value={form.otp}
                  onChange={event => setForm(previous => ({ ...previous, otp: event.target.value }))}
                  required
                />
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                Valid for 10 minutes.{' '}
                <button
                  type="button"
                  onClick={handleSendOTP}
                  className="font-medium text-primary-700 hover:underline"
                >
                  Resend
                </button>
              </p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !otpSent}
            className={AUTH_PRIMARY_BUTTON_CLASS}
          >
            {loading ? 'Verifying...' : 'Verify & Login'}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowOTP(false);
              setOtpSent(false);
            }}
            className="w-full text-sm font-medium text-text-secondary transition hover:text-text-primary"
          >
            Back to Password Login
          </button>
        </form>
      )}

      {loginFailed && !showOTP ? (
        <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <span className="text-amber-700">Notice</span>
            <div>
              <p className="text-sm font-semibold text-amber-900">Password not working?</p>
              <p className="mt-1 text-xs leading-5 text-amber-800">
                Your first password is your Admission No. If you have changed it or forgotten it, use OTP login instead.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowOTP(true);
              setLoginFailed(false);
              setForm(previous => ({ ...previous, password: '' }));
            }}
            className="mt-4 w-full rounded-[0.75rem] border border-amber-300 bg-amber-100 py-2.5 text-sm font-semibold uppercase tracking-[0.05em] text-amber-900 transition-colors hover:bg-amber-200"
          >
            Login With OTP
          </button>
        </div>
      ) : null}
    </AuthSplitLayout>
  );
}
