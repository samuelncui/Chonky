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
