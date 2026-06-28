import {
  fetchAiWithFallback,
  getAiWebSocketBaseUrls,
} from "../pages/chat/mobile/utils/aiBackend";

type SpeechRecognitionCallback = (transcript: string, isFinal: boolean) => void;
type SpeechErrorCallback = (error: string) => void;
type SpeechStateCallback = (
  state: "idle" | "connecting" | "recording" | "transcribing" | "ready" | "error" | "closed"
) => void;

type StartSessionOptions = {
  conversationId?: string | null;
  language?: string;
  userId?: string;
  onPartial: SpeechRecognitionCallback;
  onFinal: SpeechRecognitionCallback;
  onError?: SpeechErrorCallback;
  onStateChange?: SpeechStateCallback;
};

type VoiceSessionStartResponse = {
  conversation_id: string;
  signaling_path: string;
  webrtc_supported?: boolean;
};

const buildWebSocketUrl = (path: string) => {
  try {
    if (/^wss?:\/\//i.test(path)) return path;
    const wsBase = getAiWebSocketBaseUrls()[0];
    if (!wsBase) return path;
    return `${wsBase}${path}`;
  } catch {
    return path;
  }
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error("Failed to read audio blob"));
    reader.readAsDataURL(blob);
  });

class SpeechToTextService {
  private websocket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private isListening = false;
  private currentTranscript = "";
  private currentLanguage: string | null = null;
  private audioChunks: Blob[] = [];
  private sessionConversationId: string | null = null;
  private isCancelling = false;

  public isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      !!window.WebSocket &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined"
    );
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  public getCurrentTranscript(): string {
    return this.currentTranscript;
  }

  public getCurrentLanguage(): string | null {
    return this.currentLanguage;
  }

  public async startSession(options: StartSessionOptions): Promise<void> {
    if (!this.isSupported()) {
      options.onError?.("Voice input is not supported in this browser");
      return;
    }

    if (this.isListening) {
      return;
    }

    options.onStateChange?.("connecting");
    this.currentTranscript = "";
    this.currentLanguage = options.language || null;
    this.audioChunks = [];
    this.isCancelling = false;

    try {
      const startResponse = await fetchAiWithFallback(`/api/ai/voice/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: options.userId || "anonymous",
          conversation_id: options.conversationId || undefined,
          language: options.language || undefined,
        }),
      });
      const session = (await startResponse.json()) as VoiceSessionStartResponse;
      this.sessionConversationId = session.conversation_id;

      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.websocket = new WebSocket(buildWebSocketUrl(session.signaling_path));

      this.websocket.onopen = async () => {
        this.websocket?.send(
          JSON.stringify({
            type: "start",
            payload: {
              user_id: options.userId || "anonymous",
              language: options.language || undefined,
            },
          })
        );

        await this.initializePeerConnection(options);
        this.initializeRecorder(options);
      };

      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const type = message?.type;
          const payload = message?.payload || {};

          if (type === "voice_session_ready") {
            return;
          }
          if (type === "partial_transcript") {
            this.currentTranscript = payload.full_transcript || payload.transcript || this.currentTranscript;
            this.currentLanguage = payload.language || this.currentLanguage;
            options.onPartial(payload.transcript || payload.full_transcript || "", false);
            options.onStateChange?.("transcribing");
            return;
          }
          if (type === "final_transcript") {
            this.currentTranscript = payload.transcript || this.currentTranscript;
            this.currentLanguage = payload.language || this.currentLanguage;
            options.onFinal(this.currentTranscript, true);
            options.onStateChange?.("ready");
            return;
          }
          if (type === "voice_error") {
            options.onError?.(payload.message || "Voice session failed");
            options.onStateChange?.("error");
          }
        } catch (error) {
          options.onError?.("Failed to parse voice session message");
        }
      };

      this.websocket.onerror = () => {
        options.onError?.("Voice connection failed");
        options.onStateChange?.("error");
      };

      this.websocket.onclose = () => {
        this.isListening = false;
        options.onStateChange?.("closed");
      };
    } catch (error) {
      this.cleanup();
      options.onError?.((error as Error)?.message || "Failed to start voice session");
      options.onStateChange?.("error");
    }
  }

  private async initializePeerConnection(options: StartSessionOptions): Promise<void> {
    if (!this.websocket || !this.mediaStream || typeof RTCPeerConnection === "undefined") {
      return;
    }

    try {
      this.peerConnection = new RTCPeerConnection();
      this.mediaStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.mediaStream as MediaStream);
      });

      this.peerConnection.onicecandidate = (event) => {
        if (!event.candidate || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
          return;
        }
        this.websocket.send(
          JSON.stringify({
            type: "ice_candidate",
            payload: event.candidate.toJSON(),
          })
        );
      };

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      if (this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(
          JSON.stringify({
            type: "offer",
            payload: {
              sdp: offer.sdp,
              type: offer.type,
            },
          })
        );
      }
    } catch {
      options.onError?.("WebRTC setup failed; continuing with voice upload mode");
    }
  }

  private initializeRecorder(options: StartSessionOptions): void {
    if (!this.mediaStream) return;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });
    this.isListening = true;

    this.mediaRecorder.onstart = () => {
      options.onStateChange?.("recording");
    };

    this.mediaRecorder.ondataavailable = async (event) => {
      if (!event.data || event.data.size === 0) return;
      this.audioChunks.push(event.data);
    };

    this.mediaRecorder.onstop = async () => {
      if (this.isCancelling) {
        this.isListening = false;
        options.onStateChange?.("closed");
        return;
      }

      const finalBlob = new Blob(this.audioChunks, { type: mimeType });
      if (finalBlob.size > 0) {
        options.onStateChange?.("transcribing");
        await this.sendAudioSnapshot(finalBlob, true);
      }
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ type: "stop", payload: {} }));
      }
      this.isListening = false;
    };

    this.mediaRecorder.start();
  }

  private async sendAudioSnapshot(blob: Blob, finalize: boolean): Promise<void> {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN || blob.size === 0) {
      return;
    }

    const audio_base64 = await blobToBase64(blob);
    this.websocket.send(
      JSON.stringify({
        type: "audio_chunk",
        payload: {
          audio_base64,
          mime_type: blob.type || "audio/webm",
          filename: finalize ? "voice-final.webm" : "voice-live.webm",
          finalize,
        },
      })
    );
  }

  public stopSession(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    } else if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({ type: "stop", payload: {} }));
    }
  }

  public cancelSession(): void {
    this.isCancelling = true;
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({ type: "cancel", payload: {} }));
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.isListening = false;
    this.currentTranscript = "";
    this.currentLanguage = null;
    this.isCancelling = false;

    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      }
    } catch {
      // ignore
    }
    this.mediaRecorder = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    this.mediaStream = null;

    try {
      this.peerConnection?.close();
    } catch {
      // ignore
    }
    this.peerConnection = null;

    try {
      this.websocket?.close();
    } catch {
      // ignore
    }
    this.websocket = null;
    this.audioChunks = [];
  }
}

export const speechToTextService = new SpeechToTextService();
export default speechToTextService;
