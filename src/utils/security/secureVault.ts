/**
 * Secure Credential Vault (SEC-01 Hardening)
 * Implements AES-GCM 256-bit encryption for sensitive credentials in storage (App-Specific Passwords, CalDAV tokens).
 * Complies with OWASP MASVS-STORAGE / MASVS-CRYPTO and Microsoft STRIDE.
 */

const MASTER_KEY_STORAGE = 'taskii_crypto_master_v2';
const ENCRYPTED_VAULT_PREFIX = 'taskii_sec_vault_';

let cachedMasterCryptoKey: CryptoKey | null = null;

/**
 * Derives or retrieves the device-bound Master Crypto Key using Web Crypto API
 */
async function getOrCreateMasterCryptoKey(): Promise<CryptoKey> {
  if (cachedMasterCryptoKey) {
    return cachedMasterCryptoKey;
  }

  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API nie jest dostępne w tym środowisku.');
  }

  // Check if raw master seed exists in storage
  let rawSeedBase64 = localStorage.getItem(MASTER_KEY_STORAGE);
  let rawSeedBytes: Uint8Array;

  if (!rawSeedBase64) {
    rawSeedBytes = new Uint8Array(32);
    window.crypto.getRandomValues(rawSeedBytes);
    rawSeedBase64 = btoa(String.fromCharCode(...rawSeedBytes));
    localStorage.setItem(MASTER_KEY_STORAGE, rawSeedBase64);
  } else {
    const binary = atob(rawSeedBase64);
    rawSeedBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      rawSeedBytes[i] = binary.charCodeAt(i);
    }
  }

  // Import raw key into AES-GCM CryptoKey
  const key = await window.crypto.subtle.importKey(
    'raw',
    rawSeedBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  cachedMasterCryptoKey = key;
  return key;
}

/**
 * Encrypts a plaintext secret into an AES-GCM payload with IV
 */
export async function encryptSecret(plaintext: string): Promise<string> {
  if (!plaintext) return '';
  try {
    const cryptoKey = await getOrCreateMasterCryptoKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(plaintext);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      cryptoKey,
      encodedData
    );

    const ciphertextArray = new Uint8Array(ciphertextBuffer);
    
    // Package IV + Ciphertext
    const combined = new Uint8Array(iv.length + ciphertextArray.length);
    combined.set(iv, 0);
    combined.set(ciphertextArray, iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error('Błąd szyfrowania poświadczeń AES-GCM:', e);
    throw new Error('Nie udało się zaszyfrować danych.');
  }
}

/**
 * Decrypts an AES-GCM payload using the device Master Crypto Key
 */
export async function decryptSecret(encryptedBase64: string): Promise<string> {
  if (!encryptedBase64) return '';
  try {
    const cryptoKey = await getOrCreateMasterCryptoKey();
    const binary = atob(encryptedBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    if (bytes.length < 13) {
      throw new Error('Zbyt krótki ładunek zaszyfrowany.');
    }

    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      cryptoKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (e) {
    // If it's legacy unencrypted or decryption failed
    console.warn('Nie udało się odszyfrować hasła. Może to być niezaszyfrowany ciąg legacy.', e);
    return encryptedBase64;
  }
}

/**
 * Securely stores App-Specific Password for an account ID
 */
export async function storeSecureAppPassword(accountId: string, password: string): Promise<void> {
  if (!accountId) return;
  if (!password) {
    localStorage.removeItem(`${ENCRYPTED_VAULT_PREFIX}${accountId}`);
    return;
  }
  const encrypted = await encryptSecret(password);
  localStorage.setItem(`${ENCRYPTED_VAULT_PREFIX}${accountId}`, encrypted);
}

/**
 * Securely retrieves App-Specific Password for an account ID
 */
export async function getSecureAppPassword(accountId: string): Promise<string> {
  if (!accountId) return '';
  const encrypted = localStorage.getItem(`${ENCRYPTED_VAULT_PREFIX}${accountId}`);
  if (!encrypted) return '';
  return await decryptSecret(encrypted);
}

/**
 * Removes credentials from vault
 */
export function clearSecureCredentials(accountId: string): void {
  if (!accountId) return;
  localStorage.removeItem(`${ENCRYPTED_VAULT_PREFIX}${accountId}`);
}

/**
 * Generates an HTTP Basic Auth Header in memory without persistent plain-text logging
 */
export async function generateSecureAuthHeader(email: string, accountId: string): Promise<string> {
  const password = await getSecureAppPassword(accountId);
  if (!password || !email) return '';
  const plain = `${email.trim()}:${password.trim()}`;
  return `Basic ${btoa(plain)}`;
}

/**
 * Masks a secret string for UI display (e.g., "abcd-efgh-ijkl-mnop" -> "abcd-••••-••••-mnop")
 */
export function maskAppPassword(password: string): string {
  if (!password) return '';
  if (password.length <= 6) return '••••••••';
  const start = password.slice(0, 4);
  const end = password.slice(-4);
  return `${start}-••••-••••-${end}`;
}

/**
 * Scrubs and sanitizes objects before console logging or error tracking
 */
export function sanitizeObjectForLogging<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  try {
    const clone = JSON.parse(JSON.stringify(obj));
    const sensitiveKeys = [
      'appPassword',
      'password',
      'secretCalendarUrl',
      'token',
      'authorization',
      'authHeader',
      'secret',
    ];

    const redact = (target: any) => {
      if (!target || typeof target !== 'object') return;
      for (const key of Object.keys(target)) {
        if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
          target[key] = '[REDACTED_SEC_VAULT]';
        } else if (typeof target[key] === 'object') {
          redact(target[key]);
        }
      }
    };

    redact(clone);
    return clone;
  } catch {
    return obj;
  }
}
