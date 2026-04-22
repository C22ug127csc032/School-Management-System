import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { StatusBadge, EmptyState, SearchableSelect } from '../../components/common';
import { useAppSettings } from '../../context/AppSettingsContext';
import toast from 'react-hot-toast';
import { FiCalendar } from '../../components/common/icons';
import { getFirstActiveValue, toSelectOptions } from '../../utils/appSettings';

export default function ParentLeave() {
  const { getMasterOptions } = useAppSettings();
  const leaveTypeOptions = toSelectOptions(getMasterOptions('leave_types', [
    { value: 'sick', label: 'Sick' },
    { value: 'personal', label: 'Personal' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'other', label: 'Other' },
  ]));
  const [leaves, setLeaves] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    leaveType: getFirstActiveValue(leaveTypeOptions, 'personal'), fromDate: '', toDate: '', reason: '',
  });

  const fetchLeaves = () =>
    api.get('/parent/leave').then(r => setLeaves(r.data.leaves));

  useEffect(() => { fetchLeaves(); }, []);

  const apply = async e => {
    e.preventDefault();
    try {
      await api.post('/parent/leave', form);
      toast.success('Leave applied successfully');
      setShow(false);
      setForm({ leaveType: getFirstActiveValue(leaveTypeOptions, 'personal'), fromDate: '', toDate: '', reason: '' });
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply leave');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">Leave Requests</h1>
        <button onClick={() => setShow(true)} className="btn-primary">+ Apply Leave</button>
      </div>

      <div className="space-y-3">
        {leaves.map(l => (
          <div key={l._id} className="card flex flex-wrap justify-between items-start gap-3">
            <div>
              <p className="font-medium capitalize">{l.leaveType} Leave</p>
              <p className="text-sm text-gray-500">
                {new Date(l.fromDate).toLocaleDateString('en-IN')} –{' '}
                {new Date(l.toDate).toLocaleDateString('en-IN')} ({l.noOfDays} days)
              </p>
              <p className="text-sm text-gray-600 mt-1">{l.reason}</p>
              {l.remarks && (
                <p className="text-xs text-gray-400 mt-1">Remarks: {l.remarks}</p>
              )}
            </div>
            <StatusBadge status={l.status} />
          </div>
        ))}
        {leaves.length === 0 && <EmptyState message="No leave requests" icon={<FiCalendar />} />}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Apply Leave for Child</h3>
            <form onSubmit={apply} className="space-y-3">
              <div>
                <label className="label">Leave Type</label>
                <SearchableSelect
                  value={form.leaveType}
                  onChange={leaveType => setForm(f => ({ ...f, leaveType }))}
                  placeholder="Select leave type"
                  searchPlaceholder="Search leave types..."
                  options={leaveTypeOptions}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">From Date *</label>
                  <input type="date" className="input" value={form.fromDate}
                    onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">To Date *</label>
                  <input type="date" className="input" value={form.toDate}
                    onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="label">Reason *</label>
                <textarea className="input" rows={3} value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required />
              </div>
              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShow(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">Apply Leave</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
