import crypto from 'node:crypto';
import { env } from '../config/env.js';

export function hashApiKey(rawKey: string): string {
  return crypto
    .createHmac('sha256', env.API_KEY_SALT)
    .update(rawKey)
    .digest('hex');
}

export function generateApiKey(prefix = 'pkx'): string {
  return `${prefix}_${crypto.randomBytes(24).toString('hex')}`;
}
