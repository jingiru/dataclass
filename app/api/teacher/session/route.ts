import { NextResponse } from 'next/server';
import { correctTeacherPassword, createTeacherSession, hasTeacherSession, SESSION_SECONDS, TEACHER_COOKIE, teacherConfigured } from '../../teacher-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function json(value: object, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}
function sameOrigin(request: Request) { return request.headers.get('origin') === new URL(request.url).origin; }
export async function GET(request: Request) { return json({ authenticated: hasTeacherSession(request) }); }
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: '이 웹사이트에서 로그인해 주세요.' }, 403);
  if (!teacherConfigured()) return json({ error: '교사 로그인 환경변수를 확인해 주세요.' }, 503);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: '올바른 요청 형식이 아닙니다.' }, 415);
  try {
    const reader = request.body?.getReader(); if (!reader) return json({ error: '비밀번호를 입력해 주세요.' }, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 4096) { await reader.cancel(); return json({ error: '입력 길이가 너무 깁니다.' }, 413); } chunks.push(value); }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (typeof data?.password !== 'string' || !correctTeacherPassword(data.password)) return json({ error: '비밀번호가 맞지 않습니다.' }, 401);
    const response = json({ authenticated: true });
    response.cookies.set(TEACHER_COOKIE, createTeacherSession(), { httpOnly: true, secure: new URL(request.url).protocol === 'https:', sameSite: 'strict', path: '/', maxAge: SESSION_SECONDS });
    return response;
  } catch { return json({ error: '로그인 요청을 확인해 주세요.' }, 400); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: '이 웹사이트에서 로그아웃해 주세요.' }, 403);
  const response = json({ authenticated: false });
  response.cookies.set(TEACHER_COOKIE, '', { httpOnly: true, secure: new URL(request.url).protocol === 'https:', sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
