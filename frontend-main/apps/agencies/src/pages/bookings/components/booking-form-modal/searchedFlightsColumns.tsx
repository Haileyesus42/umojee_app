import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '../../../../common/ui/button';
import { Flight } from '../../../../interface/flight';
import moment from 'moment';
import { Badge } from '../../../../common/ui/badge';
import { FLIGHT_STATUS } from '../../../../constants/general';

export const searchedFlightsColumns: ColumnDef<Flight>[] = [
  {
    accessorKey: 'flightNumber',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Flight Number
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
    accessorKey: 'price.oneway',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Oneway Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'price.roundtrip',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Roundtrip Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'departureTime',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Departure Time
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    cell({ row }) {
      return (
        <span className="min-w-max">
          {moment(row.original.createdAt).format('MMM D, YYY hh:mm a')}
        </span>
      );
    },
  },
  {
    accessorKey: 'arrivalTime',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Arrival Time
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    cell({ row }) {
      return (
        <span className="min-w-max">
          {moment(row.original.arrivalTime).format('MMM D, YYY hh:mm a')}
        </span>
      );
    },
  },
  {
    accessorKey: 'flightStatus',
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
    cell({
      row: {
        original: { flightStatus },
      },
    }) {
      return (
        <Badge
          variant={null}
          className={`${
            flightStatus === FLIGHT_STATUS.ON_TIME
              ? 'bg-green-600'
              : flightStatus === FLIGHT_STATUS.DELAYED
              ? 'bg-yellow-500'
              : 'bg-red-600'
          } text-white`}
        >
          {flightStatus}
        </Badge>
      );
    },
  },
];
