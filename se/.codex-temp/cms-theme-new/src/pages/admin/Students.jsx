import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import {
  ExportActions, PageHeader, StatusBadge, EmptyState,
  FilterBar, ListControls, Pagination, PageSpinner, ScrollableTableArea, SearchableSelect,
} from '../../components/common';
import {
  FiAlertTriangle,
  FiAward,
  FiBook,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiEye,
  FiHome,
  FiTrendingUp,
  FiUsers,
  FiX,
} from '../../components/common/icons';
import toast from 'react-hot-toast';

const studentSortOptions = [
  { value: 'rollNo:asc', label: 'Roll No A-Z' },
  { value: 'name:asc', label: 'Student Name A-Z' },
  { value: 'className:asc', label: 'Class A-Z' },
  { value: 'semester:asc', label: 'Semester Low-High' },
  { value: 'status:asc', label: 'Status A-Z' },
  { value: 'latest:desc', label: 'Newest Added' },
];

const parseStudentSortValue = value => {
  const [sortBy = 'rollNo', sortOrder = 'asc'] = String(value || 'rollNo:asc').split(':');
  return { sortBy, sortOrder };
};

// ── Class Strength Bar ────────────────────────────────────────────────────────
function ClassStrengthBar({ className, courseId }) {
  const [strength, setStrength] = useState(null);

  useEffect(() => {
    if (!className) return;
    api.get(`/students/class-strength/${className}`, {
      params: { courseId },
    }).then(r => setStrength(r.data)).catch(() => {});
  }, [className, courseId]);

  if (!strength) return null;

  return (
    <div className={`flex items-center gap-4 p-3 rounded-xl border mb-4 ${
      strength.full
        ? 'bg-red-50 border-red-200'
        : strength.percentage >= 80
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-green-50 border-green-200'
    }`}>
      <div className="shrink-0">
        <p className={`text-sm font-bold ${
          strength.full ? 'text-red-700'
          : strength.percentage >= 80 ? 'text-yellow-700'
          : 'text-green-700'}`}>
          <span className="inline-flex items-center gap-1"><FiHome className="shrink-0" /> {className}</span>
        </p>
        <p className="text-xs text-gray-500 mt-0.5">Class Strength</p>
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">
            {strength.count} students enrolled
          </span>
          <span className="font-semibold text-gray-700">
            {strength.count} / {strength.max}
          </span>
        </div>
        <div className="w-full bg-white rounded-full h-2.5
          overflow-hidden border border-gray-100">
          <div
            className={`h-2.5 rounded-full transition-all duration-700 ${
              strength.full ? 'bg-red-500'
              : strength.percentage >= 80 ? 'bg-yellow-500'
              : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(strength.percentage, 100)}%` }}
          />
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-lg font-bold ${
          strength.full ? 'text-red-600'
          : strength.percentage >= 80 ? 'text-yellow-600'
          : 'text-green-600'}`}>
          {strength.percentage}%
        </p>
        <p className="text-xs text-gray-400">
          {strength.full ? 'Full' : `${strength.remaining} left`}
        </p>
      </div>
    </div>
  );
}

// ── Promote Class Modal ───────────────────────────────────────────────────────
function PromoteModal({ open, onClose, onDone, courses }) {
  const [selectedClass, setSelectedClass]   = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [classes, setClasses]               = useState([]);
  const [preview, setPreview]               = useState(null);
  const [loading, setLoading]               = useState(false);
  const [result, setResult]                 = useState(null);

  // Load classes when modal opens
  useEffect(() => {
    if (!open) { setResult(null); setPreview(null); setSelectedClass(''); return; }
    api.get('/students', { params: { limit: 200 } })
      .then(r => {
        const unique = [...new Set(
          r.data.students
            .filter(s => ['active', 'admission_pending'].includes(s.status))
            .map(s => s.className)
            .filter(Boolean)
        )].sort();
        setClasses(unique);
      });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (courses.length === 1) {
      setSelectedCourse(courses[0]._id);
    }
  }, [courses, open]);

  // Preview students when class selected
  useEffect(() => {
    if (!selectedClass) { setPreview(null); return; }
    api.get('/students', {
      params: { className: selectedClass, limit: 100 },
    }).then(r => setPreview(r.data));
  }, [selectedClass]);

  const handlePromote = async () => {
    if (!selectedClass) { toast.error('Select a class first'); return; }
    if (!window.confirm(
      `Promote ALL students in ${selectedClass} to next semester?\n\nThis cannot be undone.`
    )) return;

    setLoading(true);
    try {
      const r = await api.post('/students/promote', {
        className: selectedClass,
        courseId:  selectedCourse,
      });
      setResult(r.data);
      toast.success(r.data.message);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Promotion failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  // Get current semester from preview
  const currentSem  = preview?.students?.[0]?.semester || 1;
  const nextSem     = currentSem + 1;
  const course      = courses.find(c => c._id === selectedCourse);
  const maxSem      = course?.semesters || 6;
  const willGraduate = currentSem >= maxSem;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
      p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg
        max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5
          border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              Semester Promotion
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Promote all students of a class to next semester
            </p>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl">
            <FiX />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Result screen */}
          {result ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="flex justify-center mb-3">
                  <FiCheckCircle className="text-4xl text-green-600" />
                </div>
                <p className="text-lg font-bold text-gray-800">
                  Promotion Complete!
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedClass}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {result.summary.promoted}
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">Promoted</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-purple-700">
                    {result.summary.graduated}
                  </p>
                  <p className="text-xs text-purple-600 mt-0.5">Graduated</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {result.summary.total}
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">Total</p>
                </div>
              </div>

              {result.graduated.length > 0 && (
                <div className="p-3 bg-purple-50 rounded-xl border
                  border-purple-200">
                  <p className="text-xs font-semibold text-purple-700 mb-2 inline-flex items-center gap-1">
                    <FiAward className="shrink-0" />
                    Graduated Students:
                  </p>
                  <div className="space-y-1">
                    {result.graduated.map((name, i) => (
                      <p key={i} className="text-xs text-purple-600">
                        {name}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={onClose} className="btn-primary w-full">
                Done
              </button>
            </div>
          ) : (
            <>
              {courses.length > 1 && (
                <div>
                  <label className="label">Course</label>
                  <SearchableSelect
                    value={selectedCourse}
                    onChange={course => {
                      setSelectedCourse(course);
                      setSelectedClass('');
                      setPreview(null);
                    }}
                    placeholder="Select course..."
                    searchPlaceholder="Search courses..."
                    options={[
                      { value: '', label: 'Select course...', searchText: 'select course' },
                      ...courses.map(course => ({
                        value: course._id,
                        label: course.name,
                        searchText: `${course.name} ${course.code || ''} ${course.department || ''}`,
                      })),
                    ]}
                  />
                </div>
              )}

              {/* Class select */}
              <div>
                <label className="label">Class to Promote</label>
                <SearchableSelect
                  value={selectedClass}
                  onChange={setSelectedClass}
                  placeholder="Select class..."
                  searchPlaceholder="Search classes..."
                  options={[
                    { value: '', label: 'Select class...', searchText: 'select class' },
                    ...classes
                      .filter(cls => {
                        if (!selectedCourse) return true;
                        const c = courses.find(x => x._id === selectedCourse);
                        if (!c) return true;
                        const code = c.code ||
                          c.name.split(' ').filter(w => w.length > 2)
                            .map(w => w[0].toUpperCase()).join('');
                        return cls.startsWith(code);
                      })
                      .map(cls => ({
                        value: cls,
                        label: cls,
                        searchText: cls,
                      })),
                  ]}
                />
              </div>

              {/* Preview */}
              {preview && selectedClass && (
                <div className={`p-4 rounded-xl border ${
                  willGraduate
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className={`text-sm font-semibold ${
                      willGraduate ? 'text-purple-800' : 'text-blue-800'
                    }`}>
                      {willGraduate
                        ? 'These students will be graduated'
                        : `Semester ${currentSem} to ${nextSem}`
                      }
                    </p>
                    <span className={`text-xs font-bold px-2 py-0.5
                      rounded-full ${
                      willGraduate
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {preview.total} students
                    </span>
                  </div>

                  {/* Student list preview */}
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {preview.students?.map(s => (
                      <div key={s._id}
                        className="flex items-center justify-between
                          py-1 border-b border-white/50 last:border-0">
                        <span className={`text-xs ${
                          willGraduate ? 'text-purple-700' : 'text-blue-700'
                        }`}>
                          {s.firstName} {s.lastName}
                        </span>
                        <span className={`text-xs font-medium ${
                          willGraduate ? 'text-purple-500' : 'text-blue-500'
                        }`}>
                          Sem {s.semester}
                          {' to '}
                          {willGraduate ? 'Graduated' : `Sem ${nextSem}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning */}
              {selectedClass && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50
                  border border-yellow-200 rounded-xl">
                  <FiAlertTriangle className="text-yellow-500 text-base mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-700">
                    This will update ALL active students in{' '}
                    <strong>{selectedClass}</strong>.
                    This action cannot be undone.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="p-5 border-t border-gray-100 flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handlePromote}
              disabled={loading || !selectedClass}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm
                text-white transition-colors disabled:opacity-50
                ${willGraduate
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-primary-600 hover:bg-primary-700'
                }`}
            >
              {loading
                ? 'Promoting...'
                : willGraduate
                  ? `Graduate ${selectedClass}`
                  : `Promote to Semester ${nextSem}`
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Students Component ───────────────────────────────────────────────────
export default function Students() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can, getMasterOptions } = useAppSettings();

  const [students, setStudents]       = useState([]);
  const [currentCourseSection, setCurrentCourseSection] = useState(null);
  const [courses, setCourses]         = useState([]);
  const [classes, setClasses]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [generatingRollNos, setGeneratingRollNos] = useState(false);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(15);
  const [pages, setPages]             = useState(1);
  const [sort, setSort]               = useState('rollNo:asc');
  const [showPromote, setShowPromote] = useState(false);
  const [filters, setFilters]         = useState({
    search: '', course: '', status: '', className: '',
  });

  const setFilter = (k, v) => {
    setFilters(f => ({ ...f, [k]: v }));
    setPage(1);
  };

  const handleCourseFilter = v => {
    setFilters(f => ({ ...f, course: v, className: '' }));
    setPage(1);
  };

  const isClassTeacher = user?.role === 'class_teacher';
  const isAdmissionStaff = user?.role === 'admission_staff';
  const canAddStudent = can('admin_students_create', ['institution_owner', 'admin', 'admission_staff']);
  const canEditStudent = can('admin_students_edit', ['institution_owner', 'admin', 'admission_staff', 'class_teacher']);
  const canDeactivateStudent = can('admin_students_deactivate', ['institution_owner', 'admin']);
  const canPromoteOrGenerateRollNos = can('admin_students_promote', ['institution_owner', 'admin']);
  const canGenerateRollNos = can('admin_roll_numbers_generate', ['institution_owner', 'admin', 'class_teacher']);
  const getStudentStatusLabel = useCallback(status => {
    if (status === 'admission_pending') return 'Enrollment Pending';
    if (!status) return '-';
    return String(status)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }, []);
  const rollNumberFormatOptions = useMemo(
    () => getMasterOptions('student_roll_number_formats', [
      { value: 'yy_code_serial', label: '26BCA001 - Year + Course + Serial', isActive: true },
      { value: 'code_yy_serial', label: 'BCA26001 - Course + Year + Serial', isActive: false },
      { value: 'code_dash_yy_dash_serial', label: 'BCA-26-001 - Course / Year / Serial', isActive: false },
      { value: 'yy_dash_code_dash_serial', label: '26-BCA-001 - Year / Course / Serial', isActive: false },
    ]),
    [getMasterOptions]
  );
  const activeRollNumberFormatLabel =
    rollNumberFormatOptions.find(option => option.isActive !== false)?.label ||
    '26BCA001 - Year + Course + Serial';
  const normalizedDepartment = String(user?.department || '').trim().toUpperCase();
  const teacherCourse = useMemo(
    () => courses.find(c => {
      const courseName = String(c.name || '').trim().toUpperCase();
      const courseCode = String(c.code || '').trim().toUpperCase();
      const courseDepartment = String(c.department || '').trim().toUpperCase();
      const courseId = String(c._id || '').trim().toUpperCase();
      return (
        courseName === normalizedDepartment ||
        courseCode === normalizedDepartment ||
        courseDepartment === normalizedDepartment ||
        courseId === normalizedDepartment
      );
    }),
    [courses, normalizedDepartment]
  );
  const visibleCourses = useMemo(
    () => (isClassTeacher && teacherCourse ? [teacherCourse] : courses),
    [isClassTeacher, teacherCourse, courses]
  );

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      if (isClassTeacher && !teacherCourse?._id) {
        setStudents([]);
        setCurrentCourseSection(null);
        setTotal(0);
        setPages(1);
        setClasses([]);
        return;
      }

      const selectedCourseId = isClassTeacher ? teacherCourse?._id : filters.course || undefined;
      const selectedCourse = visibleCourses.find(course => course._id === selectedCourseId) || null;
      const { sortBy, sortOrder } = parseStudentSortValue(sort);
      const response = await api.get('/students', {
        params: {
          page,
          limit: pageSize,
          search: filters.search || undefined,
          status: filters.status || undefined,
          className: filters.className || undefined,
          course: selectedCourseId || undefined,
          sortBy,
          sortOrder,
        },
      });

      const nextStudents = response.data.students || [];
      setStudents(nextStudents);
      setTotal(response.data.total || 0);
      setPages(response.data.pages || 1);
      setCurrentCourseSection(selectedCourse ? {
        key: selectedCourse._id,
        title: selectedCourse.code || selectedCourse.name,
        subtitle: selectedCourse.name,
        courseId: selectedCourse._id,
        total: response.data.total || 0,
      } : null);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [filters, isClassTeacher, page, pageSize, sort, teacherCourse?._id, visibleCourses]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => {
    api.get('/courses').then(r => setCourses(r.data.courses));
  }, []);
  useEffect(() => {
    const selectedCourseId = isClassTeacher ? teacherCourse?._id : filters.course || undefined;
    const params = {
      page: 1,
      limit: 500,
      course: selectedCourseId || undefined,
      status: filters.status || undefined,
    };

    api.get('/students', { params })
      .then(response => {
        const nextClasses = [
          ...new Set((response.data.students || []).map(student => student.className).filter(Boolean)),
        ].sort();
        setClasses(nextClasses);
      })
      .catch(() => setClasses([]));
  }, [filters.course, filters.status, isClassTeacher, teacherCourse?._id]);
  useEffect(() => {
    if (page > pages && pages > 0) {
      setPage(pages);
    }
  }, [page, pages]);

  const handleToggleStudentStatus = async (e, student) => {
    e.stopPropagation();
    const isInactive = student.status === 'inactive';
    const actionLabel = isInactive ? 'activate' : 'deactivate';
    const studentName = `${student.firstName} ${student.lastName}`.trim();

    if (!window.confirm(`${isInactive ? 'Activate' : 'Deactivate'} ${studentName}?`)) return;

    try {
      const response = await api.put(`/students/${student._id}/toggle-status`);
      toast.success(response.data?.message || `${studentName} ${actionLabel}d`);
      await fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${actionLabel} student`);
    }
  };

  const handleGenerateRollNos = async () => {
    const fallbackTeacherCourseId = currentCourseSection?.courseId ||
      students.find(student => student.course?._id || student.course)?.course?._id ||
      students.find(student => student.course?._id || student.course)?.course;

    const selectedCourseId = isClassTeacher
      ? teacherCourse?._id || fallbackTeacherCourseId
      : filters.course || currentCourseSection?.courseId;

    if (!selectedCourseId) {
      toast.error('Select a course first to generate roll numbers');
      return;
    }

    const selectedCourse = visibleCourses.find(c => c._id === selectedCourseId);
    const confirmMessage =
      `Generate roll numbers for ${selectedCourse?.name || 'this course'}?\n\n` +
      `Format: ${activeRollNumberFormatLabel}.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setGeneratingRollNos(true);
      const r = await api.post('/students/generate-roll-nos', {
        courseId: selectedCourseId,
      });
      toast.success(r.data.message);
      setGeneratingRollNos(false);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate roll numbers');
    } finally {
      setGeneratingRollNos(false);
    }
  };

  const pendingCount = students.filter(
    s => !s.regNo || s.status === 'admission_pending'
  ).length;

  const filteredClasses = classes.filter(cls => {
    if (!filters.course) return true;
    const course = visibleCourses.find(c => c._id === filters.course);
    if (!course) return true;
    const code = course.code ||
      course.name.split(' ').filter(w => w.length > 2)
        .map(w => w[0].toUpperCase()).join('');
    return cls.startsWith(code);
  });

  const getRollNoColor = gender => {
    const normalizedGender = (gender || '').trim().toLowerCase();
    if (normalizedGender === 'male') return 'text-blue-600';
    if (normalizedGender === 'female') return 'text-red-600';
    return 'text-gray-600';
  };

  const getDisplayClassName = student => {
    const courseCode = String(student?.course?.code || '').trim().toUpperCase();
    const section = String(student?.section || '').trim().toUpperCase();
    const semester = Number(student?.semester) || 0;
    const academicYear = semester ? Math.max(1, Math.ceil(semester / 2)) : 0;

    if (courseCode && academicYear && section) {
      return `${courseCode} ${academicYear}-${section}`;
    }

    return student?.className || '';
  };

  const renderStudentRow = s => (
    <tr key={s._id}
      className="hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => navigate(`/admin/students/${s._id}`)}>

      <td className={`table-cell font-mono text-xs font-semibold ${
        getRollNoColor(s.gender)
      }`}>
        {s.rollNo || '-'}
      </td>

      <td className="table-cell">
        {s.regNo
          ? <div className="font-mono text-xs text-gray-600 mb-1">
              {s.regNo}
            </div>
          : null}
        {!s.regNo || s.status === 'admission_pending'
          ? <span className="inline-flex items-center gap-1
              text-xs text-orange-600 bg-orange-50 border
              border-orange-200 px-2 py-0.5 rounded-full
              font-medium">
              Pending
            </span>
          : null}
      </td>

      <td className="table-cell">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary-100
            text-primary-700 font-bold text-xs flex items-center
            justify-center shrink-0 overflow-hidden">
            {s.photo
              ? <img src={s.photo} alt=""
                  className="w-9 h-9 rounded-full object-cover" />
              : s.firstName?.[0]}
          </div>
          <div>
            <p className="font-medium text-gray-800">
              {s.firstName} {s.lastName}
            </p>
            <p className="text-xs text-gray-400">
              {s.batch || 'â€“'}
            </p>
          </div>
        </div>
      </td>

      <td className="table-cell">
        <div className="font-mono text-xs text-gray-600 mb-1">
          {s.admissionNo || 'â€“'}
        </div>
      </td>

      {!s.hideCourseColumn && (
        <td className="table-cell text-gray-500 text-xs">
          {s.course?.name || 'â€“'}
        </td>
      )}

      <td className="table-cell">
        {getDisplayClassName(s)
          ? <button
              onClick={e => {
                e.stopPropagation();
                setFilter('className', s.className || getDisplayClassName(s));
              }}
              className="inline-flex items-center px-2 py-0.5
                bg-blue-50 text-blue-700 text-xs font-semibold
                rounded-md border border-blue-100
                hover:bg-blue-100 transition-colors">
              {getDisplayClassName(s)}
            </button>
          : <span className="text-gray-300 text-xs">
              Not assigned
            </span>
        }
      </td>

      <td className="table-cell text-center text-gray-500 text-xs">
        {s.semester ? `Sem ${s.semester}` : '-'}
      </td>

      <td className="table-cell font-mono text-xs text-gray-500">
        {s.phone}
      </td>

      <td className="table-cell text-center">
        {s.isHosteler
          ? <span className="text-purple-600 text-xs font-medium">
              <span className="inline-flex items-center gap-1">
                <FiHome className="shrink-0" />
                {s.hostelRoom || 'Hostel'}
              </span>
            </span>
          : <span className="text-gray-500 text-xs font-semibold">DS</span>
        }
      </td>

      <td className="table-cell">
        {s.status === 'admission_pending'
          ? <span className="inline-flex items-center gap-1
              text-xs text-yellow-700 bg-yellow-50 border
              border-yellow-200 px-2 py-0.5 rounded-full">
              <FiClock className="shrink-0" />
              Enrollment
            </span>
          : <StatusBadge status={s.status} />
        }
      </td>

      <td className="table-cell"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <button
            type="button"
            onClick={() => navigate(`/admin/students/${s._id}`)}
            className="action-icon-button action-icon-button-neutral"
            aria-label={`View ${s.firstName} ${s.lastName}`}
            title="View student">
            <FiEye className="text-sm" />
          </button>
          {canEditStudent && (
            <button
              type="button"
              onClick={() => navigate(`/admin/students/${s._id}/edit`)}
              className="action-icon-button action-icon-button-primary"
              aria-label={`Edit ${s.firstName} ${s.lastName}`}
              title="Edit student">
              <FiEdit3 className="text-sm" />
            </button>
          )}
          {canDeactivateStudent && (
            <button
              type="button"
              onClick={e => handleToggleStudentStatus(e, s)}
              className={`action-icon-button ${
                s.status === 'inactive'
                  ? 'action-icon-button-success'
                  : 'action-icon-button-danger'
              }`}
              aria-label={`${s.status === 'inactive' ? 'Activate' : 'Deactivate'} ${s.firstName} ${s.lastName}`}
              title={`${s.status === 'inactive' ? 'Activate' : 'Deactivate'} student`}>
              {s.status === 'inactive'
                ? <FiCheckCircle className="text-sm" />
                : <FiX className="text-sm" />}
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  const renderStudentsTable = (courseStudents, hideCourseColumn = false) => (
    <ScrollableTableArea className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <table className="min-w-[1120px] w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="table-header">Roll No</th>
            <th className="table-header">Reg No</th>
            <th className="table-header">Student</th>
            <th className="table-header">Admission No</th>
            {!hideCourseColumn && <th className="table-header">Course</th>}
            <th className="table-header">Class</th>
            <th className="table-header">Semester</th>
            <th className="table-header">Phone</th>
            <th className="table-header">Hostel/DS</th>
            <th className="table-header">Status</th>
            <th className="table-header">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {courseStudents.map(s => renderStudentRow({
            ...s,
            hideCourseColumn,
          }))}
        </tbody>
      </table>
    </ScrollableTableArea>
  );

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={isClassTeacher
          ? `${total} students in your assigned department. You can update register numbers and generate roll numbers here.`
          : isAdmissionStaff
            ? `${total} students in admission and enrollment records`
          : `${total} students total`}
        action={
          (canAddStudent || canPromoteOrGenerateRollNos || canGenerateRollNos) ? (
            <div className="flex flex-wrap gap-2">
              <ExportActions
                getExportConfig={() => ({
                  fileName: [
                    'students',
                    visibleCourses.find(course => course._id === filters.course)?.code ||
                      visibleCourses.find(course => course._id === filters.course)?.name ||
                      currentCourseSection?.title ||
                      '',
                    filters.className || '',
                    filters.status ? getStudentStatusLabel(filters.status) : '',
                  ].filter(Boolean).join('-'),
                  title: 'Students Export',
                  subtitle: 'Student records from the current filtered student list.',
                  summary: [
                    { label: 'Visible Students', value: students.length },
                    { label: 'Total Count', value: total },
                    { label: 'Active', value: students.filter(student => student.status === 'active').length },
                    { label: 'Pending', value: pendingCount },
                    { label: 'Hostel Students', value: students.filter(student => student.isHosteler).length },
                    { label: 'Course Filter', value: visibleCourses.find(course => course._id === filters.course)?.name || currentCourseSection?.subtitle || 'All Courses' },
                    { label: 'Class Filter', value: filters.className || 'All Classes' },
                    { label: 'Search', value: filters.search || 'Not Applied' },
                  ],
                  sections: [
                    {
                      title: 'Students',
                      columns: [
                        { header: 'Admission No', value: student => student.admissionNo || '-' },
                        { header: 'Reg No', value: student => student.regNo || '-' },
                        { header: 'Roll No', value: student => student.rollNo || '-' },
                        { header: 'Name', value: student => `${student.firstName || ''} ${student.lastName || ''}`.trim() || '-' },
                        { header: 'Course', value: student => student.course?.name || '-' },
                        { header: 'Class', value: student => getDisplayClassName(student) || student.className || '-' },
                        { header: 'Semester', value: student => student.semester || '-' },
                        { header: 'Phone', value: student => student.phone || '-' },
                        { header: 'Status', value: student => getStudentStatusLabel(student.status) },
                        { header: 'Hostel/DS', value: student => student.isHosteler ? (student.hostelRoom || 'Hostel') : 'DS' },
                      ],
                      rows: students,
                    },
                  ],
                })}
                disabled={loading || students.length === 0}
              />
              {canPromoteOrGenerateRollNos && (
                <>
                  <button
                    onClick={() => setShowPromote(true)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <FiTrendingUp />
                    Promote Class
                  </button>
                </>
              )}
              {canGenerateRollNos && (
                <button
                  onClick={handleGenerateRollNos}
                  disabled={generatingRollNos}
                  className="btn-secondary disabled:opacity-50"
                >
                  {generatingRollNos ? 'Generating...' : 'Generate Roll No'}
                </button>
              )}
              {canAddStudent && (
                <button
                  className="btn-primary"
                  onClick={() => navigate('/admin/students/add')}
                >
                  + Add Student
                </button>
              )}
            </div>
          ) : null
        }
      />

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total',    value: total,
            icon: FiUsers, color: 'bg-blue-50 text-blue-700' },
          { label: 'Active',   value: students.filter(s => s.status === 'active').length,
            icon: FiCheckCircle, color: 'bg-green-50 text-green-700' },
          { label: 'Pending',  value: pendingCount,
            icon: FiClock, color: 'bg-yellow-50 text-yellow-700' },
          { label: 'Hostel',   value: students.filter(s => s.isHosteler).length,
            icon: FiHome, color: 'bg-purple-50 text-purple-700' },
        ].map(stat => (
          <div key={stat.label}
            className={`rounded-xl p-4 flex items-center gap-3 ${stat.color}`}>
            <span className="text-2xl"><stat.icon /></span>
            <div>
              <p className="text-2xl font-bold leading-none">{stat.value}</p>
              <p className="text-xs font-medium opacity-75 mt-0.5">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">

        {/* ── Filters ── */}
        <FilterBar>
          <input className="input w-52"
            placeholder="Search name / admission no / reg no / phone..."
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)} />

          {!isClassTeacher && (
            <SearchableSelect
              className="w-48"
              value={filters.course}
              onChange={handleCourseFilter}
              placeholder="All Courses"
              searchPlaceholder="Search courses..."
              options={[
                { value: '', label: 'All Courses', searchText: 'all courses' },
                ...visibleCourses.map(course => ({
                  value: course._id,
                  label: course.name,
                  searchText: `${course.name} ${course.code || ''} ${course.department || ''}`,
                })),
              ]}
            />
          )}

          {classes.length > 0 && (
            <SearchableSelect
              className="w-36"
              value={filters.className}
              onChange={value => setFilter('className', value)}
              placeholder="All Classes"
              searchPlaceholder="Search classes..."
              options={[
                { value: '', label: 'All Classes', searchText: 'all classes' },
                ...filteredClasses.map(cls => ({
                  value: cls,
                  label: cls,
                  searchText: cls,
                })),
              ]}
            />
          )}

          <SearchableSelect
            className="w-44"
            value={filters.status}
            onChange={value => setFilter('status', value)}
            placeholder="All Status"
            searchPlaceholder="Search statuses..."
            options={[
              { value: '', label: 'All Status', searchText: 'all status' },
              { value: 'active', label: 'Active', searchText: 'active' },
              { value: 'admission_pending', label: 'Enrollment Pending', searchText: 'enrollment pending admission pending' },
              { value: 'inactive', label: 'Inactive', searchText: 'inactive' },
              { value: 'graduated', label: 'Graduated', searchText: 'graduated' },
            ]}
          />

          {(filters.search || filters.course ||
            filters.className || filters.status) && (
            <button
              onClick={() => setFilters({
                search: '', course: '', status: '', className: '',
              })}
              className="btn-secondary text-sm px-3">
              <span className="inline-flex items-center gap-1">
                Clear <FiX />
              </span>
            </button>
          )}
        </FilterBar>

        {/* ── Active Filter Pills ── */}
        {(filters.course || filters.className) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.course && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1
                bg-blue-50 text-blue-700 text-xs font-medium rounded-full
                border border-blue-200">
                <FiBook className="shrink-0" /> {visibleCourses.find(c => c._id === filters.course)?.name}
                <button onClick={() => handleCourseFilter('')}
                  className="hover:text-blue-900"><FiX /></button>
              </span>
            )}
            {filters.className && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1
                bg-green-50 text-green-700 text-xs font-medium rounded-full
                border border-green-200">
                <FiHome className="shrink-0" /> Class {filters.className}
                <button onClick={() => setFilter('className', '')}
                  className="hover:text-green-900"><FiX /></button>
              </span>
            )}
          </div>
        )}

        {/* ── Class Strength Bar ── */}
        {filters.className && (
          <ClassStrengthBar
            className={filters.className}
            courseId={isClassTeacher ? teacherCourse?._id : filters.course}
          />
        )}

        {/* ── Pending Banner ── */}
        {pendingCount > 0 && !filters.status && !isClassTeacher && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50
            border border-yellow-200 rounded-xl mb-4">
            <FiClock className="text-yellow-500 text-lg shrink-0" />
            <p className="text-sm text-yellow-800 flex-1">
              <strong>{pendingCount} student{pendingCount > 1 ? 's' : ''}</strong>{' '}
              have admission numbers only — assign Register Number after enrollment.
            </p>
            <button
              onClick={() => setFilter('status', 'admission_pending')}
              className="text-xs text-yellow-700 font-medium underline
                whitespace-nowrap">
              View →
            </button>
          </div>
        )}
        {pendingCount > 0 && isClassTeacher && !filters.status && (
          <div className="flex items-center gap-2 p-3 bg-blue-50
            border border-blue-200 rounded-xl mb-4">
            <FiClock className="text-blue-500 text-lg shrink-0" />
            <p className="text-sm text-blue-800 flex-1">
              <strong>{pendingCount} student{pendingCount > 1 ? 's' : ''}</strong>{' '}
              in your department are waiting for enrollment details. Add the register number in the student record, then generate roll numbers for your course.
            </p>
          </div>
        )}

        {/* ── Table ── */}
        <ListControls
          sortValue={sort}
          onSortChange={value => {
            setSort(value);
            setPage(1);
          }}
          sortOptions={studentSortOptions}
          pageSize={pageSize}
          onPageSizeChange={value => {
            setPageSize(value);
            setPage(1);
          }}
          resultCount={total}
        />

        {loading ? <PageSpinner /> : (
          <>
            {currentCourseSection && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-slate-50 px-4 py-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{currentCourseSection.title}</h2>
                  <p className="text-sm text-slate-500">{currentCourseSection.subtitle}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Showing server-filtered student records for this course.
                  </p>
                </div>
                <div className="text-sm text-slate-500">
                  {currentCourseSection.total} students
                </div>
              </div>
            )}

            {students.length > 0 && renderStudentsTable(students, Boolean(filters.course || isClassTeacher))}

            {students.length === 0 && (
              <EmptyState
                message={
                  filters.search || filters.course ||
                  filters.status || filters.className
                    ? 'No students match your filters'
                    : 'No students added yet'
                }
                icon={<FiUsers />}
              />
            )}

            <Pagination page={page} pages={pages || 1} onPage={setPage} />
          </>
        )}
      </div>

      {/* ── Promote Modal ── */}
      <PromoteModal
        open={showPromote}
        onClose={() => setShowPromote(false)}
        onDone={() => { setShowPromote(false); fetchStudents(); }}
        courses={visibleCourses}
      />
    </div>
  );
}
