import { expect, test } from '@playwright/test';

import { logIn } from '@/solid';

test.beforeEach(async ({ page }) => {
  await fetch('http://localhost:1191/__e2e__/reset', { method: 'POST' });
  await page.goto('/');

  await page.getByRole('textbox', { name: 'Login URL' }).fill('http://localhost:3000/');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await logIn(page);
});

test('login', async ({ page }) => {
  await expect(page.getByText('how can I help you today?')).toBeVisible();
});

test('chat', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Message' }).fill('Hello, world!');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByText('Hello, world!')).toBeVisible();
  await expect(page.getByText("mock response for model 'qwen3:1.7b'")).toBeVisible();
});

test('install models', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Install Model' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('qwen3:4b');
  await page.getByRole('textbox', { name: 'Alias' }).fill('Smart');
  await page.getByRole('button', { name: 'Install' }).click();

  await expect(page.getByText('qwen3:4b (Smart)')).toBeVisible();
});
