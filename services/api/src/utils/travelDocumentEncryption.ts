import crypto from 'crypto';

const ENCRYPTED_VALUE_PREFIX = 'enc:v1';
const ENCRYPTED_TRAVEL_DOCUMENT_FIELDS = [
  'passportNumber',
  'nationalIdNumber',
  'frequentFlyerNumber',
] as const;

const REVEAL_PROTECTED_TRAVEL_DOCUMENT_FIELDS = [
  'passportNumber',
  'nationalIdNumber',
] as const;

type SensitiveTravelDocumentField = (typeof ENCRYPTED_TRAVEL_DOCUMENT_FIELDS)[number];
export type RevealProtectedTravelDocumentField = (typeof REVEAL_PROTECTED_TRAVEL_DOCUMENT_FIELDS)[number];

type TravelDocuments = {
  passportNumber?: string;
  passportExpiry?: Date | string | null;
  passportIssuingCountry?: string;
  nationality?: string;
  nationalIdNumber?: string;
  frequentFlyerNumber?: string;
  frequentFlyerAirline?: string;
  [key: string]: any;
};

const toUint8Array = (buffer: Buffer) =>
  new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const concatUint8Arrays = (...arrays: Uint8Array[]) => {
  const totalLength = arrays.reduce((sum, array) => sum + array.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }

  return result;
};

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const hexToBytes = (hex: string) => {
  const normalizedHex = hex.trim();
  if (!normalizedHex) return new Uint8Array();

  const bytes = new Uint8Array(normalizedHex.length / 2);
  for (let i = 0; i < normalizedHex.length; i += 2) {
    bytes[i / 2] = parseInt(normalizedHex.slice(i, i + 2), 16);
  }

  return bytes;
};

const getEncryptionKey = (): Uint8Array => {
  const secret = process.env.TRAVEL_DOCUMENTS_ENCRYPTION_KEY || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('Missing TRAVEL_DOCUMENTS_ENCRYPTION_KEY or JWT_SECRET for travel document encryption');
  }

  return toUint8Array(crypto.createHash('sha256').update(secret).digest());
};

const isEncryptedValue = (value: string) => value.startsWith(`${ENCRYPTED_VALUE_PREFIX}:`);

const getMaskedValue = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return '';

  const visibleSuffix = normalized.slice(-3);
  const maskedLength = Math.max(normalized.length - visibleSuffix.length, 3);

  return `${'*'.repeat(maskedLength)}${visibleSuffix}`;
};

const encryptValue = (value: string) => {
  if (!value) return value;
  if (isEncryptedValue(value)) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), toUint8Array(iv));
  const encrypted = concatUint8Arrays(
    toUint8Array(cipher.update(textEncoder.encode(value))),
    toUint8Array(cipher.final())
  );
  const authTag = new Uint8Array(cipher.getAuthTag());

  return [
    ENCRYPTED_VALUE_PREFIX,
    bytesToHex(toUint8Array(iv)),
    bytesToHex(authTag),
    bytesToHex(encrypted),
  ].join(':');
};

const decryptValue = (value: string) => {
  if (!value || !isEncryptedValue(value)) return value;

  const [, version, ivHex, authTagHex, encryptedHex] = value.split(':');

  if (version !== 'v1' || !ivHex || !authTagHex || !encryptedHex) {
    return '';
  }

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
      hexToBytes(ivHex)
    );
    decipher.setAuthTag(hexToBytes(authTagHex));

    const decrypted = concatUint8Arrays(
      toUint8Array(decipher.update(hexToBytes(encryptedHex))),
      toUint8Array(decipher.final())
    );

    return textDecoder.decode(decrypted);
  } catch {
    return '';
  }
};

const transformSensitiveTravelDocumentFields = (
  travelDocuments: TravelDocuments | undefined,
  transformer: (value: string, field: SensitiveTravelDocumentField) => string
) => {
  if (!travelDocuments) return travelDocuments;

  const nextTravelDocuments: TravelDocuments = { ...travelDocuments };

  for (const field of ENCRYPTED_TRAVEL_DOCUMENT_FIELDS) {
    const value = nextTravelDocuments[field];
    if (typeof value === 'string') {
      nextTravelDocuments[field] = transformer(value.trim(), field);
    }
  }

  return nextTravelDocuments;
};

export const encryptSensitiveTravelDocuments = (travelDocuments?: TravelDocuments) =>
  transformSensitiveTravelDocumentFields(travelDocuments, (value) => encryptValue(value));

export const decryptSensitiveTravelDocuments = (travelDocuments?: TravelDocuments) =>
  transformSensitiveTravelDocumentFields(travelDocuments, (value) => decryptValue(value));

export const isRevealProtectedTravelDocumentField = (
  field: string
): field is RevealProtectedTravelDocumentField =>
  REVEAL_PROTECTED_TRAVEL_DOCUMENT_FIELDS.includes(field as RevealProtectedTravelDocumentField);

export const revealTravelDocumentFieldValue = (
  travelDocuments: TravelDocuments | undefined,
  field: RevealProtectedTravelDocumentField
) => {
  const decryptedTravelDocuments = decryptSensitiveTravelDocuments(travelDocuments);
  const value = decryptedTravelDocuments?.[field];

  return typeof value === 'string' ? value : '';
};

export const sanitizeClientUserResponse = (user: any) => {
  if (!user) return user;

  const plainUser =
    typeof user.toObject === 'function'
      ? user.toObject({ versionKey: false })
      : { ...user };

  delete plainUser.password;
  delete plainUser.twoFactorSecret;
  delete plainUser.twoFactorTempSecret;

  plainUser.security = {
    twoFactorEnabled: Boolean(plainUser.twoFactorEnabled),
    twoFactorEnabledAt: plainUser.twoFactorEnabledAt || null,
  };

  if (plainUser.travelDocuments) {
    const decryptedTravelDocuments = decryptSensitiveTravelDocuments(plainUser.travelDocuments);
    plainUser.travelDocuments = { ...decryptedTravelDocuments };

    for (const field of REVEAL_PROTECTED_TRAVEL_DOCUMENT_FIELDS) {
      const value = plainUser.travelDocuments[field];
      if (typeof value === 'string' && value.trim()) {
        plainUser.travelDocuments[field] = getMaskedValue(value);
      }
    }
  }

  return plainUser;
};
