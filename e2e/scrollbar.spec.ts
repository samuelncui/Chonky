import { expect, test } from '@playwright/test';

// Headless Chromium otherwise hides the scrollbar this test needs to verify.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

const examples = [
  { id: 'files', load: 'Load 5,000 files' },
  { id: 'duplicates', load: 'Load 1,000 groups' },
  { id: 'sparse' },
  { id: 'presentation', load: 'Load 60 review files' },
];

for (const example of examples) {
  for (const scrollbarWidth of [12, 24]) {
    test(`${example.id} uses its actual ${scrollbarWidth}px scrollbar without a second inset`, async ({ page }) => {
      await page.goto(`./?example=${example.id}`);
      if (scrollbarWidth === 24) {
        // A real wider scrollbar verifies that content follows the browser's layout.
        await page.addStyleTag({
          content: '[data-virtuoso-scroller]::-webkit-scrollbar { width: 24px; height: 24px; }',
        });
      }
      if (example.load) await page.getByRole('button', { name: example.load, exact: true }).click();
      const list = page.locator('.chonky-fileListWrapper');
      const scroller = list.locator('[data-virtuoso-scroller="true"]');
      const rows = list.locator('[data-chonky-file-id]');
      await expect(rows.first()).toBeVisible();

      for (const width of [1000, 520]) {
        await page.setViewportSize({ width, height: 900 });
        // Check the initial render before any scrolling or hover over the list.
        for (const fraction of [0, 0.5]) {
          if (fraction) await scroller.evaluate((element) => element.scrollTo({ top: element.scrollHeight / 2 }));
          await expect(rows.first()).toBeVisible();
          await expect(list.locator('[data-chonky-sparse-placeholder]')).toHaveCount(0);
          const geometry = await scroller.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            const clearEdge = bounds.left + element.clientLeft + element.clientWidth;
            const row = element.querySelector('[data-chonky-file-id]')!;
            return {
              scrollbarWidth: element.offsetWidth - element.clientWidth,
              overflowing: element.scrollHeight > element.clientHeight,
              horizontalOverflow: element.scrollWidth > element.clientWidth,
              unusedContentWidth: clearEdge - row.getBoundingClientRect().right,
              thumbColor: getComputedStyle(element, '::-webkit-scrollbar-thumb').backgroundColor,
              covered: [...element.querySelectorAll('[data-chonky-file-id], [data-chonky-group-id] button')]
                .filter((child) => child.getBoundingClientRect().right > clearEdge + 1)
                .map((child) => child.getAttribute('aria-label') ?? child.textContent),
            };
          });
          expect(geometry.scrollbarWidth).toBe(scrollbarWidth);
          expect(geometry.thumbColor).not.toBe('rgba(0, 0, 0, 0)');
          expect(geometry.overflowing).toBe(true);
          expect(geometry.horizontalOverflow).toBe(false);
          expect(Math.abs(geometry.unusedContentWidth)).toBeLessThanOrEqual(1);
          expect(geometry.covered).toEqual([]);
          expect(await rows.count()).toBeLessThan(100);
          if (example.id === 'sparse' && width === 1000 && fraction === 0) {
            const bounds = (await scroller.boundingBox())!;
            const x = bounds.x + bounds.width - scrollbarWidth / 2;
            await page.mouse.move(x, bounds.y + 5);
            await page.mouse.down();
            await page.mouse.move(x, bounds.y + bounds.height / 2, { steps: 5 });
            await page.mouse.up();
            await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
          }
        }
      }
    });
  }
}

test('a list that fits has no scrollbar or reserved blank column', async ({ page }) => {
  await page.goto('./?example=files');
  const scroller = page.locator('[data-virtuoso-scroller="true"]');
  await expect(scroller.locator('[data-chonky-file-id]').first()).toBeVisible();
  const geometry = await scroller.evaluate((element) => {
    const row = element.querySelector('[data-chonky-file-id]')!;
    return {
      scrollbarWidth: element.offsetWidth - element.clientWidth,
      overflowing: element.scrollHeight > element.clientHeight,
      unusedContentWidth: element.getBoundingClientRect().right - row.getBoundingClientRect().right,
    };
  });
  expect(geometry.overflowing).toBe(false);
  expect(geometry.scrollbarWidth).toBe(0);
  expect(Math.abs(geometry.unusedContentWidth)).toBeLessThanOrEqual(1);
});
