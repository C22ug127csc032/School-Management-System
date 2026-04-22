import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { PageSpinner, StatCard, EmptyState } from '../../components/common';
import { FiCalendar, FiClock, FiCreditCard, FiFileText } from '../../components/common/icons';

export default function ParentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/parent/dashboard')
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;
  const fmt = n => '₹' + (n || 0).toLocaleString('en-IN');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Welcome, {user?.name}!</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Monitoring: <strong>{data?.student?.firstName} {data?.student?.lastName}</strong>
          {' '}— {data?.student?.regNo}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={<FiCreditCard />} label="Total Fee Due"   value={fmt(data?.summary?.totalDue)}      color="red" />
        <StatCard icon={<FiCalendar />} label="Pending Leaves"  value={data?.summary?.pendingLeaves || 0} color="yellow" />
        <StatCard icon={<FiFileText />} label="Fee Records"     value={data?.summary?.totalFees || 0}     color="blue" />
      </div>

      <div className="card">
        <h3 className="section-title">Recent Check-In / Out</h3>
        {data?.checkins?.length === 0 && <EmptyState message="No check-in records" icon={<FiClock />} />}
        {data?.checkins?.map(c => (
          <div key={c._id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
            <div>
              <span className={`badge-${c.type === 'check_in' ? 'green' : 'yellow'} text-xs`}>
                {c.type.replace('_', ' ')}
              </span>
              <span className="text-sm text-gray-500 ml-2 capitalize">{c.location}</span>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(c.timestamp).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="section-title">Latest Circulars</h3>
        {data?.circulars?.map(c => (
          <div key={c._id} className="py-2 border-b border-gray-50 last:border-0">
            <p className="text-sm font-medium text-gray-800">{c.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(c.publishDate).toLocaleDateString('en-IN')}
            </p>
          </div>
        ))}
        {!data?.circulars?.length && <EmptyState message="No circulars" icon={<FiFileText />} />}
      </div>
    </div>
  );
}
