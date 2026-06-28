import * as XLSX from 'xlsx';

// Your dynamic data
const ExportAgentDataToExcel = (filtered: string, data: any) => {
  const dynamicData = [
    [
      'Agents Name',
      'Agents Email',
      'Agents Agency',
      'Agents Address',
      'Agents Role',
      'Agents Phone',
      'Description',
      'Agents Status',
      'Updated At',
      'Created At',
    ],
    ...data?.map((row: any) => [
      filtered === 'filtered' ? row.original.agentsName : row.agentsName,
      filtered === 'filtered' ? row.original.agentsEmail : row.agentsEmail,
      filtered === 'filtered' ? row.original.agentsAgency : row.agentsAgency,
      filtered === 'filtered' ? row.original.agentsAddress : row.agentsAddress,
      filtered === 'filtered' ? row.original.agentsRole : row.agentsRole,
      filtered === 'filtered' ? row.original.agentsPhone : row.arrivalAirport,
      filtered === 'filtered' ? row.original.description : row.description,
      filtered === 'filtered' ? row.original.agentsStatus : row.agentsStatus,
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
  XLSX.writeFile(wb, 'Agents.xlsx', { bookSST: true });
};

export default ExportAgentDataToExcel;

// Create a worksheet
