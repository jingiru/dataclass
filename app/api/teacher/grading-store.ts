import { defaultGradingConfig, type GradingConfig } from '../../grading';

export const json = (data: object, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export const sameOrigin = (request: Request) => request.headers.get('origin') === new URL(request.url).origin;
export function supabase() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, ''), key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } };
}
export async function loadConfig(): Promise<GradingConfig> {
  const db = supabase();
  if (!db) throw new Error('Supabase 연결 설정이 필요합니다.');
  const response = await fetch(`${db.url}/rest/v1/grading_configs?id=eq.default&select=config&limit=1`, { headers: db.headers, cache: 'no-store' });
  if (!response.ok) throw new Error('채점 기준 테이블을 확인해 주세요.');
  const rows = await response.json() as { config: GradingConfig }[];
  return rows[0]?.config ?? defaultGradingConfig;
}
