import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
const out='../docs/screenshots/final-refinement'; await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[];
const dimensions=[[1920,1080],[1600,900],[1440,900],[1366,768],[768,1024],[390,844],[360,800]];
try {
for(const [width,height] of dimensions) {
 const context=await browser.newContext({viewport:{width,height},timezoneId:'Asia/Kolkata'}); const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000');
 await expect(page.getByRole('button',{name:'Find journeys',exact:true})).toBeEnabled();
 await page.screenshot({path:`${out}/${width}-search.png`,fullPage:true});
 await page.getByRole('button',{name:'Try a journey with demand data'}).click();
 await page.getByRole('button',{name:'Find journeys',exact:true}).click();
 await expect(page.locator('.journey-card').first()).toBeVisible();
 await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
 await page.waitForTimeout(1200);
 for(const lang of ['en','hi']) {
  if(lang==='hi') await page.getByRole('button',{name:'हिन्दी',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('lang',lang);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const clipped=await page.locator('.mode-card,.datetime-input-group input,.journey-card,.selected-journey-summary').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.className));
  expect(clipped,`${width} ${lang} unclipped controls`).toEqual([]);
  expect(await page.locator('.journey-list-panel,.journey-list-scroll,.journey-detail-panel').evaluateAll(es=>es.every(e=>e.scrollHeight<=e.clientHeight+2))).toBe(true);
  const markersFit=await page.locator('.map').evaluate(map=>{const r=map.getBoundingClientRect();return [...map.querySelectorAll('.marker-origin,.marker-dest')].every(e=>{const m=e.getBoundingClientRect(); return m.left>=r.left && m.right<=r.right && m.top>=r.top && m.bottom<=r.bottom-60;});});
  expect(markersFit,`${width} ${lang} map fits whole journey`).toBe(true);
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:`${out}/${width}-${lang}-journey.png`,fullPage:true});
  await page.screenshot({path:`${out}/${width}-${lang}-viewport.png`});
 }
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await page.locator('.journey-card').nth(1).click();
 await expect(page.locator('.journey-card').nth(1)).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.journey-card').first().getByText('Recommended',{exact:true})).toBeVisible();
 await expect(page.locator('.selected-journey-summary > strong')).toHaveText(await page.locator('.journey-card').nth(1).locator('.duration-num').innerText().then(x=>`${x} min`));
 await page.locator('.departure-comparison-title').click();
 await expect(page.locator('.departure-clock').first()).toContainText('→');
 await page.locator('.departure-chip').nth(1).click();
 await expect(page.locator('.departure-chip').nth(1)).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Show entire journey'}).click();
 await page.locator('.leaflet-control-zoom-in').click();
 await page.getByRole('button',{name:'Show entire journey'}).click();
 await page.locator('.strip-segment').first().click();
 await expect(page.locator('.segment-info')).toBeVisible();
 await page.locator('.timeline-toggle').click(); await expect(page.locator('.timeline-toggle')).toHaveAttribute('aria-expanded','false');
 await page.locator('.timeline-toggle').click();
 if(width===1440) {
  for(const label of ['Fastest','Balanced','Less crowded']) {
   await page.locator('.mode-options-grid').getByRole('button',{name:new RegExp(`^${label}`)}).click();
   await page.getByRole('button',{name:'Find journeys',exact:true}).click(); await expect(page.locator('.journey-card').first()).toBeVisible();
  }
  await page.getByRole('combobox',{name:'From',exact:true}).fill('Ambedkar Nagar Terminal');
  await page.getByRole('option').filter({hasText:'2739'}).click();
  await page.getByRole('combobox',{name:'To',exact:true}).fill('Hamdard Nagar');
  await page.getByRole('option').filter({hasText:'2301'}).click();
  await page.locator('#raahi-dep-time').fill('18:00');
  await page.locator('.mode-options-grid').getByRole('button',{name:/^Balanced/}).click();
  await page.getByRole('button',{name:'Find journeys',exact:true}).click();
  await expect(page.locator('.journey-card').first()).toBeVisible();
  await page.locator('.journey-card').filter({hasText:'unavailable'}).first().click();
  await expect(page.locator('.selected-journey-summary')).toContainText('unavailable');
 }
 for(const label of ['Demand explorer','Our evidence']) {
  await page.getByRole('button',{name:label,exact:true}).click();
  await expect(page.locator('.content-page')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`${out}/${width}-${label==='Our evidence'?'evidence':'explorer'}.png`,fullPage:true});
 }
 expect(errors).toEqual([]);
 results.push({width,height,status:'PASS',languages:['en','hi'],mapFit:true,noNestedClipping:true,routeSelection:true,laterDepartures:true,pageErrors:errors});
 console.log(`${width}x${height} PASS`); await context.close();
}
await fs.writeFile('../data/reports/final-refinement-qa.json',JSON.stringify({timestamp:new Date().toISOString(),browser:await browser.version(),baseUrl:'http://127.0.0.1:8000',scope:'Local Chrome automation, not physical device testing',results},null,2));
} finally {await browser.close();}
