import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../constants/colors';
import { quickActions } from '../../data/homeData';
import { styles } from '../../theme/styles';
import type { AIChatLaunchParams } from '../../types/aiChat';

type AssistantOverlayProps = {
  onClose: () => void;
  onOpenChat: (params?: AIChatLaunchParams) => void;
  onOpenVoice: () => void;
  visible: boolean;
};

const SUPPORT_ACTIONS = [
  {
    quickActionGroup: 'support',
    quickActionId: 'support_reschedule_trip',
    quickActionLabel: 'Reschedule Trip',
  },
  {
    quickActionGroup: 'support',
    quickActionId: 'support_cancel_trip',
    quickActionLabel: 'Cancel Trip',
  },
  {
    quickActionGroup: 'support',
    quickActionId: 'support_lost_luggage',
    quickActionLabel: 'Lost Luggage',
  },
] as const;

function getQuickActionId(label: string) {
  return label
    .replace(/\n/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function AssistantOverlay({
  onClose,
  onOpenChat,
  onOpenVoice,
  visible,
}: AssistantOverlayProps) {
  const [supportMenuVisible, setSupportMenuVisible] = useState(false);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    if (!visible) {
      setSupportMenuVisible(false);
      setPrompt('');
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  function handleClose() {
    setSupportMenuVisible(false);
    onClose();
  }

  function openChat(params?: AIChatLaunchParams) {
    setSupportMenuVisible(false);
    onOpenChat(params ? { source: 'assistant_overlay', ...params } : undefined);
  }

  function handleSubmitPrompt() {
    const initialPrompt = prompt.trim();

    if (!initialPrompt) {
      return;
    }

    setPrompt('');
    openChat({
      initialPrompt,
      source: 'assistant_overlay',
    });
  }

  function handleQuickAction(label: string) {
    if (label === 'Support') {
      setSupportMenuVisible((current) => !current);
      return;
    }

    const quickActionLabel = label.replace(/\n/g, ' ').trim();

    openChat({
      quickActionGroup: 'quick_action',
      quickActionId: getQuickActionId(quickActionLabel),
      quickActionLabel,
      source: 'assistant_overlay',
    });
  }

  return (
    <View style={styles.assistantOverlayRoot} pointerEvents="box-none">
      <Pressable
        accessibilityLabel="Close assistant"
        accessibilityRole="button"
        onPress={handleClose}
        style={styles.assistantOverlayBackdrop}
      />
      {supportMenuVisible ? (
        <Pressable
          accessibilityLabel="Close support options"
          accessibilityRole="button"
          onPress={() => setSupportMenuVisible(false)}
          style={styles.assistantSupportBackdrop}
        />
      ) : null}
      {supportMenuVisible ? (
        <View style={styles.assistantSupportMenu}>
          <Pressable
            accessibilityRole="button"
            onPress={() => openChat(SUPPORT_ACTIONS[0])}
            style={({ pressed }) => [
              styles.assistantSupportMenuItem,
              pressed && styles.pressedFeedback,
            ]}
          >
            <SupportClockIcon />
            <Text style={styles.assistantSupportMenuText}>Reschedule Trip</Text>
          </Pressable>
          <View style={styles.assistantSupportMenuDivider} />
          <Pressable
            accessibilityRole="button"
            onPress={() => openChat(SUPPORT_ACTIONS[1])}
            style={({ pressed }) => [
              styles.assistantSupportMenuItem,
              pressed && styles.pressedFeedback,
            ]}
          >
            <SupportCancelIcon />
            <Text style={styles.assistantSupportMenuText}>Cancel Trip</Text>
          </Pressable>
          <View style={styles.assistantSupportMenuDivider} />
          <Pressable
            accessibilityRole="button"
            onPress={() => openChat(SUPPORT_ACTIONS[2])}
            style={({ pressed }) => [
              styles.assistantSupportMenuItem,
              pressed && styles.pressedFeedback,
            ]}
          >
            <SupportLuggageIcon />
            <Text style={styles.assistantSupportMenuText}>Lost Luggage</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.assistantOverlaySheet}>
        <Pressable
          accessibilityLabel="Close assistant"
          accessibilityRole="button"
          onPress={handleClose}
          style={({ pressed }) => [styles.assistantOverlayClose, pressed && styles.pressedFeedback]}
        >
          <CloseIcon />
        </Pressable>

        <View style={styles.assistantOverlayInput}>
          <PlusCircleIcon />
          <TextInput
            accessibilityLabel="Ask Umoja assistant"
            onChangeText={setPrompt}
            onSubmitEditing={handleSubmitPrompt}
            placeholder="How can I help you?"
            placeholderTextColor="#101828"
            returnKeyType="send"
            style={styles.assistantOverlayPlaceholder}
            value={prompt}
          />
          <LinearGradient
            colors={['#DF1A21', '#002AFF', '#00FF2F', '#FFFF00']}
            locations={[0, 0.34, 0.67, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.assistantOverlayMicRing}
          >
            <Pressable
              accessibilityLabel="Open voice chat"
              accessibilityRole="button"
              onPress={(event) => {
                event.stopPropagation();
                onOpenVoice();
              }}
              style={({ pressed }) => [
                styles.assistantOverlayMicButton,
                pressed && styles.pressedFeedback,
              ]}
            >
              <MicIcon />
            </Pressable>
          </LinearGradient>
        </View>

        <ScrollView
          horizontal
          contentContainerStyle={styles.assistantOverlayActions}
          showsHorizontalScrollIndicator={false}
          style={styles.assistantOverlayActionsViewport}
        >
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Pressable
                accessibilityRole="button"
                key={action.label}
                onPress={() => handleQuickAction(action.label)}
                style={({ pressed }) => [
                  styles.assistantOverlayAction,
                  { width: action.width },
                  pressed && styles.pressedFeedback,
                ]}
              >
                <View
                  style={[styles.assistantOverlayActionIcon, { backgroundColor: action.color }]}
                >
                  <Icon style={styles.assistantOverlayActionIconImage} />
                </View>
                <Text style={styles.assistantOverlayActionLabel}>{action.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function SupportClockIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Path
        d="M10.0001 18.3333C5.39771 18.3333 1.66675 14.6023 1.66675 9.99999C1.66675 5.39761 5.39771 1.66666 10.0001 1.66666C14.6024 1.66666 18.3334 5.39761 18.3334 9.99999C18.3334 14.6023 14.6024 18.3333 10.0001 18.3333ZM10.0001 16.6667C13.682 16.6667 16.6667 13.6819 16.6667 9.99999C16.6667 6.31809 13.682 3.33332 10.0001 3.33332C6.31818 3.33332 3.33341 6.31809 3.33341 9.99999C3.33341 13.6819 6.31818 16.6667 10.0001 16.6667ZM10.8334 9.99999H14.1667V11.6667H9.16675V5.83332H10.8334V9.99999Z"
        fill="#00F088"
      />
    </Svg>
  );
}

function SupportCancelIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Path
        d="M10.0006 8.82208L14.1253 4.69727L15.3038 5.87577L11.1791 10.0006L15.3038 14.1253L14.1253 15.3038L10.0006 11.1791L5.87577 15.3038L4.69727 14.1253L8.82208 10.0006L4.69727 5.87577L5.87577 4.69727L10.0006 8.82208Z"
        fill="#DF1A21"
      />
    </Svg>
  );
}

function SupportLuggageIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Path
        d="M12.4999 2.5C12.9602 2.5 13.3333 2.8731 13.3333 3.33333V5H16.6666C17.1268 5 17.4999 5.3731 17.4999 5.83333V15.8333H19.1666V17.5H0.833252V15.8333H2.49992V5.83333C2.49992 5.3731 2.87302 5 3.33325 5H6.66659V3.33333C6.66659 2.8731 7.03969 2.5 7.49992 2.5H12.4999ZM6.66659 6.66667H4.16659V15.8333H6.66659V6.66667ZM11.6666 6.66667H8.33325V15.8333H11.6666V6.66667ZM15.8333 6.66667H13.3333V15.8333H15.8333V6.66667ZM11.6666 4.16667H8.33325V5H11.6666V4.16667Z"
        fill="#A5A5A5"
      />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 30 30">
      <Path
        d="M9.5 9.5l11 11M20.5 9.5l-11 11"
        stroke="#FFFFFF"
        fill="none"
        strokeWidth={3}
        strokeLinecap="round"
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
