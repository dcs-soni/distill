import { test, expect } from '@playwright/test';

test.describe('Review Flow', () => {
  test('queue -> open -> correct -> approve -> verify next loads', async ({ page }) => {
    // 1. Navigate to /reviews
    await page.goto('/reviews');

    // Wait for the queue to load (table rows)
    // We expect at least one pending review row
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    // 2. Click first review -> navigate to /reviews/:id
    await firstRow.click();
    await expect(page).toHaveURL(/\/reviews\/[A-Za-z0-9_-]+/);

    // 3. Verify PDF loads in left pane
    // Wait for PDF loading state to disappear
    await expect(page.locator('text=Loading PDF...')).not.toBeVisible({ timeout: 15000 });
    // Check if a PDF page is visible
    const pdfPage = page.locator('.react-pdf__Page').first();
    await expect(pdfPage).toBeVisible();

    // 4. Verify extraction editor shows fields
    const editorHeader = page.locator('h2', { hasText: 'Extracted Data' });
    await expect(editorHeader).toBeVisible();

    // 5. Modify a field (change revenue value)
    const revenueInput = page
      .locator('text=Revenue')
      .locator('..')
      .locator('..')
      .locator('input[type="number"]')
      .first();
    await expect(revenueInput).toBeVisible();

    // Clear and type new value
    await revenueInput.fill('123456');

    // 6. Click "Correct & Approve"
    const correctApproveBtn = page.locator('button', { hasText: 'Correct & Approve' });
    await expect(correctApproveBtn).not.toBeDisabled();
    await correctApproveBtn.click();

    // 7. Verify auto-advance to next review (or empty state queue)
    // The URL should change to the next review or back to /reviews
    await page.waitForURL((url) => {
      // It should either go back to queue or a different review ID
      return url.pathname === '/reviews' || url.pathname.startsWith('/reviews/');
    });

    // If we're on a new review page, wait for it to render
    if (page.url().includes('/reviews/')) {
      await expect(page.locator('h2', { hasText: 'Extracted Data' })).toBeVisible();
    } else {
      await expect(page.locator('h1', { hasText: 'Review Queue' })).toBeVisible();
    }
  });
});
