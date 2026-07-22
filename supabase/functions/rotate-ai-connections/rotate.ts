/**
 * Out-of-band credential rotation (issue #13, US22). Re-encrypts every stored
 * credential from the key version it was written under to the ring's active
 * version, so retiring an old master key leaves no ciphertext behind. Pure
 * orchestration over an injected store; the AEAD itself is the shared crypto
 * module, and per-row failures are isolated so one bad row cannot abort a run.
 * This routine is never reachable from the user-facing handler.
 */
import {
  buildCredentialAad,
  decryptCredential,
  encryptCredential,
  type KeyRing,
} from '../manage-ai-connections/crypto.ts';

export interface StoredCredentialRow {
  id: string;
  userId: string;
  ciphertext: string;
  nonce: string;
  version: number;
}

export interface RotatedCredential {
  id: string;
  ciphertext: string;
  nonce: string;
  version: number;
}

export interface RotationStore {
  listCredentialRows(): Promise<StoredCredentialRow[]>;
  saveRotatedCredential(row: RotatedCredential): Promise<void>;
}

export interface RotationSummary {
  scanned: number;
  rotated: number;
  skipped: number;
  failed: number;
}

/**
 * Re-encrypt one row to the active version, rebinding the AAD from the old version
 * to the new one. Returns null when the row already sits on the active version.
 */
export async function rotateCredentialRow(
  ring: KeyRing,
  row: StoredCredentialRow,
): Promise<RotatedCredential | null> {
  if (row.version === ring.activeVersion) return null;
  const plaintext = await decryptCredential(
    ring,
    { ciphertext: row.ciphertext, nonce: row.nonce, version: row.version },
    buildCredentialAad(row.version, row.userId, row.id),
  );
  const reencrypted = await encryptCredential(
    ring,
    plaintext,
    buildCredentialAad(ring.activeVersion, row.userId, row.id),
  );
  return {
    id: row.id,
    ciphertext: reencrypted.ciphertext,
    nonce: reencrypted.nonce,
    version: reencrypted.version,
  };
}

/**
 * Walk every credential and rotate the stale ones. A single undecryptable or
 * unwritable row is tallied as a failure rather than aborting the whole run, so an
 * operator can re-run until `failed` reaches zero.
 */
export async function rotateCredentials(
  ring: KeyRing,
  store: RotationStore,
): Promise<RotationSummary> {
  const rows = await store.listCredentialRows();
  const summary: RotationSummary = { scanned: rows.length, rotated: 0, skipped: 0, failed: 0 };
  for (const row of rows) {
    try {
      const rotated = await rotateCredentialRow(ring, row);
      if (rotated === null) {
        summary.skipped += 1;
        continue;
      }
      await store.saveRotatedCredential(rotated);
      summary.rotated += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
}
