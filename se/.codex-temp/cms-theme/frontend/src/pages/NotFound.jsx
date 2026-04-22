import React from 'react';
import { Link } from 'react-router-dom';
import { FiAlertOctagon } from '../components/common/icons';

export default function NotFound() {
  return (
    <div className="public-page">
      <div className="public-panel flex min-h-[70vh] max-w-2xl flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center border border-red-200 bg-red-50 text-red-700">
          <FiAlertOctagon className="text-4xl" />
        </div>
        <p className="institution-tag">404 Error</p>
        <h1 className="mt-4 text-3xl font-semibold text-text-primary sm:text-4xl">Page Not Found</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
          The page you entered does not exist or may have been moved. Please return to the student login page and continue from there.
        </p>
        <Link
          to="/login"
          className="btn-primary mt-6 px-6 py-3"
        >
          Go to Home Page
        </Link>
      </div>
    </div>
  );
}
