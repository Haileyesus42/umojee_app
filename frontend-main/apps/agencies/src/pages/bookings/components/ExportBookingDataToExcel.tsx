import * as XLSX from 'xlsx';

// Your dynamic data
const ExportBookingDataToExcel = (filtered: string, data: any) => {
  const dynamicData = [
    [
      'Passenger Name',
      'Airline',
      'Passengers Count',
      'Departure Airport',
      'Arrival Airport',
      'Departure Time',
      'Arrival Time',
      'Ticket Price',
      'Flight Status',
      'Gate',
      'Terminal',
      'Runway',
      'Date',
    ],
    ...data?.map((row: any) => [
      filtered === 'filtered' ? row.original.passengerName : row.passengerName,
      filtered === 'filtered' ? row.original.airline : row.airline,
      filtered === 'filtered' ? row.original.totalPeoples : row.totalPeoples,
      filtered === 'filtered'
        ? row.original.departureAirport
        : row.departureAirport,
      filtered === 'filtered'
        ? row.original.arrivalAirport
        : row.arrivalAirport,
      filtered === 'filtered' ? row.original.departureTime : row.departureTime,
      filtered === 'filtered' ? row.original.arrivalTime : row.arrivalTime,
      filtered === 'filtered' ? row.original.ticketPrice : row.ticketPrice,
      filtered === 'filtered' ? row.original.flightStatus : row.flightStatus,
      filtered === 'filtered' ? row.original.gate : row.gate,
      filtered === 'filtered' ? row.original.terminal : row.terminal,
      filtered === 'filtered' ? row.original.runway : row.runway,
      filtered === 'filtered' ? row.original.createdAt : row.createdAt,
    ]),
    // Add more rows as needed
  ];
  const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(dynamicData);

  // Create a workbook
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');

  // Save the workbook to a file
  XLSX.writeFile(wb, 'Bookings.xlsx', { bookSST: true });
};

export default ExportBookingDataToExcel;

// Create a worksheet
