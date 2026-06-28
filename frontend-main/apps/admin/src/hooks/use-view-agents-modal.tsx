import { create } from 'zustand';
import { ViewAgentsProps } from '../types/types';

interface useViewAgentsModalStore {
  isOpen: boolean;
  onOpen: (defaultValues: ViewAgentsProps) => void;
  onClose: () => void;
  defaultValues: ViewAgentsProps;
}
  
export const useViewAgentsModal = create<useViewAgentsModalStore>((set) => ({
  isOpen: false,
  onOpen: (defaultValues) => set({ isOpen: true, defaultValues }),
  onClose: () => set({ isOpen: false }),
  defaultValues: {
    id: -1,
    agentsName: '',
    agentsEmail: '',
    agentsStatus: '',
  },
}));