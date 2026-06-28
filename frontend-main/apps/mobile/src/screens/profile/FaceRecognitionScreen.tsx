
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import CheckboxCircleFillIcon from '../../../assets/icons/face-recognition/checkbox-circle-fill.svg';
import CircleLineIcon from '../../../assets/icons/face-recognition/circle-line.svg';
import HandIcon from '../../../assets/icons/face-recognition/hand.svg';
import Loader4LineIcon from '../../../assets/icons/face-recognition/loader-4-line.svg';
import User3FillIcon from '../../../assets/icons/face-recognition/user-3-fill.svg';
import { verifyFace, verifyPalm } from '../../api/biometrics';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/navigation/Footer';
import { colors } from '../../constants/colors';
import { styles as sharedStyles } from '../../theme/styles';

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------


type FaceRecognitionScreenProps = {
  userId: string;  // ← NEW
  hasPalm?: boolean;
  notificationUnreadCount?: number;
  onOpenChat: () => void;
  onOpenHome: () => void;
  onOpenJourneys?: () => void;
  onOpenNotifications: () => void;
  onOpenTravelSupport?: () => void;
  onVerified: () => void;
  purpose?: 'account' | 'wallet';
};

type VerificationStep = 'faceScanning' | 'faceSuccess' | 'palmScanning' | 'palmSuccess';

const authenticationCopy = {
  account: {
    title: 'Account Management Authentication',
    successProgressText: 'Opening Account Management...',
  },
  wallet: {
    title: 'Wallet Authentication',
    successProgressText: 'Opening Wallet...',
  },
} as const;

function createCancellableDelay(ms: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  const promise = new Promise<void>((resolve) => {
    timeoutId = setTimeout(resolve, ms);
  });
  return {
    promise,
    cancel: () => clearTimeout(timeoutId),
  };
}

// ---------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------
export function FaceRecognitionScreen({
  userId,  // ← NEW
  hasPalm = false,
  notificationUnreadCount = 0,
  onOpenChat,
  onOpenHome,
  onOpenJourneys,
  onOpenNotifications,
  onOpenTravelSupport,
  onVerified,
  purpose = 'account',
}: FaceRecognitionScreenProps) {
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('faceScanning');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const delayRef = useRef<{ cancel: () => void } | null>(null);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const isCapturing = useRef(false);
  const [verifying, setVerifying] = useState(false);

  const copy = authenticationCopy[purpose];
  const isFaceSuccess = verificationStep === 'faceSuccess';
  const isPalmStep = verificationStep === 'palmScanning' || verificationStep === 'palmSuccess';
  const isPalmSuccess = verificationStep === 'palmSuccess';
  const isScanSuccess = isFaceSuccess || isPalmSuccess;

  useEffect(() => {
    return () => {
      delayRef.current?.cancel();
    };
  }, []);

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Access Required',
          'Please enable camera permissions in your device settings to complete biometric verification.',
        );
        return;
      }
    }
    setIsCameraOpen(true);
  };

  const handlePhotoTaken = useCallback(
  async (uri: string) => {
    console.log('[FaceRecognition] handlePhotoTaken called, step:', verificationStep);
    
    setIsCameraOpen(false);
    isCapturing.current = false;
    setVerifying(true);

    try {
      let result;
      if (verificationStep === 'faceScanning') {
        result = await verifyFace(uri, userId);
      } else {
        result = await verifyPalm(uri, userId);
      }

      console.log('[FaceRecognition] Verification result:', result);

      if (result.success && result.match) {
        if (verificationStep === 'faceScanning') {
          console.log('[FaceRecognition] Face success → checking palm enrollment');
          setVerificationStep('faceSuccess');
          
          await new Promise<void>((resolve) => {
            const timeoutId = setTimeout(resolve, 1600);
            delayRef.current = { cancel: () => clearTimeout(timeoutId) };
          });
          
          if (hasPalm) {
            // Palm is enrolled → proceed to palm scanning
            console.log('[FaceRecognition] Palm enrolled → transitioning to palm scan');
            setVerificationStep('palmScanning');
          } else {
            // No palm enrolled → face alone is sufficient
            console.log('[FaceRecognition] No palm enrolled → calling onVerified()');
            try {
              onVerified();
              console.log('[FaceRecognition] onVerified() called successfully');
            } catch (error) {
              console.error('[FaceRecognition] onVerified() threw error:', error);
              Alert.alert('Navigation Error', 'Failed to navigate. Please try again.');
            }
          }

        } else if (verificationStep === 'palmScanning') {
          console.log('[FaceRecognition] Palm success → showing success state');
          setVerificationStep('palmSuccess');
          
          await new Promise<void>((resolve) => {
            const timeoutId = setTimeout(resolve, 1600);
            delayRef.current = { cancel: () => clearTimeout(timeoutId) };
          });
          
          console.log('[FaceRecognition] Delay complete → calling onVerified()');
          try {
            onVerified();
            console.log('[FaceRecognition] onVerified() called successfully');
          } catch (error) {
            console.error('[FaceRecognition] onVerified() threw error:', error);
            Alert.alert('Navigation Error', 'Failed to navigate. Please try again.');
          }
        }
      } else {
        console.log('[FaceRecognition] Verification failed:', result.message);
        Alert.alert(
          'Verification Failed',
          result.message || 'Could not verify your identity. Please try again.',
        );
      }
    } catch (error) {
      console.error('[FaceRecognition] Verification error:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Verification failed. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      console.log('[FaceRecognition] Setting verifying to false');
      setVerifying(false);
    }
  },
  [verificationStep, onVerified, userId, hasPalm],  // ← hasPalm added to deps
);

  const cancelCamera = () => {
    setIsCameraOpen(false);
    isCapturing.current = false;
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing.current) return;
    isCapturing.current = true;
    try {
      const photo: CameraCapturedPicture | undefined = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });
      if (photo?.uri) {
        await handlePhotoTaken(photo.uri);
      } else {
        isCapturing.current = false;
      }
    } catch (error) {
      console.error('Failed to take picture:', error);
      Alert.alert('Capture Failed', 'Could not capture image. Please try again.');
      isCapturing.current = false;
    }
  };

  const openFallbackPicker = async () => {
    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Camera Access Required', 'Please enable camera permissions in settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await handlePhotoTaken(result.assets[0].uri);
    }
  };

