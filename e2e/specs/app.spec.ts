import { logIn } from '@/solid';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Login URL').fill('http://localhost:3000/');
  await page.getByRole('button', { name: 'Login' }).click();
  await logIn(page);
});

test('login', async ({ page }) => {
  await expect(page.getByText('/alice/profile/card#me')).toBeVisible();
});

test('chat', async ({ page }) => {
  await page.getByLabel('Message').fill('Hello, world!');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByText('[You]: Hello, world!')).toBeVisible();
  await expect(page.getByText('[AI]: mock response')).toBeVisible();
});
