import mongoose, { Schema, Document } from "mongoose";
import { FlightDocument } from './flight.model';  // Import the FlightDocument interface

// Define the seatsDocument interface
interface seatsFlightDocument extends Document {
    _id: mongoose.Schema.Types.ObjectId;
    seatId: string;
    status: string;
    unsuitableForHandicap: boolean;
    armTrayLeft: boolean;
    armTrayRight: boolean;
    babyHammock: boolean;
    handicapArmRest: boolean;
    noBreakOver: boolean;
    limitedRecline: boolean;
    noRecline: boolean;
    hideSeat: boolean;
}

// Define the rowDocument interface
interface row2Document extends Document {
    rowNumber: number;
    seats: seatsFlightDocument[];
    flightId: mongoose.Schema.Types.ObjectId;  // Reference to FlightModel
}

// Define the seat schema
const seatFlightSchema = new Schema<seatsFlightDocument>({
    seatId: { type: String, required: true },
    status: { type: String, required: true },
    unsuitableForHandicap: { type: Boolean, required: true },
    armTrayLeft: { type: Boolean, required: true },
    armTrayRight: { type: Boolean, required: true },
    babyHammock: { type: Boolean, required: true },
    handicapArmRest: { type: Boolean, required: true },
    noBreakOver: { type: Boolean, required: true },
    limitedRecline: { type: Boolean, required: true },
    noRecline: { type: Boolean, required: true },
    hideSeat: { type: Boolean, required: true }
});

// Define the row schema
const row2Schema = new Schema<row2Document>({
    rowNumber: { type: Number, required: true },
    seats: [seatFlightSchema],
    flightId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flight', required: true }  // Reference to FlightModel
});

// Create the model
const SeatsFlightModel = mongoose.model<row2Document>('AllSeatsWithFlight', row2Schema);

export default SeatsFlightModel;
