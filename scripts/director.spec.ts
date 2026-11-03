import { test, expect } from '@playwright/test';

test('director story plan and reversible edits work on a generated reel', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor/c7f15397-075d-462d-8fc9-26de4988aa81');
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await expect(page.getByText('المخرج · خطة المشاهد')).toBeVisible();
  await expect(page.locator('.editor-left-panel').getByRole('button').filter({ hasText: /السيانوزس|الأكسجين|المتحدث/ }).first()).toBeVisible();
  await page.getByPlaceholder('اطلب تعديلًا سريعًا على الريل…').fill('كبر الكابشن');
  await page.getByRole('button', { name: 'تنفيذ تعديل المخرج' }).click();
  await expect(page.getByRole('status')).toContainText('كبرت الكابشن');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});
