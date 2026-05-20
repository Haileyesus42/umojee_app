import { APIFeatures } from '../../utils/ApiFeatures';
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
import { NextFunction, Request, Response } from 'express';
// import nodemailer from 'nodemailer';
import flightModel, { FlightDocument } from '../../model/flight.model';
import Booking, { BookingDocument } from '../../model/booking.model';
import FlightModel from '../../model/flight.model';
import { RequestWithUser, UserDocument } from '../../types';
import { Email } from '../../utils/email';
import AdminUser from '../../model/admin/adminuser.model';
// import { USER_ID_FOR_CLIENT_PAID_BY_ADMIN_DASHBOARD } from '../../constant';
import mongoose from 'mongoose';
import AgencyUser from '../../model/agency/agencyUser.model';
import SeatsFlightModel from '../../model/seatsFlight.model';
// import { count } from 'console';
// import { requestRefund } from './refund.controller';
import Refund from '../../model/admin/refund.model';
import { REFUND } from '../../constant';
import Notification from '../../model/admin/notification.model';

export const getCheckoutSession = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate request body
    const {
      flightId,
      returnFlightId,
      passengerUser,
      user: userString,
      passengers,
      totalBaggages,
      tripType,
      selectedSeats,
      selectedSeatsReturn
    } = req.body.data.data;
    const selectedSeatsReturnString = JSON.stringify(selectedSeatsReturn);
    console.log('Data', req.body.data.data);
    // console.log('seat', selectedSeats);
    // Parse the user JSON string
    const user = JSON.parse(userString);
    // console.log(req.body);
    // console.log(flightId);
    // console.log("user id", user._id);
    // console.log('passengerUser', passengerUser);
    const allPassengers = [passengerUser, ...passengers];
    // console.log("new passenger data", allPassengers);
    // console.log(passengers.length);
    // console.log(totalBaggages);
    if (
      !flightId ||
      !passengerUser ||
      !Array.isArray(passengers) ||
      passengers.length === 0 ||
      !Number.isInteger(totalBaggages) ||
      !user
    ) {
      return res.status(400).json({ message: 'Invalid request data' });
    }

    // Validate passenger objects
    for (const passenger of passengers) {
      if (!passenger.title || !passenger.firstName || !passenger.lastName) {
        return res.status(400).json({ message: 'Invalid passenger data' });
      }
    }

    // Fetch flight and user data
    const flight = (await FlightModel.findById(
      flightId
    )) as FlightDocument | null;
    const returnFlight = returnFlightId
      ? ((await flightModel.findById(returnFlightId)) as FlightDocument | null)
      : null;
    // console.log('--------------------------------');
    // console.log('RETURN FLIGHT INFO', returnFlight);
    // console.log('FLIGHT INFO', flight);
    // console.log('USER_ID', userId);

    if (!flight || (returnFlightId && !returnFlight)) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    const agencyUser = await AgencyUser.findById(user._id);
    const adminUser = await AdminUser.findById(user._id);
    // console.log("admin user", adminUser)
    if (!adminUser && !agencyUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if there are enough seats available
    const numberOfPassengers = passengers.length;
    if (flight.seatsLeft < numberOfPassengers) {
      return res.status(400).json({ message: 'Not enough seats available' });
    }

    if (returnFlight && returnFlight.seatsLeft < numberOfPassengers) {
      return res.status(400).json({ message: 'Not enough seats available' });
    }
    const customerInfo = {
      docNo: null, // or default values if applicable
      issuingCountry: null,
      expirationDate: null,
      nationality: null,
      email: passengerUser.email
    };

    // console.log('CustomerInfo', customerInfo);
    const price =
      flight.price.oneway + (returnFlight ? returnFlight.price.oneway : 0);
    const totalPassengerPrice = price * numberOfPassengers;
    const freeBaggageAllowance = 0; // 1 free baggage per passenger
    // const freeBaggageAllowance = numberOfPassengers; // 1 free baggage per passenger
    const extraBaggages =
      totalBaggages > freeBaggageAllowance
        ? totalBaggages - freeBaggageAllowance
        : 0;
        console.log(extraBaggages)
    const extraBaggagePrice = extraBaggages * 40;
    const totalPrice = totalPassengerPrice + extraBaggagePrice;
    const booking = new Booking({
      userId: adminUser
        ? adminUser?._id.toString()
        : agencyUser?._id.toString(),
      flightId: flight._id.toString(),
      flightData: {
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        duration: flight.duration,
        TotalSeatsCapacity: flight.TotalSeatsCapacity,
        departureAirport: flight.departureAirport,
        arrivalAirport: flight.arrivalAirport,
        departureAirportAcronym: flight.departureAirportAcronym,
        arrivalAirportAcronym: flight.arrivalAirportAcronym,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        flightStatus: flight.flightStatus,
        archived: flight.archived,
        price: {
          currency: flight.price.currency,
          oneway: flight.price.oneway,
          roundtrip: flight.price.roundtrip
        },
        gate: flight.gate,
        terminal: flight.terminal,
        runway: flight.runway,
        seatsLeft: flight.seatsLeft
      },
      returnFlightId: returnFlightId ? returnFlight!._id.toString() : null,
      price: totalPrice,
      passengers: JSON.parse(JSON.stringify(passengers)),
      additionalInfo: customerInfo,
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
      createdBy: adminUser ? adminUser?.name : agencyUser?.name
    });
    const booked = await booking.save();
    // console.log("BOOKED", booked._id)
    if (adminUser) {
      adminUser?.bookings.push(booking?._id);
      await adminUser?.save();
    } else {
      agencyUser?.bookings.push(booking?._id);
      await agencyUser?.save();
    }

    // Create customer in Stripe
    const customer = await stripe.customers.create({
      metadata: {
        bookingId: booked._id.toString(),
        userId: adminUser
          ? adminUser?._id.toString()
          : agencyUser?._id.toString(),
        flightId: flight._id.toString(),
        returnFlightId: returnFlightId ? returnFlight!._id.toString() : null,
        price: totalPrice,
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
        selectedSeatsReturn: selectedSeatsReturn
          ? selectedSeatsReturnString!
          : null,
        createdBy: adminUser ? adminUser?.name : agencyUser?.name
      }
    });
    // console.log('BOOKING CONTROLLER ------ ', customer);

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
              description:
                `Departing Flight from ${flight.departureAirportAcronym} to ${flight.arrivalAirportAcronym}.` +
                (returnFlight
                  ? ` Return Flight from ${returnFlight.departureAirportAcronym} to ${returnFlight.arrivalAirportAcronym}.`
                  : '') +
                ` Total price: $${totalPrice}. Total baggage: ${totalBaggages}. Passengers: ${passengers
                  .map((p: any) => `${p.title} ${p.firstName} ${p.lastName}`)
                  .join(', ')}.`,
              images: [
                `https://assets-global.website-files.com/65c12d2d11dcb3bfdc47ead9/65c99295abb87719f1b16d78_airplane-2023-11-27-05-28-40-utc.jpg`
              ]
            },
            unit_amount: totalPrice * 100
          },
          quantity: 1
        }
      ]
    });
    // console.log("Passenger's email", passengerUser.email)

    // Send payment link email to the user
    if (passengerUser) {
      const emailToBeSend = new Email(
        passengerUser,
        `${process.env.CLIENT}/passengers/receipt`
      );
      const paymentLinkSubject = 'Complete Your Umoja Airways Payment';
      const passengerEmail = passengerUser.email;
      const paymentLinkUrl = session.url;
      const emailMe = { passengerEmail, paymentLinkUrl };
      // console.log("email me", emailMe)
      await emailToBeSend.sendPaymentLink(paymentLinkSubject, emailMe);
    }

    // Log success message to console
    console.log('Payment link sent successfully:', session.url);
    res.status(200).json({
      status: 'success',
      message: 'Payment link sent successfully'
      // paymentLinkUrl: session.url,
      // booked
    });
  } catch (error) {
    console.error('Error in getCheckoutSession:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getBooking = async (req: Request, res: Response) => {
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

const getAllBooking = async (req: Request, res: Response) => {
  try {
    let query = Booking.find();

    const features = new APIFeatures(query, req.query)
      .sort()
      .paginate()
      .limitFields();

    const bookings = await features.query;
    bookings.forEach((booking: any) => {
      if (booking.status) {
        booking.status = booking.status.toUpperCase();
      }
    });
    res
      .status(200)
      .json({ status: 'success', count: bookings.length, bookings });
  } catch (error: any) {
    res.status(500).json({ status: 'fail', message: error.message });
    console.log('no booking');
  }
};

const MoveFlightBooking = async (req: Request, res: Response) => {
  const { bookingId, flightId } = req.body;

  try {
    const booking = await Booking.findById(bookingId);
    const flight = await flightModel.findById(flightId);

    if (!booking || !flight) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'Booking or Flight not found' });
    }

    if (booking.flightId.toString() === flightId) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Booking already in this flight' });
    }

    if (!booking.paid) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Booking not paid' });
    }

    if (flight.seatsLeft < booking.passengers.length) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Not enough seats in the flight' });
    }

    const oldFlight = await flightModel.findById(booking.flightId);
    if (
      oldFlight?.arrivalAirportAcronym != flight?.arrivalAirportAcronym &&
      oldFlight?.departureAirportAcronym != flight?.departureAirportAcronym &&
      oldFlight?.price != flight?.price
    ) {
      res.status(400).json({ status: 'fail', message: 'Invalid flight' });
      return;
    }

    if (oldFlight) {
      oldFlight.seatsLeft += booking.passengers.length;
      await oldFlight.save();
    }

    flight.seatsLeft -= booking.passengers.length;
    booking.flightId = flightId;
    booking.status = 'Moved';

    await booking.save();
    await flight.save();

    return res
      .status(200)
      .json({ status: 'success', message: 'Booking moved successfully' });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while moving the booking'
    });
  }
};

