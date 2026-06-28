import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Loader1 from '../../common/Loader';
import { Card, CardContent, CardHeader, CardTitle } from '../../common/ui/card';
import LineChartComponent from '../../components/Charts/LineChart';
import PieChartComponent from '../../components/Charts/PieChartComponent';
import AllBooking from '../../components/Tables/AllBooking';
import TodayCard from '../../components/TodayCard';
import {
  fetchDashboardAllBookingData,
  fetchDashboardCardsData,
  fetchDashboardTodayBookingData,
  fetchLineGraphsData,
  fetchPieChartData,
} from '../../store/dashboard/dashboardActions';
import { fetchNotificationsData } from '../../store/notifications/notificationActions';

const calculatePercentageIncrease = (
  currentMonthCount: number,
  lastMonthCount: number,
): number => {
  if (lastMonthCount === 0) {
    return currentMonthCount > 0 ? 100 : 0;
  }
  return parseFloat(
    (((currentMonthCount - lastMonthCount) / lastMonthCount) * 100).toFixed(2),
  );
};

const currentYear = new Date().getFullYear();

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const dispatch = useDispatch();

  const cardsData = useSelector((state: any) => state.dashboard.cardsDataList);

  const cancelled = {
    currentMonthCount:
      cardsData?.requestRefund.currentMonthCount +
      cardsData?.refundApproved.currentMonthCount,
    lastMonthCount:
      cardsData?.requestRefund.lastMonthCount +
      cardsData?.refundApproved.lastMonthCount,
    percentageIncrease: calculatePercentageIncrease(
      cardsData?.requestRefund.currentMonthCount +
        cardsData?.refundApproved.currentMonthCount,
      cardsData?.requestRefund.lastMonthCount +
        cardsData?.refundApproved.lastMonthCount,
    ),
  };

  const total = {
    currentMonthCount:
      cardsData?.ticketed.currentMonthCount +
      cardsData?.booked.currentMonthCount +
      cancelled.currentMonthCount,
    lastMonthCount:
      cardsData?.ticketed.lastMonthCount +
      cardsData?.booked.lastMonthCount +
      cancelled.lastMonthCount,
    percentageIncrease: calculatePercentageIncrease(
      cardsData?.ticketed.currentMonthCount +
        cardsData?.booked.currentMonthCount +
        cancelled.currentMonthCount,
      cardsData?.ticketed.lastMonthCount +
        cardsData?.booked.lastMonthCount +
        cancelled.lastMonthCount,
    ),
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await dispatch(fetchNotificationsData() as any);
      await dispatch(fetchDashboardCardsData() as any);
      await dispatch(fetchPieChartData() as any);
      await dispatch(fetchDashboardTodayBookingData() as any);
      await dispatch(fetchDashboardAllBookingData() as any);
      await dispatch(fetchLineGraphsData(currentYear) as any);
      setLoading(false);
    };
    loadData();
  }, [dispatch]);

  return loading ? (
    <Loader1 />
  ) : (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        <Card className="dark:bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
            <CardTitle className="text-lg font-medium text-emerald-600">
              Completed
            </CardTitle>
            <div className="p-3 bg-emerald-100 rounded-full my-0">
              <CheckCircle className="text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {cardsData?.ticketed.currentMonthCount}
            </div>
            <p className="text-xs text-muted-foreground flex items-center space-x-2">
              <span className="text-emerald-600 text-lg flex items-center">
                {cardsData?.ticketed.percentageIncrease >= 0 ? (
                  <ArrowUp className="w-5 h-5" />
                ) : (
                  <ArrowDown className="w-5 h-5" />
                )}
                {parseFloat(cardsData?.ticketed.percentageIncrease).toFixed(2)}%
              </span>
              {'  '}
              <span> from last month</span>
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0  py-3">
            <CardTitle className="text-lg font-medium text-orange-500">
              Pending
            </CardTitle>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {cardsData?.booked.currentMonthCount}
            </div>
            <p className="text-xs text-muted-foreground flex items-center space-x-2">
              <span className="text-orange-500 text-lg flex items-center">
                {cardsData?.booked.percentageIncrease >= 0 ? (
                  <ArrowUp className="w-5 h-5" />
                ) : (
                  <ArrowDown className="w-5 h-5" />
                )}
                {parseFloat(cardsData?.booked.percentageIncrease).toFixed(2)}%
              </span>{' '}
              <span>from last month</span>
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0  py-3">
            <CardTitle className="text-lg font-medium text-torch-red-500">
              Cancelled
            </CardTitle>
            <div className="p-3 bg-torch-red-100 rounded-full">
              <X className="text-torch-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-torch-red-500 font-bold">
              {cancelled.currentMonthCount}
            </div>
            <p className="text-xs text-muted-foreground flex items-center space-x-2">
              <span className="text-torch-red-500 text-lg flex items-center">
                {cancelled.percentageIncrease >= 0 ? (
                  <ArrowUp className="w-5 h-5" />
                ) : (
                  <ArrowDown className="w-5 h-5" />
                )}
                {cancelled.percentageIncrease}%
              </span>{' '}
              <span>from last month</span>
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0  py-3">
            <CardTitle className="text-lg font-medium text-picton-blue-500 dark:text-slate-200">
              Booked
            </CardTitle>
            <div className="p-3 bg-picton-blue-100 rounded-full">
              <CalendarCheck className="text-picton-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-picton-blue-500 dark:text-slate-200">
              {total.currentMonthCount}
            </div>
            <p className="text-xs text-muted-foreground flex items-center space-x-2">
              <span className="text-lg flex items-center text-picton-blue-500 dark:text-slate-200">
                {total.percentageIncrease >= 0 ? (
                  <ArrowUp className="w-5 h-5" />
                ) : (
                  <ArrowDown className="w-5 h-5" />
                )}
                {total.percentageIncrease}%
              </span>{' '}
              <span>from last month</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        <div className="col-span-12 xl:col-span-8">
          <LineChartComponent />
        </div>
        <div className="col-span-12 xl:col-span-4 ">
          <PieChartComponent />
        </div>
        <div className="col-span-12 xl:col-span-8 ">
          <AllBooking />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <TodayCard />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
