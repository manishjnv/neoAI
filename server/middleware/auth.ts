// ═══════════════════════════════════════════════════
// neoAI — Cloudflare Access JWT Authentication
// ═══════════════════════════════════════════════════
// Validates CF-Access-JWT-Assertion header using JWKS
// from Cloudflare's Access certificates endpoint.

import { createMiddleware } from 'hono/factory';
import type { HonoEnv, UserIdentity } from '../types';
import { Errors } from '../lib/errors';

interface JwksKey {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg: string;
  use: string;
}

interface JwksResponse {
  keys: JwksKey[];
  public_cert: { kid: string; cert: string };
  public_certs: Array<{ kid: string; cert: string }>;
}

interface JwtPayload {
  aud: string[];
  email: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  identity_nonce: string;
  custom?: Record<string, unknown>;
  name?: string;
  [key: string]: unknown;
}

// In-memory JWKS cache (within the Worker isolate lifetime)
let cachedKeys: Map<string, CryptoKey> | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches and caches JWKS keys from Cloudflare Access.
 */
async function getPublicKeys(teamDomain: string): Promise<Map<string, CryptoKey>> {
  const now = Date.now();
  if (cachedKeys && now < cacheExpiry) {
    return cachedKeys;
  }

  const url = `https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS from ${url}: ${response.status}`);
  }

  const jwks: JwksResponse = await response.json();
  const keys = new Map<string, CryptoKey>();

  for (const key of jwks.keys) {
    if (key.kty === 'RSA' && key.use === 'sig') {
      const cryptoKey = await crypto.subtle.importKey(
        'jwk',
        { kty: key.kty, n: key.n, e: key.e, alg: key.alg },
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      keys.set(key.kid, cryptoKey);
    }
  }

  cachedKeys = keys;
  cacheExpiry = now + CACHE_TTL_MS;
  return keys;
}

/**
 * Decodes a Base64URL string.
 */
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Verifies and decodes a CF Access JWT.
 */
async function verifyAccessJwt(
  token: string,
  teamDomain: string,
  aud: string,
): Promise<JwtPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw Errors.unauthorized('Invalid token format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode header to get kid
  const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
  const header = JSON.parse(headerJson) as { kid: string; alg: string };

  // Get public keys
  let keys = await getPublicKeys(teamDomain);
  let key = keys.get(header.kid);
  if (!key) {
    // Force refresh keys and retry
    cachedKeys = null;
    keys = await getPublicKeys(teamDomain);
    key = keys.get(header.kid);
    if (!key) {
      throw Errors.unauthorized('Unknown signing key');
    }
  }

  // Verify signature
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);

  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature.buffer as ArrayBuffer, data);
  if (!valid) {
    throw Errors.unauthorized('Invalid token signature');
  }

  // Decode payload
  const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
  const payload = JSON.parse(payloadJson) as JwtPayload;

  // Validate claims
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) {
    throw Errors.unauthorized('Token expired');
  }

  if (payload.aud && !payload.aud.includes(aud)) {
    throw Errors.unauthorized('Invalid audience');
  }

  return payload;
}

/**
 * Authentication middleware.
 * - In production: validates CF Access JWT
 * - In development: uses mock identity or skips auth
 */
export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const env = c.env;
  const isDev = env.ENVIRONMENT === 'development';

  // Development bypass
  if (isDev && !env.CF_ACCESS_TEAM_DOMAIN) {
    c.set('user', {
      id: 'dev-user',
      email: 'dev@localhost',
      name: 'Dev User',
    });
    return next();
  }

  // Get token from header
  const token = c.req.header('CF-Access-JWT-Assertion');
  if (!token) {
    throw Errors.unauthorized('Missing CF Access token');
  }

  try {
    const payload = await verifyAccessJwt(token, env.CF_ACCESS_TEAM_DOMAIN, env.CF_ACCESS_AUD);

    const user: UserIdentity = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
    };

    c.set('user', user);
  } catch (err) {
    if (err instanceof Error && err.name === 'AppError') throw err;
    throw Errors.unauthorized('Authentication failed');
  }

  return next();
});
