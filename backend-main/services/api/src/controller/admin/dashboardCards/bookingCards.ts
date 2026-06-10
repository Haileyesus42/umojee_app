import Booking from "../../../model/booking.model";
import { APIFeatures } from "../../../utils/ApiFeatures";
import { Request, Response } from "express";
import moment from 'moment';

export const getBookings = async (req: Request, res: Response) => {
    try {
        const startOfCurrentMonth = moment().startOf('month').toDate();
        const endOfCurrentMonth = moment().endOf('month').toDate();

        const startOfLastMonth = moment().subtract(1, 'month').startOf('month').toDate();
        const endOfLastMonth = moment().subtract(1, 'month').endOf('month').toDate();

        // Queries for current month and last month for each status
        let currentMonthTicketedQuery = Booking.find({
            status: "TICKETED",
            updatedAt: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }
        });
        let lastMonthTicketedQuery = Booking.find({
            status: "TICKETED",
            updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });

        let currentMonthBookedQuery = Booking.find({
            status: "Booked",
            updatedAt: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }
        });
        let lastMonthBookedQuery = Booking.find({
            status: "Booked",
            updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });

        let currentMonthRequestRefundQuery = Booking.find({
            status: "REQUEST REFUND",
            updatedAt: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }
        });
        let lastMonthRequestRefundQuery = Booking.find({
            status: "REQUEST REFUND",
            updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });

        let currentMonthRefundApprovedQuery = Booking.find({
            status: "REFUND APPROVED",
            updatedAt: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }
        });
        let lastMonthRefundApprovedQuery = Booking.find({
            status: "REFUND APPROVED",
            updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });

        // Execute all queries
        const [
            currentMonthTicketed,
            lastMonthTicketed,
            currentMonthBooked,
            lastMonthBooked,
            currentMonthRequestRefund,
            lastMonthRequestRefund,
            currentMonthRefundApproved,
            lastMonthRefundApproved
        ] = await Promise.all([
            currentMonthTicketedQuery.clone(),
            lastMonthTicketedQuery,
            currentMonthBookedQuery.clone(),
            lastMonthBookedQuery,
            currentMonthRequestRefundQuery.clone(),
            lastMonthRequestRefundQuery,
            currentMonthRefundApprovedQuery.clone(),
            lastMonthRefundApprovedQuery,
        ]);

        // Count results
        const currentMonthTicketedCount = currentMonthTicketed.length;
        const lastMonthTicketedCount = lastMonthTicketed.length;
        const currentMonthBookedCount = currentMonthBooked.length;
        const lastMonthBookedCount = lastMonthBooked.length;
        const currentMonthRequestRefundCount = currentMonthRequestRefund.length;
        const lastMonthRequestRefundCount = lastMonthRequestRefund.length;
        const currentMonthRefundApprovedCount = currentMonthRefundApproved.length;
        const lastMonthRefundApprovedCount = lastMonthRefundApproved.length;

        // Calculate percentage increases
        const ticketedPercentageIncrease = lastMonthTicketedCount === 0
            ? (currentMonthTicketedCount > 0 ? 100 : 0)
            : ((currentMonthTicketedCount - lastMonthTicketedCount) / lastMonthTicketedCount) * 100;

        const bookedPercentageIncrease = lastMonthBookedCount === 0
            ? (currentMonthBookedCount > 0 ? 100 : 0)
            : ((currentMonthBookedCount - lastMonthBookedCount) / lastMonthBookedCount) * 100;

        const requestRefundPercentageIncrease = lastMonthRequestRefundCount === 0
            ? (currentMonthRequestRefundCount > 0 ? 100 : 0)
            : ((currentMonthRequestRefundCount - lastMonthRequestRefundCount) / lastMonthRequestRefundCount) * 100;

        const refundApprovedPercentageIncrease = lastMonthRefundApprovedCount === 0
            ? (currentMonthRefundApprovedCount > 0 ? 100 : 0)
            : ((currentMonthRefundApprovedCount - lastMonthRefundApprovedCount) / lastMonthRefundApprovedCount) * 100;

        // Paginate results
        const ticketedFeatures = new APIFeatures(currentMonthTicketedQuery.clone(), req.query)
            .sort()
            .paginate()
            .limitFields();

        const bookedFeatures = new APIFeatures(currentMonthBookedQuery.clone(), req.query)
            .sort()
            .paginate()
            .limitFields();

        const requestRefundFeatures = new APIFeatures(currentMonthRequestRefundQuery.clone(), req.query)
            .sort()
            .paginate()
            .limitFields();

        const refundApprovedFeatures = new APIFeatures(currentMonthRefundApprovedQuery.clone(), req.query)
            .sort()
            .paginate()
            .limitFields();

        const paginatedCurrentMonthTicketed = await ticketedFeatures.query;
        const paginatedCurrentMonthBooked = await bookedFeatures.query;
        const paginatedCurrentMonthRequestRefund = await requestRefundFeatures.query;
        const paginatedCurrentMonthRefundApproved = await refundApprovedFeatures.query;

        res.status(200).json({
            status: 'success',
            ticketed: {
                currentMonthCount: currentMonthTicketedCount,
                lastMonthCount: lastMonthTicketedCount,
                percentageIncrease: ticketedPercentageIncrease,
                // bookings: paginatedCurrentMonthTicketed
            },
            booked: {
                currentMonthCount: currentMonthBookedCount,
                lastMonthCount: lastMonthBookedCount,
                percentageIncrease: bookedPercentageIncrease,
                // bookings: paginatedCurrentMonthBooked
            },
            requestRefund: {
                currentMonthCount: currentMonthRequestRefundCount,
                lastMonthCount: lastMonthRequestRefundCount,
                percentageIncrease: requestRefundPercentageIncrease,
                // bookings: paginatedCurrentMonthRequestRefund
            },
            refundApproved: {
                currentMonthCount: currentMonthRefundApprovedCount,
                lastMonthCount: lastMonthRefundApprovedCount,
                percentageIncrease: refundApprovedPercentageIncrease,
                // bookings: paginatedCurrentMonthRefundApproved
            }
        });
    } catch (error: any) {
        res.status(500).json({ status: 'fail', message: error.message });
        console.log('Error fetching bookings:', error);
    }
};




