import { test, expect } from '@playwright/test';

test.describe('Documents list', () => {
  test('should load the documents page', async ({ page }) => {
    await page.goto('/sv/documents');
    await expect(page.locator('h1')).toContainText(/dokument/i);
  });

  test('should have a search field', async ({ page }) => {
    await page.goto('/sv/documents');
    await expect(page.getByPlaceholder(/sök/i)).toBeVisible();
  });

  test('should have a create new document button', async ({ page }) => {
    await page.goto('/sv/documents');
    await expect(page.getByRole('button', { name: /skapa nytt dokument/i })).toBeVisible();
  });

  test('should navigate to create page', async ({ page }) => {
    await page.goto('/sv/documents');
    await page.getByRole('button', { name: /skapa nytt dokument/i }).click();
    await expect(page).toHaveURL(/\/sv\/documents\/create/);
  });

  test('should display filter toggles', async ({ page }) => {
    await page.goto('/sv/documents');
    await expect(page.getByText(/senaste revision/i)).toBeVisible();
  });
});
