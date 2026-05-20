import mongoose, { Document } from 'mongoose';

interface ConversationDocument extends Document {
  ticket: mongoose.Schema.Types.ObjectId;
  sender: mongoose.Schema.Types.ObjectId;
  senderType: 'client' | 'admin';
  message: string;
  attachments?: string[];
  createdAt: Date;
}

const ConversationSchema = new mongoose.Schema<ConversationDocument>(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportTicket',
      required: [true, 'Conversation must belong to a ticket'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Conversation must have a sender'],
    },
    senderType: {
      type: String,
      required: [true, 'Please specify sender type'],
      enum: ['client', 'admin'],
    },
    message: {
      type: String,
      required: [true, 'Please provide a message'],
      trim: true,
      maxlength: [4000, 'Message cannot exceed 4000 characters'],
    },
    attachments: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  },
);

ConversationSchema.index({ ticket: 1, createdAt: 1 });

const Conversation = mongoose.model<ConversationDocument>(
  'Conversation',
  ConversationSchema,
);

export default Conversation;
