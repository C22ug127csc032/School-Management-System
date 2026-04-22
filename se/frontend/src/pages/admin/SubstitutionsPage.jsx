import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiZap } from 'react-icons/fi';
import api from '../../api/axios.js';
import { PageHeader, DataTable, Modal, SearchableSelect, StatusBadge } from '../../components/common/index.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import { getIndianDateInputValue } from '../../utils/dateTime.js';

export default function SubstitutionsPage() {
  const academicYear = useAcademicYear();
  const [subs,      setSubs]      = useState([]);
  const [today,     setToday]     = useState([]);
  const [teachers,  setTeachers]  = useState([]);
  const [periods,   setPeriods]   = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [suggests,  setSuggests]  = useState([]);
  const [loadingSug,setLoadingSug]= useState(false);
  const [date,      setDate]      = useState(getIndianDateInputValue());

  const [form, setForm] = useState({
    date: getIndianDateInputValue(),
    periodId: '', classId: '', absentTeacherId: '', substituteTeacherId: '',
    subjectId: '', notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subsRes, todayRes] = await Promise.all([
        api.get('/substitutions', { params: { date, academicYear } }),
        api.get('/substitutions/today', { params: { academicYear } }),
      ]);
      setSubs(subsRes.data.data);
      setToday(todayRes.data.data);
    } catch { toast.error('Failed to load.'); }
    finally { setLoading(false); }
  }, [date, academicYear]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([
      api.get('/teachers', { params: { limit: 200 } }),
      api.get('/periods', { params: { academicYear } }),
      api.get('/classes', { params: { academicYear } }),
    ]).then(([tr, pr, cr]) => {
      setTeachers(tr.data.data);
      setPeriods(pr.data.data.filter(p => !p.isBreak));
      setClasses(cr.data.data);
    }).catch(() => {});
  }, [academicYear]);

  const loadSuggestions = async () => {
    if (!form.absentTeacherId || !form.periodId || !form.date || !form.classId) return;
    setLoadingSug(true);
    try {
      const r = await api.get('/substitutions/suggest', {
        params: { absentTeacherId: form.absentTeacherId, periodId: form.periodId, date: form.date, classId: form.classId, academicYear },
      });
      setSuggests(r.data.data);
    } catch { setSuggests([]); }
    finally { setLoadingSug(false); }
  };

  const handleSave = async () => {
    if (!form.periodId || !form.classId || !form.absentTeacherId || !form.substituteTeacherId)
      return toast.error('All required fields must be filled.');
    setSaving(true);
    try {
      await api.post('/substitutions', { ...form, academicYear });
      toast.success('Substitution assigned.');
      setModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Cancel this substitution?')) return;
    try { await api.delete(`/substitutions/${id}`); toast.success('Cancelled.'); load(); }
    catch (err) { toast.error('Failed.'); }
  };

  const teacherOpts = teachers.map(t => ({ value: t._id, label: `${t.firstName} ${t.lastName} [${t.employeeId}]` }));
  const periodOpts  = periods.map(p => ({ value: p._id, label: `${p.name} (${p.startTime}–${p.endTime})` }));
  const classOpts   = classes.map(c => ({ value: c._id, label: c.displayName || `Grade ${c.grade}-${c.section}` }));

  const columns = [
    { key: 'period', label: 'Period', render: s => s.period ? `${s.period.name} (${s.period.startTime})` : '—' },
    { key: 'class',  label: 'Class',  render: s => s.class?.displayName || '—' },
    { key: 'absent', label: 'Absent Teacher', render: s => s.absentTeacher ? `${s.absentTeacher.firstName} ${s.absentTeacher.lastName}` : '—' },
    { key: 'sub',    label: 'Substitute',     render: s => s.substituteTeacher ? <span className="font-semibold text-emerald-700">{s.substituteTeacher.firstName} {s.substituteTeacher.lastName}</span> : '—' },
    { key: 'subject',label: 'Subject',        render: s => s.subject?.name || '—' },
    { key: 'status', label: 'Status',         render: s => <StatusBadge status={s.status} /> },
    { key: 'actions',label: '',               render: s => <button onClick={() => handleDelete(s._id)} className="btn-icon btn-sm text-red-600"><FiTrash2/></button> },
  ];

  return (
    <div className="float-in">
      <PageHeader title="Substitutions" subtitle="Manage teacher substitutions"
        actions={<button onClick={() => setModal(true)} className="btn-primary"><FiPlus/>Assign Substitution</button>} />

      {/* Today summary */}
      {today.length > 0 && (
        <div className="campus-panel mb-4 p-4">
          <p className="section-title">Today's Substitutions ({today.length})</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {today.map(s => (
              <div key={s._id} className="border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-bold text-emerald-700">{s.period?.name} — {s.class?.displayName}</p>
                <p className="text-xs text-text-secondary">Absent: {s.absentTeacher?.firstName} {s.absentTeacher?.lastName}</p>
                <p className="text-xs font-semibold text-emerald-600">Sub: {s.substituteTeacher?.firstName} {s.substituteTeacher?.lastName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="campus-panel mb-4 p-4">
        <div className="flex items-center gap-3">
          <div><label className="label">Filter by Date</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="campus-panel overflow-hidden">
        <DataTable columns={columns} data={subs} loading={loading} emptyMessage="No substitutions for this date." />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Assign Substitution" size="lg"
        footer={<><button onClick={() => setModal(false)} className="btn-secondary btn-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">{saving ? 'Saving...' : 'Assign'}</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group col-span-2"><label className="label">Date *</label>
              <input type="date" className="input" value={form.date}
                onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div>
            <div className="form-group"><label className="label">Period *</label>
              <SearchableSelect options={periodOpts} value={form.periodId}
                onChange={v => setForm(f => ({...f, periodId: v}))} placeholder="Select period..." /></div>
            <div className="form-group"><label className="label">Class *</label>
              <SearchableSelect options={classOpts} value={form.classId}
                onChange={v => setForm(f => ({...f, classId: v}))} placeholder="Select class..." /></div>
          </div>

          <div className="form-group"><label className="label">Absent Teacher *</label>
            <SearchableSelect options={teacherOpts} value={form.absentTeacherId}
              onChange={v => setForm(f => ({...f, absentTeacherId: v}))} placeholder="Select absent teacher..." /></div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Substitute Teacher *</p>
            <button type="button" onClick={loadSuggestions} disabled={loadingSug}
              className="btn-secondary btn-sm">
              <FiZap/>{loadingSug ? 'Finding...' : 'Suggest Free Teachers'}
            </button>
          </div>

          {suggests.length > 0 && (
            <div className="border border-border bg-slate-50 p-2">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Suggested (free in this period)</p>
              <div className="flex flex-wrap gap-1">
                {suggests.map(t => (
                  <button key={t._id} type="button"
                    onClick={() => setForm(f => ({...f, substituteTeacherId: t._id}))}
                    className={`border px-2 py-1 text-xs transition ${form.substituteTeacherId === t._id ? 'border-primary-700 bg-primary-700 text-white' : 'border-border bg-white hover:border-primary-400'}`}>
                    {t.firstName} {t.lastName}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group"><label className="label">Or manually select substitute</label>
            <SearchableSelect options={teacherOpts} value={form.substituteTeacherId}
              onChange={v => setForm(f => ({...f, substituteTeacherId: v}))} placeholder="Select substitute teacher..." /></div>

          <div className="form-group"><label className="label">Notes</label>
            <textarea className="input" rows="2" value={form.notes}
              onChange={e => setForm(f => ({...f, notes: e.target.value}))} /></div>
        </div>
      </Modal>
    </div>
  );
}
