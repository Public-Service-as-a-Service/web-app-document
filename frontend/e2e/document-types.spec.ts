import { test, expect } from '@playwright/test';

test.describe('Document types admin', () => {
  test('should load the document types page', async ({ page }) => {
    await page.goto('/sv/admin/document-types');
    await expect(page.locator('h1')).toContainText(/dokumenttyp/i);
  });

  test('should have a create new type button', async ({ page }) => {
    await page.goto('/sv/admin/document-types');
    await expect(page.getByRole('button', { name: /skapa/i })).toBeVisible();
  });

  test('should display table headers when types exist', async ({ page }) => {
    await page.goto('/sv/admin/document-types');
    // Wait for loading to complete
    await page.waitForLoadState('networkidle');
    // Either we see the table or the empty state
    const hasTable = await page
      .locator('table')
      .isVisible()
      .catch(() => false);
    if (hasTable) {
      await expect(page.locator('th').first()).toBeVisible();
    } else {
      await expect(page.getByText(/inga dokumenttyper/i)).toBeVisible();
    }
  });
});
