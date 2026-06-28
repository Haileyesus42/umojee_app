import * as XLSX from 'xlsx';

// Your dynamic data
const ExportMessageDataToExcel = (filtered: string, data: any) => {
  const dynamicData = [
    ['Template Name', 'Template Title', 'Template Body', 'Updated At', 'Created At'],
    ...data?.map((row: any) => [
      filtered === 'filtered' ? row.original.templateName : row.templateName,
      filtered === 'filtered' ? row.original.templateTitle : row.templateTitle,
      filtered === 'filtered' ? row.original.templateBody : row.templateBody,
      filtered === 'filtered' ? row.original.updatedAt : row.updatedAt,
      filtered === 'filtered' ? row.original.createdAt : row.createdAt,
    ]),
    // Add more rows as needed
  ];
  const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(dynamicData);

  // Create a workbook
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');

  // Save the workbook to a file
  XLSX.writeFile(wb, 'Announcements.xlsx', { bookSST: true });
};

export default ExportMessageDataToExcel;

// Create a worksheet
