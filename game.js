/* Bug Hunt: standalone arcade controller. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('bugCanvas'), ctx = canvas.getContext('2d'), wrap = $('gameWrap');
  if (!ctx) return;
  const colors = { lime:'#c6ff00', pink:'#ff2fa0', orange:'#ff8a3d', cyan:'#00e5ff', yellow:'#f5ff3d', ink:'#101321' };
  const modes = { classic:{ duration:45, spawn:1.05, speed:1 }, sprint:{ duration:30, spawn:.68, speed:1.35 } };
  const types = { grunt:{ color:colors.lime, size:22, speed:51, hp:1, points:10 }, speeder:{ color:colors.pink, size:17, speed:88, hp:1, points:20 }, tank:{ color:colors.orange, size:30, speed:37, hp:2, points:35 }, boss:{ color:'#a271ff', size:40, speed:38, hp:4, points:120 } };
  const store = {
    read(key, fallback) { try { return JSON.parse(localStorage.getItem('bughunt_v2_' + key)) ?? fallback; } catch { return fallback; } },
    write(key, value) { try { localStorage.setItem('bughunt_v2_' + key, JSON.stringify(value)); } catch {} }
  };
  const badges = [
    { id:'first', icon:'✦', name:'FIRST BLOOD', hint:'Squash your first bug' },
    { id:'combo', icon:'⚡', name:'ON A ROLL', hint:'Reach a 5× combo' },
    { id:'hunter', icon:'◎', name:'BUG HUNTER', hint:'Squash 20 bugs in one run' },
    { id:'survivor', icon:'♥', name:'SHIP IT', hint:'Save the build' },
    { id:'boss', icon:'✹', name:'GLITCH SLAYER', hint:'Defeat a glitch boss' },
    { id:'daily', icon:'☀', name:'DAILY DEFENDER', hint:'Squash 30 bugs in one day' }
  ];
  let unlocked = store.read('badges', []);
  if (!Array.isArray(unlocked)) unlocked = [];
  let board = store.read('board', []);
  if (!Array.isArray(board)) board = [];
  board = board.filter(row => row && typeof row.name === 'string' && Number.isFinite(row.score) && ['classic','sprint'].includes(row.mode)).slice(0, 100);
  const config = window.BUG_HUNT_SUPABASE || {};
  const globalEnabled = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url || '') && /^sb_publishable_/.test(config.publishableKey || '');
  const apiUrl = globalEnabled ? config.url.replace(/\/$/, '') + '/rest/v1/bug_hunt_scores' : '';
  const globalBoard = { classic:[], sprint:[] };
  const boardState = { classic:'loading', sprint:'loading' };
  function apiRequest(query, options = {}) {
    return fetch(apiUrl + query, {
      ...options,
      headers:{ apikey:config.publishableKey, 'Content-Type':'application/json', ...options.headers }
    }).then(response => { if (!response.ok) throw new Error('Leaderboard request failed (' + response.status + ')'); return response; });
  }
  async function loadBoard(selectedMode) {
    if (!globalEnabled) return;
    boardState[selectedMode] = 'loading'; renderBoard();
    try {
      const response = await apiRequest('?select=name,score,mode&mode=eq.' + selectedMode + '&order=score.desc,created_at.asc&limit=5');
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Invalid leaderboard response');
      globalBoard[selectedMode] = rows.filter(row => typeof row.name === 'string' && Number.isSafeInteger(row.score) && row.mode === selectedMode);
      boardState[selectedMode] = 'ready';
    } catch (error) {
      console.warn('Bug Hunt leaderboard:', error);
      boardState[selectedMode] = 'error';
    }
    if (mode === selectedMode) renderBoard();
  }
  const today = () => { const date = new Date(); return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-'); };
  let daily = store.read('daily', {date:today(), kills:0});
  if (!daily || daily.date !== today() || !Number.isFinite(daily.kills) || daily.kills < 0) daily = {date:today(), kills:0};
  let mode = 'classic', state = 'idle', width = 0, height = 0, dpr = 1, bossWave = 0;
  let bugs = [], pickups = [], sparks = [], labels = [], stars = [];
  let score = 0, kills = 0, lives = 3, combo = 1, streak = 0, comboClock = 0, time = 45, elapsed = 0, spawnClock = 0, pickupClock = 9, shield = false, shake = 0, flash = 0, saved = false;
  let lastFrame = 0, audio = null, muted = false, dragging = false, lastZap = 0, lastHit = new Map();
  const best = () => Math.max(0, ...board.filter(row => row.mode === mode).map(row => row.score), Number(store.read('best_' + mode, 0)) || 0);
  const setText = (id, value) => { $(id).textContent = value; };
  const random = (a,b) => a + Math.random() * (b-a);
  const center = () => ({ x:width/2, y:height/2 + 18 });
  function resize() {
    const oldW = width, oldH = height;
    width = canvas.clientWidth; height = canvas.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if (oldW && oldH) {
      bugs.forEach(b => { b.x *= width/oldW; b.y *= height/oldH; });
      pickups.forEach(p => { p.x *= width/oldW; p.y *= height/oldH; });
    }
    stars = Array.from({length:55}, () => ({x:random(0,width),y:random(0,height),r:random(.6,2.1),phase:random(0,7)}));
  }
  window.addEventListener('resize', resize); resize();
  function sound(frequency=300, duration=.08, type='square') {
    if (muted) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const oscillator=audio.createOscillator(), gain=audio.createGain(), now=audio.currentTime;
      oscillator.type=type; oscillator.frequency.setValueAtTime(frequency,now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(60,frequency*.55),now+duration);
      gain.gain.setValueAtTime(.085,now); gain.gain.exponentialRampToValueAtTime(.001,now+duration);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(now); oscillator.stop(now+duration);
    } catch {}
  }
  function status(message) { setText('gameStatus', message); }
  function updateHud() {
    setText('hudScore', score.toLocaleString()); setText('hudTime', Math.ceil(Math.max(0,time)));
    setText('hudCombo', 'x'+combo); $('hudCombo').classList.toggle('combo-hot',combo>=3);
    setText('hudLives', '♥'.repeat(lives)+'♡'.repeat(3-lives));
    $('shieldChip').hidden = !shield;
    setText('waveLabel', 'WAVE '+String(Math.floor(elapsed/12)+1).padStart(2,'0'));
    setText('missionProgress', Math.min(kills,20)+' / 20 squashed');
    $('missionFill').style.width = Math.min(100,kills*5)+'%';
    $('missionText').textContent = kills>=20 ? 'Mission complete — you are a bug hunter!' : 'Squash 20 bugs in one run';
    if (daily.date !== today()) { daily = {date:today(), kills:0}; store.write('daily',daily); }
    setText('dailyProgress',Math.min(daily.kills,30)+' / 30 across all runs');
    $('dailyFill').style.width = Math.min(100,daily.kills/30*100)+'%';
    $('dailyProgress').closest('.daily-extra').classList.toggle('complete',daily.kills>=30);
  }
  function renderBoard() {
    const list=$('leaderboard'); list.replaceChildren();
    const rows=globalEnabled ? boardState[mode]==='ready' ? globalBoard[mode] : [] : board.filter(row=>row.mode===mode).sort((a,b)=>b.score-a.score).slice(0,5);
    if (!rows.length || (globalEnabled && boardState[mode] !== 'ready')) {
      const li=document.createElement('li'); li.className='empty-board';
      li.textContent=globalEnabled && boardState[mode]==='loading' ? 'Loading global scores…' : globalEnabled && boardState[mode]==='error' ? 'Leaderboard unavailable. Try switching modes to retry.' : 'No scores yet. Your name could be first!';
      list.append(li);
    }
    rows.forEach((row,i)=>{
      const li=document.createElement('li');
      const rank=document.createElement('span'), name=document.createElement('strong'), points=document.createElement('span');
      rank.textContent=String(i+1).padStart(2,'0'); name.textContent=row.name; points.textContent=row.score.toLocaleString();
      li.append(rank,name,points); list.append(li);
    });
    setText('bestStart','BEST '+mode.toUpperCase()+' SCORE: '+best().toLocaleString());
    setText('boardMode',mode==='classic'?'CLASSIC / 45S':'SPEED RUN / 30S');
    $('boardNote').textContent=globalEnabled ? 'Global leaderboard · top five scores per mode. Scores are public and player-submitted; please play fair!' : 'This is a device-only leaderboard, not a global ranking. Switch modes to see each board; share a challenge link with a friend!';
  }
  function renderBadges() {
    const list=$('badgeList'); list.replaceChildren();
    badges.forEach(b=>{
      const item=document.createElement('div'); item.className='badge'+(unlocked.includes(b.id)?' earned':'');
      item.title=b.hint; item.setAttribute('aria-label',b.name+': '+b.hint+(unlocked.includes(b.id)?' (unlocked)':' (locked)'));
      const icon=document.createElement('span'); icon.textContent=b.icon;
      const name=document.createElement('strong'); name.textContent=b.name;
      item.append(icon,name); list.append(item);
    });
  }
  function unlock(id) {
    if (unlocked.includes(id)) return;
    unlocked.push(id); store.write('badges',unlocked); renderBadges();
    const badge=badges.find(b=>b.id===id);
    pop(width/2,height/2-95,'BADGE: '+badge.name,colors.yellow); sound(740,.16,'sine');
  }
  function show(which) { ['startOverlay','pauseOverlay','overOverlay'].forEach(id=>$(id).classList.toggle('hidden',id!==which)); }
  function reset() {
    bugs=[]; pickups=[]; sparks=[]; labels=[]; lastHit.clear(); lastZap=0;
    score=0; kills=0; lives=3; combo=1; streak=0; comboClock=0; time=modes[mode].duration;
    elapsed=0; bossWave=0; spawnClock=.5; pickupClock=8; shield=false; shake=0; flash=0; saved=false;
    $('scoreForm').hidden=false; $('playerName').value=''; $('saveScoreBtn').disabled=false; status(''); updateHud();
  }
  function start() { reset(); state='playing'; show(null); sound(540,.15); canvas.focus({preventScroll:true}); }
  function pause() { if(state!=='playing') return; state='paused'; dragging=false; show('pauseOverlay'); }
  function resume() { if(state!=='paused') return; state='playing'; lastFrame=performance.now(); show(null); }
  function end(won) {
    if(state!=='playing' && state!=='paused') return;
    state='over'; dragging=false; time=Math.max(0,time); updateHud();
    if(won) unlock('survivor');
    if(score>best()) store.write('best_'+mode,score);
    setText('overTitle',won?'BUILD SAVED!':'BUILD CRASHED!');
    setText('finalScore',score.toLocaleString()); setText('finalKills',kills); setText('finalBest',best().toLocaleString());
    setText('overQuip',won?'You shipped it! Take your place in the hall of fame.':'The bugs got through. Patch it up and go again!');
    renderBoard(); show('overOverlay'); sound(won?750:180,.25,'triangle');
  }
  function spawnBug() {
    const wave=Math.floor(elapsed/12);
    const bossDue=wave>bossWave && wave>0;
    if(bossDue) bossWave=wave;
    const roll=Math.random(), kind=bossDue?'boss':roll<.57?'grunt':roll<.83?'speeder':'tank', config=types[kind];
    const side=Math.floor(random(0,4)), margin=35;
    const x=side===1?width+margin:side===3?-margin:random(20,width-20);
    const y=side===0?-margin:side===2?height+margin:random(95,height-25);
    bugs.push({x,y,kind,hp:config.hp,angle:0,wobble:random(0,7),id:Math.random(),speed:config.speed*modes[mode].speed*(1+elapsed/65)*random(.85,1.15)});
  }
  function spawnPickup() {
    const c=center(), roll=Math.random(), type=roll<.4?'time':roll<.75?'shield':'pulse';
    pickups.push({x:random(45,Math.max(46,width-45)),y:random(105,Math.max(106,height-45)),type,life:8,phase:random(0,7)});
    const p=pickups.at(-1);
    if(Math.hypot(p.x-c.x,p.y-c.y)<115) p.y=Math.min(height-45,p.y+130);
  }
  function burst(x,y,color,n=12) {
    for(let i=0;i<n;i++) { const a=random(0,Math.PI*2), speed=random(60,230);
      sparks.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:random(.35,.7),max:.7,color,r:random(2,5)}); }
  }
  function pop(x,y,text,color) { labels.push({x,y,text,color,life:1}); }
  function squash(x,y) {
    if(state!=='playing') return;
    for(let i=pickups.length-1;i>=0;i--) {
      const p=pickups[i]; if(Math.hypot(p.x-x,p.y-y)>30) continue;
      if(p.type==='time') { time=Math.min(modes[mode].duration+10,time+5); pop(p.x,p.y,'+5 SECONDS',colors.cyan); }
      else if(p.type==='shield') { shield=true; pop(p.x,p.y,'SHIELD UP!',colors.yellow); }
      else {
        const cleared=bugs.length;
        bugs.forEach(b=>burst(b.x,b.y,types[b.kind].color,5));
        bugs=[]; lastHit.clear(); score+=cleared*10;
        pop(p.x,p.y,'PULSE! +'+(cleared*10),colors.pink);
      }
      burst(p.x,p.y,p.type==='time'?colors.cyan:p.type==='pulse'?colors.pink:colors.yellow); pickups.splice(i,1); sound(850,.18,'sine'); updateHud(); return;
    }
    for(let i=bugs.length-1;i>=0;i--) {
      const b=bugs[i], cfg=types[b.kind];
      if(Math.hypot(b.x-x,b.y-y)>cfg.size+20 || performance.now()-(lastHit.get(b.id)||0)<150) continue;
      lastHit.set(b.id,performance.now()); b.hp--; sound(b.hp?160:420,.09);
      burst(b.x,b.y,b.hp?'#ffffff':cfg.color,b.hp?6:14);
      if(b.hp) { pop(b.x,b.y,'CRACK!',colors.orange); b.x+=(b.x-x)*.2; b.y+=(b.y-y)*.2; }
      else {
        bugs.splice(i,1); lastHit.delete(b.id); kills++;
        if(daily.date!==today()) daily={date:today(),kills:0};
        daily.kills++; store.write('daily',daily); if(daily.kills>=30) unlock('daily');
        if(b.kind==='boss') { unlock('boss'); time=Math.min(modes[mode].duration+10,time+3); pop(b.x,b.y-28,'BOSS DOWN! +3S',colors.yellow); }
        streak++; combo=Math.min(5,1+Math.floor(streak/3)); comboClock=2.3;
        const points=cfg.points*combo; score+=points;
        pop(b.x,b.y,['POW!','SPLAT!','ZAP!','+'+points][Math.floor(random(0,4))],cfg.color);
        unlock('first'); if(combo===5) unlock('combo'); if(kills>=20) unlock('hunter');
      }
      updateHud(); return;
    }
  }
  function update(dt) {
    elapsed+=dt; time-=dt; spawnClock-=dt; pickupClock-=dt; comboClock-=dt;
    if(comboClock<=0 && streak) { streak=0; combo=1; updateHud(); }
    if(spawnClock<=0) { spawnBug(); spawnClock=Math.max(.34,modes[mode].spawn-elapsed*.011)*random(.75,1.2); }
    if(pickupClock<=0) { if(pickups.length<2) spawnPickup(); pickupClock=random(9,13); }
    pickups.forEach(p=>p.life-=dt); pickups=pickups.filter(p=>p.life>0);
    const c=center(), radius=width<500?61:78;
    for(let i=bugs.length-1;i>=0;i--) {
      const b=bugs[i], dx=c.x-b.x,dy=c.y-b.y,dist=Math.hypot(dx,dy)||1;
      b.angle=Math.atan2(dy,dx); b.x+=dx/dist*b.speed*dt; b.y+=dy/dist*b.speed*dt;
      if(dist>radius+6) continue;
      bugs.splice(i,1); lastHit.delete(b.id); burst(b.x,b.y,colors.pink,18); shake=.32; flash=.28; streak=0; combo=1;
      if(shield) { shield=false; pop(c.x,c.y-70,'BLOCKED!',colors.yellow); sound(620,.2); }
      else { lives=Math.max(0,lives-1); pop(c.x,c.y-70,'-1 LIFE',colors.pink); sound(130,.25,'sawtooth'); if(navigator.vibrate) navigator.vibrate(45); }
      updateHud(); if(lives===0) { end(false); break; }
    }
    sparks.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=250*dt;p.life-=dt;}); sparks=sparks.filter(p=>p.life>0);
    labels.forEach(p=>{p.y-=42*dt;p.life-=dt;}); labels=labels.filter(p=>p.life>0);
    shake=Math.max(0,shake-dt); flash=Math.max(0,flash-dt);
    setText('hudTime',Math.ceil(Math.max(0,time)));
    setText('waveLabel','WAVE '+String(Math.floor(elapsed/12)+1).padStart(2,'0'));
    if(time<=0 && state==='playing') end(true);
  }
  function round(x,y,w,h,r) { ctx.beginPath();ctx.roundRect(x,y,w,h,r); }
  function draw(now) {
    ctx.clearRect(0,0,width,height);
    ctx.fillStyle='#121c2e'; ctx.fillRect(0,0,width,height);
    const glow=ctx.createRadialGradient(width/2,height/2,15,width/2,height/2,Math.max(width,height)*.65);
    glow.addColorStop(0,'#293e51');glow.addColorStop(1,'#111522');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    ctx.strokeStyle='rgba(194,232,250,.055)';ctx.lineWidth=1;
    for(let x=0;x<width;x+=42){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
    for(let y=0;y<height;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
    stars.forEach(s=>{ctx.globalAlpha=.18+.13*Math.sin(now*.001+s.phase);ctx.fillStyle='#eafaff';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();});ctx.globalAlpha=1;
    const c=center();ctx.save();
    if(shake>0) ctx.translate(random(-7,7)*shake*3,random(-7,7)*shake*3);
    ctx.strokeStyle=shield?colors.cyan:'rgba(198,255,0,.24)';ctx.lineWidth=shield?4:2;ctx.setLineDash([8,9]);
    ctx.beginPath();ctx.arc(c.x,c.y,width<500?70:91,0,7);ctx.stroke();ctx.setLineDash([]);
    if(shield){ctx.fillStyle='rgba(0,229,255,.08)';ctx.fill();}
    const cw=width<500?112:154,ch=width<500?76:98;
    ctx.fillStyle='#050910';ctx.strokeStyle='#e5f8ff';ctx.lineWidth=3;
    round(c.x-cw/2+6,c.y-ch/2+7,cw,ch,9);ctx.fill();
    round(c.x-cw/2,c.y-ch/2,cw,ch,9);ctx.fill();ctx.stroke();
    ctx.fillStyle=colors.pink;round(c.x-cw/2+6,c.y-ch/2+6,cw-12,18,3);ctx.fill();
    ctx.fillStyle='#fff';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(c.x-cw/2+16+i*11,c.y-ch/2+15,2.6,0,7);ctx.fill();}
    ctx.fillStyle=colors.lime;ctx.font='700 '+(width<500?10:12)+'px monospace';ctx.textAlign='left';
    ctx.fillText('> flutter run',c.x-cw/2+12,c.y-2);ctx.fillText(lives===3?'✓ build ready':lives===2?'! fixing bugs':'!! critical build',c.x-cw/2+12,c.y+19);
    ctx.fillStyle=colors.yellow;ctx.font='700 11px "Work Sans",sans-serif';ctx.textAlign='center';ctx.fillText('YOUR BUILD',c.x,c.y+ch/2+24);
    ctx.restore();
    pickups.forEach(p=>{
      const r=20+Math.sin(now*.005+p.phase)*3;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(now*.0015);
      ctx.shadowColor=p.type==='time'?colors.cyan:p.type==='pulse'?colors.pink:colors.yellow;ctx.shadowBlur=22;
      ctx.fillStyle=p.type==='time'?colors.cyan:p.type==='pulse'?colors.pink:colors.yellow;ctx.strokeStyle='#101321';ctx.lineWidth=3;
      ctx.beginPath();for(let j=0;j<8;j++){const a=j*Math.PI/4,rad=j%2?r*.76:r;ctx.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);}ctx.closePath();ctx.fill();ctx.stroke();
      ctx.shadowBlur=0;ctx.fillStyle='#101321';ctx.font='900 21px "Work Sans",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.type==='time'?'+':p.type==='pulse'?'✳':'◆',0,0);ctx.restore();
    });
    bugs.forEach(b=>{
      const cfg=types[b.kind],s=cfg.size;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);
      ctx.strokeStyle='#080e18';ctx.lineWidth=3.5;ctx.lineCap='round';
      for(let i=-1;i<=1;i++){let wiggle=Math.sin(now*.013+b.wobble+i)*5;
        for(const side of [-1,1]) {ctx.beginPath();ctx.moveTo(-s*.1,i*s*.37);ctx.lineTo(-s*.45,side*s*.75+wiggle);ctx.lineTo(-s*.7,side*s*.9+wiggle);ctx.stroke();}}
      ctx.fillStyle=cfg.color;ctx.shadowColor=cfg.color;ctx.shadowBlur=13;
      ctx.beginPath();ctx.ellipse(0,0,s*.77,s*.58,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
      ctx.beginPath();ctx.moveTo(-s*.7,0);ctx.lineTo(s*.5,0);ctx.stroke();
      ctx.beginPath();ctx.arc(s*.7,0,s*.43,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle='#fff';for(const eye of [-1,1]){ctx.beginPath();ctx.arc(s*.85,eye*s*.15,s*.13,0,7);ctx.fill();}
      ctx.fillStyle='#101321';for(const eye of [-1,1]){ctx.beginPath();ctx.arc(s*.9,eye*s*.15,s*.055,0,7);ctx.fill();}
      if(b.kind==='tank'||b.kind==='boss'){ctx.fillStyle='#fff';ctx.font='900 14px "Work Sans",sans-serif';ctx.textAlign='center';ctx.fillText(String(b.hp),-s*.2,5);}
      ctx.restore();
    });
    sparks.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();});ctx.globalAlpha=1;
    labels.forEach(p=>{ctx.save();ctx.globalAlpha=Math.min(1,p.life*2);ctx.textAlign='center';ctx.font='28px Bangers,cursive';ctx.lineWidth=5;ctx.strokeStyle='#101321';ctx.strokeText(p.text,p.x,p.y);ctx.fillStyle=p.color;ctx.fillText(p.text,p.x,p.y);ctx.restore();});
    if(flash>0){ctx.fillStyle='rgba(255,47,160,'+(flash*.5)+')';ctx.fillRect(0,0,width,height);}
  }
  function frame(now) { const dt=Math.min(.05,(now-(lastFrame||now))/1000);lastFrame=now;if(state==='playing')update(dt);draw(now);requestAnimationFrame(frame); }
  canvas.addEventListener('pointerdown',e=>{if(state!=='playing')return;dragging=true;canvas.setPointerCapture(e.pointerId);const r=canvas.getBoundingClientRect();squash(e.clientX-r.left,e.clientY-r.top);});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;const r=canvas.getBoundingClientRect();squash(e.clientX-r.left,e.clientY-r.top);});
  ['pointerup','pointercancel','lostpointercapture'].forEach(event=>canvas.addEventListener(event,()=>{dragging=false;}));
  window.addEventListener('keydown',e=>{
    if(e.target instanceof HTMLElement && /INPUT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
    if(e.code==='Space' && state==='playing' && document.activeElement===canvas){
      e.preventDefault();
      if(performance.now()-lastZap<180) return;
      lastZap=performance.now();
      const visible=bugs.filter(b=>b.x>0 && b.x<width && b.y>90 && b.y<height);
      const target=visible.reduce((nearest,b)=>!nearest || Math.hypot(b.x-center().x,b.y-center().y)<Math.hypot(nearest.x-center().x,nearest.y-center().y)?b:nearest,null);
      if(target) squash(target.x,target.y);
    }
    if(['p','P','Escape'].includes(e.key)){if(state==='playing'){e.preventDefault();pause();}else if(state==='paused'){e.preventDefault();resume();}}
    if(['m','M'].includes(e.key)) $('muteBtn').click();
  });
  $('startBtn').addEventListener('click',start);$('restartBtn').addEventListener('click',start);
  $('pauseBtn').addEventListener('click',()=>state==='playing'?pause():resume());
  $('resumeBtn').addEventListener('click',resume);$('quitBtn').addEventListener('click',()=>end(false));
  $('muteBtn').addEventListener('click',()=>{muted=!muted;$('muteBtn').textContent=muted?'🔇':'🔊';$('muteBtn').setAttribute('aria-label',muted?'Unmute sound':'Mute sound');});
  document.querySelectorAll('.mode-option').forEach(button=>button.addEventListener('click',()=>{
    mode=button.dataset.mode;document.querySelectorAll('.mode-option').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    time=modes[mode].duration;updateHud();renderBoard();loadBoard(mode);
  }));
  $('scoreForm').addEventListener('submit',async e=>{
    e.preventDefault();if(saved || state!=='over')return;
    const name=$('playerName').value.trim().replace(/\s+/g,' ').slice(0,16);
    if(!name){status('Enter a hero name first.');return;}
    const button=$('saveScoreBtn'); button.disabled=true;
    if (globalEnabled) {
      status('Submitting your score…');
      try {
        await apiRequest('', { method:'POST', body:JSON.stringify({name,score,mode}), headers:{Prefer:'return=minimal'} });
        saved=true; $('scoreForm').hidden=true;
        status('Score submitted! The board shows the top five for this mode.');
        await loadBoard(mode);
      } catch (error) {
        console.warn('Bug Hunt score submission:', error);
        status('Could not save your score. Check your connection and try again.');
        button.disabled=false;
      }
    } else {
      board.push({name,score,mode});board.sort((a,b)=>b.score-a.score);board=board.slice(0,50);
      store.write('board',board);saved=true;$('scoreForm').hidden=true;renderBoard();status('Score saved on this device! Find your name on the board below.');
    }
  });
  $('shareBtn').addEventListener('click',async()=>{
    const text='I scored '+score.toLocaleString()+' in Bug Hunt ('+mode+')! Think you can beat me? '+location.href.split('#')[0]+'#game';
    try {if(navigator.share)await navigator.share({title:'Bug Hunt',text});else if(navigator.clipboard){await navigator.clipboard.writeText(text);status('Challenge copied to clipboard!');}else status('Share this page and challenge a friend!');}
    catch(e){if(e.name!=='AbortError')status('Could not share this time.');}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden && state==='playing')pause();});
  renderBoard();loadBoard(mode);renderBadges();updateHud();requestAnimationFrame(frame);
})();
