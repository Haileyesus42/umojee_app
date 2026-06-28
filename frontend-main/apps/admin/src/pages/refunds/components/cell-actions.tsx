import { EyeClosedIcon } from '@radix-ui/react-icons';
import { CheckCheckIcon, MoreHorizontal, Trash } from 'lucide-react';
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
import { Loader } from '../../../common/ui/loader';
import { Role } from '../../../constants/enum';
import { BOOKING_STATUS } from '../../../constants/general';
import { Refund } from '../../../interface/refund';
import { useAppDispatch, useAppSelector } from '../../../store';
import { approveRefund, deleteRefundData } from '../../../store/refund/extra';
import { refundCellActionsSelector } from '../../../store/refund/selector';
import { updateSelectedRefund } from '../../../store/refund/slice';
import {
  hasPermissionToApproveRefund,
  hasSuperAdminRole,
} from '../../../utils/permissions';

export const CellAction = ({ data }: { data: Refund }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const { user, isApprovingRefund, selectedRefund } = useAppSelector(
    refundCellActionsSelector,
  );
  const onDelete = async () => {
    try {
      setLoading(true);
      dispatch(deleteRefundData(data._id.toString()));
    } catch (error) {
      toast.error('Something went wrong!');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return selectedRefund?._id === data._id && isApprovingRefund ? (
    <Loader color="#000" size={15} />
  ) : (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
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
          {data.status === BOOKING_STATUS.REQUEST_REFUND &&
            hasPermissionToApproveRefund(user?.role as Role) && (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    dispatch(updateSelectedRefund(data));
                    dispatch(
                      approveRefund({
                        approvedBy: data.currentUser,
                        refundId: data._id,
                        status: 'Approve',
                      }),
                    );
                  }}
                >
                  <CheckCheckIcon className="mr-2 h-4 w-4" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    dispatch(updateSelectedRefund(data));
                    dispatch(
                      approveRefund({ refundId: data._id, status: 'Cancel' }),
                    );
                  }}
                >
                  <EyeClosedIcon className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              </>
            )}
          {hasSuperAdminRole(user?.role as Role) && (
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
