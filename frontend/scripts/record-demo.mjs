import { chromium, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
const dir = fileURLToPath(new URL("../../tmp/recording/", import.meta.url));
await fs.mkdir(dir, { recursive: true });
const chromePath = [process.env.CHROME_PATH,"C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].filter(Boolean).find(existsSync);
const browser = await chromium.launch(chromePath ? { executablePath: chromePath, headless:true } : { channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir, size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
const segments = [];
const started = Date.now();
async function guide(text, seconds) {
  segments.push({
    time_seconds: Math.round((Date.now() - started) / 1000),
    caption: text,
  });
  await page.evaluate((text) => {
    let box = document.getElementById("demo-guide");
    if (!box) {
      box = document.createElement("div");
      box.id = "demo-guide";
      document.body.append(box);
    }
    box.textContent = "DEMO GUIDE  /  " + text;
    Object.assign(box.style, {
      position: "fixed",
      bottom: "12px",
      left: "100px",
      right: "24px",
      zIndex: "10000",
      background: "#143e35",
      color: "#fff",
      padding: "16px 24px",
      borderRadius: "10px",
      font: "16px/1.5 Arial",
      boxShadow: "0 4px 20px #0003",
      pointerEvents: "none",
    });
  }, text);
  await page.waitForTimeout(seconds * 1000);
}
await page.goto("http://127.0.0.1:8000");
await expect(
  page.getByRole("button", { name: "Find journeys" }),
).toBeEnabled();
await guide(
  "RAAHI combines real October ticket history with Delhi bus schedules. This is a sampled-demand signal, not physical onboard crowding.",
  7,
);
const demoResponse = await page.request.get("http://127.0.0.1:8000/api/v1/demo");
const demo = await demoResponse.json();
if (!demo.available || !demo.departure) throw new Error("No evidence-supported demo preset is available");
await page
  .getByRole("button", {
    name: "Try a journey with demand data",
  })
  .click();
await expect(page.getByRole("combobox", { name: "From" })).toHaveValue(demo.origin.name);
await expect(page.getByRole("combobox", { name: "To" })).toHaveValue(demo.destination.name);
await page.locator(".mode-options-grid").getByRole("button", { name: /^Less crowded/ }).click();
await guide(
  `A real supported example: ${demo.origin.name} to ${demo.destination.name}. ${demo.departure.slice(0,16)} IST.`,
  7,
);
await page.getByRole("button", { name: "Find journeys" }).click();
await expect(page.getByText("Recommended", { exact: true })).toBeVisible({
  timeout: 60000,
});
await guide(
  "The full GTFS supplies scheduled services. Colored links show sampled demand; straight map links are not road geometry.",
  7,
);
await page
  .getByRole("button", { name: /^Inspect segment/ })
  .first()
  .click();
await page.locator(".segment-info").scrollIntoViewIfNeeded();
await guide(
  "Inspect supporting days and tickets. A demand index of 100 is a historical percentile, not 100% bus capacity.",
  8,
);
const comparison = page.getByRole("region", { name: "Compared with the fastest option" });
await comparison.locator("summary").click();
await comparison.scrollIntoViewIfNeeded();
await guide(
  "Compare the fastest scheduled option with a lower sampled-demand index. Index points do not equal a percentage fewer passengers.",
  9,
);
await page.locator(".departure-comparison-section summary").click();
await page.locator(".departure-options").scrollIntoViewIfNeeded();
await page.locator(".departure-options button").nth(2).click();
await guide(
  "Compare later departures. Here +30 minutes still has high sampled demand. We do not promise a quieter trip.",
  7,
);
await page
  .locator("header")
  .getByRole("button", { name: "Demand explorer", exact: true })
  .click();
await page.evaluate(() => window.scrollTo(0, 0));
await expect(page.locator(".recharts-area")).toBeVisible();
await guide(
  "2,559,899 October e-ticket records; matching is selective and may not represent ETM, pass holders or all riders.",
  7,
);
await page
  .getByRole("combobox", { name: "Historical route" })
  .selectOption("717adown");
await page.getByLabel("Historical profile date").fill("2026-11-28");
await expect(page.locator(".chart-placeholder")).toHaveCount(0);
await guide(
  "Change route and weekday/weekend date to explore actual historical patterns. The evidence table explains each estimate.",
  7,
);
await page.getByRole("button", { name: "Our evidence", exact: true }).click();
await page.evaluate(() => window.scrollTo(0, 0));
await guide(
  "32.0% of tickets match one unambiguous forward path. The demand model covers 100 of 3,498 patterns.",
  7,
);
await page
  .getByRole("heading", { name: "Segment demand validation" })
  .evaluate((e) => e.scrollIntoView({ block: "start" }));
await guide(
  "The simpler same-slot model is used in the planner. Holdout WAPE is 69.96% versus 69.43% seasonal; the difference is small.",
  9,
);
await page.getByRole("heading", { name: "Model comparison" }).evaluate((e) => e.scrollIntoView({block:"start"}));
await guide("Same-pattern departure-order agreement is 64.11% for same-slot versus 63.83% seasonal in the final week. Correlated ticket rows do not verify comfort or occupancy.",7);
await guide(
  "4,769 segments across 100 patterns. Full-month volume selected scope; ETM/APC, capacity calibration and a prospective test remain needed.",
  7,
);
await page
  .getByRole("heading", { name: "Data boundaries" })
  .scrollIntoViewIfNeeded();
await guide(
  "No live ETAs, seat guarantees or calibrated occupancy. Reproducible source, methodology and checks accompany the prototype.",
  7,
);
const video = page.video();
await context.close();
const target = fileURLToPath(
  new URL("../../submission/demo.webm", import.meta.url),
);
await video.saveAs(target);
await browser.close();
await fs.writeFile(
  new URL("../../data/reports/demo-recording.json", import.meta.url),
  JSON.stringify(
    {
      file: "submission/demo.webm",
      duration_approx_seconds: Math.round((Date.now() - started) / 1000),
      kind: "Actual local application capture with DEMO GUIDE annotations; no fabricated app results; silent video",
      viewport: "1440x1000",
      chapters: segments,
    },
    null,
    2,
  ),
);
console.log(target);
