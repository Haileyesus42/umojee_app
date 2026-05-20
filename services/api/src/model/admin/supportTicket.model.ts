import mongoose, { Document } from 'mongoose';

export const SUPPORT_TICKET_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'closed',
] as const;

export const SUPPORT_TICKET_PRIORITIES = ['low', 'medium', 'high'] as const;

export const SUPPORT_TICKET_CATEGORIES = [
  'bug',
  'feature_request',
  'account',
  'booking',
  'payment',
  'general',
] as const;

export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];
export type SupportTicketPriority = (typeof SUPPORT_TICKET_PRIORITIES)[number];
export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number];
export type SupportActorType = 'client' | 'admin' | 'system';

interface TicketActor {
  actorType: SupportActorType;
  actorId?: mongoose.Types.ObjectId | null;
  actorName?: string | null;
}

interface TicketEvent extends TicketActor {
  action:
    | 'created'
    | 'replied'
    | 'assigned'
    | 'unassigned'
    | 'status_changed'
    | 'closed'
    | 'reopened'
    | 'auto_closed';
  message?: string | null;
  createdAt: Date;
}

export interface SupportTicketDocument extends Document {
  ticketNumber: string;
  title: string;
  description: string;
  status: SupportTicketStatus | 'in-progress';
  priority: SupportTicketPriority;
  category: SupportTicketCategory | 'feature' | 'support' | 'feedback' | 'other';
  source: 'client' | 'admin';
  createdBy: mongoose.Schema.Types.ObjectId;
  assignedTo?: mongoose.Schema.Types.ObjectId | null;
  conversations: mongoose.Schema.Types.ObjectId[];
  conversationCount: number;
  latestMessagePreview: string;
  lastMessageAt: Date;
  lastMessageBy?: TicketActor | null;
  closedAt?: Date | null;
  closedBy?: TicketActor | null;
  resolvedAt?: Date | null;
  firstResponseAt?: Date | null;
  events: TicketEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const TicketActorSchema = new mongoose.Schema<TicketActor>(
  {
    actorType: {
      type: String,
      enum: ['client', 'admin', 'system'],
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    actorName: {
      type: String,
      trim: true,
      default: null,
      maxlength: 120,
    },
  },
  {
    _id: false,
  },
);

const TicketEventSchema = new mongoose.Schema<TicketEvent>(
  {
    action: {
      type: String,
      enum: [
        'created',
        'replied',
        'assigned',
        'unassigned',
        'status_changed',
        'closed',
        'reopened',
        'auto_closed',
      ],
      required: true,
    },
    actorType: {
      type: String,
      enum: ['client', 'admin', 'system'],
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    actorName: {
      type: String,
      trim: true,
      default: null,
      maxlength: 120,
    },
    message: {
      type: String,
      trim: true,
      default: null,
      maxlength: 500,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const SupportTicketSchema = new mongoose.Schema<SupportTicketDocument>(
  {
    ticketNumber: {
      type: String,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a ticket title'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a ticket description'],
      trim: true,
      maxlength: [3000, 'Description cannot exceed 3000 characters'],
    },
    status: {
      type: String,
      enum: [...SUPPORT_TICKET_STATUSES, 'in-progress'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: SUPPORT_TICKET_PRIORITIES,
      default: 'medium',
    },
    category: {
      type: String,
      enum: [
        ...SUPPORT_TICKET_CATEGORIES,
        'feature',
        'support',
        'feedback',
        'other',
      ],
      default: 'general',
      required: [true, 'Please provide a category'],
    },
    source: {
      type: String,
      enum: ['client', 'admin'],
      default: 'client',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientUser',
      required: [true, 'Ticket must be created by a client'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
    },
    conversations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
      },
    ],
    conversationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    latestMessagePreview: {
      type: String,
      trim: true,
      default: '',
      maxlength: 280,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastMessageBy: {
      type: TicketActorSchema,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: TicketActorSchema,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    firstResponseAt: {
      type: Date,
      default: null,
    },
    events: {
      type: [TicketEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

SupportTicketSchema.pre('save', function (next) {
  if (!this.ticketNumber) {
    const now = this.createdAt || new Date();
    const datePart = `${now.getUTCFullYear()}${String(
      now.getUTCMonth() + 1,
    ).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
    const suffix = this._id.toString().slice(-6).toUpperCase();
    this.ticketNumber = `SUP-${datePart}-${suffix}`;
  }

  next();
});

SupportTicketSchema.index({ createdBy: 1, createdAt: -1 });
SupportTicketSchema.index({ status: 1, assignedTo: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ category: 1, status: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ ticketNumber: 1, createdAt: -1 });

const SupportTicket = mongoose.model<SupportTicketDocument>(
  'SupportTicket',
  SupportTicketSchema,
);

export default SupportTicket;
