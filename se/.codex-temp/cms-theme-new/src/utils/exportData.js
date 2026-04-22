import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND = {
  primary: '1E4DB7',
  primaryDark: '163A91',
  accent: 'E53935',
  sidebar: '1E2F5A',
  border: 'E3E8F0',
  text: '1A1A1A',
  muted: '5F6B7A',
  surface: 'F5F7FB',
  white: 'FFFFFF',
  lightBlue: 'E8EDFF',
};

const toRgb = hex => {
  const value = String(hex || '').replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16) || 0,
    parseInt(value.slice(2, 4), 16) || 0,
    parseInt(value.slice(4, 6), 16) || 0,
  ];
};

const cellBase = {
  font: { name: 'Calibri', sz: 11, color: { rgb: BRAND.text } },
  alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
};

let xlsxModulePromise;

const loadXlsx = async () => {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx-js-style');
  }
  const module = await xlsxModulePromise;
  return module.default || module;
};

const toSheetName = (value, index) => {
  const cleaned = String(value || `Sheet ${index + 1}`)
    .replace(/[\\/?*\[\]:]/g, ' ')
    .trim();
  return cleaned.slice(0, 31) || `Sheet ${index + 1}`;
};

const toFileName = value =>
  String(value || 'college-export')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'college-export';

const toDisplayValue = value => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  return String(value)
    .replace(/₹|â‚¹/g, 'Rs. ')
    .replace(/â€“/g, '-')
    .replace(/Â·/g, '·');
};

export const formatExportCurrency = value => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
export const formatExportNumber = value => Number(value || 0).toLocaleString('en-IN');
export const formatExportDate = value => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN');
};
export const formatExportDateTime = value => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('en-IN');
};

const CLIENT_FACING_VALUE_MAP = {
  admission_pending: 'Enrollment Pending',
  check_in: 'Check In',
  check_out: 'Check Out',
};

const toClientTitleCase = value =>
  String(value || '')
    .split(' ')
    .filter(Boolean)
    .map(word => {
      const lower = word.toLowerCase();
      if (['dd', 'pg', 'ug', 'ugc', 'ai', 'ml', 'cs', 'it', 'bca', 'mca', 'mba', 'bba', 'bcom', 'mcom', 'nri', 'sc', 'st', 'obc', 'ews', 'neft', 'rtgs', 'upi'].includes(lower)) {
        return lower.toUpperCase();
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');

const toClientFileName = value => {
  const cleaned = String(value || 'college-export')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const safeParts = cleaned
    .split('-')
    .filter(Boolean)
    .filter(part => !/^[a-f0-9]{24}$/i.test(part));

  return safeParts.join('-') || 'college-export';
};

const toClientDisplayValue = value => {
  const normalized = toDisplayValue(value);
  const lowerValue = String(normalized || '').trim().toLowerCase();

  if (CLIENT_FACING_VALUE_MAP[lowerValue]) {
    return CLIENT_FACING_VALUE_MAP[lowerValue];
  }

  if (/^[a-f0-9]{24}$/i.test(String(normalized || '').trim())) {
    return '-';
  }

  if (/^[a-z]+(?:_[a-z0-9]+)+$/i.test(String(normalized || '').trim())) {
    return toClientTitleCase(String(normalized || '').replace(/_/g, ' '));
  }

  return normalized;
};

const resolveColumns = columns =>
  columns.map(column => {
    if (typeof column === 'string') {
      return {
        header: column,
        getValue: row => row?.[column] ?? '',
      };
    }

    return {
      header: column.header,
      width: column.width,
      align: column.align,
      getValue: row => {
        if (column.value) return column.value(row);
        if (column.key) return row?.[column.key];
        return '';
      },
    };
  });

const resolveSections = sections =>
  (sections || [])
    .map(section => ({
      title: section.title || 'Export',
      columns: resolveColumns(section.columns || []),
      rows: section.rows || [],
    }))
    .filter(section => section.columns.length > 0);

const buildOverviewSheet = (XLSX, { title, subtitle, summary, generatedAt }) => {
  const rows = [
    [title],
    [subtitle || ''],
    [`Generated on ${generatedAt}`],
    [],
  ];

  if ((summary || []).length) {
    rows.push(['Summary']);
    summary.forEach(item => rows.push([item.label, toClientDisplayValue(item.value)]));
  } else {
    rows.push(['Summary'], ['No summary data available']);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } },
  ];
  ws['!cols'] = [{ wch: 26 }, { wch: 28 }, { wch: 28 }, { wch: 20 }];

  if (ws.A1) {
    ws.A1.s = {
      ...cellBase,
      font: { name: 'Calibri', sz: 17, bold: true, color: { rgb: BRAND.white } },
      fill: { fgColor: { rgb: BRAND.primary } },
      alignment: { horizontal: 'left', vertical: 'center' },
    };
  }
  if (ws.A2) {
    ws.A2.s = {
      ...cellBase,
      font: { name: 'Calibri', sz: 11, color: { rgb: BRAND.primaryDark } },
      fill: { fgColor: { rgb: BRAND.lightBlue } },
    };
  }
  if (ws.A3) {
    ws.A3.s = {
      ...cellBase,
      font: { name: 'Calibri', sz: 10, italic: true, color: { rgb: BRAND.muted } },
    };
  }
  if (ws.A5) {
    ws.A5.s = {
      ...cellBase,
      font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: BRAND.primaryDark } },
      fill: { fgColor: { rgb: BRAND.surface } },
    };
  }

  for (let row = 6; row <= rows.length; row += 1) {
    const labelCell = ws[`A${row}`];
    const valueCell = ws[`B${row}`];
    if (labelCell) {
      labelCell.s = {
        ...cellBase,
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: BRAND.text } },
        fill: { fgColor: { rgb: BRAND.surface } },
        border: { bottom: { style: 'thin', color: { rgb: BRAND.border } } },
      };
    }
    if (valueCell) {
      valueCell.s = {
        ...cellBase,
        border: { bottom: { style: 'thin', color: { rgb: BRAND.border } } },
      };
    }
  }

  return ws;
};

