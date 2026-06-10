import mongoose from "mongoose";
import { FlightDocument } from "./flight.model";

export interface BookingDocument extends mongoose.Document {
  flightId: mongoose.Schema.Types.ObjectId;
  flightData: {
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
    archived: boolean;
  };
  returnFlightId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
  conversationId?: string;
  adminUserId: mongoose.Schema.Types.ObjectId;
  agencyUserId: mongoose.Schema.Types.ObjectId;
  price: number;
  paid: boolean;
  payment_intent: string;
  stripeCustomerId: string;
  status: string;
  passengers: Array<{
    firstName: string;
    lastName: string;
    title: string;
    // travelDoc: Array<{
    //   docNo: string,
    //   issuingCountry: string,
    //   expirationDate: Date,
    //   nationality: string
    // }>
  }>;
  additionalInfo: {
    docNo: string,
    issuingCountry: string,
    expirationDate: Date,
    nationality: string
    email: String
  };
  totalBaggages: number;
  totalBaggagesReturn: number;
  tripType: string;
  departureAirportAcronym: string;
  arrivalAirportAcronym: string;
  departureTime: Date;
  arrivalTime: Date;
  duration: string;
  gate?: string;
  terminal?: string;
  runway?: string;
  TotalSeatsCapacity: number;
  seatsLeft: number;
  stoppageCount: number;
  selectedSeats: string;
  selectedSeatsReturn: string;
  checkInStatusDeparture: "NOT_CHECKED_IN" | "PENDING_CHECK_IN" | "CHECKED_IN";
  checkInStatusReturn: "NOT_CHECKED_IN" | "PENDING_CHECK_IN" | "CHECKED_IN";
  createdAt?: Date;
  updatedAt?: Date;
  referenceNumber: string; // add referenceNumber to the BookingDocument interface
}

const bookingSchema = new mongoose.Schema<BookingDocument>(
  {
    flightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flight",
      required: [true, "Booking must belong to a flight!"],
    },
    flightData: {
      flightNumber: {
        type: String,
      },
      airline: {
        type: String,
      },
      duration: {
        type: String,
      },
      TotalSeatsCapacity: {
        type: Number,
      },
      departureAirport: {
        type: String,
      },
      arrivalAirport: {
        type: String,
      },
      departureAirportAcronym: {
        type: String,
      },
      arrivalAirportAcronym: {
        type: String,
      },
      departureTime: {
        type: Date,
      },
      arrivalTime: {
        type: Date,
      },
      flightStatus: {
        type: String,
        default: 'On Time',
      },
      archived: {
        type: Boolean,
        default: false,
      },
      price: {
        currency: {
          type: String,
        },
        oneway: {
          type: Number,
        },
        roundtrip: {
          type: Number,
        },
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
      stoppageCount: {
        type: Number,
        default: 0
      },
      seatsLeft: {
        type: Number,
        // Set default value of seatsLeft equal to passengerCount
        default: function (): number {
          // Cast `this` to `FlightDocument` to access `passengerCount`
          const flightDoc = this as unknown as FlightDocument;
          return flightDoc.TotalSeatsCapacity;
        },
      },
    },
    returnFlightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flight",
      required: [false, "Booking must belong to a flight!"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientUser",
      required: [true, "Booking must belong to a User!"],
    },
    conversationId: {
      type: String,
    },
    // adminUserId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "AdminUser",
    //   // required: [true, "Booking must belong to a User!"],
    // },
    // agencyUserId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "AgencyUser",
    //   // required: [true, "Booking must belong to a User!"],
    // },
    price: {
      type: Number,
      required: [true, "Booking must have a price."],
    },
    paid: {
      type: Boolean,
      default: false,
    },
    payment_intent: {
      type: String,
      required: [false, "Booking must have a payment intent."],
    },
    stripeCustomerId: {
      type: String,
      required: [false, "Booking must have a stripe customer id."],
    },
    status: {
      type: String,
      default: "Booked",
    },
    passengers: [
      {
        firstName: {
          type: String,
          required: [true, "Passenger must have a FirstName."],
        },
        title: {
          type: String,
          required: [true, "Passenger must have a Title."],
        },
        lastName: {
          type: String,
          required: [true, "Passenger must have a LastName."],
        },
      },
    ],
    additionalInfo:
    {
      docNo: {
        type: String,
      },
      issuingCountry: {
        type: String,
      },
      expirationDate: {
        type: Date,
      },
      nationality: {
        type: String,
      },
      email: {
        type: String,
        // required: [true, "Passenger must have a an email address."],
      }
    },
    totalBaggages: {
      type: Number,
      default: 0,
    },
    totalBaggagesReturn: {
      type: Number,
      default: 0,
    },
    tripType: {
      type: String,
      default: null,
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
    gate: {
      type: String,
    },
    terminal: {
      type: String,
    },
    runway: {
      type: String,
    },
    duration: {
      type: String,
    },
    stoppageCount: {
      type: Number,
      default: 0
    },
    seatsLeft: {
      type: Number,
      required: true,
      default: 0,
    },
    selectedSeats: {
      type: String,
      // default: "18A",
    },
    selectedSeatsReturn: {
      type: String,
      // default: "18B",
    },
    checkInStatusDeparture: {
      type: String,
      enum: ["NOT_CHECKED_IN", "PENDING_CHECK_IN", "CHECKED_IN"],
      default: "NOT_CHECKED_IN",
    },
    checkInStatusReturn: {
      type: String,
      enum: ["NOT_CHECKED_IN", "PENDING_CHECK_IN", "CHECKED_IN"],
      default: "NOT_CHECKED_IN",
    },
    referenceNumber: {
      type: String,
      unique: true,
      default: generateReferenceNumber,
      required: [true, "Booking must have a reference number."],
    },
  },
  { timestamps: true },
);

bookingSchema.pre<BookingDocument>("find", function (next) {
  // this.populate("flightId");
  this.populate("returnFlightId");
  next();
});

// Helper function to generate an 8-character alphanumeric string
function generateReferenceNumber(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Pre-save middleware to generate referenceNumber if not set
bookingSchema.pre<BookingDocument>("save", async function (next) {
  if (!this.referenceNumber) {
    let reference: string = "";
    let isUnique = false;

    while (!isUnique) {
      reference = generateReferenceNumber();
      const existingBooking = await Booking.findOne({ referenceNumber: reference });
      if (!existingBooking) isUnique = true;
    }

    this.referenceNumber = reference;
  }
  next();
});


const Booking = mongoose.model<BookingDocument>("Booking", bookingSchema);

export default Booking;
