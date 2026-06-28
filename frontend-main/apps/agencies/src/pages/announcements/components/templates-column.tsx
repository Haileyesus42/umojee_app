'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '../../../common/ui/button';
import { Checkbox } from '../../../common/ui/checkbox';
import { AnnouncementTemplate } from '../../../constants/interface/announcements';
import { CellAction } from './cell-actions';

export const templateColumn: ColumnDef<AnnouncementTemplate>[] = [
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
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'templateName',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const templateName = row.original.templateName;
      return templateName ? templateName : "No Message ID!";
    },
  },
  {
    accessorKey: 'templateTitle',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const templateTitle = row.original.templateTitle;
      return templateTitle ? templateTitle : "No Message ID!";
    },
  },
  {
    accessorKey: 'templateBody',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Body
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const templateBody = row.original.templateBody;
      return templateBody ? templateBody : "No Message ID!";
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original as any} />,
  },
];
