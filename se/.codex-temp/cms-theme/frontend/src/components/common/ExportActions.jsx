import React from 'react';
import toast from 'react-hot-toast';
import { FiDownload, FiFileText } from './icons';
import { exportSectionsToExcel, exportSectionsToPdf } from '../../utils/exportData';
import { getUserFriendlyErrorMessage } from '../../utils/errorMessages';

export default function ExportActions({
  getExportConfig,
  disabled = false,
  className = '',
}) {
  const resolveConfig = () => {
    const config = typeof getExportConfig === 'function' ? getExportConfig() : null;
    if (!config) {
      toast.error('Nothing to export right now');
      return null;
    }
    return config;
  };

  const handleExport = async type => {
    if (disabled) return;
    const config = resolveConfig();
    if (!config) return;

    try {
      if (type === 'pdf') {
        await exportSectionsToPdf(config);
      } else {
        await exportSectionsToExcel(config);
      }
      toast.success(`${type === 'pdf' ? 'PDF' : 'Excel'} export started`);
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error, 'Unable to export data'));
    }
  };

  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center ${className}`}>
      <button
        type="button"
        onClick={() => handleExport('pdf')}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <FiFileText />
        Export PDF
      </button>
      <button
        type="button"
        onClick={() => handleExport('excel')}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary-200 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <FiDownload />
        Export Excel
      </button>
    </div>
  );
}
