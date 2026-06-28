import LoginCard from "../pages/auth/LoginCard";
import DepartureFlightsPage from "../pages/booking/DepartureFlightsPage";
import ExtraOptions from "../pages/booking/ExtraOptions";
import FailedPayment from "../pages/booking/FailedPayment";
import FlightDetailPage from "../pages/booking/FlightDetailPage";
import HomePage from "../pages/landing/HomePage";
import InformationPage from "../pages/landing/InformationPage";
import MyBookingPage from "../pages/booking/MyBookingPage";
import PassengerDetails from "../pages/booking/PassengerDetails";
import PaymentPage from "../pages/booking/PaymentPage";
import Profile from "../pages/auth/Profile";
import RefundRequest from "../pages/booking/RefundRequest";
import ReturnFlightsPage from "../pages/booking/ReturnFlightsPage";
import SeatSelectionPage from "../pages/booking/SeatSelectionPage";
import SeatSelectionPage2 from "../pages/booking/SeatSelectionReturn";
import SuccesfulPayment from "../pages/booking/SuccesfulPayment";
import { UserVerifyPage1 } from "../pages/auth/UserVerifyPage1";
import ContactUs from "../pages/landing/ContactUs";
import SupportPage from "../pages/landing/SupportPage";
import RegisterCard from "../pages/auth/RegisterCard";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
// import ChatPage from "../pages/chat/ChatPage";
// import MobileChatPage from "../pages/chat/mobile/MobileChatPage";
import MobileAppContainer from "../pages/chat/mobile/MobileAppContainer";
import JourneyListingPage from "../pages/chat/mobile/JourneyListingPage";
import JourneySettingsPage from "../pages/chat/mobile/JourneySettingsPage";
import CommunitiesPage from "../pages/communities/CommunitiesPage";

export const ROUTES = [
  {
    path: "/",
    title: "Booking | Umoja Airline",
    component: HomePage,
    exact: true,
  },
  { path: "/trip", title: "Trip | Umoja Airline", component: MyBookingPage },
  {
    path: "/information",
    title: "Information | Umoja Airline",
    component: InformationPage,
  },
  {
    path: "/flights",
    title: "Booking | Umoja Airline",
    component: DepartureFlightsPage,
  },
  {
    path: "/flights/detail",
    title: "Booking | Umoja Airline",
    component: FlightDetailPage,
  },
  {
    path: "/passengers/details",
    title: "Booking | Umoja Airline",
    component: PassengerDetails,
  },
  {
    path: "/passengers/seat-selection",
    title: "Booking | Umoja Airline",
    component: SeatSelectionPage,
  },
  {
    path: "/passengers/seatSelection-return",
    title: "Booking | Umoja Airline",
    component: SeatSelectionPage2,
  },
  {
    path: "/search/flights/return",
    title: "Booking | Umoja Airline",
    component: ReturnFlightsPage,
  },
  {
    path: "/passengers/extra-options",
    title: "Booking | Umoja Airline",
    component: ExtraOptions,
  },
  {
    path: "/passengers/payments",
    title: "Booking | Umoja Airline",
    component: PaymentPage,
  },
  {
    path: "/passengers/payments/success",
    title: "Booking | Umoja Airline",
    component: SuccesfulPayment,
  },
  {
    path: "/passengers/payments/failed",
    title: "Booking | Umoja Airline",
    component: FailedPayment,
  },
  {
    path: "/login",
    title: "Login | Umoja Airline",
    component: LoginCard,
  },
  {
    path: "/forgot-password",
    title: "Forgot Password | Umoja Airline",
    component: ForgotPassword,
  },
  {
    path: "/reset-password/:token",
    title: "Reset Password | Umoja Airline",
    component: ResetPassword,
  },
  {
    path: "/signup",
    title: "Signup | Umoja Airline",
    component: RegisterCard,
  },
  {
    path: "/register",
    title: "Signup | Umoja Airline",
    component: RegisterCard,
  },
  {
    path: "/user/verify",
    title: "Login | Umoja Airline",
    component: UserVerifyPage1,
  },
  {
    path: "/profile",
    title: "Signup | Umoja Airline",
    component: Profile,
  },
  {
    path: "/request/refund/:bookingId",
    title: "Refund | Umoja Airline",
    component: RefundRequest,
  },
  {
    path: "/contact-us",
    title: "Contact Us | Umoja Airline",
    component: ContactUs,
  },
  {
    path: "/support",
    title: "Support | Umoja Airline",
    component: SupportPage,
  },
  {
    path: "/support/:ticketId",
    title: "Support | Umoja Airline",
    component: SupportPage,
  },
  // {
  //   path: "/chat",
  //   title: "Chat | Umoja Airline",
  //   component: ChatPage,
  // },
  // {
  //   path: "/chat/mobile",
  //   title: "Chat | Umoja Airline (Mobile)",
  //   component: MobileChatPage,
  // },
  {
    path: "/communities",
    title: "Communities | Umoja Airline",
    component: CommunitiesPage,
  },
  {
    path: "/journey",
    title: "Journeys | Umoja Airline",
    component: JourneyListingPage,
  },
  {
    path: "/journey/:id",
    title: "Journey | Umoja Airline",
    component: MobileAppContainer,
  },
  {
    path: "/journey/settings",
    title: "Settings | Umoja Airline",
    component: JourneySettingsPage,
  },
  // {
  //   path: "/chat/mobile/:conversationId",
  //   title: "Chat | Umoja Airline (Mobile)",
  //   component: MobileChatPage,
  // },
  // {
  //   path: "test",
  //   title: "Refund | Umoja Airline",
  //   component: DatePicker2,
  // },
];
