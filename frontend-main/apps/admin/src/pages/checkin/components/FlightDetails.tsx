import React from 'react';
import { Card } from '../../../common/ui/card';
import { Button } from '../../../common/ui/button';
import {
  Activity,
  Calendar,
  LucideProps,
  PlaneLanding,
  PlaneTakeoff,
  Users,
} from 'lucide-react';
import { formatTime } from '../../../lib/utils';

interface FlightDetailsProps {
  departureAirport: string;
  arrivalAirport: string;
  departureAirportAcronym: string;
  arrivalAirportAcronym: string;
  departureTime: string;
  passengers: number;
  status: string;
}

// Reusable FlightDetailButton Component
const FlightDetailButton = ({
  icon: Icon,
  label,
  value,
  secondaryValue,
}: {
  icon: React.ComponentType<LucideProps>;
  label: string;
  value: string;
  secondaryValue?: string;
}) => {
  return (
    <div className="flex flex-col space-y-3">
      <p className="text-sm font-medium leading-none">{label}</p>
      <Button
        variant={'secondary'}
        className="w-full rounded-lg justify-between"
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
};

// Reusable Title Section Component
const FlightTitleSection = ({
  title,
  airline,
  imageSrc,
}: {
  title: string;
  airline: string;
  imageSrc: string;
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-0 p-2 bg-white shadow-lg rounded-md">
      <img
        className="w-full max-w-xs h-auto rounded-md shadow-md"
        src={imageSrc}
        alt={`${airline} flight image`}
      />
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-[#03003e] text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-md font-semibold text-gray-600">{airline}</p>
      </div>
    </div>
  );
};

const FlightDetails = ({
  departureAirport,
  arrivalAirport,
  departureAirportAcronym,
  arrivalAirportAcronym,
  departureTime,
  passengers,
  status,
}: FlightDetailsProps) => {
  return (
    <Card className="flex space-x-4 cursor-pointer px-5 py-5 ">
      {/* Title Section */}
      <FlightTitleSection
        title="Flight Details"
        airline="Umoja Airline"
        imageSrc="https://i.pinimg.com/originals/13/be/6d/13be6dcbb2b842054df0d9682ab0b271.png"
      />

      {/* Flight Information Section */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* From and To Sections */}
        <FlightDetailButton
          icon={PlaneTakeoff}
          label="From"
          value={departureAirport}
          secondaryValue={departureAirportAcronym}
        />
        <FlightDetailButton
          icon={PlaneLanding}
          label="To"
          value={arrivalAirport}
          secondaryValue={arrivalAirportAcronym}
        />

        {/* Date, Passengers, and Status Sections */}
        <div className="flex justify-between space-x-4">
          <FlightDetailButton
            icon={Calendar}
            label="Date"
            value={formatTime(departureTime).shortDate}
          />
          <FlightDetailButton
            icon={Users}
            label="Passengers"
            value={passengers.toString()}
          />
          <FlightDetailButton icon={Activity} label="Status" value={status} />
        </div>
      </div>
    </Card>
  );
};

export default FlightDetails;
