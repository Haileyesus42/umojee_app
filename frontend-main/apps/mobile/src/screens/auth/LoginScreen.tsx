// src/screens/auth/LoginScreen.tsx

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

import type {
  AuthResponse,
  AuthUser,
  GoogleAuthCredentials,
  LoginCredentials,
} from '../../api/auth/auth';
import { googleGLogoImage } from '../../assets/images';
import { useBiometricUsers, type BiometricUser } from '../../hooks/useBiometricUsers';
import { styles } from '../../theme/styles';

type LoginScreenProps = {
  authMessage: string | null;
  authStatus: string;
  isAuthLoading: boolean;
  onAuthenticated: () => void;
  onOpenRegister: () => void;
  onSignIn: (credentials: LoginCredentials) => Promise<AuthResponse | { status: string }>;
  onSignInWithGoogle: (credentials: GoogleAuthCredentials) => Promise<AuthResponse>;
  onSignInWithBiometric?: (user: BiometricUser, type: 'face' | 'palm') => void;
  onOpenBiometricLogin?: (user: BiometricUser) => void;
  onTokenUpdate?: (token: string) => Promise<void>;
  onUserUpdate?: (user: AuthUser) => Promise<void>;
};

type AuthFieldProps = TextInputProps & {
  label: string;
};

const GOOGLE_SCRIPT_ID = 'google-identity-services';
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || '';
const GOOGLE_NATIVE_REDIRECT_URI = 'com.nditsolutions.umojee:/auth/google';
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
};

WebBrowser.maybeCompleteAuthSession();

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            callback: (response: {
              code?: string;
              error?: string;
              error_description?: string;
            }) => void;
            client_id: string;
            scope: string;
            ux_mode: 'popup';
          }) => { requestCode: () => void };
        };
      };
    };
  }
}

async function ensureGoogleScript() {
  if (Platform.OS !== 'web') return;
  if (globalThis.window?.google?.accounts?.oauth2) return;

  const existingScript = globalThis.document?.getElementById(
    GOOGLE_SCRIPT_ID,
  ) as HTMLScriptElement | null;

  if (existingScript) {
    await new Promise<void>((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google')), {
        once: true,
      });
    });
    return;
  }

  await new Promise((resolve, reject) => {
    const script = globalThis.document?.createElement('script');
    if (!script || !globalThis.document?.head) {
      reject(new Error('Google sign-in is unavailable on this platform'));
      return;
    }
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(undefined);
    script.onerror = () => reject(new Error('Failed to load Google'));
    globalThis.document.head.appendChild(script);
  });
}

function getGoogleClientDebugId(clientId: string) {
  const uniquePart = clientId.match(/^[^-]+-([^.]+)/)?.[1] || clientId;
  return uniquePart.slice(0, 12);
}

export async function requestGoogleCode(): Promise<GoogleAuthCredentials> {
  const nativeClientId =
    Platform.OS === 'android'
      ? GOOGLE_ANDROID_CLIENT_ID
      : Platform.OS === 'ios'
        ? GOOGLE_IOS_CLIENT_ID
        : '';
  const clientId = Platform.OS === 'web' ? GOOGLE_CLIENT_ID : nativeClientId;

  if (!clientId) {
    throw new Error('Google sign-in is not configured for this app.');
  }

  if (Platform.OS !== 'web') {
    const redirectUri =
      GOOGLE_REDIRECT_URI ||
      AuthSession.makeRedirectUri({
        native: GOOGLE_NATIVE_REDIRECT_URI,
        path: 'auth/google',
        scheme: 'com.nditsolutions.umojee',
      });

    if (__DEV__) {
      console.info('[GoogleAuth]', {
        clientDebugId: getGoogleClientDebugId(clientId),
        platform: Platform.OS,
        redirectUri,
      });
    }

    const request = new AuthSession.AuthRequest({
      clientId,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: ['openid', 'email', 'profile'],
      usePKCE: true,
    });
    const result = await request.promptAsync(GOOGLE_DISCOVERY);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new Error('Google sign-in was cancelled.');
    }
    if (result.type !== 'success') {
      throw new Error('Google sign-in failed.');
    }
    if (result.params.error) {
      throw new Error(result.params.error_description || result.params.error);
    }
    if (!result.params.code) {
      throw new Error('Google sign-in did not return an authorization code.');
    }

    return {
      clientId,
      code: result.params.code,
      codeVerifier: request.codeVerifier,
      redirectUri,
    };
  }

  await ensureGoogleScript();

  return new Promise((resolve, reject) => {
    const googleClient = globalThis.window?.google?.accounts?.oauth2;
    if (!googleClient) {
      reject(new Error('Google sign-in is still loading.'));
      return;
    }

    const codeClient = googleClient.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      ux_mode: 'popup',
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || 'Google sign-in was cancelled.'));
          return;
        }
        if (!response.code) {
          reject(new Error('Google sign-in did not return an authorization code.'));
          return;
        }
        resolve({ code: response.code });
      },
    });

    codeClient.requestCode();
  });
}

