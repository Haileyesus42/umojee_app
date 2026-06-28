import type { AuthUser } from '../api/auth/auth';
import type { BudgetPreferencePayload } from '../api/profile/profile';

export const BUDGET_MIN_VALUE = 100;
export const BUDGET_MAX_VALUE = 25000;
export const BUDGET_STEP_VALUE = 100;
export const BUDGET_MIN_RANGE_GAP = 100;

export const DEFAULT_BUDGET_PREFERENCE: BudgetPreferencePayload = {
  currency: 'USD',
  max: 3000,
  min: 500,
};

export const BUDGET_PRESETS = [
  { label: 'Budget', max: 8400, min: 100 },
  { label: 'Mid-range', max: 16700, min: 8400 },
  { label: 'Premium', max: 25000, min: 16700 },
] as const;

export type BudgetCategoryLabel = (typeof BUDGET_PRESETS)[number]['label'];

export const BUDGET_CURRENCIES = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (EUR)' },
  { code: 'GBP', label: 'GBP (GBP)' },
  { code: 'ETB', label: 'ETB (Br)' },
  { code: 'KES', label: 'KES (KSh)' },
  { code: 'NGN', label: 'NGN (NGN)' },
  { code: 'ZAR', label: 'ZAR (R)' },
  { code: 'AED', label: 'AED (AED)' },
] as const;

export function getBudgetPreference(user: AuthUser | null): BudgetPreferencePayload {
  return normalizeBudgetPreference(user?.budgetPreference);
}

export function normalizeBudgetPreference(value: unknown): BudgetPreferencePayload {
  if (!value || typeof value !== 'object') {
    return DEFAULT_BUDGET_PREFERENCE;
  }

  const budget = value as Partial<BudgetPreferencePayload>;

  return normalizeBudgetRange({
    currency:
      typeof budget.currency === 'string' ? budget.currency : DEFAULT_BUDGET_PREFERENCE.currency,
    max: budget.max,
    min: budget.min,
  });
}

export function normalizeBudgetRange(
  value: Partial<BudgetPreferencePayload>,
): BudgetPreferencePayload {
  const min = clampBudgetNumber(
    value.min,
    DEFAULT_BUDGET_PREFERENCE.min,
    BUDGET_MIN_VALUE,
    BUDGET_MAX_VALUE,
  );
  const max = clampBudgetNumber(
    value.max,
    Math.max(DEFAULT_BUDGET_PREFERENCE.max, min + BUDGET_MIN_RANGE_GAP),
    BUDGET_MIN_VALUE,
    BUDGET_MAX_VALUE,
  );
  const normalizedMin = Math.min(min, max - BUDGET_MIN_RANGE_GAP);

  return {
    currency: value.currency || DEFAULT_BUDGET_PREFERENCE.currency,
    max,
    min: Math.max(BUDGET_MIN_VALUE, normalizedMin),
  };
}

export function formatBudgetAmount(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      currency,
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString('en-US')}`;
  }
}

export function budgetProgress(value: number): number {
  return Math.max(4, Math.min(100, (value / BUDGET_MAX_VALUE) * 100));
}

export function getBudgetCategoryLabel({
  max,
  min,
}: Pick<BudgetPreferencePayload, 'max' | 'min'>): BudgetCategoryLabel {
  const rangeMidpoint = (min + max) / 2;
  const category = BUDGET_PRESETS.find(
    (preset) => rangeMidpoint >= preset.min && rangeMidpoint <= preset.max,
  );

  return category?.label || 'Premium';
}

function clampBudgetNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numberValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numberValue)));
}
