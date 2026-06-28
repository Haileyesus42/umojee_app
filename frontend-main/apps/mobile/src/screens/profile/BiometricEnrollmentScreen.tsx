import { useCallback, useRef, useState } from 'react';
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
import Svg, { Path } from 'react-native-svg';
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import CheckboxCircleFillIcon from '../../../assets/icons/face-recognition/checkbox-circle-fill.svg';
import CircleLineIcon from '../../../assets/icons/face-recognition/circle-line.svg';
import HandIcon from '../../../assets/icons/face-recognition/hand.svg';
import User3FillIcon from '../../../assets/icons/face-recognition/user-3-fill.svg';
import { enrollFace, enrollPalm } from '../../api/biometrics';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/navigation/Footer';
import { colors } from '../../constants/colors';
import { styles as sharedStyles } from '../../theme/styles';

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------
type BiometricEnrollmentScreenProps = {
  mode: 'face' | 'palm';
  userId: string;
  notificationUnreadCount?: number;
  onBack: () => void;
  onEnrolled: () => void;
  onOpenChat?: () => void;
  onOpenHome: () => void;
  onOpenJourneys?: () => void;
  onOpenNotifications: () => void;
  onOpenTravelSupport?: () => void;
};

type EnrollmentStep = 'idle' | 'success';

// ---------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------
// Find the copy object and update palm instruction:
const copy = {
  face: {
    title: 'Face Enrollment',
    subtitle: 'Set up face recognition',
    instruction: 'Align your face inside the frame',
    successTitle: 'Face Enrolled Successfully',
    successMessage: 'You can now use your face for secure authentication.',
    cameraTitle: 'Face Scan',
  },
  palm: {
    title: 'Palm Enrollment',
    subtitle: 'Set up palm recognition',
    instruction: 'Hold your open palm flat, facing the camera with good lighting',  // ← Better guidance
    successTitle: 'Palm Enrolled Successfully',
    successMessage: 'You can now use your palm for secure authentication.',
    cameraTitle: 'Palm Scan',
  },
} as const;

// ---------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------
export function BiometricEnrollmentScreen({
  mode,
  userId,
  notificationUnreadCount = 0,
  onBack,
  onEnrolled,
  onOpenChat,
  onOpenHome,
  onOpenJourneys,
  onOpenNotifications,
  onOpenTravelSupport,
}: BiometricEnrollmentScreenProps) {
  const [step, setStep] = useState<EnrollmentStep>('idle');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const capturing = useRef(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [enrolling, setEnrolling] = useState(false);

  const c = copy[mode];
  const isSuccess = step === 'success';

  const openCamera = async () => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) {
        Alert.alert('Camera Required', 'Enable camera in settings to continue.');
        return;
      }
    }
    setCameraOpen(true);
  };

