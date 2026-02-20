import { expect, test } from '@playwright/test';

import { logIn } from '@/solid';

test.beforeEach(async ({ page }) => {
  await fetch('http://localhost:1191/__e2e__/reset');
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
  await expect(page.getByText("[AI]: mock response for model 'qwen3:1.7b'")).toBeVisible();
});

test('install and switch models', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Install Model' }).fill('qwen3:4b');
  await page.getByRole('button', { name: 'Install' }).click();

  await expect(page.getByText('qwen3:4b')).toBeVisible();

  await page.getByRole('listitem').filter({ hasText: 'qwen3:4b' }).getByRole('button', { name: 'Make Active' }).click();

  await expect(page.getByText('qwen3:4b (Active)')).toBeVisible();
});
