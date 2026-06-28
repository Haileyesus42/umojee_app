import { fetchAiWithFallback } from "../pages/chat/mobile/utils/aiBackend";

export type TTSOptions = {
  voice?: string;
  responseFormat?: "wav";
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
};

const TTS_VOICE_STORAGE_KEY = "umoja_tts_voice";

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let liveStream: MediaStream | null = null;
let speaking = false;

const ETHIOPIC_REGEX = /[\u1200-\u137F]/;
const ARABIC_REGEX = /[\u0600-\u06FF]/;
const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;
const HEBREW_REGEX = /[\u0590-\u05FF]/;
const THAI_REGEX = /[\u0E00-\u0E7F]/;
const HANGUL_REGEX = /[\uAC00-\uD7AF]/;
const HIRAGANA_KATAKANA_REGEX = /[\u3040-\u30FF]/;
const CJK_REGEX = /[\u4E00-\u9FFF]/;

const cleanupAudio = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.srcObject = null;
    currentAudio.src = "";
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
  speaking = false;
};

const createAudioElement = () => {
  const audio = new Audio();
  audio.preload = "auto";
  audio.crossOrigin = "anonymous";
  return audio;
};

const canUseBrowserSpeech = () =>
  typeof window !== "undefined" &&
  typeof window.speechSynthesis !== "undefined" &&
  typeof SpeechSynthesisUtterance !== "undefined";

const getPreferredVoice = () => {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage.getItem(TTS_VOICE_STORAGE_KEY) || undefined;
  } catch {
    return undefined;
  }
};

const normalizeLang = (lang?: string | null) => {
  const value = (lang || "").trim();
  return value || undefined;
};

const inferSpeechLangFromText = (text: string) => {
  if (!text) return undefined;
  if (ETHIOPIC_REGEX.test(text)) return "am-ET";
  if (ARABIC_REGEX.test(text)) return "ar";
  if (DEVANAGARI_REGEX.test(text)) return "hi-IN";
  if (HEBREW_REGEX.test(text)) return "he-IL";
  if (THAI_REGEX.test(text)) return "th-TH";
  if (HANGUL_REGEX.test(text)) return "ko-KR";
  if (HIRAGANA_KATAKANA_REGEX.test(text)) return "ja-JP";
  if (CJK_REGEX.test(text)) return "zh-CN";
  if (CYRILLIC_REGEX.test(text)) return "ru-RU";
  return undefined;
};

const shouldPreferBrowserSpeech = (text: string, lang?: string) => {
  const resolvedLang = normalizeLang(lang) || inferSpeechLangFromText(text);
  if (!resolvedLang) return false;
  const normalized = resolvedLang.toLowerCase();
  if (normalized.startsWith("en")) return false;
  if (normalized.startsWith("ar")) return false;
  return true;
};

const pickBrowserVoice = (lang?: string) => {
  if (!canUseBrowserSpeech() || !lang) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const normalizedLang = lang.toLowerCase();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === normalizedLang) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith(`${normalizedLang.split("-")[0]}-`)) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith(normalizedLang.split("-")[0])) ||
    null
  );
};

const speakWithBrowserFallback = (text: string, options: TTSOptions = {}) =>
  new Promise<void>((resolve, reject) => {
    if (!canUseBrowserSpeech()) {
      reject(new Error("Browser speech synthesis is unavailable"));
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const resolvedLang = normalizeLang(options.lang) || inferSpeechLangFromText(text);
    if (resolvedLang) utterance.lang = resolvedLang;
    const browserVoice = pickBrowserVoice(resolvedLang);
    if (browserVoice) utterance.voice = browserVoice;
    speaking = true;
    options.onStart?.();
    utterance.onend = () => {
      speaking = false;
      options.onEnd?.();
      resolve();
    };
    utterance.onerror = (event) => {
      speaking = false;
      options.onError?.(event);
      reject(event);
    };
    window.speechSynthesis.speak(utterance);
  });

export async function speak(text: string, options: TTSOptions = {}): Promise<void> {
  const value = (text || "").trim();
  if (!value) return;

  stop();
  const { voice, responseFormat = "wav", onStart, onEnd, onError } = options;
  const resolvedVoice = voice || getPreferredVoice();
  const resolvedLang = normalizeLang(options.lang) || inferSpeechLangFromText(value);

  if (shouldPreferBrowserSpeech(value, resolvedLang)) {
    await speakWithBrowserFallback(value, { ...options, lang: resolvedLang });
    return;
  }

  try {
    const response = await fetchAiWithFallback(`/api/ai/voice/replay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: value,
        voice: resolvedVoice,
        language: resolvedLang,
        response_format: responseFormat,
      }),
    });

    if (!response.ok) {
      let detail: any = null;
      try {
        detail = await response.json();
      } catch {
        // ignore
      }
      if (detail?.detail?.fallback === "browser_speech_synthesis") {
        console.warn("Backend TTS unavailable, falling back to browser speech synthesis", detail);
        await speakWithBrowserFallback(value, { ...options, lang: resolvedLang });
        return;
      }
      throw new Error(`Voice replay failed with status ${response.status}`);
    }

    const blob = await response.blob();
    currentObjectUrl = URL.createObjectURL(blob);
    currentAudio = createAudioElement();
    currentAudio.src = currentObjectUrl;
    speaking = true;
    onStart?.();

    await new Promise<void>((resolve, reject) => {
      if (!currentAudio) {
        reject(new Error("No audio element available"));
        return;
      }

      currentAudio.onended = () => {
        speaking = false;
        onEnd?.();
        cleanupAudio();
        resolve();
      };
      currentAudio.onerror = (event) => {
        speaking = false;
        onError?.(event);
        cleanupAudio();
        reject(event);
      };
      currentAudio.play().catch(reject);
    });
  } catch (error) {
    speaking = false;
    onError?.(error);
    cleanupAudio();
    throw error;
  }
}

export function attachRemoteStream(stream: MediaStream) {
  liveStream = stream;
}

export function stop() {
  try {
    if (canUseBrowserSpeech()) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
  }
  cleanupAudio();
}

export function isSpeaking(): boolean {
  return speaking;
}

export default { speak, stop, isSpeaking, attachRemoteStream };
