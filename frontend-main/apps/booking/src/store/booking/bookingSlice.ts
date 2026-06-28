import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Flights } from "../../types/types";
import { storeLocallyWithExpiry } from "../../lib/utils";

interface BookingProps {
  _id: string;
  flightId: string;
  price: number;
  paid: boolean;
  status: string;
  passengers: {
    firstName: string;
    lastName: string;
    title: string;
    _id: string;
  }[];
  totalBaggages: number;
  createdAt: string;
  updatedAt: string;
}

interface BookingState {
  bookingsList: BookingProps[];
}

const initialState: BookingState = {
  bookingsList: [],
};

const bookingSlice = createSlice({
  name: "booking",
  initialState,
  reducers: {
    fetchMyBookings(state, action: PayloadAction<BookingProps[]>) {
      storeLocallyWithExpiry("bookingsList", action.payload);
      state.bookingsList = action.payload;
    },
  },
});

export const { fetchMyBookings } = bookingSlice.actions;
export default bookingSlice;
