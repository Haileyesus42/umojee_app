import mongoose, { Document } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Define an interface for the client user schema
interface ClientUserDocument extends Document {
  email: string;
  photo?: string | null | undefined;
  OTP?: string | null | undefined;
  OTPCreatedTime?: Date | undefined;
  OTPAttempts: number;
  isBlocked: boolean;
  blockUntil: Date | null | undefined;
  active: boolean;
  verified: boolean;
  countryCode?: string | null | undefined;
  country?: string | null | undefined;
  phone?: string | null | undefined;
  firstName: string;
  lastName: string;
  dob?: Date | null | undefined;
  bookings: mongoose.Schema.Types.ObjectId[];
  amadeusBookings?: mongoose.Schema.Types.ObjectId[];
  friends: mongoose.Schema.Types.ObjectId[];
  pendingInviteToken?: string | null | undefined;
  threadId?: string | null | undefined;
  preferences: {
    seat: string[];
    meal: string[];
    destinations: string[];
  };
  homeLocation?: {
    lat: number | null;
    lon: number | null;
    city: string;
    country: string;
    address: string;
  };
  budgetPreference?: {
    min: number;
    max: number;
    currency: string;
  };
  themePreference?: string;
  journeyMonitoringPreference?: 'all' | 'active' | 'off';
  gender?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorTempSecret?: string;
  twoFactorEnabledAt?: Date | null;
  travelDocuments?: {
    passportNumber: string;
    passportExpiry: Date | null;
    passportIssuingCountry: string;
    nationality: string;
    nationalIdNumber: string;
    frequentFlyerNumber: string;
    frequentFlyerAirline: string;
  };
  password: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  correctPassword: (
    candidatePassword: string,
    userPassword: string
  ) => Promise<boolean>;
  changedPasswordAfter: (JWTTimestamp: any) => boolean;
  createPasswordResetToken: () => string;
}

const ClientuserSchema = new mongoose.Schema<ClientUserDocument>(
  {
    email: {
      type: String,
      unique: true,
      required: [true, 'Please tell us your email'],
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    firstName: { type: String, default: 'Guest' },
    lastName: { type: String, default: 'User' },
    photo: { type: String },
    phone: { type: String },
    dob: { type: Date },
    threadId: { type: String },
    OTP: { type: String },
    countryCode: { type: String },
    country: { type: String },
    OTPCreatedTime: { type: Date },
    OTPAttempts: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
    blockUntil: { type: Date },
    verified: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
      },
    ],
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClientUser',
      },
    ],
    amadeusBookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AmadeusBooking',
      },
    ],
    pendingInviteToken: { type: String, default: null, select: false },
    preferences: {
      seat: { type: [String], default: [] },
      meal: { type: [String], default: [] },
      destinations: { type: [String], default: [] },
    },
    homeLocation: {
      lat: { type: Number, default: null },
      lon: { type: Number, default: null },
      city: { type: String, default: '' },
      country: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    budgetPreference: {
      min: { type: Number, default: 500 },
      max: { type: Number, default: 3000 },
      currency: { type: String, default: 'USD' },
    },
    themePreference: { type: String, default: 'emerald-voyage' },
    journeyMonitoringPreference: { type: String, enum: ['all', 'active', 'off'], default: 'off' },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say', ''], default: '' },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    twoFactorTempSecret: { type: String, select: false },
    twoFactorEnabledAt: { type: Date, default: null },
    travelDocuments: {
      passportNumber: { type: String, default: '' },
      passportExpiry: { type: Date, default: null },
      passportIssuingCountry: { type: String, default: '' },
      nationality: { type: String, default: '' },
      nationalIdNumber: { type: String, default: '' },
      frequentFlyerNumber: { type: String, default: '' },
      frequentFlyerAirline: { type: String, default: '' },
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true }
);

// Query middleware to populate bookings
ClientuserSchema.pre<ClientUserDocument>('find', function (next) {
  this.populate('bookings');
  this.populate('amadeusBookings');
  next();
});

// Pre-save middleware
ClientuserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

ClientuserSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// Instance methods
ClientuserSchema.methods.correctPassword = async function (
  candidatePassword: string,
  userPassword: string
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

ClientuserSchema.methods.changedPasswordAfter = function (JWTTimestamp: any) {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(
      this.passwordChangedAt.getTime() / 1000
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

ClientuserSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
  return resetToken;
};

// Create and export the ClientUser model
const ClientUser = mongoose.model<ClientUserDocument>(
  'ClientUser',
  ClientuserSchema
);

export default ClientUser;
