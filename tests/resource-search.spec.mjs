import { test, expect } from '@playwright/test';
import { buildResourceIndex, searchResources } from '../js/resourceSearch.js';
import { ALL_EXAMS } from '../js/exams.js';

// Pure-logic spec (no browser) for issue #189: users asked to search across every
// published resource, either scoped to a single exam (mode 1) or across all exams
// by keyword only (mode 2), e.g. "is there an Amazon QuickSight document?".
//
// The flattening + keyword matching lives in js/resourceSearch.js as a DOM-free
// pure module (mirroring js/quizCsv.js and js/roadmapTaskStatement.js) so it can be
// unit-tested without a browser. This spec exercises that module directly; the
// modal UI is verified separately (browser E2E is CI-only, see findings). The
// assertions use QuickSight, a service that really appears in js/data/*.js, so the
// test would fail if search regressed to returning nothing.

test.describe('buildResourceIndex (#189)', () => {
  test('covers all 13 exams and every record has a url and title', () => {
    const index = buildResourceIndex();
    expect(Array.isArray(index)).toBe(true);
    expect(index.length).toBeGreaterThan(0);

    const examIds = new Set(index.map((r) => r.examId));
    expect(examIds.size).toBe(13);
    // The index must not invent exams outside the data set.
    const knownExamIds = new Set(ALL_EXAMS.map((e) => e.id));
    for (const id of examIds) {
      expect(knownExamIds.has(id)).toBe(true);
    }

    for (const record of index) {
      expect(typeof record.url).toBe('string');
      expect(record.url.length).toBeGreaterThan(0);
      expect(typeof record.title).toBe('string');
      expect(record.title.length).toBeGreaterThan(0);
    }
  });

  test('includes both step-level (taskId null) and task-level (taskId set) records', () => {
    const index = buildResourceIndex();
    const stepLevel = index.filter((r) => r.taskId === null);
    const taskLevel = index.filter((r) => r.taskId !== null);
    expect(stepLevel.length).toBeGreaterThan(0);
    expect(taskLevel.length).toBeGreaterThan(0);
  });

  test('records carry exam / section / task attribution', () => {
    const index = buildResourceIndex();
    const record = index.find((r) => r.taskId !== null);
    expect(record).toBeTruthy();
    expect(record.examId.length).toBeGreaterThan(0);
    expect(record.examCode.length).toBeGreaterThan(0);
    // Task-level records use the domain as the section heading (stepTitle).
    expect(record.stepTitle.length).toBeGreaterThan(0);
    expect(record.taskId.length).toBeGreaterThan(0);
  });

  test('accepts an explicit exams subset', () => {
    const single = ALL_EXAMS.filter((e) => e.id === 'clf-c02');
    const index = buildResourceIndex(single);
    expect(index.length).toBeGreaterThan(0);
    expect(new Set(index.map((r) => r.examId)).size).toBe(1);
    expect(index.every((r) => r.examId === 'clf-c02')).toBe(true);
  });
});

test.describe('searchResources (#189)', () => {
  test('an empty or whitespace-only query returns []', () => {
    const index = buildResourceIndex();
    expect(searchResources(index, '')).toEqual([]);
    expect(searchResources(index, '   ')).toEqual([]);
    expect(searchResources(index, undefined)).toEqual([]);
  });

  test('is case-insensitive (lower and upper queries yield equal counts)', () => {
    const index = buildResourceIndex();
    const lower = searchResources(index, 's3', { limit: 1000 });
    const upper = searchResources(index, 'S3', { limit: 1000 });
    expect(lower.length).toBeGreaterThan(0);
    expect(lower.length).toBe(upper.length);
  });

  test('finds a real term across all exams with full attribution', () => {
    const index = buildResourceIndex();
    const results = searchResources(index, 'quicksight');
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      const haystack = `${r.title} ${r.titleEn} ${r.note} ${r.noteEn} ${r.url} ${r.urlEn}`.toLowerCase();
      expect(haystack).toContain('quicksight');
      expect(r.examId.length).toBeGreaterThan(0);
      expect(r.examCode.length).toBeGreaterThan(0);
      expect(r.url.length).toBeGreaterThan(0);
      // Each result is attributable to a section or a task.
      expect((r.stepTitle + r.taskTitle).length).toBeGreaterThan(0);
    }
  });

  test('splits on whitespace with AND semantics ("quick sight" matches "QuickSight")', () => {
    const index = buildResourceIndex();
    const joined = searchResources(index, 'quicksight');
    const spaced = searchResources(index, 'quick sight');
    expect(spaced.length).toBeGreaterThan(0);
    expect(spaced.length).toBe(joined.length);
  });

  test('AND semantics narrows results (extra term is a subset of the single term)', () => {
    const index = buildResourceIndex();
    const broad = searchResources(index, 'quicksight', { limit: 1000 });
    const narrow = searchResources(index, 'quicksight athena', { limit: 1000 });
    expect(narrow.length).toBeGreaterThan(0);
    // Adding a required term can only keep or shrink the match set.
    expect(narrow.length).toBeLessThanOrEqual(broad.length);
    const broadKeys = new Set(broad.map((r) => `${r.examId}\n${r.url}`));
    for (const r of narrow) {
      expect(broadKeys.has(`${r.examId}\n${r.url}`)).toBe(true);
    }
  });

  test('examId option restricts results to that exam only (mode 1)', () => {
    const index = buildResourceIndex();
    const scoped = searchResources(index, 'guide', { examId: 'clf-c02' });
    expect(scoped.length).toBeGreaterThan(0);
    expect(scoped.every((r) => r.examId === 'clf-c02')).toBe(true);
  });

  test('limit caps the number of returned results', () => {
    const index = buildResourceIndex();
    const capped = searchResources(index, 'aws', { limit: 5 });
    expect(capped.length).toBe(5);
  });

  test('de-duplicates identical (examId + url) records', () => {
    const index = buildResourceIndex();
    const results = searchResources(index, 'aws', { limit: 1000 });
    const keys = results.map((r) => `${r.examId}\n${r.url}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
