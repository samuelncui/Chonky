import { expect, test, type Page } from '@playwright/test';

const fileEntry = (page: Page, id: string) => page.locator(`[data-chonky-file-id="${id}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Chonky example' })).toBeVisible();
});

test('renders, searches, selects, and opens files', async ({ page }) => {
  await expect(page.locator('.chonky-fileListWrapper[role="list"]')).toBeVisible();
  await expect(page.locator('[data-test-id="file-entry"]')).toHaveCount(5);
  await expect(page.getByText('Library', { exact: true })).toBeVisible();
  await expect(page.getByText('Example', { exact: true })).toBeVisible();

  await fileEntry(page, 'alpha').click();
  await page.getByRole('button', { name: 'Read selection through ref' }).click();
  await expect(page.getByTestId('selection')).toHaveText('alpha');

  await fileEntry(page, 'bravo').click({ modifiers: ['Shift'] });
  await page.getByRole('button', { name: 'Read selection through ref' }).click();
  await expect(page.getByTestId('selection')).toHaveText('alpha,bravo');

  await fileEntry(page, 'photos').dblclick();
  await expect(page.getByTestId('opened-file')).toHaveText('photos');

  const search = page.getByPlaceholder('Search');
  await search.fill('bravo');
  await expect(fileEntry(page, 'bravo')).toBeVisible();
  await expect(fileEntry(page, 'alpha')).toHaveCount(0);
  await search.press('Escape');
  await expect(fileEntry(page, 'alpha')).toBeVisible();
});

test('supports toolbar options and context actions', async ({ page }) => {
  await page.getByRole('button', { name: 'Options' }).click();
  await page.getByRole('menuitem', { name: 'Show hidden files' }).click();
  await expect(fileEntry(page, 'secret')).toHaveCount(0);

  await page.getByRole('button', { name: 'Options' }).click();
  await page.getByRole('menuitem', { name: 'Switch to Grid' }).click();
  await expect(fileEntry(page, 'photos')).toBeVisible();

  await page.getByRole('button', { name: 'Options' }).click();
  await page.getByRole('menuitem', { name: 'Switch to List' }).click();
  await fileEntry(page, 'alpha').click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'Open selection' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Open selection' }).click();
  await expect(page.getByTestId('opened-file')).toHaveText('selection');
});

test('exposes the imperative selection API', async ({ page }) => {
  await page.getByRole('button', { name: 'Select alpha through ref' }).click();
  await page.getByRole('button', { name: 'Read selection through ref' }).click();
  await expect(page.getByTestId('selection')).toHaveText('alpha');
});

test('moves a file through drag-and-drop', async ({ page }) => {
  await fileEntry(page, 'alpha').dragTo(fileEntry(page, 'photos'));
  await expect(page.getByTestId('last-move')).toHaveText('alpha->photos');
});

test('keeps a bounded DOM for large directories', async ({ page }) => {
  await page.getByRole('button', { name: 'Load 5,000 files' }).click();
  await expect(page.getByTestId('file-count')).toHaveText('5000');

  const entries = page.locator('[data-test-id="file-entry"]');
  await expect(entries.first()).toBeVisible();
  expect(await entries.count()).toBeLessThan(100);

  const scroller = page.locator('.chonky-fileListWrapper [data-virtuoso-scroller="true"]');
  await scroller.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await expect(fileEntry(page, 'generated-4999')).toBeVisible();
  expect(await entries.count()).toBeLessThan(100);
});
