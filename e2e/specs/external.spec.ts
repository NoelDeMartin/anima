import { expect, test, type Page } from '@playwright/test';
import { solidLogin, solidReset } from 'playwright-solid';

import { animaReset } from '@/helpers';

async function login(page: Page) {
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByRole('button', { name: 'Log in to dev server' }).click();
  await solidLogin(page);
}

test.beforeEach(async ({ page }) => {
  await solidReset();
  await animaReset();
  await page.goto('/');
});

test('login', async ({ page }) => {
  await login(page);
  await expect(page.getByText('how can I help you today?')).toBeVisible();
});

test('chats', async ({ page }) => {
  await login(page);

  await page.getByRole('textbox', { name: 'Message' }).fill('Hello, world!');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByText("mock response for model 'qwen3:1.7b' to 'Hello, world!'")).toBeVisible();

  await page.getByRole('link', { name: 'New Chat' }).click();
  await page.getByRole('textbox', { name: 'Message' }).fill('Second chat');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Hello, world!')).toHaveCount(0);
  await expect(page.getByText("mock response for model 'qwen3:1.7b' to 'Second chat'")).toBeVisible();

  await page.getByRole('list', { name: 'Recent Chats' }).getByRole('listitem').last().getByRole('link').click();
  await expect(page.getByText("mock response for model 'qwen3:1.7b' to 'Hello, world!'")).toBeVisible();
});

test('install models', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Add Model' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('qwen3:4b');
  await page.getByRole('textbox', { name: 'Alias' }).fill('Smart');
  await page.getByRole('button', { name: 'Add' }).click();

  await expect(page.getByText('qwen3:4b (Smart)')).toBeVisible();
});
