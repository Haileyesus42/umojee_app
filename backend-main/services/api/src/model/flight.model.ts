import mongoose, { Schema, Document } from 'mongoose';

// Define the FlightDocument interface
export interface FlightDocument extends Document {
  flightNumber: string;
  airline: string;
  duration: string;
  departureAirport: string;
  arrivalAirport: string;
  departureAirportAcronym: string;
  arrivalAirportAcronym: string;
  departureTime: Date;
  arrivalTime: Date;
  flightStatus: string;
  price: {
    currency: string;
    oneway: number;
    roundtrip: number;
  };
  gate?: string;
  terminal?: string;
  runway?: string;
  TotalSeatsCapacity: number;
  seatsLeft: number;
  stoppageCount: number;
  find: (arg0: { archived: boolean }) => any;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  // image: string;
}

// Create a mongoose schema for the form data
const FlightSchema = new Schema<FlightDocument>(
  {
    flightNumber: {
      type: String,
      required: [true, 'A flight number is required'],
    },
    airline: {
      type: String,
      required: [true, 'An airline is required'],
    },
    duration: {
      type: String,
      required: [true, 'A duration is required'],
    },
    TotalSeatsCapacity: {
      type: Number,
      required: [true, 'The number of total seats capacity is required'],
    },
    departureAirport: {
      type: String,
      required: [true, 'A departure airport is required'],
    },
    arrivalAirport: {
      type: String,
      required: [true, 'An arrival airport is required'],
    },
    departureAirportAcronym: {
      type: String,
      required: [true, 'A departure airport acronym is required'],
    },
    arrivalAirportAcronym: {
      type: String,
      required: [true, 'An arrival airport acronym is required'],
    },
    departureTime: {
      type: Date,
      required: [true, 'A departure time is required'],
    },
    arrivalTime: {
      type: Date,
      required: [true, 'An arrival time is required'],
    },
    flightStatus: {
      type: String,
      required: [true, 'A flight status is required'],
      default: 'On Time',
    },
    archived: {
      type: Boolean,
      default: false,
    },
    price: {
      currency: {
        type: String,
        required: [true, 'A currency is required'],
      },
      oneway: {
        type: Number,
        required: [true, 'A one-way price is required'],
      },
      roundtrip: {
        type: Number,
        required: [true, 'A round-trip price is required'],
      },
    },
    stoppageCount: {
      type: Number,
      default: 0
    },
    gate: {
      type: String,
    },
    terminal: {
      type: String,
    },
    runway: {
      type: String,
    },
    seatsLeft: {
      type: Number,
      required: true,
      // Set default value of seatsLeft equal to passengerCount
      default: function (): number {
        // Cast `this` to `FlightDocument` to access `passengerCount`
        const flightDoc = this as unknown as FlightDocument;
        return flightDoc.TotalSeatsCapacity;
      },
    },
    // image: {
    //   type: String, // Reference to the image file in GridFS or file path if stored locally
    //   required: false,
    // },
  },
  { collection: 'flight', timestamps: true }
);
FlightSchema.pre(/^find/, function (next) {
  this.find({ archived: false });
  next();
});
const FlightModel = mongoose.model<FlightDocument>('Flight', FlightSchema);

export default FlightModel;
