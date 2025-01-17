import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await expect(page.getByText("Welcome!")).toBeVisible();

  await page.getByLabel("Username").fill("Bob");
  await expect(page.getByText("Welcome, Bob!")).toBeVisible();
});
