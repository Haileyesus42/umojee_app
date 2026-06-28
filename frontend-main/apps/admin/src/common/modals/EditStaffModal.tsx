import { useState } from 'react';
import { useDispatch } from 'react-redux';
import StaffForm from '../../components/StaffForm';
import { useEditStaffModal } from '../../hooks/use-edit-staff-modal';
import { updateStaffData } from '../../store/staffs/staff-extra';
import { Modal } from '../ui/modal';
import { AddStaff } from '../../interface/staff';

export const EditStaffModal = () => {
  const { isOpen, onClose, defaultValues } = useEditStaffModal();
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();

  const handleSubmit = (data: AddStaff) => {
    try {
      setLoading(true);
      dispatch(updateStaffData(data) as any);
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
        title="Update Staff"
        description="Manage Staff's information"
        isOpen={isOpen}
        onClose={onClose}
        className="z-[101] w-full sm:w-[70%] h-full sm:h-[450px] mt-5"
      >
        <StaffForm
          defaultValues={
            defaultValues || { email: '', role: 'Admin', name: '' }
          }
          onSubmit={handleSubmit}
          loading={loading}
          onClose={onClose}
          buttonTitle="Update"
        />
      </Modal>
    </div>
  );
};
