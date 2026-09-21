import { hasTeacherSession } from '../../teacher-session';
import { json, sameOrigin, supabase } from '../grading-store';

export const runtime = 'nodejs';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!hasTeacherSession(request)) return json({ error: '교사 로그인이 필요합니다.' }, 401);
  if (!sameOrigin(request)) return json({ error: '이 웹사이트에서 공개해 주세요.' }, 403);
  const db = supabase();
  if (!db) return json({ error: 'Supabase 연결 설정이 필요합니다.' }, 503);
  try {
    const { classroom, round, submissionIds } = await request.json() as { classroom?: unknown; round?: unknown; submissionIds?: unknown };
    if (typeof classroom !== 'string' || !/^\d$/.test(classroom) || !Number.isInteger(round) || Number(round) < 1 || Number(round) > 5 || !Array.isArray(submissionIds) || !submissionIds.length || submissionIds.length > 1000 || !submissionIds.every(id => typeof id === 'string' && uuid.test(id)) || new Set(submissionIds).size !== submissionIds.length) {
      return json({ error: '학급과 회차의 제출 목록을 확인해 주세요.' }, 400);
    }
    const r = await fetch(`${db.url}/rest/v1/grading_results?select=submission_id,items,total_score,updated_at&classroom=like._${classroom}__&round=eq.${round}&submission_id=in.(${submissionIds.join(',')})`, { headers: db.headers, cache: 'no-store' });
    if (!r.ok) return json({ error: '채점 결과를 불러오지 못했습니다.' }, 502);
    const grades = await r.json() as { submission_id: string; items: unknown; total_score: number; updated_at: string }[];
    if (grades.length !== submissionIds.length) return json({ error: '채점하지 않은 제출이 있습니다.' }, 400);
    const results = Object.fromEntries(grades.map(g => [g.submission_id, { items: g.items, total: g.total_score, gradedAt: g.updated_at }]));
    const publishedAt = new Date().toISOString();
    const save = await fetch(`${db.url}/rest/v1/class_score_publications?on_conflict=classroom,round`, {
      method: 'POST', headers: { ...db.headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ classroom, round, results, published_at: publishedAt }),
    });
    if (!save.ok) return json({ error: '학급 점수를 공개하지 못했습니다.' }, 502);
    return json({ published: true, count: grades.length, publishedAt });
  } catch {
    return json({ error: '점수 공개 요청을 확인해 주세요.' }, 400);
  }
}
