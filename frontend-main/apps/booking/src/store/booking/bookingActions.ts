import axios from "axios";
import { fetchMyBookings } from "./bookingSlice";
import { Dispatch } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import { getLocalStorageValue } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

const backendUrl = process.env.REACT_APP_BACKEND_URL;
let token: string | null = null;

export const fetchBookingData = () => {
  return async (dispatch: Dispatch) => {
    try {
      token = getLocalStorageValue("token");
      const res = await axios.get(
        `${backendUrl}/api/client/booking/getBookings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.data.data;
      dispatch(fetchMyBookings(data));
    } catch (error: any) {
      toast.error("Something went wrong!");
    }
  };
};

export const cancelBookingData = (data: any, navigate: any) => {
  return async (dispatch: Dispatch) => {
    try {
      token = getLocalStorageValue("token");
      const res = await axios.post(
        `${backendUrl}/api/client/booking/cancel/${data.bookingId}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      dispatch(fetchBookingData() as any);
      navigate("/trip");
    } catch (error: any) {
      toast.error(error.response.data.message);
      console.log(error);
      navigate("/trip");
    }
  };
};
