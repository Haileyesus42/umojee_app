import { createAppSelector } from '../';

export const passengerPageSelector = createAppSelector(
  [
    (state) => state.passenger.passengerList.slice(),
    (state) => state.passenger.isFetchingPassengerList,
  ],
  (passengerList, isFetchingPassengerList) => ({
    passengerList,
    isFetchingPassengerList,
  }),
);
