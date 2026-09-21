export type CriterionScore = 4 | 7 | 10;
export type GradeItem = { key: string; title: string; score: CriterionScore; comment: string; evidence?: string; needsReview?: boolean };
export type GradeDraft = { items: GradeItem[]; total: number; source: 'manual' | 'ai'; updatedAt?: string };
export type RubricCriterion = { key: string; title: string; first: string; second: string; guidance: string; exampleAnswer: string };
export type GradingConfig = { criteria: RubricCriterion[]; overallInstructions: string; updatedAt?: string };

export const defaultGradingConfig: GradingConfig = {
  overallInstructions: '각 평가요소의 두 세부 항목을 독립적으로 판단한다. 둘 다 충족하면 10점, 하나만 충족하면 7점, 둘 다 충족하지 못하면 4점이다. 감점한 경우 보완할 점을 한두 문장으로 짧고 구체적으로 작성한다.',
  criteria: [
    { key: 'cleaning', title: '데이터 파악 및 정제', first: '데이터에서 이상 데이터를 찾아 타당한 이유와 함께 서술한다.', second: '결측 데이터가 있는 행을 제거하고 완성된 전체 데이터를 제출한다.', guidance: '이상 데이터의 위치·값·정상 범위를 확인한다. 결측 행 제거 후 결측값이 남지 않고 정상 데이터와 열 순서가 보존되었는지 확인한다.', exampleAnswer: '' },
    { key: 'visualization', title: '데이터 분석 및 시각화', first: '분석 목적에 맞는 적절하고 읽을 수 있는 차트를 제출한다.', second: '차트에서 확인되는 의미를 명확하고 근거 있게 서술한다.', guidance: '차트 유형과 변수 선택, 제목·축·범례의 가독성을 확인한다. 해석이 실제 차트와 일치하며 근거 없는 인과관계를 단정하지 않는지 확인한다.', exampleAnswer: '' },
    { key: 'interpretation', title: '데이터 해석 및 판단', first: '조건과 목적에 맞는 피봇 테이블을 만들고 결과를 정확히 해석한다.', second: '두 데이터를 적절히 결합하여 관계를 차트로 표현하고 근거를 토대로 판단한다.', guidance: '피봇의 행·열·값·집계 방식과 수치 해석을 확인한다. 데이터 결합, 관계 분석, 차트 적절성, 상관과 인과의 구분을 확인한다.', exampleAnswer: '' },
  ],
};

export function validGradeItems(value: unknown): value is GradeItem[] {
  return Array.isArray(value) && value.length === 3 && value.every((item, index) => {
    if (!item || typeof item !== 'object') return false;
    const v = item as GradeItem;
    return v.key === defaultGradingConfig.criteria[index].key && v.title === defaultGradingConfig.criteria[index].title && [4, 7, 10].includes(v.score) && typeof v.comment === 'string' && v.comment.length <= 500 && (v.score === 10 || v.comment.trim().length > 0);
  });
}

export const gradeTotal = (items: GradeItem[]) => items.reduce((sum, item) => sum + item.score, 0);
