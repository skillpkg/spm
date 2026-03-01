import { SignJWT, jwtVerify } from 'jose';
import type { JwtPayload } from '../types.js';

const TOKEN_PREFIX = 'spm_';
const EXPIRY = '30d';
const ALG = 'HS256';

const encodeSecret = (secret: string): Uint8Array => new TextEncoder().encode(secret);

export const signJwt = async (
  payload: { sub: string; username: string; role: string },
  secret: string,
): Promise<string> => {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(encodeSecret(secret));

  return `${TOKEN_PREFIX}${token}`;
};

export const verifyJwt = async (token: string, secret: string): Promise<JwtPayload> => {
  const raw = token.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : token;

  const { payload } = await jwtVerify(raw, encodeSecret(secret));

  return payload as unknown as JwtPayload;
};
