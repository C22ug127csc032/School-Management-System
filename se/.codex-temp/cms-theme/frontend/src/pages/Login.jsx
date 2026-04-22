import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { getHomePathForRole, OPERATOR_ROLES } from '../utils/authRedirect';
import { isValidIndianPhone, normalizeIdentifierInput, sanitizePhoneField } from '../utils/phone';
import AuthSplitLayout from '../components/common/AuthSplitLayout';
import PortalCopyright from '../components/common/PortalCopyright';
import { FiLock, FiPhone, FiShield, FiUser } from '../components/common/icons';

const INVALID_LOGIN_MESSAGE = 'Invalid email, phone number, or password';

const InputIcon = ({ icon: Icon }) => (
  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-text-secondary">
    <Icon className="text-base" />
  </span>
);

const AUTH_INPUT_CLASS = 'w-full rounded-[0.75rem] border border-border bg-white px-11 py-3 text-sm text-text-primary shadow-sm outline-none transition duration-200 placeholder:text-slate-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-100';
const AUTH_PRIMARY_BUTTON_CLASS = 'inline-flex w-full items-center justify-center rounded-[0.75rem] bg-primary-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-primary-200/40 transition duration-200 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50';
const AUTH_SECONDARY_BUTTON_CLASS = 'inline-flex items-center justify-center rounded-[0.75rem] border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700 transition duration-200 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50';

export default function Login() {
  const { login, completeLogin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ phone: '', password: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);

  const handlePasswordLogin = async e => {
    e.preventDefault();
    setLoading(true);
    setLoginFailed(false);
    try {
      const identifier = normalizeIdentifierInput(form.phone);
      const data = await login(identifier, form.password);

      if (
        data.user.role === 'student' ||
        data.user.role === 'parent' ||
        OPERATOR_ROLES.includes(data.user.role)
      ) {
        setLoginFailed(true);
        toast.error(INVALID_LOGIN_MESSAGE);
        return;
      }

      const user = completeLogin(data);
      toast.success(`Welcome, ${user.name}!`);
      navigate(getHomePathForRole(user.role));
    } catch (err) {
      setLoginFailed(err.response?.status === 401);
      toast.error(INVALID_LOGIN_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
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
      await api.post('/auth/send-otp', { phone });
      setForm(prev => ({ ...prev, phone }));
      setOtpSent(true);
      toast.success('OTP sent to ' + phone);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleOTPLogin = async e => {
    e.preventDefault();
    const phone = sanitizePhoneField(form.phone);
    if (!isValidIndianPhone(phone)) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setLoading(true);
    try {
      const r = await api.post('/auth/verify-otp', {
        phone,
        otp: form.otp,
      });

      if (
        r.data.user.role === 'student' ||
        r.data.user.role === 'parent' ||
        OPERATOR_ROLES.includes(r.data.user.role)
      ) {
        toast.error(INVALID_LOGIN_MESSAGE);
        return;
      }

      const user = completeLogin(r.data);
      toast.success(`Welcome, ${user.name}!`);
      navigate(getHomePathForRole(user.role));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      badge="Admin Portal"
      welcomeTitle="Admin Portal"
      welcomeDescription="Welcome back. Run the full campus workflow from one secure control desk."
      welcomeNote="For administrators, faculty leads, accountants, librarians, wardens, and office staff."
      panelTitle="Sign in"
      panelSubtitle="Use your registered email or phone number to continue into the college management portal."
      footer={<PortalCopyright variant="full" className="text-text-secondary" />}
    >
      {!showOTP ? (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
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
                onChange={e => {
                  setForm(prev => ({ ...prev, phone: e.target.value }));
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
                onChange={e => {
                  setForm(prev => ({ ...prev, password: e.target.value }));
                  setLoginFailed(false);
                }}
                required
              />
            </div>
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
        <form onSubmit={handleOTPLogin} className="space-y-4">
          <div>
            <label className="label">Phone Number</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <InputIcon icon={FiPhone} />
                <input
                  type="tel"
                  className={AUTH_INPUT_CLASS}
                  placeholder="Enter phone number"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: sanitizePhoneField(e.target.value) })}
                  inputMode="numeric"
                  maxLength={10}
                  required
                />
              </div>
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={sendingOTP || otpSent}
                className={`${AUTH_SECONDARY_BUTTON_CLASS} w-full whitespace-nowrap sm:w-auto`}
              >
                {sendingOTP ? 'Sending...' : otpSent ? 'Sent' : 'Send OTP'}
              </button>
            </div>
          </div>
          {otpSent && (
            <div>
              <label className="label">Enter OTP</label>
              <div className="relative">
                <InputIcon icon={FiShield} />
                <input
                  type="text"
                  className={`${AUTH_INPUT_CLASS} text-center text-2xl tracking-widest`}
                  placeholder="------"
                  maxLength={6}
                  value={form.otp}
                  onChange={e => setForm({ ...form, otp: e.target.value })}
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Valid for 10 minutes.{` `}
                <button
                  type="button"
                  onClick={handleSendOTP}
                  className="text-primary-600 hover:underline"
                >
                  Resend
                </button>
              </p>
            </div>
          )}
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
            className="w-full text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            Back to Password Login
          </button>
        </form>
      )}

      {loginFailed && !showOTP && (
        <div className="mt-4 rounded-[1rem] border border-yellow-200 bg-yellow-50 p-4">
          <div className="mb-2 flex items-start gap-2">
            <span className="text-yellow-500">Warning</span>
            <div>
              <p className="text-sm font-semibold text-yellow-800">
                Wrong password?
              </p>
              <p className="text-xs text-yellow-600 mt-0.5">
                Use OTP to login instead.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowOTP(true);
              setLoginFailed(false);
              setForm(f => ({ ...f, password: '' }));
            }}
            className="w-full rounded-[0.75rem] border border-yellow-300 bg-yellow-100 py-2 text-sm font-semibold text-yellow-800 transition-colors hover:bg-yellow-200"
          >
            Login with OTP instead
          </button>
        </div>
      )}
    </AuthSplitLayout>
  );
}
