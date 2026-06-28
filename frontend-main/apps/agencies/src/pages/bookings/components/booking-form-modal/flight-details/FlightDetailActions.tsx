import { Button } from '../../../../../common/ui/button';
import { initFlightInfo } from '.';
import { useContext, useMemo } from 'react';
import { SelectedFlightContext } from '..';
import { TRIP } from '../../../../../constants/general';
import { useAppDispatch, useAppSelector } from '../../../../../store';
import { flightDetailActionsSelector } from '../../../../../store/booking/selectors';
import { createFlightBooking } from '../../../../../store/booking/booking-extra';
import { CircleDotDashedIcon } from 'lucide-react';
import * as EmailValidator from 'email-validator';

const FlightDetailActions = ({
  passengerInfo,
}: {
  passengerInfo: typeof initFlightInfo;
}) => {
  const dispatch = useAppDispatch();
  const { returnFlights, isCreatingFlightBooking } = useAppSelector(
    flightDetailActionsSelector,
  );
  const { tripType, totalBaggages, returnFlightId, passengers, email } =
    passengerInfo;

  const flight = useContext(SelectedFlightContext);
  const shouldBookingDataValid = useMemo(() => {
    const returnFlight = returnFlights.find((f) => f._id === returnFlightId);
    const hasEnoughSeats = returnFlight
      ? passengers.length <= returnFlight.seatsLeft
      : true;
    const isPassengerInfoValid = passengers.every(
      (p) => p.title && p.firstName && p.lastName,
    );
    return (
      hasEnoughSeats && isPassengerInfoValid && EmailValidator.validate(email)
    );
  }, [passengerInfo]);

  const totalPrice = useMemo(() => {
    const tripPrice =
      passengerInfo.tripType === TRIP.ONE_WAY
        ? flight?.price.oneway
        : flight?.price.roundtrip;
    return !totalBaggages ? tripPrice : tripPrice! * totalBaggages;
  }, [totalBaggages, tripType]);

  return (
    <div className="flex items-center justify-end gap-4 -mt-5">
      <p className="w-fit h-full text-lg font-bold shadow-inner px-4 py-1 rounded-md">
        {`Total Price: $${totalPrice}`}
      </p>
      <Button
        disabled={!shouldBookingDataValid}
        onClick={() => {
          dispatch(
            createFlightBooking({
              flightId: flight?._id!,
              passengers: passengers.map(({ id, ...rest }) => ({ ...rest })),
              tripType,
              totalBaggages,
              returnFlightId,
              email,
            }),
          );
        }}
        className="w-44 shadow-md"
      >
        {isCreatingFlightBooking ? (
          <CircleDotDashedIcon className="animate-spin" />
        ) : (
          'Book'
        )}
      </Button>
    </div>
  );
};

export default FlightDetailActions;
