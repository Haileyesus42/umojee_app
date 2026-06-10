import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { URL } from 'url';
import type { IncomingMessage } from 'http';
import ClientUser from '../model/client/clientuser.model';
import JourneyShare from '../model/client/journeyShare.model';
import { RequestWithUser } from '../types';

const AI_BASE =
  process.env.AI_BACKEND_URL ||
  process.env.REACT_APP_AI_BACKEND_URL ||
  'http://localhost:8000';

export type JourneyAccessMode = 'owner' | 'shared_viewer' | 'none';

export async function fetchJourneyRecord(journeyId: string) {
  const response = await fetch(
    `${AI_BASE.replace(/\/$/, '')}/api/ai/journey/${encodeURIComponent(journeyId)}`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json().catch(() => null);
  return data?.journey || data?.data || data || null;
}

export async function resolveJourneyAccess(
  journeyId: string,
  userId: string
): Promise<{ accessMode: JourneyAccessMode; journey: any | null }> {
  const journey = await fetchJourneyRecord(journeyId);
  if (!journey) {
    return { accessMode: 'none', journey: null };
  }

  const ownerUserId = String(journey.user_id || journey.userId || '');
  if (ownerUserId && ownerUserId === String(userId)) {
    return { accessMode: 'owner', journey };
  }

  const activeShare = await JourneyShare.findOne({
    journeyId,
    recipientUserId: userId,
    status: 'active',
  }).lean();

  if (activeShare) {
    return { accessMode: 'shared_viewer', journey };
  }

  return { accessMode: 'none', journey };
}

export async function resolveUserIdFromBearerToken(token?: string | null) {
  const normalized = String(token || '').trim();
  if (!normalized) return null;

  const decoded = jwt.verify(normalized, process.env.JWT_SECRET!) as { id?: string };
  if (!decoded?.id) return null;
  const currentUser = await ClientUser.findById(decoded.id).lean();
  if (!currentUser || !currentUser.verified) return null;
  return String(currentUser._id);
}

export const requireJourneyReadAccess = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : '';

    const userId = await resolveUserIdFromBearerToken(token);
    if (!userId) {
      return res.status(401).json({ status: 'fail', message: 'Authentication required' });
    }

    const { journeyId } = req.params as { journeyId: string };
    const { accessMode } = await resolveJourneyAccess(journeyId, userId);
    if (accessMode === 'none') {
      return res.status(403).json({ status: 'fail', message: 'Journey access denied' });
    }

    req.userId = userId;
    (req as any).journeyAccessMode = accessMode;
    next();
  } catch (error: any) {
    return res.status(401).json({ status: 'fail', message: error.message || 'Authentication failed' });
  }
};

export const requireJourneyOwnerAccess = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : '';

    const userId = await resolveUserIdFromBearerToken(token);
    if (!userId) {
      return res.status(401).json({ status: 'fail', message: 'Authentication required' });
    }

    const { journeyId } = req.params as { journeyId: string };
    const { accessMode } = await resolveJourneyAccess(journeyId, userId);
    if (accessMode !== 'owner') {
      return res.status(403).json({ status: 'fail', message: 'Owner access required' });
    }

    req.userId = userId;
    (req as any).journeyAccessMode = accessMode;
    next();
  } catch (error: any) {
    return res.status(401).json({ status: 'fail', message: error.message || 'Authentication failed' });
  }
};

export async function canOpenJourneyWebSocket(req: IncomingMessage) {
  const host = req.headers.host || 'localhost';
  const parsed = new URL(req.url || '', `http://${host}`);
  const segments = parsed.pathname.split('/').filter(Boolean);
  const journeyId = segments[segments.length - 1];
  const token = parsed.searchParams.get('token');

  if (!journeyId || !token) return false;

  const userId = await resolveUserIdFromBearerToken(token);
  if (!userId) return false;

  const { accessMode } = await resolveJourneyAccess(journeyId, userId);
  return accessMode === 'owner' || accessMode === 'shared_viewer';
}
