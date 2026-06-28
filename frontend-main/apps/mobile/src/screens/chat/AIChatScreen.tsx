import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import FullscreenExitLineIcon from '../../../assets/icons/fullscreen-exit-line.svg';
import FullscreenLineIcon from '../../../assets/icons/fullscreen-line.svg';
import {
  getUserId,
  getUserName,
  listGeneralAIConversations,
  loadAIConversation,
  sendAIChatMessage,
  type AIConversationSummary,
} from '../../api/aiChat';
import type { AuthUser } from '../../api/auth/auth';
import { fetchCompanions, type Companion } from '../../api/profile/companions';
import {
  defaultProfileImage,
  figmaUmojeeEmblemImage,
  unityChatAvatarImage,
} from '../../assets/images';
import { colors } from '../../constants/colors';
import { quickActions } from '../../data/homeData';
import { styles } from '../../theme/styles';
import type { AIChatLaunchParams, AIChatMetadata } from '../../types/aiChat';
import { InlineJourneyDetailsCard } from './InlineJourneyDetailsCard';

type AIChatScreenProps = {
  launchParams?: AIChatLaunchParams;
  onJourneyUpdated?: () => Promise<void> | void;
  onBack: () => void;
  onOpenVoice?: () => void;
  profileImageUri?: string | null;
  token?: string | null;
  user?: AuthUser | null;
};

type ChatMessage = {
  actions?: string[];
  apiResponse?: unknown;
  apiResponseType?: string | null;
  fromUnity?: boolean;
  id: string;
  renderInline?: boolean;
  text: string;
};

type ParsedAssistantPayload = {
  apiResponse?: unknown;
  apiResponseType?: string | null;
  renderInline?: boolean;
  text: string;
  triggerPopup?: boolean;
};

const HISTORY_PAGE_SIZE = 10;
const DEFAULT_WELCOME = "Hi, I'm UNITY. I can help you plan, book, and manage your trip.";

const QUICK_ACTION_WELCOME_MESSAGES: Record<string, string> = {
  aspirations:
    "Let's turn one of your saved aspirations into a real plan. Which destination should we work on first?",
  inspirations:
    "Tell me what kind of inspiration you want today, and I'll help you shape it into a journey.",
  journeys:
    'I can help you review, update, or continue one of your journeys. Which journey should we focus on?',
  my_itinerary:
    'I can help you review your itinerary, adjust timing, or find the next best step. What would you like to check?',
  new_trip:
    "Let's create a new trip together. Where would you like to go, and roughly when are you thinking?",
  support_cancel_trip:
    'I can help with cancelling a trip. Which trip should we look at, and what changed?',
  support_lost_luggage:
    "I'm sorry you're dealing with lost luggage. Tell me your flight or booking details, and I'll guide the next steps.",
  support_reschedule_trip:
    'I can help you reschedule a trip. Which trip needs changing, and what new dates work for you?',
};

function getQuickActionId(label: string) {
  return label
    .replace(/\n/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function getWelcomeMessage(params?: AIChatLaunchParams) {
  if (!params?.quickActionId) {
    return DEFAULT_WELCOME;
  }

  return (
    QUICK_ACTION_WELCOME_MESSAGES[params.quickActionId] ||
    `I can help with ${params.quickActionLabel || 'that request'}. What would you like to do next?`
  );
}

const assistantTextKeys = [
  'ai_generated',
  'message',
  'response_message',
  'response',
  'reply',
  'content',
  'text',
  'data',
  'result',
  'output',
  'payload',
] as const;

function stripJsonCodeFence(value: string) {
  let text = value.trim();

  if (!text.startsWith('```')) {
    return text;
  }

  text = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return text;
}

function decodeJsonStringValue(value: string) {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
  }
}

function extractJsonStringField(text: string, key: string) {
  const match = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's').exec(text);

  return match?.[1] ? decodeJsonStringValue(match[1]) : '';
}

