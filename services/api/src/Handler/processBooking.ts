import { BOOKING_STATUS } from "../constant";
import AdminUser from "../model/admin/adminuser.model";
import AgencyUser from "../model/agency/agencyUser.model";
import Booking from "../model/booking.model";
import ClientUser from "../model/client/clientuser.model";
import FlightModel from "../model/flight.model";
import SeatsFlightModel from "../model/seatsFlight.model";
import { Email } from "../utils/email";
import mongoose from "mongoose";
import { handleClientBookFlight } from "./HandleClientBooking/bookFlight";
import { handleBookingEmail } from "./HandleEmails/emailHandler";
import { handleAdminAgencyBookFlight } from "./HandleAdminAgencyBookings/handleAdminAgencyBookings";


// DO NOT FORGET TO ADD TRY CATCH 

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
let seatDirect: any;
let seatReturn: any;
export const processBooking = async (data: any) => {
    const customerId = data.customer; // Use data.customer directly
    const customer = await stripe.customers.retrieve(customerId);
    const selectedSeats = customer.metadata?.selectedSeats;
    const selectedSeatsReturn = customer.metadata?.selectedSeatsReturn;
    if (customer.metadata) {
        const usrId = customer.metadata.userId;
        const cli = await ClientUser.findById(usrId);
        const adm = await AdminUser.findById(usrId);
        const agn = await AgencyUser.findById(usrId);
        let booking;
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
            console.log("2. PROCESSBOOKING: We are processing CLIENT booking now...")
            booking = await handleClientBookFlight(cli, selectedSeatsData, selectedSeatsReturnData, seatDirect, seatReturn, data, customer);
            console.log("Booked", booking)
            await handleBookingEmail(customer, booking)
            console.log("5. PROCESSBOOKING: CLIENT Booking Process Completed Successfully!!!")
        } else if (adm || agn) {
            console.log("2. PROCESSBOOKING: We are processing ADMIN|AGENCY booking now...")
            const booking = await handleAdminAgencyBookFlight(selectedSeats, selectedSeatsReturn, seatDirect, seatReturn, data, customer);
            
            await handleBookingEmail(customer, booking)
            console.log("5. PROCESSBOOKING: ADMIN|AGENCY Booking Process Completed Successfully!!!")
        }
    } else {
        console.error('Customer metadata is undefined.');
    }
}
