import { useEffect, useRef, useState } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import RightArrowIcon from '../../../assets/icons/right-arrow.svg';
import SpeakIcon from '../../../assets/icons/whisper/speak-line-#002AFF.svg';
import type { AuthUser } from '../../api/auth/auth';
import {
  revealCompanionSensitiveDocument,
  type Companion,
  type CompanionPayload,
} from '../../api/profile/companions';
import { getClientAssetUrl } from '../../api/profile/profile';
import { defaultProfileImage } from '../../assets/images';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import {
  ProfileFormField,
  type ProfileFormFieldConfig,
} from '../../components/profile/ProfileFormField';
import {
  DEFAULT_CROP_LAYOUT,
  MIN_PHOTO_ZOOM,
  PHOTO_ZOOM_STEP,
  PROFILE_PHOTO_SIZE,
  PhotoCropModal,
  PhotoPreviewModal,
  clampZoom,
  constrainCropFrameOffset,
  getProfilePhotoCropAction,
  type CropLayout,
  type PendingProfilePhoto,
  type Point,
} from '../../components/profile/ProfilePhotoModals';
import {
  SensitiveDocumentAccessModal,
  type SensitiveDocumentAction,
} from '../../components/profile/SensitiveDocumentAccessModal';
import { useCompanions } from '../../hooks/profile/useCompanions';
import { styles as themeStyles } from '../../theme/styles';
import {
  formatDateField,
  genderOptions,
  getMaskedSensitiveNumber,
  getPinnedCountryOptions,
  isMaskedSensitiveValue,
  isObjectRecord,
  stringField,
} from '../../utils/profileForm';

// ---------------------------------------------------------------------
// Compact style overrides (merged with theme)
// ---------------------------------------------------------------------
const compactStyles = StyleSheet.create({
  // ---------- Used by all screens ----------
  profileScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },

  profileHero: {
    paddingTop: 40,
    paddingBottom: 12,
    alignItems: 'center',
  },

  profileHeroCompact: {
    paddingTop: 0,
    paddingBottom: 12,
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

  // ---------- Shared section heading ----------
  profileSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    flexShrink: 0,
  },

  profileSectionTitle: {
    marginLeft: 72,
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  profileSectionSubtitle: {
    marginLeft: 72,
    fontSize: 13,
    color: '#6B7280',
  },

  // ---------- Shared form card (used in Documents and Companions) ----------
  profileDocumentsForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 72,
    marginBottom: 16,
    shadowOpacity: 0.05,
    elevation: 1,
    flexShrink: 0,
  },

  profileCompanionForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 72,
    marginBottom: 16,
    shadowOpacity: 0.05,
    elevation: 1,
    flexShrink: 0,
  },

  // ---------- Main containers for Documents & Companions ----------
  profileDocumentsMain: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flex: 0,
    paddingTop: 0,
    paddingBottom: 20,
  },

  profileCompanionsMain: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flex: 0,
    paddingTop: 0,
    paddingBottom: 20,
  },

  // ---------- Shared input and dropdown styles ----------
  profileInput: {
    height: 36,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileInputText: {
    fontSize: 15,
    color: '#1A1A1A',
    flex: 1,
  },

  profileField: {
    position: 'relative',
    marginBottom: 4,
    zIndex: 1,
  },

  profileFields: {
    gap: 8,
    marginBottom: 12,
  },

  profileFormLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    color: '#1A1A1A',
  },

  // ---------- Country dropdown ----------
  profileCountryDropdownCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 8,
    maxHeight: 200,
    overflow: 'hidden',
    position: 'absolute',
    top: '100%',
    marginTop: 4,
    width: '100%',
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  profileCountrySearchShell: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  profileCountrySearchInput: {
    height: 32,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 13,
  },

  profileCountryDropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  profileCountryDropdownItemDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },

  profileCountryDropdownText: {
    fontSize: 14,
    color: '#1A1A1A',
  },

  profileCountryDropdownCode: {
    fontSize: 12,
    color: '#6B7280',
  },

  // ---------- Document & Companion label rows (for masked fields) ----------
  profileDocumentLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  profileDocumentUpdate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  profileDocumentUpdateText: {
    fontSize: 12,
    color: '#002AFF',
    fontWeight: '500',
  },

  // ---------- Shared buttons ----------
  profilePrimaryButton: {
    backgroundColor: '#002AFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profilePrimaryButtonDisabled: {
    opacity: 0.6,
  },

  profilePrimaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },

  profileTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    marginBottom: 8,
  },

  profileTextButtonLabel: {
    fontSize: 14,
    color: '#002AFF',
    fontWeight: '500',
  },

  profileSaveMessage: {
    marginTop: 8,
    fontSize: 13,
    color: '#00A67E',
    textAlign: 'center',
  },

  // ---------- Companions-specific ----------
  profileCompanionPictureGroup: {
    position: 'relative',
    width: 84,
    height: 84,
    marginBottom: 24,
    alignSelf: 'center',
    overflow: 'visible',
  },

  profileAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: 'visible',
  },

  profilePictureButtons: {
    position: 'absolute',
    left: 40,
    top: 58,
    flexDirection: 'row',
    gap: 8,
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

  profileCompanionIdSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },

  // ---------- Companion Actions – CENTERED ----------
  profileCompanionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',   // ← centers the buttons horizontally
    gap: 12,
    marginTop: 8,
  },

  profileCompanionActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },

  profileCompanionPetButton: {
    backgroundColor: '#F0FDF4',
  },

  // Companion chips (horizontal scroll)
  profileBudgetChipsViewport: {
    marginBottom: 12,
  },

  profileBudgetChips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },

  profileBudgetChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  profileBudgetChipActive: {
    backgroundColor: '#002AFF',
    borderColor: '#002AFF',
  },

  profileBudgetChipText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },

  profileBudgetChipTextActive: {
    color: '#FFFFFF',
  },

  profileCompanionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },

  // ---------- Shared inline heading ----------
  profileInlineHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  profileInlineHeadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  // ---------- Document-specific (not used by Companions, but included for completeness) ----------
  profileDisclaimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginTop: 48,
    marginBottom: 24,
    gap: 12,
    flexShrink: 0,
  },

  profilePersonalInfoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },

  profilePersonalInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  profilePersonalInfoRows: {
    gap: 6,
  },

  profilePersonalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  profilePersonalInfoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },

  profilePersonalInfoValue: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '500',
  },

  profilePersonalInfoValueVerified: {
    color: '#00A67E',
  },

  profileDocumentsFieldList: {
    gap: 8,
    marginBottom: 12,
  },

  profileDocumentsSaveButton: {
    marginTop: 4,
  },
});

