import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { NewAgency } from '../../constants/interface/agencies';
import { Modal } from '../ui/modal';
import { createAgencyData } from '../../store/agencies/agencies-extra';
import { useAddAgencyModal } from '../../hooks/use-add-agency-modal';
import AddAgencyForm from '../../components/AgencyAddForm';

export const AddAgencyModal = () => {
  const { isOpen, onClose, defaultValues } = useAddAgencyModal();
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();

  const handleSubmit = (data: NewAgency) => {
    try {
      setLoading(true);
      data.password = '12345678';
      dispatch(createAgencyData(data) as any);
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
        title="Create Agency"
        description="Manage Agency information"
        isOpen={isOpen}
        onClose={onClose}
        className="z-[101] w-full sm:w-[80%] h-[90%] sm:h-[600px] mt-5 overflow-y-scroll"
      >
        <AddAgencyForm
          defaultValues={
            defaultValues || {
              agencyName: '',
              agencyEmail: '',
              agencyPhone: '',
              agencyAddress: '',
              description: '',
              totalAgents: 0,
              agencyStatus: 'Active',
            }
          }
          onSubmit={handleSubmit}
          loading={loading}
          onClose={onClose}
          buttonTitle="Add"
        />
      </Modal>
    </div>
  );
};
