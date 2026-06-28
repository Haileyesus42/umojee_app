import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../constants/colors';
import { styles as appStyles } from '../../theme/styles';
import ChatNewFillIcon from '../../../assets/icons/voice_chat_assets/chat-new-fill.svg';
import HideChatIcon from '../../../assets/icons/voice_chat_assets/Hide-Chat-Icon.svg';
import HistoryFillIcon from '../../../assets/icons/voice_chat_assets/History-Icon.svg';

const umojeeEmblemImage = require('../../../assets/icons/voice_chat_assets/Umojee-Emblem.png');
const nexusAiAgentEmblemImage = require('../../../assets/icons/voice_chat_assets/Nexus-AI-Agent-Emblem.png');

type VoiceChatScreenProps = {
  onBack?: () => void;
};

export function VoiceChatScreen({ onBack }: VoiceChatScreenProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { height } = useWindowDimensions();
  const cardTop = Math.max(50, Math.round(height * 0.06));
  const transcriptionText =
    '"Book me an American Airlines flight from JFK to LAX on Wednesday, March 4 at 10:30 AM for two adults..."';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={voiceStyles.screen}>
      <View style={[voiceStyles.card, { top: cardTop }]}>
        <Pressable
          accessibilityLabel="Back to chat"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [
            voiceStyles.collapseButton,
            pressed && appStyles.pressedFeedback,
          ]}
        >
          <HideChatIcon height={24} width={24} />
        </Pressable>

        <View style={voiceStyles.voiceContainer}>
          <View style={voiceStyles.topRow}>
            <Text style={voiceStyles.prompt}>Start speaking...</Text>
            <View style={voiceStyles.toolbarActions}>
              <IconButton accessibilityLabel="Start a new voice chat">
                <ChatNewFillIcon height={20} width={20} />
              </IconButton>
              <Pressable
                accessibilityLabel="Open voice chat history"
                accessibilityRole="button"
                style={({ pressed }) => [
                  voiceStyles.historyButton,
                  pressed && appStyles.pressedFeedback,
                ]}
              >
                <HistoryFillIcon height={32} width={52} />
              </Pressable>
            </View>
          </View>

          <View style={voiceStyles.voiceCenterGroup}>
            <Text style={voiceStyles.listening}>Listening...</Text>

            <View style={voiceStyles.logoWrap}>
              <View style={voiceStyles.logoHaloOuter} />
              <View style={voiceStyles.logoHaloInner} />
              <LinearGradient
                colors={['#DF1A21', '#002AFF', '#00FF2F', '#FFFF00']}
                locations={[0, 0.34, 0.67, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={voiceStyles.logoGradientRing}
              >
                <View style={voiceStyles.logoCircle}>
                  <Image source={umojeeEmblemImage} style={voiceStyles.umojeeLogo} />
                </View>
              </LinearGradient>
            </View>
          </View>

          <View style={voiceStyles.poweredRow}>
            <Text style={voiceStyles.poweredText}>Powered by NEXUS AI</Text>
            <Image source={nexusAiAgentEmblemImage} style={voiceStyles.nexusLogo} />
          </View>
        </View>
      </View>

      <Pressable
        accessibilityLabel={
          isTranscribing ? 'Stop voice transcription' : 'Start voice transcription'
        }
        accessibilityRole="button"
        onPress={() => setIsTranscribing((value) => !value)}
        style={({ pressed }) => [
          voiceStyles.inputBar,
          isTranscribing && voiceStyles.inputBarExpanded,
          pressed && appStyles.pressedFeedback,
        ]}
      >
        {isTranscribing ? (
          <Text style={voiceStyles.transcribingText}>
            <Text style={voiceStyles.transcribingItalic}>{transcriptionText}</Text>
            {'\n\n'}
            <Text style={voiceStyles.transcribingStatus}>[Transcribing]</Text>
          </Text>
        ) : (
          <>
            <PlusCircleIcon />
            <Text style={voiceStyles.placeholder}>Where would you like to go?</Text>
            <LinearGradient
              colors={['#DF1A21', '#002AFF', '#00FF2F', '#FFFF00']}
              locations={[0, 0.34, 0.67, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={voiceStyles.micGradientRing}
            >
              <View style={voiceStyles.micButton}>
                <MicIcon />
              </View>
            </LinearGradient>
          </>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

function IconButton({
  accessibilityLabel,
  children,
}: {
  accessibilityLabel: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={({ pressed }) => [voiceStyles.toolbarButton, pressed && appStyles.pressedFeedback]}
    >
      {children}
    </Pressable>
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

const voiceStyles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 23,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 40,
    borderWidth: 1,
    bottom: 109,
    elevation: 10,
    left: 20,
    maxWidth: 354,
    overflow: 'hidden',
    position: 'absolute',
    right: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    width: '100%',
  },
  collapseButton: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    left: 165,
    position: 'absolute',
    top: 9,
    width: 24,
    zIndex: 4,
  },
  toolbarActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  toolbarButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 5,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  historyButton: {
    alignItems: 'center',
    borderRadius: 5,
    height: 32,
    justifyContent: 'center',
    width: 52,
  },
  voiceContainer: {
    alignItems: 'center',
    bottom: 18,
    justifyContent: 'space-between',
    left: 33,
    position: 'absolute',
    right: 33,
    top: 69,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  prompt: {
    color: colors.ink,
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 28,
    marginRight: 16,
  },
  voiceCenterGroup: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    marginTop: 24,
  },
  listening: {
    color: colors.ink,
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 2.4,
    lineHeight: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
    width: 92,
  },
  logoWrap: {
    height: 170,
    position: 'relative',
    width: 170,
  },
  logoHaloOuter: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 85,
    height: 168,
    left: 0,
    opacity: 0,
    position: 'absolute',
    top: 0,
    width: 168,
  },
  logoHaloInner: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 74,
    height: 148,
    left: 10,
    opacity: 0.13,
    position: 'absolute',
    top: 10,
    width: 148,
  },
  logoGradientRing: {
    alignItems: 'center',
    borderRadius: 65,
    elevation: 12,
    height: 130,
    justifyContent: 'center',
    left: 20,
    padding: 3,
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    top: 20,
    width: 130,
  },
  logoCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 62,
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  umojeeLogo: {
    height: 89,
    width: 89,
  },
  poweredRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  poweredText: {
    color: colors.ink,
    fontFamily: 'DM Sans',
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 2.4,
    lineHeight: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  nexusLogo: {
    height: 53,
    marginLeft: -13,
    width: 64,
  },
  inputBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    bottom: 27,
    elevation: 6,
    flexDirection: 'row',
    height: 58,
    left: 20,
    paddingLeft: 25,
    paddingRight: 21,
    position: 'absolute',
    right: 21,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  inputBarExpanded: {
    alignItems: 'flex-start',
    borderColor: '#E5E7EB',
    borderRadius: 20,
    borderWidth: 1,
    bottom: 96,
    height: 166,
    paddingHorizontal: 27,
    paddingTop: 23,
  },
  placeholder: {
    color: '#101828',
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginLeft: 21,
  },
  micGradientRing: {
    alignItems: 'center',
    borderRadius: 16,
    height: 31,
    justifyContent: 'center',
    padding: 2.5,
    width: 31,
  },
  micButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 13.5,
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  transcribingItalic: {
    fontStyle: 'italic',
    fontWeight: '400',
  },
  transcribingStatus: {
    fontWeight: '700',
  },
  transcribingText: {
    color: '#101828',
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
    width: '100%',
  },
});
