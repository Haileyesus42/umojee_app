import { create } from "zustand";

interface useAddAgenciesModalStore {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
}

export const useAddAgenciesModal = create<useAddAgenciesModalStore>((set) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
}));
