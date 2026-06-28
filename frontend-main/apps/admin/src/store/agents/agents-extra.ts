import toast from 'react-hot-toast';
import { Dispatch } from 'redux';
import { removeFromAgents, updateIsFetchingAgents } from './agents-slice';
import API from '../../config/axios-config';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const getAgents = createAsyncThunk(
  'agents/getAgents',
  async (_, { dispatch }) => {
    try {
      dispatch(updateIsFetchingAgents(true));
      const { data } = await API.get('/admin/agent/getAllAgents');
      return data.agents ?? [];
    } catch (error: any) {
      toast.error('Something went wrong!');
    }
  },
);

export const updateAgentsData = (data: any) => {
  return async (dispatch: Dispatch) => {
    try {
      await API.patch(`/admin/agent/update?id=${data._id}`, data);
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
      await API.post(`/admin/agent/create`, data);
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
      await API.delete(`/admin/agent/delete/${_id}`);
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
      await API.delete(`/admin/agent/deleteMany`, { data: ids });
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
      await API.patch(`/admin/agent/disable?id=${_id}`);
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
      await API.patch(`/admin/agent/enable?id=${_id}`);
      // dispatch(removeFromAgents(_id));
      toast.success('Agent enabled successfully!');
      dispatch(getAgents());
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  },
);