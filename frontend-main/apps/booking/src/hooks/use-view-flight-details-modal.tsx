import { create } from "zustand";

interface useViewFlightDetailsModalStore {
  isOpen: boolean;
  onOpen: (flightId: string) => void;
  onClose: () => void;
  flightId: string;
}

export const useViewFlightDetailsModal = create<useViewFlightDetailsModalStore>(
  (set) => ({
    isOpen: false,
    onOpen: (flightId) => set({ isOpen: true, flightId }),
    onClose: () => set({ isOpen: false }),
    flightId: "",
  })
);
