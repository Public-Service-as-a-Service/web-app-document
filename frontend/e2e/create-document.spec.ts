import { test, expect } from '@playwright/test';

test.describe('Create document', () => {
  test('should load the create document page', async ({ page }) => {
    await page.goto('/sv/documents/create');
    await expect(page.locator('h1')).toContainText(/skapa/i);
  });

  test('should have required form fields', async ({ page }) => {
    await page.goto('/sv/documents/create');
    await expect(page.getByRole('textbox', { name: /beskrivning/i })).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('should have a back button', async ({ page }) => {
    await page.goto('/sv/documents/create');
    await page.getByRole('button', { name: /tillbaka/i }).click();
    await expect(page).toHaveURL(/\/sv\/documents/);
  });

  test('should have submit button disabled when form is empty', async ({ page }) => {
    await page.goto('/sv/documents/create');
    const submitButton = page.getByRole('button', { name: /skapa$/i });
    await expect(submitButton).toBeDisabled();
  });

  test('should have drag-and-drop file area', async ({ page }) => {
    await page.goto('/sv/documents/create');
    await expect(page.getByText(/dra och släpp/i)).toBeVisible();
  });
});
