import toast from 'react-hot-toast';
import { Dispatch } from 'redux';
import { updateIsFetchingStaffs, removeFromStaff } from './staff-slice';
import API from '../../config/axios-config';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const getStaffs = createAsyncThunk(
  'staff/getStaffs',
  async (_, { dispatch }) => {
    try {
      dispatch(updateIsFetchingStaffs(true));
      const { data } = await API.get('admin/user/getall');
      return data.data.users ?? [];
    } catch (error: any) {
      toast.error('Something went wrong!');
    }
  },
);

export const updateStaffData = (data: any) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.patch(`admin/user/update?id=${data._id}`, data);
      dispatch(getStaffs() as any);
      toast.success('Flight Updated Successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const deleteStaffData = (id: string) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.delete(`admin/user/delete/${id}`);
      dispatch(removeFromStaff(id));
      toast.success('Staff data deleted successfully!');
      dispatch(getStaffs() as any);
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const deleteStaffs = (ids: string[]) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.delete(`admin/user/deleteMany`, { data: ids });
      dispatch(getStaffs() as any);
      toast.success('Flights Deleted Successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const ToggleUsersStatus = (
  id: string,
  status: 'activate' | 'deactivate',
) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.patch(`admin/user/toggleStatus`, {
        id,
        status,
      });
      dispatch(getStaffs() as any);
      toast.success('User Status Updated successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
      console.log(error.message?.error.message);
    }
  };
};
