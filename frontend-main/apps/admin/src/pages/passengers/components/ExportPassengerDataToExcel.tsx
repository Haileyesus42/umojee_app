import * as XLSX from 'xlsx';

// Your dynamic data
const ExportPassengerDataToExcel = (filtered: string, data: any) => {
  const dynamicData = [
    ['Title', 'First Name', 'Last Name', 'Updated At', 'Created At'],
    ...data?.map((row: any) => [
      filtered === 'filtered' ? row.original.title : row.title,
      filtered === 'filtered' ? row.original.firstName : row.firstName,
      filtered === 'filtered' ? row.original.lastName : row.lastName,
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
  XLSX.writeFile(wb, 'Passengers.xlsx', { bookSST: true });
};

export default ExportPassengerDataToExcel;

// Create a worksheet
