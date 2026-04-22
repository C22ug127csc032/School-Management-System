import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiZap, FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';
import api from '../../api/axios.js';
import { PageHeader, DataTable, Modal } from '../../components/common/index.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';

export default function PeriodsPage() {
  const academicYear = useAcademicYear();
  const [periods,  setPeriods]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [genModal, setGenModal] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [saving,   setSaving]   = useState(false);

  const [genForm, setGenForm] = useState({
    academicYear,
    schoolStartTime: '08:30', schoolEndTime: '15:30',
    periodsPerDay: 8, periodDurationMins: 45,
    shortBreakAfterPeriod: 2, shortBreakDurationMins: 10,
    lunchBreakAfterPeriod: 5, lunchBreakDurationMins: 30,
  });
  const [addForm, setAddForm] = useState({ periodNo:'', name:'', startTime:'', endTime:'', type:'teaching', isBreak:false });
  const [editForm, setEditForm] = useState({ id:'', periodNo:'', name:'', startTime:'', endTime:'', type:'teaching', isBreak:false });

  useEffect(() => {
    setGenForm(current => current.academicYear === academicYear ? current : { ...current, academicYear });
  }, [academicYear]);

  const load = () => {
    setLoading(true);
    api.get('/periods', { params: { academicYear } })
      .then(r => setPeriods(r.data.data))
      .catch(() => toast.error('Failed to load.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [academicYear]);

  const handleGenerate = async () => {
    setSaving(true);
    try {
      const r = await api.post('/periods/generate', genForm);
      toast.success(r.data.message);
      setGenModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleAdd = async () => {
    const parsedPeriodNo = Number(addForm.periodNo);
    const periodNoMissing = addForm.periodNo === '' || Number.isNaN(parsedPeriodNo);
    if (periodNoMissing || !addForm.name.trim() || !addForm.startTime || !addForm.endTime)
      return toast.error('All fields required.');
    if (!Number.isInteger(parsedPeriodNo) || parsedPeriodNo < 0)
      return toast.error('Period number must be 0 or greater.');
    if (periods.some(period => period.isActive !== false && period.periodNo === parsedPeriodNo))
      return toast.error(`Period ${parsedPeriodNo} already exists.`);
    setSaving(true);
    try {
      await api.post('/periods', { ...addForm, periodNo: parsedPeriodNo, name: addForm.name.trim(), academicYear });
      toast.success('Period added.');
      setAddModal(false);
      setAddForm({ periodNo:'', name:'', startTime:'', endTime:'', type:'teaching', isBreak:false });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const openEditModal = (period) => {
    setEditForm({
      id: period._id,
      periodNo: String(period.periodNo ?? ''),
      name: period.name || '',
      startTime: period.startTime || '',
      endTime: period.endTime || '',
      type: period.type || 'teaching',
      isBreak: Boolean(period.isBreak),
    });
    setEditModal(true);
  };

  const handleEdit = async () => {
    const parsedPeriodNo = Number(editForm.periodNo);
    const periodNoMissing = editForm.periodNo === '' || Number.isNaN(parsedPeriodNo);
    if (periodNoMissing || !editForm.name.trim() || !editForm.startTime || !editForm.endTime)
      return toast.error('All fields required.');
    if (!Number.isInteger(parsedPeriodNo) || parsedPeriodNo < 0)
      return toast.error('Period number must be 0 or greater.');
    if (periods.some(period => period._id !== editForm.id && period.isActive !== false && period.periodNo === parsedPeriodNo))
      return toast.error(`Period ${parsedPeriodNo} already exists.`);

    setSaving(true);
    try {
      await api.put(`/periods/${editForm.id}`, {
        periodNo: parsedPeriodNo,
        name: editForm.name.trim(),
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        type: editForm.type,
        isBreak: editForm.isBreak,
      });
      toast.success('Period updated.');
      setEditModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this period?')) return;
    try { await api.delete(`/periods/${id}`); toast.success('Period removed.'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
  };

  const columns = [
    { key: 'no',    label: '#',     render: p => <span className="font-mono font-bold">{p.periodNo}</span> },
    { key: 'name',  label: 'Name',  render: p => p.isBreak ? <span className="badge-yellow">{p.name}</span> : p.name },
    { key: 'start', label: 'Start', render: p => p.startTime },
    { key: 'end',   label: 'End',   render: p => p.endTime },
    { key: 'type',  label: 'Type',  render: p => <span className={p.isBreak ? 'badge-yellow' : 'badge-blue'}>{p.type?.replace(/_/g,' ')}</span> },
    { key: 'actions', label: '', render: p => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEditModal(p)} className="btn-icon btn-sm text-primary-700"><FiEdit2/></button>
        <button onClick={() => handleDelete(p._id)} className="btn-icon btn-sm text-red-600"><FiTrash2/></button>
      </div>
    )},
  ];

  return (
    <div className="float-in">
      <PageHeader title="Period Settings" subtitle={`${periods.length} periods configured for ${academicYear}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setAddModal(true)} className="btn-secondary"><FiPlus/>Add Period</button>
            <button onClick={() => setGenModal(true)} className="btn-primary"><FiZap/>Auto-Generate</button>
          </div>
        }
      />

      <div className="campus-panel overflow-hidden">
        <DataTable columns={columns} data={periods} loading={loading} emptyMessage="No periods. Click 'Auto-Generate' to create them." />
      </div>

      {/* Auto-Generate Modal */}
      <Modal open={genModal} onClose={() => setGenModal(false)} title="Auto-Generate Periods"
        footer={<><button onClick={() => setGenModal(false)} className="btn-secondary btn-sm">Cancel</button>
          <button onClick={handleGenerate} disabled={saving} className="btn-primary btn-sm">{saving ? 'Generating...' : 'Generate'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label:'School Start Time', key:'schoolStartTime', type:'time' },
            { label:'School End Time',   key:'schoolEndTime',   type:'time' },
            { label:'Periods Per Day',   key:'periodsPerDay',   type:'number' },
            { label:'Period Duration (mins)', key:'periodDurationMins', type:'number' },
            { label:'Short Break After Period', key:'shortBreakAfterPeriod', type:'number' },
            { label:'Short Break Duration (mins)', key:'shortBreakDurationMins', type:'number' },
            { label:'Lunch Break After Period', key:'lunchBreakAfterPeriod', type:'number' },
            { label:'Lunch Break Duration (mins)', key:'lunchBreakDurationMins', type:'number' },
          ].map(f => (
            <div key={f.key} className="form-group">
              <label className="label">{f.label}</label>
              <input className="input" type={f.type} value={genForm[f.key]}
                onChange={e => setGenForm(g => ({ ...g, [f.key]: f.type==='number' ? Number(e.target.value) : e.target.value }))} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-amber-600 border border-amber-200 bg-amber-50 p-2">
          Warning: This will overwrite existing periods for {academicYear}.
        </p>
      </Modal>

      {/* Manual Add Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Period"
        footer={<><button onClick={() => setAddModal(false)} className="btn-secondary btn-sm">Cancel</button>
          <button onClick={handleAdd} disabled={saving} className="btn-primary btn-sm">{saving ? 'Saving...' : 'Add'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group"><label className="label">Period No *</label>
            <input type="number" min="0" step="1" className="input" value={addForm.periodNo}
              onChange={e => setAddForm(f => ({...f, periodNo: e.target.value}))} /></div>
          <div className="form-group"><label className="label">Name *</label>
            <input className="input" placeholder="Period 1 / Lunch Break" value={addForm.name}
              onChange={e => setAddForm(f => ({...f, name: e.target.value}))} /></div>
          <div className="form-group"><label className="label">Start Time *</label>
            <input type="time" className="input" value={addForm.startTime}
              onChange={e => setAddForm(f => ({...f, startTime: e.target.value}))} /></div>
          <div className="form-group"><label className="label">End Time *</label>
            <input type="time" className="input" value={addForm.endTime}
              onChange={e => setAddForm(f => ({...f, endTime: e.target.value}))} /></div>
          <div className="form-group"><label className="label">Type</label>
            <select className="input" value={addForm.type} onChange={e => setAddForm(f => ({...f, type: e.target.value}))}>
              {['teaching','short_break','lunch_break','assembly','activity'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
            </select></div>
          <div className="form-group flex items-end pb-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={addForm.isBreak}
                onChange={e => setAddForm(f => ({...f, isBreak: e.target.checked}))} className="accent-primary-700" />
              Is Break Period
            </label>
          </div>
        </div>
      </Modal>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Period"
        footer={<><button onClick={() => setEditModal(false)} className="btn-secondary btn-sm">Cancel</button>
          <button onClick={handleEdit} disabled={saving} className="btn-primary btn-sm">{saving ? 'Saving...' : 'Update'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group"><label className="label">Period No *</label>
            <input type="number" min="0" step="1" className="input" value={editForm.periodNo}
              onChange={e => setEditForm(f => ({...f, periodNo: e.target.value}))} /></div>
          <div className="form-group"><label className="label">Name *</label>
            <input className="input" value={editForm.name}
              onChange={e => setEditForm(f => ({...f, name: e.target.value}))} /></div>
          <div className="form-group"><label className="label">Start Time *</label>
            <input type="time" className="input" value={editForm.startTime}
              onChange={e => setEditForm(f => ({...f, startTime: e.target.value}))} /></div>
          <div className="form-group"><label className="label">End Time *</label>
            <input type="time" className="input" value={editForm.endTime}
              onChange={e => setEditForm(f => ({...f, endTime: e.target.value}))} /></div>
          <div className="form-group"><label className="label">Type</label>
            <select className="input" value={editForm.type} onChange={e => setEditForm(f => ({...f, type: e.target.value}))}>
              {['teaching','short_break','lunch_break','assembly','activity'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
            </select></div>
          <div className="form-group flex items-end pb-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={editForm.isBreak}
                onChange={e => setEditForm(f => ({...f, isBreak: e.target.checked}))} className="accent-primary-700" />
              Is Break Period
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
