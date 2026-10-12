import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const policy = fs.readFileSync('app/ai-grading-policy.ts', 'utf8');
const policyCode = ts.transpile(policy.slice(policy.indexOf('export class AICommentFormatError'), policy.indexOf('export const teacherGradingPolicy')), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 });
const policyContext = { exports: {} };
vm.runInNewContext(policyCode, policyContext);
const { normalizeAIComment, finalizeAIComments, AICommentFormatError } = policyContext.exports;
const workspace = fs.readFileSync('app/teacher-workspace.tsx', 'utf8');
const batchCode = ts.transpile(workspace.slice(workspace.indexOf(' async function autoGrade()'), workspace.indexOf(' async function publish()')), { target: ts.ScriptTarget.ES2022 });

test('common sentence endings are normalized without changing deduction reasons', () => {
  assert.equal(normalizeAIComment('차트 설명이 부족하다. 추가 설명이 필요하다.'), '차트 설명이 부족함. 추가 설명이 필요함.');
  assert.equal(normalizeAIComment('결측 행을 제거하지 않았다.'), '결측 행을 제거하지 않았음.');
  assert.equal(normalizeAIComment('해석이 없습니다.'), '해석이 없음.');
  assert.throws(() => normalizeAIComment('다시 작성하세요.'), AICommentFormatError);
});

test('comment normalization preserves scores and the full-score comment policy', () => {
  const items = [{ key: 'cleaning', score: 7, comment: '설명이 부족하다.' }, { key: 'visualization', score: 10, comment: '잘했습니다.' }];
  const result = finalizeAIComments(items);
  assert.equal(result[0].score, 7);
  assert.equal(result[0].comment, '설명이 부족함.');
  assert.equal(result[1].comment, '');
  assert.equal(items[0].comment, '설명이 부족하다.');
});

async function runBatch(failedIds) {
  const state = { grades: { ref1: { source: 'manual' }, ref2: { source: 'manual' } }, calls: [] };
  const rows = ['ref1', 'ref2', 'a', 'b', 'c'].map(id => ({ id, round: 2, classroom: '3401', student_name: id }));
  const context = {
    Error, EVALUATION_ROUND: 2, actionBusy: false, rows,
    targetIds: ['ref1', 'a', 'b', 'c'], referenceIds: ['ref1', 'ref2'], grades: state.grades,
    setActionBusy: value => { state.busy = value; },
    setError: value => { state.error = value; },
    setNotice: value => { state.notice = value; },
    setProgress: value => { state.progress = value; },
    setGrades: update => { state.grades = update(state.grades); },
    setTargetIds: value => { state.targets = Array.from(value); },
    setShowAiSetup: value => { state.showSetup = value; },
    request: async (_url, { submissionId }) => {
      state.calls.push(submissionId);
      if (failedIds.includes(submissionId)) throw new Error('AI 채점 응답 시간이 초과되었습니다.');
      return { grade: { submission_id: submissionId, source: 'ai' } };
    },
  };
  vm.runInNewContext(batchCode, context);
  await context.autoGrade();
  return state;
}

test('a middle failure does not stop later students; retry selection contains only failures', async () => {
  const state = await runBatch(['b']);
  assert.deepEqual(state.calls, ['a', 'b', 'c']);
  assert.equal(state.grades.c.source, 'ai');
  assert.equal(state.grades.ref1.source, 'manual');
  assert.deepEqual(state.targets, ['b']);
  assert.match(state.error, /b: AI 채점 응답 시간이 초과/);
  assert.match(state.notice, /2명 완료 · 1명 실패/);
  assert.equal(state.showSetup, true);
  assert.equal(state.busy, false);
  assert.equal(state.progress, '');
});

test('all failures keep retry selection and release the busy state', async () => {
  const state = await runBatch(['a', 'b', 'c']);
  assert.deepEqual(state.calls, ['a', 'b', 'c']);
  assert.deepEqual(state.targets, ['a', 'b', 'c']);
  assert.match(state.notice, /0명 완료 · 3명 실패/);
  assert.equal(state.busy, false);
});

test('all successes clear retry selection and close setup', async () => {
  const state = await runBatch([]);
  assert.deepEqual(state.targets, []);
  assert.equal(state.error, '');
  assert.equal(state.showSetup, false);
  assert.match(state.notice, /3명 완료 · 0명 실패/);
});

const requestCode = ts.transpile(workspace.slice(workspace.indexOf(' async function request('), workspace.indexOf(' async function saveConfig(')), { target: ts.ScriptTarget.ES2022 });
test('a non-JSON gateway timeout has a readable error', async () => {
  const context = { Error, AbortSignal, fetch: async () => ({ status: 504, ok: false, json: async () => { throw new SyntaxError('HTML response'); } }) };
  vm.runInNewContext(requestCode, context);
  await assert.rejects(context.request('/api/teacher/auto-grade', {}), /서버 응답 시간이 초과/);
});
