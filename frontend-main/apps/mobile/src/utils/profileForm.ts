import { findCountryOption, getCountryOptions, type CountryOption } from './countries';

export type ProfileSelectOption = {
  label: string;
  value: string;
};

export const genderOptions: ProfileSelectOption[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

export function stringField(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function formatDateField(value: unknown): string {
  if (!value) {
    return '';
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().split('T')[0] || '';
}

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isMaskedSensitiveValue(value: string): boolean {
  return value.includes('*');
}

export function getMaskedSensitiveNumber(value: string): string {
  const normalized = value.trim();

  if (!normalized || isMaskedSensitiveValue(normalized)) {
    return normalized;
  }

  const visibleDigits = normalized.slice(-3);
  const maskedLength = Math.max(normalized.length - visibleDigits.length, 3);

  return `${'*'.repeat(maskedLength)}${visibleDigits}`;
}

export function getPinnedCountryOptions(query: string, selectedValue: string): CountryOption[] {
  const selectedCountry = findCountryOption(selectedValue) || getCustomCountryOption(selectedValue);
  const options = getCountryOptions(query);

  if (!selectedCountry) {
    return options;
  }

  return [
    selectedCountry,
    ...options.filter((countryOption) => countryOption.code !== selectedCountry.code),
  ];
}

function getCustomCountryOption(value: string): CountryOption | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return {
    code: 'Selected',
    name: trimmedValue,
  };
}
