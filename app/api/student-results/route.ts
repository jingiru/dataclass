import { json, sameOrigin, supabase } from '../teacher/grading-store';
import type { GradeItem } from '../../grading';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Answer = { result: string; explanation: string; image: string; imageName: string; rows?: { column: string; value: string; reason: string }[]; imageBucket?: string; imagePath?: string };
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: '이 웹사이트에서 조회해 주세요.' }, 403);
  let input: { classroom?: unknown; name?: unknown; round?: unknown } | null;
  try { input = await request.json() as typeof input; } catch { return json({ error: '조회 정보를 확인해 주세요.' }, 400); }
  const { classroom, name, round } = input ?? {};
  if (typeof classroom !== 'string' || !/^\d{4}$/.test(classroom) || typeof name !== 'string' || !name.trim() || name.length > 100 || typeof round !== 'number' || !Number.isInteger(round) || round < 1 || round > 5) return json({ error: '학번 네 자리, 이름과 회차를 확인해 주세요.' }, 400);
  const db = supabase();
  if (!db) return json({ error: '결과 서버 연결 설정이 필요합니다.' }, 503);
  const read = (path: string) => fetch(`${db.url}${path}`, { headers: db.headers, cache: 'no-store', signal: AbortSignal.timeout(25000) });
  try {
    const query = new URLSearchParams({ select: 'id,student_name,classroom,round,submitted_at,answers', classroom: `eq.${classroom}`, round: `eq.${round}`, student_name: `eq.${name.trim()}`, order: 'submitted_at.desc,id.desc', limit: '1' });
    const response = await read(`/rest/v1/submissions?${query}`);
    if (!response.ok) throw new Error('제출 내역을 불러오지 못했습니다.');
    const [submission] = await response.json() as { id: string; student_name: string; submitted_at: string; answers: Answer[] }[];
    if (!submission) return json({ error: '일치하는 제출 내역이 없습니다. 학번, 이름과 회차를 확인해 주세요.' }, 404);
    const publication = await read(`/rest/v1/class_score_publications?select=results&classroom=eq.${classroom[1]}&round=eq.${round}&limit=1`);
    if (!publication.ok) throw new Error('평가 결과를 불러오지 못했습니다.');
    const [row] = await publication.json() as { results: Record<string, { items: GradeItem[]; total: number | null }> }[];
    const grade = row?.results?.[submission.id];
    const answers = await Promise.all(submission.answers.map(async a => {
      let image = /^data:image\/(png|jpeg|webp);base64,/.test(a.image) ? a.image : '';
      if (a.imageBucket === 'submission-images' && a.imagePath && /^uploads\/[0-9a-f-]{36}\.(png|jpeg|webp)$/.test(a.imagePath)) {
        const file = await read(`/storage/v1/object/authenticated/submission-images/${a.imagePath}`);
        const type = file.headers.get('content-type')?.split(';')[0];
        if (!file.ok || !type || !['image/png', 'image/jpeg', 'image/webp'].includes(type)) throw new Error('제출 이미지를 불러오지 못했습니다.');
        image = `data:${type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`;
      }
      return { result: a.result, explanation: a.explanation, image, imageName: a.imageName, rows: a.rows };
    }));
    return json({ submission: { student_name: submission.student_name, classroom, round, submitted_at: submission.submitted_at, answers }, result: grade ? { total: grade.total, items: grade.items.map(({ key, title, score, comment }) => ({ key, title, score, comment })) } : null });
  } catch (error) { return json({ error: error instanceof Error ? error.message : '결과 서버에 연결하지 못했습니다.' }, 502); }
}
