import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { EmptyState, ExportActions, PageHeader, PageSpinner, StatCard, Table } from '../../components/common';
import { FiBook, FiCheckCircle, FiClock, FiTrendingUp } from '../../components/common/icons';

export default function LibraryDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState([]);
  const [issues, setIssues] = useState([]);
  const getStudentIdentifier = student => student?.rollNo || student?.admissionNo || student?.regNo || '—';

  useEffect(() => {
    Promise.all([
      api.get('/library/books'),
      api.get('/library/issues'),
    ])
      .then(([booksRes, issuesRes]) => {
        setBooks(booksRes.data.books || []);
        setIssues(issuesRes.data.issues || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  const totalBooks = books.reduce((sum, book) => sum + (book.totalCopies || 0), 0);
  const availableBooks = books.reduce((sum, book) => sum + (book.availableCopies || 0), 0);
  const issuedCount = issues.filter(issue => issue.status === 'issued').length;
  const overdueCount = issues.filter(issue =>
    issue.status === 'issued' && new Date(issue.dueDate) < new Date()
  ).length;
  const exportConfig = {
    fileName: 'library-dashboard',
    title: 'Library Dashboard Export',
    subtitle: 'Snapshot of library books, issues, and overdue activity.',
    summary: [
      { label: 'Total Copies', value: totalBooks },
      { label: 'Available Books', value: availableBooks },
      { label: 'Issued Books', value: issuedCount },
      { label: 'Overdue Issues', value: overdueCount },
      { label: 'Total Titles', value: books.length },
      { label: 'Issue Records', value: issues.length },
    ],
    sections: [
      {
        title: 'Recent Issues',
        columns: [
          { header: 'Student', value: issue => `${issue.student?.firstName || ''} ${issue.student?.lastName || ''}`.trim() || '-' },
          { header: 'Identifier', value: issue => getStudentIdentifier(issue.student) },
          { header: 'Book', value: issue => issue.book?.title || '-' },
          { header: 'Due Date', value: issue => new Date(issue.dueDate).toLocaleDateString('en-IN') },
          { header: 'Status', value: issue => issue.status || '-' },
        ],
        rows: issues,
      },
      {
        title: 'Books',
        columns: [
          { header: 'Title', value: book => book.title || '-' },
          { header: 'Author', value: book => book.author || '-' },
          { header: 'Category', value: book => book.category || '-' },
          { header: 'Available', value: book => book.availableCopies || 0, align: 'right' },
          { header: 'Total Copies', value: book => book.totalCopies || 0, align: 'right' },
        ],
        rows: books,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library Dashboard"
        subtitle="Overview of books, issues, and returns"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportActions getExportConfig={() => exportConfig} disabled={loading || (!books.length && !issues.length)} />
            <button
              onClick={() => navigate('/admin/library')}
              className="btn-primary"
            >
              Open Library
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<FiBook />} label="Total Copies" value={totalBooks} color="blue" />
        <StatCard icon={<FiCheckCircle />} label="Available Books" value={availableBooks} color="green" />
        <StatCard icon={<FiTrendingUp />} label="Issued Books" value={issuedCount} color="purple" />
        <StatCard icon={<FiClock />} label="Overdue Issues" value={overdueCount} color="yellow" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="section-title mb-0">Recent Issues</h2>
            <button
              onClick={() => navigate('/admin/library')}
              className="text-sm text-primary-600 hover:underline"
            >
              Manage
            </button>
          </div>
          {issues.length === 0 ? (
            <EmptyState message="No issue activity yet" icon={<FiBook />} />
          ) : (
            <Table headers={['Student', 'Book', 'Due Date', 'Status']}>
              {issues.slice(0, 5).map(issue => (
                <tr key={issue._id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <p className="font-medium">
                      {issue.student?.firstName} {issue.student?.lastName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {getStudentIdentifier(issue.student)}
                    </p>
                  </td>
                  <td className="table-cell">{issue.book?.title || '-'}</td>
                  <td className="table-cell text-sm text-gray-500">
                    {new Date(issue.dueDate).toLocaleDateString('en-IN')}
                  </td>
                  <td className="table-cell">
                    <span className={issue.status === 'issued' ? 'badge-yellow' : 'badge-blue'}>
                      {issue.status}
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="section-title mb-0">Popular Books</h2>
            <button
              onClick={() => navigate('/admin/library')}
              className="text-sm text-primary-600 hover:underline"
            >
              View all
            </button>
          </div>
          {books.length === 0 ? (
            <EmptyState message="No books found" icon={<FiBook />} />
          ) : (
            <Table headers={['Title', 'Author', 'Category', 'Available']}>
              {books.slice(0, 5).map(book => (
                <tr key={book._id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{book.title}</td>
                  <td className="table-cell">{book.author}</td>
                  <td className="table-cell">{book.category || '-'}</td>
                  <td className="table-cell">
                    <span className={book.availableCopies > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {book.availableCopies}
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
