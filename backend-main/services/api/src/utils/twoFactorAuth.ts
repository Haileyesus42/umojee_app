import crypto from 'crypto';
const QRCode = require('qrcode') as {
  toDataURL: (
    text: string,
    options?: {
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
      margin?: number;
      width?: number;
      color?: {
        dark?: string;
        light?: string;
      };
    }
  ) => Promise<string>;
};

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;

const toBytes = (value: Uint8Array | Buffer | number[]) => Uint8Array.from(value);

const getTwoFactorEncryptionKey = (): Uint8Array => {
  const secret = process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('Missing TWO_FACTOR_ENCRYPTION_KEY or JWT_SECRET for two-factor encryption');
  }

  return toBytes(crypto.createHash('sha256').update(secret).digest());
};

const base32Encode = (buffer: Uint8Array) => {
  let bits = '';

  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  let output = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    output += BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return output;
};

const base32Decode = (value: string): Uint8Array => {
  const normalized = value.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) continue;
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Uint8Array.from(bytes);
};

const encryptSecret = (secret: string) => {
  if (!secret) return '';

  const iv = toBytes(crypto.randomBytes(12));
  const cipher = crypto.createCipheriv('aes-256-gcm', getTwoFactorEncryptionKey(), iv);
  const encrypted = Uint8Array.from([
    ...toBytes(cipher.update(secret, 'utf8')),
    ...toBytes(cipher.final()),
  ]);
  const authTag = toBytes(cipher.getAuthTag());

  return [
    'enc',
    Buffer.from(iv).toString('hex'),
    Buffer.from(authTag).toString('hex'),
    Buffer.from(encrypted).toString('hex'),
  ].join(':');
};

const decryptSecret = (encryptedSecret?: string | null) => {
  if (!encryptedSecret) return '';
  if (!encryptedSecret.startsWith('enc:')) return encryptedSecret;

  const [, ivHex, authTagHex, encryptedHex] = encryptedSecret.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) return '';

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getTwoFactorEncryptionKey(),
      Uint8Array.from(Buffer.from(ivHex, 'hex'))
    );
    decipher.setAuthTag(Uint8Array.from(Buffer.from(authTagHex, 'hex')));

    const decrypted = Uint8Array.from([
      ...toBytes(decipher.update(Uint8Array.from(Buffer.from(encryptedHex, 'hex')))),
      ...toBytes(decipher.final()),
    ]);

    return Buffer.from(decrypted).toString('utf8');
  } catch {
    return '';
  }
};

const generateHotp = (secret: string, counter: number) => {
  const secretBuffer = base32Decode(secret);
  const counterBuffer = new Uint8Array(8);
  const counterView = new DataView(counterBuffer.buffer);

  counterView.setUint32(0, Math.floor(counter / 0x100000000));
  counterView.setUint32(4, counter >>> 0);

  const hmac = toBytes(crypto.createHmac('sha1', secretBuffer).update(counterBuffer).digest());
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
};

export const generateTwoFactorSecret = () => base32Encode(toBytes(crypto.randomBytes(20)));

export const generateOtpAuthUrl = (email: string, secret: string) => {
  const issuerName = process.env.TWO_FACTOR_ISSUER || 'Umoja';
  const issuer = encodeURIComponent(issuerName);
  const label = encodeURIComponent(`${issuerName}:${email}`);

  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
};

export const generateQrCodeDataUrl = async (otpauthUrl: string) =>
  QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
    color: {
      dark: '#0f172a',
      light: '#f8fafc',
    },
  });

export const verifyTotpToken = (
  secret: string,
  token: string,
  window: number = 1
) => {
  const normalizedToken = token.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalizedToken)) return false;

  const currentCounter = Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS);
  for (let errorWindow = -window; errorWindow <= window; errorWindow += 1) {
    if (generateHotp(secret, currentCounter + errorWindow) === normalizedToken) {
      return true;
    }
  }

  return false;
};

export const encryptTwoFactorSecret = encryptSecret;
export const decryptTwoFactorSecret = decryptSecret;
