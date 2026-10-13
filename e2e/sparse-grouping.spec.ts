import { expect, test, type Page } from '@playwright/test';

const dispatchShortcut = (page: Page, key: string, keyCode: number) =>
  page.evaluate(
    ({ key, keyCode }) => {
      const event = new KeyboardEvent('keydown', {
        key,
        code: `Key${key.toUpperCase()}`,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'keyCode', { value: keyCode });
      document.activeElement?.dispatchEvent(event);
      return event.defaultPrevented;
    },
    { key, keyCode },
  );

test('delayed sparse reads keep quiet placeholders, one pending indicator and stable scroll geometry', async ({
  page,
}) => {
  const now = new Date('2026-10-13T00:00:00Z');
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await page.goto('./?example=sparse');
  const list = page.locator('.chonky-fileListWrapper');
  const scroller = list.locator('[data-virtuoso-scroller="true"]');
  const placeholders = list.locator('[data-chonky-sparse-placeholder]');
  const geometry = () =>
    scroller.evaluate((element) => ({
      height: element.scrollHeight,
      top: element.scrollTop,
      viewport: element.clientHeight,
    }));
  const expectPending = async () => {
    await expect(list).toHaveAttribute('aria-busy', 'true');
    await expect(list.getByRole('progressbar', { name: 'Loading files' })).toHaveCount(1);
    await expect(placeholders.first()).toBeVisible();
    await expect(placeholders.first()).toHaveAttribute('aria-hidden', 'true');
    await expect(placeholders.first()).toHaveCSS('pointer-events', 'none');
    expect(await placeholders.allTextContents()).toEqual(Array(await placeholders.count()).fill(''));
    await expect(list.getByRole('status')).toHaveCount(0);
    expect(await placeholders.count()).toBeLessThan(100);
  };

  await page.clock.runFor(100);
  await expectPending();
  await expect(page.getByText('20,001 rows')).toBeVisible();
  const cold = await geometry();
  expect(cold.height).toBeGreaterThan(cold.viewport * 100);
  const placeholderHeight = await placeholders.first().evaluate((element) => element.getBoundingClientRect().height);
  expect(placeholderHeight).toBeGreaterThan(0);
  await page.clock.runFor(300);
  await expect(placeholders).toHaveCount(0);
  await expect(list).toHaveAttribute('aria-busy', 'false');
  await expect(list.getByRole('progressbar')).toHaveCount(0);
  const loaded = await geometry();
  expect(Math.abs(loaded.height - cold.height)).toBeLessThanOrEqual(placeholderHeight);

  await page.locator('[data-chonky-file-id="sparse-1"]').click();
  await scroller.evaluate((element) => element.scrollTo({ top: element.scrollHeight * 0.85 }));
  await page.clock.runFor(100);
  await expectPending();
  const jumped = await geometry();
  expect(jumped.top).toBeGreaterThan(loaded.height * 0.8);
  await expect(page.getByTestId('sparse-selection-count')).toHaveText('1');
  await page.clock.runFor(300);
  await expect(placeholders).toHaveCount(0);
  await expect(list).toHaveAttribute('aria-busy', 'false');
  await expect(list.getByRole('progressbar')).toHaveCount(0);
  const settled = await geometry();
  expect(settled.top).toBe(jumped.top);
  expect(settled.height).toBe(jumped.height);
  await expect(page.getByTestId('sparse-selection-count')).toHaveText('1');
  expect(Number(await page.getByTestId('sparse-cache-pages').innerText())).toBeLessThanOrEqual(2);
});

test('random jumps keep a bounded cache and selected file, then collapse the group', async ({ page }) => {
  await page.goto('./?example=sparse');
  await expect(page.getByRole('heading', { name: 'Sparse paging' })).toBeVisible();
  await expect(page.getByText('20,001 rows')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Filter' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Large group' })).toBeVisible();
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.getByRole('menuitem', { name: 'Sort by name' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Show hidden files' })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Large group' }).focus();
  expect(await dispatchShortcut(page, 'f', 70)).toBe(false);
  expect(await dispatchShortcut(page, 'h', 72)).toBe(false);

  const scroller = page.locator('.chonky-fileListWrapper [data-virtuoso-scroller="true"]');
  await scroller.evaluate((element) => element.scrollTo({ top: element.scrollHeight * 0.9 }));
  await expect
    .poll(async () => Number(await page.getByTestId('sparse-range-start').innerText()))
    .toBeGreaterThan(15_000);
  await expect(page.locator('[data-chonky-sparse-placeholder]').first()).toBeVisible();
  await expect(page.locator('[data-chonky-sparse-placeholder]').first()).toHaveCSS('pointer-events', 'none');
  await expect(page.locator('[data-chonky-file-id]').first()).toBeVisible();
  const selectedFile = page.locator('[data-chonky-file-id]').first();
  const selectedId = await selectedFile.getAttribute('data-chonky-file-id');
  await selectedFile.click();
  await expect(page.getByTestId('sparse-selection-count')).toHaveText('1');

  await scroller.evaluate((element) => element.scrollTo({ top: element.scrollHeight * 0.55 }));
  await expect
    .poll(async () => Number(await page.getByTestId('sparse-range-start').innerText()))
    .toBeGreaterThan(9_000);
  await scroller.evaluate((element) => element.scrollTo({ top: element.scrollHeight * 0.35 }));
  await expect
    .poll(async () => Number(await page.getByTestId('sparse-range-start').innerText()))
    .toBeGreaterThan(5_000);
  await expect(page.getByTestId('sparse-selected-cached')).toHaveText('false');
  await expect(page.locator(`[data-chonky-file-id="${selectedId}"]`)).toHaveCount(0);
  await expect(page.getByTestId('sparse-selection-count')).toHaveText('1');
  await expect
    .poll(async () => Number(await page.getByTestId('sparse-cache-pages').innerText()))
    .toBeLessThanOrEqual(2);
  expect(await page.locator('[data-test-id="file-entry"]').count()).toBeLessThan(100);

  await page.getByRole('button', { name: 'Reveal selected file' }).click();
  await expect(page.locator(`[data-chonky-file-id="${selectedId}"]`)).toBeVisible();
  await expect(page.getByTestId('sparse-selection-count')).toHaveText('1');

  await scroller.evaluate((element) => element.scrollTo({ top: 0 }));
  const header = page.getByRole('button', { name: 'Large group' });
  await expect(header).toBeVisible();
  await header.click();
  await expect(header).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('1 row', { exact: true })).toBeVisible();
  await expect(page.getByTestId('sparse-selection-count')).toHaveText('0');
  await header.click();
  await expect(header).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('20,001 rows')).toBeVisible();
});

