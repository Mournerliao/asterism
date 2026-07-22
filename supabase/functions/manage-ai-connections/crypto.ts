/**
 * Authenticated encryption for BYOK credentials (ADR 0017). AES-256-GCM via Web
 * Crypto with a fresh random nonce per write and an AAD that binds every
 * ciphertext to its version, owning user, and connection so a row can never be
 * replayed under a different identity. Versioned keys make out-of-band rotation
 * possible: new writes use the active version, old ciphertexts still decrypt
 * with the version stored alongside them. Self-contained (no imports) so Deno
 * can load it by path and vitest can exercise it directly.
 */

const GCM = 'AES-GCM';
const NONCE_BYTES = 12;
const KEY_BYTES = 32;

export interface EncryptedCredential {
  ciphertext: string;
  nonce: string;
  version: number;
}

export interface KeyRing {
  activeVersion: number;
  keyByVersion: Map<number, CryptoKey>;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** Bind a ciphertext to its version, owner, and connection. */
export function buildCredentialAad(
  version: number,
  userId: string,
  connectionId: string,
): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`aic:v${version}:${userId}:${connectionId}`);
}

/** Import a base64-encoded 256-bit master key for AES-GCM. */
export async function importMasterKey(base64Key: string): Promise<CryptoKey> {
  const raw = fromBase64(base64Key.trim());
  if (raw.length !== KEY_BYTES) {
    throw new Error('master_key_must_be_256_bit');
  }
  return crypto.subtle.importKey('raw', raw, GCM, false, ['encrypt', 'decrypt']);
}

/** Encrypt plaintext under the ring's active key version. */
export async function encryptCredential(
  ring: KeyRing,
  plaintext: string,
  aad: Uint8Array<ArrayBuffer>,
): Promise<EncryptedCredential> {
  const key = ring.keyByVersion.get(ring.activeVersion);
  if (!key) {
    throw new Error('active_key_unavailable');
  }
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  const data = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: GCM, iv: nonce, additionalData: aad },
    key,
    data,
  );
  return {
    ciphertext: toBase64(new Uint8Array(encrypted)),
    nonce: toBase64(nonce),
    version: ring.activeVersion,
  };
}

/** Decrypt a stored credential with the key that matches its recorded version. */
export async function decryptCredential(
  ring: KeyRing,
  input: EncryptedCredential,
  aad: Uint8Array<ArrayBuffer>,
): Promise<string> {
  const key = ring.keyByVersion.get(input.version);
  if (!key) {
    throw new Error('key_version_unavailable');
  }
  let decrypted: ArrayBuffer;
  try {
    decrypted = await crypto.subtle.decrypt(
      { name: GCM, iv: fromBase64(input.nonce), additionalData: aad },
      key,
      fromBase64(input.ciphertext),
    );
  } catch {
    throw new Error('credential_decrypt_failed');
  }
  return new TextDecoder().decode(decrypted);
}

/**
 * Parse the deployer's key material into a ring. `spec` maps version numbers to
 * base64 keys (e.g. `{ "1": "<base64>" }`); `activeVersion` selects the key used
 * for new writes and must exist in the spec.
 */
export async function buildKeyRing(
  spec: Record<string, string>,
  activeVersion: number,
): Promise<KeyRing> {
  const keyByVersion = new Map<number, CryptoKey>();
  for (const [rawVersion, base64Key] of Object.entries(spec)) {
    const version = Number(rawVersion);
    if (!Number.isInteger(version) || version < 1) {
      throw new Error('invalid_key_version');
    }
    keyByVersion.set(version, await importMasterKey(base64Key));
  }
  if (!keyByVersion.has(activeVersion)) {
    throw new Error('active_version_missing_key');
  }
  return { activeVersion, keyByVersion };
}

export interface KeyMaterial {
  spec: Record<string, string>;
  activeVersion: number;
}

/**
 * Parse the deployer's key-material env values into a ring spec. `rawKeys` is the
 * JSON map of version → base64 key (e.g. `{ "1": "<base64>" }`); `rawActiveVersion`
 * optionally pins the active version, defaulting to the highest version present.
 * Pure so the user handler and the out-of-band rotation routine parse identically.
 */
export function parseKeyMaterial(
  rawKeys: string | undefined,
  rawActiveVersion: string | undefined,
): KeyMaterial {
  if (!rawKeys || rawKeys.trim().length === 0) throw new Error('encryption_keys_missing');
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawKeys);
  } catch {
    throw new Error('encryption_keys_invalid');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('encryption_keys_invalid');
  }
  const spec: Record<string, string> = {};
  let maxVersion = 0;
  for (const [version, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== 'string') throw new Error('encryption_keys_invalid');
    spec[version] = value;
    const numeric = Number(version);
    if (Number.isInteger(numeric) && numeric > maxVersion) maxVersion = numeric;
  }
  const activeVersion =
    rawActiveVersion && rawActiveVersion.trim().length > 0 ? Number(rawActiveVersion) : maxVersion;
  return { spec, activeVersion };
}
