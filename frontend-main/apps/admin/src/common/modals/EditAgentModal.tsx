import { useState } from 'react';
import { useDispatch } from 'react-redux';
import AgentForm from '../../components/AgentForm';
import { useEditAgentModal } from '../../hooks/use-edit-agent-modal';
// import { AddAgent } from '../../types/types';
import { Modal } from '../ui/modal';
import { updateAgentsData } from '../../store/agents/agents-extra';
import { Agents } from '../../constants/interface/agents';
import { agenciesPageSelector } from '../../store/agencies/selectors';
import { useAppSelector } from '../../store';

export const EditAgentModal = () => {
  const { isOpen, onClose, defaultValues } = useEditAgentModal();
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const { agenciesList } = useAppSelector(agenciesPageSelector);

  const handleSubmit = (data: Agents) => {
    try {
      setLoading(true);
      dispatch(updateAgentsData(data) as any);
      setLoading(false);
    } catch (error: any) {
      console.log(error);
    } finally {
      setLoading(false);
    }
    onClose();
  };

  return (
    <div>
      <Modal
        title="Update Agent"
        description="Manage Agent information"
        isOpen={isOpen}
        onClose={onClose}
        className="z-[101] w-full sm:w-[80%] h-[90%] sm:h-[600px] mt-5 overflow-y-scroll"
      >
        <AgentForm
          defaultValues={
            defaultValues || {
              agentsEmail: '',
              agentsRole: 'agent',
              agentsName: '',
              agentsAddress: '',
              agentsPhone: '',
              // agentsTeam: '',
              description: '',
              agentsStatus: 'Active',
              agentsAgency: 'Self',
            }
          }
          onSubmit={handleSubmit}
          loading={loading}
          onClose={onClose}
          buttonTitle="Update"
          agenciesList={agenciesList}
        />
      </Modal>
    </div>
  );
};
