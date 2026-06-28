import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Badge } from '../../../common/ui/badge';
import { Button } from '../../../common/ui/button';
import { Checkbox } from '../../../common/ui/checkbox';
import { BOOKING_STATUS } from '../../../constants/general';
import { Booking } from '../../../interface/booking';
import { CellAction } from './cell-actions';
import PeoplesCircle from './PeoplesCircle';

function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case BOOKING_STATUS.REQUEST_REFUND.toLowerCase():
      return 'bg-blue-300';
    case BOOKING_STATUS.REFUND_APPROVED.toLowerCase():
      return 'bg-blue-600';
    case BOOKING_STATUS.CANCELLED.toLowerCase():
      return 'bg-red-600';
    case BOOKING_STATUS.BOOKED.toLowerCase():
      return 'bg-gray-600';
    default:
      return 'bg-green-600';
  }
}

function formatStatus(status: string) {
  return status === BOOKING_STATUS.REFUND_APPROVED
    ? 'REFUNDED'
    : status.toUpperCase();
}

export const bookingColumns: ColumnDef<Booking>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        disabled={
          row.original.bookingStatus === 'success' ||
          row.original.bookingStatus === 'inprogress'
        }
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'passengerName',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Passenger Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },

  {
    accessorKey: 'ticketPrice',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Ticket Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },

  {
    accessorKey: 'airline',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Airline
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'departureAirport',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Departure Airport
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'arrivalAirport',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Arrival Airport
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },

    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },

  {
    accessorKey: 'totalPeoples',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Passengers
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <PeoplesCircle total={row.original.totalPeoples} />;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'bookingStatus',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    cell: ({ row }) => (
      <Badge
        variant={null}
        className={`${getStatusClass(
          row.original.status ?? '',
        )} text-white uppercase`}
      >
        {formatStatus(row.original.status ?? '')}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
