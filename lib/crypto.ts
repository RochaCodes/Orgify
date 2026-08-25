import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

/**
 * Payload formats:
 *
 * - v1: `v1:salt:iv:authTag:ciphertext` (all hex), where salt is a fresh
 *   random value per payload. Deriving the scrypt key from a per-payload salt
 *   keeps attackers from reusing precomputation across users or installations,
 *   which the legacy format lost by using one hard-coded salt for everyone.
 * - Legacy: `iv:authTag:ciphertext`, key derived from a fixed hard-coded salt.
 *
 * The version marker lets the format evolve; its absence identifies legacy
 * payloads (legacy segments are pure hex, so they can never collide with a
 * marker like "v1").
 */
const VERSION_V1 = "v1";
const LEGACY_SALT = "spotify-organizer-salt";

function encryptionKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH);
}

function requireSecret(): string {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  }
  return secret;
}

/** Encrypts a plaintext string as `v1:salt:iv:authTag:ciphertext` (hex). */
export function encrypt(plaintext: string): string {
  const secret = requireSecret();
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(secret, salt), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    VERSION_V1,
    salt.toString("hex"),
    iv.toString("hex"),
    authTag.toString("hex"),
    ciphertext.toString("hex"),
  ].join(":");
}

/**
 * Decrypts both payload formats: the current versioned one and the legacy
 * `iv:authTag:ciphertext` shape. There is no migration for rows written
 * before the format change, so legacy payloads must stay readable here until
 * they are overwritten by the next token mirror.
 */
export function decrypt(payload: string): string {
  const secret = requireSecret();
  const parts = payload.split(":");

  let key: Buffer;
  let ivHex: string;
  let authTagHex: string;
  let ciphertextHex: string;

  if (parts[0] === VERSION_V1) {
    if (parts.length !== 5) {
      throw new Error(
        "Invalid encrypted payload: v1 format must be v1:salt:iv:authTag:ciphertext"
      );
    }
    key = encryptionKey(secret, Buffer.from(parts[1], "hex"));
    [, , ivHex, authTagHex, ciphertextHex] = parts;
  } else if (parts.length === 3) {
    [ivHex, authTagHex, ciphertextHex] = parts;
    key = encryptionKey(secret, Buffer.from(LEGACY_SALT, "utf8"));
  } else {
    throw new Error("Invalid encrypted payload: unrecognized format");
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
