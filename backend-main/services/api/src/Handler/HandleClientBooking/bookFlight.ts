import { BOOKING_STATUS } from "../../constant";
import Booking from "../../model/booking.model";
import ClientUser from "../../model/client/clientuser.model";
import FlightModel from "../../model/flight.model";
import SeatsFlightModel from "../../model/seatsFlight.model";
import mongoose from "mongoose";

export const handleClientBookFlight = async (cli: any, selectedSeatsData: any, selectedSeatsReturnData: any, seatDirect: any, seatReturn: any,
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
            arrivalTime: any,
            conversationId?: string,
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
        conversationId,
    } = customer.metadata;
    if (!flightId || !passengers || !price || !userId || !totalBaggages || !tripType || !departureAirportAcronym || !departureTime || !arrivalAirportAcronym || !arrivalTime) {
        throw new Error('Missing required fields in customer metadata.');
    }console.log(selectedSeatsData, selectedSeatsReturnData)
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
        let flightSeat;

        for (const seatData of selectedSeatsData) {
            const row = await SeatsFlightModel.findOne({ _id: seatData.rowId, flightId });
            if (row) {
                const seat = row.seats.find(seat => seat._id.toString() === seatData.seatId);
                if (seat) {
                    seat.status = "occupied";
                    flightSeat = seat.seatId
                    await row.save();
                    // console.log('Seat status updated | Direct flight');
                }
            }
        }
        let returnSeat;
        if (selectedSeatsReturnData.length > 0) {
            for (const seatDataReturn of selectedSeatsReturnData) {
                const row = await SeatsFlightModel.findOne({ _id: seatDataReturn.rowId, flightId: returnFlightId });
                if (row) {
                    const seat = row.seats.find(seat => seat._id.toString() === seatDataReturn.seatId);
                    if (seat) {
                        seat.status = "occupied";
                        // console.log("Seat return", seat.seatId)
                        returnSeat = seat.seatId
                        await row.save();
                        // console.log('Seat status updated | Return flight');
                    }
                }
            }
        }
        console.log("Seat", flightSeat, "Return seat", returnSeat)

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
            selectedSeats: flightSeat,
            selectedSeatsReturn: returnSeat,
            additionalInfo: {
                email: cli.email,
            },
            conversationId: conversationId,
        });
        // console.log('Booking created');
        user.bookings.push(booking._id);
        if (flightSeat) {
            user.preferences.seat.push(flightSeat);
          }
          if (returnSeat) {
            user.preferences.seat.push(returnSeat);
          }
          
          if (flight.arrivalAirport) {
            user.preferences.destinations.push(flight.arrivalAirport);
          }
          if (returnFlight?.arrivalAirport) {
            user.preferences.destinations.push(returnFlight.arrivalAirport);
          }
          
        await user.save();
        // console.log('User saved');
        flight.seatsLeft -= passengersData.length;
        await flight.save();
        // console.log('Flight saved');
        if (returnFlight) {
            returnFlight.seatsLeft -= passengersData.length;
            await returnFlight.save();
            // console.log('Return Flight saved');
        }
        await session.commitTransaction();
        console.log("3. CLIENTBOOKINGHANDLER: CLIENT Booking handled successful!")
        return {booking}
    } catch (error) {
        await session.abortTransaction();
        console.error('Transaction aborted due to error:', error);
    } finally {
        session.endSession();
    }
};
