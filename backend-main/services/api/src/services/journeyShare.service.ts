import crypto from 'crypto';
import ClientFriendRequest from '../model/client/clientFriendRequest.model';
import ClientInvite from '../model/client/clientInvite.model';
import ClientUser from '../model/client/clientuser.model';
import JourneyShare from '../model/client/journeyShare.model';
import SocialMessage from '../model/client/socialMessage.model';
import SocialThread from '../model/client/socialThread.model';
import { Email } from '../utils/email';

const DEFAULT_INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export const normalizeEmail = (value?: string | null) =>
  String(value || '').trim().toLowerCase();

export const createInviteToken = () => crypto.randomBytes(32).toString('hex');

export const hashInviteToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const buildClientUrl = (path: string) => {
  const baseUrl =
    process.env.CLIENT_FRONTEND_URL ||
    process.env.CLIENT ||
    process.env.REACT_APP_FRONTEND_URL ||
    '';

  return baseUrl
    ? `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
    : path;
};

export const findOrCreateSocialThread = async (
  userAId: string,
  userBId: string,
  createdByUserId: string
) => {
  const sortedIds = [userAId, userBId].sort();
  let thread = await SocialThread.findOne({
    participantIds: { $all: sortedIds, $size: 2 },
  });

  if (!thread) {
    thread = await SocialThread.create({
      participantIds: sortedIds,
      createdByUserId,
    });
  }

  return thread;
};

export const sendSocialMessage = async (params: {
  senderUserId: string;
  recipientUserId: string;
  content: string;
  messageType?: 'text' | 'journey_share';
  metadata?: { journeyId?: string; sharedJourneyUrl?: string };
}) => {
  const thread = await findOrCreateSocialThread(
    params.senderUserId,
    params.recipientUserId,
    params.senderUserId
  );

  const message = await SocialMessage.create({
    threadId: thread._id,
    senderUserId: params.senderUserId,
    recipientUserId: params.recipientUserId,
    content: params.content,
    messageType: params.messageType || 'text',
    metadata: params.metadata || {},
  });

  thread.lastMessageAt = message.sentAt;
  thread.lastMessagePreview = params.content.slice(0, 180);
  await thread.save();

  return { thread, message };
};

export const serializeRelationshipState = (
  currentUserId: string,
  targetUserId: string,
  friends: string[],
  incomingRequest?: { _id: string; status: string } | null,
  outgoingRequest?: { _id: string; status: string } | null
) => {
  if (currentUserId === targetUserId) return 'self';
  if (friends.includes(targetUserId)) return 'friend';
  if (incomingRequest?.status === 'pending') return 'incoming_request';
  if (outgoingRequest?.status === 'pending') return 'outgoing_request';
  return 'none';
};

export const sendInviteEmail = async (
  inviter: { email: string; firstName?: string },
  inviteeEmail: string,
  inviteToken: string
) => {
  const url = buildClientUrl(`/signup?invite=${encodeURIComponent(inviteToken)}`);
  await new Email(
    { email: inviteeEmail, firstName: 'Traveler' },
    url
  ).sendJourneyInvite(inviter.firstName || 'A friend', inviter.email);
};

export const sendJourneySharedEmail = async (
  recipient: { email: string; firstName?: string },
  sharer: { email: string; firstName?: string },
  journeyId: string
) => {
  const url = buildClientUrl(`/journey/${encodeURIComponent(journeyId)}`);
  await new Email(recipient, url).sendJourneyShared(
    sharer.firstName || 'Your friend',
    sharer.email,
    journeyId
  );
};

export const sendFriendAcceptedEmail = async (
  recipient: { email: string; firstName?: string },
  friend: { email: string; firstName?: string }
) => {
  const url = buildClientUrl('/journey');
  await new Email(recipient, url).sendFriendAccepted(
    friend.firstName || 'A traveler',
    friend.email
  );
};

export const ensureFriendshipBidirectional = async (
  requesterUserId: string,
  recipientUserId: string
) => {
  await Promise.all([
    ClientUser.findByIdAndUpdate(requesterUserId, {
      $addToSet: { friends: recipientUserId },
    }),
    ClientUser.findByIdAndUpdate(recipientUserId, {
      $addToSet: { friends: requesterUserId },
    }),
  ]);
};

export const removeFriendshipBidirectional = async (
  requesterUserId: string,
  recipientUserId: string
) => {
  await Promise.all([
    ClientUser.findByIdAndUpdate(requesterUserId, {
      $pull: { friends: recipientUserId },
    }),
    ClientUser.findByIdAndUpdate(recipientUserId, {
      $pull: { friends: requesterUserId },
    }),
  ]);
};

export const activateJourneySharesForFriends = async (
  requesterUserId: string,
  recipientUserId: string
) => {
  const [requester, recipient] = await Promise.all([
    ClientUser.findById(requesterUserId),
    ClientUser.findById(recipientUserId),
  ]);

  if (!requester || !recipient) return;

  const activeShares = await JourneyShare.find({
    status: 'pending_friendship',
    $or: [
      {
        ownerUserId: requester._id,
        recipientUserId: recipient._id,
      },
      {
        ownerUserId: recipient._id,
        recipientUserId: requester._id,
      },
      {
        ownerUserId: requester._id,
        recipientEmail: normalizeEmail(recipient.email),
      },
      {
        ownerUserId: recipient._id,
        recipientEmail: normalizeEmail(requester.email),
      },
    ],
  });

  for (const share of activeShares) {
    const recipientUser =
      String(share.ownerUserId) === String(requester._id) ? recipient : requester;
    const sharer =
      String(share.ownerUserId) === String(requester._id) ? requester : recipient;

    share.status = 'active';
    share.recipientUserId = recipientUser._id;
    share.recipientEmail = normalizeEmail(recipientUser.email);
    share.activatedAt = new Date();
    await share.save();

    await sendSocialMessage({
      senderUserId: String(sharer._id),
      recipientUserId: String(recipientUser._id),
      content: `${sharer.firstName || 'Your friend'} shared journey ${share.journeyId} with you.`,
      messageType: 'journey_share',
      metadata: {
        journeyId: share.journeyId,
        sharedJourneyUrl: buildClientUrl(`/journey/${encodeURIComponent(share.journeyId)}`),
      },
    });

    await sendJourneySharedEmail(
      { email: recipientUser.email, firstName: recipientUser.firstName },
      { email: sharer.email, firstName: sharer.firstName },
      share.journeyId
    );
  }
};

export const resolveInviteForUser = async (
  userId: string,
  inviteToken?: string | null
) => {
  const token = String(inviteToken || '').trim();
  if (!token) return null;

  const tokenHash = hashInviteToken(token);
  const invite = await ClientInvite.findOne({
    tokenHash,
    status: 'pending_signup',
    expiresAt: { $gt: new Date() },
  });

  if (!invite) return null;

  const [inviter, invitee] = await Promise.all([
    ClientUser.findById(invite.inviterUserId),
    ClientUser.findById(userId),
  ]);

  if (!inviter || !invitee) return null;

  invite.status = 'resolved';
  invite.resolvedUserId = invitee._id;
  await invite.save();

  let friendRequest = await ClientFriendRequest.findOne({
    requesterUserId: inviter._id,
    recipientUserId: invitee._id,
  });

  if (!friendRequest) {
    friendRequest = await ClientFriendRequest.create({
      requesterUserId: inviter._id,
      recipientUserId: invitee._id,
      requesterEmail: normalizeEmail(inviter.email),
      recipientEmail: normalizeEmail(invitee.email),
      status: 'pending',
    });
  } else if (friendRequest.status !== 'accepted') {
    friendRequest.status = 'pending';
    friendRequest.respondedAt = null;
    await friendRequest.save();
  }

  await JourneyShare.updateMany(
    {
      inviteId: invite._id,
      recipientEmail: normalizeEmail(invitee.email),
      status: 'pending_signup',
    },
    {
      $set: {
        recipientUserId: invitee._id,
        status: 'pending_friendship',
        friendRequestId: friendRequest._id,
      },
    }
  );

  return { invite, friendRequest };
};

export const getJourneyShareViewerAccess = async (
  journeyId: string,
  userId: string
) => {
  const activeShare = await JourneyShare.findOne({
    journeyId,
    recipientUserId: userId,
    status: 'active',
  });

  return activeShare;
};

export const expireInviteIfNeeded = async (invite: any) => {
  if (!invite) return invite;
  if (invite.status === 'pending_signup' && invite.expiresAt <= new Date()) {
    invite.status = 'expired';
    await invite.save();
  }
  return invite;
};

export const getInviteExpiryDate = () =>
  new Date(Date.now() + DEFAULT_INVITE_EXPIRY_MS);
