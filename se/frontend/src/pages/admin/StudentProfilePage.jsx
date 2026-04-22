import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiEdit2 } from 'react-icons/fi';
import api from '../../api/axios.js';
import { PageHeader, PageLoader, StatusBadge } from '../../components/common/index.jsx';
import { formatIndianDate } from '../../utils/dateTime.js';

function InfoRow({ label, value }) {
  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{label}</p>
      <p className="mt-1 text-sm text-text-primary">{value || '—'}</p>
    </div>
  );
}

function InfoSection({ title, rows }) {
  return (
    <div className="campus-panel p-5">
      <p className="section-title">{title}</p>
      {rows.map(row => (
        <InfoRow key={row.label} label={row.label} value={row.value} />
      ))}
    </div>
  );
}

function formatDate(value) {
  return formatIndianDate(value);
}

function formatGroup(value) {
  return value ? value.replace(/_/g, ' ') : '';
}

function formatAddress(address) {
  return [
    address?.street,
    address?.city,
    address?.state,
    address?.pincode,
  ].filter(Boolean).join(', ');
}

function formatGradeSection(grade, section) {
  if (!grade) return '—';
  return section ? `Grade ${grade} - ${section}` : `Grade ${grade}`;
}

export default function StudentProfilePage() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api.get(`/students/${id}`)
      .then(response => {
        if (active) setStudent(response.data.data);
      })
      .catch(err => {
        toast.error(err.response?.data?.message || 'Failed to load student.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <PageLoader />;
  if (!student) return <div className="campus-panel p-6 text-sm text-text-secondary">Student not found.</div>;

  const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
  const classLabel = student.classRef?.displayName || formatGradeSection(student.grade, student.section);

  const personalRows = [
    { label: 'Full Name', value: fullName },
    { label: 'Date of Birth', value: formatDate(student.dob) },
    { label: 'Gender', value: student.gender },
    { label: 'Blood Group', value: student.bloodGroup },
    { label: 'Category', value: student.category },
    { label: 'Religion', value: student.religion },
    { label: 'Nationality', value: student.nationality },
    { label: 'Aadhar No', value: student.aadharNo },
  ];

  const contactRows = [
    { label: 'Student Mobile', value: student.phone },
    { label: 'Student Email', value: student.email },
    { label: 'Address', value: formatAddress(student.address) },
  ];

  const familyRows = [
    { label: "Father's Name", value: student.father?.name },
    { label: "Father's Mobile", value: student.father?.phone },
    { label: "Father's Occupation", value: student.father?.occupation },
    { label: "Mother's Name", value: student.mother?.name },
    { label: "Mother's Mobile", value: student.mother?.phone },
    { label: "Mother's Occupation", value: student.mother?.occupation },
    { label: 'Guardian Name', value: student.guardian?.name },
    { label: 'Guardian Relation', value: student.guardian?.relation },
    { label: 'Guardian Phone', value: student.guardian?.phone },
    { label: 'Annual Income', value: student.annualIncome },
  ];

  const academicRows = [
    { label: 'Admission No', value: student.admissionNo },
    { label: 'Roll No', value: student.rollNo },
    { label: 'Register No', value: student.registerNo },
    { label: 'Class', value: classLabel },
    { label: 'Grade', value: student.grade ? `Grade ${student.grade}` : '' },
    { label: 'Section', value: student.section },
    { label: 'Subject Group', value: formatGroup(student.groupName) },
    { label: 'Academic Year', value: student.academicYear },
    { label: 'Admission Type', value: student.admissionType },
    { label: 'Admission Date', value: formatDate(student.admissionDate) },
    { label: 'Previous School', value: student.previousSchool },
    { label: 'Status', value: student.status?.replace(/_/g, ' ') },
  ];

  const transportRows = [
    { label: 'Transport Required', value: student.hasTransport ? 'Yes' : 'No' },
    { label: 'Route', value: student.transportRoute },
    { label: 'Bus No', value: student.busNo },
    { label: 'Pickup Point', value: student.pickupPoint },
  ];

  const hostelRows = [
    { label: 'Hostel Student', value: student.isHosteler ? 'Yes' : 'No' },
    { label: 'Hostel Room', value: student.hostelRoom },
  ];

  return (
    <div className="float-in">
      <PageHeader
        title={fullName || 'Student Profile'}
        subtitle={`Admission No: ${student.admissionNo || '—'}`}
        actions={
          <>
            <Link to="/admin/students" className="btn-secondary">
              <FiArrowLeft /> Back
            </Link>
            <Link to={`/admin/students/${student._id}/edit`} className="btn-primary">
              <FiEdit2 /> Edit Student
            </Link>
          </>
        }
      />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <div className="card-primary">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Status</p>
          <div className="mt-3">
            <StatusBadge status={student.status} />
          </div>
        </div>
        <div className="card-primary">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Class</p>
          <p className="mt-3 text-sm font-semibold text-text-primary">{classLabel}</p>
        </div>
        <div className="card-primary">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">Academic Year</p>
          <p className="mt-3 text-sm font-semibold text-text-primary">{student.academicYear || '—'}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InfoSection title="Personal Details" rows={personalRows} />
        <InfoSection title="Contact Details" rows={contactRows} />
        <InfoSection title="Parent / Guardian Details" rows={familyRows} />
        <InfoSection title="Academic Details" rows={academicRows} />
        <InfoSection title="Transport Details" rows={transportRows} />
        <InfoSection title="Hostel Details" rows={hostelRows} />
      </div>
    </div>
  );
}
