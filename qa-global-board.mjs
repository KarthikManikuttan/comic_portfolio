import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless:true, executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', args:['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const errors = [];
  const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET, POST, OPTIONS', 'Access-Control-Allow-Headers':'apikey, content-type, prefer' };
  const scores = [{ name:'Visitor', score:120, mode:'sprint' }];
  let rejectPosts = false;
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().endsWith('/leaderboard-config.js')) {
      return request.respond({ status:200, contentType:'application/javascript', body:'window.BUG_HUNT_SUPABASE={url:"https://test.supabase.co",publishableKey:"sb_publishable_test"};' });
    }
    if (request.url().startsWith('https://test.supabase.co/rest/v1/bug_hunt_scores')) {
      if (request.method() === 'OPTIONS') return request.respond({ status:204, headers:cors });
      if (request.method() === 'POST') {
        if (rejectPosts) return request.respond({ status:503, headers:cors, contentType:'application/json', body:'{}' });
        scores.push(JSON.parse(request.postData()));
        return request.respond({ status:201, headers:cors, contentType:'application/json', body:'' });
      }
      const selectedMode = new URL(request.url()).searchParams.get('mode').slice(3);
      return request.respond({ status:200, headers:cors, contentType:'application/json', body:JSON.stringify(scores.filter(row => row.mode === selectedMode).sort((a,b) => b.score-a.score).slice(0,5)) });
    }
    request.continue();
  });
  await page.goto('http://localhost:8765/', { waitUntil:'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#leaderboard').textContent.includes('No scores yet'));
  await page.click('[data-mode=sprint]');
  await page.waitForFunction(() => document.querySelector('#leaderboard').textContent.includes('Visitor'));
  await page.click('[data-mode=classic]');
  await page.click('#startBtn');
  await page.click('#pauseBtn');
  await page.click('#quitBtn');
  await page.type('#playerName','Global Hero');
  await page.click('#saveScoreBtn');
  await page.waitForFunction(() => document.querySelector('#leaderboard').textContent.includes('Global Hero'));
  const result = await page.evaluate(() => ({ board:document.querySelector('#leaderboard').textContent, note:document.querySelector('#boardNote').textContent, hidden:document.querySelector('#scoreForm').hidden }));
  if (scores.length !== 2 || scores[1].mode !== 'classic' || scores[1].name !== 'Global Hero' || !result.hidden || !result.note.includes('Global leaderboard') || errors.length) throw Error(JSON.stringify({ scores, result, errors }));
  console.log('Mock global leaderboard: read, mode switching, submit, and refresh passed.', result);
  rejectPosts = true;
  await page.click('#restartBtn');
  await page.click('#pauseBtn');
  await page.click('#quitBtn');
  await page.type('#playerName','Retry Hero');
  await page.click('#saveScoreBtn');
  await page.waitForFunction(() => document.querySelector('#gameStatus').textContent.includes('Could not save'));
  const failure = await page.evaluate(() => ({ formVisible:!document.querySelector('#scoreForm').hidden, canRetry:!document.querySelector('#saveScoreBtn').disabled }));
  if (!failure.formVisible || !failure.canRetry || scores.length !== 2 || errors.length) throw Error(JSON.stringify({ failure, scores, errors }));
  console.log('Mock API failure: score not claimed saved and form remains retryable.');
} finally {
  await browser.close();
}