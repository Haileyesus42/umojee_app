import express, { Request, Response, NextFunction } from 'express';
import axios, { AxiosRequestHeaders } from 'axios';
import httpProxy from "http-proxy";
import type { IncomingMessage } from "http";
import type { Socket } from "net";
import type { Server } from "http";
import {
  canOpenJourneyWebSocket,
  requireJourneyOwnerAccess,
  requireJourneyReadAccess,
} from "./journeyShareAccess";

const router = express.Router();

const AI_BASE = process.env.AI_BACKEND_URL || process.env.REACT_APP_AI_BACKEND_URL || 'http://localhost:8000';

async function forward(req: Request, res: Response, next: NextFunction) {
  try {
    const target = `${AI_BASE}/api/ai${req.path}`;
    const headers: AxiosRequestHeaders = { ...req.headers } as any;
    // Remove hop-by-hop and compression headers to avoid issues
    delete headers['host'];
    delete headers['content-length'];
    delete headers['accept-encoding'];
    console.log(`Proxying ${req.method} ${req.originalUrl} to ${target}`);
    const response = await axios.request({
      url: target,
      method: req.method as any,
      data: req.body,
      headers,
      validateStatus: () => true,
    });
    res.status(response.status).set(response.headers).send(response.data);
  } catch (err: any) {
    if (err.response) {
      return res.status(err.response.status || 500).json(err.response.data || { error: 'AI proxy error' });
    }
    next(err);
  }
}

// Only capture the AI backend endpoints; let other /api/ai routes fall through
router.get('/hello', forward);
router.post('/session/new', forward);
router.post('/session/list', forward);
router.post('/session/list-general', forward);
router.post('/session/start', forward);
router.post('/session/delete', forward);
router.post('/respond', forward);
router.post('/journey/:journeyId/respond', requireJourneyOwnerAccess, forward);
router.post('/voice/session/start', forward);
router.post('/voice/transcribe', forward);
router.post('/voice/stop', forward);
router.post('/voice/replay', forward);
router.post('/journey/create', forward);
router.get('/journey/:journeyId', requireJourneyReadAccess, forward);
router.delete('/journey/:journeyId', requireJourneyOwnerAccess, forward);
router.get('/journey/:journeyId/conversations', requireJourneyOwnerAccess, forward);
router.patch('/journey/:journeyId/archive', requireJourneyOwnerAccess, forward);
router.patch('/journey/:journeyId/set-active', requireJourneyOwnerAccess, forward);
router.post('/journey/:journeyId/monitor/start', requireJourneyOwnerAccess, forward);
router.post('/journey/:journeyId/monitor/stop', requireJourneyOwnerAccess, forward);
router.get('/journey/:journeyId/monitor/status', requireJourneyOwnerAccess, forward);
router.get('/journey/user/:userId', forward);
router.delete('/journey/user/:userId/all', forward);
router.post('/driving-route', forward);
router.post('/nearby-places', forward);
router.post('/weather-forecast', forward);
router.post('/recommend/destinations', forward);

export default router;

export function setupAiWebSocketProxy(server: Server) {
  const wsProxy = httpProxy.createProxyServer({
    target: AI_BASE,
    ws: true,
    changeOrigin: true,
  });

  wsProxy.on("error", (err: Error, _req: IncomingMessage, res: any) => {
    try {
      if (res && typeof res.destroy === "function") {
        res.destroy();
        return;
      }
      if (res && typeof res.writeHead === "function") {
        res.writeHead(502);
        res.end();
      }
    } catch {
      // ignore
    }
  });

  server.on("upgrade", async (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const url = req.url || "";
    if (url.startsWith("/ws/journey")) {
      const allowed = await canOpenJourneyWebSocket(req).catch(() => false);
      if (!allowed) {
        socket.destroy();
        return;
      }
      wsProxy.ws(req, socket, head);
      return;
    }
    if (url.startsWith("/ws/voice/signaling")) {
      wsProxy.ws(req, socket, head);
      return;
    }
  });
}

