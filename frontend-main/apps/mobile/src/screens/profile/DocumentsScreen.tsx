import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { revealSensitiveTravelDocument, updateCurrentUser } from '../../api/profile/profile';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import { SensitiveDocumentAccessModal } from '../../components/profile/SensitiveDocumentAccessModal';
import { styles as themeStyles } from '../../theme/styles';
import { findCountryOption, getCountryOptions, type CountryOption } from '../../utils/countries';

const compactStyles = StyleSheet.create({
  // ---------- Used in DocumentsScreen ----------
  profileScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },

  profileHero: {
    paddingTop: 40,
    paddingBottom: 12,
    alignItems: 'center',
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

  // ----- Document‑specific overrides -----
  profileDocumentsMain: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flex: 0,
    paddingTop: 0,
    paddingBottom: 20,
  },

  profileHeroCompact: {
    paddingTop: 0,
    paddingBottom: 12,
  },

  profileSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 72,
    marginBottom: 24,
    flexShrink: 0,
  },

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

  profileDocumentsForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowOpacity: 0.05,
    elevation: 1,
    flexShrink: 0,
  },

  profileDocumentsFieldList: {
    gap: 8,
    marginBottom: 12,
  },

  profileDocumentsSaveButton: {
    marginTop: 4,
  },

  profilePersonalInfoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },

  // ---------- Input and dropdown styles ----------
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

  profileField: {
    position: 'relative',
    marginBottom: 4,
    zIndex: 1,
  },

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

  profilePrimaryButton: {
    backgroundColor: '#002AFF',
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

  profileSaveMessage: {
    marginTop: 8,
    fontSize: 13,
    color: '#00A67E',
    textAlign: 'center',
  },

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
});

// Merge with the original theme
const styles = { ...themeStyles, ...compactStyles };

// ---------------------------------------------------------------------
// Types (unchanged)
// ---------------------------------------------------------------------
type DocumentsScreenProps = {
  notificationUnreadCount?: number;
  onBack: () => void;
  onLogout?: () => void;
  onOpenCompanions: () => void;
  onOpenChat?: () => void;
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
  onUserUpdate?: (user: AuthUser) => Promise<void>;
  profileImageUri?: string | null;
  token: string | null;
  user: AuthUser | null;
};

type TravelDocsState = {
  passportNumber: string;
  passportExpiry: string;
  passportIssuingCountry: string;
  nationality: string;
  nationalIdNumber: string;
  frequentFlyerNumber: string;
  frequentFlyerAirline: string;
};

type RevealableTravelDocField = 'passportNumber' | 'nationalIdNumber';
type SensitiveDocumentAction = 'view' | 'update';
type CountryDropdownField = 'passportIssuingCountry' | 'nationality';

type DocumentField = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  calendar?: boolean;
  dropdown?: boolean;
  dropdownKey?: CountryDropdownField;
  editable?: boolean;
  keyboardType?: 'default' | 'numbers-and-punctuation';
  masked?: boolean;
  multiline?: boolean;
  placeholder?: boolean;
  revealField?: RevealableTravelDocField;
};

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

