import { useCallback, useEffect, useState } from 'react';

import {
  createCompanion,
  deleteCompanion,
  fetchCompanions,
  updateCompanion,
  uploadCompanionPhoto,
  type Companion,
  type CompanionPayload,
  type CompanionPhotoUpload,
} from '../../api/profile/companions';

export function useCompanions(token: string | null) {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadCompanions = useCallback(async () => {
    if (!token) {
      setCompanions([]);
      setMessage('Sign in again to manage companions.');
      return [];
    }

    setLoading(true);
    setMessage(null);

    try {
      const nextCompanions = await fetchCompanions(token);
      setCompanions(nextCompanions);
      return nextCompanions;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load companions.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadCompanions();
  }, [loadCompanions]);

  const saveCompanion = useCallback(
    async (companionId: string | undefined, payload: CompanionPayload) => {
      if (!token) {
        setMessage('Sign in again to save companions.');
        return null;
      }

      setSaving(true);
      setMessage(null);

      try {
        const savedCompanion = companionId
          ? await updateCompanion(token, companionId, payload)
          : await createCompanion(token, payload);

        setCompanions((current) =>
          companionId
            ? current.map((companion) =>
                companion._id === savedCompanion._id ? savedCompanion : companion,
              )
            : [savedCompanion, ...current],
        );
        setMessage('Companion saved.');
        return savedCompanion;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to save companion.');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  const removeCompanion = useCallback(
    async (companionId: string) => {
      if (!token) {
        setMessage('Sign in again to delete companions.');
        return false;
      }

      setDeleting(true);
      setMessage(null);

      try {
        await deleteCompanion(token, companionId);
        setCompanions((current) => current.filter((companion) => companion._id !== companionId));
        setMessage('Companion deleted.');
        return true;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to delete companion.');
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [token],
  );

  const saveCompanionPhoto = useCallback(
    async (companionId: string, photo: CompanionPhotoUpload) => {
      if (!token) {
        setMessage('Sign in again to update companion photos.');
        return null;
      }

      setUploadingPhoto(true);
      setMessage(null);

      try {
        const savedCompanion = await uploadCompanionPhoto(token, companionId, photo);
        setCompanions((current) =>
          current.map((companion) =>
            companion._id === savedCompanion._id ? savedCompanion : companion,
          ),
        );
        setMessage('Companion photo updated.');
        return savedCompanion;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to update companion photo.');
        return null;
      } finally {
        setUploadingPhoto(false);
      }
    },
    [token],
  );

  return {
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
  };
}
