import toast from 'react-hot-toast';
import { Dispatch } from 'redux';
import {
  removeFromFlight,
  setExtraOptionsData,
  updateIsFetchingFlightList,
} from './flightSlice';
import API from '../../config/axios-config';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { storeLocallyWithExpiry } from '../../lib/utils';
import { ExtraOptions } from '../../types/types';

export const getFlights = createAsyncThunk(
  'flight/getFlights',
  async (_, { dispatch }) => {
    try {
      dispatch(updateIsFetchingFlightList(true));
      const { data } = await API.get(`/admin/flight/getall`);
      return data?.flights ?? [];
    } catch (error: any) {
      toast.error('Something went wrong!');
    }
  },
);

export const createFlightData = (data: any) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.post(`/admin/flight/create`, data);
      dispatch(getFlights() as any);
      toast.success('Flight Added Successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
      console.log("Can't create the flight");
    }
  };
};

export const updateFlightData = (data: any) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.patch(`/admin/flight/update?id=${data.id}`, data);
      dispatch(getFlights() as any);
      toast.success('Flight Updated Successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const deleteFlightData = (id: string) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.delete(`/admin/flight/delete?id=${id}`);
      dispatch(removeFromFlight(id));
      dispatch(getFlights() as any);
      toast.success('Flight Deleted Successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const deleteFlights = (ids: string[]) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.delete(`/admin/flight/deleteMany`, {
        data: { ids },
      });
      dispatch(getFlights() as any);
      toast.success('Flights Deleted Successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const archiveFlight = (id: string) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.patch(`/admin/flight/archive?id=${id}`);
      dispatch(removeFromFlight(id));
      dispatch(getFlights() as any);
      toast.success('Flight Archived Successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const cancelFlight = (id: string) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.patch(`/admin/flight/cancel?id=${id}`);
      // dispatch(removeFromFlight(id));
      dispatch(getFlights() as any);
      toast.success('Flight Cancelled Successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const extraOptionsFlight = (data: ExtraOptions) => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(setExtraOptionsData(data));
      storeLocallyWithExpiry('extraOptions', data);
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};
