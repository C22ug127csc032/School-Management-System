import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios.js';
import { Field, PageHeader, SelectField } from '../../components/common/index.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';

const GRADES = ['Pre-KG','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
const NO_SECTION_VALUE = '__NO_SECTION__';
const GROUPS = [
  { value: 'science_biology', label: 'Maths Biology — PHY, CHEM, BIO' },
  { value: 'science_maths',   label: 'Computer Maths — PHY, CHEM, MATH' },
  { value: 'commerce',        label: 'Business Maths — ACC, BUS MATHS, ECO' },
  { value: 'arts',            label: 'Arts Computer — HISTORY, GEO, POL SCIENCE' },
];

function SectionTitle({ children }) {
  return <p className="section-title mt-6 first:mt-0">{children}</p>;
}

export default function NewAdmissionPage() {
  const navigate = useNavigate();
  const academicYear = useAcademicYear();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({
    firstName: '', lastName: '', dob: '', gender: 'Male', bloodGroup: '', religion: '',
    category: 'General', nationality: 'Indian', aadharNo: '',
    phone: '', email: '',
    'father.name': '', 'father.phone': '', 'father.occupation': '',
    'mother.name': '', 'mother.phone': '', 'mother.occupation': '',
    'guardian.name': '', 'guardian.relation': '', 'guardian.phone': '', annualIncome: '',
    grade: '', section: '', groupName: '', academicYear: '',
    admissionType: 'regular', previousSchool: '',
    'address.street': '', 'address.city': '', 'address.state': '', 'address.pincode': '',
    hasTransport: false, transportRoute: '', busNo: '', pickupPoint: '',
    isHosteler: false, hostelRoom: '',
  });

  useEffect(() => {
    setForm(current => current.academicYear === academicYear ? current : { ...current, academicYear });
  }, [academicYear]);

  useEffect(() => {
    api.get('/classes', { params: { academicYear } }).then(r => setClasses(r.data.data)).catch(() => {});
  }, [academicYear]);

  const sections = form.grade
    ? [...new Set(classes.filter(c => c.grade === form.grade).map(c => c.section))]
    : [];
  const sectionOptions = sections.map(section => ({
    value: section === '' ? NO_SECTION_VALUE : section,
    label: section === '' ? 'No Section' : section,
  }));
  const requiresSection = sections.some(section => section !== '') || sections.length > 1;

  const isHigherSecondary = ['11','12'].includes(form.grade);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async e => {
    e.preventDefault();
    const hasGuardianContact = [form['guardian.phone'], form['father.phone'], form['mother.phone'], form.phone]
      .some(value => String(value || '').trim());
    if (!form.firstName || !form.grade)
      return toast.error('First name and grade are required.');
    if (requiresSection && !form.section)
      return toast.error('Please select a section.');
    if (!hasGuardianContact)
      return toast.error('At least one parent or guardian phone number is required.');
    if (isHigherSecondary && !form.groupName)
      return toast.error('Please select a subject group for Grade 11/12.');

    setLoading(true);
    try {
      // Build nested objects
      const payload = {
        firstName: form.firstName, lastName: form.lastName,
        dob: form.dob, gender: form.gender, bloodGroup: form.bloodGroup,
        religion: form.religion, category: form.category,
        nationality: form.nationality, aadharNo: form.aadharNo,
        phone: form.phone, email: form.email,
        father:  { name: form['father.name'],  phone: form['father.phone'],  occupation: form['father.occupation'] },
        mother:  { name: form['mother.name'],  phone: form['mother.phone'],  occupation: form['mother.occupation'] },
        guardian:{ name: form['guardian.name'], relation: form['guardian.relation'], phone: form['guardian.phone'] },
        annualIncome: form.annualIncome,
        address: { street: form['address.street'], city: form['address.city'], state: form['address.state'], pincode: form['address.pincode'] },
        grade: form.grade, section: form.section,
        groupName: isHigherSecondary ? form.groupName : null,
        academicYear: form.academicYear, admissionType: form.admissionType,
        previousSchool: form.previousSchool,
        hasTransport: form.hasTransport, transportRoute: form.transportRoute, busNo: form.busNo, pickupPoint: form.pickupPoint,
        isHosteler: form.isHosteler, hostelRoom: form.hostelRoom,
      };
      const r = await api.post('/students', payload);
      toast.success(r.data.message);
      navigate('/admin/students');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Admission failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="float-in">
      <PageHeader title="New Admission" subtitle="Fill in student details to register a new student." />

      <form onSubmit={handleSubmit}>
        <div className="campus-panel p-5">
          <SectionTitle>Personal Information</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="First Name" required>
              <input className="input" type="text" placeholder="First name" required value={form.firstName}
                onChange={e => set('firstName', e.target.value)} />
            </Field>
            <Field label="Last Name">
              <input className="input" type="text" placeholder="Last name" value={form.lastName}
                onChange={e => set('lastName', e.target.value)} />
            </Field>
            <Field label="Date of Birth">
              <input className="input" type="date" value={form.dob}
                onChange={e => set('dob', e.target.value)} />
            </Field>
            <SelectField label="Gender" value={form.gender} onChange={e => set('gender', e.target.value)} options={['Male','Female','Other']} />
            <SelectField label="Blood Group" value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)} options={['A+','A-','B+','B-','O+','O-','AB+','AB-']} />
            <SelectField label="Category" value={form.category} onChange={e => set('category', e.target.value)} options={['General','OBC','SC','ST','EWS']} />
            <SelectField label="Religion" value={form.religion} onChange={e => set('religion', e.target.value)} options={['Hindu','Muslim','Christian','Sikh','Other']} />
            <Field label="Aadhar No">
              <input className="input" type="text" placeholder="12-digit Aadhar number" value={form.aadharNo}
                onChange={e => set('aadharNo', e.target.value)} />
            </Field>
            <Field label="Nationality">
              <input className="input" type="text" placeholder="Indian" value={form.nationality}
                onChange={e => set('nationality', e.target.value)} />
            </Field>
          </div>

          <SectionTitle>Contact Information</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Student Mobile">
              <input className="input" type="text" placeholder="Optional student mobile number" value={form.phone}
                onChange={e => set('phone', e.target.value)} />
            </Field>
            <Field label="Email">
              <input className="input" type="email" placeholder="student@email.com" value={form.email}
                onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="Street Address">
              <input className="input" type="text" placeholder="House/Street" value={form['address.street']}
                onChange={e => set('address.street', e.target.value)} />
            </Field>
            <Field label="City">
              <input className="input" type="text" placeholder="City" value={form['address.city']}
                onChange={e => set('address.city', e.target.value)} />
            </Field>
            <Field label="State">
              <input className="input" type="text" placeholder="State" value={form['address.state']}
                onChange={e => set('address.state', e.target.value)} />
            </Field>
            <Field label="Pincode">
              <input className="input" type="text" placeholder="Pincode" value={form['address.pincode']}
                onChange={e => set('address.pincode', e.target.value)} />
            </Field>
          </div>

          <SectionTitle>Parent / Guardian Details</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Father's Name">
              <input className="input" type="text" placeholder="Father full name" value={form['father.name']}
                onChange={e => set('father.name', e.target.value)} />
            </Field>
            <Field label="Father's Mobile">
              <input className="input" type="text" placeholder="Father phone" value={form['father.phone']}
                onChange={e => set('father.phone', e.target.value)} />
            </Field>
            <Field label="Father's Occupation">
              <input className="input" type="text" placeholder="Occupation" value={form['father.occupation']}
                onChange={e => set('father.occupation', e.target.value)} />
            </Field>
            <Field label="Mother's Name">
              <input className="input" type="text" placeholder="Mother full name" value={form['mother.name']}
                onChange={e => set('mother.name', e.target.value)} />
            </Field>
            <Field label="Mother's Mobile">
              <input className="input" type="text" placeholder="Mother phone" value={form['mother.phone']}
                onChange={e => set('mother.phone', e.target.value)} />
            </Field>
            <Field label="Mother's Occupation">
              <input className="input" type="text" placeholder="Occupation" value={form['mother.occupation']}
                onChange={e => set('mother.occupation', e.target.value)} />
            </Field>
            <Field label="Guardian Name">
              <input className="input" type="text" placeholder="Guardian full name" value={form['guardian.name']}
                onChange={e => set('guardian.name', e.target.value)} />
            </Field>
            <Field label="Guardian Relation">
              <input className="input" type="text" placeholder="Guardian relation" value={form['guardian.relation']}
                onChange={e => set('guardian.relation', e.target.value)} />
            </Field>
            <Field label="Guardian Phone">
              <input className="input" type="text" placeholder="Guardian phone" value={form['guardian.phone']}
                onChange={e => set('guardian.phone', e.target.value)} />
            </Field>
            <Field label="Annual Income">
              <input className="input" type="text" placeholder="Family annual income" value={form.annualIncome}
                onChange={e => set('annualIncome', e.target.value)} />
            </Field>
          </div>

          <SectionTitle>Academic Details</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField label="Grade / Class" required value={form.grade} onChange={e => set('grade', e.target.value)} options={GRADES.map(g => ({ value: g, label: `Grade ${g}` }))} />
            <SelectField label="Section" required={requiresSection} value={form.section === '' ? NO_SECTION_VALUE : form.section} onChange={e => set('section', e.target.value === NO_SECTION_VALUE ? '' : e.target.value)} options={sectionOptions} placeholder={requiresSection ? 'Select...' : 'No Section'} />
            {isHigherSecondary && (
              <SelectField label="Subject Group" required value={form.groupName} onChange={e => set('groupName', e.target.value)} options={GROUPS} />
            )}
            <Field label="Academic Year">
              <input className="input" type="text" placeholder="2024-25" value={form.academicYear}
                onChange={e => set('academicYear', e.target.value)} />
            </Field>
            <SelectField label="Admission Type" value={form.admissionType} onChange={e => set('admissionType', e.target.value)} options={['regular','management','government','nri']} />
            <Field label="Previous School">
              <input className="input" type="text" placeholder="Previous school name" value={form.previousSchool}
                onChange={e => set('previousSchool', e.target.value)} />
            </Field>
          </div>

          {/* Grade 11/12 group info */}
          {isHigherSecondary && (
            <div className="mt-4 border border-amber-200 bg-amber-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-2">Important: Grade 11 & 12 Group System</p>
              <ul className="text-xs text-amber-800 space-y-1">
                <li><b>Maths Biology</b> — Physics, Chemistry, Biology, English, Tamil, PE</li>
                <li><b>Computer Maths</b>   — Physics, Chemistry, Mathematics, English, Tamil, PE</li>
                <li><b>Business Maths</b>           — Accountancy, Business Maths, Economics, Commerce, English, Tamil, PE</li>
                <li><b>Arts Computer</b>               — History, Geography, Political Science, Economics, English, Tamil, PE</li>
              </ul>
              <p className="mt-2 text-xs text-amber-700">The group determines which subjects are assigned. Biology students do not get Commerce subjects and vice versa.</p>
            </div>
          )}

          <SectionTitle>Transport (Optional)</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="form-group flex items-center gap-3">
              <input type="checkbox" id="hasTransport" checked={form.hasTransport}
                onChange={e => set('hasTransport', e.target.checked)}
                className="h-4 w-4 accent-primary-700" />
              <label htmlFor="hasTransport" className="text-sm font-medium text-text-primary">School Transport Required</label>
            </div>
            {form.hasTransport && <>
              <Field label="Route">
                <input className="input" type="text" placeholder="Route name/number" value={form.transportRoute}
                  onChange={e => set('transportRoute', e.target.value)} />
              </Field>
              <Field label="Bus No">
                <input className="input" type="text" placeholder="Bus number" value={form.busNo}
                  onChange={e => set('busNo', e.target.value)} />
              </Field>
              <Field label="Pickup Point">
                <input className="input" type="text" placeholder="Pickup point" value={form.pickupPoint}
                  onChange={e => set('pickupPoint', e.target.value)} />
              </Field>
            </>}
          </div>

          <SectionTitle>Hostel (Optional)</SectionTitle>
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="form-group flex items-center gap-3">
              <input type="checkbox" id="isHosteler" checked={form.isHosteler}
                onChange={e => set('isHosteler', e.target.checked)}
                className="h-4 w-4 accent-primary-700" />
              <label htmlFor="isHosteler" className="text-sm font-medium text-text-primary">Hostel Student</label>
            </div>
            {form.isHosteler && (
              <Field label="Hostel Room">
                <input className="input" type="text" placeholder="Hostel room" value={form.hostelRoom}
                  onChange={e => set('hostelRoom', e.target.value)} />
              </Field>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Registering...' : 'Register Student'}
          </button>
        </div>
      </form>
    </div>
  );
}
