import { create } from 'zustand';
import { ViewAnnouncementProps } from '../types/types';

interface useViewAnnouncementModalStore {
  isOpen: boolean;
  onOpen: (defaultValues: ViewAnnouncementProps) => void;
  onClose: () => void;
  defaultValues: ViewAnnouncementProps;
}

export const useViewAnnouncementModal = create<useViewAnnouncementModalStore>(
  (set) => ({
    isOpen: false,
    onOpen: (defaultValues) => set({ isOpen: true, defaultValues }),
    onClose: () => set({ isOpen: false }),
    defaultValues: {
      id: -1,
      anncName: '',
      anncEmail: '',
      anncPhone: '',
      anncRole: '',
      anncStatus: '',
    },
  }),
);