// Merge with the original theme
const styles = { ...themeStyles, ...compactStyles };

// ---------------------------------------------------------------------
// Types (unchanged)
// ---------------------------------------------------------------------
type CompanionsScreenProps = {
  notificationUnreadCount?: number;
  onBack: () => void;
  onLogout?: () => void;
  onOpenChat?: () => void;
  onOpenDocuments: () => void;
  onOpenExpenses: () => void;
  onOpenHome: () => void;
  onOpenJourneys: () => void;
  onOpenNotifications: () => void;
  onOpenPaymentWallet: () => void;
  onOpenPreferences: () => void;
  onOpenProfile: () => void;
  onOpenSecurity: () => void;
  onOpenTravelSupport: () => void;
  onOpenWhisper: () => void;
  profileImageUri?: string | null;
  token: string | null;
  user: AuthUser | null;
};

type CompanionField = {
  countryDropdown?: boolean;
  dropdown?: boolean;
  dropdownOptions?: { label: string; value: string }[];
  editable?: boolean;
  keyboardType?: 'default' | 'numbers-and-punctuation';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  onReveal?: () => void;
  onToggleEdit?: () => void;
  placeholder?: string;
  updateLabel?: string;
  value: string;
  calendar?: boolean;
  masked?: boolean;
};

type CompanionDraft = {
  _id?: string;
  type: 'traveler' | 'pet';
  displayName: string;
  photo: string;
  fullName: string;
  relationship: string;
  dob: string;
  gender: string;
  passportNumber: string;
  passportExpiry: string;
  passportIssuingCountry: string;
  nationalIdNumber: string;
  name: string;
  species: string;
  breed: string;
  notes: string;
};

type RevealableCompanionField = 'passportNumber' | 'nationalIdNumber';

type ProfilePageLabel =
  | 'Profile'
  | 'Documents'
  | 'Companions'
  | 'Expenses'
  | 'Whisper'
  | 'Preferences'
  | 'Security';

const profilePages: { label: ProfilePageLabel; icon: typeof UserIcon }[] = [
  { label: 'Profile', icon: UserIcon },
  { label: 'Documents', icon: DocumentsIcon },
  { label: 'Companions', icon: CompanionsIcon },
  { label: 'Expenses', icon: ExpensesIcon },
  { label: 'Whisper', icon: SpeakMenuIcon },
  { label: 'Preferences', icon: SettingsIcon },
  { label: 'Security', icon: LockIcon },
];

const emptyTravelerDraft = (): CompanionDraft => ({
  type: 'traveler',
  displayName: '',
  photo: '',
  fullName: '',
  relationship: '',
  dob: '',
  gender: '',
  passportNumber: '',
  passportExpiry: '',
  passportIssuingCountry: '',
  nationalIdNumber: '',
  name: '',
  species: '',
  breed: '',
  notes: '',
});

const emptyPetDraft = (): CompanionDraft => ({
  ...emptyTravelerDraft(),
  type: 'pet',
});

const buildDraftFromCompanion = (companion: Companion): CompanionDraft => ({
  ...emptyTravelerDraft(),
  _id: companion._id,
  type: companion.type,
  displayName: stringField(companion.displayName),
  photo: stringField(companion.photo),
  fullName: stringField(companion.fullName),
  relationship: stringField(companion.relationship),
  dob: formatDateField(companion.dob),
  gender: stringField(companion.gender),
  passportNumber: stringField(companion.travelDocuments?.passportNumber),
  passportExpiry: formatDateField(companion.travelDocuments?.passportExpiry),
  passportIssuingCountry: stringField(companion.travelDocuments?.passportIssuingCountry),
  nationalIdNumber: stringField(companion.travelDocuments?.nationalIdNumber),
  name: stringField(companion.name),
  species: stringField(companion.species),
  breed: stringField(companion.breed),
  notes: stringField(companion.notes),
});

const buildPayloadFromDraft = (draft: CompanionDraft): CompanionPayload => {
  if (draft.type === 'pet') {
    return {
      type: 'pet',
      displayName: draft.name || draft.displayName,
      name: draft.name,
      species: draft.species,
      breed: draft.breed,
      dob: draft.dob || null,
      gender: draft.gender,
      notes: draft.notes,
    };
  }

  const travelDocuments: CompanionPayload['travelDocuments'] = {
    passportExpiry: draft.passportExpiry || null,
    passportIssuingCountry: draft.passportIssuingCountry,
  };

  if (!isMaskedSensitiveValue(draft.passportNumber)) {
    travelDocuments.passportNumber = draft.passportNumber;
  }

  if (!isMaskedSensitiveValue(draft.nationalIdNumber)) {
    travelDocuments.nationalIdNumber = draft.nationalIdNumber;
  }

  return {
    type: 'traveler',
    displayName: draft.fullName || draft.displayName,
    fullName: draft.fullName,
    relationship: draft.relationship,
    dob: draft.dob || null,
    gender: draft.gender,
    travelDocuments,
  };
};

