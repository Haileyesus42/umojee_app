import { CheckCircle2 } from "lucide-react";
import React, { useEffect } from "react";
import { Button } from "../../common/ui/button";
import { Card } from "../../common/ui/card";
import DefaultLayout from "../../layout/DefaultLayout";
import { getLocalStorageValue } from "../../lib/utils";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { fetchBookingData } from "../../store/booking/bookingActions";
import { useNavigate } from "react-router-dom";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const SuccesfulPayment = () => {
  const navigate = useNavigate();

  const updateSeat = async (
    rowId: string,
    seatId: string,
    newStatus: string
  ) => {
    try {
      await axios.patch(`${backendUrl}/api/admin/seats/update`, {
        rowId,
        seatId,
        status: newStatus,
      });
    } catch (error) {
      console.error("Error updating seat:", error);
    }
  };

  const updateSelectedSeat = () => {
    const seatSelectionValue = getLocalStorageValue("selectedSeat");
    seatSelectionValue.forEach(
      ({ rowId, seatId }: { rowId: string; seatId: string }) => {
        // Example: Update the status of selected seats to 'occupied'
        updateSeat(rowId, seatId, "occupied");
      }
    );
  };

  useEffect(() => {
    updateSelectedSeat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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
            <Button
              className="bg-slate-700 hover:bg-slate-700 dark:text-white"
              onClick={() => navigate("/trip")}
            >
              Continue
            </Button>
          </div>
        </Card>
      </div>
    </DefaultLayout>
  );
};

export default SuccesfulPayment;
