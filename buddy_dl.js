const fs = require('fs');
const { chromium } = require('playwright');

const SOURCE_URL = process.argv[2];
if (!SOURCE_URL) { console.error('No source URL'); process.exit(1); }

const PROCESS_URL = 'https://9xbuddy.site/process?url=' + encodeURIComponent(SOURCE_URL);

function sanitize(str) {
  return (str || 'video')
    .replace(/[^a-zA-Z0-9 ._-]/g, '_')
    .replace(/[_ ]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80) || 'video';
}

async function getActionLinks(page) {
  const hrefs = await page.$$eval('a[href]', els => els.map(a => a.href).filter(Boolean));
  return hrefs.filter(u =>
    u.includes('9xbud.com/down') ||
    u.includes('workers.dev')
  );
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    acceptDownloads: true
  });
  const page = await context.newPage();

  page.on('response', async (resp) => {
    try {
      const u = resp.url();
      if (u.includes('9xbud.com/token'))  console.log('[TOKEN]', resp.status());
      if (u.includes('9xbud.com/extract')) console.log('[EXTRACT]', resp.status());
    } catch(e) {}
  });

  console.log('Opening:', PROCESS_URL);
  await page.goto(PROCESS_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  const title = sanitize((await page.title()).trim());
  console.log('Title:', title);

  const buttons = await page.$$('button, a');
  let foundLinks = [];

  for (const btn of buttons) {
    try {
      const txt  = (await btn.innerText().catch(() => '')).toLowerCase().trim();
      const href = (await btn.getAttribute('href').catch(() => '')) || '';

      if (/app|software|extension|home|support|language/.test(txt)) continue;
      if (!txt.includes('download') && !txt.includes('extract') && !txt.includes('get link')) continue;
      if (href.startsWith('http') && !href.includes('9xbud.com') && !href.includes('workers.dev')) continue;

      console.log('Clicking:', txt.slice(0, 40) || href.slice(0, 60));
      await btn.click().catch(() => {});

      const start = Date.now();
      while (Date.now() - start < 12000) {
        await page.waitForTimeout(500);
        const links = await getActionLinks(page);
        if (links.length > 0) {
          console.log('Found', links.length, 'link(s) after', Math.round((Date.now() - start) / 1000), 's');
          links.forEach(l => console.log(' ', l.slice(0, 120)));
          foundLinks = links;
          break;
        }
      }

      if (foundLinks.length > 0) break;
      console.log('No links, trying next button...');
    } catch(e) {}
  }

  if (foundLinks.length === 0) {
    console.error('No links found!');
    await browser.close();
    process.exit(1);
  }

  const candidates = [];
  const seen = new Set();

  for (const u of foundLinks) {
    if (seen.has(u)) continue;
    seen.add(u);
    if (u.includes('9xbud.com/down')) {
      candidates.push({ url: u, type: '9xbud-direct', priority: 1 });
      console.log('[9xbud-direct]', u.slice(0, 100));
    } else if (u.includes('workers.dev')) {
      candidates.push({ url: u, type: 'worker-direct', priority: 2 });
      console.log('[worker-direct]', u.slice(0, 100));
    }
  }

  candidates.sort((a, b) => a.priority - b.priority);
  console.log('Candidates:', candidates.length);
  candidates.forEach((c, i) => console.log(' [' + (i+1) + '][' + c.type + '] ' + c.url.slice(0, 100)));

  const cookies = await context.cookies();
  fs.writeFileSync('grabbed/candidates.json', JSON.stringify(candidates, null, 2));
  fs.writeFileSync('grabbed/title.txt', title);
  fs.writeFileSync('grabbed/cookies.txt', cookies.map(c => c.name + '=' + c.value).join('; '));

  await browser.close();
})();
