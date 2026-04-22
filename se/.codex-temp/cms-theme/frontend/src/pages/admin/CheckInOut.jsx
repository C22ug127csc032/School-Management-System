import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import {
  EmptyState,
  ExportActions,
  ListControls,
  PageHeader,
  PageSpinner,
  Pagination,
  SearchableSelect,
  Table,
} from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import toast from 'react-hot-toast';
import { FiCheck, FiClock, FiHome, FiUsers } from '../../components/common/icons';
import { getFirstActiveValue, toSelectOptions } from '../../utils/appSettings';

const formatMovementType = value =>
  value === 'check_in' ? 'Check In' : value === 'check_out' ? 'Check Out' : value || '-';

const formatLocationLabel = value =>
  String(value || '')
    .trim()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

const parseSortValue = value => {
  const [sortBy = 'latest', sortOrder = 'desc'] = String(value || 'latest:desc').split(':');
  return { sortBy, sortOrder };
};

const roleLockedLocationMap = {
  class_teacher: 'campus',
  hostel_warden: 'hostel',
};

const stateToneClasses = {
  ready: 'border-primary-100 bg-primary-50 text-primary-700',
  checked_in: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  checked_out: 'border-amber-100 bg-amber-50 text-amber-700',
};

export default function CheckInOut() {
  const { user } = useAuth();
  const { getMasterOptions } = useAppSettings();
  const lockedLocation = roleLockedLocationMap[user?.role] || '';
  const isLockedLocation = Boolean(lockedLocation);

  const movementTypeOptions = useMemo(
    () => toSelectOptions(getMasterOptions('checkin_types', [
      { value: 'check_in', label: 'Check In' },
      { value: 'check_out', label: 'Check Out' },
    ])),
    [getMasterOptions]
  );
  const movementLocationOptions = useMemo(
    () => toSelectOptions(getMasterOptions('checkin_locations', [
      { value: 'campus', label: 'Campus' },
      { value: 'hostel', label: 'Hostel' },
    ])),
    [getMasterOptions]
  );
  const availableLocationOptions = useMemo(
    () => {
      const filteredOptions = movementLocationOptions.filter(
        option => !lockedLocation || option.value === lockedLocation
      );
      if (filteredOptions.length > 0) return filteredOptions;
      if (!lockedLocation) return filteredOptions;
      return [{ value: lockedLocation, label: formatLocationLabel(lockedLocation), searchText: lockedLocation }];
    },
    [lockedLocation, movementLocationOptions]
  );

  const [courses, setCourses] = useState([]);
  const [bulkStudents, setBulkStudents] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(true);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkFilters, setBulkFilters] = useState({
    search: '',
    className: '',
    sort: 'name:asc',
  });
  const [bulkPage, setBulkPage] = useState(1);
  const [bulkPageSize, setBulkPageSize] = useState(20);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkPages, setBulkPages] = useState(1);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkForm, setBulkForm] = useState({
    type: getFirstActiveValue(movementTypeOptions, 'check_in'),
    location: lockedLocation || getFirstActiveValue(availableLocationOptions, 'campus'),
    remarks: '',
  });

  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordFilters, setRecordFilters] = useState({
    search: '',
    startDate: '',
    endDate: '',
    type: '',
    location: lockedLocation || '',
    department: '',
    sort: 'latest:desc',
  });
  const [recordPage, setRecordPage] = useState(1);
  const [recordPageSize, setRecordPageSize] = useState(20);
  const [recordTotal, setRecordTotal] = useState(0);
  const [recordPages, setRecordPages] = useState(1);

  useEffect(() => {
    api.get('/courses')
      .then(response => setCourses(response.data.courses || []))
      .catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    const nextLocation = lockedLocation || getFirstActiveValue(availableLocationOptions, 'campus');

    setBulkForm(current => {
      const resolvedLocation = lockedLocation || current.location || nextLocation;
      return current.location === resolvedLocation ? current : { ...current, location: resolvedLocation };
    });
    setRecordFilters(current => {
      const resolvedLocation = lockedLocation || current.location;
      return current.location === resolvedLocation ? current : { ...current, location: resolvedLocation };
    });
  }, [availableLocationOptions, lockedLocation]);

  const fetchEligibleStudents = useCallback(async () => {
    setBulkLoading(true);
    try {
      const { sortBy, sortOrder } = parseSortValue(bulkFilters.sort);
      const response = await api.get('/checkin/students', {
        params: {
          page: bulkPage,
          limit: bulkPageSize,
          search: bulkFilters.search || undefined,
          className: bulkFilters.className || undefined,
          sortBy,
          sortOrder,
        },
      });
      setBulkStudents(response.data.students || []);
      setBulkTotal(response.data.total || 0);
      setBulkPages(response.data.pages || 1);
      setAvailableClasses(response.data.availableClasses || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load students for movement');
    } finally {
      setBulkLoading(false);
    }
  }, [bulkFilters.className, bulkFilters.search, bulkFilters.sort, bulkPage, bulkPageSize]);

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const { sortBy, sortOrder } = parseSortValue(recordFilters.sort);
      const response = await api.get('/checkin', {
        params: {
          page: recordPage,
          limit: recordPageSize,
          search: recordFilters.search || undefined,
          startDate: recordFilters.startDate || undefined,
          endDate: recordFilters.endDate || undefined,
          type: recordFilters.type || undefined,
          location: recordFilters.location || undefined,
          department: recordFilters.department || undefined,
          sortBy,
          sortOrder,
        },
      });
      setRecords(response.data.records || []);
      setRecordTotal(response.data.total || 0);
      setRecordPages(response.data.pages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load movement records');
    } finally {
      setRecordsLoading(false);
    }
  }, [
    recordFilters.department,
    recordFilters.endDate,
    recordFilters.location,
    recordFilters.search,
    recordFilters.sort,
    recordFilters.startDate,
    recordFilters.type,
    recordPage,
    recordPageSize,
  ]);

  useEffect(() => {
    fetchEligibleStudents();
  }, [fetchEligibleStudents]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const departmentOptions = useMemo(() => {
    const departments = [...new Set(
      courses.map(course => course.department?.trim()).filter(Boolean)
    )].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));

    return [
      { value: '', label: 'All Departments', searchText: 'all departments' },
      ...departments.map(department => ({
        value: department,
        label: department,
        searchText: department,
      })),
    ];
  }, [courses]);

  const classOptions = useMemo(
    () => [
      { value: '', label: 'All Classes', searchText: 'all classes' },
      ...availableClasses.map(className => ({
        value: className,
        label: className,
        searchText: className,
      })),
    ],
    [availableClasses]
  );

  const bulkSortOptions = useMemo(
    () => [
      { value: 'name:asc', label: 'Name A-Z' },
      { value: 'name:desc', label: 'Name Z-A' },
      { value: 'className:asc', label: 'Class A-Z' },
      { value: 'rollNo:asc', label: 'Roll No A-Z' },
      { value: 'hostelRoom:asc', label: 'Room A-Z' },
      { value: 'recent:desc', label: 'Recently Added' },
    ],
    []
  );

  const recordSortOptions = useMemo(
    () => [
      { value: 'latest:desc', label: 'Newest First' },
      { value: 'oldest:asc', label: 'Oldest First' },
      { value: 'type:asc', label: 'Action A-Z' },
      { value: 'location:asc', label: 'Location A-Z' },
    ],
    []
  );

  const visibleStudentIds = useMemo(
    () => bulkStudents.map(student => student._id),
    [bulkStudents]
  );

  const selectedVisibleCount = useMemo(
    () => visibleStudentIds.filter(id => selectedStudentIds.includes(id)).length,
    [selectedStudentIds, visibleStudentIds]
  );

  const allVisibleSelected = bulkStudents.length > 0 && selectedVisibleCount === bulkStudents.length;

  const totalSelected = selectedStudentIds.length;

  const getStudentState = useCallback(student => {
    const latestMovement = student.latestMovement;

    if (!latestMovement) {
      return {
        label: 'Ready for Check In',
        tone: 'ready',
        hint: 'No previous movement yet',
      };
    }

    if (latestMovement.type === 'check_in') {
      return {
        label: `Checked In - ${formatLocationLabel(latestMovement.location)}`,
        tone: 'checked_in',
        hint: new Date(latestMovement.timestamp).toLocaleString('en-IN'),
      };
    }

    return {
      label: `Checked Out - ${formatLocationLabel(latestMovement.location)}`,
      tone: 'checked_out',
      hint: new Date(latestMovement.timestamp).toLocaleString('en-IN'),
    };
  }, []);

  const rosterSummary = useMemo(() => {
    return bulkStudents.reduce(
      (summary, student) => {
        const latestMovement = student.latestMovement;
        if (!latestMovement || latestMovement.type === 'check_out') {
          summary.ready += 1;
        }
        if (latestMovement?.type === 'check_in') {
          summary.checkedIn += 1;
        }
        if (latestMovement?.type === 'check_out') {
          summary.checkedOut += 1;
        }
        return summary;
      },
      { ready: 0, checkedIn: 0, checkedOut: 0 }
    );
  }, [bulkStudents]);

  const toggleStudentSelection = studentId => {
    setSelectedStudentIds(current =>
      current.includes(studentId)
        ? current.filter(id => id !== studentId)
        : [...current, studentId]
    );
  };

  const toggleVisibleSelection = () => {
    if (allVisibleSelected) {
      setSelectedStudentIds(current => current.filter(id => !visibleStudentIds.includes(id)));
      return;
    }

    setSelectedStudentIds(current => [
      ...new Set([...current, ...visibleStudentIds]),
    ]);
  };

  const clearSelection = () => setSelectedStudentIds([]);

  const handleBulkRecord = async () => {
    if (!selectedStudentIds.length) {
      toast.error('Select at least one student.');
      return;
    }

    setBulkSubmitting(true);
    setBulkResult(null);

    try {
      const response = await api.post('/checkin/bulk', {
        studentIds: selectedStudentIds,
        type: bulkForm.type,
        location: bulkForm.location,
        remarks: bulkForm.remarks,
      });

      const summary = response.data.summary || {};
      const failures = response.data.failures || [];
      setBulkResult(response.data);
      setSelectedStudentIds([]);
      setBulkForm(current => ({ ...current, remarks: '' }));
      toast.success(
        `${summary.succeeded || 0} student${summary.succeeded === 1 ? '' : 's'} updated successfully.`
      );
      if (failures.length) {
        toast.error(`${failures.length} student${failures.length === 1 ? '' : 's'} could not be updated.`);
      }
      fetchEligibleStudents();
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record movement');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const exportConfig = useMemo(() => ({
    fileName: `movement-history-${recordFilters.department || recordFilters.type || recordFilters.location || 'all'}`,
    title: 'Movement History Export',
    subtitle: 'Check-in and check-out records filtered by date, action, location, and department.',
    summary: [
      { label: 'Records in View', value: records.length },
      { label: 'Total Matching Records', value: recordTotal },
      { label: 'Action Filter', value: recordFilters.type ? formatMovementType(recordFilters.type) : 'All Actions' },
      { label: 'Location Filter', value: recordFilters.location ? formatLocationLabel(recordFilters.location) : 'All Locations' },
      { label: 'Department Filter', value: recordFilters.department || 'All Departments' },
      { label: 'Date From', value: recordFilters.startDate || 'Not Set' },
      { label: 'Date To', value: recordFilters.endDate || 'Not Set' },
    ],
    sections: [
      {
        title: 'Movement History',
        columns: [
          { header: 'Student', value: record => `${record.student?.firstName || ''} ${record.student?.lastName || ''}`.trim() || '-' },
          { header: 'Class', value: record => record.student?.className || record.student?.course?.department || '-' },
          { header: 'Hostel/Room', value: record => record.student?.hostelRoom || 'Day Scholar' },
          { header: 'Reg No', value: record => record.student?.regNo || '-' },
          { header: 'Roll No', value: record => record.student?.rollNo || record.student?.admissionNo || '-' },
          { header: 'Action', value: record => formatMovementType(record.type) },
          { header: 'Location', value: record => formatLocationLabel(record.location) },
          { header: 'Time', value: record => new Date(record.timestamp).toLocaleString('en-IN') },
          { header: 'Recorded By', value: record => record.recordedBy?.name || '-' },
          { header: 'Remarks', value: record => record.remarks || '-' },
        ],
        rows: records,
      },
    ],
  }), [
    recordFilters.department,
    recordFilters.endDate,
    recordFilters.location,
    recordFilters.startDate,
    recordFilters.type,
    recordTotal,
    records,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check-In / Check-Out"
        subtitle="Use the class roster to record movement quickly without searching each student one by one."
        action={<ExportActions getExportConfig={() => exportConfig} disabled={recordsLoading || records.length === 0} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
            <FiUsers />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{bulkTotal}</p>
            <p className="text-sm text-text-secondary">Students in roster</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
            <FiCheck />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{totalSelected}</p>
            <p className="text-sm text-text-secondary">Selected for action</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <FiHome />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{rosterSummary.ready}</p>
            <p className="text-sm text-text-secondary">Ready for check in</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <FiClock />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{rosterSummary.checkedIn}</p>
            <p className="text-sm text-text-secondary">Already checked in</p>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-border bg-white shadow-sm">
        <div className="border-b border-primary-100 bg-gradient-to-r from-primary-50 via-white to-white px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <span className="institution-tag mb-3">
                {user?.role === 'class_teacher' ? 'Class Movement Desk' : 'Movement Workspace'}
              </span>
              <h2 className="text-2xl font-bold text-text-primary">
                {user?.role === 'class_teacher' ? 'Record Campus Movement Faster' : 'Bulk Movement Workspace'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {lockedLocation
                  ? `This workspace is locked to ${formatLocationLabel(lockedLocation)} for your role. Select the students who are present and record the action once.`
                  : 'Select students, choose the action, and record movement in one clean step.'}
              </p>
            </div>
            <div className="rounded-3xl border border-primary-100 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-500">Active Workspace</p>
              <p className="mt-2 text-lg font-semibold text-text-primary">{formatMovementType(bulkForm.type)}</p>
              <p className="text-sm text-text-secondary">{formatLocationLabel(bulkForm.location || lockedLocation || 'campus')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_2fr]">
            <div className="rounded-3xl border border-primary-100 bg-primary-50/60 p-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-[1fr_1fr]">
                <div>
                  <label className="label">Action</label>
                  <SearchableSelect
                    value={bulkForm.type}
                    onChange={type => setBulkForm(current => ({ ...current, type }))}
                    placeholder="Select action"
                    searchPlaceholder="Search actions..."
                    options={movementTypeOptions}
                  />
                </div>
                <div>
                  <label className="label">Location</label>
                  {isLockedLocation ? (
                    <div className="input flex items-center justify-between border-primary-100 bg-white text-primary-700">
                      <span className="font-medium">{formatLocationLabel(lockedLocation)}</span>
                      <FiHome />
                    </div>
                  ) : (
                    <SearchableSelect
                      value={bulkForm.location}
                      onChange={location => setBulkForm(current => ({ ...current, location }))}
                      placeholder="Select location"
                      searchPlaceholder="Search locations..."
                      options={availableLocationOptions}
                    />
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="label">Remarks</label>
                <input
                  className="input bg-white"
                  placeholder="Optional note for this movement batch"
                  value={bulkForm.remarks}
                  onChange={event => setBulkForm(current => ({ ...current, remarks: event.target.value }))}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleBulkRecord}
                  className="btn-primary min-w-[180px]"
                  disabled={bulkSubmitting || totalSelected === 0}
                >
                  {bulkSubmitting ? 'Recording...' : `Record ${formatMovementType(bulkForm.type)}`}
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="btn-secondary min-w-[160px]"
                  disabled={totalSelected === 0}
                >
                  Clear Selection
                </button>
              </div>

              {bulkResult && (
                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
                  <p className="font-semibold text-emerald-800">
                    {bulkResult.summary?.succeeded || 0} completed, {bulkResult.summary?.failed || 0} skipped
                  </p>
                  {bulkResult.failures?.length > 0 && (
                    <div className="mt-2 space-y-1 text-xs text-amber-700">
                      {bulkResult.failures.slice(0, 4).map(failure => (
                        <p key={`${failure.studentId}-${failure.message}`}>
                          {failure.studentName}: {failure.message}
                        </p>
                      ))}
                      {bulkResult.failures.length > 4 && (
                        <p>+ {bulkResult.failures.length - 4} more skipped students</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Visible</p>
                  <p className="mt-2 text-2xl font-bold text-text-primary">{bulkStudents.length}</p>
                </div>
                <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Selected</p>
                  <p className="mt-2 text-2xl font-bold text-primary-700">{selectedVisibleCount}</p>
                </div>
                <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Ready</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-700">{rosterSummary.ready}</p>
                </div>
                <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Checked In</p>
                  <p className="mt-2 text-2xl font-bold text-amber-700">{rosterSummary.checkedIn}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {selectedVisibleCount} of {bulkStudents.length} students selected on this page
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Checked students will be recorded. Unchecked students will remain unchanged.
                  </p>
                </div>
                <button type="button" className="btn-secondary" onClick={toggleVisibleSelection}>
                  {allVisibleSelected ? 'Unselect Visible' : 'Select Visible'}
                </button>
              </div>
            </div>
          </div>

          <ListControls
            searchValue={bulkFilters.search}
            onSearchChange={search => {
              setBulkFilters(current => ({ ...current, search }));
              setBulkPage(1);
            }}
            searchPlaceholder="Search by student name, roll no, reg no, class, or room"
            sortValue={bulkFilters.sort}
            onSortChange={sort => {
              setBulkFilters(current => ({ ...current, sort }));
              setBulkPage(1);
            }}
            sortOptions={bulkSortOptions}
            pageSize={bulkPageSize}
            onPageSizeChange={pageSize => {
              setBulkPageSize(pageSize);
              setBulkPage(1);
            }}
            resultCount={bulkTotal}
            extraFilters={
              <div className="flex flex-wrap gap-3">
                <SearchableSelect
                  className="w-44"
                  value={bulkFilters.className}
                  onChange={className => {
                    setBulkFilters(current => ({ ...current, className }));
                    setBulkPage(1);
                  }}
                  placeholder="All Classes"
                  searchPlaceholder="Search classes..."
                  options={classOptions}
                />
              </div>
            }
          />

          {bulkLoading ? (
            <PageSpinner />
          ) : (
            <>
              <Table
                headers={['', 'Student', 'Profile', 'Movement State', 'Last Update']}
                empty={bulkStudents.length === 0 ? <EmptyState message="No students found for this movement workspace" icon={<FiUsers />} /> : null}
              >
                {bulkStudents.map(student => {
                  const state = getStudentState(student);
                  const isSelected = selectedStudentIds.includes(student._id);

                  return (
                    <tr key={student._id} className={isSelected ? 'bg-primary-50/70 hover:bg-primary-50' : 'hover:bg-gray-50'}>
                      <td className="table-cell w-12 align-top">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          checked={isSelected}
                          onChange={() => toggleStudentSelection(student._id)}
                        />
                      </td>
                      <td className="table-cell">
                        <p className="font-semibold text-text-primary">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {student.course?.name || 'No course assigned'}
                        </p>
                      </td>
                      <td className="table-cell">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-text-primary">
                            {student.className || student.course?.department || '-'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                              Roll {student.rollNo || student.admissionNo || student.regNo || '-'}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                              {student.isHosteler ? student.hostelRoom || 'Hostel Student' : 'Day Scholar'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${stateToneClasses[state.tone]}`}>
                          {state.label}
                        </span>
                      </td>
                      <td className="table-cell text-sm text-text-secondary">
                        {state.hint}
                      </td>
                    </tr>
                  );
                })}
              </Table>

              <Pagination
                page={bulkPage}
                pages={bulkPages}
                onPage={setBulkPage}
              />
            </>
          )}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="section-title">Movement History</h2>
            <p className="text-sm text-gray-500">
              Review recorded movement with server-side filters, sorting, and paging.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {recordTotal} matching record{recordTotal === 1 ? '' : 's'}
          </div>
        </div>

        <ListControls
          searchValue={recordFilters.search}
          onSearchChange={search => {
            setRecordFilters(current => ({ ...current, search }));
            setRecordPage(1);
          }}
          searchPlaceholder="Search by student, roll no, reg no, class, or room"
          sortValue={recordFilters.sort}
          onSortChange={sort => {
            setRecordFilters(current => ({ ...current, sort }));
            setRecordPage(1);
          }}
          sortOptions={recordSortOptions}
          pageSize={recordPageSize}
          onPageSizeChange={pageSize => {
            setRecordPageSize(pageSize);
            setRecordPage(1);
          }}
          resultCount={recordTotal}
          extraFilters={
            <div className="flex flex-wrap gap-3">
              <input
                type="date"
                className="input w-40"
                value={recordFilters.startDate}
                onChange={event => {
                  setRecordFilters(current => ({ ...current, startDate: event.target.value }));
                  setRecordPage(1);
                }}
              />
              <input
                type="date"
                className="input w-40"
                value={recordFilters.endDate}
                onChange={event => {
                  setRecordFilters(current => ({ ...current, endDate: event.target.value }));
                  setRecordPage(1);
                }}
              />
              <SearchableSelect
                className="w-36"
                value={recordFilters.type}
                onChange={type => {
                  setRecordFilters(current => ({ ...current, type }));
                  setRecordPage(1);
                }}
                placeholder="All Actions"
                searchPlaceholder="Search actions..."
                options={[
                  { value: '', label: 'All Actions', searchText: 'all actions' },
                  ...movementTypeOptions,
                ]}
              />
              {!isLockedLocation && (
                <SearchableSelect
                  className="w-40"
                  value={recordFilters.location}
                  onChange={location => {
                    setRecordFilters(current => ({ ...current, location }));
                    setRecordPage(1);
                  }}
                  placeholder="All Locations"
                  searchPlaceholder="Search locations..."
                  options={[
                    { value: '', label: 'All Locations', searchText: 'all locations' },
                    ...movementLocationOptions,
                  ]}
                />
              )}
              <SearchableSelect
                className="w-48"
                value={recordFilters.department}
                onChange={department => {
                  setRecordFilters(current => ({ ...current, department }));
                  setRecordPage(1);
                }}
                placeholder="All Departments"
                searchPlaceholder="Search departments..."
                options={departmentOptions}
              />
            </div>
          }
        />

        {recordsLoading ? (
          <PageSpinner />
        ) : (
          <>
            <Table
              headers={['Student', 'Profile', 'Action', 'Time', 'Recorded By', 'Remarks']}
              empty={records.length === 0 ? <EmptyState message="No movement records found" icon={<FiClock />} /> : null}
            >
              {records.map(record => (
                <tr key={record._id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <p className="font-semibold text-gray-900">
                      {record.student?.firstName} {record.student?.lastName}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {record.student?.course?.name || 'No course assigned'}
                    </p>
                  </td>
                  <td className="table-cell">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-text-primary">
                        {record.student?.className || record.student?.course?.department || '-'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                          Reg {record.student?.regNo || '-'}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                          Roll {record.student?.rollNo || record.student?.admissionNo || '-'}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          {record.student?.hostelRoom || 'Day Scholar'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      record.type === 'check_in'
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : 'border-amber-100 bg-amber-50 text-amber-700'
                    }`}>
                      {formatMovementType(record.type)}
                    </span>
                    <p className="mt-2 text-xs font-medium text-gray-500">
                      {formatLocationLabel(record.location)}
                    </p>
                  </td>
                  <td className="table-cell text-xs text-gray-500">
                    {new Date(record.timestamp).toLocaleString('en-IN')}
                  </td>
                  <td className="table-cell text-sm text-gray-600">
                    {record.recordedBy?.name || '-'}
                  </td>
                  <td className="table-cell text-sm text-gray-500">
                    {record.remarks || '-'}
                  </td>
                </tr>
              ))}
            </Table>

            <Pagination
              page={recordPage}
              pages={recordPages}
              onPage={setRecordPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
