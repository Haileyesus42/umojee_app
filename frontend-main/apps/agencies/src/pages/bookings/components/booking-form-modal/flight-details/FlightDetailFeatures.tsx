import { Badge } from '../../../../../common/ui/badge';
import { FLIGHT_STATUS } from '../../../../../constants/general';
import { Button } from '../../../../../common/ui/button';
import { Dispatch, SetStateAction, useContext } from 'react';
import { SelectedFlightContext } from '..';
import { initFlightInfo } from '.';

const FlightFeature = ({
  title,
  value,
}: {
  title: string;
  value?: string | number | JSX.Element;
}) => (
  <div className="w-fit flex items-center gap-2">
    <p className="font-medium italic">{`${title}:`}</p>{' '}
    <div className="font-bold">{value ?? '----'}</div>
  </div>
);

const FlightDetailFeatures = ({
  showProceedContents,
  setPassengerInfo,
}: {
  showProceedContents: boolean;
  setPassengerInfo: Dispatch<SetStateAction<typeof initFlightInfo>>;
}) => {
  const flight = useContext(SelectedFlightContext);
  return (
    <div className="w-full grid grid-cols-4 gap-2">
      <FlightFeature title="Flight Number" value={flight?.flightNumber} />
      <FlightFeature title="Airline" value={flight?.airline} />
      <FlightFeature title="Duration" value={`${flight?.duration} minutes`} />
      <FlightFeature
        title="Departure Airport"
        value={`${flight?.departureAirport} (${flight?.departureAirportAcronym})`}
      />
      <FlightFeature
        title="Arrival Airport"
        value={`${flight?.arrivalAirport} (${flight?.arrivalAirportAcronym})`}
      />
      <FlightFeature
        title="Status"
        value={
          <Badge
            variant={null}
            className={`${
              flight?.flightStatus === FLIGHT_STATUS.ON_TIME
                ? 'bg-green-500'
                : flight?.flightStatus === FLIGHT_STATUS.DELAYED
                ? 'bg-yellow-500'
                : 'bg-rose-500'
            } text-white`}
          >
            {flight?.flightStatus}
          </Badge>
        }
      />
      <FlightFeature title="Gate" value={flight?.gate} />
      <FlightFeature title="Terminal" value={flight?.terminal} />
      <FlightFeature title="Runway" value={flight?.runway} />
      <FlightFeature title="Stoppage" value={flight?.stoppageCount} />
      <FlightFeature title="Total Seats" value={flight?.TotalSeatsCapacity} />
      <FlightFeature title="Seat Left" value={flight?.seatsLeft} />
      <FlightFeature title="Currency" value={flight?.price.currency} />
      <FlightFeature title="OneWay Price" value={`$${flight?.price.oneway}`} />
      <FlightFeature
        title="Round Trip Price"
        value={`$${flight?.price.roundtrip}`}
      />
      {!showProceedContents && (
        <Button
          disabled={!flight?.seatsLeft}
          className="w-fit justify-self-center"
          onClick={() =>
            setPassengerInfo((prev) => ({
              ...prev,
              showProceedContents: true,
            }))
          }
        >
          Proceed
        </Button>
      )}
    </div>
  );
};
export default FlightDetailFeatures;
