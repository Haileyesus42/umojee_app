'use client';

import { CheckCheck, MoreHorizontal, Trash, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
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
import { Passenger } from '../../../interface/passenger';
import { useAppSelector } from '../../../store';
import { userSelector } from '../../../store/setting/selectors';
import { hasPermissionToDeleteFlight } from '../../../utils/permissions';
import {
  deletePassengerData,
  TogglePassengerStatus,
} from '../../../store/passengers/passenger-extra';
import { useDispatch } from 'react-redux';

interface CellActionProps {
  data: Passenger;
}
export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const user = useAppSelector(userSelector);
  const dispatch = useDispatch();

  const onDelete = async () => {
    try {
      setLoading(true);
      dispatch(deletePassengerData(data._id.toString()) as any);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onToggleStatus = async () => {
    try {
      setLoading(true);
      const newStatus = data.isBlocked ? 'activate' : 'deactivate';
      dispatch(TogglePassengerStatus(data._id.toString(), newStatus) as any);
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
          {hasPermissionToDeleteFlight(user?.role as Role) && (
            <>
              <DropdownMenuItem onClick={onToggleStatus}>
                {data.isBlocked ? (
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
              <DropdownMenuItem onClick={() => setOpen(true)}>
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
