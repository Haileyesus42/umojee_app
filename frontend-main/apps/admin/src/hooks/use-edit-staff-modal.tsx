import { create } from 'zustand';
import { AddStaff } from '../types/types';

interface useEditStaffModalStore {
  isOpen: boolean;
  defaultValues: Partial<AddStaff> | null;
  onOpen: (defaultValues?: Partial<AddStaff> | null) => void;
  onClose: () => void;
}

export const useEditStaffModal = create<useEditStaffModalStore>((set) => ({
  isOpen: false,
  defaultValues: null,
  onOpen: (defaultValues = null) => set({ isOpen: true, defaultValues }),
  onClose: () => set({ isOpen: false }),
}));
