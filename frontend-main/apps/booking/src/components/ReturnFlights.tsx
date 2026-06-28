import { ChevronDown, ChevronUp, Pencil, Plane, PlaneTakeoff } from "lucide-react";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ViewFlightDetailsModal } from "../common/modals/ViewFlightDetailsModal";
import { Button } from "../common/ui/button";
import { useViewFlightDetailsModal } from "../hooks/use-view-flight-details-modal";
import { formatTime, getLocalStorageValue, minutesToHoursAndMinutes } from "../lib/utils";
import { selectReturnFlight } from "../store/flight/flightSlice";
import Line from "./Line";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../common/ui/tabs";
import { IMAGES } from "../assets";

const ReturnFlights = () => {
  const viewFlightDetailsModal = useViewFlightDetailsModal();
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [selectedBookingType, setSelectedBookingType] = useState<string | null>(
    null
  );
  const [isSelected, setIsSelected] = useState(false);
  const [isBusinessAvailable, setIsBusinessAvailable] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const flightsRedux = useSelector(
    (state: any) => state.flight.filteredReturnFlightsList
  );

  const flights = getLocalStorageValue("filteredReturnFlightsList")
    ? getLocalStorageValue("filteredReturnFlightsList")
    : flightsRedux;

  const searchFlightDataRedux = useSelector(
    (state: any) => state.flight.searchFlightData
  );

  const searchFlightData = getLocalStorageValue("searchFlightData")
    ? getLocalStorageValue("searchFlightData")
    : searchFlightDataRedux;

  const selectedReturnFlightRedux = useSelector(
    (state: any) => state.flight.selectedFlight
  );

  const selectedReturnFlight = getLocalStorageValue("selectedReturnFlight")
    ? getLocalStorageValue("selectedReturnFlight")
    : selectedReturnFlightRedux;

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
    dispatch(selectReturnFlight(newData));
    setIsSelected(true);
  };

  const isEnoughSeats = (seatsLeft: number) => {
    const numberOfPassengers =
      searchFlightData.passengers.adult +
      searchFlightData.passengers.child +
      searchFlightData.passengers.infant;

    return seatsLeft > 0 && numberOfPassengers <= seatsLeft;
  };

  return (
    <div className="flex flex-col mx-1 sm:mx-10 space-y-5">
      <ViewFlightDetailsModal />
      {!isSelected ? (
        <Tabs defaultValue="economy">
          <TabsList className="space-x-4 dark:bg-slate-700 h-16">
            <TabsTrigger
              value={"economy"}
              className="border-b-4 border-transparent data-[state=active]:bg-picton-blue-500 data-[state=active]:text-white"
            >
              Economy
            </TabsTrigger>
            <TabsTrigger
              value={"business"}
              className="border-b-4 border-transparent data-[state=active]:bg-picton-blue-500 data-[state=active]:text-white"
            >
              Business
            </TabsTrigger>
          </TabsList>
          <TabsContent value="economy">
            {flights.length ? (
              <>
                <div className="flex items-center text-xl font-bold text-emerald-600 my-5 px-2 space-x-2">
                  <Plane className="h-5 w-5" />
                  <span>Return flights ({flights.length})</span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {flights.map((flight: any) => (
                    <div
                      key={flight._id}
                      className="flex flex-col space-y-2 items-center py-3 px-4 bg-white shadow-sm rounded-md dark:bg-slate-500"
                    >
                      {/* Header - Airline Info and Price */}
                      <div className="w-full flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="text-picton-blue-500">
                            <PlaneTakeoff className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-semibold">
                              {flight.airline}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Flight {flight.flightNumber}
                            </div>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-picton-blue-500">
                          ${flight.price.oneway}
                        </div>
                      </div>

                      {/* Flight Times and Route */}
                      <div className="w-full flex justify-between py-2 space-x-2 sm:space-x-4 md:space-x-6">
                        <div className="flex flex-col">
                          <p className="text-xl font-bold w-[95px]">
                            {formatTime(flight.departureTime).time}
                          </p>
                          <span className="text-sm text-left ml-1 text-muted-foreground">
                            {flight.departureAirport} (
                            {flight.departureAirportAcronym})
                          </span>
                        </div>
                        <Line className="bg-slate-300 h-px hidden sm:block" />
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-md w-[50px]">
                            {flight.stoppageCount === 0
                              ? "Direct"
                              : `${flight.stoppageCount} Stop`}
                          </p>
                          <span className="w-full text-xs">
                            {minutesToHoursAndMinutes(flight.duration)}
                          </span>
                        </div>
                        <Line className="bg-slate-300 h-px hidden sm:block" />
                        <div className="flex flex-col">
                          <p className="text-xl font-bold w-[95px]">
                            {formatTime(flight.arrivalTime).time}
                          </p>
                          <span className="w-full text-sm text-right text-muted-foreground">
                            {flight.arrivalAirport} (
                            {flight.arrivalAirportAcronym})
                          </span>
                        </div>
                      </div>

                      {/* Footer - Seats and Select Button */}
                      <div className="w-full flex justify-between items-center">
                        <div
                          className={`flex items-center space-x-1 text-sm ${
                            flight.seatsLeft <= 10
                              ? "text-red-500"
                              : "text-emerald-600"
                          }`}
                        >
                          <img
                            src={
                              flight.seatsLeft <= 10
                                ? IMAGES.greenChair
                                : IMAGES.greenChair
                            }
                            alt=""
                            className="w-[13px] h-[13px]"
                          />
                          <span className="font-semibold">
                            {flight.seatsLeft}
                          </span>{" "}
                          seats left
                        </div>
                        <div className="flex space-x-2">
                          <div
                            className="rounded-md px-6 py-2 ring-1 ring-picton-blue-600 text-picton-blue-600 w-fit hover:cursor-pointer dark:bg-black"
                            onClick={() =>
                              viewFlightDetailsModal.onOpen(flight._id)
                            }
                          >
                            Details
                          </div>
                          <button
                            onClick={() =>
                              handleFlightClick(flight._id, "economy")
                            }
                            className="bg-emerald-600 text-white px-6 py-2 rounded-md hover:bg-emerald-700 transition-colors"
                            disabled={!isEnoughSeats(flight.seatsLeft)}
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="w-full h-[300px] flex justify-center items-center">
                No flights available
              </div>
            )}
          </TabsContent>
          <TabsContent value="business">
            {isBusinessAvailable ? (
              <div>Business list</div>
            ) : (
              <div className="h-[70px] flex justify-center items-center hover:cursor-not-allowed">
                Not available
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div>
          <div className="flex items-center space-x-7">
            <h2 className="font-bold text-2xl">
              Your trip to {selectedReturnFlight.arrivalAirport}
            </h2>
            <div
              className="flex space-x-1 items-center text-picton-blue-500 hover:cursor-pointer"
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
                  <h1 className="font-bold py-1">RETURN FLIGHT</h1>
                  <p className="text-sm py-0 text-muted-foreground">
                    {formatTime(selectedReturnFlight.departureTime).date}
                  </p>
                </div>
                <div className="w-full flex justify-between px-6 space-x-2 sm:space-x-4 md:space-x-6">
                  <div className="flex flex-col">
                    <p className="text-xl font-bold w-[95px]">
                      {formatTime(selectedReturnFlight?.departureTime).time}
                    </p>
                    <span className="text-sm text-left ml-1 text-muted-foreground">
                      {selectedReturnFlight?.departureAirportAcronym}
                    </span>
                  </div>
                  <Line className="bg-slate-300 h-px hidden sm:block" />
                  <div className="flex flex-col items-center justify-center hidden sm:block">
                    <p className="text-md w-[50px]">
                      {selectedReturnFlight.stoppageCount === 0
                        ? "Direct"
                        : `${selectedReturnFlight.stoppageCount} Stops`}
                    </p>
                    <span className="text-xs">
                      {minutesToHoursAndMinutes(selectedReturnFlight.duration)}
                    </span>
                  </div>
                  <Line className="bg-slate-300 h-px hidden sm:block" />
                  <div className="flex flex-col">
                    <p className="text-xl font-bold w-[95px]">
                      {formatTime(selectedReturnFlight.arrivalTime).time}
                    </p>
                    <span className="text-sm text-right mr-5 text-muted-foreground">
                      {selectedReturnFlight.arrivalAirportAcronym}
                    </span>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <div
                    className="bg-picton-blue-500 text-white text-sm font-bold py-2 px-5 w-fit rounded-md flex items-center hover:cursor-pointer"
                    onClick={() => setIsSelected(false)}
                  >
                    <span>Change</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <img
                  src={IMAGES.london}
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
                      {selectedReturnFlight.airline}
                    </p>
                  </div>
                  <div className="absolute bottom-5 right-5 uppercase font-bold text-md bg-slate-900 py-3 px-4 rounded-lg opacity-80 text-white">
                    {selectedReturnFlight.price.currency}{" "}
                    {selectedReturnFlight.totalPrice}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end py-6">
              <div className="flex flex-col">
                <p className="py-1 text-xs font-medium text-muted-foreground">
                  Ticket price for {selectedReturnFlight.totalPassengers}{" "}
                  passengers
                </p>
                <div className=" uppercase font-bold text-xl">
                  {selectedReturnFlight.price.currency}{" "}
                  {selectedReturnFlight.totalPrice}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant={"link"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold hover:no-underline"
              onClick={() => navigate("/passengers/details")}
            >
              Continue to passenger details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};


export default ReturnFlights;
