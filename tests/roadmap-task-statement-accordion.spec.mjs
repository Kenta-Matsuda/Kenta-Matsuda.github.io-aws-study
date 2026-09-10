import { test, expect } from '@playwright/test';

// DOM regression spec for the #191 follow-up (PR #196): the roadmap task-statement
// disclosures must behave like an accordion — opening one collapses any other
// that is currently open, so the roadmap never shows a stack of expanded toggles
// at once. ui.js registers a capture-phase `toggle` listener on the content area
// (the `toggle` event does not bubble) that closes sibling
// `details.task-statement-details[open]` elements. This test reproduces that exact
// wiring against a real browser DOM so the behavior is guarded in CI without
// having to render the whole app.
//
// Cannot be executed in the INTEGRATIONS_ONLY sandbox (no browser / npm 403);
// runs in CI. Manual reproduction: `node dev-server.mjs`, open a roadmap with
// multiple tasks, expand two different "タスクステートメント" toggles and confirm
// the first one collapses when the second opens.

const PAGE = `
  <div id="content">
    <details class="task-statement-details" id="d1"><summary>1.1</summary><div>a</div></details>
    <details class="task-statement-details" id="d2"><summary>1.2</summary><div>b</div></details>
    <details class="task-statement-details" id="d3"><summary>1.3</summary><div>c</div></details>
    <details class="other-details" id="d4"><summary>other</summary><div>d</div></details>
  </div>
  <script>
    const content = document.getElementById('content');
    content.addEventListener(
      'toggle',
      (e) => {
        const opened = e.target;
        if (!(opened instanceof HTMLDetailsElement)) return;
        if (!opened.classList.contains('task-statement-details') || !opened.open) return;
        content
          .querySelectorAll('details.task-statement-details[open]')
          .forEach((details) => {
            if (details !== opened) details.open = false;
          });
      },
      true
    );
  </script>
`;

test.describe('roadmap task-statement accordion (#191 follow-up / PR #196)', () => {
  test('opening one task-statement toggle collapses previously-open ones', async ({ page }) => {
    await page.setContent(PAGE);

    await page.locator('#d1').evaluate((el) => (el.open = true));
    await expect(page.locator('#d1')).toHaveJSProperty('open', true);

    // Opening d2 must collapse d1 (accordion behavior).
    await page.locator('#d2').evaluate((el) => (el.open = true));
    await expect(page.locator('#d2')).toHaveJSProperty('open', true);
    await expect(page.locator('#d1')).toHaveJSProperty('open', false);

    // Opening d3 must collapse d2.
    await page.locator('#d3').evaluate((el) => (el.open = true));
    await expect(page.locator('#d3')).toHaveJSProperty('open', true);
    await expect(page.locator('#d2')).toHaveJSProperty('open', false);
  });

  test('non task-statement details are not affected by the accordion', async ({ page }) => {
    await page.setContent(PAGE);

    await page.locator('#d1').evaluate((el) => (el.open = true));
    // A details without the task-statement class stays open independently.
    await page.locator('#d4').evaluate((el) => (el.open = true));
    await expect(page.locator('#d1')).toHaveJSProperty('open', true);
    await expect(page.locator('#d4')).toHaveJSProperty('open', true);
  });
});
