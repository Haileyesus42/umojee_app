declare module "ws" {
  export class WebSocket {
    static readonly OPEN: number;
    readyState: number;
    send(data: string): void;
    close(): void;
    on(event: "close" | "error", listener: (...args: any[]) => void): this;
  }

  export class WebSocketServer {
    constructor(options?: Record<string, any>);
    on(event: "connection", listener: (...args: any[]) => void): this;
    handleUpgrade(
      req: any,
      socket: any,
      head: any,
      callback: (ws: WebSocket) => void
    ): void;
    emit(event: "connection", ...args: any[]): boolean;
  }
}
