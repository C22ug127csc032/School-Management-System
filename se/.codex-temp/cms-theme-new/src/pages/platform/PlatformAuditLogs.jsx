import React, { useEffect, useState } from 'react';
import api from '../../api/axios';

const PAGE_SIZE = 20;

export default function PlatformAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, pageSize: PAGE_SIZE });
  const [filters, setFilters] = useState({
    institutionId: 'all',
    search: '',
    sort: 'desc',
  });
  const [loading, setLoading] = useState(true);

  const loadLogs = async (page = 1, nextFilters = filters) => {
    setLoading(true);
    try {
      const response = await api.get('/platform/audit-logs', {
        params: {
          page,
          pageSize: PAGE_SIZE,
          institutionId: nextFilters.institutionId,
          search: nextFilters.search.trim(),
          sort: nextFilters.sort,
        },
      });
      setLogs(response.data?.logs || []);
      setInstitutions(response.data?.institutions || []);
      setPagination(response.data?.pagination || { page: 1, totalPages: 1, total: 0, pageSize: PAGE_SIZE });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1, filters);
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(current => ({ ...current, [key]: value }));
  };

  const applyFilters = () => {
    loadLogs(1, filters);
  };

  const handlePageChange = page => {
    if (page < 1 || page > pagination.totalPages) return;
    loadLogs(page, filters);
  };

  return (
    <div className="space-y-4">
      <div className="border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">Trial Institution Activity</p>
            <p className="mt-1 text-xs text-text-secondary">Monitor only trial institutions with readable login, logout, and session activity.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:min-w-[760px]">
            <div>
              <label className="label">Institution</label>
              <select className="input" value={filters.institutionId} onChange={event => handleFilterChange('institutionId', event.target.value)}>
                <option value="all">All Trial Institutions</option>
                {institutions.map(item => (
                  <option key={item._id} value={item._id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Search</label>
              <input className="input" value={filters.search} onChange={event => handleFilterChange('search', event.target.value)} placeholder="Search activity" />
            </div>
            <div>
              <label className="label">Sort</label>
              <select className="input" value={filters.sort} onChange={event => handleFilterChange('sort', event.target.value)}>
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={applyFilters} className="btn-primary px-4 py-2 text-sm">
            Apply Filters
          </button>
          <span className="border border-border bg-slate-50 px-3 py-2 text-xs text-text-secondary">
            {pagination.total} total records
          </span>
        </div>
      </div>

      <div className="overflow-hidden border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Institution</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Session</th>
                <th className="px-4 py-3 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-text-secondary" colSpan={6}>Loading audit logs...</td>
                </tr>
              ) : logs.length ? logs.map(log => (
                <tr key={log._id} className="border-t border-border align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-text-secondary">{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{log.institutionName || 'Platform'}</p>
                    <p className="text-xs text-text-secondary">{log.institutionPortalKey || log.institutionSlug || '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{log.actorName || 'System'}</p>
                    <p className="text-xs text-text-secondary">{log.actorRole || '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="border border-border bg-slate-50 px-2.5 py-1 text-xs font-medium text-text-primary">
                      {log.category || 'General'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">
                      {log.metadata?.sessionDurationMinutes
                        ? `${Math.floor(log.metadata.sessionDurationMinutes / 60)}h ${log.metadata.sessionDurationMinutes % 60}m`
                        : '-'}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {log.metadata?.sessionStartedAt
                        ? `Started ${new Date(log.metadata.sessionStartedAt).toLocaleTimeString('en-IN')}`
                        : 'No session data'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{log.description || log.actionLabel || log.action}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-text-secondary">{log.actionLabel || log.action}</p>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-4 text-text-secondary" colSpan={6}>No trial institution activity is available for the selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-secondary">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-60"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
