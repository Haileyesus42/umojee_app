import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AuthUser } from '../../api/auth/auth';
import { fetchAiWithFallback } from '../../api/client';
import {
  updateCurrentUser,
  type CommunicationPreferencePayload,
  type JourneyMonitoringPreference,
  type LocationTrackingPreferencePayload,
} from '../../api/profile/profile';
import {
  getCommunicationPreference,
  getJourneyMonitoringPreference,
  getLocationTrackingPreference,
  getThemePreference,
} from '../../utils/profilePreferences';

export function useProfilePreferences({
  onUserUpdate,
  token,
  user,
}: {
  onUserUpdate?: (user: AuthUser) => Promise<void>;
  token: string | null;
  user: AuthUser | null;
}) {
  const savedThemePreference = useMemo(() => getThemePreference(user), [user]);
  const savedJourneyMonitoringPreference = useMemo(
    () => getJourneyMonitoringPreference(user),
    [user],
  );
  const savedLocationTrackingPreference = useMemo(
    () => getLocationTrackingPreference(user),
    [user],
  );
  const savedCommunicationPreference = useMemo(() => getCommunicationPreference(user), [user]);
  const [themePreference, setThemePreference] = useState(savedThemePreference);
  const [journeyMonitoringPreference, setJourneyMonitoringPreference] =
    useState<JourneyMonitoringPreference>(savedJourneyMonitoringPreference);
  const [locationTrackingPreference, setLocationTrackingPreference] =
    useState<LocationTrackingPreferencePayload>(savedLocationTrackingPreference);
  const [communicationPreference, setCommunicationPreference] =
    useState<CommunicationPreferencePayload>(savedCommunicationPreference);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setThemePreference(savedThemePreference);
    setJourneyMonitoringPreference(savedJourneyMonitoringPreference);
    setLocationTrackingPreference(savedLocationTrackingPreference);
    setCommunicationPreference(savedCommunicationPreference);
  }, [
    savedCommunicationPreference,
    savedJourneyMonitoringPreference,
    savedLocationTrackingPreference,
    savedThemePreference,
  ]);

  const hasChanges = useMemo(
    () =>
      themePreference !== savedThemePreference ||
      journeyMonitoringPreference !== savedJourneyMonitoringPreference ||
      locationTrackingPreference.airportTracking !==
        savedLocationTrackingPreference.airportTracking ||
      locationTrackingPreference.fullTracking !== savedLocationTrackingPreference.fullTracking ||
      locationTrackingPreference.tripsTracking !== savedLocationTrackingPreference.tripsTracking ||
      communicationPreference.emailNotifications !==
        savedCommunicationPreference.emailNotifications ||
      communicationPreference.marketingList !== savedCommunicationPreference.marketingList ||
      communicationPreference.pushNotifications !==
        savedCommunicationPreference.pushNotifications ||
      communicationPreference.securityAlerts !== savedCommunicationPreference.securityAlerts,
    [
      communicationPreference,
      journeyMonitoringPreference,
      locationTrackingPreference,
      savedCommunicationPreference,
      savedJourneyMonitoringPreference,
      savedLocationTrackingPreference,
      savedThemePreference,
      themePreference,
    ],
  );

  const toggleLocationTrackingPreference = useCallback(
    (key: keyof LocationTrackingPreferencePayload) => {
      setLocationTrackingPreference((current) => ({
        ...current,
        [key]: !current[key],
      }));
    },
    [],
  );

  const toggleCommunicationPreference = useCallback((key: keyof CommunicationPreferencePayload) => {
    setCommunicationPreference((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }, []);

  const savePreferences = useCallback(async () => {
    if (!hasChanges) {
      return null;
    }

    if (!token) {
      setMessage('Sign in again to update your preferences.');
      return null;
    }

    setSaving(true);
    setMessage(null);

    try {
      const updatedUser = await updateCurrentUser(token, {
        communicationPreference,
        journeyMonitoringPreference,
        locationTrackingPreference,
        themePreference,
      });

      await onUserUpdate?.(updatedUser);
      setMessage('Preferences saved.');

      try {
        await fetchAiWithFallback('/api/ai/monitoring/preference', {
          body: JSON.stringify({
            journeyMonitoringPreference,
            user_id: updatedUser._id || user?._id || user?.id,
          }),
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          method: 'POST',
        });
      } catch (error) {
        if (__DEV__) {
          const detail = error instanceof Error ? error.message : 'request failed';

          console.warn(`[Preferences] Failed to notify AI monitoring API: ${detail}`);
        }
      }

      return updatedUser;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save preferences.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [
    communicationPreference,
    hasChanges,
    journeyMonitoringPreference,
    locationTrackingPreference,
    onUserUpdate,
    themePreference,
    token,
    user,
  ]);

  return {
    communicationPreference,
    hasChanges,
    journeyMonitoringPreference,
    locationTrackingPreference,
    message,
    savePreferences,
    saving,
    setJourneyMonitoringPreference,
    setMessage,
    setThemePreference,
    themePreference,
    toggleCommunicationPreference,
    toggleLocationTrackingPreference,
  };
}
