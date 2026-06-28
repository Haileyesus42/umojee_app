import { useContext, useState } from 'react';
import DateRangePicker from '../../../../../components/DateRangePicker';
import moment from 'moment';
import { SelectedFlightContext } from '..';
import { useAppDispatch, useAppSelector } from '../../../../../store';
import { Button } from '../../../../../common/ui/button';
import { searchReturnFlights } from '../../../../../store/flight/flight-extra';
import { returnFlightsSelector } from '../../../../../store/booking/selectors';
import { CircleDotDashedIcon } from 'lucide-react';
import { Input } from '../../../../../common/ui/input';
import { initFlightInfo } from '.';
import toast from 'react-hot-toast';

const ReturnFlights = ({
  passengerInfo,
  handleReturnFlightSelection,
}: {
  passengerInfo: typeof initFlightInfo;
  handleReturnFlightSelection: (arg1: boolean, arg2: string) => void;
}) => {
  const dispatch = useAppDispatch();
  const { isSearchingReturnFlights, returnFlights } = useAppSelector(
    returnFlightsSelector,
  );
  const flight = useContext(SelectedFlightContext);
  const [returnFlightStartDate, setReturnFlightStartDate] = useState(
    moment(flight?.arrivalTime).toDate(),
  );
  const [returnFlightEndDate, setReturnFlightEndDate] = useState(
    moment(flight?.arrivalTime).toDate(),
  );

  return (
    <div className="w-2/5 flex flex-col items-center bg-gray-100 rounded-md shadow-inner relative">
      <small className="absolute bottom-full z-10 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs rounded-t bg-blue-500 text-white font-bold">
        Return Flights
      </small>
      <div className="w-full flex items-center gap-4 bg-gray-50 rounded">
        <DateRangePicker
          placeholder="Select dates"
          selectedDate={returnFlightStartDate}
          endDate={returnFlightEndDate}
          minDate={moment(flight?.arrivalTime).toDate()}
          setSelectedDate={setReturnFlightStartDate}
          setEndDate={setReturnFlightEndDate}
        />
        <Button
          disabled={!returnFlightStartDate || !returnFlightEndDate}
          onClick={() =>
            dispatch(
              searchReturnFlights({
                startDate: returnFlightStartDate.toISOString(),
                endDate: returnFlightEndDate.toISOString(),
              }),
            )
          }
          size={'sm'}
          className="text-xs mr-2"
        >
          {isSearchingReturnFlights ? (
            <CircleDotDashedIcon className="animate-spin" />
          ) : (
            'Search Flights'
          )}
        </Button>
      </div>
      <div className="w-full h-60 flex flex-col gap-2 p-4 overflow-y-auto scrollbar-thin">
        {returnFlights?.map((returnFlight) => (
          <div key={returnFlight._id} className="w-full flex gap-2">
            <Input
              checked={returnFlights
                .map((f) => f._id)
                .includes(passengerInfo?.returnFlightId ?? '')}
              onChange={({ target: { checked } }) =>
                passengerInfo.passengers.length > returnFlight.seatsLeft
                  ? toast.error('Not enough seats available')
                  : handleReturnFlightSelection(checked, returnFlight._id)
              }
              className="w-5 h-5 cursor-pointer"
              type="checkbox"
            />
            <div className="w-full flex flex-col gap-1 bg-blue-600 text-white rounded-md px-3 py-1.5 shadow">
              <p className="text-sm italic font-medium">
                Departure
                <span className="ml-4 font-bold not-italic">
                  {moment(returnFlight.departureTime).format(
                    'MMM Do, YYYY hh:mm a',
                  )}
                </span>
              </p>
              <p className="text-sm italic font-medium">
                Arrival
                <span className="ml-9 font-bold not-italic">
                  {moment(returnFlight.arrivalTime).format(
                    'MMM Do, YYYY hh:mm a',
                  )}
                </span>
              </p>
              <p className="text-sm italic font-medium">
                Available Seats
                <span className="ml-4 font-bold not-italic">
                  {returnFlight.seatsLeft}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReturnFlights;
