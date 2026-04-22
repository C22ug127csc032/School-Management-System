import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiPlus, FiEye, FiEdit2, FiCheck, FiHash } from 'react-icons/fi';
import api from '../../api/axios.js';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import useListParams from '../../hooks/useListParams.js';
import useTeacherScope from '../../hooks/useTeacherScope.js';
import {
  PageHeader,
  DataTable,
  Pagination,
  StatusBadge,
  SearchInput,
  FilterSelect,
  ConfirmDialog,
  PageLoader,
} from '../../components/common/index.jsx';

const STATUSES = ['', 'active', 'inactive', 'transferred', 'alumni', 'admission_pending'];
const GROUPS = [
  { value: '', label: 'All Groups' },
  { value: 'science_biology', label: 'Maths Biology' },
  { value: 'science_maths', label: 'Computer Maths' },
  { value: 'commerce', label: 'Business Maths' },
  { value: 'arts', label: 'Arts Computer' },
];

const formatGradeSection = (grade, section) => (
  grade ? (section ? `Grade ${grade} - ${section}` : `Grade ${grade}`) : '—'
);

export default function StudentsPage() {
  const academicYear = useAcademicYear();
  const { user, isTeacherRole, isClassTeacherRole, teacherId, classTeacherOf } = useTeacherScope();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generatingRollNos, setGeneratingRollNos] = useState(false);
  const {
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilter,
    setFilters,
    sortBy,
    sortOrder,
    setSort,
    params,
  } = useListParams({
    initialFilters: { grade: '', section: '', status: '', groupName: '', classId: '' },
    initialLimit: 30,
    initialSortBy: 'name',
    initialSortOrder: 'asc',
  });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/students', {
        params: {
          ...params,
          academicYear,
          ...(isTeacherRole ? { 
            classId: isClassTeacherRole ? (classTeacherOf || '__none__') : '__none__' 
          } : {}),
        },
      });
      setStudents(response.data.data);
      setTotal(response.data.total);
      setPages(response.data.pages);
    } catch {
      toast.error('Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [params, academicYear, isTeacherRole, classTeacherOf]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    api.get('/classes', {
      params: isTeacherRole
        ? { academicYear, classTeacherId: teacherId || '__none__' }
        : { academicYear },
    }).then(response => {
      setClasses(response.data.data);
    }).catch(() => {});
  }, [academicYear, isTeacherRole, teacherId]);

  useEffect(() => {
    if (!isTeacherRole) return;

    // Safety check to avoid infinite re-render
    const targetClassId = classTeacherOf || '';
    if (filters.classId === targetClassId) return;

    setFilters(current => ({
      ...current,
      classId: targetClassId,
      grade: '',
      section: '',
      groupName: '',
    }));
  }, [isTeacherRole, classTeacherOf, setFilters, filters.classId]);

  const gradeOrder = ['Pre-KG', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const grades = [...new Set(classes.map(item => item.grade))].sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b));
  const sections = filters.grade ? [...new Set(classes.filter(item => item.grade === filters.grade).map(item => item.section))] : [];

  const sortedClasses = [...classes].sort((a, b) => {
    const aLabel = a.displayName || formatGradeSection(a.grade, a.section);
    const bLabel = b.displayName || formatGradeSection(b.grade, b.section);
    return aLabel.localeCompare(bLabel, undefined, { numeric: true, sensitivity: 'base' });
  });

  const handleClassViewChange = classId => {
    const nextClass = classes.find(item => item._id === classId);
    setFilters(current => ({
      ...current,
      classId,
      grade: nextClass?.grade || '',
      section: nextClass?.section || '',
      groupName: nextClass?.groupName || '',
    }));
  };

  const groupedStudents = useMemo(() => {
    const groups = new Map();

    students.forEach(student => {
      const classId = student.classRef?._id || `${student.grade || 'unassigned'}-${student.section || 'na'}-${student.groupName || ''}`;
      const classLabel = student.classRef?.displayName || (student.grade ? formatGradeSection(student.grade, student.section) : 'Unassigned Class');

      if (!groups.has(classId)) {
        groups.set(classId, {
          id: classId,
          label: classLabel,
          groupName: student.groupName || '',
          rows: [],
        });
      }

      groups.get(classId).rows.push(student);
    });

    const orderMap = new Map(classes.map((item, index) => [item._id, index]));

    return [...groups.values()].sort((a, b) => {
      const aOrder = orderMap.has(a.id) ? orderMap.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bOrder = orderMap.has(b.id) ? orderMap.get(b.id) : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [students, classes]);

  const handleActivate = async () => {
    if (!confirmId) return;

    setActivating(confirmId);
    try {
      const response = await api.put(`/students/${confirmId}/activate`);
      toast.success(response.data.message);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed.');
    } finally {
      setActivating(null);
      setConfirmId(null);
    }
  };

  const selectedClass = classes.find(item => item._id === filters.classId);

  const handleGenerateRollNos = async () => {
    if (!filters.classId) return;

    setGeneratingRollNos(true);
    try {
      const response = await api.post('/students/generate-roll-nos', {
        classId: filters.classId,
        academicYear,
      });
      toast.success(response.data.message);
      setGenerateOpen(false);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate roll numbers.');
    } finally {
      setGeneratingRollNos(false);
    }
  };

  const columns = [
    {
      key: 'admissionNo',
      label: 'Adm. No',
      sortable: true,
      sortKey: 'admissionNo',
      render: student => <span className="font-mono text-xs">{student.admissionNo || '—'}</span>,
    },
    {
      key: 'name',
      label: 'Student',
      sortable: true,
      sortKey: 'name',
      render: student => (
        <div>
          <p className="font-semibold">{student.firstName} {student.lastName}</p>
          <p className="text-xs text-text-secondary">{student.phone}</p>
        </div>
      ),
    },
    {
      key: 'class',
      label: 'Class',
      sortable: true,
      sortKey: 'grade',
      render: student => (
        <span className="text-xs">
          {formatGradeSection(student.grade, student.section)}
          {student.groupName && <span className="ml-1 badge-purple">{student.groupName.replace(/_/g, ' ')}</span>}
        </span>
      ),
    },
    {
      key: 'rollNo',
      label: 'Roll No',
      sortable: true,
      sortKey: 'rollNo',
      render: student => <span className="font-mono text-xs">{student.rollNo || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      sortKey: 'status',
      render: student => <StatusBadge status={student.status} />,
    },
    {
      key: 'actions',
      label: 'ACTIONS',
      align: 'right',
      render: student => (
        <div className="flex items-center gap-1">
          <Link to={`/admin/students/${student._id}`} className="btn-icon btn-sm" title="View"><FiEye /></Link>
          {!isTeacherRole && <Link to={`/admin/students/${student._id}/edit`} className="btn-icon btn-sm" title="Edit"><FiEdit2 /></Link>}
          {!isTeacherRole && student.status === 'admission_pending' && (
            <button onClick={() => setConfirmId(student._id)} className="btn-success btn-sm" title="Activate">
              <FiCheck className="text-xs" /> Activate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="float-in">
      <PageHeader
        title="Students"
        subtitle={isTeacherRole ? 'Students from your class' : `${total} students enrolled`}
        actions={(
          <>
            {!isTeacherRole && <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (!filters.classId) {
                  toast.error('Select a class first to generate roll numbers.');
                  return;
                }
                setGenerateOpen(true);
              }}
            >
              <FiHash /> Generate Roll No
            </button>}
            {!isTeacherRole && <Link to="/admin/students/new" className="btn-primary">
              <FiPlus /> New Admission
            </Link>}
          </>
        )}
      />

      <div className="campus-panel mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SearchInput
            className="lg:col-span-2"
            value={search}
            onChange={setSearch}
            placeholder="Search by name, admission no, phone..."
          />
          {isTeacherRole ? (
            <div className="lg:col-span-1 flex items-end">
              <div className="input pointer-events-none bg-slate-50 font-semibold text-slate-700 flex items-center gap-2 h-10 w-full mb-0.5">
                <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
                {classes.find(c => c._id === classTeacherOf)?.displayName || 'Class Teacher'}
              </div>
            </div>
          ) : (
            <FilterSelect
              value={filters.classId}
              onChange={handleClassViewChange}
              placeholder="All Classes"
              options={sortedClasses.map(cls => ({
                value: cls._id,
                label: cls.displayName || formatGradeSection(cls.grade, cls.section),
              }))}
            />
          )}
          {!isTeacherRole && <FilterSelect
            value={filters.grade}
            onChange={value => setFilters(current => ({ ...current, classId: '', grade: value, section: '', groupName: '' }))}
            placeholder="All Grades"
            options={grades.map(grade => ({ value: grade, label: `Grade ${grade}` }))}
          />}
          {!isTeacherRole && <FilterSelect
            value={filters.section}
            onChange={value => setFilters(current => ({ ...current, classId: '', section: value }))}
            placeholder="All Sections"
            options={sections}
          />}
          <FilterSelect
            value={filters.status}
            onChange={value => setFilter('status', value)}
            placeholder="All Status"
            options={STATUSES.filter(Boolean).map(status => ({
              value: status,
              label: status.replace(/_/g, ' '),
            }))}
          />
        </div>

        {!isTeacherRole && (filters.grade === '11' || filters.grade === '12') && (
          <div className="mt-3 max-w-xs">
            <FilterSelect
              value={filters.groupName}
              onChange={value => setFilters(current => ({ ...current, classId: '', groupName: value }))}
              options={GROUPS}
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="campus-panel overflow-hidden">
          <PageLoader />
        </div>
      ) : groupedStudents.length === 0 ? (
        <div className="campus-panel overflow-hidden">
          <DataTable columns={columns} data={[]} loading={false} emptyMessage="No students found." />
        </div>
      ) : (
        <div className="space-y-4">
          {groupedStudents.map(group => (
            <div key={group.id} className="campus-panel overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-border bg-slate-50/70 px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Class</p>
                  <h2 className="mt-2 text-xl font-semibold text-text-primary">{group.label}</h2>
                  <p className="mt-1 text-sm text-text-secondary">Showing student records for this class.</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Students</p>
                  <p className="mt-2 text-base font-semibold text-text-primary">{group.rows.length}</p>
                  {group.groupName && (
                    <p className="mt-2 inline-flex badge-purple">{group.groupName.replace(/_/g, ' ')}</p>
                  )}
                </div>
              </div>
              <DataTable
                columns={columns}
                data={group.rows}
                loading={false}
                emptyMessage="No students found."
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={setSort}
              />
            </div>
          ))}
          <div className="campus-panel border-t border-border px-4 py-3">
            <Pagination page={page} pages={pages} onPage={setPage} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onConfirm={handleGenerateRollNos}
        loading={generatingRollNos}
        title="Generate Roll Numbers"
        message={selectedClass
          ? `This will regenerate roll numbers in alphabetical order for ${selectedClass.displayName || formatGradeSection(selectedClass.grade, selectedClass.section)}. Existing roll numbers in this class will be updated. Continue?`
          : 'Select a class first to generate roll numbers.'}
        danger={false}
      />

      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleActivate}
        loading={!!activating}
        title="Activate Student"
        message="This will activate the student and create a login account. Roll numbers can be generated later class-wise. Continue?"
        danger={false}
      />
    </div>
  );
}
