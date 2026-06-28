import { Download, Plus, Trash } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckInModal } from '../../common/modals/CheckInModal';
import { EditLuggageModal } from '../../common/modals/EditLuggageModal';
import { EditPassengersModal } from '../../common/modals/EditPassengersModal';
import { Button } from '../../common/ui/button';
import { Card } from '../../common/ui/card';
import { DataTable } from '../../common/ui/data-table';
import { Heading } from '../../common/ui/heading';
import { Loader } from '../../common/ui/loader';
import { Role } from '../../constants/enum';
import { Booking } from '../../interface/booking';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  deleteBookings,
  getBookedFlights,
} from '../../store/booking/booking-extra';
import { bookPageSelector } from '../../store/booking/selectors';
import { hasPermissionToBookFlight } from '../../utils/permissions';
import { formatBookings } from '../../utils/support';
import { BookingFormModal } from './components/booking-form-modal';
import { bookingColumns } from './components/bookingColumns';
import ExportBookingDataToExcel from './components/ExportBookingDataToExcel';

const BookingPage = () => {
  const dispatch = useAppDispatch();
  const { user, bookingsList, isFetchingBookingList, showBookingFromModal } =
    useAppSelector(bookPageSelector);

  useEffect(() => {
    dispatch(getBookedFlights());
  }, []);

  const formattedBookings = useMemo(
    () => formatBookings(bookingsList),
    [bookingsList],
  );
  const navigate = useNavigate();
  const archiveSelectedData = async (data: Booking[]) => {
    const selectedIds = data.map((booking) => booking._id);
    dispatch(deleteBookings(selectedIds) as any);
  };

  return (
    <>
      <Card className="p-5">
        <EditPassengersModal />
        <EditLuggageModal />
        <CheckInModal />
        <div className="flex border-b pb-2 items-center justify-between">
          <Heading
            title={`Bookings ${
              isFetchingBookingList ? '' : `(${formattedBookings?.length})`
            }`}
            description="Manage Bookings"
          />
          {hasPermissionToBookFlight(user?.role as Role) && (
            <div className="flex items-center gap-4">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-600"
                onClick={() => navigate('/bookings/search/flight')}
              >
                <Plus className="h-4 w-4" />
                Add New
              </Button>
              <Button
                size="sm"
                className={`bg-emerald-600 hover:bg-emerald-600`}
                onClick={() =>
                  ExportBookingDataToExcel('notfiltered', formattedBookings)
                }
                title="disabled"
              >
                <Download className="mr-2 h-4 w-4" />
                Export All
              </Button>
            </div>
          )}
        </div>
        {isFetchingBookingList ? (
          <span className="flex h-[65vh] items-center justify-center">
            <Loader color="#000000" size={50} />
          </span>
        ) : (
          <DataTable
            searchKey="passengerName"
            clickable={true}
            columns={bookingColumns}
            data={formattedBookings}
            onConfirmFunction={archiveSelectedData}
            onExport={ExportBookingDataToExcel}
            buttonTitle="Delete Selection"
            ButtonIcon={Trash}
          />
        )}
      </Card>
      {showBookingFromModal && <BookingFormModal />}
    </>
  );
};

export default BookingPage;
