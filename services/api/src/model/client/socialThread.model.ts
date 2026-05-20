import mongoose, { Document } from 'mongoose';

export interface SocialThreadDocument extends Document {
  participantIds: mongoose.Types.ObjectId[];
  createdByUserId: mongoose.Types.ObjectId;
  lastMessageAt?: Date | null;
  lastMessagePreview?: string | null;
}

const SocialThreadSchema = new mongoose.Schema<SocialThreadDocument>(
  {
    participantIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClientUser',
        required: true,
        index: true,
      },
    ],
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientUser',
      required: true,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    lastMessagePreview: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true }
);

SocialThreadSchema.index({ participantIds: 1 });

const SocialThread = mongoose.model<SocialThreadDocument>(
  'SocialThread',
  SocialThreadSchema
);

export default SocialThread;
