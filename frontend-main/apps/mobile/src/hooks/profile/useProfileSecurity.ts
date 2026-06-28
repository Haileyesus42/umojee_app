import { useCallback, useEffect, useRef, useState } from 'react';

import type { AuthUser } from '../../api/auth/auth';
import { fetchCurrentUser } from '../../api/profile/profile';
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  requestPasswordReset,
  updateClientPassword,
  type TwoFactorSetupData,
} from '../../api/profile/security';

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getTwoFactorEnabled(user: AuthUser | null): boolean {
  return Boolean(
    user?.twoFactorEnabled || (isObjectRecord(user?.security) && user.security.twoFactorEnabled),
  );
}

function getTwoFactorEnabledAt(user: AuthUser | null): string | null {
  const directValue = user?.twoFactorEnabledAt;
  const securityValue = isObjectRecord(user?.security) ? user.security.twoFactorEnabledAt : null;
  const value = directValue || securityValue;

  return typeof value === 'string' ? value : null;
}




export function useProfileSecurity({
  onTokenUpdate,
  onUserUpdate,
  token,
  user,
}: {
  onTokenUpdate?: (token: string) => Promise<void>;
  onUserUpdate?: (user: AuthUser) => Promise<void>;
  token: string | null;
  user: AuthUser | null;
}) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(getTwoFactorEnabled(user));
  const [twoFactorEnabledAt, setTwoFactorEnabledAt] = useState(getTwoFactorEnabledAt(user));
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetupData | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [disableTwoFactorCode, setDisableTwoFactorCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [twoFactorSetupLoading, setTwoFactorSetupLoading] = useState(false);
  const [twoFactorConfirmLoading, setTwoFactorConfirmLoading] = useState(false);
  const [twoFactorDisableLoading, setTwoFactorDisableLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const onUserUpdateRef = useRef(onUserUpdate);

  useEffect(() => {
    onUserUpdateRef.current = onUserUpdate;
  }, [onUserUpdate]);

  useEffect(() => {
    setTwoFactorEnabled(getTwoFactorEnabled(user));
    setTwoFactorEnabledAt(getTwoFactorEnabledAt(user));
  }, [user]);

  const applySecurityUser = useCallback(async (nextUser: AuthUser) => {
    setTwoFactorEnabled(getTwoFactorEnabled(nextUser));
    setTwoFactorEnabledAt(getTwoFactorEnabledAt(nextUser));
    await onUserUpdateRef.current?.(nextUser);
  }, []);

  const refreshSecurityUser = useCallback(async () => {
    if (!token) {
      return null;
    }

    const currentUser = await fetchCurrentUser(token);
    await applySecurityUser(currentUser);

    return currentUser;
  }, [applySecurityUser, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    void (async () => {
      try {
        const currentUser = await fetchCurrentUser(token);

        if (!isMounted) {
          return;
        }

        await applySecurityUser(currentUser);
      } catch (error) {
        if (__DEV__) {
          const detail = error instanceof Error ? error.message : 'request failed';

          console.warn(`[Security] Failed to refresh current user: ${detail}`);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [applySecurityUser, token]);

  const closeTwoFactorSetup = useCallback(() => {
    // Keep twoFactorSetup data so reopening reuses same secret
    setTwoFactorCode('');
    setMessage(null);
  }, []);

  const clearTwoFactorSetup = useCallback(() => {
    setTwoFactorSetup(null);
    setTwoFactorCode('');
    setMessage(null);
  }, []);

  const startTwoFactorSetup = useCallback(async () => {
    if (!token) {
      setMessage('Sign in again to update security settings.');
      return;
    }

    setTwoFactorSetupLoading(true);
    setMessage(null);

    try {
      const currentUser = await refreshSecurityUser();

      if (currentUser && getTwoFactorEnabled(currentUser)) {
        setMessage('Two-factor authentication is already enabled.');
        return;
      }

      const setup = await beginTwoFactorSetup(token);
      setTwoFactorSetup(setup);
      setTwoFactorCode('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to start two-factor setup.');
    } finally {
      setTwoFactorSetupLoading(false);
    }
  }, [refreshSecurityUser, token]);

  const confirmTwoFactor = useCallback(async () => {
    if (!token) {
      setMessage('Sign in again to update security settings.');
      return;
    }

    if (twoFactorCode.length !== 6) {
      setMessage('Enter the 6-digit authenticator code.');
      return;
    }

    setTwoFactorConfirmLoading(true);
    setMessage(null);

    try {
      const updatedUser = await confirmTwoFactorSetup(token, twoFactorCode);
      await onUserUpdate?.(updatedUser);
      setTwoFactorEnabled(true);
      setTwoFactorEnabledAt(getTwoFactorEnabledAt(updatedUser) || new Date().toISOString());
      setTwoFactorSetup(null);
      setTwoFactorCode('');
      setMessage('Two-factor authentication enabled.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to verify authenticator code.');
    } finally {
      setTwoFactorConfirmLoading(false);
    }
  }, [closeTwoFactorSetup, onUserUpdate, token, twoFactorCode]);

  const disableTwoFactorAuth = useCallback(
    async (codeOverride?: string) => {
      const code = codeOverride ?? disableTwoFactorCode;

      if (!token) {
        setMessage('Sign in again to update security settings.');
        return;
      }

      if (code.length !== 6) {
        setMessage('Enter your current 6-digit authenticator code.');
        return;
      }

      setTwoFactorDisableLoading(true);
      setMessage(null);

      try {
        const updatedUser = await disableTwoFactor(token, code);
        await onUserUpdate?.(updatedUser);
        setTwoFactorEnabled(false);
        setTwoFactorEnabledAt(null);
        setDisableTwoFactorCode('');
        setMessage('Two-factor authentication disabled.');
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : 'Failed to disable two-factor authentication.',
        );
      } finally {
        setTwoFactorDisableLoading(false);
      }
    },
    [disableTwoFactorCode, onUserUpdate, token],
  );

  const updatePassword = useCallback(async () => {
    if (!token) {
      setMessage('Sign in again to update your password.');
      return;
    }

    if (!currentPassword) {
      setMessage('Enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setMessage('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    setMessage(null);

    try {
      const result = await updateClientPassword(token, {
        password: newPassword,
        passwordCurrent: currentPassword,
      });

      if (result.token) {
        await onTokenUpdate?.(result.token);
      }

      if (result.user) {
        await onUserUpdate?.(result.user);
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password updated successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  }, [confirmPassword, currentPassword, newPassword, onTokenUpdate, onUserUpdate, token]);

  const sendPasswordReset = useCallback(async () => {
    const email = typeof user?.email === 'string' ? user.email : '';

    if (!email) {
      setMessage('No email address is available for this account.');
      return;
    }

    setForgotPasswordLoading(true);
    setMessage(null);

    try {
      const responseMessage = await requestPasswordReset(email);
      setMessage(responseMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to request password reset.');
    } finally {
      setForgotPasswordLoading(false);
    }
  }, [user]);

  return {
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
  };
}
