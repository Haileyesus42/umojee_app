import { PropsWithChildren, useContext, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { SelectedFlightContext } from '..';
import FlightDetailFeatures from './FlightDetailFeatures';
import FlightDetailActions from './FlightDetailActions';
import { TRIP } from '../../../../../constants/general';
import NewBooking from './NewBooking';

export const initFlightInfo = {
  passengers: [{ id: uuid(), title: '', firstName: '', lastName: '' }],
  seatNumber: '',
  tripType: TRIP.ONE_WAY,
  totalBaggages: 0,
  showProceedContents: false,
  returnFlightId: '',
  email: '',
};

const Wrapper = ({ children }: PropsWithChildren<object>) => (
  <div className="flex flex-col gap-14 p-6 bg-gray-100 shadow-md rounded-md mt-4">
    {children}
  </div>
);

const FlightDetails = () => {
  const flight = useContext(SelectedFlightContext);
  const [passengerInfo, setPassengerInfo] = useState(initFlightInfo);

  useEffect(() => {
    setPassengerInfo({ ...initFlightInfo, showProceedContents: false });
  }, [flight]);

  useEffect(() => {
    if (passengerInfo.passengers.length > (flight?.seatsLeft ?? 0)) {
      setPassengerInfo((prev) => ({ ...prev, returnFlightId: '' }));
    }
  }, [passengerInfo.passengers]);

  return (
    <Wrapper>
      <FlightDetailFeatures
        showProceedContents={passengerInfo.showProceedContents}
        setPassengerInfo={setPassengerInfo}
      />
      {passengerInfo.showProceedContents && (
        <>
          <NewBooking
            passengerInfo={passengerInfo}
            setPassengerInfo={setPassengerInfo}
          />
          <FlightDetailActions passengerInfo={passengerInfo} />
        </>
      )}
    </Wrapper>
  );
};

export default FlightDetails;
