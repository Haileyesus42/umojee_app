import mongoose from 'mongoose';
import { Email } from '../utils/email';
import { AppError } from '../utils/appError';
import AdminUser from '../model/admin/adminuser.model';
import Conversation from '../model/admin/conversation.model';
import SupportTicket, {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
  SupportActorType,
} from '../model/admin/supportTicket.model';
import ClientUser from '../model/client/clientuser.model';

type TicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];
type TicketPriority = (typeof SUPPORT_TICKET_PRIORITIES)[number];
type TicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number];

type TicketActorInput = {
  actorType: SupportActorType;
  actorId?: mongoose.Types.ObjectId | string | null;
  actorName?: string | null;
};

type TicketListParams = {
  page: number;
  limit: number;
  status?: string;
  priority?: string;
  category?: string;
  assignedTo?: string;
  search?: string;
  sort?: string;
};

const STATUS_ALIASES: Record<string, TicketStatus> = {
  open: 'open',
  'in-progress': 'in_progress',
  in_progress: 'in_progress',
  resolved: 'resolved',
  closed: 'closed',
};

const CATEGORY_ALIASES: Record<string, TicketCategory> = {
  bug: 'bug',
  feature: 'feature_request',
  feature_request: 'feature_request',
  support: 'general',
  feedback: 'general',
  other: 'general',
  account: 'account',
  booking: 'booking',
  payment: 'payment',
  general: 'general',
};

const SORT_FIELDS: Record<string, 1 | -1> = {
  createdAt: -1,
  lastMessageAt: -1,
  priority: 1,
  status: 1,
};

const sanitizeMessage = (value: string) => value.replace(/\s+/g, ' ').trim();

const toObjectId = (value: string, fieldName: string) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }

  return new mongoose.Types.ObjectId(value);
};

const normalizeStatus = (status?: string | null): TicketStatus | undefined => {
  if (!status) {
    return undefined;
  }

  return STATUS_ALIASES[status];
};

const normalizeCategory = (
  category?: string | null,
): TicketCategory | undefined => {
  if (!category) {
    return undefined;
  }

  return CATEGORY_ALIASES[category];
};

const buildActor = (actor: TicketActorInput) => ({
  actorType: actor.actorType,
  actorId: actor.actorId ? new mongoose.Types.ObjectId(actor.actorId) : null,
  actorName: actor.actorName || null,
});

const getObjectIdString = (value: any) =>
  value?._id?.toString?.() || value?.toString?.() || '';

const getClientDisplayName = (client: any) =>
  `${client?.firstName || 'Customer'} ${client?.lastName || ''}`.trim();

const getAdminDisplayName = (admin: any) => admin?.name || 'Support Agent';

const buildMessagePreview = (message: string) => sanitizeMessage(message).slice(0, 280);
const sanitizeAttachments = (attachments?: string[]) =>
  (attachments || []).filter((attachment) => typeof attachment === 'string' && attachment.trim().length > 0);

const buildListSort = (sort?: string) => {
  if (!sort) {
    return { lastMessageAt: -1 as const };
  }

  const direction = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace(/^-/, '');

  if (!Object.prototype.hasOwnProperty.call(SORT_FIELDS, field)) {
    return { lastMessageAt: -1 as const };
  }

  return { [field]: direction as 1 | -1 };
};

const buildTicketSearchFilter = (params: TicketListParams, isClientList: boolean, clientId?: string) => {
  const filter: Record<string, any> = {};
  const normalizedStatus = normalizeStatus(params.status);
  const normalizedCategory = normalizeCategory(params.category);

  if (isClientList && clientId) {
    filter.createdBy = toObjectId(clientId, 'client id');
  }

  if (normalizedStatus) {
    filter.status = normalizedStatus === 'in_progress' ? { $in: ['in_progress', 'in-progress'] } : normalizedStatus;
  }

  if (params.priority) {
    filter.priority = params.priority;
  }

  if (normalizedCategory) {
    const legacyCategories =
      normalizedCategory === 'feature_request'
        ? ['feature_request', 'feature']
        : normalizedCategory === 'general'
          ? ['general', 'support', 'feedback', 'other']
          : [normalizedCategory];
    filter.category = { $in: legacyCategories };
  }

  if (params.assignedTo) {
    filter.assignedTo =
      params.assignedTo === 'unassigned'
        ? null
        : toObjectId(params.assignedTo, 'assignedTo');
  }

  if (params.search) {
    const term = params.search.trim();
    filter.$or = [
      { ticketNumber: { $regex: term, $options: 'i' } },
      { title: { $regex: term, $options: 'i' } },
    ];
  }

  return filter;
};

