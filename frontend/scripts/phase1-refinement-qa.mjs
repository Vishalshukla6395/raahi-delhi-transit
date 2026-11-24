import {chromium, expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const out = `${root}/docs/screenshots/refinement`;
await fs.mkdir(out, {recursive:true});
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true});
const results=[];
const viewports = [[1280,720],[1440,900],[1920,1080],[900,900],[768,1024],[390,844],[360,800]];
const widths=process.env.RAAHI_QA_WIDTHS?.split(',').map(Number);
try {
for (const [width,height] of viewports.filter(([w])=>!widths || widths.includes(w))) for (const lang of ['en','hi']) {
  const context=await browser.newContext({viewport:{width,height}, timezoneId:'America/New_York', hasTouch:width<500, isMobile:width<500});
  await context.addInitScript(language=>localStorage.setItem('raahi_lang',language),lang);
  const page=await context.newPage();
  const errors=[];
  const badResponses=[];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().includes('/api/') && r.status()>=400) badResponses.push({url:r.url(),status:r.status()});});
  const hi=lang==='hi';
  const names=hi?{find:'सफर खोजें',demo:'मांग डेटा वाला उदाहरण देखें',from:'कहाँ से',to:'कहाँ तक',recommended:'अनुशंसित',explorer:'मांग अन्वेषण',evidence:'प्रमाण एवं पद्धति',planner:'सफर योजना'}:{find:'Find journeys',demo:'Try a journey with demand data',from:'From',to:'To',recommended:'Recommended',explorer:'Demand explorer',evidence:'Our evidence',planner:'Journey planner'};
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByRole('button',{name:names.find,exact:true})).toBeEnabled();
  await expect(page.locator('html')).toHaveAttribute('lang',lang);
  const checkOverflow=async()=>{
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const clipped=await page.locator('.datetime-input-group input, .mode-card, .chart-controls input, .chart-controls select').evaluateAll(elements=>elements.filter(el=>el.scrollWidth>el.clientWidth+2).map(el=>el.outerHTML.slice(0,160)));
    expect(clipped).toEqual([]);
    const outside=await page.locator('.raahi-header button:visible, .status-pill:visible, .datetime-input-group input, .chart-controls input, .chart-controls select').evaluateAll(elements=>elements.filter(el=>{const r=el.getBoundingClientRect();return r.left < -1 || r.right > innerWidth+1;}).map(el=>el.outerHTML.slice(0,160)));
    expect(outside).toEqual([]);
  };
  const visibleButton=async()=>{
    const fits=await page.getByRole('button',{name:names.find,exact:true}).evaluate(el=>{
      const r=el.getBoundingClientRect(); const panel=document.querySelector('.search-panel').getBoundingClientRect();
      return r.top>=60 && r.bottom<=Math.min(innerHeight,panel.bottom)+1;
    });
    expect(fits,`${width}x${height} ${lang}: button is visible without scrolling`).toBe(true);
  };
  await checkOverflow(); await visibleButton();
  if(width===1280 || width===390) await page.screenshot({path:`${out}/${width}-${lang}-search.png`});
  // Incomplete form and localized validation, followed by real autocomplete.
  await page.getByRole('button',{name:names.find,exact:true}).click();
  await expect(page.getByRole('alert')).toContainText(hi?'कहाँ से':'From and To');
  await page.getByRole('combobox',{name:names.from,exact:true}).fill('Ambedkar Nagar Terminal');
  await page.getByRole('option').filter({hasText:'2739'}).click();
  await page.getByRole('combobox',{name:names.to,exact:true}).fill('Hamdard Nagar');
  await page.getByRole('option').filter({hasText:'2301'}).click();
  await expect(page.getByText(hi?'चयनित · स्टॉप 2301':'Selected · Stop 2301',{exact:true})).toBeVisible();
  await visibleButton();
  // +15 respects the selected date/time and crosses midnight in IST.
  await page.locator('#raahi-dep-date').fill('2026-11-24');
  await page.locator('#raahi-dep-time').fill('23:55');
  await page.getByRole('button',{name:hi?'+15 मिनट':'+15 min',exact:true}).click();
  await expect(page.locator('#raahi-dep-date')).toHaveValue('2026-11-25');
  await expect(page.locator('#raahi-dep-time')).toHaveValue('00:10');
  await page.getByRole('button',{name:hi?'अभी निकलें':'Leave now',exact:true}).click();
  const today=await page.evaluate(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
  await expect(page.locator('#raahi-dep-date')).toHaveValue(today);
  // Load and search an actual pair with full historical demand coverage.
  await page.getByRole('button',{name:names.demo,exact:true}).click();
  await expect(page.locator('#raahi-dep-time')).toHaveValue('20:00');
  await page.locator('.search-panel').evaluate(el=>el.scrollTop=0);
  await visibleButton();
  await page.getByRole('button',{name:names.find,exact:true}).click();
  await expect(page.getByText(names.recommended,{exact:true})).toBeVisible({timeout:60000});
  expect(await page.locator('.journey-card').count()).toBeGreaterThan(1);
  if(width===1280 && !hi) {
    for(const [label,expected] of [['Fastest',19],['Balanced',19],['Less crowded',23]]) {
      await page.locator('.mode-options-grid').getByRole('button',{name:new RegExp(`^${label}`)}).click();
      await page.getByRole('button',{name:names.find,exact:true}).click();
      await expect(page.getByText(names.recommended,{exact:true})).toBeVisible();
      await expect(page.locator('.journey-card').first().locator('.duration-num')).toHaveText(String(expected));
    }
  }
  await page.locator('.strip-segment').first().click();
  await expect(page.locator('.segment-info')).toContainText(hi?'मांग सूचकांक':'Demand index');
  await page.locator('.timeline-toggle').click();
  await expect(page.locator('.timeline-toggle')).toHaveAttribute('aria-expanded','false');
  await page.locator('.timeline-toggle').click();
  const intermediate=page.locator('.intermediate-toggle-btn').first();
  if(await intermediate.count()) {await intermediate.click();await expect(page.locator('.intermediate-list').first()).toBeVisible();}
  await expect(page.locator('.leaflet-overlay-pane path').first()).toBeAttached();
  // Switching the actual language control preserves the current journey.
  await page.getByRole('button',{name:hi?'EN':'हिन्दी',exact:true}).click();
  await expect(page.getByText(hi?'Recommended':'अनुशंसित',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:hi?'हिन्दी':'EN',exact:true}).click();
  await expect(page.getByText(names.recommended,{exact:true})).toBeVisible();
  await page.locator('.journey-detail-panel').evaluate(el=>el.scrollTop=0);
  await page.locator('.journey-list-scroll').evaluate(el=>el.scrollTop=0);
  await page.locator('.journey-list-panel').evaluate(el=>el.scrollTop=0);
  const firstCardFits=await page.locator('.journey-card').first().evaluate(el=>{
    const card=el.getBoundingClientRect(), panel=el.closest('.journey-list-panel').getBoundingClientRect();
    return card.top>=panel.top && card.bottom<=panel.bottom+1;
  });
  expect(firstCardFits,'First journey card is visible inside its list, not squeezed by later departures').toBe(true);
  await page.locator('.planner-workspace').evaluate(el=>el.scrollTop=0);
  await checkOverflow();
  await page.screenshot({path:`${out}/${width}-${lang}-journey.png`});
  for (const [nav,kind] of [[names.explorer,'explorer'],[names.evidence,'evidence']]) {
    await page.getByRole('button',{name:nav,exact:true}).click();
    if(kind==='explorer') {
      await expect(page.locator('.recharts-area')).toBeVisible();
      await page.getByLabel('Historical route').selectOption('717adown');
      await page.getByLabel('Historical profile date').fill('2026-11-28');
      await expect(page.locator('.hour-table tbody tr').first()).toBeVisible();
      await expect(page.locator('.chart-note')).toContainText(hi?'वास्तविक भीड़ नहीं':'not onboard occupancy');
    } else {
      await expect(page.getByText(hi?'सफर का क्रम कैसे तय होता है':'How journeys are ranked',{exact:true})).toBeVisible();
      await expect(page.getByText('15.2%',{exact:true})).toBeVisible();
      await expect(page.getByText('65%',{exact:false}).first()).toBeVisible();
    }
    await checkOverflow();
    await page.locator('.content-page').evaluate(el=>el.scrollTop=0);
    if(width===1280 || width===390) await page.screenshot({path:`${out}/${width}-${lang}-${kind}.png`});
  }
  expect(errors).toEqual([]); expect(badResponses).toEqual([]);
  results.push({width,height,language:lang,status:'PASS',buttonWithoutScrolling:true,midnightOffset:true,autocomplete:true,realJourney:true,explorer:true,evidence:true,pageErrors:errors,apiFailures:badResponses});
  console.log(`${width}x${height} ${lang}: PASS`);
  await context.close();
}
await fs.writeFile(`${root}/data/reports/phase1-refinement${widths?'-mobile':''}-qa.json`,JSON.stringify({status:'PASS',timestamp:new Date().toISOString(),browser:await browser.version(),scope:'Local Chrome with touch emulation on phone sizes; not a physical handset',results},null,2));
} finally {await browser.close();}
