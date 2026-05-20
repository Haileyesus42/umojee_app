import { BOOKING_STATUS } from "../../constant";
import AdminUser from "../../model/admin/adminuser.model";
import AgencyUser from "../../model/agency/agencyUser.model";
import Booking from "../../model/booking.model";
import FlightModel from "../../model/flight.model";
import SeatsFlightModel from "../../model/seatsFlight.model";
import mongoose from "mongoose";


export const handleAdminAgencyBookFlight = async (selectedSeats: any, selectedSeatsReturn: any, seatDirect: any, seatReturn: any, data: any, customer: any) => {
    // console.log("it's admin")
    const selectedSeatsData = JSON.parse(selectedSeats).map((selectedSeat: { rowId: string; seatId: string; }) => {
        if (!selectedSeat.rowId || !selectedSeat.seatId) {
            throw new Error('Seat data is missing required fields.');
        }
        return {
            rowId: selectedSeat.rowId,
            seatId: selectedSeat.seatId,
        };
    });
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
                conversationId?: string;
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
            bookingId,
            conversationId,
        } = customer.metadata;
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

            for (const seatData of selectedSeatsData) {
                const row = await SeatsFlightModel.findOne({ _id: seatData.rowId, flightId });
                if (row) {
                    seatDirect = row.seats.find(seat => seat._id.toString() === seatData.seatId);
                    if (seatDirect) {
                        seatDirect.status = "occupied";
                        await row.save();
                        // console.log('Seat status', seatDirect?.seatId);
                        // console.log('Seat status updated | Direct flight');
                    }
                }
            }

            if (selectedSeatsReturnData.length > 0) {
                for (const seatDataReturn of selectedSeatsReturnData) {
                    const row = await SeatsFlightModel.findOne({ _id: seatDataReturn.rowId, flightId: returnFlightId });
                    if (row) {
                        seatReturn = row.seats.find(seat => seat._id.toString() === seatDataReturn.seatId);
                        if (seatReturn) {
                            seatReturn.status = "occupied";
                            await row.save();
                            // console.log('Seat status', seatReturn?.seatId);
                            // console.log('Seat status updated | Return flight');
                        }
                    }
                }
            }

            const admin = await AdminUser.findById(userId);
            if (admin) {
                // console.log('Seat status', seatDirect?.seatId);

                const updateData: Record<string, any> = {
                    paid: true,
                    payment_intent,
                    stripeCustomerId,
                    userId: userId,
                    status: BOOKING_STATUS.TICKETED,
                    selectedSeats: seatDirect?.seatId,
                    selectedSeatsReturn: seatReturn?.seatId,
                    seatsLeft: (flight.seatsLeft - (passengersData.length))
                };

                if (conversationId) {
                    updateData.conversationId = conversationId;
                }

                const booked = await Booking.findOneAndUpdate(
                    { _id: bookingId },
                    updateData
                );
                await admin.save();
                console.log("3. ADMIN|AGENCYBOOKINGHANDLER: ADMIN Booking handled successful!")
                // console.log("Book Ticketed")
            }

            const agency = await AgencyUser.findById(userId);
            let booked
            if (agency) {
                const updateData: Record<string, any> = {
                    paid: true,
                    payment_intent,
                    stripeCustomerId,
                    status: BOOKING_STATUS.TICKETED,
                    selectedSeats: seatDirect?.seatId,
                    selectedSeatsReturn: seatReturn?.seatId,
                };

                if (conversationId) {
                    updateData.conversationId = conversationId;
                }

                booked = await Booking.findOneAndUpdate(
                    { _id: bookingId },
                    updateData
                );
                await agency.save();
                console.log("3.0 ADMIN|AGENCYBOOKINGHANDLER: AGENCY Booking handled successful!")
            }

            flight.seatsLeft -= passengersData.length;
            await flight.save();
            // console.log('Flight saved');

            if (returnFlight) {
                returnFlight.seatsLeft -= passengersData.length;
                await returnFlight.save();
                // console.log('Return Flight saved');
            }
            await session.commitTransaction();
            return booked
        } catch (error) {
            await session.abortTransaction();
            console.error('Transaction aborted due to error:', error);
        } finally {
            session.endSession();
        }
    };

    const booking = await bookFlight(data, customer)

    console.log("3.1 ADMIN|AGENCYBOOKINGHANDLER: SUCCESS!")
    return { booking }

}
