// import axios from 'axios';
import API from '../../config/axios-config';
import { Dispatch } from 'redux';
import toast from 'react-hot-toast';
import { fetchNotifications, updateNotifications } from './notificationSlice';

export const fetchNotificationsData = () => {
  return async (dispatch: Dispatch) => {
    try {
      const res = await API.get('/notification/getall');
      const notifications = res.data?.notifications ?? [];

      dispatch(fetchNotifications(notifications));
    } catch (error: any) {
      toast.error('Something went wrong!');
    }
  };
};

export const updateNotificationStatus = (id: string) => {
  return async (dispatch: Dispatch) => {
    try {
      const response = await API.patch(`/notification/update/${id}`);
      const { status } = response.data;
      if (status === 'success') {
        dispatch(updateNotifications(id));
        dispatch(fetchNotificationsData() as any);
      }
    } catch (error: any) {
      toast.error('Something went wrong!');
    }
  };
};
