import { test, expect } from '@playwright/test';
import { normalizeMarkdownForJapanese } from '../js/markdown.js';

// Pure-logic spec (no browser) for issue #164: AI generated explanations that
// wrap emphasis in Japanese brackets, e.g. 次の**「用語」**のように, were rendered
// with literal asterisks because neither `**` run satisfies CommonMark's
// left/right-flanking rules.

const BOLD_PAIR = /\*\*/g;

test.describe('normalizeMarkdownForJapanese – emphasis flanking (#164)', () => {
  test('pads emphasis wrapped in Japanese brackets and glued to kana', () => {
    const input = '次の**「誰が聞いても同じ意味で伝わるように用語や概念を整理したもの」**のように';
    const out = normalizeMarkdownForJapanese(input);
    expect(out).toBe(
      '次の **「誰が聞いても同じ意味で伝わるように用語や概念を整理したもの」** のように',
    );
  });

  test('pads only the side that needs it (start of line)', () => {
    const input = '**「用語集」**を作る';
    const out = normalizeMarkdownForJapanese(input);
    // Nothing precedes the opening run, so only the trailing side is padded.
    expect(out).toBe('**「用語集」** を作る');
  });

  test('pads only the side that needs it (end of line)', () => {
    const input = 'まずは**「用語集」**';
    expect(normalizeMarkdownForJapanese(input)).toBe('まずは **「用語集」**');
  });

  test('leaves already-parsable emphasis untouched', () => {
    const cases = [
      '次の **「用語集」** のように',
      'これは**太字**です',
      '（**重要**）',
      'a **bold** b',
      '**「用語集」**',
    ];
    for (const input of cases) {
      expect(normalizeMarkdownForJapanese(input)).toBe(input);
    }
  });

  test('does not add padding when neighbours are punctuation', () => {
    const input = '（**「用語集」**）';
    expect(normalizeMarkdownForJapanese(input)).toBe(input);
  });

  test('handles *** (bold + italic)', () => {
    const input = '次の***「重要」***のように';
    expect(normalizeMarkdownForJapanese(input)).toBe('次の ***「重要」*** のように');
  });

  test('still collapses spaces inside the delimiters', () => {
    const input = '次の** 「用語集」 **のように';
    expect(normalizeMarkdownForJapanese(input)).toBe('次の **「用語集」** のように');
  });

  test('still converts fullwidth asterisks', () => {
    const input = 'これは＊＊太字＊＊です';
    expect(normalizeMarkdownForJapanese(input)).toBe('これは**太字**です');
  });

  test('leaves fenced code blocks untouched', () => {
    const input = ['前の文', '```js', "const s = '次の**「x」**のように';", '```', '後の文'].join('\n');
    expect(normalizeMarkdownForJapanese(input)).toBe(input);
  });

  test('leaves inline code spans untouched', () => {
    const input = '設定は `次の**「x」**のように` と書きます';
    expect(normalizeMarkdownForJapanese(input)).toBe(input);
  });

  test('keeps the number of asterisk delimiters unchanged', () => {
    const input = '次の**「A」**と**「B」**を比較する';
    const out = normalizeMarkdownForJapanese(input);
    expect((out.match(BOLD_PAIR) || []).length).toBe((input.match(BOLD_PAIR) || []).length);
    expect(out).toBe('次の **「A」** と **「B」** を比較する');
  });

  test('empty and nullish input is safe', () => {
    expect(normalizeMarkdownForJapanese('')).toBe('');
    expect(normalizeMarkdownForJapanese(null)).toBe('');
    expect(normalizeMarkdownForJapanese(undefined)).toBe('');
  });
});

// End-to-end confirmation of the diagnosis: the same string that marked renders
// with literal asterisks becomes real <strong> once normalized. Uses the marked
// build the app itself loads (assets/vendor/marked.min.js).
test.describe('marked output before/after normalization (#164)', () => {
  test('literal asterisks become <strong>', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => typeof window.marked?.parse === 'function');

    const raw = '次の**「誰が聞いても同じ意味で伝わるもの」**のように';
    const normalized = normalizeMarkdownForJapanese(raw);
    expect(normalized).not.toBe(raw);

    const { before, after } = await page.evaluate(
      ([r, n]) => {
        window.marked.setOptions({ gfm: true, breaks: true });
        return { before: window.marked.parse(r), after: window.marked.parse(n) };
      },
      [raw, normalized],
    );

    // Before: emphasis is not recognized, asterisks leak into the output.
    expect(before).toContain('**');
    expect(before).not.toContain('<strong>');

    // After: proper emphasis, no leaked asterisks.
    expect(after).toContain('<strong>');
    expect(after).not.toContain('**');
  });
});
