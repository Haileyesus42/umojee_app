import axios from "axios";
import { Dispatch } from "redux";
import { featuredFlights, replaceData } from "./flightSlice";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

export const fetchFlightData = () => {
  return async (dispatch: Dispatch) => {
    try {
      const res = await axios.get(`${backendUrl}/api/client/flight/search`);
      const data = res.data;
      dispatch(replaceData(data.flights));
    } catch (error: any) {}
  };
};

export const createFlightData = (data: any) => {
  return async (dispatch: Dispatch) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_BASE_URL}/api/flights`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      dispatch(fetchFlightData() as any);
    } catch (error: any) {}
  };
};

export const fetchFeaturedFlights = () => {
  return async (dispatch: Dispatch) => {
    try {
      const res = await axios.get(`${backendUrl}/api/client/flight/featured`);
      const data = res.data;
      dispatch(featuredFlights(data));
    } catch (error: any) {}
  };
};
