import { createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../config/axios-config';
import toast from 'react-hot-toast';
import {
  ApproveRefundPayload,
  RequestRefundPayload,
} from '../../interface/refund';
import {
  updateIsApprovingRefund,
  updateIsFetchingRefunds,
  updateIsRequestingRefund,
} from '../../store/refund/slice';
import { getBookedFlights } from '../booking/booking-extra';
import { HTTP_RESPONSE } from '../../constants/general';

export const getRefunds = createAsyncThunk(
  'refund/get-refunds',
  async (_, { dispatch }) => {
    try {
      dispatch(updateIsFetchingRefunds(true));
      const { data } = await API.get('/admin/refund/get-refunds');

      return data?.refunds ?? [];
    } catch (error) {
      console.log(JSON.stringify(error));
      toast.error('Something went wrong!');
    }
  },
);

export const requestRefund = createAsyncThunk(
  'refund/request-refund',
  async (payload: RequestRefundPayload, { dispatch }) => {
    try {
      dispatch(updateIsRequestingRefund(true));
      const { status } = await API.post(
        '/admin/refund/request-refund',
        payload,
      );
      status === HTTP_RESPONSE.CREATED
        ? dispatch(getBookedFlights())
        : toast.error('Something went wrong!');
      dispatch(updateIsRequestingRefund(false));
      toast.success('Successfully Requested Refund');
    } catch (error) {
      dispatch(updateIsRequestingRefund(false));
      console.log(JSON.stringify(error));
      toast.error('Something went wrong!');
    }
  },
);

export const approveRefund = createAsyncThunk(
  'refund/approve-refund',
  async (payload: ApproveRefundPayload, { dispatch }) => {
    try {
      dispatch(updateIsApprovingRefund(true));
      const { status } = await API.patch(
        '/admin/refund/approve-refund',
        payload,
      );
      status === HTTP_RESPONSE.UPDATED
        ? dispatch(getRefunds())
        : toast.error('Something went wrong!');
      dispatch(updateIsApprovingRefund(false));
      toast.success('Successfully Approved Refund');
    } catch (error) {
      console.log(JSON.stringify(error));
      toast.error('Something went wrong!');
      dispatch(updateIsApprovingRefund(false));
    }
  },
);

export const deleteRefundData = createAsyncThunk(
  'refund/delete',
  async (_id: string, { dispatch }) => {
    try {
      await API.delete(`/admin/refund/delete?id=${_id}`);
      // dispatch(removeFromAgents(_id));
      toast.success('Refund data deleted successfully!');
      dispatch(getRefunds());
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  },
);

export const deleteRefunds = createAsyncThunk(
  'refund/deleteMany',
  async (ids: string[], { dispatch }) => {
    try {
      await API.delete(`/admin/refund/deleteMany`, { data: ids });
      toast.success('Refunds Deleted Successfully!');
      dispatch(getRefunds());
    } catch (error: any) {
      toast.error(error.message ? error.message : 'Something went wrong!');
    }
  },
);
