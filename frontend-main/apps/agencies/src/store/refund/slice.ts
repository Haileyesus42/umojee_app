import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { refundInitialState } from '../../store/initialStates';
import { getRefunds } from './extra';
import { Refund } from '../../interface/refund';

const refund = createSlice({
  name: 'refund',
  initialState: refundInitialState,
  reducers: {
    updateIsFetchingRefunds: (state, { payload }: PayloadAction<boolean>) => {
      state.isFetchingRefunds = payload;
    },
    updateIsRequestingRefund: (state, { payload }: PayloadAction<boolean>) => {
      state.isRequestingRefund = payload;
    },
    updateIsApprovingRefund: (state, { payload }: PayloadAction<boolean>) => {
      state.isApprovingRefund = payload;
    },
    updateSelectedRefund: (
      state,
      { payload }: PayloadAction<Refund | undefined>,
    ) => {
      state.selectedRefund = payload;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(getRefunds.fulfilled, (state, { payload }) => {
        state.refunds = payload;
        state.isFetchingRefunds = false;
      })
      .addCase(getRefunds.rejected, (state) => {
        state.isFetchingRefunds = false;
      });
  },
});

export const {
  updateIsFetchingRefunds,
  updateIsRequestingRefund,
  updateIsApprovingRefund,
  updateSelectedRefund,
} = refund.actions;
export default refund.reducer;
