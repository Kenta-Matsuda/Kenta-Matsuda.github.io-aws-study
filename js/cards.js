/**
 * Cards: pre-prepared "what to test" data for the exam pipeline (issue #225,
 * design §4). Three kinds, one per exam profile:
 *
 *   case      architecture exams — a build case mined from an AWS blog/guide:
 *             context, constraints and the DECISION POINTS the architect faced,
 *             each with the chosen option, why, and the rejected alternatives
 *             (which become realistic distractors).
 *   framework framework exams (AIB …) — a framework map: perspective × stage
 *             × capability CELLS with a summary and common misconceptions.
 *   concept   foundational exams — term/definition cards with confusables.
 *
 * Cards live in js/data/cards/<exam-id>.js and are produced by the CI
 * `exam-content-maintainer` agent, then human-reviewed. They are never fetched
 * at runtime. The pipeline uses them through "units": the smallest thing one
 * question can test (a decision point, a cell or a concept), each mapped to the
 * task statements it supports.
 *
 * Pure module: no DOM / network / storage.
 */

/** Questions a unit inventory must be able to cover, relative to the exam size. */
export const COVERAGE_FACTOR = 1.5;

const KINDS = new Set(['case', 'framework', 'concept']);

/**
 * Flatten a card file's cards into units.
 * @param {{ cards?: object[] }|object[]} cardData  `{ cards: [...] }` or the array itself
 * @returns {Array<{ id: string, kind: string, cardId: string, tasks: string[], level: string|null, label: string, card: object, detail: object }>}
 */
export function listUnits(cardData) {
  const cards = Array.isArray(cardData) ? cardData : (cardData?.cards || []);
  const units = [];
  for (const card of cards) {
    if (!card || !KINDS.has(card.kind)) continue;
    if (card.kind === 'case') {
      for (const d of card.decisions || []) {
        if (!d?.id || !d.question) continue;
        units.push({ id: `${card.id}#${d.id}`, kind: 'case', cardId: card.id, tasks: d.tasks || card.tasks || [], level: d.level || card.level || null, label: d.question, card, detail: d });
      }
    } else if (card.kind === 'framework') {
      for (const c of card.cells || []) {
        if (!c?.id || !c.capability) continue;
        units.push({ id: `${card.id}#${c.id}`, kind: 'framework', cardId: card.id, tasks: c.tasks || card.tasks || [], level: c.level || card.level || null, label: `${c.perspective} × ${c.stage}: ${c.capability}`, card, detail: c });
      }
    } else if (card.kind === 'concept') {
      if (!card.id || !card.term) continue;
      units.push({ id: card.id, kind: 'concept', cardId: card.id, tasks: card.tasks || [], level: card.level || null, label: card.term, card, detail: card });
    }
  }
  return units;
}

/**
 * Structural validation; returns human-readable problems (empty = valid).
 * @param {{ cards?: object[] }|object[]} cardData
 * @param {{ taskIds?: string[] }} [opts]  known task ids to check mappings against
 * @returns {string[]}
 */
export function validateCards(cardData, { taskIds } = {}) {
  const cards = Array.isArray(cardData) ? cardData : (cardData?.cards || []);
  const problems = [];
  const seen = new Set();
  const known = taskIds ? new Set(taskIds.map(String)) : null;
  const checkTasks = (where, tasks) => {
    if (!Array.isArray(tasks) || tasks.length === 0) { problems.push(`${where}: tasks is empty`); return; }
    if (known) for (const t of tasks) if (!known.has(String(t))) problems.push(`${where}: unknown task ${t}`);
  };
  cards.forEach((card, i) => {
    const where = `cards[${i}]${card?.id ? ` (${card.id})` : ''}`;
    if (!card || typeof card !== 'object') { problems.push(`${where}: not an object`); return; }
    if (!card.id) problems.push(`${where}: missing id`);
    else if (seen.has(card.id)) problems.push(`${where}: duplicate id`);
    seen.add(card.id);
    if (!KINDS.has(card.kind)) problems.push(`${where}: unknown kind "${card.kind}"`);
    if (!card.source?.url) problems.push(`${where}: missing source.url`);
    if (card.kind === 'case') {
      if (!card.context) problems.push(`${where}: missing context`);
      if (!Array.isArray(card.decisions) || !card.decisions.length) problems.push(`${where}: no decisions`);
      (card.decisions || []).forEach((d, j) => {
        const w = `${where}.decisions[${j}]`;
        if (!d?.id) problems.push(`${w}: missing id`);
        if (!d?.question) problems.push(`${w}: missing question`);
        if (!d?.chosen) problems.push(`${w}: missing chosen`);
        if (!Array.isArray(d?.rejected) || d.rejected.length === 0) problems.push(`${w}: no rejected alternatives (needed for distractors)`);
        checkTasks(w, d?.tasks || card.tasks);
      });
    } else if (card.kind === 'framework') {
      if (!card.framework) problems.push(`${where}: missing framework`);
      if (!Array.isArray(card.cells) || !card.cells.length) problems.push(`${where}: no cells`);
      (card.cells || []).forEach((c, j) => {
        const w = `${where}.cells[${j}]`;
        for (const k of ['id', 'perspective', 'stage', 'capability', 'summary']) if (!c?.[k]) problems.push(`${w}: missing ${k}`);
        checkTasks(w, c?.tasks || card.tasks);
      });
    } else if (card.kind === 'concept') {
      for (const k of ['term', 'definition']) if (!card[k]) problems.push(`${where}: missing ${k}`);
      checkTasks(where, card.tasks);
    }
  });
  return problems;
}

