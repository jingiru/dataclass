'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import { isTableResult, parseTable } from './table-data';

type Summary = { id: string; student_name: string; classroom: string; submitted_at: string };
type Answer = { result: string; explanation: string; image: string; imageName: string; rows?: { column: string; value: string; reason: string }[] };
type Submission = Summary & { answers: Answer[] };
const titles = ['이상 데이터 찾기', '결측 데이터', '차트로 표현하고 의미 해석하기', '피봇 테이블로 정보 추출하기', '데이터 관계 해석'];
export default function TeacherWorkspace() {
 const [rows, setRows] = useState<Summary[]>([]), [selected, setSelected] = useState<Submission | null>(null);
 const [classroom, setClassroom] = useState('all'), [revision, setRevision] = useState(0);
 const [busy, setBusy] = useState(true), [error, setError] = useState(''), [detailBusy, setDetailBusy] = useState(false);
 const [selectedId, setSelectedId] = useState('');
 useEffect(() => {
  const controller = new AbortController();
  async function load() {
   setBusy(true); setError(''); setRows([]);
   try {
    const all: Summary[] = [];
    for (let page = 0; ; page++) {
     const response = await fetch(`/api/teacher/submissions?page=${page}`, { cache: 'no-store', signal: controller.signal });
     const data = await response.json() as { error?: string; submissions: Summary[]; hasMore: boolean };
     if (!response.ok) throw new Error(data.error || '목록을 불러오지 못했습니다.');
     all.push(...data.submissions); if (!data.hasMore) break;
    }
    const latest = new Map<string, Summary>();
    for (const row of all) { const previous = latest.get(row.classroom); if (!previous || row.submitted_at > previous.submitted_at) latest.set(row.classroom, row); }
    setRows([...latest.values()].sort((a,b) => a.classroom.localeCompare(b.classroom, 'en', { numeric:true })));
   } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '다시 시도해 주세요.'); }
   finally { if (!controller.signal.aborted) setBusy(false); }
  }
  void load(); return () => controller.abort();
 }, [revision]);
 useEffect(() => {
  if (!selectedId) return;
  const controller = new AbortController();
  async function load() {
   setSelected(null); setDetailBusy(true); setError('');
   try {
    const response = await fetch(`/api/teacher/submissions?id=${selectedId}`, { cache: 'no-store', signal: controller.signal });
    const data = await response.json() as { error?: string; submission: Submission };
    if (!response.ok) throw new Error(data.error || '답안을 불러오지 못했습니다.');
    setSelected(data.submission);
   } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '다시 시도해 주세요.'); }
   finally { if (!controller.signal.aborted) setDetailBusy(false); }
  }
  void load(); return () => controller.abort();
 }, [selectedId, revision]);
 const classOf = (number: string) => /^\d{4}$/.test(number) ? number[1] : 'unknown';
 const classes = [...new Set(rows.map(row => classOf(row.classroom)))].sort((a,b) => a.localeCompare(b, 'en', { numeric:true }));
 return <main className="teacher-workspace"><div className="section-heading"><div><h2>학생 제출 답안</h2><p>학생을 선택하면 제출한 표, 설명과 캡처 이미지를 확인할 수 있습니다.</p></div><button className="button secondary" disabled={busy || detailBusy} onClick={() => setRevision(v => v + 1)}>새로고침</button></div>{error && <p role="alert">{error}</p>}
 <nav className="class-tabs" aria-label="학급 선택"><button className={classroom === 'all' ? 'active' : ''} onClick={() => setClassroom('all')}>전체 학급</button>{classes.map(c => <button key={c} className={classroom === c ? 'active' : ''} onClick={() => setClassroom(c)}>{c === 'unknown' ? '학번 확인 필요' : c + '반'}</button>)}</nav>
 {busy ? <p role="status">제출 목록을 불러오는 중…</p> : rows.length === 0 ? <section className="guide-card"><p>제출된 답안이 없습니다.</p></section> : classes.filter(c => classroom === 'all' || classroom === c).map(c => <section className="class-section" key={c}><h3>{c === 'unknown' ? '학번 확인 필요' : c + '반'}</h3><div className="student-card-grid">{rows.filter(row => classOf(row.classroom) === c).map(row => <button key={row.id} className={`student-answer-card ${selectedId === row.id ? 'selected' : ''}`} aria-pressed={selectedId === row.id} onClick={() => setSelectedId(row.id)}><span className="student-card-number">{row.classroom}</span><span className="student-card-name">{row.student_name}</span><span className="student-card-score">채점 전</span></button>)}</div></section>)}

 {detailBusy && <p role="status">답안을 불러오는 중…</p>}{selected && <section className="portfolio teacher-answer-review" aria-label="학생 제출 답안 상세"><section className="identity-card review-identity"><div><h2>학생 정보</h2><p>학생이 제출한 답안입니다.</p></div><dl><div><dt>학번</dt><dd>{selected.classroom}</dd></div><div><dt>이름</dt><dd>{selected.student_name}</dd></div></dl></section>{selected.answers.map((a, i) => {
 const anomalyRows = a.rows ?? (a.result.trim() ? [{ column: '', value: a.result, reason: a.explanation }] : []);
 const complete = i === 0 ? anomalyRows.some(r => r.column.trim() && r.value.trim() && r.reason.trim()) && anomalyRows.filter(r => r.column.trim() || r.value.trim() || r.reason.trim()).every(r => r.column.trim() && r.value.trim() && r.reason.trim()) : i === 1 ? isTableResult(a.result) : a.explanation.trim() && (i === 2 || i === 4 ? a.image : isTableResult(a.result));
 return <article className="portfolio-card" key={selected.id + ':' + i}><header><span className="portfolio-number">0{i + 1}</span><div><h2>{titles[i]}</h2><p>{complete ? i === 1 ? '결과 작성 완료' : '결과와 설명 작성 완료' : '작성할 내용이 남아 있어요'}</p></div></header><div className="portfolio-content"><div id={`teacher-evidence-${i}`}><span className="preview-label">분석 결과 증거</span>{i === 2 || i === 4 ? a.image ? <a href={a.image} target="_blank" rel="noreferrer"><img className="review-image" src={a.image} alt="제출한 시각화 차트" onError={() => setError('이미지를 불러오지 못했습니다. 로그인 상태를 확인하고 새로고침해 주세요.')}/></a> : <p className="empty">첨부된 차트가 없습니다.</p> : a.result ? i === 0 ? <div className="table-wrap"><table><thead><tr><th>열 이름</th><th>값</th><th>이상데이터라고 판단한 이유</th></tr></thead><tbody>{anomalyRows.map((r,j) => <tr key={j}><td>{r.column}</td><td>{r.value}</td><td>{r.reason}</td></tr>)}</tbody></table></div> : <div className="table-wrap"><table><tbody>{parseTable(a.result).map((row,j) => <tr key={j}>{row.map((cell,k) => j === 0 ? <th key={k}>{cell}</th> : <td key={k}>{cell}</td>)}</tr>)}</tbody></table></div> : <p className="empty">입력한 결과가 없습니다.</p>}</div>{i > 1 && <div><span className="preview-label">나의 해석과 근거</span><p className={a.explanation ? 'answer-text' : 'empty'}>{a.explanation || '작성한 설명이 없습니다.'}</p></div>}</div></article>;
 })}</section>}

 </main>;
}
