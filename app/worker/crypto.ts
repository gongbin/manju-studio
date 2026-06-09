// AES-GCM at-rest encryption for provider secrets (API keys). The key is derived
// from CREDENTIAL_ENC_KEY; ciphertext is stored as "<iv b64>:<ct b64>". Plaintext
// is only ever held in memory on the server at call time — never returned to the UI.
import type { Env } from './env';

const te = new TextEncoder();
const td = new TextDecoder();
const b64 = (buf: ArrayBuffer | Uint8Array) => { const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));

export const encKeyOf = (env: Env) => env.CREDENTIAL_ENC_KEY || 'manju-dev-enc-key-v1';

async function aesKey(secret: string) {
  const hash = await crypto.subtle.digest('SHA-256', te.encode(secret));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(encKey: string, plaintext: string): Promise<string> {
  const key = await aesKey(encKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(plaintext));
  return `${b64(iv)}:${b64(ct)}`;
}

export async function decryptSecret(encKey: string, blob: string): Promise<string | null> {
  const [ivb, ctb] = blob.split(':');
  if (!ivb || !ctb) return null;
  try {
    const key = await aesKey(encKey);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivb) }, key, unb64(ctb));
    return td.decode(pt);
  } catch { return null; }
}