function parseJsonObjectString(value: string) {
  const text = stripJsonCodeFence(value);

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isJourneyDetailsResponse(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return isRecord(value.journey) || typeof value.journey_id === 'string';
}

function getApiResponseType(record: Record<string, unknown>, apiResponse: unknown) {
  if (typeof record.api_response_type === 'string') {
    return record.api_response_type;
  }

  if (typeof record.apiResponseType === 'string') {
    return record.apiResponseType;
  }

  return isJourneyDetailsResponse(apiResponse) ? 'journey_details_card' : null;
}

function hasJourneyDetailsText(value: string) {
  return /"journey_id"\s*:\s*"/.test(value) || /"booked_flights"\s*:\s*\[/.test(value);
}

function extractNestedJourneyPayloadFromText(value: string) {
  if (!hasJourneyDetailsText(value)) {
    return undefined;
  }

  const status = extractJsonStringField(value, 'status');
  const plannedDestination = extractJsonStringField(value, 'planned_destination');
  const departureCity = extractJsonStringField(value, 'departure_city');
  const departureAirportCode = extractJsonStringField(value, 'departure_airport_code');
  const destinationAirportCode = extractJsonStringField(value, 'destination_airport_code');
  const plannedDepartureDate = extractJsonStringField(value, 'planned_departure_date');
  const flightNumber =
    extractJsonStringField(value, 'flight_number') ||
    extractJsonStringField(value, 'flightNumber') ||
    extractJsonStringField(value, 'flightNo');
  const airline = extractJsonStringField(value, 'airline');
  const fromCode = extractJsonStringField(value, 'from_code') || departureAirportCode;
  const toCode = extractJsonStringField(value, 'to_code') || destinationAirportCode;
  const departure =
    extractJsonStringField(value, 'departure') ||
    extractJsonStringField(value, 'departure_time') ||
    plannedDepartureDate;
  const arrival =
    extractJsonStringField(value, 'arrival') || extractJsonStringField(value, 'arrival_time');
  const hotelName =
    extractJsonStringField(value, 'hotel_name') || extractJsonStringField(value, 'name');
  const hotelAddress =
    extractJsonStringField(value, 'address') || extractJsonStringField(value, 'city');

  return {
    journey: {
      booked_flights:
        flightNumber || airline || fromCode || toCode
          ? [
              {
                airline,
                arrival,
                departure,
                flight_number: flightNumber,
                from_code: fromCode,
                to_code: toCode,
              },
            ]
          : [],
      booked_hotels:
        hotelName || hotelAddress
          ? [
              {
                address: hotelAddress,
                name: hotelName,
              },
            ]
          : [],
      context: {
        departure_airport_code: departureAirportCode,
        departure_city: departureCity,
        destination_airport_code: destinationAirportCode,
        planned_departure_date: plannedDepartureDate,
        planned_destination: plannedDestination,
      },
      status,
    },
  };
}

function getNestedAssistantPayload(record: Record<string, unknown>) {
  for (const key of assistantTextKeys) {
    const value = record[key];

    if (typeof value !== 'string') {
      continue;
    }

    const parsed = parseJsonObjectString(value);

    if (isRecord(parsed)) {
      const nestedPayload = parseAssistantPayload(parsed);

      if (
        nestedPayload.apiResponse ||
        nestedPayload.apiResponseType ||
        nestedPayload.renderInline
      ) {
        return nestedPayload;
      }
    }

    const fallbackApiResponse = extractNestedJourneyPayloadFromText(value);

    if (fallbackApiResponse) {
      return {
        apiResponse: fallbackApiResponse,
        apiResponseType: 'journey_details_card',
        renderInline: true,
        text: extractJsonStringField(value, 'ai_generated') || normalizeAIText(value),
      };
    }
  }

  return undefined;
}

function normalizeAIText(raw: unknown, depth = 0): string {
  if (depth > 5) {
    return typeof raw === 'string' ? raw : '';
  }

  if (typeof raw === 'string') {
    const parsed = parseJsonObjectString(raw);

    if (parsed !== undefined) {
      return normalizeAIText(parsed, depth + 1);
    }

    for (const key of assistantTextKeys) {
      const extracted = extractJsonStringField(raw, key);

      if (extracted) {
        return normalizeAIText(extracted, depth + 1);
      }
    }

    return raw;
  }

  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;

    for (const key of assistantTextKeys) {
      if (record[key] !== undefined && record[key] !== null) {
        const normalized = normalizeAIText(record[key], depth + 1);

        if (normalized && normalized !== '[object Object]') {
          return normalized;
        }
      }
    }

    try {
      return JSON.stringify(raw);
    } catch {
      return String(raw);
    }
  }

  return String(raw || '');
}

