import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync } from "crypto";

function secret(): string {
  const s = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!s) throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY is not set");
  return s;
}

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (!cachedKey) cachedKey = scryptSync(secret(), "codevault-salt", 32);
  return cachedKey;
}

/** AES-256-GCM. Output format: iv.tag.ciphertext (hex). */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

export function decryptToken(blob: string): string {
  const [ivHex, tagHex, dataHex] = blob.split(".");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed token blob");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

/** Stable HMAC used only to check "does this visitor own this snippet?". */
export function hashToken(token: string): string {
  return createHmac("sha256", secret()).update(token).digest("hex");
}
