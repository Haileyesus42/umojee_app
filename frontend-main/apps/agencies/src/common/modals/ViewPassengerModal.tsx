import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViewPassengerModal } from '../../hooks/use-view-passenger-modal';
import Profile from '../../pages/Profile';
import { Modal } from '../ui/modal';

// const url = process.env.NEXT_PUBLIC_FRONTEND_URL;

export const ViewPassengerModal = () => {
  const viewPassengerModal = useViewPassengerModal();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  return (
    <div>
      <Modal
        title=""
        description=""
        isOpen={viewPassengerModal.isOpen}
        onClose={viewPassengerModal.onClose}
        className='z-[101] w-full sm:w-[60%] h-full sm:h-[600px] mt-5 overflow-auto'
      >
        <Profile />
      </Modal>
    </div>
  );
};
