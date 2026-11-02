/**
 * Orchestrates the multi-stage exam generation for the sequential (foreground)
 * path (issue #225, design §5): blueprint → planner → writer → deterministic
 * checks → solver + judge → editor → assemble.
 *
 * The model is reached only through the injected `callModel`, and everything
 * UI-specific (persistence, progress display, resources localization) comes in
 * as callbacks, so the same orchestration runs in the browser (js/ui.js) and in
 * `scripts/eval-exam-pipeline.mjs` against the real API for regression metrics.
 *
 * Per question the model cost is bounded: ≤3 writer attempts (parse retry,
 * duplicate retry), then — when judging is enabled — 1 solver + 1 judge call,
 * plus at most 1 editor call for a "fix" verdict.
 */

import {
  PLANNER_MIN_QUESTIONS,
  buildExamBlueprint,
  buildPlannerPrompt,
  parsePlan,
  validatePlan,
  buildSlotPromptSuffix,
  buildDuplicateRetryHint,
  isDuplicateQuestion,
  correctChoiceText,
  summarizeDiversity,
} from './examPipeline.js';
import { buildAnswerPositionHint, buildResourceGroundingHint, appendMissingResourceRefs, parseQuizResponse } from './quiz.js';
import { renderUnitForPrompt } from './cards.js';
import {
  runDeterministicChecks,
  buildSolverPrompt,
  buildJudgePrompt,
  buildEditorPrompt,
  parseSolverResponse,
  parseJudgeResponse,
  decideVerdict,
  summarizeJudging,
} from './examJudge.js';
import { usesJapanesePrompt } from './localeContent.js';

const MAX_WRITER_ATTEMPTS = 3;
const PARSE_RETRY_HINT = '\n\n【重要】前回の応答は解析できませんでした。有効なJSONオブジェクトのみを返してください（コードフェンスや説明文は不要です）。/ The previous response could not be parsed. Return only a single valid JSON object (no code fences or prose).';

function bannedConceptsFor({ planRows, generated, index, pinned }) {
  const banned = generated.slice().reverse().map(correctChoiceText);
  if (!pinned) planRows.forEach((r, i) => { if (r && i !== index) banned.push(r.concept); });
  return banned;
}

/**
 * @param {object} opts
 * @param {object} opts.exam
 * @param {number} opts.count
 * @param {object|null} [opts.task]            fixed task (task-mode quiz)
 * @param {string} [opts.level]
 * @param {Map<string, object[]>|null} [opts.unitsByTask]
 * @param {() => number} [opts.rng]
 * @param {string} opts.systemPrompt           writer system prompt
 * @param {(slot: object) => string} opts.baseUserPrompt
 * @param {(slot: object, occurrence: number) => Array<{title:string,url:string,note?:string}>} [opts.resourcesFor]
 * @param {(req: { systemPrompt: string, userPrompt: string, kind: string }) => Promise<string>} opts.callModel
 * @param {{ enabled?: boolean, dropRejected?: boolean }} [opts.judge]
 * @param {object} [opts.hooks]  onPlan(rows, blueprint) · onQuestion(question, index) · onProgress({ stage, done, total })
 * @returns {Promise<{ questions: object[], blueprint: object[], planRows: Array<object|null>, metrics: object }>}
 */
