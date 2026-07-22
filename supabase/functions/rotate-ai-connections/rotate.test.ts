import { describe, expect, it } from 'vitest';
import {
  buildCredentialAad,
  buildKeyRing,
  decryptCredential,
  encryptCredential,
  type KeyRing,
} from '../manage-ai-connections/crypto';
import {
  type RotatedCredential,
  type RotationStore,
  rotateCredentialRow,
  rotateCredentials,
  type StoredCredentialRow,
} from './rotate';

const plaintext = 'sk-secret-value';

function randomKeyBase64(): string {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of raw) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/** Seed a stored row encrypted under the given ring's active version. */
async function seedRow(ring: KeyRing, id: string, userId: string): Promise<StoredCredentialRow> {
  const encrypted = await encryptCredential(
    ring,
    plaintext,
    buildCredentialAad(ring.activeVersion, userId, id),
  );
  return {
    id,
    userId,
    ciphertext: encrypted.ciphertext,
    nonce: encrypted.nonce,
    version: encrypted.version,
  };
}

function memoryStore(rows: StoredCredentialRow[]): {
  store: RotationStore;
  saved: RotatedCredential[];
} {
  const saved: RotatedCredential[] = [];
  return {
    saved,
    store: {
      listCredentialRows: async () => rows,
      saveRotatedCredential: async (row) => {
        saved.push(row);
      },
    },
  };
}

describe('rotateCredentialRow', () => {
  it('skips a row already on the active version', async () => {
    const ring = await buildKeyRing({ '1': randomKeyBase64(), '2': randomKeyBase64() }, 2);
    const row = await seedRow(ring, 'conn-1', 'user-1');

    expect(await rotateCredentialRow(ring, row)).toBeNull();
  });

  it('re-encrypts a stale row to the active version, preserving the plaintext', async () => {
    const k1 = randomKeyBase64();
    const k2 = randomKeyBase64();
    const oldRing = await buildKeyRing({ '1': k1 }, 1);
    const stale = await seedRow(oldRing, 'conn-1', 'user-1');
    const rotatedRing = await buildKeyRing({ '1': k1, '2': k2 }, 2);

    const rotated = await rotateCredentialRow(rotatedRing, stale);
    if (rotated === null) throw new Error('expected the stale row to rotate');

    expect(rotated.version).toBe(2);
    expect(rotated.ciphertext).not.toBe(stale.ciphertext);
    expect(rotated.nonce).not.toBe(stale.nonce);

    const roundTrip = await decryptCredential(
      rotatedRing,
      { ciphertext: rotated.ciphertext, nonce: rotated.nonce, version: rotated.version },
      buildCredentialAad(rotatedRing.activeVersion, 'user-1', 'conn-1'),
    );
    expect(roundTrip).toBe(plaintext);
  });
});

describe('rotateCredentials', () => {
  it('rotates stale rows, skips active ones, and isolates per-row failures', async () => {
    const k1 = randomKeyBase64();
    const k2 = randomKeyBase64();
    const oldRing = await buildKeyRing({ '1': k1 }, 1);
    const rotatedRing = await buildKeyRing({ '1': k1, '2': k2 }, 2);

    const stale1 = await seedRow(oldRing, 'conn-1', 'user-1');
    const stale2 = await seedRow(oldRing, 'conn-2', 'user-2');
    const active = await seedRow(rotatedRing, 'conn-3', 'user-3');
    const corrupt: StoredCredentialRow = {
      id: 'conn-4',
      userId: 'user-4',
      ciphertext: btoa('bogus-ciphertext-that-fails-auth'),
      nonce: stale1.nonce,
      version: 1,
    };
    const { store, saved } = memoryStore([stale1, stale2, active, corrupt]);

    const summary = await rotateCredentials(rotatedRing, store);

    expect(summary).toEqual({ scanned: 4, rotated: 2, skipped: 1, failed: 1 });
    expect(saved.map((row) => row.id).sort()).toEqual(['conn-1', 'conn-2']);
    for (const row of saved) {
      expect(row.version).toBe(2);
      const owner = row.id === 'conn-1' ? 'user-1' : 'user-2';
      const roundTrip = await decryptCredential(
        rotatedRing,
        { ciphertext: row.ciphertext, nonce: row.nonce, version: row.version },
        buildCredentialAad(2, owner, row.id),
      );
      expect(roundTrip).toBe(plaintext);
    }
  });

  it('is idempotent: a second run over active rows rotates nothing', async () => {
    const ring = await buildKeyRing({ '1': randomKeyBase64(), '2': randomKeyBase64() }, 2);
    const rows = [await seedRow(ring, 'conn-1', 'user-1'), await seedRow(ring, 'conn-2', 'user-2')];
    const { store, saved } = memoryStore(rows);

    const summary = await rotateCredentials(ring, store);

    expect(summary).toEqual({ scanned: 2, rotated: 0, skipped: 2, failed: 0 });
    expect(saved).toHaveLength(0);
  });
});
