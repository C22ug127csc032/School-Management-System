import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios.js';
import { EmptyState, PageHeader, PageLoader, SearchableSelect, StatusBadge } from '../../components/common/index.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import useTeacherScope from '../../hooks/useTeacherScope.js';

export default function ReportCardsPage() {
  const academicYear = useAcademicYear();
  const { isTeacherRole, teacherId, classTeacherOf } = useTeacherScope();
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [reportCard, setReportCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const classParams = isTeacherRole
      ? { academicYear, teacherId }
      : { academicYear };

    Promise.all([
      api.get('/classes', { params: classParams }),
      api.get('/exams', { params: { academicYear } }),
    ]).then(([classRes, examRes]) => {
      setClasses(classRes.data.data || []);
      setExams(examRes.data.data || []);
    }).catch(() => {
      toast.error('Failed to load report card data.');
    }).finally(() => setLoading(false));
  }, [academicYear, isTeacherRole, teacherId, classTeacherOf]);

  useEffect(() => {
    if (isTeacherRole && classTeacherOf && !selectedClassId && classes.some(item => String(item._id) === String(classTeacherOf))) {
      setSelectedClassId(classTeacherOf);
    }
  }, [isTeacherRole, classTeacherOf, selectedClassId, classes]);

  useEffect(() => {
    if (selectedClassId && !classes.some(item => String(item._id) === String(selectedClassId))) {
      setSelectedClassId('');
      setSelectedStudentId('');
      setReportCard(null);
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setSelectedStudentId('');
      return;
    }

    api.get('/students', { params: { classId: selectedClassId, status: 'active', limit: 200, academicYear } })
      .then(response => {
        const nextStudents = response.data.data || [];
        setStudents(nextStudents);
        setSelectedStudentId(current => nextStudents.some(item => String(item._id) === String(current)) ? current : (nextStudents[0]?._id || ''));
      })
      .catch(() => toast.error('Failed to load students.'));
  }, [selectedClassId, academicYear]);

  useEffect(() => {
    if (!selectedExamId || !selectedStudentId) {
      setReportCard(null);
      return;
    }

    setReportLoading(true);
    api.get('/exams/report-card', { params: { examId: selectedExamId, studentId: selectedStudentId } })
      .then(response => setReportCard(response.data.data))
      .catch(err => {
        setReportCard(null);
        toast.error(err.response?.data?.message || 'Failed to load report card.');
      })
      .finally(() => setReportLoading(false));
  }, [selectedExamId, selectedStudentId]);

  const classOptions = classes.map(item => ({ value: item._id, label: item.displayName || `Grade ${item.grade}-${item.section}` }));
  const examOptions = exams.map(item => ({ value: item._id, label: item.name }));
  const studentOptions = students.map(item => ({
    value: item._id,
    label: `${item.firstName} ${item.lastName}${item.rollNo ? ` (${item.rollNo})` : ''}`,
  }));
  const selectedClass = classes.find(item => String(item._id) === String(selectedClassId));
  const selectedStudent = students.find(item => String(item._id) === String(selectedStudentId));

  const summaryCards = useMemo(() => {
    if (!reportCard) return [];
    return [
      { label: 'Total', value: `${reportCard.summary.totalObtained} / ${reportCard.summary.totalMax}` },
      { label: 'Percentage', value: `${reportCard.summary.percentage}%` },
      { label: 'Result', value: reportCard.summary.result },
      { label: 'Subjects', value: reportCard.summary.totalSubjects },
    ];
  }, [reportCard]);

  return (
    <div className="float-in">
      <PageHeader title="Report Cards" subtitle={isTeacherRole ? 'View saved marks from the exam module' : 'Preview saved student report cards'} />

      <div className="campus-panel p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="form-group">
            <label className="label">Class</label>
            <SearchableSelect options={classOptions} value={selectedClassId} onChange={setSelectedClassId} placeholder="Select class..." />
          </div>
          <div className="form-group">
            <label className="label">Exam</label>
            <SearchableSelect options={examOptions} value={selectedExamId} onChange={setSelectedExamId} placeholder="Select exam..." />
          </div>
          <div className="form-group">
            <label className="label">Student</label>
            <SearchableSelect options={studentOptions} value={selectedStudentId} onChange={setSelectedStudentId} placeholder="Select student..." />
          </div>
        </div>
      </div>

      {loading || reportLoading ? <PageLoader /> : (!selectedClassId || !selectedExamId || !selectedStudentId) ? (
        <div className="campus-panel mt-4">
          <EmptyState title="Select class, exam, and student" description="Choose a class, exam, and student to preview saved marks." />
        </div>
      ) : students.length === 0 ? (
        <div className="campus-panel mt-4">
          <EmptyState title="No students found" description="There are no active students in this class." />
        </div>
      ) : (
        !reportCard ? (
          <div className="campus-panel mt-4">
            <EmptyState
              title="Select a student"
              description={selectedStudent ? `Loading ${selectedStudent.firstName} ${selectedStudent.lastName}'s saved marks.` : 'Choose a student from the dropdown to view saved marks.'}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="campus-panel mt-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Student Report Card</p>
                  <h2 className="mt-2 text-2xl font-semibold text-text-primary">{reportCard.student.firstName} {reportCard.student.lastName}</h2>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-text-secondary">
                    <span><strong>Class:</strong> {reportCard.student.className}</span>
                    <span><strong>Admission No:</strong> {reportCard.student.admissionNo || '-'}</span>
                    <span><strong>Roll No:</strong> {reportCard.student.rollNo || '-'}</span>
                    <span><strong>Exam:</strong> {reportCard.exam.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Academic Year</p>
                  <p className="mt-2 text-base font-semibold text-text-primary">{reportCard.exam.academicYear}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {summaryCards.map(card => (
                <div key={card.label} className="campus-panel p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-text-primary">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="campus-panel overflow-hidden">
              <table className="table">
                <thead>
                  <tr>
                    <th className="table-header">Subject</th>
                    <th className="table-header">Marks</th>
                    <th className="table-header">Max</th>
                    <th className="table-header">Grade</th>
                    <th className="table-header">Result</th>
                    <th className="table-header">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCard.marks.length === 0 ? (
                    <tr><td colSpan="6" className="py-10 text-center text-sm text-slate-400">No saved marks found for this student.</td></tr>
                  ) : reportCard.marks.map(mark => (
                    <tr key={mark._id}>
                      <td className="table-cell font-semibold">{mark.subject?.name || '-'}</td>
                      <td className="table-cell">{mark.isAbsent ? 'Absent' : mark.marksObtained}</td>
                      <td className="table-cell">{mark.maxMarks}</td>
                      <td className="table-cell">{mark.grade || '-'}</td>
                      <td className="table-cell">
                        <StatusBadge status={mark.isAbsent ? 'absent' : mark.isPassed ? 'active' : 'rejected'} />
                      </td>
                      <td className="table-cell">{mark.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
