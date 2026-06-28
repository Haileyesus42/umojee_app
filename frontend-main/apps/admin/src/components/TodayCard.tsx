import { Clock } from 'lucide-react';
import { useSelector } from 'react-redux';

const CardComponent = ({
  title,
  subtitle,
  total,
}: {
  title: string;
  subtitle: string;
  total: number;
}) => {
  return (
    <div className="flex items-center justify-between py-3 px-4 sm:px-7.5 rounded-md hover:bg-picton-blue-50 dark:dark:bg-meta-4 dark:hover:dark:bg-slate-700 hover:cursor-pointer">
      <div>
        <p className="font-medium text-black dark:text-white py-0">{title}</p>
        <span className="font-light text-xs text-muted-foreground leading-[10px] dark:text-white">
          {subtitle}
        </span>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-picton-blue-100 text-picton-blue-500">
        <span className="text-sm font-medium">{total}</span>
      </div>
    </div>
  );
};

const TodayCard = () => {
  const data = useSelector((state: any) => state.dashboard.todayBookingList);
  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white py-6 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-4">
      <div className="flex justify-between px-5 items-center">
        <div className="flex flex-col">
          <h4 className="text-lg font-semibold text-black dark:text-white">
            Today
          </h4>
          <p className="text-sm text-muted-foreground">
            Real-time flight status
          </p>
        </div>
        <Clock className="text-muted-foreground" />
      </div>
      <div className="flex flex-col px-5 py-2 gap-4">
        <CardComponent
          title="Booked"
          subtitle="Total bookings"
          total={
            data.ticketedBookingsCount +
            data.bookedBookingsCount +
            data.refundRequestes +
            data.approvedRefunds
          }
        />
        <CardComponent
          title="Completed"
          subtitle="Total payment completed bookings"
          total={data.ticketedBookingsCount}
        />
        <CardComponent
          title="Pending"
          subtitle="Total payment pending bookings"
          total={data.bookedBookingsCount}
        />
        <CardComponent
          title="Cancelled"
          subtitle="Total cancelled bookings"
          total={data.refundRequestes + data.approvedRefunds}
        />
      </div>
    </div>
  );
};

export default TodayCard;
