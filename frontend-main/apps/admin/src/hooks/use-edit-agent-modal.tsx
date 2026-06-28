import { create } from 'zustand';
import { AddAgent } from '../types/types';

interface useEditAgentModalStore {
  isOpen: boolean;
  defaultValues: Partial<AddAgent> | null;
  onOpen: (defaultValues?: Partial<AddAgent> | null) => void;
  onClose: () => void;
}

export const useEditAgentModal = create<useEditAgentModalStore>((set) => ({
  isOpen: false,
  defaultValues: null,
  onOpen: (defaultValues = null) => set({ isOpen: true, defaultValues }),
  onClose: () => set({ isOpen: false }),
}));
