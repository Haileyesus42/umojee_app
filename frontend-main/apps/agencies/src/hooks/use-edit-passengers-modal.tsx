import { create } from 'zustand';

interface useEditPassengersModalStore {
  isOpen: boolean;
  onOpen: (defaultValues: { id: string }) => void;
  onClose: () => void;
  defaultValues: {
    id: string;
  };
}

export const useEditPassengersModal = create<useEditPassengersModalStore>((set) => ({
  isOpen: false,
  onOpen: (defaultValues) => {
    console.log('Opening modal with:', defaultValues);
    set({ isOpen: true, defaultValues });
  },

  onClose: () => set({ isOpen: false }),
  defaultValues: {
    id: '-1',
  },
}));
