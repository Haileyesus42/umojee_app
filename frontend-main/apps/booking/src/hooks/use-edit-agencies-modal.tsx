// import { create } from 'zustand';
// import { EditAgenciesProps } from '../types/types';

// interface useEditAgenciesModalStore {
//   isOpen: boolean;
//   onOpen: (defaultValues: EditAgenciesProps) => void;
//   onClose: () => void;
//   defaultValues: EditAgenciesProps;
// }

// export const useEditAgenciesModal = create<useEditAgenciesModalStore>((set) => ({
//   isOpen: false,
//   onOpen: (defaultValues) => set({ isOpen: true, defaultValues }),
//   onClose: () => set({ isOpen: false }),
//   defaultValues: {
//     id: -1,
//     passengerName: '',
//     flightNumber: '',
//     airline: '',
//     departureAirport: '',
//     arrivalAirport: '',
//     departureTime: '',
//     arrivalTime: '',
//     agenciesStatus: '',
//     seatNumber: '',
//     totalPeoples: 1
//   },
// }));
