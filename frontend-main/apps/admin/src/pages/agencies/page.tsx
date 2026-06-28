import { format } from 'date-fns';
import { Download, Plus, Trash } from 'lucide-react';
import { useEffect } from 'react';
import { AddAgencyModal } from '../../common/modals/AddAgencyModal';
import { EditAgencyModal } from '../../common/modals/EditAgencyModal';
import { Button } from '../../common/ui/button';
import { Card } from '../../common/ui/card';
import { DataTable } from '../../common/ui/data-table';
import { Heading } from '../../common/ui/heading';
import { Loader } from '../../common/ui/loader';
import { Role } from '../../constants/enum';
import { Agenciees } from '../../constants/interface/agencies';
import { useAddAgencyModal } from '../../hooks/use-add-agency-modal';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  deleteAgencies,
  getAgencies,
} from '../../store/agencies/agencies-extra';
import { agenciesPageSelector } from '../../store/agencies/selectors';
import { hasSuperAdminRole, hasSupervisorRole } from '../../utils/support2';
import { columns } from '../agencies/components/columns';
import ExportAgencyDataToExcel from './components/ExportAgencyDataToExcel';

const AgenciesPage = () => {
  const dispatch = useAppDispatch();
  const { agenciesList, isFetchingAgencies, user } =
    useAppSelector(agenciesPageSelector);

  const { onOpen } = useAddAgencyModal();

  useEffect(() => {
    dispatch(getAgencies() as any);
  }, []);

  const formattedAgencies: Agenciees[] = agenciesList.map((item: any) => ({
    _id: item._id,
    agencyName: item.agencyName,
    agencyEmail: item.agencyEmail,
    agencyPhone: item.agencyPhone,
    agencyAddress: item.agencyAddress,
    description: item.description,
    agencyStatus: item.agencyStatus,
    totalAgents: item.totalAgents,
    createdAt: format(new Date(item.createdAt || '10001'), 'MMMM do, yyyy'),
    updatedAt: format(new Date(item.updatedAt || '10001'), 'MMMM do, yyyy'),
  }));

  const deleteSelectedData = async (data: Agenciees[]) => {
    const ids = data.map((agencies) => agencies._id);
    dispatch(deleteAgencies(ids));
  };

  return (
    <>
      <AddAgencyModal />
      <EditAgencyModal />
      <Card className="p-5">
        <div className="flex border-b pb-2 items-center justify-between">
          <Heading
            title={`Agencies (${formattedAgencies.length})`}
            description="Manage Agencies"
          />

          <div className="flex items-center gap-4">
            {(hasSuperAdminRole(user?.role as Role) ||
              hasSupervisorRole(user?.role as Role)) && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-600"
                onClick={() => onOpen()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New
              </Button>
            )}
            <Button
              size="sm"
              className={`bg-emerald-600 hover:bg-emerald-600`}
              onClick={() =>
                ExportAgencyDataToExcel('notfiltered', formattedAgencies)
              }
              title="disabled"
            >
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
          </div>
        </div>
        {isFetchingAgencies ? (
          <span className="flex h-[65vh] items-center justify-center">
            <Loader color="#000000" size={50} />
          </span>
        ) : (
          <DataTable
            searchKey="agencyName"
            clickable={true}
            columns={columns}
            data={formattedAgencies}
            onConfirmFunction={deleteSelectedData}
            onExport={ExportAgencyDataToExcel}
            buttonTitle="Delete Selection"
            ButtonIcon={Trash}
          />
        )}
      </Card>
    </>
  );
};

export default AgenciesPage;
