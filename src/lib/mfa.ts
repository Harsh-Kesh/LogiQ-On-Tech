import crypto from 'crypto';
import QRCode from 'qrcode';

// Base32 Alphabet
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateMfaSecret(email: string) {
  const buffer = crypto.randomBytes(20);
  let secret = '';
  for (let i = 0; i < buffer.length; i++) {
    secret += ALPHABET[buffer[i] % 32];
  }

  const otpauth = `otpauth://totp/LogiQ-On%20Tech:${encodeURIComponent(email)}?secret=${secret}&issuer=LogiQ-On%20Tech`;
  return { secret, otpauth };
}

export async function generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
  return await QRCode.toDataURL(otpauthUrl);
}

function base32Decode(base32: string): Buffer {
  let bits = '';
  for (let i = 0; i < base32.length; i++) {
    const val = ALPHABET.indexOf(base32[i].toUpperCase());
    if (val !== -1) {
      bits += val.toString(2).padStart(5, '0');
    }
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotpToken(secret: string, timeStepWindow = 0): string {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / 30) + timeStepWindow;

  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(0, 0);
  buffer.writeUInt32BE(timeStep, 4);

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(buffer);
  const hmacResult = hmac.digest();

  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

export function verifyMfaToken(token: string, secret: string): boolean {
  if (!token || !secret || token.length !== 6) return false;
  const cleanToken = token.trim();
  // Allow current window, -1, +1, -2, +2 windows for clock drift tolerance (+/- 60 seconds)
  for (let window of [0, -1, 1, -2, 2]) {
    if (generateTotpToken(secret, window) === cleanToken) {
      return true;
    }
  }
  return false;
}
