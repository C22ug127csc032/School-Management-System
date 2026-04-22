import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { FiCalendar, FiClock, FiPlus, FiUsers, FiX, FiZap } from 'react-icons/fi';
import api from '../../api/axios.js';
import { SearchableSelect, Modal, PageLoader, EmptyState, PageHeader } from '../../components/common/index.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import useTeacherScope from '../../hooks/useTeacherScope.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetablePage() {
  const academicYear = useAcademicYear();
  const { isTeacherRole, teacherId, classTeacherOf } = useTeacherScope();
  const [classes, setClasses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [grid, setGrid] = useState({});
  const [slots, setSlots] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);

  const [viewMode] = useState('class');
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const [modal, setModal] = useState({ open: false, day: '', periodId: '', existingSlot: null });
  const [slotForm, setSlotForm] = useState({ subjectId: '', teacherId: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isTeacherRole && viewMode === 'class' && !selectedClass && classTeacherOf) {
      setSelectedClass(classTeacherOf);
    }
  }, [isTeacherRole, viewMode, selectedClass, classTeacherOf]);

  useEffect(() => {
    api.get('/classes', { params: { academicYear } }).then(r => setClasses(r.data.data)).catch(() => {});
    api.get('/teachers').then(r => setTeachers(r.data.data)).catch(() => {});
  }, [academicYear]);

  const loadTimetable = useCallback(async () => {
    if (!selectedClass) return;
    
    setLoading(true);
    try {
      const [ttRes, subRes] = await Promise.all([
        api.get(`/timetable/class/${selectedClass}`, { params: { academicYear } }),
        api.get('/class-subjects', { params: { classId: selectedClass, academicYear } }),
      ]);
      setGrid(ttRes.data.data.grid);
      setSlots(ttRes.data.data.slots);
      setPeriods(ttRes.data.data.periods);
      setClassSubjects(subRes.data.data);
    } catch {
      toast.error('Failed to load timetable.');
    } finally {
      setLoading(false);
    }
  }, [academicYear, selectedClass, viewMode, teacherId]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const selectedClassObj = classes.find(c => c._id === selectedClass);
  const openSlotModal = (day, period, existingSlot) => {
    setModal({ open: true, day, periodId: period._id, existingSlot });
    setSlotForm({
      subjectId: existingSlot?.subject?._id || '',
      teacherId: existingSlot?.teacher?._id || '',
    });
  };

  const handleSaveSlot = async () => {
    if (!slotForm.subjectId || !slotForm.teacherId) {
      return toast.error('Please select both subject and teacher.');
    }

    setSaving(true);
    try {
      if (modal.existingSlot) {
        await api.put(`/timetable/slot/${modal.existingSlot._id}`, {
          subjectId: slotForm.subjectId,
          teacherId: slotForm.teacherId,
        });
      } else {
        await api.post('/timetable/slot', {
          classId: selectedClass,
          subjectId: slotForm.subjectId,
          teacherId: slotForm.teacherId,
          periodId: modal.periodId,
          day: modal.day,
          academicYear,
        });
      }
      toast.success('Slot saved.');
      setModal(m => ({ ...m, open: false }));
      loadTimetable(selectedClass);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save slot.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    try {
      await api.delete(`/timetable/slot/${slotId}`);
      toast.success('Slot removed.');
      loadTimetable(selectedClass);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    }
  };

  const handleAutoGenerate = async () => {
    if (!selectedClass) return toast.error('Select a class first.');
    setAutoLoading(true);
    try {
      const r = await api.post(`/timetable/auto-generate/${selectedClass}`, { overwrite: true, academicYear });
      toast.success(r.data.message);
      loadTimetable(selectedClass);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Auto-generation failed.');
    } finally {
      setAutoLoading(false);
    }
  };

  const handleClearTimetable = async () => {
    if (!selectedClass) return toast.error('Select a class first.');
    const confirmed = window.confirm('Remove all timetable subjects for this class?');
    if (!confirmed) return;
    setClearLoading(true);
    try {
      await api.delete(`/timetable/class/${selectedClass}`, { data: { academicYear } });
      toast.success('Timetable cleared.');
      loadTimetable(selectedClass);
    } catch (err) {
      toast.error('Failed to clear.');
    } finally {
      setClearLoading(false);
    }
  };

  const classOptions = classes.map(c => ({
    value: c._id,
    label: c.displayName || `Grade ${c.grade}-${c.section}`,
  }));

  const subjectOptions = classSubjects.map(cs => ({
    value: cs.subject?._id,
    label: `${cs.subject?.name} (${cs.subject?.code})`,
  }));

  const selectedClassSubject = useMemo(() => (
    classSubjects.find(cs => String(cs.subject?._id) === String(slotForm.subjectId))
  ), [classSubjects, slotForm.subjectId]);

  const teacherOptions = useMemo(() => {
    if (selectedClassSubject?.teacher?._id) {
      return teachers.filter(t => String(t._id) === String(selectedClassSubject.teacher._id))
        .map(t => ({ value: t._id, label: `${t.firstName} ${t.lastName} [${t.employeeId}] (Assigned)` }));
    }
    return teachers.map(t => ({ value: t._id, label: `${t.firstName} ${t.lastName} [${t.employeeId}]` }));
  }, [teachers, selectedClassSubject]);

  const getSlot = (day, periodId) => grid[day]?.[periodId];

  const stats = [
    { label: 'View', value: viewMode === 'my' ? 'My Schedule' : (selectedClassObj?.displayName || 'Class View'), tone: 'bg-blue-50 text-blue-700 border-blue-100', icon: FiCalendar },
    { label: 'Periods', value: `${periods.filter(period => !period.isBreak).length} Active`, tone: 'bg-amber-50 text-amber-700 border-amber-100', icon: FiClock },
    { label: 'Filled Slots', value: `${slots.length} Assigned`, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: FiUsers },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Master Timetable" subtitle="Schedule Builder" />
      
      <div className="campus-panel p-5">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="label !text-[10px] uppercase tracking-widest text-slate-400">Select Class</label>
            <SearchableSelect options={classOptions} value={selectedClass} onChange={v => setSelectedClass(v)} placeholder="Choose Class..." />
          </div>
          
          <div className="flex items-end gap-2">
             {selectedClass && !isTeacherRole && (
               <>
                 <button onClick={handleAutoGenerate} disabled={autoLoading} className="btn-primary btn-sm flex-1">
                   <FiZap className="mr-2" /> Auto-Build
                 </button>
                 <button onClick={handleClearTimetable} disabled={clearLoading} className="btn-danger btn-sm">
                   <FiX />
                 </button>
               </>
             )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {stats.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`rounded-xl border p-3 flex items-center gap-3 ${stat.tone}`}>
                  <Icon className="text-sm opacity-50" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest leading-none opacity-50">{stat.label}</p>
                    <p className="mt-1 text-sm font-black">{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {(viewMode === 'class' && !selectedClass) && (
        <EmptyState 
          icon={FiZap} 
          title="Select a class to view or build the timetable" 
          description="You can manually assign slots or use auto-generation" 
        />
      )}

      {(viewMode === 'my' || selectedClass) && loading && <PageLoader />}

      {(viewMode === 'my' || selectedClass) && !loading && (
        <div className="campus-panel overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-bold text-slate-900">{viewMode === 'my' ? 'My Weekly Teaching Schedule' : `Timetable for ${selectedClassObj?.displayName || 'Class'}`}</h3>
            </div>
            {viewMode === 'class' && !isTeacherRole && (
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={handleClearTimetable} 
                  className="btn-secondary py-1.5 px-3 text-[10px] font-bold"
                  disabled={clearLoading}
                >
                  {clearLoading ? 'Clearing...' : 'Clear All'}
                </button>
                <button 
                  onClick={handleAutoGenerate} 
                  className="btn-primary py-1.5 px-3 text-[10px] font-bold"
                  disabled={autoLoading}
                >
                  <FiZap className="mr-1" /> {autoLoading ? 'Generating...' : 'Auto'}
                </button>
              </div>
            )}
          </div>
          
          <div className="tt-container-fixed pb-6">
            <table className="tt-grid !table-fixed !w-full">
              <thead>
                <tr className="!table-row">
                  <th className="tt-header-cell tt-day-header !w-14 !p-1">Day</th>
                  {periods.map(period => (
                    <th key={period._id} className="tt-header-cell !p-0.5">
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black uppercase tracking-tighter text-slate-800 leading-none truncate w-full">{period.name}</span>
                        <span className="text-[7px] font-bold text-slate-400 mt-0.5 scale-[0.9] origin-center truncate w-full">
                          {period.startTime}-{period.endTime}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day} className="!table-row">
                    <td className="tt-header-cell tt-day-header !bg-white !text-center !font-black !text-[10px] !py-1">
                       {day.slice(0, 3)}
                    </td>
                    {periods.map(period => {
                      if (period.isBreak) {
                        return (
                          <td key={period._id} className="tt-slot tt-slot-break !bg-amber-50/10">
                            <span className="text-[7px] font-extrabold text-amber-600/40 uppercase tracking-widest">{period.name}</span>
                          </td>
                        );
                      }

                      const slot = getSlot(day, String(period._id));
                      if (slot) {
                        return (
                          <td
                            key={period._id}
                            className="tt-slot group !table-cell"
                            style={{ borderTop: `2px solid ${slot.subject?.color || '#3b82f6'}` }}
                          >
                             <div className="flex flex-col items-center leading-none">
                              <p className="tt-slot-subject !text-[9px] truncate w-full">{slot.subject?.name}</p>
                              {viewMode === 'class' ? (
                                <p className="tt-slot-teacher !text-[7px] truncate w-full opacity-70">{slot.teacher?.firstName}</p>
                              ) : (
                                <span className="tt-slot-class !text-[7px] truncate w-full">{slot.classRef?.displayName || 'Class'}</span>
                              )}
                              
                              {viewMode === 'class' && !isTeacherRole && (
                                <button
                                  onClick={() => handleDeleteSlot(slot._id)}
                                  className="mt-1 flex h-4 w-4 items-center justify-center rounded-lg bg-red-50 text-red-500 opacity-0 transition-all hover:bg-red-100 group-hover:opacity-100"
                                >
                                  <FiX className="text-[8px]" />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      }

                      const canClick = viewMode === 'class' && !isTeacherRole;
                      return (
                        <td
                          key={period._id}
                          className={`tt-slot tt-slot-empty group !table-cell ${canClick ? 'cursor-pointer' : ''}`}
                          onClick={() => canClick && openSlotModal(day, period, null)}
                        >
                          <div className="flex flex-col items-center justify-center">
                            {canClick ? (
                              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-primary-100 group-hover:text-primary-600">
                                <FiPlus className="text-[7px]" />
                              </div>
                            ) : (
                              <span className="text-[6px] font-black uppercase text-slate-100 tracking-tighter">Free</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modal.open}
        onClose={() => setModal(m => ({ ...m, open: false }))}
        title={`Assign Slot - ${modal.day}`}
        footer={(
          <div className="flex gap-2">
            <button onClick={() => setModal(m => ({ ...m, open: false }))} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveSlot} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Slot'}
            </button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Subject</label>
            <SearchableSelect
              options={subjectOptions}
              value={slotForm.subjectId}
              onChange={v => setSlotForm(f => ({ ...f, subjectId: v }))}
              placeholder="Select subject..."
            />
          </div>
          <div>
            <label className="label">Teacher</label>
            <SearchableSelect
              options={teacherOptions}
              value={slotForm.teacherId}
              onChange={v => setSlotForm(f => ({ ...f, teacherId: v }))}
              placeholder="Select teacher..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
