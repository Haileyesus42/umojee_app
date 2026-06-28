import { create } from 'zustand';
import { Flight } from '../interface/flight';

interface useCheckInModalStore {
  isOpen: boolean;
  defaultValues: {
    id: string;
  };
  onOpen: (defaultValues: { id: string }) => void;
  onClose: () => void;
}

export const useCheckInModal = create<useCheckInModalStore>((set) => ({
  isOpen: false,
  defaultValues: {
    id: '-1',
  },
  onOpen: (defaultValues) => set({ isOpen: true, defaultValues }),
  onClose: () => set({ isOpen: false }),
}));
