import { Request, Response } from 'express';
import Booking from '../../model/booking.model'; // Import Booking model
import FlightModel from '../../model/flight.model'; // Import Flight model

// API to find flights with the most bookings
export const getFlightsWithMostBookings = async (req: Request, res: Response) => {
    try {
        // Step 1: Group by flightId and count the bookings for each flight
        const flightCounts = await Booking.aggregate([
            {
                $group: {
                    _id: "$flightId",
                    bookingCount: { $sum: 1 }
                }
            },
            {
                $sort: { bookingCount: -1 }
            },
            {
                $limit: 5
            }
        ]);

        if (flightCounts.length === 0) {
            return res.status(404).json({ message: "No bookings found" });
        }

        // Step 2: Lookup flight details based on the flight IDs
        const topFlights = await Promise.all(
            flightCounts.map(async (flight) => {
                const flightDetails = await FlightModel.findById(flight._id)
                    .select("flightNumber airline departureAirport arrivalAirport departureTime arrivalTime price seatsLeft flightStatus");

                return {
                    flightId: flight._id,
                    bookingCount: flight.bookingCount,
                    flightDetails
                };
            })
        );

        res.status(200).json(topFlights);
    } catch (error) {
        console.error("Error fetching top flights:", error);
        res.status(500).json({ error: "Failed to fetch top flights" });
    }
};