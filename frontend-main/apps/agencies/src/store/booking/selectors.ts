import { createAppSelector } from '..';
import type { RootState } from '..';

export const bookPageSelector = createAppSelector(
  [
    (state) => state.booking.bookingsList ?? [],
    (state) => state.setting.user,
    (state) => state.booking.isFetchingBookingList,
    (state) => state.booking.showBookingFromModal,
  ],
  (bookingsList, user, isFetchingBookingList, showBookingFromModal) => ({
    bookingsList,
    user,
    isFetchingBookingList,
    showBookingFromModal,
  }),
);

export const bookingFormModalSelector = (state: RootState) =>
  state.flight.directFlights ?? [];

export const searchFlightsSelector = (state: RootState) =>
  state.flight.isSearchingDirectFlights;

export const returnFlightsSelector = createAppSelector(
  [
    (state) => state.flight.isSearchingReturnFlights,
    (state) => state.flight.returnFlights ?? [],
  ],
  (isSearchingReturnFlights, returnFlights) => ({
    isSearchingReturnFlights,
    returnFlights,
  }),
);

export const flightDetailActionsSelector = createAppSelector(
  [
    (state) => state.flight.returnFlights ?? [],
    (state) => state.booking.isCreatingFlightBooking,
  ],
  (returnFlights, isCreatingFlightBooking) => ({
    returnFlights,
    isCreatingFlightBooking,
  }),
);
