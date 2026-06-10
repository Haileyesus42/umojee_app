import * as crypto from 'crypto';

const BIOMETRIC_ENCRYPTION_KEY = process.env.BIOMETRIC_ENCRYPTION_KEY || process.env.JWT_SECRET;

if (!BIOMETRIC_ENCRYPTION_KEY) {
  console.warn('Warning: BIOMETRIC_ENCRYPTION_KEY or JWT_SECRET not set for biometric encryption');
}

const ENCRYPTED_VALUE_PREFIX = 'bio_enc:v1';

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
  const secret = BIOMETRIC_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error('Missing BIOMETRIC_ENCRYPTION_KEY or JWT_SECRET for biometric encryption');
  }

  return toUint8Array(crypto.createHash('sha256').update(secret).digest());
};

const isEncryptedValue = (value: string) => value.startsWith(`${ENCRYPTED_VALUE_PREFIX}:`);

/**
 * Encrypts biometric template data
 */
export const encryptBiometricTemplate = (templateData: string): string => {
  if (!templateData) return templateData;
  if (isEncryptedValue(templateData)) return templateData;

  // Only proceed if encryption key is available
  if (!BIOMETRIC_ENCRYPTION_KEY) {
    console.warn('Biometric encryption key not available, storing unencrypted (not recommended for production)');
    return templateData;
  }

  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), toUint8Array(iv));
    const encrypted = concatUint8Arrays(
      toUint8Array(cipher.update(textEncoder.encode(templateData))),
      toUint8Array(cipher.final())
    );
    const authTag = new Uint8Array(cipher.getAuthTag());

    return [
      ENCRYPTED_VALUE_PREFIX,
      bytesToHex(toUint8Array(iv)),
      bytesToHex(authTag),
      bytesToHex(encrypted),
    ].join(':');
  } catch (error) {
    console.error('Error encrypting biometric template:', error);
    throw new Error('Failed to encrypt biometric template');
  }
};

/**
 * Decrypts biometric template data
 */
export const decryptBiometricTemplate = (encryptedTemplateData: string): string => {
  if (!encryptedTemplateData || !isEncryptedValue(encryptedTemplateData)) return encryptedTemplateData;

  // Only proceed if encryption key is available
  if (!BIOMETRIC_ENCRYPTION_KEY) {
    console.warn('Biometric encryption key not available, returning encrypted data');
    return encryptedTemplateData;
  }

  try {
    const [, version, ivHex, authTagHex, encryptedHex] = encryptedTemplateData.split(':');

    if (version !== 'v1' || !ivHex || !authTagHex || !encryptedHex) {
      console.warn('Invalid encrypted biometric template format');
      return '';
    }

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
  } catch (error) {
    console.error('Error decrypting biometric template:', error);
    return '';
  }
};

/**
 * Sanitizes biometric data for API responses (removes sensitive template data)
 */
export const sanitizeBiometricData = (biometricData: any) => {
  if (!biometricData) return biometricData;

  const sanitizedData = { ...biometricData };

  // Remove raw template data from responses for security
  if (sanitizedData.faces && Array.isArray(sanitizedData.faces)) {
    sanitizedData.faces = sanitizedData.faces.map((face: any) => ({
      id: face.id,
      userId: face.userId,
      enrolledAt: face.enrolledAt,
      name: face.name,
      // Don't include templateData in API responses
    }));
  }

  if (sanitizedData.palms && Array.isArray(sanitizedData.palms)) {
    sanitizedData.palms = sanitizedData.palms.map((palm: any) => ({
      id: palm.id,
      userId: palm.userId,
      enrolledAt: palm.enrolledAt,
      // Don't include templateData in API responses
    }));
  }

  return sanitizedData;
};