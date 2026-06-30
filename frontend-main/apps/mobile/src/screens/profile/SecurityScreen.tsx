// src/screens/profile/SecurityScreen.tsx
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import RightArrowIcon from '../../../assets/icons/right-arrow.svg';
import type { AuthUser } from '../../api/auth/auth';
import { FooterWithMenu } from '../../components/navigation/FooterWithMenu';
import { useProfileSecurity } from '../../hooks/profile/useProfileSecurity';
import { styles as themeStyles } from '../../theme/styles';

// ---------------------------------------------------------------------
// Styles
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
  profileSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 56,
    marginLeft: 72,
  },
  profileSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  profileSectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  profileSecurityMain: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingBottom: 20,
  },
  profileSecurityContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  profilePrimaryButton: {
    backgroundColor: '#002AFF',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePrimaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  profilePrimaryButtonDisabled: {
    opacity: 0.5,
  },
  profileSecurityTwoFactorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },
  profileSecurityTwoFactorHeading: {
    marginBottom: 16,
  },
  profileSecurityTwoFactorCopy: {
    marginBottom: 12,
  },
  profileSecurityEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: '#002AFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  profileSecurityHeroTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 4,
  },
  profileSecurityHeroText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },
  profileSecurityRecommendedPill: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  profileSecurityRecommendedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  profileSecurityInfoBlock: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileSecurityInfoHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  profileSecurityInfoTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  profileSecurityInfoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  profileSecurityInfoDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  profileSecurityBlackButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  profileSecurityBlackButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  profileSecurityDangerButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  profileSecurityDangerButtonText: {
    color: '#1A1A1A',
    fontWeight: '500',
    fontSize: 13,
  },
  profileSecurityTwoFactorCodeField: {
    marginTop: 8,
  },
  profileSecurityCodeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  profileSecurityCodeInput: {
    flex: 1,
    fontSize: 13,
    color: '#1A1A1A',
  },
  profileSecurityCodeHelperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  profileSecurityCodeErrorText: {
    color: '#DC2626',
  },
  profileSecurityBiometricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },
  profileSecurityBiometricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileSecurityBiometricItemLast: {
    borderBottomWidth: 0,
  },
  profileSecurityBiometricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  profileSecurityBiometricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSecurityBiometricIconWrapFace: {
    backgroundColor: '#EEF2FF',
  },
  profileSecurityBiometricIconWrapPalm: {
    backgroundColor: '#F0FDF4',
  },
  profileSecurityBiometricTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  profileSecurityBiometricStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  profileSecurityBiometricStatusEnabled: {
    color: '#16A34A',
  },
  profileSecurityBiometricButton: {
    backgroundColor: '#002AFF',
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  profileSecurityBiometricButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  profileSecurityBiometricDangerButton: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  profileSecurityBiometricDangerButtonText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  profileSecuritySliderButton: {
    backgroundColor: '#002AFF',
    borderRadius: 20,
    paddingHorizontal: 10,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginLeft: 8,
  },
  profileSecuritySliderButtonEnrolled: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  profileSecurityPasswordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2521fc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  profileSecurityPasswordHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileSecurityPasswordHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSecurityPasswordHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  profileSecurityPasswordHeaderChevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  profileSecurityPasswordBody: {
    gap: 12,
    paddingHorizontal: 4,
  },
  profileSecurityPasswordIntroText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  profileSecurityPasswordForm: {
    gap: 12,
  },
  profileSecurityPasswordField: {
    gap: 4,
    marginBottom: 10,
  },
  profileSecurityPasswordLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  profileSecurityPasswordInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  profileSecurityPasswordPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: '#1A1A1A',
  },
  profileSecurityRequirements: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  profileSecurityRequirementsTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 6,
  },
  profileSecurityRequirementsList: {
    gap: 4,
  },
  profileSecurityRequirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileSecurityRequirementDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6B7280',
  },
  profileSecurityRequirementText: {
    fontSize: 12,
    color: '#4B5563',
  },
  profileSecurityUpdatePasswordButton: {
    marginTop: 4,
  },
  profileSecurityForgotButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  profileSecurityForgotButtonText: {
    fontSize: 13,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
  profileSecurityTip: {
    backgroundColor: '#FEFCE8',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  profileSecurityTipText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  profileSaveMessage: {
    marginTop: 12,
    fontSize: 13,
    color: '#00A67E',
    textAlign: 'center',
  },

  // Dialog overlay / card – consistent with WisperScreen
  profileTwoFactorCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
});

