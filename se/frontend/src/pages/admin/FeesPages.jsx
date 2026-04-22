import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiDollarSign } from 'react-icons/fi';
import api from '../../api/axios.js';
import { PageHeader, DataTable, Modal, SearchableSelect, StatusBadge } from '../../components/common/index.jsx';
import useAcademicYear from '../../hooks/useAcademicYear.js';

export function FeeStructuresPage() {
  const academicYear = useAcademicYear();
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    grade: '',
    academicYear,
    term: 'Annual',
    feeHeads: [{ headName: 'Tuition Fee', amount: 0, applicableTo: 'all' }],
    hasInstallments: false,
    fineEnabled: false,
    fineType: 'flat',
    fineAmount: 0,
    fineGraceDays: 0,
  });

  useEffect(() => {
    setForm(current => (current.academicYear === academicYear ? current : { ...current, academicYear }));
  }, [academicYear]);

  const load = () => {
    setLoading(true);
    api.get('/fees/structures', { params: { academicYear } })
      .then(r => setStructures(r.data.data))
      .catch(() => toast.error('Failed.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [academicYear]);

  const addHead = () => setForm(f => ({ ...f, feeHeads: [...f.feeHeads, { headName: '', amount: 0, applicableTo: 'all' }] }));
  const removeHead = index => setForm(f => ({ ...f, feeHeads: f.feeHeads.filter((_, idx) => idx !== index) }));
  const updateHead = (index, key, value) => setForm(f => {
    const heads = [...f.feeHeads];
    heads[index] = { ...heads[index], [key]: value };
    return { ...f, feeHeads: heads };
  });

  const total = form.feeHeads.reduce((sum, head) => sum + Number(head.amount || 0), 0);

  const handleSave = async () => {
    if (!form.name) return toast.error('Structure name required.');
    setSaving(true);
    try {
      await api.post('/fees/structures', form);
      toast.success('Fee structure created.');
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

  const columns = [
    { key: 'name', label: 'Structure Name', render: item => <span className="font-semibold">{item.name}</span> },
    { key: 'grade', label: 'Grade', render: item => item.grade || 'All' },
    { key: 'term', label: 'Term', render: item => item.term || '-' },
    { key: 'total', label: 'Total Amount', render: item => <span className="font-bold text-primary-700">Rs.{(item.totalAmount || 0).toLocaleString('en-IN')}</span> },
    { key: 'ay', label: 'Acad. Year', render: item => item.academicYear },
    { key: 'actions', label: '', render: item => <button onClick={() => handleDelete(item._id)} className="btn-icon btn-sm text-red-600"><FiTrash2 /></button> },
  ];

  return (
    <div className="float-in">
      <PageHeader
        title="Fee Structures"
        subtitle="Manage fee structures for classes"
        actions={<button onClick={() => setModal(true)} className="btn-primary"><FiPlus />New Structure</button>}
      />
      <div className="campus-panel overflow-hidden">
        <DataTable columns={columns} data={structures} loading={loading} />
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Create Fee Structure"
        size="lg"
        footer={<><button onClick={() => setModal(false)} className="btn-secondary btn-sm">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">{saving ? 'Saving...' : 'Create'}</button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group col-span-2">
              <label className="label">Structure Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">For Grade (optional)</label>
              <input className="input" placeholder="e.g. 10 or leave blank" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Term</label>
              <input className="input" value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">Fee Heads</label>
              <button type="button" onClick={addHead} className="btn-secondary btn-sm"><FiPlus />Add Head</button>
            </div>
            <div className="space-y-2">
              {form.feeHeads.map((head, index) => (
                <div key={index} className="grid grid-cols-12 items-center gap-2 border border-border p-2">
                  <input className="input col-span-5" placeholder="Fee head name" value={head.headName} onChange={e => updateHead(index, 'headName', e.target.value)} />
                  <input type="number" className="input col-span-3" placeholder="Amount Rs." value={head.amount} onChange={e => updateHead(index, 'amount', e.target.value)} />
                  <select className="input col-span-3" value={head.applicableTo} onChange={e => updateHead(index, 'applicableTo', e.target.value)}>
                    <option value="all">All</option>
                    <option value="hosteler">Hosteler</option>
                    <option value="day_scholar">Day Scholar</option>
                  </select>
                  <button type="button" onClick={() => removeHead(index)} className="btn-icon btn-sm col-span-1 text-red-600"><FiTrash2 /></button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-right text-sm font-bold text-primary-700">Total: Rs.{total.toLocaleString('en-IN')}</p>
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
  const assignedStudentIds = new Set(assignedFees.map(item => String(item.student?._id || item.student)));
  const allStudentsAssigned = students.length > 0 && students.every(student => assignedStudentIds.has(String(student._id)));
  const assignedByStudentId = new Map(assignedFees.map(item => [String(item.student?._id || item.student), item]));
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
              {assignedStudentIds.size} student(s) already have fees assigned for {academicYear}.
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
                        <p className="font-semibold text-slate-900">{assignedByStudentId.get(String(student._id)).structure?.name || 'Assigned'}</p>
                        <p className="text-xs text-slate-500">{assignedByStudentId.get(String(student._id)).term || 'General'}</p>
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
              {selectedStructureSummary.name} is already assigned to {selectedStructureSummary.studentCount} student(s) in this class.
            </div>
          )}
          {!selectedStructureSummary && allStudentsAssigned && assignedStructureSummaries.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              This class already has assigned fees: {assignedStructureSummaries.map(item => item.name).join(', ')}.
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
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', paymentMode: 'cash', transactionRef: '', remarks: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/fees/student', { params: { academicYear } })
      .then(r => setFees(r.data.data))
      .catch(() => toast.error('Failed.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [academicYear]);

  const handlePayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) return toast.error('Enter a valid amount.');
    setSaving(true);
    try {
      await api.post('/fees/payment', {
        studentId: payModal.student._id,
        studentFeesId: payModal._id,
        academicYear: payModal.academicYear,
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
      key: 'student',
      label: 'Student',
      render: item => item.student ? (
        <div>
          <p className="font-semibold">{item.student.firstName} {item.student.lastName}</p>
          <p className="text-xs font-mono text-text-secondary">{item.student.admissionNo}</p>
        </div>
      ) : '-',
    },
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

  return (
    <div className="float-in">
      <PageHeader title="Fees List" subtitle="All student fee assignments" />
      <div className="campus-panel overflow-hidden">
        <DataTable columns={columns} data={fees} loading={loading} />
      </div>
      <Modal
        open={!!payModal}
        onClose={() => setPayModal(null)}
        title="Record Payment"
        footer={<><button onClick={() => setPayModal(null)} className="btn-secondary btn-sm">Cancel</button><button onClick={handlePayment} disabled={saving} className="btn-primary btn-sm">{saving ? 'Processing...' : 'Record Payment'}</button></>}
      >
        <div className="space-y-4">
          <div className="border border-border bg-slate-50 p-3 text-sm">
            <p><strong>Student:</strong> {payModal?.student?.firstName} {payModal?.student?.lastName}</p>
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
