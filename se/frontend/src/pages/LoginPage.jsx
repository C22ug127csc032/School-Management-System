import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import AuthSplitLayout from '../components/common/AuthSplitLayout.jsx';
import { FiEye, FiEyeOff, FiGrid, FiLock, FiMail, FiUser, FiUsers } from 'react-icons/fi';

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
    badge: 'School ERP Access',
    panelTitle: 'Sign In',
    panelSubtitle: 'Use your registered school account credentials to access the administration workspace.',
    welcomeTitle: 'School ERP',
    welcomeDescription: 'Operate admissions, academics, finance, attendance, and parent communication from a single control room.',
    welcomeNote: 'This screen now follows the same CMS interface language, colors, and composition as your reference frontend.',
    identifierLabel: 'Email Address',
    identifierPlaceholder: 'admin@school.edu',
    icon: FiMail,
  },
  student: {
    badge: 'Student Portal',
    panelTitle: 'Student Login',
    panelSubtitle: 'Sign in to view classes, homework, results, attendance, and fee details.',
    welcomeTitle: 'Student Access',
    welcomeDescription: 'Everything a learner needs, from timetable to academic progress, in one clean workspace.',
    welcomeNote: 'Use the registered phone number or email given to the school.',
    identifierLabel: 'Registered Phone or Email',
    identifierPlaceholder: '9876543210',
    icon: FiUser,
  },
  parent: {
    badge: 'Parent Portal',
    panelTitle: 'Parent Login',
    panelSubtitle: 'Track your child’s attendance, fees, homework, marks, and school updates.',
    welcomeTitle: 'Parent Access',
    welcomeDescription: 'Stay connected to your child’s school journey with the same CMS look and feel across the portal.',
    welcomeNote: 'Use the contact details linked during admission or registration.',
    identifierLabel: 'Registered Email or Phone',
    identifierPlaceholder: 'parent@email.com',
    icon: FiUsers,
  },
  chooser: {
    badge: 'Unified Access',
    panelTitle: 'Portal Login',
    panelSubtitle: 'Choose your school ERP access point and continue with your credentials.',
    welcomeTitle: 'Campus Access',
    welcomeDescription: 'A single branded entry point for administration, students, and parents.',
    welcomeNote: 'This UI has been aligned to the CMS theme while keeping your existing School ERP logic intact.',
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

  const handleSubmit = async event => {
    event.preventDefault();
    if (!form.identifier.trim() || !form.password.trim()) {
      toast.error('Please enter your credentials.');
      return;
    }

    setLoading(true);
    try {
      const data = await login(form.identifier.trim(), form.password, portalType);
      toast.success(`Welcome, ${data.user.name}!`);
      navigate(ROLE_ROUTES[data.user.role] || '/admin');
    } catch (error) {
      console.error('Login request failed:', error.response?.data || error);
      toast.error(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      badge={config.badge}
      panelTitle={config.panelTitle}
      panelSubtitle={config.panelSubtitle}
      welcomeTitle={config.welcomeTitle}
      welcomeDescription={config.welcomeDescription}
      welcomeNote={config.welcomeNote}
      footer={(
        <div className="space-y-3">
          {portalType === 'parent' ? (
            <p className="text-sm text-text-secondary">
              New parent account?{' '}
              <Link to="/register/parent" className="font-medium text-primary-700 hover:underline">
                Register using admission number
              </Link>
            </p>
          ) : null}
          <p className="text-xs leading-6 text-text-secondary">
            Copyright (c) All rights reserved. Powered by Ematix Embedded & Software Solutions Pvt Ltd.
          </p>
        </div>
      )}
    >
      <div className="mb-5 flex items-center gap-3 border border-primary-200 bg-primary-50 px-4 py-3">
        <div className="flex h-11 w-11 items-center justify-center border border-primary-200 bg-white text-primary-700">
          <config.icon className="text-xl" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-700">Secure Access</p>
          <p className="text-sm text-text-primary">Enter your registered credentials to continue.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">{config.identifierLabel}</label>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              <FiMail className="text-base" />
            </div>
            <input
              className="input pl-10"
              type="text"
              placeholder={config.identifierPlaceholder}
              value={form.identifier}
              onChange={event => setForm(current => ({ ...current, identifier: event.target.value }))}
              autoComplete="username"
            />
          </div>
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              <FiLock className="text-base" />
            </div>
            <input
              className="input pl-10 pr-10"
              type={showPass ? 'text' : 'password'}
              placeholder="Enter password"
              value={form.password}
              onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPass(value => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition hover:text-primary-700"
            >
              {showPass ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
    </AuthSplitLayout>
  );
}
