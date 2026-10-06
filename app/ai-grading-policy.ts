import { parseTable } from './table-data';
import type { GradeItem } from './grading';

export const aiCommentPolicy = `공개 코멘트 규칙은 참고 사례의 코멘트 스타일보다 우선한다.
7점·4점은 감점한 이유만 한국어 한두 문장으로 최대 180자 안에 적는다. 맞게 수행한 부분의 요약, 칭찬, 채점 과정 설명, 같은 이유 반복을 넣지 않는다. 내부 판단 근거는 evidence에만 적는다.
모든 공개 문장은 '~함' 또는 '~음'으로 끝낸다. '~합니다', '~했습니다', '~하세요', '~됨', '~임'을 쓰지 않는다. 예: '결측 행을 제거하지 않았음.', '대출 횟수 대신 권수의 합계를 구함.', '피봇 수치와 학년별 순위 해석이 일치하지 않음.'
10점 항목의 comment는 반드시 빈 문자열로 출력한다. 보통의 정답·성실한 수행·모범답안과 동일한 답안에는 칭찬하지 않는다. 모범 수준을 명백히 뛰어넘는 분석이나 통찰이 있는 경우에만 praiseKey에 해당 10점 평가요소 하나를 지정하고 praiseReason에 구체적인 뛰어난 근거를 적는다. 없으면 praiseKey=null, praiseReason=''이다. 학생별 칭찬은 최대 하나다.`;

export function normalizeAIComment(value: string): string {
  return value.trim().split(/(?<=[.!?])\s+|\n+/).filter(Boolean).map(sentence => {
    const text = sentence.trim().replace(/[.!?]+$/, '')
      .replace(/하였습니다$/, '하였음').replace(/했습니다$/, '했음')
      .replace(/되었습니다$/, '되었음').replace(/됐습니다$/, '되었음')
      .replace(/합니다$/, '함').replace(/됩니다$/, '되었음')
      .replace(/있습니다$/, '있음').replace(/없습니다$/, '없음')
      .replace(/않습니다$/, '않음').replace(/입니다$/, '이었음')
      .replace(/필요됨$/, '필요함').replace(/됨$/, '되었음').replace(/아님$/, '아니었음').replace(/임$/, '이었음');
    if (!/(함|음)$/.test(text)) throw new Error('AI 코멘트는 ~함 또는 ~음으로 끝나야 합니다.');
    return `${text}.`;
  }).join(' ');
}

export function finalizeAIComments(items: GradeItem[], praiseKey?: string | null, praiseReason?: string): GradeItem[] {
  return items.map(item => ({ ...item, comment: item.score === 10
    ? item.key === praiseKey && !item.needsReview && !!praiseReason?.trim() ? '매우 뛰어난 분석을 수행함.' : ''
    : normalizeAIComment(item.comment) }));
}

export const teacherGradingPolicy = `2회차 교사의 최종 판정 원칙이다. 저장된 기준이나 모범답안의 형식적 조건과 충돌하면 아래 허용 원칙을 우선한다. 참고 사례의 최종 점수와 코멘트는 이 원칙을 적용한 사례다.
수행 1: 이상 데이터 4개를 찾아 작성해야 한다. 이유는 전반적으로 후하게 판단한다. '비정상적이다', '과도하다', '존재할 수 없다' 같은 짧은 설명도 인정한다. 이름 정쟝정좡현우의 이유도 상세 설명을 요구하지 않는다. 키가 과하게 커서 학교에 들어갈 수 없거나 정상적인 생활이 어려울 것이라는 설명도 인정한다. 명백히 잘못된 전제(6글자 이름은 없다), 데이터와 무관한 이유(엄마가 그렇게 지었을 리 없다), 장난만 쓴 이유는 미충족 판단의 근거가 될 수 있다. 단순히 구체성이 부족하다는 이유로 감점하지 않는다. 열 이름의 단위·공백·명백한 축약은 인정하되 키를 학번이라고 적는 등 다른 열로 오인한 것은 인정하지 않는다.
수행 2: 결측 행을 제거하고 정상 데이터가 보존되면 인정한다. 제목 행 누락 등 붙여넣기 형식만으로 감점하지 않는다.
수행 3: 용운동의 인구가 가장 많고 효동이 가장 적다는 비교가 가능한 차트면 인정한다. 누적 열 차트인지, 유형을 어떻게 이름 붙였는지는 감점 사유가 아니다. 제목·범례·색은 감점하지 않는다. 용운동을 용문동으로 쓴 오기, 인구수를 세대수로 쓴 단순 표현 실수는 핵심 비교가 맞으면 감점하지 않는다. 짧은 해석도 인정하고 모범 해석의 모든 문장을 요구하지 않는다. 설명이 아예 없으면 해석 항목은 미충족이다.
수행 4: 학년별 대출 횟수 분석이 목적이다. 첫째 열은 학년이며 횟수는 1학년 19, 2학년 10, 3학년 11, 총계 40이다. COUNT 또는 COUNTA로 대출 방식·반납 상태 등 적절한 열을 세어도 인정한다. 둘째 열 제목의 모범답안 일치를 요구하지 않는다. SUM으로 권수를 더하거나 다른 기준으로 묶는 것은 미충족이다. 표가 맞아도 2학년과 3학년 순위 등 해석이 틀리면 피봇 세부 항목은 미충족이다.
수행 5: 자습시간과 시험점수의 양의 관계를 실제로 나타낸 차트와 그에 맞는 해석을 요구한다. X·Y축을 바꿔도 관계가 드러나면 인정한다. 자동 축 제목이 학생코드로 남아 있어도 실제 점 좌표가 자습시간과 점수의 관계이면 인정한다. 실제로 학생코드를 가로축으로 두고 자습시간과 점수를 별도 계열로 나열한 차트는 인정하지 않는다. 제목만으로 실제 변수 오류라고 단정하지 않는다. 정답 문장만 쓰고 차트가 잘못된 경우는 미충족이다.
각 평가요소는 두 세부 항목을 독립적으로 판단하여 10/7/4점을 부여한다. 공개 코멘트는 감점 이유만 적으며 10점은 특별히 뛰어난 칭찬 한 번을 제외하고 비워 둔다. 학생별 농담·위협·가족 언급 등 개인적인 표현을 복제하지 말고 학습 내용에 집중한다.
${aiCommentPolicy}`;

export function checkPivotTable(actual: string) {
  const rows = parseTable(actual).map(row => row.map(cell => cell.trim()));
  const expected = new Map([['1학년', 19], ['2학년', 10], ['3학년', 11], ['총계', 40]]);
  if (rows.length !== 5 || rows[0]?.length !== 2 || rows[0][0] !== '학년') return { matches: false, detail: '학년을 첫째 열로 하는 제목 행과 학년별 3행 및 총계가 필요함' };
  if (/\bSUM\b/i.test(rows[0][1])) return { matches: false, detail: 'SUM은 대출 권수의 합계이며 대출 횟수 집계가 아님' };
  const seen = new Set<string>();
  for (const row of rows.slice(1)) {
    const label = row[0]?.replace(/\s+/g, '');
    const value = row[1]?.replace(/,/g, '');
    if (row.length !== 2 || !expected.has(label) || seen.has(label) || !value || Number(value) !== expected.get(label)) return { matches: false, detail: '학년별 대출 횟수는 1학년 19, 2학년 10, 3학년 11, 총계 40이어야 함' };
    seen.add(label);
  }
  return { matches: true, detail: '학년별 횟수와 총계가 일치함. 둘째 열 제목과 행 순서는 허용하며 해석 정확성은 별도 판단해야 함' };
}