const serializeConversation = (conversation: any) => ({
  id: conversation._id.toString(),
  senderType: conversation.senderType,
  senderName:
    conversation.senderType === 'admin'
      ? getAdminDisplayName(conversation.sender || conversation.senderDetails)
      : getClientDisplayName(conversation.sender || conversation.senderDetails),
  senderEmail: conversation.sender?.email || conversation.senderDetails?.email || '',
  message: conversation.message,
  attachments: conversation.attachments || [],
  createdAt: conversation.createdAt,
});

const serializeTicketSummary = (ticket: any) => ({
  id: ticket._id.toString(),
  ticketNumber: ticket.ticketNumber,
  title: ticket.title,
  description: ticket.description,
  category: normalizeCategory(ticket.category) || 'general',
  priority: ticket.priority,
  status: normalizeStatus(ticket.status) || 'open',
  source: ticket.source,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  lastMessageAt: ticket.lastMessageAt || ticket.updatedAt,
  latestMessagePreview: ticket.latestMessagePreview || '',
  conversationCount: ticket.conversationCount || 0,
  createdBy: ticket.createdBy
    ? {
        id: ticket.createdBy._id?.toString?.() || ticket.createdBy.toString?.(),
        name: getClientDisplayName(ticket.createdBy),
        email: ticket.createdBy.email || '',
      }
    : null,
  assignedTo: ticket.assignedTo
    ? {
        id: ticket.assignedTo._id?.toString?.() || ticket.assignedTo.toString?.(),
        name: getAdminDisplayName(ticket.assignedTo),
        email: ticket.assignedTo.email || '',
        role: ticket.assignedTo.role || '',
      }
    : null,
});

const serializeTicketDetail = (ticket: any, conversations: any[]) => ({
  ...serializeTicketSummary(ticket),
  firstResponseAt: ticket.firstResponseAt,
  resolvedAt: ticket.resolvedAt,
  closedAt: ticket.closedAt,
  closedBy: ticket.closedBy || null,
  events: (ticket.events || []).map((event: any) => ({
    action: event.action,
    actorType: event.actorType,
    actorName: event.actorName || '',
    message: event.message || '',
    createdAt: event.createdAt,
  })),
  conversations: conversations.map(serializeConversation),
});

const logTicketEvent = async (
  ticketId: mongoose.Types.ObjectId | string,
  event: {
    action:
      | 'created'
      | 'replied'
      | 'assigned'
      | 'unassigned'
      | 'status_changed'
      | 'closed'
      | 'reopened'
      | 'auto_closed';
    actor: TicketActorInput;
    message?: string;
  },
) => {
  await SupportTicket.findByIdAndUpdate(ticketId, {
    $push: {
      events: {
        action: event.action,
        ...buildActor(event.actor),
        message: event.message || null,
        createdAt: new Date(),
      },
    },
  });
};

const sendTicketCreatedEmail = async (client: any, ticket: any) => {
  await new Email(client, 'support-ticket-created').sendSupportTicketCreated(ticket);
};

const sendTicketResponseEmail = async (client: any, ticket: any, conversation: any) => {
  await new Email(client, 'support-response').sendSupportResponse(ticket, conversation);
};

const sendTicketClosedEmail = async (client: any, ticket: any) => {
  await new Email(client, 'support-ticket-closed').sendSupportTicketClosed(ticket);
};

const sendTicketAssignmentEmail = async (
  assignee: any,
  ticket: any,
  assignedBy?: string,
) => {
  await new Email(assignee, 'support-assignment').sendSupportAssignment(
    ticket,
    assignedBy,
  );
};

const ensureTicketReplyAllowed = (ticket: any) => {
  const status = normalizeStatus(ticket.status);
  if (status === 'closed') {
    throw new AppError('Closed tickets must be reopened before replying.', 400);
  }
};

const ensureTicketBelongsToClient = (ticket: any, clientId: string) => {
  const ownerId = ticket.createdBy?._id?.toString?.() || ticket.createdBy?.toString?.();
  if (ownerId !== clientId) {
    throw new AppError('Ticket not found', 404);
  }
};