test('keeps failed-page placeholders inert and retries without losing a pinned selection', async ({ page }) => {
  await page.goto('./?example=sparse');
  const first = page.locator('[data-chonky-file-id]').first();
  await expect(first).toBeVisible();
  const selectedId = await first.getAttribute('data-chonky-file-id');
  await first.click();
  await page.getByRole('button', { name: 'Simulate page error' }).click();
  await expect(page.getByRole('alert')).toContainText('Page 1 failed (simulated).');
  const placeholder = page.locator('[data-chonky-sparse-placeholder]').first();
  await expect(placeholder).toBeVisible();
  await expect(placeholder).toHaveCSS('pointer-events', 'none');
  await expect(placeholder).toBeEmpty();
  await expect(page.locator('.chonky-fileListWrapper')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.chonky-fileListWrapper').getByRole('progressbar')).toHaveCount(0);
  await expect(page.locator('.chonky-fileListWrapper').getByRole('status')).toHaveCount(0);
  await expect(page.getByTestId('sparse-selection-count')).toHaveText('1');
  await expect(page.getByTestId('sparse-selected-cached')).toHaveText('false');
  await expect(page.locator(`[data-chonky-file-id="${selectedId}"]`)).toBeVisible();
  await page.getByRole('button', { name: 'Retry page 1' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('[data-chonky-sparse-placeholder]')).toHaveCount(0);
  await expect(page.getByTestId('sparse-selected-cached')).toHaveText('true');
  await expect(page.getByTestId('sparse-selection-count')).toHaveText('1');
});

test('applies caller filtering and ordering, handles no matches, and resets pending pages', async ({ page }) => {
  await page.goto('./?example=sparse');
  await page.getByLabel('Caller order').selectOption('descending');
  await page.getByRole('button', { name: 'Apply projection' }).click();
  await expect(page.locator('[data-chonky-file-id]').first()).toHaveAttribute('data-chonky-file-id', 'sparse-20000');
  await page.locator('[data-chonky-file-id="sparse-20000"]').click();
  await page.getByLabel('Caller filter').fill('File 20000');
  await page.getByRole('button', { name: 'Apply projection' }).click();
  await expect(page.getByText('2 rows', { exact: true })).toBeVisible();
  await expect(page.locator('[data-chonky-file-id]')).toHaveCount(1);
  await expect(page.getByTestId('sparse-selection-count')).toHaveText('0');
  await page.getByLabel('Caller filter').fill('no match');
  await page.getByRole('button', { name: 'Apply projection' }).click();
  await expect(page.getByText('No matching files.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByRole('button', { name: 'Simulate page error' }).click();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('[data-chonky-file-id]').first()).toHaveAttribute('data-chonky-file-id', 'sparse-1');
  await expect(page.getByText('20,001 rows')).toBeVisible();
});

test('keeps Ctrl+F bound to the ordinary Filter', async ({ page }) => {
  await page.goto('./');
  const filter = page.getByRole('button', { name: 'Filter' });
  await expect(filter).toBeVisible();
  await filter.focus();
  expect(await dispatchShortcut(page, 'f', 70)).toBe(true);
  await expect(page.getByPlaceholder('Filter')).toBeVisible();
});

test('context selection covers loaded rows and reports the caller open event', async ({ page }) => {
  await page.goto('./?example=sparse');
  const first = page.locator('[data-chonky-file-id="sparse-1"]');
  await expect(first).toBeVisible();
  await first.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Open selection' }).click();
  await expect(
    page.getByText('OpenFiles event: File 1.txt. The caller supplies file content.', { exact: true }),
  ).toBeVisible();
  await first.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Select all files' }).click();
  await expect(page.getByTestId('sparse-selection-count')).toHaveText('99');
  await page
    .locator('.chonky-fileListWrapper [data-virtuoso-scroller="true"]')
    .evaluate((element) => element.scrollTo({ top: 0 }));
  await page.getByRole('button', { name: 'Large group' }).click();
  await expect(page.getByTestId('sparse-selection-count')).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Reveal selected file' })).toBeDisabled();
});
