import axios from 'axios';
import toast from 'react-hot-toast';
import { Dispatch } from 'redux';
import { cookies } from '../../main';
import { getAllAgencies, removeFromAgencies, removeMultipleAgencies } from './agenciesSlice';

const backendUrl = (import.meta as any).env.VITE_BACKEND_URL;

export const fetchAgenciesData = () => {
    return async (dispatch: Dispatch) => {
        try {
            const token = cookies.get('token');
            const res = await axios.get(`${backendUrl}/agency/getAllAgencies`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = res.data.agencies; // Fix here, it should be agents not flights
            dispatch(getAllAgencies(data));
        } catch (error: any) {
            toast.error('Something went wrong!');
        }
    };
};
export const createAgencyData = (data: any) => {
    return async (dispatch: Dispatch) => {
        try {
            const token = cookies.get('token');
            await axios.post(`${backendUrl}/agency/create`, data, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            dispatch(fetchAgenciesData() as any);
            toast.success('Agency Added Successfully!');
        } catch (error: any) {
            toast.error(error.message ? error.message : 'Something went wrong!');
        }
    };
};


export const deleteAgencyData = (id: string) => {
    return async (dispatch: Dispatch) => {
        try {
            const token = cookies.get('token');
            await axios.delete(`${backendUrl}/agency/delete/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            dispatch(removeFromAgencies(id));
            dispatch(fetchAgenciesData() as any);
        } catch (error: any) {
            toast.error(error.message ? error.message : 'Something went wrong!');
        }
    };
};

export const deleteAgencies = (ids: string[]) => {
    return async (dispatch: Dispatch) => {
        try {
            const token = cookies.get('token');
            await axios.delete(`${backendUrl}/agency/deleteMany`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                data: { ids },
            });
            dispatch(removeMultipleAgencies(ids));
            dispatch(fetchAgenciesData() as any);
        } catch (error: any) {
            toast.error(error.message ? error.message : 'Something went wrong!');
        }
    };
};