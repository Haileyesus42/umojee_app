import { CheckCircle2 } from "lucide-react";
import React, { useEffect } from "react";
import { Button } from "../common/ui/button";
import { Card } from "../common/ui/card";
import DefaultLayout from "../layout/DefaultLayout";
import { getLocalStorageValue } from "../lib/utils";
import { useSelector } from "react-redux";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const SuccesfulPayment = () => {
  const selectedFlightRedux = useSelector(
    (state: any) => state.flight.selectedFlight
  );

  const passengersRedux = useSelector((state: any) => state.flight.passengers);
  const passengers = getLocalStorageValue("passengers")
    ? getLocalStorageValue("passengers")
    : passengersRedux;
  const selectedFlight = getLocalStorageValue("selectedFlight")
    ? getLocalStorageValue("selectedFlight")
    : selectedFlightRedux;
  const extraOptionsRedux = useSelector(
    (state: any) => state.flight.extraOptions
  );

  const extraOptions = getLocalStorageValue("extraOptions")
    ? getLocalStorageValue("extraOptions")
    : extraOptionsRedux;
  const totalPriceValue = extraOptions ? extraOptions.totalPriceValue : 0;
  const totalBaggages = extraOptions ? extraOptions.totalBaggages : 0;

  useEffect(() => {
    const token = getLocalStorageValue("token");
    const paymentStatusKey = `paymentStatus_${selectedFlight._id}`;

    if (!localStorage.getItem(paymentStatusKey)) {
      const getPaymentStatus = async () => {
        try {
          const response = await axios.post(
            `${backendUrl}/api/client/booking/successfull-payment`,
            {
              data: {
                flightId: selectedFlight._id,
                totalPriceValue,
                totalBaggages,
                passengers,
              },
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
          // Mark the request as sent in local storage
          localStorage.setItem(paymentStatusKey, "sent");
        } catch (error) {
          console.error("Error getting payment status:", error);
          // Handle error here
        }
      };

      getPaymentStatus();
    }
  }, [selectedFlight, totalPriceValue, totalBaggages, passengers, backendUrl]);

  return (
    <DefaultLayout>
      <div className="w-full m-5 mt-10 flex justify-center items-center">
        <Card className="w-full sm:w-[600px] p-5 flex flex-col items-center z-[2000] dark:bg-slate-400">
          <CheckCircle2
            className="w-20 h-20 text-white dark:text-slate-400"
            fill="green"
          />
          <h1 className="font-bold text-green-700">Payment Successful</h1>
          <div className="w-full flex flex-col items-center justify-center my-5 px-5 space-y-3">
            <h1 className="font-semibold">
              Congratulations on booking your ticket successfully!
            </h1>
            <p className="text-center text-sm leading-7">
              Your receipt and ticket have been sent to your email. Please check
              your inbox to download them. We look forward to welcoming you
              onboard again soon!
            </p>
          </div>
          <div className="flex justify-center w-full">
            <Button className="bg-slate-700 hover:bg-slate-700 dark:text-white">
              Continue
            </Button>
          </div>
        </Card>
      </div>
    </DefaultLayout>
  );
};

export default SuccesfulPayment;
