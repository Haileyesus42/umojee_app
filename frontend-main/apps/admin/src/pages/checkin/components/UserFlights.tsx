import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../common/ui/tabs';
import LineWithCircles from '../../../components/LineWithCircle';

// Define interfaces
interface Flight {
  date: string;
  departureTime: string;
  arrivalTime: string;
  departureCity: string;
  arrivalCity: string;
  departureCode: string;
  arrivalCode: string;
}

interface FlightCardProps {
  date: string;
  departureTime: string;
  arrivalTime: string;
  departureCity: string;
  arrivalCity: string;
  departureCode: string;
  arrivalCode: string;
}

interface FlightListProps {
  flights: Flight[];
}

// FlightCard Component
const FlightCard: React.FC<FlightCardProps> = ({
  date,
  departureTime,
  arrivalTime,
  departureCity,
  arrivalCity,
  departureCode,
  arrivalCode,
}) => {
  return (
    <div className="flex flex-col">
      <h1 className="text-[#03003e] text-xs font-medium">{date}</h1>
      <div className="flex items-center justify-between border-b py-2">
        <div className="flex flex-col">
          <p className="text-black dark:text-white font-bold">
            {departureTime}
          </p>
          <span className="font-extralight text-[10px] leading-[10px]">
            {departureCity}
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-5 pt-3">
          <LineWithCircles />
          <div className="flex justify-between w-full">
            <span className="ml-[-0.2rem] text-[10px] font-light leading-7 uppercase">
              {departureCode}
            </span>
            <span className="mr-[-0.1rem] text-[10px] font-light leading-7 uppercase">
              {arrivalCode}
            </span>
          </div>
        </div>
        <div className="sm:flex items-center justify-center px-2">
          <div className="flex flex-col">
            <p className="text-black dark:text-white font-bold py-0">
              {arrivalTime}
            </p>
            <span className="font-light text-[10px] leading-[10px]">
              {arrivalCity}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// FlightList Component
const FlightList: React.FC<FlightListProps> = ({ flights }) => {
  return (
    <div className="flex flex-col space-y-4">
      {flights.map((flight, index) => (
        <FlightCard
          key={index}
          date={flight.date}
          departureTime={flight.departureTime}
          arrivalTime={flight.arrivalTime}
          departureCity={flight.departureCity}
          arrivalCity={flight.arrivalCity}
          departureCode={flight.departureCode}
          arrivalCode={flight.arrivalCode}
        />
      ))}
    </div>
  );
};

// UserFlights Component
const UserFlights: React.FC = () => {
  const upcomingFlights: Flight[] = [
    {
      date: 'Wed 13 Sep, 2024',
      departureTime: '8:00 AM',
      arrivalTime: '9:00 AM',
      departureCity: 'Miami',
      arrivalCity: 'Guyana',
      departureCode: 'MIA',
      arrivalCode: 'GEO',
    },
    {
      date: 'Wed 13 Sep, 2024',
      departureTime: '8:00 AM',
      arrivalTime: '9:00 AM',
      departureCity: 'Miami',
      arrivalCity: 'Guyana',
      departureCode: 'MIA',
      arrivalCode: 'GEO',
    },
    {
      date: 'Wed 13 Sep, 2024',
      departureTime: '8:00 AM',
      arrivalTime: '9:00 AM',
      departureCity: 'Miami',
      arrivalCity: 'Guyana',
      departureCode: 'MIA',
      arrivalCode: 'GEO',
    },
  ];

  const pastFlights: Flight[] = [
    {
      date: 'Tue 12 Sep, 2024',
      departureTime: '7:00 AM',
      arrivalTime: '8:00 AM',
      departureCity: 'New York',
      arrivalCity: 'Guyana',
      departureCode: 'JFK',
      arrivalCode: 'GEO',
    },
    {
      date: 'Tue 12 Sep, 2024',
      departureTime: '7:00 AM',
      arrivalTime: '8:00 AM',
      departureCity: 'New York',
      arrivalCity: 'Guyana',
      departureCode: 'JFK',
      arrivalCode: 'GEO',
    },
    {
      date: 'Tue 12 Sep, 2024',
      departureTime: '7:00 AM',
      arrivalTime: '8:00 AM',
      departureCity: 'New York',
      arrivalCity: 'Guyana',
      departureCode: 'JFK',
      arrivalCode: 'GEO',
    },
  ];

  return (
    <Tabs defaultValue="upcoming" className="bg-slate-50 px-5 py-5 h-full">
      <TabsList className="flex justify-between">
        <TabsTrigger
          value="upcoming"
          className="border-b-4 border-transparent data-[state=active]:bg-[#03003e] data-[state=active]:text-white"
        >
          Upcoming Flights
        </TabsTrigger>
        <TabsTrigger
          value="past"
          className="border-b-4 border-transparent data-[state=active]:bg-[#03003e] data-[state=active]:text-white"
        >
          Past Flights
        </TabsTrigger>
      </TabsList>
      <TabsContent value="upcoming" className="bg-white px-5 py-3 rounded-lg">
        <FlightList flights={upcomingFlights} />
      </TabsContent>
      <TabsContent value="past" className="bg-white px-5 py-3 rounded-lg">
        <FlightList flights={pastFlights} />
      </TabsContent>
    </Tabs>
  );
};

export default UserFlights;
