import { ArrowUpDown, Divide } from 'lucide-react';
import { Button } from '../../common/ui/button';
import { formatTime } from '../../lib/utils';
import LineWithCircles from '../LineWithCircle';
// import { bookingsData } from '../../common/data/data';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { AllBookingsType } from '../../types/types';

function mergeByFlightDetails(flights: AllBookingsType[]) {
  const flightMap = new Map();

  flights.forEach((flight) => {
    const {
      departureTime,
      totalPassengers,
      arrivalTime,
      arrivalAirport,
      departureAirport,
      departureAirportAcronym,
      arrivalAirportAcronym,
    } = flight;

    // Create a unique key based on departureTime, arrivalAirport, and departureAirport
    const key = `${departureTime}-${arrivalAirport}-${departureAirport}`;

    if (flightMap.has(key)) {
      // If the key exists, merge the total passengers and ensure other fields match
      const existingFlight = flightMap.get(key);
      existingFlight.totalPassengers += totalPassengers;
      flightMap.set(key, existingFlight);
    } else {
      // If the key does not exist, store the flight in the map
      flightMap.set(key, {
        departureTime,
        arrivalTime,
        arrivalAirport,
        departureAirport,
        departureAirportAcronym,
        arrivalAirportAcronym,
        totalPassengers,
      });
    }
  });

  // Convert the map back to an array of objects
  const mergedFlights = Array.from(flightMap.values());

  return mergedFlights;
}

const AllBooking = () => {
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const data = useSelector((state: any) => state.dashboard.allBookingList);

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle sort order if the same field is clicked again
      setSortOrder((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedData = [...mergeByFlightDetails(data)].sort((a, b) => {
    if (sortField === 'departureTime') {
      const dateA = new Date(a.departureTime).getTime();
      const dateB = new Date(b.departureTime).getTime();
      return sortOrder === 'asc' ? dateB - dateA : dateA - dateB;
    } else if (sortField === 'totalPassengers') {
      return sortOrder === 'asc'
        ? b.totalPassengers - a.totalPassengers
        : a.totalPassengers - b.totalPassengers;
    }
    return 0; // No sorting by default
  });

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark sm:px-7.5 xl:pb-1">
      <div className="flex justify-between">
        <div className="flex flex-col">
          <p className=" text-lg font-semibold text-black dark:text-white">
            All Bookings
          </p>
          <p className="text-sm text-muted-foreground">
            List of all flight bookings
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            className="bg-picton-blue-100 hover:bg-picton-blue-200 border-none dark:bg-slate-700"
            variant="outline"
            onClick={() => handleSort('departureTime')}
            disabled={data.length === 0}
          >
            Departure Date
            <ArrowUpDown className="h-4 w-4 ml-1" />
          </Button>
          <Button
            className="bg-picton-blue-100 hover:bg-picton-blue-200 border-none dark:bg-slate-700"
            variant="outline"
            onClick={() => handleSort('totalPassengers')}
            disabled={data.length === 0}
          >
            Total Passengers
            <ArrowUpDown className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="grid grid-cols-3 rounded-sm sm:grid-cols-5">
          <div className="col-span-3 p-2.5 xl:p-5">
            <h5 className="text-sm font-medium text-left align-middle text-muted-foreground uppercase xsm:text-base">
              Destination
            </h5>
          </div>
          <div className="col-span-1 p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium text-left align-middle text-muted-foreground uppercase xsm:text-base">
              Date
            </h5>
          </div>
          <div className="col-span-1 p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium text-left align-middle text-muted-foreground uppercase xsm:text-base">
              Passengers
            </h5>
          </div>
        </div>
        <div className="h-[300px] overflow-y-scroll overflow-x-hidden">
          {data && data.length > 0 ? (
            sortedData.map((booking, key) => (
              <div
                className={`grid grid-cols-3 sm:grid-cols-5 ${
                  key === sortedData.length - 1
                    ? ''
                    : 'border-b border-stroke dark:border-strokedark'
                }`}
                key={key}
              >
                <div className="flex items-center gap-3 px-1 py-5 mr-5">
                  <div className="flex-shrink-0 bg-picton-blue-500 rounded-full ring-1">
                    <img
                      src="../images/plane.webp"
                      className="w-10 h-10"
                      alt="booking"
                    />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-black dark:text-white font-bold py-0">
                      {formatTime(booking.departureTime).time}
                    </p>
                    <span className="font-light text-xs text-muted-foreground leading-[10px]">
                      {booking.departureAirport}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center py-5 ml-6 mt-7">
                  <LineWithCircles />
                  <div className="flex justify-between w-full">
                    <span className="ml-[-0.2rem] text-[10px] font-light leading-7 uppercase">
                      {booking.departureAirportAcronym}
                    </span>
                    <span className="mr-[-0.1rem] text-[10px] font-light leading-7 uppercase">
                      {booking.arrivalAirportAcronym}
                    </span>
                  </div>
                </div>

                <div className="sm:flex items-center justify-center px-2 py-5">
                  <div className="flex flex-col">
                    <p className="text-black dark:text-white font-bold py-0">
                      {formatTime(booking.arrivalTime).time}
                    </p>
                    <span className="font-light text-xs text-muted-foreground leading-[10px]">
                      {booking.arrivalAirport}
                    </span>
                  </div>
                </div>

                <div className="items-center justify-center sm:flex px-2 py-5">
                  <p className="text-muted-foreground text-sm font-medium dark:text-white">
                    {formatTime(booking.departureTime).date}
                  </p>
                </div>

                <div className="items-center justify-center px-2 py-5 sm:flex">
                  <p className="flex items-center justify-center bg-picton-blue-100 text-picton-blue-500 rounded-full w-10 h-10 text-xs">
                    {booking.totalPassengers}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex justify-center items-center h-full">
              No data is available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllBooking;
