import { Plane, PlaneTakeoff, User2 } from "lucide-react";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
} from "../../common/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../common/ui/dropdown-menu";
import Line from "../../components/Line";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  formatTime,
  getLocalStorageValue,
  minutesToHoursAndMinutes,
  storeLocallyWithExpiry,
} from "../../lib/utils";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Logo from "../../common/Logo";
import { fetchBookingData } from "../../store/booking/bookingActions";
import { IMAGES } from "../../assets";
import { Flights } from "../../types/types";

interface featuredFlights {
  _id: string;
  bookingCount: number;
  flightDetails: Flights;
  flightId: string;
}

const MyBookingPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const bookingsRedux = useSelector((state: any) => state.booking.bookingsList);

  const bookings = getLocalStorageValue("bookingsList")
    ? getLocalStorageValue("bookingsList")
    : bookingsRedux;

  const user = getLocalStorageValue("user");

  console.log("bookings", bookings);

  useEffect(() => {
    if (!user) {
      toast.error("Please login before continue to bookings!", {
        duration: 6000,
      });
      storeLocallyWithExpiry("redirectPath", "/trip");
      navigate("/login");
    }
    dispatch(fetchBookingData() as any);
  }, []);

  const featuredFlights = useSelector(
    (state: any) => state.flight.featuredFlights
  );

  return (
    <DefaultLayout>
      <div className="w-full max-w-screen-2xl mx-auto grid md:grid-cols-6 md:gap-x-2 -mb-[40px]">
        <div className="md:col-span-4 my-2 max-h-screen overflow-y-scroll max-w-full">
          {bookings && bookings.length ? (
            bookings.map((booking: any) => (
              <>
                <div className="relative flex items-center grid lg:grid-cols-3 py-2 bg-white shadow-sm rounded-md space-y-4 my-5 sm:m-5 dark:bg-slate-500">
                  <div className="flex flex-col sm:px-5 col-span-3">
                    <div className="flex justify-between items-center mr-10">
                      <div className="flex items-center py-2 space-x-2">
                        <div className="flex items-center justify-center w-12 h-12 rounded-md bg-picton-blue-100">
                          <Plane
                            className="text-picton-blue-500"
                            fill="#0ea5e9"
                          />
                        </div>
                        <div>
                          <p className="font-medium py-0">
                            {booking.airline} Umoja Airways
                          </p>
                          <p className="text-xs text-muted-foreground py-0">
                            Flight UM0AB56
                          </p>
                        </div>
                      </div>
                      <div
                        className={`h-fit px-3 rounded-badge py-1 ${
                          booking.status === "Booked"
                            ? "bg-emerald-100"
                            : "bg-torch-red-100"
                        }`}
                      >
                        <span
                          className={`text-sm ${
                            booking.status === "Booked"
                              ? "text-emerald-600"
                              : "text-torch-red-600"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between py-2 space-x-2 sm:space-x-4 md:space-x-6">
                      <div className="flex flex-col">
                        <span className="text-xl font-bold">
                          {booking.departureAirportAcronym}
                        </span>
                        <p className="text-sm w-[95px] text-waikawa-gray-900 ml-1/2">
                          {formatTime(booking.departureTime).time}
                        </p>
                        <span className="text-xs text-left text-waikawa-gray-600 ml-1/2">
                          {formatTime(booking.departureTime).shortDate}
                        </span>
                      </div>
                      <div className="flex flex-col justify-center items-center space-y-2 min-w-28">
                        <p className="text-sm w-[50px] text-center text-waikawa-gray-900">
                          {booking.stoppageCount === 0
                            ? "Direct"
                            : `${booking.stoppageCount} Stop`}
                        </p>
                        <Line className="bg-slate-300 h-px hidden sm:block" />
                        <span className="text-sm text-waikawa-gray-900">
                          {minutesToHoursAndMinutes(booking.duration ?? 0)}
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-xl font-bold">
                          {booking.arrivalAirportAcronym}
                        </span>
                        <p className="text-sm w-[95px] text-waikawa-gray-900 mr-1/2">
                          {formatTime(booking.arrivalTime).time}
                        </p>
                        <span className="text-xs text-waikawa-gray-600 mr-1/2">
                          {formatTime(booking.arrivalTime).shortDate}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col col-span-3  px-5">
                    <Line className="bg-slate-100 h-px hidden sm:block" />
                    <div className="flex justify-between py-4">
                      <div className="flex space-x-4">
                        <div className="flex items-center space-x-1 text-sm text-waikawa-gray-900">
                          <User2 className="w-4 h-4" />
                          <p>{booking.passengers.length} Passenger(s)</p>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-waikawa-gray-900">
                          <Plane className="w-4 h-4" />
                          <p>Economy</p>
                        </div>
                      </div>
                      <div className="font-bold px-5 text-waikawa-gray-950">USD {booking.price}</div>
                    </div>
                  </div>
                 
                  <div className="absolute right-5 top-2">
                    <Breadcrumb>
                      <BreadcrumbItem>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex items-center gap-1 focus:outline-none">
                            <BreadcrumbEllipsis className="h-5 w-5" />
                            <span className="sr-only">Toggle menu</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {booking.status === "Booked" && (
                              <DropdownMenuItem
                                className="px-4 py-2"
                                onClick={() =>
                                  navigate(`/request/refund/${booking._id}`)
                                }
                              >
                                Cancel
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </BreadcrumbItem>
                    </Breadcrumb>
                  </div>
                </div>
              </>
            ))
          ) : (
            <div className="w-full h-[300px] flex justify-center items-center">
              No bookings available
            </div>
          )}
        </div>
        <div className="max-w-full flex flex-col md:col-span-2 shadow-lg mx-2 bg-white dark:bg-slate-700">
          <div className="px-5 h-[100px] border-b flex items-center w-full">
            <Logo />
          </div>
          <div className="px-2 lg:px-7 py-5">
            <div className="text-lg font-semibold my-5 px-2">
              Related Destinations
            </div>
            {featuredFlights?.map((flight: featuredFlights, index: number) => {
              return (
                flight.flightDetails && (
                  <div className="bg-slate-50 hover:bg-gray-100 lg:mx-5 my-5 px-2 dark:bg-slate-500">
                    <div className="flex flex-col lg:flex-row border-b space-y-4 lg:space-y-0 justify-between lg:items-center py-3 lg:px-4 rounded hover:scale-y-90 hover:scale-x-[0.99] duration-300">
                      <div className="flex space-x-5 w-full sm:w-[200px]">
                        <img
                          className="h-12 w-12 rounded-sm"
                          src={IMAGES.tower}
                          alt="place"
                        />
                        <div className="flex flex-col">
                          <p className="font-semibold">
                            {flight.flightDetails.arrivalAirport}
                          </p>
                          <span>({flight.flightDetails.airline})</span>
                        </div>
                      </div>
                      <p>
                        From{" "}
                        <span className="font-semibold">
                          {flight.flightDetails.price.currency}{" "}
                          {flight.flightDetails.price.oneway}
                          <sup>*</sup>
                        </span>
                      </p>
                    </div>
                  </div>
                )
              );
            })}
          </div>
          <div></div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default MyBookingPage;
