import crypto from 'crypto';

export function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const generated = crypto.randomBytes(32).toString('hex');
  console.warn('JWT_SECRET not set \u2014 using auto-generated random secret. Tokens will be invalidated on server restart. Set JWT_SECRET env var for persistence.');
  return generated;
}

const JWT_SECRET = getJwtSecret();
export default JWT_SECRET;
