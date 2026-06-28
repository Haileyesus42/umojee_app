import toast from 'react-hot-toast';
import { Dispatch } from 'redux';
import { removeFromAgencies, updateIsFetchingAgencies } from './agenciesSlice';
import API from '../../config/axios-config';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { HTTP_RESPONSE } from '../../constants/general';

export const getAgencies = createAsyncThunk(
    'agencies/getAgencies',
    async (_, { dispatch }) => {
        try {
            dispatch(updateIsFetchingAgencies(true));
            const { data } = await API.get('/admin/agency/getAllAgencies');
            return data.agencies ?? [];
        } catch (error: any) {
            toast.error('Something went wrong!');
        }
    },
);


export const createAgencyData = createAsyncThunk(
    'agencies/create',
    async (data: any, { dispatch }) => {
        try {
            await API.post(`/admin/agency/create`, data);
            dispatch(getAgencies());
            toast.success('Agency Added Successfully!');
        } catch (error: any) {
            toast.error(error.message ? error.message : 'Something went wrong!');
        }
    },
);

export const deleteAgencyData = createAsyncThunk(
    'agencies/deleteAgency',
    async (_id: string, { dispatch }) => {
        try {
            await API.delete(`/admin/agency/delete/${_id}`);
            dispatch(removeFromAgencies(_id));
            toast.success('Agency data deleted successfully!');
            dispatch(getAgencies());
        } catch (error: any) {
            toast.error(error.message ? error.message : 'Something went wrong!');
        }
    },
);

export const deleteAgencies = createAsyncThunk(
    'agencies/deleteManyAgencies',
    async (ids: string[], { dispatch }) => {
        try {
            await API.delete(`/admin/agency/deleteMany`, { data: ids });
            toast.success('Agencies Deleted Successfully!');
            dispatch(getAgencies());
        } catch (error: any) {
            toast.error(error.message ? error.message : 'Something went wrong!');
        }
    },
);

export const disableAgency = createAsyncThunk(
    'agencies/disable',
    async (_id: string, { dispatch }) => {
        try {
            await API.patch(`/admin/agency/disable?id=${_id}`);
            // dispatch(removeFromAgents(_id));
            toast.success('Agency disabled successfully!');
            dispatch(getAgencies());
        } catch (error: any) {
            toast.error(error.message ? error.message : 'Something went wrong!');
        }
    },
);
export const enableAgency = createAsyncThunk(
    'agencies/enable',
    async (_id: string, { dispatch }) => {
        try {
            await API.patch(`/admin/agency/enable?id=${_id}`);
            // dispatch(removeFromAgents(_id));
            toast.success('Agency enabled successfully!');
            dispatch(getAgencies());
        } catch (error: any) {
            toast.error(error.message ? error.message : 'Something went wrong!');
        }
    },
);
export const updateAgencyData = (data: any) => {
    return async (dispatch: Dispatch) => {
        try {
            const id = data._id;
            const { status } = await API.patch(`/admin/agency/update?id=${id}`, data);
            status === HTTP_RESPONSE.UPDATED
                ? dispatch(getAgencies() as any)
                : toast.success('Unsuccessfully!');
            toast.success('Agency Updated Successfully!');
        } catch (error: any) {
            toast.error(error.message ? error.message : 'Something went wrong!');
        }
    };
};