/**
 * Coverage report for one exam (pure).
 * @param {{ cards?: object[] }|object[]} cardData
 * @param {{ questionCount: number, taskIds: string[] }} exam
 * @returns {{ units: number, required: number, sufficient: boolean, tasksCovered: number, tasksTotal: number, uncoveredTasks: string[], byKind: Record<string, number> }}
 */
export function coverageReport(cardData, { questionCount, taskIds }) {
  const units = listUnits(cardData);
  const covered = new Set();
  const byKind = {};
  for (const u of units) {
    byKind[u.kind] = (byKind[u.kind] || 0) + 1;
    for (const t of u.tasks) covered.add(String(t));
  }
  const required = Math.ceil((Number(questionCount) || 0) * COVERAGE_FACTOR);
  const uncoveredTasks = (taskIds || []).map(String).filter((t) => !covered.has(t));
  return { units: units.length, required, sufficient: units.length >= required && uncoveredTasks.length === 0, tasksCovered: covered.size, tasksTotal: (taskIds || []).length, uncoveredTasks, byKind };
}

/**
 * Index units by task id so a blueprint slot can draw the next unit for its task.
 * @param {object[]} units
 * @returns {Map<string, object[]>}
 */
export function indexUnitsByTask(units) {
  const map = new Map();
  for (const u of units) for (const t of u.tasks) {
    const key = String(t);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(u);
  }
  return map;
}

function lines(label, arr) {
  return Array.isArray(arr) && arr.length ? [`${label}`, ...arr.map((x) => `  - ${typeof x === 'string' ? x : `${x.option}${x.why ? `（${x.why}）` : ''}`}`)] : [];
}

/**
 * The card material for one unit, rendered for the writer prompt. Japanese
 * labels for `locale` 'ja', English labels otherwise. Rejected alternatives / misconceptions are listed
 * explicitly so the writer builds distractors from them.
 * @param {object} unit  from listUnits
 * @param {{ locale?: string }} [opts]
 * @returns {string}
 */
export function renderUnitForPrompt(unit, { locale = 'ja' } = {}) {
  if (!unit) return '';
  // English labels for every non-Japanese locale (prompt scaffolding).
  const en = locale !== 'ja';
  const out = [];
  const card = unit.card;
  const d = unit.detail;
  if (unit.kind === 'case') {
    out.push(en ? '[Case material (from an AWS build case)]' : '【ケース素材（AWS の構築事例より）】');
    out.push(`${en ? 'Context' : '状況'}: ${card.context}`);
    if (card.constraints?.length) out.push(`${en ? 'Constraints' : '制約'}: ${card.constraints.join(' / ')}`);
    out.push(`${en ? 'Decision point' : '判断ポイント'}: ${d.question}`);
    out.push(`${en ? 'Chosen' : '採用した構成'}: ${d.chosen}${d.why ? `（${d.why}）` : ''}`);
    out.push(...lines(en ? 'Rejected alternatives (use as distractors):' : '不採用案（誤答の素材にする）:', d.rejected));
    if (d.services?.length) out.push(`${en ? 'Services' : '関係サービス'}: ${d.services.join(', ')}`);
    if (card.pitfalls?.length) out.push(...lines(en ? 'Pitfalls:' : '落とし穴:', card.pitfalls));
    out.push(`${en ? 'Source' : '出典'}: ${card.source.title} — ${card.source.url}`);
  } else if (unit.kind === 'framework') {
    out.push(en ? '[Framework cell]' : '【フレームワークのセル】');
    out.push(`${card.framework} — ${d.perspective} × ${d.stage} × ${d.capability}`);
    out.push(`${en ? 'Summary' : '要点'}: ${d.summary}`);
    out.push(...lines(en ? 'Common misconceptions (use as distractors):' : 'よくある誤解（誤答の素材にする）:', d.misconceptions));
    out.push(`${en ? 'Source' : '出典'}: ${card.source.title} — ${card.source.url}`);
  } else {
    out.push(en ? '[Concept card]' : '【概念カード】');
    out.push(`${d.term}: ${d.definition}`);
    if (d.service) out.push(`${en ? 'Service' : 'サービス'}: ${d.service}`);
    out.push(...lines(en ? 'Confusable concepts (use as distractors):' : '混同しやすい概念（誤答の素材にする）:', d.confusables));
    out.push(`${en ? 'Source' : '出典'}: ${card.source.title} — ${card.source.url}`);
  }
  return out.join('\n');
}
