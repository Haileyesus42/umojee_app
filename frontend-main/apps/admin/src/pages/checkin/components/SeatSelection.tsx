import { CheckCircle, CircleDashed, Edit, LucideProps } from 'lucide-react';
import { Button } from '../../../common/ui/button';
import { Card } from '../../../common/ui/card';
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';

interface SeatDetailButtonProps {
  icon: React.ComponentType<LucideProps>;
  label: string;
  value: string;
  secondaryValue?: string;
  // setIsEditingSeats: (isEditing: boolean) => void;
}

const SeatDetailButton = ({
  icon: Icon,
  label,
  value,
  secondaryValue,
}: SeatDetailButtonProps) => (
  <div className="flex flex-col space-y-3">
    <p className="text-sm font-medium leading-none">{label}</p>
    <Button
      variant="secondary"
      className="w-full rounded-lg justify-between"
      aria-label={label}
    >
      <div className="flex space-x-2">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <p>{value}</p>
      </div>
      {secondaryValue && (
        <p className="text-muted-foreground">{secondaryValue}</p>
      )}
    </Button>
  </div>
);

interface SeatSelectionProps {
  totalSeats: number;
  seatsleft: number;
  bookingId: string;
  setIsEditingSeats: (isEditing: boolean) => void;
  onSeatSelect: string;
}

const SeatSelection = ({
  totalSeats,
  seatsleft,
  bookingId,
  setIsEditingSeats,
  onSeatSelect,
}: SeatSelectionProps) => {
  // const hasMoreThanOneSeat = seats.length > 1;
  const [bookingData, setBookingData] = useState<any>(null);
  const bookings = useSelector((state: any) => state.booking.bookingsList);

  useEffect(() => {
    const booking = bookings.find((booking: any) => booking._id === bookingId);
    if (booking) {
      setBookingData(booking);
    }
  }, [bookings, bookingId]);

  const handleEditClick = () => {
    setIsEditingSeats(true);
  };
  const seatNumber = { onSeatSelect };
  return (
    <Card className="flex flex-col justify-between cursor-pointer px-5 py-5 h-full">
      <div>
        <div className="flex justify-between">
          <p className="text-sm font-medium leading-none">Seats</p>
          <Button
            className="flex space-x-2 -mt-3"
            variant="ghost"
            onClick={handleEditClick}
          >
            <Edit className="h-4 w-4" />
            <p>ADD/EDIT</p>
          </Button>
        </div>
        <h1 className="text-[#03003e] text-4xl font-bold text-center">
          {onSeatSelect}
        </h1>
      </div>
      {/* {hasMoreThanOneSeat && ( */}
      <div className="flex flex-col space-y-2">
        <p className="text-sm font-medium leading-none">Others</p>
        <h1 className="text-[#03003e] text-md font-bold">
          {/* {seats.slice(1).join(' ')} */}
          {onSeatSelect}
        </h1>
      </div>
      {/* )} */}
      <div className="flex justify-between space-x-4 pt-2">
        <SeatDetailButton
          icon={CheckCircle}
          label="Booked"
          value={totalSeats.toString()}
        />
        <SeatDetailButton
          icon={CircleDashed}
          label="Available"
          value={seatsleft.toString()}
        />
      </div>
    </Card>
  );
};

export default SeatSelection;
