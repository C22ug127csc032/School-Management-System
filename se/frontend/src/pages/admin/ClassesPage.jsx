import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiHash, FiSlash } from 'react-icons/fi';
import api from '../../api/axios.js';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import useListParams from '../../hooks/useListParams.js';
import { applyClientListOperations } from '../../utils/listUtils.js';
import {
  PageHeader,
  DataTable,
  Modal,
  ConfirmDialog,
  SearchInput,
  FilterSelect,
} from '../../components/common/index.jsx';

const GRADES = ['Pre-KG', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const GROUPS = [
  { value: '', label: 'N/A (Standard class)' },
  { value: 'science_biology', label: 'Maths Biology' },
  { value: 'science_maths', label: 'Computer Maths' },
  { value: 'commerce', label: 'Business Maths' },
  { value: 'arts', label: 'Arts Computer' },
];
const HIGHER_SECONDARY_GROUPS = GROUPS.filter(group => group.value);
const GRADE_ORDER = ['Pre-KG', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const formatGradeSection = (grade, section) => (
  section ? `Grade ${grade} - ${section}` : `Grade ${grade}`
);

const emptyForm = {
  id: '',
  grade: '',
  section: '',
  classType: 'standard',
  groupName: '',
  room: '',
  capacity: 40,
  classTeacher: '',
};

export function ClassesPage() {
  const academicYear = useAcademicYear();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rollTarget, setRollTarget] = useState(null);
  const [rollGenerating, setRollGenerating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const {
    search,
    setSearch,
    filters,
    setFilter,
    sortBy,
    sortOrder,
    setSort,
  } = useListParams({
    initialFilters: { grade: '', groupName: '' },
    initialSortBy: 'displayName',
    initialSortOrder: 'asc',
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/classes', { params: { includeInactive: false, academicYear } }),
      api.get('/teachers', { params: { limit: 200, sortBy: 'name', sortOrder: 'asc' } }),
    ])
      .then(([classResponse, teacherResponse]) => {
        setClasses(classResponse.data.data || []);
        setTeachers(teacherResponse.data.data || []);
      })
      .catch(() => toast.error('Failed to load classes.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [academicYear]);

  const isHS = ['11', '12'].includes(form.grade);
  const teacherOptions = useMemo(() => (
    teachers.map(teacher => ({
      value: teacher._id,
      label: `${teacher.firstName} ${teacher.lastName} (${teacher.employeeId})`,
      classTeacherOf: teacher.classTeacherOf?._id || '',
    }))
  ), [teachers]);

  const filteredClasses = useMemo(() => applyClientListOperations({
    data: classes,
    search,
    searchFields: [
      cls => cls.displayName,
      cls => `${cls.grade} ${cls.section} ${cls.groupName || ''} ${cls.room || ''}`,
      cls => `${cls.classTeacher?.firstName || ''} ${cls.classTeacher?.lastName || ''}`,
    ],
    filters,
    filterFns: {
      grade: (cls, value) => cls.grade === value,
      groupName: (cls, value) => cls.groupName === value,
    },
    sortBy,
    sortOrder,
    sortAccessors: {
      displayName: cls => cls.displayName || formatGradeSection(cls.grade, cls.section),
      grade: cls => GRADE_ORDER.indexOf(cls.grade),
      section: cls => cls.section,
      studentCount: cls => cls.studentCount || 0,
      capacity: cls => cls.capacity || 0,
    },
  }), [classes, search, filters, sortBy, sortOrder]);

  const openCreateModal = () => {
    setForm(emptyForm);
    setModal(true);
  };

  const openEditModal = cls => {
    setForm({
      id: cls._id,
      grade: cls.grade || '',
      section: cls.section || '',
      classType: cls.classType || 'standard',
      groupName: cls.groupName || '',
      room: cls.room || '',
      capacity: cls.capacity || 40,
      classTeacher: cls.classTeacher?._id || '',
    });
    setModal(true);
  };

  useEffect(() => {
    if (!isHS && form.groupName) {
      setForm(current => ({ ...current, groupName: '' }));
      return;
    }

    if (isHS && !form.groupName) {
      setForm(current => ({ ...current, groupName: HIGHER_SECONDARY_GROUPS[0]?.value || '' }));
    }
  }, [isHS, form.groupName]);

  const selectedTeacherConflict = teacherOptions.find(option => (
    option.value === form.classTeacher
    && option.classTeacherOf
    && option.classTeacherOf !== form.id
  ));

  const handleSave = async () => {
    if (!form.grade) return toast.error('Grade is required.');
    if (isHS && !form.groupName) return toast.error('Select a group for Grade 11/12.');
    if (selectedTeacherConflict) return toast.error('This teacher is already assigned as class teacher for another class.');
    if (!form.capacity || form.capacity < 1) return toast.error('Capacity must be at least 1.');

    const payload = {
      grade: form.grade,
      section: form.section.trim().toUpperCase(),
      classType: isHS ? 'group' : 'standard',
      groupName: isHS ? form.groupName : null,
      room: form.room,
      capacity: Number(form.capacity),
      classTeacher: form.classTeacher || null,
      academicYear,
    };

    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/classes/${form.id}`, payload);
        toast.success('Class updated.');
      } else {
        await api.post('/classes', payload);
        toast.success('Class created.');
      }
      setModal(false);
      setForm(emptyForm);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save class.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async id => {
    if (!window.confirm('Deactivate this class? You can keep its history, but it will no longer appear in active lists.')) return;

    try {
      await api.put(`/classes/${id}/deactivate`);
      toast.success('Class deactivated.');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed.');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this class permanently? This cannot be undone. If the class has linked records, deletion will be blocked.')) return;

    try {
      await api.delete(`/classes/${id}`);
      toast.success('Class deleted permanently.');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed.');
    }
  };

  const handleGenerateRollNos = async () => {
    if (!rollTarget) return;

    setRollGenerating(true);
    try {
      const response = await api.post('/students/generate-roll-nos', {
        classId: rollTarget._id,
        academicYear,
      });
      toast.success(response.data.message);
      setRollTarget(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate roll numbers.');
    } finally {
      setRollGenerating(false);
    }
  };

  const columns = [
    {
      key: 'display',
      label: 'Class',
      sortable: true,
      sortKey: 'displayName',
      render: cls => (
        <div>
          <p className="font-semibold">{cls.displayName || formatGradeSection(cls.grade, cls.section)}</p>
          <p className="text-xs text-text-secondary">{cls.academicYear}</p>
        </div>
      ),
    },
    { key: 'grade', label: 'Grade', sortable: true, sortKey: 'grade', render: cls => cls.grade },
    { key: 'section', label: 'Section', sortable: true, sortKey: 'section', render: cls => cls.section },
    { key: 'group', label: 'Group', render: cls => cls.groupName ? <span className="badge-teal">{GROUPS.find(group => group.value === cls.groupName)?.label || cls.groupName.replace(/_/g, ' ')}</span> : '—' },
    {
      key: 'teacher',
      label: 'Class Teacher',
      render: cls => cls.classTeacher ? `${cls.classTeacher.firstName} ${cls.classTeacher.lastName}` : <span className="text-xs text-slate-400">Not assigned</span>,
    },
    { key: 'room', label: 'Room', render: cls => cls.room || '—' },
    {
      key: 'strength',
      label: 'Strength',
      sortable: true,
      sortKey: 'studentCount',
      render: cls => (
        <div>
          <p className={`font-semibold ${cls.isCapacityExceeded ? 'text-red-600' : 'text-text-primary'}`}>{cls.studentCount || 0} / {cls.capacity || 0}</p>
          <p className="text-xs text-text-secondary">{cls.activeStudentCount || 0} active</p>
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: cls => (
        <div className="flex items-center gap-1">
          <button onClick={() => setRollTarget(cls)} className="btn-icon btn-sm" title="Generate roll numbers"><FiHash /></button>
          <button onClick={() => openEditModal(cls)} className="btn-icon btn-sm" title="Edit class"><FiEdit2 /></button>
          <button onClick={() => handleDeactivate(cls._id)} className="btn-icon btn-sm text-amber-600" title="Deactivate class"><FiSlash /></button>
          <button onClick={() => handleDelete(cls._id)} className="btn-icon btn-sm text-red-600" title="Delete class permanently"><FiTrash2 /></button>
        </div>
      ),
    },
  ];

  const totalStudents = filteredClasses.reduce((sum, cls) => sum + (cls.studentCount || 0), 0);
  const fullClasses = filteredClasses.filter(cls => cls.isCapacityExceeded || (cls.studentCount || 0) >= (cls.capacity || 0)).length;

  return (
    <div className="float-in">
      <PageHeader
        title="Classes"
        subtitle="Manage grade sections, groups, class teachers, and strength."
        actions={<button onClick={openCreateModal} className="btn-primary"><FiPlus /> New Class</button>}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <div className="card-primary"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Total Classes</p><p className="mt-3 text-2xl font-bold text-text-primary">{filteredClasses.length}</p></div>
        <div className="card-primary"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Total Students</p><p className="mt-3 text-2xl font-bold text-text-primary">{totalStudents}</p></div>
        <div className="card-primary"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">At / Over Capacity</p><p className="mt-3 text-2xl font-bold text-text-primary">{fullClasses}</p></div>
      </div>

      <div className="campus-panel mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px_220px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search class, room, or teacher..." />
          <FilterSelect value={filters.grade} onChange={value => setFilter('grade', value)} placeholder="All Grades" options={GRADES.map(grade => ({ value: grade, label: `Grade ${grade}` }))} />
          <FilterSelect value={filters.groupName} onChange={value => setFilter('groupName', value)} placeholder="All Groups" options={HIGHER_SECONDARY_GROUPS} />
        </div>
      </div>

      <div className="campus-panel overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredClasses}
          loading={loading}
          emptyMessage="No classes found."
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={setSort}
        />
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form.id ? 'Edit Class' : 'Add Class'}
        footer={(
          <>
            <button onClick={() => setModal(false)} className="btn-secondary btn-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">{saving ? 'Saving...' : (form.id ? 'Save Changes' : 'Create')}</button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="form-group">
              <label className="label">Grade *</label>
              <select className="input" value={form.grade} onChange={event => setForm(current => ({ ...current, grade: event.target.value, groupName: ['11', '12'].includes(event.target.value) ? (current.groupName || HIGHER_SECONDARY_GROUPS[0]?.value || '') : '' }))}>
                <option value="">Select</option>
                {GRADES.map(grade => <option key={grade} value={grade}>Grade {grade}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Section</label>
              <input className="input" placeholder="Leave blank for single-section class" maxLength={2} value={form.section} onChange={event => setForm(current => ({ ...current, section: event.target.value.toUpperCase() }))} />
              <p className="mt-1 text-xs text-text-secondary">If left empty, the class will be saved and shown without any section.</p>
            </div>
          </div>

          {isHS && (
            <div className="form-group">
              <label className="label">Subject Group *</label>
              <select className="input" value={form.groupName} onChange={event => setForm(current => ({ ...current, groupName: event.target.value }))}>
                <option value="">Select subject group</option>
                {HIGHER_SECONDARY_GROUPS.map(group => <option key={group.value} value={group.value}>{group.label}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="form-group"><label className="label">Room</label><input className="input" placeholder="Room no" value={form.room} onChange={event => setForm(current => ({ ...current, room: event.target.value }))} /></div>
            <div className="form-group"><label className="label">Capacity</label><input type="number" min="1" className="input" value={form.capacity} onChange={event => setForm(current => ({ ...current, capacity: Number(event.target.value) }))} /></div>
          </div>

          <div className="form-group">
            <label className="label">Class Teacher</label>
            <select className="input" value={form.classTeacher} onChange={event => setForm(current => ({ ...current, classTeacher: event.target.value }))}>
              <option value="">Not assigned</option>
              {teacherOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}{option.classTeacherOf && option.classTeacherOf !== form.id ? ' - already assigned' : ''}
                </option>
              ))}
            </select>
            {selectedTeacherConflict && <p className="mt-1 text-xs text-amber-700">Selected teacher is already assigned as class teacher for another class.</p>}
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-text-secondary">
            <div className="flex items-center gap-2 text-text-primary">
              <FiUsers />
              <span className="font-semibold">Academic Year</span>
            </div>
            <p className="mt-1">{academicYear}</p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!rollTarget}
        onClose={() => setRollTarget(null)}
        onConfirm={handleGenerateRollNos}
        loading={rollGenerating}
        title="Generate Roll Numbers"
        message={rollTarget ? `This will regenerate roll numbers in alphabetical order for ${rollTarget.displayName}. Continue?` : 'Generate roll numbers for this class?'}
        danger={false}
      />
    </div>
  );
}

export default ClassesPage;