export function LoginScreen({
  authMessage,
  authStatus,
  isAuthLoading,
  onAuthenticated,
  onOpenRegister,
  onSignIn,
  onSignInWithGoogle,
  onSignInWithBiometric,
  onOpenBiometricLogin,
  onTokenUpdate,
  onUserUpdate,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  const { users, primaryUser, secondaryUsers, loaded } = useBiometricUsers();
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);



  const hasRememberedUsers = loaded && primaryUser !== null;

  const canSubmit = useMemo(() => {
    return (
      email.trim().includes('@') &&
      password.length > 0 &&
      (!requiresTwoFactor || twoFactorCode.length === 6)
    );
  }, [email, password, requiresTwoFactor, twoFactorCode]);

  const handleBiometricLogin = async (user: BiometricUser, type: 'face' | 'palm') => {
    if (!onSignInWithBiometric) {
      setBiometricError('Biometric login not configured');
      return;
    }

    setBiometricLoading(true);
    setBiometricError(null);

    try {
      await onSignInWithBiometric(user, type);
    } catch (error) {
      setBiometricError(
        error instanceof Error ? error.message : 'Failed to start biometric login',
      );
    } finally {
      setTimeout(() => setBiometricLoading(false), 300);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || isAuthLoading) return;
    setLocalMessage(null);

    try {
      const result = await onSignIn({
        email: email.trim(),
        password,
        twoFactorCode: requiresTwoFactor ? twoFactorCode : undefined,
      });

      if (result.status === 'two_factor_required') {
        setRequiresTwoFactor(true);
        return;
      }

      onAuthenticated();
    } catch {
      return;
    }
  };

  const handleGoogleSubmit = async () => {
    if (isAuthLoading) return;
    setLocalMessage(null);

    try {
      const credentials = await requestGoogleCode();
      await onSignInWithGoogle(credentials);
      onAuthenticated();
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : 'Google sign-in failed.');
      return;
    }
  };

  const visibleMessage = localMessage || authMessage;
  const isError = authStatus === 'error' || Boolean(localMessage);

  const renderRememberedUsers = () => {
    if (!hasRememberedUsers || showEmailForm) return null;

    return (
      <View style={loginStyles.rememberedSection}>
        <View style={loginStyles.primaryUserCard}>
          <View style={loginStyles.primaryUserHeader}>
            {primaryUser!.avatar ? (
              <Image source={{ uri: primaryUser!.avatar }} style={loginStyles.userAvatar} />
            ) : (
              <View style={loginStyles.userAvatarPlaceholder}>
                <Text style={loginStyles.userAvatarText}>
                  {primaryUser!.firstName[0]?.toUpperCase() || ''}
                  {primaryUser!.lastName[0]?.toUpperCase() || ''}
                </Text>
              </View>
            )}
            <View style={loginStyles.primaryUserText}>
              <Text style={loginStyles.primaryUserName}>
                {primaryUser!.firstName} {primaryUser!.lastName}
              </Text>
              <Text style={loginStyles.primaryUserEmail}>{primaryUser!.email}</Text>
            </View>
          </View>

          <Text style={loginStyles.primaryUserHint}>Tap to sign in instantly</Text>

          <View style={loginStyles.biometricButtons}>
            {primaryUser!.hasFace && (
              <Pressable
                disabled={biometricLoading}
                onPress={() => handleBiometricLogin(primaryUser!, 'face')}
                style={({ pressed }) => [
                  loginStyles.biometricButton,
                  loginStyles.biometricButtonFace,
                  pressed && styles.pressedFeedback,
                  biometricLoading && styles.authSubmitButtonDisabled,
                ]}
              >
                {biometricLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <FaceIdIconWhite />
                    <Text style={loginStyles.biometricButtonText}>Face</Text>
                  </>
                )}
              </Pressable>
            )}

          </View>
        </View>

        {secondaryUsers.map((user) => (
          <Pressable
            key={user.user_id}
            disabled={biometricLoading}
            onPress={() => handleBiometricLogin(user, 'face')}
            style={({ pressed }) => [
              loginStyles.secondaryUserCard,
              pressed && styles.pressedFeedback,
            ]}
          >
            <View style={loginStyles.secondaryUserAvatar}>
              <Text style={loginStyles.secondaryUserAvatarText}>
                {user.firstName[0]?.toUpperCase() || ''}
                {user.lastName[0]?.toUpperCase() || ''}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={loginStyles.secondaryUserName}>
                {user.firstName} {user.lastName}
              </Text>
              <Text style={loginStyles.secondaryUserEmail}>{user.email}</Text>
            </View>
            <View style={loginStyles.secondaryUserIcons}>
              {user.hasFace && <FaceIdIconBlue size={18} />}

            </View>
          </Pressable>
        ))}

        <View style={loginStyles.divider}>
          <View style={loginStyles.dividerLine} />
          <Text style={loginStyles.dividerText}>or sign in differently</Text>
          <View style={loginStyles.dividerLine} />
        </View>

        <Pressable
          onPress={() => setShowEmailForm(true)}
          style={({ pressed }) => [loginStyles.switchButton, pressed && styles.pressedFeedback]}
        >
          <Text style={loginStyles.switchButtonText}>Sign in with email</Text>
        </Pressable>

        {biometricError ? <Text style={loginStyles.biometricError}>{biometricError}</Text> : null}
      </View>
    );
  };

  return (
    <AuthScaffold>


      {(true) && (
        <>
          <GoogleAuthButton
            disabled={isAuthLoading}
            label="Sign in with Google"
            onPress={handleGoogleSubmit}
          />

          <AuthDivider label="Or continue with email" />

          <View style={styles.authForm}>
            <AuthField
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!isAuthLoading}
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="you@example.com"
              textContentType="emailAddress"
              value={email}
            />
            <PasswordField
              editable={!isAuthLoading}
              label="Password"
              onChangeText={setPassword}
              onToggleVisibility={() => setShowPassword((current) => !current)}
              placeholder="Password"
              secureTextEntry={!showPassword}
              showPassword={showPassword}
              textContentType="password"
              value={password}
            />
            {requiresTwoFactor ? (
              <AuthField
                editable={!isAuthLoading}
                keyboardType="number-pad"
                label="Authenticator code"
                maxLength={6}
                onChangeText={(value) => setTwoFactorCode(value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                value={twoFactorCode}
              />
            ) : null}

            {visibleMessage ? (
              <Text style={[styles.authMessage, isError && styles.authMessageError]}>
                {visibleMessage}
              </Text>
            ) : null}

            <Pressable
                accessibilityRole="button"
                disabled={!canSubmit || isAuthLoading}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.authSubmitButton,
                  { flex: 1 },
                  (!canSubmit || isAuthLoading) && styles.authSubmitButtonDisabled,
                  pressed && canSubmit && !isAuthLoading && styles.pressedFeedback,
                ]}
              >
                <Text style={styles.authSubmitButtonText}>
                  {isAuthLoading
                    ? 'Signing in...'
                    : requiresTwoFactor
                      ? 'Verify and Sign In'
                      : 'Sign In'}
                </Text>
              </Pressable>

              {(hasRememberedUsers && onOpenBiometricLogin) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sign in with biometrics"
                  onPress={() => onOpenBiometricLogin?.(primaryUser || users[0])}
                  disabled={isAuthLoading}
                  style={({ pressed }) => [
                    loginStyles.biometricIconButton,
                    pressed && !isAuthLoading && styles.pressedFeedback,
                    isAuthLoading && styles.authSubmitButtonDisabled,
                  ]}
                >
                  <BiometricIcon />
                </Pressable>
              )}
            </View>
        </>
      )}

      <View style={styles.authSwitchRow}>
        <Text style={styles.authSwitchText}>{"Don't have an account? "}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenRegister}
          style={styles.authSwitchButton}
        >
          <Text style={styles.authSwitchButtonText}>Sign Up</Text>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}

