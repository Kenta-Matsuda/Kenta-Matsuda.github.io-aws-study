import { test, expect } from '@playwright/test';

// Coverage for issue #168:
// - the first carousel slide must be the question-generation entry point
// - the book promotion must come last
// - the first slide must stay visible longer than the regular 5s rotation
//   right after the page opens

test.describe('dashboard carousel order and initial dwell (#168)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('asn_locale', 'ja');
      localStorage.setItem(
        'asn_study_state_v1',
        JSON.stringify({
          schemaVersion: 2,
          profile: { name: 'testuser' },
          xp: { total: 0, history: [], weekRing: [] },
          quizHistory: [],
        }),
      );
    });
  });

  test('first slide is the quiz launcher and the book promo is last', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#carouselTrack .dashboard-carousel-slide');

    const slides = page.locator('#carouselTrack .dashboard-carousel-slide');
    const count = await slides.count();
    expect(count).toBeGreaterThan(1);

    await expect(slides.first()).toHaveAttribute('data-carousel-slide', 'quiz');
    await expect(slides.first().locator('#dashboardQuizBtn')).toHaveCount(1);

    await expect(slides.nth(count - 1)).toHaveAttribute('data-carousel-slide', 'book-promo');
    await expect(slides.nth(count - 1).locator('.book-promo-card')).toHaveCount(1);
  });

  test('the first slide is held longer than the regular rotation', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#carouselTrack .dashboard-carousel-slide');

    // The browser normalizes `translateX(-0%)` to `translateX(0%)`.
    const isFirstSlide = (tf) => tf === '' || /translateX\(-?0%\)/.test(tf);
    const offset = () => page.evaluate(() => document.getElementById('carouselTrack')?.style.transform || '');

    // Before the fix the interval fired at 5s; at 7s we must still be on slide 1.
    await page.waitForTimeout(7000);
    expect(isFirstSlide(await offset())).toBeTruthy();

    // It must still auto-advance eventually (the hold is 12s).
    await page.waitForFunction(
      () => {
        const tf = document.getElementById('carouselTrack')?.style.transform || '';
        return tf !== '' && !/translateX\(-?0%\)/.test(tf);
      },
      { timeout: 12000 },
    );
  });
});
