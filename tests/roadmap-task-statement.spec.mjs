import { test, expect } from '@playwright/test';
import { taskStatementLines, taskStatementCopyText } from '../js/roadmapTaskStatement.js';

// Pure-logic spec (no browser) for issues #191 / #192: task statements should be
// showable on demand and easy to copy to the clipboard. The locale selection and
// line normalization are split into js/roadmapTaskStatement.js so they can be
// unit-tested without a browser and must stay byte-compatible with ui.js's
// localizedDescription + normalizeDescriptionLines.

test.describe('taskStatementLines (#191/#192)', () => {
  test('en falls back to description when descriptionEn is missing', () => {
    const task = { description: ['タスクステートメント 1.1: 基礎', '範囲を理解する'] };
    expect(taskStatementLines(task, 'en')).toEqual(['タスクステートメント 1.1: 基礎', '範囲を理解する']);
  });

  test('en uses descriptionEn when present', () => {
    const task = {
      description: ['タスクステートメント 1.1: 基礎'],
      descriptionEn: ['Task statement 1.1: Fundamentals', 'Understand the scope'],
    };
    expect(taskStatementLines(task, 'en')).toEqual(['Task statement 1.1: Fundamentals', 'Understand the scope']);
  });

  test('ja always uses description even when descriptionEn exists', () => {
    const task = {
      description: ['タスクステートメント 1.1: 基礎'],
      descriptionEn: ['Task statement 1.1: Fundamentals'],
    };
    expect(taskStatementLines(task, 'ja')).toEqual(['タスクステートメント 1.1: 基礎']);
  });

  test('trims entries and drops empty / whitespace-only lines', () => {
    const task = { description: ['  A  ', '', '   ', 'B'] };
    expect(taskStatementLines(task, 'ja')).toEqual(['A', 'B']);
  });

  test('accepts a plain string description', () => {
    const task = { description: '  single line  ' };
    expect(taskStatementLines(task, 'ja')).toEqual(['single line']);
  });

  test('a task with no description yields []', () => {
    expect(taskStatementLines({}, 'ja')).toEqual([]);
    expect(taskStatementLines({}, 'en')).toEqual([]);
    expect(taskStatementLines(null, 'ja')).toEqual([]);
  });
});

test.describe('taskStatementCopyText (#192)', () => {
  test('joins multiple lines with newlines in order', () => {
    const task = {
      description: [
        'タスクステートメント 1.1: AI と ML の基礎概念を理解する',
        '対象範囲: 機械学習の基本用語',
        '教師あり学習と教師なし学習の違い',
        '推論とトレーニングの違い',
      ],
    };
    expect(taskStatementCopyText(task, 'ja')).toBe(
      'タスクステートメント 1.1: AI と ML の基礎概念を理解する\n' +
        '対象範囲: 機械学習の基本用語\n' +
        '教師あり学習と教師なし学習の違い\n' +
        '推論とトレーニングの違い'
    );
  });

  test('uses the localized lines for the copy text', () => {
    const task = {
      description: [' A ', '', 'B'],
      descriptionEn: ['X', 'Y'],
    };
    expect(taskStatementCopyText(task, 'en')).toBe('X\nY');
    expect(taskStatementCopyText(task, 'ja')).toBe('A\nB');
  });

  test('returns an empty string when there are no lines', () => {
    expect(taskStatementCopyText({}, 'ja')).toBe('');
    expect(taskStatementCopyText({ description: ['   ', ''] }, 'ja')).toBe('');
  });
});
