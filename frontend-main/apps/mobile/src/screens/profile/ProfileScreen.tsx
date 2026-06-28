import { useEffect, useMemo, useRef, useState } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import RightArrowIcon from '../../../assets/icons/right-arrow.svg';
import SpeakIcon from '../../../assets/icons/whisper/speak-line-#002AFF.svg';
import type { AuthUser } from '../../api/auth/auth';
import {
  getClientAssetUrl,
  updateCurrentUser,
  uploadCurrentUserPhoto,
} from '../../api/profile/profile';
import { defaultProfileImage } from '../../assets/images';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import {
  ProfileFormField,
  type ProfileFormFieldConfig,
} from '../../components/profile/ProfileFormField';
import { styles as themeStyles } from '../../theme/styles';
import type { CountryOption } from '../../utils/countries';
import { genderOptions, getPinnedCountryOptions } from '../../utils/profileForm';

// ---------------------------------------------------------------------
// Compact style overrides (final adjustments)
// ---------------------------------------------------------------------
const compactStyles = StyleSheet.create({
  profileScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  profileHero: {
    paddingTop: 40,
    paddingBottom: 12,
    alignItems: 'center',
  },
  profileInfo: {
    paddingTop: 20,
    paddingHorizontal: 0,
    width: '100%',
    alignItems: 'center',
  },
  profilePlan: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    marginBottom: 8,
  },

  // Avatar container – 84×84
  profilePictureGroup: {
    position: 'relative',
    width: 84,
    height: 84,
    marginBottom: 24,
    alignSelf: 'center',
    overflow: 'visible',
  },
  profileAvatarFrame: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: 'visible',
    marginRight: 0,
  },

  profilePictureButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profilePictureButtonDisabled: {
    opacity: 0.6,
  },

  profileIdentityBlock: {
    marginBottom: 8,
    alignItems: 'center',
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profilePageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignSelf: 'center',
    gap: 8,
    marginTop: 4,
  },
  profileMain: {
    paddingTop: 12,
    paddingBottom: 20,
  },

  // ----- Compact cards with subtle shadow -----
  profileFormBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,                       // reduced from 16
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },

  profileHomeLocationBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,                       // reduced from 16
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },

  // ----- Tighter internal spacing -----
  profileInlineHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,                  // reduced from 12
  },
  profileFields: {
    gap: 6,                           // reduced from 8
    marginBottom: 8,                  // reduced from 12
  },

  // Primary button – lighter blue
  profilePrimaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePrimaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },

  // Home location card inner elements
  profileCurrentLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 10,                      // reduced from 12
    marginBottom: 8,                  // reduced from 12
  },
  profileCurrentLocationDetails: {
    flex: 1,
    gap: 2,
  },
  profileTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,               // reduced from 8
    marginBottom: 4,                  // reduced from 8
  },
  profileManualHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,               // reduced from 8
    marginBottom: 4,                  // reduced from 8
  },

  profileSaveMessage: {
    marginTop: 8,
    fontSize: 13,
    color: '#00A67E',
    textAlign: 'center',
  },
  profileFormField: {
    marginBottom: 4,
  },
  profileFormLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    color: '#1A1A1A',
  },
  profileFormInput: {
    height: 36,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
  },
});

const styles = { ...themeStyles, ...compactStyles };

// ---------------------------------------------------------------------
// Types (unchanged)
// ---------------------------------------------------------------------
type ProfileScreenProps = {
  notificationUnreadCount?: number;
  onBack: () => void;
  onLogout?: () => void;
  onOpenCompanions: () => void;
  onOpenChat?: () => void;
  onOpenDocuments: () => void;
  onOpenExpenses: () => void;
  onOpenHome: () => void;
  onOpenJourneys: () => void;
  onOpenNotifications: () => void;
  onOpenPaymentWallet: () => void;
  onOpenPreferences: () => void;
  onOpenSecurity: () => void;
  onOpenTravelSupport: () => void;
  onOpenWhisper: () => void;
  onUserUpdate?: (user: AuthUser) => Promise<void>;
  profileImageUri?: string | null;
  token: string | null;
  user: AuthUser | null;
};

type ProfileField = ProfileFormFieldConfig;
type ProfilePageLabel =
  | 'Profile'
  | 'Documents'
  | 'Companions'
  | 'Expenses'
  | 'Whisper'
  | 'Preferences'
  | 'Security';

type PendingProfilePhoto = {
  fileName?: string | null;
  height?: number;
  source: 'camera' | 'gallery';
  uri: string;
  width?: number;
};

type Point = { x: number; y: number };
type CropLayout = {
  frameSize: number;
  stageHeight: number;
  stageWidth: number;
};

// ---------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------
const PROFILE_PHOTO_SIZE = 512;
const MIN_PHOTO_ZOOM = 1;
const MAX_PHOTO_ZOOM = 4;
const PHOTO_ZOOM_STEP = 0.25;
const DEFAULT_CROP_LAYOUT: CropLayout = {
  frameSize: 280,
  stageHeight: 520,
  stageWidth: 390,
};

// ---------------------------------------------------------------------
// Icon Components (all as before)
// ---------------------------------------------------------------------
function ArrowLeftIcon() {
  return <RightArrowIcon color="#FFFFFF" height={14} style={styles.profileBackIcon} width={14} />;
}

function CloseIcon({ color = '#0A0A0A' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 28 28" fill="none">
      <Path d="m6 6 12 12M18 6 6 18" stroke={color} strokeLinecap="round" strokeWidth={2.2} />
    </Svg>
  );
}

function CameraIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 28 28" fill="none">
      <Path
        d="M8.5 5 10 3h4l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3.5Z"
        fill="#0A0A0A"
      />
      <Circle cx={12} cy={12} r={3.4} fill="#FFFFFF" />
    </Svg>
  );
}

function ChevronDownIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path d="m7 10 5 5 5-5" stroke="#0A0A0A" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function EditIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 18 18" fill="none">
      <Path
        d="M2 15.9706H3.41421L12.7279 6.65686L11.3137 5.24264L2 14.5564V15.9706ZM18 17.9706H0V13.728L13.435 0.292897C13.8256 -0.0976325 14.4587 -0.0976325 14.8492 0.292897L17.6777 3.12132C18.0682 3.51185 18.0682 4.14501 17.6777 4.53554L6.24264 15.9706H18V17.9706ZM12.7279 3.82843L14.1421 5.24264L15.5563 3.82843L14.1421 2.41422L12.7279 3.82843Z"
        fill="black"
      />
    </Svg>
  );
}

function GalleryIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 28 28" fill="none">
      <Rect x={3} y={4} width={18} height={16} rx={3} stroke="#0A0A0A" strokeWidth={1.8} />
      <Circle cx={8.5} cy={9.5} r={1.5} fill="#0A0A0A" />
      <Path
        d="m5.5 17 4.2-4.2 2.7 2.7 2.1-2.1L19 18"
        stroke="#0A0A0A"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function DocumentsIcon({ color = '#0A0A0A', size = 20 }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 4h12v16H6V4Z" stroke={color} strokeLinejoin="round" strokeWidth={1.9} />
      <Path d="M9 9h6M9 13h6M9 17h3" stroke={color} strokeLinecap="round" strokeWidth={1.9} />
    </Svg>
  );
}

function CompanionsIcon({ color = '#0A0A0A', size = 20 }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={8} cy={8} r={2.5} stroke={color} strokeWidth={1.8} />
      <Circle cx={16} cy={8} r={2.5} stroke={color} strokeWidth={1.8} />
      <Path
        d="M4 20c.5-3 1.8-4.5 4-4.5s3.5 1.5 4 4.5M12 20c.5-3 1.8-4.5 4-4.5s3.5 1.5 4 4.5"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function ExpensesIcon({ color = '#0A0A0A', size = 20 }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 4v15h15"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.9}
      />
      <Path
        d="m8 15 3.2-4 3 2.2L18 8"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.9}
      />
    </Svg>
  );
}

function HomeIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="m4 11 8-7 8 7v8a1 1 0 0 1-1 1h-5v-5h-4v5H5a1 1 0 0 1-1-1v-8Z"
        stroke="#00A67E"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function MapPinIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-4.8 7-11a7 7 0 1 0-14 0c0 6.2 7 11 7 11Z"
        stroke="#002AFF"
        strokeWidth={1.8}
      />
      <Circle cx={12} cy={10} r={2.4} stroke="#002AFF" strokeWidth={1.8} />
    </Svg>
  );
}

function SendIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="m21 3-8 18-3.2-8.8L1 9l20-6Z"
        stroke="#002AFF"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function SettingsIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" stroke={color} strokeWidth={1.8} />
      <Path
        d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2h-4l-.4 2.5A8 8 0 0 0 7 6L4.6 5l-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5L7 18a8 8 0 0 0 2.6 1.5L10 22h4l.4-2.5A8 8 0 0 0 17 18l2.4 1 2-3.5-2-1.5Z"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function SpeakMenuIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return <SpeakIcon color={color} height={size} width={size} />;
}

function UserIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
      <Path
        d="M5 21c.9-4 3.2-6 7-6s6.1 2 7 6"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function LockIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={10} width={14} height={10} rx={2} stroke={color} strokeWidth={1.8} />
      <Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth={1.8} />
      <Path d="M12 14v2" stroke={color} strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
}

function UserSmileIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M9.99984 18.3334C5.39746 18.3334 1.6665 14.6024 1.6665 10C1.6665 5.39765 5.39746 1.66669 9.99984 1.66669C14.6022 1.66669 18.3332 5.39765 18.3332 10C18.3332 14.6024 14.6022 18.3334 9.99984 18.3334ZM9.99984 16.6667C13.6818 16.6667 16.6665 13.6819 16.6665 10C16.6665 6.31812 13.6818 3.33335 9.99984 3.33335C6.31794 3.33335 3.33317 6.31812 3.33317 10C3.33317 13.6819 6.31794 16.6667 9.99984 16.6667ZM5.83317 10H7.49984C7.49984 11.3808 8.61909 12.5 9.99984 12.5C11.3806 12.5 12.4998 11.3808 12.4998 10H14.1665C14.1665 12.3012 12.301 14.1667 9.99984 14.1667C7.69865 14.1667 5.83317 12.3012 5.83317 10Z"
        fill="#002AFF"
      />
    </Svg>
  );
}

function VerificationIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill="#00A67E" />
      <Path
        d="m7.8 12.3 2.6 2.6 5.8-6"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------
