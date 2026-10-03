import { expect, test, type Page } from '@playwright/test';

const file = (page: Page, id: string) => page.locator(`[data-chonky-file-id="${id}"]`);
const firstFile = (page: Page) => page.locator('[data-chonky-file-id]').first();

test.beforeEach(async ({ page }) => {
  await page.goto('./?example=presentation');
  await expect(page.getByRole('heading', { name: 'Presentation and review' })).toBeVisible();
});

test('shows accessible status and measured details with custom descending sort', async ({ page }) => {
  await expect(firstFile(page)).toHaveAttribute('data-chonky-file-id', 'report');
  await expect(file(page, 'report').getByRole('img', { name: 'Ready for review' })).toBeVisible();
  await expect(file(page, 'artwork').getByRole('img', { name: 'Needs attention' })).toBeVisible();
  await expect(file(page, 'report')).toContainText('Three detail lines share one measured file row.');
  const report = await file(page, 'report').boundingBox();
  const artwork = await file(page, 'artwork').boundingBox();
  expect(artwork!.y).toBeGreaterThanOrEqual(report!.y + report!.height);
  const sort = async (name: string) => {
    await page.getByRole('button', { name: 'Options', exact: true }).click();
    await page.getByRole('menuitem', { name, exact: true }).click();
  };
  await sort('Sort by priority');
  await expect(firstFile(page)).toHaveAttribute('data-chonky-file-id', 'review-notes');
  await sort('Sort by priority');
  await expect(firstFile(page)).toHaveAttribute('data-chonky-file-id', 'report');
  await sort('Sort by name');
  await sort('Sort by priority');
  await expect(firstFile(page)).toHaveAttribute('data-chonky-file-id', 'report');
});

test('reveals offscreen files and preserves ordinary footer editing', async ({ page }) => {
  await expect(page.locator('[data-chonky-file-id]')).toHaveCount(3);
  await expect(file(page, 'review-notes')).toBeVisible();
  await page.getByRole('button', { name: 'Load 60 review files' }).click();
  await expect(file(page, 'review-notes')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reveal review-notes.txt' }).click();
  await expect(file(page, 'review-notes')).toBeVisible();
  await expect(file(page, 'review-notes').getByRole('img', { name: 'Review status unknown' })).toBeVisible();
  await expect(page.getByTestId('presentation-selection-count')).toHaveText('1');
  const note = page.getByRole('textbox', { name: 'Review note' });
  await note.fill('Draft');
  await note.press('ControlOrMeta+a');
  await note.press('Backspace');
  await note.pressSequentially('Approved for review');
  await expect(note).toHaveValue('Approved for review');
  await expect(page.getByTestId('presentation-selection-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByTestId('saved-note')).toHaveText('Saved note: Approved for review');
  const scroller = page.locator('.chonky-fileListWrapper [data-virtuoso-scroller="true"]');
  await scroller.evaluate((element) => element.scrollTo({ top: 0 }));
  await expect(file(page, 'report')).toBeVisible();
  await expect(note).toBeVisible();
  await expect(note).toHaveValue('Approved for review');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('[data-chonky-file-id]')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Load 60 review files' })).toBeEnabled();
  await expect(note).toHaveValue('');
  await expect(page.getByTestId('saved-note')).toHaveText('No note saved.');
});

test('copies an explicit path and navigates folded ancestors and the custom root', async ({ page, context }) => {
  await page.setViewportSize({ width: 520, height: 900 });
  const path = await page.getByTestId('presentation-path').innerText();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy path', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Path copied', exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(path);
  await page.getByRole('button', { name: 'Show parent folders' }).click();
  await page.getByRole('menuitem', { name: 'Projects', exact: true }).click();
  await expect(file(page, 'folder-2')).toBeVisible();
  await expect(page.getByTestId('presentation-path')).toHaveText('demo://Workspace/Projects');
  await page.getByRole('button', { name: 'Workspace', exact: true }).click();
  await expect(file(page, 'folder-1')).toBeVisible();
  await expect(page.getByTestId('presentation-path')).toHaveText('demo://Workspace');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('offers a useful custom empty state and an explicit open event demonstration', async ({ page }) => {
  await page.getByRole('button', { name: 'Show empty folder' }).click();
  await expect(page.getByText('No review files yet.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reveal review-notes.txt' })).toBeDisabled();
  await page.getByRole('button', { name: 'Add example report' }).click();
  await expect(file(page, 'inbox-report')).toBeVisible();
  await file(page, 'inbox-report').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Open selection' }).click();
  await expect(page.getByRole('status', { name: 'Action result' })).toContainText('OpenFiles event: Report.pdf.');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByRole('button', { name: 'Show empty folder' }).click();
  await expect(page.getByText('No review files yet.', { exact: true })).toBeVisible();
});

test('scrolls expanded empty-state details to an accessible retry action in a narrow, short pane', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  await page.getByRole('button', { name: 'Show empty folder' }).click();
  const browser = page.locator('.demo-browser');
  await browser.evaluate((element) => (element.style.height = '480px'));
  await browser.scrollIntoViewIfNeeded();
  await page.getByText('Example directory error details', { exact: true }).click();

  const pane = page.locator('.chonky-fileListWrapper');
  const scroller = pane.locator('.chonky-emptyListContainer');
  const retry = page.getByRole('button', { name: 'Retry directory' });
  await expect(pane.locator('[data-virtuoso-scroller]')).toHaveCount(0);
  await expect(retry).not.toBeInViewport();
  const bounds = await pane.boundingBox();
  const pageScroll = await page.evaluate(() => window.scrollY);
  await scroller.hover();
  await page.mouse.wheel(0, 1000);
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(retry).toBeInViewport({ ratio: 1 });
  const actionBounds = await retry.boundingBox();
  expect(actionBounds!.y).toBeGreaterThanOrEqual(bounds!.y);
  expect(actionBounds!.y + actionBounds!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll);
  const detail = page.getByText(
    'Check that the directory is available and that you have permission to read its contents.',
  );
  await detail.scrollIntoViewIfNeeded();
  await expect(detail).toBeInViewport({ ratio: 1 });
  await retry.click();
  await expect(page.getByRole('status', { name: 'Action result' })).toContainText('Directory retry requested.');
});

test('host Redux slots and bounded style rules survive theme switches and remounts', async ({ page }) => {
  const note = page.getByRole('textbox', { name: 'Review note' });
  await note.fill('Shared review');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByTestId('toolbar-review-status')).toHaveText('Review saved');
  const theme = page.getByRole('checkbox', { name: 'Dark theme' });
  const cycle = async () => {
    await theme.check();
    await expect(file(page, 'report')).toBeVisible();
    await page.getByRole('button', { name: 'Reset demo' }).click();
    await theme.uncheck();
    await page.getByRole('button', { name: 'Reset demo' }).click();
    await expect(file(page, 'report')).toBeVisible();
  };
  const rules = () =>
    page.evaluate(() => [...document.styleSheets].reduce((sum, sheet) => sum + sheet.cssRules.length, 0));
  await cycle();
  const warmedRules = await rules();
  for (let index = 0; index < 4; index++) await cycle();
  expect(await rules()).toBe(warmedRules);
  await expect(page.getByTestId('toolbar-review-status')).toHaveText('Review pending');
});
