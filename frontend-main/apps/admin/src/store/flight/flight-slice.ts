import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  createFlight,
  getFlights,
  searchDirectFlights,
  searchReturnFlights,
} from './flight-extra';
import { flightInitialState } from '../initialStates';
import { Flight } from '../../interface/flight';

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
    updateShowFlightFormModal: (state, { payload }: PayloadAction<boolean>) => {
      state.showFlightFormModal = payload;
      if (!payload) {
        state.selectedFlight = null;
      }
    },
    updateIsDeletingFlight: (state, { payload }: PayloadAction<boolean>) => {
      state.isDeletingFlight = payload;
    },
    updateIsArchivingFlight: (state, { payload }: PayloadAction<boolean>) => {
      state.isArchivingFlight = payload;
    },
    updateIsCreatingFlight: (state, { payload }: PayloadAction<boolean>) => {
      state.isCreatingFlight = payload;
    },
    updateIsUpdatingFlight: (state, { payload }: PayloadAction<boolean>) => {
      state.isUpdatingFlight = payload;
    },
    updateSelectedFlight(state, { payload }) {
      state.selectedFlight = payload;
    },
    updateSelectedFlightIds: (state, { payload }: PayloadAction<string[]>) => {
      state.selectedFlightIds = payload;
    },
    updateIsDeletingAllFlights: (
      state,
      { payload }: PayloadAction<boolean>,
    ) => {
      state.isDeletingAllFlights = payload;
    },
    updateIsSearchingDirectFlights: (
      state,
      { payload }: PayloadAction<boolean>,
    ) => {
      state.isSearchingDirectFlights = payload;
    },
    updateDirectFlights: (state, { payload }: PayloadAction<Flight[]>) => {
      state.directFlights = payload;
    },
    updateIsSearchingReturnFlights: (
      state,
      { payload }: PayloadAction<boolean>,
    ) => {
      state.isSearchingReturnFlights = payload;
    },
    updateReturnFlights: (state, { payload }: PayloadAction<Flight[]>) => {
      state.returnFlights = payload;
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
      })
      .addCase(createFlight.fulfilled, (state, { payload }) => {
        state.isCreatingFlight = false;
        state.showFlightFormModal = false;
        payload && state.flightList.push(payload);
      })
      .addCase(searchDirectFlights.fulfilled, (state, { payload }) => {
        state.directFlights = payload;
        state.isSearchingDirectFlights = false;
      })
      .addCase(searchDirectFlights.rejected, (state) => {
        state.isSearchingDirectFlights = false;
      })
      .addCase(searchReturnFlights.fulfilled, (state, { payload }) => {
        state.returnFlights = payload;
        state.isSearchingReturnFlights = false;
      })
      .addCase(searchReturnFlights.rejected, (state) => {
        state.isSearchingReturnFlights = false;
      });
  },
});

export const {
  updateIsFetchingFlightList,
  updateShowFlightFormModal,
  updateIsDeletingFlight,
  updateIsArchivingFlight,
  updateIsCreatingFlight,
  updateIsUpdatingFlight,
  updateSelectedFlight,
  updateSelectedFlightIds,
  updateIsDeletingAllFlights,
  updateIsSearchingDirectFlights,
  updateDirectFlights,
  updateIsSearchingReturnFlights,
  updateReturnFlights,
} = flightSlice.actions;
export default flightSlice.reducer;
