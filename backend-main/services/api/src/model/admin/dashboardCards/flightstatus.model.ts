import mongoose, { Document } from "mongoose";

interface FlightStatusDocument extends Document {
    onTime: number;
    delayed: number;
    cancelled: number;
}

const FlightStatusSchema = new mongoose.Schema<FlightStatusDocument>({
    onTime: {
        type: Number,
    },
    delayed: {
        type: Number,
    },
    cancelled: {
        type: Number,
    },
},
    { timestamps: true }
);

const FlightStatusModel = mongoose.model<FlightStatusDocument>('FlightStatusCard', FlightStatusSchema);

export default FlightStatusModel;