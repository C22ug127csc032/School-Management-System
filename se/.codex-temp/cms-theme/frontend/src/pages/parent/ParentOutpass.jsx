import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { StatusBadge, EmptyState } from '../../components/common';
import toast from 'react-hot-toast';
import { FiLogOut } from '../../components/common/icons';

export default function ParentOutpass() {
  const [list, setList] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    exitDate: '', exitTime: '', expectedReturn: '', reason: '', destination: '',
  });

  const fetchOutpasses = () =>
    api.get('/parent/outpass').then(r => setList(r.data.outpasses));

  useEffect(() => { fetchOutpasses(); }, []);

  const apply = async e => {
    e.preventDefault();
    try {
      await api.post('/parent/outpass', form);
      toast.success('Outpass requested successfully');
      setShow(false);
      setForm({ exitDate: '', exitTime: '', expectedReturn: '', reason: '', destination: '' });
      fetchOutpasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request outpass');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">Outpass Requests</h1>
        <button onClick={() => setShow(true)} className="btn-primary">+ Request Outpass</button>
      </div>

      <div className="space-y-3">
        {list.map(o => (
          <div key={o._id} className="card flex flex-wrap justify-between items-start gap-3">
            <div>
              <p className="font-medium">{o.reason}</p>
              <p className="text-sm text-gray-500">
                Exit: {new Date(o.exitDate).toLocaleDateString('en-IN')} ·{' '}
                Return: {new Date(o.expectedReturn).toLocaleDateString('en-IN')}
              </p>
              {o.destination && (
                <p className="text-sm text-gray-400">Destination: {o.destination}</p>
              )}
              {o.remarks && (
                <p className="text-xs text-gray-400">Remarks: {o.remarks}</p>
              )}
            </div>
            <StatusBadge status={o.status} />
          </div>
        ))}
        {list.length === 0 && <EmptyState message="No outpass requests" icon={<FiLogOut />} />}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Request Outpass for Child</h3>
            <form onSubmit={apply} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Exit Date *</label>
                  <input type="date" className="input" value={form.exitDate}
                    onChange={e => setForm(f => ({ ...f, exitDate: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Exit Time</label>
                  <input type="time" className="input" value={form.exitTime}
                    onChange={e => setForm(f => ({ ...f, exitTime: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Expected Return *</label>
                  <input type="date" className="input" value={form.expectedReturn}
                    onChange={e => setForm(f => ({ ...f, expectedReturn: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Destination</label>
                  <input className="input" placeholder="Where are they going?"
                    value={form.destination}
                    onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Reason *</label>
                <textarea className="input" rows={2} value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required />
              </div>
              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShow(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">Request Outpass</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
