import mongoose, { Document } from 'mongoose';

export type ClientFriendRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled';

export interface ClientFriendRequestDocument extends Document {
  requesterUserId: mongoose.Types.ObjectId;
  recipientUserId: mongoose.Types.ObjectId;
  requesterEmail: string;
  recipientEmail: string;
  status: ClientFriendRequestStatus;
  respondedAt?: Date | null;
}

const ClientFriendRequestSchema = new mongoose.Schema<ClientFriendRequestDocument>(
  {
    requesterUserId: {
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
    requesterEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled'],
      default: 'pending',
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

ClientFriendRequestSchema.index(
  { requesterUserId: 1, recipientUserId: 1 },
  { unique: true }
);

const ClientFriendRequest = mongoose.model<ClientFriendRequestDocument>(
  'ClientFriendRequest',
  ClientFriendRequestSchema
);

export default ClientFriendRequest;
