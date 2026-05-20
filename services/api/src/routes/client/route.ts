import express, { NextFunction, Request, Response } from "express";
import {
  Clientprotect,
  Clientsignup,
  ClientupdatePassword,
  generateSendOTP,
  login,
  LoginWithGoogle,
  LoginWithPassword,
  verifyClientUser,
} from "../../controller/client/authController";
import { searchFlights } from "../../controller/client/flight.controller";
import BookingController, {
  getCheckoutSession,
} from "../../controller/client/booking.controller";
import {
  BeginTwoFactorSetup,
  ConfirmTwoFactorSetup,
  deleteAllClients,
  DisableTwoFactor,
  getAllClients,
  GetUser,
  RevealSensitiveTravelDocument,
  updateClientProfilePhoto,
  UpdateUser
} from "../../controller/client/userController";
import { getPaymentStatus } from "../../controller/client/paymentController"
import { getFlightsWithMostBookings } from "../../controller/client/featuredFlights.controller";
import { clientUpload } from "../../middleware/multerSetupClient";
import { ClientForgotPassword, ClientResetPassword } from "../../controller/client/authController";
import { getAllNotifications, updateAllNotificationsSeen, updateNotificationSeen } from "../../controller/client/clientNotification.controller";
import supportTicketRouter from "./supportTicket.router";
import destinationRecommendationRouter from "./destinationRecommendation.router";
import journeyNotificationRouter from "./journeyNotification.router";
import journeyShareRouter from "./journeyShare.router";

const ClientRouter = express.Router();

const authRouter = express.Router(); //
const userRouter = express.Router(); //
const flightRouter = express.Router(); //
const bookingRouter = express.Router(); //
const notificationRouter = express.Router(); //

const bookingController = new BookingController()

ClientRouter.use("/auth", authRouter);
ClientRouter.use("/user", userRouter);
ClientRouter.use("/flight", flightRouter);
ClientRouter.use("/booking", bookingRouter);
ClientRouter.use("/notification", notificationRouter);
ClientRouter.use("/destinations", destinationRecommendationRouter);
ClientRouter.use("/journey-notifications", journeyNotificationRouter);
ClientRouter.use("/", journeyShareRouter);

authRouter.post("/generate-otp", generateSendOTP);
authRouter.post("/signup", Clientsignup);
authRouter.post("/verify", verifyClientUser);
authRouter.post("/login", login);
authRouter.post("/login/password", LoginWithPassword);
authRouter.post("/login/google", LoginWithGoogle);
authRouter.post("/forgotPassword", ClientForgotPassword);
authRouter.patch("/resetPassword/:token", ClientResetPassword);

userRouter.patch("/updateMe", Clientprotect, UpdateUser);
userRouter.patch("/updatePassword", Clientprotect, ClientupdatePassword);
userRouter.post("/2fa/setup", Clientprotect, BeginTwoFactorSetup);
userRouter.post("/2fa/confirm", Clientprotect, ConfirmTwoFactorSetup);
userRouter.post("/2fa/disable", Clientprotect, DisableTwoFactor);
userRouter.post("/revealSensitiveDocument", Clientprotect, RevealSensitiveTravelDocument);
userRouter.get("/getMe", Clientprotect, GetUser);
userRouter.put('/avatar/:id/photo', clientUpload.single('photo'), updateClientProfilePhoto);
userRouter.delete('/deleteall', deleteAllClients);
userRouter.get('/getall', getAllClients);

// flightRouter.get('/search', Clientprotect, searchFlights);
flightRouter.get("/search", searchFlights);
flightRouter.get("/featured", getFlightsWithMostBookings);

//booking
bookingRouter.post("/checkout-session", Clientprotect, getCheckoutSession);
// Email the user with the payment detail and PDF receipt attachment
// bookingRouter.post("/successfull-payment", Clientprotect, getPaymentStatus);
bookingRouter.get("/getBooking", Clientprotect, bookingController.getBooking);
bookingRouter.get("/getBookings", Clientprotect, bookingController.getAllBookings); // New route
bookingRouter.post("/cancel/:bookingId", Clientprotect, bookingController.cancelBooking);
bookingRouter.put("/update", bookingController.updateBooking);

notificationRouter.get("/getall", Clientprotect, getAllNotifications);
notificationRouter.patch("/updateseen/:id", Clientprotect, updateNotificationSeen);
notificationRouter.patch("/updateseen", Clientprotect, updateAllNotificationsSeen);

// Support tickets
ClientRouter.use('/support-tickets', Clientprotect, supportTicketRouter);

export default ClientRouter;
