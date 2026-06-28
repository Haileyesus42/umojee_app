import { createAsyncThunk } from "@reduxjs/toolkit";
import { updateIsFetchingAnnouncements, removeFromAnnouncements } from './announcement-slice';
import API from "../../config/axios-config";
import { Dispatch } from 'redux';
import toast from "react-hot-toast";
import { HTTP_RESPONSE } from "../../constants/general";
import { fetchNotificationsData } from "../notifications/notificationActions";

export const createAnnouncement = createAsyncThunk(
    'announcement/create',
    async (data: any, { dispatch }) => {
        try {
            const { status } = await API.post(`/announcement/create`, data);
            status === HTTP_RESPONSE.CREATED
                ? toast.success('Announcement Added Successfully!')
                : toast.error('Something went wrong!')
            dispatch(fetchNotificationsData() as any);
        } catch (error: any) {
            toast.error(error.message ? error.message : 'Something went wrong!');
        }
    },
);

export const getAnnouncements = createAsyncThunk(
    'announcements/getAll',
    async (_, { dispatch }) => {
        try {
            dispatch(updateIsFetchingAnnouncements(true));
            const { data } = await API.get('/announcement/getall');
            return data.announcements ?? [];
        } catch (error: any) {
            toast.error('Something went wrong!');
            return [];
        }
    },
);

export const getAnnouncementsByUserId = createAsyncThunk(
    'announcements/getAll',
    async (user: any, { dispatch }) => {
        try {
            dispatch(updateIsFetchingAnnouncements(true));
            const { data } = await API.get('/announcement/getall', {
                params: { userId: user._id },
            });
            dispatch(fetchNotificationsData() as any);
            return data.announcements ?? [];
        } catch (error: any) {
            toast.error('Something went wrong!');
            return [];
        }
    },
);


export const updateTemplate = (data: any) => {
    return async (dispatch: Dispatch) => {
        try {
            await API.patch(`/announcement/update?id=${data.id}`, data);
            dispatch(getAnnouncements() as any);
            toast.success('Announcement Updated Successfully!');
        } catch (error: any) {
            toast.error(error.message ? error.message : 'Something went wrong!');
        }
    };
};

export const deleteAnnouncement = (id: string) => {
    return async (dispatch: Dispatch) => {
        try {
            const status = await API.delete(`/announcement/delete?id=${id}`);
            if (status.status == 200) {
                dispatch(removeFromAnnouncements(id));
                dispatch(getAnnouncements() as any);
                toast.success('Announcement deleted successfully!');
            } else {
                toast.success('Something went wrong!');
            }
        } catch (error: any) {
            toast.error(error.message ? error.message : 'Something went wrong!');
        }
    };
};

export const deleteAnnouncements = (ids: string[]) => {
    return async (dispatch: Dispatch) => {
        try {
            const status = await API.delete(`/announcement/deleteMany`, {
                data: { ids },
            });
            if (status.status == 200) {
                toast.success('Announcements are deleted successfully!');
                dispatch(getAnnouncements() as any);
            } else {
                toast.success('Something went wrong!');
            }
        } catch (error: any) {
            toast.error(error.message ? error.message : 'Something went wrong!');
        }
    };
};
