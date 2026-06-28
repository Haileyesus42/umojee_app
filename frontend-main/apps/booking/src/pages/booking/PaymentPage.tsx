import axios from "axios";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button } from "../../common/ui/button";
import { Loader } from "../../common/ui/loader";
import CustomOnewayStepper from "../../components/CustomOnewayStepper";
import CustomRoundtripStepper from "../../components/CustomRoundtripStepper";
import LineWithCirclesVertical from "../../components/LineWithCirclesVertical";
import DefaultLayout from "../../layout/DefaultLayout";
import {
  formatTime,
  getLocalStorageValue,
  storeLocallyWithExpiry,
} from "../../lib/utils";
import { IMAGES } from "../../assets";

let token: string | null = null;

const PaymentPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const selectedFlightRedux = useSelector(
    (state: any) => state.flight.selectedFlight
  );

  const selectedFlight = getLocalStorageValue("selectedFlight")
    ? getLocalStorageValue("selectedFlight")
    : selectedFlightRedux;

  const selectedReturnFlightRedux = useSelector(
    (state: any) => state.flight.selectedReturnFlight
  );

  const selectedReturnFlight = getLocalStorageValue("selectedReturnFlight")
    ? getLocalStorageValue("selectedReturnFlight")
    : selectedReturnFlightRedux;

  const extraOptionsRedux = useSelector(
    (state: any) => state.flight.extraOptions
  );

  const extraOptions = getLocalStorageValue("extraOptions")
    ? getLocalStorageValue("extraOptions")
    : extraOptionsRedux;

  const user = getLocalStorageValue("user");

  const passengersRedux = useSelector((state: any) => state.flight.passengers);
  const passengers = getLocalStorageValue("passengers")
    ? getLocalStorageValue("passengers")
    : passengersRedux;

  const searchDataRedux = useSelector(
    (state: any) => state.flight.searchFlightData
  );
  const searchFlightData = getLocalStorageValue("searchFlightData")
    ? getLocalStorageValue("searchFlightData")
    : searchDataRedux;

  const totalPriceValue = extraOptions ? extraOptions.totalPriceValue : 0;
  const totalBaggages = extraOptions ? extraOptions.totalBaggages : 0;
  const selectedSeats = getLocalStorageValue("selectedSeats");
  const selectedSeatsReturn = getLocalStorageValue("selectedSeatsReturn");

  const payPayment = async () => {
    setLoading(true);

    const data = {
      flightId: selectedFlight._id,
      returnFlightId:
        searchFlightData.tripType === "round-trip"
          ? selectedReturnFlight._id
          : null,
      user,
      passengers,
      currency: selectedFlight.price.currency,
      totalBaggages,
      tripType: searchFlightData.tripType,
      selectedSeats,
      selectedSeatsReturn:
        searchFlightData.tripType === "round-trip" ? selectedSeatsReturn : null,
    };
    token = getLocalStorageValue("token");
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/client/booking/checkout-session`,
        { data },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        window.location.href = response.data.session.url;
      }
    } catch (error) {
      console.error("Error processing payment:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      toast.error("Please login before continue to payment!", {
        duration: 6000,
      });
      storeLocallyWithExpiry("redirectPath", "/passengers/payments");
      navigate("/login");
    }
  }, []);

  return (
    <DefaultLayout>
      <div className="max-w-screen-2xl mx-auto">
        {selectedFlight ? (
          <>
            <div className="sticky top-[70px] flex flex-col justify-center z-[1000] mx-auto">
              {searchFlightData.tripType === "one-way" ? (
                <CustomOnewayStepper activeIndex={5} />
              ) : (
                <CustomRoundtripStepper activeIndex={7} />
              )}
            </div>
            <div className="mx-5 my-5 p-5">
              <div className="mt-5 text-muted-foreground">
                Please review your booking and choose your preferred payment
                method.
              </div>
              <div className="py-5">
                <h1 className="text-2xl font-bold">Your trip</h1>
                <div className="sm:grid grid-cols-4 gap-y-5 sm:gap-x-5 my-5 bg-slate-100 dark:bg-slate-500 rounded-xl overflow-hidden">
                  <div className="mx-2 sm:mx-0">
                    <img
                      src={IMAGES.tower}
                      alt="tower"
                      className="w-full h-[300px] sm:h-[400px]"
                    />
                  </div>
                  <div className="sm:ml-4 py-5 flex flex-col justify-between col-span-3">
                    <div className="mx-5">
                      <h1 className="text-xl font-bold">DEPARTING FLIGHT</h1>
                      <p className="text-muted-foreground">{formatTime(selectedFlight.departureTime).date}</p>
                    </div>
                    <div className="shadow-md flex flex-col mx-5 mr-10">
                      <div className="grid grid-cols-3 py-5 bg-white px-5 dark:bg-slate-400">
                        <div className="col-span-2 flex space-x-5 items-center ">
                          <div className="h-[70%]">
                            <LineWithCirclesVertical />
                          </div>
                          <div className="h-full flex flex-col justify-between text-sm">
                            <div className="flex space-x-1">
                              <p className="font-bold">
                                {formatTime(selectedFlight.departureTime).time}{" "}
                                {selectedFlight.departureAirport}
                              </p>
                              <span>
                                ({selectedFlight.departureAirportAcronym})
                              </span>
                            </div>
                            <div className="flex space-x-1">
                              <p className="font-bold">
                                {formatTime(selectedFlight.arrivalTime).time}{" "}
                                {selectedFlight.arrivalAirport}
                              </p>
                              <span>
                                ({selectedFlight.arrivalAirportAcronym})
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center ">
                          <div>
                            <div className="flex items-center py-2">
                              <svg
                                className="fill-current text-emerald-600 mr-2"
                                width="18"
                                height="18"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 640 512"
                              >
                                <path d="M381 114.9L186.1 41.8c-16.7-6.2-35.2-5.3-51.1 2.7L89.1 67.4C78 73 77.2 88.5 87.6 95.2l146.9 94.5L136 240 77.8 214.1c-8.7-3.9-18.8-3.7-27.3 .6L18.3 230.8c-9.3 4.7-11.8 16.8-5 24.7l73.1 85.3c6.1 7.1 15 11.2 24.3 11.2H248.4c5 0 9.9-1.2 14.3-3.4L535.6 212.2c46.5-23.3 82.5-63.3 100.8-112C645.9 75 627.2 48 600.2 48H542.8c-20.2 0-40.2 4.8-58.2 14L381 114.9zM0 480c0 17.7 14.3 32 32 32H608c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32z" />
                              </svg>

                              <p className="font-extrabold py-0">
                                {selectedFlight.airline}
                              </p>
                            </div>
                            <div className="text-muted-foreground">Flight {selectedFlight.flightNumber}</div>
                          </div>
                        </div>
                      </div>
                      <div className="mx-5 my-5">
                        <h5 className="font-bold pb-2">Light</h5>
                        <div className="flex space-x-2">
                          <p className="font-bold">Ticket:</p>
                          <span>changeable* - refundable*</span>
                        </div>
                      </div>
                    </div>
                    {searchFlightData.tripType === "round-trip" && (
                      <>
                        <div className="mx-5 mt-5">
                          <h1 className="text-xl font-bold">RETURN FLIGHT</h1>
                          <p className="text-muted-foreground">
                            {
                              formatTime(selectedReturnFlight.departureTime)
                                .date
                            }
                          </p>
                        </div>
                        <div className="shadow-md flex flex-col mx-5 mr-10">
                          <div className="grid grid-cols-3 py-5 bg-white px-5 dark:bg-slate-400">
                            <div className="col-span-2 flex space-x-5 items-center ">
                              <div className="h-[70%]">
                                <LineWithCirclesVertical />
                              </div>
                              <div className="h-full flex flex-col justify-between text-sm">
                                <div className="flex space-x-1">
                                  <p className="font-bold">
                                    {
                                      formatTime(
                                        selectedReturnFlight.departureTime
                                      ).time
                                    }{" "}
                                    {selectedReturnFlight.departureAirport}
                                  </p>
                                  <span>
                                    (
                                    {
                                      selectedReturnFlight.departureAirportAcronym
                                    }
                                    )
                                  </span>
                                </div>
                                <div className="flex space-x-1">
                                  <p className="font-bold">
                                    {
                                      formatTime(
                                        selectedReturnFlight.arrivalTime
                                      ).time
                                    }{" "}
                                    {selectedReturnFlight.arrivalAirport}
                                  </p>
                                  <span>
                                    (
                                    {selectedReturnFlight.arrivalAirportAcronym}
                                    )
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-center ">
                              <div>
                                <div className="flex items-center py-2">
                                  <svg
                                    className="fill-current text-emerald-600 mr-2"
                                    width="18"
                                    height="18"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 640 512"
                                  >
                                    <path d="M381 114.9L186.1 41.8c-16.7-6.2-35.2-5.3-51.1 2.7L89.1 67.4C78 73 77.2 88.5 87.6 95.2l146.9 94.5L136 240 77.8 214.1c-8.7-3.9-18.8-3.7-27.3 .6L18.3 230.8c-9.3 4.7-11.8 16.8-5 24.7l73.1 85.3c6.1 7.1 15 11.2 24.3 11.2H248.4c5 0 9.9-1.2 14.3-3.4L535.6 212.2c46.5-23.3 82.5-63.3 100.8-112C645.9 75 627.2 48 600.2 48H542.8c-20.2 0-40.2 4.8-58.2 14L381 114.9zM0 480c0 17.7 14.3 32 32 32H608c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32z" />
                                  </svg>

                                  <p className="font-extrabold py-0">
                                    {selectedReturnFlight.airline}
                                  </p>
                                </div>
                                <div className="text-muted-foreground">Flight {selectedReturnFlight.flightNumber}</div>
                              </div>
                            </div>
                          </div>
                          <div className="mx-5 my-5">
                            <h5 className="font-bold pb-2">Light</h5>
                            <div className="flex space-x-2">
                              <p className="font-bold">Ticket:</p>
                              <span>changeable* - refundable*</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex justify-end mx-5 px-5 mt-5">
                      <div className="flex flex-col items-end ">
                        <p className="text-muted-foreground">
                          Total price for {selectedFlight.totalPassengers}{" "}
                          passenger(s)
                        </p>
                        <h1 className="font-bold">
                          {selectedFlight.price.currency}{" "}
                          {searchFlightData.tripType === "round-trip"
                            ? selectedReturnFlight.totalPrice +
                              selectedFlight.totalPrice
                            : selectedFlight.totalPrice}{" "}
                          {totalPriceValue > 0 ? ` + ${totalPriceValue}` : ""}
                        </h1>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-6 space-x-2 flex items-center justify-end mx-5">
                  <Button
                    type="submit"
                    variant={"link"}
                    className={`bg-emerald-600 text-white text-sm font-bold hover:no-underline hover:cursor-pointer ${
                      loading ? "cursor-not-allowed" : ""
                    }`}
                    onClick={payPayment}
                    disabled={loading}
                  >
                    {loading && <Loader color="#ffffff" size={15} />}
                    Continue to payment
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-[300px] flex justify-center items-center">
            Not available. Please try again!
          </div>
        )}
      </div>
    </DefaultLayout>
  );
};

export default PaymentPage;
