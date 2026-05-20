import { NextFunction, Request, Response } from "express";
import SeatsModel from "../model/seats.model";
import { APIFeatures } from "../utils/ApiFeatures";
import mongoose from "mongoose";
import FlightModel from "../model/flight.model";
import SeatsFlightModel from "../model/seatsFlight.model";

export const createSeatFlight = async (req: Request, res: Response) => {
    try {
        // Fetch all flight documents
        const flights = await FlightModel.find({});
        console.log(`Found ${flights.length} flights`);

        // Fetch the existing seat data
        const existingSeatData = await SeatsModel.find({});
        console.log(`Found ${existingSeatData.length} existing seat data`);

        if (existingSeatData.length === 0) {
            console.error('No existing seat data found!');
            return res.status(404).json({ message: 'No existing seat data found!' });
        }

        const sampleSeats = existingSeatData[0].seats;

        // Iterate through each flight
        for (const flight of flights) {
            const rows = existingSeatData.map(row => ({
                rowNumber: row.rowNumber,
                seats: row.seats,
                flightId: flight._id // Reference to the flight document
            }));

            // Save each row as a separate seat document
            for (const row of rows) {
                const newRow = new SeatsFlightModel(row);
                await newRow.save();
                console.log(`Created row ${row.rowNumber} for flight ${flight.flightNumber}`);
            }
        }

        console.log('All seat documents created successfully!');
        return res.status(201).json({ message: 'All seat documents created successfully!' });
    } catch (error) {
        console.error('Error creating seat documents:', error);
        return res.status(500).json({ message: 'Error creating seat documents', error });
    }
};

export const createSeatFlightById = async (req: Request, res: Response) => {
    try {
        const { flightId } = req.body;

        // Validate flightId
        const flight = await FlightModel.findById(flightId);
        if (!flight) {
            console.error('Flight not found!');
            return res.status(404).json({ message: 'Flight not found!' });
        }

        // Fetch the existing seat data
        const existingSeatData = await SeatsModel.find({});
        console.log(`Found ${existingSeatData.length} existing seat data`);

        if (existingSeatData.length === 0) {
            console.error('No existing seat data found!');
            return res.status(404).json({ message: 'No existing seat data found!' });
        }

        const sampleSeats = existingSeatData[0].seats;

        // Iterate through each flight
        const rows = existingSeatData.map(row => ({
            rowNumber: row.rowNumber,
            seats: row.seats,
            flightId: flight._id // Reference to the flight document
        }));

        // Save each row as a separate seat document
        for (const row of rows) {
            const newRow = new SeatsFlightModel(row);
            await newRow.save();
            console.log(`Created row ${row.rowNumber} for flight ${flight.flightNumber}`);
        }

        console.log('All seat documents created successfully!');
        return res.status(201).json({ message: 'All seat documents created successfully!' });
    } catch (error) {
        console.error('Error creating seat documents:', error);
        return res.status(500).json({ message: 'Error creating seat documents', error });
    }
};

export const deleteAllSeatFlights = async (req: Request, res: Response) => {
    try {
        const result = await SeatsFlightModel.deleteMany({});
        console.log(`Deleted ${result.deletedCount} documents from SeatsFlightModel`);
        return res.status(200).json({ message: 'All seat flight data deleted successfully!', deletedCount: result.deletedCount });
    } catch (error) {
        console.error('Error deleting seat flight data:', error);
        return res.status(500).json({ message: 'Error deleting seat flight data', error });
    }
};