function stringField(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberField(value: unknown): string {
  return typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '';
}

function formatDateField(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().split('T')[0];
}

function parseNullableNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatReverseGeocodeAddress(
  geocode: Location.LocationGeocodedAddress | undefined,
  lat: number,
  lon: number,
): string {
  const addressParts = [
    geocode?.name,
    geocode?.street,
    geocode?.district,
    geocode?.city || geocode?.subregion,
    geocode?.region,
    geocode?.country,
  ].filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
  const uniqueAddressParts = addressParts.filter(
    (part, index) => addressParts.findIndex((value) => value === part) === index,
  );
  return uniqueAddressParts.join(', ') || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

function clampZoom(value: number): number {
  return Math.min(MAX_PHOTO_ZOOM, Math.max(MIN_PHOTO_ZOOM, Number(value.toFixed(2))));
}

function getTouchCenter(touches: readonly { pageX: number; pageY: number }[]): Point {
  if (touches.length === 0) return { x: 0, y: 0 };
  const total = touches.reduce(
    (acc, touch) => ({ x: acc.x + touch.pageX, y: acc.y + touch.pageY }),
    { x: 0, y: 0 },
  );
  return { x: total.x / touches.length, y: total.y / touches.length };
}

function getTouchDistance(touches: readonly { pageX: number; pageY: number }[]): number {
  if (touches.length < 2) return 0;
  return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
}

function constrainCropFrameOffset(offset: Point, layout: CropLayout): Point {
  const maxX = Math.max(0, (layout.stageWidth - layout.frameSize) / 2);
  const maxY = Math.max(0, (layout.stageHeight - layout.frameSize) / 2);
  return {
    x: clamp(offset.x, -maxX, maxX),
    y: clamp(offset.y, -maxY, maxY),
  };
}

function getProfilePhotoCropAction(
  photo: PendingProfilePhoto,
  zoom: number,
  frameOffset: Point,
  layout: CropLayout,
): ImageManipulator.Action | null {
  if (!photo.width || !photo.height) return null;
  const imageScale = getCoverScale(photo, layout) * zoom;
  const displayWidth = photo.width * imageScale;
  const displayHeight = photo.height * imageScale;
  const imageLeft = layout.stageWidth / 2 - displayWidth / 2;
  const imageTop = layout.stageHeight / 2 - displayHeight / 2;
  const frameLeft = (layout.stageWidth - layout.frameSize) / 2 + frameOffset.x;
  const frameTop = (layout.stageHeight - layout.frameSize) / 2 + frameOffset.y;
  const cropSize = Math.max(1, Math.round(layout.frameSize / imageScale));
  const originX = Math.round(clamp((frameLeft - imageLeft) / imageScale, 0, photo.width - cropSize));
  const originY = Math.round(clamp((frameTop - imageTop) / imageScale, 0, photo.height - cropSize));
  return {
    crop: { height: cropSize, originX, originY, width: cropSize },
  };
}

function getCoverScale(photo: PendingProfilePhoto, layout: CropLayout): number {
  if (!photo.width || !photo.height) return 1;
  return Math.max(layout.stageWidth / photo.width, layout.stageHeight / photo.height);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getPhotoFileName(
  fileName: string | null | undefined,
  source: 'camera' | 'gallery',
): string {
  const fallbackName = source === 'camera' ? 'camera-avatar.jpg' : 'profile-avatar.jpg';
  if (!fileName) return fallbackName;
  const withoutExtension = fileName.replace(/\.[^.]+$/, '');
  return `${withoutExtension || 'profile-avatar'}.jpg`;
}

function getHomeLocation(user: AuthUser | null) {
  const homeLocation = user?.homeLocation;
  if (!homeLocation || typeof homeLocation !== 'object') return {};
  return homeLocation as {
    address?: unknown;
    city?: unknown;
    country?: unknown;
    lat?: unknown;
    lon?: unknown;
  };
}

// ---------------------------------------------------------------------
// Sub‑Components
// ---------------------------------------------------------------------

function PhotoCropModal({
  imageUri,
  onApply,
  onCancel,
  onLayoutChange,
  onOffsetChange,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  offset,
  pendingPhoto,
  uploading,
  visible,
  zoom,
}: {
  imageUri: string | null;
  onApply: () => void;
  onCancel: () => void;
  onLayoutChange: (layout: CropLayout) => void;
  onOffsetChange: (offset: Point) => void;
  onZoomChange: (zoom: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  offset: Point;
  pendingPhoto: PendingProfilePhoto | null;
  uploading: boolean;
  visible: boolean;
  zoom: number;
}) {
  const [stageLayout, setStageLayout] = useState<CropLayout>(DEFAULT_CROP_LAYOUT);
  const gesture = useCropCircleGesture({
    frameOffset: offset,
    layout: stageLayout,
    onFrameOffsetChange: onOffsetChange,
    onZoomChange,
    zoom,
  });

  const handleStageLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    const nextLayout = {
      frameSize: Math.max(220, Math.min(width - 32, height - 128)),
      stageHeight: height,
      stageWidth: width,
    };
    setStageLayout(nextLayout);
    onLayoutChange(nextLayout);
    onOffsetChange(constrainCropFrameOffset(offset, nextLayout));
  };

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.profilePhotoModalOverlay}>
        <View style={styles.profilePhotoModalCard}>
          <View style={styles.profilePhotoModalHeader}>
            <Pressable
              accessibilityLabel="Cancel profile photo crop"
              accessibilityRole="button"
              disabled={uploading}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.profilePhotoIconButton,
                pressed && styles.pressedFeedback,
              ]}
            >
              <CloseIcon />
            </Pressable>
            <Text style={styles.profilePhotoModalTitle}>Crop Photo</Text>
            <Pressable
              accessibilityLabel="Apply profile photo crop"
              accessibilityRole="button"
              disabled={uploading}
              onPress={onApply}
              style={({ pressed }) => [
                styles.profilePhotoApplyButton,
                uploading && styles.profilePictureButtonDisabled,
                pressed && styles.pressedFeedback,
              ]}
            >
              <Text style={styles.profilePhotoApplyButtonText}>
                {uploading ? 'Saving...' : 'Apply'}
              </Text>
            </Pressable>
          </View>

          <View
            onLayout={handleStageLayout}
            style={styles.profilePhotoCropStage}
            {...gesture.panHandlers}
          >
            {imageUri ? (
              <Image
                resizeMode="cover"
                source={{ uri: imageUri }}
                style={[
                  styles.profilePhotoCropImage,
                  { transform: [{ scale: zoom }] },
                ]}
              />
            ) : null}
            <View
              pointerEvents="none"
              style={[
                styles.profilePhotoCropFrame,
                {
                  borderRadius: stageLayout.frameSize / 2,
                  height: stageLayout.frameSize,
                  left: (stageLayout.stageWidth - stageLayout.frameSize) / 2,
                  top: (stageLayout.stageHeight - stageLayout.frameSize) / 2,
                  transform: [{ translateX: offset.x }, { translateY: offset.y }],
                  width: stageLayout.frameSize,
                },
              ]}
            />
            {uploading ? (
              <View style={styles.profilePhotoBusyOverlay}>
                <ActivityIndicator color="#FFFFFF" size="large" />
              </View>
            ) : null}
          </View>

          <ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} zoom={zoom} />
        </View>
      </View>
    </Modal>
  );
}

function PhotoPreviewModal({
  imageSource,
  offset,
  onClose,
  onOffsetChange,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  visible,
  zoom,
}: {
  imageSource: ImageSourcePropType;
  offset: Point;
  onClose: () => void;
  onOffsetChange: (offset: Point) => void;
  onZoomChange: (zoom: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  visible: boolean;
  zoom: number;
}) {
  const gesture = useImageTransformGesture({
    constrainOffset: (nextOffset, nextZoom) =>
      nextZoom <= MIN_PHOTO_ZOOM ? { x: 0, y: 0 } : nextOffset,
    offset,
    onOffsetChange,
    onZoomChange,
    zoom,
  });

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.profilePhotoViewerOverlay}>
        <View style={styles.profilePhotoViewerHeader}>
          <Text style={styles.profilePhotoViewerTitle}>Profile Photo</Text>
          <Pressable
            accessibilityLabel="Close profile photo"
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.profilePhotoViewerClose,
              pressed && styles.pressedFeedback,
            ]}
          >
            <CloseIcon color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.profilePhotoViewerStage} {...gesture.panHandlers}>
          <Image
            resizeMode="contain"
            source={imageSource}
            style={[
              styles.profilePhotoViewerImage,
              {
                transform: [
                  { translateX: offset.x },
                  { translateY: offset.y },
                  { scale: zoom },
                ],
              },
            ]}
          />
        </View>

        <View style={styles.profilePhotoViewerControls}>
          <ZoomControls inverse onZoomIn={onZoomIn} onZoomOut={onZoomOut} zoom={zoom} />
        </View>
      </View>
    </Modal>
  );
}

