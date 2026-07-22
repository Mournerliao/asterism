import { describe, expect, it } from 'vitest';
import {
  buildCredentialAad,
  buildKeyRing,
  decryptCredential,
  type EncryptedCredential,
  encryptCredential,
  importMasterKey,
  parseKeyMaterial,
} from './crypto';

function randomKeyBase64(): string {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of raw) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function flipFirstCiphertextByte(input: EncryptedCredential): EncryptedCredential {
  const binary = atob(input.ciphertext);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  bytes[0] = bytes[0] === undefined ? 0 : bytes[0] ^ 0xff;
  let mutated = '';
  for (const byte of bytes) {
    mutated += String.fromCharCode(byte);
  }
  return { ...input, ciphertext: btoa(mutated) };
}

const plaintext = JSON.stringify({ apiKey: 'sk-secret-value' });

describe('credential encryption', () => {
  it('round-trips a credential under a matching AAD', async () => {
    const ring = await buildKeyRing({ '1': randomKeyBase64() }, 1);
    const aad = buildCredentialAad(1, 'user-1', 'conn-1');

    const encrypted = await encryptCredential(ring, plaintext, aad);
    expect(encrypted.version).toBe(1);
    expect(encrypted.ciphertext).not.toContain('sk-secret-value');

    expect(await decryptCredential(ring, encrypted, aad)).toBe(plaintext);
  });

  it('produces a fresh nonce per write', async () => {
    const ring = await buildKeyRing({ '1': randomKeyBase64() }, 1);
    const aad = buildCredentialAad(1, 'user-1', 'conn-1');

    const first = await encryptCredential(ring, plaintext, aad);
    const second = await encryptCredential(ring, plaintext, aad);
    expect(first.nonce).not.toBe(second.nonce);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it('refuses to decrypt under a different owner or connection', async () => {
    const ring = await buildKeyRing({ '1': randomKeyBase64() }, 1);
    const encrypted = await encryptCredential(
      ring,
      plaintext,
      buildCredentialAad(1, 'user-1', 'conn-1'),
    );

    await expect(
      decryptCredential(ring, encrypted, buildCredentialAad(1, 'user-2', 'conn-1')),
    ).rejects.toThrow('credential_decrypt_failed');
    await expect(
      decryptCredential(ring, encrypted, buildCredentialAad(1, 'user-1', 'conn-2')),
    ).rejects.toThrow('credential_decrypt_failed');
  });

  it('detects tampered ciphertext', async () => {
    const ring = await buildKeyRing({ '1': randomKeyBase64() }, 1);
    const aad = buildCredentialAad(1, 'user-1', 'conn-1');
    const encrypted = await encryptCredential(ring, plaintext, aad);

    await expect(decryptCredential(ring, flipFirstCiphertextByte(encrypted), aad)).rejects.toThrow(
      'credential_decrypt_failed',
    );
  });

  it('encrypts with the active version but decrypts older versions', async () => {
    const v1 = randomKeyBase64();
    const v2 = randomKeyBase64();
    const oldRing = await buildKeyRing({ '1': v1 }, 1);
    const legacy = await encryptCredential(
      oldRing,
      plaintext,
      buildCredentialAad(1, 'user-1', 'conn-1'),
    );

    const rotatedRing = await buildKeyRing({ '1': v1, '2': v2 }, 2);
    const fresh = await encryptCredential(
      rotatedRing,
      plaintext,
      buildCredentialAad(2, 'user-1', 'conn-1'),
    );
    expect(fresh.version).toBe(2);

    expect(
      await decryptCredential(rotatedRing, legacy, buildCredentialAad(1, 'user-1', 'conn-1')),
    ).toBe(plaintext);
    expect(
      await decryptCredential(rotatedRing, fresh, buildCredentialAad(2, 'user-1', 'conn-1')),
    ).toBe(plaintext);
  });

  it('fails when the stored version has no key', async () => {
    const ring = await buildKeyRing({ '2': randomKeyBase64() }, 2);
    await expect(
      decryptCredential(
        ring,
        { ciphertext: 'AA==', nonce: 'AA==', version: 1 },
        buildCredentialAad(1, 'user-1', 'conn-1'),
      ),
    ).rejects.toThrow('key_version_unavailable');
  });
});

describe('key ring construction', () => {
  it('rejects a non-256-bit key', async () => {
    await expect(importMasterKey(btoa('too-short'))).rejects.toThrow('master_key_must_be_256_bit');
  });

  it('requires the active version to have a key', async () => {
    await expect(buildKeyRing({ '1': randomKeyBase64() }, 2)).rejects.toThrow(
      'active_version_missing_key',
    );
  });
});

describe('parseKeyMaterial', () => {
  it('parses a version map and pins the requested active version', () => {
    expect(parseKeyMaterial('{"1":"aaa","2":"bbb"}', '1')).toEqual({
      spec: { '1': 'aaa', '2': 'bbb' },
      activeVersion: 1,
    });
  });

  it('defaults the active version to the highest present when unset or blank', () => {
    expect(parseKeyMaterial('{"1":"aaa","3":"ccc"}', undefined).activeVersion).toBe(3);
    expect(parseKeyMaterial('{"1":"aaa","3":"ccc"}', '   ').activeVersion).toBe(3);
  });

  it('rejects missing key material', () => {
    expect(() => parseKeyMaterial(undefined, undefined)).toThrow('encryption_keys_missing');
    expect(() => parseKeyMaterial('   ', undefined)).toThrow('encryption_keys_missing');
  });

  it('rejects malformed or non-string key material', () => {
    expect(() => parseKeyMaterial('not-json', undefined)).toThrow('encryption_keys_invalid');
    expect(() => parseKeyMaterial('["aaa"]', undefined)).toThrow('encryption_keys_invalid');
    expect(() => parseKeyMaterial('{"1":123}', undefined)).toThrow('encryption_keys_invalid');
  });
});
