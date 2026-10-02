import { expect, test } from '@playwright/test';

test('navigates every showcase within the current deployment path', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  const basePath = new URL(page.url()).pathname;
  const navigation = page.getByRole('navigation', { name: 'Examples' });
  for (const [name, heading, id] of [
    ['Identical files', 'Identical files', 'duplicates'],
    ['Sparse paging', 'Sparse paging', 'sparse'],
    ['Presentation', 'Presentation and review', 'presentation'],
    ['Ordinary files', 'Ordinary files', 'files'],
  ]) {
    const link = navigation.getByRole('link', { name, exact: true });
    await expect(link).toHaveAttribute('href', `?example=${id}`);
    await link.click();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(link).toHaveAttribute('aria-current', 'page');
    expect(new URL(page.url()).pathname).toBe(basePath);
    await page.reload();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
