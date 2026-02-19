import { logIn } from '@/solid';
import { expect, test } from '@playwright/test';

test('login', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Login URL').fill('http://localhost:3000/');
  await page.getByRole('button', { name: 'Login' }).click();
  await logIn(page);

  await expect(page.getByText('/alice/profile/card#me')).toBeVisible();
});
