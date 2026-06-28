import axios from 'axios';
import {
  fetchTodayBooking,
  fetchAllBookings,
  fetchGraphsData,
  fetchCardsData,
  fetchPieChart,
} from './dashboardSlice';
import { cookies } from '../../main';
import { Dispatch } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';

const backendUrl = (import.meta as any).env.VITE_BACKEND_URL;

export const fetchDashboardCardsData = () => {
  return async (dispatch: Dispatch) => {
    try {
      const token = cookies.get('token');
      const res = await axios.get(`${backendUrl}/cards/bookings/getall`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = res.data;
      dispatch(fetchCardsData(data));
    } catch (error: any) {
      toast.error('Something went wrong!');
    }
  };
};
export const fetchLineGraphsData = (year: number) => {
  return async (dispatch: Dispatch) => {
    try {
      const token = cookies.get('token');
      const res = await axios.get(
        `${backendUrl}/cards/flights/monthlystatus/getall/${year}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = res.data;
      dispatch(fetchGraphsData(data.data));
    } catch (error: any) {
      toast.error('Something went wrong!');
    }
  };
};

export const fetchPieChartData = () => {
  return async (dispatch: Dispatch) => {
    try {
      const token = cookies.get('token');
      const res = await axios.get(
        `${backendUrl}/cards/flights/status/piechart`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = res.data;
      dispatch(fetchPieChart(data));
    } catch (error: any) {
      toast.error('Something went wrong!');
    }
  };
};
export const fetchDashboardAllBookingData = () => {
  return async (dispatch: Dispatch) => {
    try {
      const token = cookies.get('token');
      const res = await axios.get(
        `${backendUrl}/cards/bookings/allbookings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = res.data;
      dispatch(fetchAllBookings(data.updateBookings));
    } catch (error: any) {
      toast.error('Something went wrong!');
    }
  };
};
export const fetchDashboardTodayBookingData = () => {
  return async (dispatch: Dispatch) => {
    try {
      const token = cookies.get('token');
      const res = await axios.get(
        `${backendUrl}/cards/bookings/status/today`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = res.data;
      dispatch(fetchTodayBooking(data));
    } catch (error: any) {
      toast.error('Something went wrong!');
    }
  };
};
