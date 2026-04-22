import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiLogOut, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext.jsx';

export default function UnauthorizedPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-50 text-red-500 shadow-inner">
        <FiLock className="text-5xl" />
      </div>
      
      <h1 className="text-3xl font-black text-slate-900 tracking-tight">Access Denied</h1>
      <p className="mt-2 max-w-sm font-medium text-slate-500 leading-relaxed">
        You are currently logged in as <span className="font-bold text-primary-700">{user?.role?.replace('_', ' ')}</span>. 
        You do not have permission to access this specific portal.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="btn-secondary px-8 py-3 flex items-center gap-2"
        >
          <FiArrowLeft /> Go Back
        </button>
        <button 
          onClick={handleLogout}
          className="btn-primary !bg-red-600 hover:!bg-red-700 px-8 py-3 flex items-center gap-2 border-none shadow-lg shadow-red-100"
        >
          <FiLogOut /> Logout to Switch Portal
        </button>
      </div>

      <p className="mt-20 text-[11px] font-bold uppercase tracking-widest text-slate-400">Security Enforcement</p>
    </div>
  );
}
