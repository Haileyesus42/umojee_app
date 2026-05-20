import mongoose, { Document } from 'mongoose';

export type SocialMessageType = 'text' | 'journey_share';

export interface SocialMessageDocument extends Document {
  threadId: mongoose.Types.ObjectId;
  senderUserId: mongoose.Types.ObjectId;
  recipientUserId: mongoose.Types.ObjectId;
  messageType: SocialMessageType;
  content: string;
  metadata?: {
    journeyId?: string;
    sharedJourneyUrl?: string;
  };
  sentAt: Date;
}

const SocialMessageSchema = new mongoose.Schema<SocialMessageDocument>(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SocialThread',
      required: true,
      index: true,
    },
    senderUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientUser',
      required: true,
      index: true,
    },
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientUser',
      required: true,
      index: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'journey_share'],
      default: 'text',
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    metadata: {
      journeyId: { type: String, default: '' },
      sharedJourneyUrl: { type: String, default: '' },
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

const SocialMessage = mongoose.model<SocialMessageDocument>(
  'SocialMessage',
  SocialMessageSchema
);

export default SocialMessage;
