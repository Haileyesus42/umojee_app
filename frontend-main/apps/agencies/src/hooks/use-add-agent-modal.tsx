import { create } from 'zustand';
import { AddAgent } from '../types/types';

interface useAddAgentModalStore {
  isOpen: boolean;
  defaultValues: Partial<AddAgent> | null;
  onOpen: (defaultValues?: Partial<AddAgent> | null) => void;
  onClose: () => void;
}

export const useAddAgentModal = create<useAddAgentModalStore>((set) => ({
  isOpen: false,
  defaultValues: null,
  onOpen: (defaultValues = null) => set({ isOpen: true, defaultValues }),
  onClose: () => set({ isOpen: false }),
}));
