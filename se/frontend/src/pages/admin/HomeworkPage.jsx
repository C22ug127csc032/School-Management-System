import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import api from '../../api/axios.js';
import { EmptyState, Modal, PageHeader, PageLoader, SearchableSelect } from '../../components/common/index.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import useTeacherScope from '../../hooks/useTeacherScope.js';

const formatDate = value => value ? new Date(value).toLocaleDateString('en-IN') : '-';

function getHomeworkAssignmentError(message, { isTeacherRole, isClassTeacherRole, className, subjectName }) {
  if (message === 'You can only assign homework for your own teacher profile.') {
    return 'Homework can only be assigned from your own teacher account. Please select your own teacher profile.';
  }

  if (message === 'You can only assign homework for your own subject and class.') {
    return isClassTeacherRole
      ? `You cannot assign ${subjectName || 'this subject'} for ${className || 'this class'} because it is not allocated to your class-teacher access. Please choose one of the subjects assigned to you.`
      : `You cannot assign ${subjectName || 'this subject'} for ${className || 'this class'} because it is not in your teaching allocation. Please choose one of your own assigned subjects.`;
  }

  return message || 'Failed to save homework.';
}

export default function HomeworkPage() {
  const academicYear = useAcademicYear();
  const { isTeacherRole, isClassTeacherRole, teacherId, classTeacherOf, eligibleSubjectIds } = useTeacherScope();
  const [homework, setHomework] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ classId: '', subjectId: '', teacherId: '', title: '', description: '', dueDate: '' });

  useEffect(() => {
    if (isTeacherRole && teacherId && !form.teacherId) {
      setForm(f => ({ ...f, teacherId }));
    }
  }, [isTeacherRole, teacherId, form.teacherId]);

  const load = async () => {
    setLoading(true);
    try {
      const hParams = isTeacherRole ? { academicYear, teacherId } : { academicYear };
      const cParams = isTeacherRole
        ? { academicYear, teacherId }
        : { academicYear };
      const [hwRes, classRes, teacherRes] = await Promise.all([
        api.get('/homework', { params: hParams }),
        api.get('/classes', { params: cParams }),
        api.get('/teachers', { params: { limit: 200 } }),
      ]);
      setHomework(hwRes.data.data);
      setClasses(classRes.data.data);
      setTeachers(teacherRes.data.data);
    } catch {
      toast.error('Failed to load homework.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [academicYear, teacherId, isTeacherRole, classTeacherOf]);

  useEffect(() => {
    if (isTeacherRole && classTeacherOf && !form.classId && classes.some(item => String(item._id) === String(classTeacherOf))) {
      setForm(current => ({ ...current, classId: classTeacherOf }));
    }
  }, [isTeacherRole, classTeacherOf, form.classId, classes]);

  useEffect(() => {
    if (!form.classId) {
      setClassSubjects([]);
      setForm(current => ({ ...current, subjectId: '' }));
      return;
    }

    const subjectUrl = isClassTeacherRole && classTeacherOf && String(form.classId) === String(classTeacherOf)
      ? '/class-subjects'
      : (isTeacherRole ? `/class-subjects/teacher/${teacherId}` : '/class-subjects');

    api.get(subjectUrl, { params: { classId: form.classId, academicYear } })
      .then(response => {
        const assignments = response.data.data || [];
        const visibleAssignments = isTeacherRole
          ? assignments.filter(item => (
              String(item.teacher?._id || item.teacher || '') === String(teacherId)
              || (
                isClassTeacherRole
                && String(form.classId) === String(classTeacherOf)
                && !item.teacher
                && eligibleSubjectIds.includes(String(item.subject?._id || item.subject || ''))
              )
            ))
          : assignments;
        setClassSubjects(visibleAssignments);
        setForm(current => ({
          ...current,
          subjectId: visibleAssignments.some(item => String(item.subject?._id) === String(current.subjectId)) ? current.subjectId : '',
        }));
      })
      .catch(() => toast.error('Failed to load class subjects.'));
  }, [form.classId, academicYear, isTeacherRole, isClassTeacherRole, teacherId, classTeacherOf, eligibleSubjectIds]);

  const classOptions = classes.map(item => ({ value: item._id, label: item.displayName || `Grade ${item.grade}-${item.section}` }));
  const subjectOptions = classSubjects.map(item => ({
    value: item.subject?._id,
    label: `${item.subject?.name} (${item.subject?.code})`,
  }));
  const teacherOptions = teachers.map(item => ({ value: item._id, label: `${item.firstName} ${item.lastName} [${item.employeeId}]` }));

  const filteredTeachers = useMemo(() => {
    if (!form.subjectId) return teacherOptions;
    return teachers
      .filter(teacher => {
        const subjectIds = (teacher.eligibleSubjects || []).map(subject => String(subject?._id || subject));
        return subjectIds.length === 0 || subjectIds.includes(String(form.subjectId));
      })
      .map(item => ({ value: item._id, label: `${item.firstName} ${item.lastName} [${item.employeeId}]` }));
  }, [teachers, teacherOptions, form.subjectId]);

  const handleSave = async () => {
    if (!form.classId || !form.subjectId || !form.teacherId || !form.title.trim() || !form.dueDate) {
      return toast.error('Please fill all required fields.');
    }

    const selectedClassLabel = classOptions.find(item => String(item.value) === String(form.classId))?.label || 'this class';
    const selectedSubjectLabel = subjectOptions.find(item => String(item.value) === String(form.subjectId))?.label || 'this subject';

    if (isTeacherRole && classSubjects.length === 0) {
      return toast.error(
        isClassTeacherRole
          ? `No subjects are assigned to you for ${selectedClassLabel}. Ask admin to allocate subjects for this class first.`
          : `No subjects are assigned to you for ${selectedClassLabel}. Please choose one of your allocated classes.`
      );
    }

    if (isTeacherRole && !classSubjects.some(item => String(item.subject?._id || item.subject) === String(form.subjectId))) {
      return toast.error(`"${selectedSubjectLabel}" is not assigned to you for ${selectedClassLabel}. Please choose one of your allocated subjects.`);
    }

    setSaving(true);
    try {
      await api.post('/homework', {
        class: form.classId,
        subject: form.subjectId,
        teacher: form.teacherId,
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate,
        academicYear,
      });
      toast.success('Homework assigned.');
      setModal(false);
      setForm({ classId: '', subjectId: '', teacherId: '', title: '', description: '', dueDate: '' });
      load();
    } catch (err) {
      toast.error(getHomeworkAssignmentError(err.response?.data?.message, {
        isTeacherRole,
        isClassTeacherRole,
        className: selectedClassLabel,
        subjectName: selectedSubjectLabel,
      }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Remove this homework?')) return;
    try {
      await api.delete(`/homework/${id}`);
      toast.success('Homework removed.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove homework.');
    }
  };

  return (
    <div className="float-in">
      <PageHeader
        title="Homework"
        subtitle="Assign and manage class homework"
        actions={<button onClick={() => setModal(true)} className="btn-primary"><FiPlus />Add Homework</button>}
      />

      {loading ? <PageLoader /> : homework.length === 0 ? (
        <div className="campus-panel">
          <EmptyState title="No homework yet" description="Create homework for a class to get started." />
        </div>
      ) : (
        <div className="space-y-4">
          {homework.map(item => (
            <div key={item._id} className="campus-panel border-l-4 border-primary-600 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">{item.title}</h2>
                  <p className="mt-1 text-sm text-text-secondary">{item.description || 'No description provided.'}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-secondary">
                    <span><strong>Class:</strong> {item.class?.displayName || '-'}</span>
                    <span><strong>Subject:</strong> {item.subject?.name || '-'}</span>
                    <span><strong>Teacher:</strong> {item.teacher ? `${item.teacher.firstName} ${item.teacher.lastName}` : '-'}</span>
                    <span><strong>Due:</strong> {formatDate(item.dueDate)}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(item._id)} className="btn-icon text-red-600"><FiTrash2 /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Assign Homework"
        footer={<><button onClick={() => setModal(false)} className="btn-secondary btn-sm">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">{saving ? 'Saving...' : 'Assign Homework'}</button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Class *</label>
              <SearchableSelect options={classOptions} value={form.classId} onChange={value => setForm(current => ({ ...current, classId: value }))} placeholder="Select class..." />
            </div>
            <div className="form-group">
              <label className="label">Subject *</label>
              <SearchableSelect options={subjectOptions} value={form.subjectId} onChange={value => setForm(current => ({ ...current, subjectId: value }))} placeholder="Select subject..." />
            </div>
          </div>
          {isTeacherRole && form.classId && classSubjects.length === 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {isClassTeacherRole
                ? 'No subject allocation was found for this class under your teacher access. Select a class/subject assigned to you.'
                : 'This class does not have any subject allocation under your teacher profile. Please choose one of your own assigned classes.'}
            </div>
          )}
          {!isTeacherRole && (
            <div className="form-group">
              <label className="label">Teacher *</label>
              <SearchableSelect options={filteredTeachers} value={form.teacherId} onChange={value => setForm(current => ({ ...current, teacherId: value }))} placeholder="Select teacher..." />
            </div>
          )}
          {isTeacherRole && form.classId && classSubjects.length > 0 && (
            <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Only the subjects shown in the subject dropdown are allocated to your logged-in teacher account for this class.
            </p>
          )}
          <div className="form-group">
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(current => ({ ...current, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input" rows="4" value={form.description} onChange={e => setForm(current => ({ ...current, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Due Date *</label>
            <input type="date" className="input" value={form.dueDate} onChange={e => setForm(current => ({ ...current, dueDate: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
