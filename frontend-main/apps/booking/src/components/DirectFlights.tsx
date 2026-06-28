import { Plane, PlaneTakeoff } from "lucide-react";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { IMAGES } from "../assets";
import { ViewFlightDetailsModal } from "../common/modals/ViewFlightDetailsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../common/ui/tabs";
import { useViewFlightDetailsModal } from "../hooks/use-view-flight-details-modal";
import {
  formatTime,
  getLocalStorageValue,
  minutesToHoursAndMinutes,
} from "../lib/utils";
import { selectFlight } from "../store/flight/flightSlice";
import Line from "./Line";

const DirectFlights = () => {
  const viewFlightDetailsModal = useViewFlightDetailsModal();
  const [selectedFlightId] = useState<string | null>(null);
  const [selectedBookingType] = useState<string | null>(null);
  const [isSelected, setIsSelected] = useState(false);
  const [isBusinessAvailable] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
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
    navigate("/flights/detail");
    // setIsSelected(true);
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
                <span>Departing flights ({flights.length})</span>
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
                          <div className="font-semibold">{flight.airline}</div>
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
    </div>
  );
};

export default DirectFlights;
