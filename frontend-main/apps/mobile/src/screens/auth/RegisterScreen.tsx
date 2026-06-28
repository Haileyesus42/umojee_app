import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { AuthResponse, GoogleAuthCredentials, RegisterCredentials } from '../../api/auth/auth';
import { styles } from '../../theme/styles';
import {
  AuthDivider,
  AuthField,
  AuthScaffold,
  GoogleAuthButton,
  PasswordField,
  requestGoogleCode,
} from './LoginScreen';

type RegisterScreenProps = {
  authMessage: string | null;
  authStatus: string;
  isAuthLoading: boolean;
  onOpenLogin: () => void;
  onRegistered: () => void;
  onSignUp: (credentials: RegisterCredentials) => Promise<AuthResponse>;
  onSignUpWithGoogle: (credentials: GoogleAuthCredentials) => Promise<AuthResponse>;
};

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export function RegisterScreen({
  authMessage,
  authStatus,
  isAuthLoading,
  onOpenLogin,
  onRegistered,
  onSignUp,
  onSignUpWithGoogle,
}: RegisterScreenProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      firstName.trim().length >= 2 &&
      lastName.trim().length >= 2 &&
      email.trim().includes('@') &&
      phone.replace(/\D/g, '').length >= 10 &&
      /^\d{4}-\d{2}-\d{2}$/.test(dob.trim()) &&
      passwordRegex.test(password) &&
      password === confirmPassword
    );
  }, [confirmPassword, dob, email, firstName, lastName, password, phone]);

  const handleSubmit = async () => {
    if (!canSubmit || isAuthLoading) {
      return;
    }

    setLocalMessage(null);

    try {
      await onSignUp({
        confirmPassword,
        dob: dob.trim(),
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
        phone: phone.trim(),
      });
      onRegistered();
    } catch {
      return;
    }
  };

  const handleGoogleSubmit = async () => {
    if (isAuthLoading) {
      return;
    }

    setLocalMessage(null);

    try {
      const credentials = await requestGoogleCode();
      await onSignUpWithGoogle(credentials);
      onRegistered();
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : 'Google sign-up failed.');
      return;
    }
  };

  const visibleMessage = localMessage || authMessage;
  const isError = authStatus === 'error' || Boolean(localMessage);

  return (
    <AuthScaffold>
      <GoogleAuthButton
        disabled={isAuthLoading}
        label="Sign up with Google"
        onPress={handleGoogleSubmit}
      />

      <AuthDivider label="Or sign up with email" />

      <View style={styles.authForm}>
        <View style={styles.authTwoColumnRow}>
          <AuthField
            autoCapitalize="words"
            editable={!isAuthLoading}
            label="First Name"
            onChangeText={setFirstName}
            placeholder="John"
            value={firstName}
          />
          <AuthField
            autoCapitalize="words"
            editable={!isAuthLoading}
            label="Last Name"
            onChangeText={setLastName}
            placeholder="Doe"
            value={lastName}
          />
        </View>
        <AuthField
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          editable={!isAuthLoading}
          keyboardType="email-address"
          label="Email Address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          textContentType="emailAddress"
          value={email}
        />
        <AuthField
          editable={!isAuthLoading}
          keyboardType="phone-pad"
          label="Phone Number"
          onChangeText={setPhone}
          placeholder="+1 555 123 4567"
          textContentType="telephoneNumber"
          value={phone}
        />
        <AuthField
          editable={!isAuthLoading}
          keyboardType="numbers-and-punctuation"
          label="Date of Birth"
          maxLength={10}
          onChangeText={setDob}
          placeholder="YYYY-MM-DD"
          value={dob}
        />
        <PasswordField
          editable={!isAuthLoading}
          label="Password"
          onChangeText={setPassword}
          onToggleVisibility={() => setShowPassword((current) => !current)}
          placeholder="Password"
          secureTextEntry={!showPassword}
          showPassword={showPassword}
          textContentType="newPassword"
          value={password}
        />
        <PasswordField
          editable={!isAuthLoading}
          label="Confirm Password"
          onChangeText={setConfirmPassword}
          onToggleVisibility={() => setShowConfirmPassword((current) => !current)}
          placeholder="Confirm password"
          secureTextEntry={!showConfirmPassword}
          showPassword={showConfirmPassword}
          textContentType="newPassword"
          value={confirmPassword}
        />

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
            (!canSubmit || isAuthLoading) && styles.authSubmitButtonDisabled,
            pressed && canSubmit && !isAuthLoading && styles.pressedFeedback,
          ]}
        >
          <Text style={styles.authSubmitButtonText}>
            {isAuthLoading ? 'Creating account...' : 'Sign Up'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.authSwitchRow}>
        <Text style={styles.authSwitchText}>Already have an account? </Text>
        <Pressable accessibilityRole="button" onPress={onOpenLogin} style={styles.authSwitchButton}>
          <Text style={styles.authSwitchButtonText}>Sign In</Text>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}
