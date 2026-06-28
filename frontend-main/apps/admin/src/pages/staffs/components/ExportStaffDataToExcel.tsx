import * as XLSX from 'xlsx';

// Your dynamic data
const ExportStaffDataToExcel = (filtered: string, data: any) => {
  const dynamicData = [
    ['Name', 'Email', 'Role', 'Status', 'Updated At', 'Created At'],
    ...data?.map((row: any) => [
      filtered === 'filtered' ? row.original.name : row.name,
      filtered === 'filtered' ? row.original.email : row.email,
      filtered === 'filtered' ? row.original.role : row.role,
      filtered === 'filtered' ? row.original.status : row.status,
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
  XLSX.writeFile(wb, 'Staff.xlsx', { bookSST: true });
};

export default ExportStaffDataToExcel;

// Create a worksheet