// ---------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------
const loginStyles = StyleSheet.create({
  rememberedSection: {
    gap: 10,
    marginBottom: 16,
  },
  primaryUserCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#002AFF',
  },
  primaryUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#002AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  primaryUserText: {
    flex: 1,
  },
  primaryUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  primaryUserEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  primaryUserHint: {
    fontSize: 12,
    color: '#002AFF',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  biometricButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  biometricButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  biometricButtonFace: {
    backgroundColor: '#002AFF',
  },
  biometricButtonPalm: {
    backgroundColor: '#16A34A',
  },
  biometricButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryUserAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryUserName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  secondaryUserEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  secondaryUserIcons: {
    flexDirection: 'row',
    gap: 6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 12,
    color: '#6B7280',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  switchButtonText: {
    fontSize: 14,
    color: '#002AFF',
    fontWeight: '500',
  },
  biometricError: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 8,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  biometricIconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ---------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------
function BiometricIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3C7 3 4 6.5 4 11c0 3 1.5 5.5 3.5 7L9 20h6l1.5-2c2-1.5 3.5-4 3.5-7 0-4.5-3-8-8-8Z"
        stroke="#FFFFFF"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Circle cx={9} cy={11} r={1} fill="#FFFFFF" />
      <Circle cx={15} cy={11} r={1} fill="#FFFFFF" />
      <Path
        d="M9.5 15.5c.8.8 1.6 1 2.5 1s1.7-.2 2.5-1"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function FaceIdIconWhite() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3C7 3 4 6.5 4 11c0 3 1.5 5.5 3.5 7L9 20h6l1.5-2c2-1.5 3.5-4 3.5-7 0-4.5-3-8-8-8Z"
        stroke="#FFFFFF"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Circle cx={9} cy={11} r={1} fill="#FFFFFF" />
      <Circle cx={15} cy={11} r={1} fill="#FFFFFF" />
    </Svg>
  );
}