// ---------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------
export function CompanionsScreen({
  notificationUnreadCount = 0,
  onBack,
  onLogout,
  onOpenChat,
  onOpenDocuments,
  onOpenExpenses,
  onOpenHome,
  onOpenJourneys,
  onOpenNotifications,
  onOpenPaymentWallet,
  onOpenPreferences,
  onOpenProfile,
  onOpenSecurity,
  onOpenTravelSupport,
  onOpenWhisper,
  profileImageUri,
  token,
  user,
}: CompanionsScreenProps) {
  const [isPageMenuOpen, setIsPageMenuOpen] = useState(false);
  const {
    companions,
    deleting,
    loading,
    message,
    removeCompanion,
    saveCompanion,
    saveCompanionPhoto,
    saving,
    setMessage,
    uploadingPhoto,
  } = useCompanions(token);
  const [draft, setDraft] = useState<CompanionDraft>(() => emptyTravelerDraft());
  const [isEditingPassportNumber, setIsEditingPassportNumber] = useState(false);
  const [isEditingNationalIdNumber, setIsEditingNationalIdNumber] = useState(false);
  const [revealedSensitiveFields, setRevealedSensitiveFields] = useState<
    Partial<Record<RevealableCompanionField, boolean>>
  >({});
  const [revealField, setRevealField] = useState<RevealableCompanionField | null>(null);
  const [revealAction, setRevealAction] = useState<SensitiveDocumentAction>('view');
  const [revealPassword, setRevealPassword] = useState('');
  const [revealTwoFactorCode, setRevealTwoFactorCode] = useState('');
  const [revealingDocument, setRevealingDocument] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<PendingProfilePhoto | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState<Point>({ x: 0, y: 0 });
  const [cropLayout, setCropLayout] = useState<CropLayout>(DEFAULT_CROP_LAYOUT);
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
  const [photoPreviewZoom, setPhotoPreviewZoom] = useState(1);
  const [photoPreviewOffset, setPhotoPreviewOffset] = useState<Point>({ x: 0, y: 0 });
  const dropdownTranslateY = useRef(new Animated.Value(330)).current;
  const twoFactorEnabled = Boolean(
    user?.twoFactorEnabled ||
    (isObjectRecord(user?.security) ? user.security.twoFactorEnabled : false),
  );

  const resetSensitiveState = () => {
    setIsEditingPassportNumber(false);
    setIsEditingNationalIdNumber(false);
    setRevealedSensitiveFields({});
  };

  useEffect(() => {
    Animated.timing(dropdownTranslateY, {
      duration: 260,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [dropdownTranslateY]);

  useEffect(() => {
    setDraft((current) => {
      if (current._id && companions.some((companion) => companion._id === current._id)) {
        return current;
      }

      return companions[0] ? buildDraftFromCompanion(companions[0]) : emptyTravelerDraft();
    });
    resetSensitiveState();
  }, [companions]);

  const updateDraft = (updates: Partial<CompanionDraft>) => {
    setDraft((current) => ({ ...current, ...updates }));
  };

  const handleSelectCompanion = (companion: Companion) => {
    setDraft(buildDraftFromCompanion(companion));
    resetSensitiveState();
    setMessage(null);
    setPhotoLoadFailed(false);
  };

  const handleNewTraveler = () => {
    setDraft(emptyTravelerDraft());
    resetSensitiveState();
    setMessage(null);
  };

  const handleNewPet = () => {
    setDraft(emptyPetDraft());
    resetSensitiveState();
    setMessage(null);
  };

  const openSensitiveDocumentModal = (
    field: RevealableCompanionField,
    action: SensitiveDocumentAction,
  ) => {
    if (!draft._id) {
      Alert.alert('Save companion first', 'Save this companion before revealing document fields.');
      return;
    }

    setRevealField(field);
    setRevealAction(action);
    setRevealPassword('');
    setRevealTwoFactorCode('');
  };

  const closeRevealModal = () => {
    setRevealField(null);
    setRevealAction('view');
    setRevealPassword('');
    setRevealTwoFactorCode('');
  };

  const togglePassportEdit = () => {
    if (isEditingPassportNumber) {
      const savedCompanion = companions.find((companion) => companion._id === draft._id);
      updateDraft({
        passportNumber: stringField(savedCompanion?.travelDocuments?.passportNumber),
      });
      setIsEditingPassportNumber(false);
      setRevealedSensitiveFields((current) => ({ ...current, passportNumber: false }));
      return;
    }

    openSensitiveDocumentModal('passportNumber', 'update');
  };

  const toggleNationalIdEdit = () => {
    if (isEditingNationalIdNumber) {
      const savedCompanion = companions.find((companion) => companion._id === draft._id);
      updateDraft({
        nationalIdNumber: stringField(savedCompanion?.travelDocuments?.nationalIdNumber),
      });
      setIsEditingNationalIdNumber(false);
      setRevealedSensitiveFields((current) => ({ ...current, nationalIdNumber: false }));
      return;
    }

    openSensitiveDocumentModal('nationalIdNumber', 'update');
  };

  const handleRevealSensitiveField = async () => {
    if (!token || !draft._id || !revealField) {
      setMessage('Sign in again to reveal this document.');
      return;
    }

    if (!revealPassword) {
      Alert.alert('Password required', 'Enter your password to reveal this document.');
      return;
    }

    if (twoFactorEnabled && revealTwoFactorCode.length !== 6) {
      Alert.alert('Authenticator code required', 'Enter your current 6-digit authenticator code.');
      return;
    }

    setRevealingDocument(true);
    setMessage(null);

    try {
      const value = await revealCompanionSensitiveDocument(token, draft._id, {
        field: revealField,
        password: revealPassword,
        twoFactorCode: twoFactorEnabled ? revealTwoFactorCode : undefined,
      });

      updateDraft({ [revealField]: value });
      setRevealedSensitiveFields((current) => ({ ...current, [revealField]: true }));

      if (revealAction === 'update') {
        if (revealField === 'passportNumber') {
          setIsEditingPassportNumber(true);
        } else {
          setIsEditingNationalIdNumber(true);
        }
      }

      closeRevealModal();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to reveal document.');
    } finally {
      setRevealingDocument(false);
    }
  };

  const handleSaveCompanion = async () => {
    const savedCompanion = await saveCompanion(draft._id, buildPayloadFromDraft(draft));

    if (savedCompanion) {
      setDraft(buildDraftFromCompanion(savedCompanion));
      resetSensitiveState();
    }
  };

  const handleDeleteCompanion = async () => {
    if (!draft._id) {
      return;
    }

    const deleted = await removeCompanion(draft._id);

    if (deleted) {
      const nextCompanions = companions.filter((companion) => companion._id !== draft._id);
      setDraft(
        nextCompanions[0] ? buildDraftFromCompanion(nextCompanions[0]) : emptyTravelerDraft(),
      );
      resetSensitiveState();
    }
  };

  const handleChooseCompanionPhoto = async () => {
    await handleCompanionPhotoSelection('gallery');
  };

  const handleTakeCompanionPhoto = async () => {
    await handleCompanionPhotoSelection('camera');
  };

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

  const handleCompanionPhotoSelection = async (source: 'camera' | 'gallery') => {
    if (!draft._id) {
      Alert.alert('Save companion first', 'Save this companion before adding a photo.');
      return;
    }

    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        source === 'camera' ? 'Camera permission needed' : 'Photos permission needed',
        'Allow access so you can update this companion photo.',
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            cameraType: ImagePicker.CameraType.front,
            mediaTypes: ['images'],
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 1,
          });
    const asset = result.assets?.[0];

    if (!asset?.uri) {
      return;
    }

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
    if (!draft._id || !pendingPhoto) {
      return;
    }

    const cropAction = getProfilePhotoCropAction(pendingPhoto, cropZoom, cropOffset, cropLayout);
    const resizedPhoto = await ImageManipulator.manipulateAsync(
      pendingPhoto.uri,
      [...(cropAction ? [cropAction] : []), { resize: { width: PROFILE_PHOTO_SIZE } }],
      {
        compress: 0.88,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    const savedCompanion = await saveCompanionPhoto(draft._id, {
      name: getPhotoFileName(pendingPhoto.fileName, pendingPhoto.source),
      type: 'image/jpeg',
      uri: resizedPhoto.uri,
    });

    if (savedCompanion) {
      setDraft(buildDraftFromCompanion(savedCompanion));
      setPhotoLoadFailed(false);
      setPendingPhoto(null);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
    }
  };

  const handlePagePress = (label: ProfilePageLabel) => {
    setIsPageMenuOpen(false);

    if (label === 'Profile') {
      onOpenProfile();
    }

    if (label === 'Documents') {
      onOpenDocuments();
    }

    if (label === 'Expenses') {
      onOpenExpenses();
    }

    if (label === 'Preferences') {
      onOpenPreferences();
    }

    if (label === 'Security') {
      onOpenSecurity();
    }

    if (label === 'Whisper') {
      onOpenWhisper();
    }
  };

  const title =
    draft.type === 'pet'
      ? draft.name || 'New Pet'
      : draft.fullName || `Companion ${companions.length + (draft._id ? 0 : 1)}`;
  const activeCompanion = companions.find((companion) => companion._id === draft._id);
  const companionPhotoUri = getClientAssetUrl(activeCompanion?.photo || draft.photo);
  const companionImageSource =
    companionPhotoUri && !photoLoadFailed ? { uri: companionPhotoUri } : defaultProfileImage;
  const issuingCountryOptions = getPinnedCountryOptions(
    countrySearchQuery,
    draft.passportIssuingCountry,
  );

  const travelerProfileFields: ProfileFormFieldConfig[] = [
    {
      label: 'Full Name (as shown on ID document)',
      onChangeText: (value) => updateDraft({ fullName: value, displayName: value }),
      placeholder: 'Jane Doe',
      value: draft.fullName,
    },
    {
      label: 'Relationship',
      onChangeText: (value) => updateDraft({ relationship: value }),
      placeholder: 'Wife',
      value: draft.relationship,
    },
    {
      calendar: true,
      keyboardType: 'numbers-and-punctuation',
      label: 'Date of Birth',
      onChangeText: (value) => updateDraft({ dob: value }),
      placeholder: 'YYYY-MM-DD',
      value: draft.dob,
    },
    {
      dropdown: true,
      dropdownOptions: genderOptions,
      label: 'Gender',
      onChangeText: (value) => updateDraft({ gender: value }),
      placeholder: 'Select gender',
      value: draft.gender,
    },
  ];

  const travelerIdFields: CompanionField[] = [
    {
      editable: !draft.passportNumber || isEditingPassportNumber,
      label: 'Passport Number',
      masked: true,
      onChangeText: (value) => updateDraft({ passportNumber: value.toUpperCase() }),
      onReveal: draft._id ? () => openSensitiveDocumentModal('passportNumber', 'view') : undefined,
      onToggleEdit: togglePassportEdit,
      placeholder: 'Passport number',
      updateLabel: isEditingPassportNumber ? 'Keep current' : 'Update',
      value:
        draft.passportNumber && !isEditingPassportNumber && !revealedSensitiveFields.passportNumber
          ? getMaskedSensitiveNumber(draft.passportNumber)
          : draft.passportNumber,
    },
    {
      calendar: true,
      keyboardType: 'numbers-and-punctuation',
      label: 'Passport Expiry Date',
      onChangeText: (value) => updateDraft({ passportExpiry: value }),
      placeholder: 'YYYY-MM-DD',
      value: draft.passportExpiry,
    },
    {
      countryDropdown: true,
      dropdown: true,
      label: 'Passport Issuing Country',
      onChangeText: (value) => updateDraft({ passportIssuingCountry: value }),
      placeholder: 'United States of America',
      value: draft.passportIssuingCountry,
    },
    {
      editable: !draft.nationalIdNumber || isEditingNationalIdNumber,
      label: 'National ID Number',
      masked: true,
      onChangeText: (value) => updateDraft({ nationalIdNumber: value }),
      onReveal: draft._id
        ? () => openSensitiveDocumentModal('nationalIdNumber', 'view')
        : undefined,
      onToggleEdit: toggleNationalIdEdit,
      placeholder: 'National ID number',
      updateLabel: isEditingNationalIdNumber ? 'Keep current' : 'Update',
      value:
        draft.nationalIdNumber &&
        !isEditingNationalIdNumber &&
        !revealedSensitiveFields.nationalIdNumber
          ? getMaskedSensitiveNumber(draft.nationalIdNumber)
          : draft.nationalIdNumber,
    },
  ];

  const petFields: ProfileFormFieldConfig[] = [
    {
      label: 'Pet Name',
      onChangeText: (value) => updateDraft({ name: value, displayName: value }),
      placeholder: 'Milo',
      value: draft.name,
    },
    {
      label: 'Species',
      onChangeText: (value) => updateDraft({ species: value }),
      placeholder: 'Dog',
      value: draft.species,
    },
    {
      label: 'Breed',
      onChangeText: (value) => updateDraft({ breed: value }),
      placeholder: 'Labrador',
      value: draft.breed,
    },
    {
      calendar: true,
      keyboardType: 'numbers-and-punctuation',
      label: 'Date of Birth',
      onChangeText: (value) => updateDraft({ dob: value }),
      placeholder: 'YYYY-MM-DD',
      value: draft.dob,
    },
    {
      dropdown: true,
      dropdownOptions: genderOptions,
      label: 'Gender',
      onChangeText: (value) => updateDraft({ gender: value }),
      placeholder: 'Select gender',
      value: draft.gender,
    },
    {
      label: 'Notes',
      multiline: true,
      onChangeText: (value) => updateDraft({ notes: value }),
      placeholder: 'Food, carrier, or travel notes',
      value: draft.notes,
    },
  ];

  // ---------- Render ----------
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.profileScreen}>
      <ScrollView
        contentContainerStyle={styles.profileScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ transform: [{ translateY: dropdownTranslateY }] }}>
          <View style={[styles.profileHero, styles.profileHeroCompact]}>
            <Pressable
              accessibilityLabel="Open profile page menu"
              accessibilityRole="button"
              onPress={() => setIsPageMenuOpen(true)}
              style={({ pressed }) => [
                styles.profilePageToggle,
                styles.profilePageToggleCompact,
                pressed && styles.pressedFeedback,
              ]}
            >
              <CompanionsIcon color="#002AFF" size={20} />
              <Text style={styles.profilePageToggleText}>Companions</Text>
              <ChevronDownIcon size={20} />
            </Pressable>
          </View>

          <View style={styles.profileCompanionsMain}>
            <View style={styles.profileSectionHeading}>
              <View>
                <Text style={styles.profileSectionTitle}>Companions</Text>
                <Text style={styles.profileSectionSubtitle}>
                  Add friends, family, and pets to your journey
                </Text>
              </View>
            </View>

            <View style={styles.profileCompanionForm}>
              {loading ? <ActivityIndicator color="#002AFF" /> : null}

              {companions.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.profileBudgetChipsViewport}
                  contentContainerStyle={styles.profileBudgetChips}
                >
                  {companions.map((companion) => {
                    const isActive = companion._id === draft._id;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={companion._id}
                        onPress={() => handleSelectCompanion(companion)}
                        style={({ pressed }) => [
                          styles.profileBudgetChip,
                          isActive && styles.profileBudgetChipActive,
                          pressed && styles.pressedFeedback,
                        ]}
                      >
                        <Text
                          style={[
                            styles.profileBudgetChipText,
                            isActive && styles.profileBudgetChipTextActive,
                          ]}
                        >
                          {companion.displayName ||
                            companion.fullName ||
                            companion.name ||
                            (companion.type === 'pet' ? 'Pet' : 'Traveler')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}

              <Text style={styles.profileCompanionTitle}>{title}</Text>

              <View style={styles.profileInlineHeading}>
                {draft.type === 'pet' ? <PetIcon /> : <UserSmileIcon />}
                <Text style={styles.profileInlineHeadingText}>
                  {draft.type === 'pet' ? 'Pet Information' : 'Profile Information'}
                </Text>
              </View>

              <View style={styles.profileCompanionPictureGroup}>
                <Pressable
                  accessibilityLabel="View companion picture"
                  accessibilityRole="imagebutton"
                  onPress={() => {
                    setPhotoPreviewZoom(1);
                    setPhotoPreviewOffset({ x: 0, y: 0 });
                    setIsPhotoPreviewOpen(true);
                  }}
                >
                  <Image
                    onError={() => setPhotoLoadFailed(true)}
                    source={companionImageSource}
                    style={styles.profileAvatar}
                  />
                </Pressable>
                <View style={styles.profilePictureButtons}>
                  <Pressable
                    accessibilityLabel="Choose companion picture from phone"
                    accessibilityRole="button"
                    disabled={uploadingPhoto}
                    onPress={handleChooseCompanionPhoto}
                    style={({ pressed }) => [
                      styles.profilePictureButton,
                      uploadingPhoto && styles.profilePictureButtonDisabled,
                      pressed && styles.pressedFeedback,
                    ]}
                  >
                    <GalleryIcon />
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Take companion picture"
                    accessibilityRole="button"
                    disabled={uploadingPhoto}
                    onPress={handleTakeCompanionPhoto}
                    style={({ pressed }) => [
                      styles.profilePictureButton,
                      uploadingPhoto && styles.profilePictureButtonDisabled,
                      pressed && styles.pressedFeedback,
                    ]}
                  >
                    <CameraIcon />
                  </Pressable>
                </View>
              </View>

              <View style={styles.profileFields}>
                {(draft.type === 'pet' ? petFields : travelerProfileFields).map((field) => (
                  <ProfileFormField
                    dropdownActive={activeDropdown === field.label}
                    field={field}
                    key={field.label}
                    onSelectOption={(value) => {
                      field.onChangeText(value);
                      setActiveDropdown(null);
                    }}
                    onToggleDropdown={() =>
                      setActiveDropdown((current) => (current === field.label ? null : field.label))
                    }
                  />
                ))}
              </View>

              {draft.type === 'traveler' ? (
                <View style={styles.profileCompanionIdSection}>
                  <View style={styles.profileInlineHeading}>
                    <PassportIcon />
                    <Text style={styles.profileInlineHeadingText}>ID Information</Text>
                  </View>

                  <View style={styles.profileFields}>
                    {travelerIdFields.map((field) =>
                      field.dropdown ? (
                        <ProfileFormField
                          countryOptions={issuingCountryOptions}
                          dropdownActive={activeDropdown === field.label}
                          dropdownSearchQuery={
                            activeDropdown === field.label ? countrySearchQuery : ''
                          }
                          field={field}
                          key={`id-${field.label}`}
                          onSearchCountries={setCountrySearchQuery}
                          onSelectCountry={(country) => {
                            field.onChangeText(country.name);
                            setActiveDropdown(null);
                            setCountrySearchQuery('');
                          }}
                          onToggleDropdown={() => {
                            setActiveDropdown((current) =>
                              current === field.label ? null : field.label,
                            );
                            setCountrySearchQuery('');
                          }}
                        />
                      ) : (
                        <CompanionInput key={`id-${field.label}`} field={field} />
                      ),
                    )}
                  </View>
                </View>
              ) : null}

              <View style={styles.profileCompanionIdSection}>
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={handleSaveCompanion}
                  style={({ pressed }) => [
                    styles.profilePrimaryButton,
                    saving && styles.profilePrimaryButtonDisabled,
                    pressed && styles.pressedFeedback,
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.profilePrimaryButtonText}>Save Companion</Text>
                  )}
                </Pressable>
                {draft._id ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={deleting}
                    onPress={handleDeleteCompanion}
                    style={({ pressed }) => [
                      styles.profileTextButton,
                      deleting && styles.profilePictureButtonDisabled,
                      pressed && styles.pressedFeedback,
                    ]}
                  >
                    <Text style={styles.profileTextButtonLabel}>
                      {deleting ? 'Deleting...' : 'Delete companion'}
                    </Text>
                  </Pressable>
                ) : null}
                {message ? <Text style={styles.profileSaveMessage}>{message}</Text> : null}
              </View>

              <View style={styles.profileCompanionActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleNewTraveler}
                  style={({ pressed }) => [
                    styles.profileTextButton,
                    styles.profileCompanionActionButton,
                    pressed && styles.pressedFeedback,
                  ]}
                >
                  <UserAddIcon />
                  <Text style={styles.profileTextButtonLabel}>Add another travel companion</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={handleNewPet}
                  style={({ pressed }) => [
                    styles.profileCompanionPetButton,
                    styles.profileCompanionActionButton,
                    pressed && styles.pressedFeedback,
                  ]}
                >
                  <PetIcon />
                  <Text style={styles.profileTextButtonLabel}>Add a pet</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <Pressable
        accessibilityLabel="Go back to profile"
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
        onOpenProfile={onOpenProfile}
        onOpenTrips={onOpenJourneys}
        onOpenWallet={onOpenPaymentWallet}
        profileImageUri={profileImageUri}
        source="profileCompanions"
      />

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

      <SensitiveDocumentAccessModal
        action={revealAction}
        busy={revealingDocument}
        documentLabel={
          revealField === 'passportNumber'
            ? 'this companion passport number'
            : 'this companion national ID number'
        }
        onClose={closeRevealModal}
        onConfirm={handleRevealSensitiveField}
        onPasswordChange={setRevealPassword}
        onTwoFactorCodeChange={setRevealTwoFactorCode}
        password={revealPassword}
        twoFactorCode={revealTwoFactorCode}
        twoFactorEnabled={twoFactorEnabled}
        visible={Boolean(revealField)}
      />

      <PhotoCropModal
        imageUri={pendingPhoto?.uri || null}
        onApply={handleApplyPhotoCrop}
        onCancel={handleCancelPhotoCrop}
        onLayoutChange={setCropLayout}
        onOffsetChange={setCropOffset}
        onZoomIn={() => adjustCropZoom(1)}
        onZoomOut={() => adjustCropZoom(-1)}
        offset={cropOffset}
        uploading={uploadingPhoto}
        visible={Boolean(pendingPhoto)}
        zoom={cropZoom}
        onZoomChange={setCropZoom}
      />

      <PhotoPreviewModal
        imageSource={companionImageSource}
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

// ---------------------------------------------------------------------
// Sub‑components and helpers
// ---------------------------------------------------------------------
function CompanionInput({ field }: { field: CompanionField }) {
  const editable = field.editable !== false;

  return (
    <View style={styles.profileField}>
      <View style={styles.profileDocumentLabelRow}>
        <Text style={styles.profileFormLabel}>{field.label}</Text>
        {field.masked && field.value ? (
          <View style={styles.profileDocumentUpdate}>
            {field.onReveal ? (
              <Pressable accessibilityRole="button" onPress={field.onReveal}>
                <EyeClosedIcon />
              </Pressable>
            ) : null}
            {field.onToggleEdit ? (
              <Pressable accessibilityRole="button" onPress={field.onToggleEdit}>
                <Text style={styles.profileDocumentUpdateText}>
                  {field.updateLabel || 'Update'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      <View style={styles.profileInput}>
        <TextInput
          editable={editable}
          keyboardType={field.keyboardType || 'default'}
          multiline={field.multiline}
          onChangeText={field.onChangeText}
          placeholder={field.placeholder}
          placeholderTextColor="#6A7282"
          style={styles.profileInputText}
          value={field.value}
        />
        {field.calendar ? <CalendarDateIcon /> : null}
      </View>
    </View>
  );
}

function getPhotoFileName(
  fileName: string | null | undefined,
  source: 'camera' | 'gallery',
): string {
  const fallbackName = source === 'camera' ? 'camera-companion.jpg' : 'companion-avatar.jpg';

  if (!fileName) {
    return fallbackName;
  }

  const withoutExtension = fileName.replace(/\.[^.]+$/, '');

  return `${withoutExtension || 'companion-avatar'}.jpg`;
}

// ---------------------------------------------------------------------
// Icons (all as before, included for completeness)
// ---------------------------------------------------------------------
function ArrowLeftIcon() {
  return <RightArrowIcon color="#FFFFFF" height={18} style={styles.profileBackIcon} width={18} />;
}

function CalendarDateIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 1V3H15V1H17V3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H7V1H9ZM20 11H4V19H20V11ZM8 13V15H6V13H8ZM13 13V15H11V13H13ZM18 13V15H16V13H18ZM7 5H4V9H20V5H17V7H15V5H9V7H7V5Z"
        fill="#0A0A0A"
      />
    </Svg>
  );
}

function CameraIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
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
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m7 10 5 5 5-5" stroke="#0A0A0A" strokeLinecap="round" strokeWidth={2} />
    </Svg>
  );
}

function EyeClosedIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        d="M7.00701 14.0864L5.55812 13.6982L6.14873 11.4941C5.25689 11.1656 4.43746 10.6874 3.72087 10.0901L2.10587 11.705L1.04522 10.6444L2.66021 9.0294C1.76686 7.95773 1.14011 6.656 0.881836 5.22614L2.3579 4.95776C2.92717 8.10945 5.68448 10.5001 9.00015 10.5001C12.3158 10.5001 15.0732 8.10945 15.6425 4.95776L17.1185 5.22614C16.8602 6.656 16.2335 7.95773 15.3401 9.0294L16.9551 10.6444L15.8945 11.705L14.2795 10.0901C13.5629 10.6874 12.7434 11.1656 11.8516 11.4941L12.4422 13.6982L10.9934 14.0864L10.4025 11.8814C9.94673 11.9594 9.4782 12.0001 9.00015 12.0001C8.52218 12.0001 8.05358 11.9594 7.59788 11.8814L7.00701 14.0864Z"
        fill="#0A0A0A"
      />
    </Svg>
  );
}

function GalleryIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
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

function DocumentsIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 4h12v16H6V4Z" stroke={color} strokeLinejoin="round" strokeWidth={1.9} />
      <Path d="M9 9h6M9 13h6M9 17h3" stroke={color} strokeLinecap="round" strokeWidth={1.9} />
    </Svg>
  );
}

function CompanionsIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21" fill="none">
      <Path
        d="M10.5 9.625C12.9162 9.625 14.875 11.5838 14.875 14V19.25H13.125V14C13.125 12.602 12.0322 11.4593 10.6543 11.3795L10.5 11.375C9.10201 11.375 7.9593 12.4678 7.87945 13.8457L7.875 14V19.25H6.125V14C6.125 11.5838 8.08376 9.625 10.5 9.625ZM4.8125 12.25C5.05649 12.25 5.29383 12.2785 5.52134 12.3324C5.37427 12.7698 5.28389 13.2318 5.25784 13.7106L5.25 14L5.25061 14.0749C5.15162 14.0399 5.04718 14.0164 4.9389 14.006L4.8125 14C4.13026 14 3.56961 14.5205 3.50601 15.1861L3.5 15.3125V19.25H1.75V15.3125C1.75 13.6211 3.12113 12.25 4.8125 12.25ZM16.1875 12.25C17.8789 12.25 19.25 13.6211 19.25 15.3125V19.25H17.5V15.3125C17.5 14.6303 16.9795 14.0697 16.3139 14.006L16.1875 14C16.0342 14 15.887 14.0262 15.7503 14.0745L15.75 14C15.75 13.4175 15.6551 12.8573 15.4801 12.3337C15.7062 12.2785 15.9435 12.25 16.1875 12.25ZM4.8125 7C6.02062 7 7 7.97938 7 9.1875C7 10.3956 6.02062 11.375 4.8125 11.375C3.60438 11.375 2.625 10.3956 2.625 9.1875C2.625 7.97938 3.60438 7 4.8125 7ZM16.1875 7C17.3956 7 18.375 7.97938 18.375 9.1875C18.375 10.3956 17.3956 11.375 16.1875 11.375C14.9794 11.375 14 10.3956 14 9.1875C14 7.97938 14.9794 7 16.1875 7ZM4.8125 8.75C4.57088 8.75 4.375 8.94591 4.375 9.1875C4.375 9.42909 4.57088 9.625 4.8125 9.625C5.05412 9.625 5.25 9.42909 5.25 9.1875C5.25 8.94591 5.05412 8.75 4.8125 8.75ZM16.1875 8.75C15.9459 8.75 15.75 8.94591 15.75 9.1875C15.75 9.42909 15.9459 9.625 16.1875 9.625C16.4291 9.625 16.625 9.42909 16.625 9.1875C16.625 8.94591 16.4291 8.75 16.1875 8.75ZM10.5 1.75C12.433 1.75 14 3.317 14 5.25C14 7.183 12.433 8.75 10.5 8.75C8.567 8.75 7 7.183 7 5.25C7 3.317 8.567 1.75 10.5 1.75ZM10.5 3.5C9.53348 3.5 8.75 4.2835 8.75 5.25C8.75 6.2165 9.53348 7 10.5 7C11.4665 7 12.25 6.2165 12.25 5.25C12.25 4.2835 11.4665 3.5 10.5 3.5Z"
        fill={color}
      />
    </Svg>
  );
}