export const getCanceledBookings = async (req: Request, res: Response) => {
    try {
        let query = Booking.find({ status: "Canceled" });
        const features = new APIFeatures(query, req.query)
            .sort()
            .paginate()
            .limitFields();

        const canceledBookings = await features.query;
        // console.log(canceledBookings);
        res
            .status(200)
            .json({ status: 'success', count: canceledBookings.length, canceledBookings });
    } catch (error: any) {
        res.status(500).json({ status: 'fail', message: error.message });
        console.log('no booking');
    }
};

export const getPendingBookings = async (req: Request, res: Response) => {
    try {
        let query = Booking.find({ status: "Pending" });
        const features = new APIFeatures(query, req.query)
            .sort()
            .paginate()
            .limitFields();

        const pendingBookings = await features.query;
        // console.log(pendingBookings);
        res
            .status(200)
            .json({ status: 'success', count: pendingBookings.length, pendingBookings });
    } catch (error: any) {
        res.status(500).json({ status: 'fail', message: error.message });
        console.log('no booking');
    }
};

export const getBookedBookings = async (req: Request, res: Response) => {
    try {
        let query = Booking.find({ status: "Booked" });
        const features = new APIFeatures(query, req.query)
            .sort()
            .paginate()
            .limitFields();

        const bookedBookings = await features.query;
        // console.log(bookedBookings);
        res
            .status(200)
            .json({ status: 'success', count: bookedBookings.length, bookedBookings });
    } catch (error: any) {
        res.status(500).json({ status: 'fail', message: error.message });
        console.log('no booking');
    }
};


export const getAllBookingForCard = async (req: Request, res: Response) => {
    try {
        let query = Booking.find();

        const features = new APIFeatures(query, req.query)
            .sort()
            .paginate()
            .limitFields();

        const bookings = await features.query;

        const updateBookings = await Promise.all(
            bookings.map(async (booking: any) => {
                const { departureTime, arrivalTime, flightId, departureAirportAcronym, arrivalAirportAcronym, passengers } = booking
                return {
                    departureTime,
                    arrivalTime,
                    departureAirport: flightId?.departureAirport,
                    arrivalAirport: flightId ? flightId?.arrivalAirport : "No flight ID!",
                    departureAirportAcronym,
                    arrivalAirportAcronym,
                    totalPassengers: passengers?.length
                }
            })
        )

        res
            .status(200)
            .json({ status: 'success', count: bookings.length, updateBookings });
    } catch (error: any) {
        res.status(500).json({ status: 'fail', message: error.message });
        console.log('no booking');
    }
};

export const countTodayBookingStatuses = async (req: Request, res: Response) => {
    try {
        // Get the start and end of the current day
        const startOfDay = moment().startOf('day').toDate();
        const endOfDay = moment().endOf('day').toDate();

        // Count ticketed bookings updated today
        const ticketedBookingsCount = await Booking.countDocuments({
            status: 'TICKETED',
            updatedAt: { $gte: startOfDay, $lte: endOfDay }
        });

        // Count booked bookings updated today
        const bookedBookingsCount = await Booking.countDocuments({
            status: 'Booked',
            updatedAt: { $gte: startOfDay, $lte: endOfDay }
        });

        // Count refund requestes bookings updated today
        const refundRequestes = await Booking.countDocuments({
            status: 'REQUEST REFUND',
            updatedAt: { $gte: startOfDay, $lte: endOfDay }
        });

        // Count booked bookings updated today
        const approvedRefunds = await Booking.countDocuments({
            status: 'REFUND APPROVED',
            updatedAt: { $gte: startOfDay, $lte: endOfDay }
        });

        res.status(200).json({
            status: 'success',
            ticketedBookingsCount,
            bookedBookingsCount,
            refundRequestes,
            approvedRefunds,
        });
    } catch (error: any) {
        res.status(500).json({ status: 'fail', message: error.message });
        console.log('Error counting booking statuses:', error);
    }
};

