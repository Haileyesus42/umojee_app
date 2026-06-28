import { useState } from 'react';
// import { useDispatch } from 'react-redux';
import AgencyForm from '../../components/AgencyForm';
import { useEditAgencyModal } from '../../hooks/use-edit-agencies-modal';
import { Agenciees } from '../../constants/interface/agencies';
import { Modal } from '../ui/modal';
import { updateAgencyData } from '../../store/agencies/agencies-extra';
import { useAppDispatch } from '../../store';

export const EditAgencyModal = () => {
  const { isOpen, onClose, defaultValues } = useEditAgencyModal();
  const [loading, setLoading] = useState(false);

  const dispatch = useAppDispatch();

  const handleSubmit = (data: Agenciees) => {
    try {
      setLoading(true);
      dispatch(updateAgencyData(data));
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
        title="Update Agency"
        description="Manage Agency information"
        isOpen={isOpen}
        onClose={onClose}
        className="z-[101] w-full sm:w-[80%] h-[90%] sm:h-[600px] mt-5 overflow-y-scroll"
      >
        <AgencyForm
          defaultValues={
            defaultValues || {
              _id: '',
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
          buttonTitle='Update'
        />
      </Modal>
    </div>
  );
};
