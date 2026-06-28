import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Badge } from '../../../common/ui/badge';
import { Button } from '../../../common/ui/button';
import { Checkbox } from '../../../common/ui/checkbox';
import { FLIGHT_STATUS } from '../../../constants/general';
import { Flight } from '../../../interface/flight';
import { useAppDispatch, useAppSelector } from '../../../store';
import { updateSelectedFlightIds } from '../../../store/flight/flight-slice';
import { flightColumnsSelector } from '../../../store/flight/selectors';
import { CellAction } from './cell-actions';

export const columns: ColumnDef<Flight>[] = [
  {
    id: 'select',
    header: ({ table }) => {
      const dispatch = useAppDispatch();
      const { flightList, isDeletingAllFlights } = useAppSelector(
        flightColumnsSelector,
      );
      return (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
            dispatch(
              updateSelectedFlightIds(
                value ? [...flightList.map((flight: any) => flight._id)] : [],
              ),
            );
          }}
          aria-label="Select all"
          disabled={isDeletingAllFlights}
        />
      );
    },
    cell: ({ row }) => {
      const dispatch = useAppDispatch();
      const { selectedFlightIds, isDeletingAllFlights } = useAppSelector(
        flightColumnsSelector,
      );
      return (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            dispatch(
              updateSelectedFlightIds(
                !value
                  ? [
                      ...selectedFlightIds.filter(
                        (id) => id !== row.original._id,
                      ),
                    ]
                  : [...selectedFlightIds, row.original._id],
              ),
            );
            row.toggleSelected(!!value);
          }}
          aria-label="Select row"
          disabled={
            row.original.flightStatus === 'success' ||
            row.original.flightStatus === 'inprogress' ||
            isDeletingAllFlights
          }
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
    accessorKey: '_id',
  },
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
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Aircraft Image
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    id: 'aircraftImage',
    // header: 'Aircraft Image',
    cell: () => (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <img
          src="https://i.pinimg.com/originals/13/be/6d/13be6dcbb2b842054df0d9682ab0b271.png"
          alt="Aircraft"
          style={{ width: '80px', height: 'auto' }}
        />
      </div>
    ),
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
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
