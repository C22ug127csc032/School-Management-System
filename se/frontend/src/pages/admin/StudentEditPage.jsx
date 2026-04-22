import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import api from '../../api/axios.js';
import { Field, PageHeader, PageLoader, SelectField } from '../../components/common/index.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';

const GRADES = ['Pre-KG','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
const NO_SECTION_VALUE = '__NO_SECTION__';
const GROUPS = [
  { value: 'science_biology', label: 'Maths Biology' },
  { value: 'science_maths', label: 'Computer Maths' },
  { value: 'commerce', label: 'Business Maths' },
  { value: 'arts', label: 'Arts Computer' },
];
const STATUSES = ['active', 'inactive', 'transferred', 'alumni', 'admission_pending'];

const emptyForm = {
  firstName: '',
  lastName: '',
  dob: '',
  gender: 'Male',
  bloodGroup: '',
  religion: '',
  category: 'General',
  nationality: 'Indian',
  aadharNo: '',
  phone: '',
  email: '',
  registerNo: '',
  'father.name': '',
  'father.phone': '',
  'father.occupation': '',
  'mother.name': '',
  'mother.phone': '',
  'mother.occupation': '',
  'guardian.name': '',
  'guardian.relation': '',
  'guardian.phone': '',
  annualIncome: '',
  grade: '',
  section: '',
  groupName: '',
  academicYear: '',
  admissionType: 'regular',
  previousSchool: '',
  status: 'admission_pending',
  'address.street': '',
  'address.city': '',
  'address.state': '',
  'address.pincode': '',
  hasTransport: false,
  transportRoute: '',
  busNo: '',
  pickupPoint: '',
  isHosteler: false,
  hostelRoom: '',
};

function SectionTitle({ children }) {
  return <p className="section-title mt-6 first:mt-0">{children}</p>;
}

function formatDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export default function StudentEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const academicYear = useAcademicYear();
  const [form, setForm] = useState(emptyForm);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      api.get(`/students/${id}`),
      api.get('/classes', { params: { academicYear } }),
    ])
      .then(([studentResponse, classResponse]) => {
        if (!active) return;
        const student = studentResponse.data.data;
        setClasses(classResponse.data.data || []);
        setForm({
          firstName: student.firstName || '',
          lastName: student.lastName || '',
          dob: formatDateInput(student.dob),
          gender: student.gender || 'Male',
          bloodGroup: student.bloodGroup || '',
          religion: student.religion || '',
          category: student.category || 'General',
          nationality: student.nationality || 'Indian',
          aadharNo: student.aadharNo || '',
          phone: student.phone || '',
          email: student.email || '',
          registerNo: student.registerNo || '',
          'father.name': student.father?.name || '',
          'father.phone': student.father?.phone || '',
          'father.occupation': student.father?.occupation || '',
          'mother.name': student.mother?.name || '',
          'mother.phone': student.mother?.phone || '',
          'mother.occupation': student.mother?.occupation || '',
          'guardian.name': student.guardian?.name || '',
          'guardian.relation': student.guardian?.relation || '',
          'guardian.phone': student.guardian?.phone || '',
          annualIncome: student.annualIncome || '',
          grade: student.grade || '',
          section: student.section || '',
          groupName: student.groupName || '',
          academicYear: student.academicYear || '',
          admissionType: student.admissionType || 'regular',
          previousSchool: student.previousSchool || '',
          status: student.status || 'admission_pending',
          'address.street': student.address?.street || '',
          'address.city': student.address?.city || '',
          'address.state': student.address?.state || '',
          'address.pincode': student.address?.pincode || '',
          hasTransport: Boolean(student.hasTransport),
          transportRoute: student.transportRoute || '',
          busNo: student.busNo || '',
          pickupPoint: student.pickupPoint || '',
          isHosteler: Boolean(student.isHosteler),
          hostelRoom: student.hostelRoom || '',
        });
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
  }, [id, academicYear]);

  const sections = useMemo(() => (
    form.grade
      ? [...new Set(classes.filter(item => item.grade === form.grade).map(item => item.section))]
      : []
  ), [classes, form.grade]);
  const sectionOptions = useMemo(() => (
    sections.map(section => ({
      value: section === '' ? NO_SECTION_VALUE : section,
      label: section === '' ? 'No Section' : section,
    }))
  ), [sections]);
  const requiresSection = useMemo(() => (
    sections.some(section => section !== '') || sections.length > 1
  ), [sections]);

  const isHigherSecondary = ['11', '12'].includes(form.grade);
  const setValue = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const handleSave = async event => {
    event.preventDefault();

    const hasGuardianContact = [form.phone, form['guardian.phone'], form['father.phone'], form['mother.phone']]
      .some(value => String(value || '').trim());

    if (!form.firstName || !form.grade) {
      toast.error('First name and grade are required.');
      return;
    }
    if (requiresSection && !form.section) {
      toast.error('Please select a section.');
      return;
    }
    if (!hasGuardianContact) {
      toast.error('At least one parent or guardian phone number is required.');
      return;
    }
    if (isHigherSecondary && !form.groupName) {
      toast.error('Please select a subject group for Grade 11/12.');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/students/${id}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        dob: form.dob,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        religion: form.religion,
        category: form.category,
        nationality: form.nationality,
        aadharNo: form.aadharNo,
        phone: form.phone,
        email: form.email,
        registerNo: form.registerNo,
        father: {
          name: form['father.name'],
          phone: form['father.phone'],
          occupation: form['father.occupation'],
        },
        mother: {
          name: form['mother.name'],
          phone: form['mother.phone'],
          occupation: form['mother.occupation'],
        },
        guardian: {
          name: form['guardian.name'],
          relation: form['guardian.relation'],
          phone: form['guardian.phone'],
        },
        annualIncome: form.annualIncome,
        address: {
          street: form['address.street'],
          city: form['address.city'],
          state: form['address.state'],
          pincode: form['address.pincode'],
        },
        grade: form.grade,
        section: form.section,
        groupName: isHigherSecondary ? form.groupName : null,
        academicYear: form.academicYear,
        admissionType: form.admissionType,
        previousSchool: form.previousSchool,
        status: form.status,
        hasTransport: form.hasTransport,
        transportRoute: form.hasTransport ? form.transportRoute : '',
        busNo: form.hasTransport ? form.busNo : '',
        pickupPoint: form.hasTransport ? form.pickupPoint : '',
        isHosteler: form.isHosteler,
        hostelRoom: form.isHosteler ? form.hostelRoom : '',
      });

      toast.success('Student updated.');
      navigate(`/admin/students/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update student.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="float-in">
      <PageHeader
        title="Edit Student"
        subtitle="Update the full student record."
        actions={
          <Link to={`/admin/students/${id}`} className="btn-secondary">
            <FiArrowLeft /> Back
          </Link>
        }
      />

      <form id="student-edit-form" onSubmit={handleSave}>
        <div className="campus-panel p-5">
          <SectionTitle>Personal Information</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="First Name" required>
              <input className="input" value={form.firstName} onChange={e => setValue('firstName', e.target.value)} />
            </Field>
            <Field label="Last Name">
              <input className="input" value={form.lastName} onChange={e => setValue('lastName', e.target.value)} />
            </Field>
            <Field label="Date of Birth">
              <input className="input" type="date" value={form.dob} onChange={e => setValue('dob', e.target.value)} />
            </Field>
            <SelectField label="Gender" value={form.gender} onChange={e => setValue('gender', e.target.value)} options={['Male','Female','Other']} />
            <SelectField label="Blood Group" value={form.bloodGroup} onChange={e => setValue('bloodGroup', e.target.value)} options={['A+','A-','B+','B-','O+','O-','AB+','AB-']} />
            <SelectField label="Category" value={form.category} onChange={e => setValue('category', e.target.value)} options={['General','OBC','SC','ST','EWS']} />
            <SelectField label="Religion" value={form.religion} onChange={e => setValue('religion', e.target.value)} options={['Hindu','Muslim','Christian','Sikh','Other']} />
            <Field label="Aadhar No">
              <input className="input" value={form.aadharNo} onChange={e => setValue('aadharNo', e.target.value)} />
            </Field>
            <Field label="Nationality">
              <input className="input" value={form.nationality} onChange={e => setValue('nationality', e.target.value)} />
            </Field>
          </div>

          <SectionTitle>Contact Information</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Student Mobile">
              <input className="input" value={form.phone} onChange={e => setValue('phone', e.target.value)} />
            </Field>
            <Field label="Email">
              <input className="input" type="email" value={form.email} onChange={e => setValue('email', e.target.value)} />
            </Field>
            <Field label="Street Address">
              <input className="input" value={form['address.street']} onChange={e => setValue('address.street', e.target.value)} />
            </Field>
            <Field label="City">
              <input className="input" value={form['address.city']} onChange={e => setValue('address.city', e.target.value)} />
            </Field>
            <Field label="State">
              <input className="input" value={form['address.state']} onChange={e => setValue('address.state', e.target.value)} />
            </Field>
            <Field label="Pincode">
              <input className="input" value={form['address.pincode']} onChange={e => setValue('address.pincode', e.target.value)} />
            </Field>
          </div>

          <SectionTitle>Parent / Guardian Details</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Father's Name">
              <input className="input" value={form['father.name']} onChange={e => setValue('father.name', e.target.value)} />
            </Field>
            <Field label="Father's Mobile">
              <input className="input" value={form['father.phone']} onChange={e => setValue('father.phone', e.target.value)} />
            </Field>
            <Field label="Father's Occupation">
              <input className="input" value={form['father.occupation']} onChange={e => setValue('father.occupation', e.target.value)} />
            </Field>
            <Field label="Mother's Name">
              <input className="input" value={form['mother.name']} onChange={e => setValue('mother.name', e.target.value)} />
            </Field>
            <Field label="Mother's Mobile">
              <input className="input" value={form['mother.phone']} onChange={e => setValue('mother.phone', e.target.value)} />
            </Field>
            <Field label="Mother's Occupation">
              <input className="input" value={form['mother.occupation']} onChange={e => setValue('mother.occupation', e.target.value)} />
            </Field>
            <Field label="Guardian Name">
              <input className="input" value={form['guardian.name']} onChange={e => setValue('guardian.name', e.target.value)} />
            </Field>
            <Field label="Guardian Relation">
              <input className="input" value={form['guardian.relation']} onChange={e => setValue('guardian.relation', e.target.value)} />
            </Field>
            <Field label="Guardian Phone">
              <input className="input" value={form['guardian.phone']} onChange={e => setValue('guardian.phone', e.target.value)} />
            </Field>
            <Field label="Annual Income">
              <input className="input" value={form.annualIncome} onChange={e => setValue('annualIncome', e.target.value)} />
            </Field>
          </div>

          <SectionTitle>Academic Details</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField label="Grade / Class" required value={form.grade} onChange={e => setValue('grade', e.target.value)} options={GRADES.map(g => ({ value: g, label: `Grade ${g}` }))} />
            <SelectField label="Section" required={requiresSection} value={form.section === '' ? NO_SECTION_VALUE : form.section} onChange={e => setValue('section', e.target.value === NO_SECTION_VALUE ? '' : e.target.value)} options={sectionOptions} placeholder={requiresSection ? 'Select...' : 'No Section'} />
            {isHigherSecondary && (
              <SelectField label="Subject Group" required value={form.groupName} onChange={e => setValue('groupName', e.target.value)} options={GROUPS} />
            )}
            <Field label="Academic Year">
              <input className="input" value={form.academicYear} onChange={e => setValue('academicYear', e.target.value)} />
            </Field>
            <SelectField label="Admission Type" value={form.admissionType} onChange={e => setValue('admissionType', e.target.value)} options={['regular','management','government','nri']} />
            <SelectField label="Status" value={form.status} onChange={e => setValue('status', e.target.value)} options={STATUSES.map(value => ({ value, label: value.replace(/_/g, ' ') }))} />
            <Field label="Previous School">
              <input className="input" value={form.previousSchool} onChange={e => setValue('previousSchool', e.target.value)} />
            </Field>
          </div>

          <SectionTitle>Transport</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="form-group flex items-center gap-3">
              <input
                type="checkbox"
                id="edit-hasTransport"
                checked={form.hasTransport}
                onChange={e => setValue('hasTransport', e.target.checked)}
                className="h-4 w-4 accent-primary-700"
              />
              <label htmlFor="edit-hasTransport" className="text-sm font-medium text-text-primary">School Transport Required</label>
            </div>
            {form.hasTransport && (
              <>
                <Field label="Route">
                  <input className="input" value={form.transportRoute} onChange={e => setValue('transportRoute', e.target.value)} />
                </Field>
                <Field label="Bus No">
                  <input className="input" value={form.busNo} onChange={e => setValue('busNo', e.target.value)} />
                </Field>
                <Field label="Pickup Point">
                  <input className="input" value={form.pickupPoint} onChange={e => setValue('pickupPoint', e.target.value)} />
                </Field>
              </>
            )}
          </div>

          <SectionTitle>Hostel</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="form-group flex items-center gap-3">
              <input
                type="checkbox"
                id="edit-isHosteler"
                checked={form.isHosteler}
                onChange={e => setValue('isHosteler', e.target.checked)}
                className="h-4 w-4 accent-primary-700"
              />
              <label htmlFor="edit-isHosteler" className="text-sm font-medium text-text-primary">Hostel Student</label>
            </div>
            {form.isHosteler && (
              <Field label="Hostel Room">
                <input className="input" value={form.hostelRoom} onChange={e => setValue('hostelRoom', e.target.value)} />
              </Field>
            )}
          </div>

          <SectionTitle>Government / Board Details</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Register No">
              <input className="input" value={form.registerNo} onChange={e => setValue('registerNo', e.target.value)} />
            </Field>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-5">
            <button type="submit" form="student-edit-form" disabled={saving} className="btn-primary">
              <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