const styles = { ...themeStyles, ...compactStyles };

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------
type SecurityScreenProps = {
  notificationUnreadCount?: number;
  onBack: () => void;
  onLogout?: () => void;
  onOpenChat?: () => void;
  onOpenCompanions: () => void;
  onOpenDocuments: () => void;
  onOpenExpenses: () => void;
  onOpenFaceEnrollment: () => void;
  onOpenHome: () => void;
  onOpenJourneys: () => void;
  onOpenNotifications: () => void;
  onOpenPalmEnrollment: () => void;
  onOpenPaymentWallet: () => void;
  onOpenPreferences: () => void;
  onOpenProfile: () => void;
  onOpenTravelSupport: () => void;
  onOpenWhisper: () => void;
  onTokenUpdate?: (token: string) => Promise<void>;
  onUserUpdate?: (user: AuthUser) => Promise<void>;
  profileImageUri?: string | null;
  token: string | null;
  user: AuthUser | null;
  faceEnrolled: boolean;
  palmEnrolled: boolean;
  onFaceEnrolled: (enrolled: boolean) => void;
  onPalmEnrolled: (enrolled: boolean) => void;
};

const passwordRequirements = [
  'At least 8 characters',
  'One uppercase letter',
  'One lowercase letter',
  'One number',
];

