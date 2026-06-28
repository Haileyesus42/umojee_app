import { configureStore } from "@reduxjs/toolkit";
import bookingSlice from "./booking/bookingSlice";
import flightSlice from "./flight/flightSlice";

const store = configureStore({
  reducer: {
    // auth: AuthSlice.reducer,
    booking: bookingSlice.reducer,
    flight: flightSlice.reducer,
  },
});

export default store;
