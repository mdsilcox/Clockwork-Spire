import { expect, test } from '@playwright/test';
import { noSidewaysScroll, skipFirstLaunch, watchErrors } from './helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC "Done means" / P5: from a fresh save, normal play (the sim bot through the real controller) wins within 30 runs.
test('autoplay wins a career from a fresh profile, then the Workshop celebrates', async ({ page }, info) => {
  const errors = watchErrors(page);
  await skipFirstLaunch(page);
  await page.goto('/');
  await expect(page.getByTestId('title')).toBeVisible();

  const t0 = Date.now();
  const result = await page.evaluate(() => (window as any).__game.autoplay({ maxRuns: 30, speed: 'skip' }));
  const secs = (Date.now() - t0) / 1000;
  info.annotations.push({ type: 'career', description: `${JSON.stringify(result)} in ${secs.toFixed(0)} s` });
  console.log(`career: ${JSON.stringify(result)} in ${secs.toFixed(0)} s`);

  expect(result.won).toBe(true);
  expect(result.firstWinRun).toBeLessThanOrEqual(30);

  // the victory screen and the ending
  await expect(page.getByTestId('victory')).toBeVisible();
  await expect(page.getByTestId('ending')).toBeVisible();
  await noSidewaysScroll(page);
  const skip = page.getByTestId('ending-skip');
  if (await skip.count()) await skip.click();
  await expect(page.getByTestId('credits')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('ending-done').click();
  await expect(page.getByTestId('brass-breakdown')).toContainText('Victory bonus');
  await page.getByTestId('end-continue').click();

  // the Workshop: the profile is marked won and Sprocket celebrates
  await expect(page.getByTestId('workshop')).toBeVisible();
  const profile = await page.evaluate(() => (window as any).__game.profile());
  expect(profile.wins).toBeGreaterThanOrEqual(1);
  expect(profile.storyFlags).toContain('victory');
  expect(await page.evaluate(() => (window as any).__game.sprocket())).toBe('celebrate');
  expect(errors).toEqual([]);
});
