import { create } from 'zustand';
import { EditBookingProps } from '../types/types';

interface useEditBookingModalStore {
  isOpen: boolean;
  onOpen: (defaultValues: EditBookingProps) => void;
  onClose: () => void;
  defaultValues: EditBookingProps;
}

export const useEditBookingModal = create<useEditBookingModalStore>((set) => ({
  isOpen: false,
  onOpen: (defaultValues) => set({ isOpen: true, defaultValues }),
  onClose: () => set({ isOpen: false }),
  defaultValues: {
    id: "-1",
    passengerName: '',
    flightNumber: '',
    airline: '',
    departureAirport: '',
    arrivalAirport: '',
    departureTime: '',
    arrivalTime: '',
    bookingStatus: '',
    seatNumber: '',
  },
}));
