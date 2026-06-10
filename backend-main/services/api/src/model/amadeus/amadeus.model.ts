import mongoose, { Schema } from "mongoose";

export interface AmadeusBookingDocument extends mongoose.Document {
    provider?: string;
    amadeusOrderId: string;
    bookingReference?: string;
    referenceNumber: string;
    userId: mongoose.Schema.Types.ObjectId;
    conversationId?: string;
    travelers: Array<{
        travelerId?: string;
        firstName?: string;
        lastName?: string;
        dateOfBirth?: string;
        gender?: string;
        documents?: Array<{
            documentType?: string;
            number?: string;
            expiryDate?: string;
            issuanceCountry?: string;
            nationality?: string;
            holder?: boolean;
        }>;
    }>;
    contacts?: {
        emails: string[];
        phones: string[];
    };
    itineraries: Array<{
        duration?: string;
        segments: Array<{
            departure?: {
                iataCode?: string;
                at?: string;
                terminal?: string;
            };
            arrival?: {
                iataCode?: string;
                at?: string;
                terminal?: string;
            };
            carrierCode?: string;
            flightNumber?: string;
            aircraftCode?: string;
            duration?: string;
            id?: string;
            numberOfStops?: number;
            cabin?: string;
            class?: string;
            fareBasis?: string;
        }>;
    }>;
    price?: {
        currency?: string;
        total?: string;
        grandTotal?: string;
    };
    selectedSeats?: Array<{
        seatNumber: string;
        row: number;
        column: string;
        price?: string;
        currency?: string;
        passengerName?: string;
    }>;
    rawOrder: mongoose.Schema.Types.Mixed;
    orderCreationDate?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const TravelerSchema = new Schema(
    {
        travelerId: String,
        firstName: String,
        lastName: String,
        dateOfBirth: String,
        gender: String,
        documents: [
            {
                documentType: String,
                number: String,
                expiryDate: String,
                issuanceCountry: String,
                nationality: String,
                holder: Boolean,
            },
        ],
    },
    { _id: false },
);

const SegmentSchema = new Schema(
    {
        departure: {
            iataCode: String,
            at: String,
            terminal: String,
        },
        arrival: {
            iataCode: String,
            at: String,
            terminal: String,
        },
        carrierCode: String,
        flightNumber: String,
        aircraftCode: String,
        duration: String,
        id: String,
        numberOfStops: Number,
        cabin: String,
        class: String,
        fareBasis: String,
    },
    { _id: false },
);

const ItinerarySchema = new Schema(
    {
        duration: String,
        segments: [SegmentSchema],
    },
    { _id: false },
);

const ContactSchema = new Schema(
    {
        emails: [String],
        phones: [String],
    },
    { _id: false },
);

const PriceSchema = new Schema(
    {
        currency: String,
        total: String,
        grandTotal: String,
    },
    { _id: false },
);

const AmadeusBookingSchema = new mongoose.Schema<AmadeusBookingDocument>(
    {
        provider: {
            type: String,
            enum: ["amadeus", "duffel"],
            default: "amadeus",
            index: true,
        },
        amadeusOrderId: {
            type: String,
            unique: true,
            required: [true, "Booking must have an Amadeus order id."],
        },
        bookingReference: {
            type: String,
            index: true,
        },
        referenceNumber: {
            type: String,
            unique: true,
            default: generateReferenceNumber,
            required: [true, "Booking must have a reference number."],
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "ClientUser",
            required: [true, "Booking must belong to a User!"],
        },
        conversationId: {
            type: String,
        },
        travelers: [TravelerSchema],
        contacts: ContactSchema,
        itineraries: [ItinerarySchema],
        price: PriceSchema,
        selectedSeats: [
            {
                seatNumber: String,
                row: Number,
                column: String,
                price: String,
                currency: String,
                passengerName: String,
                _id: false,
            },
        ],
        rawOrder: {
            type: Schema.Types.Mixed,
            required: [true, "Booking must store the raw Amadeus order payload."],
        },
        orderCreationDate: String,
    },
    { timestamps: true },
);

// Helper function to generate an 8-character alphanumeric string
function generateReferenceNumber(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Pre-save middleware to generate referenceNumber if not set
AmadeusBookingSchema.pre<AmadeusBookingDocument>("save", async function (next) {
    if (!this.referenceNumber) {
        let reference = "";
        let isUnique = false;

        while (!isUnique) {
            reference = generateReferenceNumber();
            const existingBooking = await (this.constructor as mongoose.Model<AmadeusBookingDocument>).findOne({
                referenceNumber: reference,
            });
            if (!existingBooking) isUnique = true;
        }

        this.referenceNumber = reference;
    }
    next();
});

const AmadeusBookingModel = mongoose.model<AmadeusBookingDocument>("AmadeusBooking", AmadeusBookingSchema);

export default AmadeusBookingModel;