const buildSectionSheet = (XLSX, section, generatedAt) => {
  const headerRow = section.columns.map(column => column.header);
  const bodyRows = section.rows.map(row =>
    section.columns.map(column => toClientDisplayValue(column.getValue(row)))
  );
  const rows = [
    [section.title],
    [`Generated on ${generatedAt}`],
    [],
    headerRow,
    ...bodyRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(headerRow.length - 1, 0) } }];
  ws['!cols'] = section.columns.map(column => ({ wch: column.width || 18 }));

  ws.A1.s = {
    ...cellBase,
    font: { name: 'Calibri', sz: 15, bold: true, color: { rgb: BRAND.primaryDark } },
    fill: { fgColor: { rgb: BRAND.surface } },
  };
  ws.A2.s = {
    ...cellBase,
    font: { name: 'Calibri', sz: 10, italic: true, color: { rgb: BRAND.muted } },
  };

  headerRow.forEach((_, index) => {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: index });
    ws[cellRef].s = {
      ...cellBase,
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: BRAND.primaryDark } },
      fill: { fgColor: { rgb: BRAND.lightBlue } },
      border: {
        top: { style: 'thin', color: { rgb: BRAND.border } },
        bottom: { style: 'thin', color: { rgb: BRAND.border } },
        left: { style: 'thin', color: { rgb: BRAND.border } },
        right: { style: 'thin', color: { rgb: BRAND.border } },
      },
      alignment: {
        vertical: 'center',
        horizontal: section.columns[index].align === 'right' ? 'right' : 'left',
        wrapText: true,
      },
    };
  });

  bodyRows.forEach((row, rowIndex) => {
    row.forEach((_, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 4, c: colIndex });
      ws[cellRef].s = {
        ...cellBase,
        border: {
          top: { style: 'thin', color: { rgb: BRAND.border } },
          bottom: { style: 'thin', color: { rgb: BRAND.border } },
          left: { style: 'thin', color: { rgb: BRAND.border } },
          right: { style: 'thin', color: { rgb: BRAND.border } },
        },
        alignment: {
          vertical: 'center',
          horizontal: section.columns[colIndex].align === 'right' ? 'right' : 'left',
          wrapText: true,
        },
      };
    });
  });

  return ws;
};