const deleteBooking = async (req: Request, res: Response) => {
  const id = req.params.bookingId as string;
  console.log('ID', req.params.bookingId);
  try {
    // Check if ID exists
    if (!id) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'ID parameter is required' });
    }
    const booking = await Booking.findByIdAndDelete(id);
    if (!booking) {
      console.log('no id');
      return res
        .status(404)
        .json({ status: 'fail', message: 'Booking not found' });
    }
    console.log('successfully deleted the booking');
    res
      .status(200)
      .json({ status: 'success', message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};

const deleteManyBookings = async (req: Request, res: Response) => {
  const { ids } = req.body;
  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'IDs parameter is required and should be an array'
      });
    }

    const deleteResult = await Booking.deleteMany({ _id: { $in: ids } });

    if (deleteResult.deletedCount === 0) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'No bookings found to delete' });
    }
    console.log('successfully deleted the bookings:', ids);
    res.status(200).json({
      status: 'success',
      message: 'Bookings deleted successfully',
      count: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('Error deleting bookings:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};

const getAllPassengers = async (req: Request, res: Response) => {
  try {
    let query = Booking.find().populate({
      path: 'ClientUser',
      strictPopulate: false
    });

    const features = new APIFeatures(query, req.query)
      .sort()
      .paginate()
      .limitFields();

    const bookingsWithUsers = await features.query;
    const passengersMap: any = {};
    bookingsWithUsers.forEach((booking: BookingDocument) => {
      booking.passengers?.forEach((passenger) => {
        passengersMap[passenger.firstName] = passenger;
      });
    });
    const passengers = Object.values(passengersMap);
    res.status(200).json({
      status: 'success',
      count: passengers.length,
      passengers
    });
  } catch (error: any) {
    res.status(500).json({ status: 'fail', message: error.message });
    console.log('no booking');
  }
};

const deleteAllBookings = async (req: Request, res: Response) => {
  try {
    const result = await Booking.deleteMany({});
    console.log(`Deleted ${result.deletedCount} documents from Booking Model`);
    res.status(200).json({
      message: 'All Bookings are successfully deleted!',
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    res.status(500).json({ status: 'fail', message: error.message });
    console.log('Something went wrong!');
  }
};

const updateBooking = async (
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

    if (
      !bookingId ||
      !flightId ||
      !Array.isArray(passengers) ||
      passengers.length === 0 ||
      !Number.isInteger(totalBaggages)
    ) {
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
      return res
        .status(400)
        .json({ message: 'Not enough seats available on return flight' });
    }

    // Calculate price based on changes
    const basePrice =
      flight.price.oneway + (returnFlight ? returnFlight.price.oneway : 0);
    const totalPassengerPrice = basePrice * numberOfPassengers;
    const freeBaggageAllowance = numberOfPassengers;
    const extraBaggages =
      totalBaggages > freeBaggageAllowance
        ? totalBaggages - freeBaggageAllowance
        : 0;
    const extraBaggagePrice = extraBaggages * 40;
    const totalPrice = totalPassengerPrice + extraBaggagePrice;

    // Check if additional payment is required
    let additionalPayment = false;
    if (totalPrice > booking.price) {
      additionalPayment = true;
    }

    // Update the booking with new details
    booking.flightId = flight._id.toString();
    booking.returnFlightId = returnFlightId
      ? returnFlight!._id.toString()
      : null;
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
        const paymentLinkSubject =
          'Complete Additional Payment for Your Umoja Booking';
        const paymentLinkUrl = session.url;
        console.log('Passenger user', passengerUser);
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

const updatePassengerInformation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, passengers } = req.body;
  console.log(id, req.body);
  // Validate input
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid booking ID' });
  }

  try {
    // Find the booking by ID and update
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        $set: {
          'additionalInfo.email': email,
          passengers: passengers
        }
      },
      { new: true, runValidators: true } // return the updated booking and run schema validation
    );

    if (!updatedBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Passengers information updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// const updateLuggages = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const { luggage } = req.body;
//   console.log(id, luggage)
//   // Validate input
//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     return res.status(400).json({ error: 'Invalid booking ID' });
//   }

//   try {
//     // Find the booking by ID and update
//     const updatedBooking = await Booking.findByIdAndUpdate(
//       id,
//       {
//         $set: {
//           totalBaggages: luggage
//         },
//       },
//       { new: true, runValidators: true } // return the updated booking and run schema validation
//     );

//     if (!updatedBooking) {
//       return res.status(404).json({ error: 'Booking not found' });
//     }

//     res.status(200).json({
//       status: 'success',
//       message: 'Passengers information updated successfully',
//       updateBooking
//     });
//   } catch (error) {
//     res.status(500).json({ error: 'Internal server error' });
//   }
// }

const updateLuggages = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { luggage } = req.body;
  console.log(id, luggage);
  // Validate input
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid booking ID' });
  }

  try {
    // Find the booking by ID and update
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Fetch flight details
    const flight = await FlightModel.findById(booking.flightId);
    if (!flight) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    const prev = booking?.totalBaggages;
    const diff = luggage - prev;
    let additionalPayment = false;
    let refundPayment = false;
    let noLuggageUpdate = false;
    if (diff > 0) {
      additionalPayment = true;
    } else if (diff < 0) {
      refundPayment = true;
    } else if (diff == 0) {
      noLuggageUpdate = true;
    }
    // Update the booking with new details
    booking.totalBaggages = luggage;
    booking.price += diff * 40; // Update the booking price
    const email = booking.additionalInfo.email;
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
                name: 'Umoja Flight Check-in',
                description: `Check-in for flight from ${flight.departureAirportAcronym} to ${flight.arrivalAirportAcronym}.`,
                images: [
                  'https://assets-global.website-files.com/65c12d2d11dcb3bfdc47ead9/65c99295abb87719f1b16d78_airplane-2023-11-27-05-28-40-utc.jpg'
                ]
              },
              unit_amount: diff * 40 * 100 // Only charge the difference
            },
            quantity: 1
          }
        ]
      });

      // Send updated payment link to the user
      const emailToBeSend = new Email(
        { email },
        `${process.env.CLIENT}/passengers/receipt`
      );
      const paymentLinkSubject =
        'Complete Additional Payment for Your Umoja Check-in';
      const paymentLinkUrl = session.url;

      await emailToBeSend.sendPaymentLink(paymentLinkSubject, {
        passengerEmail: email,
        paymentLinkUrl
      });

      return res.status(200).json({
        status: 'success',
        message:
          'Laggage Added, additional payment required. Please check your email.',
        paymentLinkUrl: session.url // Return the Stripe payment link
      });
    }
    if (refundPayment) {
      const bookingId = booking?._id;
      const userId = booking?.userId;
      const reason = `New refund request from the checkout section of $${-40 * diff
        }`;
      const data = {
        bookingId: bookingId.toString(),
        userId: userId.toString(),
        reason
      };
      const refund = new Refund({
        _id: new mongoose.Types.ObjectId(),
        bookingId: data.bookingId,
        userId: data.userId,
        reason,
        status: REFUND.REQUEST_REFUND
      });
      await refund.save();
      const notifyAdmin = new Notification({
        _id: new mongoose.Types.ObjectId(),
        message: refund.reason,
        route: 'refunds',
        notifier: booking.userId.toString(), // Set the notifier as the booking user
        notifiedTo: [
          {
            user: booking.userId.toString(), // Add the booking user to the notifiedTo array
            seen: false, // Default seen status
          },
        ],
      });
      await notifyAdmin.save();
      return res.status(200).json({
        status: 'success',
        message: 'Laggage Removed, Refund request is sent for approval',
        refund
      });
    }
    if (noLuggageUpdate) {
      return res.status(200).json({
        status: 'success',
        message: 'No Update made to Laggages!'
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllSeatsByBookingId = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.id;
    console.log(bookingId);

    // Validate bookingId
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Invalid booking ID' });
    }

    // Find the booking by its ID
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'Booking not found' });
    }

    // console.log(booking);
    const passengersCount = booking?.passengers?.length;
    // Get flightId from booking
    const flightId = booking.flightId;
    if (!flightId) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'Flight not found for this booking' });
    }

    // Query seats for the flight
    let query = SeatsFlightModel.find({ flightId });

    // Apply filters, pagination, sorting if needed
    const features = new APIFeatures(query, req.query)
      .sort()
      .paginate()
      .limitFields();

    // Execute the query to get all seats
    const allSeats = await features.query;

    // Respond with seat data
    res.status(200).json({
      status: 'success',
      count: allSeats.length,
      passengersCount: passengersCount,
      allSeats
    });
  } catch (error) {
    console.error('Error getting all seats:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};

const bookingCheckIn = async (req: Request, res: Response) => {
  const {
    bookingId,
    flightId,
    country,
    docNo,
    expirationDate,
    luggage,
    nationality,
    selectedSeatNumber,
    email
  } = req.body;
  console.log(
    bookingId,
    flightId,
    country,
    docNo,
    expirationDate,
    luggage,
    nationality,
    selectedSeatNumber,
    email
  );
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ error: 'Invalid booking ID' });
  }

  try {
    // Fetch the booking and flight details
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const flight = await FlightModel.findById(booking.flightId);
    const returnFlight = await FlightModel.findById(booking.returnFlightId);

    if (!flight) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    const flightIdString = flightId.toString();
    const bookingFlightId = flight._id;
    const bookingReturnFlightId = returnFlight?._id;

    // Determine whether this is a departure or return check-in
    const isDeparture = bookingFlightId.equals(
      new mongoose.Types.ObjectId(flightIdString)
    );
    const isReturn =
      bookingReturnFlightId &&
      bookingReturnFlightId.equals(new mongoose.Types.ObjectId(flightIdString));

    // Handle luggage changes based on the flight type
    let diff = 0;
    if (isDeparture) {
      diff = luggage - booking.totalBaggages;
      booking.totalBaggages = luggage;
      booking.selectedSeats = selectedSeatNumber;
    } else if (isReturn) {
      diff = luggage - booking.totalBaggagesReturn;
      booking.totalBaggagesReturn = luggage;
      booking.selectedSeatsReturn = selectedSeatNumber;
    } else {
      return res
        .status(400)
        .json({ error: 'Flight not associated with booking' });
    }

    // Update additionalInfo
    booking.additionalInfo = {
      issuingCountry: country,
      docNo,
      expirationDate,
      nationality,
      email
    };

    // Calculate price difference
    booking.price += diff * 40;

    // Determine if additional payment is required
    let additionalPayment = false;
    let refundPayment = false;
    let noLuggageUpdate = false;

    if (diff > 0) {
      additionalPayment = true;
    } else if (diff < 0) {
      refundPayment = true;
    } else if (diff === 0) {
      noLuggageUpdate = true;
    }

    // Handle payments and check-in status updates
    if (additionalPayment) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${process.env.CLIENT}`,
        cancel_url: `${process.env.CLIENT}`,
        customer: booking.stripeCustomerId,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Umoja Flight Check-in',
                description: `Check-in for flight from ${flight.departureAirportAcronym} to ${flight.arrivalAirportAcronym}.`,
                images: [
                  'https://assets-global.website-files.com/65c12d2d11dcb3bfdc47ead9/65c99295abb87719f1b16d78_airplane-2023-11-27-05-28-40-utc.jpg'
                ]
              },
              unit_amount: diff * 40 * 100
            },
            quantity: 1
          }
        ]
      });

      const emailToBeSend = new Email(
        { email },
        `${process.env.CLIENT}/passengers/receipt`
      );
      const paymentLinkSubject =
        'Complete Additional Payment for Your Umoja Check-in';
      await emailToBeSend.sendPaymentLink(paymentLinkSubject, {
        passengerEmail: email,
        paymentLinkUrl: session.url
      });

      booking.checkInStatusDeparture = isDeparture
        ? 'PENDING_CHECK_IN'
        : booking.checkInStatusDeparture;
      booking.checkInStatusReturn = isReturn
        ? 'PENDING_CHECK_IN'
        : booking.checkInStatusReturn;

      await booking.save();

      return res.status(200).json({
        status: 'success',
        message:
          'Check-in completed, additional payment required. Please check your email.',
        paymentLinkUrl: session.url
      });
    }

    if (refundPayment) {
      booking.checkInStatusDeparture = isDeparture
        ? 'CHECKED_IN'
        : booking.checkInStatusDeparture;
      booking.checkInStatusReturn = isReturn
        ? 'CHECKED_IN'
        : booking.checkInStatusReturn;

      const refund = new Refund({
        _id: new mongoose.Types.ObjectId(),
        bookingId: booking._id.toString(),
        userId: booking.userId.toString(),
        reason: `New refund request from the checkout section of $${-40 * diff
          }`,
        status: REFUND.REQUEST_REFUND
      });

      await refund.save();

      const notifyAdmin = new Notification({
        _id: new mongoose.Types.ObjectId(),
        message: refund.reason,
        route: 'refunds',
        notifier: booking.userId.toString(), // Set the notifier as the booking user
        notifiedTo: [
          {
            user: booking.userId.toString(), // Add the booking user to the notifiedTo array
            seen: false, // Default seen status
          },
        ],
      });


      await notifyAdmin.save();
      await booking.save();

      return res.status(200).json({
        status: 'success',
        message: 'Check-in completed, refund request sent for approval.',
        refund
      });
    }

    if (noLuggageUpdate) {
      booking.checkInStatusDeparture = isDeparture
        ? 'CHECKED_IN'
        : booking.checkInStatusDeparture;
      booking.checkInStatusReturn = isReturn
        ? 'CHECKED_IN'
        : booking.checkInStatusReturn;

      await booking.save();

      return res.status(200).json({
        status: 'success',
        message: 'Check-in completed!'
      });
    }
    res.status(200).json({
      status: 'success',
      message:
        'Check-in completed!',
    });
  } catch (error) {
    console.error('Error during check-in update:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while updating the booking' });
  }
};

export {
  getAllBooking,
  getBooking,
  MoveFlightBooking,
  deleteBooking,
  deleteManyBookings,
  getAllPassengers,
  deleteAllBookings,
  updateBooking,
  updatePassengerInformation,
  updateLuggages,
  getAllSeatsByBookingId,
  bookingCheckIn
};
