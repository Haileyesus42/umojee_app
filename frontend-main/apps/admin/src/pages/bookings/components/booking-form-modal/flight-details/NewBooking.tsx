import { Dispatch, SetStateAction } from 'react';
import { initFlightInfo } from '.';
import { Input } from '../../../../../common/ui/input';
import { TRIP } from '../../../../../constants/general';
import { BsTrash3Fill } from 'react-icons/bs';
import { Button } from '../../../../../common/ui/button';
import ReturnFlights from './ReturnFlights';
import { v4 as uuid } from 'uuid';

type NewBookingProps = {
  passengerInfo: typeof initFlightInfo;
  setPassengerInfo: Dispatch<SetStateAction<typeof initFlightInfo>>;
};

const NewBooking = ({ passengerInfo, setPassengerInfo }: NewBookingProps) => {
  const handlePassengersDelete = (id: string) => {
    setPassengerInfo((prev) => ({
      ...prev,
      passengers: prev.passengers.filter((p) => p.id !== id),
    }));
  };

  const handleReturnFlightSelection = (checked: boolean, id: string) => {
    setPassengerInfo((prev) => ({
      ...prev,
      returnFlightId: checked ? id : '',
    }));
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className="w-full flex gap-10 relative bg-gray-50 px-6 py-10 rounded-md"
    >
      <small className="absolute -top-2 left-3 font-bold px-3 py-0.5 bg-gray-100 rounded-b-md">
        Passenger Info
      </small>
      <div className="w-1/6 flex flex-col gap-8 font-medium">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Input
              type="radio"
              className="w-5 h-5"
              defaultChecked={passengerInfo.tripType === TRIP.ONE_WAY}
              checked={passengerInfo.tripType === TRIP.ONE_WAY}
              onChange={({ target: { checked } }) => {
                checked &&
                  setPassengerInfo((prev) => ({
                    ...prev,
                    tripType: TRIP.ONE_WAY,
                  }));
              }}
            />
            <label className="text-lg" htmlFor="oneWay">
              One Way
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="radio"
              className="w-5 h-5"
              defaultChecked={passengerInfo.tripType === TRIP.ROUND_TRIP}
              checked={passengerInfo.tripType === TRIP.ROUND_TRIP}
              onChange={({ target: { checked } }) => {
                checked &&
                  setPassengerInfo((prev) => ({
                    ...prev,
                    tripType: TRIP.ROUND_TRIP,
                  }));
              }}
            />
            <label className="text-lg" htmlFor="roundTrip">
              Round Trip
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-lg">Total Baggages:</label>
          <Input
            type="number"
            min={0}
            value={passengerInfo.totalBaggages}
            onChange={({ target: { value } }) => {
              setPassengerInfo((prev) => ({
                ...prev,
                totalBaggages:
                  value && isNaN(parseInt(value)) ? 0 : parseInt(value),
              }));
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-lg">Email:</label>
          <Input
            type="email"
            value={passengerInfo.email}
            onChange={({ target: { value: email } }) => {
              setPassengerInfo((prev) => ({
                ...prev,
                email,
              }));
            }}
          />
        </div>
      </div>
      <div className="w-2/5 flex flex-col gap-2 font-medium">
        <div className="flex flex-col gap-2">
          <label className="text-lg">Passengers:</label>
          {passengerInfo.passengers.map((passenger) => (
            <div key={passenger.id} className="flex items-center gap-1">
              <Input
                className="w-1/4"
                value={passenger.title}
                onChange={({ target: { value } }) => {
                  setPassengerInfo((prev) => ({
                    ...prev,
                    passengers: prev.passengers.map((p) =>
                      p.id === passenger.id ? { ...p, title: value } : p,
                    ),
                  }));
                }}
                placeholder="Title"
              />
              <Input
                value={passenger.firstName}
                onChange={({ target: { value } }) => {
                  setPassengerInfo((prev) => ({
                    ...prev,
                    passengers: prev.passengers.map((p) =>
                      p.id === passenger.id ? { ...p, firstName: value } : p,
                    ),
                  }));
                }}
                placeholder="First Name"
              />
              <Input
                value={passenger.lastName}
                onChange={({ target: { value } }) => {
                  setPassengerInfo((prev) => ({
                    ...prev,
                    passengers: prev.passengers.map((p) =>
                      p.id === passenger.id ? { ...p, lastName: value } : p,
                    ),
                  }));
                }}
                placeholder="Last Name"
              />
              <button onClick={() => handlePassengersDelete(passenger.id)}>
                <BsTrash3Fill className="w-5 h-auto text-red-500 ml-2" />
              </button>
            </div>
          ))}
        </div>
        <Button
          onClick={() => {
            setPassengerInfo((prev) => ({
              ...prev,
              passengers: [
                ...prev.passengers,
                { id: uuid(), title: '', firstName: '', lastName: '' },
              ],
            }));
          }}
        >
          Add Passenger
        </Button>
      </div>
      <ReturnFlights
        passengerInfo={passengerInfo}
        handleReturnFlightSelection={handleReturnFlightSelection}
      />
    </form>
  );
};

export default NewBooking;
