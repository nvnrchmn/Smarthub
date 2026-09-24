import crypto from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DIGITS = 6;
const PERIOD = 30;

const base32Encode = (buffer: Buffer): string => {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31] ?? "";
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31] ?? "";
  }

  return output;
};

const base32Decode = (input: string): Buffer => {
  const cleaned = input.replace(/=+$/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of cleaned) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

const hotp = (secret: string, counter: number): string => {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;

  const binary =
    (((hmac[offset] ?? 0) & 0x7f) << 24) |
    (((hmac[offset + 1] ?? 0) & 0xff) << 16) |
    (((hmac[offset + 2] ?? 0) & 0xff) << 8) |
    ((hmac[offset + 3] ?? 0) & 0xff);

  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
};

export const generateTotpSecret = (): string => base32Encode(crypto.randomBytes(20));

export const totpSekarang = (secret: string, at: number = Date.now()): string =>
  hotp(secret, Math.floor(at / 1000 / PERIOD));

export const verifyTotp = (secret: string, token: string, window = 1): boolean => {
  const kode = token.trim();
  if (!/^\d{6}$/.test(kode)) return false;

  for (let i = -window; i <= window; i += 1) {
    if (totpSekarang(secret, Date.now() + i * PERIOD * 1000) === kode) return true;
  }

  return false;
};

export const otpauthUrl = (secret: string, label: string, issuer = "SmartHub"): string =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}` +
  `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
