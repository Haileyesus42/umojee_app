import * as XLSX from 'xlsx';

// Your dynamic data
const ExportRefundsToExcel = (filtered: string, data: any) => {
  const dynamicData = [
    [
      'Request Comes From',
      'Requester Name',
      'Requester Email',
      'Booking Comes From',
      'Booker Name',
      'Booker Email',
      'Passenger Name',
      'Price',
      'Booking Date',
      'Reason',
      'Status',
      'Created At',
    ],
    ...data?.map((row: any) => [
      filtered === 'filtered'
        ? row.original.requestComesFrom
        : row.requestComesFrom,
      filtered === 'filtered' ? row.original.requesterName : row.requesterName,
      filtered === 'filtered'
        ? row.original.requesterEmail
        : row.requesterEmail,
      filtered === 'filtered'
        ? row.original.bookingComesFrom
        : row.bookingComesFrom,
      filtered === 'filtered' ? row.original.bookerName : row.bookerName,
      filtered === 'filtered' ? row.original.bookerEmail : row.bookerEmail,
      filtered === 'filtered' ? row.original.passengerName : row.passengerName,
      filtered === 'filtered' ? row.original.price : row.price,
      filtered === 'filtered' ? row.original.bookingDate : row.bookingDate,
      filtered === 'filtered' ? row.original.reason : row.reason,
      filtered === 'filtered' ? row.original.status : row.status,
      filtered === 'filtered' ? row.original.createdAt : row.createdAt,
    ]),
    // Add more rows as needed
  ];
  const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(dynamicData);

  // Create a workbook
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');

  // Save the workbook to a file
  XLSX.writeFile(wb, 'Refunds.xlsx', { bookSST: true });
};

export default ExportRefundsToExcel;

// Create a worksheet
