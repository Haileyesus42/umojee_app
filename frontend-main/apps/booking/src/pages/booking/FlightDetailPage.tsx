import React from "react";
import DefaultLayout from "../../layout/DefaultLayout";
import CustomOnewayStepper from "../../components/CustomOnewayStepper";
import { Button } from "../../common/ui/button";
import { useDispatch, useSelector } from "react-redux";
import {
  formatTime,
  getLocalStorageValue,
  minutesToHoursAndMinutes,
} from "../../lib/utils";
import { Pencil } from "lucide-react";
import Line from "../../components/Line";
import { IMAGES } from "../../assets";
import { useNavigate } from "react-router-dom";

const FlightDetailPage = () => {
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

  const handleNextRoute = () => {
    console.log(searchFlightData);
    if (searchFlightData.tripType === "one-way")
      navigate("/passengers/details");
    else if (searchFlightData.tripType === "round-trip")
      navigate("/search/flights/return");
  };

  return (
    <DefaultLayout>
      <div className="max-w-screen-2xl mx-auto">
        <div className="sticky top-[70px] flex flex-col justify-center z-[1000] mx-auto">
          <CustomOnewayStepper activeIndex={1} />
        </div>
        <div className="mt-14 px-10">
          <div className="flex items-center space-x-7">
            <h2 className="font-bold text-2xl">
              Your trip to {selectedFlight.arrivalAirport}
            </h2>
            <div
              className="flex space-x-1 items-center text-picton-blue-500 hover:cursor-pointer"
              onClick={() => navigate(-1)}
            >
              <Pencil className="w-4 h-4" />
              <span className="font-bold">Change</span>
            </div>
          </div>
          <div className="border rounded-xl my-10">
            <div className="grid gap-y-4 sm:grid-cols-2 sm:gap-x-0 border rounded-xl overflow-hidden">
              <div className="flex flex-col justify-between space-y-4">
                <div className="px-6 pt-6">
                  <h1 className="font-bold py-1">DEPARTING FLIGHT</h1>
                  <p className="text-sm py-0 text-muted-foreground">
                    {formatTime(selectedFlight.departureTime).date}
                  </p>
                </div>
                <div className="w-full flex justify-between px-6 space-x-2 sm:space-x-4 md:space-x-6">
                  <div className="flex flex-col">
                    <p className="text-xl font-bold w-[95px]">
                      {formatTime(selectedFlight.departureTime).time}
                    </p>
                    <span className="text-sm text-left ml-1 text-muted-foreground">
                      {selectedFlight.departureAirportAcronym}
                    </span>
                  </div>
                  <Line className="bg-slate-300 h-px hidden sm:block" />
                  <div className="flex flex-col items-center justify-center hidden sm:block">
                    <p className="text-md w-[50px]">
                      {selectedFlight.stoppageCount === 0
                        ? "Direct"
                        : `${selectedFlight.stoppageCount} Stops`}
                    </p>
                    <span className="text-xs">
                      {minutesToHoursAndMinutes(selectedFlight.duration)}
                    </span>
                  </div>
                  <Line className="bg-slate-300 h-px hidden sm:block" />
                  <div className="flex flex-col">
                    <p className="text-xl font-bold w-[95px]">
                      {formatTime(selectedFlight.arrivalTime).time}
                    </p>
                    <span className="text-sm text-right mr-5 text-muted-foreground">
                      {selectedFlight.arrivalAirportAcronym}
                    </span>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <div
                    className="bg-picton-blue-500 text-white text-sm font-bold py-2 px-5 w-fit rounded-md flex items-center hover:cursor-pointer"
                    onClick={() => navigate(-1)}
                  >
                    <span>Change</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <img
                  src={IMAGES.london}
                  alt="tower"
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
            <div className="flex justify-end py-6 pr-6">
              <div className="flex flex-col">
                <p className="py-1 text-xs font-medium to-muted-foreground">
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold hover:no-underline"
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
      </div>
    </DefaultLayout>
  );
};

export default FlightDetailPage;