export const createClientTicket = async (
  clientId: string,
  payload: {
    title: string;
    description: string;
    category: string;
    priority?: string;
    attachments?: string[];
  },
) => {
  const client = await ClientUser.findById(clientId).lean();
  if (!client) {
    throw new AppError('Client user not found', 404);
  }

  const category = normalizeCategory(payload.category);
  if (!category) {
    throw new AppError('Invalid category', 400);
  }

  const priority = (payload.priority || 'medium') as TicketPriority;
  const message = sanitizeMessage(payload.description);
  const attachments = sanitizeAttachments(payload.attachments);
  const actorName = getClientDisplayName(client);

  const ticket = await SupportTicket.create({
    title: payload.title.trim(),
    description: message,
    category,
    priority,
    createdBy: client._id,
    source: 'client',
    conversationCount: 0,
    latestMessagePreview: buildMessagePreview(message),
    lastMessageAt: new Date(),
    lastMessageBy: buildActor({
      actorType: 'client',
      actorId: client._id,
      actorName,
    }),
    events: [
      {
        action: 'created',
        ...buildActor({
          actorType: 'client',
          actorId: client._id,
          actorName,
        }),
        message: 'Ticket created',
        createdAt: new Date(),
      },
    ],
  });

  const conversation = await Conversation.create({
    ticket: ticket._id,
    sender: client._id,
    senderType: 'client',
    message,
    attachments,
  });

  ticket.conversations.push(conversation._id);
  ticket.conversationCount = 1;
  await ticket.save();

  await sendTicketCreatedEmail(client, ticket);

  return getTicketDetailForClient(ticket._id.toString(), clientId);
};

export const listClientTickets = async (clientId: string, params: TicketListParams) => {
  const filter = buildTicketSearchFilter(params, true, clientId);
  const skip = (params.page - 1) * params.limit;
  const sort = buildListSort(params.sort);

  const [items, total] = await Promise.all([
    SupportTicket.find(filter)
      .populate('assignedTo', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(params.limit)
      .lean(),
    SupportTicket.countDocuments(filter),
  ]);

  return {
    items: items.map(serializeTicketSummary),
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
    hasNextPage: skip + items.length < total,
  };
};

const loadTicketDetail = async (ticketId: string) => {
  const ticket = await SupportTicket.findById(ticketId)
    .populate('createdBy', 'firstName lastName email')
    .populate('assignedTo', 'name email role');

  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  const conversations = await Conversation.find({ ticket: ticket._id })
    .sort({ createdAt: 1 })
    .lean();

  const adminSenderIds = Array.from(
    new Set(
      conversations
        .filter((conversation: any) => conversation.senderType === 'admin')
        .map((conversation: any) => getObjectIdString(conversation.sender))
        .filter(Boolean),
    ),
  );

  const clientSenderIds = Array.from(
    new Set(
      conversations
        .filter((conversation: any) => conversation.senderType === 'client')
        .map((conversation: any) => getObjectIdString(conversation.sender))
        .filter(Boolean),
    ),
  );

  const [adminSenders, clientSenders] = await Promise.all([
    adminSenderIds.length
      ? AdminUser.find({ _id: { $in: adminSenderIds } })
          .select('name email')
          .lean()
      : [],
    clientSenderIds.length
      ? ClientUser.find({ _id: { $in: clientSenderIds } })
          .select('firstName lastName email')
          .lean()
      : [],
  ]);

  const adminSenderMap = new Map(
    adminSenders.map((sender: any) => [sender._id.toString(), sender]),
  );
  const clientSenderMap = new Map(
    clientSenders.map((sender: any) => [sender._id.toString(), sender]),
  );

  const hydratedConversations = conversations.map((conversation: any) => ({
    ...conversation,
    senderDetails:
      conversation.senderType === 'admin'
        ? adminSenderMap.get(getObjectIdString(conversation.sender)) || null
        : clientSenderMap.get(getObjectIdString(conversation.sender)) || null,
  }));

  return { ticket, conversations: hydratedConversations };
};

export const getTicketDetailForClient = async (ticketId: string, clientId: string) => {
  const { ticket, conversations } = await loadTicketDetail(ticketId);
  ensureTicketBelongsToClient(ticket, clientId);
  return serializeTicketDetail(ticket.toObject(), conversations);
};

export const getTicketDetailForAdmin = async (ticketId: string) => {
  const { ticket, conversations } = await loadTicketDetail(ticketId);
  return serializeTicketDetail(ticket.toObject(), conversations);
};

const addReply = async ({
  ticketId,
  senderId,
  senderType,
  senderName,
  message,
  attachments,
}: {
  ticketId: string;
  senderId: string;
  senderType: 'client' | 'admin';
  senderName: string;
  message: string;
  attachments?: string[];
}) => {
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  ensureTicketReplyAllowed(ticket);

  const cleanMessage = sanitizeMessage(message);
  const cleanAttachments = sanitizeAttachments(attachments);
  const conversation = await Conversation.create({
    ticket: ticket._id,
    sender: toObjectId(senderId, 'sender id'),
    senderType,
    message: cleanMessage,
    attachments: cleanAttachments,
  });

  ticket.conversations.push(conversation._id);
  ticket.conversationCount = (ticket.conversationCount || 0) + 1;
  ticket.latestMessagePreview = buildMessagePreview(cleanMessage);
  ticket.lastMessageAt = conversation.createdAt;
  ticket.lastMessageBy = buildActor({
    actorType: senderType,
    actorId: senderId,
    actorName: senderName,
  });

  const normalizedStatus = normalizeStatus(ticket.status);
  if (senderType === 'client' && normalizedStatus === 'resolved') {
    ticket.status = 'open';
    ticket.closedAt = null;
    ticket.closedBy = null;
    ticket.resolvedAt = null;
  }

  if (senderType === 'admin') {
    if (!ticket.firstResponseAt) {
      ticket.firstResponseAt = conversation.createdAt;
    }
    if (normalizedStatus === 'open') {
      ticket.status = 'in_progress';
    }
  }

  await ticket.save();
  await logTicketEvent(ticket._id, {
    action: 'replied',
    actor: {
      actorType: senderType,
      actorId: senderId,
      actorName: senderName,
    },
    message:
      senderType === 'admin'
        ? 'Support reply added'
        : 'Customer reply added',
  });

  return { ticket, conversation };
};

export const addClientReply = async (
  ticketId: string,
  clientId: string,
  message: string,
  attachments?: string[],
) => {
  const client = await ClientUser.findById(clientId).lean();
  if (!client) {
    throw new AppError('Client user not found', 404);
  }

  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }
  ensureTicketBelongsToClient(ticket, clientId);

  await addReply({
    ticketId,
    senderId: clientId,
    senderType: 'client',
    senderName: getClientDisplayName(client),
    message,
    attachments,
  });

  return getTicketDetailForClient(ticketId, clientId);
};

