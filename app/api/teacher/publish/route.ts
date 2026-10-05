import { hasTeacherSession } from '../../teacher-session';
import { json, sameOrigin, supabase } from '../grading-store';

export const runtime = 'nodejs';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVALUATION_ROUND = 2;

export async function POST(request: Request) {
  if (!hasTeacherSession(request)) return json({ error: '교사 로그인이 필요합니다.' }, 401);
  if (!sameOrigin(request)) return json({ error: '이 웹사이트에서 공개해 주세요.' }, 403);
  const db = supabase();
  if (!db) return json({ error: 'Supabase 연결 설정이 필요합니다.' }, 503);
  try {
    const { classroom, round, submissionIds } = await request.json() as { classroom?: unknown; round?: unknown; submissionIds?: unknown };
    if (typeof classroom !== 'string' || !/^\d$/.test(classroom) || round !== EVALUATION_ROUND || !Array.isArray(submissionIds) || !submissionIds.length || submissionIds.length > 1000 || !submissionIds.every(id => typeof id === 'string' && uuid.test(id)) || new Set(submissionIds).size !== submissionIds.length) {
      return json({ error: '2회차 학급의 제출 목록만 공개할 수 있습니다.' }, 400);
    }
    const r = await fetch(`${db.url}/rest/v1/grading_results?select=submission_id,items,total_score,updated_at&classroom=like._${classroom}__&round=eq.${round}&submission_id=in.(${submissionIds.join(',')})`, { headers: db.headers, cache: 'no-store' });
    if (!r.ok) return json({ error: '채점 결과를 불러오지 못했습니다.' }, 502);
    const grades = await r.json() as { submission_id: string; items: unknown; total_score: number; updated_at: string }[];
    const submissions = await fetch(`${db.url}/rest/v1/submissions?select=id&classroom=like._${classroom}__&round=eq.${round}&id=in.(${submissionIds.join(',')})`, { headers: db.headers, cache: 'no-store' });
    if (!submissions.ok) return json({ error: '공개할 제출 내역을 확인하지 못했습니다.' }, 502);
    const verified = await submissions.json() as { id: string }[];
    if (verified.length !== submissionIds.length) return json({ error: '학급과 회차의 제출 정보가 일치하지 않습니다.' }, 400);
    const gradeMap = new Map(grades.map(g => [g.submission_id, g]));
    const results = Object.fromEntries(verified.map(({ id }) => {
      const grade = gradeMap.get(id);
      return [id, grade ? { items: grade.items, total: grade.total_score, gradedAt: grade.updated_at } : { items: [], total: null, gradedAt: null }];
    }));
    const publishedAt = new Date().toISOString();
    const save = await fetch(`${db.url}/rest/v1/class_score_publications?on_conflict=classroom,round`, {
      method: 'POST', headers: { ...db.headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ classroom, round, results, published_at: publishedAt }),
    });
    if (!save.ok) return json({ error: '학급 점수를 공개하지 못했습니다.' }, 502);
    return json({ published: true, count: verified.length, gradedCount: grades.length, publishedAt });
  } catch {
    return json({ error: '점수 공개 요청을 확인해 주세요.' }, 400);
  }
}
