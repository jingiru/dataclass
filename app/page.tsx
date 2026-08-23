'use client';

import { useEffect, useMemo, useState } from 'react';

type ViewMode = 'student' | 'teacher';
type TeacherTab = 'results' | 'missions' | 'rubric';
type TeacherScores = { clean: number; chart: number; read: number };
type StudentAnswers = {
  outlierRows: number[];
  missingRows: number[];
  missingChoice: string;
  outlierChoice: string;
  median: string;
  chartType: string;
  xAxis: string;
  yAxis: string;
  chartTitle: string;
  finding: string;
  evidence: string[];
  decision: string;
  limitation: string;
  claim: string;
};

type Mission = {
  emoji: string;
  category: string;
  title: string;
  question: string;
  skill: string;
  tone: string;
};

const missions: Mission[] = [
  { emoji: '🍽️', category: '급식 만족도', title: '다음 달 급식, 무엇을 바꿀까?', question: '만족도와 잔반량을 함께 분석해 식단 개선안을 제안해요.', skill: '결측치 · 산점도 · 의사결정', tone: 'mint' },
  { emoji: '📈', category: '성적', title: '평균이 오르면 모두가 성장한 걸까?', question: '평균 점수 뒤에 숨은 분포와 과목별 차이를 찾아요.', skill: '평균 · 중앙값 · 분포', tone: 'blue' },
  { emoji: '🏫', category: '고교 진학', title: '나에게 맞는 학교는 어디일까?', question: '통학 시간과 교육과정 데이터를 바탕으로 선택 기준을 만들어요.', skill: '가중치 · 비교표 · 판단', tone: 'yellow' },
  { emoji: '💬', category: '관계·연애', title: '답장이 늦으면 관심이 적은 걸까?', question: '메시지 응답 시간과 친밀도 설문의 관계를 비판적으로 살펴요.', skill: '상관관계 · 인과관계', tone: 'pink' },
  { emoji: '🚲', category: '자전거', title: '가장 안전한 등굣길을 찾아라', question: '거리·경사·사고 데이터를 분석해 추천 경로를 정해요.', skill: '지도 데이터 · 다중 조건', tone: 'green' },
  { emoji: '▶', category: '유튜브', title: '조회수 높은 영상이 더 좋은 영상일까?', question: '조회수·시청 지속시간·반응률로 채널의 성장을 분석해요.', skill: '비율 · 이상치 · 비교', tone: 'red' },
  { emoji: '◎', category: '인스타그램', title: '언제 올려야 반응이 좋을까?', question: '게시 시간대와 도달률 데이터를 이용해 업로드 시간을 추천해요.', skill: '시간대 · 표본 수 · 추세', tone: 'purple' },
];

const rows = [
  { id: 1, menu: '마라탕', rating: '5', waste: 12, votes: 28 },
  { id: 2, menu: '치즈돈가스', rating: '4', waste: 18, votes: 31 },
  { id: 3, menu: '잔치국수', rating: '', waste: 24, votes: 19 },
  { id: 4, menu: '닭갈비덮밥', rating: '4', waste: 15, votes: 26 },
  { id: 5, menu: '떡볶이', rating: '14', waste: 10, votes: 35 },
  { id: 6, menu: '채소비빔밥', rating: '3', waste: 31, votes: 16 },
];

const chartRows = [
  { menu: '마라탕', rating: 5, waste: 12, color: '#ff735f' },
  { menu: '치즈돈가스', rating: 4, waste: 18, color: '#f3b84b' },
  { menu: '잔치국수', rating: 3.7, waste: 24, color: '#5687d8' },
  { menu: '닭갈비덮밥', rating: 4, waste: 15, color: '#7ab788' },
  { menu: '떡볶이', rating: 4, waste: 10, color: '#dc6b96' },
  { menu: '채소비빔밥', rating: 3, waste: 31, color: '#8b73c9' },
];

const stepInfo = [
  { short: '파악(이상치)', kicker: 'STEP 01 · 데이터 파악(이상치)', title: '범위를 벗어난 값을 찾아보세요', desc: '각 항목에 입력될 수 있는 값의 범위를 확인하고 이상치로 판단한 행을 선택하세요.' },
  { short: '파악(결측치)', kicker: 'STEP 02 · 데이터 파악(결측치)', title: '비어 있는 값을 찾아보세요', desc: '필요한 값이 기록되지 않은 행을 찾아 선택하세요.' },
  { short: '정제하기', kicker: 'STEP 03 · 데이터 정제', title: '어떻게 고치는 것이 좋을까요?', desc: '데이터의 의미를 해치지 않도록 정제 방법을 결정하고 통계량을 확인하세요.' },
  { short: '시각화', kicker: 'STEP 04 · 분석 및 시각화', title: '관계를 가장 잘 보여 주는 그래프는?', desc: '분석 목적에 맞게 변수와 그래프를 설계해 보세요.' },
  { short: '해석·판단', kicker: 'STEP 05 · 해석 및 판단', title: '데이터로 급식 개선안을 설득하세요', desc: '발견한 특징에 수치 근거를 연결하고 실행할 수 있는 제안을 완성하세요.' },
  { short: '제출 상태', kicker: 'SUBMISSION STATUS', title: '분석 결과를 제출했어요', desc: '교사가 답안과 자동채점 근거를 검토하고 최종 승인하면 결과가 공개됩니다.' },
];

const classResults = [
  { no: 1, name: '김하늘', clean: 10, chart: 10, read: 10, status: '승인 대기', flag: '최종 검토' },
  { no: 2, name: '박서준', clean: 10, chart: 7, read: 7, status: '승인 대기', flag: '그래프 재검토' },
  { no: 3, name: '이도윤', clean: 7, chart: 10, read: 7, status: '승인 완료', flag: '' },
  { no: 4, name: '최유진', clean: 10, chart: 10, read: 7, status: '승인 완료', flag: '' },
  { no: 5, name: '정민재', clean: 4, chart: 7, read: 4, status: '검토 필요', flag: '근거 부족' },
  { no: 6, name: '한지우', clean: 10, chart: 10, read: 10, status: '승인 완료', flag: '' },
  { no: 7, name: '오시은', clean: 7, chart: 7, read: 10, status: '승인 완료', flag: '' },
  { no: 8, name: '윤재민', clean: 0, chart: 0, read: 0, status: '진행 중', flag: '' },
];

function sameIds(values: number[], expected: number[]) {
  return values.length === expected.length && expected.every((id) => values.includes(id));
}

function rubricLevel(raw: number, max: number, attempted: boolean) {
  if (!attempted) return 0;
  const ratio = raw / max;
  if (ratio >= 0.8) return 10;
  if (ratio >= 0.5) return 7;
  return 4;
}