const handleScanFramePress = async () => {
  if (isScanSuccess || verifying) return;
  
  if (!permission?.granted) {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Camera Access Required',
        'Please enable camera permissions in your device settings.',
      );
      return;
    }
  }
  // Always use in-app camera, never fallback picker for biometrics
  openCamera();
};

  const toggleFlash = () => {
    setFlashMode((prev) => (prev === 'off' ? 'on' : 'off'));
  };

  const instructionText = (() => {
    if (isPalmSuccess) return 'Palm Recognition Successful';
    if (verificationStep === 'palmScanning') return 'Place your right palm inside the frame';
    if (isFaceSuccess) return 'Facial Recognition Successful';
    return 'Align your face inside the frame';
  })();

  return (
    <SafeAreaView edges={['left', 'right']} style={sharedStyles.screen}>
      <SafeAreaView edges={['top']} style={sharedStyles.headerSafeArea}>
        <Header
          notificationUnreadCount={notificationUnreadCount}
          onOpenHome={onOpenHome}
          onOpenNotifications={onOpenNotifications}
        />
      </SafeAreaView>

      <View style={s.body}>
        <View style={[s.content, s.card]}>
          <View style={s.headingContainer}>
            <View style={s.lockTile}>
              <LockIcon />
            </View>
            <Text style={s.title}>{copy.title}</Text>
          </View>

          <View style={s.authBlock}>
            <View style={s.stepIndicator}>
              {isFaceSuccess ? (
                <CheckboxCircleFillIcon height={44} width={44} />
              ) : (
                <CircleLineIcon height={44} width={44} />
              )}
              {isPalmSuccess ? (
                <CheckboxCircleFillIcon height={44} width={44} />
              ) : isPalmStep ? (
                <CircleLineIcon height={44} width={44} />
              ) : (
                <StepCircle />
              )}
            </View>

            <Text style={s.sectionTitle}>
              {isPalmStep ? 'Palm Recognition' : 'Facial Recognition'}
            </Text>

            <TouchableOpacity
              style={[s.frame, isPalmStep ? s.framePalm : s.frameFace, isScanSuccess && s.frameDone]}
              onPress={handleScanFramePress}
              disabled={isScanSuccess || verifying}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={
                isScanSuccess
                  ? `${isPalmSuccess ? 'Palm' : 'Face'} scan complete`
                  : `Tap to ${isPalmStep ? 'scan palm' : 'scan face'}`
              }
            >
              <CornerBracket position="topLeft" />
              <CornerBracket position="topRight" />
              <CornerBracket position="bottomLeft" />
              <CornerBracket position="bottomRight" />

              {isScanSuccess ? (
                <CheckboxCircleFillIcon height={56} width={56} />
              ) : isPalmStep ? (
                <HandIcon height={80} width={80} />
              ) : (
                <User3FillIcon height={80} width={80} />
              )}
            </TouchableOpacity>

            <Text style={[s.instruction, isScanSuccess && s.instructionSuccess]}>
              {instructionText}
            </Text>

            {isPalmSuccess ? (
              <View style={s.progressRow}>
                <Loader4LineIcon height={18} width={18} />
                <Text style={s.progressText}>{copy.successProgressText}</Text>
              </View>
            ) : (
              <View style={s.hint}>
                <CircleLineIcon height={14} width={14} />
                <Text style={s.hintText}>
                  {verifying ? 'Verifying...' : 'Tap the frame to scan'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <Footer
        onOpenChat={onOpenChat}
        onOpenFlow={onOpenTravelSupport}
        onOpenHome={onOpenHome}
        onOpenTrips={onOpenJourneys}
        source="home"
      />

      {/* Loading overlay */}
      {verifying && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={s.loadingText}>
            {verificationStep === 'faceScanning' ? 'Verifying face...' : 'Verifying palm...'}
          </Text>
        </View>
      )}

    <Modal visible={isCameraOpen} animationType="slide" onRequestClose={cancelCamera}>
      <View style={s.modalContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          flash={flashMode}
        />
        <CameraOverlay
          step={verificationStep}
          flashActive={flashMode === 'on'}
          onCapture={takePicture}
          onClose={cancelCamera}
          onFlashToggle={toggleFlash}
        />
      </View>
    </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------
// Corner Bracket
// ---------------------------------------------------------------------
function CornerBracket({
  position,
}: {
  position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}) {
  const size = 40;
  const thickness = 4;

  const baseStyle = {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderColor: '#22C55E',
  };

  const positionStyles = {
    topLeft: {
      top: -2,
      left: -2,
      borderTopWidth: thickness,
      borderLeftWidth: thickness,
      borderTopLeftRadius: 8,
    },
    topRight: {
      top: -2,
      right: -2,
      borderTopWidth: thickness,
      borderRightWidth: thickness,
      borderTopRightRadius: 8,
    },
    bottomLeft: {
      bottom: -2,
      left: -2,
      borderBottomWidth: thickness,
      borderLeftWidth: thickness,
      borderBottomLeftRadius: 8,
    },
    bottomRight: {
      bottom: -2,
      right: -2,
      borderBottomWidth: thickness,
      borderRightWidth: thickness,
      borderBottomRightRadius: 8,
    },
  };

  return <View style={[baseStyle, positionStyles[position]]} />;
}

// ---------------------------------------------------------------------
// Camera Overlay
// ---------------------------------------------------------------------
function CameraOverlay({
  step,
  flashActive,
  onCapture,
  onClose,
  onFlashToggle,
}: {
  step: VerificationStep;
  flashActive: boolean;
  onCapture: () => void;
  onClose: () => void;
  onFlashToggle: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const isPalm = step === 'palmScanning' || step === 'palmSuccess';
  const size = Math.min(width * 0.85, 340);
  const top = height * 0.22;
  const left = (width - size) / 2;

  return (
    <View style={s.overlay}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.iconBtn} onPress={onClose}>
          <CloseIcon />
        </TouchableOpacity>
        <Text style={s.topTitle}>{isPalm ? 'Palm Scan' : 'Face Scan'}</Text>
        <TouchableOpacity
          style={[s.iconBtn, flashActive && s.iconBtnActive]}
          onPress={onFlashToggle}
        >
          <FlashIcon active={flashActive} />
        </TouchableOpacity>
      </View>

      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          top,
          left,
        }}
      >
        <CamCorner position="topLeft" />
        <CamCorner position="topRight" />
        <CamCorner position="bottomLeft" />
        <CamCorner position="bottomRight" />
      </View>

      <Text style={[s.camHint, { top: top + size + 24 }]}>
        {isPalm ? 'Place palm in frame' : 'Align face in frame'}
      </Text>

      <View style={s.shutterWrap}>
        <TouchableOpacity style={s.shutterOuter} onPress={onCapture} activeOpacity={0.7}>
          <View style={s.shutterInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CamCorner({
  position,
}: {
  position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}) {
  const size = 50;
  const thickness = 4;
  const radius = 12;

  const base = {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderColor: '#FFFFFF',
  };

  const positions = {
    topLeft: {
      top: 0,
      left: 0,
      borderTopWidth: thickness,
      borderLeftWidth: thickness,
      borderTopLeftRadius: radius,
    },
    topRight: {
      top: 0,
      right: 0,
      borderTopWidth: thickness,
      borderRightWidth: thickness,
      borderTopRightRadius: radius,
    },
    bottomLeft: {
      bottom: 0,
      left: 0,
      borderBottomWidth: thickness,
      borderLeftWidth: thickness,
      borderBottomLeftRadius: radius,
    },
    bottomRight: {
      bottom: 0,
      right: 0,
      borderBottomWidth: thickness,
      borderRightWidth: thickness,
      borderBottomRightRadius: radius,
    },
    
  };

  return <View style={[base, positions[position]]} />;
}

// ---------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------
function LockIcon() {
  return (
    <Svg height={20} width={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" fill="#002AFF" />
    </Svg>
  );
}

function StepCircle() {
  return (
    <Svg height={44} viewBox="0 0 44 44" width={44}>
      <Circle cx={22} cy={22} fill="transparent" r={16} stroke="#BBF7D0" strokeWidth={3} />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg height={16} width={16} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M6 18L18 6" stroke="#FFF" strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function FlashIcon({ active }: { active: boolean }) {
  const color = active ? '#FBBF24' : '#FFFFFF';
  return (
    <Svg height={18} width={18} viewBox="0 0 24 24">
      <Path
        d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
        fill={active ? color : 'none'}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------
const s = StyleSheet.create({
  body: { flex: 1, backgroundColor: colors.panel, paddingBottom: 122 },
  content: {
    alignSelf: 'center',
    maxWidth: 402,
    width: '100%',
    marginTop: 10,
  },
  modalContainer: {
  flex: 1,
  backgroundColor: '#000',
},

  card: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 24,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  headingContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  lockTile: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginBottom: 10,
    width: 40,
  },
  title: {
    color: colors.ink,
    fontFamily: 'DM Sans',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    textAlign: 'center',
  },
  authBlock: {
    alignItems: 'center',
    marginTop: 12,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 6,
    width: 100,
    justifyContent: 'center',
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: 'DM Sans',
    fontSize: 20,
    lineHeight: 28,
    marginTop: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  frame: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  frameFace: { width: 250, height: 250, borderRadius: 125 },
  framePalm: { width: 250, height: 250, borderRadius: 24 },
  frameDone: { backgroundColor: '#F0FDF4' },

  instruction: {
    marginTop: 20,
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'DM Sans',
    textAlign: 'center',
  },
  instructionSuccess: { color: '#22C55E', fontWeight: '600' },

  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  hintText: { color: '#6B7280', fontSize: 13, fontFamily: 'DM Sans' },

  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  progressText: {
    color: colors.ink,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 16,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },

  camera: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
  },
  topTitle: { color: '#FFF', fontSize: 14, fontWeight: '600', fontFamily: 'DM Sans' },
  camHint: {
    position: 'absolute',
    left: 20,
    right: 20,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'DM Sans',
  },
  shutterWrap: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFF',
  },
});