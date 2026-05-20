import mongoose, { Document, Schema } from "mongoose";

export interface IDestinationRecommendation extends Document {
  userId: mongoose.Types.ObjectId;
  journeyId?: string;
  conversationId?: string;
  recommendations: Record<string, any>; // Full api_response object { comparison_type, items[] }
  greeting?: string; // ai_generated greeting text
  date: string; // YYYY-MM-DD for daily lookup
  createdAt: Date;
  updatedAt: Date;
}

const destinationRecommendationSchema = new Schema<IDestinationRecommendation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "ClientUser",
      required: [true, "userId is required"],
      index: true,
    },
    journeyId: { type: String, index: true },
    conversationId: { type: String },
    recommendations: {
      type: Schema.Types.Mixed,
      required: [true, "recommendations are required"],
    },
    greeting: { type: String },
    date: {
      type: String,
      required: [true, "date is required"],
      index: true,
    },
  },
  { timestamps: true }
);

// Lookup index: user + date + journeyId (non-unique so multiple entries are allowed)
destinationRecommendationSchema.index({ userId: 1, date: 1, journeyId: 1 });

const DestinationRecommendation = mongoose.model<IDestinationRecommendation>(
  "DestinationRecommendation",
  destinationRecommendationSchema
);

// Drop stale indexes (e.g. old { userId, date } unique) and sync with schema definition
DestinationRecommendation.syncIndexes().catch((err) =>
  console.warn("DestinationRecommendation syncIndexes:", err.message)
);

export default DestinationRecommendation;
