import { createAppSelector } from '..';

export const bookPageSelector = createAppSelector(
  [
    (state) => state.booking.bookingsList?.slice(),
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

export const bookingFormModalSelector = createAppSelector(
  [(state) => state.flight.directFlights?.slice()],
  (directFlights) => directFlights,
);

export const searchFlightsSelector = createAppSelector(
  [(state) => state.flight.isSearchingDirectFlights],
  (isSearchingDirectFlights) => isSearchingDirectFlights,
);

export const returnFlightsSelector = createAppSelector(
  [
    (state) => state.flight.isSearchingReturnFlights,
    (state) => state.flight.returnFlights?.slice(),
  ],
  (isSearchingReturnFlights, returnFlights) => ({
    isSearchingReturnFlights,
    returnFlights,
  }),
);

export const flightDetailActionsSelector = createAppSelector(
  [
    (state) => state.flight.returnFlights?.slice(),
    (state) => state.booking.isCreatingFlightBooking,
  ],
  (returnFlights, isCreatingFlightBooking) => ({
    returnFlights,
    isCreatingFlightBooking,
  }),
);
