import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiSave } from 'react-icons/fi';
import api from '../../api/axios.js';
import { Field, PageHeader, PageLoader } from '../../components/common/index.jsx';
import { setStoredAcademicYear } from '../../hooks/useAcademicYear.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({});

  useEffect(() => {
    api.get('/settings').then(r => {
      setSettings(r.data.settings);
      setForm(r.data.settings);
    }).catch(() => toast.error('Failed to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const isSuperAdmin = user?.role === 'super_admin';
  const setupChecks = [
    form.schoolName,
    form.schoolCode,
    form.boardName,
    form.schoolPhone,
    form.schoolEmail,
    form.currentAcademicYear,
    Array.isArray(form.workingDays) && form.workingDays.length > 0,
    form.schoolStartTime && form.schoolEndTime,
  ];
  const setupScore = Math.round((setupChecks.filter(Boolean).length / setupChecks.length) * 100);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.put('/settings', form);
      const nextSettings = response.data?.settings || form;
      setSettings(nextSettings);
      setForm(nextSettings);
      setStoredAcademicYear(nextSettings.currentAcademicYear || '');
      toast.success('Settings saved.');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="float-in">
      <PageHeader title={isSuperAdmin ? 'School Setup' : 'Settings'} subtitle={isSuperAdmin ? 'Platform-level setup, identity, and timetable governance for the school workspace' : 'School configuration and preferences'}
        actions={<button onClick={handleSave} disabled={saving} className="btn-primary"><FiSave/>{saving?'Saving...':'Save Settings'}</button>} />

      <div className="campus-panel p-5 space-y-6">
        {isSuperAdmin ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[22px] border border-slate-200 bg-white/85 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Setup Completion</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{setupScore}%</p>
              <p className="mt-1 text-sm text-slate-500">Core school setup fields currently completed.</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/85 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Academic Year</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{form.currentAcademicYear || 'Not set'}</p>
              <p className="mt-1 text-sm text-slate-500">Used across admissions, timetable, and reporting.</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-white/85 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Board & Identity</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{form.boardName || 'Not set'}</p>
              <p className="mt-1 text-sm text-slate-500">{form.schoolCode || 'School code missing'}</p>
            </div>
          </div>
        ) : null}

        <div>
          <p className="section-title">{isSuperAdmin ? 'School Identity' : 'School Information'}</p>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="School Name">
              <input className="input" type="text" placeholder="Sunrise Public School" value={form.schoolName || ''}
                onChange={e => set('schoolName', e.target.value)} />
            </Field>
            <Field label="School Code">
              <input className="input" type="text" placeholder="SPS001" value={form.schoolCode || ''}
                onChange={e => set('schoolCode', e.target.value)} />
            </Field>
            <Field label="Board Name">
              <input className="input" type="text" placeholder="CBSE / State Board" value={form.boardName || ''}
                onChange={e => set('boardName', e.target.value)} />
            </Field>
            <Field label="Affiliation No">
              <input className="input" type="text" placeholder="Affiliation number" value={form.affiliationNo || ''}
                onChange={e => set('affiliationNo', e.target.value)} />
            </Field>
            <Field label="School Phone">
              <input className="input" type="text" placeholder="School phone" value={form.schoolPhone || ''}
                onChange={e => set('schoolPhone', e.target.value)} />
            </Field>
            <Field label="School Email">
              <input className="input" type="email" placeholder="School email" value={form.schoolEmail || ''}
                onChange={e => set('schoolEmail', e.target.value)} />
            </Field>
            <Field label="Current Academic Year">
              <input className="input" type="text" placeholder="2024-25" value={form.currentAcademicYear || ''}
                onChange={e => set('currentAcademicYear', e.target.value)} />
            </Field>
            <Field label="Govt Holiday Calendar URL">
              <input className="input" type="url" placeholder="Google / ICS holiday calendar URL" value={form.governmentHolidayCalendarUrl || ''}
                onChange={e => set('governmentHolidayCalendarUrl', e.target.value)} />
            </Field>
          </div>
          <Field label="School Address">
            <textarea className="input" rows="2" value={form.schoolAddress || ''} onChange={e => set('schoolAddress', e.target.value)} />
          </Field>
        </div>

        <div>
          <p className="section-title">{isSuperAdmin ? 'Academic Timing Rules' : 'Timetable Settings'}</p>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="School Start Time">
              <input className="input" type="time" value={form.schoolStartTime || ''}
                onChange={e => set('schoolStartTime', e.target.value)} />
            </Field>
            <Field label="School End Time">
              <input className="input" type="time" value={form.schoolEndTime || ''}
                onChange={e => set('schoolEndTime', e.target.value)} />
            </Field>
            <Field label="Periods Per Day">
              <input className="input" type="number" value={form.periodsPerDay || ''}
                onChange={e => set('periodsPerDay', Number(e.target.value))} />
            </Field>
            <Field label="Period Duration (mins)">
              <input className="input" type="number" value={form.periodDurationMins || ''}
                onChange={e => set('periodDurationMins', Number(e.target.value))} />
            </Field>
            <Field label="Short Break After Period">
              <input className="input" type="number" value={form.shortBreakAfterPeriod || ''}
                onChange={e => set('shortBreakAfterPeriod', Number(e.target.value))} />
            </Field>
            <Field label="Short Break Duration (mins)">
              <input className="input" type="number" value={form.shortBreakDurationMins || ''}
                onChange={e => set('shortBreakDurationMins', Number(e.target.value))} />
            </Field>
            <Field label="Lunch Break After Period">
              <input className="input" type="number" value={form.lunchBreakAfterPeriod || ''}
                onChange={e => set('lunchBreakAfterPeriod', Number(e.target.value))} />
            </Field>
            <Field label="Lunch Break Duration (mins)">
              <input className="input" type="number" value={form.lunchBreakDurationMins || ''}
                onChange={e => set('lunchBreakDurationMins', Number(e.target.value))} />
            </Field>
          </div>
          <div className="form-group">
            <label className="label">Working Days</label>
            <div className="flex flex-wrap gap-2">
              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                <label key={d} className="flex cursor-pointer items-center gap-1.5 border border-border px-3 py-1.5 text-xs hover:border-primary-400 transition">
                  <input type="checkbox" className="accent-primary-700"
                    checked={(form.workingDays||[]).includes(d)}
                    onChange={e => {
                      const days = form.workingDays || [];
                      set('workingDays', e.target.checked ? [...days, d] : days.filter(x => x !== d));
                    }} />
                  {d}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
