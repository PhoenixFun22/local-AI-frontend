import CryptoJS from 'crypto-js';

/**
 * Derives a cryptographic key from the user's first name, last name, and password/passcode.
 * The salt is derived from the first name and last name.
 */
export function deriveKey(firstName: string, lastName: string, passcode: string): string {
  const salt = `${firstName.trim().toLowerCase()}-${lastName.trim().toLowerCase()}`;
  
  // We use SHA-256 combined with the password and name salt to form a secure AES-256 encryption key
  const combined = `${passcode.trim()}::${salt}`;
  return CryptoJS.SHA256(combined).toString(CryptoJS.enc.Hex);
}

/**
 * Encrypts raw text data using AES-256.
 */
export function encryptData(data: string, key: string): string {
  if (!data) return '';
  try {
    return CryptoJS.AES.encrypt(data, key).toString();
  } catch (err) {
    console.error('Encryption failed:', err);
    return '';
  }
}

/**
 * Decrypts raw ciphertext using AES-256.
 */
export function decryptData(ciphertext: string, key: string): string {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const plaintext = bytes.toString(CryptoJS.enc.Utf8);
    if (!plaintext) {
      throw new Error('Decryption resulted in empty plaintext (probably wrong key)');
    }
    return plaintext;
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Incorrect passcode or profile details. Decryption failed.');
  }
}

/**
 * Encrypts an object by converting it to JSON.
 */
export function encryptJSON<T>(obj: T, key: string): string {
  const jsonStr = JSON.stringify(obj);
  return encryptData(jsonStr, key);
}

/**
 * Decrypts ciphertext and parses it as an object of type T.
 */
export function decryptJSON<T>(ciphertext: string, key: string): T | null {
  if (!ciphertext) return null;
  try {
    const plaintext = decryptData(ciphertext, key);
    return JSON.parse(plaintext) as T;
  } catch (err) {
    console.error('JSON Decryption / parsing failed:', err);
    return null;
  }
}