// ---------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------
export function DocumentsScreen({
  notificationUnreadCount = 0,
  onBack,
  onLogout,
  onOpenChat,
  onOpenCompanions,
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
  onUserUpdate,
  profileImageUri,
  token,
  user,
}: DocumentsScreenProps) {
  const [isPageMenuOpen, setIsPageMenuOpen] = useState(false);
  const [travelDocs, setTravelDocs] = useState<TravelDocsState>(() => buildTravelDocsState(user));
  const [isEditingPassportNumber, setIsEditingPassportNumber] = useState(false);
  const [isEditingNationalIdNumber, setIsEditingNationalIdNumber] = useState(false);
  const [savingDocuments, setSavingDocuments] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [revealField, setRevealField] = useState<RevealableTravelDocField | null>(null);
  const [revealAction, setRevealAction] = useState<SensitiveDocumentAction>('view');
  const [revealPassword, setRevealPassword] = useState('');
  const [revealTwoFactorCode, setRevealTwoFactorCode] = useState('');
  const [revealingDocument, setRevealingDocument] = useState(false);
  const [revealedSensitiveFields, setRevealedSensitiveFields] = useState<
    Partial<Record<RevealableTravelDocField, boolean>>
  >({});
  const [activeCountryDropdown, setActiveCountryDropdown] = useState<CountryDropdownField | null>(
    null,
  );
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const dropdownTranslateY = useRef(new Animated.Value(330)).current;
  const twoFactorEnabled = Boolean(
    user?.twoFactorEnabled ||
    (isObjectRecord(user?.security) ? user.security.twoFactorEnabled : false),
  );

  useEffect(() => {
    Animated.timing(dropdownTranslateY, {
      duration: 260,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [dropdownTranslateY]);

  useEffect(() => {
    setTravelDocs(buildTravelDocsState(user));
    setIsEditingPassportNumber(false);
    setIsEditingNationalIdNumber(false);
    setRevealedSensitiveFields({});
  }, [user]);

  const handlePagePress = (label: ProfilePageLabel) => {
    setIsPageMenuOpen(false);

    if (label === 'Profile') {
      onOpenProfile();
    }

    if (label === 'Companions') {
      onOpenCompanions();
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

  const togglePassportEdit = () => {
    if (isEditingPassportNumber) {
      setTravelDocs((current) => ({
        ...current,
        passportNumber: buildTravelDocsState(user).passportNumber,
      }));
      setIsEditingPassportNumber(false);
      setRevealedSensitiveFields((current) => ({ ...current, passportNumber: false }));
      return;
    }

    openSensitiveDocumentModal('passportNumber', 'update');
  };

  const toggleNationalIdEdit = () => {
    if (isEditingNationalIdNumber) {
      setTravelDocs((current) => ({
        ...current,
        nationalIdNumber: buildTravelDocsState(user).nationalIdNumber,
      }));
      setIsEditingNationalIdNumber(false);
      setRevealedSensitiveFields((current) => ({ ...current, nationalIdNumber: false }));
      return;
    }

    openSensitiveDocumentModal('nationalIdNumber', 'update');
  };

  const openSensitiveDocumentModal = (
    field: RevealableTravelDocField,
    action: SensitiveDocumentAction,
  ) => {
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

  const handleRevealSensitiveField = async () => {
    if (!revealField) {
      return;
    }

    if (!token) {
      setMessage('Sign in again to reveal your document.');
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
      const value = await revealSensitiveTravelDocument(token, {
        field: revealField,
        password: revealPassword,
        twoFactorCode: twoFactorEnabled ? revealTwoFactorCode : undefined,
      });

      setTravelDocs((current) => ({
        ...current,
        [revealField]: value,
      }));
      setRevealedSensitiveFields((current) => ({
        ...current,
        [revealField]: true,
      }));

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

  const handleSaveDocuments = async () => {
    if (!token) {
      setMessage('Sign in again to update your documents.');
      return;
    }

    setSavingDocuments(true);
    setMessage(null);

    try {
      const nextTravelDocuments: TravelDocsPayload = {
        passportExpiry: travelDocs.passportExpiry || null,
        passportIssuingCountry: travelDocs.passportIssuingCountry,
        nationality: travelDocs.nationality,
        frequentFlyerNumber: travelDocs.frequentFlyerNumber,
        frequentFlyerAirline: travelDocs.frequentFlyerAirline,
      };

      if (isEditingPassportNumber || !isMaskedSensitiveValue(travelDocs.passportNumber)) {
        nextTravelDocuments.passportNumber = travelDocs.passportNumber;
      }

      if (isEditingNationalIdNumber || !isMaskedSensitiveValue(travelDocs.nationalIdNumber)) {
        nextTravelDocuments.nationalIdNumber = travelDocs.nationalIdNumber;
      }

      const updatedUser = await updateCurrentUser(token, {
        travelDocuments: nextTravelDocuments,
      });

      await onUserUpdate?.(updatedUser);
      setTravelDocs(buildTravelDocsState(updatedUser));
      setIsEditingPassportNumber(false);
      setIsEditingNationalIdNumber(false);
      setMessage('Travel documents saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save documents.');
    } finally {
      setSavingDocuments(false);
    }
  };

  const handleSelectCountry = (field: CountryDropdownField, country: CountryOption) => {
    setTravelDocs((current) => ({
      ...current,
      [field]: country.name,
    }));
    setActiveCountryDropdown(null);
    setCountrySearchQuery('');
  };

  const toggleCountryDropdown = (field: CountryDropdownField) => {
    setActiveCountryDropdown((current) => (current === field ? null : field));
    setCountrySearchQuery('');
  };

  const issuingCountryOptions = useMemo(
    () => getPinnedCountryOptions(countrySearchQuery, travelDocs.passportIssuingCountry),
    [countrySearchQuery, travelDocs.passportIssuingCountry],
  );
  const nationalityOptions = useMemo(
    () => getPinnedCountryOptions(countrySearchQuery, travelDocs.nationality),
    [countrySearchQuery, travelDocs.nationality],
  );

  const documentFields: DocumentField[] = [
    {
      editable: !travelDocs.passportNumber || isEditingPassportNumber,
      label: 'Passport Number',
      masked: true,
      onChangeText: (value) =>
        setTravelDocs((current) => ({ ...current, passportNumber: value.toUpperCase() })),
      revealField: 'passportNumber',
      value:
        travelDocs.passportNumber &&
        !isEditingPassportNumber &&
        !revealedSensitiveFields.passportNumber
          ? getMaskedSensitiveNumber(travelDocs.passportNumber)
          : travelDocs.passportNumber,
    },
    {
      calendar: true,
      keyboardType: 'numbers-and-punctuation',
      label: 'Passport Expiry Date',
      onChangeText: (value) => setTravelDocs((current) => ({ ...current, passportExpiry: value })),
      placeholder: !travelDocs.passportExpiry,
      value: travelDocs.passportExpiry,
    },
    {
      dropdown: true,
      dropdownKey: 'passportIssuingCountry',
      label: 'Passport Issuing Country',
      onChangeText: () => undefined,
      placeholder: !travelDocs.passportIssuingCountry,
      value: travelDocs.passportIssuingCountry,
    },
    {
      dropdown: true,
      dropdownKey: 'nationality',
      label: 'Nationality',
      onChangeText: () => undefined,
      placeholder: !travelDocs.nationality,
      value: travelDocs.nationality,
    },
    {
      editable: !travelDocs.nationalIdNumber || isEditingNationalIdNumber,
      label: 'National ID Number',
      masked: true,
      onChangeText: (value) =>
        setTravelDocs((current) => ({ ...current, nationalIdNumber: value })),
      placeholder: !travelDocs.nationalIdNumber || isEditingNationalIdNumber,
      revealField: 'nationalIdNumber',
      value:
        travelDocs.nationalIdNumber &&
        !isEditingNationalIdNumber &&
        !revealedSensitiveFields.nationalIdNumber
          ? getMaskedSensitiveNumber(travelDocs.nationalIdNumber)
          : travelDocs.nationalIdNumber,
    },
    {
      label: 'Frequent Flyer Number (Optional)',
      onChangeText: (value) =>
        setTravelDocs((current) => ({ ...current, frequentFlyerNumber: value.toUpperCase() })),
      placeholder: !travelDocs.frequentFlyerNumber,
      value: travelDocs.frequentFlyerNumber,
    },
    {
      label: 'Travel Preferences (Optional)',
      multiline: true,
      onChangeText: (value) =>
        setTravelDocs((current) => ({ ...current, frequentFlyerAirline: value })),
      placeholder: !travelDocs.frequentFlyerAirline,
      value: travelDocs.frequentFlyerAirline,
    },
  ];

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
              <DocumentsIcon color="#002AFF" size={20} />
              <Text style={styles.profilePageToggleText}>Documents</Text>
              <ChevronDownIcon size={20} />
            </Pressable>
          </View>

          <View style={styles.profileDocumentsMain}>
            <View style={styles.profileSectionHeading}>
              <View>
                <Text style={styles.profileSectionTitle}>Documents</Text>
                <Text style={styles.profileSectionSubtitle}>Passport & ID for flight bookings</Text>
              </View>
            </View>

            <View style={styles.profileDisclaimerCard}>
              <View style={styles.profileCurrentLocationIcon}>
                <ShieldIcon />
              </View>
              <Text style={styles.profileCurrentLocationText}>
                Your passport and national ID stay masked until you confirm your password to reveal
                them.
              </Text>
            </View>

            <View style={styles.profileDocumentsForm}>
              <View style={styles.profileDocumentsFieldList}>
                {documentFields.map((field) => (
                  <DocumentInput
                    field={field}
                    key={field.label}
                    countryOptions={
                      field.dropdownKey === 'passportIssuingCountry'
                        ? issuingCountryOptions
                        : field.dropdownKey === 'nationality'
                          ? nationalityOptions
                          : undefined
                    }
                    dropdownActive={field.dropdownKey === activeCountryDropdown}
                    dropdownSearchQuery={
                      field.dropdownKey === activeCountryDropdown ? countrySearchQuery : ''
                    }
                    onReveal={
                      field.revealField
                        ? () => openSensitiveDocumentModal(field.revealField!, 'view')
                        : undefined
                    }
                    onSearchCountries={setCountrySearchQuery}
                    onSelectCountry={
                      field.dropdownKey
                        ? (country) => handleSelectCountry(field.dropdownKey!, country)
                        : undefined
                    }
                    onToggleCountryDropdown={
                      field.dropdownKey
                        ? () => toggleCountryDropdown(field.dropdownKey!)
                        : undefined
                    }
                    onToggleEdit={
                      field.revealField === 'passportNumber'
                        ? togglePassportEdit
                        : field.revealField === 'nationalIdNumber'
                          ? toggleNationalIdEdit
                          : undefined
                    }
                    updateLabel={
                      field.revealField === 'passportNumber' && isEditingPassportNumber
                        ? 'Keep current'
                        : field.revealField === 'nationalIdNumber' && isEditingNationalIdNumber
                          ? 'Keep current'
                          : 'Update'
                    }
                  />
                ))}
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={savingDocuments}
                onPress={handleSaveDocuments}
                style={({ pressed }) => [
                  styles.profilePrimaryButton,
                  styles.profileDocumentsSaveButton,
                  (pressed || savingDocuments) && styles.pressedFeedback,
                ]}
              >
                {savingDocuments ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.profilePrimaryButtonText}>Save Travel Documents</Text>
                )}
              </Pressable>
              {message ? <Text style={styles.profileSaveMessage}>{message}</Text> : null}

              <View style={styles.profilePersonalInfoCard}>
                <Text style={styles.profilePersonalInfoTitle}>Personal Information</Text>
                <View style={styles.profilePersonalInfoRows}>
                  <View style={styles.profilePersonalInfoRow}>
                    <Text style={styles.profilePersonalInfoLabel}>Status</Text>
                    <Text
                      style={[
                        styles.profilePersonalInfoValue,
                        styles.profilePersonalInfoValueVerified,
                      ]}
                    >
                      Verified
                    </Text>
                  </View>
                  <View style={styles.profilePersonalInfoRow}>
                    <Text style={styles.profilePersonalInfoLabel}>Member Since</Text>
                    <Text style={styles.profilePersonalInfoValue}>2026</Text>
                  </View>
                </View>
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
        source="profileDocuments"
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
          revealField === 'passportNumber' ? 'your passport number' : 'your national ID number'
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
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------
// Sub‑components and helpers (unchanged)
// ---------------------------------------------------------------------
type TravelDocsPayload = {
  passportNumber?: string;
  passportExpiry?: string | null;
  passportIssuingCountry?: string;
  nationality?: string;
  nationalIdNumber?: string;
  frequentFlyerNumber?: string;
  frequentFlyerAirline?: string;
};

function DocumentInput({
  countryOptions,
  dropdownActive,
  dropdownSearchQuery,
  field,
  onReveal,
  onSearchCountries,
  onSelectCountry,
  onToggleCountryDropdown,
  onToggleEdit,
  updateLabel,
}: {
  countryOptions?: CountryOption[];
  dropdownActive?: boolean;
  dropdownSearchQuery?: string;
  field: DocumentField;
  onReveal?: () => void;
  onSearchCountries?: (value: string) => void;
  onSelectCountry?: (country: CountryOption) => void;
  onToggleCountryDropdown?: () => void;
  onToggleEdit?: () => void;
  updateLabel: string;
}) {
  const isEditable = field.editable !== false;
  const placeholder = field.placeholder ? getDocumentPlaceholder(field.label) : undefined;

  return (
    <View
      style={[
        styles.profileField,
        field.multiline && styles.profileTextAreaField,
        dropdownActive && { zIndex: 40 },
      ]}
    >
      <View style={styles.profileDocumentLabelRow}>
        <Text style={styles.profileFieldLabel}>{field.label}</Text>
        {field.masked && field.value && onToggleEdit ? (
          <View style={styles.profileDocumentUpdate}>
            {field.value && onReveal ? (
              <Pressable accessibilityRole="button" onPress={onReveal}>
                <EyeClosedIcon />
              </Pressable>
            ) : null}
            {onToggleEdit ? (
              <Pressable accessibilityRole="button" onPress={onToggleEdit}>
                <Text style={styles.profileDocumentUpdateText}>{updateLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      {field.dropdown ? (
        <Pressable
          accessibilityRole="button"
          onPress={onToggleCountryDropdown}
          style={[styles.profileInput, field.multiline && styles.profileTextArea]}
        >
          <Text
            style={[
              styles.profileInputText,
              !field.value && styles.profilePlaceholderText,
              field.multiline && styles.profileTextAreaText,
            ]}
          >
            {field.value || placeholder}
          </Text>
          <ChevronDownIcon size={24} />
        </Pressable>
      ) : (
        <View style={[styles.profileInput, field.multiline && styles.profileTextArea]}>
          {isEditable ? (
            <TextInput
              keyboardType={field.keyboardType || 'default'}
              multiline={field.multiline}
              onChangeText={field.onChangeText}
              placeholder={placeholder}
              placeholderTextColor="#6A7282"
              style={[
                styles.profileInputText,
                field.multiline && styles.profileTextAreaText,
                { padding: 0 },
              ]}
              value={field.value}
            />
          ) : (
            <Text
              style={[
                styles.profileInputText,
                field.placeholder && styles.profilePlaceholderText,
                field.multiline && styles.profileTextAreaText,
              ]}
            >
              {field.value}
            </Text>
          )}
          {field.calendar ? <CalendarDateIcon /> : null}
        </View>
      )}
      {dropdownActive && countryOptions ? (
        <View style={styles.profileCountryDropdownCard}>
          <View style={styles.profileCountrySearchShell}>
            <TextInput
              autoCapitalize="words"
              onChangeText={onSearchCountries}
              placeholder="Search countries"
              placeholderTextColor="#6A7282"
              style={styles.profileCountrySearchInput}
              value={dropdownSearchQuery}
            />
          </View>
          {countryOptions.length > 0 ? (
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {countryOptions.map((country, index) => (
                <Pressable
                  accessibilityRole="button"
                  key={country.code}
                  onPress={() => onSelectCountry?.(country)}
                  style={({ pressed }) => [
                    styles.profileCountryDropdownItem,
                    index > 0 && styles.profileCountryDropdownItemDivider,
                    pressed && styles.pressedFeedback,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.profileCountryDropdownText}>
                    {country.name}
                  </Text>
                  <Text style={styles.profileCountryDropdownCode}>{country.code}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.profileCountryDropdownItem}>
              <Text style={styles.profileCountryDropdownText}>No countries found</Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function buildTravelDocsState(user: AuthUser | null): TravelDocsState {
  const docs = isObjectRecord(user?.travelDocuments) ? user.travelDocuments : {};

  return {
    passportNumber: stringField(docs.passportNumber),
    passportExpiry: formatDateField(docs.passportExpiry),
    passportIssuingCountry: stringField(docs.passportIssuingCountry),
    nationality: stringField(docs.nationality),
    nationalIdNumber: stringField(docs.nationalIdNumber),
    frequentFlyerNumber: stringField(docs.frequentFlyerNumber),
    frequentFlyerAirline: stringField(docs.frequentFlyerAirline),
  };
}

function getPinnedCountryOptions(query: string, selectedValue: string): CountryOption[] {
  const selectedCountry = findCountryOption(selectedValue) || getCustomCountryOption(selectedValue);
  const options = getCountryOptions(query);

  if (!selectedCountry) {
    return options;
  }

  return [selectedCountry, ...options.filter((country) => country.code !== selectedCountry.code)];
}

function getCustomCountryOption(value: string): CountryOption | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return {
    code: 'Selected',
    name: trimmedValue,
  };
}

function formatDateField(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    return '';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString().split('T')[0] || '';
}

function getDocumentPlaceholder(label: string): string {
  if (label === 'Passport Expiry Date') {
    return 'YYYY-MM-DD';
  }

  if (label.includes('Country')) {
    return 'Country';
  }

  if (label === 'Nationality') {
    return 'Nationality';
  }

  if (label === 'Travel Preferences (Optional)') {
    return 'Enter your travel preferences';
  }

  return 'Optional';
}

function getMaskedSensitiveNumber(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    return '';
  }

  const visibleDigits = normalized.slice(-3);
  const maskedLength = Math.max(normalized.length - visibleDigits.length, 3);

  return `${'*'.repeat(maskedLength)}${visibleDigits}`;
}

function isMaskedSensitiveValue(value: string): boolean {
  return value.includes('*');
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

// ---------------------------------------------------------------------
// Icons (all as before, but included for completeness)
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

function ShieldIcon({ color = '#00A67E', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3 5 6v5.5c0 4.4 2.8 7.4 7 9.5 4.2-2.1 7-5.1 7-9.5V6l-7-3Z"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
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