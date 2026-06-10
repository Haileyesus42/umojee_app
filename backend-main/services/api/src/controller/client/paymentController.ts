import { NextFunction, Request, Response, response } from 'express';
import FlightModel from '../../model/flight.model';
import { RequestWithUser } from '../../types';
import ClientUser from '../../model/client/clientuser.model';
import { Email } from '../../utils/email';

export const getPaymentStatus = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate request body
    const { flightId, departureDate, returnFlightId, passengers, totalBaggages, tripType } = req.body.data;

    if (
      !flightId ||
      !returnFlightId ||
      !Array.isArray(passengers) ||
      passengers.length === 0 ||
      !Number.isInteger(totalBaggages)
    ) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    // Validate passenger objects
    for (const passenger of passengers) {
      if (!passenger.title || !passenger.firstName || !passenger.lastName) {
        console.log("object")
        return res.status(400).json({ message: "Invalid passenger data" });
      }
    }

    // Fetch flight and user data
    const flight = await FlightModel.findById(flightId);
    const returnFlight = await FlightModel.findById(returnFlightId);
    const userId = req.userId;
    const user = await ClientUser.findById(userId);

    if (!flight || !returnFlight) {
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

    if (tripType === 'round-trip') {
      // Calculate total price
      const price = flight.price.oneway + returnFlight.price.oneway;
      const totalPassengerPrice = price * numberofPassengers;

      const freeBaggageAllowance = numberofPassengers; // 1 free baggage per passenger
      const extraBaggages =
        totalBaggages > freeBaggageAllowance
          ? totalBaggages - freeBaggageAllowance
          : 0;
      const extraBaggagePrice = extraBaggages * 40;
      const totalprice = totalPassengerPrice + extraBaggagePrice;


      // Send receipt email
      const email = new Email(user, `${process.env.CLIENT}/passengers/receipt`);
      const subject = 'Your Umoja Airways Payment Receipt';
      const body = {
        flight,
        departureDate,
        returnFlight,
        totalprice,
        totalBaggages,
        passengers,
      };
      await email.sendReceipt2(subject, body);
    } else if (tripType === 'one-way') {
      // Calculate total price
      const price = flight.price.oneway;
      const totalPassengerPrice = price * numberofPassengers;

      const freeBaggageAllowance = numberofPassengers; // 1 free baggage per passenger
      const extraBaggages =
        totalBaggages > freeBaggageAllowance
          ? totalBaggages - freeBaggageAllowance
          : 0;
      const extraBaggagePrice = extraBaggages * 40;
      const totalprice = totalPassengerPrice + extraBaggagePrice;


      // Send receipt email
      const email = new Email(user, `${process.env.CLIENT}/passengers/receipt`);
      const subject = 'Your Umoja Airways Payment Receipt';
      const body = {
        flight,
        departureDate,
        totalprice,
        totalBaggages,
        passengers,
      };
      await email.sendReceipt(subject, body);
    }

  } catch (error) {
    // Handle errors
    console.error('Error in getCheckoutSession:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};