function ZoomControls({
  inverse = false,
  onZoomIn,
  onZoomOut,
  zoom,
}: {
  inverse?: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoom: number;
}) {
  return (
    <View
      style={[styles.profilePhotoZoomControls, inverse && styles.profilePhotoZoomControlsInverse]}
    >
      <Pressable
        accessibilityLabel="Zoom out"
        accessibilityRole="button"
        disabled={zoom <= MIN_PHOTO_ZOOM}
        onPress={onZoomOut}
        style={({ pressed }) => [
          styles.profilePhotoZoomButton,
          inverse && styles.profilePhotoZoomButtonInverse,
          zoom <= MIN_PHOTO_ZOOM && styles.profilePictureButtonDisabled,
          pressed && styles.pressedFeedback,
        ]}
      >
        <Text
          style={[
            styles.profilePhotoZoomButtonText,
            inverse && styles.profilePhotoZoomButtonTextInverse,
          ]}
        >
          -
        </Text>
      </Pressable>
      <Text style={[styles.profilePhotoZoomText, inverse && styles.profilePhotoZoomTextInverse]}>
        {Math.round(zoom * 100)}%
      </Text>
      <Pressable
        accessibilityLabel="Zoom in"
        accessibilityRole="button"
        disabled={zoom >= MAX_PHOTO_ZOOM}
        onPress={onZoomIn}
        style={({ pressed }) => [
          styles.profilePhotoZoomButton,
          inverse && styles.profilePhotoZoomButtonInverse,
          zoom >= MAX_PHOTO_ZOOM && styles.profilePictureButtonDisabled,
          pressed && styles.pressedFeedback,
        ]}
      >
        <Text
          style={[
            styles.profilePhotoZoomButtonText,
            inverse && styles.profilePhotoZoomButtonTextInverse,
          ]}
        >
          +
        </Text>
      </Pressable>
    </View>
  );
}

