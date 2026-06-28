import { Download, Plus, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddMessageModal } from '../../common/modals/addMessageModal';
import { EditMessageModal } from '../../common/modals/EditMessageModal';
import { Button } from '../../common/ui/button';
import { DataTable } from '../../common/ui/data-table';
import { Heading } from '../../common/ui/heading';
// import { Loader } from '../../common/ui/loader';
import { AnnouncementTemplate } from '../../constants/interface/announcements';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  deleteAnnouncements,
  // getAnnouncements,
  getAnnouncementsByUserId,
} from '../../store/announcements/announcement-extra';
import { announcementsPageSelector } from '../../store/announcements/announcement-selector';
import ExportMessageDataToExcel from './components/ExportMessageDataToExcel';
import Loader1 from '../../common/Loader';
import { templateColumn } from './components/templates-column';
// import Settings from '../Settings';
import { userSelector } from '../../store/setting/selectors';

const AnnouncementsPage = () => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState<boolean>(true);
  const { announcementsList, isFetchingAnnouncements } = useAppSelector(
    announcementsPageSelector,
  );
  const navigate = useNavigate();

  const archiveSelectedData = async (data: AnnouncementTemplate[]) => {
    const selectedIds = data.map((message) => message.id);
    dispatch(deleteAnnouncements(selectedIds) as any);
  };
  const user = useAppSelector(userSelector);
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await dispatch(getAnnouncementsByUserId(user));
      setLoading(false);
    };
    loadData();
  }, [dispatch]);

  const formattedAnnouncements: AnnouncementTemplate[] = announcementsList.map(
    (item: any) => ({
      id: item._id,
      templateName: item.selectedMessageData?.templateName,
      templateTitle: item.selectedMessageData?.templateTitle,
      templateBody: item.selectedMessageData?.templateBody,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }),
  );
  return loading ? (
    <Loader1 />
  ) : (
    <div>
      <EditMessageModal />
      <AddMessageModal />

      <div className="flex border-b pb-2 items-center justify-between">
        <Heading
          title={`Announcements (${formattedAnnouncements.length})`}
          description="Select announcement template and send to staff members"
        />
        <div className="flex items-center gap-4">
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-600"
            onClick={() => navigate(`/announcements/add`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Announcement
          </Button>
          <Button
            size="sm"
            className={`bg-emerald-600 hover:bg-emerald-600`}
            onClick={() =>
              ExportMessageDataToExcel('notfiltered', formattedAnnouncements)
            }
            title="disabled"
          >
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
        </div>
      </div>
      {isFetchingAnnouncements ? (
        <Loader1 />
      ) : (
        <DataTable
          searchKey="templateName"
          clickable={true}
          columns={templateColumn}
          data={formattedAnnouncements as any}
          onConfirmFunction={archiveSelectedData}
          onExport={ExportMessageDataToExcel}
          ButtonIcon={Trash}
          buttonTitle="Delete Selection"
        />
      )}
    </div>
  );
};

export default AnnouncementsPage;
