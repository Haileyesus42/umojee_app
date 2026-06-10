import { APIFeatures } from '../../utils/ApiFeatures';
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
import { NextFunction, Response } from 'express';
import flightModel, { FlightDocument } from '../../model/flight.model';
import Booking from '../../model/booking.model';
import FlightModel from '../../model/flight.model';
import { RequestWithReference, RequestWithUser } from '../../types';
import { Email } from '../../utils/email';
import AdminUser from '../../model/admin/adminuser.model';
import AgencyUser from '../../model/agency/agencyUser.model';
import ClientUser from '../../model/client/clientuser.model';
import ClientNotificationModel from '../../model/client/notification.model';
import mongoose from 'mongoose';

export const getCheckoutSession = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
) => {
    console.log("Data", req.body.data)
    try {
        // Validate request body
        const { flightId, returnFlightId, passengerUser, user, passengers, totalBaggages, tripType, selectedSeats, selectedSeatsReturn } = req.body.data;

        const selectedSeatsReturnString = JSON.stringify(selectedSeatsReturn);
        console.log("seat", selectedSeats)
        // Parse the user JSON string
        // const user = JSON.parse(userString);
        // console.log(req.body);
        // console.log(flightId);
        // console.log("user id", user._id);
        console.log("passengerUser", passengerUser);
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

        console.log("CustomerInfo", customerInfo)
        const price = flight.price.oneway + (returnFlight ? returnFlight.price.oneway : 0);
        const totalPassengerPrice = price * numberOfPassengers;
        const freeBaggageAllowance = 0; // 1 free baggage per passenger
        // const freeBaggageAllowance = numberOfPassengers; // 1 free baggage per passenger
        const extraBaggages =
            totalBaggages > freeBaggageAllowance
                ? totalBaggages - freeBaggageAllowance
                : 0;
        const extraBaggagePrice = extraBaggages * 40;
        const totalPrice = totalPassengerPrice + extraBaggagePrice;
        const booking = new Booking({
            userId: adminUser ? adminUser?._id.toString() : agencyUser?._id.toString(),
            flightId: flight._id.toString(),
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
                userId: adminUser ? adminUser?._id.toString() : agencyUser?._id.toString(),
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
                selectedSeatsReturn: selectedSeatsReturn ? selectedSeatsReturnString! : null,
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
            const emailMe = { passengerEmail, paymentLinkUrl }
            // console.log("email me", emailMe)
            await emailToBeSend.sendPaymentLink(paymentLinkSubject, emailMe);
        }

        // Log success message to console
        console.log('Payment link sent successfully:', session.url);
        res.status(200).json({
            status: 'success',
            message: 'Payment link sent successfully',
            // paymentLinkUrl: session.url,
            // booked
        });
    } catch (error) {
        console.error('Error in getCheckoutSession:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getBookingByReferenceNumber = async (
    req: RequestWithReference,
    res: Response,
    next: NextFunction
) => {
    try {
        const { referenceNumber } = req.body; // Adjusted to use req.body
        console.log(referenceNumber);

        // Find the booking by reference number
        const booking = await Booking.findOne({ referenceNumber });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.status(200).json({
            status: 'success',
            data: booking
        });
    } catch (error) {
        console.error('Error fetching booking by reference number:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const AIgetCheckoutSession = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Validate request body
      const { flightId, returnFlightId, passengers, totalBaggages, tripType, selectedSeats, selectedSeatsReturn, conversationId } = req.body.data;
      const selectedSeatsReturnString = JSON.stringify(selectedSeatsReturn);
      console.log("payload", req.body.data)
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
      // const userId = req.userId;
      const { userId } = req.params;
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
      const metadata: Record<string, any> = {
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
      };

      if (conversationId) {
        metadata.conversationId = conversationId.toString();
      }

      const customer = await stripe.customers.create({
        metadata,
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
  
    // Send payment link email to the user
    if (user) {
        const emailToBeSend = new Email(
          user,
          `${process.env.CLIENT}/passengers/receipt`
        );
        const paymentLinkSubject = 'Complete Your Umoja Airways Payment';
        const passengerEmail = user.email;
        const paymentLinkUrl = session.url;
        const emailMe = { passengerEmail, paymentLinkUrl };
        // console.log("email me", emailMe)
        await emailToBeSend.sendPaymentLink(paymentLinkSubject, emailMe);
      }
  
      // Log success message to console
      console.log('Payment link sent successfully:', session.url);
      res.status(200).json({
        status: 'success',
        message: 'Payment link sent successfully',
        paymentLink: session.url
      });
      
    } catch (error) {
      // Handle errors
      console.error('Error in getCheckoutSession:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
