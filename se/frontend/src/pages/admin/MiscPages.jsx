import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiBook, FiRotateCcw } from 'react-icons/fi';
import api from '../../api/axios.js';
import useAcademicYear from '../../hooks/useAcademicYear.js';
import useListParams from '../../hooks/useListParams.js';
import useTeacherScope from '../../hooks/useTeacherScope.js';
import {
  PageHeader,
  DataTable,
  Modal,
  SearchableSelect,
  SearchInput,
  FilterSelect,
  Pagination,
} from '../../components/common/index.jsx';
import { formatIndianDate, getIndianDateInputValue } from '../../utils/dateTime.js';

export function LibraryPage() {
  const [books, setBooks] = useState([]);
  const [bookPages, setBookPages] = useState(1);
  const [issues, setIssues] = useState([]);
  const [issuePages, setIssuePages] = useState(1);
  const [tab, setTab] = useState('books');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [issueModal, setIssueModal] = useState(false);
  const [form, setForm] = useState({ title: '', author: '', isbn: '', publisher: '', category: '', totalCopies: 1, accessionNo: '' });
  const [issueForm, setIssueForm] = useState({ bookId: '', studentId: '', dueDate: '' });
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const {
    page: bookPage,
    setPage: setBookPage,
    search: bookSearch,
    setSearch: setBookSearch,
    sortBy: bookSortBy,
    sortOrder: bookSortOrder,
    setSort: setBookSort,
    params: bookParams,
  } = useListParams({ initialLimit: 10, initialSortBy: 'title', initialSortOrder: 'asc' });
  const {
    page: issuePage,
    setPage: setIssuePage,
    search: issueSearch,
    setSearch: setIssueSearch,
    sortBy: issueSortBy,
    sortOrder: issueSortOrder,
    setSort: setIssueSort,
    params: issueParams,
  } = useListParams({ initialLimit: 10, initialSortBy: 'issueDate', initialSortOrder: 'desc' });

  const loadBooks = useCallback(() => {
    setLoading(true);
    api.get('/library/books', { params: bookParams })
      .then(response => {
        setBooks(response.data.data);
        setBookPages(response.data.pages);
      })
      .catch(() => toast.error('Failed to load books.'))
      .finally(() => setLoading(false));
  }, [bookParams]);

  const loadIssues = useCallback(() => {
    setLoading(true);
    api.get('/library/issues', { params: { ...issueParams, status: 'issued' } })
      .then(response => {
        setIssues(response.data.data);
        setIssuePages(response.data.pages);
      })
      .catch(() => toast.error('Failed to load issued books.'))
      .finally(() => setLoading(false));
  }, [issueParams]);

  useEffect(() => {
    if (tab === 'books') loadBooks();
    else loadIssues();
  }, [tab, loadBooks, loadIssues]);

  useEffect(() => {
    api.get('/students', { params: { status: 'active', limit: 200, sortBy: 'name', sortOrder: 'asc' } })
      .then(response => setStudents(response.data.data))
      .catch(() => {});
  }, []);

  const handleAddBook = async () => {
    if (!form.title || !form.author) return toast.error('Title and author required.');
    setSaving(true);
    try {
      await api.post('/library/books', form);
      toast.success('Book added.');
      setModal(false);
      loadBooks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleIssue = async () => {
    if (!issueForm.bookId || !issueForm.studentId || !issueForm.dueDate) return toast.error('Book, student, and due date required.');
    setSaving(true);
    try {
      await api.post('/library/issue', { bookId: issueForm.bookId, studentId: issueForm.studentId, dueDate: issueForm.dueDate, borrowerType: 'student' });
      toast.success('Book issued.');
      setIssueModal(false);
      setIssueForm({ bookId: '', studentId: '', dueDate: '' });
      loadBooks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async issueId => {
    try {
      const response = await api.put(`/library/return/${issueId}`);
      toast.success(response.data.message);
      loadIssues();
    } catch {
      toast.error('Failed.');
    }
  };

  const studentOpts = students.map(student => ({ value: student._id, label: `${student.firstName} ${student.lastName} (${student.admissionNo})` }));
  const issueableBookOpts = books
    .filter(book => book.availableCopies > 0)
    .map(book => ({ value: book._id, label: `${book.title} - ${book.author}` }));

  const openIssueModal = book => {
    setIssueModal(true);
    setIssueForm({
      bookId: book?._id || '',
      studentId: '',
      dueDate: getIndianDateInputValue(new Date()),
    });
  };

  const selectedIssueBook = books.find(book => String(book._id) === String(issueForm.bookId));

  const bookCols = [
    { key: 'title', label: 'Title', sortable: true, sortKey: 'title', render: book => <div><p className="font-semibold">{book.title}</p><p className="text-xs text-text-secondary">{book.author}</p></div> },
    { key: 'isbn', label: 'ISBN', render: book => <span className="font-mono text-xs">{book.isbn || '—'}</span> },
    { key: 'cat', label: 'Category', sortable: true, sortKey: 'category', render: book => book.category || '—' },
    { key: 'avail', label: 'Available', sortable: true, sortKey: 'availableCopies', render: book => <span className={`font-bold ${book.availableCopies > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{book.availableCopies}/{book.totalCopies}</span> },
    { key: 'actions', label: 'Actions', render: book => book.availableCopies > 0 ? <button onClick={() => openIssueModal(book)} className="btn-primary btn-sm"><FiBook />Issue Book</button> : <span className="text-xs text-slate-400">Out of stock</span> },
  ];

  const issueCols = [
    { key: 'book', label: 'Book', render: issue => <div><p className="font-semibold">{issue.book?.title}</p><p className="text-xs text-text-secondary">{issue.book?.author}</p></div> },
    { key: 'student', label: 'Student', render: issue => issue.student ? `${issue.student.firstName} ${issue.student.lastName}` : '—' },
    { key: 'due', label: 'Due Date', sortable: true, sortKey: 'dueDate', render: issue => formatIndianDate(issue.dueDate) },
    { key: 'fine', label: 'Fine', render: issue => issue.fine > 0 ? <span className="font-bold text-red-600">Rs {issue.fine}</span> : '—' },
    { key: 'actions', label: '', render: issue => <button onClick={() => handleReturn(issue._id)} className="btn-success btn-sm"><FiRotateCcw />Return</button> },
  ];

  return (
    <div className="float-in">
      <PageHeader
        title="Library"
        subtitle="Books and issue management"
        actions={tab === 'books' && (
          <>
            <button onClick={() => openIssueModal()} className="btn-secondary"><FiBook />Issue Book</button>
            <button onClick={() => setModal(true)} className="btn-primary"><FiPlus />Add Book</button>
          </>
        )}
      />
      <div className="campus-panel mb-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            <button onClick={() => setTab('books')} className={`btn-sm ${tab === 'books' ? 'btn-primary' : 'btn-secondary'}`}>Books</button>
            <button onClick={() => setTab('issues')} className={`btn-sm ${tab === 'issues' ? 'btn-primary' : 'btn-secondary'}`}>Issued Books</button>
          </div>
          {tab === 'books' ? (
            <SearchInput className="w-full md:max-w-sm" value={bookSearch} onChange={setBookSearch} placeholder="Search books..." />
          ) : (
            <SearchInput className="w-full md:max-w-sm" value={issueSearch} onChange={setIssueSearch} placeholder="Search issued records..." />
          )}
        </div>
      </div>
      <div className="campus-panel overflow-hidden">
        <DataTable
          columns={tab === 'books' ? bookCols : issueCols}
          data={tab === 'books' ? books : issues}
          loading={loading}
          sortBy={tab === 'books' ? bookSortBy : issueSortBy}
          sortOrder={tab === 'books' ? bookSortOrder : issueSortOrder}
          onSort={tab === 'books' ? setBookSort : setIssueSort}
        />
        <div className="border-t border-border px-4 py-3">
          <Pagination page={tab === 'books' ? bookPage : issuePage} pages={tab === 'books' ? bookPages : issuePages} onPage={tab === 'books' ? setBookPage : setIssuePage} />
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Book" footer={<><button onClick={() => setModal(false)} className="btn-secondary btn-sm">Cancel</button><button onClick={handleAddBook} disabled={saving} className="btn-primary btn-sm">{saving ? 'Saving...' : 'Add Book'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          {[['Title *', 'title'], ['Author *', 'author'], ['ISBN', 'isbn'], ['Publisher', 'publisher'], ['Category', 'category'], ['Accession No', 'accessionNo']].map(([label, key]) => (
            <div key={key} className={`form-group ${key === 'title' || key === 'author' ? 'col-span-2' : ''}`}>
              <label className="label">{label}</label>
              <input className="input" value={form[key] || ''} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} />
            </div>
          ))}
          <div className="form-group"><label className="label">Total Copies</label><input type="number" className="input" min="1" value={form.totalCopies} onChange={event => setForm(current => ({ ...current, totalCopies: Number(event.target.value) }))} /></div>
        </div>
      </Modal>

      <Modal open={issueModal} onClose={() => setIssueModal(false)} title="Issue Book to Student" footer={<><button onClick={() => setIssueModal(false)} className="btn-secondary btn-sm">Cancel</button><button onClick={handleIssue} disabled={saving} className="btn-primary btn-sm">{saving ? 'Issuing...' : 'Issue Book'}</button></>}>
        <div className="space-y-4">
          <div className="form-group">
            <label className="label">Book *</label>
            <SearchableSelect options={issueableBookOpts} value={issueForm.bookId} onChange={value => setIssueForm(current => ({ ...current, bookId: value }))} placeholder="Search book..." />
            {selectedIssueBook && (
              <p className="mt-1 text-xs text-text-secondary">Available copies: {selectedIssueBook.availableCopies}/{selectedIssueBook.totalCopies}</p>
            )}
          </div>
          <div className="form-group"><label className="label">Student *</label><SearchableSelect options={studentOpts} value={issueForm.studentId} onChange={value => setIssueForm(current => ({ ...current, studentId: value }))} placeholder="Search student..." /></div>
          <div className="form-group"><label className="label">Due Date *</label><input type="date" className="input" value={issueForm.dueDate} onChange={event => setIssueForm(current => ({ ...current, dueDate: event.target.value }))} /></div>
        </div>
      </Modal>
    </div>
  );
}

export function CircularsPage() {
  const academicYear = useAcademicYear();
  const [circulars, setCirculars] = useState([]);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', type: 'circular', audiencePreset: 'students_parents', targetClassId: '' });
  const [saving, setSaving] = useState(false);
  const { isTeacherRole, teacherId, classTeacherOf } = useTeacherScope();
  const audiencePresets = [
    { value: 'students_parents', label: 'Students + Parents', audience: ['student', 'parent'] },
    { value: 'student', label: 'Students Only', audience: ['student'] },
    { value: 'parent', label: 'Parents Only', audience: ['parent'] },
    { value: 'teacher', label: 'Teachers Only', audience: ['teacher'] },
    { value: 'all', label: 'Everyone', audience: ['all'] },
  ];
  const selectedAudiencePreset = audiencePresets.find(option => option.value === form.audiencePreset) || audiencePresets[0];

  useEffect(() => {
    api.get('/classes', { params: { teacherId: isTeacherRole ? teacherId : '', academicYear } })
      .then(res => setClasses(res.data.data))
      .catch(() => {});
  }, [isTeacherRole, teacherId, academicYear]);

  useEffect(() => {
    if (isTeacherRole && classTeacherOf && !form.targetClassId) {
      setForm(f => ({ ...f, targetClassId: classTeacherOf }));
    }
  }, [isTeacherRole, classTeacherOf, form.targetClassId]);
  const list = useListParams({
    initialFilters: { type: '' },
    initialLimit: 10,
    initialSortBy: 'publishDate',
    initialSortOrder: 'desc',
  });

  const load = useCallback(() => {
    setLoading(true);
    api.get('/circulars', { params: list.params })
      .then(response => {
        setCirculars(response.data.data);
        setPages(response.data.pages);
      })
      .catch(() => toast.error('Failed to load circulars.'))
      .finally(() => setLoading(false));
  }, [list.params]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!form.title || !form.content) return toast.error('Title and content required.');
    setSaving(true);
    try {
      await api.post('/circulars', {
        title: form.title,
        content: form.content,
        type: form.type,
        audience: selectedAudiencePreset.audience,
        classRefs: form.targetClassId ? [form.targetClassId] : [],
      });
      toast.success('Circular published.');
      setModal(false);
      load();
    } catch {
      toast.error('Failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    try {
      await api.delete(`/circulars/${id}`);
      toast.success('Removed.');
      load();
    } catch {
      toast.error('Failed.');
    }
  };

  const TYPE_COLORS = { circular: 'badge-blue', notice: 'badge-yellow', event: 'badge-green', holiday: 'badge-red', exam: 'badge-purple' };
  const columns = [
    { key: 'title', label: 'Title', sortable: true, sortKey: 'title', render: item => <p className="font-semibold">{item.title}</p> },
    { key: 'type', label: 'Type', sortable: true, sortKey: 'type', render: item => <span className={TYPE_COLORS[item.type] || 'badge-gray'}>{item.type}</span> },
    { key: 'target', label: 'Published To', render: item => (
      <div>
        <p className="text-xs font-semibold">{item.audiencePreset || (item.audience?.length > 0 ? item.audience.join(' & ') : 'General')}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {item.classRefs?.length > 0 ? item.classRefs.map(cl => (
            <span key={cl._id} className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase">
              {cl.displayName || cl.grade}
            </span>
          )) : <span className="text-[10px] text-text-secondary italic">School Wide</span>}
        </div>
      </div>
    )},
    { key: 'date', label: 'Date', sortable: true, sortKey: 'publishDate', render: item => formatIndianDate(item.publishDate) },
    { key: 'actions', label: '', render: item => <button onClick={() => handleDelete(item._id)} className="btn-icon btn-sm text-red-400"><FiTrash2 /></button> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Circulars & Notices" 
        subtitle="Publish announcements to students, parents, and staff" 
        actions={
          <div className="flex flex-wrap items-center gap-3">
             <div className="w-56">
                <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search circulars..." className="!bg-white/10 !border-white/10 !text-white" />
             </div>
             <button onClick={() => setModal(true)} className="btn-primary !bg-white !text-slate-900 border-none btn-sm px-4">
               <FiPlus className="mr-2" /> New Circular
             </button>
          </div>
        } 
      />
      
      <div className="campus-panel mb-4 p-4">
        <FilterSelect value={list.filters.type} onChange={value => list.setFilter('type', value)} placeholder="All Types" options={['circular', 'notice', 'event', 'exam', 'holiday'].map(type => ({ value: type, label: type }))} />
      </div>

      <div className="campus-panel overflow-hidden">
        <DataTable columns={columns} data={circulars} loading={loading} sortBy={list.sortBy} sortOrder={list.sortOrder} onSort={list.setSort} />
        <div className="border-t border-border px-4 py-3">
          <Pagination page={list.page} pages={pages} onPage={list.setPage} />
        </div>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Publish Circular" size="lg" footer={<><button onClick={() => setModal(false)} className="btn-secondary btn-sm">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">{saving ? 'Publishing...' : 'Publish'}</button></>}>
        <div className="space-y-4">
          <div className="form-group"><label className="label">Title *</label><input className="input" value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} /></div>
          
          {isTeacherRole ? (
            <div className="rounded-xl bg-primary-50 p-4 border border-primary-100 mb-4">
              <p className="text-[11px] font-bold text-primary-700 uppercase tracking-widest mb-1">Target Audience</p>
              <p className="text-sm font-semibold text-primary-900">Students and Parents</p>
              <p className="text-xs text-primary-600 mt-1">Class-level circulars are automatically sent to both students and their parents.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="form-group"><label className="label">Type</label><select className="input" value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value }))}>{['circular', 'notice', 'event', 'exam', 'holiday'].map(type => <option key={type} value={type}>{type}</option>)}</select></div>
              <div className="form-group"><label className="label">Audience</label><select className="input" value={form.audiencePreset} onChange={event => setForm(current => ({ ...current, audiencePreset: event.target.value }))}>{audiencePresets.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><p className="mt-1 text-xs text-text-secondary">Class circulars should usually go to both students and parents.</p></div>
            </div>
          )}

          <div className="form-group">
            <label className="label">Target Class {isTeacherRole ? '*' : '(Optional)'}</label>
            <select className="input" value={form.targetClassId} onChange={e => setForm(f => ({ ...f, targetClassId: e.target.value }))}>
              {!isTeacherRole && <option value="">All Classes</option>}
              {classes.map(c => <option key={c._id} value={c._id}>{c.displayName || c.grade}</option>)}
            </select>
            {isTeacherRole && <p className="mt-1 text-xs text-slate-500">Only classes you are assigned to are listed above.</p>}
          </div>

          <div className="form-group"><label className="label">Content *</label><textarea className="input" rows="5" value={form.content} onChange={event => setForm(current => ({ ...current, content: event.target.value }))} /></div>
        </div>
      </Modal>
    </div>
  );
}

export function ExpensesPage() {
  const academicYear = useAcademicYear();
  const [expenses, setExpenses] = useState([]);
  const [pages, setPages] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'maintenance', amount: '', paymentMode: 'cash', date: getIndianDateInputValue(), description: '' });
  const [saving, setSaving] = useState(false);
  const list = useListParams({
    initialFilters: { category: '' },
    initialLimit: 10,
    initialSortBy: 'date',
    initialSortOrder: 'desc',
  });

  const load = useCallback(() => {
    setLoading(true);
    api.get('/expenses', { params: { ...list.params, academicYear } })
      .then(response => {
        setExpenses(response.data.data);
        setPages(response.data.pages);
        setTotalAmount(response.data.totalAmount || 0);
      })
      .catch(() => toast.error('Failed to load expenses.'))
      .finally(() => setLoading(false));
  }, [list.params, academicYear]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!form.title || !form.amount) return toast.error('Title and amount required.');
    setSaving(true);
    try {
      await api.post('/expenses', form);
      toast.success('Expense recorded.');
      setModal(false);
      load();
    } catch {
      toast.error('Failed.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'title', label: 'Title', sortable: true, sortKey: 'title', render: expense => <p className="font-semibold">{expense.title}</p> },
    { key: 'cat', label: 'Category', sortable: true, sortKey: 'category', render: expense => <span className="badge-blue">{expense.category}</span> },
    { key: 'amount', label: 'Amount', sortable: true, sortKey: 'amount', render: expense => <span className="font-bold text-red-600">Rs {(expense.amount || 0).toLocaleString('en-IN')}</span> },
    { key: 'mode', label: 'Mode', render: expense => expense.paymentMode },
    { key: 'date', label: 'Date', sortable: true, sortKey: 'date', render: expense => formatIndianDate(expense.date) },
    { key: 'by', label: 'By', render: expense => expense.recordedBy?.name || '—' },
  ];

  return (
    <div className="float-in">
      <PageHeader title="Expenses" subtitle={`Total: Rs ${totalAmount.toLocaleString('en-IN')}`} actions={<button onClick={() => setModal(true)} className="btn-primary"><FiPlus />Add Expense</button>} />
      <div className="campus-panel mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search expenses..." />
          <FilterSelect value={list.filters.category} onChange={value => list.setFilter('category', value)} placeholder="All Categories" options={['salary', 'maintenance', 'utilities', 'stationery', 'transport', 'events', 'miscellaneous'].map(category => ({ value: category, label: category }))} />
        </div>
      </div>
      <div className="campus-panel overflow-hidden">
        <DataTable columns={columns} data={expenses} loading={loading} sortBy={list.sortBy} sortOrder={list.sortOrder} onSort={list.setSort} />
        <div className="border-t border-border px-4 py-3">
          <Pagination page={list.page} pages={pages} onPage={list.setPage} />
        </div>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Record Expense" footer={<><button onClick={() => setModal(false)} className="btn-secondary btn-sm">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">{saving ? 'Saving...' : 'Record'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group col-span-2"><label className="label">Title *</label><input className="input" value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} /></div>
          <div className="form-group"><label className="label">Category</label><select className="input" value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))}>{['salary', 'maintenance', 'utilities', 'stationery', 'transport', 'events', 'miscellaneous'].map(category => <option key={category} value={category}>{category}</option>)}</select></div>
          <div className="form-group"><label className="label">Amount (Rs) *</label><input type="number" className="input" value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} /></div>
          <div className="form-group"><label className="label">Payment Mode</label><select className="input" value={form.paymentMode} onChange={event => setForm(current => ({ ...current, paymentMode: event.target.value }))}>{['cash', 'bank', 'cheque', 'online'].map(mode => <option key={mode} value={mode}>{mode}</option>)}</select></div>
          <div className="form-group"><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} /></div>
          <div className="form-group col-span-2"><label className="label">Description</label><textarea className="input" rows="2" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></div>
        </div>
      </Modal>
    </div>
  );
}
