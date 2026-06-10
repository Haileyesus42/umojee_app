import mongoose from 'mongoose';
import { Response } from 'express';
import ClientFriendRequest from '../../model/client/clientFriendRequest.model';
import ClientInvite from '../../model/client/clientInvite.model';
import ClientUser from '../../model/client/clientuser.model';
import JourneyShare from '../../model/client/journeyShare.model';
import SocialMessage from '../../model/client/socialMessage.model';
import SocialThread from '../../model/client/socialThread.model';
import { RequestWithUser } from '../../types';
import {
  activateJourneySharesForFriends,
  buildClientUrl,
  createInviteToken,
  ensureFriendshipBidirectional,
  getInviteExpiryDate,
  getJourneyShareViewerAccess,
  hashInviteToken,
  normalizeEmail,
  removeFriendshipBidirectional,
  resolveInviteForUser,
  sendFriendAcceptedEmail,
  sendInviteEmail,
  sendJourneySharedEmail,
  sendSocialMessage,
  serializeRelationshipState,
} from '../../services/journeyShare.service';
import { sanitizeClientUserResponse } from '../../utils/travelDocumentEncryption';
import { createClientNotification } from '../../services/clientNotification.service';

const AI_BASE =
  process.env.AI_BACKEND_URL ||
  process.env.REACT_APP_AI_BACKEND_URL ||
  'http://localhost:8000';

const buildAiJourneyUrl = (journeyId: string) =>
  `${AI_BASE.replace(/\/$/, '')}/api/ai/journey/${encodeURIComponent(journeyId)}`;

