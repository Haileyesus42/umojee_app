import { createAppSelector } from '../';

export const passengerPageSelector = createAppSelector(
  [
    (state) => state.passenger.passengerList ?? [],
    (state) => state.passenger.isFetchingPassengerList,
  ],
  (passengerList, isFetchingPassengerList) => ({
    passengerList,
    isFetchingPassengerList,
  }),
);
