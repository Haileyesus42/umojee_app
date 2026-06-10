import mongoose, { Document } from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";

export interface AgencyTypesDocument extends Document {
  agencyName: string;
  agencyEmail: string;
  agencyPhone: string;
  agencyAddress: string;
  description: string;
  totalAgents: number;
  agencyStatus: string;
  password: string;
  // countryCode: string;
  correctPassword: (candidatePassword: string, userPassword: string) => Promise<boolean>;
}

const AgencySchema = new mongoose.Schema<AgencyTypesDocument>(
  {
    agencyName: {
      type: String,
      required: [true, "Please provide agency's Name"],
    },
    agencyEmail: {
      type: String,
      unique: true,
      required: [true, "Please tell us your email"],
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    agencyPhone: {
      type: String,
      required: [true, "Please provide agency's phone"],
    },
    // countryCode: {
    //   type: String,
    //   required: [true, "Please provide agency's country code"],
    // },
    agencyAddress: {
      type: String,
      required: [true, "Please provide agency's address"],
    },
    description: {
      type: String,
      required: [true, "Please provide a description"],
    },
    totalAgents: {
      type: Number,
      required: [true, "Please provide total number of agents in the agency"],
    },
    agencyStatus: {
      type: String,
      enum: ['Active', 'Suspended'],
      required: [true, "Please provide agency's status"],
      default: 'Active',
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'], // Set to true
      minlength: 8,
      select: false,
    },
  },
  { timestamps: true }
);

// Method to check if password is correct
AgencySchema.methods.correctPassword = async function (
  candidatePassword: string,
  userPassword: string
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Create and export the Agency model
const AgencyModel = mongoose.model<AgencyTypesDocument>('Agency', AgencySchema);

export default AgencyModel;
