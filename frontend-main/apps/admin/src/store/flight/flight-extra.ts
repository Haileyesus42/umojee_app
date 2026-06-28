import toast from 'react-hot-toast';
import {
  updateIsArchivingFlight,
  updateIsCreatingFlight,
  updateIsDeletingFlight,
  updateIsFetchingFlightList,
  updateIsSearchingDirectFlights,
  updateIsSearchingReturnFlights,
  updateIsUpdatingFlight,
  updateSelectedFlight,
  updateShowFlightFormModal,
} from './flight-slice';
import API from '../../config/axios-config';
import { createAsyncThunk, Dispatch } from '@reduxjs/toolkit';
import { HTTP_RESPONSE } from '../../constants/general';
import * as z from 'zod';
import { FlightFormSchema, SearchFlightsSchema } from '../../utils/schemas';
import { storeLocallyWithExpiry } from '../../lib/utils';

export const getFlights = createAsyncThunk(
  'flight/getFlights',
  async (_, { dispatch }) => {
    try {
      dispatch(updateIsFetchingFlightList(true));
      const { data } = await API.get(`/admin/flight/getall`);
      storeLocallyWithExpiry('flightList', data?.flights);
      return data?.flights ?? [];
    } catch (error: any) {
      toast.error('Something went wrong!');
    }
  },
);

export const createFlight = createAsyncThunk(
  'flight/create-flight',
  async (payload: z.infer<typeof FlightFormSchema>, { dispatch }) => {
    try {
      dispatch(updateIsCreatingFlight(true));
      const { status, data } = await API.post(`/admin/flight/create`, payload);
      status === HTTP_RESPONSE.CREATED
        ? toast.success(data?.message)
        : toast.error('Something went wrong!');
      return data.flight ?? null;
    } catch (error: any) {
      console.log(error);
      toast.error("Can't create the flight");
    }
  },
);

export const updateFlight = createAsyncThunk(
  'flight/update-flight',
  async (payload: z.infer<typeof FlightFormSchema>, { dispatch }) => {
    try {
      dispatch(updateIsUpdatingFlight(true));
      const { status } = await API.patch('/admin/flight/update', payload, {
        params: {
          id: payload.id,
        },
      });
      if (status === HTTP_RESPONSE.UPDATED) {
        dispatch(updateIsUpdatingFlight(false));
        dispatch(updateShowFlightFormModal(false));
        toast.success('Flight updated successfully');
        dispatch(getFlights());
      } else {
        toast.error('Something went wrong!');
      }
    } catch (error) {
      dispatch(updateIsUpdatingFlight(false));
      console.log(JSON.stringify(error));
      toast.error('Something went wrong!');
    }
  },
);

export const archiveFlight = createAsyncThunk(
  'flight/archive-flight',
  async (id: string, { dispatch }) => {
    try {
      dispatch(updateIsArchivingFlight(true));
      const { status, data } = await API.patch(
        `/admin/flight/archive?id=${id}`,
      );
      if (status === HTTP_RESPONSE.SUCCESS) {
        toast.success(data?.message);
        dispatch(getFlights());
        dispatch(updateSelectedFlight(null));
      } else {
        toast.error('Something went wrong!');
      }
      dispatch(updateIsArchivingFlight(false));
    } catch (error) {
      console.log(JSON.stringify(error));
      toast.error('Something went wrong!');
      dispatch(updateIsArchivingFlight(false));
    }
  },
);

export const deleteFlight = createAsyncThunk(
  'flight/delete-flight',
  async (id: string, { dispatch }) => {
    try {
      dispatch(updateIsDeletingFlight(true));
      const { status, data } = await API.delete(
        `/admin/flight/delete?id=${id}`,
      );
      if (status === HTTP_RESPONSE.SUCCESS) {
        toast.success(data?.message);
        dispatch(getFlights());
        dispatch(updateSelectedFlight(null));
      } else {
        toast.error('Something went wrong!');
      }
      dispatch(updateIsDeletingFlight(false));
    } catch (error) {
      console.log(JSON.stringify(error));
      toast.error('Something went wrong!');
    }
  },
);
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
export const searchDirectFlights = createAsyncThunk(
  'flight/search-direct-flights',
  async (
    { date, ...rest }: z.infer<typeof SearchFlightsSchema>,
    { dispatch },
  ) => {
    try {
      dispatch(updateIsSearchingDirectFlights(true));
      const { data } = await API.get(`/admin/flight/search-flights`, {
        params: {
          ...rest,
          startDate: date.start,
          endDate: date.end,
        },
      });
      return data?.flights ?? [];
    } catch (error) {
      console.log(JSON.stringify(error));
      toast.error('Something went wrong!');
    }
  },
);

export const searchReturnFlights = createAsyncThunk(
  'flight/search-return-flights',
  async (payload: { startDate: string; endDate: string }, { dispatch }) => {
    try {
      dispatch(updateIsSearchingReturnFlights(true));
      const { data } = await API.get(`/admin/flight/search-flights`, {
        params: {
          ...payload,
        },
      });
      return data?.flights ?? [];
    } catch (error) {
      console.log(JSON.stringify(error));
      toast.error('Something went wrong!');
    }
  },
);
