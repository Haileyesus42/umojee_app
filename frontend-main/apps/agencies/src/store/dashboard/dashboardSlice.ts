import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  LineChartType,
  AllBookingsType,
  DashboardCardsData,
  PieChartData,
  TodayBookingData,
} from '../../types/types';

interface Dashboard {
  cardsDataList: DashboardCardsData | null;
  pieChartDataList: PieChartData | null;
  graphsDataList: LineChartType[];
  allBookingList: AllBookingsType[];
  todayBookingList: TodayBookingData | null;
}
const initialState: Dashboard = {
  cardsDataList: null,
  pieChartDataList: null,
  graphsDataList: [],
  allBookingList: [],
  todayBookingList: null,
};

const dashboardSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    fetchCardsData(state, action: PayloadAction<DashboardCardsData>) {
      state.cardsDataList = action.payload;
    },
    fetchGraphsData(state, action: PayloadAction<LineChartType[]>) {
      state.graphsDataList = action.payload;
    },
    fetchPieChart(state, action: PayloadAction<PieChartData>) {
      state.pieChartDataList = action.payload;
    },
    fetchAllBookings(state, action: PayloadAction<AllBookingsType[]>) {
      state.allBookingList = action.payload;
    },
    fetchTodayBooking(state, action: PayloadAction<TodayBookingData>) {
      state.todayBookingList = action.payload;
    },
  },
});

export const {
  fetchCardsData,
  fetchGraphsData,
  fetchAllBookings,
  fetchTodayBooking,
  fetchPieChart,
} = dashboardSlice.actions;
export default dashboardSlice.reducer;
