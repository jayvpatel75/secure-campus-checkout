import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function login(page: Page, role: string) {
  await page.goto('/');
  await page.getByRole('button', { name: role, exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Make your next idea happen.' })).toBeVisible();
}
test('desktop catalog, search, request, staff approval, pickup and return', async ({ page }) => {
  await login(page, 'Student');
  await page.getByRole('textbox', { name: 'Search equipment' }).fill('Canon');
  await expect(page.locator('.equipment-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Request item', exact: true }).click();
  await page
    .getByLabel('What will you use it for?')
    .fill('Photograph our campus research project for class.');
  const createdResponse = page.waitForResponse(
    (r) => r.url().endsWith('/api/loans') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  const { id } = await (await createdResponse).json();
  await expect(page.getByRole('heading', { name: 'Your equipment, organized.' })).toBeVisible();
  const row = page.locator(`[data-loan-id="${id}"]`);
  await expect(row.getByText('Pending', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await login(page, 'Staff');
  await page.getByRole('button', { name: /Checkout requests/ }).click();
  const staffRow = page.locator(`[data-loan-id="${id}"]`);
  await staffRow.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(staffRow.getByText('Approved', { exact: true })).toBeVisible();
  await staffRow.getByRole('button', { name: 'Record pickup' }).click();
  await expect(staffRow.getByText('Checked Out', { exact: true })).toBeVisible();
  await staffRow.getByRole('button', { name: 'Record return' }).click();
  await expect(staffRow.getByText('Returned', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Activity log' }).click();
  await expect(page.getByRole('table')).toContainText('CAM-002: checked_out to returned');
});
test('login, catalog, request dialog and staff views have no automated WCAG A/AA violations', async ({
  page,
}) => {
  await page.goto('/');
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await login(page, 'Student');
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .locator('.equipment-card')
    .filter({ hasText: 'Sony Alpha' })
    .getByRole('button', { name: 'Request item' })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await login(page, 'Staff');
  await page.getByRole('button', { name: /Checkout requests/ }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Activity log' }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test('mobile catalog has no horizontal overflow and filters work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'Student');
  await page.getByRole('button', { name: 'Cameras', exact: true }).click();
  await expect(page.locator('.equipment-card')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test('administrator adds equipment and toggles maintenance', async ({ page }) => {
  await login(page, 'Admin');
  await page.getByRole('button', { name: 'Add equipment', exact: true }).first().click();
  const tag = `TST-${Date.now()}`;
  await page.getByLabel('Equipment name').fill('Portfolio Test Laptop');
  await page.getByLabel('Asset tag').fill(tag);
  await page.getByLabel('Description').fill('Fictional laptop for browser workflow verification.');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Add equipment', exact: true })
    .click();
  const card = page.locator('.equipment-card').filter({ hasText: tag });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Send for maintenance' }).click();
  await expect(card.getByText('Maintenance', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Mark available' }).click();
  await expect(card.getByText('Available', { exact: true })).toBeVisible();
});
