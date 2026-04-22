import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api, { downloadSaleReceipt } from '../../api/axios';
import { ExportActions, ListControls, PageHeader, Table, StatusBadge, FilterBar, EmptyState, Modal, PageSpinner, StatCard, Pagination, SearchableSelect } from '../../components/common';
import { FiAlertOctagon, FiBell, FiCheckCircle, FiClock, FiCreditCard, FiDollarSign, FiDownload, FiEdit3, FiLogOut, FiPackage, FiTarget, FiTrash2, FiTrendingDown, FiUsers, FiX } from '../../components/common/icons';
import toast from 'react-hot-toast';
import { isValidIndianPhone, sanitizePhoneField } from '../../utils/phone';
import { useAuth } from '../../context/AuthContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import { getFirstActiveValue, toSelectOptions } from '../../utils/appSettings';
import { getStudentIdentifier, toStudentSelectOption } from '../../utils/studentDisplay';

const toSelectOption = (value, label, searchText = '') => ({
  value,
  label,
  searchText: searchText || label,
});

const staffSortOptions = [
  { value: 'name:asc', label: 'Name A-Z' },
  { value: 'role:asc', label: 'Role A-Z' },
  { value: 'department:asc', label: 'Department A-Z' },
  { value: 'status:desc', label: 'Active First' },
  { value: 'latest:desc', label: 'Newest Added' },
];

const parseStaffSortValue = value => {
  const [sortBy = 'name', sortOrder = 'asc'] = String(value || 'name:asc').split(':');
  return { sortBy, sortOrder };
};

