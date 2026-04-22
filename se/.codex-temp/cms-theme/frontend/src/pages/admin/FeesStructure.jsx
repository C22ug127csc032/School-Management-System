import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { ExportActions, PageHeader, Modal, EmptyState, PageSpinner, SearchableSelect } from '../../components/common';
import { FiCheckCircle, FiClipboard, FiEdit3, FiTrash2, FiX } from '../../components/common/icons';
import toast from 'react-hot-toast';
import {
  DEFAULT_CATEGORY_FEE_HEADS,
  FEE_HEAD_APPLICABILITY,
  FEE_HEAD_APPLICABILITY_LABELS,
  getStructureTotals,
} from '../../utils/feeStructure';

export default function FeesStructure() {
  const initialForm = {
    name: '',
    course: '',
    academicYear: '',
    semester: '',
    feeHeads: DEFAULT_CATEGORY_FEE_HEADS.map(head => ({ ...head })),
    hasInstallments: false,
    fineEnabled: false,
    fineAmount: 0,
  };
  const [structures, setStructures] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(initialForm);
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

  useEffect(() => {
    Promise.all([api.get('/fees/structure'), api.get('/courses')])
      .then(([structuresResponse, coursesResponse]) => {
        setStructures(structuresResponse.data.structures);
        setCourses(coursesResponse.data.courses);
      })
      .finally(() => setLoading(false));
  }, []);

  const addHead = () => setForm(current => ({
    ...current,
    feeHeads: [...current.feeHeads, { headName: '', amount: '', applicableTo: FEE_HEAD_APPLICABILITY.ALL }],
  }));

  const removeHead = index => setForm(current => ({
    ...current,
    feeHeads: current.feeHeads.filter((_, headIndex) => headIndex !== index),
  }));

  const updateHead = (index, key, value) => setForm(current => ({
    ...current,
    feeHeads: current.feeHeads.map((head, headIndex) =>
      headIndex === index ? { ...head, [key]: value } : head
    ),
  }));

  const total = form.feeHeads.reduce((sum, head) => sum + (Number(head.amount) || 0), 0);
  const totals = useMemo(() => getStructureTotals(form.feeHeads), [form.feeHeads]);

  const handleSubmit = async event => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        semester: form.semester ? Number(form.semester) : '',
        fineAmount: Number(form.fineAmount) || 0,
        feeHeads: form.feeHeads.map(head => ({
          ...head,
          amount: Number(head.amount) || 0,
          applicableTo: head.applicableTo || FEE_HEAD_APPLICABILITY.ALL,
        })),
      };
      const response = editingId
        ? await api.put(`/fees/structure/${editingId}`, payload)
        : await api.post('/fees/structure', payload);
      setStructures(current => (
        editingId
          ? current.map(structure => (
              structure._id === editingId ? response.data.structure : structure
            ))
          : [response.data.structure, ...current]
      ));
      setShowModal(false);
      setEditingId('');
      setForm(initialForm);
      toast.success(editingId ? 'Fee structure updated' : 'Fee structure created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleEdit = structure => {
    setEditingId(structure._id);
    setForm({
      name: structure.name || '',
      course: structure.course?._id || structure.course || '',
      academicYear: structure.academicYear || '',
      semester: structure.semester || '',
      feeHeads: structure.feeHeads?.length
        ? structure.feeHeads.map(head => ({
            headName: head.headName || '',
            amount: head.amount || '',
            applicableTo: head.applicableTo || FEE_HEAD_APPLICABILITY.ALL,
          }))
        : DEFAULT_CATEGORY_FEE_HEADS.map(head => ({ ...head })),
      hasInstallments: !!structure.hasInstallments,
      fineEnabled: !!structure.fineEnabled,
      fineAmount: structure.fineAmount || 0,
    });
    setShowModal(true);
  };

  const handleDeactivate = async structureId => {
    try {
      await api.delete(`/fees/structure/${structureId}`);
      setStructures(current => current.map(structure => (
        structure._id === structureId
          ? { ...structure, isActive: false }
          : structure
      )));
      toast.success('Fee structure deactivated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate fee structure');
    }
  };


  const handleReactivate = async structureId => {
    try {
      const response = await api.put(`/fees/structure/${structureId}/reactivate`);
      setStructures(current => current.map(structure => (
        structure._id === structureId
          ? { ...structure, ...(response.data.structure || {}), isActive: true }
          : structure
      )));
      toast.success('Fee structure reactivated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reactivate fee structure');
    }
  };

  const handleDeletePermanent = async structureId => {
    const confirmed = window.confirm('Delete this fee structure permanently? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await api.delete(`/fees/structure/${structureId}/permanent`);
      setStructures(current => current.filter(structure => structure._id !== structureId));
      toast.success('Fee structure deleted permanently');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete fee structure');
    }
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId('');
    setForm(initialForm);
  };

  return (
    <div>
      <PageHeader
        title="Fee Structures"
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <ExportActions
              getExportConfig={() => ({
                fileName: 'fee-structures',
                title: 'Fee Structures Export',
                subtitle: 'Configured fee structures with common, day scholar, and hostel fee heads.',
                summary: [
                  { label: 'Structures', value: structures.length },
                  { label: 'Active', value: structures.filter(structure => structure.isActive).length },
                  { label: 'With Fine Enabled', value: structures.filter(structure => structure.fineEnabled).length },
                ],
                sections: [
                  {
                    title: 'Fee Structures',
                    columns: [
                      { header: 'Name', value: structure => structure.name || '-' },
                      { header: 'Course', value: structure => structure.course?.name || 'All Courses' },
                      { header: 'Academic Year', value: structure => structure.academicYear || '-' },
                      { header: 'Semester', value: structure => structure.semester || 'All' },
                      { header: 'Day Scholar Total', value: structure => `Rs. ${Number(getStructureTotals(structure.feeHeads).dayScholarTotal || 0).toLocaleString('en-IN')}`, align: 'right' },
                      { header: 'Hostel Total', value: structure => `Rs. ${Number(getStructureTotals(structure.feeHeads).hostellerTotal || 0).toLocaleString('en-IN')}`, align: 'right' },
                      { header: 'Fine Enabled', value: structure => structure.fineEnabled ? 'Yes' : 'No' },
                      { header: 'Fine Amount', value: structure => structure.fineEnabled ? `Rs. ${Number(structure.fineAmount || 0).toLocaleString('en-IN')}` : '-', align: 'right' },
                      { header: 'Status', value: structure => structure.isActive ? 'Active' : 'Inactive' },
                    ],
                    rows: structures,
                  },
                ],
              })}
              disabled={loading || structures.length === 0}
            />
            <button className="btn-primary" onClick={() => { setEditingId(''); setForm(initialForm); setShowModal(true); }}>
              + New Structure
            </button>
          </div>
        )}
      />

      {loading ? <PageSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {structures.map(structure => {
            const structureTotals = getStructureTotals(structure.feeHeads);

            return (
            <div key={structure._id} className="card hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-800">{structure.name}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    structure.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {structure.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-1">
                {structure.course?.name || 'All Courses'} • {structure.academicYear}
              </p>
              <p className="text-sm text-gray-500 mb-3">
                Semester {structure.semester || 'All'}
              </p>
              <div className="space-y-1 mb-3">
                {structure.feeHeads?.map((head, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {head.headName}
                      <span className="ml-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                        {FEE_HEAD_APPLICABILITY_LABELS[head.applicableTo || FEE_HEAD_APPLICABILITY.ALL]}
                      </span>
                    </span>
                    <span className="font-medium">
                      Rs.{head.amount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-2 space-y-1.5">
                {structureTotals.hasCategorySpecificHeads ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-gray-700">Day Scholar Total</span>
                      <span className="text-base font-bold text-primary-700">
                        Rs.{structureTotals.dayScholarTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-gray-700">Hostel Total</span>
                      <span className="text-base font-bold text-primary-700">
                        Rs.{structureTotals.hostellerTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-gray-700">Total</span>
                    <span className="text-base font-bold text-primary-700">
                      Rs.{structureTotals.dayScholarTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => handleEdit(structure)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-500 bg-white text-primary-600 transition hover:bg-primary-600 hover:text-white"
                  aria-label={`Edit ${structure.name}`}
                  title="Edit fee structure"
                >
                  <FiEdit3 className="text-sm" />
                </button>
                {structure.isActive ? (
                  <button
                    type="button"
                    onClick={() => handleDeactivate(structure._id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500 bg-white text-red-500 transition hover:bg-red-500 hover:text-white"
                    aria-label={`Deactivate ${structure.name}`}
                    title="Deactivate fee structure"
                  >
                    <FiX className="text-sm" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReactivate(structure._id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500 bg-white text-emerald-500 transition hover:bg-emerald-500 hover:text-white"
                      aria-label={`Reactivate ${structure.name}`}
                      title="Reactivate fee structure"
                    >
                      <FiCheckCircle className="text-sm" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePermanent(structure._id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500 bg-white text-red-500 transition hover:bg-red-500 hover:text-white"
                      aria-label={`Delete ${structure.name}`}
                      title="Delete fee structure"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )})}
          {structures.length === 0 && (
            <div className="col-span-3">
              <EmptyState message="No fee structures yet" icon={<FiClipboard />} />
            </div>
          )}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={handleCloseModal}
        title={editingId ? 'Edit Fee Structure' : 'Create Fee Structure'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Name *</label>
              <input
                className="input"
                placeholder="e.g. BCA Semester 1 Fee Structure"
                value={form.name}
                onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Course</label>
              <SearchableSelect
                value={form.course}
                onChange={course => setForm(current => ({ ...current, course }))}
                placeholder="All Courses"
                searchPlaceholder="Search courses..."
                options={courseOptions}
              />
            </div>

            <div>
              <label className="label">Academic Year *</label>
              <input
                className="input"
                placeholder="e.g. 2026-27"
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
                max="10"
                placeholder="e.g. 1"
                value={form.semester}
                onChange={event => setForm(current => ({ ...current, semester: event.target.value }))}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="label mb-0">Fee Heads</label>
              <button
                type="button"
                onClick={addHead}
                className="text-primary-600 text-sm hover:underline"
              >
                + Add Head
              </button>
            </div>
            <div className="space-y-2">
              {form.feeHeads.map((head, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="e.g. Tuition Fee"
                    value={head.headName}
                    onChange={event => updateHead(index, 'headName', event.target.value)}
                  />
                  <input
                    type="number"
                    className="input w-32"
                    placeholder="e.g. 25000"
                    value={head.amount}
                    onChange={event => updateHead(index, 'amount', event.target.value)}
                  />
                  <select
                    className="input w-40"
                    value={head.applicableTo || FEE_HEAD_APPLICABILITY.ALL}
                    onChange={event => updateHead(index, 'applicableTo', event.target.value)}
                  >
                    <option value={FEE_HEAD_APPLICABILITY.ALL}>All Students</option>
                    <option value={FEE_HEAD_APPLICABILITY.DAYSCHOLAR}>Day Scholars</option>
                    <option value={FEE_HEAD_APPLICABILITY.HOSTELER}>Hostel Students</option>
                  </select>
                  {form.feeHeads.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeHead(index)}
                      className="text-red-500 hover:text-red-700 px-2"
                    >
                      x
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-col gap-1 text-right text-sm font-semibold text-primary-700">
              {totals.hasCategorySpecificHeads ? (
                <>
                  <span>Day Scholar Total: Rs.{totals.dayScholarTotal.toLocaleString('en-IN')}</span>
                  <span>Hostel Total: Rs.{totals.hostellerTotal.toLocaleString('en-IN')}</span>
                </>
              ) : (
                <span>Total: Rs.{total.toLocaleString('en-IN')}</span>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.fineEnabled}
                onChange={event => setForm(current => ({ ...current, fineEnabled: event.target.checked }))}
                className="rounded"
              />
              Enable Late Fine
            </label>
            {form.fineEnabled && (
              <input
                type="number"
                className="input w-32"
                placeholder="e.g. 100"
                value={form.fineAmount}
                onChange={event => setForm(current => ({ ...current, fineAmount: event.target.value }))}
              />
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingId ? 'Save Changes' : 'Create Structure'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
