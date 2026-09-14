import { createHmac, timingSafeEqual } from 'node:crypto';

export const IMAGE_BUCKET = 'submission-images';
export function imageReceipt(path: string, owner: string): string {
  return createHmac('sha256', process.env.SUPABASE_SECRET_KEY!).update(JSON.stringify([path, owner])).digest('hex');
}
export function validImageReceipt(path: unknown, receipt: unknown, owner: string): path is string {
  if (typeof path !== 'string' || !/^uploads\/[0-9a-f-]{36}\.(png|jpeg|webp)$/.test(path) || typeof receipt !== 'string' || !/^[0-9a-f]{64}$/.test(receipt) || !process.env.SUPABASE_SECRET_KEY) return false;
  return timingSafeEqual(Buffer.from(receipt, 'hex'), Buffer.from(imageReceipt(path, owner), 'hex'));
}
