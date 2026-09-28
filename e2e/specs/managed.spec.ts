import { expect, test, type Page } from '@playwright/test';

import { animaReset } from '@/helpers';

function podUrl(path: string) {
  return `http://localhost:1191/pod/${path}`;
}

function authorizationUrl({ forceConsent = true }: { forceConsent?: boolean } = {}) {
  const url = new URL(podUrl('.oidc/auth'));

  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', 'http://localhost:1191/clientid.jsonld');
  url.searchParams.set('redirect_uri', 'http://localhost:1191/oidc/redirect');
  url.searchParams.set('scope', 'openid webid offline_access');
  url.searchParams.set('code_challenge', 'a'.repeat(43));
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', 'e2e');
  forceConsent && url.searchParams.set('prompt', 'consent');

  return url.href;
}

function waitForAppRedirect(page: Page) {
  return page.waitForRequest((request) => request.url().startsWith('http://localhost:1191/oidc/redirect?code='));
}

async function register(page: Page) {
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Username').fill('testing');
  await page.getByLabel('Password', { exact: true }).fill('secret');
  await page.getByLabel('Confirm Password').fill('secret');
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByText(`Hello ${podUrl('testing/profile/card#me')}, how can I help you today?`)).toBeVisible();
}

async function authorize(page: Page) {
  const redirect = waitForAppRedirect(page);

  await expect(page.getByText('wants to access your Solid POD')).toBeVisible();
  await page.getByRole('button', { name: 'Allow' }).click();

  await redirect;
}

test.beforeEach(async ({ page }) => {
  await animaReset();
  await page.goto('/');
});

test('register', async ({ page }) => {
  await register(page);
});

test('pod home', async ({ page }) => {
  await page.goto(podUrl(''));

  await expect(page.getByText('Your Solid POD')).toBeVisible();
  await expect(page.getByText(podUrl(''))).toBeVisible();
});

test('authorize apps', async ({ page }) => {
  await register(page);
  await page.goto(authorizationUrl());

  await authorize(page);
});

test('authorize apps after logging in', async ({ page, browser }) => {
  await register(page);

  const guestPage = await browser.newPage();

  await guestPage.goto(authorizationUrl());
  await guestPage.getByLabel('Email').fill('test@example.com');
  await guestPage.getByLabel('Password').fill('secret');
  await guestPage.getByRole('button', { name: 'Log in to continue' }).click();

  await authorize(guestPage);
});

test('remember authorized apps', async ({ page }) => {
  await register(page);
  await page.goto(authorizationUrl({ forceConsent: false }));
  await authorize(page);
  await page.waitForURL('/');

  const redirect = waitForAppRedirect(page);

  await page.goto(authorizationUrl({ forceConsent: false }));
  await redirect;
});
