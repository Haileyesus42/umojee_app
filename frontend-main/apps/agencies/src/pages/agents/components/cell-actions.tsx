
import { Check, Edit, MoreHorizontal, Trash, X } from 'lucide-react';
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
import { Agents } from '../../../constants/interface/agents';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../store';
import { userSelector } from '../../../store/setting/selectors';
import {
  deleteAgentData,
  disableAgent,
  enableAgent,
} from '../../../store/agents/agents-extra';
import {
  hasManagerRole,
  hasSuperAdminRole,
  hasSupervisorRole,
} from '../../../utils/support2';
import { Role } from '../../../constants/enum';
// import { useNavigate } from 'react-router-dom';
import { useEditAgentModal } from '../../../hooks/use-edit-agent-modal';

export const CellAction: React.FC<{
  data: Agents;
}> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openDisable, setOpenDisable] = useState(false);
  const [openEnable, setOpenEnable] = useState(false);

  const dispatch = useDispatch();
  // const navigate = useNavigate();
  const user = useAppSelector(userSelector);
  const editAgentModal = useEditAgentModal();

  const onDelete = async () => {
    try {
      setLoading(true);
      dispatch(deleteAgentData(data._id.toString()) as any);
    } catch (error) {
      toast.error('Something went wrong!');
    } finally {
      setLoading(false);
      setOpenDelete(false);
    }
  };
  const onDisable = async () => {
    try {
      setLoading(true);
      dispatch(disableAgent(data._id.toString()) as any);
    } catch (error) {
      toast.error('Something went wrong!');
    } finally {
      setLoading(false);
      setOpenDisable(false);
    }
  };
  const onEnable = async () => {
    try {
      setLoading(true);
      dispatch(enableAgent(data._id.toString()) as any);
    } catch (error) {
      toast.error('Something went wrong!');
    } finally {
      setLoading(false);
      setOpenEnable(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={openDelete}
        onClose={() => setOpenDelete(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <AlertModal
        isOpen={openDisable}
        onClose={() => setOpenDisable(false)}
        onConfirm={onDisable}
        loading={loading}
      />
      <AlertModal
        isOpen={openEnable}
        onClose={() => setOpenEnable(false)}
        onConfirm={onEnable}
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
          {(hasSuperAdminRole(user?.role as Role) ||
            hasManagerRole(user?.role as Role) ||
            hasSupervisorRole(user?.role as Role)) && (
              <DropdownMenuItem onClick={() => editAgentModal.onOpen(data)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
          {(hasSuperAdminRole(user?.role as Role) ||
            hasManagerRole(user?.role as Role) ||
            hasSupervisorRole(user?.role as Role)) &&
            (data.agentsStatus === 'Active' ? (
              <DropdownMenuItem onClick={() => setOpenDisable(true)}>
                <X className="mr-2 h-4 w-4" />
                Disable
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setOpenEnable(true)}>
                <Check className="mr-2 h-4 w-4" />
                Enable
              </DropdownMenuItem>
            ))}
          {hasSuperAdminRole(user?.role as Role) && (
            <DropdownMenuItem onClick={() => setOpenDelete(true)}>
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
