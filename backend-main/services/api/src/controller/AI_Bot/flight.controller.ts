import FlightModel from '../../model/flight.model';
import { Request, Response } from 'express';
// import FlightModel /models/FlightModel'; // Adjust the import path as needed

export const getFlightsByAirports = async (req: Request, res: Response) => {
    try {
      const { departureAirport, arrivalAirport } = req.query;
  
      // Validate input parameters
      if (!departureAirport || !arrivalAirport) {
        return res.status(400).json({
          status: 'fail',
          message: 'Both departureAirport and arrivalAirport are required',
        });
      }
  
      // Case-insensitive query using regular expressions
      const flights = await FlightModel.find({
        departureAirport: new RegExp(`^${departureAirport}$`, 'i'),
        arrivalAirport: new RegExp(`^${arrivalAirport}$`, 'i'),
      });
  
      res.status(200).json({
        status: 'success',
        count: flights.length,
        flights,
      });
      console.log(res.statusCode, "Successfully fetched a flight data by airports")
      
    } catch (error) {
      console.error('Error getting flights by airports:', error);
      res.status(500).json({
        status: 'fail',
        message: 'Internal Server Error',
      });
    }
  };
  
