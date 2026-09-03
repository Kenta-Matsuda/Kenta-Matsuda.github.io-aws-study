import { test, expect } from '@playwright/test';
import { parseQuizResponse, parseQuizJson } from '../js/quiz.js';

// Pure-logic spec: exercises the AI quiz JSON parsing paths without a browser.
// Regression coverage for issue #84 (AI question rendered as raw JSON).

test.describe('parseQuizResponse robustness (#84)', () => {
  test('fenced JSON with leading prose parses', () => {
    const input =
      'Here is your question:\n\n```json\n' +
      '{"question":"What is S3?","choices":["A. Object storage","B. Block storage"],"correct":"A","explanation":"S3 is object storage."}\n' +
      '```\nHope that helps!';
    const result = parseQuizResponse(input);
    expect(result).not.toBeNull();
    expect(result.question).toBe('What is S3?');
    expect(result.choices).toHaveLength(2);
    expect(result.correctIndex).toBe(0);
  });

  test('numeric `correct` prefers 1-based (2 choices)', () => {
    const input =
      '```json\n' +
      '{"question":"Q?","choices":["A. x","B. y"],"correct":2,"explanation":"e"}\n' +
      '```';
    const result = parseQuizResponse(input);
    expect(result).not.toBeNull();
    expect(result.correctIndex).toBe(1);
  });

  test('numeric `correct` prefers 1-based in the previously ambiguous overlap (3+ choices)', () => {
    // `correct: 2` on 3 choices must resolve to the 2nd choice (index 1),
    // not index 2, since choices are labeled A/B/C (1-based positions).
    const result = parseQuizResponse(
      '{"question":"Q?","choices":["A. x","B. y","C. z"],"correct":2,"explanation":"e"}',
    );
    expect(result).not.toBeNull();
    expect(result.correctIndex).toBe(1);
  });

  test('numeric `correct` of 0 falls back to 0-based (index 0)', () => {
    const result = parseQuizResponse(
      '{"question":"Q?","choices":["A. x","B. y","C. z"],"correct":0,"explanation":"e"}',
    );
    expect(result).not.toBeNull();
    expect(result.correctIndex).toBe(0);
  });

  test('`correct` as full choice text parses', () => {
    const input =
      '{"question":"Which service is serverless compute?",' +
      '"choices":["A. EC2","B. Lambda","C. RDS"],' +
      '"correct":"B. Lambda","explanation":"Lambda is serverless."}';
    const result = parseQuizResponse(input);
    expect(result).not.toBeNull();
    expect(result.correctIndex).toBe(1);
  });

  test('`choices` as an object keyed by A/B/C/D parses', () => {
    const input =
      '{"question":"Q?","choices":{"A":"first","B":"second","C":"third"},' +
      '"correct":"C","explanation":"e"}';
    const result = parseQuizResponse(input);
    expect(result).not.toBeNull();
    expect(result.choices).toEqual(['first', 'second', 'third']);
    expect(result.correctIndex).toBe(2);
  });

  test('trailing prose after the JSON object parses (no closing fence)', () => {
    const input =
      'Sure!\n{"question":"Q?","choices":["A. x","B. y"],"correct":"B","explanation":"e"}\nGood luck!';
    const result = parseQuizResponse(input);
    expect(result).not.toBeNull();
    expect(result.correctIndex).toBe(1);
  });

  test('genuinely malformed input returns null (empty question)', () => {
    const input = '{"question":"","choices":["A. x","B. y"],"correct":"A"}';
    expect(parseQuizJson(input)).toBeNull();
  });

  test('genuinely malformed input returns null (fewer than 2 choices)', () => {
    const input = '{"question":"Q?","choices":["A. only"],"correct":"A"}';
    expect(parseQuizJson(input)).toBeNull();
  });

  test('genuinely malformed input returns null (out-of-range answer)', () => {
    const input = '{"question":"Q?","choices":["A. x","B. y"],"correct":9}';
    expect(parseQuizJson(input)).toBeNull();
  });

  test('non-JSON prose returns null from parseQuizJson', () => {
    expect(parseQuizJson('This is not a quiz at all.')).toBeNull();
  });
});