// ---------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------
export function SecurityScreen({
  notificationUnreadCount = 0,
  onBack,
  onLogout,
  onOpenChat,
  onOpenCompanions,
  onOpenDocuments,
  onOpenExpenses,
  onOpenFaceEnrollment,
  onOpenHome,
  onOpenJourneys,
  onOpenNotifications,
  onOpenPalmEnrollment,
  onOpenPaymentWallet,
  onOpenPreferences,
  onOpenProfile,
  onOpenTravelSupport,
  onOpenWhisper,
  onTokenUpdate,
  onUserUpdate,
  profileImageUri,
  token,
  user,
  faceEnrolled,
  palmEnrolled,
  onFaceEnrolled,
  onPalmEnrolled,
}: SecurityScreenProps) {
  const [isPasswordManagementOpen, setIsPasswordManagementOpen] = useState(false);
  const [isDisableTwoFactorOpen, setIsDisableTwoFactorOpen] = useState(false);
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);
  const [setupKeyCopied, setSetupKeyCopied] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false); // ✅ NEW
  const dropdownTranslateY = useRef(new Animated.Value(330)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const biometricCardY = useRef(0);

  const biometricEnabled = faceEnrolled || palmEnrolled;

  const {
    closeTwoFactorSetup,
    clearTwoFactorSetup,
    confirmPassword,
    confirmTwoFactor,
    currentPassword,
    disableTwoFactorAuth,
    disableTwoFactorCode,
    forgotPasswordLoading,
    message,
    newPassword,
    passwordSaving,
    sendPasswordReset,
    setConfirmPassword,
    setCurrentPassword,
    setDisableTwoFactorCode,
    setMessage,
    setNewPassword,
    setTwoFactorCode,
    startTwoFactorSetup,
    twoFactorCode,
    twoFactorConfirmLoading,
    twoFactorDisableLoading,
    twoFactorEnabled,
    twoFactorEnabledAt,
    twoFactorSetup,
    twoFactorSetupLoading,
    updatePassword,
  } = useProfileSecurity({
    onTokenUpdate,
    onUserUpdate,
    token,
    user,
  });

  useEffect(() => {
    Animated.timing(dropdownTranslateY, {
      duration: 260,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [dropdownTranslateY]);

  useEffect(() => {
    if (!twoFactorEnabled) {
      setIsDisableTwoFactorOpen(false);
      setDisableTwoFactorCode('');
    }
  }, [setDisableTwoFactorCode, twoFactorEnabled]);

  // Reset manual entry state when modal opens/closes
  useEffect(() => {
    if (twoFactorSetup) {
      setIsManualEntryOpen(false);
      setSetupKeyCopied(false);
      setTwoFactorCode('');
      setIsTwoFactorModalOpen(true);
    }
  }, [twoFactorSetup, setTwoFactorCode]);

  useEffect(() => {
    if (biometricEnabled && biometricCardY.current > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: biometricCardY.current - 16, animated: true });
      }, 300);
    }
  }, []);

  const handleCopySetupKey = async () => {
    const setupKey = twoFactorSetup?.manualEntryKey;
    if (!setupKey) return;
    await Clipboard.setStringAsync(setupKey);
    setSetupKeyCopied(true);
    setTimeout(() => setSetupKeyCopied(false), 2500);
  };

  const handleDisableTwoFactorPress = () => {
    if (!isDisableTwoFactorOpen) {
      Alert.alert(
        'Disable Two-Factor Authentication?',
        'You will need to re-add your account to your authenticator app if you enable 2FA again.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: () => {
              setIsDisableTwoFactorOpen(true);
              setDisableTwoFactorCode('');
              setMessage(null);
            },
          },
        ]
      );
    } else {
      setIsDisableTwoFactorOpen(false);
      setDisableTwoFactorCode('');
      setMessage(null);
    }
  };

  const handleDisableTwoFactorCodeChange = (value: string) => {
    const nextCode = value.replace(/\D/g, '').slice(0, 6);
    setDisableTwoFactorCode(nextCode);
    if (nextCode.length === 6 && !twoFactorDisableLoading) {
      void disableTwoFactorAuth(nextCode);
    }
  };

  const handleOpenAuthenticator = () => {
    if (twoFactorSetup?.otpauthUrl) {
      Linking.openURL(twoFactorSetup.otpauthUrl).catch((err) => {
        console.warn('Failed to open authenticator app:', err);
        // Fallback: show manual entry
        setIsManualEntryOpen(true);
      });
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.profileScreen}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.profileScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ transform: [{ translateY: dropdownTranslateY }] }}>
          <View style={styles.profileSecurityMain}>
            <View style={styles.profileSectionHeading}>
              <View>
                <Text style={styles.profileSectionTitle}>Security</Text>
                <Text style={styles.profileSectionSubtitle}>
                  Passwords, two-factor & biometric authentication
                </Text>
              </View>
            </View>

            <View style={styles.profileSecurityContent}>
              {/* Two-Factor Card */}
              <View style={styles.profileSecurityTwoFactorCard}>
                <View style={styles.profileSecurityTwoFactorHeading}>
                  <View style={styles.profileSecurityTwoFactorCopy}>
                    <Text style={styles.profileSecurityEyebrow}>TWO-FACTOR AUTHENTICATION</Text>
                    <Text style={styles.profileSecurityHeroTitle}>
                      {twoFactorEnabled
                        ? 'Authenticator protection is active'
                        : 'Secure with an authenticator app'}
                    </Text>
                    <Text style={styles.profileSecurityHeroText}>
                      {twoFactorEnabled
                        ? 'Every sign-in requires a verification code from your phone.'
                        : 'Use Google Authenticator, Microsoft Authenticator, Authy, or 1Password.'}
                    </Text>
                  </View>
                  <View style={styles.profileSecurityRecommendedPill}>
                    <Text style={styles.profileSecurityRecommendedText}>
                      {twoFactorEnabled ? 'Enabled' : 'Recommended'}
                    </Text>
                  </View>
                </View>

                <View style={styles.profileSecurityInfoBlock}>
                  <View style={styles.profileSecurityInfoHeading}>
                    <ShieldIcon />
                    <Text style={styles.profileSecurityInfoTitle}>Status</Text>
                  </View>
                  <Text style={styles.profileSecurityInfoValue}>
                    {twoFactorEnabled ? 'Protected' : 'Not enabled'}
                  </Text>
                  <Text style={styles.profileSecurityInfoDescription}>
                    {twoFactorEnabledAt
                      ? `Enabled ${new Date(twoFactorEnabledAt).toLocaleDateString()}`
                      : 'Turn on stronger sign-in verification'}
                  </Text>
                </View>

                <View style={styles.profileSecurityInfoBlock}>
                  <View style={styles.profileSecurityInfoHeading}>
                    <PhoneIcon />
                    <Text style={styles.profileSecurityInfoTitle}>Authenticator apps</Text>
                  </View>
                  <Text style={styles.profileSecurityInfoValue}>Google, Microsoft, Authy</Text>
                  <Text style={styles.profileSecurityInfoDescription}>
                    Add your account to any authenticator app for 6-digit verification codes.
                  </Text>
                </View>

                {twoFactorEnabled ? (
                  <View style={styles.profileSecurityTwoFactorCodeField}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={handleDisableTwoFactorPress}
                      style={({ pressed }) => [
                        styles.profileSecurityDangerButton,
                        pressed && styles.pressedFeedback,
                      ]}
                    >
                      <Text style={styles.profileSecurityDangerButtonText}>
                        {isDisableTwoFactorOpen ? 'Cancel Disable' : 'Disable Two-Factor'}
                      </Text>
                    </Pressable>
                    {isDisableTwoFactorOpen && (
                      <>
                        <Text style={[styles.profileSecurityPasswordLabel, { marginTop: 12 }]}>
                          Authenticator code
                        </Text>
                        <View style={styles.profileSecurityCodeInputContainer}>
                          <TextInput
                            autoFocus
                            editable={!twoFactorDisableLoading}
                            keyboardType="number-pad"
                            maxLength={6}
                            onChangeText={handleDisableTwoFactorCodeChange}
                            placeholder="123456"
                            placeholderTextColor="#6B7280"
                            style={styles.profileSecurityCodeInput}
                            value={disableTwoFactorCode}
                          />
                        </View>
                        <Text style={styles.profileSecurityCodeHelperText}>
                          {twoFactorDisableLoading
                            ? 'Checking code...'
                            : 'Enter the 6-digit code from your authenticator app.'}
                        </Text>
                        {message && (
                          <Text
                            style={[
                              styles.profileSecurityCodeHelperText,
                              styles.profileSecurityCodeErrorText,
                            ]}
                          >
                            {message}
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={twoFactorSetupLoading}
                    onPress={() => {
                      if (twoFactorSetup) {
                        setIsTwoFactorModalOpen(true);
                      } else {
                        startTwoFactorSetup();
                      }
                    }}
                    style={({ pressed }) => [
                      styles.profileSecurityBlackButton,
                      twoFactorSetupLoading && styles.profilePrimaryButtonDisabled,
                      pressed && styles.pressedFeedback,
                    ]}
                  >
                    <ScanIcon />
                    <Text style={styles.profileSecurityBlackButtonText}>
                      {twoFactorSetupLoading
                        ? 'Preparing...'
                        : 'Enable Two-Factor Authentication'}
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Biometric Login Card */}
              <View
                onLayout={(e) => { biometricCardY.current = e.nativeEvent.layout.y; }}
                style={styles.profileSecurityBiometricCard}
              >
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.profileSecurityEyebrow}>BIOMETRIC LOGIN</Text>
                  <Text style={styles.profileSecurityHeroTitle}>
                    {biometricEnabled
                      ? 'Biometric protection is active'
                      : 'Sign in with your face or palm'}
                  </Text>
                  <Text style={styles.profileSecurityHeroText}>
                    {biometricEnabled
                      ? 'Account Management is protected. You will be asked to verify before accessing security settings.'
                      : 'Enroll your face or palm to add a secure, passwordless sign-in option.'}
                  </Text>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <View style={styles.profileSecurityInfoHeading}>
                    <ShieldIcon />
                    <Text style={styles.profileSecurityInfoTitle}>Status</Text>
                  </View>
                  <Text style={styles.profileSecurityInfoValue}>
                    {biometricEnabled ? 'Protected' : 'Not enabled'}
                  </Text>
                  <Text style={styles.profileSecurityInfoDescription}>
                    {biometricEnabled
                      ? 'Biometric verification is required to access Account Management.'
                      : 'Enroll at least one biometric method to enable protection.'}
                  </Text>
                </View>

                <View style={styles.profileSecurityBiometricItem}>
                  <View style={styles.profileSecurityBiometricLeft}>
                    <View
                      style={[
                        styles.profileSecurityBiometricIconWrap,
                        styles.profileSecurityBiometricIconWrapFace,
                      ]}
                    >
                      <FaceIdIcon />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileSecurityBiometricTitle}>Face Recognition</Text>
                      <Text
                        style={[
                          styles.profileSecurityBiometricStatus,
                          faceEnrolled && styles.profileSecurityBiometricStatusEnabled,
                        ]}
                      >
                        {faceEnrolled ? 'Enrolled' : 'Not enrolled'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    onValueChange={onOpenFaceEnrollment}
                    thumbColor="#FFFFFF"
                    trackColor={{ false: '#D1D5DB', true: '#002AFF' }}
                    value={faceEnrolled}
                  />
                </View>

                <View
                  style={[
                    styles.profileSecurityBiometricItem,
                    styles.profileSecurityBiometricItemLast,
                  ]}
                >
                  <View style={styles.profileSecurityBiometricLeft}>
                    <View
                      style={[
                        styles.profileSecurityBiometricIconWrap,
                        styles.profileSecurityBiometricIconWrapPalm,
                      ]}
                    >
                      <PalmIdIcon />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileSecurityBiometricTitle}>Palm Recognition</Text>
                      <Text
                        style={[
                          styles.profileSecurityBiometricStatus,
                          palmEnrolled && styles.profileSecurityBiometricStatusEnabled,
                        ]}
                      >
                        {palmEnrolled ? 'Enrolled' : 'Not enrolled'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    onValueChange={onOpenPalmEnrollment}
                    thumbColor="#FFFFFF"
                    trackColor={{ false: '#D1D5DB', true: '#002AFF' }}
                    value={palmEnrolled}
                  />
                </View>

              </View>

              {/* Password Management */}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isPasswordManagementOpen }}
                onPress={() => setIsPasswordManagementOpen((prev) => !prev)}
                style={({ pressed }) => [
                  styles.profileSecurityPasswordHeader,
                  pressed && styles.pressedFeedback,
                ]}
              >
                <View style={styles.profileSecurityPasswordHeaderLeft}>
                  <View style={styles.profileSecurityPasswordHeaderIcon}>
                    <KeyIcon color="#FFFFFF" />
                  </View>
                  <Text style={styles.profileSecurityPasswordHeaderTitle}>
                    Password Management
                  </Text>
                </View>
                <ChevronDownIcon
                  size={20}
                  color="#FFFFFF"
                  style={
                    isPasswordManagementOpen
                      ? styles.profileSecurityPasswordHeaderChevronExpanded
                      : undefined
                  }
                />
              </Pressable>

              {isPasswordManagementOpen && (
                <View style={styles.profileSecurityPasswordBody}>
                  <Text style={styles.profileSecurityPasswordIntroText}>
                    Use a strong, unique password.
                  </Text>

                  <View style={styles.profileSecurityPasswordForm}>
                    <PasswordField
                      onChangeText={setCurrentPassword}
                      value={currentPassword}
                      label="Current Password"
                      placeholder="Enter current password"
                    />
                    <PasswordField
                      label="New Password"
                      onChangeText={setNewPassword}
                      placeholder="At least 8 characters"
                      value={newPassword}
                    />
                    <PasswordField
                      label="Confirm New Password"
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                    />

                    <View style={styles.profileSecurityRequirements}>
                      <Text style={styles.profileSecurityRequirementsTitle}>
                        Password Requirements
                      </Text>
                      <View style={styles.profileSecurityRequirementsList}>
                        {passwordRequirements.map((requirement) => (
                          <View key={requirement} style={styles.profileSecurityRequirementRow}>
                            <View style={styles.profileSecurityRequirementDot} />
                            <Text style={styles.profileSecurityRequirementText}>
                              {requirement}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      disabled={
                        passwordSaving ||
                        !currentPassword ||
                        !newPassword ||
                        newPassword !== confirmPassword
                      }
                      onPress={updatePassword}
                      style={({ pressed }) => [
                        styles.profilePrimaryButton,
                        styles.profileSecurityUpdatePasswordButton,
                        (passwordSaving ||
                          !currentPassword ||
                          !newPassword ||
                          newPassword !== confirmPassword) &&
                          styles.profilePrimaryButtonDisabled,
                        pressed && styles.pressedFeedback,
                      ]}
                    >
                      <Text style={styles.profilePrimaryButtonText}>
                        {passwordSaving ? 'Updating...' : 'Update Password'}
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      disabled={forgotPasswordLoading}
                      onPress={sendPasswordReset}
                      style={({ pressed }) => [
                        styles.profileSecurityForgotButton,
                        forgotPasswordLoading && styles.profilePrimaryButtonDisabled,
                        pressed && styles.pressedFeedback,
                      ]}
                    >
                      <Text style={styles.profileSecurityForgotButtonText}>
                        {forgotPasswordLoading
                          ? 'Sending reset link...'
                          : 'Forgot your password?'}
                      </Text>
                    </Pressable>

                    <View style={styles.profileSecurityTip}>
                      <Text style={styles.profileSecurityTipText}>
                        Enable two-factor authentication or biometric login for stronger account
                        protection.
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {message && !isDisableTwoFactorOpen && !twoFactorSetup && (
                <Text style={styles.profileSaveMessage}>{message}</Text>
              )}
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
        source="profileSecurity"
      />

      {/* ✅ MOBILE-OPTIMIZED 2FA SETUP MODAL */}
      <Modal
        animationType="fade"
        onRequestClose={() => { setIsTwoFactorModalOpen(false); closeTwoFactorSetup(); }}
        transparent
        visible={isTwoFactorModalOpen}
      >
        <Pressable
          accessibilityLabel="Close two-factor setup"
          onPress={() => setIsTwoFactorModalOpen(false)}
          style={styles.profileMenuOverlay}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={styles.profileTwoFactorCard}
          >
            {/* Header */}
            <LinearGradient
              colors={['#002AFF', '#77F2F6']}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={{ paddingHorizontal: 14, paddingVertical: 10 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ShieldIcon />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: '600',
                      lineHeight: 20,
                    }}
                  >
                    Set up authenticator
                  </Text>
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: 11,
                      lineHeight: 14,
                      marginTop: 2,
                    }}
                  >
                    Open your authenticator app and add this account
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Content */}
            <ScrollView
              contentContainerStyle={{ padding: 14, gap: 10 }}
              showsVerticalScrollIndicator={false}
            >


              {/* Open Authenticator App */}
              {twoFactorSetup?.otpauthUrl && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open authenticator app"
                  onPress={handleOpenAuthenticator}
                  style={({ pressed }) => [
                    {
                      backgroundColor: '#002AFF',
                      borderRadius: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8,
                    },
                    pressed && styles.pressedFeedback,
                  ]}
                >
                  <PhoneIcon />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
                    Open authenticator app
                  </Text>
                </Pressable>
              )}

              {/* Manual entry toggle */}
              <Pressable
                onPress={() => setIsManualEntryOpen((prev) => !prev)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontSize: 12, color: '#002AFF', textDecorationLine: 'underline' }}>
                  {isManualEntryOpen ? 'Hide manual setup' : "Can't open app? Use manual setup"}
                </Text>
              </Pressable>

              {/* Manual entry section (collapsible) */}
              {isManualEntryOpen && (
                <View
                  style={{
                    backgroundColor: '#F8F9FA',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    padding: 12,
                  }}
                >
                  <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500', marginBottom: 8 }}>
                    Setup key (tap to copy)
                  </Text>
                  <Pressable
                    accessibilityLabel="Copy manual setup key"
                    accessibilityRole="button"
                    disabled={!twoFactorSetup?.manualEntryKey}
                    onPress={handleCopySetupKey}
                    style={({ pressed }) => [
                      {
                        backgroundColor: '#FFFFFF',
                        borderRadius: 8,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: '#D1D5DB',
                      },
                      pressed && styles.pressedFeedback,
                    ]}
                  >
                    <Text
                      selectable
                      style={{
                        color: '#002AFF',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        textAlign: 'center',
                        lineHeight: 18,
                      }}
                    >
                      {twoFactorSetup?.manualEntryKey || 'Not available'}
                    </Text>
                  </Pressable>
                  <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6, textAlign: 'center' }}>
                    {setupKeyCopied ? '✓ Copied! Paste into your authenticator app' : 'Tap to copy'}
                  </Text>

                  <View style={{ marginTop: 12, gap: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#374151' }}>Manual steps:</Text>
                    <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 16 }}>1. Open authenticator app</Text>
                    <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 16 }}>2. Tap "+" → "Enter setup key"</Text>
                    <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 16 }}>3. Paste the key above</Text>
                    <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 16 }}>4. Tap "Add"</Text>
                  </View>
                </View>
              )}

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
                <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500' }}>then enter the code</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
              </View>

              {/* Code input */}
              <View>
                <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500', marginBottom: 6 }}>
                  6-digit code from your authenticator
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: twoFactorCode.length === 6 ? '#16A34A' : '#D1D5DB',
                    borderRadius: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                  }}
                >
                  <TextInput
                    autoFocus
                    keyboardType="number-pad"
                    maxLength={6}
                    onChangeText={(value) => setTwoFactorCode(value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    placeholderTextColor="#9CA3AF"
                    style={{
                      flex: 1,
                      fontSize: 22,
                      color: '#1A1A1A',
                      letterSpacing: 8,
                      textAlign: 'center',
                      fontWeight: '600',
                    }}
                    value={twoFactorCode}
                  />
                </View>
              </View>

              {/* Verify button */}
              <Pressable
                accessibilityRole="button"
                disabled={twoFactorConfirmLoading || twoFactorCode.length !== 6}
                onPress={confirmTwoFactor}
                style={({ pressed }) => [
                  {
                    backgroundColor: '#1A1A1A',
                    borderRadius: 6,
                    paddingVertical: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  },
                  (twoFactorConfirmLoading || twoFactorCode.length !== 6) && { opacity: 0.5 },
                  pressed && styles.pressedFeedback,
                ]}
              >
                <ScanIcon />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
                  {twoFactorConfirmLoading ? 'Verifying...' : 'Verify & Enable'}
                </Text>
              </Pressable>

              {/* Success/Error message */}
              {message && (
                <Text style={{
                  fontSize: 13,
                  textAlign: 'center',
                  color: message.toLowerCase().includes('fail') || message.toLowerCase().includes('invalid') || message.toLowerCase().includes('error')
                    ? '#DC2626'
                    : '#16A34A',
                  paddingVertical: 4,
                }}>
                  {message}
                </Text>
              )}

              {/* Cancel */}
              <Pressable
                accessibilityRole="button"
                onPress={() => { setIsTwoFactorModalOpen(false); closeTwoFactorSetup(); }}
                style={({ pressed }) => [
                  { alignItems: 'center', paddingVertical: 8 },
                  pressed && styles.pressedFeedback,
                ]}
              >
                <Text style={{ fontSize: 12, color: '#6B7280', textDecorationLine: 'underline' }}>
                  Cancel
                </Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------
function PasswordField({
  label,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.profileSecurityPasswordField}>
      <Text style={styles.profileSecurityPasswordLabel}>{label}</Text>
      <View style={styles.profileSecurityPasswordInput}>
        <TextInput
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#6B7280"
          secureTextEntry={!isVisible}
          style={styles.profileSecurityPasswordPlaceholder}
          value={value}
        />
        <Pressable accessibilityRole="button" onPress={() => setIsVisible((current) => !current)}>
          <EyeIcon />
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------
function ArrowLeftIcon() {
  return <RightArrowIcon color="#FFFFFF" height={18} style={styles.profileBackIcon} width={18} />;
}

function ChevronDownIcon({
  size,
  color = '#0A0A0A',
  style,
}: {
  size: number;
  color?: string;
  style?: any;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <Path d="m7 10 5 5 5-5" stroke={color} strokeLinecap="round" strokeWidth={2} />
    </Svg>
  );
}

function EyeIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="#0A0A0A"
        strokeWidth={1.8}
      />
      <Circle cx={12} cy={12} r={2.5} stroke="#0A0A0A" strokeWidth={1.8} />
    </Svg>
  );
}

function FaceIdIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3C7 3 4 6.5 4 11c0 3 1.5 5.5 3.5 7L9 20h6l1.5-2c2-1.5 3.5-4 3.5-7 0-4.5-3-8-8-8Z"
        stroke="#002AFF"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Circle cx={9} cy={11} r={1} fill="#002AFF" />
      <Circle cx={15} cy={11} r={1} fill="#002AFF" />
      <Path
        d="M9.5 15.5c.8.8 1.6 1 2.5 1s1.7-.2 2.5-1"
        stroke="#002AFF"
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function KeyIcon({ color = '#FFFFFF' }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={7.5} cy={14.5} r={3.5} stroke={color} strokeWidth={1.8} />
      <Path
        d="m10 12 8-8 2 2-2 2 2 2-2 2-2-2-4 4"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function PalmIdIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 10V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V11M16 11V7.5a1.5 1.5 0 0 1 3 0v5c0 3.5-2.5 6-6 6H11c-3 0-5-2.5-5-5.5V10a1.5 1.5 0 0 1 3 0v0"
        stroke="#16A34A"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
      />
    </Svg>
  );
}

function PhoneIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={7} y={2.5} width={10} height={19} rx={2} stroke="#FFFFFF" strokeWidth={1.8} />
      <Path d="M11 18h2" stroke="#FFFFFF" strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
}

function ScanIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3 5 6v5.5c0 4.4 2.8 7.4 7 9.5 4.2-2.1 7-5.1 7-9.5V6l-7-3Z"
        stroke="#FFFFFF"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function ShieldIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3 5 6v5.5c0 4.4 2.8 7.4 7 9.5 4.2-2.1 7-5.1 7-9.5V6l-7-3Z"
        stroke="#002AFF"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}