function ProfileDetailsPage({
  currentLocationTitle,
  currentLocationText,
  hasHomeLocationChanges,
  hasProfileChanges,
  homeLocationFields,
  message,
  onSetCurrentLocationAsHome,
  onSaveHomeLocation,
  onSaveProfile,
  profileFields,
  savingLocation,
  savingProfile,
}: {
  currentLocationTitle: string;
  currentLocationText: string;
  hasHomeLocationChanges: boolean;
  hasProfileChanges: boolean;
  homeLocationFields: ProfileField[];
  message: string | null;
  onSetCurrentLocationAsHome: () => void;
  onSaveHomeLocation: () => void;
  onSaveProfile: () => void;
  profileFields: ProfileField[];
  savingLocation: boolean;
  savingProfile: boolean;
}) {
  const [isManualLocationOpen, setIsManualLocationOpen] = useState(false);
  const [activeProfileDropdown, setActiveProfileDropdown] = useState<string | null>(null);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const isProfileSaveDisabled = savingProfile || !hasProfileChanges;
  const isHomeLocationSaveDisabled = savingLocation || !hasHomeLocationChanges;
  const homeCountryValue = homeLocationFields.find((field) => field.countryDropdown)?.value || '';
  const homeCountryOptions = useMemo(
    () => getPinnedCountryOptions(countrySearchQuery, homeCountryValue),
    [countrySearchQuery, homeCountryValue],
  );

  return (
    <View style={styles.profileMain}>
      {/* Removed the redundant "Profile" section heading */}

      <View style={styles.profileFormBlock}>
        <View style={styles.profileInlineHeading}>
          <UserSmileIcon />
          <Text style={styles.profileInlineHeadingText}>Profile Information</Text>
        </View>

        <View style={styles.profileFields}>
          {profileFields.map((field) => (
            <ProfileInput
              key={field.label}
              dropdownActive={activeProfileDropdown === field.label}
              field={field}
              onSelectOption={(value) => {
                field.onChangeText(value);
                setActiveProfileDropdown(null);
              }}
              onToggleDropdown={() =>
                setActiveProfileDropdown((current) =>
                  current === field.label ? null : field.label,
                )
              }
            />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isProfileSaveDisabled}
          onPress={onSaveProfile}
          style={({ pressed }) => [
            styles.profilePrimaryButton,
            isProfileSaveDisabled && styles.profilePrimaryButtonDisabled,
            pressed && styles.pressedFeedback,
          ]}
        >
          <Text style={styles.profilePrimaryButtonText}>
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </Text>
        </Pressable>
        {message ? <Text style={styles.profileSaveMessage}>{String(message)}</Text> : null}
      </View>

      <View style={styles.profileHomeLocationBlock}>
        <View style={styles.profileInlineHeading}>
          <MapPinIcon />
          <Text style={styles.profileInlineHeadingText}>Home Location</Text>
        </View>

        <View style={styles.profileCurrentLocationCard}>
          <View style={styles.profileCurrentLocationIcon}>
            <HomeIcon />
          </View>
          <View style={styles.profileCurrentLocationDetails}>
            <Text style={styles.profileCurrentLocationTitle}>{currentLocationTitle}</Text>
            <Text style={styles.profileCurrentLocationText}>
              {String(currentLocationText || 'No home location saved yet.')}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={savingLocation}
          onPress={onSetCurrentLocationAsHome}
          style={({ pressed }) => [styles.profileTextButton, pressed && styles.pressedFeedback]}
        >
          <SendIcon />
          <Text style={styles.profileTextButtonLabel}>
            {savingLocation ? 'Setting Home Location...' : 'Set My Current Location as Home'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isManualLocationOpen }}
          onPress={() => setIsManualLocationOpen((isOpen) => !isOpen)}
          style={({ pressed }) => [styles.profileManualHeading, pressed && styles.pressedFeedback]}
        >
          <EditIcon />
          <Text style={styles.profileManualHeadingText}>Or enter manually</Text>
        </Pressable>

        {isManualLocationOpen ? (
          <>
            <View style={styles.profileFields}>
              {homeLocationFields.map((field) => (
                <ProfileInput
                  key={`home-${field.label}`}
                  countryOptions={field.countryDropdown ? homeCountryOptions : undefined}
                  dropdownActive={activeProfileDropdown === `home-${field.label}`}
                  dropdownSearchQuery={
                    activeProfileDropdown === `home-${field.label}` ? countrySearchQuery : ''
                  }
                  field={field}
                  onSearchCountries={setCountrySearchQuery}
                  onSelectCountry={(countryOption) => {
                    field.onChangeText(countryOption.name);
                    setActiveProfileDropdown(null);
                    setCountrySearchQuery('');
                  }}
                  onToggleDropdown={() => {
                    setActiveProfileDropdown((current) =>
                      current === `home-${field.label}` ? null : `home-${field.label}`,
                    );
                    setCountrySearchQuery('');
                  }}
                />
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isHomeLocationSaveDisabled}
              onPress={onSaveHomeLocation}
              style={({ pressed }) => [
                styles.profilePrimaryButton,
                isHomeLocationSaveDisabled && styles.profilePrimaryButtonDisabled,
                pressed && styles.pressedFeedback,
              ]}
            >
              <Text style={styles.profilePrimaryButtonText}>
                {savingLocation ? 'Saving...' : 'Save Home Location'}
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

function ProfileInput({
  countryOptions,
  dropdownActive = false,
  dropdownSearchQuery = '',
  field,
  onSearchCountries,
  onSelectCountry,
  onSelectOption,
  onToggleDropdown,
}: {
  countryOptions?: CountryOption[];
  dropdownActive?: boolean;
  dropdownSearchQuery?: string;
  field: ProfileField;
  onSearchCountries?: (value: string) => void;
  onSelectCountry?: (country: CountryOption) => void;
  onSelectOption?: (value: string) => void;
  onToggleDropdown?: () => void;
}) {
  return (
    <ProfileFormField
      countryOptions={countryOptions}
      dropdownActive={dropdownActive}
      dropdownSearchQuery={dropdownSearchQuery}
      field={{
        ...field,
        editable: field.label !== 'Email',
      }}
      onSearchCountries={onSearchCountries}
      onSelectCountry={onSelectCountry}
      onSelectOption={onSelectOption}
      onToggleDropdown={onToggleDropdown}
    />
  );
}

// ---------------------------------------------------------------------
// Custom Hooks (unchanged)
// ---------------------------------------------------------------------
function useCropCircleGesture({
  frameOffset,
  layout,
  onFrameOffsetChange,
  onZoomChange,
  zoom,
}: {
  frameOffset: Point;
  layout: CropLayout;
  onFrameOffsetChange: (offset: Point) => void;
  onZoomChange: (zoom: number) => void;
  zoom: number;
}) {
  const startDistanceRef = useRef(0);
  const startFrameOffsetRef = useRef<Point>(frameOffset);
  const startZoomRef = useRef(zoom);
  const frameOffsetRef = useRef(frameOffset);
  const layoutRef = useRef(layout);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    frameOffsetRef.current = frameOffset;
  }, [frameOffset]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches;
          startFrameOffsetRef.current = frameOffsetRef.current;
          startZoomRef.current = zoomRef.current;
          startDistanceRef.current = getTouchDistance(touches);
        },
        onPanResponderMove: (event, gestureState) => {
          const touches = event.nativeEvent.touches;
          if (touches.length >= 2) {
            const nextDistance = getTouchDistance(touches);
            const nextZoom =
              startDistanceRef.current > 0
                ? clampZoom(startZoomRef.current * (nextDistance / startDistanceRef.current))
                : startZoomRef.current;
            onZoomChange(nextZoom);
            return;
          }
          const nextFrameOffset = {
            x: startFrameOffsetRef.current.x + gestureState.dx,
            y: startFrameOffsetRef.current.y + gestureState.dy,
          };
          onFrameOffsetChange(constrainCropFrameOffset(nextFrameOffset, layoutRef.current));
        },
        onPanResponderTerminationRequest: () => false,
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
      }),
    [onFrameOffsetChange, onZoomChange],
  );
}

function useImageTransformGesture({
  constrainOffset,
  offset,
  onOffsetChange,
  onZoomChange,
  zoom,
}: {
  constrainOffset: (offset: Point, zoom: number) => Point;
  offset: Point;
  onOffsetChange: (offset: Point) => void;
  onZoomChange: (zoom: number) => void;
  zoom: number;
}) {
  const startDistanceRef = useRef(0);
  const startCenterRef = useRef<Point>({ x: 0, y: 0 });
  const startOffsetRef = useRef<Point>(offset);
  const startZoomRef = useRef(zoom);
  const offsetRef = useRef(offset);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches;
          startOffsetRef.current = offsetRef.current;
          startZoomRef.current = zoomRef.current;
          startCenterRef.current = getTouchCenter(touches);
          startDistanceRef.current = getTouchDistance(touches);
        },
        onPanResponderMove: (event, gestureState) => {
          const touches = event.nativeEvent.touches;
          if (touches.length >= 2) {
            const nextDistance = getTouchDistance(touches);
            const nextCenter = getTouchCenter(touches);
            const nextZoom =
              startDistanceRef.current > 0
                ? clampZoom(startZoomRef.current * (nextDistance / startDistanceRef.current))
                : startZoomRef.current;
            const nextOffset = {
              x: startOffsetRef.current.x + (nextCenter.x - startCenterRef.current.x),
              y: startOffsetRef.current.y + (nextCenter.y - startCenterRef.current.y),
            };
            onZoomChange(nextZoom);
            onOffsetChange(constrainOffset(nextOffset, nextZoom));
            return;
          }
          const nextOffset = {
            x: startOffsetRef.current.x + gestureState.dx,
            y: startOffsetRef.current.y + gestureState.dy,
          };
          onOffsetChange(constrainOffset(nextOffset, zoomRef.current));
        },
        onPanResponderTerminationRequest: () => true,
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
      }),
    [constrainOffset, onOffsetChange, onZoomChange],
  );
}

