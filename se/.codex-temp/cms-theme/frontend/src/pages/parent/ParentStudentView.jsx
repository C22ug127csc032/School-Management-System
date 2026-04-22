import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { PageSpinner, StatusBadge } from '../../components/common';

export default function ParentStudentView() {
  const [student, setStudent] = useState(null);

  useEffect(() => {
    api.get('/parent/student').then(r => setStudent(r.data.student));
  }, []);

  if (!student) return <PageSpinner />;

  const Row = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value || '–'}</span>
    </div>
  );

  return (
    <div>
      <h1 className="page-title mb-6">My Child's Profile</h1>

      <div className="flex items-center gap-4 p-5 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="w-16 h-16 rounded-xl bg-green-100 text-green-700 text-2xl font-bold flex items-center justify-center shrink-0">
          {student.photo
            ? <img src={student.photo} alt="" className="w-16 h-16 rounded-xl object-cover" />
            : student.firstName[0]}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {student.firstName} {student.lastName}
          </h2>
          <p className="text-gray-500 text-sm">{student.regNo} • {student.course?.name}</p>
          <StatusBadge status={student.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="section-title">Academic</h3>
          <Row label="Course"   value={student.course?.name} />
          <Row label="Semester" value={student.semester} />
          <Row label="Batch"    value={student.batch} />
          <Row label="Roll No"  value={student.rollNo} />
          <Row label="Hostel"
            value={student.isHosteler
              ? `Yes – Room ${student.hostelRoom || 'N/A'}` : 'No'} />
        </div>
        <div className="card">
          <h3 className="section-title">Contact</h3>
          <Row label="Phone"     value={student.phone} />
          <Row label="Email"     value={student.email} />
          <Row label="City"      value={student.address?.city} />
          <Row label="Admission"
            value={student.admissionDate
              ? new Date(student.admissionDate).toLocaleDateString('en-IN') : null} />
        </div>
      </div>
    </div>
  );
}