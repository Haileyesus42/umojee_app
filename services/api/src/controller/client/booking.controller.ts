import { NextFunction, Request, Response, response } from 'express';
import FlightModel from '../../model/flight.model';
import { RequestWithUser } from '../../types';
import Booking from '../../model/booking.model';
import ClientUser from '../../model/client/clientuser.model';
import BookingRepository from '../../repositories/booking.repository'
import { Email } from '../../utils/email';
import mongoose from 'mongoose';
import ClientNotificationModel from '../../model/client/notification.model';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export const getCheckoutSession = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate request body
    const { flightId, returnFlightId, passengers, totalBaggages, tripType, selectedSeats, selectedSeatsReturn } = req.body.data;
    const selectedSeatsReturnString = JSON.stringify(selectedSeatsReturn);
    if (
      !flightId ||
      !Array.isArray(passengers) ||
      passengers.length === 0 ||
      !Number.isInteger(totalBaggages)
    ) {
      return res.status(400).json({ message: "Invalid request data" });
    }
    // console.log("Data", req.body.data)
    // console.log("Data", selectedSeatsReturnString)
    // Validate passenger objects
    for (const passenger of passengers) {
      if (!passenger.title || !passenger.firstName || !passenger.lastName) {
        return res.status(400).json({ message: "Invalid passenger data" });
      }
    }

    // Fetch flight and user data
    const flight = await FlightModel.findById(flightId);
    const returnFlight = returnFlightId ? await FlightModel.findById(returnFlightId) : null;
    const userId = req.userId;
    const user = await ClientUser.findById(userId);
    // console.log("RETURN FLIGHT INFO", returnFlight)

    if (!flight || (returnFlightId && !returnFlight)) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if there are enough seats available
    const numberofPassengers = passengers.length;
    if (flight.seatsLeft < numberofPassengers) {
      return res.status(400).json({ message: 'Not enough seats available' });
    }

    if (returnFlight) {
      if (returnFlight.seatsLeft < numberofPassengers) {
        return res.status(400).json({ message: 'Not enough seats available' });
      }
    }

    const price = flight.price.oneway + (returnFlight ? returnFlight.price.oneway : 0);
    const totalPassengerPrice = price * numberofPassengers;

    // const freeBaggageAllowance = numberofPassengers; // 1 free baggage per passenger
    const freeBaggageAllowance = 0; // 1 free baggage per passenger
    const extraBaggages = totalBaggages > freeBaggageAllowance ? totalBaggages - freeBaggageAllowance : 0;
    const extraBaggagePrice = extraBaggages * 40;
    const totalprice = totalPassengerPrice + extraBaggagePrice;

    // Create customer in Stripe
    const customer = await stripe.customers.create({
      metadata: {
        userId: user._id.toString(),
        flightId: flight._id.toString(),
        returnFlightId: returnFlightId ? returnFlight!._id.toString() : null,
        price: totalprice,
        passengers: JSON.stringify(passengers),
        totalBaggages: totalBaggages,
        tripType: tripType,
        airline: flight.airline,
        departureAirportAcronym: flight.departureAirportAcronym,
        departureTime: flight.departureTime,
        departureAirport: flight.departureAirport,
        arrivalAirportAcronym: flight.arrivalAirportAcronym,
        arrivalTime: flight.arrivalTime,
        arrivalAirport: flight.arrivalAirport,
        duration: flight.duration,
        gate: flight.gate,
        terminal: flight.terminal,
        runway: flight.runway,
        TotalSeatsCapacity: flight.TotalSeatsCapacity,
        seatsLeft: flight.seatsLeft,
        stoppageCount: flight.stoppageCount,
        selectedSeats: JSON.stringify(selectedSeats),
        selectedSeatsReturn: selectedSeatsReturn ? selectedSeatsReturnString! : null,
      },
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${process.env.CLIENT}`,
      cancel_url: `${process.env.CLIENT}`,
      customer: customer.id,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Umoja Flight booking',
              description: `Departing Flight from ${flight.departureAirportAcronym} to ${flight.arrivalAirportAcronym}.` +
                (returnFlight ? ` Return Flight from ${returnFlight.departureAirportAcronym} to ${returnFlight.arrivalAirportAcronym}.` : '') +
                ` Total price: $${totalprice}. Total baggage: ${totalBaggages}. Passengers: ${passengers.map(
                  (p) => `${p.title} ${p.firstName} ${p.lastName}`
                ).join(', ')}.`,
              images: [
                `https://assets-global.website-files.com/65c12d2d11dcb3bfdc47ead9/65c99295abb87719f1b16d78_airplane-2023-11-27-05-28-40-utc.jpg`,
              ],
            },
            unit_amount: totalprice * 100,
          },
          quantity: 1,
        },
      ],
    });

    const notifyClient = new ClientNotificationModel({
      _id: new mongoose.Types.ObjectId(),
      message: "Thank you for choosing Umoja Airways for your travel. Please don't forget to show your booking ticket, sent to your email address, when you approach our agent for a checkin!",
      route: '',
      notifier: userId.toString(), // Set the notifier as the booking user
      notifiedTo: [
        {
          user: userId.toString(), // Add the booking user to the notifiedTo array
          seen: false, // Default seen status
        },
      ],
    });
    await notifyClient.save();

    // Send successful response with session details
    res.status(200).json({
      status: 'success',
      session,
    });

  } catch (error) {
    // Handle errors
    console.error('Error in getCheckoutSession:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default class BookingController {
  private bookingRepository: BookingRepository;

  constructor() {
    this.bookingRepository = new BookingRepository();
  }

  // Method to get all bookings for a user
  public getAllBookings = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId; // Assume req.userId is set by a middleware after authentication
      const bookings = await this.bookingRepository.getUserBookings(userId);

      if (!bookings) {
        return res.status(404).json({ message: 'No bookings found for the user' });
      }

      return res.status(200).json({ status: 'success', data: bookings });
    } catch (error) {
      console.error('Error in getAllBookings:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

  // Method to cancel a booking

  public cancelBooking = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      const bookingId = req.params.bookingId;

      // Check if bookingId is provided and is a valid ObjectId
      if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ message: 'Invalid booking ID' });
      }

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      const flightId = booking.flightId;
      const returnFlightId = booking.returnFlightId;
      const passengersData = booking.passengers;

      const flight = await FlightModel.findById(flightId);
      const returnFlight = await FlightModel.findById(returnFlightId);

      if (flight) {
        flight.seatsLeft += passengersData.length;
        await flight.save();
        console.log('Flight saved');
      }
      if (returnFlight) {
        returnFlight.seatsLeft += passengersData.length;
        await returnFlight.save();
        console.log('Return flight saved');
      }

      booking.status = 'Canceled';
      await booking.save();
      console.log("Booking cancelled successfully");

      return res.status(200).json({ status: 'success', data: booking });
    } catch (error) {
      console.error('Error in cancelBooking:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

  public getBooking = async (req: Request, res: Response) => {
    const id = req.query.id;
    try {
      // Check if ID exists
      if (!id) {
        return res
          .status(400)
          .json({ status: 'fail', message: 'ID parameter is required' });
      }
      const booking = await Booking.findById(id);
      if (!booking) {
        return res
          .status(404)
          .json({ status: 'fail', message: 'Booking not found' });
      }
      res.status(200).json({ status: 'success', booking });
    } catch (error) {
      console.error('Error getting booking:', error);
      res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
  };

  public updateBooking = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const {
        bookingId, // The ID of the booking to update
        flightId,
        returnFlightId,
        passengers,
        totalBaggages,
        tripType,
        selectedSeats,
        selectedSeatsReturn
      } = req.body.data.data;

      const selectedSeatsReturnString = JSON.stringify(selectedSeatsReturn);

      if (!bookingId || !flightId || !Array.isArray(passengers) || passengers.length === 0 || !Number.isInteger(totalBaggages)) {
        return res.status(400).json({ message: 'Invalid request data' });
      }

      // Fetch the booking
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Fetch flight details
      const flight = await FlightModel.findById(flightId);
      const returnFlight = returnFlightId
        ? await FlightModel.findById(returnFlightId)
        : null;

      if (!flight || (returnFlightId && !returnFlight)) {
        return res.status(404).json({ message: 'Flight not found' });
      }

      const numberOfPassengers = passengers.length;
      if (flight.seatsLeft < numberOfPassengers) {
        return res.status(400).json({ message: 'Not enough seats available' });
      }
      if (returnFlight && returnFlight.seatsLeft < numberOfPassengers) {
        return res.status(400).json({ message: 'Not enough seats available on return flight' });
      }

      // Calculate price based on changes
      const basePrice = flight.price.oneway + (returnFlight ? returnFlight.price.oneway : 0);
      const totalPassengerPrice = basePrice * numberOfPassengers;
      const freeBaggageAllowance = numberOfPassengers;
      const extraBaggages = totalBaggages > freeBaggageAllowance ? totalBaggages - freeBaggageAllowance : 0;
      const extraBaggagePrice = extraBaggages * 40;
      const totalPrice = totalPassengerPrice + extraBaggagePrice;

      // Check if additional payment is required
      let additionalPayment = false;
      if (totalPrice > booking.price) {
        additionalPayment = true;
      }

      // Update the booking with new details
      booking.flightId = flight._id.toString();
      booking.returnFlightId = returnFlightId ? returnFlight!._id.toString() : null;
      booking.passengers = JSON.parse(JSON.stringify(passengers));
      booking.totalBaggages = totalBaggages;
      booking.tripType = tripType;
      booking.departureAirportAcronym = flight.departureAirportAcronym;
      booking.arrivalAirportAcronym = flight.arrivalAirportAcronym;
      booking.departureTime = flight.departureTime;
      booking.arrivalTime = flight.arrivalTime;
      booking.price = totalPrice; // Update price based on new calculations

      // Save updated booking
      await booking.save();

      if (additionalPayment) {
        // If more payment is required, create a new Stripe checkout session
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          success_url: `${process.env.CLIENT}`,
          cancel_url: `${process.env.CLIENT}`,
          customer: booking.stripeCustomerId, // Use the existing Stripe customer
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: 'Umoja Flight Booking Update',
                  description: `Updated booking from ${flight.departureAirportAcronym} to ${flight.arrivalAirportAcronym}.`,
                  images: [
                    'https://assets-global.website-files.com/65c12d2d11dcb3bfdc47ead9/65c99295abb87719f1b16d78_airplane-2023-11-27-05-28-40-utc.jpg'
                  ]
                },
                unit_amount: (totalPrice - booking.price) * 100 // Only charge the difference
              },
              quantity: 1
            }
          ]
        });

        // Send updated payment link to the user
        const passengerUser = passengers[0]; // Assuming the first passenger is the primary contact
        if (passengerUser && passengerUser.email) {
          const emailToBeSend = new Email(
            passengerUser,
            `${process.env.CLIENT}/passengers/receipt`
          );
          const paymentLinkSubject = 'Complete Additional Payment for Your Umoja Booking';
          const paymentLinkUrl = session.url;
          console.log("Passenger user", passengerUser)
          await emailToBeSend.sendPaymentLink(paymentLinkSubject, {
            passengerEmail: passengerUser.email,
            paymentLinkUrl
          });
        }

        return res.status(200).json({
          status: 'success',
          message: 'Booking updated successfully, additional payment required',
          paymentLinkUrl: session.url // Return the Stripe payment link
        });
      }

      // If no additional payment is required, just return success
      res.status(200).json({
        status: 'success',
        message: 'Booking updated successfully'
      });
    } catch (error) {
      console.error('Error in updateBooking:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}