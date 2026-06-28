import { create } from "zustand";

interface useVerifyUserModalStore {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
}

export const useVerifyUserModal = create<useVerifyUserModalStore>((set) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
}));
