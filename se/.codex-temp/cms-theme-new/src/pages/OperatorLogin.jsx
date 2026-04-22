import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import AuthSplitLayout from '../components/common/AuthSplitLayout';
import PortalCopyright from '../components/common/PortalCopyright';
import { FiLock, FiUser } from '../components/common/icons';
import { getHomePathForRole, OPERATOR_ROLES } from '../utils/authRedirect';
import { getPortalBranding } from '../utils/branding';
import { normalizeIdentifierInput } from '../utils/phone';
import { getStoredInstitutionPortalKey } from '../utils/tenant';
import useCanonicalPortalRedirect from '../hooks/useCanonicalPortalRedirect';
import usePortalInstitution from '../hooks/usePortalInstitution';

const INVALID_LOGIN_MESSAGE = 'Use a valid shop, canteen, or operator admin account for this portal.';

const InputIcon = ({ icon: Icon }) => (
  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-text-secondary">
    <Icon className="text-base" />
  </span>
);

const AUTH_INPUT_CLASS = 'w-full rounded-[0.75rem] border border-border bg-white px-11 py-3 text-sm text-text-primary shadow-sm outline-none transition duration-200 placeholder:text-slate-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-100';
const AUTH_PRIMARY_BUTTON_CLASS = 'inline-flex w-full items-center justify-center rounded-[0.75rem] bg-primary-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-primary-200/40 transition duration-200 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50';

export default function OperatorLogin() {
  const { login, completeLogin } = useAuth();
  const navigate = useNavigate();
  const { portalKey, slug } = useParams();
  const scopedPortalKey = portalKey || slug;
  const resolvingPortal = useCanonicalPortalRedirect(scopedPortalKey, '/operator/login');
  const scopedInstitution = usePortalInstitution(scopedPortalKey);
  const brandIdentity = getPortalBranding({ institution: scopedInstitution, institutionStatus: scopedInstitution?.status });

  const [form, setForm] = useState({ portalKey: scopedPortalKey || getStoredInstitutionPortalKey(), phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const activePortalKey = String(scopedPortalKey || form.portalKey || '').trim().toLowerCase();

  const handleSubmit = async event => {
    event.preventDefault();
    setLoading(true);

    try {
      if (!activePortalKey) {
        toast.error('Enter your institution URL key to continue');
        return;
      }
      const data = await login(normalizeIdentifierInput(form.phone), form.password, {
        portalKey: activePortalKey,
        slug: activePortalKey,
      });

      if (!OPERATOR_ROLES.includes(data.user.role)) {
        toast.error(INVALID_LOGIN_MESSAGE);
        return;
      }

      const user = completeLogin(data);
      toast.success(`Welcome, ${user.name}!`);
      navigate(getHomePathForRole(user.role, activePortalKey || user?.institutionPortalKey || user?.institutionSlug || ''));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  if (resolvingPortal) {
    return null;
  }

  return (
    <AuthSplitLayout
      badge="Operator Portal"
      welcomeTitle="Operator Portal"
      welcomeDescription="Welcome back. Handle sales, counter activity, and operator workflows from one desk."
      welcomeNote="Access is reserved for canteen operators, shop operators, and operator admin users."
      brandIdentity={brandIdentity}
      panelTitle="Sign in"
      panelSubtitle="Use your assigned email or phone number to continue into the operator portal."
      footer={<PortalCopyright variant="full" className="text-text-secondary" />}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[0.9rem] border border-white bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600">Portal Use</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Use this login for counter billing, order entry, and daily operator reporting.
              </p>
            </div>
            <div className="space-y-4">
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
                    onChange={event => setForm(previous => ({ ...previous, phone: event.target.value }))}
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
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={event => setForm(previous => ({ ...previous, password: event.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>
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
    </AuthSplitLayout>
  );
}
