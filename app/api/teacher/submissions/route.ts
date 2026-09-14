import { hasTeacherSession } from '../../teacher-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (data: object, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(request: Request) {
  if (!hasTeacherSession(request)) return json({ error: '교사 로그인이 필요합니다.' }, 401);
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return json({ error: 'Supabase 연결 설정을 확인해 주세요.' }, 503);
  const params = new URL(request.url).searchParams, id = params.get('id'), image = params.get('image');
  if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return json({ error: '올바른 제출 ID가 아닙니다.' }, 400);
  if (image !== null && (!id || !/^[0-4]$/.test(image))) return json({ error: '올바른 이미지 요청이 아닙니다.' }, 400);
  const base = url.replace(/\/$/, '');
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  try {
    if (!id) {
      const page = Number(params.get('page') ?? 0);
      if (!Number.isSafeInteger(page) || page < 0 || page > 100000) return json({ error: '올바른 페이지가 아닙니다.' }, 400);
      const response = await fetch(`${base}/rest/v1/submissions?select=id,student_name,classroom,submitted_at&order=submitted_at.desc,id.desc&limit=51&offset=${page * 50}`, { headers, cache: 'no-store', signal: AbortSignal.timeout(25000) });
      if (!response.ok) return json({ error: '제출 목록을 불러오지 못했습니다. 서버의 SELECT 권한을 확인해 주세요.' }, 502);
      const rows = await response.json() as unknown[];
      return json({ submissions: rows.slice(0, 50), hasMore: rows.length > 50 });
    }
    const response = await fetch(`${base}/rest/v1/submissions?select=*&id=eq.${id}&limit=1`, { headers, cache: 'no-store', signal: AbortSignal.timeout(25000) });
    if (!response.ok) return json({ error: '답안을 불러오지 못했습니다. 서버의 SELECT 권한을 확인해 주세요.' }, 502);
    const [submission] = await response.json() as { answers: Record<string, unknown>[]; [key: string]: unknown }[];
    if (!submission) return json({ error: '제출을 찾을 수 없습니다.' }, 404);
    if (!Array.isArray(submission.answers)) return json({ error: '답안 형식을 확인해 주세요.' }, 502);
    if (image !== null) {
      const answer = submission.answers[Number(image)];
      if (answer?.imageBucket !== 'submission-images' || typeof answer.imagePath !== 'string' || !/^uploads\/[0-9a-f-]{36}\.(png|jpeg|webp)$/.test(answer.imagePath)) return json({ error: '이미지를 찾을 수 없습니다.' }, 404);
      const file = await fetch(`${base}/storage/v1/object/authenticated/submission-images/${answer.imagePath}`, { headers, cache: 'no-store', signal: AbortSignal.timeout(25000) });
      if (!file.ok) return json({ error: '이미지를 불러오지 못했습니다.' }, 502);
      const type = file.headers.get('content-type')?.split(';')[0];
      if (!type || !['image/png', 'image/jpeg', 'image/webp'].includes(type)) return json({ error: '이미지 형식을 확인해 주세요.' }, 502);
      return new Response(await file.arrayBuffer(), { headers: { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
    submission.answers = submission.answers.map((a: Record<string, unknown>, i: number) => ({ ...a, image: a.imagePath ? `/api/teacher/submissions?id=${id}&image=${i}` : typeof a.image === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(a.image) ? a.image : '' }));
    return json({ submission });
  } catch { return json({ error: '서버에 연결하지 못했습니다. 다시 시도해 주세요.' }, 502); }
}