const handlePhotoTaken = useCallback(
  async (uri: string) => {
    setCameraOpen(false);
    capturing.current = false;
    setEnrolling(true);

    try {
      let result;
      if (mode === 'face') {
        result = await enrollFace(userId, uri, 'User Face');
      } else {
        result = await enrollPalm(userId, uri);
      }

      // ✅ Check result.success (normalized by biometrics.ts)
      if (result.success) {
        setStep('success');
      } else {
        // Only throw if backend explicitly said it failed
        throw new Error(result.message || 'Enrollment failed');
      }
    }  catch (error) {
  console.error('[BiometricEnrollment] Error:', error);
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Could not complete enrollment. Please try again.';
  Alert.alert('Enrollment Failed', errorMessage);
   }
    
    finally {
      setEnrolling(false);
    }
  },
  [mode, userId],
);

  const cancelCamera = () => {
    setCameraOpen(false);
    capturing.current = false;
  };

  const takePicture = async () => {
    if (!cameraRef.current || capturing.current) return;
    capturing.current = true;
    try {
      const photo: CameraCapturedPicture | undefined = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });
      if (photo?.uri) {
        await handlePhotoTaken(photo.uri);
      } else {
        capturing.current = false;
      }
    } catch {
      Alert.alert('Error', 'Could not capture image.');
      capturing.current = false;
    }
  };

  const fallbackCapture = async () => {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) {
      Alert.alert('Camera Required', 'Enable camera in settings.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!r.canceled && r.assets?.[0]?.uri) {
      await handlePhotoTaken(r.assets[0].uri);
    }
  };

  const handleFramePress = () => {
    if (isSuccess || enrolling) return;
    permission?.granted ? openCamera() : fallbackCapture();
  };

  const toggleFlash = () => {
    setFlashMode((prev) => (prev === 'off' ? 'on' : 'off'));
  };

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
        <View style={s.card}>
          {/* Top section */}
          <View style={s.topSection}>
            <View style={s.iconWrap}>
              <LockIcon />
            </View>
            <Text style={s.title}>{c.title}</Text>
            <Text style={s.subtitle}>{c.subtitle}</Text>
          </View>

          {/* Middle section - scan frame */}
          <View style={s.middleSection}>
            <TouchableOpacity
              style={s.frameWrap}
              onPress={handleFramePress}
              disabled={isSuccess || enrolling}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={
                isSuccess ? 'Enrollment complete' : `Tap to capture ${mode}`
              }
            >
              <CornerBracket position="topLeft" />
              <CornerBracket position="topRight" />
              <CornerBracket position="bottomLeft" />
              <CornerBracket position="bottomRight" />

              {isSuccess ? (
                <CheckboxCircleFillIcon height={64} width={64} />
              ) : mode === 'palm' ? (
                <HandIcon height={90} width={90} />
              ) : (
                <User3FillIcon height={90} width={90} />
              )}
            </TouchableOpacity>

            <Text style={[s.instruction, isSuccess && s.instructionSuccess]}>
              {isSuccess ? c.successTitle : c.instruction}
            </Text>

            {isSuccess ? <Text style={s.successMessage}>{c.successMessage}</Text> : null}
          </View>

          {/* Bottom section */}
          <View style={s.bottomSection}>
            {isSuccess ? (
              <TouchableOpacity style={s.btn} onPress={onEnrolled} activeOpacity={0.9}>
                <Text style={s.btnText}>Continue</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.hint}>
                <CircleLineIcon height={14} width={14} />
                <Text style={s.hintText}>Tap the frame to begin</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <Footer
        onOpenChat={onOpenChat ?? (() => undefined)}
        onOpenFlow={onOpenTravelSupport}
        onOpenHome={onOpenHome}
        onOpenTrips={onOpenJourneys}
        source="home"
      />

      {/* Back button */}
      <TouchableOpacity
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={onBack}
        disabled={enrolling}
        style={s.backButton}
      >
        <BackIcon />
      </TouchableOpacity>

      {/* Loading overlay */}
      {enrolling && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={s.loadingText}>
            {mode === 'face' ? 'Enrolling face...' : 'Enrolling palm...'}
          </Text>
        </View>
      )}

      {/* Camera modal */}
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={cancelCamera}>
        <View style={s.modalContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          flash={flashMode}
        />
        <CameraOverlay
          mode={mode}
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
  mode,
  flashActive,
  onCapture,
  onClose,
  onFlashToggle,
}: {
  mode: 'face' | 'palm';
  flashActive: boolean;
  onCapture: () => void;
  onClose: () => void;
  onFlashToggle: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const size = Math.min(width * 0.85, 340);
  const top = height * 0.22;
  const left = (width - size) / 2;

  const c = copy[mode];

  return (
    <View style={s.overlay}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.iconBtn} onPress={onClose}>
          <CloseIcon />
        </TouchableOpacity>
        <Text style={s.topTitle}>{c.cameraTitle}</Text>
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
        {mode === 'palm' ? 'Place palm in frame' : 'Align face in frame'}
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

function BackIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
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
  card: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 24,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  topSection: { alignItems: 'center' },
  middleSection: { alignItems: 'center', justifyContent: 'center' },
  bottomSection: { alignItems: 'center' },

  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'DM Sans',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: 'DM Sans',
    marginTop: 4,
    textAlign: 'center',
  },

  frameWrap: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    width: 250,
    height: 250,
    borderRadius: 24,
  },
  instruction: {
    marginTop: 20,
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'DM Sans',
    textAlign: 'center',
  },
  instructionSuccess: { color: '#22C55E', fontWeight: '600' },
  successMessage: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 13,
    fontFamily: 'DM Sans',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  hintText: { color: '#6B7280', fontSize: 13, fontFamily: 'DM Sans' },
  btn: {
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: '100%',
    maxWidth: 320,
  },
  btnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'DM Sans',
    textAlign: 'center',
  },

  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
});