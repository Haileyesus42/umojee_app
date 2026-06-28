import { Modal } from '../../../../common/ui/modal';
import { useAppDispatch, useAppSelector } from '../../../../store';
import { updateShowBookingFormModal } from '../../../../store/booking/booking-slice';
import SearchFlights from './SearchFlights';
import { DataTable } from '../../../../common/ui/data-table';
import { searchedFlightsColumns } from './searchedFlightsColumns';
import { bookingFormModalSelector } from '../../../../store/booking/selectors';
import FlightDetails from './flight-details';
import { createContext, useMemo, useState } from 'react';
import { Flight } from '../../../../interface/flight';

export const SelectedFlightContext = createContext<Flight | undefined>(
  undefined,
);

export const BookingFormModal = () => {
  const dispatch = useAppDispatch();
  const [selectedFlight, setSelectedFlight] = useState<Flight | undefined>();
  const directFlights = useAppSelector(bookingFormModalSelector);

  return (
    <Modal
      title="Register Booking"
      description="Register Booking available at your stock"
      isOpen={true}
      onClose={() => {
        dispatch(updateShowBookingFormModal(false));
      }}
      className="z-[100] w-[95%] min-h-[60vh] h-fit max-h-[90vh] flex flex-col gap-4 p-7 overflow-y-auto scrollbar-thin"
    >
      <SearchFlights />
      <DataTable
        searchKey="searchedFlights"
        columns={searchedFlightsColumns}
        data={directFlights ?? []}
        dataType={'searchedFlights'}
        clickable
        selectedRowId={selectedFlight?._id}
        getSelectedRow={(data) => setSelectedFlight(data)}
      />
      <SelectedFlightContext.Provider
        value={useMemo(() => selectedFlight, [selectedFlight])}
      >
        {selectedFlight && <FlightDetails />}
      </SelectedFlightContext.Provider>
    </Modal>
  );
};
