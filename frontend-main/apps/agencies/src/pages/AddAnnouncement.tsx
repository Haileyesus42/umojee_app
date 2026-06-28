import { ArrowLeft, Plus, Trash } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddMessageModal } from '../common/modals/addMessageModal';
import { EditMessageModal } from '../common/modals/EditMessageModal';
import { Button } from '../common/ui/button';
import { Card } from '../common/ui/card';
import { DataTable } from '../common/ui/data-table';
import { Heading } from '../common/ui/heading';
import { Loader } from '../common/ui/loader';
import {
  AnnouncementTemplate,
  AnnouncementUsersTypes,
} from '../constants/interface/announcements';
import { useAddMessageModal } from '../hooks/use-add-message-modal';
import { useAppDispatch, useAppSelector } from '../store';
import {
  deleteTemplates,
  getTemplates,
} from '../store/announcements/templates-extra';
import { templatesPageSelector } from '../store/announcements/templates-selector';
import { getPassengers } from '../store/passengers/passenger-extra';
import { passengerPageSelector } from '../store/passengers/selectors';
import { agentsPageSelector } from '../store/agents/selectors';
import { getAgents } from '../store/agents/agents-extra';
import Announcements from './Announcements';
import ExportMessageDataToExcel from './announcements/components/ExportMessageDataToExcel';
import { messageColumns } from './announcements/components/message-columns';

const AnnouncementsPage = () => {
  const dispatch = useAppDispatch();
  const { agentsList } = useAppSelector(agentsPageSelector);
  const { passengerList } = useAppSelector(passengerPageSelector);
  const navigate = useNavigate();
  const { templatesList, isFetchingTemplates } = useAppSelector(
    templatesPageSelector,
  );
  const addMessageModal = useAddMessageModal();

  useEffect(() => {
    dispatch(getAgents());
    dispatch(getPassengers());
    dispatch(getTemplates());
  }, [dispatch]);

  const formattedStaffs: AnnouncementUsersTypes[] = agentsList
    .filter((staff: any) => staff.active)
    .map((staff: any) => ({
      anncUserName: staff.name,
      anncUserEmail: staff.email,
      anncUserRole: staff.role,
      anncUserStatus: staff.active ? 'Active' : 'Suspended',
    }));

  const formattedPassengers: AnnouncementUsersTypes[] = passengerList
    .filter((user: any) => !user.isBlocked)
    .map((user: any) => ({
      anncUserName: user.firstName + ' ' + user.lastName,
      anncUserEmail: user.email,
      anncUserRole: 'Passenger',
      anncUserStatus: !user.isBlocked ? 'Active' : 'Suspended',
    }));

  const formattedTemplates: AnnouncementTemplate[] = templatesList.map(
    (item: any) => ({
      id: item._id,
      templateName: item.templateName,
      templateTitle: item.templateTitle,
      templateBody: item.templateBody,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }),
  );

  const archiveSelectedData = async (data: AnnouncementTemplate[]) => {
    const selectedIds = data.map((message) => message.id);
    console.log('Selected IDs:', selectedIds);
    dispatch(deleteTemplates(selectedIds) as any);
  };

  return (
    <div>
      <AddMessageModal />
      <EditMessageModal />
      <div className="flex justify-between pb-5 mx-5">
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-600"
          onClick={() => navigate(`/announcements`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-600"
          onClick={() => addMessageModal.onOpen()}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Template
        </Button>
      </div>
      <Card className="p-5 my-5">
        <Announcements
          data={[...(formattedStaffs as any), ...formattedPassengers]}
          messages={formattedTemplates}
        />
      </Card>
      <Card className="p-5">
        <Heading
          title={`Announcement Templates (${formattedTemplates.length})`}
          description="Select announcement template and send to staff members"
        />
        {isFetchingTemplates ? (
          <span className="flex h-[65vh] items-center justify-center">
            <Loader color="#000000" size={50} />
          </span>
        ) : (
          <DataTable
            searchKey="templateName"
            clickable={true}
            columns={messageColumns}
            data={formattedTemplates}
            onConfirmFunction={archiveSelectedData}
            onExport={ExportMessageDataToExcel}
            ButtonIcon={Trash}
            buttonTitle="Delete Selection"
          />
        )}
      </Card>
    </div>
  );
};

export default AnnouncementsPage;
