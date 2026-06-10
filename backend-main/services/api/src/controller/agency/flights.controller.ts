import { Request, Response } from 'express';
import mongoose from 'mongoose';
import FlightModel from '../../model/flight.model';
import { APIFeatures } from '../../utils/ApiFeatures';
// import { routes } from '../../config';
import moment from 'moment';
// import SeatsModel from '../../model/seats.model';
// import SeatsFlightModel from '../../model/seatsFlight.model';
import { createSeatsForFlight } from '../helpers/createSeatsForFlight';
import { updateSeatsForFlight } from '../helpers/updateSeatsForFlight';

const Agency_createFlight = async (req: Request, res: Response) => {
  const body = req.body;
  console.log("THE FLIGHTS FROM DASHBOARD", body)
  const {
    flightNumber,
    airline,
    duration,
    departureAirport,
    arrivalAirport,
    departureAirportAcronym,
    arrivalAirportAcronym,
    departureTime,
    arrivalTime,
    flightStatus,
    gate,
    price,
    terminal,
    runway,
    TotalSeatsCapacity,
    seatsLeft,
  } = body;

  // Add check for all required fields
  if (
    !flightNumber ||
    !airline ||
    !duration ||
    !price ||
    !departureAirport ||
    !arrivalAirport ||
    !departureAirportAcronym ||
    !arrivalAirportAcronym ||
    !departureTime ||
    !arrivalTime ||
    !flightStatus ||
    !TotalSeatsCapacity
  ) {
    console.log("info error")
    return res
      .status(400)
      .json({ status: 'fail', message: 'Please fill in all required fields' });
  }
  try {
    // let price = { currency: 'USD', oneway: 0, roundtrip: 0 };
    // if (departureAirportAcronym && arrivalAirportAcronym) {
    //   const routeKey = `${departureAirportAcronym}-${arrivalAirportAcronym}`;
    //   const route = routes[routeKey];

    //   if (price) {
    //     price.oneway = route.oneway;
    //     price.roundtrip = route.roundtrip;
    //   } else {
    //     return res.status(400).json({
    //       status: 'fail',
    //       message: 'Route not found',
    //       data: { routeKey: routeKey, possibleRoutes: routes },
    //     });
    //   }
    // } else {
    //   console.log("arconyum error")
    //   return res.status(400).json({
    //     status: 'fail',
    //     message: 'Please send propoer departure and arrival airport acronym',
    //   });
    // }
    const flight = new FlightModel({
      _id: new mongoose.Types.ObjectId(),
      flightNumber,
      airline,
      duration,
      departureAirport,
      arrivalAirport,
      departureAirportAcronym,
      arrivalAirportAcronym,
      departureTime,
      arrivalTime,
      flightStatus,
      price,
      gate,
      terminal,
      runway,
      TotalSeatsCapacity,
      seatsLeft,
    });

    await flight.save();
    // Fetch the existing seat data
    // const existingSeatData = await SeatsModel.find({});
    // console.log(`Found ${existingSeatData.length} existing seat data`);

    // if (existingSeatData.length === 0) {
    //   console.error('No existing seat data found!');
    //   return res.status(404).json({ message: 'No existing seat data found!' });
    // }

    // const sampleSeats = existingSeatData[0].seats;

    // // Iterate through each flight
    // const rows = existingSeatData.map(row => ({
    //   rowNumber: row.rowNumber,
    //   seats: row.seats,
    //   flightId: flight._id // Reference to the flight document
    // }));

    // // Save each row as a separate seat document
    // for (const row of rows) {
    //   const newRow = new SeatsFlightModel(row);
    //   await newRow.save();
    //   console.log(`Created row ${row.rowNumber} for flight ${flight.flightNumber}`);
    // }

    // console.log('All seat documents created successfully!');

    // Use the helper function to create seat documents
    const seatCreationResult = await createSeatsForFlight(flight);

    // Reset all occupied seats to available and calculate seats left
    const availableSeatsCount = await updateSeatsForFlight(flight._id);

    // Update the seatsLeft field for the newly created flight
    flight.seatsLeft = availableSeatsCount;

    await flight.save();

    console.log(
      `Created flight ${flight.flightNumber} with ${availableSeatsCount} available seats`
    );
    
    if (seatCreationResult.error) {
      return res.status(500).json({
        status: 'fail',
        message: seatCreationResult.error,
      });
    }

    console.log('All seat documents created successfully!');
    res.status(201).json({
      status: 'success',
      message: 'Flight created successfully',
      flight,
    });
  } catch (error: any) {
    console.error('Error creating flight:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

const Agency_updateFlight = async (req: Request, res: Response) => {
  const id = req.query.id;
  const body = req.body;
  console.log(id, body)
  const {
    flightNumber,
    airline,
    duration,
    departureAirport,
    arrivalAirport,
    departureAirportAcronym,
    arrivalAirportAcronym,
    departureTime,
    arrivalTime,
    flightStatus,
    price,
    gate,
    terminal,
    runway,
    TotalSeatsCapacity,
    seatsLeft,
  } = body;

  try {
    // Check if ID exists
    if (!id) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'ID parameter is required' });
    }
    const flight = await FlightModel.findByIdAndUpdate(
      id,
      {
        flightNumber,
        airline,
        duration,
        departureAirport,
        arrivalAirport,
        departureAirportAcronym,
        arrivalAirportAcronym,
        departureTime,
        arrivalTime,
        flightStatus,
        price,
        gate,
        terminal,
        runway,
        TotalSeatsCapacity,
        seatsLeft,
      },
      { runValidators: true, new: true }
    );
    if (!flight) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'Flight not found' });
    }
    res.status(204).json({ status: "Updated", message: 'Flight updated successfully', flight });
    console.log(res.statusCode, "Flight created successfully!")
  } catch (error: any) {
    console.error('Error updating flight:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

const Agency_getFlight = async (req: Request, res: Response) => {
  const id = req.query.id;
  try {
    // Check if ID exists
    if (!id) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'ID parameter is required' });
    }
    const flight = await FlightModel.findById(id);
    if (!flight) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'Flight not found' });
    }
    res.json({ status: 'success', flight });
  } catch (error) {
    console.error('Error getting flight:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};

const Agency_getAllFlight = async (req: Request, res: Response) => {
  try {
    let query = FlightModel.find();

    const features = new APIFeatures(query, req.query)
      .sort()
      .paginate()
      .limitFields();

    const flights = await features.query;
    res.status(200).json({ status: 'success', count: flights.length, flights });
  } catch (error) {
    console.error('Error getting all flights:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};

const Agency_archiveFlight = async (req: Request, res: Response) => {

  const id = req.query.id;
  try {
    // Check if ID exists
    if (!id) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'ID parameter is required' });
    }
    const flight = await FlightModel.findByIdAndUpdate(
      id,
      {
        archived: true,
      },
      { runValidators: true, new: true }
    );
    if (!flight) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'Flight not found' });
    }
    res.json({ status: 'success', message: 'Flight archived successfully' });
  } catch (error: any) {
    console.error('Error archiving flight:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

const Agency_getAllArchiveFlight = async (req: Request, res: Response) => {
  try {
    let query = FlightModel.find({ archived: true });

    const features = new APIFeatures(query, req.query)
      .sort()
      .paginate()
      .limitFields();

    const flights = await features.query;
    res.status(200).json({ status: 'success', count: flights.length, flights });
  } catch (error) {
    console.error('Error getting all flights:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};

const Agency_deleteFlight = async (req: Request, res: Response) => {
  const id = req.query.id as string;
  // console.log("ID", req.params._id)
  try {
    // Check if ID exists
    if (!id) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'ID parameter is required' });
    }
    const flight = await FlightModel.findByIdAndDelete(id);
    if (!flight) {
      console.log("no id")
      return res
        .status(404)
        .json({ status: 'fail', message: 'Flight not found' });
    }
    console.log("successfully deleted the flight")
    res
      .status(200)
      .json({ status: 'success', message: 'Flight deleted successfully' });
  } catch (error) {
    console.error('Error deleting flight:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};

const Agency_deleteManyFlights = async (req: Request, res: Response) => {
  const { ids } = req.body;
  console.log("ID", ids)
  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'IDs parameter is required and should be an array' });
    }

    const deleteResult = await FlightModel.deleteMany({ _id: { $in: ids } });

    if (deleteResult.deletedCount === 0) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'No Flight found to delete' });
    }
    console.log("successfully deleted the flights:", ids)
    res
      .status(200)
      .json({ status: 'success', message: 'Flights deleted successfully', count: deleteResult.deletedCount });
  } catch (error) {
    console.error('Error deleting flights:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};

const Agency_cancelFlight = async (req: Request, res: Response) => {

  const id = req.query.id;
  try {
    // Check if ID exists
    if (!id) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'ID parameter is required' });
    }
    const flight = await FlightModel.findByIdAndUpdate(
      id,
      {
        flightStatus: "Cancelled",
      },
      { runValidators: true, new: true }
    );
    if (!flight) {
      return res
        .status(404)
        .json({ status: 'fail', message: 'Flight not found' });
    }
    res.json({ status: 'success', message: 'Flight cancelled successfully' });
  } catch (error: any) {
    console.error('Error cancelling flight:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

const Agency_searchFlights = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, arrivalCity, departureCity } = req.query;
    console.log(req.query)

    if (!startDate || !endDate) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please fill in all required fields'
      });
    }
    const start = moment(String(startDate));
    const end = moment(String(endDate));
    if (!start.isValid() || !end.isValid()) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Invalid date string' });
    }

    const query: any = {};

    query.departureTime = {
      $gte: start.toDate(),
      $lt: end.toDate()
    };

    if (arrivalCity) {
      query.arrivalAirportAcronym = arrivalCity;
    }
    if (departureCity) {
      query.departureAirportAcronym = departureCity;
    }

    const flights = await FlightModel.find(query, {
      archived: false,
      deleted: false
    });

    res.status(200).json({ status: 'success', count: flights.length, flights });
  } catch (error) {
    console.error('Error getting flights:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};

const Agency_getAllFlightFiltered = async (req: Request, res: Response) => {
  const { startDate, endDate, arrivalAirportAcronym, departureAirportAcronym } = req.query;
  console.log(req.query)
  try {
    let query = FlightModel.find({ departureAirportAcronym, arrivalAirportAcronym });

    const features = new APIFeatures(query, req.query)
      .sort()
      .paginate()
      .limitFields();

    const flights = await features.query;
    res.status(200).json({ status: 'success', count: flights.length, flights });
  } catch (error) {
    console.error('Error getting all flights:', error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
};
export {
  Agency_createFlight,
  Agency_getFlight,
  Agency_getAllFlight,
  Agency_updateFlight,
  Agency_archiveFlight,
  Agency_getAllArchiveFlight,
  Agency_deleteFlight,
  Agency_deleteManyFlights,
  Agency_cancelFlight,
  Agency_searchFlights,
  Agency_getAllFlightFiltered
};