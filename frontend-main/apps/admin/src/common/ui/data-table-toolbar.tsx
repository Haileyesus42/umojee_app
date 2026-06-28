'use client';

import { Cross2Icon } from '@radix-ui/react-icons';
import { Table } from '@tanstack/react-table';

import {
  agenciesStatuses,
  agentsStatuses,
  anncRoles,
  anncStatuses,
  anncUserRoles,
  bookingStatuses,
  flightStatuses,
  passengerStatuses,
  refundStatuses,
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

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {table.getColumn('flightStatus') && (
          <DataTableFacetedFilter
            column={table.getColumn('flightStatus')}
            title="Status"
            options={flightStatuses}
          />
        )}
        {table.getColumn('bookingStatus') && (
          <DataTableFacetedFilter
            column={table.getColumn('bookingStatus')}
            title="Status"
            options={bookingStatuses}
          />
        )}
        {table.getColumn('passengerStatus') && (
          <DataTableFacetedFilter
            column={table.getColumn('passengerStatus')}
            title="Status"
            options={passengerStatuses}
          />
        )}
        {table.getColumn('refundStatus') && (
          <DataTableFacetedFilter
            column={table.getColumn('refundStatus')}
            title="Status"
            options={refundStatuses}
          />
        )}
        {table.getColumn('agenciesStatus') && (
          <DataTableFacetedFilter
            column={table.getColumn('agenciesStatus')}
            title="Status"
            options={agenciesStatuses}
          />
        )}
        {table.getColumn('agentsStatus') && (
          <DataTableFacetedFilter
            column={table.getColumn('agentsStatus')}
            title="Status"
            options={agentsStatuses}
          />
        )}

        {table.getColumn('anncStatus') && (
          <DataTableFacetedFilter
            column={table.getColumn('anncStatus')}
            title="Status"
            options={anncStatuses}
          />
        )}

        {table.getColumn('anncRole') && (
          <DataTableFacetedFilter
            column={table.getColumn('anncRole')}
            title="Role"
            options={anncRoles}
          />
        )}

        {table.getColumn('anncUserRole') && (
          <DataTableFacetedFilter
            column={table.getColumn('anncUserRole')}
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
