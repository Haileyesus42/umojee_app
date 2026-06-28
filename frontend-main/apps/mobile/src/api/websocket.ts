import { getNodeBackendCandidates } from './client';

export type WebSocketStatus = 'idle' | 'connecting' | 'open' | 'closing' | 'closed' | 'error';

export type WebSocketQueryValue = string | number | boolean | null | undefined;

export type WebSocketQueryParams = Record<string, WebSocketQueryValue>;

export type GenericWebSocketServiceOptions = {
  connectionTimeoutMs?: number;
  getBaseUrlCandidates?: () => string[];
  label?: string;
  maxReconnectAttempts?: number;
  protocols?: string | string[];
  queryParams?: WebSocketQueryParams;
  reconnect?: boolean;
  reconnectDelayMs?: number;
};

export type WebSocketMessageListener<TMessage> = (message: TMessage, event: MessageEvent) => void;
export type WebSocketStatusListener = (status: WebSocketStatus) => void;
export type WebSocketErrorListener = (error: Event | Error) => void;

const DEFAULT_CONNECTION_TIMEOUT_MS = 10000;
const DEFAULT_RECONNECT_DELAY_MS = 1200;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function encodeQueryParams(queryParams?: WebSocketQueryParams): string {
  if (!queryParams) {
    return '';
  }

  const entries = Object.entries(queryParams).filter(
    ([, value]) => value !== null && value !== undefined,
  );

  if (entries.length === 0) {
    return '';
  }

  return entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

function toWebSocketBaseUrl(baseUrl: string): string {
  if (baseUrl.startsWith('https://')) {
    return baseUrl.replace(/^https:\/\//, 'wss://');
  }

  if (baseUrl.startsWith('http://')) {
    return baseUrl.replace(/^http:\/\//, 'ws://');
  }

  return baseUrl;
}

export function buildWebSocketUrl(
  baseUrl: string,
  path: string,
  queryParams?: WebSocketQueryParams,
): string {
  const queryString = encodeQueryParams(queryParams);
  const separator = path.includes('?') ? '&' : '?';

  return `${toWebSocketBaseUrl(baseUrl)}${normalizePath(path)}${
    queryString ? `${separator}${queryString}` : ''
  }`;
}

export function getNodeProxyWebSocketCandidates(
  path: string,
  queryParams?: WebSocketQueryParams,
): string[] {
  return getNodeBackendCandidates().map((baseUrl) => buildWebSocketUrl(baseUrl, path, queryParams));
}

export class GenericWebSocketService<TInbound = unknown, TOutbound = unknown> {
  private candidateIndex = 0;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private socket: WebSocket | null = null;
  private status: WebSocketStatus = 'idle';

  private readonly errorListeners = new Set<WebSocketErrorListener>();
  private readonly messageListeners = new Set<WebSocketMessageListener<TInbound>>();
  private readonly statusListeners = new Set<WebSocketStatusListener>();

  constructor(
    private readonly path: string,
    private readonly options: GenericWebSocketServiceOptions = {},
  ) {}

  get currentStatus(): WebSocketStatus {
    return this.status;
  }

  get isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  connect(): void {
    this.shouldReconnect = Boolean(this.options.reconnect);
    this.reconnectAttempts = 0;
    this.candidateIndex = 0;
    this.openCurrentCandidate();
  }

  disconnect(code?: number, reason?: string): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.setStatus('closing');
    this.socket?.close(code, reason);
    this.socket = null;
    this.setStatus('closed');
  }

  send(payload: TOutbound): boolean {
    if (!this.isOpen || !this.socket) {
      return false;
    }

    this.socket.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
    return true;
  }

  onMessage(listener: WebSocketMessageListener<TInbound>): () => void {
    this.messageListeners.add(listener);

    return () => this.messageListeners.delete(listener);
  }

  onStatusChange(listener: WebSocketStatusListener): () => void {
    this.statusListeners.add(listener);

    return () => this.statusListeners.delete(listener);
  }

  onError(listener: WebSocketErrorListener): () => void {
    this.errorListeners.add(listener);

    return () => this.errorListeners.delete(listener);
  }

  private get candidates(): string[] {
    const getBaseUrlCandidates = this.options.getBaseUrlCandidates || getNodeBackendCandidates;

    return getBaseUrlCandidates().map((baseUrl) =>
      buildWebSocketUrl(baseUrl, this.path, this.options.queryParams),
    );
  }

  private openCurrentCandidate(): void {
    const candidates = this.candidates;
    const url = candidates[this.candidateIndex];

    if (!url) {
      this.setStatus('error');
      this.emitError(new Error(`${this.options.label || 'WebSocket'} has no URL candidates`));
      return;
    }

    this.clearReconnectTimer();
    this.socket?.close();
    this.setStatus('connecting');

    const socket = new WebSocket(url, this.options.protocols);
    const timeout = setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        socket.close();
        this.tryNextCandidateOrReconnect();
      }
    }, this.options.connectionTimeoutMs || DEFAULT_CONNECTION_TIMEOUT_MS);

    this.socket = socket;

    socket.onopen = () => {
      clearTimeout(timeout);
      this.reconnectAttempts = 0;
      this.setStatus('open');
    };

    socket.onmessage = (event) => {
      this.emitMessage(this.parseMessage(event), event);
    };

    socket.onerror = (event) => {
      this.emitError(event);
    };

    socket.onclose = () => {
      clearTimeout(timeout);

      if (this.socket === socket) {
        this.socket = null;
      }

      this.setStatus('closed');

      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };
  }

  private parseMessage(event: MessageEvent): TInbound {
    if (typeof event.data !== 'string') {
      return event.data as TInbound;
    }

    try {
      return JSON.parse(event.data) as TInbound;
    } catch {
      return event.data as TInbound;
    }
  }

  private tryNextCandidateOrReconnect(): void {
    const hasNextCandidate = this.candidateIndex < this.candidates.length - 1;

    if (hasNextCandidate) {
      this.candidateIndex += 1;
      this.openCurrentCandidate();
      return;
    }

    this.setStatus('error');

    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    const maxAttempts = this.options.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS;

    if (this.reconnectAttempts >= maxAttempts) {
      return;
    }

    this.clearReconnectTimer();
    this.reconnectAttempts += 1;
    this.candidateIndex = 0;
    this.reconnectTimer = setTimeout(
      () => this.openCurrentCandidate(),
      this.options.reconnectDelayMs || DEFAULT_RECONNECT_DELAY_MS,
    );
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setStatus(status: WebSocketStatus): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  private emitMessage(message: TInbound, event: MessageEvent): void {
    this.messageListeners.forEach((listener) => listener(message, event));
  }

  private emitError(error: Event | Error): void {
    this.errorListeners.forEach((listener) => listener(error));
  }
}

export function createNodeProxyWebSocketService<TInbound = unknown, TOutbound = unknown>(
  path: string,
  options: Omit<GenericWebSocketServiceOptions, 'getBaseUrlCandidates'> = {},
) {
  return new GenericWebSocketService<TInbound, TOutbound>(path, {
    ...options,
    getBaseUrlCandidates: getNodeBackendCandidates,
  });
}
