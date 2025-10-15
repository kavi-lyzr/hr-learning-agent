import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-secret-key-that-is-long-enough';

/**
 * Encrypt a string using AES encryption
 */
export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt an AES encrypted string
 */
export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
