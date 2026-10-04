import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(() => {
    window.bugPositions = [];
    window.bossSeen = false;
    const original = CanvasRenderingContext2D.prototype.ellipse;
    CanvasRenderingContext2D.prototype.ellipse = function(x, y, rx, ry, ...rest) {
      const matrix = this.getTransform();
      if (rx > 10 && ry > 8) {
        window.bugPositions.push({ x: matrix.e, y: matrix.f, size: rx });
        if (rx > 28) window.bossSeen = true;
      }
      return original.call(this, x, y, rx, ry, ...rest);
    };
  });
  await page.goto('http://localhost:8765/', { waitUntil: 'domcontentloaded' });
  await page.setViewport({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth, offenders: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 2 && getComputedStyle(el).position !== 'fixed').map(el => ({ element: el.className || el.tagName, right: Math.round(el.getBoundingClientRect().right) })).slice(0, 25) }));
  await page.setViewport({ width: 1200, height: 900 });
  await page.click('#startBtn');
  let hits = 0;
  const until = Date.now() + 15000;
  while (Date.now() < until) {
    const bug = await page.evaluate(() => {
      const positions = window.bugPositions.splice(0);
      const r = document.querySelector('#bugCanvas').getBoundingClientRect();
      return positions.find(p => p.x > 70 && p.x < r.width - 70 && p.y > 115 && p.y < r.height - 50 && p.size < 38) || null;
    });
    if (bug) {
      const box = await page.$eval('#bugCanvas', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y }; });
      await page.mouse.click(box.x + bug.x, box.y + bug.y);
      hits++;
    }
    await new Promise(resolve => setTimeout(resolve, 90));
  }
  const gameplay = await page.evaluate(() => ({ wave: document.querySelector('#waveLabel').textContent, kills: document.querySelector('#missionProgress').textContent, daily: document.querySelector('#dailyProgress').textContent, stored: JSON.parse(localStorage.getItem('bughunt_v2_daily') || 'null'), badges: document.querySelectorAll('.badge').length, bossSeen: window.bossSeen }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  const persisted = await page.$eval('#dailyProgress', el => el.textContent);
  console.log(JSON.stringify({ overflow, hits, gameplay, persisted, errors }, null, 2));
  if (errors.length || overflow.width > overflow.viewport || !gameplay.bossSeen || !gameplay.stored || gameplay.stored.kills < 1 || persisted !== gameplay.daily) process.exitCode = 1;
} finally {
  await browser.close();
}