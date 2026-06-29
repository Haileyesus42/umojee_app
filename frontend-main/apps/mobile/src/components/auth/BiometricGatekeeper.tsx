// src/components/auth/BiometricGatekeeper.tsx

import { useEffect } from 'react';
import { FaceRecognitionScreen } from '../../screens/profile/FaceRecognitionScreen';
import type { UseBiometricStateReturn } from '../../hooks/useBiometricState';

type BiometricGatekeeperProps = {
  isBiometricEnabled: boolean;
  userId?: string;
  token?: string;
  biometricState: UseBiometricStateReturn;
  children: React.ReactNode;
  notificationUnreadCount?: number;
  onOpenChat?: () => void;
  onOpenHome: () => void;
  onOpenJourneys?: () => void;
  onOpenNotifications: () => void;
  onOpenTravelSupport?: () => void;
  onVerified?: () => void;
};

export function BiometricGatekeeper({
  isBiometricEnabled,
  userId,
  token,
  biometricState,
  children,
  notificationUnreadCount,
  onOpenChat,
  onOpenHome,
  onOpenJourneys,
  onOpenNotifications,
  onOpenTravelSupport,
  onVerified,
}: BiometricGatekeeperProps) {
  // Check if session is still valid
  const hasActiveSession = biometricState.checkVerification();

  // Log remaining time for debugging
  useEffect(() => {
    if (hasActiveSession) {
      const remaining = biometricState.getRemainingTime();
      console.log(
        '[BiometricGatekeeper] ⏱️ Active session, remaining:',
        Math.round(remaining / 1000),
        'seconds',
      );
    }
  }, [hasActiveSession, biometricState]);

  // CASE 1: Biometric NOT enabled → bypass verification
  if (!isBiometricEnabled) {
    console.log('[BiometricGatekeeper] ✅ Bypassing - biometrics not enabled');
    return <>{children}</>;
  }

  // CASE 2: Active session → bypass verification
  if (hasActiveSession) {
    console.log('[BiometricGatekeeper] ✅ Bypassing - active session');
    return <>{children}</>;
  }

  // CASE 3: Biometric enabled, no active session → show verification screen
  console.log('[BiometricGatekeeper] 🔐 Showing verification screen');
  return (
    <FaceRecognitionScreen
      userId={userId || ''}
      token={token}
      hasPalm={biometricState.palmEnrolled}
      notificationUnreadCount={notificationUnreadCount}
      onOpenChat={onOpenChat ?? (() => undefined)}
      onOpenHome={onOpenHome}
      onOpenJourneys={onOpenJourneys}
      onOpenNotifications={onOpenNotifications}
      onOpenTravelSupport={onOpenTravelSupport}
      onVerified={async () => {
        console.log('[BiometricGatekeeper] ✅ Verification complete');
        // Start a new session (30 minutes)
        await biometricState.setVerified(30 * 1000);
        if (onVerified) {
          onVerified();
        }
      }}
      purpose="account"
    />
  );
}