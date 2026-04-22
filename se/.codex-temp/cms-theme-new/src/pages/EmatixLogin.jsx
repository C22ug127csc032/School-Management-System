import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import AuthSplitLayout from '../components/common/AuthSplitLayout';
import PortalCopyright from '../components/common/PortalCopyright';
import { FiLock, FiShield, FiUser } from '../components/common/icons';

const InputIcon = ({ icon: Icon }) => (
  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-text-secondary">
    <Icon className="text-base" />
  </span>
);

const AUTH_INPUT_CLASS = 'w-full rounded-[0.75rem] border border-border bg-white px-11 py-3 text-sm text-text-primary shadow-sm outline-none transition duration-200 placeholder:text-slate-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-100';
const AUTH_PRIMARY_BUTTON_CLASS = 'inline-flex w-full items-center justify-center rounded-[0.75rem] bg-primary-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-primary-200/40 transition duration-200 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50';

export default function EmatixLogin() {
  const { login, completeLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.identifier.trim(), form.password, { platform: true });
      if (data.user.platformRole !== 'ematix_master_admin') {
        toast.error('Use a valid EMATIX platform administrator account.');
        return;
      }
      completeLogin(data);
      toast.success(`Welcome, ${data.user.name}!`);
      navigate('/ematix');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid platform credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      badge="EMATIX"
      welcomeTitle="EMATIX Platform"
      welcomeDescription="Manage institutions, access, branding, and billing from the EMATIX control panel."
      welcomeNote="Access is reserved for authorized EMATIX administrators only."
      panelTitle="Sign in"
      panelSubtitle="Use your EMATIX platform credentials to continue."
      footer={<PortalCopyright variant="full" className="text-text-secondary" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email or Phone Number</label>
          <div className="relative">
            <InputIcon icon={FiUser} />
            <input
              type="text"
              className={AUTH_INPUT_CLASS}
              placeholder="Enter your platform email or phone"
              value={form.identifier}
              onChange={event => setForm(current => ({ ...current, identifier: event.target.value }))}
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
              className={AUTH_INPUT_CLASS}
              placeholder="Enter your password"
              value={form.password}
              onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
              required
            />
          </div>
        </div>
        <div className="rounded-[1rem] border border-primary-100 bg-primary-50 p-4 text-sm text-primary-800">
          <span className="inline-flex items-center gap-2 font-medium">
            <FiShield />
            Platform actions are audited and affect all tenant institutions.
          </span>
        </div>
        <button type="submit" disabled={loading} className={AUTH_PRIMARY_BUTTON_CLASS}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </AuthSplitLayout>
  );
}
