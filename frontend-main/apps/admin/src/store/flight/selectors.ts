import { createAppSelector } from '../';

export const flightPageSelector = createAppSelector(
  [
    (state) => state.flight.flightList.slice(),
    (state) => state.flight.isFetchingFlightList,
    (state) => state.setting.user,
    (state) => state.flight.showFlightFormModal,
    (state) => state.flight.selectedFlightIds,
    (state) => state.flight.isDeletingAllFlights,
  ],
  (
    flightList,
    isFetchingFlightList,
    user,
    showFlightFormModal,
    selectedFlightIds,
    isDeletingAllFlights,
  ) => ({
    flightList,
    isFetchingFlightList,
    user,
    showFlightFormModal,
    selectedFlightIds,
    isDeletingAllFlights,
  }),
);

export const flightCellActionsSelector = createAppSelector(
  [
    (state) => state.flight.isArchivingFlight,
    (state) => state.flight.isDeletingFlight,
    (state) => state.flight.selectedFlight,
    (state) => state.setting.user,
    (state) => state.flight.isDeletingAllFlights,
  ],
  (
    isArchivingFlight,
    isDeletingFlight,
    selectedFlight,
    user,
    isDeletingAllFlights,
  ) => ({
    isArchivingFlight,
    isDeletingFlight,
    selectedFlight,
    user,
    isDeletingAllFlights,
  }),
);

export const FlightFormModalSelector = createAppSelector(
  [
    (state) => state.flight.isCreatingFlight,
    (state) => state.flight.selectedFlight,
    (state) => state.flight.isUpdatingFlight,
  ],
  (isCreatingFlight, selectedFlight, isUpdatingFlight) => ({
    isCreatingFlight,
    selectedFlight,
    isUpdatingFlight,
  }),
);

export const flightColumnsSelector = createAppSelector(
  [
    (state) => state.flight.selectedFlightIds.slice(),
    (state) => state.flight.flightList.slice(),
    (state) => state.flight.isDeletingAllFlights,
  ],
  (selectedFlightIds, flightList, isDeletingAllFlights) => ({
    selectedFlightIds,
    flightList,
    isDeletingAllFlights,
  }),
);

export const bookingCellActionsSelector = createAppSelector(
  [
    (state) => state.setting.user,
    (state) => state.refund.isRequestingRefund,
    (state) => state.booking.selectedBooking,
  ],
  (user, isRequestingRefund, selectedBooking) => ({
    user,
    isRequestingRefund,
    selectedBooking,
  }),
);
