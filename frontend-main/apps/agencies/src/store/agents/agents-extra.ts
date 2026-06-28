import toast from 'react-hot-toast';
import { Dispatch } from 'redux';
import { removeFromAgents, updateIsFetchingAgents } from './agents-slice';
import API from '../../config/axios-config';
import { createAsyncThunk } from '@reduxjs/toolkit';

import { AGENCY_ID } from '../../constants/general';

const agencyId = localStorage.getItem(AGENCY_ID);
// const agencyName = localStorage.getItem(AGENCY_NAME);

export const getAgents = createAsyncThunk(
  'agents/getAgents',
  async (_, { dispatch }) => {
    try {
      dispatch(updateIsFetchingAgents(true));
      const { data } = await API.get(`/user/get/by-agency?id=${agencyId}`);
      // console.log(data);
      return data.data ?? [];
    } catch (error: any) {
      toast.error('Something went wrong!');
      return [];
    }
  },
);

export const updateAgentsData = (data: any) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.patch(`/user/update?id=${data._id}`, data);
      dispatch(getAgents() as any);
      toast.success('Agents Updated Successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  };
};

export const createAgentData = createAsyncThunk(
  'agents/create',
  async (data: any, { dispatch }) => {
    try {
      await API.post(`/user/create`, data);
      dispatch(getAgents());
      toast.success('Agent Added Successfully!');
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  },
);

export const deleteAgentData = createAsyncThunk(
  'agents/deleteAgent',
  async (_id: string, { dispatch }) => {
    try {
      await API.delete(`/user/delete/${_id}`);
      dispatch(removeFromAgents(_id));
      toast.success('Agent data deleted successfully!');
      dispatch(getAgents());
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  },
);

export const deleteAgents = createAsyncThunk(
  'agents/deleteManyAgents',
  async (ids: string[], { dispatch }) => {
    try {
      await API.delete(`/user/deleteMany`, { data: ids });
      toast.success('Agents Deleted Successfully!');
      dispatch(getAgents());
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  },
);

export const disableAgent = createAsyncThunk(
  'agents/disable',
  async (_id: string, { dispatch }) => {
    try {
      await API.patch(`/user/disable?id=${_id}`);
      // dispatch(removeFromAgents(_id));
      toast.success('Agent disabled successfully!');
      dispatch(getAgents());
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  },
);

export const enableAgent = createAsyncThunk(
  'agents/enable',
  async (_id: string, { dispatch }) => {
    try {
      await API.patch(`/user/enable?id=${_id}`);
      // dispatch(removeFromAgents(_id));
      toast.success('Agent enabled successfully!');
      dispatch(getAgents());
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  },
);
