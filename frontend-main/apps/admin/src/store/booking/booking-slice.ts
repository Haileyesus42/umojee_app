import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import { getBookedFlights } from './booking-extra';
import { bookingInitialState } from '../initialStates';
import { Booking } from '../../interface/booking';

const bookingSlice = createSlice({
  name: 'booking',
  initialState: bookingInitialState,
  reducers: {
    updateIsFetchingBookingList: (
      state,
      { payload }: PayloadAction<boolean>,
    ) => {
      state.isFetchingBookingList = payload;
    },
    updateShowBookingFormModal: (
      state,
      { payload }: PayloadAction<boolean>,
    ) => {
      state.showBookingFromModal = payload;
    },
    updateShowEditBookingModal: (
      state,
      { payload }: PayloadAction<boolean>,
    ) => {
      state.showEditBookingModal = payload;
    },
    updateShowViewBookingModal: (
      state,
      { payload }: PayloadAction<boolean>,
    ) => {
      state.showViewBookingModal = payload;
    },
    updateSelectedBooking: (state, { payload }) => {
      state.selectedBooking = payload;
    },
    updateIsCreatingFlightBooking: (
      state,
      { payload }: PayloadAction<boolean>,
    ) => {
      state.isCreatingFlightBooking = payload;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(getBookedFlights.fulfilled, (state, { payload }) => {
        state.bookingsList = payload;
        state.isFetchingBookingList = false;
      })
      .addCase(getBookedFlights.rejected, (state) => {
        state.isFetchingBookingList = false;
      });
  },
});

export const {
  updateIsFetchingBookingList,
  updateShowBookingFormModal,
  updateShowEditBookingModal,
  updateShowViewBookingModal,
  updateSelectedBooking,
  updateIsCreatingFlightBooking,
} = bookingSlice.actions;
export default bookingSlice.reducer;
