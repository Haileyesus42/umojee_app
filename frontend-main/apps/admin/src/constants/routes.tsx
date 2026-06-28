import AddAnnouncementsPage from '../pages/AddAnnouncement';
import AgenciesPage from '../pages/agencies/page';
import AgentsPage from '../pages/agents/page';
import AnnouncementsPage from '../pages/announcements/page';
import ChangePassword from '../pages/auth/ChangePassword';
import BookingPage from '../pages/bookings';
import Booking from '../pages/bookings/components/Booking';
import CheckIn from '../pages/checkin/CheckIn';
import SeatSelectionPageCheckin from '../pages/checkin/components/SeatSelectionPageCheckin';
import DepartureFlightsPage from '../pages/DepartureFlightsPage';
import ExtraOptions from '../pages/ExtraOptions';
import FlightPage from '../pages/flights';
import Dashboard from '../pages/home/Dashboard';
import PassengerDetails from '../pages/PassengerDetails';
import PassengersPage from '../pages/passengers';
import PaymentPage from '../pages/PaymentPage';
import RefundsPage from '../pages/refunds';
import ReturnFlightsPage from '../pages/ReturnFlightsPage';
import SeatSelectionPage from '../pages/SeatSelectionPage';
import SeatSelectionPage2 from '../pages/SeatSelectionReturn';
import Settings from '../pages/Settings';
import StaffsPage from '../pages/staffs';
import TicketQueuePage from '../pages/tickets/page';

export const ROUTES = [
  {
    path: '/',
    title: 'Dashboard',
    element: <Dashboard />,
  },
  {
    path: '/flights',
    title: 'Flights',
    element: <FlightPage />,
  },
  {
    path: '/bookings/checkin/:id',
    title: 'Check In',
    element: <CheckIn />,
  },
  {
    path: '/bookings',
    title: 'Bookings',
    element: <BookingPage />,
  },
  {
    path: '/bookings/search/flight',
    title: 'Booking | EmojaAirways - Admin Dashboard',
    element: <Booking />,
  },
  {
    path: '/passengers',
    title: 'Passengers',
    element: <PassengersPage />,
  },
  {
    path: '/staffs',
    title: 'Staffs',
    element: <StaffsPage />,
  },
  {
    path: '/refunds',
    title: 'Refunds',
    element: <RefundsPage />,
  },
  {
    path: '/agencies',
    title: 'Agencies',
    element: <AgenciesPage />,
  },
  {
    path: '/agents',
    title: 'Agents',
    element: <AgentsPage />,
  },
  {
    path: '/tickets',
    title: 'Support Tickets',
    element: <TicketQueuePage />,
  },
  {
    path: '/tickets/:ticketId',
    title: 'Support Tickets',
    element: <TicketQueuePage />,
  },
  {
    path: '/announcements',
    title: 'Announcements | EmojaAirways - Admin Dashboard',
    element: <AnnouncementsPage />,
  },
  {
    path: '/announcements/add',
    title: 'Add Announcements | EmojaAirways - Admin Dashboard',
    element: <AddAnnouncementsPage />,
  },
  {
    path: '/profile',
    title: 'Profile',
    element: <Settings />,
  },
  {
    path: '/changepassword',
    title: 'Change Password',
    element: <ChangePassword />,
  },
  {
    path: '/bookings/search/flight/departure',
    title: 'Booking | EmojaAirways - Admin Dashboard',
    element: <DepartureFlightsPage />,
  },
  {
    path: '/bookings/search/flight/return',
    title: 'Booking | EmojaAirways - Admin Dashboard',
    element: <ReturnFlightsPage />,
  },
  {
    path: '/bookings/passenger/details',
    title: 'Passenger Details | EmojaAirways - Admin Dashboard',
    element: <PassengerDetails />,
  },
  {
    path: '/bookings/passenger/seat',
    title: 'Booking | Umoja Airline',
    element: <SeatSelectionPage />,
  },
  {
    path: '/bookings/passenger/seat/return',
    title: 'Booking | Umoja Airline',
    element: <SeatSelectionPage2 />,
  },
  {
    path: '/bookings/passenger/extra-options',
    title: 'Extra Options | EmojaAirways - Admin Dashboard',
    element: <ExtraOptions />,
  },
  {
    path: '/bookings/passenger/payments',
    title: 'Payments | EmojaAirways - Admin Dashboard',
    element: <PaymentPage />,
  },
  {
    path: '/bookings/checkin/seats/:bookingId',
    title: 'Payments | EmojaAirways - Admin Dashboard',
    element: <SeatSelectionPageCheckin />,
  },
];
