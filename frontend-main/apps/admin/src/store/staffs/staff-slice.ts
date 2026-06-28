import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getStaffs } from './staff-extra';
import { staffInitialState } from '../initialStates';

const staffSlice = createSlice({
  name: 'staff',
  initialState: staffInitialState,
  reducers: {
    updateIsFetchingStaffs: (state, { payload }: PayloadAction<boolean>) => {
      state.isFetchingStaffs = payload;
    },
    removeFromStaff(state, action) {
      const index = state.staffList.findIndex(
        (staff) => staff.id === action.payload,
      );

      state.staffList.splice(index, 1);
    },
    updateShowNewStaffModal: (state, { payload }: PayloadAction<boolean>) => {
      state.showNewStaffModal = payload;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(getStaffs.fulfilled, (state, { payload }) => {
        state.staffList = payload;
        state.isFetchingStaffs = false;
      })
      .addCase(getStaffs.rejected, (state) => {
        state.isFetchingStaffs = false;
      });
  },
});

export const {
  removeFromStaff,
  updateIsFetchingStaffs,
  updateShowNewStaffModal,
} = staffSlice.actions;
export default staffSlice.reducer;
