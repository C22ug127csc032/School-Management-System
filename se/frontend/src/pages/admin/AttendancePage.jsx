// AttendancePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiEdit2, FiSave } from 'react-icons/fi';
import api from '../../api/axios.js';
import { PageHeader, SearchableSelect, PageLoader } from '../../components/common/index.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import { getIndianDateInputValue } from '../../utils/dateTime.js';
import useTeacherScope from '../../hooks/useTeacherScope.js';

export function AttendancePage() {
  const academicYear = useAcademicYear();
  const { isTeacherRole, teacherId, classTeacherOf } = useTeacherScope();
  const [classes,  setClasses]  = useState([]);
  const [students, setStudents] = useState([]);
  const [entries,  setEntries]  = useState({});
  const [selClass, setSelClass] = useState('');
  const [date,     setDate]     = useState(getIndianDateInputValue());
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [hasExistingRecord, setHasExistingRecord] = useState(false);
  const [editMode, setEditMode] = useState(true);
  const [tab,      setTab]      = useState('mark'); // 'mark' or 'history'
  const [history,  setHistory]  = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    api.get('/classes', {
      params: isTeacherRole
        ? { academicYear, classTeacherId: teacherId || '__none__' }
        : { academicYear },
    }).then(r => setClasses(r.data.data)).catch(() => {});
  }, [academicYear, isTeacherRole, teacherId]);

  useEffect(() => {
    setSelClass(isTeacherRole ? (classTeacherOf || '') : '');
    setStudents([]);
    setEntries({});
  }, [academicYear, isTeacherRole, classTeacherOf]);

  const loadStudents = useCallback(async () => {
    if (!selClass) return;
    setLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        api.get('/students', { params: { classId: selClass, status: 'active', limit: 100, academicYear } }),
        api.get('/attendance', { params: { classId: selClass, date, academicYear } }),
      ]);
      const studs = sRes.data.data;
      setStudents(studs);
      const existing = aRes.data.data[0];
      const init = {};
      studs.forEach(s => {
        const e = existing?.entries?.find(en => String(en.student?._id || en.student) === String(s._id));
        init[s._id] = e?.status || 'present';
      });
      setEntries(init);
      setHasExistingRecord(Boolean(existing));
      setEditMode(!existing);
    } catch { toast.error('Failed to load students.'); }
    finally { setLoading(false); }
  }, [selClass, date, academicYear]);

  const loadHistory = useCallback(async () => {
    if (!selClass) return;
    setHistLoading(true);
    try {
      const now = new Date();
      const res = await api.get('/attendance', { 
        params: { 
          classId: selClass, 
          month: now.getMonth() + 1, 
          year: now.getFullYear(),
          academicYear 
        } 
      });
      
      const records = res.data.data;
      const stats = {};
      
      // Initialize stats for current class students
      students.forEach(s => {
        stats[s._id] = { name: `${s.firstName} ${s.lastName}`, roll: s.rollNo, present: 0, absent: 0, late: 0, total: 0 };
      });

      records.forEach(rec => {
        rec.entries.forEach(entry => {
          const sid = entry.student?._id || entry.student;
          if (stats[sid]) {
            stats[sid].total++;
            if (entry.status === 'present') stats[sid].present++;
            else if (entry.status === 'absent') stats[sid].absent++;
            else if (entry.status === 'late') stats[sid].late++;
          }
        });
      });

      setHistory(Object.values(stats));
    } catch { toast.error('Failed to load history.'); }
    finally { setHistLoading(false); }
  }, [selClass, academicYear, students]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]);

  useEffect(() => {
    if (!selClass) return;

    // Only auto-reset if classes have been loaded and the current selection is NOT in them
    if (classes.length > 0 && !classes.some(item => item._id === selClass)) {
      setSelClass('');
      setStudents([]);
      setEntries({});
      setHasExistingRecord(false);
      setEditMode(true);
      return;
    }

    loadStudents();
  }, [loadStudents, selClass, classes]);

  const setAll = (status) => {
    const all = {};
    students.forEach(s => (all[s._id] = status));
    setEntries(all);
  };

  const handleSave = async () => {
    if (!selClass) return;
    setSaving(true);
    try {
      const entryArr = students.map(s => ({ student: s._id, status: entries[s._id] || 'present' }));
      await api.post('/attendance', { classId: selClass, date, entries: entryArr, academicYear });
      toast.success('Attendance saved!');
      setHasExistingRecord(true);
      setEditMode(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const classOpts = classes.map(c => ({ value: c._id, label: c.displayName || `Grade ${c.grade}-${c.section}` }));
  const statusColors = { present: 'bg-emerald-600', absent: 'bg-red-600', late: 'bg-amber-500', half_day: 'bg-blue-500' };
  const canEditAttendance = !hasExistingRecord || editMode;

  const present  = Object.values(entries).filter(s => s === 'present').length;
  const absent   = Object.values(entries).filter(s => s === 'absent').length;

  return (
    <div className="float-in">
      <PageHeader title="Mark Attendance" subtitle="Daily class attendance"
        actions={tab === 'mark' ? (
          <div className="flex gap-2">
            {hasExistingRecord && !editMode && (
              <button onClick={() => setEditMode(true)} disabled={!selClass} className="btn-secondary">
                <FiEdit2 />Edit Attendance
              </button>
            )}
            <button onClick={handleSave} disabled={saving || !selClass || !canEditAttendance} className="btn-primary">
              <FiSave />{saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        ) : null} />

      <div className="campus-panel mb-4 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 border-b border-border pb-4">
            <button onClick={() => setTab('mark')} className={`btn-sm ${tab === 'mark' ? 'btn-primary' : 'btn-secondary'}`}>Mark Attendance</button>
            <button onClick={() => setTab('history')} className={`btn-sm ${tab === 'history' ? 'btn-primary' : 'btn-secondary'}`}>View History (Monthly)</button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Class</label>
              {isTeacherRole ? (
                <div className="input pointer-events-none bg-slate-50 font-semibold text-slate-700 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
                  {classes.find(c => c._id === selClass)?.displayName || 'Loading class...'}
                </div>
              ) : (
                <SearchableSelect options={classOpts} value={selClass} onChange={setSelClass} placeholder="Select class..." />
              )}
            </div>
            {tab === 'mark' && (
              <>
                <div><label className="label">Date</label>
                  <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} /></div>
                <div className="flex items-end gap-2">
                  <button onClick={() => setAll('present')} disabled={!canEditAttendance} className="btn-success btn-sm flex-1">All Present</button>
                  <button onClick={() => setAll('absent')} disabled={!canEditAttendance} className="btn-danger btn-sm flex-1">All Absent</button>
                </div>
              </>
            )}
          </div>
        </div>
        {tab === 'mark' && students.length > 0 && (
          <div className="mt-3 flex gap-4 text-sm">
            <span className="text-emerald-600 font-semibold">Present: {present}</span>
            <span className="text-red-600 font-semibold">Absent: {absent}</span>
            <span className="text-text-secondary">Total: {students.length}</span>
            {hasExistingRecord && !editMode && <span className="font-semibold text-primary-700">Saved record loaded</span>}
            {hasExistingRecord && editMode && <span className="font-semibold text-amber-600">Editing saved attendance</span>}
          </div>
        )}
      </div>

      {tab === 'mark' ? (
        loading ? <PageLoader /> : (
          <div className="campus-panel overflow-hidden">
            {students.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">{selClass ? 'No active students in this class.' : 'Select a class to mark attendance.'}</p>
            ) : (
              <table className="table">
                <thead><tr>
                  <th className="table-header">#</th>
                  <th className="table-header">Student</th>
                  <th className="table-header">Roll No</th>
                  {['present','absent','late','half_day'].map(s => <th key={s} className="table-header text-center capitalize">{s.replace('_',' ')}</th>)}
                </tr></thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s._id}>
                      <td className="table-cell text-text-secondary">{i+1}</td>
                      <td className="table-cell font-semibold">{s.firstName} {s.lastName}</td>
                      <td className="table-cell font-mono text-xs">{s.rollNo || '—'}</td>
                      {['present','absent','late','half_day'].map(st => (
                        <td key={st} className="table-cell text-center">
                          <label className="cursor-pointer">
                            <input type="radio" name={`att-${s._id}`} value={st}
                              checked={entries[s._id] === st}
                              disabled={!canEditAttendance}
                              onChange={() => setEntries(e => ({...e, [s._id]: st}))}
                              className="sr-only" />
                            <span className={`inline-flex h-7 w-7 items-center justify-center border-2 transition ${entries[s._id]===st ? `${statusColors[st]} border-transparent text-white` : 'border-slate-300 bg-white'}`}>
                              {entries[s._id]===st ? '✓' : ''}
                            </span>
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {students.length > 0 && (
              <div className="flex justify-end border-t border-border px-4 py-4">
                <div className="flex gap-2">
                  {hasExistingRecord && !editMode && (
                    <button onClick={() => setEditMode(true)} className="btn-secondary">
                      <FiEdit2 />Edit Attendance
                    </button>
                  )}
                  <button onClick={handleSave} disabled={saving || !canEditAttendance} className="btn-primary">
                    <FiSave />{saving ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        histLoading ? <PageLoader /> : (
          <div className="campus-panel overflow-hidden">
            <table className="table">
              <thead><tr>
                <th className="table-header">Student</th>
                <th className="table-header text-center">Total Days</th>
                <th className="table-header text-center text-emerald-600">Present</th>
                <th className="table-header text-center text-red-600">Absent</th>
                <th className="table-header text-center text-amber-600">Late</th>
                <th className="table-header text-center">Percentage</th>
              </tr></thead>
              <tbody>
                {history.map((row, i) => (
                  <tr key={i}>
                    <td className="table-cell font-semibold">{row.name}</td>
                    <td className="table-cell text-center font-mono">{row.total}</td>
                    <td className="table-cell text-center font-bold text-emerald-600">{row.present}</td>
                    <td className="table-cell text-center font-bold text-red-600">{row.absent}</td>
                    <td className="table-cell text-center font-bold text-amber-600">{row.late}</td>
                    <td className="table-cell text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full ${row.total ? (row.present / row.total > 0.75 ? 'bg-emerald-500' : 'bg-red-500') : 'bg-slate-300'}`} 
                            style={{ width: `${row.total ? (row.present / row.total) * 100 : 0}%` }} />
                        </div>
                        <span className="font-mono text-xs">{row.total ? Math.round((row.present / row.total) * 100) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

export default AttendancePage;
