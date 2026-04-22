import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import AuthSplitLayout from '../../components/common/AuthSplitLayout';
import PortalCopyright from '../../components/common/PortalCopyright';
import { SearchableSelect } from '../../components/common';
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheckCircle,
  FiLock,
  FiSearch,
  FiShield,
  FiUser,
} from '../../components/common/icons';
import { useAppSettings } from '../../context/AppSettingsContext';
import { getFirstActiveValue, toSelectOptions } from '../../utils/appSettings';
import { isValidIndianPhone, sanitizePhoneField } from '../../utils/phone';

const STEPS = ['Find Student', 'Verify OTP', 'Create Account'];

export default function ParentRegister() {
  const { getMasterOptions } = useAppSettings();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [studentIdentifier, setStudentIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [course, setCourse] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    relation: 'father',
  });

  const relationOptions = useMemo(
    () => toSelectOptions(getMasterOptions('parent_relations', [
      { value: 'father', label: 'Father' },
      { value: 'mother', label: 'Mother' },
      { value: 'guardian', label: 'Guardian' },
    ])),
    [getMasterOptions]
  );

  useEffect(() => {
    const defaultRelation = getFirstActiveValue(relationOptions, 'father');
    setForm(current => {
      if ((relationOptions || []).some(option => option.value === current.relation)) {
        return current;
      }
      return { ...current, relation: defaultRelation };
    });
  }, [relationOptions]);

  const handleSendOTP = async event => {
    event.preventDefault();
    if (!studentIdentifier.trim()) {
      toast.error('Enter Student ID');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/parent/request-register-otp', {
        studentIdentifier: studentIdentifier.trim().toUpperCase(),
      });
      setMaskedPhone(response.data.maskedPhone);
      setStudentName(response.data.studentName);
      setCourse(response.data.course || '');
      setVerificationToken('');
      toast.success(`OTP sent to ${response.data.maskedPhone}`);
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async event => {
    event.preventDefault();
    if (!otp.trim()) {
      toast.error('Enter OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/parent/verify-register-otp', {
        studentIdentifier: studentIdentifier.trim().toUpperCase(),
        otp: otp.trim(),
      });

      setStudentId(response.data.studentId);
      setVerificationToken(response.data.verificationToken || '');

      const suggestedRelation = response.data.suggestedRelation || (response.data.fatherName || response.data.fatherPhone ? 'father' : 'mother');
      const prefillName = suggestedRelation === 'mother'
        ? (response.data.motherName || response.data.fatherName || '')
        : (response.data.fatherName || response.data.motherName || '');
      const prefillPhone = suggestedRelation === 'mother'
        ? (response.data.motherPhone || response.data.fatherPhone || '')
        : (response.data.fatherPhone || response.data.motherPhone || '');

      setForm(current => ({
        ...current,
        name: prefillName,
        phone: sanitizePhoneField(prefillPhone),
        relation: suggestedRelation,
      }));

      toast.success('OTP verified. Complete your registration.');
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async event => {
    event.preventDefault();
    const phone = sanitizePhoneField(form.phone);

    if (!verificationToken) {
      toast.error('Please verify OTP before registering');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!isValidIndianPhone(phone)) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/parent/register', {
        name: form.name,
        phone,
        email: form.email || undefined,
        password: form.password,
        studentIdentifier: studentIdentifier.trim().toUpperCase(),
        relation: form.relation,
        verificationToken,
      });

      localStorage.setItem('token', response.data.token);
      api.defaults.headers.common.Authorization = `Bearer ${response.data.token}`;
      toast.success('Registered successfully!');
      window.location.href = '/parent';
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const response = await api.post('/parent/request-register-otp', {
        studentIdentifier: studentIdentifier.trim().toUpperCase(),
      });
      setVerificationToken('');
      toast.success(`OTP resent to ${response.data.maskedPhone}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      badge="Parent Registration"
      welcomeTitle="Register"
      welcomeDescription="Create a verified parent account and link it to your child using OTP validation against college records."
      welcomeNote="Registration is allowed only for parents whose phone number is already available in the student master record."
      panelTitle="Create Parent Account"
      panelSubtitle="Follow the verification steps below to activate your parent portal access."
      footer={(
        <div className="space-y-3">
          <p className="text-xs leading-6 text-text-secondary">
            Registration is protected by OTP verification and student master-record matching.
          </p>
          <PortalCopyright variant="full" className="text-left text-text-secondary" />
        </div>
      )}
    >
      <div className="mb-5 flex items-center justify-center gap-2">
        {STEPS.map((item, index) => {
          const stepNumber = index + 1;
          const complete = step > stepNumber;
          const active = step === stepNumber;

          return (
            <React.Fragment key={item}>
              <div className="flex flex-col items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center border text-sm font-semibold ${
                  complete
                    ? 'border-primary-700 bg-primary-700 text-white'
                    : active
                      ? 'border-primary-700 bg-primary-50 text-primary-700'
                      : 'border-slate-300 bg-white text-text-secondary'
                }`}>
                  {complete ? <FiCheckCircle className="text-sm" /> : stepNumber}
                </div>
                <span className={`hidden text-[11px] font-semibold uppercase tracking-[0.08em] sm:block ${
                  active ? 'text-primary-700' : 'text-text-secondary'
                }`}>
                  {item}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <div className={`mb-5 h-px w-8 sm:w-12 ${step > stepNumber ? 'bg-primary-700' : 'bg-slate-300'}`} />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>

      {step === 1 ? (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div className="border border-primary-200 bg-primary-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary-700">Step 1</p>
            <p className="mt-2 text-sm text-text-primary">
              Enter your child&apos;s student ID. You can use roll number or admission number.
            </p>
          </div>

          <div className="flex items-start gap-2 border border-border bg-white px-4 py-3">
            <FiLock className="mt-0.5 shrink-0 text-primary-700" />
            <p className="text-xs leading-6 text-text-secondary">
              OTP is sent only to the parent phone number already saved by the college for the student.
            </p>
          </div>

          <div>
            <label className="label">Student ID</label>
            <input
              className="input text-center font-mono text-base uppercase tracking-[0.18em]"
              placeholder="24BCA001 or ADM2024001"
              value={studentIdentifier}
              onChange={event => setStudentIdentifier(event.target.value.toUpperCase())}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            <span className="inline-flex items-center gap-2">
              <span>{loading ? 'Sending OTP...' : 'Send OTP'}</span>
              {!loading ? <FiArrowRight /> : null}
            </span>
          </button>

          <p className="text-center text-sm text-text-secondary">
            Already registered?{' '}
            <Link to="/parent/login" className="font-medium text-primary-700 hover:underline">
              Login here
            </Link>
          </p>
        </form>
      ) : null}

      {step === 2 ? (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div className="border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">Student Verified</p>
            <p className="mt-2 text-sm font-semibold text-emerald-900">{studentName}</p>
            {course ? <p className="mt-1 text-xs text-emerald-700">{course}</p> : null}
            <p className="mt-1 text-xs text-emerald-700">OTP sent to {maskedPhone}</p>
          </div>

          <div>
            <label className="label">Enter OTP</label>
            <input
              type="text"
              className="input text-center text-2xl font-semibold tracking-[0.45em]"
              placeholder="------"
              maxLength={6}
              value={otp}
              onChange={event => setOtp(event.target.value.replace(/\D/g, ''))}
              required
            />
            <p className="mt-2 text-xs text-text-secondary">
              OTP valid for 10 minutes.{' '}
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="font-medium text-primary-700 hover:underline"
              >
                Resend OTP
              </button>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <span>{loading ? 'Verifying...' : 'Verify OTP'}</span>
              {!loading ? <FiArrowRight /> : null}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStep(1);
              setOtp('');
            }}
            className="w-full text-sm font-medium text-text-secondary transition hover:text-text-primary"
          >
            <span className="inline-flex items-center gap-2">
              <FiArrowLeft />
              <span>Back</span>
            </span>
          </button>
        </form>
      ) : null}

      {step === 3 ? (
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="border border-primary-200 bg-primary-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary-700">Step 3</p>
            <p className="mt-2 text-sm text-text-primary">
              Complete your account details for <strong>{studentName}</strong>.
            </p>
            {studentId ? <p className="mt-1 text-xs text-text-secondary">Student reference verified: {studentId}</p> : null}
          </div>

          <div>
            <label className="label">Full Name</label>
            <input
              className="input"
              placeholder="Your full name"
              value={form.name}
              onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Phone Number</label>
            <input
              type="tel"
              className="input"
              placeholder="Your phone number"
              value={form.phone}
              onChange={event => setForm(current => ({ ...current, phone: sanitizePhoneField(event.target.value) }))}
              inputMode="numeric"
              maxLength={10}
              required
            />
          </div>

          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              className="input"
              placeholder="Optional email address"
              value={form.email}
              onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
            />
          </div>

          <div>
            <label className="label">Relation</label>
            <SearchableSelect
              value={form.relation}
              onChange={relation => setForm(current => ({ ...current, relation }))}
              placeholder="Select relation"
              searchPlaceholder="Search relations..."
              options={relationOptions}
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Confirm Password</label>
            <input
              type="password"
              className="input"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={event => setForm(current => ({ ...current, confirmPassword: event.target.value }))}
              required
            />
            {form.confirmPassword ? (
              <p className={`mt-1 text-xs ${form.password === form.confirmPassword ? 'text-emerald-700' : 'text-red-700'}`}>
                {form.password === form.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={loading || form.password !== form.confirmPassword || form.password.length < 6}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              {!loading ? <FiCheckCircle /> : null}
            </span>
          </button>

          <div className="flex items-start gap-2 border border-border bg-white px-4 py-3">
            <FiShield className="mt-0.5 shrink-0 text-primary-700" />
            <p className="text-xs leading-6 text-text-secondary">
              Registration remains tied to the verified student ID and OTP session token.
            </p>
          </div>
        </form>
      ) : null}
    </AuthSplitLayout>
  );
}
