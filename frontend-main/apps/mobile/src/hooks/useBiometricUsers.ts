import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_USERS_KEY = 'umojee.biometric_users.v1';

export type BiometricUser = {
  user_id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  hasFace: boolean;
  hasPalm: boolean;
  lastLogin: string; // ISO date
};

export function useBiometricUsers() {
  const [users, setUsers] = useState<BiometricUser[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load users on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(BIOMETRIC_USERS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as BiometricUser[];
          // Sort by lastLogin (most recent first)
          const sorted = parsed.sort((a, b) => 
            new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime()
          );
          setUsers(sorted);
        }
      } catch (error) {
        console.warn('[BiometricUsers] Failed to load:', error);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Save a user after successful biometric login
  const saveUser = useCallback(async (user: BiometricUser) => {
    try {
      const updated = users.filter(u => u.user_id !== user.user_id);
      updated.unshift({ ...user, lastLogin: new Date().toISOString() });
      setUsers(updated);
      await AsyncStorage.setItem(BIOMETRIC_USERS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('[BiometricUsers] Failed to save:', error);
    }
  }, [users]);

  // Remove a user (when they disable biometrics or logout)
  const removeUser = useCallback(async (userId: string) => {
    try {
      const updated = users.filter(u => u.user_id !== userId);
      setUsers(updated);
      await AsyncStorage.setItem(BIOMETRIC_USERS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('[BiometricUsers] Failed to remove:', error);
    }
  }, [users]);

  // Update user info (e.g., after profile update)
  const updateUser = useCallback(async (userId: string, updates: Partial<BiometricUser>) => {
    try {
      const updated = users.map(u => 
        u.user_id === userId ? { ...u, ...updates } : u
      );
      setUsers(updated);
      await AsyncStorage.setItem(BIOMETRIC_USERS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('[BiometricUsers] Failed to update:', error);
    }
  }, [users]);

  // Get primary user (last logged in)
  const primaryUser = users[0] || null;
  const secondaryUsers = users.slice(1);

  return {
    users,
    primaryUser,
    secondaryUsers,
    loaded,
    saveUser,
    removeUser,
    updateUser,
  };
}