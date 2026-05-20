import mongoose, { Document, Schema } from 'mongoose';

export interface IRefund extends Document {
  bookingId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
  payment_intent: string;
  reason: string;
  requestDate: Date;
  status: string;
  bookingData: {
    idBooking: string;
    price: number;
    paid: boolean;
    payment_intent: string;
    stripeCustomerId: string;
    status: string;
    passengers: Array<{
      firstName: string;
      lastName: string;
      title: string;
    }>;
    additionalInfo: {
      docNo: string,
      issuingCountry: string,
      expirationDate: Date,
      nationality: string,
      email: string
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
    reason: string;
    requestDate: Date;
    terminal?: string;
    runway?: string;
    TotalSeatsCapacity: number;
    seatsLeft: number;
    stoppageCount: number;
    selectedSeats: string;
    selectedSeatsReturn: string;
    checkInStatusDeparture: "NOT_CHECKED_IN" | "PENDING_CHECK_IN" | "CHECKED_IN";
    checkInStatusReturn: "NOT_CHECKED_IN" | "PENDING_CHECK_IN" | "CHECKED_IN";
    bookedAt: Date;
  };
  userType: {
    name: string;
    requesterName: string;
    requesterEmail: string;
    requestComesFrom: string;
  };
  bookerType: {
    name: string;
    bookerName: string;
    bookerEmail: string;
    bookerComesFrom: string;
  };
}

const RefundSchema: Schema = new Schema<IRefund>(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userType: {
      name: { type: String, default: 'No user found' },
      requesterName: { type: String, default: 'No user found' },
      requesterEmail: { type: String, default: 'No user found' },
      requestComesFrom: { type: String, default: 'No user found' },
    },
    bookerType: {
      name: { type: String, default: 'No user found' },
      bookerName: { type: String, default: 'No user found' },
      bookerEmail: { type: String, default: 'No user found' },
      bookerComesFrom: { type: String, default: 'No user found' },
    },
    payment_intent: { type: String },
    reason: { type: String, default: '' },
    requestDate: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' },
    bookingData: {
      idBooking: { type: String, default: '' },
      price: { type: Number },
      paid: { type: Boolean, default: false },
      passengers: [
        {
          firstName: { type: String },
          title: { type: String },
          lastName: { type: String },
        },
      ],
      additionalInfo: {
        docNo: { type: String },
        issuingCountry: { type: String },
        expirationDate: { type: Date },
        nationality: { type: String },
        email: { type: String },
      },
      totalBaggages: { type: Number, default: 0 },
      totalBaggagesReturn: { type: Number, default: 0 },
      tripType: { type: String, default: null },
      departureAirportAcronym: { type: String },
      arrivalAirportAcronym: { type: String },
      departureTime: { type: Date },
      arrivalTime: { type: Date },
      gate: { type: String },
      terminal: { type: String },
      runway: { type: String },
      duration: { type: String },
      stoppageCount: { type: Number, default: 0 },
      seatsLeft: { type: Number, default: 0 },
      selectedSeats: { type: String },
      selectedSeatsReturn: { type: String },
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
      bookedAt: { type: Date },
    },
  },
  { timestamps: true }
);

RefundSchema.pre<IRefund>('find', function (next) {
  this.populate('bookingId');
  next();
});

export default mongoose.model<IRefund>('Refund', RefundSchema);