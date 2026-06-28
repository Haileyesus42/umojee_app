import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { passengerInitialState } from '../initialStates';
import { getPassengers } from './passenger-extra';

const passengerSlice = createSlice({
  name: 'passenger',
  initialState: passengerInitialState,
  reducers: {
    removeFromPassenger(state, action) {
      const index = state.passengerList.findIndex(
        (passenger) => passenger._id === action.payload,
      );
      state.passengerList.splice(index, 1);
    },
    updateIsFetchingPassengerList: (
      state,
      { payload }: PayloadAction<boolean>,
    ) => {
      state.isFetchingPassengerList = payload;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(getPassengers.fulfilled, (state, { payload }) => {
        state.passengerList = payload;
        state.isFetchingPassengerList = false;
      })
      .addCase(getPassengers.rejected, (state) => {
        state.isFetchingPassengerList = false;
      });
  },
});

export const { removeFromPassenger, updateIsFetchingPassengerList } =
  passengerSlice.actions;
export default passengerSlice.reducer;
