'use client';
/* eslint-disable @next/next/no-img-element */
import { useRef, useState, type FormEvent } from 'react';
import type { GradeItem } from './grading';
import { parseTable } from './table-data';
type Lookup = { submission: { student_name: string; classroom: string; round: number; submitted_at: string; answers: { result: string; explanation: string; image: string; rows?: { column: string; value: string; reason: string }[] }[] }; result: { items: GradeItem[]; total: number } | null };
const titles = ['이상 데이터 찾기', '결측 데이터', '차트로 표현하고 의미 해석하기', '피봇 테이블로 정보 추출하기', '데이터 관계 해석'];
export default function StudentResults() {
  const [classroom, setClassroom] = useState(''), [name, setName] = useState(''), [round, setRound] = useState(2);
  const [data, setData] = useState<Lookup | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function lookup(event: FormEvent) {
    event.preventDefault(); if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setData(null);
    try {
      const response = await fetch('/api/student-results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classroom: classroom.trim(), name: name.trim(), round }), cache: 'no-store' });
      const value = await response.json() as Lookup & { error?: string }; if (!response.ok) throw new Error(value.error || '조회하지 못했습니다.'); setData(value);
    } catch (error) { setError(error instanceof Error ? error.message : '연결을 확인한 뒤 다시 조회해 주세요.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div className="portfolio student-results">
    <div className="section-heading"><div><h2>점수 확인</h2><p>학번과 이름을 입력하고 회차를 선택하면 최근 제출 내역과 공개된 평가 결과를 확인할 수 있어요.</p></div></div>
    <form className="score-lookup-form identity-card" onSubmit={lookup}>
      <label htmlFor="score-classroom">학번<input id="score-classroom" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required value={classroom} disabled={busy} onChange={e => { setClassroom(e.target.value); setData(null); }} placeholder="예: 1201" /></label>
      <label htmlFor="score-name">이름<input id="score-name" maxLength={100} required value={name} disabled={busy} onChange={e => { setName(e.target.value); setData(null); }} /></label>
      <label htmlFor="score-round">회차<select id="score-round" value={round} disabled={busy} onChange={e => { setRound(Number(e.target.value)); setData(null); }}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}회차</option>)}</select></label>
      <button className="button primary" disabled={busy}>{busy ? '조회 중…' : '조회'}</button>
    </form>
    {error && <p className="teacher-alert error" role="alert">{error}</p>}
    <div aria-live="polite">{data && <>
      <section className="student-score-result"><h2>{data.result ? `평가 결과 · ${data.result.total}/30점` : '평가 결과 공개 전'}</h2>
        {data.result ? <div className="table-wrap"><table className="score-result-table"><thead><tr><th scope="col">평가 요소</th><th scope="col">점수</th><th scope="col">코멘트</th></tr></thead><tbody>{data.result.items.map(item => <tr key={item.key}><th scope="row">{item.title}</th><td>{item.score}/10점</td><td>{item.comment || '등록된 코멘트가 없습니다.'}</td></tr>)}</tbody></table></div> : <p>선생님이 학급 점수를 공개하면 점수와 코멘트를 확인할 수 있습니다.</p>}
      </section>
      <section className="identity-card review-identity"><div><h2>{data.submission.student_name} 학생의 제출 내역</h2><p>{data.submission.classroom} · {data.submission.round}회차 · {new Date(data.submission.submitted_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 제출</p></div></section>
      {data.submission.answers.map((a, i) => <article className="portfolio-card" key={i}><header><span className="portfolio-number">0{i + 1}</span><h2>{titles[i]}</h2></header><div className="portfolio-content"><div><span className="preview-label">분석 결과 증거</span>{i === 2 || i === 4 ? a.image ? <a href={a.image} target="_blank" rel="noreferrer"><img className="review-image" src={a.image} alt="제출 차트" /></a> : <p className="empty">차트 없음</p> : a.result ? i === 0 ? <div className="table-wrap"><table><thead><tr><th>열 이름</th><th>값</th><th>이유</th></tr></thead><tbody>{(a.rows ?? []).map((r, j) => <tr key={j}><td>{r.column}</td><td>{r.value}</td><td>{r.reason}</td></tr>)}</tbody></table></div> : <div className="table-wrap"><table><tbody>{parseTable(a.result).map((r, j) => <tr key={j}>{r.map((x, k) => j ? <td key={k}>{x}</td> : <th key={k}>{x}</th>)}</tr>)}</tbody></table></div> : <p className="empty">결과 없음</p>}</div>{i > 1 && <div><span className="preview-label">해석과 근거</span><p className="answer-text">{a.explanation || '설명 없음'}</p></div>}</div></article>)}
    </>}</div>
  </div>;
}
