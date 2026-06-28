import { useState } from 'react';
import { useDispatch } from 'react-redux';
import AddAgentsForm from '../../components/AddAgentsForm';
import { useAddAgentModal } from '../../hooks/use-add-agent-modal';
import { createAgentData } from '../../store/agents/agents-extra';
import { AddAgent } from '../../types/types';
import { Modal } from '../ui/modal';
import { agenciesPageSelector } from '../../store/agencies/selectors';
import { useAppSelector } from '../../store';

export const AddAgentModal = () => {
  const { isOpen, onClose, defaultValues } = useAddAgentModal();
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const { agenciesList } = useAppSelector(agenciesPageSelector);

  const handleSubmit = (data: AddAgent) => {
    try {
      setLoading(true);
      dispatch(createAgentData(data) as any);
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
        title="Create Agent"
        description="Manage Agent information"
        isOpen={isOpen}
        onClose={onClose}
        className="z-[101] w-full sm:w-[80%] h-[90%] sm:h-[600px] mt-5 overflow-y-scroll"
      >
        <AddAgentsForm
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
          buttonTitle="Add"
          agenciesList={agenciesList}
        />
      </Modal>
    </div>
  );
};