export const addAdminReply = async (
  ticketId: string,
  adminId: string,
  message: string,
  attachments?: string[],
) => {
  const admin = await AdminUser.findById(adminId).lean();
  if (!admin) {
    throw new AppError('Admin user not found', 404);
  }

  const { ticket, conversation } = await addReply({
    ticketId,
    senderId: adminId,
    senderType: 'admin',
    senderName: getAdminDisplayName(admin),
    message,
    attachments,
  });

  const client = await ClientUser.findById(ticket.createdBy).lean();
  if (client) {
    await sendTicketResponseEmail(client, ticket, conversation);
  }

  return getTicketDetailForAdmin(ticketId);
};

export const listAdminTickets = async (params: TicketListParams) => {
  const filter = buildTicketSearchFilter(params, false);
  const skip = (params.page - 1) * params.limit;
  const sort = buildListSort(params.sort);

  const [items, total] = await Promise.all([
    SupportTicket.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(params.limit)
      .lean(),
    SupportTicket.countDocuments(filter),
  ]);

  return {
    items: items.map(serializeTicketSummary),
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
    hasNextPage: skip + items.length < total,
  };
};

export const assignTicketToAdmin = async (
  ticketId: string,
  assignedTo: string | null,
  actorAdminId: string,
) => {
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  const actor = await AdminUser.findById(actorAdminId).lean();
  if (!actor) {
    throw new AppError('Admin user not found', 404);
  }

  if (assignedTo) {
    const assignee = await AdminUser.findById(assignedTo).lean();
    if (!assignee || assignee.active === false) {
      throw new AppError('Assigned admin not found', 404);
    }

    const allowedRoles = new Set(['SuperAdmin', 'Manager', 'Supervisor']);
    if (!allowedRoles.has(assignee.role)) {
      throw new AppError(
        'Only SuperAdmin, Manager, or Supervisor users can be assigned support tickets.',
        400,
      );
    }

    ticket.assignedTo = assignee._id as any;
    if (normalizeStatus(ticket.status) === 'open') {
      ticket.status = 'in_progress';
    }
    await ticket.save();

    await logTicketEvent(ticket._id, {
      action: 'assigned',
      actor: {
        actorType: 'admin',
        actorId: actor._id,
        actorName: getAdminDisplayName(actor),
      },
      message: `Assigned to ${getAdminDisplayName(assignee)}`,
    });

    await sendTicketAssignmentEmail(
      assignee,
      ticket,
      getAdminDisplayName(actor),
    );
  } else {
    ticket.assignedTo = null;
    await ticket.save();

    await logTicketEvent(ticket._id, {
      action: 'unassigned',
      actor: {
        actorType: 'admin',
        actorId: actor._id,
        actorName: getAdminDisplayName(actor),
      },
      message: 'Ticket unassigned',
    });
  }

  return getTicketDetailForAdmin(ticketId);
};