function PalmIdIconWhite() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 10V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V11M16 11V7.5a1.5 1.5 0 0 1 3 0v5c0 3.5-2.5 6-6 6H11c-3 0-5-2.5-5-5.5V10a1.5 1.5 0 0 1 3 0v0"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
      />
    </Svg>
  );
}

function FaceIdIconBlue({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3C7 3 4 6.5 4 11c0 3 1.5 5.5 3.5 7L9 20h6l1.5-2c2-1.5 3.5-4 3.5-7 0-4.5-3-8-8-8Z"
        stroke="#002AFF"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Circle cx={9} cy={11} r={1} fill="#002AFF" />
      <Circle cx={15} cy={11} r={1} fill="#002AFF" />
    </Svg>
  );
}

function PalmIdIconGreen({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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

function EyeIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"
        stroke="#6A7282"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="#6A7282" strokeWidth={1.8} />
    </Svg>
  );
}

function EyeOffIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="m3 3 18 18M10.6 10.7A3 3 0 0 0 13.3 14M9.3 5.5A9.8 9.8 0 0 1 12 5c6.1 0 9.5 7 9.5 7a14.4 14.4 0 0 1-3.2 3.8M6.2 6.9C3.8 8.6 2.5 12 2.5 12s3.4 7 9.5 7c1.2 0 2.3-.3 3.3-.7"
        stroke="#6A7282"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------
export function AuthScaffold({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.authSafeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.authKeyboardAvoidingView}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.authScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.authScroll}
        >
          <View style={styles.authPanel}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <View style={styles.authDividerRow}>
      <View style={styles.authDividerLine} />
      <Text style={styles.authDividerText}>{label}</Text>
      <View style={styles.authDividerLine} />
    </View>
  );
}

export function GoogleAuthButton({
  disabled,
  label,
  onPress,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.authGoogleButton,
        disabled && styles.authSubmitButtonDisabled,
        pressed && !disabled && styles.pressedFeedback,
      ]}
    >
      <Image source={googleGLogoImage} style={styles.authGoogleLogo} />
      <Text style={styles.authGoogleButtonText}>{label}</Text>
    </Pressable>
  );
}

export function AuthField({ label, style, ...inputProps }: AuthFieldProps) {
  return (
    <View style={styles.authField}>
      <Text style={styles.authLabel}>{label}</Text>
      <TextInput placeholderTextColor="#9CA3AF" style={[styles.authInput, { color: '#111827' }, style]} {...inputProps} />
    </View>
  );
}

type PasswordFieldProps = AuthFieldProps & {
  onToggleVisibility: () => void;
  showPassword: boolean;
};

export function PasswordField({
  label,
  onToggleVisibility,
  showPassword,
  style,
  ...inputProps
}: PasswordFieldProps) {
  return (
    <View style={styles.authField}>
      <Text style={styles.authLabel}>{label}</Text>
      <View style={[styles.authInput, styles.authPasswordRow]}>
        <TextInput
          placeholderTextColor="#9CA3AF"
          style={[styles.authPasswordInput, { color: '#111827' }, style]}
          {...inputProps}
        />
        <Pressable
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          accessibilityRole="button"
          onPress={onToggleVisibility}
          style={styles.authPasswordToggle}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </Pressable>
      </View>
    </View>
  );
}