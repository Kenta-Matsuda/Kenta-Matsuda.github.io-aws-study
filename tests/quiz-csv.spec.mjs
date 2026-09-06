import { test, expect } from '@playwright/test';
import { quizHistoryToCsv, escapeCsvField, QUIZ_CSV_HEADERS } from '../js/quizCsv.js';

// Pure-logic spec (no browser) for issue #165: users asked to download their
// saved question data (localStorage quiz history) as CSV for later review and
// import into other tools. The CSV conversion is split into js/quizCsv.js so it
// can be unit-tested without a browser or localStorage.

test.describe('quizHistoryToCsv (#165)', () => {
  test('emits header row only when history is empty', () => {
    const csv = quizHistoryToCsv([]);
    const lines = csv.replace(/\r\n$/, '').split('\r\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(QUIZ_CSV_HEADERS.join(','));
  });

  test('skips entries without a question (not reviewable)', () => {
    const csv = quizHistoryToCsv([
      { question: '', choices: ['a'], examId: 'clf-c02' },
      { question: 'Q1?', choices: ['a', 'b'], correctIndex: 1, userAnswer: 0, isCorrect: false, examId: 'clf-c02' },
    ]);
    const lines = csv.replace(/\r\n$/, '').split('\r\n');
    // header + exactly one data row (the empty-question entry is dropped)
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('Q1?');
  });

  test('maps indices to letters and correctness label', () => {
    const csv = quizHistoryToCsv([
      {
        answeredAt: '2026-01-02T03:04:05.000Z',
        examId: 'saa-c03',
        domainId: 2,
        mode: 'single',
        question: 'Which service?',
        choices: ['EC2', 'S3', 'RDS'],
        correctIndex: 1,
        userAnswer: 1,
        isCorrect: true,
        elapsedMs: 12000,
        explanation: 'S3 is object storage.',
      },
    ]);
    const row = csv.replace(/\r\n$/, '').split('\r\n')[1];
    // correctAnswer=B, yourAnswer=B, isCorrect=correct, elapsedSec=12
    expect(row).toContain(',B,B,correct,12,');
    expect(row).toContain('saa-c03');
  });

  test('escapes commas, quotes and newlines per RFC 4180', () => {
    expect(escapeCsvField('plain')).toBe('plain');
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsvField(null)).toBe('');
  });

  test('a question containing a comma stays in one CSV field', () => {
    const csv = quizHistoryToCsv([
      { question: 'A, B, or C?', choices: ['A'], correctIndex: 0, userAnswer: 0, isCorrect: true, examId: 'clf-c02' },
    ]);
    const dataRow = csv.replace(/\r\n$/, '').split('\r\n')[1];
    expect(dataRow).toContain('"A, B, or C?"');
  });
});
