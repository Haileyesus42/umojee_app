import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { z } from 'zod';
import { Button } from '../../common/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../common/ui/tabs';
import { useCheckInModal } from '../../hooks/use-check-in-modal';
import { bookingCheckIn } from '../../store/booking/booking-extra';
import FlightDetails from './components/FlightDetails';
import LuggageFormSection from './components/LuggageForm';
import SeatSelection from './components/SeatSelection';
import SeatSelectionPageCheckin from './components/SeatSelectionPageCheckin';
import UserInformation from './components/UserInformation';

// Defining the props for the `RenderContent` component
interface ContentProps {
  departureAirport: string;
  arrivalAirport: string;
  departureAirportAcronym: string;
  arrivalAirportAcronym: string;
  departureTime: string;
  passengers: number;
  status: string;
  seatsLeft: number;
  id: string;
  setIsEditingSeats: (value: boolean) => void;
  selectedSeatNumber: string | null;
  baggage: number;
  setBaggage: (value: number) => void;
  form: any;
  onSubmit: (data: any) => void;
  loading: boolean;
  isEditingSeats: boolean;
  handleUserInfoSubmit: (data: any) => void;
  editSeatsRef: React.RefObject<HTMLDivElement>;
  setSelectedSeatNumber: (seat: string | null) => void;
  user: {
    firstName: string;
    lastName: string;
    title: string;
  };
}

// This component renders the main check-in content for departure/return tabs
const RenderContent: React.FC<ContentProps> = ({
  departureAirport,
  arrivalAirport,
  departureAirportAcronym,
  arrivalAirportAcronym,
  departureTime,
  passengers,
  status,
  seatsLeft,
  id,
  setIsEditingSeats,
  selectedSeatNumber,
  baggage,
  setBaggage,
  form,
  onSubmit,
  loading,
  handleUserInfoSubmit,
  editSeatsRef,
  setSelectedSeatNumber,
  isEditingSeats,
  user,
}) => (
  <div className="flex flex-col">
    <div className="flex h-full w-full px-5 space-x-4">
      <div className="flex flex-col lg:w-[70%] space-y-5">
        <div className="grid xl:grid-cols-3 gap-x-2 gap-y-2">
          <div className="xl:col-span-2">
            <FlightDetails
              departureAirport={departureAirport}
              arrivalAirport={arrivalAirport}
              departureAirportAcronym={departureAirportAcronym}
              arrivalAirportAcronym={arrivalAirportAcronym}
              departureTime={departureTime}
              passengers={passengers}
              status={status}
            />
          </div>
          <div>
            <SeatSelection
              totalSeats={120}
              seatsleft={seatsLeft}
              bookingId={id}
              setIsEditingSeats={setIsEditingSeats}
              onSeatSelect={selectedSeatNumber || ''}
            />
          </div>
        </div>
        <LuggageFormSection
          baggage={baggage}
          setBaggage={setBaggage}
          baggagePrice={40} // Consider moving this to constants/config
          form={form}
          onSubmit={onSubmit}
          loading={loading}
        />
        <div className="flex justify-center py-5 px-5 space-x-5">
          <Button variant="outline" type="button">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            onClick={form.handleSubmit(onSubmit)}
            className="bg-emerald-500 hover:bg-emerald-500"
          >
            Check In
          </Button>
        </div>
      </div>
      <div className="flex-1 hidden md:block">
        <UserInformation
          bookingId={id}
          handleSubmit={handleUserInfoSubmit}
          user={user}
        />
      </div>
    </div>
    {isEditingSeats && (
      <div className="w-full" ref={editSeatsRef}>
        <SeatSelectionPageCheckin
          bookingId={id}
          setIsEditingSeats={setIsEditingSeats}
          onSeatSelect={setSelectedSeatNumber}
        />
      </div>
    )}
  </div>
);

// Define the Zod schema for form validation
const formSchema = z.object({
  id: z.string(),
  luggage: z.number().optional(),
  returnLuggage: z.number().optional(),
});