const drawSummaryCards = (doc, summary, pageWidth, startY) => {
  if (!summary?.length) return startY;

  const columns = 2;
  const gap = 8;
  const cardWidth = (pageWidth - 28 - gap) / columns;
  const cardHeight = 17;
  let currentY = startY;

  summary.forEach((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = 14 + column * (cardWidth + gap);
    const y = currentY + row * (cardHeight + gap);

    doc.setFillColor(...toRgb(BRAND.surface));
    doc.setDrawColor(...toRgb(BRAND.border));
    doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...toRgb(BRAND.muted));
    doc.text(item.label, x + 4, y + 6);
    doc.setFontSize(12);
    doc.setTextColor(...toRgb(BRAND.primaryDark));
    doc.text(toClientDisplayValue(item.value), x + 4, y + 12);
  });

  return currentY + Math.ceil(summary.length / columns) * (cardHeight + gap);
};

export const exportSectionsToPdf = config => {
  const sections = resolveSections(config.sections);
  if (!sections.length || !sections.some(section => section.rows.length)) {
    throw new Error('No exportable data found');
  }

  const fileName = toClientFileName(config.fileName);
  const generatedAt = new Date().toLocaleString('en-IN');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const primaryRgb = toRgb(BRAND.primary);
  const whiteRgb = toRgb(BRAND.white);
  const mutedRgb = toRgb(BRAND.muted);
  const borderRgb = toRgb(BRAND.border);
  const surfaceRgb = toRgb(BRAND.surface);
  const primaryDarkRgb = toRgb(BRAND.primaryDark);
  const lightBlueRgb = toRgb(BRAND.lightBlue);
  const textRgb = toRgb(BRAND.text);

  doc.setFillColor(...primaryRgb);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...whiteRgb);
  doc.setFontSize(18);
  doc.text(config.title || 'College Management Export', 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(config.subtitle || 'Generated report export', 14, 19);
  doc.text(`Generated on ${generatedAt}`, pageWidth - 14, 19, { align: 'right' });

  let cursorY = drawSummaryCards(doc, config.summary || [], pageWidth, 35);
  cursorY = Math.max(cursorY, 50);

  sections.forEach((section, index) => {
    if (index > 0) {
      doc.addPage('a4', 'landscape');
      cursorY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...primaryDarkRgb);
    doc.text(section.title, 14, cursorY);

    autoTable(doc, {
      startY: cursorY + 6,
      head: [section.columns.map(column => column.header)],
      body: section.rows.map(row => section.columns.map(column => toClientDisplayValue(column.getValue(row)))),
      theme: 'grid',
      headStyles: {
        fillColor: lightBlueRgb,
        textColor: primaryDarkRgb,
        fontStyle: 'bold',
        lineColor: borderRgb,
      },
      bodyStyles: {
        textColor: textRgb,
        lineColor: borderRgb,
      },
      alternateRowStyles: {
        fillColor: surfaceRgb,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
      },
      margin: { left: 14, right: 14, bottom: 15 },
      didDrawPage: data => {
        doc.setFontSize(8);
        doc.setTextColor(...mutedRgb);
        doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
        if (data.pageNumber > 1) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(...primaryDarkRgb);
          doc.text(config.title || 'College Management Export', 14, 10);
        }
      },
    });
  });

  doc.save(`${fileName}.pdf`);
};

export const exportSectionsToExcel = async config => {
  const sections = resolveSections(config.sections);
  if (!sections.length || !sections.some(section => section.rows.length)) {
    throw new Error('No exportable data found');
  }

  const XLSX = await loadXlsx();
  const fileName = toClientFileName(config.fileName);
  const generatedAt = new Date().toLocaleString('en-IN');
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    buildOverviewSheet(XLSX, {
      title: config.title || 'College Management Export',
      subtitle: config.subtitle || 'Generated report export',
      summary: config.summary || [],
      generatedAt,
    }),
    'Overview'
  );

  sections.forEach((section, index) => {
    XLSX.utils.book_append_sheet(
      workbook,
      buildSectionSheet(XLSX, section, generatedAt),
      toSheetName(section.title, index)
    );
  });

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
