import mongoose, { Document } from 'mongoose';

export type JourneyShareStatus =
  | 'pending_friendship'
  | 'pending_signup'
  | 'active'
  | 'revoked';

export interface JourneyShareDocument extends Document {
  journeyId: string;
  ownerUserId: mongoose.Types.ObjectId;
  ownerEmail: string;
  recipientUserId?: mongoose.Types.ObjectId | null;
  recipientEmail: string;
  status: JourneyShareStatus;
  inviteId?: mongoose.Types.ObjectId | null;
  friendRequestId?: mongoose.Types.ObjectId | null;
  activatedAt?: Date | null;
  revokedAt?: Date | null;
  lastViewedAt?: Date | null;
}

const JourneyShareSchema = new mongoose.Schema<JourneyShareDocument>(
  {
    journeyId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientUser',
      required: true,
      index: true,
    },
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientUser',
      default: null,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending_friendship', 'pending_signup', 'active', 'revoked'],
      required: true,
      default: 'pending_friendship',
      index: true,
    },
    inviteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientInvite',
      default: null,
    },
    friendRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientFriendRequest',
      default: null,
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    lastViewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

JourneyShareSchema.index(
  { journeyId: 1, ownerUserId: 1, recipientEmail: 1 },
  { unique: true }
);

const JourneyShare = mongoose.model<JourneyShareDocument>(
  'JourneyShare',
  JourneyShareSchema
);

export default JourneyShare;
