// src/hooks/useBiometricState.ts

import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_SESSION_KEY = 'umojee.biometric_session.v3';
const BIOMETRIC_ENROLLMENT_KEY = 'umojee.biometric_enrollment.v1'; // ✅ NEW
const DEFAULT_SESSION_DURATION_MS = 30 * 1000; // 30 minutes

type BiometricEnrollmentData = {
  faceEnrolled: boolean;
  palmEnrolled: boolean;
};

export type UseBiometricStateReturn = {
  faceEnrolled: boolean;
  palmEnrolled: boolean;
  isBiometricEnabled: boolean;
  setFaceEnrolled: (value: boolean) => void;
  setPalmEnrolled: (value: boolean) => void;
  disableBiometric: () => Promise<void>;
  resetBiometricState: () => Promise<void>;
  isVerified: boolean;
  verifiedAt: number | null;
  sessionDuration: number;
  setVerified: (durationMs?: number) => Promise<void>;
  clearVerification: () => Promise<void>;
  checkVerification: () => boolean;
  getRemainingTime: () => number;
  refreshEnrollmentFromBackend: (userId: string) => Promise<void>; // ✅ NEW
};

export function useBiometricState(): UseBiometricStateReturn {
  const [faceEnrolled, setFaceEnrolledState] = useState(false);
  const [palmEnrolled, setPalmEnrolledState] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<number | null>(null);
  const [sessionDuration, setSessionDuration] = useState(DEFAULT_SESSION_DURATION_MS);
  const [enrollmentLoaded, setEnrollmentLoaded] = useState(false); // ✅ NEW: track if loaded

  const isBiometricEnabled = faceEnrolled || palmEnrolled;

  // ✅ Persist enrollment to AsyncStorage whenever it changes
  useEffect(() => {
    if (!enrollmentLoaded) return; // Don't save until we've loaded initial state
    
    (async () => {
      try {
        const data: BiometricEnrollmentData = { faceEnrolled, palmEnrolled };
        await AsyncStorage.setItem(BIOMETRIC_ENROLLMENT_KEY, JSON.stringify(data));
        console.log('[BiometricState] 💾 Enrollment saved:', data);
      } catch (error) {
        console.warn('[BiometricState] Failed to save enrollment:', error);
      }
    })();
  }, [faceEnrolled, palmEnrolled, enrollmentLoaded]);

  // ✅ Restore enrollment from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(BIOMETRIC_ENROLLMENT_KEY);
        if (stored) {
          const data: BiometricEnrollmentData = JSON.parse(stored);
          setFaceEnrolledState(data.faceEnrolled);
          setPalmEnrolledState(data.palmEnrolled);
          console.log('[BiometricState] 🔄 Enrollment restored:', data);
        }
      } catch (error) {
        console.warn('[BiometricState] Failed to restore enrollment:', error);
      } finally {
        setEnrollmentLoaded(true); // ✅ Mark as loaded
      }
    })();
  }, []);

  // ✅ Wrapper functions that also persist
  const setFaceEnrolled = useCallback((value: boolean) => {
    console.log('[BiometricState] setFaceEnrolled:', value);
    setFaceEnrolledState(value);
  }, []);

  const setPalmEnrolled = useCallback((value: boolean) => {
    console.log('[BiometricState] setPalmEnrolled:', value);
    setPalmEnrolledState(value);
  }, []);

  // Session functions (unchanged)
  const checkVerification = useCallback((): boolean => {
    if (verifiedAt === null) return false;
    const elapsed = Date.now() - verifiedAt;
    return elapsed < sessionDuration;
  }, [verifiedAt, sessionDuration]);

  const isVerified = checkVerification();

  const getRemainingTime = useCallback((): number => {
    if (verifiedAt === null) return 0;
    const remaining = sessionDuration - (Date.now() - verifiedAt);
    return Math.max(0, remaining);
  }, [verifiedAt, sessionDuration]);

  const setVerified = useCallback(async (durationMs: number = DEFAULT_SESSION_DURATION_MS) => {
    const now = Date.now();
    setVerifiedAt(now);
    setSessionDuration(durationMs);
    try {
      await AsyncStorage.setItem(BIOMETRIC_SESSION_KEY, JSON.stringify({ verifiedAt: now, duration: durationMs }));
      console.log('[BiometricState] ✅ Session started for', durationMs / 1000, 'seconds');
    } catch (error) {
      console.warn('[BiometricState] Failed to persist session:', error);
    }
  }, []);

  const clearVerification = useCallback(async () => {
    setVerifiedAt(null);
    try {
      await AsyncStorage.removeItem(BIOMETRIC_SESSION_KEY);
      await AsyncStorage.removeItem('umojee.biometric_session.v1');
      await AsyncStorage.removeItem('umojee.biometric_session.v2');
      console.log('[BiometricState] 🧹 Session cleared');
    } catch (error) {
      console.warn('[BiometricState] Failed to clear session:', error);
    }
  }, []);

  const disableBiometric = useCallback(async () => {
    setFaceEnrolledState(false);
    setPalmEnrolledState(false);
    await clearVerification();
    try {
      await AsyncStorage.removeItem(BIOMETRIC_ENROLLMENT_KEY);
    } catch {}
  }, [clearVerification]);

  const resetBiometricState = useCallback(async () => {
    setFaceEnrolledState(false);
    setPalmEnrolledState(false);
    await clearVerification();
    try {
      await AsyncStorage.removeItem(BIOMETRIC_ENROLLMENT_KEY);
    } catch {}
  }, [clearVerification]);

  // ✅ NEW: Refresh enrollment from Python backend
  const refreshEnrollmentFromBackend = useCallback(async (userId: string) => {
    try {
      const PYTHON_API_URL =
        process.env.EXPO_PUBLIC_FASTAPI_BACKEND_URL ||
        process.env.EXPO_PUBLIC_AI_BACKEND_URL ||
        'http://192.168.8.86:8000';
      
      const response = await fetch(`${PYTHON_API_URL}/v1/biometrics/status/${userId}`);
      if (!response.ok) return;
      
      const json = await response.json();
      const hasFace = Boolean(json.hasFace);
      const hasPalm = Boolean(json.hasPalm);
      
      console.log('[BiometricState] 🔄 Backend enrollment:', { hasFace, hasPalm });
      
      setFaceEnrolledState(hasFace);
      setPalmEnrolledState(hasPalm);
      
      // Persist to AsyncStorage
      const data: BiometricEnrollmentData = { faceEnrolled: hasFace, palmEnrolled: hasPalm };
      await AsyncStorage.setItem(BIOMETRIC_ENROLLMENT_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('[BiometricState] Failed to refresh from backend:', error);
    }
  }, []);

  return useMemo(
    () => ({
      faceEnrolled,
      palmEnrolled,
      isBiometricEnabled,
      setFaceEnrolled,
      setPalmEnrolled,
      disableBiometric,
      resetBiometricState,
      isVerified,
      verifiedAt,
      sessionDuration,
      setVerified,
      clearVerification,
      checkVerification,
      getRemainingTime,
      refreshEnrollmentFromBackend,
    }),
    [
      faceEnrolled,
      palmEnrolled,
      isBiometricEnabled,
      setFaceEnrolled,
      setPalmEnrolled,
      disableBiometric,
      resetBiometricState,
      isVerified,
      verifiedAt,
      sessionDuration,
      setVerified,
      clearVerification,
      checkVerification,
      getRemainingTime,
      refreshEnrollmentFromBackend,
    ],
  );
}