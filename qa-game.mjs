import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) });
// Keep this local-storage test isolated from a configured live Supabase project.
await page.setRequestInterception(true);
page.on('request', request => request.url().endsWith('/leaderboard-config.js')
  ? request.respond({ status:200, contentType:'application/javascript', body:'window.BUG_HUNT_SUPABASE={url:"",publishableKey:""};' })
  : request.continue());
await page.goto('http://localhost:8765/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.badge');
const initial = await page.evaluate(() => ({ badges: document.querySelectorAll('.badge').length, board: document.querySelector('#boardMode').textContent, canvas: document.querySelector('#bugCanvas').width }));
await page.click('[data-mode=sprint]'); await page.click('#startBtn');
await new Promise(r => setTimeout(r, 1700));
const started = await page.evaluate(() => ({ overlay: document.querySelector('#startOverlay').classList.contains('hidden'), time: document.querySelector('#hudTime').textContent, wave: document.querySelector('#waveLabel').textContent, canvas: document.querySelector('#bugCanvas').width }));
await page.click('#pauseBtn'); const paused = await page.$eval('#pauseOverlay', e => !e.classList.contains('hidden'));
await new Promise(r => setTimeout(r, 1200)); const pausedTime = await page.$eval('#hudTime', e => e.textContent);
await page.click('#resumeBtn'); await page.click('#pauseBtn'); await page.click('#quitBtn');
const ended = await page.evaluate(() => ({ over: !document.querySelector('#overOverlay').classList.contains('hidden'), score: document.querySelector('#finalScore').textContent }));
await page.type('#playerName', 'Test Hero'); await page.click('#saveScoreBtn');
const saved = await page.evaluate(() => ({ name: document.querySelector('#leaderboard').textContent, hidden: document.querySelector('#scoreForm').hidden, storage: !!localStorage.getItem('bughunt_v2_board') }));
await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('.badge'); await page.click('[data-mode=sprint]');
const persisted = await page.$eval('#leaderboard', e => e.textContent.includes('Test Hero'));
await page.setViewport({ width: 390, height: 844 }); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('.badge');
const mobile = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: innerWidth, gameWidth: document.querySelector('#gameWrap').clientWidth, canvasWidth: document.querySelector('#bugCanvas').width }));
await page.evaluate(() => document.querySelector('#game').scrollIntoView());
await new Promise(r => setTimeout(r, 900));
await page.$eval('#game', el => el.scrollIntoView({behavior:'instant',block:'start'}));
await (await page.$('#gameWrap')).screenshot({ path: 'qa-arcade.png' });
const gameLayout = await page.evaluate(() => ({ gameTop: document.querySelector('#game').getBoundingClientRect().top, overlayHeight: document.querySelector('#startOverlay').clientHeight, menuHeight: document.querySelector('#startOverlay .arcade-menu').clientHeight, overflow: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 2 && getComputedStyle(el).position !== 'fixed').slice(0,8).map(el => el.className || el.tagName) }));
console.log(JSON.stringify({ initial, started, paused, pausedTime, ended, saved, persisted, mobile, gameLayout, errors }, null, 2));
if (errors.length || !saved.hidden || !saved.storage || !persisted) process.exitCode = 1;
await browser.close();
