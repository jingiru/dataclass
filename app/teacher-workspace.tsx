'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import { parseTable } from './table-data';

type Summary = { id: string; student_name: string; classroom: string; submitted_at: string };
type Answer = { result: string; explanation: string; image: string; imageName: string; rows?: { column: string; value: string; reason: string }[] };
type Submission = Summary & { answers: Answer[] };
const titles = ['이상 데이터', '결측 데이터', '시각화와 해석', '피봇 테이블', '데이터 관계 해석'];
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

 {detailBusy && <p role="status">답안을 불러오는 중…</p>}{selected && <section><h2>{selected.classroom} · {selected.student_name}</h2><p>제출: {new Date(selected.submitted_at).toLocaleString('ko-KR')}</p>{selected.answers.map((a, i) => <article className="portfolio-card" key={i}><h3>0{i + 1} {titles[i]}</h3>{a.rows && <div className="table-wrap"><table><thead><tr><th>열 이름</th><th>값</th><th>판단 이유</th></tr></thead><tbody>{a.rows.map((r, j) => <tr key={j}><td>{r.column}</td><td>{r.value}</td><td>{r.reason}</td></tr>)}</tbody></table></div>}{a.result && !a.rows && <div className="table-wrap"><table><tbody>{parseTable(a.result).map((row, j) => <tr key={j}>{row.map((cell, k) => j === 0 ? <th key={k}>{cell}</th> : <td key={k}>{cell}</td>)}</tr>)}</tbody></table></div>}{a.image && <figure><a href={a.image} target="_blank" rel="noreferrer"><img className="review-image" src={a.image} alt={`${titles[i]} 캡처`} onError={e => { e.currentTarget.hidden = true; setError('이미지를 불러오지 못했습니다. 로그인 상태를 확인하고 새로고침해 주세요.'); }}/></a><figcaption>{a.imageName}</figcaption></figure>}{a.explanation && <><h4>학생 설명</h4><p className="answer-text">{a.explanation}</p></>}</article>)}</section>}
 </main>;
}
