import { createAppSelector } from '../../store';

export const staffsPageSelector = createAppSelector(
  [
    (state) => state.staff.staffList?.slice(),
    (state) => state.staff.isFetchingStaffs,
    (state) => state.setting.user,
    (state) => state.staff.showNewStaffModal,
  ],
  (staffList, isFetchingStaffs, user, showNewStaffModal) => ({
    staffList,
    isFetchingStaffs,
    user,
    showNewStaffModal,
  }),
);
