'use client';

import { Cross2Icon } from '@radix-ui/react-icons';
import { Table } from '@tanstack/react-table';

import {
  // agenciesStatuses,
  agentsStatuses,
  anncRoles,
  anncStatuses,
  anncUserRoles,
  bookingStatuses,
  flightStatuses,
  passengerStatuses,
  // refundStatuses,
} from '../data/data';
import { Button } from './button';
import { DataTableFacetedFilter } from './data-table-faceted-filter';
import { DataTableViewOptions } from './data-table-view-options';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const getColumnIfExists = (id: string) =>
    table.getAllColumns().find((c) => c.id === id);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {getColumnIfExists('flightStatus') && (
          <DataTableFacetedFilter
            column={getColumnIfExists('flightStatus')!}
            title="Status"
            options={flightStatuses}
          />
        )}
        {getColumnIfExists('bookingStatus') && (
          <DataTableFacetedFilter
            column={getColumnIfExists('bookingStatus')!}
            title="Status"
            options={bookingStatuses}
          />
        )}
        {getColumnIfExists('passengerStatus') && (
          <DataTableFacetedFilter
            column={getColumnIfExists('passengerStatus')!}
            title="Status"
            options={passengerStatuses}
          />
        )}
        {/* {table.getColumn('refundStatus') && (
          <DataTableFacetedFilter
            column={table.getColumn('refundStatus')}
            title="Status"
            options={refundStatuses}
          />
        )} */}
        {/* {table.getColumn('agenciesStatus') && (
          <DataTableFacetedFilter
            column={table.getColumn('agenciesStatus')}
            title="Status"
            options={agenciesStatuses}
          />
        )} */}
        {getColumnIfExists('agentsStatus') && (
          <DataTableFacetedFilter
            column={getColumnIfExists('agentsStatus')!}
            title="Status"
            options={agentsStatuses}
          />
        )}

        {getColumnIfExists('anncStatus') && (
          <DataTableFacetedFilter
            column={getColumnIfExists('anncStatus')!}
            title="Status"
            options={anncStatuses}
          />
        )}

        {getColumnIfExists('anncRole') && (
          <DataTableFacetedFilter
            column={getColumnIfExists('anncRole')!}
            title="Role"
            options={anncRoles}
          />
        )}

        {getColumnIfExists('anncUserRole') && (
          <DataTableFacetedFilter
            column={getColumnIfExists('anncUserRole')!}
            title="Role"
            options={anncUserRoles}
          />
        )}

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="ml-2">
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
