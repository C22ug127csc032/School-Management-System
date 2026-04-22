import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { EmptyState } from '../../components/common';
import { FiFileText } from '../../components/common/icons';

export default function ParentCirculars() {
  const [circulars, setCirculars] = useState([]);

  useEffect(() => {
    api.get('/parent/circulars').then(r => setCirculars(r.data.circulars));
  }, []);

  const typeColors = {
    circular:     'badge-blue',
    announcement: 'badge-yellow',
    exam_schedule:'badge-red',
    event:        'badge-green',
    holiday:      'badge-gray',
  };

  return (
    <div>
      <h1 className="page-title mb-6">Circulars & Announcements</h1>
      <div className="space-y-4">
        {circulars.map(c => (
          <div key={c._id} className="card">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-800">{c.title}</h3>
              <span className={typeColors[c.type] || 'badge-gray'}>
                {c.type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{c.content}</p>
            <p className="text-xs text-gray-400 mt-2">
              {new Date(c.publishDate).toLocaleDateString('en-IN')}
            </p>
          </div>
        ))}
        {circulars.length === 0 && <EmptyState message="No circulars published" icon={<FiFileText />} />}
      </div>
    </div>
  );
}
