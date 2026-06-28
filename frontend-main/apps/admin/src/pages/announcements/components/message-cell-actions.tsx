import { Edit, MoreHorizontal, Trash } from 'lucide-react';
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
import { Role } from '../../../constants/enum';
import { AnnouncementTemplate } from '../../../constants/interface/announcements';
import { useEditMessageModal } from '../../../hooks/use-edit-message-modal';
import { useAppDispatch, useAppSelector } from '../../../store';
import { deleteTemplate } from '../../../store/announcements/templates-extra';
import { userSelector } from '../../../store/setting/selectors';
import { hasSuperAdminRole } from '../../../utils/permissions';

interface CellActionProps {
  data: AnnouncementTemplate;
}
export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();
  const user = useAppSelector(userSelector);

  const editMessageModal = useEditMessageModal();

  const onDelete = async () => {
    try {
      setLoading(true);
      dispatch(deleteTemplate(data.id.toString()));
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const handleEditMessage = (data: AnnouncementTemplate) => {
    editMessageModal.onOpen({
      id: data.id,
    });
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
        {hasSuperAdminRole(user?.role as Role) && (
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>

            <DropdownMenuItem onClick={() => handleEditMessage(data)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    </>
  );
};
