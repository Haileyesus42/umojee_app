import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { configureStore, createSelector } from '@reduxjs/toolkit';
import setting from './setting/settingSlice';
import booking from './booking/booking-slice';
import flight from './flight/flight-slice';
import passenger from './passengers/passenger-slice';
import staff from './staffs/staff-slice';
import agents from './agents/agents-slice';
import refund from './refund/slice';
import announcementTemplates from './announcements/templates-slice';
import announcements from './announcements/announcement-slice';
import agencies from './agencies/agenciesSlice';
import dashboard from './dashboard/dashboardSlice';
import notification from './notifications/notificationSlice';

const store = configureStore({
  reducer: {
    setting,
    booking,
    flight,
    passenger,
    staff,
    agents,
    agencies,
    refund,
    announcementTemplates,
    announcements,
    dashboard,
    notification,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export const useAppDispatch: () => typeof store.dispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const createAppSelector = createSelector.withTypes<RootState>();
export default store;
