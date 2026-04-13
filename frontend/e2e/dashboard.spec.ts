import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should load the dashboard page', async ({ page }) => {
    await page.goto('/sv');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should display stat cards', async ({ page }) => {
    await page.goto('/sv');
    await expect(page.getByText('Totalt antal dokument', { exact: false })).toBeVisible();
  });

  test('should navigate to documents via quick action', async ({ page }) => {
    await page.goto('/sv');
    await page.getByRole('button', { name: /skapa nytt dokument/i }).click();
    await expect(page).toHaveURL(/\/sv\/documents\/create/);
  });

  test('should have sidebar navigation', async ({ page }) => {
    await page.goto('/sv');
    await expect(page.getByRole('link', { name: /dokument/i }).first()).toBeVisible();
  });

  test('should navigate to documents list via sidebar', async ({ page }) => {
    await page.goto('/sv');
    await page
      .getByRole('link', { name: /dokument/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/sv\/documents/);
  });
});
