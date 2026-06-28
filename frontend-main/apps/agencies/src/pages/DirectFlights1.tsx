import { ChevronDown, ChevronUp, Pencil, Plane } from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ViewFlightDetailsModal } from "../common/modals/ViewFlightDetailsModal";
import { Button } from "../common/ui/button";
import { formatTime, getLocalStorageValue, storeLocallyWithExpiry } from "../lib/utils";
import { selectFlight } from "../store/flight/flightSlice";
import Line from "../components/Line";
import { useViewFlightDetailsModal } from "../hooks/use-view-flight-details-modal";
import { useAppDispatch } from "../store";

const DirectFlights = () => {
  const viewFlightDetailsModal = useViewFlightDetailsModal();
  const [selectedFlightId] = useState<string | null>(null);
  const [selectedBookingType] = useState<string | null>(
    null
  );
  const [isSelected, setIsSelected] = useState(false);
  const [isBusinessAvailable] = useState(false);

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const flightsRedux = useSelector(
    (state: any) => state.flight.filteredFlightsList
  );

  const flights = getLocalStorageValue("filteredFlightsList")
    ? getLocalStorageValue("filteredFlightsList")
    : flightsRedux;
    
  const searchFlightDataRedux = useSelector(
    (state: any) => state.flight.searchFlightData
  );

  const searchFlightData = getLocalStorageValue("searchFlightData")
    ? getLocalStorageValue("searchFlightData")
    : searchFlightDataRedux;

  const selectedFlightRedux = useSelector(
    (state: any) => state.flight.selectedFlight
  );

  const selectedFlight = getLocalStorageValue("selectedFlight")
    ? getLocalStorageValue("selectedFlight")
    : selectedFlightRedux;

  const handleFlightClick = (flightId: string, type: string) => {
    // if (selectedFlightId === flightId && selectedBookingType === type) {
    //   setSelectedFlightId(null);
    //   setSelectedBookingType(null);
    // } else {
    //   setSelectedFlightId(flightId);
    //   setSelectedBookingType(type);
    // }

    const flight = flights.find((data: any) => data._id === flightId);
    const totalPassengers =
      searchFlightData.passengers.adult +
      searchFlightData.passengers.child +
      searchFlightData.passengers.infant;
    const totalPrice = totalPassengers * flight.price.oneway;
    const newData = {
      ...flight,
      totalPassengers,
      totalPrice,
    };

    dispatch(selectFlight(newData));
    storeLocallyWithExpiry("selectedFlight", newData)
    setIsSelected(true);
  };


  const handleNextRoute = () => {
    if (searchFlightData.tripType === "one-way")
      navigate("/bookings/passenger/details");
    else if (searchFlightData.tripType === "round-trip")
      navigate("/bookings/search/flight/return");
  };

  return (
    <div className="flex flex-col mx-1 sm:mx-10 space-y-5">
      <ViewFlightDetailsModal />
      {!isSelected ? (
        <>
          <div className="flex items-center text-xl font-bold my-5 px-2 space-x-2">
            <Plane className="h-5 w-5" />
            <span>Departing flights ({flights.length})</span>
          </div>
          {flights.length ? (
            flights.map((flight: any) => (
              <>
                <div className="flex items-center lg:grid lg:grid-cols-5 py-2 px-2 bg-slate-100 shadow-sm rounded-md sm:space-x-2 space-y-3 dark:bg-slate-500">
                  <div className="flex flex-col sm:px-5 col-span-3">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center py-2">
                        <svg
                          className="fill-current text-blue-700 mr-2"
                          width="18"
                          height="18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 640 512"
                        >
                          <path d="M381 114.9L186.1 41.8c-16.7-6.2-35.2-5.3-51.1 2.7L89.1 67.4C78 73 77.2 88.5 87.6 95.2l146.9 94.5L136 240 77.8 214.1c-8.7-3.9-18.8-3.7-27.3 .6L18.3 230.8c-9.3 4.7-11.8 16.8-5 24.7l73.1 85.3c6.1 7.1 15 11.2 24.3 11.2H248.4c5 0 9.9-1.2 14.3-3.4L535.6 212.2c46.5-23.3 82.5-63.3 100.8-112C645.9 75 627.2 48 600.2 48H542.8c-20.2 0-40.2 4.8-58.2 14L381 114.9zM0 480c0 17.7 14.3 32 32 32H608c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32z" />
                        </svg>

                        <p className="font-extrabold py-0">{flight.airline}</p>
                      </div>
                      <p className="text-sm">
                        {formatTime(flight.departureTime).shortDate}
                      </p>
                    </div>

                    <div className="flex justify-between py-2 space-x-2 sm:space-x-4 md:space-x-6">
                      <div className="flex flex-col">
                        <p className="text-xl font-bold w-[95px]">
                          {formatTime(flight.departureTime).time}
                        </p>
                        <span className="text-sm text-left ml-1">
                          {flight.departureAirportAcronym}
                        </span>
                      </div>
                      <Line className="bg-slate-300 h-px hidden sm:block" />
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-md w-[50px]">
                          {flight.stoppageCount === 0
                            ? "Direct"
                            : `${flight.stoppageCount} Stop`}
                        </p>
                        <span className="text-xs">{flight.duration}</span>
                      </div>
                      <Line className="bg-slate-300 h-px hidden sm:block" />
                      <div className="flex flex-col">
                        <p className="text-xl font-bold w-[95px]">
                          {formatTime(flight.arrivalTime).time}
                        </p>
                        <span className="text-sm text-right mr-5">
                          {flight.arrivalAirportAcronym}
                        </span>
                      </div>
                    </div>
                    <div className="w-full py-2">
                      <div
                        className="rounded-full px-5 py-2 ring-1 text-cyan-700 w-fit hover:cursor-pointer dark:bg-black"
                        onClick={() =>
                          viewFlightDetailsModal.onOpen(flight._id)
                        }
                      >
                        Details
                      </div>
                    </div>
                  </div>
                  <div className=" col-span-3 sm:col-span-2 grid sm:grid-cols-2 sm:px-5 sm:gap-5 gap-2">
                    <div
                      className={`flex flex-col shadow-md h-fit cursor-pointer`}
                      onClick={() => handleFlightClick(flight._id, "economy")}
                    >
                      <div
                        className={`bg-blue-100 px-3 py-1 hover:underline underline-offset-4 font-semibold text-cyan-700 ${selectedFlightId === flight.id &&
                          selectedBookingType === "economy"
                          ? "bg-green-700 text-white"
                          : ""
                          }`}
                      >
                        Economy
                      </div>
                      <div className="px-3 my-4 overflow-hidden">
                        <div className="translate-y-5 relative hover:translate-y-0 transition-transform duration-300 ease-in-out">
                          <span
                            className={`text-xs font-semibold ${flight.seatsLeft > 9
                              ? "text-green-600"
                              : "text-red-600"
                              }`}
                          >
                            {flight.seatsLeft} seats left
                          </span>
                          <div className="flex justify-between text-cyan-700 dark:text-cyan-100">
                            <div className="uppercase font-semibold text-lg">
                              {flight.price.currency} {flight.price.oneway}
                            </div>
                            {selectedFlightId === flight.id &&
                              selectedBookingType === "economy" ? (
                              <ChevronUp className="h-6 w-6" />
                            ) : (
                              <ChevronDown className="h-6 w-6" />
                            )}
                          </div>
                          <div className="text-cyan-700 text-xs dark:text-cyan-100">
                            Price for 1 passenger
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex flex-col shadow-md h-fit ${isBusinessAvailable
                        ? "cursor-pointer"
                        : "pointer-events-none cursor-not-allowed"
                        } `}
                      onClick={() => handleFlightClick(flight.id, "business")}
                    >
                      <div
                        className={`bg-blue-200 px-3 py-1 hover:underline underline-offset-4 font-semibold text-cyan-700 ${selectedFlightId === flight.id &&
                          selectedBookingType === "business"
                          ? "bg-green-700 text-white"
                          : ""
                          }`}
                      >
                        Business
                      </div>
                      <div className="px-3 my-4 overflow-hidden">
                        {isBusinessAvailable ? (
                          <div className="translate-y-5 relative hover:translate-y-0 transition-transform duration-300 ease-in-out">
                            <span
                              className={`text-xs font-semibold ${flight.seatsLeft > 9
                                ? "text-green-600"
                                : "text-red-600"
                                }`}
                            >
                              {flight.seatsLeft} seats left
                            </span>
                            <div className="flex justify-between text-cyan-700 dark:text-cyan-100">
                              <div className="uppercase font-semibold text-lg">
                                {flight.price.currency} {flight.price.oneway}
                              </div>
                              {selectedFlightId === flight.id &&
                                selectedBookingType === "business" ? (
                                <ChevronUp className="h-6 w-6" />
                              ) : (
                                <ChevronDown className="h-6 w-6" />
                              )}
                            </div>
                            <div className="text-cyan-700 text-xs dark:text-cyan-100">
                              Price for 1 passenger
                            </div>
                          </div>
                        ) : (
                          <div className="h-[70px] flex justify-center items-center hover:cursor-not-allowed">
                            Not available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* {selectedFlightId === flight.id && (
                    <div
                      key={`info-${flight.id}`}
                      className="px-1 sm:px-10 py-7 lg:col-span-5 sm:pr-14"
                    >
                      Flight {selectedBookingType} {selectedFlightId}
                      <SelectFlight setIsSelected={setIsSelected} />
                    </div>
                  )} */}
                </div>
              </>
            ))
          ) : (
            <div className="w-full h-[300px] flex justify-center items-center">
              No flights available
            </div>
          )}
        </>
      ) : (
        <div>
          <div className="flex items-center space-x-7">
            <h2 className="font-bold text-2xl">
              Your trip to {selectedFlight.arrivalAirportAcronym}
            </h2>
            <div
              className="flex space-x-1 items-center hover:cursor-pointer"
              onClick={() => setIsSelected(false)}
            >
              <Pencil className="w-4 h-4" />
              <span className="font-bold">Change</span>
            </div>
          </div>
          <div className="border rounded-lg my-10 p-4">
            <div className="grid gap-y-4 sm:grid-cols-2 sm:gap-x-0 border">
              <div className="flex flex-col justify-between space-y-4">
                <div className="px-6 pt-6">
                  <h1 className="font-bold py-1">DEPARTING FLIGHT</h1>
                  <p className="text-sm py-0">
                    {formatTime(selectedFlight.departureTime).date}
                  </p>
                </div>
                <div className="w-full flex justify-between px-6 space-x-2 sm:space-x-4 md:space-x-6">
                  <div className="flex flex-col">
                    <p className="text-xl font-bold w-[95px]">
                      {formatTime(selectedFlight.departureTime).time}
                    </p>
                    <span className="text-sm text-left ml-1">
                      {selectedFlight.departureAirportAcronym}
                    </span>
                  </div>
                  <Line className="bg-slate-300 h-px hidden sm:block" />
                  <div className="flex flex-col items-center justify-center hidden sm:block">
                    <p className="text-md w-[50px]">
                      {selectedFlight.stoppageCount === 0
                        ? "Direct"
                        : `${selectedFlight.stoppageCount} Stop`}
                    </p>
                    <span className="text-xs">{selectedFlight.duration}</span>
                  </div>
                  <Line className="bg-slate-300 h-px hidden sm:block" />
                  <div className="flex flex-col">
                    <p className="text-xl font-bold w-[95px]">
                      {formatTime(selectedFlight.arrivalTime).time}
                    </p>
                    <span className="text-sm text-right mr-5">
                      {selectedFlight.arrivalAirportAcronym}
                    </span>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <div
                    className="bg-slate-700 text-white text-sm font-bold py-2 px-5 w-fit rounded-md flex items-center hover:cursor-pointer"
                    onClick={() => setIsSelected(false)}
                  >
                    <span>Change</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <img
                  src="/images/tower.jpg"
                  alt="image"
                  className="h-[300px] w-full"
                />
                <div className="absolute top-0 h-full w-full">
                  <div className="flex items-center py-5 px-5">
                    <svg
                      className="fill-current text-white mr-2"
                      width="18"
                      height="18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 640 512"
                    >
                      <path d="M381 114.9L186.1 41.8c-16.7-6.2-35.2-5.3-51.1 2.7L89.1 67.4C78 73 77.2 88.5 87.6 95.2l146.9 94.5L136 240 77.8 214.1c-8.7-3.9-18.8-3.7-27.3 .6L18.3 230.8c-9.3 4.7-11.8 16.8-5 24.7l73.1 85.3c6.1 7.1 15 11.2 24.3 11.2H248.4c5 0 9.9-1.2 14.3-3.4L535.6 212.2c46.5-23.3 82.5-63.3 100.8-112C645.9 75 627.2 48 600.2 48H542.8c-20.2 0-40.2 4.8-58.2 14L381 114.9zM0 480c0 17.7 14.3 32 32 32H608c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32z" />
                    </svg>

                    <p className="font-extrabold py-0 text-white">
                      {selectedFlight.airline}
                    </p>
                  </div>
                  <div className="absolute bottom-5 right-5 uppercase font-bold text-md bg-slate-900 py-3 px-4 rounded-lg opacity-80 text-white">
                    {selectedFlight.price.currency} {selectedFlight.totalPrice}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end py-6">
              <div className="flex flex-col">
                <p className="py-1 text-xs font-medium">
                  Ticket price for {selectedFlight.totalPassengers} passengers
                </p>
                <div className=" uppercase font-bold text-xl">
                  {selectedFlight.price.currency} {selectedFlight.totalPrice}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant={"link"}
              className="bg-blue-700 text-white text-sm font-bold hover:no-underline"
              onClick={handleNextRoute}
            >
              {searchFlightData.tripType === "one-way" ? (
                <span>Continue to passenger details</span>
              ) : (
                <span>Choose return flights</span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectFlights;
