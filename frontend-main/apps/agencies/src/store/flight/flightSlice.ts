import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { storeLocallyWithExpiry } from '../../lib/utils';
import { getFlights } from './flightActions';
import { flightInitialState } from '../initialStates';

const flightSlice = createSlice({
  name: 'flight',
  initialState: flightInitialState,
  reducers: {
    updateIsFetchingFlightList: (
      state,
      { payload }: PayloadAction<boolean>,
    ) => {
      state.isFetchingFlightList = payload;
    },
    searchFlight(state, action) {
      state.filteredFlightsList = action.payload;
      storeLocallyWithExpiry('filteredFlightsList', action.payload);
    },
    searchReturnFlight(state, action) {
      state.filteredReturnFlightsList = action.payload;
      storeLocallyWithExpiry('filteredReturnFlightsList', action.payload);
    },
    selectFlight(state, action) {
      state.selectedFlight = action.payload;
      storeLocallyWithExpiry('selectedFlight', action.payload);
    },
    selectReturnFlight(state, action) {
      state.selectedReturnFlight = action.payload;
      storeLocallyWithExpiry('selectedReturnFlight', action.payload);
    },
    setSearchFlightData(state, action) {
      state.searchFlightData = action.payload;
      storeLocallyWithExpiry('searchFlightData', action.payload);
    },
    setPassengersData(state, action) {
      state.passengers = action.payload;
      storeLocallyWithExpiry('passengers', action.payload);
    },
    setPassengersContact(state, action) {
      state.passengersContact = action.payload;
      storeLocallyWithExpiry('passengersContact', action.payload);
    },
    setExtraOptionsData(state, action) {
      state.extraOptions = action.payload;
      storeLocallyWithExpiry('extraOptions', action.payload);
    },
    removeFromFlight(state, action) {
      const index = state.flightList.findIndex(
        (flight) => flight._id === action.payload,
      );

      state.flightList.splice(index, 1);
    },
  },
  extraReducers(builder) {
    builder
      .addCase(getFlights.fulfilled, (state, { payload }) => {
        state.flightList = payload;
        state.isFetchingFlightList = false;
      })
      .addCase(getFlights.rejected, (state) => {
        state.isFetchingFlightList = false;
      });
  },
});

export const {
  removeFromFlight,
  setExtraOptionsData,
  setPassengersData,
  setPassengersContact,
  setSearchFlightData,
  selectReturnFlight,
  selectFlight,
  searchReturnFlight,
  searchFlight,
  updateIsFetchingFlightList,
} = flightSlice.actions;
export default flightSlice.reducer;
