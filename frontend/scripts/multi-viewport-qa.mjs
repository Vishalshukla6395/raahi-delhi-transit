import { chromium, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const outDir = fileURLToPath(new URL("../../docs/screenshots/", import.meta.url));
await fs.mkdir(outDir, { recursive: true });

const chromePath = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
].filter(Boolean).find(existsSync);

const browser = await chromium.launch(
  chromePath ? { executablePath: chromePath, headless: true } : { channel: "chrome", headless: true }
);

const viewports = [
  { width: 1920, height: 1080, name: "desktop-1920" },
  { width: 1440, height: 900, name: "desktop-1440" },
  { width: 1280, height: 720, name: "desktop-1280" },
  { width: 768, height: 1024, name: "tablet-768" },
  { width: 390, height: 844, name: "mobile-390" },
  { width: 360, height: 800, name: "mobile-360" },
];

const results = [];

for (const vp of viewports) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.goto("http://127.0.0.1:8000");
  await expect(page.getByRole("button", { name: "Find journeys" })).toBeVisible({ timeout: 30000 });

  // Check overflow
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) {
    throw new Error(`Viewport ${vp.name} (${vp.width}x${vp.height}) has horizontal overflow!`);
  }

  // Load demo route
  await page.getByRole("button", { name: "Try a journey with demand data" }).click();
  await page.getByRole("button", { name: "Less crowded" }).click();
  await page.getByRole("button", { name: "Find journeys" }).click();

  await expect(page.getByText("Recommended", { exact: true })).toBeVisible({ timeout: 60000 });
  await page.waitForTimeout(1500);

  // Screenshot
  await page.screenshot({
    path: `${outDir}/${vp.name}-journey.png`,
    fullPage: false,
  });

  // For 1440 viewport, also test Demand Explorer, Evidence, and Hindi switching
  if (vp.name === "desktop-1440") {
    // Switch to Demand Explorer
    await page.getByRole("button", { name: "Demand explorer", exact: true }).click();
    await expect(page.getByText("Demand by route")).toBeVisible();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${outDir}/desktop-explorer-redesigned.png`, fullPage: false });

    // Switch to Evidence
    await page.getByRole("button", { name: "Our evidence", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Our evidence", exact: true })).toBeVisible();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${outDir}/desktop-evidence-redesigned.png`, fullPage: false });

    // Switch to Hindi
    await page.getByRole("button", { name: "Journey planner", exact: true }).click();
    await page.getByRole("button", { name: "हिन्दी", exact: true }).click();
    await expect(page.getByText("सफर खोजें")).toBeVisible();
    await expect(page.getByText("अनुशंसित")).toBeVisible();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${outDir}/desktop-hindi-journey.png`, fullPage: false });

    // Switch back to English
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.getByText("Find journeys")).toBeVisible();
  }

  results.push({
    viewport: `${vp.width}x${vp.height}`,
    name: vp.name,
    overflow: false,
    errors: pageErrors,
  });

  await context.close();
}

await browser.close();

const report = {
  status: "PASS",
  timestamp: new Date().toISOString(),
  viewports: results,
};

await fs.writeFile(
  fileURLToPath(new URL("../../data/reports/multi-viewport-qa.json", import.meta.url)),
  JSON.stringify(report, null, 2)
);

console.log(JSON.stringify(report, null, 2));
