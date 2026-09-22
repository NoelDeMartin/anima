import { expect, test } from '@playwright/test';

import { animaReset } from '@/helpers';

function podUrl(path: string) {
  return `http://localhost:3000/${path}`;
}

test.beforeEach(async ({ page }) => {
  await animaReset();
  await page.goto('/');
});

test('register', async ({ page }) => {
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Username').fill('testing');
  await page.getByLabel('Password', { exact: true }).fill('secret');
  await page.getByLabel('Confirm Password').fill('secret');
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByText(`Hello ${podUrl('testing/profile/card#me')}, how can I help you today?`)).toBeVisible();
});
