import * as XLSX from 'xlsx';

// Your dynamic data
const ExportFlightDataToExcel = (filtered: string, data: any) => {
  const dynamicData = [
    [
      'Flight Number',
      'Airline',
      'Total Seats Capacity',
      'Departure Airport',
      'Arrival Airport',
      'Departure Time',
      'Arrival Time',
      'Oneway Price',
      'Roundtrip Price',
      'Flight Status',
      'Gate',
      'Terminal',
      'Runway',
      'Date',
    ],
    ...data?.map((row: any) => [
      filtered === 'filtered' ? row.original.flightNumber : row.flightNumber,
      filtered === 'filtered' ? row.original.airline : row.airline,
      filtered === 'filtered'
        ? row.original.TotalSeatsCapacity
        : row.TotalSeatsCapacity,
      filtered === 'filtered'
        ? row.original.departureAirport
        : row.departureAirport,
      filtered === 'filtered'
        ? row.original.arrivalAirport
        : row.arrivalAirport,
      filtered === 'filtered' ? row.original.departureTime : row.departureTime,
      filtered === 'filtered' ? row.original.arrivalTime : row.arrivalTime,
      filtered === 'filtered' ? row.original.price.oneway : row.price.oneway,
      filtered === 'filtered'
        ? row.original.price.roundtrip
        : row.price.roundtrip,
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
  XLSX.writeFile(wb, 'Flight.xlsx', { bookSST: true });
};

export default ExportFlightDataToExcel;

// Create a worksheet
