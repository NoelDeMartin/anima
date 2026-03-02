import { sleep } from '@noeldemartin/utils';
import type { Page } from '@playwright/test';

export async function signUp(page: Page) {
  await page.getByRole('link', { name: 'Sign up' }).click();
  await page.getByRole('textbox', { name: 'Email:' }).fill('alice@example.com');
  await page.getByRole('textbox', { name: 'Password:', exact: true }).fill('secret');
  await page.getByRole('textbox', { name: 'Confirm password:' }).fill('secret');
  await page.getByRole('button', { name: 'Register' }).click();
  await sleep(500);

  await page.getByRole('link', { name: 'Create pod' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('alice');
  await page.getByRole('button', { name: 'Create pod' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Continue authentication' }).click();
}

export async function logIn(page: Page) {
  await page.getByRole('textbox', { name: 'Email' }).fill('alice@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('secret');
  await page.getByRole('button', { name: 'Log in' }).click();

  const result = await Promise.race([
    page
      .getByText('An application is requesting access')
      .waitFor({ state: 'attached' })
      .then(() => 'logged-in' as const),
    page
      .getByText('Invalid email/password combination')
      .waitFor({ state: 'attached' })
      .then(() => 'account-missing' as const),
  ]);

  if (result !== 'logged-in') {
    await signUp(page);
  }

  await page.getByRole('button', { name: 'Authorize' }).click();
}
