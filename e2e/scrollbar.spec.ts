import { expect, test } from '@playwright/test';

const examples = [
  { id: 'files', load: 'Load 5,000 files' },
  { id: 'duplicates', load: 'Load 1,000 groups' },
  { id: 'sparse' },
  { id: 'presentation', load: 'Load 60 review files' },
];

for (const example of examples) {
  for (const scrollbar of ['overlay', 'classic']) {
    test(`${example.id} keeps content clear of ${scrollbar} scrollbars`, async ({ page }) => {
      await page.goto(`./?example=${example.id}`);
      // Reproduce both layout models on every host. Native overlay visuals depend on
      // OS preferences; their zero-width layout still needs a clear 16px edge lane.
      await page.addStyleTag({
        content:
          scrollbar === 'overlay'
            ? '[data-virtuoso-scroller] { scrollbar-width: none; }'
            : '[data-virtuoso-scroller]::-webkit-scrollbar { width: 16px; height: 16px; }',
      });
      if (example.load) await page.getByRole('button', { name: example.load, exact: true }).click();
      const list = page.locator('.chonky-fileListWrapper');
      const scroller = list.locator('[data-virtuoso-scroller="true"]');
      const rows = list.locator('[data-chonky-file-id]');
      await expect(rows.first()).toBeVisible();

      for (const width of [1000, 520]) {
        await page.setViewportSize({ width, height: 900 });
        for (const fraction of [0, 0.5]) {
          await scroller.evaluate(
            (element, value) => element.scrollTo({ top: element.scrollHeight * value }),
            fraction,
          );
          await expect(rows.first()).toBeVisible();
          await expect(list.locator('[data-chonky-sparse-placeholder]')).toHaveCount(0);
          const geometry = await scroller.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            const scrollbarWidth = element.offsetWidth - element.clientWidth;
            const clearEdge = bounds.right - Math.max(16, scrollbarWidth);
            return {
              scrollbarWidth,
              overflowing: element.scrollHeight > element.clientHeight,
              horizontalOverflow: element.scrollWidth > element.clientWidth,
              covered: [...element.querySelectorAll('[data-chonky-file-id], [data-chonky-group-id] button')]
                .filter((child) => child.getBoundingClientRect().right > clearEdge + 1)
                .map((child) => child.getAttribute('aria-label') ?? child.textContent),
            };
          });
          expect(geometry.scrollbarWidth).toBe(scrollbar === 'overlay' ? 0 : 16);
          expect(geometry.overflowing).toBe(true);
          expect(geometry.horizontalOverflow).toBe(false);
          expect(geometry.covered).toEqual([]);
          expect(await rows.count()).toBeLessThan(100);
        }
      }
    });
  }
}
