import { create } from 'zustand';
import { ViewAgenciesProps } from '../types/types';

interface useViewAgenciesModalStore {
  isOpen: boolean;
  onOpen: (defaultValues: ViewAgenciesProps) => void;
  onClose: () => void;
  defaultValues: ViewAgenciesProps;
}
  
export const useViewAgenciesModal = create<useViewAgenciesModalStore>((set) => ({
  isOpen: false,
  onOpen: (defaultValues) => set({ isOpen: true, defaultValues }),
  onClose: () => set({ isOpen: false }),
  defaultValues: {
    id: -1,
    agenciesName: '',
    agenciesEmail: '',
    agenciesStatus: '',
  },
}));
