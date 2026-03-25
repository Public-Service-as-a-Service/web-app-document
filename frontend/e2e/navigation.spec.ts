import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should have a header with logo link', async ({ page }) => {
    await page.goto('/sv');
    const logoLink = page.locator('header a').first();
    await expect(logoLink).toBeVisible();
    await expect(logoLink).toHaveAttribute('href', /\/sv/);
  });

  test('should have sidebar navigation links', async ({ page }) => {
    await page.goto('/sv');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
  });

  test('should redirect root to default locale', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/sv/);
  });

  test('should support english locale', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('h1')).toBeVisible();
  });
});
