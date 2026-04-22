import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { PageSpinner, EmptyState } from '../../components/common';
import { FiClock } from '../../components/common/icons';

export default function ParentCheckIn() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = user?.studentRef?._id || user?.studentRef;
    if (!id) { setLoading(false); return; }
    api.get(`/checkin?studentId=${id}&limit=50`)
      .then(r => setRecords(r.data.records))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <PageSpinner />;

  return (
    <div>
      <h1 className="page-title mb-6">Check-In / Out History</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-header">Type</th>
              <th className="table-header">Location</th>
              <th className="table-header">Date & Time</th>
              <th className="table-header">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {records.map(r => (
              <tr key={r._id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <span className={`badge-${r.type === 'check_in' ? 'green' : 'yellow'}`}>
                    {r.type.replace('_', ' ')}
                  </span>
                </td>
                <td className="table-cell capitalize">{r.location}</td>
                <td className="table-cell">
                  {new Date(r.timestamp).toLocaleString('en-IN')}
                </td>
                <td className="table-cell text-gray-500">{r.remarks || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && <EmptyState message="No check-in records" icon={<FiClock />} />}
      </div>
    </div>
  );
}
