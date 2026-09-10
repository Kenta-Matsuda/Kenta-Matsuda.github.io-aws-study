import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Wiring/regression coverage for issue #189.
//
// The pure search module is covered by tests/resource-search.spec.mjs, but the
// original UI wiring shipped a fatal bug: wireGlobalUiHandlers() called
// wireResourceSearchHandlers({ els, exams }) while `exams` was NOT in that
// function's scope, throwing a ReferenceError that aborted the ENTIRE initApp
// sequence (not just search). `node --check` did not catch it because a bare
// identifier is valid syntax, and the pure-module spec never loads ui.js.
//
// This file adds two guards:
//   1. A source-level static guard (Guard A) that runs WITHOUT a browser, so it
//      is verifiable in the sandbox and in CI. It asserts that every function
//      which uses `exams` (the search-wiring chain) actually declares/receives
//      it, catching exactly this scoping regression.
//   2. A browser smoke test (Guard B) that boots the real app and asserts init
//      completed with no uncaught page error and the search UI is wired. This
//      needs a browser (CI only); it is the end-to-end backstop.

const __dirname = dirname(fileURLToPath(import.meta.url));
const UI_JS = join(__dirname, '..', 'js', 'ui.js');

/**
 * Extract the body of a top-level `function name(...) { ... }` by brace-matching.
 * Pure string scan; no eval. Returns { params, body } or null if not found.
 */
function extractFunction(source, name) {
  // Params may themselves contain braces (destructuring), so match up to the
  // closing `)` of the parameter list, then brace-match the body from the very
  // next `{` after it.
  const sig = new RegExp(`function\\s+${name}\\s*\\(([^)]*)\\)\\s*\\{`);
  const m = sig.exec(source);
  if (!m) return null;
  const params = m[1];
  // The body's opening brace is the last `{` of the matched signature.
  const start = m.index + m[0].length - 1;
  let depth = 0;
  let i = start;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return { params, body: source.slice(start + 1, i) };
}

test.describe('cross-resource search wiring (#189) — source guard [no browser]', () => {
  const source = readFileSync(UI_JS, 'utf8');

  // Guard A: the exact class of bug that shipped. wireResourceSearchHandlers
  // needs the exam list; it is called from wireGlobalUiHandlers, which is a
  // top-level function that does NOT close over initApp's `exams`. So both the
  // handler and its caller must explicitly receive `exams` as a parameter, and
  // the caller inside initApp must forward it.
  test('wireResourceSearchHandlers declares an `exams` parameter', () => {
    const fn = extractFunction(source, 'wireResourceSearchHandlers');
    expect(fn, 'wireResourceSearchHandlers must exist').toBeTruthy();
    expect(/\bexams\b/.test(fn.params)).toBe(true);
  });

  test('wireGlobalUiHandlers declares `exams` and forwards it to the search handler', () => {
    const fn = extractFunction(source, 'wireGlobalUiHandlers');
    expect(fn, 'wireGlobalUiHandlers must exist').toBeTruthy();
    // It uses `exams` in its body (forwarding to the search handler)...
    expect(/wireResourceSearchHandlers\(\s*\{[^}]*\bexams\b[^}]*\}\s*\)/.test(fn.body)).toBe(true);
    // ...so it MUST receive `exams` as a parameter, or that use is a
    // ReferenceError at runtime (the original bug).
    expect(/\bexams\b/.test(fn.params)).toBe(true);
  });

  test('initApp forwards `exams` into wireGlobalUiHandlers', () => {
    const fn = extractFunction(source, 'initApp');
    expect(fn, 'initApp must exist').toBeTruthy();
    expect(/\bexams\b/.test(fn.params)).toBe(true);
    expect(/wireGlobalUiHandlers\(\s*\{[^}]*\bexams\b[^}]*\}\s*\)/.test(fn.body)).toBe(true);
  });
});

test.describe('cross-resource search wiring (#189) — app boot smoke [browser, CI]', () => {
  test('app initializes without an uncaught error and the search modal wires up', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.addInitScript(() => {
      localStorage.setItem('asn_locale', 'ja');
    });
    await page.goto('/#clf');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1200);

    // If init aborted (e.g. the `exams` ReferenceError), a pageerror fires and
    // downstream wiring never runs.
    expect(pageErrors, `uncaught page errors: ${pageErrors.join('; ')}`).toEqual([]);

    // The search button exists and opening it populates the exam <select> with
    // more than the single "All exams" option — proving wireResourceSearchHandlers
    // received a real exam list.
    const searchBtn = page.locator('#resourceSearchBtn');
    await expect(searchBtn).toHaveCount(1);
    await searchBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#resourceSearchModal')).toBeVisible();
    const optionCount = await page.locator('#resourceSearchExam option').count();
    expect(optionCount).toBeGreaterThan(1);
  });
});
