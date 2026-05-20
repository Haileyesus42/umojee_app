import { Request, Response } from 'express';
import FlightModel from '../../model/flight.model';
import { APIFeatures } from '../../utils/ApiFeatures';

export const searchFlights = async (req: Request, res: Response) => {
  try {
    // Retrieve filtering criteria from request body
    const { date, destination, departure, passengerCount } = req.body;

    // Create a query object
    const query: any = {};

    // Add conditions based on the filtering criteria
    if (date) {
      // Search for flights departing on the specified date
      query.departureTime = {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000), // Search for flights departing before the next day
      };
    }
    if (destination) {
      query.arrivalAirport = destination;
    }
    if (departure) {
      query.departureAirport = departure;
    }
    if (passengerCount) {
      query.seatsLeft = { $gte: parseInt(passengerCount) };
    }

    // Execute the query with filtering
    const flights = await FlightModel.find(query);

    // Respond with the filtered flights
    res.status(200).json({ status: 'success', count: flights.length, flights });
  } catch (error) {
    console.error('Error getting flights:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};
