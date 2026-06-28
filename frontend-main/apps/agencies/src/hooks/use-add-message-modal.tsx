import { create } from 'zustand';

interface useAddMessageModalStore {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
}

export const useAddMessageModal = create<useAddMessageModalStore>((set) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
}));
