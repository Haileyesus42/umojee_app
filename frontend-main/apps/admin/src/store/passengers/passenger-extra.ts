import toast from 'react-hot-toast';
import { Dispatch } from 'redux';
import {
  removeFromPassenger,
  updateIsFetchingPassengerList,
} from './passenger-slice';
import API from '../../config/axios-config';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const getPassengers = createAsyncThunk(
  'passenger/getPassengers',
  async (_, { dispatch }) => {
    try {
      dispatch(updateIsFetchingPassengerList(true));
      const { data } = await API.get(`admin/passenger/getall`);
      return data?.data.users ?? [];
    } catch (error: any) {
      toast.error('Something went wrong!');
    }
  },
);


export const deletePassengerData = (id: string) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.delete(`admin/passenger/delete`, {
        data: { id },
      });
      dispatch(removeFromPassenger(id));
      toast.success('Passenger Deleted Successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const deletePassengers = (ids: string[]) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.delete(`admin/passenger/delete`, {
        data: { ids },
      });
      dispatch(getPassengers() as any);
      toast.success('Passengers Deleted Successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const TogglePassengerStatus = (
  id: string,
  status: 'activate' | 'deactivate',
) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.patch(`admin/passenger/toggleStatus`, {
        id,
        status,
      });
      dispatch(getPassengers() as any);
      toast.success('Passenger Status Updated successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};