const applyStatusTransition = async (
  ticketId: string,
  nextStatusInput: string,
  actorAdminId: string,
  reason?: string,
) => {
  const nextStatus = normalizeStatus(nextStatusInput);
  if (!nextStatus) {
    throw new AppError('Invalid status', 400);
  }

  const actor = await AdminUser.findById(actorAdminId).lean();
  if (!actor) {
    throw new AppError('Admin user not found', 404);
  }

  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  const currentStatus = normalizeStatus(ticket.status) || 'open';
  if (currentStatus === nextStatus) {
    throw new AppError(`Ticket is already ${nextStatus}`, 400);
  }

  if (currentStatus === 'closed' && nextStatus !== 'open') {
    throw new AppError('Closed tickets can only be reopened to open.', 400);
  }

  if (currentStatus === 'resolved' && nextStatus === 'in_progress') {
    throw new AppError('Resolved tickets should be reopened before progressing.', 400);
  }

  ticket.status = nextStatus;

  if (nextStatus === 'resolved') {
    ticket.resolvedAt = new Date();
    ticket.closedAt = null;
    ticket.closedBy = null;
  } else if (nextStatus === 'closed') {
    ticket.closedAt = new Date();
    ticket.closedBy = buildActor({
      actorType: 'admin',
      actorId: actor._id,
      actorName: getAdminDisplayName(actor),
    });
  } else if (nextStatus === 'open') {
    ticket.closedAt = null;
    ticket.closedBy = null;
    ticket.resolvedAt = null;
  }

  await ticket.save();

  const action =
    nextStatus === 'closed'
      ? 'closed'
      : currentStatus === 'closed' && nextStatus === 'open'
        ? 'reopened'
        : 'status_changed';

  await logTicketEvent(ticket._id, {
    action,
    actor: {
      actorType: 'admin',
      actorId: actor._id,
      actorName: getAdminDisplayName(actor),
    },
    message: reason || `Status changed from ${currentStatus} to ${nextStatus}`,
  });

  const client = await ClientUser.findById(ticket.createdBy).lean();
  if (client && nextStatus === 'closed') {
    await sendTicketClosedEmail(client, ticket);
  }

  return getTicketDetailForAdmin(ticketId);
};

export const updateAdminTicketStatus = async (
  ticketId: string,
  nextStatusInput: string,
  actorAdminId: string,
) => applyStatusTransition(ticketId, nextStatusInput, actorAdminId);

export const closeTicketByAdmin = async (ticketId: string, actorAdminId: string) =>
  applyStatusTransition(ticketId, 'closed', actorAdminId, 'Ticket closed by support');

export const reopenTicketByAdmin = async (ticketId: string, actorAdminId: string) =>
  applyStatusTransition(ticketId, 'open', actorAdminId, 'Ticket reopened by support');

export const reopenTicketByClient = async (ticketId: string, clientId: string) => {
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }
  ensureTicketBelongsToClient(ticket, clientId);

  const currentStatus = normalizeStatus(ticket.status);
  if (!currentStatus || !['resolved', 'closed'].includes(currentStatus)) {
    throw new AppError('Only resolved or closed tickets can be reopened.', 400);
  }

  const client = await ClientUser.findById(clientId).lean();
  if (!client) {
    throw new AppError('Client user not found', 404);
  }

  ticket.status = 'open';
  ticket.closedAt = null;
  ticket.closedBy = null;
  ticket.resolvedAt = null;
  await ticket.save();

  await logTicketEvent(ticket._id, {
    action: 'reopened',
    actor: {
      actorType: 'client',
      actorId: client._id,
      actorName: getClientDisplayName(client),
    },
    message: 'Customer reopened the ticket',
  });

  return getTicketDetailForClient(ticketId, clientId);
};

export const autoCloseInactiveTickets = async (inactiveDays: number) => {
  const threshold = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

  const tickets = await SupportTicket.find({
    status: { $nin: ['closed'] },
    lastMessageAt: { $lt: threshold },
  }).populate('createdBy', 'firstName lastName email');

  for (const ticket of tickets) {
    ticket.status = 'closed';
    ticket.closedAt = new Date();
    ticket.closedBy = buildActor({
      actorType: 'system',
      actorName: 'Automation',
    });
    await ticket.save();

    await logTicketEvent(ticket._id, {
      action: 'auto_closed',
      actor: {
        actorType: 'system',
        actorName: 'Automation',
      },
      message: `Ticket auto-closed after ${inactiveDays} inactive days`,
    });

    if (ticket.createdBy) {
      await sendTicketClosedEmail(ticket.createdBy, ticket);
    }
  }

  return tickets.length;
};