export async function generateExamQuestions({
  exam, count, task = null, level = 'Associate', unitsByTask = null, rng = Math.random,
  systemPrompt, baseUserPrompt, resourcesFor = () => [],
  callModel,
  judge = { enabled: false, dropRejected: true },
  hooks = {},
}) {
  const total = Number(count) || 0;
  const calls = { planner: 0, writer: 0, solver: 0, judge: 0, editor: 0 };
  const progress = (stage, done) => { try { hooks.onProgress?.({ stage, done, total }); } catch { /* ignore */ } };

  // Stage 0
  const blueprint = buildExamBlueprint({ exam, count: total, task, level, unitsByTask, rng });

  // Stage 1
  let planRows = Array(total).fill(null);
  let planDuplicates = 0;
  let planFailed = false;
  if (total >= PLANNER_MIN_QUESTIONS) {
    progress('planning', 0);
    const { systemPrompt: ps, userPrompt: pu } = buildPlannerPrompt({ exam, blueprint });
    try {
      calls.planner++;
      const text = await callModel({ systemPrompt: ps, userPrompt: pu, kind: 'planner' });
      const parsed = parsePlan(text, total);
      if (parsed) {
        const v = validatePlan(parsed);
        planRows = v.rows;
        planDuplicates = v.duplicates;
      } else {
        planFailed = true;
      }
    } catch {
      planFailed = true;
    }
  }
  try { await hooks.onPlan?.(planRows, blueprint, { failed: planFailed, duplicates: planDuplicates }); } catch { /* ignore */ }

  // Stages 2–4
  const generated = [];
  const taskOccurrences = new Map();
  let errorCount = 0;
  let parseFailCount = 0;
  let duplicateCount = 0;
  let rejectedCount = 0;
  let fixedCount = 0;
  const judgeOn = Boolean(judge?.enabled);
  const dropRejected = judge?.dropRejected !== false;

  for (let i = 0; i < total; i++) {
    const slot = blueprint[i];
    const occurrence = taskOccurrences.get(slot.task) || 0;
    taskOccurrences.set(slot.task, occurrence + 1);
    const resources = resourcesFor(slot, occurrence) || [];
    const planRow = planRows[i];
    const userPrompt = baseUserPrompt(slot)
      + buildResourceGroundingHint(resources)
      + buildSlotPromptSuffix({ slot, plan: planRow, banned: bannedConceptsFor({ planRows, generated, index: i, pinned: Boolean(planRow) }) })
      + buildAnswerPositionHint(slot.answerLetter);

    progress('writing', generated.length);
    let parsed = null;
    let nearDuplicate = null;
    let lastFailure = null;
    let slotErrored = false;
    for (let attempt = 0; attempt < MAX_WRITER_ATTEMPTS && !parsed; attempt++) {
      let attemptPrompt = userPrompt;
      if (lastFailure === 'parse') attemptPrompt = `${userPrompt}${PARSE_RETRY_HINT}`;
      else if (lastFailure === 'duplicate') attemptPrompt = `${userPrompt}${buildDuplicateRetryHint(correctChoiceText(nearDuplicate))}`;
      let response = '';
      try {
        calls.writer++;
        response = await callModel({ systemPrompt, userPrompt: attemptPrompt, kind: 'writer' });
        slotErrored = false;
      } catch {
        slotErrored = true;
        continue;
      }
      const candidate = parseQuizResponse(response);
      if (!candidate) { lastFailure = 'parse'; continue; }
      if (!nearDuplicate && isDuplicateQuestion(candidate, generated)) {
        nearDuplicate = candidate;
        lastFailure = 'duplicate';
        duplicateCount++;
        continue;
      }
      parsed = candidate;
    }
    if (!parsed && nearDuplicate) parsed = nearDuplicate;
    if (!parsed) {
      if (slotErrored) errorCount++; else parseFailCount++;
      continue;
    }

    parsed.domainId = slot.domain?.id ?? null;
    parsed.taskId = slot.task?.id ?? null;
    parsed.unitId = slot.unit?.id || slot.item || null;

    // Stage 3/4: quality evaluation.
    const material = [slot.unit ? renderUnitForPrompt(slot.unit, { locale: usesJapanesePrompt() ? 'ja' : 'en' }) : '', buildResourceGroundingHint(resources).trim()].filter(Boolean).join('\n\n');
    const design = `${slot.item || ''}${slot.type ? ` / ${slot.type[usesJapanesePrompt() ? 'ja' : 'en']}` : ''}`;
    const allowedUrls = resources.map((r) => r.url).concat(slot.unit?.card?.source?.url ? [slot.unit.card.source.url] : []);
    const flags = runDeterministicChecks(parsed, { expectedLetter: slot.answerLetter, allowedUrls });
    let judgeResult = null;
    let solverLetter = null;
    if (judgeOn) {
      progress('judging', generated.length);
      try {
        calls.solver++;
        solverLetter = parseSolverResponse(await callModel({ ...buildSolverPrompt(parsed), kind: 'solver' })).letter;
      } catch { solverLetter = null; }
      try {
        calls.judge++;
        const correctLetter = 'ABCD'[parsed.correctIndex];
        judgeResult = parseJudgeResponse(await callModel({
          ...buildJudgePrompt({ question: parsed, material, design, level, solver: { letter: solverLetter, agrees: solverLetter ? solverLetter === correctLetter : null } }),
          kind: 'judge',
        }));
      } catch { judgeResult = null; }
    }
    let verdict = decideVerdict({ flags, judge: judgeResult, solverLetter, correctLetter: 'ABCD'[parsed.correctIndex] });
    let fixed = false;
    if (verdict.outcome === 'fix') {
      progress('fixing', generated.length);
      try {
        calls.editor++;
        const edited = parseQuizResponse(await callModel({ ...buildEditorPrompt({ question: parsed, issues: verdict.issues, fix: judgeResult?.fix || '', material }), kind: 'editor' }));
        if (edited) {
          const editedFlags = runDeterministicChecks(edited, { expectedLetter: slot.answerLetter, allowedUrls });
          if (!editedFlags.some((f) => ['choice-count', 'duplicate-choices', 'all-of-the-above', 'missing-question', 'correct-index'].includes(f))) {
            parsed.question = edited.question;
            parsed.choices = edited.choices;
            parsed.correctIndex = edited.correctIndex;
            parsed.explanation = edited.explanation;
            fixed = true;
            fixedCount++;
            verdict = { ...verdict, outcome: 'pass', flags: editedFlags };
          }
        }
      } catch { /* keep the original with its issues */ }
      if (!fixed && verdict.flags.some((f) => ['choice-count', 'duplicate-choices', 'all-of-the-above', 'missing-question'].includes(f))) {
        // Structurally unusable and not repairable: treat as rejected.
        verdict = { ...verdict, outcome: 'reject' };
      }
    }
    if (verdict.outcome === 'reject' && dropRejected) {
      rejectedCount++;
      continue;
    }
    parsed.judge = { outcome: verdict.outcome, score: verdict.score, scores: judgeResult?.scores || null, issues: verdict.issues, flags: verdict.flags, solverLetter, solverAgrees: verdict.solverAgrees, fixed };
    parsed.explanation = appendMissingResourceRefs(parsed.explanation, resources);
    generated.push(parsed);
    try { await hooks.onQuestion?.(parsed, generated.length - 1); } catch { /* ignore */ }
    progress('writing', generated.length);
  }

  const diversity = summarizeDiversity(generated);
  const judging = summarizeJudging(generated);
  return {
    questions: generated,
    blueprint,
    planRows,
    metrics: {
      requested: total,
      generated: generated.length,
      errors: errorCount,
      parseFailures: parseFailCount,
      duplicatesRegenerated: duplicateCount,
      rejected: rejectedCount,
      fixed: fixedCount,
      planFailed,
      planDuplicates,
      clusters: diversity.clusters,
      largestCluster: diversity.largestCluster,
      largestClusterExample: diversity.largestExample,
      judged: judging.judged,
      passed: judging.passed,
      unjudged: judging.unjudged,
      avgJudgeScore: judging.avgScore,
      calls,
    },
  };
}
