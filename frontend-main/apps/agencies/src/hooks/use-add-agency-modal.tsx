import { create } from 'zustand';
import { Agenciees } from '../constants/interface/agencies';

interface useAddAgencyModalStore {
  isOpen: boolean;
  defaultValues: Partial<Agenciees> | null;
  onOpen: (defaultValues?: Partial<Agenciees> | null) => void;
  onClose: () => void;
}

export const useAddAgencyModal = create<useAddAgencyModalStore>((set) => ({
  isOpen: false,
  defaultValues: null,
  onOpen: (defaultValues = null) => set({ isOpen: true, defaultValues }),
  onClose: () => set({ isOpen: false }),
}));
