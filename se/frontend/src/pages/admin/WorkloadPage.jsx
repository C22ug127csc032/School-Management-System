import React, { useState, useEffect } from 'react';
import api from '../../api/axios.js';
import { PageHeader, DataTable, PageLoader } from '../../components/common/index.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import useTeacherScope from '../../hooks/useTeacherScope.js';

export default function WorkloadPage() {
  const academicYear = useAcademicYear();
  const { isTeacherRole, teacherId } = useTeacherScope();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/timetable/workload', { params: { academicYear } })
      .then(r => {
        const rows = r.data.data || [];
        setData(isTeacherRole ? rows.filter(item => String(item.teacher?._id) === String(teacherId)) : rows);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [academicYear, isTeacherRole, teacherId]);

  const columns = [
    { key: 'teacher', label: 'Teacher', render: d => (
      <div><p className="font-semibold">{d.teacher?.name}</p><p className="text-xs text-text-secondary">{d.teacher?.employeeId}</p></div>
    )},
    { key: 'assigned', label: 'Assigned Periods', render: d => <span className="font-bold text-primary-700">{d.assigned}</span> },
    { key: 'max',      label: 'Max Periods/Week',  render: d => d.max },
    { key: 'util',     label: 'Utilization',       render: d => (
      <div className="flex items-center gap-2">
        <div className="h-2 w-24 bg-slate-100 overflow-hidden">
          <div className={`h-full transition-all ${d.utilization >= 90 ? 'bg-red-500' : d.utilization >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(d.utilization, 100)}%` }} />
        </div>
        <span className="text-xs font-semibold">{d.utilization}%</span>
      </div>
    )},
  ];

  return (
    <div className="float-in">
      <PageHeader title="Teacher Workload" subtitle={isTeacherRole ? 'Your timetable workload' : 'Period assignment vs capacity for all teachers'} />
      <div className="campus-panel overflow-hidden">
        <DataTable columns={columns} data={data} loading={loading} emptyMessage="No data." />
      </div>
    </div>
  );
}
