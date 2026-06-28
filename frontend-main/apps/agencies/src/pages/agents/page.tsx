import { format } from 'date-fns';
import { Download, Plus, Trash } from 'lucide-react';
import { useEffect } from 'react';
import { AddAgentModal } from '../../common/modals/AddAgentModal';
import { EditAgentModal } from '../../common/modals/EditAgentModal';
import { Button } from '../../common/ui/button';
import { Card } from '../../common/ui/card';
import { DataTable } from '../../common/ui/data-table';
import { Heading } from '../../common/ui/heading';
import { Loader } from '../../common/ui/loader';
import { Role } from '../../constants/enum';
import { Agents } from '../../constants/interface/agents';
import { useAddAgentModal } from '../../hooks/use-add-agent-modal';
import { useAppDispatch, useAppSelector } from '../../store';
import { deleteAgents, getAgents } from '../../store/agents/agents-extra';
import { agentsPageSelector } from '../../store/agents/selectors';
import { hasSuperAdminRole, hasSupervisorRole } from '../../utils/support2';
import { columns } from '../agents/components/columns';
import ExportAgentDataToExcel from './components/ExportAgentDataToExcel';
import { AGENTS_STATUS } from '../../constants/general';
import { getAgencyNameById } from '../../lib/utils'; 

const AgentsPage = () => {
  const dispatch = useAppDispatch();
  const { agentsList, isFetchingAgents, user } =
    useAppSelector(agentsPageSelector);

  const { onOpen } = useAddAgentModal();

  useEffect(() => {
    dispatch(getAgents() as any);
  }, []);

  const agency_name = getAgencyNameById()
  // console.log(agency_name)

  const formattedAgents: Agents[] = agentsList.map((item: any) => ({
    _id: item._id,
    agentsName: item.name,
    agentsEmail: item.email,
    agentsPhone: item.phone,
    agentsAddress: item.address,
    description: item.description,
    agentsRole: item.role,
    agentsStatus: item.active ? AGENTS_STATUS.ACTIVE : AGENTS_STATUS.BLOCKED,
    agentsAgency: agency_name,
    createdAt: format(new Date(item.createdAt || '10001'), 'MMMM do, yyyy'),
    updatedAt: format(new Date(item.updatedAt || '10001'), 'MMMM do, yyyy'),
  }));

  const deleteSelectedData = async (data: Agents[]) => {
    const ids = data.map((agents) => agents._id);
    dispatch(deleteAgents(ids));
  };

  return (
    <>
      <AddAgentModal />
      <EditAgentModal />
      <Card className="p-5">
        <div className="flex border-b pb-2 items-center justify-between">
          <Heading
            title={`Agents (${formattedAgents.length})`}
            description="Manage Agents"
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
                ExportAgentDataToExcel('notfiltered', formattedAgents)
              }
              title="disabled"
            >
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
          </div>
          {/* <Button
              size="sm"
              className={`bg-red-600 hover:bg-red-600`}
              onClick={() =>
                ExportAgentDataToExcel('notfiltered', formattedAgents)
              }
              title="disabled"
            >
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button> */}
        </div>
        {isFetchingAgents ? (
          <span className="flex h-[65vh] items-center justify-center">
            <Loader color="#000000" size={50} />
          </span>
        ) : (
          <DataTable
            searchKey="agentsName"
            clickable={true}
            columns={columns}
            data={formattedAgents}
            onConfirmFunction={deleteSelectedData}
            onExport={ExportAgentDataToExcel}
            buttonTitle="Delete Selection"
            ButtonIcon={Trash}
          />
        )}
      </Card>
    </>
  );
};

export default AgentsPage;
