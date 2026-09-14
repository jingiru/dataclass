/* Uploaded evidence uses data URLs and must remain unchanged. */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent } from 'react';
import Link from 'next/link';
import { isTableResult, parseTable, serializeTable } from './table-data';

type Row = { column: string; value: string; reason: string };
type Answer = { rows?: Row[]; result: string; explanation: string; image: string; imageName: string };
type Work = { version: 4; name: string; classroom: string; answers: Answer[]; submittedAt: string; scores: (number | null)[]; feedback: string[]; reviewed: boolean; submittedToDb?: boolean };
const blank = (): Work => ({ version: 4, name: '', classroom: '', answers: Array.from({ length: 5 }, () => ({ result: '', explanation: '', image: '', imageName: '' })), submittedAt: '', scores: [null, null, null, null, null], feedback: ['', '', '', '', ''], reviewed: false });
const tasks = [
  { title: '이상 데이터 찾기', short: '이상 데이터', icon: '⌕', subtitle: '데이터의 범위를 확인하고, 이상한 값의 이유를 설명해요.', dataset: '학생 과목별 점수', tag: '조건부 서식 · 색상 스케일', question: '어떤 데이터가 범위를 벗어났나요?', resultLabel: '결과', resultHint: '열 이름, 값, 이상데이터라고 판단한 이유를 입력하세요.', placeholder: '예: 학생 번호 / 과목 / 입력된 값 / 정상 범위', explainLabel: '왜 이상 데이터라고 판단했나요?', explainHint: '해당 항목이 가질 수 있는 범위와 실제 값을 비교해 설명하세요. 색이 다르다는 것만으로 이상 데이터일까요?', explainPlaceholder: '이 항목의 정상 범위는 …입니다. 그런데 …이 입력되어 있어 …라고 판단했습니다.', steps: ['원하는 범위를 선택하고 서식 → 조건부 서식 → 색상 스케일을 적용하세요.', '눈에 띄는 값을 확인하고, 정상 범위와 비교하세요.'], criteria: ['범위를 벗어난 데이터의 위치와 값을 정확히 찾았나요?', '정상 범위와 실제 값을 비교해 이유를 설명했나요?', '단순히 크거나 작은 값과 입력 오류를 구분했나요?'] },
  { title: '결측 데이터', short: '결측 데이터', icon: '▦', subtitle: '결측 데이터가 있는 행을 제거하고, 정리한 전체 데이터를 제출해요.', dataset: '과제로 제공된 데이터', tag: '결측 데이터 · 행 제거', question: '결측 데이터가 있는 행을 모두 제거했나요?', resultLabel: '결측 데이터 행을 제거한 전체 데이터', resultHint: '주어진 데이터에서 결측 데이터가 있는 행을 제거하세요. 제목 행을 포함한 나머지 전체 데이터를 복사해 아래 영역에 붙여넣으세요. 정리한 결과만 제출하면 됩니다.', placeholder: '이 영역을 클릭하고 Ctrl+V로 전체 데이터를 붙여넣으세요.', explainLabel: '', explainHint: '', explainPlaceholder: '', steps: ['주어진 데이터에서 결측 데이터가 있는 행을 확인하고 제거하세요.', '제목 행을 포함한 나머지 전체 데이터를 선택하여 복사하세요.', '아래 결과 영역을 클릭하고 Ctrl+V로 붙여넣으세요.'], criteria: ['결측 데이터가 있는 행을 모두 제거했나요?', '제목 행과 나머지 전체 데이터를 제출했나요?', '원래 열 순서와 값을 유지했나요?'] },
  { title: '차트로 표현하고 의미 해석하기', short: '시각화와 해석', icon: '▥', subtitle: '표에 숨은 특징을 그래프로 드러내고, 그 의미를 읽어요.', dataset: '제공된 인구 데이터', tag: '삽입 · 차트', question: '동별 인구를 비교하면 어떤 특징이 보이나요?', resultLabel: '내가 만든 차트', resultHint: '차트를 캡처한 뒤 아래 영역에서 Ctrl+V로 붙여넣으세요.', placeholder: '', explainLabel: '차트에서 어떤 의미를 파악했나요?', explainHint: '선택한 차트가 비교에 적절한 이유, 가장 눈에 띄는 특징, 이를 뒷받침하는 수치를 연결해 서술하세요.', explainPlaceholder: '…을 비교하기 위해 …차트를 선택했습니다. 차트를 보면 …라는 특징이 보입니다. …의 수치가 …이므로 …라고 해석할 수 있습니다.', steps: ['데이터를 선택하세요.', '삽입 → 차트로 목적에 맞는 그래프를 만드세요.'], criteria: ['분석 목적에 적절한 차트를 선택했나요?', '제목·항목·단위가 읽히는 차트 증거를 제출했나요?', '그래프의 특징을 수치 근거와 연결해 해석했나요?'] },
  { title: '피봇 테이블로 정보 추출하기', short: '피봇 테이블', icon: '▦', subtitle: '반복되는 항목을 묶어, 질문에 필요한 정보를 찾아요.', dataset: '서구 동별 · 연령대별 인구', tag: '삽입 · 피봇 테이블', question: '각 동의 전체 인구는 몇 명인가요?', resultLabel: '내가 만든 피봇 테이블', resultHint: '스프레드시트에서 피봇 테이블의 제목 행과 결과를 모두 선택해 복사한 뒤 붙여넣으세요.', placeholder: '이곳을 클릭하고 Ctrl+V로 피봇 테이블을 붙여넣으세요.', explainLabel: '어떻게 구성했고, 어떤 정보를 찾았나요?', explainHint: '행·열·값에 넣은 항목과 집계 방식(합계 등)을 설명하고, 특정 동의 인구를 수치로 제시하세요.', explainPlaceholder: '행에는 …, 값에는 …을 넣고 …로 집계했습니다. 그 결과 …동의 전체 인구는 …명으로 나타났습니다.', steps: ['데이터 선택', '삽입 → 피봇 테이블'], criteria: ['질문에 맞게 행·열·값과 집계 방식을 구성했나요?', '제목과 수치가 포함된 피봇 테이블을 제출했나요?', '추출한 정보를 구체적인 수치와 함께 설명했나요?'] },
  { title: '데이터 관계 해석', short: '데이터 관계 해석', icon: '↗', subtitle: '차트에서 데이터의 변화와 관계를 읽고, 근거를 들어 해석해요.', dataset: '날씨와 아이스크림 판매량', tag: '차트 · 관계 해석', question: '어떤 날씨 데이터가 판매량과 가장 관련 있나요?', resultLabel: '관계를 분석한 차트 캡처하여 붙여넣기', resultHint: '데이터의 관계를 분석한 차트를 캡처한 뒤 아래 영역에서 Ctrl+V로 붙여넣으세요.', placeholder: '', explainLabel: '어떤 데이터가 관련 있나요? 근거는 무엇인가요?', explainHint: '판매량과 변화 방향이 비슷하거나 반대인 항목을 비교하세요. 관련성이 있다는 것만으로 원인이라고 말할 수 있는지도 설명하세요.', explainPlaceholder: '차트에서 데이터를 비교하면 …이 증가할 때 판매량은 …했습니다. 예를 들어 …입니다. 따라서 …이 가장 관련 있다고 판단했습니다. 다만 …때문에 직접적인 원인으로 단정하기는 어렵습니다.', steps: ['과제로 제공된 데이터를 정리하고 관계를 파악하세요.'], criteria: ['데이터의 관계를 비교할 수 있는 차트를 제출했나요?', '판매량과 각 항목의 관계를 비교했나요?', '수치·추세 근거를 제시하고 상관과 인과를 구분했나요?'] },
];
const KEY = 'datapick-portfolio-v4';
const LEGACY_KEY = 'datapick-portfolio-v3';
function openStore(): Promise<IDBDatabase> {
 return new Promise((resolve, reject) => { const request = indexedDB.open('datapick-portfolio', 1); request.onupgradeneeded = () => request.result.createObjectStore('work'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
async function loadWork(): Promise<unknown> {
 const db = await openStore();
 return new Promise((resolve, reject) => { const tx = db.transaction('work', 'readonly'); const store = tx.objectStore('work'); const request = store.get(KEY); request.onsuccess = () => { if (request.result !== undefined) resolve(request.result); else { const legacy = store.get(LEGACY_KEY); legacy.onsuccess = () => resolve(legacy.result); legacy.onerror = () => reject(legacy.error); } }; request.onerror = () => reject(request.error); tx.oncomplete = () => db.close(); tx.onabort = () => { db.close(); reject(tx.error); }; });
}
async function saveWork(work: Work): Promise<void> {
 const db = await openStore();
 return new Promise((resolve, reject) => { const tx = db.transaction('work', 'readwrite'); tx.objectStore('work').put(work, KEY); tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => { db.close(); reject(tx.error); }; });
}

type LegacyWork = Omit<Work, 'version'> & { version: 3 };
function isWork(value: unknown): value is Work | LegacyWork {
 if (!value || typeof value !== 'object') return false;
 const w = value as Work;
 return (w.version === 4 || Number(w.version) === 3) && typeof w.name === 'string' && typeof w.classroom === 'string' && typeof w.submittedAt === 'string' && typeof w.reviewed === 'boolean' && Array.isArray(w.answers) && w.answers.length === (Number(w.version) === 3 ? 4 : 5) && w.answers.every(a => a && (a.rows === undefined || Array.isArray(a.rows) && a.rows.every(r => r && ['column','value','reason'].every(k => typeof r[k as keyof Row] === 'string'))) && ['result', 'explanation', 'image', 'imageName'].every(k => typeof a[k as keyof Answer] === 'string') && (!a.image || /^data:image\/(png|jpeg|webp);base64,/.test(a.image))) && Array.isArray(w.scores) && w.scores.length === (Number(w.version) === 3 ? 4 : 5) && w.scores.every(s => s === null || Number.isInteger(s) && s >= 0 && s <= 25) && Array.isArray(w.feedback) && w.feedback.length === (Number(w.version) === 3 ? 4 : 5) && w.feedback.every(f => typeof f === 'string');
}
function migrateWork(work: Work | LegacyWork): Work {
 if (work.version === 4) return work;
 return { ...work, version: 4, answers: [work.answers[0], blank().answers[1], work.answers[2], work.answers[1], work.answers[3]], submittedAt: '', scores: blank().scores, feedback: blank().feedback, reviewed: false };
}
function rowsFor(a: Answer): Row[] { return a.rows ?? (a.result.trim() ? [{ column: '', value: a.result, reason: a.explanation }] : [{ column: '', value: '', reason: '' }]); }
function AnomalyTable({ answer }: { answer: Answer }) { return <div className="table-wrap"><table><thead><tr><th>열 이름</th><th>값</th><th>이상데이터라고 판단한 이유</th></tr></thead><tbody>{rowsFor(answer).map((r,i) => <tr key={i}><td>{r.column}</td><td>{r.value}</td><td>{r.reason}</td></tr>)}</tbody></table></div>; }
function download(content: string, filename: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }
function TablePreview({ value }: { value: string }) {
 const rows = parseTable(value);
 return <div className="table-wrap"><table><tbody>{rows.slice(0, 100).map((r, i) => <tr key={i}>{r.map((c, j) => i === 0 ? <th key={j}>{c}</th> : <td key={j}>{c}</td>)}</tr>)}</tbody></table>{rows.length > 100 && <p>미리보기는 100행까지 표시됩니다. 전체 {rows.length}행이 저장됩니다.</p>}</div>;
}
function TablePaste({ value, label, placeholder, disabled, onChange }: { value: string; label: string; placeholder: string; disabled: boolean; onChange: (value: string) => void }) {
 const [error, setError] = useState('');
 function paste(e: ClipboardEvent<HTMLDivElement>) {
  e.preventDefault();
  if (disabled) return;
  let text = e.clipboardData.getData('text/plain');
  if (!text) {
   const doc = new DOMParser().parseFromString(e.clipboardData.getData('text/html'), 'text/html');
   const table = doc.querySelector('table');
   if (table) text = serializeTable(Array.from(table.rows).map(row => Array.from(row.cells).map(cell => cell.textContent ?? '')));
  }
  if (!isTableResult(text)) { setError('제목 행과 데이터 행을 포함한 전체 표를 스프레드시트에서 복사해 주세요.'); return; }
  setError(''); onChange(text);
 }
 return <><div className={`table-paste-area ${value ? 'has-table' : ''}`} role="group" aria-label={label} aria-disabled={disabled} tabIndex={0} onPaste={paste}>{value ? <TablePreview value={value}/> : <div className="table-paste-placeholder"><span>▦</span><b>{placeholder}</b><p>제목 행과 전체 데이터를 선택해 복사하세요.</p></div>}</div><div className="paste-note"><span>{disabled ? '제출한 표를 확인하세요.' : 'Ctrl+C → Ctrl+V · 다시 붙여넣으면 전체 표가 교체됩니다.'}</span><span>{value ? `제목 포함 ${parseTable(value).length}행 · 전체 저장` : '표 형태로 표시됩니다.'}</span></div>{error && <p className="field-help" role="alert">{error}</p>}{value && !disabled && <button className="button secondary add-row" onClick={() => { onChange(''); setError(''); }}>붙여넣은 표 삭제</button>}</>;
}
export default function Home() {
 const [work, setWork] = useState<Work>(blank);
 const [ready, setReady] = useState(false);
 const [submitting, setSubmitting] = useState(false);
 const submissionBusy = useRef(false);
 const uploadedImages = useRef(new Map<string, { imagePath: string; imageReceipt: string }>());
 const [active, setActive] = useState(-1);
 const [teacher, setTeacher] = useState(false);
 const [teacherLogin, setTeacherLogin] = useState(false);
 const [teacherPassword, setTeacherPassword] = useState('');
 const [teacherError, setTeacherError] = useState('');
 const [teacherBusy, setTeacherBusy] = useState(false);
 const [notice, setNotice] = useState('');
 const [saved, setSaved] = useState('불러오는 중');
 const importInput = useRef<HTMLInputElement>(null);
 async function enterTeacher() {
  setTeacherBusy(true); setTeacherError('');
  try {
   const response = await fetch('/api/teacher/session', { cache: 'no-store' });
   const session = await response.json() as { authenticated?: boolean };
   if (response.ok && session.authenticated) { setTeacher(true); navigate(5); }
   else { setTeacherLogin(true); setTeacherPassword(''); }
  } catch { setNotice('교사 로그인 서버에 연결하지 못했습니다.'); }
  finally { setTeacherBusy(false); }
 }
 async function loginTeacher(e: React.FormEvent) {
  e.preventDefault(); if (teacherBusy) return;
  setTeacherBusy(true); setTeacherError('');
  try {
   const response = await fetch('/api/teacher/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: teacherPassword }) });
   const session = await response.json() as { authenticated?: boolean; error?: string };
   if (!response.ok || !session.authenticated) throw new Error(session.error || '로그인하지 못했습니다.');
   setTeacher(true); setTeacherLogin(false); navigate(5);
  } catch (error) { setTeacherError(error instanceof Error ? error.message : '다시 시도해 주세요.'); }
  finally { setTeacherPassword(''); setTeacherBusy(false); }
 }
 async function logoutTeacher() {
  setTeacherBusy(true);
  try {
   const response = await fetch('/api/teacher/session', { method: 'DELETE' });
   if (!response.ok) throw new Error();
   setTeacher(false); setTeacherLogin(false); navigate(-1);
  } catch { setNotice('로그아웃하지 못했습니다. 다시 시도해 주세요.'); }
  finally { setTeacherBusy(false); }
 }
 useEffect(() => {
  if (!teacher) return;
  let cancelled = false;
  async function check() {
   try {
    const response = await fetch('/api/teacher/session', { cache: 'no-store' });
    const session = await response.json() as { authenticated?: boolean };
    if (!cancelled && (!response.ok || !session.authenticated)) { setTeacher(false); setNotice('교사 로그인이 만료되었습니다. 다시 로그인해 주세요.'); }
   } catch { if (!cancelled) setTeacher(false); }
  }
  const timer = setInterval(() => void check(), 60000);
  return () => { cancelled = true; clearInterval(timer); };
 }, [teacher]);
 useEffect(() => { let cancelled = false; loadWork().then(data => { if (!cancelled) { if (isWork(data)) { setWork(migrateWork(data)); if (data.version === 3) setNotice('기존 답안을 새 수행 순서로 불러왔습니다. 02 결측 데이터를 작성한 뒤 다시 제출해 주세요. 기존 제출 상태와 평가는 초기화되었습니다.'); } setReady(true); } }).catch(() => { if (!cancelled) { setNotice('저장된 답안을 불러오지 못했습니다. 답안 파일을 불러와 작업할 수 있어요.'); setReady(true); } }); return () => { cancelled = true; }; }, []);
 useEffect(() => { if (!ready) return; let cancelled = false; saveWork(work).then(() => { if (!cancelled) setSaved('이 브라우저에 저장됨'); }).catch(() => { if (!cancelled) { setSaved('브라우저 저장 실패'); setNotice('답안을 브라우저에 저장하지 못했습니다. 파일을 내보내 현재 작업을 보관하세요.'); } }); return () => { cancelled = true; }; }, [work, ready]);
 useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(timer); }, [notice]);
 const complete = work.answers.map((a, i) => Boolean(i === 0 ? rowsFor(a).some(r => r.column.trim() && r.value.trim() && r.reason.trim()) && rowsFor(a).filter(r => r.column.trim() || r.value.trim() || r.reason.trim()).every(r => r.column.trim() && r.value.trim() && r.reason.trim()) : i === 1 ? isTableResult(a.result) : a.explanation.trim() && (i === 2 || i === 4 ? a.image : isTableResult(a.result))));
 const count = complete.filter(Boolean).length;
 const locked = Boolean(work.submittedAt) || submitting;
 const task = tasks[Math.max(0, Math.min(active, 4))];
 const answer = work.answers[Math.max(0, Math.min(active, 4))];
 function update(field: keyof Answer, value: string) { setWork(w => ({ ...w, answers: w.answers.map((a, i) => i === active ? { ...a, [field]: value } : a) })); }
 const anomalyRows = rowsFor(work.answers[0]);
 function updateRows(rows: Row[]) { setWork(w => ({ ...w, answers: w.answers.map((a,i) => i === 0 ? { ...a, rows, result: rows.map(r => [r.column,r.value,r.reason].join('\t')).join('\n') } : a) })); }
 function navigate(i: number) { setActive(i); }
 async function attach(file: File) {
  if (locked || teacher) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setNotice('PNG, JPG, WEBP 이미지 파일을 선택해 주세요.'); return; }
  if (file.size > 2 * 1024 * 1024) { setNotice('이미지는 한 장당 2MB 이하로 첨부해 주세요.'); return; }
  const target = active;
  const reader = new FileReader(); reader.onload = () => setWork(w => ({ ...w, answers: w.answers.map((a, i) => i === target ? { ...a, image: String(reader.result), imageName: file.name } : a) })); reader.readAsDataURL(file);
 }
 function pasteImage(e: ClipboardEvent<HTMLDivElement>) { const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/')); const file = item?.getAsFile(); if (file) { e.preventDefault(); void attach(file); } }
 async function importWork(file: File) { if (submissionBusy.current) return; try { if (file.size > 12 * 1024 * 1024) throw new Error(); const data: unknown = JSON.parse((await file.text()).replace(/^\uFEFF/, '')); if (!isWork(data)) throw new Error(); setWork(migrateWork(data)); navigate(5); setNotice(data.version === 3 ? '기존 답안을 새 수행 순서로 불러왔습니다. 02 결측 데이터를 작성한 뒤 다시 제출해 주세요. 기존 제출 상태와 평가는 초기화되었습니다.' : '답안 파일을 불러왔습니다.'); } catch { setNotice('올바른 데이터픽 답안 JSON 파일을 선택해 주세요.'); } }
 function exportWork() { download(JSON.stringify(work, null, 2), `데이터픽_${work.name || '학생'}_${work.reviewed ? '평가결과' : '답안'}.json`, 'application/json'); }
 async function submit() {
  if (submissionBusy.current || !ready || work.submittedAt) return;
  if (!work.name.trim() || !/^\d{4}$/.test(work.classroom) || count < 5) { setNotice('4자리 학번과 이름, 다섯 수행의 필수 항목을 모두 작성해 주세요.'); return; }
  const metadata = work.answers.map(a => ({ ...a, image: '' }));
  if (new Blob([JSON.stringify({ name: work.name, classroom: work.classroom, answers: metadata })]).size > 4 * 1024 * 1024 - 4096) { setNotice('표 데이터와 답변 전체 용량이 큽니다. 선생님께 알려 주세요. 작성한 답안은 유지됩니다.'); return; }
  submissionBusy.current = true; setSubmitting(true);
  try {
   const answers = [];
   for (const answer of work.answers) {
    if (!answer.image) { answers.push(answer); continue; }
    const cacheKey = `${work.classroom}:${answer.image}`;
    let uploaded = uploadedImages.current.get(cacheKey);
    if (!uploaded) {
     const image = await fetch(answer.image).then(r => r.blob());
     const upload = await fetch('/api/submission-images', { method: 'POST', headers: { 'Content-Type': image.type, 'x-student-number': work.classroom }, body: image });
     const receipt = await upload.json().catch(() => null) as { error?: string; imagePath?: string; imageReceipt?: string } | null;
     if (!upload.ok || !receipt?.imagePath || !receipt.imageReceipt) throw new Error(receipt?.error || '이미지를 업로드하지 못했습니다. 다시 제출해 주세요.');
     uploaded = { imagePath: receipt.imagePath, imageReceipt: receipt.imageReceipt };
     uploadedImages.current.set(cacheKey, uploaded);
    }
    answers.push({ ...answer, image: '', ...uploaded });
   }
   const body = JSON.stringify({ name: work.name, classroom: work.classroom, answers });
   const response = await fetch('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
   const result = await response.json().catch(() => null) as { error?: string; submittedAt?: string } | null;
   if (!response.ok) throw new Error(result?.error || '제출하지 못했습니다. 잠시 후 다시 시도해 주세요.');
   if (typeof result?.submittedAt !== 'string') throw new Error('제출 결과를 확인하지 못했습니다. 선생님께 알려 주세요.');
   const submittedAt = result.submittedAt;
   setWork(w => ({ ...w, submittedAt, submittedToDb: true, reviewed: false }));
   uploadedImages.current.clear();
   setNotice('제출 완료! 학생 정보와 답안이 서버에 저장되었습니다.');
  } catch (error) { setNotice(error instanceof Error ? error.message : '연결을 확인한 뒤 다시 제출해 주세요.'); }
  finally { submissionBusy.current = false; setSubmitting(false); }
 }

 return <div className="app">
  {teacherLogin && <div className="teacher-login-backdrop"><section className="teacher-login-card" role="dialog" aria-modal="true" aria-labelledby="teacher-login-title"><h2 id="teacher-login-title">교사 평가실 로그인</h2><form onSubmit={loginTeacher}><label htmlFor="teacher-password">교사용 비밀번호</label><input id="teacher-password" type="password" autoComplete="current-password" autoFocus required disabled={teacherBusy} value={teacherPassword} onChange={e => setTeacherPassword(e.target.value)}/>{teacherError && <p role="alert">{teacherError}</p>}<div className="submit-buttons"><button type="button" className="button secondary" disabled={teacherBusy} onClick={() => { setTeacherLogin(false); setTeacherPassword(''); }}>취소</button><button className="button primary" disabled={teacherBusy}>{teacherBusy ? '확인 중…' : '로그인'}</button></div></form></section></div>}
  <header className="topbar"><Link className="brand" href="/"> <span className="brand-mark">d<span>·</span></span> 데이터픽 <small>CLASSROOM</small></Link><div className="mode-switch"><button className={!teacher ? 'selected' : ''} onClick={() => setTeacher(false)}>학생 작업실</button><button className={teacher ? 'selected' : ''} disabled={teacherBusy} onClick={enterTeacher}>교사 평가실</button>{teacher && <button disabled={teacherBusy} onClick={logoutTeacher}>로그아웃</button>}</div><span className="local-label"><i /> 데이터 분석 작업실</span></header>
  <div className="shell"><aside className="sidebar"><h2>데이터 분석 미션</h2><div className="side-divider"/><div className="nav-label"><span>30점</span></div><nav aria-label="수행 단계"><button className={`nav-item identity-nav ${active === -1 ? 'active' : ''}`} onClick={() => navigate(-1)}><span className="nav-num">00</span><span>기본 정보 입력</span><span className="nav-arrow">›</span></button>{tasks.map((t, i) => <button key={t.short} className={`nav-item ${active === i ? 'active' : ''}`} onClick={() => navigate(i)}><span className="nav-num">{complete[i] ? '✓' : `0${i + 1}`}</span><span>{t.short}</span><span className="nav-arrow">›</span></button>)}<button className={`nav-item review-nav ${active === 5 ? 'active' : ''}`} onClick={() => navigate(5)}><span className="nav-num">▤</span><span>{teacher ? '전체 답안 평가' : '검토 및 제출'}</span><span className="nav-arrow">›</span></button></nav></aside>
  <main>
   <input ref={importInput} type="file" accept=".json,application/json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void importWork(f); e.target.value = ''; }}/>
   {teacher && <div className="info-banner"><span>교사 평가</span><p>학생의 제출 파일을 불러와 평가하세요. 이 화면은 같은 브라우저의 답안을 보여주며, 교사 로그인은 연결되었으며, 서버 제출 목록 조회는 다음 단계에서 연결합니다.</p></div>}
   {active === -1 ? <section className="basic-info"><div className="section-heading"><span className="section-icon mint">00</span><div><h2>기본 정보 입력</h2><p>학번과 이름을 입력해 주세요.</p></div></div><div className="identity-card"><label htmlFor="student-number">학번 (4자리 / 예: 3101)<input id="student-number" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" required value={work.classroom} disabled={locked || teacher || !ready} onChange={e => setWork(w => ({ ...w, classroom: e.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="예: 3101"/></label><label htmlFor="student-name">이름<input id="student-name" required value={work.name} disabled={locked || teacher || !ready} onChange={e => setWork(w => ({ ...w, name: e.target.value }))} placeholder="이름 입력"/></label></div><p className="field-help identity-help">입력한 정보는 검토 및 제출과 제출 파일에 반영됩니다. · {saved}</p><div className="bottom-actions"><button className="button primary" onClick={() => navigate(0)}>이상 데이터 →</button></div></section> : active < 5 ? <><div className="task-layout"><div className="task-main"><section className="guide-card"><div className="section-heading"><span className="section-icon">↗</span><div><h2>{task.short}</h2><p>{task.tag}</p></div><span className="badge">작업 안내</span></div><p className="instruction-summary">{task.steps.join(" ▶ ")}</p></section>
   <section className="response-card"><div className="section-heading"><span className="section-icon mint">01</span><div><h2>{task.resultLabel}</h2><p>스프레드시트에서 얻은 결과를 남겨요</p></div><span className="required">필수</span></div><div className="response-body"><p className="field-help">{task.resultHint}</p>{active === 0 && <><div className="table-wrap anomaly-table"><table><thead><tr><th>열 이름</th><th>값</th><th>이상데이터라고 판단한 이유</th><th>행 삭제</th></tr></thead><tbody>{anomalyRows.map((row,i) => <tr key={i}>{(['column','value','reason'] as const).map((field,j) => <td key={field}><textarea aria-label={`${i+1}행 ${['열 이름','값','이상데이터라고 판단한 이유'][j]}`} disabled={locked || teacher} value={row[field]} onChange={e => updateRows(anomalyRows.map((r,index) => index === i ? { ...r, [field]: e.target.value } : r))}/></td>)}<td><button className="button secondary" disabled={locked || teacher} onClick={() => updateRows(anomalyRows.filter((_,index) => index !== i))}>행 삭제</button></td></tr>)}</tbody></table></div><button className="button secondary add-row" disabled={locked || teacher} onClick={() => updateRows([...anomalyRows,{ column: '', value: '', reason: '' }])}>+ 행 추가</button></>}{(active === 1 || active === 3) && <TablePaste value={answer.result} label={task.resultLabel} placeholder={task.placeholder} disabled={locked || teacher} onChange={value => update('result', value)}/>} {(active === 2 || active === 4) && <div className={`image-area ${answer.image ? 'has-image' : ''}`} tabIndex={0} onPaste={pasteImage} onDragOver={e => e.preventDefault()} onDrop={e => e.preventDefault()} aria-label="차트 캡처 이미지 붙여넣기">{answer.image ? <><a href={answer.image} target="_blank" rel="noreferrer"><img src={answer.image} alt="학생이 제출한 차트 캡처"/></a><div className="image-caption"><span>{answer.imageName}</span>{!locked && !teacher && <button onClick={() => { update('image', ''); update('imageName', ''); }}>이미지 삭제 ×</button>}</div></> : <><span className="upload-icon">▧</span><b>차트 캡처를 여기에 붙여넣으세요</b><p>영역을 클릭하고 <kbd>Ctrl</kbd> + <kbd>V</kbd></p></>}</div>}</div></section>
   {active > 1 && <section className="response-card"><div className="section-heading"><span className="section-icon lavender">02</span><div><h2>{task.explainLabel}</h2><p>결과를 넘어, 나의 생각과 근거를 써요</p></div><span className="required">필수</span></div><div className="response-body"><p className="field-help">{task.explainHint}</p><textarea className="explanation-input" aria-label={task.explainLabel} value={answer.explanation} disabled={locked || teacher} onChange={e => update('explanation', e.target.value)} placeholder={task.explainPlaceholder}/><div className="writing-footer"><span>정해진 문장보다 나만의 설명이 중요해요.</span><span>{answer.explanation.length}자</span></div></div></section>}
   {teacher && <Evaluation index={active} work={work} setWork={setWork}/>}
   <div className="bottom-actions"><button className="text-button" onClick={() => navigate(active - 1)}>{active === 0 ? '← 기본 정보 입력' : '← 이전 수행'}</button><span>{active === 1 ? complete[1] ? '✓ 결과 작성 완료' : '결측 행을 제거한 전체 데이터를 표로 붙여넣어 주세요' : active === 0 ? complete[0] ? '✓ 결과 작성 완료' : '표에 결과와 판단 이유를 작성해 주세요' : complete[active] ? '✓ 결과와 설명 작성 완료' : '결과와 설명을 모두 작성해 주세요'}</span><button className="button primary" onClick={() => navigate(active + 1)}>{active === 4 ? '전체 답안 검토' : '다음 수행'} →</button></div>
   </div></div></> : <div className="portfolio"><section className="identity-card review-identity"><div><h2>학생 정보</h2><p>기본 정보 입력에서 작성한 내용입니다.</p></div><dl><div><dt>학번</dt><dd>{work.classroom || '미입력'}</dd></div><div><dt>이름</dt><dd>{work.name || '미입력'}</dd></div></dl></section>
   {tasks.map((t, i) => <section key={t.short} className="portfolio-card"><header><span className="portfolio-number">0{i + 1}</span><div><h2>{t.title}</h2><p>{complete[i] ? i === 1 ? '결과 작성 완료' : '결과와 설명 작성 완료' : '작성할 내용이 남아 있어요'}</p></div><button className="button secondary" onClick={() => navigate(i)}>상세 보기 →</button></header><div className="portfolio-content"><div><span className="preview-label">분석 결과 증거</span>{i === 2 || i === 4 ? work.answers[i].image ? <a href={work.answers[i].image} target="_blank" rel="noreferrer"><img className="review-image" src={work.answers[i].image} alt="제출한 시각화 차트"/></a> : <p className="empty">첨부된 차트가 없습니다.</p> : work.answers[i].result ? i === 0 ? <AnomalyTable answer={work.answers[i]}/> : <TablePreview value={work.answers[i].result}/> : <p className="empty">입력한 결과가 없습니다.</p>}</div>{i > 1 && <div><span className="preview-label">나의 해석과 근거</span><p className={work.answers[i].explanation ? 'answer-text' : 'empty'}>{work.answers[i].explanation || '작성한 설명이 없습니다.'}</p></div>}</div>{teacher ? <Evaluation index={i} work={work} setWork={setWork}/> : work.reviewed && <div className="published-feedback"><b>{Number(((work.scores[i] ?? 0) * 0.24).toFixed(2))} / 6점</b><p>{work.feedback[i] || '등록된 피드백이 없습니다.'}</p></div>}</section>)}
   <section className="submit-card"><div><h2>{teacher ? '평가를 마무리하세요' : submitting ? '답안을 제출하고 있어요' : work.submittedToDb ? '제출이 완료되었습니다' : '내 탐구 포트폴리오 제출하기'}</h2><p>{teacher ? '각 수행의 점수와 피드백을 입력한 뒤 평가 결과 파일을 학생에게 전달하세요.' : '제출하기를 누르면 학번, 이름, 답변, 캡처 이미지와 표 데이터가 선생님께 전달됩니다.'}</p>{work.submittedAt && <small>{work.submittedToDb ? '서버 제출' : '파일 생성'}: {new Date(work.submittedAt).toLocaleString('ko-KR')}</small>}</div><div className="submit-buttons"><button className="button secondary" onClick={exportWork}>파일 내보내기 ↓</button>{teacher ? <button className="button primary" disabled={!locked || work.scores.some(s => s === null)} onClick={() => { const reviewed = { ...work, reviewed: true }; setWork(reviewed); download(JSON.stringify(reviewed, null, 2), `데이터픽_${work.name}_평가결과.json`, 'application/json'); setNotice('평가 결과 파일을 내려받았습니다.'); }}>평가 완료 · 결과 내보내기</button> : work.submittedAt ? <button className="button secondary" onClick={() => { setWork(w => ({ ...w, submittedAt: '', submittedToDb: false, reviewed: false, scores: [null, null, null, null, null], feedback: ['', '', '', '', ''] })); setNotice('수정을 시작했습니다. 수정 후 제출 파일을 새로 생성하세요.'); }}>답안 수정하기</button> : <button className="button primary" disabled={submitting || !ready} onClick={submit}>{submitting ? '제출 중…' : '제출하기'}</button>}</div></section><p className="storage-note">작성 중 답안은 현재 브라우저에 저장되고, 제출하기를 누르면 서버에도 저장됩니다. 다른 기기에서는 내보낸 답안 파일을 불러와 이어서 작업할 수 있어요.</p>
   </div>}
  </main></div>{notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="알림 닫기">×</button></div>}
 </div>;
}
function Evaluation({ index, work, setWork }: { index: number; work: Work; setWork: React.Dispatch<React.SetStateAction<Work>> }) {
 return <div className="evaluation"><div className="evaluation-heading"><h3>교사 평가 · 수행 0{index + 1}</h3><label>점수 <input type="number" min="0" max="6" step="0.24" disabled={!work.submittedAt} value={work.scores[index] === null ? '' : Number(((work.scores[index] ?? 0) * 0.24).toFixed(2))} onChange={e => { const n = e.target.value === '' ? null : Math.round(Number(e.target.value) / 0.24); if (n !== null && (!Number.isInteger(n) || n < 0 || n > 25)) return; setWork(w => ({ ...w, reviewed: false, scores: w.scores.map((s, i) => i === index ? n : s) })); }}/><span>/ 6점</span></label></div><p className="field-help">{index === 1 ? '결측 행 제거 여부, 전체 데이터 제출 여부, 열 순서와 값의 정확성을 평가하세요. ' : ''}5.04~6: 정확한 결과와 구체적 근거 · 3.84~4.8: 대체로 정확하나 설명 일부 부족 · 0.24~3.6: 오류 또는 근거 부족 · 0: 수행 증거 없음</p><textarea aria-label={`수행 ${index + 1} 교사 피드백`} disabled={!work.submittedAt} value={work.feedback[index]} onChange={e => setWork(w => ({ ...w, reviewed: false, feedback: w.feedback.map((f, i) => i === index ? e.target.value : f) }))} placeholder={work.submittedAt ? '잘한 점과 보완할 점을 구체적으로 남겨 주세요.' : '학생이 제출 파일을 생성한 후 평가할 수 있습니다.'}/></div>;
}
