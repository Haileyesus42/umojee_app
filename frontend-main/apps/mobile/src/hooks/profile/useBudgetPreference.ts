import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AuthUser } from '../../api/auth/auth';
import { updateCurrentUser, type BudgetPreferencePayload } from '../../api/profile/profile';
import { getBudgetPreference, normalizeBudgetRange } from '../../utils/profileBudget';

export function useBudgetPreference({
  onUserUpdate,
  token,
  user,
}: {
  onUserUpdate?: (user: AuthUser) => Promise<void>;
  token: string | null;
  user: AuthUser | null;
}) {
  const savedBudget = useMemo(() => getBudgetPreference(user), [user]);
  const [budget, setBudget] = useState<BudgetPreferencePayload>(savedBudget);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setBudget(savedBudget);
  }, [savedBudget]);

  const hasChanges = useMemo(
    () =>
      budget.currency !== savedBudget.currency ||
      budget.max !== savedBudget.max ||
      budget.min !== savedBudget.min,
    [budget, savedBudget],
  );

  const updateBudget = useCallback((nextBudget: Partial<BudgetPreferencePayload>) => {
    setBudget((current) => normalizeBudgetRange({ ...current, ...nextBudget }));
  }, []);

  const saveBudget = useCallback(async () => {
    if (!hasChanges) {
      return null;
    }

    if (!token) {
      setMessage('Sign in again to update your budget.');
      return null;
    }

    setSaving(true);
    setMessage(null);

    try {
      const normalizedBudget = normalizeBudgetRange(budget);
      const updatedUser = await updateCurrentUser(token, {
        budgetPreference: normalizedBudget,
      });

      await onUserUpdate?.(updatedUser);
      setBudget(getBudgetPreference(updatedUser));
      setMessage('Budget preferences saved.');
      return updatedUser;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save budget preferences.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [budget, hasChanges, onUserUpdate, token]);

  return {
    budget,
    hasChanges,
    message,
    saveBudget,
    saving,
    setMessage,
    updateBudget,
  };
}
