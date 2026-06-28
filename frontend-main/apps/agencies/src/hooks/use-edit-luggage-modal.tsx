import { create } from 'zustand';

interface useEditLuggageModalStore {
  isOpen: boolean;
  onOpen: (defaultValues: { id: string }) => void;
  onClose: () => void;
  defaultValues: {
    id: string;
  };
}

export const useEditLuggageModal = create<useEditLuggageModalStore>((set) => ({
  isOpen: false,
  onOpen: (defaultValues) => set({ isOpen: true, defaultValues }),
  onClose: () => set({ isOpen: false }),
  defaultValues: {
    id: '-1',
  },
}));
