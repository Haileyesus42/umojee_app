import { create } from "zustand";

interface useCheckInEditPassengersModalStore {
  isOpen: boolean;
  onOpen: (defaultValues: { id: string }) => void;
  onClose: () => void;
  defaultValues: {
    id: string;
  };
}

export const useCheckInEditPassengersModal = create<useCheckInEditPassengersModalStore>((set) => ({
  isOpen: false,
  onOpen: (defaultValues) => {
    set({ isOpen: true, defaultValues });
  },

  onClose: () => set({ isOpen: false }),
  defaultValues: {
    id: '-1',
  },
}));