function parseAssistantPayload(raw: unknown): ParsedAssistantPayload {
  const parsed = typeof raw === 'string' ? parseJsonObjectString(raw) : raw;

  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;
    const nestedPayload = getNestedAssistantPayload(record);
    const apiResponse =
      record.api_response ??
      record.apiResponse ??
      (isJourneyDetailsResponse(record) ? record : undefined) ??
      nestedPayload?.apiResponse;
    const apiResponseType =
      getApiResponseType(record, apiResponse) || nestedPayload?.apiResponseType || null;
    const renderInline =
      record.render_inline === true ||
      record.renderInline === true ||
      nestedPayload?.renderInline === true ||
      apiResponseType === 'journey_details_card';
    const text =
      nestedPayload?.text ||
      normalizeAIText(record.ai_generated || record.message || record.content || raw);

    return {
      apiResponse,
      apiResponseType,
      renderInline,
      text,
      triggerPopup: record.trigger_popup === true || record.triggerPopup === true,
    };
  }

  return { text: normalizeAIText(raw) };
}

function getAssistantResponseText(raw: unknown) {
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;

    const messages = Array.isArray(record.messages) ? record.messages : [];
    const lastMessage = messages[messages.length - 1];

    if (lastMessage && typeof lastMessage === 'object') {
      const content = (lastMessage as Record<string, unknown>).content;
      const parsedContent = parseAssistantPayload(content).text;

      if (parsedContent && parsedContent !== '[object Object]') {
        return parsedContent;
      }
    }
  }

  const normalized = normalizeAIText(raw);

  return normalized && normalized !== '[object Object]'
    ? normalized
    : "Sorry, I couldn't read the assistant response.";
}

function getAssistantPayload(raw: unknown): ParsedAssistantPayload {
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    const messages = Array.isArray(record.messages) ? record.messages : [];

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];

      if (!message || typeof message !== 'object') {
        continue;
      }

      const content = (message as Record<string, unknown>).content;
      const parsed = parseAssistantPayload(content);

      if (parsed.text || parsed.apiResponse || parsed.apiResponseType) {
        return parsed;
      }
    }
  }

  return parseAssistantPayload(raw);
}

function getHistoryPreviewText(raw: unknown) {
  const preview = getAssistantResponseText(raw);

  return preview && preview !== "Sorry, I couldn't read the assistant response."
    ? preview
    : 'Tap to resume';
}

