import { create } from 'zustand';
import { ViewPassengerProps } from '../types/types';

interface useViewPassengerModalStore {
  isOpen: boolean;
  onOpen: (defaultValues: ViewPassengerProps) => void;
  onClose: () => void;
  defaultValues: ViewPassengerProps;
}
  
export const useViewPassengerModal = create<useViewPassengerModalStore>((set) => ({
  isOpen: false,
  onOpen: (defaultValues) => set({ isOpen: true, defaultValues }),
  onClose: () => set({ isOpen: false }),
  defaultValues: {
    id: -1,
    passengerName: '',
    passengerEmail: '',
    passengerStatus: '',
  },
}));
