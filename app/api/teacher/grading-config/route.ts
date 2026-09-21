/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck -- request payloads are validated before persistence.
import { hasTeacherSession } from '../../teacher-session';
import { defaultGradingConfig, type GradingConfig } from '../../../grading';
import { json, sameOrigin, supabase } from '../grading-store';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
function validConfig(value: unknown): value is GradingConfig {
  const c = value as GradingConfig;
  return !!c && typeof c.overallInstructions === 'string' && c.overallInstructions.length <= 5000 && Array.isArray(c.criteria) && c.criteria.length === 3 && c.criteria.every((v, i) => v?.key === defaultGradingConfig.criteria[i].key && v.title === defaultGradingConfig.criteria[i].title && ['first','second','guidance','exampleAnswer'].every(k => typeof v[k as keyof typeof v] === 'string' && String(v[k as keyof typeof v]).length <= 10000));
}
export async function GET(request: Request) {
  if (!hasTeacherSession(request)) return json({ error: '교사 로그인이 필요합니다.' }, 401);
  const db = supabase(); if (!db) return json({ error: 'Supabase 연결 설정이 필요합니다.' }, 503);
  try { const response = await fetch(`${db.url}/rest/v1/grading_configs?id=eq.default&select=config,updated_at&limit=1`, { headers: db.headers, cache:'no-store' }); if (!response.ok) return json({ error:'채점 기준 테이블을 확인해 주세요.' },502); const rows=await response.json() as {config:GradingConfig;updated_at:string}[]; return json({ config: rows[0] ? {...rows[0].config,updatedAt:rows[0].updated_at} : defaultGradingConfig }); } catch { return json({error:'채점 기준을 불러오지 못했습니다.'},502); }
}
export async function PUT(request: Request) {
  if (!hasTeacherSession(request)) return json({ error:'교사 로그인이 필요합니다.'},401); if (!sameOrigin(request)) return json({error:'이 웹사이트에서 저장해 주세요.'},403);
  const db=supabase(); if(!db)return json({error:'Supabase 연결 설정이 필요합니다.'},503);
  try { const body=await request.json(); if(!validConfig(body?.config))return json({error:'채점 기준 형식을 확인해 주세요.'},400); const now=new Date().toISOString(); const response=await fetch(`${db.url}/rest/v1/grading_configs?on_conflict=id`,{method:'POST',headers:{...db.headers,Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id:'default',config:body.config,updated_at:now})}); if(!response.ok)return json({error:'채점 기준을 저장하지 못했습니다. 테이블 권한을 확인해 주세요.'},502); return json({saved:true,updatedAt:now}); } catch{return json({error:'채점 기준 저장 요청을 확인해 주세요.'},400);}
}
