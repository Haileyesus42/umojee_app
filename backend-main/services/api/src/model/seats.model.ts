import mongoose, { Schema } from "mongoose";

// Define the seatsDocument interface
interface seatsDocument extends Document {
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
interface rowDocument extends Document {
    rowNumber: number;
    seats: seatsDocument[];
}

// Define the seat schema
const seatSchema = new Schema<seatsDocument>({
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
const rowSchema = new Schema<rowDocument>({
    rowNumber: { type: Number, required: true, unique: true },
    seats: [seatSchema]
});

// Create the model
const SeatsModel = mongoose.model<rowDocument>('Seats', rowSchema);

export default SeatsModel;