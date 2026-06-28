import { Plane } from 'lucide-react';
import { useSelector } from 'react-redux';
import Line from '../../components/Line';
import { useViewFlightDetailsModal } from '../../hooks/use-view-flight-details-modal';
import { formatTime, getLocalStorageValue, minutesToHoursAndMinutes } from '../../lib/utils';
import { Modal } from '../ui/modal';

export const ViewFlightDetailsModal = () => {
  const viewFlightDetailsModal = useViewFlightDetailsModal();

  const flightList = useSelector(
    (state: any) => state.flight.flightList,
  );

  const flights = getLocalStorageValue('flightList')
    ? getLocalStorageValue('flightList')
    : flightList;

  const flight = flights.find(
    (data: any) => data._id === viewFlightDetailsModal.flightId,
  );
  
  return (
    <div>
      {flight && (
        <Modal
          title=""
          description=""
          isOpen={viewFlightDetailsModal.isOpen}
          onClose={viewFlightDetailsModal.onClose}
          isHeader={false}
          className="z-[101] w-full sm:w-[60%] h-full sm:h-[450px] items-start p-0 text-white"
        >
          <div className="w-full flex justify-center items-center bg-emerald-600 h-[46px]">
            <h1 className="text-white font-bold">Flight Details</h1>
          </div>
          <div className="flex flex-col  space-y-10 px-1 py-4 sm:px-5 w-full">
            <div className="rounded-lg bg-picton-blue-600 w-full p-5 flex flex-col space-y-4">
              <div className="flex space-x-2 sm:space-x-5 items-center">
                <span className="text-lg font-bold">
                  {flight.departureAirport}
                </span>
                <Plane className="w-5 h-5" />{" "}
                <span className="text-lg font-bold">
                  {flight.arrivalAirport}
                </span>
              </div>
              <div>
                {/* <span>Thursday, May 2, 2024</span> <span>9:05 AM - 10:30 AM</span> */}
                <span>{formatTime(flight.departureTime).date}</span>{" "}
                <span>
                  {formatTime(flight.departureTime).time} -{" "}
                  {formatTime(flight.arrivalTime).time}
                </span>
              </div>
              <div>
                Total travel time:{" "}
                <span className="font-bold">{minutesToHoursAndMinutes(flight.duration)}</span>
              </div>
            </div>
            <div className="rounded-lg bg-gray-100 shadow-sm w-full px-1 py-4 sm:px-5 text-black">
              <div className="grid grid-cols-1 md:grid-cols-8 gap-5 md:gap-7">
                <div className="flex flex-col space-y-3 md:col-span-2 items-center md:items-start">
                  <div>
                    <p className="text-sm py-1">{flight.departureAirport}</p>
                    <p className="font-light py-1 text-muted-foreground text-sm">
                      {formatTime(flight.departureTime).time}
                    </p>
                    <p className="font-bold text-lg">
                      {flight.departureAirportAcronym}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {formatTime(flight.departureTime).shortDate}
                    </p>
                    <p className="font-light text-xs text-muted-foreground">
                      {flight.departureAirport} Airport
                    </p>
                  </div>
                </div>
                <Line className="bg-slate-300 h-px hidden md:block" />
                <div className="flex flex-col items-center justify-center md:col-span-2">
                  <Plane />
                  <span className="text-sm">
                    <span className="font-bold">Duration: </span>
                    {minutesToHoursAndMinutes(flight.duration)}
                  </span>
                  <p className="py-2 text-muted-foreground text-sm">Flight {flight.flightNumber}</p>
                </div>
                <Line className="bg-slate-300 h-px hidden md:block" />
                <div className="flex flex-col space-y-3 md:col-span-2 items-center md:items-start">
                  <div className="md:text-right">
                    <p className="text-sm py-1">{flight.arrivalAirport}</p>
                    <p className="font-light py-1 text-muted-foreground text-sm">
                      {formatTime(flight.arrivalTime).time}
                    </p>
                    <p className="font-bold text-lg">
                      {flight.arrivalAirportAcronym}
                    </p>
                  </div>
                  <div className=" md:text-right">
                    <p className="text-sm font-semibold">
                      {formatTime(flight.arrivalTime).shortDate}
                    </p>
                    <p className="font-light text-xs text-muted-foreground">
                      {flight.arrivalAirport} Airport
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