// ─── OUTPASS ──────────────────────────────────────────────────────────────────
export function OutpassManagement() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [remark, setRemark] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    const r = await api.get('/outpass', { params: { status: filter || undefined } });
    setList(r.data.outpasses); setLoading(false);
  }, [filter]);
  useEffect(() => { fetch(); }, [fetch]);

  const action = async (id, status) => {
    await api.put(`/outpass/${id}/status`, { status, remarks: remark });
    toast.success(`Outpass ${status}`); setSelected(null); fetch();
  };
  const markReturned = async id => {
    await api.put(`/outpass/${id}/return`); toast.success('Marked as returned'); fetch();
  };

  return (
    <div>
      <PageHeader
        title="Outpass Management"
        action={
          <ExportActions
            getExportConfig={() => ({
              fileName: `outpass-${filter || 'all'}`,
              title: 'Outpass Export',
              subtitle: 'Outpass requests filtered by approval status.',
              summary: [
                { label: 'Status Filter', value: filter || 'All' },
                { label: 'Requests', value: list.length },
                { label: 'Pending', value: list.filter(item => item.status === 'pending').length },
                { label: 'Approved', value: list.filter(item => item.status === 'approved').length },
                { label: 'Returned', value: list.filter(item => item.status === 'returned').length },
                { label: 'Rejected', value: list.filter(item => item.status === 'rejected').length },
              ],
              sections: [
                {
                  title: 'Outpass Requests',
                  columns: [
                    { header: 'Student', value: item => `${item.student?.firstName || ''} ${item.student?.lastName || ''}`.trim() || '-' },
                    { header: 'Reg No', value: item => item.student?.regNo || '-' },
                    { header: 'Exit Date', value: item => new Date(item.exitDate).toLocaleDateString('en-IN') },
                    { header: 'Return Date', value: item => new Date(item.expectedReturn).toLocaleDateString('en-IN') },
                    { header: 'Destination', value: item => item.destination || '?' },
                    { header: 'Reason', value: item => item.reason || '-' },
                    { header: 'Status', value: item => item.status || '-' },
                  ],
                  rows: list,
                },
              ],
            })}
            disabled={loading || list.length === 0}
          />
        }
      />
      <div className="card">
        <FilterBar>
          {['', 'pending', 'approved', 'returned', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s || 'All'}
            </button>
          ))}
        </FilterBar>
        {loading ? <PageSpinner /> : (
          <Table headers={['Student', 'Exit Date', 'Return Date', 'Destination', 'Reason', 'Status', 'Actions']}>
            {list.map(o => (
              <tr key={o._id} className="hover:bg-gray-50">
                <td className="table-cell"><p className="font-medium">{o.student?.firstName} {o.student?.lastName}</p><p className="text-xs text-gray-400">{o.student?.regNo}</p></td>
                <td className="table-cell">{new Date(o.exitDate).toLocaleDateString('en-IN')}</td>
                <td className="table-cell">{new Date(o.expectedReturn).toLocaleDateString('en-IN')}</td>
                <td className="table-cell">{o.destination || '?'}</td>
                <td className="table-cell max-w-xs truncate">{o.reason}</td>
                <td className="table-cell"><StatusBadge status={o.status} /></td>
                <td className="table-cell flex gap-1">
                  {o.status === 'pending' && <button onClick={() => { setSelected(o); setRemark(''); }} className="text-primary-600 text-sm hover:underline">Review</button>}
                  {o.status === 'approved' && <button onClick={() => markReturned(o._id)} className="text-green-600 text-sm hover:underline">Return</button>}
                </td>
              </tr>
            ))}
          </Table>
        )}
        {!loading && list.length === 0 && <EmptyState message="No outpass requests" icon={<FiLogOut />} />}
      </div>
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Review Outpass">
        {selected && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
              <p><strong>{selected.student?.firstName} {selected.student?.lastName}</strong></p>
              <p>Exit: {new Date(selected.exitDate).toLocaleDateString('en-IN')} | Return: {new Date(selected.expectedReturn).toLocaleDateString('en-IN')}</p>
              <p>Reason: {selected.reason}</p>
            </div>
            <textarea className="input" rows={2} value={remark} onChange={e => setRemark(e.target.value)} placeholder="Remarks..." />
            <div className="flex gap-3">
              <button onClick={() => action(selected._id, 'approved')} className="btn-success flex-1">Approve</button>
              <button onClick={() => action(selected._id, 'rejected')} className="btn-danger flex-1">Reject</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ??? EXPENSE ──────────────────────────────────────────────────────────────────
export function ExpensePage() {
  const { getMasterOptions } = useAppSettings();
  const expenseCategoryOptions = toSelectOptions(getMasterOptions('expense_categories', [
    { value: 'salary', label: 'Salary' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'stationery', label: 'Stationery' },
    { value: 'transport', label: 'Transport' },
    { value: 'events', label: 'Events' },
    { value: 'miscellaneous', label: 'Miscellaneous' },
  ]));
  const expensePaymentModeOptions = toSelectOptions(getMasterOptions('expense_payment_modes', [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'online', label: 'Online' },
  ]));
  const initialExpenseForm = { title: '', category: getFirstActiveValue(expenseCategoryOptions, 'miscellaneous'), amount: '', date: new Date().toISOString().slice(0, 10), paymentMode: getFirstActiveValue(expensePaymentModeOptions, 'cash'), description: '' };
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(initialExpenseForm);

  const fetch = async () => {
    const r = await api.get('/expense');
    setExpenses(r.data.expenses); setTotal(r.data.totalAmount); setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const add = async e => {
    e.preventDefault();
    await api.post('/expense', form); toast.success('Expense added'); setShow(false); setForm(initialExpenseForm); fetch();
  };

  return (
    <div>
      <PageHeader
        title="Expense Management"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportActions
              getExportConfig={() => ({
                fileName: 'expenses',
                title: 'Expense Export',
                subtitle: 'Expense records and totals from the admin expense module.',
                summary: [
                  { label: 'Entries', value: expenses.length },
                  { label: 'Total Expense', value: `Rs. ${Number(total || 0).toLocaleString('en-IN')}` },
                ],
                sections: [
                  {
                    title: 'Expenses',
                    columns: [
                      { header: 'Title', value: expense => expense.title || '-' },
                      { header: 'Category', value: expense => expense.category || '-' },
                      { header: 'Date', value: expense => new Date(expense.date).toLocaleDateString('en-IN') },
                      { header: 'Mode', value: expense => expense.paymentMode || '-' },
                      { header: 'Amount', value: expense => `Rs. ${Number(expense.amount || 0).toLocaleString('en-IN')}`, align: 'right' },
                      { header: 'Description', value: expense => expense.description || '-' },
                    ],
                    rows: expenses,
                  },
                ],
              })}
              disabled={loading || expenses.length === 0}
            />
            <button onClick={() => { setForm(initialExpenseForm); setShow(true); }} className="btn-primary">+ Add Expense</button>
          </div>
        }
      />
      <div className="card mb-4 flex gap-4 items-center">
        <div className="text-2xl font-bold text-gray-800">₹{total.toLocaleString('en-IN')}</div>
        <div className="text-sm text-gray-500">Total Expenses</div>
      </div>
      <div className="card">
        {loading ? <PageSpinner /> : (
          <Table headers={['Title', 'Category', 'Date', 'Mode', 'Amount']}>
            {expenses.map(e => (
              <tr key={e._id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{e.title}</td>
                <td className="table-cell capitalize">{e.category}</td>
                <td className="table-cell">{new Date(e.date).toLocaleDateString('en-IN')}</td>
                <td className="table-cell uppercase text-xs">{e.paymentMode}</td>
                <td className="table-cell font-semibold text-red-600">₹{e.amount?.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </Table>
        )}
        {!loading && expenses.length === 0 && <EmptyState message="No expenses recorded" icon={<FiTrendingDown />} />}
      </div>
      <Modal open={show} onClose={() => { setShow(false); setForm(initialExpenseForm); }} title="Add Expense">
        <form onSubmit={add} className="space-y-3">
          <div><label className="label">Title *</label><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className="label">Category</label>
              <SearchableSelect
                value={form.category}
                onChange={category => setForm(f => ({ ...f, category }))}
                placeholder="Select category"
                searchPlaceholder="Search categories..."
                options={expenseCategoryOptions}
              />
            </div>
            <div><label className="label">Amount *</label><input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required /></div>
            <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><label className="label">Payment Mode</label>
              <SearchableSelect
                value={form.paymentMode}
                onChange={paymentMode => setForm(f => ({ ...f, paymentMode }))}
                placeholder="Select payment mode"
                searchPlaceholder="Search payment modes..."
                options={expensePaymentModeOptions}
              />
            </div>
          </div>
          <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={() => { setShow(false); setForm(initialExpenseForm); }} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Add</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ─── CIRCULARS ─────────────────────────────────────────────────────────────────
export function CircularsAdmin() {
  const { user } = useAuth();
  const { getMasterOptions } = useAppSettings();
  const isClassTeacher = user?.role === 'class_teacher';
  const circularTypeOptions = toSelectOptions(getMasterOptions('circular_types', [
    { value: 'circular', label: 'Circular' },
    { value: 'announcement', label: 'Announcement' },
    { value: 'exam_schedule', label: 'Exam Schedule' },
    { value: 'event', label: 'Event' },
    { value: 'holiday', label: 'Holiday' },
  ]));
  const allAudienceOptions = toSelectOptions(getMasterOptions('circular_audiences', [
    { value: 'students', label: 'Students' },
    { value: 'parents', label: 'Parents' },
    { value: 'staff', label: 'Staff' },
    { value: 'all', label: 'All' },
  ]));
  const initialCircularForm = {
    title: '',
    content: '',
    type: getFirstActiveValue(circularTypeOptions, 'circular'),
    audience: isClassTeacher ? ['students', 'parents'] : ['all'],
    course: '',
  };
  const [circulars, setCirculars] = useState([]);
  const [courses, setCourses] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(initialCircularForm);
  const [editingId, setEditingId] = useState('');

  const normalizedDepartment = String(user?.department || '').trim().toUpperCase();
  const teacherCourse = courses.find(course => {
    const courseName = String(course.name || '').trim().toUpperCase();
    const courseCode = String(course.code || '').trim().toUpperCase();
    const courseDepartment = String(course.department || '').trim().toUpperCase();
    const courseId = String(course._id || '').trim().toUpperCase();

    return (
      courseName === normalizedDepartment ||
      courseCode === normalizedDepartment ||
      courseDepartment === normalizedDepartment ||
      courseId === normalizedDepartment
    );
  });
  const visibleCourses = isClassTeacher && teacherCourse ? [teacherCourse] : courses;
  const audienceOptions = isClassTeacher
    ? allAudienceOptions.filter(option => ['students', 'parents'].includes(option.value))
    : allAudienceOptions.map(option =>
        option.value === 'all'
          ? { ...option, label: 'All Recipients' }
          : option
      );

  useEffect(() => {
    api.get('/circulars').then(r => setCirculars(r.data.circulars));
    api.get('/courses').then(r => setCourses(r.data.courses || []));
  }, []);

  useEffect(() => {
    setForm(current => {
      if (!isClassTeacher) return current;
      return {
        ...current,
        course: teacherCourse?._id || current.course,
        audience: current.audience?.length ? current.audience.filter(value => ['students', 'parents'].includes(value)) : ['students', 'parents'],
      };
    });
  }, [isClassTeacher, teacherCourse?._id]);

  const toggleAudience = value => {
    setForm(current => {
      const currentAudience = current.audience || [];
      if (value === 'all') {
        return { ...current, audience: ['all'] };
      }

      const withoutAll = currentAudience.filter(item => item !== 'all');
      const nextAudience = withoutAll.includes(value)
        ? withoutAll.filter(item => item !== value)
        : [...withoutAll, value];

      return { ...current, audience: nextAudience };
    });
  };

  const openCreateModal = () => {
    setEditingId('');
    setForm({
      ...initialCircularForm,
      course: isClassTeacher ? (teacherCourse?._id || '') : '',
    });
    setShow(true);
  };

  const add = async e => {
    e.preventDefault();
    const payload = {
      ...form,
      audience: form.audience || [],
      course: form.course || undefined,
    };

    if (isClassTeacher) {
      payload.course = teacherCourse?._id || payload.course;
      payload.audience = (payload.audience || []).filter(value => ['students', 'parents'].includes(value));
    }

    if (!payload.audience?.length) {
      toast.error('Select at least one audience');
      return;
    }

    try {
      const r = editingId
        ? await api.put(`/circulars/${editingId}`, payload)
        : await api.post('/circulars', payload);
      setCirculars(p => (
        editingId
          ? p.map(circular => circular._id === editingId ? r.data.circular : circular)
          : [r.data.circular, ...p]
      ));
      setShow(false);
      setEditingId('');
      setForm(initialCircularForm);
      toast.success(editingId ? 'Circular updated' : 'Published');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish circular');
    }
  };

  const editCircular = circular => {
    setEditingId(circular._id);
    setForm({
      title: circular.title || '',
      content: circular.content || '',
      type: circular.type || getFirstActiveValue(circularTypeOptions, 'circular'),
      audience: circular.audience?.length ? circular.audience : ['all'],
      course: circular.course?._id || circular.course || '',
    });
    setShow(true);
  };

  const unpublishCircular = async id => {
    try {
      await api.delete(`/circulars/${id}`);
      setCirculars(p => p.filter(circular => circular._id !== id));
      toast.success('Circular unpublished');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unpublish circular');
    }
  };

  const closeCircularModal = () => {
    setShow(false);
    setEditingId('');
    setForm({
      ...initialCircularForm,
      course: isClassTeacher ? (teacherCourse?._id || '') : '',
    });
  };

  const typeColors = { circular: 'badge-blue', announcement: 'badge-yellow', exam_schedule: 'badge-red', event: 'badge-green', holiday: 'badge-gray' };
  const canManageCircular = circular => !isClassTeacher || String(circular.publishedBy?._id || circular.publishedBy) === String(user?._id);

  return (
    <div>
      <PageHeader
        title="Circulars & Announcements"
        action={<button onClick={openCreateModal} className="btn-primary">+ Publish</button>}
      />
      <div className="space-y-4">
        {circulars.map(c => (
          <div
            key={c._id}
            className={`card transition ${
              c.isActive ? 'border border-gray-100' : 'border border-red-100 bg-red-50/40'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-800">{c.title}</h3>
              <span className={typeColors[c.type] || 'badge-gray'}>{c.type.replace('_', ' ')}</span>
            </div>
            <p className="text-sm text-gray-600 mb-2 line-clamp-3">{c.content}</p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <span>{new Date(c.publishDate).toLocaleDateString('en-IN')}</span>
              <span>•</span>
              <span>{c.audience?.join(', ')}</span>
              <span>•</span>
              <span>{c.course?.name || 'All courses'}</span>
            </div>
            {canManageCircular(c) && (
              <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => editCircular(c)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-500 bg-white text-primary-600 transition hover:bg-primary-600 hover:text-white"
                  aria-label={`Edit ${c.title}`}
                  title="Edit circular"
                >
                  <FiEdit3 className="text-sm" />
                </button>
                <button
                  type="button"
                  onClick={() => unpublishCircular(c._id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500 bg-white text-red-500 transition hover:bg-red-500 hover:text-white"
                  aria-label={`Unpublish ${c.title}`}
                  title="Unpublish circular"
                >
                  <FiX className="text-sm" />
                </button>
              </div>
            )}
          </div>
        ))}
        {circulars.length === 0 && <EmptyState message="No circulars published" icon={<FiBell />} />}
      </div>
      <Modal open={show} onClose={closeCircularModal} title={editingId ? 'Edit Circular' : 'Publish Circular'} size="lg">
        <form onSubmit={add} className="space-y-4">
          <div><label className="label">Title *</label><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
          <div><label className="label">Type</label>
            <SearchableSelect
              value={form.type}
              onChange={type => setForm(f => ({ ...f, type }))}
              placeholder="Select type"
              searchPlaceholder="Search circular types..."
              options={circularTypeOptions}
            />
          </div>
          <div>
            <label className="label">{isClassTeacher ? 'Assigned Course' : 'Course Scope'}</label>
            {isClassTeacher ? (
              <input className="input bg-gray-50" value={teacherCourse?.name || 'No course assigned'} readOnly />
            ) : (
              <SearchableSelect
                value={form.course}
                onChange={course => setForm(f => ({ ...f, course }))}
                placeholder="All Courses"
                searchPlaceholder="Search courses..."
                options={[
                  toSelectOption('', 'All Courses', 'all courses'),
                  ...visibleCourses.map(course =>
                    toSelectOption(course._id, course.name, `${course.name} ${course.code || ''} ${course.department || ''}`)
                  ),
                ]}
              />
            )}
          </div>
          <div>
            <label className="label">Audience</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {audienceOptions.map(option => (
                <label key={option.value} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={(form.audience || []).includes(option.value)}
                    onChange={() => toggleAudience(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            {isClassTeacher && (
              <p className="mt-2 text-xs text-gray-500">
                Class teacher circulars are restricted to your assigned course and can be sent only to students and parents.
              </p>
            )}
          </div>
          <div><label className="label">Content *</label><textarea className="input" rows={5} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required /></div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={closeCircularModal} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Publish'}</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ─── LIBRARY ──────────────────────────────────────────────────────────────────
export function LibraryAdmin() {
  const initialBookForm = { title: '', author: '', isbn: '', publisher: '', category: '', totalCopies: 1 };
  const initialIssueForm = { bookId: '', studentId: '', dueDate: '' };
  const [books, setBooks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [tab, setTab] = useState('books');
  const [showAdd, setShowAdd] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [students, setStudents] = useState([]);
  const [bookForm, setBookForm] = useState(initialBookForm);
  const [issueForm, setIssueForm] = useState(initialIssueForm);
  const [editingBookId, setEditingBookId] = useState('');
  const studentOptions = useMemo(
    () => students.map(toStudentSelectOption),
    [students]
  );
  const availableBookOptions = useMemo(
    () => [
      toSelectOption('', 'Select Book', 'select book'),
      ...books
        .filter(book => book.availableCopies > 0)
        .map(book => toSelectOption(book._id, `${book.title} - ${book.author}`, `${book.title} ${book.author} ${book.isbn || ''}`)),
    ],
    [books]
  );

  useEffect(() => {
    api.get('/library/books')
      .then(r => setBooks(r.data.books))
      .catch(() => toast.error('Failed to load books'));
    api.get('/library/issues')
      .then(r => setIssues(r.data.issues))
      .catch(() => toast.error('Failed to load issues'));
    api.get('/library/students?limit=500')
      .then(r => setStudents(r.data.students))
      .catch(() => toast.error('Failed to load students'));
  }, []);

  const addBook = async e => {
    e.preventDefault();
    const payload = { ...bookForm, totalCopies: Number(bookForm.totalCopies) || 1 };
    const r = editingBookId
      ? await api.put(`/library/books/${editingBookId}`, payload)
      : await api.post('/library/books', payload);
    setBooks(p => (
      editingBookId
        ? p.map(book => book._id === editingBookId ? r.data.book : book)
        : [r.data.book, ...p]
    ));
    setShowAdd(false);
    setEditingBookId('');
    setBookForm(initialBookForm);
    toast.success(editingBookId ? 'Book updated' : 'Book added');
  };

  const issueBook = async e => {
    e.preventDefault();
    await api.post('/library/issue', issueForm);
    toast.success('Book issued');
    setShowIssue(false);
    setIssueForm(initialIssueForm);
    const [booksResponse, issuesResponse] = await Promise.all([
      api.get('/library/books'),
      api.get('/library/issues'),
    ]);
    setBooks(booksResponse.data.books);
    setIssues(issuesResponse.data.issues);
  };

  const editBook = book => {
    setEditingBookId(book._id);
    setBookForm({
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      publisher: book.publisher || '',
      category: book.category || '',
      totalCopies: book.totalCopies || 1,
    });
    setShowAdd(true);
  };

  const markBookUnavailable = async id => {
    try {
      await api.delete(`/library/books/${id}`);
      setBooks(p => p.filter(book => book._id !== id));
      toast.success('Book marked unavailable');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update book');
    }
  };

  const closeBookModal = () => {
    setShowAdd(false);
    setEditingBookId('');
    setBookForm(initialBookForm);
  };

  const returnBook = async id => {
    const response = await api.put(`/library/return/${id}`);
    const fine = Number(response.data.fine || 0);
    toast.success(
      fine > 0
        ? `Returned. Fine added to fees ledger: Rs ${fine}`
        : 'Book returned'
    );
    const [booksResponse, issuesResponse] = await Promise.all([
      api.get('/library/books'),
      api.get('/library/issues'),
    ]);
    setBooks(booksResponse.data.books);
    setIssues(issuesResponse.data.issues);
  };

  return (
    <div>
      <PageHeader
        title="Library"
        subtitle={tab === 'books' ? 'Catalog and stock overview' : 'Issued and returned books'}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ExportActions
              getExportConfig={() => ({
                fileName: `library-${tab}`,
                title: tab === 'books' ? 'Library Books Export' : 'Library Issues Export',
                subtitle: 'Library catalog and issue register export.',
                summary: [
                  { label: 'Current Tab', value: tab },
                  { label: 'Books', value: books.length },
                  { label: 'Issues', value: issues.length },
                  { label: 'Issued', value: issues.filter(issue => issue.status === 'issued').length },
                  { label: 'Returned', value: issues.filter(issue => issue.status === 'returned').length },
                ],
                sections: tab === 'books'
                  ? [
                      {
                        title: 'Library Books',
                        columns: [
                          { header: 'Title', value: book => book.title || '-' },
                          { header: 'Author', value: book => book.author || '-' },
                          { header: 'ISBN', value: book => book.isbn || '-' },
                          { header: 'Category', value: book => book.category || '-' },
                          { header: 'Total Copies', value: book => book.totalCopies || 0, align: 'right' },
                          { header: 'Available Copies', value: book => book.availableCopies || 0, align: 'right' },
                        ],
                        rows: books,
                      },
                    ]
                  : [
                      {
                        title: 'Library Issues',
                        columns: [
                          { header: 'Student', value: issue => `${issue.student?.firstName || ''} ${issue.student?.lastName || ''}`.trim() || '-' },
                          { header: 'Identifier', value: issue => getStudentIdentifier(issue.student) },
                          { header: 'Book', value: issue => issue.book?.title || '-' },
                          { header: 'Issue Date', value: issue => new Date(issue.issueDate).toLocaleDateString('en-IN') },
                          { header: 'Due Date', value: issue => new Date(issue.dueDate).toLocaleDateString('en-IN') },
                          { header: 'Status', value: issue => issue.status || '-' },
                          { header: 'Fine', value: issue => issue.fine > 0 ? `Rs. ${Number(issue.fine || 0).toLocaleString('en-IN')}` : '-', align: 'right' },
                        ],
                        rows: issues,
                      },
                    ],
              })}
              disabled={tab === 'books' ? books.length === 0 : issues.length === 0}
            />
            <button
              onClick={() => {
                setEditingBookId('');
                setBookForm(initialBookForm);
                setShowAdd(true);
              }}
              className="btn-secondary min-h-[42px] px-5 text-sm font-medium whitespace-nowrap"
            >
              + Add Book
            </button>
            <button
              onClick={() => {
                setIssueForm(initialIssueForm);
                setShowIssue(true);
              }}
              className="btn-primary min-h-[42px] px-5 text-sm font-medium whitespace-nowrap"
            >
              Issue Book
            </button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {['books', 'issues'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`min-w-[96px] rounded-full px-4 py-2 text-sm font-semibold capitalize transition-colors ${tab === t ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        {tab === 'books' ? (
          <div className="overflow-x-auto">
            <Table headers={['Title', 'Author', 'ISBN', 'Category', 'Total', 'Available', 'Actions']}>
              {books.map(b => (
                <tr key={b._id} className="align-middle hover:bg-gray-50/80">
                  <td className="table-cell min-w-[180px] font-semibold text-gray-900">{b.title}</td>
                  <td className="table-cell min-w-[160px] text-gray-700">{b.author}</td>
                  <td className="table-cell min-w-[140px] font-mono text-xs text-gray-500">{b.isbn || '?'}</td>
                  <td className="table-cell min-w-[160px] text-gray-700">{b.category || '?'}</td>
                  <td className="table-cell text-center font-medium text-gray-800">{b.totalCopies}</td>
                  <td className="table-cell text-center">
                    <span className={b.availableCopies > 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>{b.availableCopies}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => editBook(b)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-500 bg-white text-primary-600 transition hover:bg-primary-600 hover:text-white"
                        aria-label={`Edit ${b.title}`}
                        title="Edit book"
                      >
                        <FiEdit3 className="text-sm" />
                      </button>
                      <button
                        type="button"
                        onClick={() => markBookUnavailable(b._id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500 bg-white text-red-500 transition hover:bg-red-500 hover:text-white"
                        aria-label={`Mark ${b.title} unavailable`}
                        title="Mark unavailable"
                      >
                        <FiX className="text-sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            {books.length === 0 && <EmptyState message="No books added yet" icon={<FiPackage />} />}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table headers={['Student', 'Book', 'Issue Date', 'Due Date', 'Status', 'Fine', 'Actions']}>
              {issues.map(i => (
                <tr key={i._id} className="align-middle hover:bg-gray-50/80">
                  <td className="table-cell min-w-[220px]">
                    <p className="font-semibold text-gray-900">{i.student?.firstName} {i.student?.lastName}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{getStudentIdentifier(i.student)}</p>
                  </td>
                  <td className="table-cell min-w-[180px] text-gray-700">{i.book?.title}</td>
                  <td className="table-cell whitespace-nowrap text-gray-600">{new Date(i.issueDate).toLocaleDateString('en-IN')}</td>
                  <td className="table-cell whitespace-nowrap text-gray-600">{new Date(i.dueDate).toLocaleDateString('en-IN')}</td>
                  <td className="table-cell text-center"><StatusBadge status={i.status} /></td>
                  <td className="table-cell text-center">{i.fine > 0 ? <span className="font-semibold text-red-600">?{i.fine}</span> : '?'}</td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end whitespace-nowrap">
                      {i.status === 'issued' ? (
                        <button onClick={() => returnBook(i._id)} className="text-sm font-medium text-green-600 hover:underline">Return</button>
                      ) : (
                        <span className="text-sm text-gray-300">?</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            {issues.length === 0 && <EmptyState message="No issue records found" icon={<FiPackage />} />}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={closeBookModal} title={editingBookId ? 'Edit Book' : 'Add Book'}>
        <form onSubmit={addBook} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className="label">Title *</label><input className="input" value={bookForm.title} onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))} required /></div>
            <div><label className="label">Author *</label><input className="input" value={bookForm.author} onChange={e => setBookForm(f => ({ ...f, author: e.target.value }))} required /></div>
            <div><label className="label">ISBN</label><input className="input" value={bookForm.isbn} onChange={e => setBookForm(f => ({ ...f, isbn: e.target.value }))} /></div>
            <div><label className="label">Category</label><input className="input" value={bookForm.category} onChange={e => setBookForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div><label className="label">Publisher</label><input className="input" value={bookForm.publisher} onChange={e => setBookForm(f => ({ ...f, publisher: e.target.value }))} /></div>
            <div><label className="label">Copies</label><input type="number" className="input" min="1" value={bookForm.totalCopies} onChange={e => setBookForm(f => ({ ...f, totalCopies: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={closeBookModal} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingBookId ? 'Save Changes' : 'Add'}</button></div>
        </form>
      </Modal>

      <Modal open={showIssue} onClose={() => { setShowIssue(false); setIssueForm(initialIssueForm); }} title="Issue Book">
        <form onSubmit={issueBook} className="space-y-3">
          <div><label className="label">Student *</label>
            <SearchableSelect
              value={issueForm.studentId}
              onChange={studentId => setIssueForm(f => ({ ...f, studentId }))}
              placeholder="Select Student"
              searchPlaceholder="Search students..."
              options={[toSelectOption('', 'Select Student', 'select student'), ...studentOptions]}
              required
            />
          </div>
          <div><label className="label">Book *</label>
            <SearchableSelect
              value={issueForm.bookId}
              onChange={bookId => setIssueForm(f => ({ ...f, bookId }))}
              placeholder="Select Book"
              searchPlaceholder="Search books..."
              options={availableBookOptions}
              required
            />
          </div>
          <div><label className="label">Due Date *</label><input type="date" className="input" value={issueForm.dueDate} onChange={e => setIssueForm(f => ({ ...f, dueDate: e.target.value }))} required /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => { setShowIssue(false); setIssueForm(initialIssueForm); }} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Issue</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ??? SHOP ─────────────────────────────────────────────────────────────────────
export function ShopAdmin() {
  const initialItemForm = { name: '', price: '', stock: '', unit: '', type: 'shop', isAvailable: true };
  const [items, setItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [tab, setTab] = useState('items');
  const [shopType, setShopType] = useState('shop');
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemForm, setItemForm] = useState(initialItemForm);
  const [editingItemId, setEditingItemId] = useState('');

  const fetchShopData = () => {
    api.get(`/shop/items?type=${shopType}`).then(r => setItems(r.data.items));
    api.get(`/shop/sales?type=${shopType}`).then(r => setSales(r.data.sales));
  };

  useEffect(() => {
    fetchShopData();
  }, [shopType]);

  const editItem = item => {
    setEditingItemId(item._id);
    setItemForm({
      name: item.name || '',
      price: item.price || '',
      stock: item.stock || '',
      unit: item.unit || '',
      type: item.type || shopType,
      isAvailable: item.isAvailable !== false,
    });
    setShowItemModal(true);
  };

  const saveItem = async e => {
    e.preventDefault();
    try {
      await api.put(`/shop/items/${editingItemId}`, {
        ...itemForm,
        type: shopType,
        price: Number(itemForm.price) || 0,
        stock: Number(itemForm.stock) || 0,
      });
      fetchShopData();
      setShowItemModal(false);
      setEditingItemId('');
      setItemForm(initialItemForm);
      toast.success('Item updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update item');
    }
  };

  const markItemUnavailable = async id => {
    try {
      await api.delete(`/shop/items/${id}`);
      fetchShopData();
      toast.success('Item marked unavailable');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update item');
    }
  };

  const closeItemModal = () => {
    setShowItemModal(false);
    setEditingItemId('');
    setItemForm(initialItemForm);
  };

  const handleSaleReceiptDownload = async billNo => {
    try {
      await downloadSaleReceipt(billNo);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download receipt');
    }
  };

  return (
    <div>
      <PageHeader title="Shop & Canteen" />
      <div className="flex gap-2 mb-4">
        {['shop', 'canteen'].map(t => <button key={t} onClick={() => setShopType(t)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${shopType === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{t}</button>)}
      </div>
      <div className="flex gap-2 mb-4">
        {['items', 'sales'].map(t => <button key={t} onClick={() => setTab(t)}
          className={`px-3 py-1 rounded text-sm ${tab === t ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>{t}</button>)}
      </div>
      <div className="card">
        {tab === 'items' ? (
          <Table headers={['Name', 'Price', 'Stock', 'Available', 'Actions']}>
            {items.map(i => <tr key={i._id} className="hover:bg-gray-50">
              <td className="table-cell font-medium">{i.name}</td>
              <td className="table-cell">₹{i.price}</td>
              <td className="table-cell">{i.stock} {i.unit}</td>
	              <td className="table-cell"><span className={i.isAvailable ? 'badge-green' : 'badge-red'}>{i.isAvailable ? 'Yes' : 'No'}</span></td>
	              <td className="table-cell">
	                <div className="flex gap-3 text-sm">
	                  <button type="button" onClick={() => editItem(i)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-500 bg-white text-primary-600 transition hover:bg-primary-600 hover:text-white" aria-label={`Edit ${i.name}`} title="Edit item"><FiEdit3 className="text-sm" /></button>
	                  <button type="button" onClick={() => markItemUnavailable(i._id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500 bg-white text-red-500 transition hover:bg-red-500 hover:text-white" aria-label={`Mark ${i.name} unavailable`} title="Mark unavailable"><FiX className="text-sm" /></button>
	                </div>
	              </td>
            </tr>)}
          </Table>
        ) : (
          <Table headers={['Bill No', 'Student', 'Date', 'Amount', 'Mode', 'Status', 'Receipt']}>
            {sales.map(s => <tr key={s._id} className="hover:bg-gray-50">
              <td className="table-cell font-mono text-xs">{s.billNo}</td>
              <td className="table-cell">{s.student?.firstName} {s.student?.lastName}</td>
              <td className="table-cell">{new Date(s.date).toLocaleDateString('en-IN')}</td>
              <td className="table-cell font-medium">₹{s.totalAmount}</td>
              <td className="table-cell capitalize">{s.paymentMode}</td>
              <td className="table-cell"><StatusBadge status={s.status} /></td>
              <td className="table-cell">
                <button
                  type="button"
                  onClick={() => handleSaleReceiptDownload(s.billNo)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-500 bg-white text-primary-600 transition hover:bg-primary-600 hover:text-white"
                  aria-label={`Download receipt ${s.billNo}`}
                  title="Download receipt"
                >
                  <FiDownload className="text-sm" />
                </button>
              </td>
            </tr>)}
          </Table>
        )}
      </div>
      <Modal open={showItemModal} onClose={closeItemModal} title="Edit Item">
        <form onSubmit={saveItem} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className="label">Name *</label><input className="input" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div><label className="label">Unit</label><input className="input" value={itemForm.unit} onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))} /></div>
            <div><label className="label">Price *</label><input type="number" className="input" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} required /></div>
            <div><label className="label">Stock *</label><input type="number" className="input" value={itemForm.stock} onChange={e => setItemForm(f => ({ ...f, stock: e.target.value }))} required /></div>
          </div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={closeItemModal} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Save Changes</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ─── STAFF ────────────────────────────────────────────────────────────────────
export function StaffManagement() {
  const { user } = useAuth();
  const { roleDefinitions } = useAppSettings();
  const shopCanteenAdminRole = 'shop_canteen_operator_admin';
  const normalizeStaffRole = role => role === 'shop_operator_admin' ? shopCanteenAdminRole : role;
  const getStaffRoleLabel = role => {
    const normalizedRole = normalizeStaffRole(role);
    const labels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      class_teacher: 'Class Teacher',
      hostel_warden: 'Hostel Warden',
      shop_operator: 'Shop Operator',
      canteen_operator: 'Canteen Operator',
      shop_canteen_operator_admin: 'Shop-Canteen Operator Admin',
      librarian: 'Librarian',
      accountant: 'Accountant',
      admission_staff: 'Admission Staff',
    };
    return labels[normalizedRole] || String(normalizedRole || '').replace(/_/g, ' ');
  };
  const initialStaffForm = { name: '', phone: '', email: '', password: '', role: 'class_teacher', department: '' };
  const [staff, setStaff] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(initialStaffForm);
  const [editingStaffId, setEditingStaffId] = useState('');
  const [staffFilters, setStaffFilters] = useState({
    search: '',
    role: '',
    status: '',
    sort: 'name:asc',
  });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const { sortBy, sortOrder } = parseStaffSortValue(staffFilters.sort);
      const response = await api.get('/staff', {
        params: {
          page,
          limit: pageSize,
          search: staffFilters.search || undefined,
          role: staffFilters.role || undefined,
          status: staffFilters.status || undefined,
          sortBy,
          sortOrder,
        },
      });
      setStaff(response.data.staff || []);
      setTotal(response.data.total || 0);
      setPages(response.data.pages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, staffFilters]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);
  useEffect(() => {
    api.get('/courses').then(r => setCourses(r.data.courses || []));
  }, []);
  useEffect(() => {
    if (page > pages && pages > 0) {
      setPage(pages);
    }
  }, [page, pages]);

  const add = async e => {
    e.preventDefault();
    try {
      const phone = sanitizePhoneField(form.phone);
      if (!isValidIndianPhone(phone)) {
        toast.error('Phone number must be a valid 10-digit Indian mobile number');
        return;
      }

      const payload = {
        name: form.name.trim(),
        phone,
        email: form.email.trim(),
        role: form.role,
        department: form.department.trim(),
      };
      if (!editingStaffId || form.password.trim()) {
        payload.password = form.password;
      }

      if (editingStaffId) {
        await api.put(`/staff/${editingStaffId}`, payload);
      } else {
        await api.post('/auth/register', payload);
      }
      toast.success(editingStaffId ? 'Staff updated' : 'Staff added');
      setShow(false);
      setEditingStaffId('');
      setForm(initialStaffForm);
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save staff');
    }
  };

  const editStaff = member => {
    setEditingStaffId(member._id);
    setForm({
      name: member.name || '',
      phone: member.phone || '',
      email: member.email || '',
      password: '',
      role: normalizeStaffRole(member.role || 'class_teacher'),
      department: member.department || '',
    });
    setShow(true);
  };

  const toggleStaffStatus = async member => {
    try {
      await api.put(`/auth/users/${member._id}/toggle`);
      fetchStaff();
      toast.success(`Staff ${member.isActive ? 'deactivated' : 'activated'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update staff status');
    }
  };

  const deleteStaff = async member => {
    if (String(member._id) === String(user?._id)) {
      toast.error('You cannot delete your own account');
      return;
    }
    if (!window.confirm(`Delete ${member.name} permanently?`)) return;

    try {
      await api.delete(`/staff/${member._id}`);
      fetchStaff();
      toast.success('Staff deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete staff');
    }
  };

  const closeStaffModal = () => {
    setShow(false);
    setEditingStaffId('');
    setForm(initialStaffForm);
  };

  const roleColors = {
    admin: 'badge-red',
    class_teacher: 'badge-blue',
    hostel_warden: 'badge-green',
    shop_operator: 'badge-yellow',
    canteen_operator: 'badge-yellow',
    shop_canteen_operator_admin: 'badge-blue',
    shop_operator_admin: 'badge-blue',
    librarian: 'badge-purple',
    accountant: 'badge-green',
    admission_staff: 'badge-blue',
    super_admin: 'badge-red',
  };
  const roleLabels = {
    shop_operator: 'Shop Operator',
    canteen_operator: 'Canteen Operator',
    shop_canteen_operator_admin: 'Shop-Canteen Operator Admin',
    shop_operator_admin: 'Shop-Canteen Operator Admin',
  };
  const staffRoleOptions = useMemo(
    () => (roleDefinitions || [])
      .filter(role => !['student', 'parent'].includes(role.value))
      .filter(role => user?.role === 'super_admin' || role.value !== 'super_admin')
      .map(role =>
        toSelectOption(
          role.value === 'shop_operator_admin' ? shopCanteenAdminRole : role.value,
          roleLabels[role.value] || role.label || getStaffRoleLabel(role.value),
          `${role.value} ${role.label || ''}`.trim()
        )
      ),
    [roleDefinitions, user?.role]
  );

  return (
    <div>
      <PageHeader
        title="Staff Management"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportActions
              getExportConfig={() => ({
                fileName: 'staff-management',
                title: 'Staff Export',
                subtitle: 'Staff records across all configured roles and departments.',
                summary: [
                  { label: 'Rows in Current Page', value: staff.length },
                  { label: 'Total Matching Staff', value: total },
                  { label: 'Active', value: staff.filter(member => member.isActive).length },
                  { label: 'Inactive', value: staff.filter(member => !member.isActive).length },
                ],
                sections: [
                  {
                    title: 'Staff',
                    columns: [
                      { header: 'Name', value: member => member.name || '-' },
                      { header: 'Phone', value: member => member.phone || '-' },
                      { header: 'Email', value: member => member.email || '-' },
                      { header: 'Role', value: member => getStaffRoleLabel(member.role) || '-' },
                      { header: 'Department', value: member => member.department || '-' },
                      { header: 'Status', value: member => member.isActive ? 'Active' : 'Inactive' },
                    ],
                    rows: staff,
                  },
                ],
              })}
              disabled={loading || staff.length === 0}
            />
            <button onClick={() => { setEditingStaffId(''); setForm(initialStaffForm); setShow(true); }} className="btn-primary">+ Add Staff</button>
          </div>
        }
      />
      <div className="card">
        <ListControls
          searchValue={staffFilters.search}
          onSearchChange={search => {
            setStaffFilters(current => ({ ...current, search }));
            setPage(1);
          }}
          searchPlaceholder="Search name, phone, email, department..."
          sortValue={staffFilters.sort}
          onSortChange={sort => {
            setStaffFilters(current => ({ ...current, sort }));
            setPage(1);
          }}
          sortOptions={staffSortOptions}
          pageSize={pageSize}
          onPageSizeChange={value => {
            setPageSize(value);
            setPage(1);
          }}
          resultCount={total}
          extraFilters={
            <div className="flex flex-wrap gap-3">
              <SearchableSelect
                className="w-full sm:w-48"
                value={staffFilters.role}
                onChange={role => {
                  setStaffFilters(current => ({ ...current, role }));
                  setPage(1);
                }}
                placeholder="All Roles"
                searchPlaceholder="Search roles..."
                options={[
                  toSelectOption('', 'All Roles', 'all roles'),
                  ...staffRoleOptions,
                ]}
              />
              <SearchableSelect
                className="w-full sm:w-40"
                value={staffFilters.status}
                onChange={status => {
                  setStaffFilters(current => ({ ...current, status }));
                  setPage(1);
                }}
                placeholder="All Status"
                searchPlaceholder="Search statuses..."
                options={[
                  toSelectOption('', 'All Status', 'all status'),
                  toSelectOption('active', 'Active', 'active'),
                  toSelectOption('inactive', 'Inactive', 'inactive'),
                ]}
              />
            </div>
          }
        />

        {loading ? <PageSpinner /> : (
          <>
        <Table headers={['Name', 'Phone', 'Email', 'Role', 'Department', 'Status', 'Actions']}>
          {staff.map(s => <tr key={s._id} className="hover:bg-gray-50">
            <td className="table-cell font-medium">{s.name}</td>
            <td className="table-cell">{s.phone}</td>
            <td className="table-cell text-gray-500">{s.email || '–'}</td>
            <td className="table-cell">
              <span className={`${roleColors[normalizeStaffRole(s.role)] || 'badge-gray'} inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold normal-case tracking-normal`}>
                {getStaffRoleLabel(s.role)}
              </span>
            </td>
            <td className="table-cell">{s.department || '–'}</td>
            <td className="table-cell"><span className={s.isActive ? 'badge-green' : 'badge-red'}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
            <td className="table-cell">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => editStaff(s)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-500 bg-white text-primary-600 transition hover:bg-primary-600 hover:text-white"
                  aria-label={`Edit ${s.name}`}
                  title="Edit staff"
                >
                  <FiEdit3 className="text-sm" />
                </button>
                {normalizeStaffRole(s.role) !== 'super_admin' ? (
                  <button
                    type="button"
                    onClick={() => toggleStaffStatus(s)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                      s.isActive
                        ? 'border-red-500 bg-white text-red-500 hover:bg-red-500 hover:text-white'
                        : 'border-emerald-500 bg-white text-emerald-500 hover:bg-emerald-500 hover:text-white'
                    }`}
                    aria-label={`${s.isActive ? 'Deactivate' : 'Activate'} ${s.name}`}
                    title={`${s.isActive ? 'Deactivate' : 'Activate'} staff`}
                  >
                    {s.isActive ? <FiX className="text-sm" /> : <FiCheckCircle className="text-sm" />}
                  </button>
                ) : null}
                {normalizeStaffRole(s.role) !== 'super_admin' && String(s._id) !== String(user?._id) ? (
                  <button
                    type="button"
                    onClick={() => deleteStaff(s)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500 bg-white text-red-500 transition hover:bg-red-500 hover:text-white"
                    aria-label={`Delete ${s.name}`}
                    title="Delete staff"
                  >
                    <FiTrash2 className="text-sm" />
                  </button>
                ) : null}
              </div>
            </td>
          </tr>)}
        </Table>
        {staff.length === 0 && <EmptyState message="No staff members" icon={<FiUsers />} />}
        <Pagination page={page} pages={pages || 1} onPage={setPage} />
          </>
        )}
      </div>
      <Modal open={show} onClose={closeStaffModal} title={editingStaffId ? 'Edit Staff Member' : 'Add Staff Member'}>
        <form onSubmit={add} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div><label className="label">Phone *</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: sanitizePhoneField(e.target.value) }))} inputMode="numeric" maxLength={10} required /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="label">{editingStaffId ? 'New Password' : 'Password *'}</label><input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editingStaffId} placeholder={editingStaffId ? 'Leave blank to keep current password' : ''} /></div>
            <div><label className="label">Role</label>
              <SearchableSelect
                value={form.role}
                onChange={role => setForm(f => ({ ...f, role }))}
                placeholder="Select role"
                searchPlaceholder="Search staff roles..."
                options={staffRoleOptions}
              />
            </div>
            <div>
              <label className="label">{form.role === 'class_teacher' ? 'Course' : 'Department'}</label>
              {form.role === 'class_teacher' ? (
                <SearchableSelect
                  value={form.department}
                  onChange={department => setForm(f => ({ ...f, department }))}
                  placeholder="Select course"
                  searchPlaceholder="Search courses..."
                  options={[
                    toSelectOption('', 'Select course', 'select course'),
                    ...courses.map(course =>
                      toSelectOption(course.name, course.name, `${course.name} ${course.code || ''} ${course.department || ''}`)
                    ),
                  ]}
                />
              ) : (
                <input className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              )}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={closeStaffModal} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingStaffId ? 'Save Changes' : 'Add Staff'}</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ─── COURSES ──────────────────────────────────────────────────────────────────
export function CoursesPage() {
  const initialCourseForm = { name: '', code: '', department: '', duration: 3, semesters: 6 };
  const sortCourses = useCallback(items => (
    [...items].sort((left, right) => {
      const activeDiff = Number(Boolean(right.isActive)) - Number(Boolean(left.isActive));
      if (activeDiff !== 0) return activeDiff;
      return String(left.name || '').localeCompare(String(right.name || ''));
    })
  ), []);
  const [courses, setCourses] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(initialCourseForm);
  const [editingCourseId, setEditingCourseId] = useState('');

  useEffect(() => {
    api.get('/courses', { params: { includeInactive: true } })
      .then(r => setCourses(sortCourses(r.data.courses || [])));
  }, [sortCourses]);

  const add = async e => {
    e.preventDefault();
    const payload = {
      ...form,
      duration: Number(form.duration) || 0,
      semesters: Number(form.semesters) || 0,
    };
    const r = editingCourseId
      ? await api.put(`/courses/${editingCourseId}`, payload)
      : await api.post('/courses', payload);
    setCourses(current => sortCourses(
      editingCourseId
        ? current.map(course => course._id === editingCourseId ? r.data.course : course)
        : [r.data.course, ...current]
    ));
    setShow(false);
    setEditingCourseId('');
    setForm(initialCourseForm);
    toast.success(editingCourseId ? 'Course updated' : 'Course added');
  };

  const editCourse = course => {
    setEditingCourseId(course._id);
    setForm({
      name: course.name || '',
      code: course.code || '',
      department: course.department || '',
      duration: course.duration || 0,
      semesters: course.semesters || 0,
    });
    setShow(true);
  };

  const toggleCourseStatus = async course => {
    try {
      const response = await api.put(`/courses/${course._id}/toggle`);
      setCourses(current => sortCourses(
        current.map(item => item._id === course._id ? response.data.course : item)
      ));
      toast.success(response.data?.message || `Course ${course.isActive ? 'deactivated' : 'activated'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update course status');
    }
  };

  const closeCourseModal = () => {
    setShow(false);
    setEditingCourseId('');
    setForm(initialCourseForm);
  };

  return (
    <div>
      <PageHeader
        title="Courses"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportActions
              getExportConfig={() => ({
                fileName: 'courses',
                title: 'Courses Export',
                subtitle: 'Available course definitions with department and duration details.',
                summary: [
                  { label: 'Courses', value: courses.length },
                  { label: 'Departments', value: [...new Set(courses.map(course => course.department).filter(Boolean))].length },
                ],
                sections: [
                  {
                    title: 'Courses',
                    columns: [
                      { header: 'Name', value: course => course.name || '-' },
                      { header: 'Code', value: course => course.code || '-' },
                      { header: 'Department', value: course => course.department || '-' },
                      { header: 'Status', value: course => course.isActive ? 'Active' : 'Inactive' },
                      { header: 'Duration (Years)', value: course => course.duration || 0, align: 'right' },
                      { header: 'Semesters', value: course => course.semesters || 0, align: 'right' },
                    ],
                    rows: courses,
                  },
                ],
              })}
              disabled={courses.length === 0}
            />
            <button onClick={() => { setEditingCourseId(''); setForm(initialCourseForm); setShow(true); }} className="btn-primary">+ Add Course</button>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses.map(c => (
          <div
            key={c._id}
            className={`card transition ${
              c.isActive ? 'border border-gray-100' : 'border border-red-100 bg-red-50/40'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-800">{c.name}</h3>
                <p className="text-sm text-gray-500">{c.department || 'No department assigned'}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="badge-blue">{c.code}</span>
                <span className={c.isActive ? 'badge-green' : 'badge-red'}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => editCourse(c)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary-500 bg-white text-primary-600 transition hover:bg-primary-600 hover:text-white"
                aria-label={`Edit ${c.name}`}
                title="Edit course"
              >
                <FiEdit3 className="text-sm" />
              </button>
              <button
                type="button"
                onClick={() => toggleCourseStatus(c)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                  c.isActive
                    ? 'border-red-500 bg-white text-red-500 hover:bg-red-500 hover:text-white'
                    : 'border-emerald-500 bg-white text-emerald-500 hover:bg-emerald-500 hover:text-white'
                }`}
                aria-label={`${c.isActive ? 'Deactivate' : 'Activate'} ${c.name}`}
                title={`${c.isActive ? 'Deactivate' : 'Activate'} course`}
              >
                {c.isActive ? <FiX className="text-sm" /> : <FiCheckCircle className="text-sm" />}
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-1">{c.duration} years • {c.semesters} semesters</p>
          </div>
        ))}
        {courses.length === 0 && <EmptyState message="No courses yet" icon={<FiTarget />} />}
      </div>
      <Modal open={show} onClose={closeCourseModal} title={editingCourseId ? 'Edit Course' : 'Add Course'}>
        <form onSubmit={add} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div><label className="label">Code *</label><input className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required /></div>
            <div><label className="label">Department</label><input className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
            <div><label className="label">Duration (yrs)</label><input type="number" className="input" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} /></div>
            <div><label className="label">Semesters</label><input type="number" className="input" value={form.semesters} onChange={e => setForm(f => ({ ...f, semesters: e.target.value }))} /></div>
          </div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={closeCourseModal} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingCourseId ? 'Save Changes' : 'Add'}</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────
export function ReportsPage() {
  const [feesReport, setFeesReport] = useState(null);
  const [payReport, setPayReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/reports/fees'), api.get('/reports/payments')])
      .then(([f, p]) => { setFeesReport(f.data); setPayReport(p.data); }).finally(() => setLoading(false));
  }, []);

  const fmt = n => '₹' + (n || 0).toLocaleString('en-IN');

  if (loading) return <PageSpinner />;

  return (
    <div>
      <PageHeader title="Reports & Analytics" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="section-title">Fees Summary</h3>
          {feesReport && (
            <div className="space-y-3">
              {[['Total Billed', feesReport.summary?.totalBilled, 'text-blue-700'], ['Collected', feesReport.summary?.totalCollected, 'text-green-700'], ['Pending Dues', feesReport.summary?.totalDue, 'text-red-700']].map(([label, val, cls]) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600">{label}</span>
                  <span className={`text-base font-bold ${cls}`}>{fmt(val)}</span>
                </div>
              ))}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {['paid', 'partial', 'pending', 'overdue'].map(s => (
                  <div key={s} className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-lg font-bold text-gray-800">{feesReport.summary?.[s] || 0}</p>
                    <p className="text-xs text-gray-500 capitalize">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="section-title">Payment Summary</h3>
          {payReport && (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Total Collected</span>
                <span className="text-base font-bold text-green-700">{fmt(payReport.totalAmount)}</span>
              </div>
              <h4 className="text-sm font-semibold text-gray-600 mt-3">By Payment Mode</h4>
              {Object.entries(payReport.byMode || {}).map(([mode, amt]) => (
                <div key={mode} className="flex justify-between items-center py-1.5">
                  <span className="text-sm text-gray-500 uppercase">{mode}</span>
                  <span className="text-sm font-medium">{fmt(amt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