export default function Home() {
  const [view, setView] = useState<ViewMode>('student');
  const [activeStep, setActiveStep] = useState(0);
  const [outlierRows, setOutlierRows] = useState<number[]>([]);
  const [missingRows, setMissingRows] = useState<number[]>([]);
  const [missingChoice, setMissingChoice] = useState('');
  const [outlierChoice, setOutlierChoice] = useState('');
  const [median, setMedian] = useState('');
  const [chartType, setChartType] = useState('');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [chartTitle, setChartTitle] = useState('');
  const [finding, setFinding] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [decision, setDecision] = useState('');
  const [limitation, setLimitation] = useState('');
  const [claim, setClaim] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [teacherApproved, setTeacherApproved] = useState(false);
  const [approvedScores, setApprovedScores] = useState({ clean: 0, chart: 0, read: 0 });
  const [showMissions, setShowMissions] = useState(false);
  const [toast, setToast] = useState('');
  const [teacherFilter, setTeacherFilter] = useState<'all' | 'review'>('all');
  const [selectedStudent, setSelectedStudent] = useState('김하늘');

  useEffect(() => {
    const saved = window.localStorage.getItem('datapick-demo-v2');
    if (!saved) return;
    try {
      const state = JSON.parse(saved);
      if (typeof state.activeStep === 'number') setActiveStep(state.activeStep);
      if (Array.isArray(state.outlierRows)) setOutlierRows(state.outlierRows);
      if (Array.isArray(state.missingRows)) setMissingRows(state.missingRows);
      if (state.missingChoice) setMissingChoice(state.missingChoice);
      if (state.outlierChoice) setOutlierChoice(state.outlierChoice);
      if (state.median) setMedian(state.median);
      if (state.chartType) setChartType(state.chartType);
      if (state.xAxis) setXAxis(state.xAxis);
      if (state.yAxis) setYAxis(state.yAxis);
      if (state.chartTitle) setChartTitle(state.chartTitle);
      if (state.finding) setFinding(state.finding);
      if (Array.isArray(state.evidence)) setEvidence(state.evidence);
      if (state.decision) setDecision(state.decision);
      if (state.limitation) setLimitation(state.limitation);
      if (state.claim) setClaim(state.claim);
      if (state.submitted) setSubmitted(true);
      if (state.teacherApproved) setTeacherApproved(true);
      if (state.approvedScores) setApprovedScores(state.approvedScores);
    } catch {
      window.localStorage.removeItem('datapick-demo-v2');
    }
  }, []);

  useEffect(() => {
    const state = { activeStep, outlierRows, missingRows, missingChoice, outlierChoice, median, chartType, xAxis, yAxis, chartTitle, finding, evidence, decision, limitation, claim, submitted, teacherApproved, approvedScores };
    window.localStorage.setItem('datapick-demo-v2', JSON.stringify(state));
  }, [activeStep, outlierRows, missingRows, missingChoice, outlierChoice, median, chartType, xAxis, yAxis, chartTitle, finding, evidence, decision, limitation, claim, submitted, teacherApproved, approvedScores]);

  const dataRaw = (sameIds(outlierRows, [5]) ? 1.5 : outlierRows.length ? 0.5 : 0)
    + (sameIds(missingRows, [3]) ? 1.5 : missingRows.length ? 0.5 : 0)
    + (missingChoice === 'mean' ? 2 : missingChoice ? 1 : 0)
    + (outlierChoice === 'source' ? 2 : outlierChoice ? 1 : 0)
    + (Number(median) === 4 ? 1 : median ? 0.5 : 0);
  const dataAttempted = Boolean(outlierRows.length || missingRows.length || missingChoice || outlierChoice || median);
  const dataScore = rubricLevel(dataRaw, 8, dataAttempted);

  const vizRaw = (chartType === 'scatter' ? 3 : chartType ? 1 : 0)
    + (xAxis === 'rating' ? 2 : xAxis ? 0.5 : 0)
    + (yAxis === 'waste' ? 2 : yAxis ? 0.5 : 0)
    + (/만족|잔반/.test(chartTitle) && chartTitle.trim().length >= 8 ? 1 : chartTitle ? 0.5 : 0);
  const vizAttempted = Boolean(chartType || xAxis || yAxis || chartTitle);
  const vizScore = rubricLevel(vizRaw, 8, vizAttempted);

  const interpretationRaw = (finding === 'negative' ? 3 : finding ? 1 : 0)
    + (evidence.includes('veg') ? 1.5 : 0)
    + (evidence.includes('mara') ? 1.5 : 0)
    + (decision === 'improve' ? 2 : decision ? 0.5 : 0)
    + (limitation === 'other' ? 1 : limitation ? 0.5 : 0)
    + (claim.trim().length >= 20 && /만족|잔반|메뉴/.test(claim) ? 1 : claim ? 0.5 : 0);
  const interpretationAttempted = Boolean(finding || evidence.length || decision || limitation || claim);
  const interpretationScore = rubricLevel(interpretationRaw, 10, interpretationAttempted);
  const totalScore = dataScore + vizScore + interpretationScore;
  const progressParts = [outlierRows.length > 0, missingRows.length > 0, Boolean(missingChoice || outlierChoice || median), vizAttempted, interpretationAttempted, submitted];
  const progress = Math.min(100, Math.round((progressParts.filter(Boolean).length / progressParts.length) * 100));

  const rubric = useMemo(() => {
    if (activeStep < 3) return { title: '데이터 파악 및 정제', text: '항목과 특성을 파악하고 결측치·이상치·통계 정보를 정확히 확인했는지 평가해요.', checks: ['이상치 응답', '결측치 응답', '정제 방법 선택', '통계 정보 입력'], done: [outlierRows.length > 0, missingRows.length > 0, Boolean(missingChoice && outlierChoice), Boolean(median)] };
    if (activeStep === 3) return { title: '데이터 분석 및 시각화', text: '분석 목적에 맞는 변수를 고르고 적절한 그래프로 정확하게 나타냈는지 평가해요.', checks: ['분석 질문 확인', '변수 선택', '그래프 유형', '제목 입력'], done: [true, Boolean(xAxis && yAxis), Boolean(chartType), chartTitle.length > 0] };
    return { title: '데이터 해석 및 판단', text: '의미 있는 특징을 찾고 수치 근거와 주장을 논리적으로 연결했는지 평가해요.', checks: ['특징 응답', '수치 근거 선택', '해결 방안 작성', '한계 응답'], done: [Boolean(finding), evidence.length > 0, Boolean(decision && claim), Boolean(limitation)] };
  }, [activeStep, outlierRows, missingRows, missingChoice, outlierChoice, median, xAxis, yAxis, chartType, chartTitle, finding, evidence, decision, limitation, claim]);

  function toggleRow(id: number, type: 'outlier' | 'missing') {
    const setter = type === 'outlier' ? setOutlierRows : setMissingRows;
    setter((current) => current.includes(id) ? current.filter((rowId) => rowId !== id) : [...current, id]);
  }

  function nextStep() {
    setActiveStep((current) => Math.min(5, current + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function saveResponse() {
    setToast('응답을 저장했습니다. 정답과 점수는 교사 승인 후 공개됩니다.');
    window.setTimeout(() => setToast(''), 2800);
  }

  function toggleEvidence(id: string) {
    setEvidence((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function submitMission() {
    setSubmitted(true);
    setTeacherApproved(false);
    setActiveStep(5);
    setToast('제출이 완료되었습니다. 교사의 최종 검토를 기다려 주세요.');
    window.setTimeout(() => setToast(''), 3000);
  }

  function resetDemo() {
    window.localStorage.removeItem('datapick-demo-v2');
    setOutlierRows([]); setMissingRows([]); setMissingChoice(''); setOutlierChoice(''); setMedian('');
    setChartType(''); setXAxis(''); setYAxis(''); setChartTitle(''); setFinding(''); setEvidence([]);
    setDecision(''); setLimitation(''); setClaim(''); setSubmitted(false); setTeacherApproved(false); setApprovedScores({ clean: 0, chart: 0, read: 0 }); setActiveStep(0);
  }

  if (view === 'teacher') {
    return <TeacherDashboard onStudent={() => setView('student')} filter={teacherFilter} setFilter={setTeacherFilter} selectedStudent={selectedStudent} setSelectedStudent={setSelectedStudent} submitted={submitted} teacherApproved={teacherApproved} autoScores={{ clean: dataScore, chart: vizScore, read: interpretationScore }} approvedScores={approvedScores} onApprove={(scores) => { setApprovedScores(scores); setTeacherApproved(true); }} answers={{ outlierRows, missingRows, missingChoice, outlierChoice, median, chartType, xAxis, yAxis, chartTitle, finding, evidence, decision, limitation, claim }} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand brand-button" onClick={() => setShowMissions(true)} aria-label="미션 보관함 열기">
          <span className="brand-mark">D</span><span>데이터픽</span>
        </button>
        <div className="class-pill">2학년 데이터 분석 · 수행평가</div>
        <div className="top-actions">
          <button className="view-switch" onClick={() => setView('teacher')}>교사 화면 보기</button>
          <div className="student-chip"><span className="student-avatar">김</span><span><b>김하늘</b><small>2학년 3반 12번</small></span></div>
        </div>
      </header>

      <div className="workspace">
        <aside className="side-panel">
          <div>
            <p className="eyebrow">TODAY&apos;S MISSION</p>
            <h2>우리 학교 급식,<br />어떻게 바꿀까?</h2>
            <p className="side-copy">학생 만족도와 잔반 데이터를 분석해 다음 달 식단에 반영할 제안을 만들어 보세요.</p>
            <button className="mission-library-link" onClick={() => setShowMissions(true)}>다른 미션 둘러보기 <span>7</span></button>
          </div>
          <nav className="step-list" aria-label="평가 단계">
            {stepInfo.map((step, index) => (
              <button key={step.short} className={`step-item ${index === activeStep ? 'active' : ''} ${index < activeStep ? 'complete' : ''}`} onClick={() => setActiveStep(index)}>
                <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="step-name">{step.short}<small>{index < activeStep ? '완료' : index === activeStep ? '진행 중' : '대기'}</small></span>
                <span className="step-dot">{index < activeStep ? '✓' : ''}</span>
              </button>
            ))}
          </nav>
          <div className="score-preview">
            <span>현재 진행률</span><strong>{progress}%</strong>
            <div><i style={{ width: `${progress}%` }} /></div>
            <small>이 브라우저에 작업 내용이 자동 저장돼요</small>
          </div>
        </aside>

        <section className="main-panel">
          <div className="mission-header">
            <div>
              <p className="stage-label">{stepInfo[activeStep].kicker}</p>
              <h1>{stepInfo[activeStep].title}</h1>
              <p>{stepInfo[activeStep].desc}</p>
            </div>
            {activeStep < 5 && <div className="timer-card"><small>남은 시간</small><strong>32:18</strong><span>자동 저장됨</span></div>}
          </div>

          {activeStep === 0 && <DataInspectStep issue="outlier" selectedRows={outlierRows} chooseRow={(id) => toggleRow(id, 'outlier')} save={saveResponse} next={nextStep} />}
          {activeStep === 1 && <DataInspectStep issue="missing" selectedRows={missingRows} chooseRow={(id) => toggleRow(id, 'missing')} save={saveResponse} next={nextStep} />}
          {activeStep === 2 && <CleaningStep missingChoice={missingChoice} setMissingChoice={setMissingChoice} outlierChoice={outlierChoice} setOutlierChoice={setOutlierChoice} median={median} setMedian={setMedian} next={nextStep} />}
          {activeStep === 3 && <VisualizationStep chartType={chartType} setChartType={setChartType} xAxis={xAxis} setXAxis={setXAxis} yAxis={yAxis} setYAxis={setYAxis} chartTitle={chartTitle} setChartTitle={setChartTitle} next={nextStep} />}
          {activeStep === 4 && <InterpretationStep chartType={chartType} chartTitle={chartTitle} finding={finding} setFinding={setFinding} evidence={evidence} toggleEvidence={toggleEvidence} decision={decision} setDecision={setDecision} limitation={limitation} setLimitation={setLimitation} claim={claim} setClaim={setClaim} submit={submitMission} />}
          {activeStep === 5 && <ResultStep approvedScores={approvedScores} submitted={submitted} teacherApproved={teacherApproved} goTeacher={() => setView('teacher')} reset={resetDemo} />}
        </section>

        <aside className="rubric-panel">
          <div className="rubric-head"><span>현재 평가 기준</span><b className="review-state">{teacherApproved ? '승인됨' : '검토 전'}</b></div>
          <div className="rubric-body">
            <div className="rubric-icon">◎</div>
            <h3>{rubric.title}</h3>
            <p>{rubric.text}</p>
            <ul>{rubric.checks.map((item, index) => <li className={rubric.done[index] ? 'done' : ''} key={item}><i>{rubric.done[index] ? '✓' : ''}</i>{item}</li>)}</ul>
          </div>
          <div className="teacher-note"><span>결과 공개 안내</span><p>응답 저장 중에는 정답이나 점수가 공개되지 않습니다. 교사가 최종 승인한 뒤에만 결과를 확인할 수 있어요.</p></div>
        </aside>
      </div>

      {showMissions && <MissionLibrary close={() => setShowMissions(false)} />}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}

function DataInspectStep({ issue, selectedRows, chooseRow, save, next }: { issue: 'outlier' | 'missing'; selectedRows: number[]; chooseRow: (id: number) => void; save: () => void; next: () => void }) {
  const isOutlier = issue === 'outlier';
  return (
    <>
      <div className="insight-strip">
        <div><span>데이터</span><strong>48행 × 4열</strong></div><div><span>만족도 범위</span><strong>1점 ~ 5점</strong></div><div><span>이번 확인</span><strong>{isOutlier ? '이상치' : '결측치'}</strong></div>
        <p><b>판단 기준</b>{isOutlier ? ' 가능한 값의 범위를 벗어났는지 확인하세요.' : ' 분석에 필요한 값이 비어 있는지 확인하세요.'}</p>
      </div>
      <div className="data-card">
        <div className="card-toolbar"><div><h3>급식 메뉴 만족도 조사 · {isOutlier ? '이상치 확인' : '결측치 확인'}</h3><p>2026년 1학기 · 화면에는 일부 행만 표시</p></div><div className="selected-count"><span>{selectedRows.length}</span>개 행 선택됨</div></div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>선택</th><th>메뉴명</th><th>만족도(1~5)</th><th>잔반량(kg)</th><th>응답 수</th></tr></thead><tbody>
          {rows.map((row) => { const selected = selectedRows.includes(row.id); return <tr className={selected ? 'selected-row' : ''} key={row.id} onClick={() => chooseRow(row.id)}><td><button className="row-check" aria-label={`${row.id}행 선택`} aria-pressed={selected}>{selected ? '✓' : ''}</button></td><td><b>{row.menu}</b></td><td>{row.rating || <em className="empty-value">비어 있음</em>}</td><td>{row.waste}</td><td>{row.votes}</td></tr>; })}
        </tbody></table></div>
        <div className="response-policy"><span>비공개 채점</span><p>선택한 응답은 저장되지만 정답 여부는 아직 표시되지 않습니다.</p></div>
        <div className="action-bar"><p>{selectedRows.length ? <><b>{selectedRows.map((id) => `${id}행`).join(', ')}</b>을 {isOutlier ? '이상치' : '결측치'}로 선택했어요.</> : `${isOutlier ? '이상치' : '결측치'}로 판단한 행을 선택하세요.`}</p><div><button className="button-secondary" onClick={save}>응답 저장</button><button className="button-primary" onClick={next}>{isOutlier ? '결측치 파악으로' : '정제하기'} <span>→</span></button></div></div>
      </div>
    </>
  );
}

function CleaningStep({ missingChoice, setMissingChoice, outlierChoice, setOutlierChoice, median, setMedian, next }: { missingChoice: string; setMissingChoice: (v: string) => void; outlierChoice: string; setOutlierChoice: (v: string) => void; median: string; setMedian: (v: string) => void; next: () => void }) {
  return (
    <div className="task-grid">
      <section className="task-card wide"><div className="task-card-head"><span className="task-badge">01</span><div><h3>결측치 처리</h3><p>잔치국수의 만족도 값이 비어 있습니다.</p></div><span className="points">3점</span></div><div className="choice-grid three">
        {[['mean', '같은 메뉴 평균으로 대체', '다른 학급의 잔치국수 평균 3.7점 사용'], ['zero', '0점으로 입력', '비어 있는 값을 최저점으로 간주'], ['delete', '해당 행 삭제', '응답 한 행을 분석에서 제외']].map(([value, title, sub]) => <button className={`choice-card ${missingChoice === value ? 'chosen' : ''}`} onClick={() => setMissingChoice(value)} key={value}><i>{missingChoice === value ? '✓' : ''}</i><b>{title}</b><span>{sub}</span></button>)}
      </div>{missingChoice && <p className="answer-note saved">결측치 처리 방법을 저장했습니다. 타당성은 교사가 제출 후 검토합니다.</p>}</section>

      <section className="task-card wide"><div className="task-card-head"><span className="task-badge coral">02</span><div><h3>이상치 처리</h3><p>떡볶이 만족도 14점은 입력 범위에서 벗어났습니다.</p></div><span className="points">3점</span></div><div className="choice-grid three">
        {[['source', '원본 응답 확인 후 4점', '원본 설문지에서 입력 오류를 확인'], ['cap', '최댓값 5점으로 변경', '범위를 벗어난 값은 모두 5점 처리'], ['keep', '14점을 그대로 유지', '원본 데이터이므로 수정하지 않음']].map(([value, title, sub]) => <button className={`choice-card ${outlierChoice === value ? 'chosen' : ''}`} onClick={() => setOutlierChoice(value)} key={value}><i>{outlierChoice === value ? '✓' : ''}</i><b>{title}</b><span>{sub}</span></button>)}
      </div>{outlierChoice && <p className="answer-note saved">이상치 처리 방법을 저장했습니다. 정답 여부는 아직 공개되지 않습니다.</p>}</section>

      <section className="task-card stat-card"><div className="task-card-head"><span className="task-badge yellow">03</span><div><h3>통계 정보 확인</h3><p>정제된 만족도 데이터의 중앙값은?</p></div><span className="points">2점</span></div><div className="stat-input"><input value={median} onChange={(event) => setMedian(event.target.value)} inputMode="decimal" placeholder="숫자 입력" aria-label="만족도 중앙값" /><span>점</span></div><small>정제값: 5, 4, 3.7, 4, 4, 3</small>{median && <p className="answer-note saved">입력한 통계값을 저장했습니다.</p>}</section>
      <section className="task-card clean-preview"><p className="mini-label">응답 상태</p><div className="clean-stats"><span><small>결측치 처리</small><b>{missingChoice ? '선택함' : '미선택'}</b></span><span><small>이상치 처리</small><b>{outlierChoice ? '선택함' : '미선택'}</b></span><span><small>통계값</small><b>{median ? '입력함' : '미입력'}</b></span></div><div className="clean-line"><i /><i /><i /><i /><i /><i /></div><p>선택의 타당성과 계산 정확성은 제출 후 교사가 검토합니다.</p></section>
      <div className="page-actions"><button className="button-primary large" onClick={next}>시각화 설계로 이동 <span>→</span></button></div>
    </div>
  );
}

function VisualizationStep({ chartType, setChartType, xAxis, setXAxis, yAxis, setYAxis, chartTitle, setChartTitle, next }: { chartType: string; setChartType: (v: string) => void; xAxis: string; setXAxis: (v: string) => void; yAxis: string; setYAxis: (v: string) => void; chartTitle: string; setChartTitle: (v: string) => void; next: () => void }) {
  return (
    <div className="viz-layout">
      <section className="viz-controls">
        <div className="analysis-question"><span>분석 질문</span><b>만족도가 낮은 메뉴일수록 잔반량이 많을까?</b></div>
        <fieldset><legend>1. 그래프 유형</legend><div className="chart-type-grid">{[['bar', '▥', '막대'], ['line', '⌁', '꺾은선'], ['scatter', '⠿', '산점도']].map(([value, icon, label]) => <button type="button" key={value} className={chartType === value ? 'chosen' : ''} onClick={() => setChartType(value)}><span>{icon}</span><b>{label}</b></button>)}</div></fieldset>
        <fieldset><legend>2. 변수 배치</legend><label className="select-label"><span>가로축(X)</span><select value={xAxis} onChange={(e) => setXAxis(e.target.value)}><option value="">변수 선택</option><option value="menu">메뉴명</option><option value="rating">만족도(점)</option><option value="votes">응답 수(명)</option></select></label><label className="select-label"><span>세로축(Y)</span><select value={yAxis} onChange={(e) => setYAxis(e.target.value)}><option value="">변수 선택</option><option value="waste">잔반량(kg)</option><option value="rating">만족도(점)</option><option value="votes">응답 수(명)</option></select></label></fieldset>
        <fieldset><legend>3. 그래프 제목</legend><input className="text-input" value={chartTitle} onChange={(e) => setChartTitle(e.target.value)} placeholder="그래프가 무엇을 보여 주는지 작성하세요" /></fieldset>
        <div className="viz-checklist"><p><i className={chartType ? 'ok' : ''} />그래프 유형 선택</p><p><i className={xAxis && yAxis ? 'ok' : ''} />X·Y축 변수 선택</p><p><i className={chartTitle ? 'ok' : ''} />그래프 제목 입력</p></div>
      </section>
      <section className="chart-stage"><div className="chart-stage-head"><div><span>LIVE PREVIEW</span><h3>{chartTitle || '그래프 제목을 입력하세요'}</h3></div><span className="private-badge">비공개 채점</span></div><ChartPreview type={chartType} /><div className="chart-legend">{chartRows.map((row) => <span key={row.menu}><i style={{ background: row.color }} />{row.menu}</span>)}</div><div className="chart-tip neutral"><b>응답 저장됨</b><span>그래프의 적절성과 축 설정은 제출 후 교사가 검토합니다.</span></div></section>
      <div className="page-actions full"><button className="button-primary large" onClick={next}>해석 및 판단으로 이동 <span>→</span></button></div>
    </div>
  );
}

function ChartPreview({ type }: { type: string }) {
  if (!type) return <div className="chart-empty"><div><i /><i /><i /></div><b>그래프 유형과 변수를 선택하세요</b><span>설정에 따라 미리보기가 바로 바뀝니다.</span></div>;
  if (type === 'bar') return <div className="bar-chart" role="img" aria-label="메뉴별 잔반량 막대그래프"><span className="axis-label y">잔반량(kg)</span>{chartRows.map((row) => <div key={row.menu} className="bar-column"><i style={{ height: `${row.waste * 5.5}px`, background: row.color }} /><small>{row.waste}</small></div>)}<span className="axis-label x">메뉴</span></div>;
  if (type === 'line') return <div className="line-chart" role="img" aria-label="메뉴 순서에 따른 잔반량 꺾은선그래프"><span className="line-stroke" />{chartRows.map((row, index) => <i key={row.menu} style={{ left: `${12 + index * 15}%`, bottom: `${20 + row.waste * 4}px`, background: row.color }} />)}<span className="axis-label y">잔반량</span><span className="axis-label x">메뉴 순서</span></div>;
  return <div className="scatter-chart" role="img" aria-label="만족도와 잔반량의 관계를 보여 주는 산점도"><div className="grid-lines" />{chartRows.map((row) => <button className="plot-dot" key={row.menu} style={{ left: `${12 + ((row.rating - 3) / 2) * 74}%`, bottom: `${18 + ((row.waste - 10) / 21) * 68}%`, background: row.color }} aria-label={`${row.menu}, 만족도 ${row.rating}점, 잔반 ${row.waste}kg`}><span>{row.menu}<br /><b>{row.rating}점 · {row.waste}kg</b></span></button>)}<span className="axis-label y">잔반량(kg)</span><span className="axis-label x">만족도(점) →</span><span className="tick t1">3</span><span className="tick t2">4</span><span className="tick t3">5</span></div>;
}

function InterpretationStep({ chartType, chartTitle, finding, setFinding, evidence, toggleEvidence, decision, setDecision, limitation, setLimitation, claim, setClaim, submit }: { chartType: string; chartTitle: string; finding: string; setFinding: (v: string) => void; evidence: string[]; toggleEvidence: (v: string) => void; decision: string; setDecision: (v: string) => void; limitation: string; setLimitation: (v: string) => void; claim: string; setClaim: (v: string) => void; submit: () => void }) {
  return (
    <div className="interpret-layout">
      <section className="mini-chart-card"><div><span>내가 만든 그래프</span><b>{chartTitle || '제목을 입력하지 않음'}</b></div><ChartPreview type={chartType} /><p>앞 단계에서 만든 그래프를 바탕으로 해석하세요.</p></section>
      <section className="reasoning-card"><div className="reason-step"><span>1</span><div><h3>그래프에서 발견한 특징</h3><p>가장 타당한 설명을 선택하세요.</p><div className="option-stack">{[['negative', '만족도가 낮을수록 잔반량이 많아지는 경향이 있다.'], ['positive', '만족도가 높을수록 잔반량이 많아진다.'], ['none', '만족도와 잔반량은 아무런 관계가 없다.']].map(([value, label]) => <button key={value} className={finding === value ? 'chosen' : ''} onClick={() => setFinding(value)}><i>{finding === value ? '✓' : ''}</i>{label}</button>)}</div></div></div>
        <div className="reason-step"><span>2</span><div><h3>주장을 뒷받침하는 수치 근거</h3><p>그래프에서 근거가 되는 데이터 지점을 2개 선택하세요.</p><div className="evidence-grid"><button className={evidence.includes('veg') ? 'chosen' : ''} onClick={() => toggleEvidence('veg')}><i style={{ background: '#8b73c9' }} /><span><b>채소비빔밥</b><small>만족도 3점 · 잔반 31kg</small></span></button><button className={evidence.includes('mara') ? 'chosen' : ''} onClick={() => toggleEvidence('mara')}><i style={{ background: '#ff735f' }} /><span><b>마라탕</b><small>만족도 5점 · 잔반 12kg</small></span></button><button className={evidence.includes('don') ? 'chosen' : ''} onClick={() => toggleEvidence('don')}><i style={{ background: '#f3b84b' }} /><span><b>치즈돈가스</b><small>만족도 4점 · 잔반 18kg</small></span></button></div></div></div>
        <div className="reason-step"><span>3</span><div><h3>내 판단과 해결 방안</h3><select value={decision} onChange={(e) => setDecision(e.target.value)}><option value="">해결 방안 선택</option><option value="improve">만족도 낮은 메뉴의 조리법·구성을 조사하고 개선한다.</option><option value="remove">만족도 3점 이하 메뉴를 다음 달부터 모두 제외한다.</option><option value="popular">가장 인기 있는 한 메뉴만 매일 제공한다.</option></select><textarea value={claim} onChange={(e) => setClaim(e.target.value)} placeholder="선택한 해결 방안을 데이터 근거와 연결하여 설명하세요. (20자 이상)" /><div className="writing-meter"><i style={{ width: `${Math.min(100, claim.length * 4)}%` }} /><span>{claim.length}자</span></div></div></div>
        <div className="reason-step"><span>4</span><div><h3>판단할 때 주의할 점</h3><select value={limitation} onChange={(e) => setLimitation(e.target.value)}><option value="">분석의 한계 선택</option><option value="other">날씨·배식량·조리 상태 등 다른 요인도 잔반량에 영향을 줄 수 있다.</option><option value="certain">이 데이터만으로 만족도가 잔반의 유일한 원인이라고 확정할 수 있다.</option><option value="none">48행이면 충분하므로 추가 데이터는 필요 없다.</option></select></div></div>
        <div className="submit-bar"><div><small>제출 전 자동 점검</small><b>{[finding, evidence.length >= 2 ? 'yes' : '', decision, limitation, claim.length >= 20 ? 'yes' : ''].filter(Boolean).length} / 5 항목 완료</b></div><button className="button-primary large" onClick={submit}>분석 결과 제출하기 <span>→</span></button></div>
      </section>
    </div>
  );
}

function ResultStep({ approvedScores, submitted, teacherApproved, goTeacher, reset }: { approvedScores: { clean: number; chart: number; read: number }; submitted: boolean; teacherApproved: boolean; goTeacher: () => void; reset: () => void }) {
  if (!submitted) return <div className="empty-result"><span>⌛</span><h3>아직 제출 전이에요</h3><p>앞 단계의 분석을 완료하고 답안을 제출해 주세요.</p></div>;
  if (!teacherApproved) return <div className="pending-result"><div className="pending-symbol"><i /><span>검토 중</span></div><p className="eyebrow">SUBMITTED</p><h2>교사의 최종 검토를 기다리고 있어요</h2><p>답안과 자동채점 근거는 교사에게만 전달되었습니다.<br />교사가 점수를 확인하고 승인하기 전에는 결과가 공개되지 않습니다.</p><div className="approval-flow"><span className="done"><i>✓</i><b>답안 제출</b><small>완료</small></span><em /><span className="active"><i>2</i><b>교사 검토</b><small>진행 중</small></span><em /><span><i>3</i><b>결과 공개</b><small>승인 후</small></span></div><div className="pending-actions"><button className="button-secondary" onClick={reset}>답안 초기화</button><button className="button-primary" onClick={goTeacher}>교사용 검토 화면 시연 <span>→</span></button></div></div>;
  const { clean: dataScore, chart: vizScore, read: interpretationScore } = approvedScores;
  const total = dataScore + vizScore + interpretationScore;
  const level = total >= 27 ? '우수' : total >= 18 ? '보통' : '기초';
  return (
    <div className="result-layout">
      <section className="result-hero"><div className="result-ring" style={{ '--score': `${(total / 30) * 360}deg` } as React.CSSProperties}><span><b>{total}</b><small>/ 30점</small></span></div><div><p>교사 승인 완료</p><h2><mark>{level}</mark> 수준으로 미션을 완료했어요</h2><span>교사가 답안과 자동채점 근거를 최종 검토한 결과입니다.</span></div></section>
      <div className="score-cards"><ScoreCard title="데이터 파악 및 정제" score={dataScore} color="teal" note={dataScore === 10 ? '결측치와 이상치를 정확히 찾아 근거 있게 정제했어요.' : '정제 방법을 선택할 때 정보 손실을 더 살펴보세요.'} /><ScoreCard title="데이터 분석 및 시각화" score={vizScore} color="coral" note={vizScore === 10 ? '두 수치의 관계에 적절한 산점도를 구성했어요.' : '분석 질문에 맞는 그래프와 축을 다시 확인해 보세요.'} /><ScoreCard title="데이터 해석 및 판단" score={interpretationScore} color="purple" note={interpretationScore === 10 ? '주장·수치 근거·한계를 논리적으로 연결했어요.' : '주장을 뒷받침하는 수치 근거를 더 구체화해 보세요.'} /></div>
      <section className="feedback-report"><div><p className="mini-label">맞춤 피드백</p><h3>다음 분석에서는 이것까지 도전해 보세요</h3><p>현재 데이터는 메뉴별 응답 수가 다릅니다. 단순 만족도뿐 아니라 응답 수를 가중치로 반영하면 더 공정한 비교가 될 수 있어요.</p></div><span className="growth-badge">NEXT<br /><b>가중 평균</b></span></section>
      <div className="result-actions"><button className="button-secondary" onClick={reset}>처음부터 다시 체험</button></div>
    </div>
  );
}

function ScoreCard({ title, score, color, note }: { title: string; score: number; color: string; note: string }) {
  const label = score === 10 ? '우수' : score === 7 ? '보통' : '기초';
  return <article className={`score-card ${color}`}><div><span>{label}</span><b>{score}<small>/10</small></b></div><h3>{title}</h3><p>{note}</p><div className="score-meter"><i style={{ width: `${score * 10}%` }} /></div></article>;
}

function MissionLibrary({ close }: { close: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="미션 보관함"><div className="mission-modal"><header><div><p className="eyebrow">MISSION LIBRARY</p><h2>학생들이 몰입할 만한 데이터 미션</h2><span>일상의 주장과 선택을 데이터로 검증하도록 설계했습니다.</span></div><button onClick={close} aria-label="닫기">×</button></header><div className="mission-grid">{missions.map((mission, index) => <article className={`mission-card ${mission.tone}`} key={mission.category}><div><span className="mission-emoji">{mission.emoji}</span><small>{mission.category}</small>{index === 0 && <b className="active-badge">체험 중</b>}</div><h3>{mission.title}</h3><p>{mission.question}</p><footer><span>{mission.skill}</span><button onClick={close}>{index === 0 ? '계속하기' : '미션 보기'} →</button></footer></article>)}</div><p className="library-note">교사용 화면에서 학급별로 미션을 배정하고 공개 기간을 설정하는 형태로 확장할 수 있습니다.</p></div></div>;
}

function TeacherDashboard({ onStudent, filter, setFilter, selectedStudent, setSelectedStudent, submitted, teacherApproved, autoScores, approvedScores, onApprove, answers }: { onStudent: () => void; filter: 'all' | 'review'; setFilter: (v: 'all' | 'review') => void; selectedStudent: string; setSelectedStudent: (v: string) => void; submitted: boolean; teacherApproved: boolean; autoScores: TeacherScores; approvedScores: TeacherScores; onApprove: (scores: TeacherScores) => void; answers: StudentAnswers }) {
  const [tab, setTab] = useState<TeacherTab>('results');
  const [showReview, setShowReview] = useState(false);
  const [approvedNames, setApprovedNames] = useState<string[]>(teacherApproved ? ['김하늘'] : []);
  const [assignedMissions, setAssignedMissions] = useState<string[]>(['급식 만족도']);
  const [notice, setNotice] = useState('');

  const currentScores = teacherApproved ? approvedScores : autoScores;
  const students = classResults.map((student) => {
    if (student.name === '김하늘') {
      return {
        ...student,
        ...currentScores,
        status: !submitted ? '진행 중' : teacherApproved ? '승인 완료' : '승인 대기',
        flag: !submitted ? '' : teacherApproved ? '' : '최종 검토',
      };
    }
    return approvedNames.includes(student.name) ? { ...student, status: '승인 완료', flag: '' } : student;
  });
  const filtered = filter === 'review' ? students.filter((student) => student.flag || student.status === '승인 대기' || student.status === '검토 필요') : students;
  const selected = students.find((student) => student.name === selectedStudent) || students[0];

  function exportResults() {
    const header = ['번호', '학생', '데이터 파악 및 정제', '데이터 분석 및 시각화', '데이터 해석 및 판단', '총점', '상태'];
    const rowsForCsv = students.map((student) => [student.no, student.name, student.clean || '', student.chart || '', student.read || '', student.clean + student.chart + student.read || '', student.status]);
    const csv = '\uFEFF' + [header, ...rowsForCsv].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = '데이터픽_2학년3반_평가결과.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice('평가 결과 파일을 내려받았습니다.');
    window.setTimeout(() => setNotice(''), 2500);
  }

  function approveStudent(scores: TeacherScores) {
    if (selected.name === '김하늘') onApprove(scores);
    setApprovedNames((current) => current.includes(selected.name) ? current : [...current, selected.name]);
    setShowReview(false);
    setNotice(`${selected.name} 학생의 결과를 최종 승인하고 공개했습니다.`);
    window.setTimeout(() => setNotice(''), 3200);
  }

  const tabTitle = tab === 'results' ? ['2학년 3반 · 급식 데이터 미션', '수행평가 현황', '제출 답안과 자동채점 근거를 검토한 뒤 결과 공개를 승인하세요.'] : tab === 'missions' ? ['MISSION MANAGEMENT', '미션 관리', '학급에 배정할 데이터 분석 미션과 공개 상태를 관리하세요.'] : ['RUBRIC SETTINGS', '평가 기준', '자동채점에 적용할 세 영역의 성취수준과 설명을 확인하고 수정하세요.'];

  return <main className="teacher-shell">
    <header className="teacher-topbar"><div className="brand"><span className="brand-mark">D</span><span>데이터픽 <small>교사용</small></span></div><nav><button className={tab === 'results' ? 'active' : ''} onClick={() => setTab('results')}>평가 현황</button><button className={tab === 'missions' ? 'active' : ''} onClick={() => setTab('missions')}>미션 관리</button><button className={tab === 'rubric' ? 'active' : ''} onClick={() => setTab('rubric')}>평가 기준</button></nav><button className="view-switch light" onClick={onStudent}>학생 화면으로</button></header>
    <div className="teacher-body"><section className="teacher-title"><div><p className="eyebrow">{tabTitle[0]}</p><h1>{tabTitle[1]}</h1><span>{tabTitle[2]}</span></div>{tab === 'results' && <button className="export-button" onClick={exportResults}>평가 결과 내려받기</button>}</section>
      {tab === 'results' && <>
        <section className="overview-cards"><div><span className="metric-icon mint">✓</span><p>제출 완료<strong>26<small>/ 28명</small></strong></p><i><b style={{ width: '93%' }} /></i></div><div><span className="metric-icon yellow">★</span><p>승인 완료<strong>22<small>/ 26명</small></strong></p><i><b style={{ width: '85%' }} /></i></div><div><span className="metric-icon coral">!</span><p>교사 검토 필요<strong>4<small>명</small></strong></p><button onClick={() => setFilter('review')}>바로 보기 →</button></div><div><span className="metric-icon purple">◎</span><p>가장 높은 영역<strong>시각화<small>평균 8.9점</small></strong></p><i><b style={{ width: '89%' }} /></i></div></section>
        <div className="teacher-content"><section className="result-table-card"><header><div><h2>학생별 평가 결과</h2><span>학생에게는 교사가 승인한 점수만 공개됩니다.</span></div><div className="filter-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>전체</button><button className={filter === 'review' ? 'active' : ''} onClick={() => setFilter('review')}>검토 필요</button></div></header><div className="teacher-table-wrap"><table className="teacher-table"><thead><tr><th>번호</th><th>학생</th><th>파악·정제</th><th>시각화</th><th>해석·판단</th><th>총점</th><th>상태</th></tr></thead><tbody>{filtered.map((student) => { const total = student.clean + student.chart + student.read; return <tr key={student.no} className={selectedStudent === student.name ? 'selected' : ''} onClick={() => setSelectedStudent(student.name)}><td>{student.no}</td><td><b>{student.name}</b>{student.flag && <small>{student.flag}</small>}</td><td><ScorePill score={student.clean} /></td><td><ScorePill score={student.chart} /></td><td><ScorePill score={student.read} /></td><td><strong>{total || '–'}</strong></td><td><span className={`status ${student.status === '검토 필요' || student.status === '승인 대기' ? 'review' : student.status === '진행 중' ? 'working' : ''}`}>{student.status}</span></td></tr>; })}</tbody></table></div></section>
          <aside className="review-panel"><header><div><span>자동채점 근거 · 학생 비공개</span><h3>{selected.name} 학생</h3></div><b>{selected.clean + selected.chart + selected.read}<small>/30</small></b></header><div className="review-chart"><span style={{ height: `${selected.clean * 8}%` }}><i>{selected.clean}</i><small>파악·정제</small></span><span style={{ height: `${selected.chart * 8}%` }}><i>{selected.chart}</i><small>시각화</small></span><span style={{ height: `${selected.read * 8}%` }}><i>{selected.read}</i><small>해석·판단</small></span></div><div className="evidence-log"><p><i className={selected.clean >= 7 ? 'good' : 'warn'} />이상치·결측치 <b>{selected.clean >= 7 ? '응답 확인' : '일부 누락'}</b></p><p><i className={selected.chart >= 7 ? 'good' : 'warn'} />그래프 구성 <b>{selected.chart >= 10 ? '높은 일치' : '재검토'}</b></p><p><i className={selected.read <= 4 ? 'warn' : 'good'} />수치 근거 연결 <b>{selected.read <= 4 ? '근거 부족' : '응답 확인'}</b></p></div><div className="auto-note"><span>공개 상태</span><p>{selected.status === '승인 완료' ? '교사 승인이 완료되어 학생에게 결과가 공개되었습니다.' : '아직 학생에게 점수와 피드백이 공개되지 않았습니다.'}</p></div><button className="review-button" onClick={() => setShowReview(true)}>상세 답안 검토하기</button></aside>
        </div><section className="topic-bank"><header><div><p className="eyebrow">NEXT MISSIONS</p><h2>다음 수행평가 소재</h2></div><span>학생의 생활과 가까운 상황으로 분석 능력을 반복 평가할 수 있어요.</span></header><div>{missions.slice(1).map((mission) => <article key={mission.category}><span>{mission.emoji}</span><p><small>{mission.category}</small><b>{mission.title}</b></p></article>)}</div></section>
      </>}
      {tab === 'missions' && <MissionManager assigned={assignedMissions} setAssigned={setAssignedMissions} notify={setNotice} />}
      {tab === 'rubric' && <RubricManager notify={setNotice} />}
    </div>
    {showReview && <AnswerReviewModal student={selected} answers={answers} submitted={selected.name === '김하늘' ? submitted : true} close={() => setShowReview(false)} confirm={approveStudent} />}
    {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
  </main>;
}

function MissionManager({ assigned, setAssigned, notify }: { assigned: string[]; setAssigned: (missions: string[]) => void; notify: (message: string) => void }) {
  function toggleMission(category: string) {
    const next = assigned.includes(category) ? assigned.filter((item) => item !== category) : [...assigned, category];
    setAssigned(next);
    notify(assigned.includes(category) ? `${category} 미션 배정을 해제했습니다.` : `${category} 미션을 2학년 3반에 배정했습니다.`);
    window.setTimeout(() => notify(''), 2500);
  }
  return <section className="manager-surface"><div className="manager-toolbar"><label><span>대상 학급</span><select><option>2학년 3반</option><option>2학년 4반</option></select></label><label><span>응시 기간</span><input type="date" defaultValue="2026-08-25" /></label><div><span>현재 배정</span><b>{assigned.length}개 미션</b></div></div><div className="manager-mission-grid">{missions.map((mission) => { const active = assigned.includes(mission.category); return <article key={mission.category} className={active ? 'assigned' : ''}><div><span className="mission-emoji">{mission.emoji}</span><small>{mission.category}</small><i>{active ? '배정 중' : '미배정'}</i></div><h3>{mission.title}</h3><p>{mission.question}</p><footer><span>{mission.skill}</span><button onClick={() => toggleMission(mission.category)}>{active ? '배정 해제' : '학급에 배정'}</button></footer></article>; })}</div></section>;
}

function RubricManager({ notify }: { notify: (message: string) => void }) {
  const [descriptions, setDescriptions] = useState([
    { title: '데이터 파악 및 정제', excellent: '항목과 특성을 정확히 파악하고 이상치·결측치·통계 정보를 정확하게 확인하였다.', average: '항목과 특성을 대체로 파악하고 문제점 또는 통계 정보 중 일부를 확인하였다.', basic: '데이터의 특성을 제대로 파악하지 못하였다.' },
    { title: '데이터 분석 및 시각화', excellent: '목적에 적합한 데이터를 선택하고 적절한 표·그래프로 정확하게 시각화하였다.', average: '분석하고 시각화하였으나 문제 해결에 있어 시각화 방법이 일부 적절하지 못하였다.', basic: '데이터 분석 및 시각화가 적절하게 이루어지지 못하였다.' },
    { title: '데이터 해석 및 판단', excellent: '의미 있는 특징을 정확히 찾고 데이터에 근거하여 논리적으로 판단하였다.', average: '특징을 파악하고 판단하였으나 이를 뒷받침하는 근거가 부족하였다.', basic: '분석 결과를 적절하게 해석하지 못하거나 데이터에 근거한 판단을 제시하지 못하였다.' },
  ]);
  function update(index: number, key: 'excellent' | 'average' | 'basic', value: string) {
    setDescriptions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }
  function save() {
    notify('평가 기준을 저장했습니다. 이후 제출부터 자동채점에 반영됩니다.');
    window.setTimeout(() => notify(''), 2800);
  }
  return <section className="rubric-manager"><div className="rubric-policy"><div><span>점수 체계</span><b>우수 10점 · 보통 7점 · 기초 4점</b></div><p>자동채점은 초안 점수만 제안하며, 학생에게 공개되기 전 교사가 반드시 최종 승인합니다.</p></div><div className="rubric-edit-grid">{descriptions.map((item, index) => <article key={item.title}><header><span>평가 영역 {index + 1}</span><h2>{item.title}</h2></header><label className="level excellent"><b>우수 <i>10점</i></b><textarea value={item.excellent} onChange={(event) => update(index, 'excellent', event.target.value)} /></label><label className="level average"><b>보통 <i>7점</i></b><textarea value={item.average} onChange={(event) => update(index, 'average', event.target.value)} /></label><label className="level basic"><b>기초 <i>4점</i></b><textarea value={item.basic} onChange={(event) => update(index, 'basic', event.target.value)} /></label></article>)}</div><div className="manager-actions"><button className="button-primary large" onClick={save}>평가 기준 저장</button></div></section>;
}

function AnswerReviewModal({ student, answers, submitted, close, confirm }: { student: { name: string; clean: number; chart: number; read: number; status: string }; answers: StudentAnswers; submitted: boolean; close: () => void; confirm: (scores: TeacherScores) => void }) {
  const [scores, setScores] = useState<TeacherScores>({ clean: student.clean || 4, chart: student.chart || 4, read: student.read || 4 });
  const choiceLabel: Record<string, string> = { mean: '같은 메뉴 평균 3.7점으로 대체', zero: '0점으로 입력', delete: '해당 행 삭제', source: '원본 응답 확인 후 4점으로 정정', cap: '최댓값 5점으로 변경', keep: '14점 유지', scatter: '산점도', bar: '막대그래프', line: '꺾은선그래프' };
  const scoreOptions = [10, 7, 4];
  return <div className="modal-backdrop review-backdrop" role="dialog" aria-modal="true" aria-label={`${student.name} 상세 답안 검토`}><div className="answer-review-modal"><header><div><p className="eyebrow">ANSWER REVIEW</p><h2>{student.name} 학생 상세 답안</h2><span>자동채점 초안을 확인하고 필요하면 점수를 조정한 뒤 최종 승인하세요.</span></div><button onClick={close} aria-label="닫기">×</button></header>{!submitted ? <div className="not-submitted"><span>⌛</span><h3>아직 제출되지 않은 답안입니다</h3><p>학생이 제출을 완료한 뒤 상세 검토와 승인을 진행할 수 있습니다.</p></div> : <><div className="review-answer-grid"><section><header><span>01</span><div><h3>데이터 파악 및 정제</h3><small>자동 제안 {student.clean || 4}점</small></div><select value={scores.clean} onChange={(event) => setScores({ ...scores, clean: Number(event.target.value) })}>{scoreOptions.map((score) => <option key={score} value={score}>{score}점</option>)}</select></header><dl><div><dt>이상치로 선택</dt><dd>{answers.outlierRows.length ? answers.outlierRows.map((id) => `${id}행`).join(', ') : '선택 없음'}</dd></div><div><dt>결측치로 선택</dt><dd>{answers.missingRows.length ? answers.missingRows.map((id) => `${id}행`).join(', ') : '선택 없음'}</dd></div><div><dt>결측치 처리</dt><dd>{choiceLabel[answers.missingChoice] || '미응답'}</dd></div><div><dt>이상치 처리</dt><dd>{choiceLabel[answers.outlierChoice] || '미응답'}</dd></div><div><dt>중앙값</dt><dd>{answers.median || '미응답'}점</dd></div></dl></section><section><header><span>02</span><div><h3>데이터 분석 및 시각화</h3><small>자동 제안 {student.chart || 4}점</small></div><select value={scores.chart} onChange={(event) => setScores({ ...scores, chart: Number(event.target.value) })}>{scoreOptions.map((score) => <option key={score} value={score}>{score}점</option>)}</select></header><dl><div><dt>그래프 유형</dt><dd>{choiceLabel[answers.chartType] || '미응답'}</dd></div><div><dt>가로축 / 세로축</dt><dd>{answers.xAxis || '–'} / {answers.yAxis || '–'}</dd></div><div><dt>그래프 제목</dt><dd>{answers.chartTitle || '미응답'}</dd></div></dl></section><section className="interpret-answer"><header><span>03</span><div><h3>데이터 해석 및 판단</h3><small>자동 제안 {student.read || 4}점</small></div><select value={scores.read} onChange={(event) => setScores({ ...scores, read: Number(event.target.value) })}>{scoreOptions.map((score) => <option key={score} value={score}>{score}점</option>)}</select></header><dl><div><dt>선택한 특징</dt><dd>{answers.finding || '미응답'}</dd></div><div><dt>수치 근거</dt><dd>{answers.evidence.length}개 데이터 지점 선택</dd></div><div><dt>해결 방안</dt><dd>{answers.decision || '미응답'}</dd></div><div><dt>학생 서술</dt><dd className="claim-box">{answers.claim || '미응답'}</dd></div><div><dt>분석의 한계</dt><dd>{answers.limitation || '미응답'}</dd></div></dl></section></div><div className="approval-footer"><div><span>최종 공개 점수</span><b>{scores.clean + scores.chart + scores.read}<small>/ 30점</small></b><p>승인하면 학생 화면에 점수와 피드백이 즉시 공개됩니다.</p></div><button className="approve-button" onClick={() => confirm(scores)}>최종 승인 및 결과 공개</button></div></>}</div></div>;
}

function ScorePill({ score }: { score: number }) {
  return score ? <span className={`score-pill ${score === 10 ? 'high' : score === 7 ? 'mid' : 'low'}`}>{score}</span> : <span className="score-pill empty">–</span>;
}