async function fetchJourneyFromAi(journeyId: string) {
  const response = await fetch(buildAiJourneyUrl(journeyId), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json().catch(() => null);
  const journey = data?.journey || data?.data || data;
  if (!journey?.journey_id) return null;
  return journey;
}

async function getCurrentUserOr404(userId: string) {
  return ClientUser.findById(userId).select('+pendingInviteToken');
}

function toRelationshipSummary(user: any) {
  if (!user) {
    return null;
  }

  return {
    _id: String(user._id),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    photo: user.photo || null,
  };
}

function getUserDisplayName(user: any) {
  if (!user) return 'Traveler';
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Traveler';
}

function getJourneyPreviewImage(journey: any): string {
  const bookedFlights = Array.isArray(journey?.booked_flights) ? journey.booked_flights : [];
  const savedFlights = Array.isArray(journey?.saved_flights) ? journey.saved_flights : [];
  const flight = bookedFlights[0] || savedFlights[0] || null;
  if (!flight || typeof flight !== 'object') return '';

  const directImage =
    flight.imageUrl ||
    flight.image_url ||
    flight.airline_image ||
    flight.airline_logo ||
    (Array.isArray(flight.imageUrls) ? flight.imageUrls[0] : undefined) ||
    (Array.isArray(flight.image_urls) ? flight.image_urls[0] : undefined);

  return typeof directImage === 'string' ? directImage : '';
}

async function buildRelationshipMaps(userId: string) {
  const requests = await ClientFriendRequest.find({
    $or: [{ requesterUserId: userId }, { recipientUserId: userId }],
  });

  const incoming = new Map<string, any>();
  const outgoing = new Map<string, any>();

  for (const request of requests) {
    if (String(request.requesterUserId) === String(userId)) {
      outgoing.set(String(request.recipientUserId), request);
    }
    if (String(request.recipientUserId) === String(userId)) {
      incoming.set(String(request.requesterUserId), request);
    }
  }

  return { incoming, outgoing };
}

export const searchSocialUsers = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const userId = String(req.userId || '');
    const currentUser = await getCurrentUserOr404(userId);
    if (!currentUser) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.status(200).json({ status: 'success', data: [] });
    }

    const matcher = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await ClientUser.find({
      _id: { $ne: currentUser._id },
      $or: [{ email: matcher }, { firstName: matcher }, { lastName: matcher }],
    })
      .limit(15)
      .select('email firstName lastName photo friends');

    const { incoming, outgoing } = await buildRelationshipMaps(userId);
    const friends = (currentUser.friends || []).map((id: any) => String(id));

    const results = users.map((user) => ({
      ...toRelationshipSummary(user),
      relationshipState: serializeRelationshipState(
        userId,
        String(user._id),
        friends,
        incoming.get(String(user._id)),
        outgoing.get(String(user._id))
      ),
    }));

    const normalizedQuery = normalizeEmail(query);
    const exactUserExists = results.some(
      (item) => normalizeEmail(item.email) === normalizedQuery
    );

    return res.status(200).json({
      status: 'success',
      data: results,
      meta: {
        query,
        exactUserExists,
        normalizedEmail: normalizedQuery,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const listFriends = async (req: RequestWithUser, res: Response) => {
  try {
    const user = await ClientUser.findById(req.userId)
      .populate('friends', 'email firstName lastName photo')
      .lean();
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const query = String(req.query.q || '').trim().toLowerCase();
    const friends = Array.isArray(user.friends) ? user.friends : [];
    const filtered = friends.filter((friend: any) => {
      if (!query) return true;
      return [friend.email, friend.firstName, friend.lastName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });

    return res.status(200).json({
      status: 'success',
      data: filtered.map((friend: any) => ({
        ...toRelationshipSummary(friend),
        relationshipState: 'friend',
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const listFriendRequests = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const userId = String(req.userId || '');
    const [incoming, outgoing] = await Promise.all([
      ClientFriendRequest.find({ recipientUserId: userId }).sort({ createdAt: -1 }),
      ClientFriendRequest.find({ requesterUserId: userId }).sort({ createdAt: -1 }),
    ]);

    const userIds = new Set<string>();
    incoming.forEach((request) => userIds.add(String(request.requesterUserId)));
    outgoing.forEach((request) => userIds.add(String(request.recipientUserId)));

    const users = await ClientUser.find({ _id: { $in: Array.from(userIds) } })
      .select('email firstName lastName photo')
      .lean();
    const userMap = new Map(users.map((user: any) => [String(user._id), user]));

    const serializeRequest = (request: any, direction: 'incoming' | 'outgoing') => {
      const counterpartyId =
        direction === 'incoming'
          ? String(request.requesterUserId)
          : String(request.recipientUserId);
      const counterparty = userMap.get(counterpartyId);
      return {
        _id: String(request._id),
        status: request.status,
        direction,
        respondedAt: request.respondedAt || null,
        createdAt: request.createdAt,
        user: counterparty ? toRelationshipSummary(counterparty) : null,
      };
    };

    return res.status(200).json({
      status: 'success',
      data: {
        incoming: incoming.map((request) => serializeRequest(request, 'incoming')),
        outgoing: outgoing.map((request) => serializeRequest(request, 'outgoing')),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const sendFriendRequest = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const requester = await ClientUser.findById(req.userId);
    if (!requester) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const targetUserId = String(req.body.recipientUserId || '').trim();
    const targetEmail = normalizeEmail(req.body.email);

    const recipient = targetUserId
      ? await ClientUser.findById(targetUserId)
      : targetEmail
        ? await ClientUser.findOne({ email: targetEmail })
        : null;

    if (!recipient) {
      return res.status(404).json({ status: 'fail', message: 'Recipient not found' });
    }

    if (String(recipient._id) === String(requester._id)) {
      return res.status(400).json({ status: 'fail', message: 'You cannot friend yourself' });
    }

    const requesterFriends = (requester.friends || []).map((id: any) => String(id));
    if (requesterFriends.includes(String(recipient._id))) {
      return res.status(200).json({
        status: 'success',
        message: 'Users are already friends',
        data: { relationshipState: 'friend' },
      });
    }

    const reverse = await ClientFriendRequest.findOne({
      requesterUserId: recipient._id,
      recipientUserId: requester._id,
    });

    if (reverse?.status === 'pending') {
      return res.status(200).json({
        status: 'success',
        message: 'Recipient has already sent you a friend request',
        data: { relationshipState: 'incoming_request', requestId: String(reverse._id) },
      });
    }

    let requestDoc = await ClientFriendRequest.findOne({
      requesterUserId: requester._id,
      recipientUserId: recipient._id,
    });

    if (!requestDoc) {
      requestDoc = await ClientFriendRequest.create({
        requesterUserId: requester._id,
        recipientUserId: recipient._id,
        requesterEmail: normalizeEmail(requester.email),
        recipientEmail: normalizeEmail(recipient.email),
        status: 'pending',
      });
    } else {
      requestDoc.status = 'pending';
      requestDoc.respondedAt = null;
      await requestDoc.save();
    }

    await createClientNotification({
      notifierId: String(requester._id),
      notifiedUserIds: [String(recipient._id)],
      title: 'Friend request',
      message: `${getUserDisplayName(requester)} sent you a friend request.`,
      route: '/communities',
      type: 'friend_request_received',
      actor: {
        userId: String(requester._id),
        name: getUserDisplayName(requester),
        photo: requester.photo || null,
      },
      metadata: {
        requestId: String(requestDoc._id),
      },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Friend request sent',
      data: {
        requestId: String(requestDoc._id),
        relationshipState: 'outgoing_request',
      },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const acceptFriendRequest = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const requestDoc = await ClientFriendRequest.findById(req.params.id);
    if (!requestDoc) {
      return res.status(404).json({ status: 'fail', message: 'Request not found' });
    }

    if (String(requestDoc.recipientUserId) !== String(req.userId)) {
      return res.status(403).json({ status: 'fail', message: 'Not allowed' });
    }

    requestDoc.status = 'accepted';
    requestDoc.respondedAt = new Date();
    await requestDoc.save();

    await ensureFriendshipBidirectional(
      String(requestDoc.requesterUserId),
      String(requestDoc.recipientUserId)
    );

    await activateJourneySharesForFriends(
      String(requestDoc.requesterUserId),
      String(requestDoc.recipientUserId)
    );

    const [requester, recipient] = await Promise.all([
      ClientUser.findById(requestDoc.requesterUserId),
      ClientUser.findById(requestDoc.recipientUserId),
    ]);

    if (requester && recipient) {
      await sendFriendAcceptedEmail(
        { email: requester.email, firstName: requester.firstName },
        { email: recipient.email, firstName: recipient.firstName }
      );

      await createClientNotification({
        notifierId: String(recipient._id),
        notifiedUserIds: [String(requester._id)],
        title: 'Friend accepted',
        message: `${getUserDisplayName(recipient)} accepted your friend request.`,
        route: '/communities',
        type: 'friend_request_accepted',
        actor: {
          userId: String(recipient._id),
          name: getUserDisplayName(recipient),
          photo: recipient.photo || null,
        },
        metadata: {
          requestId: String(requestDoc._id),
        },
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Friend request accepted',
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const declineFriendRequest = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const requestDoc = await ClientFriendRequest.findById(req.params.id);
    if (!requestDoc) {
      return res.status(404).json({ status: 'fail', message: 'Request not found' });
    }

    const isRecipient = String(requestDoc.recipientUserId) === String(req.userId);
    const isRequester = String(requestDoc.requesterUserId) === String(req.userId);

    if (!isRecipient && !isRequester) {
      return res.status(403).json({ status: 'fail', message: 'Not allowed' });
    }

    requestDoc.status = isRecipient ? 'declined' : 'cancelled';
    requestDoc.respondedAt = new Date();
    await requestDoc.save();

    return res.status(200).json({
      status: 'success',
      message: isRecipient ? 'Friend request declined' : 'Friend request cancelled',
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const unfriendUser = async (req: RequestWithUser, res: Response) => {
  try {
    const friendUserId = String(req.params.friendUserId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(friendUserId)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid friend id' });
    }

    await removeFriendshipBidirectional(String(req.userId), friendUserId);

    return res.status(200).json({
      status: 'success',
      message: 'Friend removed',
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const createJourneyShares = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const owner = await ClientUser.findById(req.userId);
    if (!owner) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const journeyId = String(req.body.journeyId || '').trim();
    const recipients = Array.isArray(req.body.recipients) ? req.body.recipients : [];
    if (!journeyId || recipients.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'journeyId and recipients are required',
      });
    }

    const friendIds = (owner.friends || []).map((id: any) => String(id));
    const results: any[] = [];
    const journey = await fetchJourneyFromAi(journeyId).catch(() => null);
    const journeyImageUrl = getJourneyPreviewImage(journey);

    for (const recipientInput of recipients) {
      const normalizedRecipientEmail = normalizeEmail(recipientInput?.email);
      const targetUser = recipientInput?.userId
        ? await ClientUser.findById(recipientInput.userId)
        : normalizedRecipientEmail
          ? await ClientUser.findOne({ email: normalizedRecipientEmail })
          : null;

      if (targetUser && String(targetUser._id) === String(owner._id)) {
        results.push({
          email: targetUser.email,
          status: 'skipped',
          reason: 'cannot_share_with_self',
        });
        continue;
      }

      const recipientEmail = targetUser?.email || normalizedRecipientEmail;
      if (!recipientEmail) {
        results.push({ status: 'skipped', reason: 'missing_email' });
        continue;
      }

      let share = await JourneyShare.findOne({
        journeyId,
        ownerUserId: owner._id,
        recipientEmail: normalizeEmail(recipientEmail),
      });

      if (targetUser && friendIds.includes(String(targetUser._id))) {
        if (!share) {
          share = await JourneyShare.create({
            journeyId,
            ownerUserId: owner._id,
            ownerEmail: normalizeEmail(owner.email),
            recipientUserId: targetUser._id,
            recipientEmail: normalizeEmail(targetUser.email),
            status: 'active',
            activatedAt: new Date(),
          });
        } else {
          share.recipientUserId = targetUser._id;
          share.status = 'active';
          share.activatedAt = new Date();
          share.revokedAt = null;
          await share.save();
        }

        await sendJourneySharedEmail(
          { email: targetUser.email, firstName: targetUser.firstName },
          { email: owner.email, firstName: owner.firstName },
          journeyId
        );
        await sendSocialMessage({
          senderUserId: String(owner._id),
          recipientUserId: String(targetUser._id),
          content: `${owner.firstName || 'Your friend'} shared journey ${journeyId} with you.`,
          messageType: 'journey_share',
          metadata: {
            journeyId,
            sharedJourneyUrl: buildClientUrl(`/journey/${encodeURIComponent(journeyId)}`),
          },
        });

        await createClientNotification({
          notifierId: String(owner._id),
          notifiedUserIds: [String(targetUser._id)],
          title: 'Journey shared',
          message: `${getUserDisplayName(owner)} shared a live journey with you.`,
          route: `/journey/${encodeURIComponent(journeyId)}`,
          type: 'journey_shared',
          journeyId,
          imageUrl: journeyImageUrl,
          actor: {
            userId: String(owner._id),
            name: getUserDisplayName(owner),
            photo: owner.photo || null,
          },
          metadata: {
            shareId: String(share._id),
          },
        });

        results.push({
          shareId: String(share._id),
          email: targetUser.email,
          status: 'active',
          reason: 'shared_with_friend',
        });
        continue;
      }

      if (targetUser) {
        let requestDoc = await ClientFriendRequest.findOne({
          requesterUserId: owner._id,
          recipientUserId: targetUser._id,
        });

        if (!requestDoc) {
          requestDoc = await ClientFriendRequest.create({
            requesterUserId: owner._id,
            recipientUserId: targetUser._id,
            requesterEmail: normalizeEmail(owner.email),
            recipientEmail: normalizeEmail(targetUser.email),
            status: 'pending',
          });
        } else if (requestDoc.status !== 'accepted') {
          requestDoc.status = 'pending';
          requestDoc.respondedAt = null;
          await requestDoc.save();
        }

        if (!share) {
          share = await JourneyShare.create({
            journeyId,
            ownerUserId: owner._id,
            ownerEmail: normalizeEmail(owner.email),
            recipientUserId: targetUser._id,
            recipientEmail: normalizeEmail(targetUser.email),
            status: 'pending_friendship',
            friendRequestId: requestDoc._id,
          });
        } else {
          share.recipientUserId = targetUser._id;
          share.status = 'pending_friendship';
          share.friendRequestId = requestDoc._id;
          share.revokedAt = null;
          await share.save();
        }

        results.push({
          shareId: String(share._id),
          email: targetUser.email,
          status: 'pending_friendship',
          reason: 'friend_request_required',
        });
        continue;
      }

      const inviteToken = createInviteToken();
      const inviteTokenHash = hashInviteToken(inviteToken);

      let invite = await ClientInvite.findOne({
        inviterUserId: owner._id,
        inviteeEmail: normalizeEmail(recipientEmail),
        status: 'pending_signup',
      });

      if (!invite) {
        invite = await ClientInvite.create({
          inviterUserId: owner._id,
          inviterEmail: normalizeEmail(owner.email),
          inviteeEmail: normalizeEmail(recipientEmail),
          tokenHash: inviteTokenHash,
          status: 'pending_signup',
          expiresAt: getInviteExpiryDate(),
          lastSentAt: new Date(),
        });
      } else {
        invite.tokenHash = inviteTokenHash;
        invite.expiresAt = getInviteExpiryDate();
        invite.lastSentAt = new Date();
        await invite.save();
      }

      if (!share) {
        share = await JourneyShare.create({
          journeyId,
          ownerUserId: owner._id,
          ownerEmail: normalizeEmail(owner.email),
          recipientEmail: normalizeEmail(recipientEmail),
          status: 'pending_signup',
          inviteId: invite._id,
        });
      } else {
        share.status = 'pending_signup';
        share.recipientEmail = normalizeEmail(recipientEmail);
        share.inviteId = invite._id;
        share.recipientUserId = null;
        share.friendRequestId = null;
        share.revokedAt = null;
        await share.save();
      }

      await sendInviteEmail(
        { email: owner.email, firstName: owner.firstName },
        recipientEmail,
        inviteToken
      );

      results.push({
        shareId: String(share._id),
        email: recipientEmail,
        status: 'pending_signup',
        reason: 'invite_sent',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: results,
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const listOwnedJourneyShares = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const watchingThreshold = Date.now() - 35_000;
    const shares = await JourneyShare.find({ ownerUserId: req.userId })
      .populate('recipientUserId', 'email firstName lastName photo')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      status: 'success',
      data: shares.map((share: any) => ({
        ...share,
        _id: String(share._id),
        ownerUserId: String(share.ownerUserId),
        isWatching:
          share.status === 'active' &&
          share.lastViewedAt &&
          new Date(share.lastViewedAt).getTime() >= watchingThreshold,
        recipientUserId: share.recipientUserId
          ? toRelationshipSummary(share.recipientUserId)
          : null,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const listReceivedJourneyShares = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const shares = await JourneyShare.find({
      recipientUserId: req.userId,
      status: 'active',
    })
      .populate('ownerUserId', 'email firstName lastName photo')
      .sort({ activatedAt: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      status: 'success',
      data: shares.map((share: any) => ({
        ...share,
        _id: String(share._id),
        ownerUser: share.ownerUserId ? toRelationshipSummary(share.ownerUserId) : null,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const revokeJourneyShare = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const share = await JourneyShare.findOne({
      _id: req.params.shareId,
      ownerUserId: req.userId,
    });
    if (!share) {
      return res.status(404).json({ status: 'fail', message: 'Share not found' });
    }

    share.status = 'revoked';
    share.revokedAt = new Date();
    share.lastViewedAt = null;
    await share.save();

    return res.status(200).json({ status: 'success', message: 'Share revoked' });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const getJourneyShareAccess = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const user = await ClientUser.findById(req.userId);
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const journeyId = String(req.params.journeyId || '').trim();
    const journey = await fetchJourneyFromAi(journeyId);
    if (!journey) {
      return res.status(404).json({ status: 'fail', message: 'Journey not found' });
    }

    const ownerUserId = String(journey.user_id || journey.userId || '');
    if (ownerUserId && ownerUserId === String(user._id)) {
      return res.status(200).json({
        status: 'success',
        data: {
          accessMode: 'owner',
          journey,
          sharer: sanitizeClientUserResponse(user),
        },
      });
    }

    const share = await getJourneyShareViewerAccess(journeyId, String(user._id));
    if (!share) {
      return res.status(403).json({ status: 'fail', message: 'Journey access denied' });
    }

    const owner = await ClientUser.findById(share.ownerUserId);
    await JourneyShare.updateOne(
      { _id: share._id },
      { $set: { lastViewedAt: new Date() } }
    );

    return res.status(200).json({
      status: 'success',
      data: {
        accessMode: 'shared_viewer',
        journey,
        shareId: String(share._id),
        sharer: owner ? toRelationshipSummary(owner) : null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const discoverSocialUsers = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const currentUser = await ClientUser.findById(req.userId).lean();
    if (!currentUser) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const requestedCountry = String(req.query.country || '').trim();
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '5'), 10) || 5, 1), 5);
    const country =
      requestedCountry ||
      String(currentUser.country || currentUser.homeLocation?.country || '').trim();

    const filter: Record<string, any> = {
      _id: { $ne: currentUser._id },
    };
    if (country) {
      filter.$or = [
        { country: new RegExp(`^${country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        { 'homeLocation.country': new RegExp(`^${country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      ];
    }

    const users = await ClientUser.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('email firstName lastName photo country homeLocation')
      .lean();

    const { incoming, outgoing } = await buildRelationshipMaps(String(currentUser._id));
    const friends = Array.isArray(currentUser.friends)
      ? currentUser.friends.map((id: any) => String(id))
      : [];

    return res.status(200).json({
      status: 'success',
      data: users.map((user: any) => ({
        ...toRelationshipSummary(user),
        country: user.country || user.homeLocation?.country || '',
        city: user.homeLocation?.city || '',
        relationshipState: serializeRelationshipState(
          String(currentUser._id),
          String(user._id),
          friends,
          incoming.get(String(user._id)),
          outgoing.get(String(user._id))
        ),
      })),
      meta: { country, limit },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const listSocialMessageThreads = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const threads = await SocialThread.find({
      participantIds: req.userId,
    })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    const participantIds = new Set<string>();
    threads.forEach((thread: any) => {
      (thread.participantIds || []).forEach((participantId: any) => {
        if (String(participantId) !== String(req.userId)) {
          participantIds.add(String(participantId));
        }
      });
    });

    const users = await ClientUser.find({ _id: { $in: Array.from(participantIds) } })
      .select('email firstName lastName photo')
      .lean();
    const userMap = new Map(users.map((user: any) => [String(user._id), user]));

    return res.status(200).json({
      status: 'success',
      data: threads.map((thread: any) => {
        const otherParticipantId = (thread.participantIds || []).find(
          (participantId: any) => String(participantId) !== String(req.userId)
        );
        return {
          id: String(thread._id),
          participant: otherParticipantId ? toRelationshipSummary(userMap.get(String(otherParticipantId))) : null,
          lastMessageAt: thread.lastMessageAt || thread.updatedAt,
          lastMessagePreview: thread.lastMessagePreview || '',
          updatedAt: thread.updatedAt,
        };
      }),
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const getSocialMessageThread = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const thread = await SocialThread.findOne({
      _id: req.params.threadId,
      participantIds: req.userId,
    }).lean();

    if (!thread) {
      return res.status(404).json({ status: 'fail', message: 'Thread not found' });
    }

    const messages = await SocialMessage.find({ threadId: req.params.threadId })
      .sort({ sentAt: 1, createdAt: 1 })
      .lean();

    const participantIds = new Set<string>();
    messages.forEach((message: any) => {
      participantIds.add(String(message.senderUserId));
      participantIds.add(String(message.recipientUserId));
    });

    const users = await ClientUser.find({ _id: { $in: Array.from(participantIds) } })
      .select('email firstName lastName photo')
      .lean();
    const userMap = new Map(users.map((user: any) => [String(user._id), user]));

    return res.status(200).json({
      status: 'success',
      data: {
        id: String(thread._id),
        messages: messages.map((message: any) => ({
          id: String(message._id),
          senderUserId: String(message.senderUserId),
          recipientUserId: String(message.recipientUserId),
          messageType: message.messageType,
          content: message.content,
          metadata: message.metadata || {},
          sentAt: message.sentAt || message.createdAt,
          sender: toRelationshipSummary(userMap.get(String(message.senderUserId))),
          recipient: toRelationshipSummary(userMap.get(String(message.recipientUserId))),
        })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const sendSocialMessageAction = async (
  req: RequestWithUser,
  res: Response
) => {
  try {
    const sender = await ClientUser.findById(req.userId);
    if (!sender) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const recipientUserId = String(req.body.recipientUserId || '').trim();
    const content = String(req.body.content || '').trim();
    const messageType = req.body.messageType === 'journey_share' ? 'journey_share' : 'text';
    const journeyId = String(req.body.journeyId || '').trim();

    if (!mongoose.Types.ObjectId.isValid(recipientUserId) || !content) {
      return res.status(400).json({
        status: 'fail',
        message: 'recipientUserId and content are required',
      });
    }

    const recipient = await ClientUser.findById(recipientUserId);
    if (!recipient) {
      return res.status(404).json({ status: 'fail', message: 'Recipient not found' });
    }

    const { thread, message } = await sendSocialMessage({
      senderUserId: String(sender._id),
      recipientUserId: String(recipient._id),
      content,
      messageType,
      metadata: journeyId
        ? {
            journeyId,
            sharedJourneyUrl: buildClientUrl(`/journey/${encodeURIComponent(journeyId)}`),
          }
        : undefined,
    });

    await createClientNotification({
      notifierId: String(sender._id),
      notifiedUserIds: [String(recipient._id)],
      title: 'New message',
      message: `${getUserDisplayName(sender)}: ${content}`,
      route: '/communities',
      type: 'message_received',
      journeyId: journeyId || undefined,
      actor: {
        userId: String(sender._id),
        name: getUserDisplayName(sender),
        photo: sender.photo || null,
      },
      metadata: {
        threadId: String(thread._id),
        messageId: String(message._id),
        messageType,
      },
    });

    return res.status(201).json({
      status: 'success',
      data: {
        threadId: String(thread._id),
        messageId: String(message._id),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};

export const resolveInviteAfterSignup = async (
  userId: string,
  inviteToken?: string | null
) => resolveInviteForUser(userId, inviteToken);
