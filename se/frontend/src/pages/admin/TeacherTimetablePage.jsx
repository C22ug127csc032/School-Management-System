import React, { useState, useEffect } from 'react';
import api from '../../api/axios.js';
import { PageHeader, SearchableSelect, PageLoader, EmptyState } from '../../components/common/index.jsx';
import { FiUser, FiClock, FiUsers } from 'react-icons/fi';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import useTeacherScope from '../../hooks/useTeacherScope.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TeacherTimetablePage() {
  const academicYear = useAcademicYear();
  const { isTeacherRole, teacherId } = useTeacherScope();
  const [teachers, setTeachers] = useState([]);
  const [selectedT, setSelectedT] = useState('');
  const [grid, setGrid] = useState({});
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isTeacherRole) {
      setSelectedT(teacherId || '');
      return;
    }
    api.get('/teachers', { params: { limit: 200 } }).then(r => setTeachers(r.data.data)).catch(() => {});
  }, [isTeacherRole, teacherId]);

  useEffect(() => {
    if (!selectedT) return;
    setLoading(true);
    api.get(`/timetable/teacher/${selectedT}`, { params: { academicYear } })
      .then(r => {
        setGrid(r.data.data.grid);
        setPeriods(r.data.data.periods);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedT, academicYear]);

  const teacherOptions = teachers.map(t => {
    const subjectCodes = (t.eligibleSubjects || []).map(subject => subject?.code || subject?.name).filter(Boolean);
    return {
      value: t._id,
      label: `${t.firstName} ${t.lastName} [${t.employeeId}]${subjectCodes.length ? ` (${subjectCodes.join(', ')})` : ''}`,
      name: `${t.firstName} ${t.lastName}`
    };
  });

  const teacherName = teachers.find(t => t._id === selectedT)?.firstName + ' ' + teachers.find(t => t._id === selectedT)?.lastName;

  return (
    <div className="space-y-6">
      <PageHeader 
        title={isTeacherRole ? 'My Schedule' : 'Teacher Schedule'}
        subtitle={isTeacherRole ? 'Personal Weekly Plan' : 'Staff Schedule Lookup'}
        actions={
          <div className="flex flex-wrap items-center gap-3">
             {!isTeacherRole && (
               <div className="w-56">
                 <SearchableSelect 
                   options={teacherOptions} 
                   value={selectedT} 
                   onChange={setSelectedT} 
                   placeholder="Search teacher..." 
                 />
               </div>
             )}
             {selectedT && (
               <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 px-3">
                 <FiUsers className="text-slate-400 text-xs" />
                 <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">{teacherName}</span>
               </div>
             )}
          </div>
        }
      />

      {!selectedT && <EmptyState icon={FiUser} title={isTeacherRole ? 'No teacher profile found' : 'Select a teacher'} description={isTeacherRole ? 'This account is not linked to a teacher profile yet.' : 'Choose a teacher above to view their timetable.'} />}
      {selectedT && loading && <PageLoader />}
      {selectedT && !loading && (
        <div className="campus-panel overflow-hidden">
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
                            <span className="text-[8px] font-extrabold text-amber-600/40 uppercase tracking-widest">{period.name}</span>
                          </td>
                        );
                      }

                      const slot = grid[day]?.[String(period._id)];
                      if (slot) {
                        return (
                          <td
                            key={period._id}
                            className="tt-slot group !table-cell"
                            style={{ borderTop: `2px solid ${slot.subject?.color || '#3b82f6'}` }}
                          >
                            <div className="flex flex-col items-center leading-none">
                              <p className="tt-slot-subject !text-[9px] truncate w-full">{slot.subject?.name}</p>
                              <span className="tt-slot-class !text-[7px] truncate w-full">{slot.class?.displayName || `Grade ${slot.class?.grade}-${slot.class?.section}`}</span>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={period._id} className="tt-slot tt-slot-empty group !table-cell">
                          <span className="text-[8px] font-black uppercase text-slate-100 tracking-tighter">Free</span>
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
    </div>
  );
}

export default TeacherTimetablePage;
