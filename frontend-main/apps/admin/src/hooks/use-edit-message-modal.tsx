import { create } from 'zustand';

interface useEditMessageModalStore {
    isOpen: boolean;
    onOpen: (defaultValues: { id: string }) => void;
    onClose: () => void;
    defaultValues: {
        id: string;
    };
}

export const useEditMessageModal = create<useEditMessageModalStore>((set) => ({
    isOpen: false,
    onOpen: (defaultValues) => set({ isOpen: true, defaultValues }),
    onClose: () => set({ isOpen: false }),
    defaultValues: {
        id: '-1',
    },
}));
