import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from '../../api/axios.js';
import useListParams from '../../hooks/useListParams.js';
import {
  PageHeader,
  DataTable,
  Modal,
  Pagination,
  SearchInput,
} from '../../components/common/index.jsx';

const GRADE_LEVELS = [
  { value: 'pre_primary', label: 'Pre-Primary' },
  { value: 'primary', label: 'Primary (1-5)' },
  { value: 'middle', label: 'Middle (6-8)' },
  { value: 'secondary', label: 'Secondary (9-10)' },
  { value: 'higher_secondary', label: 'Higher Secondary (11-12)' },
];

const empty = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  employeeId: '',
  department: '',
  designation: 'Teacher',
  qualification: '',
  gender: 'male',
  experienceYears: 0,
  maxPeriodsPerDay: 6,
  maxPeriodsPerWeek: 30,
  eligibleGradeLevels: [],
  eligibleSubjects: [],
  isLabEligible: false,
  isPTEligible: false,
  isLibraryEligible: false,
  createUserAccount: true,
  password: '',
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const {
    page,
    setPage,
    search,
    setSearch,
    sortBy,
    sortOrder,
    setSort,
    params,
  } = useListParams({
    initialLimit: 20,
    initialSortBy: 'name',
    initialSortOrder: 'asc',
  });

  const load = useCallback(() => {
    setLoading(true);
    api.get('/teachers', { params })
      .then(response => {
        setTeachers(response.data.data);
        setTotal(response.data.total);
        setPages(response.data.pages);
      })
      .catch(() => toast.error('Failed to load teachers.'))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/subjects', { params: { limit: 200, sortBy: 'name', sortOrder: 'asc' } })
      .then(response => setSubjects(response.data.data))
      .catch(() => {});
  }, []);

  const closeModal = () => {
    setModal(false);
    setEditItem(null);
    setForm(empty);

    // Browsers sometimes try to restore the saved login email
    // into the first visible text field after the modal closes.
    setTimeout(() => setSearch(''), 0);
    setTimeout(() => setSearch(''), 120);
  };

  const filteredSubjects = useMemo(() => {
    if (!form.eligibleGradeLevels.length) return subjects;
    return subjects.filter(subject =>
      subject.applicableGradeLevels?.some(level => form.eligibleGradeLevels.includes(level))
    );
  }, [subjects, form.eligibleGradeLevels]);

  useEffect(() => {
    const allowedSubjectIds = new Set(filteredSubjects.map(subject => subject._id));
    setForm(current => {
      const nextEligibleSubjects = current.eligibleSubjects.filter(subjectId => allowedSubjectIds.has(subjectId));
      if (nextEligibleSubjects.length === current.eligibleSubjects.length) return current;
      return { ...current, eligibleSubjects: nextEligibleSubjects };
    });
  }, [filteredSubjects]);

  const openModal = (teacher = null) => {
    if (teacher) {
      setForm({
        ...empty,
        ...teacher,
        eligibleGradeLevels: teacher.eligibleGradeLevels || [],
        eligibleSubjects: (teacher.eligibleSubjects || []).map(subject => subject._id || subject),
        createUserAccount: false,
      });
      setEditItem(teacher);
    } else {
      setForm(empty);
      setEditItem(null);
    }

    setModal(true);
  };

  const toggleArr = (key, value) => setForm(current => ({
    ...current,
    [key]: current[key].includes(value)
      ? current[key].filter(item => item !== value)
      : [...current[key], value],
  }));

  const handleSave = async () => {
    if (!form.firstName || !form.phone || !form.employeeId || !form.email) {
      toast.error('Name, phone, employee ID and email are required.');
      return;
    }

    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/teachers/${editItem._id}`, form);
        toast.success('Teacher updated.');
      } else {
        await api.post('/teachers', form);
        toast.success('Teacher created.');
      }
      closeModal();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Deactivate this teacher?')) return;

    try {
      await api.delete(`/teachers/${id}`);
      toast.success('Teacher deactivated.');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed.');
    }
  };

  const columns = [
    {
      key: 'emp',
      label: 'Employee',
      sortable: true,
      sortKey: 'name',
      render: teacher => (
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary-200 bg-primary-50 text-sm font-bold text-primary-700">
            {teacher.firstName?.charAt(0)}{teacher.lastName?.charAt(0)}
          </div>
          <div>
            <p className="font-semibold">{teacher.firstName} {teacher.lastName}</p>
            <p className="text-xs text-text-secondary">{teacher.employeeId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: teacher => (
        <div>
          <p className="text-sm">{teacher.phone}</p>
          <p className="text-xs text-text-secondary">{teacher.email}</p>
        </div>
      ),
    },
    {
      key: 'dept',
      label: 'Department',
      sortable: true,
      sortKey: 'department',
      render: teacher => teacher.department || '—',
    },
    {
      key: 'desig',
      label: 'Designation',
      sortable: true,
      sortKey: 'designation',
      render: teacher => teacher.designation || 'Teacher',
    },
    {
      key: 'grades',
      label: 'Grade Levels',
      render: teacher => (
        <div className="flex flex-wrap gap-1">
          {(teacher.eligibleGradeLevels || []).map(level => (
            <span key={level} className="badge-blue">{level.replace(/_/g, ' ')}</span>
          ))}
          {!teacher.eligibleGradeLevels?.length && <span className="text-xs text-slate-400">All levels</span>}
        </div>
      ),
    },
    {
      key: 'ct',
      label: 'Class Teacher',
      align: 'center',
      render: teacher => <div className="text-center">{teacher.isClassTeacher ? <span className="badge-green">Yes</span> : <span className="text-slate-300">—</span>}</div>,
    },
    {
      key: 'actions',
      label: 'ACTION',
      align: 'center',
      render: teacher => (
        <div className="flex justify-center gap-1">
          <button onClick={() => openModal(teacher)} className="btn-icon" title="Edit teacher"><FiEdit2 /></button>
          <button onClick={() => handleDelete(teacher._id)} className="btn-icon text-red-600" title="Delete teacher"><FiTrash2 /></button>
        </div>
      ),
    },
  ];

  const groupedTeachers = useMemo(() => {
    const groups = {
      higher_secondary: [],
      secondary: [],
      other: [],
    };

    teachers.forEach(teacher => {
      const levels = teacher.eligibleGradeLevels || [];
      if (levels.includes('higher_secondary')) {
        groups.higher_secondary.push(teacher);
        return;
      }
      if (levels.includes('secondary')) {
        groups.secondary.push(teacher);
        return;
      }
      groups.other.push(teacher);
    });

    return [
      {
        key: 'higher_secondary',
        title: 'Higher Secondary Teachers',
        description: 'Teachers assigned to Grade 11 and Grade 12.',
        rows: groups.higher_secondary,
      },
      {
        key: 'secondary',
        title: 'Secondary Teachers',
        description: 'Teachers assigned to Grade 9 and Grade 10.',
        rows: groups.secondary,
      },
      {
        key: 'other',
        title: 'Other Teachers',
        description: 'Teachers assigned to pre-primary, primary, middle, or all levels.',
        rows: groups.other,
      },
    ].filter(group => group.rows.length > 0);
  }, [teachers]);

  return (
    <div className="float-in">
      <PageHeader
        title="Teachers"
        subtitle={`${total} teachers`}
        actions={<button onClick={() => openModal()} className="btn-primary"><FiPlus />Add Teacher</button>}
      />

      <div className="campus-panel mb-4 p-4">
        <SearchInput
          className="max-w-sm"
          value={search}
          onChange={setSearch}
          placeholder="Search by name, ID, phone..."
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="campus-panel overflow-hidden">
            <DataTable
              columns={columns}
              data={teachers}
              loading={loading}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={setSort}
            />
          </div>
        ) : groupedTeachers.length === 0 ? (
          <div className="campus-panel overflow-hidden">
            <DataTable
              columns={columns}
              data={[]}
              loading={false}
              emptyMessage="No teachers found."
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={setSort}
            />
          </div>
        ) : groupedTeachers.map(group => (
          <div key={group.key} className="campus-panel overflow-hidden">
            <div className="border-b border-border bg-slate-50/70 px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Teacher Group</p>
              <div className="mt-2 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-text-primary">{group.title}</h2>
                  <p className="mt-1 text-sm text-text-secondary">{group.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Teachers</p>
                  <p className="mt-2 text-base font-semibold text-text-primary">{group.rows.length}</p>
                </div>
              </div>
            </div>
            <DataTable
              columns={columns}
              data={group.rows}
              loading={false}
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

      <Modal
        open={modal}
        onClose={closeModal}
        title={editItem ? 'Edit Teacher' : 'Add Teacher'}
        size="lg"
        footer={(
          <>
            <button onClick={closeModal} className="btn-secondary btn-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">{saving ? 'Saving...' : editItem ? 'Update' : 'Create'}</button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group"><label className="label">First Name *</label><input className="input" value={form.firstName} onChange={event => setForm(current => ({ ...current, firstName: event.target.value }))} /></div>
            <div className="form-group"><label className="label">Last Name</label><input className="input" value={form.lastName} onChange={event => setForm(current => ({ ...current, lastName: event.target.value }))} /></div>
            <div className="form-group"><label className="label">Employee ID *</label><input className="input" value={form.employeeId} onChange={event => setForm(current => ({ ...current, employeeId: event.target.value }))} /></div>
            <div className="form-group"><label className="label">Phone *</label><input className="input" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} /></div>
            <div className="form-group"><label className="label">Email *</label><input className="input" type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></div>
            <div className="form-group"><label className="label">Gender</label><select className="input" value={form.gender} onChange={event => setForm(current => ({ ...current, gender: event.target.value }))}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
            <div className="form-group"><label className="label">Department</label><input className="input" value={form.department} onChange={event => setForm(current => ({ ...current, department: event.target.value }))} /></div>
            <div className="form-group"><label className="label">Designation</label><input className="input" value={form.designation} onChange={event => setForm(current => ({ ...current, designation: event.target.value }))} /></div>
            <div className="form-group"><label className="label">Qualification</label><input className="input" value={form.qualification} onChange={event => setForm(current => ({ ...current, qualification: event.target.value }))} /></div>
            <div className="form-group"><label className="label">Experience (Years)</label><input className="input" type="number" value={form.experienceYears} onChange={event => setForm(current => ({ ...current, experienceYears: Number(event.target.value) }))} /></div>
            <div className="form-group"><label className="label">Max Periods/Day</label><input className="input" type="number" min="1" max="10" value={form.maxPeriodsPerDay} onChange={event => setForm(current => ({ ...current, maxPeriodsPerDay: Number(event.target.value) }))} /></div>
            <div className="form-group"><label className="label">Max Periods/Week</label><input className="input" type="number" min="1" max="40" value={form.maxPeriodsPerWeek} onChange={event => setForm(current => ({ ...current, maxPeriodsPerWeek: Number(event.target.value) }))} /></div>
          </div>

          <div className="form-group">
            <label className="label">Eligible Grade Levels</label>
            <div className="flex flex-wrap gap-2">
              {GRADE_LEVELS.map(level => (
                <label key={level.value} className="flex cursor-pointer items-center gap-2 border border-border px-3 py-1.5 text-xs transition hover:border-primary-400">
                  <input type="checkbox" checked={form.eligibleGradeLevels.includes(level.value)} onChange={() => toggleArr('eligibleGradeLevels', level.value)} className="accent-primary-700" />
                  {level.label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Eligible Subjects</label>
            <div className="mb-2 text-xs text-text-secondary">
              {form.eligibleGradeLevels.length
                ? 'Only subjects matching the selected grade levels are shown below.'
                : 'Select grade levels first to narrow the subject list, or leave this empty to allow all matching subjects.'}
            </div>
            <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto border border-border p-2">
              {filteredSubjects.map(subject => (
                <label key={subject._id} className="flex cursor-pointer items-center gap-2 py-1 text-xs">
                  <input type="checkbox" checked={form.eligibleSubjects.includes(subject._id)} onChange={() => toggleArr('eligibleSubjects', subject._id)} className="accent-primary-700" />
                  {subject.name}
                </label>
              ))}
              {filteredSubjects.length === 0 && (
                <p className="col-span-2 py-2 text-xs text-slate-400">No subjects match the selected grade levels.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {[['isLabEligible', 'Lab Eligible'], ['isPTEligible', 'PT Eligible'], ['isLibraryEligible', 'Library Eligible']].map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.checked }))} className="accent-primary-700" />
                {label}
              </label>
            ))}
          </div>

          {!editItem && (
            <div className="border border-border p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.createUserAccount} onChange={event => setForm(current => ({ ...current, createUserAccount: event.target.checked }))} className="accent-primary-700" />
                Create Login Account
              </label>
              {form.createUserAccount && (
                <div className="mt-2 form-group">
                  <label className="label">Password (leave blank to use Employee ID)</label>
                  <input className="input" type="password" placeholder="Default: Employee ID" value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} />
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
