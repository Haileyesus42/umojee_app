import {
  updateIsCreatingFlightBooking,
  updateIsFetchingBookingList,
  updateShowBookingFormModal,
} from './booking-slice';
import { createAsyncThunk, Dispatch } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import API from '../../config/axios-config';
import { CreatingFlightBookingPayload } from '../../interface/booking';
import { HTTP_RESPONSE } from '../../constants/general';
import { fetchNotificationsData } from '../notifications/notificationActions';

export const getBookedFlights = createAsyncThunk(
  'booking/getBookedFlights',
  async (_, { dispatch }) => {
    try {
      dispatch(updateIsFetchingBookingList(true));
      const { data } = await API.get(`/admin/booking/getall`);
      return data?.bookings ?? [];
    } catch (error: any) {
      toast.error('Something went wrong!');
    }
  },
);

export const createFlightBooking = createAsyncThunk(
  'booking/createFlightBooking',
  async (payload: CreatingFlightBookingPayload, { dispatch }) => {
    try {
      dispatch(updateIsCreatingFlightBooking(true));
      const { status, data } = await API.post(
        `/admin/booking/checkout-session`,
        payload,
      );
      if (status === HTTP_RESPONSE.SUCCESS) {
        toast.success(data?.message);
        dispatch(updateShowBookingFormModal(false));
        dispatch(getBookedFlights());
      } else {
        toast.error('Something went wrong!');
      }
      dispatch(updateIsCreatingFlightBooking(false));
    } catch (error: any) {
      console.log(error);
      toast.error('Something went wrong!');
      dispatch(updateIsCreatingFlightBooking(false));
    }
  },
);

export const updateBookingData = (data: any) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.patch(
        `/admin/booking/update?id=${data.id}`,

        data,
      );
      dispatch(getBookedFlights() as any);
      toast.success('Booking Updated Successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const deleteBookingData = (id: string) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.delete(`/admin/booking/delete/${id}`);

      dispatch(getBookedFlights() as any);
      toast.success('Booking deleted successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const deleteBookings = (ids: string[]) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.delete(`/admin/booking/deleteMany`, {
        data: { ids },
      });
      dispatch(getBookedFlights() as any);
      toast.success('Selected Bookings deleted successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const updatePassengers = (data: {
  id: string;
  email: string;
  passengers?: {
    title: string;
    firstName: string;
    lastName: string;
  }[];
}) => {
  return async (dispatch: Dispatch) => {
    try {
      const { status } = await API.patch(`/admin/booking/update/passengers/information/${data.id}`, data);
      if (status === HTTP_RESPONSE.SUCCESS) {
        toast.success("Passengers information updated successfully");
        dispatch(getBookedFlights() as any);
      } else {
        toast.error('Something went wrong!');
      }
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const updateLuggages = (data: {
  id: string;
  luggage?: number;

}) => {
  return async (dispatch: Dispatch) => {
    try {
      const response = await API.patch(`/admin/booking/update/luggage/${data.id}`, data);
      const { status, message } = response.data
      if (status === 'success') {
        await dispatch(getBookedFlights() as any);
        await dispatch(fetchNotificationsData() as any);
        toast.success(message);
      } else {
        toast.error('Something went wrong!');
      }
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const bookingCheckIn = (data: {
  id?: string;
  country?: string;
  luggage?: number;
  nationality?: string;
  expirationDate?: Date;
  docNo?: string;
  selectedSeatNumber?: string;
}) => {
  return async (dispatch: Dispatch) => {
    try {
      const response = await API.patch(`/admin/booking/update/checkin`, data);

      const { status, message } = response.data;
      if (status === 'success') {
        await dispatch(getBookedFlights() as any);
        await dispatch(fetchNotificationsData() as any);
        if (message) {
          toast.success(message);
        } else {
          toast.success("Check-in completed successfully!");
        }
      } else {
        toast.error(message || 'Something went wrong!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Something went wrong!');
    }
  };
};
