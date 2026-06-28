import { useState } from 'react';
import { useCheckInModal } from '../../hooks/use-check-in-modal';
import { Modal } from '../ui/modal';
import CheckIn from '../../pages/checkin/CheckIn';

export const CheckInModal = () => {
  const { isOpen, onClose, defaultValues } = useCheckInModal();
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <Modal
        title=""
        description=""
        isOpen={isOpen}
        onClose={onClose}
        className="z-[101] w-full h-full md:w-[95%] md:h-[95%] mt-1 overflow-y-scroll"
      >
        <CheckIn />
      </Modal>
    </div>
  );
};
