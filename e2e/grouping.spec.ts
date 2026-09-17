import { expect, test, type Page } from '@playwright/test';

const file = (page: Page, id: string) => page.locator(`[data-chonky-file-id="${id}"]`);
const actions = (page: Page, name: string) => page.getByRole('group', { name: `${name} actions` });

test.beforeEach(async ({ page }) => {
  await page.goto('/?example=duplicates');
  await expect(page.getByRole('heading', { name: 'Identical files' })).toBeVisible();
});

test('keeps one copy, deletes multiple copies and resets the fixture', async ({ page }) => {
  const coast = actions(page, 'Summer coast');
  await expect(coast.getByRole('button', { name: 'Keep only this' })).toBeDisabled();
  await file(page, 'sample-0-0').click();
  await expect(coast.getByRole('button', { name: 'Keep only this' })).toBeEnabled();
  await coast.getByRole('button', { name: 'Keep only this' }).click();
  await expect(page.getByTestId('duplicate-file-count')).toHaveText('9');
  await expect(page.getByTestId('duplicate-result')).toHaveText('Kept coast.jpg; deleted 2 other files.');
  await expect(file(page, 'sample-0-0')).toBeVisible();
  await expect(file(page, 'sample-0-1')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Summer coast', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  );

  await file(page, 'sample-1-0').click();
  await file(page, 'sample-1-1').click({ modifiers: ['ControlOrMeta'] });
  await expect(page.getByTestId('duplicate-selection-count')).toHaveText('2');
  const report = actions(page, 'Annual report');
  await expect(report.getByRole('button', { name: 'Keep only this' })).toBeDisabled();
  await report.getByRole('button', { name: 'Delete selected' }).click();
  await expect(page.getByTestId('duplicate-file-count')).toHaveText('7');
  await expect(page.getByTestId('duplicate-selection-count')).toHaveText('0');
  await expect(file(page, 'sample-1-2')).toBeVisible();
  await file(page, 'sample-1-2').click();
  await report.getByRole('button', { name: 'Delete selected' }).click();
  await expect(page.getByTestId('group-count')).toHaveText('3');
  await expect(page.getByRole('button', { name: 'Annual report', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByTestId('duplicate-file-count')).toHaveText('11');
  await expect(page.getByTestId('group-count')).toHaveText('4');
  await expect(page.getByTestId('duplicate-selection-count')).toHaveText('0');
});

test('scopes range, select-all and context actions to the current group', async ({ page }) => {
  await file(page, 'sample-0-0').click();
  await file(page, 'sample-0-2').click({ modifiers: ['Shift'] });
  await expect(page.getByTestId('duplicate-selection-count')).toHaveText('3');
  await file(page, 'sample-1-0').click({ modifiers: ['Shift'] });
  await expect(page.getByTestId('duplicate-selection-count')).toHaveText('1');
  await expect(actions(page, 'Summer coast').getByRole('button', { name: 'Delete selected' })).toBeDisabled();
  await page.keyboard.press('Control+a');
  await expect(page.getByTestId('duplicate-selection-count')).toHaveText('3');
  await file(page, 'sample-0-0').click({ button: 'right' });
  await expect(page.getByTestId('duplicate-selection-count')).toHaveText('1');
  await page.getByRole('menuitem', { name: 'Keep only this' }).click();
  await expect(page.getByTestId('duplicate-file-count')).toHaveText('9');
});

test('switches layouts and filters without mixing groups', async ({ page }) => {
  await expect(page.getByLabel('Group layout')).toHaveCount(0);
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'One group at a time', exact: true }).click();
  await expect(page.locator('[data-chonky-file-id]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Summer coast', exact: true }).click();
  await expect(file(page, 'sample-0-0')).toBeVisible();
  await expect(file(page, 'sample-1-0')).toHaveCount(0);
  await file(page, 'sample-0-0').click();
  await page.getByRole('button', { name: 'Annual report', exact: true }).click();
  await expect(page.getByTestId('duplicate-selection-count')).toHaveText('0');
  await expect(file(page, 'sample-0-0')).toHaveCount(0);
  await expect(file(page, 'sample-1-0')).toBeVisible();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Continuous groups', exact: true }).click();
  await expect(file(page, 'sample-0-0')).toBeVisible();
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByPlaceholder('Filter').fill('report');
  await expect(page.getByRole('button', { name: 'Annual report', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Summer coast', exact: true })).toHaveCount(0);
  await expect(page.locator('[data-test-id="file-entry"]')).toHaveCount(3);
});

test('virtualizes groups and reveals the last file with header-aware indices', async ({ page }) => {
  await page.getByRole('button', { name: 'Load 1,000 groups' }).click();
  await expect(page.getByTestId('group-count')).toHaveText('1000');
  await expect(page.getByTestId('duplicate-file-count')).toHaveText('5000');
  await expect(file(page, 'large-0-0')).toBeVisible();
  expect(await page.locator('[data-test-id="file-entry"]').count()).toBeLessThan(100);
  await page.getByRole('button', { name: 'Reveal last file' }).click();
  await expect(file(page, 'large-999-4')).toBeVisible();
  await expect(page.getByTestId('duplicate-selection-count')).toHaveText('1');
  expect(await page.locator('[data-test-id="file-entry"]').count()).toBeLessThan(100);
});

test('keeps group controls reachable at a narrow width', async ({ page }) => {
  await page.setViewportSize({ width: 520, height: 850 });
  await file(page, 'sample-0-0').click();
  await expect(actions(page, 'Summer coast').getByRole('button', { name: 'Keep only this' })).toBeVisible();
  await expect(actions(page, 'Summer coast').getByRole('button', { name: 'Delete selected' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
