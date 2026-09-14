import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const TEACHER_COOKIE = 'dataclass-teacher';
export const SESSION_SECONDS = 8 * 60 * 60;
export function teacherConfigured() {
  return Boolean(process.env.TEACHER_PASSWORD && (process.env.TEACHER_SESSION_SECRET?.length ?? 0) >= 32);
}
export function correctTeacherPassword(value: string) {
  if (!teacherConfigured()) return false;
  return timingSafeEqual(createHash('sha256').update(value).digest(), createHash('sha256').update(process.env.TEACHER_PASSWORD!).digest());
}
function signature(payload: string) {
  return createHmac('sha256', process.env.TEACHER_SESSION_SECRET!).update(`${payload}:${process.env.TEACHER_PASSWORD}`).digest('hex');
}
export function createTeacherSession(now = Date.now()) {
  if (!teacherConfigured()) throw new Error('Teacher authentication is not configured');
  const payload = String(Math.floor(now / 1000) + SESSION_SECONDS);
  return `${payload}.${signature(payload)}`;
}
export function validTeacherSession(value: string | undefined, now = Date.now()) {
  if (!teacherConfigured() || !value || !/^\d{10}\.[a-f0-9]{64}$/.test(value)) return false;
  const [payload, sig] = value.split('.');
  const remaining = Number(payload) - Math.floor(now / 1000);
  return remaining > 0 && remaining <= SESSION_SECONDS && timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(signature(payload), 'hex'));
}
export function hasTeacherSession(request: Request) {
  const cookie = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${TEACHER_COOKIE}=`));
  return validTeacherSession(cookie?.slice(TEACHER_COOKIE.length + 1));
}
