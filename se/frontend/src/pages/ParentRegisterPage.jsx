import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiLock, FiUser } from 'react-icons/fi';
import api from '../api/axios.js';
import AuthSplitLayout from '../components/common/AuthSplitLayout.jsx';

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

  const canSubmit = useMemo(() => Boolean(
    preview &&
    form.password.trim() &&
    form.confirmPassword.trim() &&
    (preview.parent.email || form.email.trim() || form.phone.trim())
  ), [preview, form.password, form.confirmPassword, form.email, form.phone]);

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

  const handleRegister = async event => {
    event.preventDefault();
    if (!preview) {
      await handleFetch(form.admissionNo);
      toast.error('Wait for the student details to load first.');
      return;
    }
    if (!preview.parent.email && !form.email.trim()) {
      toast.error('Enter an email address if it was not provided during admission.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

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
    <AuthSplitLayout
      badge="Parent Registration"
      panelTitle="Create Parent Account"
      panelSubtitle="Link the parent portal with an existing student admission record and complete account setup."
      welcomeTitle="Register"
      welcomeDescription="This registration screen now follows the CMS frontend theme while keeping your School ERP registration flow unchanged."
      welcomeNote="Enter the student admission number first. The system will fetch saved parent or guardian details from the admission record."
      footer={(
        <div className="space-y-3">
          <Link to="/login/parent" className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:underline">
            <FiArrowLeft />
            Back to Parent Login
          </Link>
          <p className="text-xs leading-6 text-text-secondary">
            Registration access is restricted to students already present in the School ERP admission records.
          </p>
        </div>
      )}
    >
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="border border-primary-200 bg-primary-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-700">Step 1</p>
          <p className="mt-2 text-sm text-text-primary">
            Enter the student admission number and load the saved parent details.
          </p>
        </div>

        <div>
          <label className="label">Student Admission Number</label>
          <div className="flex gap-3">
            <input
              className="input"
              type="text"
              placeholder="Enter admission number"
              value={form.admissionNo}
              onChange={event => {
                const admissionNo = event.target.value.toUpperCase();
                setPreview(null);
                setPreviewError('');
                resetFetchedFields(admissionNo);
              }}
              onKeyDown={async event => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                await handleFetch(event.currentTarget.value);
              }}
            />
            <button
              type="button"
              onClick={() => handleFetch(form.admissionNo)}
              disabled={loadingPreview || !form.admissionNo.trim()}
              className="btn-primary h-11 w-11 shrink-0 px-0"
              aria-label="Fetch admission details"
            >
              <FiArrowRight className="text-base" />
            </button>
          </div>
        </div>

        {loadingPreview ? (
          <div className="border border-primary-200 bg-primary-50 px-4 py-3">
            <p className="text-sm font-semibold text-primary-700">Fetching admission details...</p>
          </div>
        ) : null}

        {previewError ? (
          <div className="border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-700">{previewError}</p>
          </div>
        ) : null}

        {preview && !loadingPreview ? (
          <div className="border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="mb-3 flex items-center gap-2 text-emerald-700">
              <FiCheckCircle />
              <p className="text-sm font-semibold">Student linked successfully</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Student</p>
                <p className="mt-1 font-semibold text-text-primary">{preview.student.name}</p>
                <p className="text-sm text-text-secondary">Admission No: {preview.student.admissionNo}</p>
                <p className="text-sm text-text-secondary">Class: {preview.student.grade || '-'} {preview.student.section || ''}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Fetched Contact</p>
                <p className="mt-1 font-semibold text-text-primary">{getRelationMessage(preview.parent.relation)}</p>
                <p className="text-sm text-text-secondary">Status: {preview.student.status?.replace(/_/g, ' ')}</p>
              </div>
            </div>
          </div>
        ) : null}

        {preview ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-group">
                <label className="label">{form.relation === 'guardian' ? 'Guardian Name' : 'Parent Name'}</label>
                <input className="input bg-slate-50" type="text" value={form.parentName} readOnly />
              </div>
              <div className="form-group">
                <label className="label">Relation</label>
                <input className="input bg-slate-50 capitalize" type="text" value={form.relation} readOnly />
              </div>
              <div className="form-group">
                <label className="label">Phone</label>
                <input className="input bg-slate-50" type="text" value={form.phone} readOnly />
              </div>
              <div className="form-group">
                <label className="label">Email</label>
                <input
                  className={`input ${preview.parent.email ? 'bg-slate-50' : ''}`}
                  type="email"
                  value={form.email}
                  placeholder={preview.parent.email ? '' : 'Enter parent email'}
                  readOnly={Boolean(preview.parent.email)}
                  onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-group">
                <label className="label">Password</label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                    <FiLock className="text-base" />
                  </div>
                  <input
                    className="input pl-10"
                    type="password"
                    placeholder="Create a password"
                    value={form.password}
                    onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                    <FiLock className="text-base" />
                  </div>
                  <input
                    className="input pl-10"
                    type="password"
                    placeholder="Confirm password"
                    value={form.confirmPassword}
                    onChange={event => setForm(current => ({ ...current, confirmPassword: event.target.value }))}
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={!canSubmit || saving} className="btn-primary w-full py-3">
              {saving ? 'Creating Parent Account...' : 'Register Parent Account'}
            </button>
          </>
        ) : null}
      </form>
    </AuthSplitLayout>
  );
}
