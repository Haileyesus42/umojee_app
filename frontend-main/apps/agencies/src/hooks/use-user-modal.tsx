import { create } from "zustand";

interface useClientModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const useUserModal = create<useClientModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