// Main CheckIn component
const CheckIn: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [baggage, setBaggage] = useState<number>(0);
  const [returnBaggage, setReturnBaggage] = useState<number>(0);
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<string | null>(
    null,
  );
  const [selectedReturnSeatNumber, setSelectedReturnSeatNumber] = useState<
    string | null
  >(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isEditingSeats, setIsEditingSeats] = useState(false);

  const dispatch = useDispatch();
  const bookings = useSelector((state: any) => state.booking.bookingsList);
  const checkModal = useCheckInModal();
  const id = checkModal.defaultValues.id;
  const booking = bookings.find((booking: any) => booking._id === id);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id,
      luggage: booking?.totalBaggages || 0,
      returnLuggage: booking?.totalBaggagesReturn || 0,
    },
  });

  const editSeatsRef = useRef<HTMLDivElement | null>(null);
  const checkInModalRef = useRef<HTMLDivElement | null>(null);
  const flightId = booking.flightId;
  // const returnFlightId = booking.returnFlightId;

  useEffect(() => {
    setBaggage(booking?.totalBaggages || 0);
    setReturnBaggage(booking?.totalBaggagesReturn || 0);
    setSelectedSeatNumber(booking?.selectedSeats);
    setSelectedReturnSeatNumber(booking?.selectedSeatsReturn);
  }, [booking]);

  useEffect(() => {
    if (isEditingSeats && editSeatsRef.current) {
      editSeatsRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (checkInModalRef.current) {
      checkInModalRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isEditingSeats]);

  const handleUserInfoSubmit = (data: any) => {
    setUserInfo(data);
  };

  const onSubmit = async (
    values: z.infer<typeof formSchema>,
    activeTab: string,
  ) => {
    setLoading(true);
    try {
      if (!userInfo) {
        toast.error('Please provide user information before checking in.');
        return;
      }

      const flightId =
        activeTab === 'departure'
          ? booking.flightId._id
          : booking.returnFlightId._id;
      const selectedSeatNumberToSend =
        activeTab === 'departure'
          ? selectedSeatNumber
          : selectedReturnSeatNumber;
      const luggageToSend = activeTab === 'departure' ? baggage : returnBaggage;

      const payload = {
        bookingId: id,
        flightId, // Conditionally set based on the active tab
        selectedSeatNumber: selectedSeatNumberToSend,
        luggage: luggageToSend,
        ...userInfo,
      };

      await dispatch(bookingCheckIn(payload) as any);
      form.reset();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="departure">
      <TabsList className="px-5 space-x-4 bg-transparent dark:bg-slate-700 h-16">
        <TabsTrigger
          value="departure"
          className="border-b-4 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-500"
        >
          Departure
        </TabsTrigger>
        {booking.returnFlightId && (
          <TabsTrigger
            value="return"
            className="border-b-4 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-500"
          >
            Return
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="departure" ref={checkInModalRef}>
        <RenderContent
          departureAirport={booking.flightId.departureAirport}
          arrivalAirport={booking.flightId.arrivalAirport}
          departureAirportAcronym={booking.flightId.departureAirportAcronym}
          arrivalAirportAcronym={booking.flightId.arrivalAirportAcronym}
          departureTime={booking.flightId.departureTime}
          passengers={booking.passengers.length}
          status={booking.status}
          seatsLeft={booking.seatsLeft}
          id={booking._id}
          baggage={baggage}
          setBaggage={setBaggage}
          form={form}
          onSubmit={() => onSubmit(form.getValues(), 'departure')}
          loading={loading}
          selectedSeatNumber={selectedSeatNumber}
          setIsEditingSeats={setIsEditingSeats}
          isEditingSeats={isEditingSeats}
          editSeatsRef={editSeatsRef}
          setSelectedSeatNumber={setSelectedSeatNumber}
          handleUserInfoSubmit={handleUserInfoSubmit}
          user={booking.passengers[0]}
        />
      </TabsContent>

      {booking.returnFlightId && (
        <TabsContent value="return" ref={checkInModalRef}>
          <RenderContent
            departureAirport={booking.returnFlightId.departureAirport}
            arrivalAirport={booking.returnFlightId.arrivalAirport}
            departureAirportAcronym={
              booking.returnFlightId.departureAirportAcronym
            }
            arrivalAirportAcronym={booking.returnFlightId.arrivalAirportAcronym}
            departureTime={booking.returnFlightId.departureTime}
            passengers={booking.passengers.length}
            status={booking.status}
            seatsLeft={booking.seatsLeft}
            id={booking._id}
            baggage={returnBaggage}
            setBaggage={setReturnBaggage}
            form={form}
            onSubmit={() => onSubmit(form.getValues(), 'return')}
            loading={loading}
            selectedSeatNumber={selectedReturnSeatNumber}
            setIsEditingSeats={setIsEditingSeats}
            isEditingSeats={isEditingSeats}
            editSeatsRef={editSeatsRef}
            setSelectedSeatNumber={setSelectedReturnSeatNumber}
            handleUserInfoSubmit={handleUserInfoSubmit}
            user={booking.passengers[0]}
          />
        </TabsContent>
      )}
    </Tabs>
  );
};

export default CheckIn;
