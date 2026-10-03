import { expect, test, type Page } from '@playwright/test';

const fileEntry = (page: Page, id: string) => page.locator(`[data-chonky-file-id="${id}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Ordinary files' })).toBeVisible();
});

test('renders, searches, and selects files', async ({ page }) => {
  await expect(page.locator('.chonky-fileListWrapper[role="list"]')).toBeVisible();
  await expect(page.locator('[data-test-id="file-entry"]')).toHaveCount(5);
  await fileEntry(page, 'alpha').click();
  await expect(page.getByTestId('selection-count')).toHaveText('1');
  await fileEntry(page, 'bravo').click({ modifiers: ['Shift'] });
  await expect(page.getByTestId('selection-count')).toHaveText('2');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  const search = page.getByPlaceholder('Filter', { exact: true });
  await search.fill('bravo');
  await expect(fileEntry(page, 'bravo')).toBeVisible();
  await expect(fileEntry(page, 'alpha')).toHaveCount(0);
  await search.press('Escape');
  await expect(fileEntry(page, 'alpha')).toBeVisible();
});

test('navigates folders and breadcrumbs and previews a file', async ({ page }) => {
  await fileEntry(page, 'photos').dblclick();
  await expect(fileEntry(page, 'coast')).toBeVisible();
  await expect(fileEntry(page, 'alpha')).toHaveCount(0);
  await expect(page.getByTestId('file-count')).toHaveText('2');
  await fileEntry(page, 'coast').dblclick();
  await expect(page.getByRole('region', { name: 'Fixture preview' })).toContainText('coast.jpg');
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await expect(fileEntry(page, 'alpha')).toBeVisible();
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await expect(fileEntry(page, 'current')).toBeVisible();
  await fileEntry(page, 'current').dblclick();
  await expect(fileEntry(page, 'photos')).toBeVisible();
});

test('supports toolbar options and a useful context action', async ({ page }) => {
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Show hidden files' }).click();
  await expect(fileEntry(page, 'secret')).toHaveCount(0);
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Switch to Grid' }).click();
  await expect(fileEntry(page, 'photos')).toBeVisible();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Switch to List' }).click();
  await fileEntry(page, 'alpha').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Open selection' }).click();
  await expect(page.getByRole('region', { name: 'Fixture preview' })).toContainText('alpha.txt');
});

test('compacts inline actions and creates and resets a note', async ({ page }) => {
  await page.setViewportSize({ width: 520, height: 850 });
  await page.getByLabel('Toolbar layout').selectOption('inline');
  const create = page.getByRole('button', { name: 'New note', exact: true });
  await expect(create.locator('[data-chonky-toolbar-label]')).toBeHidden();
  await expect(create.locator('[data-chonky-toolbar-icon-with-text]')).toHaveCSS('margin-right', '0px');
  await expect(
    page.getByRole('button', { name: 'Reset', exact: true }).locator('[data-chonky-toolbar-label]'),
  ).toBeVisible();
  await create.click();
  await expect(fileEntry(page, 'note-1')).toBeVisible();
  await expect(page.getByTestId('file-count')).toHaveText('6');
  await fileEntry(page, 'photos').dblclick();
  await create.click();
  await expect(fileEntry(page, 'note-2')).toBeVisible();
  await expect(page.getByTestId('file-count')).toHaveText('3');
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await expect(fileEntry(page, 'note-1')).toBeVisible();
  await expect(fileEntry(page, 'note-2')).toHaveCount(0);
  await expect(page.getByTestId('file-count')).toHaveText('6');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(fileEntry(page, 'note-1')).toHaveCount(0);
  await expect(page.getByTestId('file-count')).toHaveText('5');
  await fileEntry(page, 'photos').dblclick();
  await expect(page.getByTestId('file-count')).toHaveText('2');
  await expect(fileEntry(page, 'note-2')).toHaveCount(0);
  await page.getByRole('button', { name: 'Example', exact: true }).click();
  await create.click();
  await expect(fileEntry(page, 'note-1')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('selects text files through the ref', async ({ page }) => {
  await page.getByRole('button', { name: 'Select text files' }).click();
  await expect(page.getByTestId('selection-count')).toHaveText('1');
  await fileEntry(page, 'alpha').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Open selection' }).click();
  await expect(page.getByRole('region', { name: 'Fixture preview' })).toContainText('alpha.txt');
});

test('preserves selection and scroll position when the reveal target is filtered out', async ({ page }) => {
  await fileEntry(page, 'alpha').click();
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  const filter = page.getByPlaceholder('Filter', { exact: true });
  await filter.fill('alpha');
  await expect(fileEntry(page, 'bravo')).toHaveCount(0);
  const scroller = page.locator('.chonky-fileListWrapper [data-virtuoso-scroller="true"]');
  const scrollTop = await scroller.evaluate((element) => element.scrollTop);
  await page.getByRole('button', { name: 'Reveal last file' }).click();
  await expect(page.getByTestId('selection-count')).toHaveText('1');
  expect(await scroller.evaluate((element) => element.scrollTop)).toBe(scrollTop);
  await filter.press('Escape');
  await expect(fileEntry(page, 'bravo')).toBeVisible();
  await page.getByRole('button', { name: 'Actions', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Open selection', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Fixture preview' })).toContainText('alpha.txt');
});

test('opens a focused file with keypad Enter and the selected file with Enter', async ({ page }) => {
  const alpha = page.getByRole('checkbox', { name: 'Select alpha.txt' });
  await alpha.focus();
  await alpha.press('NumpadEnter');
  await expect(page.getByRole('region', { name: 'Fixture preview' })).toContainText('alpha.txt');
  await expect(page.getByTestId('selection-count')).toHaveText('0');
  await fileEntry(page, 'bravo').click();
  await page.getByRole('checkbox', { name: 'Select bravo.mp4' }).press('Enter');
  await expect(page.getByRole('region', { name: 'Fixture preview' })).toContainText('bravo.mp4');
});

for (const key of ['Enter', 'NumpadEnter', 'Space']) {
  test(`opens a selection once when a context menu item is activated with ${key}`, async ({ page }) => {
    const opens: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('FILE ACTION DISPATCH: [open_files]')) opens.push(message.text());
    });
    await fileEntry(page, 'alpha').click({ button: 'right' });
    const open = page.getByRole('menuitem', { name: 'Open selection', exact: true });
    await open.focus();
    await open.press(key);
    await expect(page.getByRole('region', { name: 'Fixture preview' })).toContainText('alpha.txt');
    await expect(open).toBeHidden();
    expect(opens).toHaveLength(1);
  });
}

test('moves only draggable members of a selection and restores them on reset', async ({ page }) => {
  await fileEntry(page, 'photos').click();
  await fileEntry(page, 'alpha').click({ modifiers: ['ControlOrMeta'] });
  await expect(page.getByTestId('selection-count')).toHaveText('2');
  await fileEntry(page, 'alpha').dragTo(fileEntry(page, 'photos'));
  await expect(page.getByTestId('files-result')).toHaveText('Moved alpha.txt to Photos.');
  await expect(fileEntry(page, 'alpha')).toHaveCount(0);
  await expect(fileEntry(page, 'photos')).toBeVisible();
  await expect(page.getByTestId('selection-count')).toHaveText('1');
  await fileEntry(page, 'photos').dblclick();
  await expect(fileEntry(page, 'alpha')).toBeVisible();
  await expect(page.getByTestId('file-count')).toHaveText('3');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(fileEntry(page, 'alpha')).toBeVisible();
  await expect(page.getByTestId('file-count')).toHaveText('5');
});

for (const view of ['List', 'Grid']) {
  test(`virtualizes 5,000 files and reveals the last file in ${view} view`, async ({ page }) => {
    await page.getByRole('button', { name: 'Load 5,000 files' }).click();
    await expect(page.getByTestId('file-count')).toHaveText('5000');
    if (view === 'Grid') {
      await page.getByRole('button', { name: 'Options', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Switch to Grid' }).click();
    }
    const entries = page.locator('[data-test-id="file-entry"]');
    await expect(entries.first()).toBeVisible();
    expect(await entries.count()).toBeLessThan(150);
    await page.getByRole('button', { name: 'Reveal last file' }).click();
    await expect(fileEntry(page, 'generated-4999')).toBeVisible();
    await expect(page.getByTestId('selection-count')).toHaveText('1');
    expect(await entries.count()).toBeLessThan(150);
  });
}

test('native selection controls target the focused file for keyboard context menus', async ({ page }) => {
  const alpha = page.getByRole('checkbox', { name: 'Select alpha.txt', exact: true });
  const bravo = page.getByRole('checkbox', { name: 'Select bravo.mp4', exact: true });
  await alpha.check();
  await expect(alpha).toBeChecked();
  await expect(alpha.locator('..')).toHaveAttribute('role', 'listitem');
  await expect(alpha.locator('..')).not.toHaveAttribute('tabindex', '0');
  await expect(page.locator('[aria-selected]')).toHaveCount(0);
  await bravo.focus();
  await bravo.press('ContextMenu');
  await page.getByRole('menuitem', { name: 'Open selection' }).click();
  await expect(page.getByRole('region', { name: 'Fixture preview' })).toContainText('bravo.mp4');
  await expect(alpha).not.toBeChecked();
  await expect(bravo).toBeChecked();
  await bravo.press('Space');
  await expect(bravo).not.toBeChecked();
  await bravo.press('Space');
  await expect(bravo).toBeChecked();
  await bravo.press('Control+a');
  await expect(alpha).toBeChecked();
});

test('keeps wrapped Grid previews and native selection controls inside their cards', async ({ page }) => {
  await fileEntry(page, 'photos').dblclick();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Switch to Grid' }).click();

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 960 });
    const card = fileEntry(page, 'portrait');
    const preview = card.locator(':scope > div').first();
    const icon = preview.locator('svg');
    const checkbox = page.getByRole('checkbox', { name: 'Select holiday-snapshot.jpg', exact: true });
    await expect(icon).toBeVisible();
    const previewBounds = await preview.boundingBox();
    const iconBounds = await icon.boundingBox();
    expect(iconBounds!.y).toBeGreaterThanOrEqual(previewBounds!.y);
    expect(iconBounds!.y + iconBounds!.height).toBeLessThanOrEqual(previewBounds!.y + previewBounds!.height);
    expect(iconBounds!.x).toBeGreaterThanOrEqual(previewBounds!.x);
    expect(iconBounds!.x + iconBounds!.width).toBeLessThanOrEqual(previewBounds!.x + previewBounds!.width);

    const cardBounds = await card.boundingBox();
    const checkboxBounds = await checkbox.boundingBox();
    expect(checkboxBounds!.x).toBeGreaterThanOrEqual(cardBounds!.x);
    expect(checkboxBounds!.x + checkboxBounds!.width).toBeLessThanOrEqual(cardBounds!.x + cardBounds!.width);
    expect(checkboxBounds!.y).toBeGreaterThanOrEqual(cardBounds!.y);
    expect(checkboxBounds!.y + checkboxBounds!.height).toBeLessThanOrEqual(cardBounds!.y + cardBounds!.height);
    await checkbox.check();
    await expect(page.getByTestId('selection-count')).toHaveText('1');
    await checkbox.press('Space');
    await expect(checkbox).not.toBeChecked();
    await expect(page.getByTestId('selection-count')).toHaveText('0');
  }
});

test('loads a quoted thumbnail URL through a native image in Grid view', async ({ page }) => {
  await fileEntry(page, 'photos').dblclick();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Switch to Grid' }).click();
  const image = fileEntry(page, 'coast').locator('img');
  await expect(image).toBeVisible();
  expect(await image.getAttribute('src')).toContain("O'Reilly");
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(80);
  await expect(image).toHaveCSS('object-fit', 'contain');
});

test('generates an optional photo thumbnail asynchronously and restores its fallback on disable and reset', async ({
  page,
}) => {
  await fileEntry(page, 'photos').dblclick();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Switch to Grid' }).click();
  const photo = fileEntry(page, 'portrait');
  const image = photo.locator('img');
  const icon = photo.locator('svg');
  const coast = fileEntry(page, 'coast').locator('img');
  const generate = page.getByRole('checkbox', { name: 'Generate photo thumbnail', exact: true });
  await expect(image).toHaveCount(0);
  await expect(icon).toBeVisible();
  const quotedUrl = await coast.getAttribute('src');

  await generate.check();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(120);
  await expect(image).toHaveCSS('object-fit', 'contain');
  await expect(coast).toHaveAttribute('src', quotedUrl!);
  await expect.poll(() => coast.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(80);
  await expect(page.getByTestId('file-count')).toHaveText('2');

  await generate.uncheck();
  await expect(image).toHaveCount(0);
  await expect(icon.locator('..')).toHaveCSS('opacity', '1');
  await generate.check();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(generate).not.toBeChecked();
  await expect(page.getByTestId('file-count')).toHaveText('5');
  await fileEntry(page, 'photos').dblclick();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Switch to Grid' }).click();
  await expect(image).toHaveCount(0);
  await expect(icon.locator('..')).toHaveCSS('opacity', '1');
  await expect(coast).toHaveAttribute('src', quotedUrl!);
});
