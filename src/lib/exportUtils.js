// Utility functions for exporting reports to PDF and Excel
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { formatDateAR } from './dateUtils';

/**
 * Export data to PDF
 * @param {Array} data - Data to export
 * @param {Object} options - Export options
 */
export const exportToPDF = (data, options = {}) => {
  const {
    title = 'تقرير',
    columns = [],
    filename = 'report.pdf',
    orientation = 'portrait', // 'portrait' or 'landscape'
    locale = 'ar'
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  // Set RTL direction for Arabic
  if (locale === 'ar') {
    doc.setLanguage('ar');
  }

  // Add title
  doc.setFontSize(18);
  doc.text(title, 105, 15, { align: 'center' });

  // Prepare table data
  const tableData = data.map(item => 
    columns.map(col => {
      const value = item[col.key];
      if (col.formatter) {
        return col.formatter(value, item);
      }
      if (value === null || value === undefined) return '-';
      return String(value);
    })
  );

  const headers = columns.map(col => col.label || col.key);

  // Add table
  doc.autoTable({
    head: [headers],
    body: tableData,
    startY: 25,
    styles: {
      font: locale === 'ar' ? 'Arial Unicode MS' : 'helvetica',
      fontSize: 9,
      textColor: [0, 0, 0],
      halign: 'right',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [249, 115, 22], // Orange color
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    margin: { top: 25, right: 14, bottom: 20, left: 14 }
  });

  // Add footer with date
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `تاريخ التصدير: ${formatDateAR(new Date())} | صفحة ${i} من ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save file
  doc.save(filename);
};

/**
 * Export data to Excel
 * @param {Array} data - Data to export
 * @param {Object} options - Export options
 */
export const exportToExcel = (data, options = {}) => {
  const {
    title = 'تقرير',
    columns = [],
    filename = 'report.xlsx',
    sheetName = 'Sheet1',
    locale = 'ar'
  } = options;

  // Prepare data
  const worksheetData = [
    // Header row
    columns.map(col => col.label || col.key),
    // Data rows
    ...data.map(item =>
      columns.map(col => {
        const value = item[col.key];
        if (col.formatter) {
          return col.formatter(value, item);
        }
        if (value === null || value === undefined) return '-';
        return value;
      })
    )
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  const colWidths = columns.map(() => ({ wch: 20 }));
  ws['!cols'] = colWidths;

  // Style header row
  const headerRange = XLSX.utils.decode_range(ws['!ref']);
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;
    ws[cellAddress].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "F97316" } }, // Orange background
      alignment: { horizontal: "right", vertical: "center" }
    };
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(blob, filename);
};

/**
 * Generate report for a specific period
 * @param {Array} invoicesIn - Incoming invoices
 * @param {Array} invoicesOut - Outgoing invoices
 * @param {Object} filters - Filter options
 */
export const generateReport = (invoicesIn, invoicesOut, filters = {}) => {
  const { 
    startDate, 
    endDate, 
    currency, 
    category,
    type = 'all' // 'all', 'in', 'out'
  } = filters;

  let data = [];

  if (type === 'all' || type === 'in') {
    data = [
      ...data,
      ...invoicesIn.map(inv => ({
        type: 'وارد',
        amount: parseFloat(inv.amount || 0),
        currency: inv.currency || 'TRY',
        description: inv.description || '-',
        date: inv.date,
        category: inv.category || '-',
        partner: inv.partner_name || '-',
        status: inv.status || 'pending'
      }))
    ];
  }

  if (type === 'all' || type === 'out') {
    data = [
      ...data,
      ...invoicesOut.map(inv => ({
        type: 'صادر',
        amount: parseFloat(inv.amount || 0),
        currency: inv.currency || 'TRY',
        description: inv.description || '-',
        date: inv.date,
        category: inv.category || '-',
        partner: inv.partner_name || '-',
        status: inv.status || 'pending'
      }))
    ];
  }

  // Apply filters
  if (startDate) {
    data = data.filter(item => new Date(item.date) >= new Date(startDate));
  }
  if (endDate) {
    data = data.filter(item => new Date(item.date) <= new Date(endDate));
  }
  if (currency) {
    data = data.filter(item => item.currency === currency);
  }
  if (category) {
    data = data.filter(item => item.category === category);
  }

  return data;
};

/**
 * Get period dates (daily, weekly, monthly)
 */
export const getPeriodDates = (period) => {
  const today = new Date();
  const startDate = new Date();
  const endDate = new Date();

  switch (period) {
    case 'daily':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      const dayOfWeek = today.getDay();
      startDate.setDate(today.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(today.getMonth() + 1);
      endDate.setDate(0);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      startDate.setFullYear(2000);
      endDate.setFullYear(2100);
  }

  return { startDate, endDate };
};

