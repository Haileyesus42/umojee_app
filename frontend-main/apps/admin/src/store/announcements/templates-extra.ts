import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  updateIsFetchingTemplates,
  removeFromTemplates,
} from './templates-slice';
import API from '../../config/axios-config';
import { Dispatch } from 'redux';
import toast from 'react-hot-toast';

export const createTemplate = createAsyncThunk(
  'announcement/templates/create',
  async (data: any, { dispatch }) => {
    try {
      await API.post(`/admin/announcement/templates/create`, data);
      dispatch(getTemplates());
      toast.success('Announcement template Added Successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  },
);

export const getTemplates = createAsyncThunk(
  'announcements/templates/getAll',
  async (_, { dispatch }) => {
    try {
      dispatch(updateIsFetchingTemplates(true));
      const { data } = await API.get('/admin/announcement/templates/getall');
      return data.templates ?? [];
    } catch (error: any) {
      toast.error('Something went wrong!');
    }
  },
);

export const updateTemplate = (data: any) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.patch(
        `/admin/announcement/templates/update?id=${data.id}`,
        data,
      );
      dispatch(getTemplates() as any);
      toast.success('Announcement Template Updated Successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const deleteTemplate = (id: string) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.delete(`/admin/announcement/templates/delete?id=${id}`);
      dispatch(removeFromTemplates(id));
      dispatch(getTemplates() as any);
      toast.success('Announcement Template deleted successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const deleteTemplates = (ids: string[]) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.delete(`/admin/announcement/templates/deleteMany`, {
        data: { ids },
      });
      dispatch(getTemplates() as any);
      toast.success('Announcement Templates are deleted successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};
