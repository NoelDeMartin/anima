import { expect, test } from '@playwright/test';
import { solidLogin, solidReset } from 'playwright-solid';

test.beforeEach(async ({ page }) => {
  await solidReset();
  await page.goto('/');
});

test('login', async ({ page }) => {
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByRole('button', { name: 'Log in to dev server' }).click();
  await solidLogin(page);
  await expect(page.getByText('how can I help you today?')).toBeVisible();
});
