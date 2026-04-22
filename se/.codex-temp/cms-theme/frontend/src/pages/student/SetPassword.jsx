import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiArrowRight,
  FiCheckCircle,
  FiInfo,
  FiLock,
} from '../../components/common/icons';

export default function SetPassword() {
  const { user, setFirstPassword } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(0);

  const checkStrength = password => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const handlePasswordChange = e => {
    const val = e.target.value;
    setForm(f => ({ ...f, newPassword: val }));
    setStrength(checkStrength(val));
  };

  const strengthLabel = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  const handleSubmit = async e => {
    e.preventDefault();

    if (form.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await setFirstPassword(form.newPassword, form.confirmPassword);
      toast.success('Password set successfully! Welcome to the portal.');
      navigate('/student');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar via-primary-dark to-primary-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-primary-500 text-3xl mx-auto mb-4 shadow-md">
            <FiLock />
          </div>
          <h1 className="text-3xl font-bold text-white">Set Your Password</h1>
          <p className="text-primary-100 mt-2">
            Welcome, {user?.name}! Please set a new password to continue.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-md p-8">
          <div className="flex items-start gap-3 p-3 bg-primary-50 border border-primary-100 rounded-xl mb-6">
            <FiInfo className="text-primary-500 text-lg mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-primary-700">
                First Login - Password Setup Required
              </p>
              <p className="text-xs text-primary-600 mt-0.5">
                Your default password was your Admission No.
                Please set a new secure password that only you know.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">
                New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                className="input"
                placeholder="Min 6 characters"
                value={form.newPassword}
                onChange={handlePasswordChange}
                required
              />

              {form.newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength ? strengthColor[strength] : 'bg-gray-200'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${
                    strength <= 2 ? 'text-red-500'
                      : strength === 3 ? 'text-yellow-500'
                        : 'text-green-500'
                  }`}>
                    {strengthLabel[strength]}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="label">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                className="input"
                placeholder="Re-enter new password"
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                required
              />
              {form.confirmPassword && (
                <p className={`text-xs mt-1 font-medium ${
                  form.newPassword === form.confirmPassword ? 'text-green-500' : 'text-red-500'
                }`}>
                  {form.newPassword === form.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-1">
                Password tips:
              </p>
              <ul className="text-xs text-gray-400 space-y-0.5">
                <li className={form.newPassword.length >= 8 ? 'text-green-500' : ''}>
                  {form.newPassword.length >= 8 ? 'Pass' : 'Need'}: At least 8 characters
                </li>
                <li className={/[A-Z]/.test(form.newPassword) ? 'text-green-500' : ''}>
                  {/[A-Z]/.test(form.newPassword) ? 'Pass' : 'Need'}: One uppercase letter
                </li>
                <li className={/[0-9]/.test(form.newPassword) ? 'text-green-500' : ''}>
                  {/[0-9]/.test(form.newPassword) ? 'Pass' : 'Need'}: One number
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading || form.newPassword.length < 6 || form.newPassword !== form.confirmPassword}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? 'Setting Password...' : (
                <span className="inline-flex items-center gap-2">
                  <span>Set Password & Continue</span>
                  <FiArrowRight />
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
