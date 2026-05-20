import type { IncomingMessage } from "http";
import type { Server as HttpServer } from "http";
import { URL } from "url";
import type { WebSocket as WsSocket } from "ws";
import { resolveUserIdFromBearerToken } from "./journeyShareAccess";

type NotificationSocketPayload = {
  event: "client_notification";
  data: Record<string, any>;
};

type NotificationWebSocketServer = {
  on(event: "connection", listener: (...args: any[]) => void): NotificationWebSocketServer;
  handleUpgrade(
    req: IncomingMessage,
    socket: any,
    head: Buffer,
    callback: (ws: WsSocket) => void
  ): void;
  emit(event: "connection", ...args: any[]): boolean;
};

const wsModule = require("ws") as {
  OPEN: number;
  WebSocket?: { OPEN: number };
  Server?: new (options?: Record<string, any>) => NotificationWebSocketServer;
  WebSocketServer?: new (options?: Record<string, any>) => NotificationWebSocketServer;
};

const WsRuntime = wsModule.WebSocket || wsModule;
const NotificationWebSocketServer =
  wsModule.WebSocketServer || wsModule.Server;

const userSockets = new Map<string, Set<WsSocket>>();
type AuthedSocket = WsSocket & { userId?: string };

function addSocket(userId: string, socket: WsSocket) {
  const existing = userSockets.get(userId) || new Set<WsSocket>();
  existing.add(socket);
  userSockets.set(userId, existing);
}

function removeSocket(userId: string, socket: WsSocket) {
  const existing = userSockets.get(userId);
  if (!existing) return;
  existing.delete(socket);
  if (existing.size === 0) {
    userSockets.delete(userId);
  }
}

export function emitNotificationToUser(userId: string, payload: NotificationSocketPayload) {
  const sockets = userSockets.get(String(userId));
  if (!sockets?.size) return;

  const message = JSON.stringify(payload);
  for (const socket of sockets) {
    if (socket.readyState === WsRuntime.OPEN) {
      socket.send(message);
    }
  }
}

export async function canOpenNotificationWebSocket(req: IncomingMessage) {
  const host = req.headers.host || "localhost";
  const parsed = new URL(req.url || "", `http://${host}`);
  const token = parsed.searchParams.get("token");
  if (!token) return null;

  const userId = await resolveUserIdFromBearerToken(token);
  return userId ? String(userId) : null;
}

export function setupNotificationWebSocketServer(server: HttpServer) {
  if (!NotificationWebSocketServer) {
    throw new Error("Unable to initialize notification WebSocket server");
  }

  const notificationWss = new NotificationWebSocketServer({ noServer: true });

  notificationWss.on("connection", (socket: WsSocket) => {
    const authedSocket = socket as AuthedSocket;
    const userId = authedSocket.userId;
    if (!userId) {
      socket.close();
      return;
    }

    addSocket(userId, socket);

    socket.on("close", () => {
      removeSocket(userId, socket);
    });

    socket.on("error", () => {
      removeSocket(userId, socket);
    });

    if (socket.readyState === WsRuntime.OPEN) {
      socket.send(
        JSON.stringify({
          event: "client_notification_connected",
          data: { userId, connectedAt: new Date().toISOString() },
        })
      );
    }
  });

  server.on("upgrade", async (req, socket, head) => {
    try {
      const host = req.headers.host || "localhost";
      const parsed = new URL(req.url || "", `http://${host}`);
      if (!parsed.pathname.startsWith("/ws/notifications")) {
        return;
      }

      const userId = await canOpenNotificationWebSocket(req);
      if (!userId) {
        socket.destroy();
        return;
      }

      notificationWss.handleUpgrade(req, socket, head, (ws: WsSocket) => {
        (ws as AuthedSocket).userId = userId;
        notificationWss.emit("connection", ws, req);
      });
    } catch (_error) {
      socket.destroy();
    }
  });
}
