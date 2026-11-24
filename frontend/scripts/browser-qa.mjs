import { chromium, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
const out = new URL("../../docs/screenshots/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const chromePath = [process.env.CHROME_PATH,"C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].filter(Boolean).find(existsSync);
const browser = await chromium.launch(chromePath ? { executablePath: chromePath, headless:true } : { channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [],
  failures = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("requestfailed", (r) =>
  failures.push({ url: r.url(), error: r.failure()?.errorText }),
);
const shot = async (name) =>
  page.screenshot({
    path: new URL(name + ".png", out).pathname.replace(/^\/([A-Z]:)/, "$1"),
    fullPage: true,
  });
await page.goto("http://127.0.0.1:8000");
await expect(
  page.getByRole("button", { name: "Find journeys" }),
).toBeEnabled();
await page
  .getByRole("combobox", { name: "From" })
  .fill("Ambedkar Nagar Terminal");
await page.getByRole("option").filter({ hasText: "Stop 2739" }).click();
await page.getByRole("combobox", { name: "To" }).fill("Hamdard Nagar");
await page.getByRole("option").filter({ hasText: "Stop 2301" }).click();
await page.getByLabel("Departure date").fill("2026-11-24");
await page.getByLabel("Departure time").fill("18:00");
await page.getByRole("button", { name: "Find journeys" }).click();
await expect(page.getByText("Recommended", { exact: true })).toBeVisible({
  timeout: 60000,
});
await expect(page.locator(".leaflet-overlay-pane path").first()).toBeAttached();
await page
  .getByRole("button", { name: /^Inspect segment/ })
  .first()
  .click();
await expect(page.locator(".segment-info")).toContainText("observed days");
await page.waitForTimeout(2500);
await shot("desktop-journey");
const tileState = await page
  .locator(".leaflet-tile")
  .evaluateAll((imgs) => ({
    total: imgs.length,
    loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
  }));
await page
  .locator(".leaflet-overlay-pane path.leaflet-interactive")
  .first()
  .click();
await expect(page.locator(".segment-info")).toBeVisible();
await page
  .locator("header")
  .getByRole("button", { name: "Demand explorer", exact: true })
  .click();
await expect(page.locator(".recharts-area")).toBeVisible();
await page
  .getByRole("combobox", { name: "Historical route" })
  .selectOption("717adown");
await expect(page.locator(".hour-table tbody tr")).not.toHaveCount(0);
await page.getByLabel("Historical profile date").fill("2026-11-28");
await expect(page.locator(".chart-placeholder")).toHaveCount(0);
await shot("desktop-explorer");
await page.getByRole("button", { name: "Our evidence", exact: true }).click();
await expect(page.getByText("32.0%", { exact: true })).toBeVisible();
await expect(page.getByText("15.2%", { exact: true })).toBeVisible();
await expect(page.getByText("69.4%", { exact: true }).first()).toBeVisible();
await expect(page.getByText("Model comparison")).toBeVisible();
await shot("desktop-evidence");
await page.setViewportSize({ width: 390, height: 844 });
await shot("mobile-evidence");
await page
  .getByRole("button", { name: "Journey planner", exact: true })
  .click();
await page.getByLabel("Departure date").fill("2026-11-24");
await page.getByRole("button", { name: "Find journeys" }).click();
await expect(page.getByText("Recommended", { exact: true })).toBeVisible({
  timeout: 60000,
});
await page
  .getByRole("button", { name: /^Inspect segment/ })
  .first()
  .click();
await page.waitForTimeout(2500);
await shot("mobile-journey");
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth,
);
if (overflow) throw new Error("Mobile page has horizontal overflow");
await page.setViewportSize({width:1440,height:1000});
await page.getByRole("button", {name:"Try a journey with demand data"}).click();
await page.getByRole("button", {name:"Less crowded"}).click();
await page.getByRole("button", {name:"Find journeys"}).click();
const comparison = page.getByRole("region", { name: "Compared with the fastest option" });
await expect(comparison).toBeVisible({timeout:60000});
await expect(comparison).toContainText("points lower demand");
await comparison.locator("summary").click();
await page.waitForTimeout(1000);
await shot("desktop-tradeoff");
if (errors.length) throw new Error(JSON.stringify(errors));
const report = {
  status: "PASS",
  browser: await browser.version(),
  headless: true,
  viewports: ["1440x1000", "390x844"],
  checks: [
    "actual stop autocomplete",
    "real route alternatives",
    "segment strip and map path interaction",
    "historical route/date change",
    "route and segment evidence",
    "data-derived complete-coverage time/demand trade-off",
    "mobile journey interaction",
    "no mobile horizontal page overflow",
  ],
  page_errors: errors,
  request_failures: failures,
  tile_state: tileState,
  limitation:
    "Headless Chrome desktop and mobile viewport emulation; not a physical mobile device or field test",
};
await fs.writeFile(
  new URL("../../data/reports/browser-verification.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
await browser.close();
