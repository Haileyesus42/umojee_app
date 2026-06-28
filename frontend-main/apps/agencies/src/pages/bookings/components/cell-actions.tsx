import { differenceInMinutes } from 'date-fns';
import { DollarSign, MoreHorizontal, SquarePen, Trash } from 'lucide-react';
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
import { Loader } from '../../../common/ui/loader';
import { Textarea } from '../../../common/ui/textarea';
import { Role } from '../../../constants/enum';
import { BOOKING_STATUS } from '../../../constants/general';
import { useCheckInModal } from '../../../hooks/use-check-in-modal';
import { useEditLuggageModal } from '../../../hooks/use-edit-luggage-modal';
import { useEditPassengersModal } from '../../../hooks/use-edit-passengers-modal';
import { Booking } from '../../../interface/booking';
import { useAppDispatch, useAppSelector } from '../../../store';
import { deleteBookingData } from '../../../store/booking/booking-extra';
import { updateSelectedBooking } from '../../../store/booking/booking-slice';
import { bookingCellActionsSelector } from '../../../store/flight/selectors';
import { requestRefund } from '../../../store/refund/extra';
import {
  hasPermissionToDeleteBookedFlight,
  hasPermissionToModifyFlight,
  hasPermissionToRequestRefund,
} from '../../../utils/permissions';

const INITIAL_CONFIRM_STATE = { action: '', show: false, reason: '' };

export const CellAction = ({ data }: { data: Booking }) => {
  const dispatch = useAppDispatch();
  const { user, isRequestingRefund, selectedBooking } = useAppSelector(
    bookingCellActionsSelector,
  );

  const [confirm, setConfirm] = useState(INITIAL_CONFIRM_STATE);

  const editPassengersModal = useEditPassengersModal();
  const editLuggageModal = useEditLuggageModal();
  const checkinModal = useCheckInModal();

  const canModifyBooking = hasPermissionToModifyFlight(user?.role as Role);
  const canDeleteBooking = hasPermissionToDeleteBookedFlight(
    user?.role as Role,
  );
  const canRequestRefund = hasPermissionToRequestRefund(user?.role as Role);

  const departureTime = parseDate(data.departureTime);
  const isBeforeOneHour = isDepartureNotWithinNextHour(departureTime);

  function parseDate(dateString: string): Date | null {
    try {
      const cleanedDate = dateString.replace(/(th|st|nd|rd)/, '');
      const parsedDate = new Date(cleanedDate);
      return isNaN(parsedDate.getTime()) ? null : parsedDate;
    } catch {
      console.error('Invalid Date Format', dateString);
      return null;
    }
  }

  function isDepartureNotWithinNextHour(departureTime: Date | null): boolean {
    if (!departureTime) return false;
    const currentTime = new Date();
    const minutesDifference = differenceInMinutes(departureTime, currentTime);
    return minutesDifference > 60;
  }

  function handleConfirm() {
    dispatch(updateSelectedBooking(data));
    switch (confirm.action) {
      case 'delete':
        dispatch(deleteBookingData(data._id.toString()));
        break;
      case 'refund':
        dispatch(
          requestRefund({
            bookingId: data._id,
            userId: JSON.stringify(user),
            reason: confirm.reason,
          }),
        );
        break;
      default:
        console.log('Invalid action');
    }
    setConfirm(INITIAL_CONFIRM_STATE);
  }

  function handleEditAction(
    action: (booking: { id: string }) => void,
    bookingData: Booking,
  ) {
    if (isBeforeOneHour) {
      action({ id: bookingData._id });
    }
  }

  function renderDropdownItems() {
    return (
      <>
        {data.status === BOOKING_STATUS.TICKETED &&
          isBeforeOneHour &&
          canModifyBooking && (
            <>
              <DropdownMenuItem
                onClick={() =>
                  handleEditAction(editPassengersModal.onOpen, data)
                }
              >
                <SquarePen className="mr-2 h-4 w-4" />
                Edit Passengers
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleEditAction(editLuggageModal.onOpen, data)}
              >
                <SquarePen className="mr-2 h-4 w-4" />
                Edit Luggage
              </DropdownMenuItem>
            </>
          )}
        {data.status === BOOKING_STATUS.TICKETED && isBeforeOneHour && (
          <DropdownMenuItem
            onClick={() => handleEditAction(checkinModal.onOpen, data)}
          >
            <SquarePen className="mr-2 h-4 w-4" />
            CheckIn
          </DropdownMenuItem>
        )}
        {canDeleteBooking && (
          <DropdownMenuItem
            onClick={() =>
              setConfirm({ action: 'delete', show: true, reason: '' })
            }
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
        {data.status === BOOKING_STATUS.TICKETED && canRequestRefund && (
          <DropdownMenuItem
            onClick={() =>
              setConfirm({ action: 'refund', show: true, reason: '' })
            }
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Refund
          </DropdownMenuItem>
        )}
      </>
    );
  }

  return selectedBooking?._id === data._id && isRequestingRefund ? (
    <Loader color="#000" size={15} />
  ) : (
    <>
      <AlertModal
        isOpen={confirm.show}
        onClose={() => setConfirm(INITIAL_CONFIRM_STATE)}
        onConfirm={handleConfirm}
        content={
          confirm.action === 'refund' ? (
            <Textarea
              value={confirm.reason}
              onChange={({ target: { value: reason } }) =>
                setConfirm((prev) => ({ ...prev, reason }))
              }
            />
          ) : undefined
        }
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
          {renderDropdownItems()}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
