import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiDollarSign, FiEdit2, FiEye } from 'react-icons/fi';
import api from '../../api/axios.js';
import { PageHeader, DataTable, Modal, SearchableSelect, StatusBadge } from '../../components/common/index.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';

const FEE_APPLICABILITY_OPTIONS = [
  { value: 'all', label: 'All Students' },
  { value: 'hosteler', label: 'Hosteller Only' },
  { value: 'transport', label: 'Transport Students Only' },
  { value: 'no_transport', label: 'No Transport Students Only' },
];

const createFeeHead = (applicableTo = 'all', overrides = {}) => ({
  headName: '',
  amount: 0,
  applicableTo,
  ...overrides,
});

const createInitialForm = academicYear => ({
  name: '',
  grade: '',
  academicYear,
  term: '',
  feeHeads: [createFeeHead('all', { headName: 'Tuition Fee' })],
  hasInstallments: false,
  fineEnabled: false,
  fineType: 'flat',
  fineAmount: 0,
  fineGraceDays: 0,
});

export function FeeStructuresPage() {
  const academicYear = useAcademicYear();
  const [structures, setStructures] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm] = useState(() => createInitialForm(academicYear));

  useEffect(() => {
    setForm(current => (current.academicYear === academicYear ? current : { ...current, academicYear }));
  }, [academicYear]);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/fees/structures', { params: { academicYear } }),
      api.get('/classes', { params: { academicYear } }),
    ])
      .then(([structuresRes, classesRes]) => {
        setStructures(structuresRes.data.data || []);
        setClasses(classesRes.data.data || []);
      })
      .catch(() => toast.error('Failed.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [academicYear]);

  const addHead = () => setForm(f => ({ ...f, feeHeads: [...f.feeHeads, createFeeHead('all')] }));
  const removeHead = index => setForm(f => ({ ...f, feeHeads: f.feeHeads.filter((_, idx) => idx !== index) }));
  const updateHead = (index, key, value) => setForm(f => {
    const heads = [...f.feeHeads];
    heads[index] = { ...heads[index], [key]: value };
    return { ...f, feeHeads: heads };
  });

  const total = form.feeHeads.reduce((sum, head) => sum + Number(head.amount || 0), 0);
  const handleSave = async () => {
    if (!form.name) return toast.error('Structure name required.');
    if (form.feeHeads.length === 0) return toast.error('Add at least one fee head.');
    if (form.feeHeads.some(head => !head.headName?.trim())) return toast.error('Every fee head needs a name.');
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/fees/structures/${editingId}`, form);
        toast.success('Fee structure updated.');
      } else {
        await api.post('/fees/structures', form);
        toast.success('Fee structure created.');
      }
      setForm(createInitialForm(academicYear));
      setEditingId('');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Deactivate this structure?')) return;
    try {
      await api.delete(`/fees/structures/${id}`);
      toast.success('Deactivated.');
      load();
    } catch {
      toast.error('Failed.');
    }
  };

  const openCreateModal = () => {
    setEditingId('');
    setForm(createInitialForm(academicYear));
    setModal(true);
  };

  const openEditModal = structure => {
    setEditingId(structure._id);
    setForm({
      name: structure.name || '',
      grade: structure.grade || '',
      academicYear: structure.academicYear || academicYear,
      term: structure.term || '',
      feeHeads: (structure.feeHeads?.length ? structure.feeHeads : [createFeeHead('all', { headName: 'Tuition Fee' })]).map(head => ({
        headName: head.headName || '',
        amount: head.amount || 0,
        applicableTo: head.applicableTo || 'all',
      })),
      hasInstallments: Boolean(structure.hasInstallments),
      fineEnabled: Boolean(structure.fineEnabled),
      fineType: structure.fineType || 'flat',
      fineAmount: structure.fineAmount || 0,
      fineGraceDays: structure.fineGraceDays || 0,
    });
    setModal(true);
  };

  const columns = [
    { key: 'name', label: 'Structure Name', render: item => <span className="font-semibold">{item.name}</span> },
    { key: 'grade', label: 'Grade', render: item => item.grade || 'All' },
    { key: 'heads', label: 'Fee Heads', render: item => `${item.feeHeads?.length || 0} heads` },
    { key: 'total', label: 'Total Amount', render: item => <span className="font-bold text-primary-700">Rs.{(item.totalAmount || 0).toLocaleString('en-IN')}</span> },
    { key: 'ay', label: 'Acad. Year', render: item => item.academicYear },
    {
      key: 'actions',
      label: '',
      render: item => (
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => setViewItem(item)} className="btn-icon btn-sm text-slate-600"><FiEye /></button>
          <button onClick={() => openEditModal(item)} className="btn-icon btn-sm text-primary-700"><FiEdit2 /></button>
          <button onClick={() => handleDelete(item._id)} className="btn-icon btn-sm text-red-600"><FiTrash2 /></button>
        </div>
      ),
    },
  ];

  const gradeOptions = Array.from(
    new Set(
      classes
        .map(item => String(item.grade || '').trim())
        .filter(Boolean)
    )
  )
    .sort((left, right) => Number(left) - Number(right))
    .map(grade => ({ value: grade, label: `Grade ${grade}` }));

  return (
    <div className="float-in">
      <PageHeader
        title="Fee Structures"
        subtitle="Manage fee structures for classes"
        actions={<button onClick={openCreateModal} className="btn-primary"><FiPlus />New Structure</button>}
      />
      <div className="campus-panel overflow-hidden">
        <DataTable columns={columns} data={structures} loading={loading} />
      </div>

      <Modal
        open={modal}
        onClose={() => { setModal(false); setEditingId(''); setForm(createInitialForm(academicYear)); }}
        title={editingId ? 'Edit Fee Structure' : 'Create Fee Structure'}
        size="lg"
        footer={<><button onClick={() => { setModal(false); setEditingId(''); setForm(createInitialForm(academicYear)); }} className="btn-secondary btn-sm">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">{saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}</button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group col-span-2">
              <label className="label">Structure Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Grade (optional)</label>
              <SearchableSelect options={gradeOptions} value={form.grade} onChange={value => setForm(f => ({ ...f, grade: value }))} placeholder="Select grade..." />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">Fee Heads</label>
              <button type="button" onClick={addHead} className="btn-secondary btn-sm"><FiPlus />Add Head</button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="grid grid-cols-12 gap-2 border-b border-border bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                <div className="col-span-5">Fee Head</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-4">Applies To</div>
                <div className="col-span-1 text-right"> </div>
              </div>
              <div className="space-y-2 p-2">
              {form.feeHeads.map((head, index) => (
                <div key={index} className="grid grid-cols-12 items-center gap-2 rounded-xl border border-border p-2">
                  <input className="input col-span-5" placeholder="Fee head name" value={head.headName} onChange={e => updateHead(index, 'headName', e.target.value)} />
                  <input type="number" className="input col-span-2" placeholder="Amount Rs." value={head.amount} onChange={e => updateHead(index, 'amount', e.target.value)} />
                  <select className="input col-span-4" value={head.applicableTo} onChange={e => updateHead(index, 'applicableTo', e.target.value)}>
                    {FEE_APPLICABILITY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeHead(index)} className="btn-icon btn-sm col-span-1 text-red-600"><FiTrash2 /></button>
                </div>
              ))}
              </div>
            </div>
            <p className="mt-3 text-right text-sm font-bold text-primary-700">Grand Total: Rs.{total.toLocaleString('en-IN')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={form.fineEnabled} onChange={e => setForm(f => ({ ...f, fineEnabled: e.target.checked }))} className="accent-primary-700" />
              Enable Late Fine
            </label>
          </div>

          {form.fineEnabled && (
            <div className="grid grid-cols-3 gap-4">
              <div className="form-group">
                <label className="label">Fine Type</label>
                <select className="input" value={form.fineType} onChange={e => setForm(f => ({ ...f, fineType: e.target.value }))}>
                  <option value="flat">Flat (Rs./day)</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Fine Amount</label>
                <input type="number" className="input" value={form.fineAmount} onChange={e => setForm(f => ({ ...f, fineAmount: Number(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label className="label">Grace Days</label>
                <input type="number" className="input" value={form.fineGraceDays} onChange={e => setForm(f => ({ ...f, fineGraceDays: Number(e.target.value) }))} />
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(viewItem)}
        onClose={() => setViewItem(null)}
        title="View Fee Structure"
        size="lg"
        footer={<button onClick={() => setViewItem(null)} className="btn-secondary btn-sm">Close</button>}
      >
        {viewItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="label">Structure Name</p><p className="text-sm font-semibold text-slate-900">{viewItem.name}</p></div>
              <div><p className="label">Grade</p><p className="text-sm font-semibold text-slate-900">{viewItem.grade || 'All'}</p></div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="table">
                <thead>
                  <tr>
                    <th className="table-header">Fee Head</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">Applies To</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewItem.feeHeads || []).map((head, index) => (
                    <tr key={`${head.headName}-${index}`}>
                      <td className="table-cell">{head.headName}</td>
                      <td className="table-cell">Rs.{Number(head.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="table-cell">{FEE_APPLICABILITY_OPTIONS.find(option => option.value === head.applicableTo)?.label || 'All Students'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-right text-sm font-bold text-primary-700">Total: Rs.{Number(viewItem.totalAmount || 0).toLocaleString('en-IN')}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function AssignFeesPage() {
  const academicYear = useAcademicYear();
  const [structures, setStructures] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignedFees, setAssignedFees] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ structureId: '', dueDate: '', discountAmount: 0, discountReason: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/fees/structures', { params: { academicYear } }),
      api.get('/classes', { params: { academicYear } }),
    ]).then(([structuresRes, classesRes]) => {
      setStructures(structuresRes.data.data);
      setClasses(classesRes.data.data);
    }).catch(() => {});
  }, [academicYear]);

  useEffect(() => {
    setSelectedClassId('');
    setStudents([]);
    setAssignedFees([]);
  }, [academicYear]);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setAssignedFees([]);
      return;
    }

    setLoading(true);
    Promise.all([
      api.get('/students', { params: { classId: selectedClassId, status: 'active', limit: 200, academicYear } }),
      api.get('/fees/student', { params: { classId: selectedClassId, academicYear } }),
    ])
      .then(([studentsRes, feesRes]) => {
        setStudents(studentsRes.data.data);
        setAssignedFees(feesRes.data.data || []);
      })
      .catch(() => toast.error('Failed to load students.'))
      .finally(() => setLoading(false));
  }, [selectedClassId, academicYear]);

  const handleAssign = async () => {
    if (!selectedClassId) return toast.error('Select a class first.');
    if (!form.structureId) return toast.error('Select a fee structure.');
    if (allStudentsAssigned) {
      const assignedNames = assignedStructureSummaries.map(item => item.name).join(', ');
      return toast.error(`Fees already assigned to this class: ${assignedNames || 'Assigned fee structure'}.`);
    }

    setSaving(true);
    try {
      const response = await api.post('/fees/assign', { classId: selectedClassId, ...form, academicYear });
      toast.success(response.data.message || 'Fees assigned!');
      setModal(false);
      const feesResponse = await api.get('/fees/student', { params: { classId: selectedClassId, academicYear } });
      setAssignedFees(feesResponse.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally {
      setSaving(false);
    }
  };

  const selectedClass = classes.find(item => item._id === selectedClassId);
  const structureOpts = structures.map(item => ({ value: item._id, label: `${item.name} - Rs.${(item.totalAmount || 0).toLocaleString('en-IN')}` }));
  const classOpts = classes.map(item => ({ value: item._id, label: item.displayName || `Grade ${item.grade}-${item.section}` }));
  const selectedStructureAssignedStudentIds = new Set(
    assignedFees
      .filter(item => String(item.structure?._id || item.structure) === String(form.structureId || ''))
      .map(item => String(item.student?._id || item.student))
  );
  const allStudentsAssigned = Boolean(form.structureId) && students.length > 0 && students.every(student => selectedStructureAssignedStudentIds.has(String(student._id)));
  const assignedByStudentId = assignedFees.reduce((map, item) => {
    const key = String(item.student?._id || item.student);
    const current = map.get(key) || [];
    current.push(item);
    map.set(key, current);
    return map;
  }, new Map());
  const assignedStructureSummaries = Array.from(
    assignedFees.reduce((map, item) => {
      const key = String(item.structure?._id || item.structure || 'assigned');
      const existing = map.get(key) || {
        key,
        name: item.structure?.name || 'Assigned Fee Structure',
        studentCount: 0,
        term: item.term || 'General',
      };
      existing.studentCount += 1;
      map.set(key, existing);
      return map;
    }, new Map()).values()
  );
  const selectedStructureSummary = assignedStructureSummaries.find(item => item.key === form.structureId);

  return (
    <div className="float-in">
      <PageHeader title="Assign Fees" subtitle="Assign fee structure to all active students in a class" />

      <div className="campus-panel mb-4 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,22rem)_auto] md:items-end">
          <div>
            <label className="label">Select Class</label>
            <SearchableSelect options={classOpts} value={selectedClassId} onChange={setSelectedClassId} placeholder="Select class..." />
          </div>
          <button type="button" onClick={() => setModal(true)} disabled={!selectedClassId || students.length === 0} className="btn-primary">
            <FiDollarSign />Assign Fees To Class
          </button>
        </div>

        {selectedClass && (
          <div className="mt-3 space-y-2 text-sm text-text-secondary">
            <p>
              {students.length} active student(s) found in {selectedClass.displayName || `Grade ${selectedClass.grade}-${selectedClass.section}`}.
            </p>
            <p>
              {assignedFees.length} fee assignment(s) already exist for {academicYear}.
            </p>
          </div>
        )}
      </div>

      {selectedClassId && assignedStructureSummaries.length > 0 && (
        <div className="campus-panel mb-4 p-4">
          <h2 className="text-base font-bold text-slate-900">Fees Already Assigned To This Class</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {assignedStructureSummaries.map(item => (
              <div key={item.key} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">Fee Structure</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.name}</p>
                <p className="mt-1 text-xs text-slate-600">{item.studentCount} student(s) assigned • Term: {item.term}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedClassId && (
        <div className="campus-panel overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th className="table-header">Student</th>
                <th className="table-header">Adm No</th>
                <th className="table-header">Class</th>
                <th className="table-header">Status</th>
                <th className="table-header">Assigned Fee</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student._id}>
                  <td className="table-cell font-semibold">{student.firstName} {student.lastName}</td>
                  <td className="table-cell font-mono text-xs">{student.admissionNo}</td>
                  <td className="table-cell">{student.classRef?.displayName || `Grade ${student.grade}-${student.section}`}</td>
                  <td className="table-cell"><StatusBadge status={student.status} /></td>
	                  <td className="table-cell">
	                    {assignedByStudentId.has(String(student._id)) ? (
	                      <div>
	                        {assignedByStudentId.get(String(student._id)).map(assignedItem => (
	                          <div key={assignedItem._id} className="mb-1 last:mb-0">
	                            <p className="font-semibold text-slate-900">{assignedItem.structure?.name || 'Assigned'}</p>
	                            <p className="text-xs text-slate-500">{assignedItem.term || assignedItem.structure?.name || 'General'}</p>
	                          </div>
	                        ))}
	                      </div>
	                    ) : (
	                      <StatusBadge status="pending" />
                    )}
                  </td>
                </tr>
              ))}
              {!loading && students.length === 0 && (
                <tr>
                  <td className="table-cell text-center text-sm text-slate-400" colSpan="5">No active students found in this class.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={`Assign Fees - ${selectedClass?.displayName || 'Selected Class'}`}
        footer={<><button onClick={() => setModal(false)} className="btn-secondary btn-sm">Cancel</button><button onClick={handleAssign} disabled={saving || allStudentsAssigned} className="btn-primary btn-sm">{saving ? 'Assigning...' : 'Assign To Class'}</button></>}
      >
        <div className="space-y-4">
          <div className="border border-border bg-slate-50 p-3 text-sm">
            <p><strong>Class:</strong> {selectedClass?.displayName || 'Not selected'}</p>
            <p><strong>Active Students:</strong> {students.length}</p>
          </div>
          <div className="form-group">
            <label className="label">Fee Structure *</label>
            <SearchableSelect options={structureOpts} value={form.structureId} onChange={value => setForm(current => ({ ...current, structureId: value }))} placeholder="Select structure..." />
          </div>
          {selectedStructureSummary && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {selectedStructureSummary.name} already exists for {selectedStructureSummary.studentCount} student(s) in this class.
            </div>
          )}
          {!form.structureId && assignedStructureSummaries.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              This class already has these fee structures: {assignedStructureSummaries.map(item => item.name).join(', ')}.
            </div>
          )}
          <div className="form-group">
            <label className="label">Due Date</label>
            <input type="date" className="input" value={form.dueDate} onChange={e => setForm(current => ({ ...current, dueDate: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Discount (Rs.)</label>
              <input type="number" className="input" value={form.discountAmount} onChange={e => setForm(current => ({ ...current, discountAmount: Number(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="label">Discount Reason</label>
              <input className="input" value={form.discountReason} onChange={e => setForm(current => ({ ...current, discountReason: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function FeesListPage() {
  const academicYear = useAcademicYear();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', paymentMode: 'cash', transactionRef: '', remarks: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/classes', { params: { academicYear } }),
      api.get('/fees/student', { params: { academicYear, studentId: selectedStudentId || undefined } }),
      api.get('/fees/payments', { params: { academicYear, studentId: selectedStudentId || undefined } }),
    ])
      .then(([classesRes, feesRes, paymentsRes]) => {
        setClasses(classesRes.data.data || []);
        setFees(feesRes.data.data || []);
        setPayments(paymentsRes.data.data || []);
      })
      .catch(() => toast.error('Failed.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [academicYear, selectedStudentId]);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setSelectedStudentId('');
      return;
    }

    setStudentLoading(true);
    api.get('/students', { params: { classId: selectedClassId, status: 'active', limit: 200, academicYear } })
      .then(response => {
        setStudents(response.data.data || []);
        setSelectedStudentId('');
      })
      .catch(() => {
        toast.error('Failed to load students.');
        setStudents([]);
      })
      .finally(() => setStudentLoading(false));
  }, [selectedClassId, academicYear]);

  const handlePayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) return toast.error('Enter a valid amount.');
    setSaving(true);
    try {
      await api.post('/fees/payment', {
        studentId: payModal.student._id,
        studentFeesId: payModal._id,
        academicYear: payModal.academicYear,
        term: payModal.term,
        ...payForm,
        amount: Number(payForm.amount),
      });
      toast.success('Payment recorded!');
      setPayModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'structure',
      label: 'Fee Structure',
      render: item => item.structure ? (
        <div>
          <p className="font-semibold">{item.structure.name}</p>
          <p className="text-xs text-text-secondary">{item.term || item.structure.name}</p>
        </div>
      ) : '-',
    },
    { key: 'dueDate', label: 'Due Date', render: item => item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN') : '-' },
    { key: 'total', label: 'Total', render: item => <span className="font-bold">Rs.{(item.totalAmount || 0).toLocaleString('en-IN')}</span> },
    { key: 'paid', label: 'Paid', render: item => <span className="font-bold text-emerald-600">Rs.{(item.paidAmount || 0).toLocaleString('en-IN')}</span> },
    { key: 'due', label: 'Due', render: item => <span className="font-bold text-red-600">Rs.{(item.dueAmount || 0).toLocaleString('en-IN')}</span> },
    { key: 'status', label: 'Status', render: item => <StatusBadge status={item.status} /> },
    {
      key: 'actions',
      label: '',
      render: item => item.status !== 'paid' && (
        <button
          onClick={() => {
            setPayModal(item);
            setPayForm({ amount: item.dueAmount, paymentMode: 'cash', transactionRef: '', remarks: '' });
          }}
          className="btn-primary btn-sm"
        >
          <FiDollarSign />Collect
        </button>
      ),
    },
  ];

  const paymentColumns = [
    { key: 'receipt', label: 'Receipt', render: item => <span className="font-mono text-xs">{item.receiptNo || '-'}</span> },
    { key: 'date', label: 'Date', render: item => item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('en-IN') : '-' },
    { key: 'amount', label: 'Amount', render: item => <span className="font-bold text-emerald-600">Rs.{Number(item.amount || 0).toLocaleString('en-IN')}</span> },
    { key: 'mode', label: 'Mode', render: item => item.paymentMode?.toUpperCase() || '-' },
    { key: 'term', label: 'Fee', render: item => item.term || '-' },
    { key: 'remarks', label: 'Remarks', render: item => item.remarks || '-' },
  ];

  const classOpts = classes.map(item => ({ value: item._id, label: item.displayName || `Grade ${item.grade}-${item.section}` }));
  const studentOpts = students.map(item => ({
    value: item._id,
    label: `${item.firstName} ${item.lastName}${item.admissionNo ? ` (${item.admissionNo})` : ''}`,
  }));
  const selectedClass = classes.find(item => String(item._id) === String(selectedClassId));
  const selectedStudent = students.find(item => String(item._id) === String(selectedStudentId));

  return (
    <div className="float-in">
      <PageHeader title="Fees List" subtitle="Check assigned fees and payment movement student-wise" />

      <div className="campus-panel mb-4 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="form-group">
            <label className="label">Class / Grade</label>
            <SearchableSelect options={classOpts} value={selectedClassId} onChange={setSelectedClassId} placeholder="Select class..." />
          </div>
          <div className="form-group">
            <label className="label">Student</label>
            <SearchableSelect options={studentOpts} value={selectedStudentId} onChange={setSelectedStudentId} placeholder={selectedClassId ? 'Select student...' : 'Select class first...'} disabled={!selectedClassId || studentLoading} />
          </div>
        </div>

        {selectedClass && (
          <div className="mt-3 text-sm text-text-secondary">
            <p>{students.length} active student(s) found in {selectedClass.displayName || `Grade ${selectedClass.grade}-${selectedClass.section}`}.</p>
          </div>
        )}
      </div>

      {selectedStudentId ? (
        <>
          <div className="campus-panel mb-4 p-4">
            <p className="text-base font-bold text-slate-900">{selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Selected Student'}</p>
            <p className="mt-1 text-sm text-text-secondary">Assigned fee structures and current due details.</p>
          </div>

          <div className="campus-panel overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-text-primary">Assigned Fees</p>
              <p className="text-xs text-text-secondary">This shows total, paid amount, and remaining due for the selected student.</p>
            </div>
            <DataTable columns={columns} data={fees} loading={loading} />
          </div>

          <div className="campus-panel mt-4 overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-text-primary">Fees Movement</p>
              <p className="text-xs text-text-secondary">Every payment made by the selected student is shown here, so old partial payments and new payments are both visible.</p>
            </div>
            <DataTable columns={paymentColumns} data={payments} loading={loading} />
          </div>
        </>
      ) : (
        <div className="campus-panel p-6 text-sm text-text-secondary">
          Select a class and student to view assigned fees and payment movement.
        </div>
      )}

      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title="Record Payment"
        footer={<><button onClick={() => setPayModal(null)} className="btn-secondary btn-sm">Cancel</button><button onClick={handlePayment} disabled={saving} className="btn-primary btn-sm">{saving ? 'Processing...' : 'Record Payment'}</button></>}
      >
        <div className="space-y-4">
          <div className="border border-border bg-slate-50 p-3 text-sm">
            <p><strong>Student:</strong> {payModal?.student?.firstName} {payModal?.student?.lastName}</p>
            <p><strong>Fee Structure:</strong> {payModal?.structure?.name || '-'}</p>
            <p><strong>Pending:</strong> Rs.{(payModal?.dueAmount || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="form-group">
            <label className="label">Amount (Rs.) *</label>
            <input type="number" className="input" value={payForm.amount} onChange={e => setPayForm(current => ({ ...current, amount: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Payment Mode</label>
            <select className="input" value={payForm.paymentMode} onChange={e => setPayForm(current => ({ ...current, paymentMode: e.target.value }))}>
              {['cash', 'online', 'cheque', 'dd', 'neft'].map(mode => <option key={mode} value={mode}>{mode.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Transaction Ref / Cheque No</label>
            <input className="input" value={payForm.transactionRef} onChange={e => setPayForm(current => ({ ...current, transactionRef: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Remarks</label>
            <input className="input" value={payForm.remarks} onChange={e => setPayForm(current => ({ ...current, remarks: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
