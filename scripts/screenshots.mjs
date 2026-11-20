import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('docs/screenshots', { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto('http://localhost:3000');
  await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'docs/screenshots/login.png', fullPage: true });
  await page.getByRole('button', { name: 'Student', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.locator('.equipment-card').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'docs/screenshots/catalog.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Cameras', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/mobile.png', fullPage: true });
  console.log('Saved login, catalog, and mobile screenshots.');
} finally {
  await browser.close();
}
