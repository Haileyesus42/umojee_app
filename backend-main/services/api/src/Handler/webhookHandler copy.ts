import mongoose from 'mongoose';
import { NextFunction, Request, Response } from 'express';
import FlightModel from '../model/flight.model';
import ClientUser from '../model/client/clientuser.model';
import Booking from '../model/booking.model';
import { Email } from '../utils/email';
import {
  BOOKING_STATUS,
} from '../constant';
import AdminUser from '../model/admin/adminuser.model';
import SeatsFlightModel from '../model/seatsFlight.model';
import AgencyUser from '../model/agency/agencyUser.model';
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const webhookHandler = async (request: Request, response: Response) => {
  const sig = request.headers['stripe-signature'];
  let event: any;
  let data: any;
  let seatDirect: any;
  let seatReturn: any;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    data = event.data.object;
    // console.log('Event Data:', data);
  } catch (err: any) {
    console.error('Error verifying webhook signature:', err);
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  switch (event.type) {
    case 'checkout.session.completed':
      try {
        const customerId = data.customer; // Use data.customer directly
        const customer = await stripe.customers.retrieve(customerId);
        const selectedSeats = customer.metadata?.selectedSeats;
        const selectedSeatsReturn = customer.metadata?.selectedSeatsReturn;
        // Log customer metadata to debug
        // console.log('Customer Metadata:', customer);
        console.log('Customer selectedseats:', selectedSeats);

        // Ensure metadata exists before attempting to destructure
        if (customer.metadata) {
          const usrId = customer.metadata.userId;
          // console.log('Usr id', usrId);
          const cli = await ClientUser.findById(usrId);
          const adm = await AdminUser.findById(usrId);
          const agn = await AgencyUser.findById(usrId);

          if (cli) {


            const selectedSeatsData = JSON.parse(selectedSeats).map((selectedSeat: { rowId: string; seatId: string; }) => {
              if (!selectedSeat.rowId || !selectedSeat.seatId) {
                throw new Error('Seat data is missing required fields.');
              }
              return {
                rowId: selectedSeat.rowId,
                seatId: selectedSeat.seatId,
              };
            });
            console.log("Selected seats data", selectedSeatsData[0])
            // console.log("Selected seats data", selectedSeatsReturnData[0])
            let selectedSeatsReturnData: { rowId: string; seatId: string; }[] = [];
            if (selectedSeatsReturn) {
              selectedSeatsReturnData = JSON.parse(selectedSeatsReturn).map((selectedSeatReturn: { rowId: string; seatId: string; }) => {
                if (!selectedSeatReturn.rowId || !selectedSeatReturn.seatId) {
                  throw new Error('Return seat data is missing required fields.');
                }
                return {
                  rowId: selectedSeatReturn.rowId,
                  seatId: selectedSeatReturn.seatId,
                };
              });
            }
            console.log("it's client")
            const bookFlight = async (
              data: { payment_intent: any },
              customer: {
                metadata: {
                  flightId: any;
                  returnFlightId: any;
                  passengers: any;
                  price: any;
                  userId: any;
                  totalBaggages: any;
                  tripType: any,
                  departureAirportAcronym: any,
                  departureTime: any,
                  arrivalAirportAcronym: any,
                  arrivalTime: any
                };
                id: any;
              }
            ) => {
              const {
                flightId,
                returnFlightId,
                passengers,
                price,
                userId,
                totalBaggages,
                tripType,
                departureAirportAcronym,
                departureTime,
                arrivalAirportAcronym,
                arrivalTime
              } = customer.metadata;
              // Log the metadata to debug
              // console.log('Flight Metadata:', customer.metadata);
              // Ensure all necessary fields are present
              if (!flightId || !passengers || !price || !userId || !totalBaggages || !tripType || !departureAirportAcronym || !departureTime || !arrivalAirportAcronym || !arrivalTime) {
                throw new Error('Missing required fields in customer metadata.');
              }
              const { payment_intent } = data;
              const stripeCustomerId = customer.id;
              const session = await mongoose.startSession();
              session.startTransaction();
              try {
                const user = await ClientUser.findById(userId);
                if (!user) {
                  throw new Error('User not found');
                }
                const flight = await FlightModel.findById(flightId);
                if (!flight) {
                  throw new Error('Flight not found');
                }
                const returnFlight = await FlightModel.findById(returnFlightId);
                // Ensure flight has all necessary fields
                if (!flight.seatsLeft || !flight.arrivalTime || !flight.departureTime || !flight.arrivalAirportAcronym || !flight.departureAirportAcronym) {
                  throw new Error('Flight is missing required fields.');
                }
                const passengersData = JSON.parse(passengers).map((passenger: { firstName: string; lastName: string; title: string; }) => {
                  if (!passenger.firstName || !passenger.lastName || !passenger.title) {
                    throw new Error('Passenger data is missing required fields.');
                  }
                  return {
                    firstName: passenger.firstName,
                    lastName: passenger.lastName,
                    title: passenger.title,
                  };
                });
                // Update seat status
                for (const seatData of selectedSeatsData) {
                  const row = await SeatsFlightModel.findOne({ _id: seatData.rowId, flightId });
                  if (row) {
                    const seat = row.seats.find(seat => seat._id.toString() === seatData.seatId);
                    if (seat) {
                      seat.status = "occupied";
                      await row.save();
                      console.log('Seat status updated | Direct flight');
                    }
                  }
                }

                // Update seat status for the return flight, if applicable
                if (selectedSeatsReturnData.length > 0) {
                  for (const seatDataReturn of selectedSeatsReturnData) {
                    const row = await SeatsFlightModel.findOne({ _id: seatDataReturn.rowId, flightId: returnFlightId });
                    if (row) {
                      const seat = row.seats.find(seat => seat._id.toString() === seatDataReturn.seatId);
                      if (seat) {
                        seat.status = "occupied";
                        await row.save();
                        console.log('Seat status updated | Return flight');
                      }
                    }
                  }
                }
                const booking = await Booking.create({
                  _id: new mongoose.Types.ObjectId(),
                  userId: new mongoose.Types.ObjectId(userId),
                  flightId: new mongoose.Types.ObjectId(flightId),
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
                  returnFlightId: returnFlightId ? new mongoose.Types.ObjectId(returnFlightId) : null,
                  price,
                  paid: true,
                  payment_intent,
                  stripeCustomerId,
                  passengers: passengersData,
                  totalBaggages,
                  tripType,
                  departureAirportAcronym,
                  departureTime,
                  arrivalAirportAcronym,
                  arrivalTime,
                  seatsLeft: (flight.seatsLeft - (passengersData.length)),
                  status: BOOKING_STATUS.TICKETED,
                  selectedSeats: seatDirect?.seatId,
                  selectedSeatsReturn: seatReturn?.seatId,
                  additionalInfo: {
                    email: cli.email,
                  }
                });
                console.log('Booking created');
                user.bookings.push(booking._id);
                await user.save();


                //   console.log('Seat for the return flight updated and saved');

                // console.log('Seat for the direct flight updated and saved');

                console.log('User saved');
                flight.seatsLeft -= passengersData.length;
                // booking.seatsLeft -= passengersData.length;
                await flight.save();
                // await booking.save();
                console.log('Flight saved');
                if (returnFlight) {
                  returnFlight.seatsLeft -= passengersData.length;
                  await returnFlight.save();
                  console.log('Return Flight saved');
                }
                await session.commitTransaction();
              } catch (error) {
                await session.abortTransaction();
                console.error('Transaction aborted due to error:', error);
              } finally {
                session.endSession();
              }
            };
            await bookFlight(data, customer);
            if (customer.metadata.tripType === 'one-way') {
              // Send receipt email
              const email = new Email(customer, `${process.env.CLIENT}/passengers/receipt`);
              const subject = 'Your Umoja Airways Payment Receipt';
              const body = customer.metadata;
              await email.sendReceipt(subject, body);
            } else {
              // Send receipt email
              const email = new Email(customer, `${process.env.CLIENT}/passengers/receipt`);
              const subject = 'Your Umoja Airways Payment Receipt';
              const body = customer.metadata;
              await email.sendReceipt2(subject, body);
            }
          } else if (adm || agn) {
            console.log("it's admin")
            const selectedSeatsData = JSON.parse(selectedSeats).map((selectedSeat: { rowId: string; seatId: string; }) => {
              if (!selectedSeat.rowId || !selectedSeat.seatId) {
                throw new Error('Seat data is missing required fields.');
              }
              return {
                rowId: selectedSeat.rowId,
                seatId: selectedSeat.seatId,
              };
            });
            // console.log("Selected seats data", selectedSeatsData[0])
            // console.log("Selected seats data", selectedSeatsReturnData[0])
            // let selectedSeatsReturnData = [];
            let selectedSeatsReturnData: { rowId: string; seatId: string; }[] = [];
            if (selectedSeatsReturn) {
              selectedSeatsReturnData = JSON.parse(selectedSeatsReturn).map((selectedSeatReturn: { rowId: string; seatId: string; }) => {
                if (!selectedSeatReturn.rowId || !selectedSeatReturn.seatId) {
                  throw new Error('Return seat data is missing required fields.');
                }
                return {
                  rowId: selectedSeatReturn.rowId,
                  seatId: selectedSeatReturn.seatId,
                };
              });
            }
            const bookFlight = async (
              data: { payment_intent: any },
              customer: {
                metadata: {
                  flightId: any;
                  returnFlightId: any;
                  passengers: any;
                  price: any;
                  userId: any;
                  totalBaggages: any;
                  tripType: any;
                  departureAirportAcronym: any;
                  departureTime: any;
                  arrivalAirportAcronym: any;
                  arrivalTime: any;
                  bookingId: any;
                };
                id: any;
              }
            ) => {
              const {
                flightId,
                returnFlightId,
                passengers,
                price,
                userId,
                totalBaggages,
                tripType,
                departureAirportAcronym,
                departureTime,
                arrivalAirportAcronym,
                arrivalTime,
                bookingId
              } = customer.metadata;

              // console.log('Flight Metadata:', customer.metadata);

              // Ensure all necessary fields are present
              if (
                !bookingId ||
                !flightId ||
                !passengers ||
                !price ||
                !userId ||
                !totalBaggages ||
                !tripType ||
                !departureAirportAcronym ||
                !departureTime ||
                !arrivalAirportAcronym ||
                !arrivalTime
              ) {
                throw new Error('Missing required fields in customer metadata.');
              }

              const { payment_intent } = data;
              const stripeCustomerId = customer.id;

              const session = await mongoose.startSession();
              session.startTransaction();

              try {
                const flight = await FlightModel.findById(flightId);
                if (!flight) {
                  throw new Error('Flight not found');
                }
                const returnFlight = await FlightModel.findById(returnFlightId);

                // Ensure flight has all necessary fields
                if (
                  !flight.seatsLeft ||
                  !flight.arrivalTime ||
                  !flight.departureTime ||
                  !flight.arrivalAirportAcronym ||
                  !flight.departureAirportAcronym
                ) {
                  throw new Error('Flight is missing required fields.');
                }

                const passengersData = JSON.parse(passengers).map(
                  (passenger: { firstName: string; lastName: string; title: string }) => {
                    if (!passenger.firstName || !passenger.lastName || !passenger.title) {
                      throw new Error('Passenger data is missing required fields.');
                    }
                    return {
                      firstName: passenger.firstName,
                      lastName: passenger.lastName,
                      title: passenger.title
                    };
                  }
                );

                // Update seat status
                for (const seatData of selectedSeatsData) {
                  const row = await SeatsFlightModel.findOne({ _id: seatData.rowId, flightId });
                  if (row) {
                    seatDirect = row.seats.find(seat => seat._id.toString() === seatData.seatId);
                    if (seatDirect) {
                      seatDirect.status = "occupied";
                      await row.save();
                      console.log('Seat status', seatDirect?.seatId);
                      console.log('Seat status updated | Direct flight');
                    }
                  }
                }

                // Update seat status for the return flight, if applicable
                if (selectedSeatsReturnData.length > 0) {
                  for (const seatDataReturn of selectedSeatsReturnData) {
                    const row = await SeatsFlightModel.findOne({ _id: seatDataReturn.rowId, flightId: returnFlightId });
                    if (row) {
                      seatReturn = row.seats.find(seat => seat._id.toString() === seatDataReturn.seatId);
                      if (seatReturn) {
                        seatReturn.status = "occupied";
                        await row.save();
                        console.log('Seat status', seatReturn?.seatId);
                        console.log('Seat status updated | Return flight');
                      }
                    }
                  }
                }

                // const client = await ClientUser.findById(userId);
                const admin = await AdminUser.findById(userId);
                // console.log("Admin User", admin)
                if (admin) {
                  console.log('Seat status', seatDirect?.seatId);

                  const booked = await Booking.findOneAndUpdate(
                    { _id: bookingId },
                    {
                      paid: true,
                      payment_intent,
                      stripeCustomerId,
                      userId: userId,
                      status: BOOKING_STATUS.TICKETED,
                      selectedSeats: seatDirect?.seatId,
                      selectedSeatsReturn: seatReturn?.seatId,
                      seatsLeft: (flight.seatsLeft - (passengersData.length))
                    }
                  );
                  await admin.save();
                  console.log("Book Ticketed")
                }

                const agency = await AgencyUser.findById(userId);

                if (agency) {
                  const booked = await Booking.findOneAndUpdate(
                    { _id: bookingId },
                    {
                      paid: true,
                      payment_intent,
                      stripeCustomerId,
                      status: BOOKING_STATUS.TICKETED,
                      selectedSeats: seatDirect?.seatId,
                      selectedSeatsReturn: seatReturn?.seatId,
                    }
                  );
                  await agency.save();
                  console.log("Book Ticketed")
                }

                flight.seatsLeft -= passengersData.length;
                await flight.save();
                console.log('Flight saved');

                if (returnFlight) {
                  returnFlight.seatsLeft -= passengersData.length;
                  await returnFlight.save();
                  console.log('Return Flight saved');
                }
                await session.commitTransaction();
              } catch (error) {
                await session.abortTransaction();
                console.error('Transaction aborted due to error:', error);
              } finally {
                session.endSession();
              }
            };

            await bookFlight(data, customer);

            if (customer.metadata.tripType === 'one-way') {
              // Send receipt email
              const email = new Email(customer, `${process.env.CLIENT}/passengers/receipt`);
              const subject = 'Your Umoja Airways Payment Receipt';
              const body = customer.metadata;
              await email.sendReceipt(subject, body);
            } else {
              // Send receipt email
              const email = new Email(customer, `${process.env.CLIENT}/passengers/receipt`);
              const subject = 'Your Umoja Airways Payment Receipt';
              const body = customer.metadata;
              await email.sendReceipt2(subject, body);
            }

          }
          console.log('Checkout was successful!');
        } else {
          console.error('Customer metadata is undefined.');
        }
      } catch (err: any) {
        console.error('Error handling checkout.session.completed:', err);
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  response.status(200).send();
};



export default webhookHandler;
