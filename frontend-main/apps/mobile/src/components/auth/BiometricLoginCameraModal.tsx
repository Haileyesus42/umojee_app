// src/components/auth/BiometricLoginCameraModal.tsx

import { CameraView } from 'expo-camera';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type BiometricLoginCameraModalProps = {
  visible: boolean;
  mode: 'face' | 'palm';
  userName: string;
  capturing: boolean;
  cameraRef: React.RefObject<any>;
  onClose: () => void;
  onCapture: () => void;
};

export function BiometricLoginCameraModal({
  visible,
  mode,
  userName,
  capturing,
  cameraRef,
  onClose,
  onCapture,
}: BiometricLoginCameraModalProps) {
  const isFace = mode === 'face';
  const title = isFace ? 'Position your face' : 'Show your palm';
  const firstName = userName.split(' ')[0] || 'there';
  const subtitle = isFace
    ? `Look directly at the camera, ${firstName}`
    : `Hold your palm steady, ${firstName}`;
  const accentColor = isFace ? '#002AFF' : '#16A34A';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: accentColor }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={capturing}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close camera"
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          {/* Camera */}
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="front"
              mode="picture"
            />
            {/* Guide overlay — outside CameraView using absolute positioning */}
            <View style={styles.guideOverlay} pointerEvents="none">
              {isFace ? (
                <View style={styles.faceGuide}>
                  <Svg width={200} height={200} viewBox="0 0 200 200" fill="none">
                    <Path
                      d="M100 20 C50 20 20 60 20 100 C20 140 50 180 100 180 C150 180 180 140 180 100 C180 60 150 20 100 20 Z"
                      stroke="#FFFFFF"
                      strokeWidth={3}
                      strokeDasharray="10 5"
                    />
                  </Svg>
                </View>
              ) : (
                <View style={styles.palmGuide}>
                  <Svg width={200} height={200} viewBox="0 0 200 200" fill="none">
                    <Path
                      d="M50 150 L50 80 M75 150 L75 60 M100 150 L100 50 M125 150 L125 60 M150 150 L150 90"
                      stroke="#FFFFFF"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                    <Path
                      d="M30 150 Q30 180 60 180 L140 180 Q170 180 170 150"
                      stroke="#FFFFFF"
                      strokeWidth={3}
                      strokeDasharray="10 5"
                    />
                  </Svg>
                </View>
              )}
            </View>
          </View>

          {/* Capture button */}
          <View style={styles.footer}>
            <Pressable
              onPress={onCapture}
              disabled={capturing}
              style={({ pressed }) => [
                styles.captureButton,
                { backgroundColor: accentColor },
                pressed && !capturing && styles.captureButtonPressed,
                capturing && styles.captureButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isFace ? 'Verify face' : 'Verify palm'}
            >
              {capturing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.captureButtonText}>
                  {isFace ? 'Verify Face' : 'Verify Palm'}
                </Text>
              )}
            </Pressable>

            <Text style={styles.hintText}>
              {capturing ? 'Verifying...' : 'Tap to capture and verify'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    aspectRatio: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  palmGuide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  captureButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonPressed: {
    opacity: 0.8,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
  },
});