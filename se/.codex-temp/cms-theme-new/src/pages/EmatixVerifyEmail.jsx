import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import AuthSplitLayout from '../components/common/AuthSplitLayout';
import PortalCopyright from '../components/common/PortalCopyright';

export default function EmatixVerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your institution email...');
  const [institutionPortalKey, setInstitutionPortalKey] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const hasRequestedRef = useRef(false);
  const institutionId = searchParams.get('institution') || '';
  const token = searchParams.get('token') || '';

  useEffect(() => {
    if (hasRequestedRef.current) return;

    const verify = async () => {
      try {
        const response = await api.get('/saas/verify-email', {
          params: {
            institution: institutionId,
            token,
          },
        });
        hasRequestedRef.current = true;
        setStatus('success');
        setMessage(response.data?.message || 'Email verified successfully.');
        setInstitutionPortalKey(response.data?.institution?.portalKey || response.data?.institution?.slug || '');
        setPhoneVerified(Boolean(response.data?.onboarding?.phoneVerified));
      } catch (error) {
        hasRequestedRef.current = true;
        setStatus('error');
        setMessage(error.response?.data?.message || 'Email verification failed.');
      }
    };

    if (!institutionId || !token) {
      hasRequestedRef.current = true;
      setStatus('error');
      setMessage('Verification link is incomplete.');
      return;
    }

    verify();
  }, [institutionId, token]);

  return (
    <AuthSplitLayout
      badge="Ematix Verification"
      welcomeTitle="Verify Email"
      welcomeDescription="We’re confirming your institution email so the trial can move forward safely."
      welcomeNote="Once phone and email are both verified, the Ematix trial will activate."
      panelTitle={status === 'loading' ? 'Checking verification' : status === 'success' ? 'Email verified' : 'Verification failed'}
      panelSubtitle={message}
      footer={<PortalCopyright variant="full" className="text-text-secondary" />}
    >
      <div className={`border px-4 py-4 text-sm ${
        status === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : status === 'error'
            ? 'border-red-200 bg-red-50 text-red-800'
            : 'border-primary-200 bg-primary-50 text-primary-800'
      }`}
      >
        {message}
      </div>
      <div className="mt-4">
        {status === 'success' && institutionPortalKey && phoneVerified ? (
          <Link to={`/${institutionPortalKey}/admin/login`} className="btn-primary inline-flex px-5 py-3">
            Go to Institution Login
          </Link>
        ) : (
          <Link to="/trial" className="btn-primary inline-flex px-5 py-3">
            Back to Trial Setup
          </Link>
        )}
      </div>
    </AuthSplitLayout>
  );
}