// ---------------------------------------------------------------------
// Main ProfileScreen Component
// ---------------------------------------------------------------------
const profilePages: { label: ProfilePageLabel; icon: typeof UserIcon }[] = [
  { label: 'Profile', icon: UserIcon },
  { label: 'Documents', icon: DocumentsIcon },
  { label: 'Companions', icon: CompanionsIcon },
  { label: 'Expenses', icon: ExpensesIcon },
  { label: 'Whisper', icon: SpeakMenuIcon },
  { label: 'Preferences', icon: SettingsIcon },
  { label: 'Security', icon: LockIcon },
];

export function ProfileScreen({
  notificationUnreadCount = 0,
  onBack,
  onLogout,
  onOpenChat,
  onOpenCompanions,
  onOpenDocuments,
  onOpenExpenses,
  onOpenHome,
  onOpenJourneys,
  onOpenNotifications,
  onOpenPaymentWallet,
  onOpenPreferences,
  onOpenSecurity,
  onOpenTravelSupport,
  onOpenWhisper,
  onUserUpdate,
  profileImageUri: menuProfileImageUri,
  token,
  user,
}: ProfileScreenProps) {
  // ---------- State ----------
  const [isPageMenuOpen, setIsPageMenuOpen] = useState(false);
  const [firstName, setFirstName] = useState(stringField(user?.firstName));
  const [lastName, setLastName] = useState(stringField(user?.lastName));
  const [phone, setPhone] = useState(stringField(user?.phone));
  const [country, setCountry] = useState(stringField(user?.country));
  const [dob, setDob] = useState(formatDateField(user?.dob));
  const [gender, setGender] = useState(stringField(user?.gender));
  const initialHomeLocation = getHomeLocation(user);
  const [homeAddress, setHomeAddress] = useState(stringField(initialHomeLocation.address));
  const [homeCity, setHomeCity] = useState(stringField(initialHomeLocation.city));
  const [homeCountry, setHomeCountry] = useState(stringField(initialHomeLocation.country));
  const [homeLat, setHomeLat] = useState(numberField(initialHomeLocation.lat));
  const [homeLon, setHomeLon] = useState(numberField(initialHomeLocation.lon));
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<PendingProfilePhoto | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState<Point>({ x: 0, y: 0 });
  const [cropLayout, setCropLayout] = useState<CropLayout>(DEFAULT_CROP_LAYOUT);
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
  const [photoPreviewZoom, setPhotoPreviewZoom] = useState(1);
  const [photoPreviewOffset, setPhotoPreviewOffset] = useState<Point>({ x: 0, y: 0 });
  const [profileImageLoadFailed, setProfileImageLoadFailed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ---------- Derived ----------
  const fullName = `${firstName} ${lastName}`.trim() || 'Your Name';
  const username = user?.email ? String(user.email) : 'No email';
  const profileImageUri = getClientAssetUrl(user?.photo);
  const activeProfileImageUri = localPhotoUri || profileImageUri;
  const profileImageSource =
    activeProfileImageUri && !profileImageLoadFailed
      ? { uri: activeProfileImageUri }
      : defaultProfileImage;

  const currentLocationText = useMemo(() => {
    const parts = [homeAddress].filter(Boolean);
    const coordinates = [homeLat, homeLon].filter(Boolean).join(', ');
    return [parts.join(', '), coordinates].filter(Boolean).join(' ');
  }, [homeAddress, homeLat, homeLon]);

  const currentLocationTitle = useMemo(() => {
    const parts = [homeCity, homeCountry].filter(Boolean);
    return parts.join(', ');
  }, [homeCity, homeCountry]);

  const hasProfileChanges = useMemo(
    () =>
      firstName !== stringField(user?.firstName) ||
      lastName !== stringField(user?.lastName) ||
      phone !== stringField(user?.phone) ||
      country !== stringField(user?.country) ||
      dob !== formatDateField(user?.dob) ||
      gender !== stringField(user?.gender),
    [country, dob, firstName, gender, lastName, phone, user],
  );

  const hasHomeLocationChanges = useMemo(() => {
    const savedHomeLocation = getHomeLocation(user);
    return (
      homeAddress !== stringField(savedHomeLocation.address) ||
      homeCity !== stringField(savedHomeLocation.city) ||
      homeCountry !== stringField(savedHomeLocation.country) ||
      homeLat !== numberField(savedHomeLocation.lat) ||
      homeLon !== numberField(savedHomeLocation.lon)
    );
  }, [homeAddress, homeCity, homeCountry, homeLat, homeLon, user]);

  // ---------- Effects ----------
  useEffect(() => {
    setFirstName(stringField(user?.firstName));
    setLastName(stringField(user?.lastName));
    setPhone(stringField(user?.phone));
    setCountry(stringField(user?.country));
    setDob(formatDateField(user?.dob));
    setGender(stringField(user?.gender));
    const nextHomeLocation = getHomeLocation(user);
    setHomeAddress(stringField(nextHomeLocation.address));
    setHomeCity(stringField(nextHomeLocation.city));
    setHomeCountry(stringField(nextHomeLocation.country));
    setHomeLat(numberField(nextHomeLocation.lat));
    setHomeLon(numberField(nextHomeLocation.lon));
    setLocalPhotoUri(null);
  }, [user]);

  useEffect(() => {
    setProfileImageLoadFailed(false);
  }, [activeProfileImageUri]);

  // ---------- Handlers ----------
  const adjustCropZoom = (direction: 1 | -1) => {
    setCropZoom((value) => {
      const nextZoom = clampZoom(value + direction * PHOTO_ZOOM_STEP);
      setCropOffset((offset) => constrainCropFrameOffset(offset, cropLayout));
      return nextZoom;
    });
  };

  const adjustPhotoPreviewZoom = (direction: 1 | -1) => {
    setPhotoPreviewZoom((value) => {
      const nextZoom = clampZoom(value + direction * PHOTO_ZOOM_STEP);
      if (nextZoom === MIN_PHOTO_ZOOM) {
        setPhotoPreviewOffset({ x: 0, y: 0 });
      }
      return nextZoom;
    });
  };

  const handlePagePress = (label: ProfilePageLabel) => {
    setIsPageMenuOpen(false);
    if (label === 'Documents') onOpenDocuments();
    if (label === 'Companions') onOpenCompanions();
    if (label === 'Expenses') onOpenExpenses();
    if (label === 'Preferences') onOpenPreferences();
    if (label === 'Security') onOpenSecurity();
    if (label === 'Whisper') onOpenWhisper();
  };

  const handleSaveProfile = async () => {
    if (!hasProfileChanges) return;
    if (!token) { setMessage('Sign in again to update your profile.'); return; }
    setSavingProfile(true);
    setMessage(null);
    try {
      const updatedUser = await updateCurrentUser(token, {
        country,
        dob: dob || undefined,
        firstName,
        gender,
        lastName,
        phone,
      });
      await onUserUpdate?.(updatedUser);
      setMessage('Profile updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveHomeLocation = async () => {
    if (!hasHomeLocationChanges) return;
    if (!token) { setMessage('Sign in again to update your profile.'); return; }
    setSavingLocation(true);
    setMessage(null);
    try {
      const updatedUser = await updateCurrentUser(token, {
        homeLocation: {
          address: homeAddress,
          city: homeCity,
          country: homeCountry,
          lat: parseNullableNumber(homeLat),
          lon: parseNullableNumber(homeLon),
        },
      });
      await onUserUpdate?.(updatedUser);
      setMessage('Home location updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update home location.');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleSetCurrentLocationAsHome = async () => {
    if (!token) { setMessage('Sign in again to update your home location.'); return; }
    setSavingLocation(true);
    setMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setMessage('Location permission denied.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const [geocode] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon }).catch(() => []);
      const nextHomeLocation = {
        address: formatReverseGeocodeAddress(geocode, lat, lon),
        city: stringField(geocode?.city || geocode?.subregion || geocode?.region),
        country: stringField(geocode?.country),
        lat,
        lon,
      };
      setHomeAddress(nextHomeLocation.address);
      setHomeCity(nextHomeLocation.city);
      setHomeCountry(nextHomeLocation.country);
      setHomeLat(numberField(nextHomeLocation.lat));
      setHomeLon(numberField(nextHomeLocation.lon));
      const updatedUser = await updateCurrentUser(token, { homeLocation: nextHomeLocation });
      await onUserUpdate?.(updatedUser);
      setMessage('Home location set to your current position.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to get location.');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleChooseProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Photos permission needed',
        'Allow photo access so you can choose and crop a profile picture.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    handleSelectedPhoto(result.assets?.[0], 'gallery');
  };

  const handleTakeProfilePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Camera permission needed',
        'Allow camera access so you can take, crop, and save a profile picture.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      mediaTypes: ['images'],
      quality: 1,
    });
    handleSelectedPhoto(result.assets?.[0], 'camera');
  };

  const handleSelectedPhoto = (
    asset: ImagePicker.ImagePickerAsset | undefined,
    source: 'camera' | 'gallery',
  ) => {
    if (!asset?.uri) return;
    setPendingPhoto({
      fileName: asset.fileName,
      height: asset.height,
      source,
      uri: asset.uri,
      width: asset.width,
    });
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
  };

  const handleCancelPhotoCrop = () => {
    setPendingPhoto(null);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
  };

  const handleApplyPhotoCrop = async () => {
    if (!pendingPhoto) return;
    if (!token) { setMessage('Sign in again to update your profile photo.'); return; }
    const userId =
      typeof user?._id === 'string' ? user._id : typeof user?.id === 'string' ? user.id : null;
    if (!userId) { setMessage('User not found.'); return; }
    setUploadingPhoto(true);
    setMessage(null);
    try {
      const cropAction = getProfilePhotoCropAction(pendingPhoto, cropZoom, cropOffset, cropLayout);
      const resizedPhoto = await ImageManipulator.manipulateAsync(
        pendingPhoto.uri,
        [...(cropAction ? [cropAction] : []), { resize: { width: PROFILE_PHOTO_SIZE } }],
        { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG },
      );
      const updatedUser = await uploadCurrentUserPhoto(token, userId, {
        name: getPhotoFileName(pendingPhoto.fileName, pendingPhoto.source),
        type: 'image/jpeg',
        uri: resizedPhoto.uri,
      });
      setLocalPhotoUri(resizedPhoto.uri);
      setPendingPhoto(null);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      await onUserUpdate?.(updatedUser);
      setMessage('Profile photo updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ---------- Field configs ----------
  const profileFields: ProfileField[] = [
    { label: 'First Name', onChangeText: setFirstName, placeholder: 'First name', value: firstName },
    { label: 'Last Name', onChangeText: setLastName, placeholder: 'Last name', value: lastName },
    {
      label: 'Email',
      onChangeText: () => undefined,
      placeholder: 'Email',
      value: stringField(user?.email),
      keyboardType: 'email-address',
    },
    { label: 'Location', onChangeText: setCountry, placeholder: 'Location', value: country },
    {
      label: 'Date of Birth',
      onChangeText: setDob,
      placeholder: 'YYYY-MM-DD',
      value: dob,
      keyboardType: 'numbers-and-punctuation',
    },
    {
      label: 'Phone Number',
      onChangeText: setPhone,
      placeholder: '+1 234 567 8900',
      value: phone,
      keyboardType: 'phone-pad',
    },
    {
      dropdown: true,
      dropdownOptions: genderOptions,
      label: 'Gender',
      onChangeText: setGender,
      placeholder: 'Select gender',
      value: gender,
    },
  ];

  const homeLocationFields: ProfileField[] = [
    {
      countryDropdown: true,
      dropdown: true,
      label: 'Country',
      onChangeText: setHomeCountry,
      placeholder: 'Country',
      value: homeCountry,
    },
    { label: 'Address', onChangeText: setHomeAddress, placeholder: 'Street address', value: homeAddress },
    { label: 'City', onChangeText: setHomeCity, placeholder: 'City', value: homeCity },
    {
      label: 'Latitude',
      onChangeText: setHomeLat,
      placeholder: '8.5557',
      value: homeLat,
      keyboardType: 'numbers-and-punctuation',
    },
    {
      label: 'Longitude',
      onChangeText: setHomeLon,
      placeholder: '39.2757',
      value: homeLon,
      keyboardType: 'numbers-and-punctuation',
    },
  ];

// ---------- Render ----------
return (
  <SafeAreaView edges={['left', 'right']} style={styles.profileScreen}>
    <ScrollView
      contentContainerStyle={styles.profileScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHero}>
        <View style={styles.profileInfo}>
          {/* Plan row – only Upgrade button, right-aligned */}
          <View style={styles.profilePlan}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.profileUpgradeButton,
                pressed && styles.pressedFeedback,
              ]}
            >
              <Text style={styles.profileUpgradeText}>Upgrade</Text>
            </Pressable>
          </View>

          {/* Avatar, name, username – centered */}
          <View style={styles.profilePictureGroup}>
            <Pressable
              accessibilityLabel="View profile picture"
              accessibilityRole="imagebutton"
              onPress={() => {
                setPhotoPreviewZoom(1);
                setPhotoPreviewOffset({ x: 0, y: 0 });
                setIsPhotoPreviewOpen(true);
              }}
            >
              <View style={styles.profileAvatarFrame}>
                <Image
                  onError={() => setProfileImageLoadFailed(true)}
                  source={profileImageSource}
                  style={styles.profileAvatar}
                />
                {uploadingPhoto ? (
                  <View style={styles.profileAvatarUploading}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  </View>
                ) : null}
              </View>
            </Pressable>
            <View style={styles.profilePictureButtons}>
              <Pressable
                accessibilityLabel="Choose profile picture from phone"
                accessibilityRole="button"
                disabled={uploadingPhoto}
                onPress={handleChooseProfilePhoto}
                style={({ pressed }) => [
                  styles.profilePictureButton,
                  { marginLeft: 25 },
                  uploadingPhoto && styles.profilePictureButtonDisabled,
                  pressed && styles.pressedFeedback,
                ]}
              >
                <GalleryIcon />
              </Pressable>
              <Pressable
                accessibilityLabel="Take profile picture"
                accessibilityRole="button"
                disabled={uploadingPhoto}
                onPress={handleTakeProfilePhoto}
                style={({ pressed }) => [
                  styles.profilePictureButton,
                  { marginLeft: 25 },
                  uploadingPhoto && styles.profilePictureButtonDisabled,
                  pressed && styles.pressedFeedback,
                ]}
              >
                <CameraIcon />
              </Pressable>
            </View>
          </View>

          {/* ✅ FIXED: Identity block with proper String() wrapping */}
          <View style={styles.profileIdentityBlock}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>
                {String(fullName || 'Your Name')}
              </Text>
              <VerificationIcon />
            </View>
            <Text style={styles.profileUsername}>
              {username ? String(username) : 'No email'}
            </Text>
          </View>
        </View>

        {/* Profile page toggle – centered */}
        <Pressable
          accessibilityLabel="Open profile page menu"
          accessibilityRole="button"
          onPress={() => setIsPageMenuOpen(true)}
          style={({ pressed }) => [styles.profilePageToggle, pressed && styles.pressedFeedback]}
        >
          <UserIcon color="#3B82F6" size={20} />
          <Text style={styles.profilePageToggleText}>Profile</Text>
          <ChevronDownIcon size={20} />
        </Pressable>
      </View>

      <ProfileDetailsPage
        currentLocationTitle={currentLocationTitle || 'No home location saved yet.'}
        currentLocationText={currentLocationText || 'No home location saved yet.'}
        homeLocationFields={homeLocationFields}
        hasHomeLocationChanges={hasHomeLocationChanges}
        hasProfileChanges={hasProfileChanges}
        message={message}
        onSetCurrentLocationAsHome={handleSetCurrentLocationAsHome}
        onSaveHomeLocation={handleSaveHomeLocation}
        onSaveProfile={handleSaveProfile}
        profileFields={profileFields}
        savingLocation={savingLocation}
        savingProfile={savingProfile}
      />
    </ScrollView>

    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      onPress={onBack}
      style={({ pressed }) => [styles.profileBackButton, pressed && styles.pressedFeedback]}
    >
      <ArrowLeftIcon />
    </Pressable>

    <FooterWithMenu
      notificationUnreadCount={notificationUnreadCount}
      onLogout={onLogout}
      onOpenChat={onOpenChat ?? (() => undefined)}
      onOpenFlow={onOpenTravelSupport}
      onOpenHome={onOpenHome}
      onOpenNotifications={onOpenNotifications}
      onOpenProfile={onBack}
      onOpenTrips={onOpenJourneys}
      onOpenWallet={onOpenPaymentWallet}
      profileImageUri={menuProfileImageUri}
      source="profile"
    />

    {/* Modals */}
    <Modal
      animationType="fade"
      onRequestClose={() => setIsPageMenuOpen(false)}
      transparent
      visible={isPageMenuOpen}
    >
      <Pressable
        accessibilityLabel="Close profile page menu"
        onPress={() => setIsPageMenuOpen(false)}
        style={styles.profileMenuOverlay}
      >
        <Pressable style={styles.profileMenuCard}>
          <ScrollView
            contentContainerStyle={styles.profileMenuScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {profilePages.map(({ label, icon: Icon }, index) => (
              <Pressable
                accessibilityRole="button"
                key={label}
                onPress={() => handlePagePress(label)}
                style={({ pressed }) => [
                  styles.profileMenuItem,
                  index > 0 && styles.profileMenuItemDivider,
                  pressed && styles.pressedFeedback,
                ]}
              >
                <Icon color="#002AFF" size={20} />
                <Text style={styles.profileMenuItemText}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>

    <PhotoCropModal
      imageUri={pendingPhoto?.uri || null}
      onApply={handleApplyPhotoCrop}
      onCancel={handleCancelPhotoCrop}
      onLayoutChange={setCropLayout}
      onOffsetChange={setCropOffset}
      onZoomIn={() => adjustCropZoom(1)}
      onZoomOut={() => adjustCropZoom(-1)}
      offset={cropOffset}
      pendingPhoto={pendingPhoto}
      uploading={uploadingPhoto}
      visible={Boolean(pendingPhoto)}
      zoom={cropZoom}
      onZoomChange={setCropZoom}
    />

    <PhotoPreviewModal
      imageSource={profileImageSource}
      onClose={() => setIsPhotoPreviewOpen(false)}
      offset={photoPreviewOffset}
      onOffsetChange={setPhotoPreviewOffset}
      onZoomIn={() => adjustPhotoPreviewZoom(1)}
      onZoomOut={() => adjustPhotoPreviewZoom(-1)}
      visible={isPhotoPreviewOpen}
      zoom={photoPreviewZoom}
      onZoomChange={setPhotoPreviewZoom}
    />
  </SafeAreaView>
);
}