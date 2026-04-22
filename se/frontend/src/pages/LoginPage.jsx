import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { FiEye, FiEyeOff, FiMail, FiLock, FiGrid, FiUser, FiUsers } from 'react-icons/fi';

const ROLE_ROUTES = {
  super_admin: '/admin',
  admin: '/admin',
  principal: '/admin',
  teacher: '/admin',
  class_teacher: '/admin',
  accountant: '/admin',
  librarian: '/admin',
  admission_staff: '/admin',
  student: '/student',
  parent: '/parent',
};

const PORTAL_CONFIG = {
  admin: {
    title: 'School ERP System',
    subtitle: 'Administrative and Staff Portal',
    identifierLabel: 'Email Address',
    identifierPlaceholder: 'admin@school.edu',
    icon: FiMail,
  },
  student: {
    title: 'Student Portal',
    subtitle: 'Access your lessons, results, and fees',
    identifierLabel: 'Registered Phone or Email',
    identifierPlaceholder: '9876543210',
    icon: FiUser,
  },
  parent: {
    title: 'Parent Portal',
    subtitle: 'Track your child\'s progress and performance',
    identifierLabel: 'Registered Email or Phone',
    identifierPlaceholder: 'parent@email.com',
    icon: FiUsers,
  },
  chooser: {
    title: 'School ERP System',
    subtitle: 'Manage your institution smoothly',
    identifierLabel: 'Email / Username',
    identifierPlaceholder: 'your@email.com',
    icon: FiGrid,
  },
};

export default function LoginPage({ portalType = 'admin' }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const config = useMemo(() => PORTAL_CONFIG[portalType] || PORTAL_CONFIG.admin, [portalType]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.identifier.trim() || !form.password.trim()) {
      return toast.error('Please enter your credentials.');
    }

    setLoading(true);
    try {
      const data = await login(form.identifier.trim(), form.password, portalType);
      toast.success(`Welcome, ${data.user.name}!`);
      navigate(ROLE_ROUTES[data.user.role] || '/admin');
    } catch (err) {
      console.error('Login request failed:', err.response?.data || err);
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell flex min-h-screen flex-col items-center justify-center">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-200">
          <config.icon className="text-3xl" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{config.title}</h1>
        <p className="mt-2 text-slate-500 font-medium">{config.subtitle}</p>
      </div>

      <div className="auth-card w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="form-group">
            <label className="label text-slate-600">{config.identifierLabel}</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <FiMail className="text-lg" />
              </div>
              <input
                className="input pl-11"
                type="text"
                placeholder={config.identifierPlaceholder}
                value={form.identifier}
                onChange={e => setForm(current => ({ ...current, identifier: e.target.value }))}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label text-slate-600">Password</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <FiLock className="text-lg" />
              </div>
              <input
                className="input pl-11 pr-11"
                type={showPass ? 'text' : 'password'}
                placeholder="........"
                value={form.password}
                onChange={e => setForm(current => ({ ...current, password: e.target.value }))}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(value => !value)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 transition-colors"
              >
                {showPass ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base font-bold tracking-normal uppercase-none">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>

      {portalType === 'parent' && (
        <div className="mt-5 text-center text-sm font-medium text-slate-500">
          <p>
            New parent account?{' '}
            <Link to="/register/parent" className="text-primary-700 transition hover:text-primary-600">
              Register using admission number
            </Link>
          </p>
        </div>
      )}

      <div className="mt-8 text-center text-sm font-medium text-slate-500">
        <p>Copyright (c) All rights reserved.</p>
        <p className="mt-1">Powered by Ematix Embedded & Software Solutions Pvt Ltd</p>
      </div>
    </div>
  );
}
