import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiLock, FiUser } from 'react-icons/fi';
import api from '../api/axios.js';

function getRelationMessage(relation) {
  if (relation === 'father') return 'Father details found from the admission record.';
  if (relation === 'mother') return 'Mother details found from the admission record.';
  if (relation === 'guardian') return 'Guardian details found from the admission record.';
  return 'Parent details found from the admission record.';
}

export default function ParentRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    admissionNo: '',
    parentName: '',
    phone: '',
    email: '',
    relation: '',
    password: '',
    confirmPassword: '',
  });
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => {
    return Boolean(
      preview &&
      form.password.trim() &&
      form.confirmPassword.trim() &&
      (preview.parent.email || form.email.trim() || form.phone.trim())
    );
  }, [preview, form.password, form.confirmPassword, form.email, form.phone]);

  const resetFetchedFields = admissionNo => {
    setForm(current => ({
      ...current,
      admissionNo,
      parentName: '',
      phone: '',
      email: '',
      relation: '',
      password: current.password,
      confirmPassword: current.confirmPassword,
    }));
  };

  const handleFetch = async admissionValue => {
    const admissionNo = admissionValue.trim().toUpperCase();

    if (!admissionNo) {
      setPreview(null);
      setPreviewError('');
      resetFetchedFields('');
      return;
    }

    setLoadingPreview(true);
    setPreviewError('');

    try {
      const response = await api.get(`/auth/parent-registration-preview/${encodeURIComponent(admissionNo)}`);
      const data = response.data.data;
      setPreview(data);
      setForm(current => ({
        ...current,
        admissionNo,
        parentName: data.parent.name || '',
        phone: data.parent.phone || '',
        email: data.parent.email || '',
        relation: data.parent.relation || '',
      }));
    } catch (error) {
      setPreview(null);
      resetFetchedFields(admissionNo);
      setPreviewError(error.response?.data?.message || 'Unable to fetch student details.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleRegister = async e => {
    e.preventDefault();
    if (!preview) {
      await handleFetch(form.admissionNo);
      return toast.error('Wait for the student details to load first.');
    }
    if (!preview.parent.email && !form.email.trim()) {
      return toast.error('Enter an email address if it was not provided during admission.');
    }
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match.');

    setSaving(true);
    try {
      await api.post('/auth/parent-register', {
        admissionNo: form.admissionNo.trim().toUpperCase(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      toast.success('Parent account created. Please log in.');
      navigate('/login/parent');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-shell flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-200">
          <FiUser className="text-3xl" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Parent Registration</h1>
        <p className="mt-2 max-w-xl text-sm font-medium text-slate-500">
          Enter the student admission number first, then click the right arrow to load the saved parent details.
          If father details were added during admission, those will be shown first. If not, the guardian details will be used instead.
        </p>
      </div>

      <div className="auth-card w-full max-w-2xl">
        <form onSubmit={handleRegister} className="space-y-6">
          <div className="form-group mb-0">
            <label className="label text-slate-600">Student Admission Number</label>
            <div className="flex gap-3">
              <input
                className="input"
                type="text"
                placeholder="Enter admission number"
                value={form.admissionNo}
                onChange={e => {
                  const admissionNo = e.target.value.toUpperCase();
                  setPreview(null);
                  setPreviewError('');
                  resetFetchedFields(admissionNo);
                }}
                onKeyDown={async e => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  await handleFetch(e.currentTarget.value);
                }}
              />
              <button
                type="button"
                onClick={() => handleFetch(form.admissionNo)}
                disabled={loadingPreview || !form.admissionNo.trim()}
                className="btn-primary h-12 w-12 shrink-0 px-0"
                aria-label="Fetch admission details"
              >
                <FiArrowRight className="text-lg" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              First enter the admission number, then click the right arrow to load the parent or guardian details.
            </p>
          </div>

          {loadingPreview && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4">
              <p className="text-sm font-semibold text-blue-700">Fetching admission details...</p>
            </div>
          )}

          {previewError && (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4">
              <p className="text-sm font-semibold text-red-700">{previewError}</p>
            </div>
          )}

          {preview && !loadingPreview && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="mb-3 flex items-center gap-2 text-emerald-700">
                <FiCheckCircle />
                <p className="text-sm font-semibold">Student linked successfully</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700/80">Student</p>
                  <p className="mt-1 font-semibold text-slate-900">{preview.student.name}</p>
                  <p className="text-sm text-slate-600">Admission No: {preview.student.admissionNo}</p>
                  <p className="text-sm text-slate-600">Class: {preview.student.grade || '-'} {preview.student.section || ''}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700/80">Fetched Contact</p>
                  <p className="mt-1 font-semibold text-slate-900">{getRelationMessage(preview.parent.relation)}</p>
                  <p className="text-sm text-slate-600">Status: {preview.student.status?.replace(/_/g, ' ')}</p>
                </div>
              </div>
            </div>
          )}

          {preview && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="form-group">
                  <label className="label text-slate-600">{form.relation === 'guardian' ? 'Guardian Name' : 'Parent Name'}</label>
                  <input className="input bg-slate-50" type="text" value={form.parentName} readOnly />
                </div>
                <div className="form-group">
                  <label className="label text-slate-600">Relation</label>
                  <input className="input bg-slate-50 capitalize" type="text" value={form.relation} readOnly />
                </div>
                <div className="form-group">
                  <label className="label text-slate-600">Phone</label>
                  <input className="input bg-slate-50" type="text" value={form.phone} readOnly />
                </div>
                <div className="form-group">
                  <label className="label text-slate-600">Email</label>
                  <input
                    className={`input ${preview.parent.email ? 'bg-slate-50' : ''}`}
                    type="email"
                    value={form.email}
                    placeholder={preview.parent.email ? '' : 'Enter parent email'}
                    readOnly={Boolean(preview.parent.email)}
                    onChange={e => setForm(current => ({ ...current, email: e.target.value }))}
                  />
                  {!preview.parent.email && (
                    <p className="mt-2 text-xs text-slate-500">
                      No email was saved during admission. Add one now so the parent can log in using phone number or email.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="form-group">
                  <label className="label text-slate-600">Password</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <FiLock className="text-lg" />
                    </div>
                    <input
                      className="input pl-11"
                      type="password"
                      placeholder="Create a password"
                      value={form.password}
                      onChange={e => setForm(current => ({ ...current, password: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label text-slate-600">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <FiLock className="text-lg" />
                    </div>
                    <input
                      className="input pl-11"
                      type="password"
                      placeholder="Confirm password"
                      value={form.confirmPassword}
                      onChange={e => setForm(current => ({ ...current, confirmPassword: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={!canSubmit || saving} className="btn-primary w-full py-3.5 text-base font-bold">
                {saving ? 'Creating Parent Account...' : 'Register Parent Account'}
              </button>
            </>
          )}
        </form>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-slate-500">
        <Link to="/login/parent" className="inline-flex items-center gap-2 transition hover:text-primary-600">
          <FiArrowLeft />
          Back to Parent Login
        </Link>
      </div>
    </div>
  );
}
