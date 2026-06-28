import { createSlice } from "@reduxjs/toolkit";
import { storeLocallyWithExpiry } from "../../lib/utils";
import {
  ExtraOptions,
  Flights,
  PassengersDetails,
  SearchValuesProps,
} from "../../types/types";

interface SelectFlightProps extends Flights {
  totalPassengers: string;
  totalPrice: number;
}

interface flightStateProps {
  flightsList: Flights[];
  featuredFlights: Flights[];
  filteredFlightsList: Flights[];
  filteredReturnFlightsList: Flights[];
  selectedFlight: SelectFlightProps | null;
  selectedReturnFlight: SelectFlightProps | null;
  searchFlightData: SearchValuesProps | null;
  passengers: PassengersDetails[];
  extraOptions: ExtraOptions | null;
}

const initialState: flightStateProps = {
  flightsList: [],
  featuredFlights: [],
  filteredFlightsList: [],
  filteredReturnFlightsList: [],
  selectedFlight: null,
  selectedReturnFlight: null,
  searchFlightData: null,
  passengers: [],
  extraOptions: null,
};

const flightSlice = createSlice({
  name: "flight",
  initialState,
  reducers: {
    replaceData(state, action) {
      state.flightsList = action.payload;
      storeLocallyWithExpiry("flightsList", action.payload);
    },
    featuredFlights(state, action) {
      state.featuredFlights = action.payload;
      storeLocallyWithExpiry("featuredFlights", action.payload);
    },
    searchFlight(state, action) {
      state.filteredFlightsList = action.payload;
      storeLocallyWithExpiry("filteredFlightsList", action.payload);
    },
    searchReturnFlight(state, action) {
      state.filteredReturnFlightsList = action.payload;
      storeLocallyWithExpiry("filteredReturnFlightsList", action.payload);
    },
    selectFlight(state, action) {
      state.selectedFlight = action.payload;
      storeLocallyWithExpiry("selectedFlight", action.payload);
    },
    selectReturnFlight(state, action) {
      state.selectedReturnFlight = action.payload;
      storeLocallyWithExpiry("selectedReturnFlight", action.payload);
    },
    setSearchFlightData(state, action) {
      state.searchFlightData = action.payload;
      storeLocallyWithExpiry("searchFlightData", action.payload);
    },
    setPassengersData(state, action) {
      state.passengers = action.payload;
      storeLocallyWithExpiry("passengers", action.payload);
    },
    setExtraOptionsData(state, action) {
      state.extraOptions = action.payload;
      storeLocallyWithExpiry("extraOptions", action.payload);
    },
  },
});

export const {
  selectFlight,
  featuredFlights,
  searchReturnFlight,
  selectReturnFlight,
  searchFlight,
  replaceData,
  setSearchFlightData,
  setExtraOptionsData,
  setPassengersData,
} = flightSlice.actions;
export default flightSlice;
