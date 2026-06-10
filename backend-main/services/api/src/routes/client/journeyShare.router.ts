import express from 'express';
import { Clientprotect } from '../../controller/client/authController';
import {
  acceptFriendRequest,
  createJourneyShares,
  discoverSocialUsers,
  declineFriendRequest,
  getJourneyShareAccess,
  getSocialMessageThread,
  listFriendRequests,
  listFriends,
  listOwnedJourneyShares,
  listReceivedJourneyShares,
  listSocialMessageThreads,
  revokeJourneyShare,
  searchSocialUsers,
  sendSocialMessageAction,
  sendFriendRequest,
  unfriendUser,
} from '../../controller/client/journeyShare.controller';

const router = express.Router();

router.use(Clientprotect);

router.get('/social/search', searchSocialUsers);
router.get('/social/discover', discoverSocialUsers);
router.get('/social/friends', listFriends);
router.get('/social/friend-requests', listFriendRequests);
router.post('/social/friend-requests', sendFriendRequest);
router.patch('/social/friend-requests/:id/accept', acceptFriendRequest);
router.patch('/social/friend-requests/:id/decline', declineFriendRequest);
router.patch('/social/friend-requests/:id/cancel', declineFriendRequest);
router.delete('/social/friends/:friendUserId', unfriendUser);

router.get('/journey-shares', listOwnedJourneyShares);
router.get('/journey-shares/received', listReceivedJourneyShares);
router.get('/journey-shares/journey/:journeyId/access', getJourneyShareAccess);
router.post('/journey-shares', createJourneyShares);
router.delete('/journey-shares/:shareId', revokeJourneyShare);
router.get('/social/messages/threads', listSocialMessageThreads);
router.get('/social/messages/threads/:threadId', getSocialMessageThread);
router.post('/social/messages', sendSocialMessageAction);

export default router;
