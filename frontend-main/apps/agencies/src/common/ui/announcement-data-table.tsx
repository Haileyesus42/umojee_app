'use client';

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Loader } from '../../common/ui/loader';
import { Send } from 'lucide-react';
import { AnnouncementTemplate } from '../../constants/interface/announcements';
import { useAppDispatch, useAppSelector } from '../../store';
import { createAnnouncement } from '../../store/announcements/announcement-extra';
import { userSelector } from '../../store/setting/selectors';
import { Button } from './button';
import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';
import { Input } from './input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
// import { set } from 'date-fns';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey: string;
  clickable: boolean;
  selectedMessageType: AnnouncementTemplate | null;
}

export function AnncDataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  clickable,
  selectedMessageType,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [loading, setLoading] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const dispatch = useAppDispatch();
  const announcer = useAppSelector(userSelector);
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const sendMessageHandler = async() => {
    setLoading(true);
    const announcedTo = table
      .getFilteredSelectedRowModel()
      .rows.map((row) => row.original);
    const data = {
      announcedTo,
      message: selectedMessageType,
      announcer,
    };
    await dispatch(createAnnouncement(data));
    setLoading(false);
  };

  return (
        
        
    <div className="space-y-4">
      <div className="flex items-center py-4">
        <Input
          placeholder="Search ..."
          value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn(searchKey)?.setFilterValue(event.target.value || '')
          }
          className="max-w-sm ml-2"
        />
        {/* {!clickable && ( */}
        <div className="flex w-full items-center justify-between">
          <div className="ml-2">
            <DataTableToolbar table={table} />
          </div>
          {table.getFilteredSelectedRowModel().rows.length > 0 &&
            selectedMessageType !== null && (
              <div className="flex space-x-2">
                <div className="flex items-center justify-center">
                <Button
                    className="ml-2 border"
                    size="sm"
                    onClick={sendMessageHandler}
                    variant="link"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <Loader color="emerald-600" size={15} />
                        <span className="ml-2">Announcing</span>
                      </div>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Announce
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader style={{ textAlign: 'center' }}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} style={{ textAlign: 'center' }}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} style={{ textAlign: 'center' }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  style={{ textAlign: 'center' }}
                  key={row.id}
                  className={`${clickable && 'cursor-pointer'}`}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} style={{ textAlign: 'center' }}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow style={{ textAlign: 'center' }}>
                <TableCell
                  style={{ textAlign: 'center' }}
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