function ExpensesIcon({ color = '#0A0A0A', size }: { color?: string; size: number }) {
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

function PassportIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={6} y={3} width={12} height={18} rx={2} stroke="#002AFF" strokeWidth={1.8} />
      <Circle cx={12} cy={10} r={2.6} stroke="#002AFF" strokeWidth={1.6} />
      <Path d="M9 16h6" stroke="#002AFF" strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
}

function PetIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 21 21" fill="none">
      <Path
        d="M10.5 9.625C12.9162 9.625 14.875 11.5838 14.875 14V19.25H13.125V14C13.125 12.602 12.0322 11.4593 10.6543 11.3795L10.5 11.375C9.10201 11.375 7.9593 12.4678 7.87945 13.8457L7.875 14V19.25H6.125V14C6.125 11.5838 8.08376 9.625 10.5 9.625ZM4.8125 12.25C5.05649 12.25 5.29383 12.2785 5.52134 12.3324C5.37427 12.7698 5.28389 13.2318 5.25784 13.7106L5.25 14L5.25061 14.0749C5.15162 14.0399 5.04718 14.0164 4.9389 14.006L4.8125 14C4.13026 14 3.56961 14.5205 3.50601 15.1861L3.5 15.3125V19.25H1.75V15.3125C1.75 13.6211 3.12113 12.25 4.8125 12.25ZM16.1875 12.25C17.8789 12.25 19.25 13.6211 19.25 15.3125V19.25H17.5V15.3125C17.5 14.6303 16.9795 14.0697 16.3139 14.006L16.1875 14C16.0342 14 15.887 14.0262 15.7503 14.0745L15.75 14C15.75 13.4175 15.6551 12.8573 15.4801 12.3337C15.7062 12.2785 15.9435 12.25 16.1875 12.25ZM4.8125 7C6.02062 7 7 7.97938 7 9.1875C7 10.3956 6.02062 11.375 4.8125 11.375C3.60438 11.375 2.625 10.3956 2.625 9.1875C2.625 7.97938 3.60438 7 4.8125 7ZM16.1875 7C17.3956 7 18.375 7.97938 18.375 9.1875C18.375 10.3956 17.3956 11.375 16.1875 11.375C14.9794 11.375 14 10.3956 14 9.1875C14 7.97938 14.9794 7 16.1875 7ZM4.8125 8.75C4.57088 8.75 4.375 8.94591 4.375 9.1875C4.375 9.42909 4.57088 9.625 4.8125 9.625C5.05412 9.625 5.25 9.42909 5.25 9.1875C5.25 8.94591 5.05412 8.75 4.8125 8.75ZM16.1875 8.75C15.9459 8.75 15.75 8.94591 15.75 9.1875C15.75 9.42909 15.9459 9.625 16.1875 9.625C16.4291 9.625 16.625 9.42909 16.625 9.1875C16.625 8.94591 16.4291 8.75 16.1875 8.75ZM10.5 1.75C12.433 1.75 14 3.317 14 5.25C14 7.183 12.433 8.75 10.5 8.75C8.567 8.75 7 7.183 7 5.25C7 3.317 8.567 1.75 10.5 1.75ZM10.5 3.5C9.53348 3.5 8.75 4.2835 8.75 5.25C8.75 6.2165 9.53348 7 10.5 7C11.4665 7 12.25 6.2165 12.25 5.25C12.25 4.2835 11.4665 3.5 10.5 3.5Z"
        fill="#002AFF"
      />
    </Svg>
  );
}

function UserAddIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8} r={3.5} stroke="#002AFF" strokeWidth={1.8} />
      <Path
        d="M3 20c.8-3.8 2.8-5.7 6-5.7 1.3 0 2.4.3 3.3.9"
        stroke="#002AFF"
        strokeLinecap="round"
        strokeWidth={1.8}
      />
      <Path d="M18 11v7M14.5 14.5h7" stroke="#002AFF" strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
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
        d="M9.99984 18.3333C5.39746 18.3333 1.6665 14.6023 1.6665 9.99999C1.6665 5.39761 5.39746 1.66666 9.99984 1.66666C14.6022 1.66666 18.3332 5.39761 18.3332 9.99999C18.3332 14.6023 14.6022 18.3333 9.99984 18.3333ZM9.99984 16.6667C13.6818 16.6667 16.6665 13.6819 16.6665 9.99999C16.6665 6.31809 13.6818 3.33332 9.99984 3.33332C6.31794 3.33332 3.33317 6.31809 3.33317 9.99999C3.33317 13.6819 6.31794 16.6667 9.99984 16.6667ZM5.83317 9.99999H7.49984C7.49984 11.3807 8.61909 12.5 9.99984 12.5C11.3806 12.5 12.4998 11.3807 12.4998 9.99999H14.1665C14.1665 12.3012 12.301 14.1667 9.99984 14.1667C7.69865 14.1667 5.83317 12.3012 5.83317 9.99999Z"
        fill="#002AFF"
      />
    </Svg>
  );
}