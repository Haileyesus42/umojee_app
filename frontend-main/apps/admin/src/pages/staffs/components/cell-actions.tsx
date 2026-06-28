'use client';

import { CheckCheck, Edit, MoreHorizontal, Trash, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { AlertModal } from '../../../common/modals/alert-modal';
import { Button } from '../../../common/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../../common/ui/dropdown-menu';
import { Role } from '../../../constants/enum';
import { useAppSelector } from '../../../store';
import { userSelector } from '../../../store/setting/selectors';
import {
  deleteStaffData,
  ToggleUsersStatus,
} from '../../../store/staffs/staff-extra';
import {
  hasPermissionToDeleteFlight,
  hasPermissionToModifyFlight,
} from '../../../utils/permissions';
import { useEditStaffModal } from '../../../hooks/use-edit-staff-modal';
import { EditStaff } from '../../../interface/staff';

export const CellAction: React.FC<{
  data: EditStaff;
}> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const user = useAppSelector(userSelector);

  const editStaffModal = useEditStaffModal();

  const onDelete = async () => {
    try {
      setLoading(true);
      dispatch(deleteStaffData(data._id.toString()) as any);
    } catch (error) {
      toast.error('Something went wrong!');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onToggleStatus = async () => {
    try {
      setLoading(true);
      const newStatus = data.active ? 'deactivate' : 'activate';
      dispatch(ToggleUsersStatus(data._id.toString(), newStatus) as any);
    } catch (error) {
      toast.error('Failed to update passenger status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {hasPermissionToModifyFlight(user?.role as Role) && (
            <DropdownMenuItem onClick={() => editStaffModal.onOpen(data)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {hasPermissionToModifyFlight(user?.role as Role) && (
            <DropdownMenuItem onClick={onToggleStatus}>
              {!data.active ? (
                <>
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Activate
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Block
                </>
              )}
            </DropdownMenuItem>
          )}
          {hasPermissionToDeleteFlight(user?.role as Role) && (
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
