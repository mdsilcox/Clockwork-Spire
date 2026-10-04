import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const MOODS = ['idle', 'happy', 'celebrate', 'comfort', 'sleepy', 'pet', 'sniff', 'run'] as const;
const EVENTS = ['sprocket-blueprint', 'sprocket-pipe', 'sprocket-nap'] as const;

interface Lab {
  mountSprocket(m: string, size: number): void;
  mountEvent(id: string): void;
  mountEnding(): void;
}

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

const mountSprocket = (page: Page, mood: string, size: number) =>
  page.evaluate(
    async ([m, s]) => {
      const mod = (await import(/* @vite-ignore */ ['', 'e2e', 'sprocketLab.tsx'].join('/'))) as unknown as Lab;
      mod.mountSprocket(m as string, s as number);
    },
    [mood, size],
  );

const mountEnding = (page: Page) =>
  page.evaluate(async () => {
    const mod = (await import(/* @vite-ignore */ ['', 'e2e', 'sprocketLab.tsx'].join('/'))) as unknown as Lab;
    mod.mountEnding();
  });

const lab = (page: Page) => page.evaluate(() => (window as unknown as { __lab: { pets: number; done: number } }).__lab);

/** How many pixels of the canvas are not transparent. */
async function inked(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const c = document.querySelector(sel) as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++;
    return n;
  }, selector);
}

test('Sprocket draws in every mood at 120 px and 64 px', async ({ page }, info) => {
  const errors = watchErrors(page);
  await page.goto('/');
  for (const mood of MOODS) {
    for (const size of [120, 64]) {
      await mountSprocket(page, mood, size);
      await page.waitForTimeout(450);
      const el = page.getByTestId('sprocket');
      await expect(el).toHaveAttribute('data-mood', mood);
      await expect(el).toHaveAttribute('aria-label', /Sprocket/);
      expect(await inked(page, '[data-testid="sprocket"] canvas')).toBeGreaterThan(500);
      await el.screenshot({ path: `test-results/sprocket-${mood}-${size}-${info.project.name}.png` });
    }
  }
  expect(errors).toEqual([]);
});

test('petting Sprocket calls onPet by tap and by keyboard', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await mountSprocket(page, 'idle', 120);
  await page.getByTestId('sprocket').click();
  expect((await lab(page)).pets).toBe(1);
  await page.getByTestId('sprocket').focus();
  await page.keyboard.press('Enter');
  expect((await lab(page)).pets).toBe(2);
  expect(errors).toEqual([]);
});

test('the three event scenes draw and fit the screen', async ({ page }, info) => {
  const errors = watchErrors(page);
  await page.goto('/');
  for (const id of EVENTS) {
    await page.evaluate(async (e) => {
      const mod = (await import(/* @vite-ignore */ ['', 'e2e', 'sprocketLab.tsx'].join('/'))) as unknown as Lab;
      mod.mountEvent(e);
    }, id);
    await page.waitForTimeout(350);
    expect(await inked(page, '[data-testid="sprocket-event-art"] canvas')).toBeGreaterThan(2000);
    const box = await page.getByTestId('sprocket-event-art').boundingBox();
    expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.getByTestId('sprocket-event-art').screenshot({ path: `test-results/sprocket-event-${id}-${info.project.name}.png` });
  }
  expect(errors).toEqual([]);
});

test('the ending can be skipped to the credits and returns to the Workshop', async ({ page }, info) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await mountEnding(page);
  await expect(page.getByTestId('ending')).toBeVisible();
  await expect(page.getByTestId('ending-text')).toContainText('The hands slow', { timeout: 4000 });
  await page.screenshot({ path: `test-results/ending-1-${info.project.name}.png` });
  await expect(page.getByTestId('credits')).toHaveCount(0);
  await page.getByTestId('ending-skip').click();
  await expect(page.getByTestId('credits')).toBeVisible();
  await expect(page.getByTestId('ending-stats')).toContainText('3 runs, 41 turns, biggest turn 57');
  await expect(page.getByText('Built by Claude for Mikhail')).toBeVisible();
  await expect(page.getByText('Sprocket as himself')).toBeVisible();
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(sw[0]).toBeLessThanOrEqual(sw[1]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `test-results/ending-credits-${info.project.name}.png` });
  await page.getByTestId('ending-done').click();
  expect((await lab(page)).done).toBe(1);
  expect(errors).toEqual([]);
});

test('the ending reaches every scene on its own clock', async ({ page }, info) => {
  test.slow();
  await page.goto('/');
  await mountEnding(page);
  await expect(page.getByTestId('ending')).toHaveAttribute('data-scene', '1', { timeout: 14000 });
  await expect(page.getByTestId('ending-text')).toContainText('thank you', { timeout: 6000 });
  await page.screenshot({ path: `test-results/ending-note-${info.project.name}.png` });
  await expect(page.getByTestId('ending')).toHaveAttribute('data-scene', '2', { timeout: 14000 });
  await page.screenshot({ path: `test-results/ending-stair-${info.project.name}.png` });
  await expect(page.getByTestId('ending')).toHaveAttribute('data-scene', '3', { timeout: 14000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `test-results/ending-sun-${info.project.name}.png` });
});
