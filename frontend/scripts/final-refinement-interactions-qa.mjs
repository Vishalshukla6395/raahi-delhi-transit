import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const p=await b.newPage({viewport:{width:390,height:844}});
 await p.goto('http://127.0.0.1:8000');
 await expect(p.getByRole('button',{name:'Find journeys',exact:true})).toBeEnabled();
 await p.getByRole('combobox',{name:'From',exact:true}).fill('Ambedkar Nagar Terminal');
 await p.getByRole('option').filter({hasText:'2739'}).click();
 await p.getByRole('combobox',{name:'To',exact:true}).fill('Connaught');
 await p.getByRole('option').filter({hasText:'365'}).click();
 await p.locator('#raahi-dep-date').fill('2026-11-24');
 await p.locator('#raahi-dep-time').fill('18:00');
 await p.getByRole('checkbox').check();
 const response=p.waitForResponse(r=>r.url().endsWith('/journeys/search') && r.request().method()==='POST');
 await p.getByRole('button',{name:'Find journeys',exact:true}).click();
 const data=await (await response).json();
 await expect(p.locator('.journey-card').first()).toBeVisible();
 expect(await p.evaluate(()=>scrollY)).toBeGreaterThan(0);
 await expect(p.locator('.transfer-connector')).toContainText('Change bus here');
 const j=data.journeys[0]; const wait=Math.round((Date.parse(j.legs[1].departure)-Date.parse(j.legs[0].arrival))/60000);
 await expect(p.locator('.transfer-connector-sub')).toContainText(`${wait} min`);
 await expect(p.locator('.selected-journey-summary')).toContainText('unavailable');
 await p.locator('.intermediate-toggle-btn').first().click();
 await expect(p.locator('.intermediate-list').first()).toBeVisible();
 await p.getByRole('button',{name:'Show entire journey'}).click();
 await p.screenshot({path:'../docs/screenshots/final-refinement/mobile-transfer.png',fullPage:true});
 for(const width of [1440,360,1920]) {
  await p.setViewportSize({width,height:900}); await p.waitForTimeout(250);
  expect(await p.locator('.map').evaluate(map=>{const r=map.getBoundingClientRect();return [...map.querySelectorAll('.marker-origin,.marker-dest')].every(e=>{const m=e.getBoundingClientRect();return m.left>=r.left && m.right<=r.right && m.top>=r.top && m.bottom<=r.bottom-60;});})).toBe(true);
 }
 await p.getByRole('button',{name:'Demand explorer',exact:true}).click();
 await expect(p.locator('.recharts-area')).toBeVisible();
 await p.getByLabel('Historical route').selectOption('717adown');
 await p.getByLabel('Historical profile date').fill('2026-11-28');
 await expect(p.locator('.hour-table tbody tr').first()).toBeVisible();
 await fs.writeFile('../data/reports/final-refinement-interactions.json',JSON.stringify({status:'PASS',timestamp:new Date().toISOString(),realTransfer:true,waitMinutes:wait,unknownDemand:true,intermediateStops:true,mobileResultsJump:true,mapRefitAcrossResize:[1440,360,1920],explorerFilter:true},null,2));
 console.log('Transfer, mobile results navigation, responsive map refit, explorer filters: PASS');
} finally {await b.close();}
