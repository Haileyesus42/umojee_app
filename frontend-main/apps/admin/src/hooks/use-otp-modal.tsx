import { create } from "zustand";

interface useOTPModalStore {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
}

export const useOTPModal = create<useOTPModalStore>((set) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
}));
