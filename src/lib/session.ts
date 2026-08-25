// Sesi bertanda tangan (HMAC-SHA256) untuk proteksi rute server-side.
// Menggunakan Web Crypto agar aman dijalankan di Edge Runtime (middleware)
// maupun Node.js (Server Actions).

export type SessionRole = 'superadmin' | 'admin' | 'wasit';

export interface SessionPayload {
  role: SessionRole;
  tenantCode?: string;
  tableNumber?: number;
  exp: number; // epoch detik
}

export const SESSION_COOKIE = 'siredom_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 jam

const DEV_FALLBACK_SECRET = 'siredom-dev-secret-do-not-use-in-production';

function getSecret(): string {
  return process.env.AUTH_SECRET || DEV_FALLBACK_SECRET;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/** Buat token sesi bertanda tangan: base64url(payload).base64url(hmac). */
export async function createSessionToken(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(full)));
  const key = await getKey();
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Verifikasi token sesi. Mengembalikan payload jika valid & belum kedaluwarsa. */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  try {
    const key = await getKey();
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(sig) as unknown as ArrayBuffer,
      new TextEncoder().encode(body)
    );
    if (!isValid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