export const getAllSeatsWithAllFlightId = async (req: Request, res: Response) => {
    try {
        let query = SeatsFlightModel.find();

        const features = new APIFeatures(query, req.query)
            // .sort()
            .paginate()
            .limitFields();

        const allSeatsWithFlight = await features.query;
        res.status(200).json({ status: 'success', count: allSeatsWithFlight.length, allSeatsWithFlight });
    } catch (error) {
        console.error('Error getting all seats:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

export const getAllSeatsByFlightId = async (req: Request, res: Response) => {
    try {
        const flightId = req.params.id;
        console.log(flightId)

        // Validate flightId
        if (!mongoose.Types.ObjectId.isValid(flightId)) {
            return res.status(400).json({ status: 'fail', message: 'Invalid flight ID' });
        }

        let query = SeatsFlightModel.find({ flightId });

        const features = new APIFeatures(query, req.query)
            // .sort()
            .paginate()
            .limitFields();

        const allSeats = await features.query;
        res.status(200).json({ status: 'success', count: allSeats.length, allSeats });
    } catch (error) {
        console.error('Error getting all seats:', error);
        res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
    }
};

export const resetSeatsStatus = async (req: Request, res: Response) => {
    const { flightId } = req.params;

    try {
        // Validate flightId
        if (!mongoose.Types.ObjectId.isValid(flightId)) {
            return res.status(400).json({ message: 'Invalid flight ID' });
        }

        // Fetch rows for the given flight ID
        const seatRows = await SeatsFlightModel.find({ flightId });

        if (seatRows.length === 0) {
            return res.status(404).json({ message: 'No seat data found for the given flight ID' });
        }

        // Update seats with status "occupied" to "available"
        for (const row of seatRows) {
            for (const seat of row.seats) {
                if (seat.status === 'occupied') {
                    seat.status = 'available';
                }
            }
            // Save the updated row
            await row.save();
        }

        console.log(`All occupied seats for flight ${flightId} have been reset to available.`);
        return res.status(200).json({ message: 'All occupied seats have been reset to available.' });
    } catch (error) {
        console.error('Error resetting seat statuses:', error);
        return res.status(500).json({ message: 'Error resetting seat statuses', error });
    }
};

export const updateAllOccupiedSeatsToAvailableAndAdjustSeatsLeft = async (
    req: Request,
    res: Response
) => {
    try {
        // Fetch all flights
        const allFlights = await FlightModel.find({});
        if (allFlights.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'No flights found' });
        }

        // Iterate through each flight
        for (const flight of allFlights) {
            // Fetch all rows for the current flight
            const rows = await SeatsFlightModel.find({ flightId: flight._id });
            if (rows.length === 0) {
                console.log(`No seat rows found for flight ${flight.flightNumber}`);
                continue;
            }

            // Update all occupied seats to available and count available seats
            let availableSeatsCount = 0;
            for (const row of rows) {
                let hasUpdated = false;
                for (const seat of row.seats) {
                    if (seat.status === 'occupied') {
                        seat.status = 'available';
                        hasUpdated = true;
                    }
                    if (seat.status === 'available') {
                        availableSeatsCount++;
                    }
                }
                if (hasUpdated) {
                    await row.save();
                }
            }

            // Update the seatsLeft field for the flight
            flight.seatsLeft = availableSeatsCount;
            await flight.save();
            console.log(`Updated flight ${flight.flightNumber} with ${availableSeatsCount} available seats`);
        }

        res.status(200).json({ status: 'success', message: 'All occupied seats updated to available and seatsLeft fields adjusted' });
    } catch (error: any) {
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

export const updateSeatsFlight = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { rowId, seatId, status, flightId } = req.body;

        // Validate flightId
        if (!mongoose.Types.ObjectId.isValid(flightId)) {
            return res.status(400).json({ status: 'fail', message: 'Invalid flight ID' });
        }

        const row = await SeatsFlightModel.findOne({ _id: rowId, flightId });
        if (!row) {
            return res.status(404).json({ status: 'fail', message: 'Row not found for the given flight ID' });
        }

        const seat = row.seats.find(seat => seat._id.toString() === seatId);
        if (!seat) {
            return res.status(404).json({ status: 'fail', message: 'Seat not found' });
        }

        seat.status = status;

        await row.save();

        res.status(200).json({ status: 'success', data: seat });
    } catch (error: any) {
        res.status(500).json({ status: 'fail', message: error.message });
    }
};

