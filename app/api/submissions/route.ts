import { isTableResult } from '../../table-data';

export const runtime = 'nodejs';
const MAX_BYTES = 4 * 1024 * 1024;
type Answer = { rows?: { column: string; value: string; reason: string }[]; result: string; explanation: string; image: string; imageName: string };
function validAnswer(value: unknown): value is Answer {
  if (!value || typeof value !== 'object') return false;
  const a = value as Answer;
  return ['result', 'explanation', 'image', 'imageName'].every(k => typeof a[k as keyof Answer] === 'string')
    && (a.rows === undefined || Array.isArray(a.rows) && a.rows.every(r => r && ['column', 'value', 'reason'].every(k => typeof r[k as keyof typeof r] === 'string')))
    && (!a.image || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(a.image) && Buffer.from(a.image.split(',')[1], 'base64').length <= 2 * 1024 * 1024);
}
export async function POST(request: Request) {
  const error = (message: string, status: number) => Response.json({ error: message }, { status });
  if (request.headers.get('origin') !== new URL(request.url).origin) return error('이 웹사이트에서 제출해 주세요.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return error('올바른 제출 형식이 아닙니다.', 415);
  try {
    const reader = request.body?.getReader();
    if (!reader) return error('답안이 없습니다.', 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { await reader.cancel(); return error('답안 전체 용량이 큽니다. 캡처 이미지 크기를 줄여 주세요.', 413); }
      chunks.push(value);
    }
    let data;
    try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return error('올바른 제출 형식이 아닙니다.', 400); }
    if (!data || typeof data.name !== 'string' || !data.name.trim() || data.name.length > 100 || typeof data.classroom !== 'string' || !/^\d{4}$/.test(data.classroom) || !Array.isArray(data.answers) || data.answers.length !== 5 || !data.answers.every(validAnswer)) return error('학번, 이름과 답안 형식을 확인해 주세요.', 400);
    const answers: Answer[] = data.answers;
    const rows = answers[0].rows ?? [{ column: '', value: answers[0].result, reason: answers[0].explanation }];
    if (!rows.some(r => r.column.trim() && r.value.trim() && r.reason.trim()) || !rows.filter(r => r.column.trim() || r.value.trim() || r.reason.trim()).every(r => r.column.trim() && r.value.trim() && r.reason.trim()) || !isTableResult(answers[1].result) || !isTableResult(answers[3].result) || !answers[3].explanation.trim() || ![2, 4].every(i => answers[i].image && answers[i].explanation.trim())) return error('다섯 수행의 필수 항목을 모두 작성해 주세요.', 400);
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) return error('제출 서버 연결 설정이 필요합니다. 선생님께 알려 주세요.', 503);
    const submittedAt = new Date().toISOString();
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/submissions`, {
      method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ student_name: data.name.trim(), classroom: data.classroom, answers: answers.map(a => ({ result: a.result, explanation: a.explanation, image: a.image, imageName: a.imageName, ...(a.rows ? { rows: a.rows } : {}) })), submitted_at: submittedAt }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) return error('DB에 저장하지 못했습니다. 잠시 후 다시 제출해 주세요.', 502);
    return Response.json({ submittedAt }, { status: 201 });
  } catch { return error('제출 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.', 502); }
}