function formatHistoryDate(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

export function AIChatScreen({
  launchParams,
  onJourneyUpdated,
  onBack,
  onOpenVoice,
  profileImageUri,
  token,
  user,
}: AIChatScreenProps) {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(
    launchParams?.conversationId,
  );
  const [draft, setDraft] = useState('');
  const [historyItems, setHistoryItems] = useState<AIConversationSummary[]>([]);
  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [isHistoryPaging, setIsHistoryPaging] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profileImageLoadFailed, setProfileImageLoadFailed] = useState(false);
  const [quickActionContext, setQuickActionContext] = useState<AIChatLaunchParams | undefined>(
    launchParams,
  );
  const [showQuickActions, setShowQuickActions] = useState(!launchParams?.quickActionId);
  const historyRequestInFlightRef = useRef(false);
  const initialPromptKeyRef = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const userId = getUserId(user);
  const userName = getUserName(user);
  const userAvatarSource =
    profileImageUri && !profileImageLoadFailed ? { uri: profileImageUri } : defaultProfileImage;
  const { height } = useWindowDimensions();
  const cardTop = Math.max(50, Math.round(height * 0.06));
  const hasUserMessage = messages.some((message) => !message.fromUnity);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated });
    });

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated });
    }, 160);
  }, []);

  const activeMetadata = useMemo<AIChatMetadata | undefined>(() => {
    if (!quickActionContext?.quickActionId) {
      return launchParams?.source === 'assistant_overlay'
        ? { source: 'assistant_overlay' }
        : undefined;
    }

    return {
      quick_action_group: quickActionContext.quickActionGroup,
      quick_action_id: quickActionContext.quickActionId,
      quick_action_label: quickActionContext.quickActionLabel,
      routing_hint: quickActionContext.quickActionId,
      source:
        quickActionContext.source === 'assistant_overlay' ? 'assistant_overlay' : 'aichat_screen',
    };
  }, [launchParams?.source, quickActionContext]);

  const resetForNewChat = useCallback(() => {
    setConversationId(undefined);
    setDraft('');
    setHistoryOpen(false);
    setMessages([{ fromUnity: true, id: `welcome_${Date.now()}`, text: DEFAULT_WELCOME }]);
    setQuickActionContext(undefined);
    setShowQuickActions(true);
    initialPromptKeyRef.current = null;
  }, []);

  const sendMessage = useCallback(
    async (text: string, metadataOverride?: AIChatMetadata) => {
      const message = text.trim();

      if (!message || isLoading) {
        return;
      }

      setMessages((current) => [...current, { id: `u_${Date.now()}`, text: message }]);
      setDraft('');
      setShowQuickActions(false);
      setIsLoading(true);

      try {
        const userData = {
          ...(user || {}),
          companions,
        };
        const requestPayload = {
          conversation_id: conversationId,
          input_method: 'text',
          message,
          metadata: metadataOverride || activeMetadata,
          user_data: userData,
          user_id: userId,
          user_name: userName,
        } as const;

        if (__DEV__) {
          console.log('[AIChatScreen] sending AI assistant user data', {
            conversation_id: requestPayload.conversation_id,
            companion_count: companions.length,
            companions,
            metadata: requestPayload.metadata,
            user_data: requestPayload.user_data,
            user_id: requestPayload.user_id,
            user_name: requestPayload.user_name,
          });
        }

        const data = await sendAIChatMessage(requestPayload);

        if (__DEV__) {
          console.log('[AIChatScreen] AI response raw', data);
        }

        if (data?.conversation_id) {
          setConversationId(String(data.conversation_id));
        }

        void onJourneyUpdated?.();

        const assistantPayload = getAssistantPayload(data);

        if (__DEV__) {
          console.log('[AIChatScreen] AI response parsed', assistantPayload);
        }

        setMessages((current) => [
          ...current,
          {
            apiResponse: assistantPayload.apiResponse,
            apiResponseType: assistantPayload.apiResponseType,
            fromUnity: true,
            id: `a_${Date.now()}`,
            renderInline: assistantPayload.renderInline,
            text: assistantPayload.text || getAssistantResponseText(data),
          },
        ]);
      } catch (error) {
        if (__DEV__) {
          console.warn('[AIChatScreen] send failed', error);
        }

        setMessages((current) => [
          ...current,
          {
            fromUnity: true,
            id: `e_${Date.now()}`,
            text: "Sorry, I'm having trouble connecting right now.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      activeMetadata,
      companions,
      conversationId,
      isLoading,
      onJourneyUpdated,
      user,
      userId,
      userName,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setCompanions([]);
      return;
    }

    const authToken = token;

    async function loadCompanionsForAssistant() {
      try {
        const nextCompanions = await fetchCompanions(authToken);

        if (!cancelled) {
          setCompanions(nextCompanions);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[AIChatScreen] companions load failed', error);
        }

        if (!cancelled) {
          setCompanions([]);
        }
      }
    }

    void loadCompanionsForAssistant();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (launchParams?.conversationId) {
      setConversationId(launchParams.conversationId);
    }

    setQuickActionContext(launchParams);
    setShowQuickActions(!launchParams?.quickActionId && !launchParams?.initialPrompt);

    if (launchParams?.quickActionId) {
      setMessages([
        {
          fromUnity: true,
          id: `welcome_${launchParams.quickActionId}`,
          text: getWelcomeMessage(launchParams),
        },
      ]);
      return;
    }

    if (!launchParams?.initialPrompt) {
      setMessages((current) =>
        current.length > 0 ? current : [{ fromUnity: true, id: 'intro', text: DEFAULT_WELCOME }],
      );
    }
  }, [launchParams]);

  useEffect(() => {
    const initialPrompt = launchParams?.initialPrompt?.trim();
    const promptKey = initialPrompt ? `${launchParams?.source || 'direct'}:${initialPrompt}` : null;

    if (!initialPrompt || !promptKey || initialPromptKeyRef.current === promptKey) {
      return;
    }

    initialPromptKeyRef.current = promptKey;
    void sendMessage(initialPrompt, activeMetadata);
  }, [activeMetadata, launchParams?.initialPrompt, launchParams?.source, sendMessage]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    setProfileImageLoadFailed(false);
  }, [profileImageUri]);

  const loadHistoryPage = useCallback(
    async ({ reset = false }: { reset?: boolean } = {}) => {
      const nextOffset = reset ? 0 : historyOffset;

      if (historyRequestInFlightRef.current || (!reset && !historyHasMore)) {
        return;
      }

      historyRequestInFlightRef.current = true;

      if (reset) {
        setIsHistoryLoading(true);
      } else {
        setIsHistoryPaging(true);
      }

      try {
        const data = await listGeneralAIConversations(userId, user || {}, {
          limit: HISTORY_PAGE_SIZE,
          offset: nextOffset,
        });
        const nextItems = data.conversations || [];
        setHistoryItems((current) => (reset ? nextItems : [...current, ...nextItems]));
        setHistoryOffset(
          typeof data.next_offset === 'number' ? data.next_offset : nextOffset + nextItems.length,
        );
        setHistoryHasMore(Boolean(data.has_more));
      } catch (error) {
        if (__DEV__) {
          console.warn('[AIChatScreen] history load failed', error);
        }
      } finally {
        historyRequestInFlightRef.current = false;
        setIsHistoryLoading(false);
        setIsHistoryPaging(false);
      }
    },
    [historyHasMore, historyOffset, user, userId],
  );

  function handleOpenHistory() {
    setHistoryOpen((current) => !current);

    if (historyItems.length === 0) {
      void loadHistoryPage({ reset: true });
    }
  }

  function handleHistoryScroll(event: {
    nativeEvent: {
      contentOffset: { y: number };
      contentSize: { height: number };
      layoutMeasurement: { height: number };
    };
  }) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;

    if (distanceFromBottom < 32) {
      void loadHistoryPage();
    }
  }

  async function handleSelectConversation(item: AIConversationSummary) {
    setIsHistoryLoading(true);
    try {
      const data = await loadAIConversation(item.id, userId, user || {});

      if (__DEV__) {
        console.log('[AIChatScreen] history conversation raw', data);
      }

      const restoredMessages = (data.messages || []).map((message, index) => {
        const isFromUnity = message.role !== 'human';
        const assistantPayload = isFromUnity ? parseAssistantPayload(message.content) : undefined;

        if (__DEV__ && isFromUnity) {
          console.log('[AIChatScreen] history assistant message parsed', {
            content: message.content,
            parsed: assistantPayload,
          });
        }

        return {
          ...(assistantPayload
            ? {
                apiResponse: assistantPayload.apiResponse,
                apiResponseType: assistantPayload.apiResponseType,
                renderInline: assistantPayload.renderInline,
              }
            : {}),
          fromUnity: isFromUnity,
          id: `history_${item.id}_${index}`,
          text: isFromUnity
            ? assistantPayload?.text || getAssistantResponseText(message.content)
            : normalizeAIText(message.content),
        };
      });

      setConversationId(data.conversation_id || item.id);
      setMessages(restoredMessages);
      setHistoryOpen(false);
      setQuickActionContext({ conversationId: data.conversation_id || item.id, source: 'history' });
      setShowQuickActions(false);
    } catch (error) {
      if (__DEV__) {
        console.warn('[AIChatScreen] conversation load failed', error);
      }
    } finally {
      setIsHistoryLoading(false);
    }
  }

  function handleQuickAction(label: string) {
    const quickActionLabel = label.replace(/\n/g, ' ').trim();
    const nextContext: AIChatLaunchParams = {
      quickActionGroup: quickActionLabel === 'Support' ? 'support' : 'quick_action',
      quickActionId: getQuickActionId(quickActionLabel),
      quickActionLabel,
      source: 'aichat_screen',
    };

    setQuickActionContext(nextContext);
    setMessages([
      {
        fromUnity: true,
        id: `welcome_${nextContext.quickActionId}`,
        text: getWelcomeMessage(nextContext),
      },
    ]);
    setShowQuickActions(false);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.aiChatScreen}>
      <View style={[styles.aiCard, { top: cardTop }]}>
        <Pressable
          accessibilityLabel="Back to home"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.aiCollapseButton, pressed && styles.pressedFeedback]}
        >
          <ChevronDownIcon />
        </Pressable>

        {isChatFullscreen ? (
          <Pressable
            accessibilityLabel="Exit fullscreen"
            accessibilityRole="button"
            onPress={() => setIsChatFullscreen(false)}
            style={({ pressed }) => [
              styles.aiFullscreenExitButton,
              pressed && styles.pressedFeedback,
            ]}
          >
            <FullscreenExitLineIcon />
          </Pressable>
        ) : null}

        {!isChatFullscreen ? (
          <View style={styles.aiToolbarActions}>
            <IconButton accessibilityLabel="Start a new chat" onPress={resetForNewChat}>
              <NewChatIcon />
            </IconButton>
            <Pressable
              accessibilityLabel="Open chat history"
              accessibilityRole="button"
              onPress={handleOpenHistory}
              style={({ pressed }) => [styles.aiHistoryButton, pressed && styles.pressedFeedback]}
            >
              <HistoryIcon />
              <SmallChevronIcon />
            </Pressable>
          </View>
        ) : null}

        {historyOpen ? (
          <View style={styles.aiHistoryPanel}>
            {isHistoryLoading ? (
              <ActivityIndicator color={colors.blue} />
            ) : historyItems.length === 0 ? (
              <Text style={styles.aiHistoryEmptyText}>No conversations yet.</Text>
            ) : (
              <ScrollView
                onScroll={handleHistoryScroll}
                scrollEventThrottle={120}
                showsVerticalScrollIndicator={false}
              >
                {historyItems.map((item) => (
                  <Pressable
                    accessibilityRole="button"
                    key={item.id}
                    onPress={() => handleSelectConversation(item)}
                    style={({ pressed }) => [
                      styles.aiHistoryItem,
                      pressed && styles.pressedFeedback,
                    ]}
                  >
                    <View style={styles.aiHistoryItemHeader}>
                      <Text numberOfLines={1} style={styles.aiHistoryItemTitle}>
                        {item.title || 'Conversation'}
                      </Text>
                      <Text numberOfLines={1} style={styles.aiHistoryItemDate}>
                        {formatHistoryDate(item.updated_at)}
                      </Text>
                    </View>
                    <Text numberOfLines={2} style={styles.aiHistoryItemPreview}>
                      {item.last_message
                        ? getHistoryPreviewText(item.last_message)
                        : 'Tap to resume'}
                    </Text>
                  </Pressable>
                ))}
                {isHistoryPaging ? (
                  <View style={styles.aiHistoryFooter}>
                    <ActivityIndicator color={colors.blue} size="small" />
                  </View>
                ) : null}
              </ScrollView>
            )}
          </View>
        ) : null}

        <View style={[styles.aiCardContent, isChatFullscreen && styles.aiCardContentFullscreen]}>
          {!isChatFullscreen ? (
            <>
              <View style={styles.aiBrandBlock}>
                <View style={styles.aiLogoRing}>
                  <Image source={figmaUmojeeEmblemImage} style={styles.aiLogoLarge} />
                </View>
                <Text style={styles.aiBrandTitle}>Umojee</Text>
              </View>

              <View style={styles.aiDivider} />

              {showQuickActions && !hasUserMessage ? (
                <View style={styles.aiQuickSection}>
                  <Text style={styles.aiQuickTitle}>Quick actions</Text>
                  <ScrollView
                    horizontal
                    contentContainerStyle={styles.aiQuickActions}
                    showsHorizontalScrollIndicator={false}
                    style={styles.aiQuickViewport}
                  >
                    {quickActions.map((action) => {
                      const Icon = action.icon;

                      return (
                        <Pressable
                          accessibilityRole="button"
                          key={action.label}
                          onPress={() => handleQuickAction(action.label)}
                          style={({ pressed }) => [
                            styles.aiQuickAction,
                            pressed && styles.pressedFeedback,
                          ]}
                        >
                          <View style={[styles.aiQuickIcon, { backgroundColor: action.color }]}>
                            <Icon style={styles.aiQuickIconImage} />
                          </View>
                          <Text style={styles.aiQuickLabel}>{action.label}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </>
          ) : null}

          <ScrollView
            ref={scrollRef}
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={[
              styles.aiMessages,
              isChatFullscreen && styles.aiMessagesFullscreen,
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            onContentSizeChange={() => scrollToBottom(true)}
            onLayout={() => scrollToBottom(false)}
            scrollEnabled
            style={[
              styles.aiMessageViewport,
              isChatFullscreen && styles.aiMessageViewportFullscreen,
            ]}
          >
            <View style={styles.aiChatTopCap}>
              <ChatContainerTopCap />
            </View>

            {messages.map((message) => (
              <ChatBubble
                actions={message.actions}
                apiResponse={message.apiResponse}
                apiResponseType={message.apiResponseType}
                fromUnity={message.fromUnity}
                key={message.id}
                onUserAvatarError={() => setProfileImageLoadFailed(true)}
                renderInline={message.renderInline}
                userAvatarSource={userAvatarSource}
              >
                {message.text}
              </ChatBubble>
            ))}

            {isLoading ? <ChatBubble fromUnity>Thinking...</ChatBubble> : null}
          </ScrollView>

          {!isChatFullscreen ? (
            <Pressable
              accessibilityLabel="Enter fullscreen"
              accessibilityRole="button"
              onPress={() => setIsChatFullscreen(true)}
              style={({ pressed }) => [styles.aiFullscreenLine, pressed && styles.pressedFeedback]}
            >
              <FullscreenLineIcon />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.aiInputBar}>
        <PlusCircleIcon />
        <TextInput
          accessibilityLabel="Message UNITY"
          editable={!isLoading}
          onChangeText={setDraft}
          onSubmitEditing={() => sendMessage(draft)}
          placeholder="Where would you like to go?"
          placeholderTextColor="#101828"
          returnKeyType="send"
          style={styles.aiPlaceholder}
          value={draft}
        />
        <LinearGradient
          colors={['#DF1A21', '#002AFF', '#00FF2F', '#FFFF00']}
          locations={[0, 0.34, 0.67, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiMicGradientRing}
        >
          <Pressable
            accessibilityLabel="Open voice chat"
            accessibilityRole="button"
            onPress={onOpenVoice}
            style={({ pressed }) => [styles.aiMicButton, pressed && styles.pressedFeedback]}
          >
            <MicIcon />
          </Pressable>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

function ChatBubble({
  actions,
  apiResponse,
  apiResponseType,
  children,
  fromUnity = false,
  onUserAvatarError,
  renderInline = false,
  userAvatarSource = defaultProfileImage,
}: {
  actions?: string[];
  apiResponse?: unknown;
  apiResponseType?: string | null;
  children: ReactNode;
  fromUnity?: boolean;
  onUserAvatarError?: () => void;
  renderInline?: boolean;
  userAvatarSource?: { uri: string } | number;
}) {
  const copyText = typeof children === 'string' ? children : '';
  const shouldRenderJourneyCard =
    fromUnity && renderInline && apiResponseType === 'journey_details_card' && apiResponse;

  function handleCopy() {
    if (copyText) {
      void Clipboard.setStringAsync(copyText);
    }
  }

  return (
    <View
      style={[styles.chatBubbleRow, fromUnity ? styles.chatBubbleLeft : styles.chatBubbleRight]}
    >
      {fromUnity ? <Image source={unityChatAvatarImage} style={styles.chatBubbleAvatar} /> : null}
      <View style={styles.chatBubbleColumn}>
        <View
          style={[styles.chatBubble, fromUnity ? styles.chatBubbleUnity : styles.chatBubbleUser]}
        >
          <Text style={[styles.chatBubbleText, !fromUnity && styles.chatBubbleUserText]}>
            {children}
          </Text>
          {copyText ? (
            <Pressable
              accessibilityLabel="Copy message"
              accessibilityRole="button"
              onPress={handleCopy}
              style={({ pressed }) => [
                styles.chatBubbleCopyButton,
                pressed && styles.pressedFeedback,
              ]}
            >
              <CopyIcon color={fromUnity ? '#667085' : '#FFFFFF'} />
            </Pressable>
          ) : null}
          {actions ? (
            <View style={styles.chatActionStack}>
              {actions.map((action) => (
                <Pressable
                  accessibilityRole="button"
                  key={action}
                  style={({ pressed }) => [
                    styles.chatActionButton,
                    pressed && styles.pressedFeedback,
                  ]}
                >
                  <Text style={styles.chatActionButtonText}>{action}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        {shouldRenderJourneyCard ? <InlineJourneyDetailsCard payload={apiResponse} /> : null}
      </View>
      {!fromUnity ? (
        <Image
          onError={onUserAvatarError}
          source={userAvatarSource}
          style={styles.chatBubbleAvatarRight}
        />
      ) : null}
    </View>
  );
}

function CopyIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 20 20">
      <Path
        d="M7.5 6.5h6a2 2 0 012 2v6a2 2 0 01-2 2h-6a2 2 0 01-2-2v-6a2 2 0 012-2z"
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M4.5 12.5h-.25a1.75 1.75 0 01-1.75-1.75v-6.5A1.75 1.75 0 014.25 2.5h6.5a1.75 1.75 0 011.75 1.75v.25"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
      />
    </Svg>
  );
}

function ChatContainerTopCap() {
  return (
    <View style={styles.aiChatTopCapInner}>
      <View style={styles.aiChatTopHeader}>
        <View style={styles.aiChatTopLogo}>
          <Image source={figmaUmojeeEmblemImage} style={styles.aiChatTopLogoImage} />
        </View>
        <Text style={styles.aiChatTopTitle}>UNITY</Text>
        <View style={styles.aiChatTopStatusDot} />
        <Text style={styles.aiChatTopStatusText}>Online</Text>
      </View>
    </View>
  );
}

function IconButton({
  accessibilityLabel,
  children,
  onPress,
}: {
  accessibilityLabel: string;
  children: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.aiToolbarButton, pressed && styles.pressedFeedback]}
    >
      {children}
    </Pressable>
  );
}

function ChevronDownIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M7 10l5 5 5-5"
        stroke="#002AFF"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SmallChevronIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 15 15">
      <Path
        d="M4.5 6l3 3 3-3"
        stroke="#FFFFFF"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function NewChatIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Path
        d="M5 4.5h6.5a3.5 3.5 0 013.5 3.5v2.25a3.5 3.5 0 01-3.5 3.5H8.25L5 16v-2.25A3.5 3.5 0 011.5 10.25V8A3.5 3.5 0 015 4.5z"
        fill="#FFFFFF"
      />
      <Path
        d="M10 7.25v4.5M7.75 9.5h4.5"
        stroke="#002AFF"
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

function HistoryIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Path
        d="M4.5 6.3A6 6 0 1110 16a6 6 0 01-5.35-3.28"
        stroke="#FFFFFF"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M4.5 6.3V3.5M4.5 6.3h2.9M10 6.5v4l2.7 1.6"
        stroke="#FFFFFF"
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusCircleIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 19 19">
      <Path
        d="M9.5 17.4a7.9 7.9 0 100-15.8 7.9 7.9 0 000 15.8zM9.5 6.2v6.6M6.2 9.5h6.6"
        fill="none"
        stroke={colors.ink}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function MicIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Path
        d="M8 10.3a2.4 2.4 0 002.4-2.4V4.1a2.4 2.4 0 00-4.8 0v3.8A2.4 2.4 0 008 10.3z"
        fill="none"
        stroke={colors.ink}
        strokeWidth={1.4}
      />
      <Path
        d="M3.9 7.8a4.1 4.1 0 008.2 0M8 11.9v2.4M6 14.3h4"
        fill="none"
        stroke={colors.ink}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}
