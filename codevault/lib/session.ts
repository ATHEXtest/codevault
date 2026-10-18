import { cookies } from "next/headers";
import { decryptToken } from "./crypto";

export const TOKEN_COOKIE = "cv_token";

/** Returns the visitor's GitHub token (decrypted from the HttpOnly cookie) or null. */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(TOKEN_COOKIE)?.value;
  if (!raw) return null;
  try {
    return decryptToken(raw);
  } catch {
    return null; // tampered, or the encryption key was rotated
  }
}
