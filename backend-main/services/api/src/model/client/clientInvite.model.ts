import mongoose, { Document } from 'mongoose';

export type ClientInviteStatus =
  | 'pending_signup'
  | 'resolved'
  | 'expired'
  | 'revoked';

export interface ClientInviteDocument extends Document {
  inviterUserId: mongoose.Types.ObjectId;
  inviterEmail: string;
  inviteeEmail: string;
  tokenHash: string;
  status: ClientInviteStatus;
  resolvedUserId?: mongoose.Types.ObjectId | null;
  expiresAt: Date;
  lastSentAt?: Date | null;
}

const ClientInviteSchema = new mongoose.Schema<ClientInviteDocument>(
  {
    inviterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientUser',
      required: true,
      index: true,
    },
    inviterEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    inviteeEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending_signup', 'resolved', 'expired', 'revoked'],
      default: 'pending_signup',
      index: true,
    },
    resolvedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientUser',
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

ClientInviteSchema.index(
  { inviterUserId: 1, inviteeEmail: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending_signup' } }
);

const ClientInvite = mongoose.model<ClientInviteDocument>(
  'ClientInvite',
  ClientInviteSchema
);

export default ClientInvite;
