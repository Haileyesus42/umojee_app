import { Archive, MoreHorizontal, SquarePen, X } from 'lucide-react';
import { useState } from 'react';
import { AlertModal } from '../../../common/modals/alert-modal';
import { Button } from '../../../common/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../../common/ui/dropdown-menu';
import {
  archiveFlight,
  cancelFlight,
  deleteFlight,
} from '../../../store/flight/flight-extra';
import { Flight } from '../../../interface/flight';
import {
  hasPermissionToArchiveFlight,
  hasPermissionToCancelFlight,
  hasPermissionToDeleteFlight,
  hasPermissionToModifyFlight,
} from '../../../utils/permissions';
import { Role } from '../../../constants/enum';
import { useAppDispatch, useAppSelector } from '../../../store';
import { flightCellActionsSelector } from '../../../store/flight/selectors';
import {
  updateSelectedFlight,
  updateShowFlightFormModal,
} from '../../../store/flight/flight-slice';
import { Loader } from '../../../common/ui/loader';
import toast from 'react-hot-toast';

export const CellAction = ({ data }: { readonly data: Flight }) => {
  const {
    isDeletingFlight,
    isArchivingFlight,
    selectedFlight,
    user,
    isDeletingAllFlights,
  } = useAppSelector(flightCellActionsSelector);
  const [confirm, setConfirm] = useState(false);
  const dispatch = useAppDispatch();
  const [openCancel, setOpenCancel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openArchive, setOpenArchive] = useState(false);

  const onDelete = () => {
    setConfirm(false);
    user && dispatch(deleteFlight(data._id));
  };

  const onArchive = () => {
    try {
      setLoading(true);
      setOpenArchive(false);
      user && dispatch(archiveFlight(data._id));
    } catch (error) {
      toast.error('Something went wrong!');
    } finally {
      setLoading(false);
      setOpenArchive(false);
    }
  };

  const onCancel = async () => {
    try {
      setLoading(true);
      await dispatch(cancelFlight(data._id.toString()) as any);
    } catch (error) {
      toast.error('Something went wrong!');
    } finally {
      setLoading(false);
      setOpenArchive(false);
    }
  };
  return isDeletingAllFlights ||
    (selectedFlight?._id === data._id &&
      (isArchivingFlight || isDeletingFlight)) ? (
    <Loader color="#000" size={15} />
  ) : (
    <>
      <AlertModal
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={onDelete}
        loading={isDeletingFlight}
      />
      <AlertModal
        isOpen={openCancel}
        onClose={() => setOpenCancel(false)}
        onConfirm={onCancel}
        loading={loading}
      />
      <AlertModal
        isOpen={openArchive}
        onClose={() => setOpenArchive(false)}
        onConfirm={onArchive}
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
            <DropdownMenuItem
              onClick={() => {
                dispatch(updateSelectedFlight(data));
                dispatch(updateShowFlightFormModal(true));
              }}
              className="cursor-pointer"
            >
              <SquarePen className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {hasPermissionToArchiveFlight(user?.role as Role) && (
            <DropdownMenuItem
              onClick={() => setOpenArchive(true)}
              className="cursor-pointer"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          )}
          {hasPermissionToDeleteFlight(user?.role as Role) && (
            <DropdownMenuItem
              onClick={() => setConfirm(true)}
              className="cursor-pointer"
            >
              <SquarePen className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
          {hasPermissionToCancelFlight(user?.role as Role) && (
            <DropdownMenuItem
              onClick={() => setOpenCancel(true)}
              className="cursor-pointer"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
