import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { PageHeader, SearchableSelect } from '../../components/common';
import toast from 'react-hot-toast';
import { toStudentSelectOption } from '../../utils/studentDisplay';
import { getStructureTotals, getStudentSpecificStructureTotal } from '../../utils/feeStructure';

const ALL_STUDENTS_VALUE = '__ALL_STUDENTS__';

export function AssignFees() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [structures, setStructures] = useState([]);
  const [existingFees, setExistingFees] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [form, setForm] = useState({
    studentId: '',
    structureId: '',
    academicYear: '',
    semester: '',
    dueDate: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/students?limit=500'),
      api.get('/fees/structure'),
      api.get('/courses'),
    ]).then(([studentsResponse, structuresResponse, coursesResponse]) => {
      setStudents(studentsResponse.data.students || []);
      setStructures(structuresResponse.data.structures || []);
      setCourses(coursesResponse.data.courses || []);
    });
  }, []);

  useEffect(() => {
    if (!form.studentId || form.studentId === ALL_STUDENTS_VALUE) {
      setExistingFees([]);
      return;
    }
    api.get(`/fees/student/${form.studentId}`)
      .then(r => setExistingFees(r.data.fees || []))
      .catch(() => setExistingFees([]));
  }, [form.studentId]);

  const filteredStudents = useMemo(() => {
    if (!selectedCourseId) return students;
    return students.filter(student => {
      const studentCourseId = student.course?._id || student.course;
      return String(studentCourseId || '') === String(selectedCourseId);
    });
  }, [selectedCourseId, students]);

  useEffect(() => {
    if (!form.studentId) return;
    const isBulkSelection = form.studentId === ALL_STUDENTS_VALUE;
    const studentInFilter = filteredStudents.some(student => student._id === form.studentId);
    if ((!isBulkSelection && !studentInFilter) || (isBulkSelection && (!selectedCourseId || filteredStudents.length === 0))) {
      setForm(current => ({
        ...current,
        studentId: '',
        structureId: '',
      }));
      setExistingFees([]);
    }
  }, [filteredStudents, form.studentId, selectedCourseId]);

  const isBulkAssignment = form.studentId === ALL_STUDENTS_VALUE;
  const selectedStudent = students.find(student => student._id === form.studentId);
  const effectiveCourseId = isBulkAssignment
    ? selectedCourseId
    : (selectedStudent?.course?._id || selectedStudent?.course || '');
  const courseOptions = useMemo(
    () => [
      { value: '', label: 'All Courses', searchText: 'all courses' },
      ...courses.map(course => ({
        value: course._id,
        label: course.name,
        searchText: `${course.name} ${course.code || ''} ${course.department || ''}`,
      })),
    ],
    [courses]
  );
  const studentOptions = useMemo(
    () => [
      ...(selectedCourseId && filteredStudents.length > 0
        ? [{
            value: ALL_STUDENTS_VALUE,
            label: `All students in selected course (${filteredStudents.length})`,
            searchText: `all students selected course ${filteredStudents.map(student => `${student.firstName || ''} ${student.lastName || ''} ${student.regNo || ''} ${student.rollNo || ''} ${student.admissionNo || ''}`).join(' ')}`,
          }]
        : []),
      ...filteredStudents.map(toStudentSelectOption),
    ],
    [filteredStudents, selectedCourseId]
  );
  const filteredStructures = useMemo(() => {
    if (!effectiveCourseId) return [];
    return structures.filter(structure => String(structure.course?._id || structure.course || '') === String(effectiveCourseId));
  }, [effectiveCourseId, structures]);
  const structureOptions = useMemo(
    () => [
      {
        value: '',
        label: effectiveCourseId ? 'Select Structure...' : 'Select student or course first',
        searchText: '',
      },
      ...filteredStructures.map(structure => ({
        value: structure._id,
        label: `${structure.name} - ${structure.academicYear}`,
        searchText: `${structure.name} ${structure.academicYear} ${structure.semester || ''}`,
      })),
    ],
    [effectiveCourseId, filteredStructures]
  );

  useEffect(() => {
    if (!selectedStudent && !isBulkAssignment) return;
    setForm(current => ({
      ...current,
      structureId: filteredStructures.some(structure => structure._id === current.structureId)
        ? current.structureId
        : '',
      academicYear: current.academicYear || selectedStudent?.academicYear || '',
      semester: current.semester || selectedStudent?.semester || '',
    }));
  }, [filteredStructures, isBulkAssignment, selectedStudent]);

  const selectedStructure = filteredStructures.find(structure => structure._id === form.structureId);
  const normalizedAcademicYear = form.academicYear.trim().toLowerCase();
  const normalizedSemester = form.semester ? Number(form.semester) : undefined;
  const alreadyAssigned = isBulkAssignment
    ? null
    : existingFees.find(fee =>
        fee.academicYear?.trim().toLowerCase() === normalizedAcademicYear &&
        (normalizedSemester ? Number(fee.semester) === normalizedSemester : true)
      );

  const handleSubmit = async event => {
    event.preventDefault();
    if (alreadyAssigned) {
      toast.error('Fees already assigned for this academic year and semester');
      return;
    }
    setLoading(true);
    try {
      const payload = isBulkAssignment
        ? {
            courseId: selectedCourseId,
            structureId: form.structureId,
            academicYear: form.academicYear,
            semester: form.semester,
            dueDate: form.dueDate,
            assignAll: true,
          }
        : form;
      const response = await api.post('/fees/assign', payload);
      toast.success(response.data?.message || 'Fees assigned successfully');
      setForm({ studentId: '', structureId: '', academicYear: '', semester: '', dueDate: '' });
      setExistingFees([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Assign Fees" subtitle="Assign a fee structure to one student or an entire course" />
      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Course Filter</label>
            <SearchableSelect
              value={selectedCourseId}
              onChange={setSelectedCourseId}
              placeholder="All Courses"
              searchPlaceholder="Search courses..."
              options={courseOptions}
            />
          </div>

          <div>
            <label className="label">Student *</label>
            <SearchableSelect
              value={form.studentId}
              onChange={studentId => setForm(current => ({ ...current, studentId }))}
              placeholder={selectedCourseId ? 'Select Student or All Students...' : 'Select Student...'}
              searchPlaceholder="Search by name, reg no, roll no, admission no..."
              options={studentOptions}
              required
            />
            {selectedCourseId && filteredStudents.length === 0 && (
              <p className="text-xs text-red-500 mt-1">No students found for selected course.</p>
            )}
            {isBulkAssignment && (
              <p className="text-xs text-blue-600 mt-1">
                Fees will be assigned to all students in the selected course. Existing assignments will be skipped.
              </p>
            )}
          </div>

          <div>
            <label className="label">Fee Structure *</label>
            <SearchableSelect
              value={form.structureId}
              onChange={structureId => setForm(current => ({ ...current, structureId }))}
              placeholder={effectiveCourseId ? 'Select Structure...' : 'Select student or course first'}
              searchPlaceholder="Search fee structures..."
              options={structureOptions}
              required
              disabled={!effectiveCourseId}
            />
            {effectiveCourseId && filteredStructures.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                No fee structures found for {selectedStudent?.course?.name || courses.find(course => course._id === selectedCourseId)?.name}.
              </p>
            )}
            {alreadyAssigned && (
              <p className="text-xs text-red-500 mt-1">
                Fees already assigned for {alreadyAssigned.academicYear}
                {alreadyAssigned.semester ? ` semester ${alreadyAssigned.semester}` : ''}.
              </p>
            )}
          </div>

          {selectedStructure && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              {isBulkAssignment ? (
                <>
                  <p className="font-medium text-blue-800">
                    Day Scholar Total: Rs {getStructureTotals(selectedStructure.feeHeads).dayScholarTotal.toLocaleString('en-IN')}
                  </p>
                  <p className="font-medium text-blue-800 mt-1">
                    Hostel Total: Rs {getStructureTotals(selectedStructure.feeHeads).hostellerTotal.toLocaleString('en-IN')}
                  </p>
                </>
              ) : (
                <p className="font-medium text-blue-800">
                  Total: Rs {getStudentSpecificStructureTotal(selectedStructure.feeHeads, selectedStudent?.isHosteler).toLocaleString('en-IN')}
                </p>
              )}
              <p className="text-blue-600 mt-1">
                {selectedStructure.feeHeads?.map(head => `${head.headName}: Rs ${head.amount}`).join(' | ')}
              </p>
              <p className="text-xs text-blue-500 mt-2">
                Bus Fee is applied only to day scholars and Hostel Fee is applied only to hostel students.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Academic Year *</label>
              <input
                className="input"
                placeholder="2024-25"
                value={form.academicYear}
                onChange={event => setForm(current => ({ ...current, academicYear: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Semester</label>
              <input
                type="number"
                className="input"
                min="1"
                value={form.semester}
                onChange={event => setForm(current => ({ ...current, semester: event.target.value }))}
              />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                className="input"
                value={form.dueDate}
                onChange={event => setForm(current => ({ ...current, dueDate: event.target.value }))}
              />
            </div>
          </div>

          <button type="submit" disabled={loading || !!alreadyAssigned} className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Assigning...' : isBulkAssignment ? 'Assign Fees To All Students' : 'Assign Fees'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AssignFees;
