// 집: 복층(1층·2층) 방, 도트 가구, 캐릭터, 꾸미기(이동·회전), 불, 상점, 밥, 채팅, 컴퓨터, 친구·선물
(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $('room');
  const ctx = canvas.getContext('2d');
  // 미니맵 모드: 같은 집 화면을 작은 창에 보여 주기만 하고, 누르면 큰 집 창을 엶
  const MINI = new URLSearchParams(location.search).get('mini') === '1';
  if (MINI) {
    document.body.classList.add('mini');
    $('miniBar').hidden = false;
    const block = (e) => { if (e.target.closest && e.target.closest('#miniBar')) return; e.stopImmediatePropagation(); e.preventDefault(); };
    for (const ev of ['mouseup', 'contextmenu', 'wheel', 'dblclick']) addEventListener(ev, block, { capture: true, passive: false });
    addEventListener('mousedown', (e) => { if (e.target.closest && e.target.closest('#miniBar')) return; block(e); buddy.send('open-home'); }, true);
    $('miniOpen').onclick = () => buddy.send('open-home');
    $('miniClose').onclick = () => buddy.send('widget-close');
  }
  const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif';
  const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const PET_H = 56;            // 집 안 캐릭터 키
  const MEET_H = 64;           // 🏢 회의장 캐릭터 키 (8번 인형 자리는 이것보다 작게)
  const SPEED = 170;           // 걷는 속도 (px/s)
  const CLIMB = 140;           // 사다리 속도
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // 방 구조 (서버 catalog.room 으로 덮어씀)
  let RW = 600, RH = 600;
  let FLOORS = { 2: { top: 0, wall: 200, bottom: 292 }, 1: { top: 300, wall: 500, bottom: 600 } };
  let LADDER_X = 556;
  const floorOf = (y) => (y < (FLOORS[2].bottom + FLOORS[1].top) / 2 ? 2 : 1);
  const band = (f) => ({ min: FLOORS[f].wall + 16, max: FLOORS[f].bottom - 6 });
  const ladderY = (f) => FLOORS[f].bottom - 22;

  let S = null, catalog = null;
  let layout = [];
  let decorating = false, selected = null, mouse = null;
  // 꾸미기 격자 (방 좌표 4 = 가구 그림 한 칸). 0 이면 격자 없음
  let gridStep = 4;
  try { const g = Number(localStorage.getItem('decoGrid')); if ([0, 1, 2, 4].includes(g) && localStorage.getItem('decoGrid') !== null) gridStep = g; } catch {}
  const snap = (v) => (gridStep ? Math.round(v / gridStep) * gridStep : Math.round(v));
  const pets = new Map();
  let foodDrop = null;
  let K = 1;
  let giftOpen = null;   // 선물 입력을 연 친구 아이디

  // ------------------------------------------------------------ 또렷하게 크기 맞추기
  function fit() {
    // 집이 넓어지면(증축) 가로로 길어져요: 칸 안에 꼭 맞게 비율 유지
    const box = $('stage').getBoundingClientRect();
    const s = Math.max(200 / RH, Math.min(box.width / RW, box.height / RH));
    const cw = Math.floor(RW * s), ch = Math.floor(RH * s);
    const dpr = devicePixelRatio || 1;
    const pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    K = pw / RW;
  }
  // 보고 있는 집의 증축 단계에 맞춰 넓이 바꾸기
  function applyRoomSize() {
    const v = viewing();
    const steps = catalog?.room?.expand;
    const lv = Math.max(0, Math.min((steps?.length || 1) - 1, v?.home?.level || 0));
    const w = meetingMode() ? MeetScene.W : steps ? steps[lv].w : (catalog?.room?.w || 600);
    if (w !== RW) { RW = w; LADDER_X = RW - 44; fit(); }
  }
  new ResizeObserver(fit).observe($('stage'));
  function toRoom(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (RW / r.width), y: (e.clientY - r.top) * (RH / r.height) };
  }

  // 🏢 운영자 회의장에 있는지 (집 대신 회의실, 채팅만)
  const meetingMode = () => !!(S && S.room && S.room.meeting && window.MeetScene);
  // ------------------------------------------------------------ 지금 보는 집
  const viewing = () => {
    if (!S || !S.session) return null;
    if (S.room && !S.room.isOwner) return { home: S.room.home, owner: S.room.owner, editable: false };
    return { home: S.session.user.home, owner: { nickname: S.session.user.nickname, username: S.session.user.username }, editable: true };
  };
  function syncLayout() {
    if (mouse && mouse.kind === 'item') return;
    applyRoomSize();
    const v = viewing();
    const selIdx = selected ? layout.indexOf(selected) : -1;
    layout = v ? v.home.items.map((it) => ({ rot: 0, ...it })) : [];
    selected = selIdx >= 0 && layout[selIdx] ? layout[selIdx] : null;
    renderSel();
  }
  const findItem = (id) => layout.find((it) => it.item === id);
  // 침대 종류(침대 · 하늘색 · 공주 · 이층) 아무거나
  const findBed = () => layout.find((it) => catalog && catalog.items[it.item] && catalog.items[it.item].bed);
  const itemScale = (id) => (catalog && catalog.items[id] && catalog.items[id].scale) || 4;

  // ------------------------------------------------------------ 캐릭터
  class HomePet {
    constructor(id, profile) {
      this.id = id; this.isMe = id === 'me';
      this.setProfile(profile);
      const f = Math.random() < 0.5 ? 1 : 2;
      this.x = rand(80, LADDER_X - 60); this.y = rand(band(f).min, band(f).max);
      this.path = []; this.state = 'idle'; this.t = rand(1, 3); this.dir = 1; this.anim = 0;
      this.bubble = null; this.emotes = []; this.happyT = 0; this.onArrive = null; this.dragging = false;
    }
    setProfile(p) {
      const changed = this.profile && this.profile.pose !== p.pose;
      this.profile = p; this.pal = Sprites.palette(p.color);
      if (changed && this.state !== 'walk' && this.state !== 'climb') this.t = 0;   // 자세를 바꾸면 바로
    }
    get floor() { return floorOf(this.y); }
    // 목적지까지 길 만들기: 다른 층이면 사다리를 거쳐 감
    goTo(x, y, cb) {
      const tf = floorOf(y);
      const tb = band(tf);
      const tx = clamp(x, 24, RW - 24), ty = clamp(y, tb.min, tb.max);
      this.path = [];
      if (tf !== this.floor) {
        this.path.push({ x: LADDER_X, y: ladderY(this.floor) });
        this.path.push({ x: LADDER_X, y: ladderY(tf), climb: true });
      }
      this.path.push({ x: tx, y: ty });
      this.state = 'walk'; this.inBed = false; this.onArrive = cb || null;
    }
    emote(icon) { this.emotes.push({ icon, t: 1.8 }); if (this.emotes.length > 4) this.emotes.shift(); }
    say(text) { this.bubble = { text, t: Math.min(12, 4 + text.length * 0.12) }; }
    update(dt) {
      this.anim += dt;
      this.happyT = Math.max(0, this.happyT - dt);
      this.hopT = Math.max(0, (this.hopT || 0) - dt);
      if (this.bubble && (this.bubble.t -= dt) <= 0) this.bubble = null;
      this.emotes = this.emotes.filter((e) => (e.t -= dt) > 0);
      if (this.dragging) return;
      // 친구 캐릭터: 내가 AI로 움직이지 않고, 그 사람 화면에서 보낸 자리를 그대로 따라감 (모두의 화면에서 같은 위치)
      if (!this.isMe) {
        if (this.target) {
          const dx = this.target.x - this.x, dy = this.target.y - this.y;
          const d = Math.hypot(dx, dy);
          if (d > 2) { this.x += dx * Math.min(1, dt * 8); this.y += dy * Math.min(1, dt * 8); }
          else { this.x = this.target.x; this.y = this.target.y; }
          if (typeof this.target.dir === 'number') this.dir = this.target.dir;
          const nextState = this.target.state || 'idle';
          if (nextState !== this.state) { this.state = nextState; this.inBed = !!this.target.inBed; }
        }
        return;
      }
      if (this.state === 'walk' || this.state === 'climb') {
        const wp = this.path[0];
        if (!wp) { this.arrive(); return; }
        this.state = wp.climb ? 'climb' : 'walk';
        const dx = wp.x - this.x, dy = wp.y - this.y;
        const d = Math.hypot(dx, dy);
        const sp = (wp.climb ? CLIMB : SPEED) * dt;
        if (d <= sp) { this.x = wp.x; this.y = wp.y; this.path.shift(); if (!this.path.length) this.arrive(); }
        else {
          this.x += (dx / d) * sp; this.y += (dy / d) * sp;
          if (!wp.climb && Math.abs(dx) > 1) this.dir = dx > 0 ? 1 : -1;
        }
        return;
      }
      if (this.state === 'desk') return;
      if ((this.t -= dt) <= 0) {
        const r = Math.random();
        const bed = findBed();
        // 우클릭 → 자세에서 고른 자세로 가만히 있기 (눕기는 침대가 있으면 침대로 가서)
        const pose = this.profile.pose;
        if (pose === 'stand' || pose === 'sit') { this.state = pose === 'sit' ? 'sit' : 'idle'; this.inBed = false; this.t = 3; return; }
        if (pose === 'lie') {
          if (this.state === 'sleep') { this.t = 3; return; }
          if (bed) this.goTo(bed.x, bed.y - 16, () => { this.state = 'sleep'; this.inBed = true; this.t = 3; });
          else { this.state = 'sleep'; this.inBed = false; this.t = 3; }
          return;
        }
        if (r < 0.1 && bed) this.goTo(bed.x, bed.y - 16, () => { this.state = 'sleep'; this.inBed = true; this.t = rand(8, 16); });
        else if (r < 0.62) {
          const f = Math.random() < 0.7 ? this.floor : (this.floor === 1 ? 2 : 1); // 가끔 다른 층으로
          this.goTo(rand(40, RW - 70), rand(band(f).min, band(f).max));
        } else if (r < 0.85) { this.state = 'sit'; this.t = rand(3, 8); }
        else { this.state = 'idle'; this.t = rand(2, 5); }
      }
    }
    arrive() {
      this.state = 'idle'; this.t = rand(2, 5);
      const cb = this.onArrive; this.onArrive = null;
      if (cb) cb();
    }
    sortY() {
      if (this.state === 'sleep' && this.inBed) { const bed = findBed(); if (bed) return bed.y + 1; }
      if (this.state === 'climb') return 10000; // 사다리 탈 때는 맨 앞
      return this.y;
    }
    hit(p) { const hw = (this.dw || 44) / 2 + 4; return Math.abs(p.x - this.x) < hw && p.y < this.y + 6 && p.y > this.y - PET_H - 4; }
    legs() {
      if (this.dragging) return 'air';
      if (this.state === 'climb') return Math.floor(this.anim / 0.18) % 2 ? 'walkB' : 'walkA';
      if (this.state === 'walk') return Math.floor(this.anim / 0.16) % 2 ? 'walkB' : 'walkA';
      if (['sit', 'desk', 'eat', 'sleep'].includes(this.state)) return 'sit';
      return 'stand';
    }
    draw() {
      const legs = this.legs();
      // 콕 찌르면 폴짝 (hopT 동안 위로 뛰었다 내려옴)
      const jump = this.hopT > 0 ? -Math.sin((1 - this.hopT / 0.45) * Math.PI) * 18 : 0;
      const bob = (legs === 'walkB' ? -2 : 0) + jump;
      if (this.state !== 'climb') {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(this.x, this.y - 1, 17, 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      const skin = Skins.get(this.profile.username, this.profile.skin);
      this.dw = 0;
      if (skin) {
        const pose = this.dragging ? 'fall' : this.state === 'sleep' ? 'lie'
          : legs === 'sit' ? 'sit' : legs.startsWith('walk') ? 'walk' : 'stand';
        const tilt = pose === 'walk' ? (legs === 'walkB' ? 0.07 : -0.07)
          : pose === 'fall' ? Math.sin(this.anim * 12) * (Skins.has(skin, 'fall') ? 0.06 : 0.12) : 0;
        this.dw = Skins.draw(ctx, skin, pose, this.x, this.y + bob, PET_H, this.state === 'climb' ? (legs === 'walkB' ? 1 : -1) : this.dir, tilt);
      }
      if (!this.dw) {
        const sleepy = this.state === 'sleep';
        const eyes = this.happyT > 0 || this.state === 'eat' || this.dragging ? 'happy' : sleepy ? 'closed' : (Math.floor(this.anim * 10) % 37 === 0 ? 'closed' : 'open');
        const s = Math.round(PET_H / 16 * 2) / 2;
        Sprites.drawPet(ctx, Math.round(this.x - 8 * s), Math.round(this.y - 16 * s + bob), {
          species: this.profile.species, acc: this.profile.acc, scale: s, palette: this.pal, legs, eyes,
          flip: this.state === 'climb' ? legs === 'walkB' : this.dir > 0, tailFrame: legs === 'walkB' ? 1 : 0,
        });
      }
      if (this.state === 'sleep') {
        const k = (this.anim % 2) / 2;
        ctx.font = `bold ${Math.round(12 + k * 6)}px ${FONT}`;
        ctx.fillStyle = `rgba(90,110,200,${1 - k})`; ctx.textAlign = 'left';
        ctx.fillText('z', this.x + 20 + k * 10, this.y - PET_H - k * 16);
      }
    }
    // 🏢 회의장: 정해진 자리에 앉아서 가만히 (걷기 · 눕기 없이 앉기 그림만)
    drawSeated(seat) {
      const h = Math.round(MEET_H * seat.scale);
      const skin = Skins.get(this.profile.username, this.profile.skin);
      this.dw = skin ? Skins.draw(ctx, skin, 'sit', seat.cx, seat.bottom, h, seat.dir, 0) : 0;
      if (!this.dw) {
        const s = Math.max(1, Math.round((h / 16) * 2) / 2);
        const blink = Math.floor(this.anim * 10) % 37 === 0;
        Sprites.drawPet(ctx, Math.round(seat.cx - 8 * s), Math.round(seat.bottom - 16 * s), {
          species: this.profile.species, acc: this.profile.acc, scale: s, palette: this.pal, legs: 'sit',
          eyes: this.happyT > 0 ? 'happy' : blink ? 'closed' : 'open', flip: seat.dir > 0,
        });
      }
    }
    drawSeatLabels(seat) {
      const h = Math.round(MEET_H * seat.scale);
      const top = pill(this.profile.nickname, '', seat.cx, seat.bottom - h - 6, this.isMe, this.profile) - 4;
      if (this.bubble) bubble(this.bubble.text, seat.cx, top);
    }
    drawLabels() {
      const crown = showCrown(this.profile.username) ? '👑 ' : '';
      // 0.17: 아이디는 이름표에서 빼고(이름을 누르면 프로필에 있어요), 상태는 닉네임 위 작은 줄로
      const top = pill(crown + this.profile.nickname, this.profile.status || '', this.x, this.y - PET_H - 6, this.isMe, this.profile) - 4;
      if (this.bubble) bubble(this.bubble.text, this.x, top);
      this.emotes.forEach((e, i) => {
        ctx.globalAlpha = Math.min(1, e.t * 2);
        const ex = this.x + 24 + i * 6, ey = this.y - PET_H - 4 - (1.8 - e.t) * 26;
        if (window.EmoteArt && EmoteArt.has(e.icon)) EmoteArt.draw(ctx, e.icon, this.x, top - 2 - (1.8 - e.t) * 14, 48);   // 그림 이모티콘은 이름표 위 가운데에 크게
        else { ctx.font = `24px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.fillText(e.icon, ex, ey); }
        ctx.globalAlpha = 1;
      });
    }
  }

  function syncPets() {
    if (!S) return;
    const want = new Map();
    if (S.session) want.set('me', S.self);
    if (S.room) for (const p of S.peers) want.set(p.id, p);
    for (const id of [...pets.keys()]) if (!want.has(id)) pets.delete(id);
    for (const [id, prof] of want) {
      if (!pets.has(id)) pets.set(id, new HomePet(id, prof));
      else pets.get(id).setProfile(prof);
    }
  }

  // ------------------------------------------------------------ 그리기 도우미
  // 집 주인 왕관: 혼자 있을 땐 안 보이고, 방에 다른 사람이 있을 때만 주인 이름 앞에 보임
  function showCrown(username) {
    if (!S || !S.room || !username) return false;
    const ownerName = S.room.isOwner ? (S.session?.user.username) : S.room.owner.username;
    if (username !== ownerName) return false;
    return S.room.isOwner ? (S.peers || []).length > 0 : true;   // 놀러 온 사람 입장에선 항상 주인이 있으니 보임
  }
  // 이름표: (상태 — 작게) 위 줄 + 닉네임 아래 줄 (0.17: 예전엔 '닉네임 · 상태' 한 줄 + @아이디)
  function pill(name, status, cx, bottom, mine, profile) {
    ctx.font = `600 11px ${FONT}`;
    let w = ctx.measureText(name).width;
    if (status) { ctx.font = `10px ${FONT}`; w = Math.max(w, ctx.measureText(status).width); }
    w = Math.min(160, w) + 14;
    const h = status ? 29 : 18;
    const x = Math.round(clamp(cx - w / 2, 2, RW - w - 2)), y = Math.round(bottom - h);
    ctx.fillStyle = mine ? 'rgba(30,30,40,0.72)' : 'rgba(40,60,110,0.82)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 9); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (status) { ctx.font = `10px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.fillText(status, x + w / 2, y + 9, w - 10); }
    ctx.font = `600 11px ${FONT}`;
    NickFX.drawNameLine(ctx, name, '', x + w / 2, y + (status ? 20 : h / 2 + 0.5), w - 10, profile, performance.now() / 1000);
    ctx.textBaseline = 'alphabetic';
    return y;
  }
  function bubble(text, cx, bottom) {
    ctx.font = `13px ${FONT}`;
    const lines = [];
    let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > 170 && line) { lines.push(line); line = ch; if (lines.length === 3) break; } else line += ch;
    }
    if (lines.length < 3 && line) lines.push(line);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20, h = lines.length * 17 + 12;
    const x = Math.round(clamp(cx - w / 2, 4, RW - w - 4)), y = Math.round(Math.max(4, bottom - h - 7));
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 5, y + h - 1); ctx.lineTo(cx, y + h + 6); ctx.lineTo(cx + 5, y + h - 1); ctx.fill();
    ctx.fillStyle = '#222'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x + 10, y + 7 + i * 17));
    ctx.textBaseline = 'alphabetic';
  }

  function drawHouse() {
    const v = viewing();
    const home = v ? v.home : {};
    for (const [f, seed] of [[2, 7], [1, 3]]) {
      const base = home['wall' + f] || 'basic', F = FLOORS[f];
      Furniture.drawFloorArea(ctx, base, 0, F.top, RW, F.wall, F.bottom, seed);
      for (const z of zonesOf(f, home)) {   // 🎨 가벽으로 나눈 방마다 다른 벽지 · 바닥
        if (z.theme === base) continue;
        ctx.save(); ctx.beginPath(); ctx.rect(z.l, F.top, z.r - z.l, F.bottom - F.top); ctx.clip();
        Furniture.drawFloorArea(ctx, z.theme, 0, F.top, RW, F.wall, F.bottom, seed);
        ctx.restore();
      }
    }
    // 층 사이 바닥판
    const slabTop = FLOORS[2].bottom, slabH = FLOORS[1].top - FLOORS[2].bottom;
    ctx.fillStyle = '#5c3a26'; ctx.fillRect(0, slabTop, RW, slabH);
    ctx.fillStyle = '#7a4b28'; ctx.fillRect(0, slabTop, RW, 2);
    // 사다리 (2층 바닥 ~ 1층 바닥)
    const x = LADDER_X, top = ladderY(2) - 4, bot = ladderY(1) + 14;
    // 2층 바닥의 구멍(해치): 바닥판까지 이어진 구멍 + 테두리
    const holeB = FLOORS[1].top;
    ctx.fillStyle = '#2a1d18'; ctx.fillRect(x - 20, top - 2, 40, holeB - top + 2);
    ctx.fillStyle = '#1c130f'; ctx.fillRect(x - 20, top - 2, 40, 5);                   // 안쪽 그림자
    ctx.fillStyle = '#7a4b28'; ctx.fillRect(x - 22, top - 4, 44, 2); ctx.fillRect(x - 22, top - 4, 2, slabTop - top + 4); ctx.fillRect(x + 20, top - 4, 2, slabTop - top + 4);
    // 사다리: 구멍 안쪽은 그늘져서 어둡게
    const rail = (y0, y1, c, d) => {
      ctx.fillStyle = c;
      ctx.fillRect(x - 16, y0, 5, y1 - y0); ctx.fillRect(x + 11, y0, 5, y1 - y0);
      for (let y = top + 10; y < bot - 4; y += 16) if (y >= y0 && y < y1) ctx.fillRect(x - 11, y, 22, 4);
      ctx.fillStyle = d; ctx.fillRect(x - 12, y0, 1, y1 - y0); ctx.fillRect(x + 15, y0, 1, y1 - y0);
    };
    rail(top, holeB, '#7d5232', '#5a3920');
    rail(holeB, bot, '#a8703f', '#7a4b28');
  }

  // 러그처럼 바닥에 까는 것: 맨 먼저 그리고 그림자 없음
  const isFlat = (id) => /^rug|Rug$/.test(id);
  // 🧱 가벽(divider): 그 층 천장~바닥 앞까지 꽉 차게, 캐릭터보다 앞에 그려서 지나가면 뒤로 가려짐 · 빛은 못 넘어감
  // 🪩 천장 가구(ceiling, 미러볼): 그 층 천장에 매달림 (y 는 몇 층인지만 정함)
  const defOf = (id) => (catalog && catalog.items[id]) || {};
  const isDivider = (id) => !!defOf(id).divider;
  const isCeiling = (id) => !!defOf(id).ceiling;
  const isStructure = (id) => isDivider(id) || isCeiling(id);
  // x 가 들어 있는 '방' = 같은 층 양옆 가벽 사이
  function sectionOf(x, f) {
    let l = 0, r = RW;
    for (const it of layout) {
      if (!isDivider(it.item) || floorOf(it.y) !== f) continue;
      const hw = Furniture.partWidth(it.item, itemScale(it.item)) / 2;
      if (it.x <= x) l = Math.max(l, it.x + hw); else r = Math.min(r, it.x - hw);
    }
    return { l, r: Math.max(l + 1, r) };
  }
  // 🎨 방마다 벽지: 가벽마다 '오른쪽 방 벽지(wall)'를 가지고 있어요. 맨 왼쪽 방은 그 층 벽지.
  // 가벽에 벽지가 없으면 왼쪽 방 벽지를 그대로 이어 써요. 경계는 가벽 한가운데 (가벽이 이음매를 덮음)
  const floorDividers = (f) => layout.filter((it) => isDivider(it.item) && floorOf(it.y) === f).sort((a, b) => a.x - b.x);
  function zonesOf(f, home) {
    let theme = (home && home['wall' + f]) || 'basic', l = 0;
    const out = [];
    for (const d of floorDividers(f)) { out.push({ l, r: d.x, theme }); l = d.x; theme = d.wall || theme; }
    out.push({ l, r: RW, theme });
    return out;
  }
  const themeAt = (x, f, home) => (zonesOf(f, home).find((z) => x >= z.l && x < z.r) || { theme: 'basic' }).theme;
  // 가구 크기 · 회전 중심
  function geom(it) {
    if (isDivider(it.item)) {
      const fl = FLOORS[floorOf(it.y)], w = Furniture.partWidth(it.item, itemScale(it.item)), h = fl.bottom - fl.top;
      return { cx: it.x, cy: fl.top + h / 2, w, h, r: h / 2 };
    }
    if (isCeiling(it.item)) {
      const b = Furniture.ballGeom(it.x, FLOORS[floorOf(it.y)].top, itemScale(it.item));
      return { cx: it.x, cy: b.top + b.h / 2, w: b.w, h: b.h, r: b.h / 2 };
    }
    const sz = Furniture.size(it.item, itemScale(it.item));
    return { cx: it.x, cy: it.y - sz.h / 2, w: sz.w, h: sz.h, r: Math.max(sz.w, sz.h) / 2 };
  }
  function drawItem(it) {
    const g = geom(it);
    const def = catalog.items[it.item] || {};
    if (!def.wall && !isFlat(it.item)) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(Math.round(it.x - g.w * 0.42), Math.round(it.y - 3), Math.round(g.w * 0.84), 4);
    }
    Furniture.draw(ctx, it.item, it.x, it.y, itemScale(it.item), it.rot || 0, !!it.flip);
    if (window.HomeGame) HomeGame.afterItem(ctx, it, g);   // 어항 속 물고기
    if (decorating && it === selected) {
      ctx.strokeStyle = 'rgba(232,137,74,0.95)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2;
      ctx.strokeRect(g.cx - g.w / 2 - 4, g.cy - g.h / 2 - 4, g.w + 8, g.h + 8); ctx.setLineDash([]);
    }
  }

  // 불 끄기: 실내 테마 층만 어둡게, 빛나는 가구와 창문 주변은 밝게
  const darkCanvas = document.createElement('canvas');
  // 층마다 따로 (light1 · light2), 예전 집은 light 하나로
  const lightOn = (home, f) => (home['light' + f] !== undefined ? home['light' + f] !== false : home.light !== false);
  const darkTheme = (id) => { const t = Furniture.THEMES[id] || Furniture.THEMES.basic; return (t.kind === 'room' || t.kind === 'event') && !t.outdoor; };
  // 그 자리(방)가 불을 끄면 어두워지는지 (방마다 벽지가 다를 수 있어서 자리로 봐요)
  function darkAt(v, x, f) { return !!v && !lightOn(v.home, f) && darkTheme(themeAt(x, f, v.home)); }
  // 빛은 그 가구가 있는 방(가벽 사이) 안에서만
  function clipToRoom(g, x, f) {
    const sec = sectionOf(x, f), fl = FLOORS[f];
    g.beginPath(); g.rect(sec.l, fl.top, sec.r - sec.l, (f === 2 ? FLOORS[1].top : fl.bottom) - fl.top); g.clip();
  }
  function drawDarkness() {
    const v = viewing();
    if (!v || ![1, 2].some((f) => !lightOn(v.home, f))) return;
    const dc = darkCanvas;
    if (dc.width !== RW) { dc.width = RW; dc.height = RH; }
    // 실내 벽지(room)와 이벤트 벽지(event)는 불을 끄면 어두워져요.
    // 초원 · 옥상, 그리고 바깥 풍경인 이벤트 벽지(outdoor: 설경 · 불꽃놀이)는 그대로.
    const zones = { 1: zonesOf(1, v.home), 2: zonesOf(2, v.home) };
    const darkZone = (f, z) => !lightOn(v.home, f) && darkTheme(z.theme);
    if (![1, 2].some((f) => zones[f].some((z) => darkZone(f, z)))) return;
    const darkFloor = (f, x) => darkAt(v, x, f);
    const g = dc.getContext('2d');
    g.clearRect(0, 0, RW, RH);
    g.globalCompositeOperation = 'source-over';
    for (const f of [1, 2]) for (const z of zones[f]) {
      if (!darkZone(f, z)) continue;
      g.fillStyle = 'rgba(10,12,32,0.62)';
      // 2층은 아래 바닥판(층 사이)까지 같이 어둡게: 사이에 밝은 줄이 안 생기게
      g.fillRect(z.l, FLOORS[f].top, z.r - z.l, (f === 2 ? FLOORS[1].top : FLOORS[f].bottom) - FLOORS[f].top);
    }
    g.globalCompositeOperation = 'destination-out';
    for (const it of layout) {
      if (!darkFloor(floorOf(it.y), it.x)) continue;
      const glow = Furniture.GLOW[it.item];
      const isWindow = /window/i.test(it.item);
      if (!glow && !isWindow) continue;
      const gm = geom(it);
      const sc = itemScale(it.item);
      const cx = gm.cx - gm.w / 2 + (glow ? glow[0] : 0.5) * gm.w;
      const cy = gm.cy - gm.h / 2 + (glow ? glow[1] : 0.5) * gm.h;
      const r = glow ? glow[2] * sc : 26 * sc;
      const grad = g.createRadialGradient(cx, cy, 4, cx, cy, r);
      grad.addColorStop(0, isWindow ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.95)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.save(); clipToRoom(g, it.x, floorOf(it.y));   // 🧱 가벽 너머로는 빛이 안 감
      g.fillStyle = grad;
      g.fillRect(cx - r, cy - r, r * 2, r * 2);
      g.restore();
    }
    // ✨ 이벤트 가구는 스스로 은은하게 빛나요: 가구 모양만큼 어둠을 걷어 내고 + 둘레에 시즌 색 빛무리
    const glowing = layout.filter((it) => isEventItem(it.item) && darkFloor(floorOf(it.y), it.x));
    for (const it of glowing) {
      const gm = geom(it), r = Math.max(gm.w, gm.h) * 0.75 + 6;
      g.save(); clipToRoom(g, it.x, floorOf(it.y));
      g.globalCompositeOperation = 'destination-out';
      const halo = g.createRadialGradient(gm.cx, gm.cy, 2, gm.cx, gm.cy, r);
      halo.addColorStop(0, 'rgba(0,0,0,0.5)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = halo; g.fillRect(gm.cx - r, gm.cy - r, r * 2, r * 2);
      g.globalAlpha = 0.8;   // 가구 자체는 거의 다 보이게
      Furniture.draw(g, it.item, it.x, it.y, itemScale(it.item), it.rot || 0, !!it.flip);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      const tint = g.createRadialGradient(gm.cx, gm.cy, 2, gm.cx, gm.cy, r);
      tint.addColorStop(0, EVENT_GLOW[eventOf(it.item)] || EVENT_GLOW.other); tint.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = tint; g.fillRect(gm.cx - r, gm.cy - r, r * 2, r * 2);
      g.restore();
    }
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(dc, 0, 0, RW, RH);
  }
  // 🧱 가벽 · 🪩 미러볼 그리기 (가벽은 캐릭터 · 가구보다 앞에)
  const selBox = (it) => {
    if (!(decorating && it === selected)) return;
    const g = geom(it);
    ctx.strokeStyle = 'rgba(232,137,74,0.95)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2;
    ctx.strokeRect(g.cx - g.w / 2 - 4, g.cy - g.h / 2 - 4, g.w + 8, g.h + 8); ctx.setLineDash([]);
  };
  function drawStructures() {
    for (const it of layout) {
      if (!isDivider(it.item)) continue;
      const fl = FLOORS[floorOf(it.y)];
      Furniture.drawPartition(ctx, it.item, it.x, fl.top, fl.bottom, itemScale(it.item));
      selBox(it);
    }
    drawBalls(false);
  }
  // 미러볼: 레코드에서 노래가 나오면 돌면서 그 방 전체(가벽 사이, 가벽이 없으면 그 층 전체)를 은은하게 반짝반짝
  const specks = Furniture.makeSpecks(120, 7);
  const musicOn = () => { try { return !!(window.Music && window.Music.playing && window.Music.playing()); } catch { return false; } };
  function drawBalls(after) {
    const v = viewing();
    if (!v) return;
    const t = performance.now() / 1000, spin = musicOn();
    for (const it of layout) {
      if (!isCeiling(it.item)) continue;
      const f = floorOf(it.y), fl = FLOORS[f], sc = itemScale(it.item), dark = darkAt(v, it.x, f);
      if (!after) { Furniture.drawMirrorBall(ctx, it.x, fl.top, t, spin, sc); selBox(it); continue; }
      if (!spin) continue;
      const sec = sectionOf(it.x, f), W = sec.r - sec.l, x0 = sec.l;
      const n = Math.round(clamp(W / 12, 16, specks.length));   // 넓이에 맞춰 개수도 (너무 빽빽하지 않게)
      ctx.save(); clipToRoom(ctx, it.x, f);
      // 🪩 미러볼 빛은 다른 가구와 다르게 알록달록: 라벤더 · 분홍 · 하늘색이 천천히 돌아가며 은은하게 (불 끄면 더 또렷)
      {
        const b = Furniture.ballGeom(it.x, fl.top, sc), R = b.R * (dark ? 3.4 : 2.6), k = dark ? 1 : 0.45;
        const COLS = [[190, 150, 255], [255, 150, 220], [140, 200, 255]];
        COLS.forEach((c, i) => {
          const ang = t * 0.5 + i * 2.094, ox = Math.cos(ang) * b.R * 0.6, oy = Math.sin(ang) * b.R * 0.35;
          const gl = ctx.createRadialGradient(b.cx + ox, b.cy + oy, 2, b.cx + ox, b.cy + oy, R);
          gl.addColorStop(0, `rgba(${c},${0.28 * k})`); gl.addColorStop(0.5, `rgba(${c},${0.1 * k})`); gl.addColorStop(1, `rgba(${c},0)`);
          ctx.fillStyle = gl; ctx.fillRect(b.cx + ox - R, b.cy + oy - R, R * 2, R * 2);
        });
      }
      Furniture.drawSpecks(ctx, specks.slice(0, n), { x0, x1: x0 + W, top: fl.top, bottom: fl.bottom }, t, dark);
      ctx.restore();
      if (dark) Furniture.drawMirrorBall(ctx, it.x, fl.top, t, true, sc);   // 불 꺼도 도는 공은 밝게
    }
  }
  // 이벤트 가구인지: 카탈로그에 event 표시가 있거나 이름이 hw · xmas · ny 로 시작
  const eventOf = (id) => (catalog.items[id] && catalog.items[id].event)
    || (/^hw[A-Z]/.test(id) ? 'halloween' : /^xmas[A-Z]/.test(id) ? 'christmas' : /^ny[A-Z]/.test(id) ? 'newyear' : null);
  const isEventItem = (id) => !!eventOf(id) && !!Furniture.ART[id];
  const EVENT_GLOW = { halloween: 'rgba(255,150,60,0.22)', christmas: 'rgba(255,214,130,0.2)', newyear: 'rgba(255,205,90,0.22)', other: 'rgba(255,220,150,0.2)' };

  // 꾸미기 격자: 화면에서 너무 촘촘하면 몇 칸마다 한 줄씩, 8칸마다 진한 줄
  function drawGrid() {
    if (!decorating || !gridStep) return;
    const every = Math.max(1, Math.ceil(6 / (gridStep * K)));   // 화면에서 6px 보다 촘촘하면 건너뜀
    const d = gridStep * every, major = d * Math.max(1, Math.round(32 / d));
    ctx.save();
    for (let x = 0; x <= RW; x += d) { ctx.fillStyle = x % major === 0 ? 'rgba(40,30,70,0.28)' : 'rgba(40,30,70,0.11)'; ctx.fillRect(x, 0, 1 / K, RH); }
    for (let y = 0; y <= RH; y += d) { ctx.fillStyle = y % major === 0 ? 'rgba(40,30,70,0.28)' : 'rgba(40,30,70,0.11)'; ctx.fillRect(0, y, RW, 1 / K); }
    if (selected) {   // 고른 가구의 발 위치 표시
      ctx.fillStyle = 'rgba(255,214,90,0.9)';
      ctx.fillRect(selected.x - 6, selected.y, 12, 1.5); ctx.fillRect(selected.x - 0.75, selected.y - 6, 1.5, 12);
    }
    ctx.restore();
  }
  function renderGridPick() {
    for (const b of document.querySelectorAll('#gridPick button')) b.classList.toggle('on', Number(b.dataset.grid) === gridStep);
  }
  for (const b of document.querySelectorAll('#gridPick button')) b.onclick = () => {
    gridStep = Number(b.dataset.grid);
    try { localStorage.setItem('decoGrid', String(gridStep)); } catch {}
    renderGridPick();
  };
  renderGridPick();
  // 방향키로 고른 가구를 한 칸씩 (격자 없음이면 1, Shift 는 4칸)
  addEventListener('keydown', (e) => {
    if (!decorating || !selected || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!dir) return;
    e.preventDefault();
    const st = (gridStep || 1) * (e.shiftKey ? 4 : 1);
    selected.x = clamp(snap(selected.x + dir[0] * st), 10, RW - 10);
    if (!isStructure(selected.item)) selected.y = clamp(snap(selected.y + dir[1] * st), 40, RH - 4);   // 🧱 가벽 · 🪩 미러볼은 양옆으로만
    saveLayout();
  });

  // 낚시터에 있으면 집 그림 자리에 큰 낚시터를 그림 (미니맵도 같음)
  const fishingMode = () => !!(window.HomeGame && HomeGame.fishingActive());
  function render() {
    ctx.setTransform(K, 0, 0, K, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, RW, RH);
    if (!catalog) return;
    if (meetingMode()) { drawMeeting(); return; }
    if (fishingMode()) { HomeGame.drawFishing(ctx, RW, RH, MINI); return; }
    drawHouse();
    const safeDraw = (fn) => { try { fn(); } catch (e) { reportLoopError(e); } };
    // 0.17 가구는 놓은 순서대로 쌓여요 (나중에 놓은 게 위). 꾸미기에서 우클릭 → 맨 앞으로 / 맨 뒤로.
    // 층: 러그 → 벽에 거는 것 → 바닥 가구(+캐릭터 · 펫) → 가벽 · 미러볼
    const G = layerGroups();
    G.flat.forEach((it) => safeDraw(() => drawItem(it)));
    G.wall.forEach((it) => safeDraw(() => drawItem(it)));
    const movers = [];
    for (const p of pets.values()) movers.push({ y: p.sortY(), x: p.x, w: 40, draw: () => p.draw() });
    if (foodDrop) movers.push({ y: foodDrop.y, x: foodDrop.x, w: 26, draw: () => { ctx.font = `26px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.fillText(foodDrop.icon, foodDrop.x, foodDrop.y); } });
    if (window.HomeGame) HomeGame.addThings(ctx, movers);   // 키우는 동물
    // 캐릭터 · 펫은 '자기 앞에 서 있고 겹치는 가구' 중 가장 먼저 그리는 것 바로 앞에 끼워 그림 (그래야 소파 뒤로 지나가면 가려짐)
    const before = new Map();
    const tail = [];
    for (const mv of movers.sort((a, b) => a.y - b.y)) {
      const hit = G.floor.find((it) => {
        if (it.y <= mv.y) return false;
        if (mv.x == null) return true;
        const g = geom(it);
        return Math.abs(mv.x - g.cx) < g.w / 2 + (mv.w || 30) / 2;
      });
      if (hit) { if (!before.has(hit)) before.set(hit, []); before.get(hit).push(mv); } else tail.push(mv);
    }
    for (const it of G.floor) {
      for (const mv of before.get(it) || []) safeDraw(mv.draw);
      safeDraw(() => drawItem(it));
    }
    tail.forEach((mv) => safeDraw(mv.draw));
    safeDraw(drawStructures);   // 🧱 가벽은 캐릭터 앞 (지나가면 뒤로 가려짐) · 🪩 미러볼
    drawDarkness();
    safeDraw(() => drawBalls(true));   // 🪩 반짝이는 어둠 위에 (빛이니까)
    drawGrid();
    for (const p of pets.values()) p.drawLabels();
  }

  // 🏢 회의장 그리기: 배경 + 자리마다 앉은 사람 (내 펫 · 가구 · 친구 펫은 안 보임)
  // 창밖 계절: 각자 화면에서만 고르는 설정 (시간대는 늘 실제 시간)
  let meetSeason = 'auto';
  try { const v = localStorage.getItem('meetSeason'); if (v && (v === 'auto' || MeetScene.SEASONS[v])) meetSeason = v; } catch {}
  $('meetSeason').value = meetSeason;
  $('meetSeason').onchange = (e) => { meetSeason = e.target.value; try { localStorage.setItem('meetSeason', meetSeason); } catch {} };
  addEventListener('storage', (e) => { if (e.key === 'meetSeason' && e.newValue) { meetSeason = e.newValue; $('meetSeason').value = meetSeason; } });   // 미니맵도 같이
  function drawMeeting() {
    const seats = S.room.meeting.seats || {};
    const myName = S.session?.user.username;
    const byUser = new Map();
    for (const p of pets.values()) byUser.set(p.isMe ? myName : p.profile.username, p);
    const seated = [];
    MeetScene.draw(ctx, RW, RH, performance.now() / 1000, (g, n, seat) => {
      const pet = seats[n] && byUser.get(seats[n]);
      if (!pet) return;
      pet.drawSeated(seat);
      seated.push([pet, seat]);
    }, { season: meetSeason });
    // 이름표 · 말풍선은 맨 위에 (앞줄이 뒷줄 말풍선을 가리지 않게)
    for (const [pet, seat] of seated) { try { pet.drawSeatLabels(seat); } catch (e) { reportLoopError(e); } }
  }

  // 그림 하나에서 오류가 나면(물고기 · 가구 데이터가 이상한 경우 등) 화면 전체가 멈춰서
  // 그 뒤로 가구 · 낚시 · 아쿠아리움이 투명하게 보이기만 하던 버그 → 루프가 멈추지 않게 감싸기
  const reportedLoopErrors = new Set();
  function reportLoopError(e) {
    const msg = String((e && e.stack) || e).slice(0, 1500);
    console.error(msg);
    if (reportedLoopErrors.has(msg) || reportedLoopErrors.size > 20) return;
    reportedLoopErrors.add(msg);
    try { buddy.send('overlay-error', msg); } catch {}
  }
  // 🪑 가구가 갑자기 사라지는 문제: 그래픽 카드가 초기화되면(절전 해제 · 모니터 변경 등) 그림 캐시가 비어 버릴 수 있어요.
  // 화면 캔버스가 다시 살아나거나, 창이 다시 보이거나, 4초마다 캐시를 확인해서 비었으면 모두 다시 그려요.
  function resetArtCaches() {
    for (const m of [window.Furniture, window.Sprites, window.PetArt, window.FishArt, window.RodArt]) { try { m && m.clearCache && m.clearCache(); } catch {} }
  }
  // 0.15.1: 집 캔버스 자체가 그래픽 카드 초기화로 사라졌는데 다시 안 살아나면 집이 텅 빈 채로 남았음 → 5초 안에 안 살아나면 창을 다시 불러옴
  let lostTimer = null;
  canvas.addEventListener('contextrestored', () => { clearTimeout(lostTimer); resetArtCaches(); });
  canvas.addEventListener('contextlost', (e) => { e.preventDefault(); clearTimeout(lostTimer); lostTimer = setTimeout(() => location.reload(), 5000); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && window.Furniture?.verifyCache && Furniture.verifyCache()) resetArtCaches(); });
  setInterval(() => { try { if (window.Furniture?.verifyCache && Furniture.verifyCache()) resetArtCaches(); } catch {} }, 4000);
  let last = performance.now();
  let lastPosSend = 0, lastPosSent = null;
  function sendMyPos(t) {
    const me = pets.get('me');
    if (!me || !S || !S.room || meetingMode()) return;
    if (t - lastPosSend < 180) return;
    const snap = { x: Math.round(me.x), y: Math.round(me.y), state: me.state, dir: me.dir, inBed: !!me.inBed };
    const same = lastPosSent && snap.x === lastPosSent.x && snap.y === lastPosSent.y && snap.state === lastPosSent.state && snap.dir === lastPosSent.dir;
    if (same) return;
    lastPosSend = t; lastPosSent = snap;
    buddy.send('home-pos', snap);
  }
  let frames = 0;
  // 확인창(confirm 등)이 떠 있는 동안은 화면이 멈춘 게 아니니 다시 불러오지 않게 알려 줌
  for (const k of ['confirm', 'alert', 'prompt']) {
    const orig = window[k].bind(window);
    window[k] = (...a) => { try { buddy.send('alive', 'pause'); } catch {} try { return orig(...a); } finally { try { buddy.send('alive', frames); } catch {} } };
  }
  setInterval(() => { try { buddy.send('alive', frames); } catch {} }, 2000);   // 0.17: 화면이 멈추면 메인이 다시 불러옴
  function loop(t) {
    frames++;
    try {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      for (const p of pets.values()) p.update(dt);
      sendMyPos(t);
      if (window.HomeGame) HomeGame.update(dt);
      if (foodDrop && (foodDrop.t -= dt) <= 0) foodDrop = null;
      render();
    } catch (e) {
      reportLoopError(e);
      try { ctx.setTransform(K, 0, 0, K, 0, 0); ctx.clearRect(0, 0, RW, RH); } catch {}
    }
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------ 마우스
  // 0.17 그리는 순서대로 묶기 (같은 묶음 안에서는 layout 배열 순서 = 놓은 순서)
  function layerGroups() {
    const G = { flat: [], wall: [], floor: [], top: [] };
    for (const it of layout) {
      if (isFlat(it.item)) G.flat.push(it);
      else if (isStructure(it.item)) G.top.push(it);
      else if (defOf(it.item).wall) G.wall.push(it);
      else G.floor.push(it);
    }
    return G;
  }
  function itemAt(p) {
    const G = layerGroups();
    const order = [...G.flat, ...G.wall, ...G.floor, ...G.top];   // 맨 위에 그린 것부터 고름
    for (let i = order.length - 1; i >= 0; i--) {
      const g = geom(order[i]);
      if (Math.abs(p.x - g.cx) <= g.w / 2 + 3 && Math.abs(p.y - g.cy) <= g.h / 2 + 3) return order[i];
    }
    return null;
  }
  const petAt = (p) => [...pets.values()].reverse().find((x) => x.hit(p));
  let saveTimer = null;
  function saveLayout(now = false) {
    clearTimeout(saveTimer);
    const go = () => buddy.send('place', layout.map(({ item, x, y, rot, flip, uid, wall }) => ({ item, x, y, rot: rot || 0, flip: !!flip, ...(uid ? { uid } : {}), ...(wall ? { wall } : {}) })));
    if (now) go(); else saveTimer = setTimeout(go, 350);
  }

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || meetingMode()) return;   // 🏢 회의장에서는 캐릭터를 끌거나 누를 수 없음
    if (fishingMode()) { if (!MINI) HomeGame.fishClick(); return; }
    const p = toRoom(e);
    if (decorating) {
      const it = itemAt(p);
      selected = it; renderSel();
      if (it) mouse = { kind: 'item', item: it, ox: p.x - it.x, oy: p.y - it.y, moved: false };
      return;
    }
    const pet = petAt(p);
    if (pet) { mouse = { kind: 'pet', pet, ox: p.x - pet.x, oy: p.y - pet.y, moved: false, sx: p.x, sy: p.y }; return; }
    mouse = { kind: 'click' };
  });
  addEventListener('mousemove', (e) => {
    const p = toRoom(e);
    if (mouse && mouse.kind === 'item') {
      mouse.item.x = clamp(snap(p.x - mouse.ox), 10, RW - 10);
      if (!isStructure(mouse.item.item)) mouse.item.y = clamp(snap(p.y - mouse.oy), 40, RH - 4);   // 🧱 가벽 · 🪩 미러볼은 양옆으로만 (다른 층은 가방에 넣었다 꺼내기)
      mouse.moved = true;
      return;
    }
    if (mouse && mouse.kind === 'pet') {
      if (!mouse.moved && Math.hypot(p.x - mouse.sx, p.y - mouse.sy) > 4) {
        mouse.moved = true; mouse.pet.dragging = true; mouse.pet.state = 'idle'; mouse.pet.path = []; mouse.pet.onArrive = null;
      }
      if (mouse.moved) {
        mouse.pet.x = clamp(p.x - mouse.ox, 24, RW - 24);
        mouse.pet.y = clamp(p.y - mouse.oy, PET_H, RH - 6);
      }
      return;
    }
    if (e.target === canvas && meetingMode()) { canvas.style.cursor = 'default'; return; }
    if (e.target === canvas && fishingMode()) { canvas.style.cursor = 'pointer'; return; }
    if (e.target === canvas) {
      const hov = decorating ? itemAt(p) : (petAt(p) || ['computer', 'record'].includes(itemAt(p)?.item));
      canvas.style.cursor = hov ? (decorating ? 'move' : 'pointer') : 'default';
    }
  });
  addEventListener('mouseup', (e) => {
    const m = mouse; mouse = null;
    if (!m) return;
    if (m.kind === 'item') { if (m.moved) saveLayout(true); return; }
    if (m.kind === 'pet') {
      const pet = m.pet;
      pet.dragging = false;
      if (m.moved) {
        // 놓은 자리에서 가까운 층 바닥에 내려앉음
        const f = floorOf(pet.y);
        pet.y = clamp(pet.y, band(f).min, band(f).max);
        pet.state = 'idle'; pet.t = rand(2, 4); pet.emote('✨');
        return;
      }
      pet.happyT = 0.8;
      pet.hopT = 0.45;
      if (pet.isMe) { buddy.send('pat'); pet.emote('💗'); buddy.send('poke', { target: 'me' }); }
      else { pet.emote('poke'); buddy.send('poke', { target: pet.id }); }
      return;
    }
    if (m.kind === 'click' && e.target === canvas) {
      const p = toRoom(e);
      if (window.HomeGame && HomeGame.onClick(p)) return;   // 동물 쓰다듬기
      const it = itemAt(p);
      if (it && it.item === 'computer') { goDesk(); return; }
      if (it && it.item === 'record' && window.Music) { Music.open(); return; }
      if (it && catalog.items[it.item]?.tank && window.HomeGame) { HomeGame.openTank(it.uid); return; }
      const me = pets.get('me');
      const f = floorOf(p.y);
      if (me && p.y > FLOORS[f].wall - 10) { me.state = 'idle'; me.goTo(p.x, p.y); }
    }
  });
  // 친구 캐릭터 우클릭: 간식 나눠먹기 · 이모트 · 대결 신청 메뉴
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (decorating && !meetingMode()) {   // 0.17 🛋️ 가구 우클릭: 맨 앞으로 · 맨 뒤로
      const it = itemAt(toRoom(e));
      if (!it) { hideFurnMenu(); return; }
      selected = it; renderSel();
      const m = $('furnMenu');
      m.hidden = false;
      const r = m.getBoundingClientRect();
      m.style.left = Math.min(e.clientX, innerWidth - r.width - 6) + 'px';
      m.style.top = Math.min(e.clientY, innerHeight - r.height - 6) + 'px';
      return;
    }
    if (decorating || meetingMode()) return;
    const pet = petAt(toRoom(e));
    if (pet) buddy.send('char-menu', { id: pet.id });   // 내 캐릭터: 자세 · 상태 메뉴, 친구: 간식 · 대결 메뉴
  });
  canvas.addEventListener('wheel', (e) => {
    if (!decorating || meetingMode()) return;
    const it = itemAt(toRoom(e)) || selected;
    if (!it) return;
    e.preventDefault();
    selected = it;
    it.rot = (((it.rot || 0) + (e.deltaY > 0 ? 15 : -15)) % 360 + 360) % 360;
    renderSel(); saveLayout();
  }, { passive: false });

  // 0.17 쌓는 순서 바꾸기: 배열 맨 끝 = 맨 앞(위), 맨 처음 = 맨 뒤
  function restack(it, toFront) {
    const i = layout.indexOf(it);
    if (i < 0) return;
    layout.splice(i, 1);
    if (toFront) layout.push(it); else layout.unshift(it);
    saveLayout(true);
    toast(toFront ? '⬆️ 맨 앞으로 보냈어요' : '⬇️ 맨 뒤로 보냈어요');
  }
  function hideFurnMenu() { $('furnMenu').hidden = true; }
  $('furnFront').onclick = () => { if (selected) restack(selected, true); hideFurnMenu(); };
  $('furnBack').onclick = () => { if (selected) restack(selected, false); hideFurnMenu(); };
  $('furnBag').onclick = () => { hideFurnMenu(); $('bagBtn').click(); };
  $('selFront').onclick = () => { if (selected) restack(selected, true); };
  $('selBack').onclick = () => { if (selected) restack(selected, false); };
  addEventListener('mousedown', (e) => { if (!$('furnMenu').contains(e.target)) hideFurnMenu(); }, true);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') hideFurnMenu(); });

  // ------------------------------------------------------------ 가구 회전 · 뒤집기 · 넣기
  function renderSel() {
    $('selBar').hidden = !(decorating && selected);
    if (!selected || !catalog) return;
    const def = catalog.items[selected.item];
    $('selName').textContent = def ? def.name : selected.item;
    $('rotRange').value = selected.rot || 0;
    $('rotVal').textContent = (selected.rot || 0) + '°';
    $('bagBtn').hidden = !!(def && def.required);
    const st = isStructure(selected.item);   // 가벽 · 미러볼은 돌리거나 뒤집지 않음
    for (const id of ['rotL', 'rotRange', 'rotR', 'rotVal', 'flipBtn', 'selFront', 'selBack']) $(id).hidden = st;
    renderZoneWalls();
  }
  // 🎨 가벽을 고르면: 왼쪽 방 · 오른쪽 방 벽지 고르기 (가지고 있는 벽지만)
  function renderZoneWalls() {
    const box = $('zoneWalls');
    box.hidden = !(selected && isDivider(selected.item));
    if (box.hidden) return;
    const v = viewing(), f = floorOf(selected.y), owned = S.session.user.owned || {};
    const ids = Object.keys(catalog.walls || {}).filter((id) => id === 'basic' || owned[id]);
    const zs = zonesOf(f, v.home), i = floorDividers(f).indexOf(selected);
    const fill = (sel, cur) => {
      sel.textContent = '';
      for (const id of ids) { const o = document.createElement('option'); o.value = id; o.textContent = catalog.walls[id].name; o.selected = id === cur; sel.append(o); }
    };
    if (document.activeElement !== $('zoneLeft')) fill($('zoneLeft'), zs[i]?.theme);
    if (document.activeElement !== $('zoneRight')) fill($('zoneRight'), zs[i + 1]?.theme);
  }
  $('zoneRight').onchange = (e) => { if (!selected) return; selected.wall = e.target.value; saveLayout(true); renderZoneWalls(); };
  $('zoneLeft').onchange = (e) => {
    if (!selected) return;
    const f = floorOf(selected.y), ds = floorDividers(f), prev = ds[ds.indexOf(selected) - 1];
    if (prev) { prev.wall = e.target.value; saveLayout(true); }        // 왼쪽 방 = 앞 가벽의 오른쪽 방
    else buddy.send('wall', { item: e.target.value, floor: f });       // 맨 왼쪽 방 = 그 층 벽지
    renderZoneWalls();
  };
  for (const id of ['zoneLeft', 'zoneRight']) $(id).addEventListener('keydown', (e) => e.stopPropagation());
  const rotate = (d) => { if (!selected) return; selected.rot = (((selected.rot || 0) + d) % 360 + 360) % 360; renderSel(); saveLayout(); };
  $('rotL').onclick = () => rotate(-15);
  $('rotR').onclick = () => rotate(15);
  $('rotRange').oninput = (e) => { if (!selected) return; selected.rot = Number(e.target.value); $('rotVal').textContent = selected.rot + '°'; saveLayout(); };
  $('flipBtn').onclick = () => { if (!selected) return; selected.flip = !selected.flip; saveLayout(); };
  $('bagBtn').onclick = () => {
    if (!selected) return;
    const def = catalog.items[selected.item];
    if (def && def.required) return;
    layout.splice(layout.indexOf(selected), 1);
    selected = null; renderSel(); saveLayout(true);
    toast(`${def ? def.name : '가구'}을(를) 가방에 넣었어요`);
  };

  // ------------------------------------------------------------ 컴퓨터
  function goDesk() {
    const me = pets.get('me');
    const comp = findItem('computer');
    if (!me) return;
    if (!comp) { openComputer(); return; }
    me.goTo(comp.x + 4, comp.y + 2, () => { me.state = 'desk'; me.dir = -1; openComputer(); });
  }
  function openComputer() { if (decorating) $('decoBtn').click(); $('friends').hidden = true; $('computer').hidden = false; renderComputer(); }
  function closeComputer() {
    $('computer').hidden = true;
    const me = pets.get('me');
    if (me && me.state === 'desk') { me.state = 'idle'; me.t = 1; }
  }
  $('closeComputer').onclick = closeComputer;
  $('deskBtn').onclick = goDesk;
  $('openFriendsFromPc').onclick = () => { $('computer').hidden = true; openFriends(); };
  document.querySelectorAll('.ctabs button').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('.ctabs button').forEach((x) => x.classList.toggle('active', x === b));
      document.querySelectorAll('.cpane').forEach((p) => p.classList.toggle('active', p.id === 'cpane-' + b.dataset.ctab));
    };
  });

  function personRow(p, extra) {
    const li = document.createElement('li');
    const dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = p.color || '#ccc';
    const who = document.createElement('span'); who.className = 'who';
    const nm = document.createElement('b');
    nm.textContent = (showCrown(p.username) ? '👑 ' : '') + p.nickname;
    nm.className = NickFX.domClass(p); nm.style.cssText = NickFX.domStyle(p);
    const id = document.createElement('small'); id.textContent = '@' + p.username;
    who.append(nm, id);
    li.append(dot, who);
    if (extra) extra(li);
    return li;
  }
  function btn(text, cls, onClick, disabled, title) {
    const b = document.createElement('button'); b.className = cls; b.textContent = text; b.disabled = !!disabled; b.onclick = onClick;
    if (title) b.title = title;
    return b;
  }

  function renderComputer() {
    if (!S || !S.session) return;
    const u = S.session.user;
    const inMine = S.room && S.room.isOwner;
    $('roomNow').textContent = inMine ? `지금 내 집에 있어요 · ${S.peers.length + 1}명`
      : S.room ? `지금 ${S.room.owner.nickname}(@${S.room.owner.username})님 집에 놀러 와 있어요` : '지금은 혼자 돌아다니고 있어요 (집 비움)';
    $('doorBox').checked = !u.locked;
    $('goHomeBtn').hidden = !!inMine;
    $('leaveBtn').hidden = !S.room;
    $('leaveBtn').textContent = inMine ? '집 비우고 혼자 놀기' : '나가서 혼자 놀기';
    $('membersTitle').hidden = !(inMine && S.peers.length);
    const ml = $('memberList'); ml.textContent = '';
    if (inMine) for (const p of S.peers) ml.append(personRow(p, (li) => {
      li.append(btn('내보내기', 'danger small', () => buddy.send('kick', p.id)));
      li.append(btn('🚫', 'x', () => { if (confirm(`${p.nickname}(@${p.username})님을 차단할까요?`)) buddy.send('srv', { type: 'block', username: p.username }); }, false, '차단'));
    }));
  }
  $('doorBox').onchange = (e) => buddy.send('lock', !e.target.checked);
  $('goHomeBtn').onclick = () => buddy.send('open-my-room');
  $('leaveBtn').onclick = () => buddy.send('leave-room');
  $('joinCode').oninput = (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
  $('joinBtn').onclick = () => buddy.send('join-room', $('joinCode').value);
  $('joinCode').onkeydown = (e) => { if (e.key === 'Enter') $('joinBtn').click(); };

  // ------------------------------------------------------------ 친구 창 (추가 · 놀러가기 · 선물)
  function openFriends() { $('friends').hidden = false; renderFriends(); setTimeout(() => $('friendQuery').focus(), 30); }
  $('friendsBtn').onclick = () => ($('friends').hidden ? openFriends() : ($('friends').hidden = true));
  $('closeFriends').onclick = () => { $('friends').hidden = true; giftOpen = null; };

  function renderFriends() {
    if (!S || !S.session) return;
    const u = S.session.user;
    const F = S.friends || { friends: [], incoming: [], outgoing: [] };
    const unreadDm = (F.friends || []).reduce((n, f) => n + (f.unread || 0), 0);
    $('friendDot').hidden = !F.incoming.length && !unreadDm;
    $('friendDot').textContent = unreadDm ? String(Math.min(99, unreadDm)) : '';
    if ($('friends').hidden) return;
    $('myCode').textContent = u.code;
    $('giftLeftNote').textContent = `· 오늘 선물 가능 🪙${u.giftLeft ?? 0}`;
    $('incomingBox').hidden = !F.incoming.length;
    const inc = $('incomingList'); inc.textContent = '';
    for (const p of F.incoming) {
      inc.append(personRow(p, (li) => {
        const box = document.createElement('span'); box.style.marginLeft = 'auto'; box.className = 'row';
        box.append(btn('수락', 'primary small', () => buddy.send('friend-accept', p.username)),
          btn('거절', 'ghost small', () => buddy.send('friend-decline', p.username)));
        li.append(box);
      }));
    }
    // 같은 방에 있는 사람 중 친구가 아닌 사람: 바로 친구 신청
    const isFriend = (name) => F.friends.some((f) => f.username === name);
    const strangers = (S.peers || []).filter((p) => p.username && p.username !== u.username && !isFriend(p.username));
    $('roomPeopleBox').hidden = !strangers.length;
    const rp = $('roomPeopleList'); rp.textContent = '';
    for (const p of strangers) {
      rp.append(personRow(p, (li) => {
        const box = document.createElement('span'); box.style.marginLeft = 'auto'; box.className = 'row';
        const sent = F.outgoing.some((o) => o.username === p.username);
        const asked = F.incoming.some((o) => o.username === p.username);
        box.append(asked ? btn('수락', 'primary small', () => buddy.send('friend-accept', p.username))
          : btn(sent ? '신청 보냄' : '👋 친구 신청', sent ? 'ghost small' : 'primary small', () => buddy.send('srv', { type: 'friend-add-peer', id: p.id }), sent));
        li.append(box);
      }));
    }
    const fl = $('friendList'); fl.textContent = '';
    if (!F.friends.length) {
      const li = document.createElement('li'); li.className = 'note';
      li.textContent = '아직 친구가 없어요. 친구의 데스크톱 코드를 넣어 추가해 보세요.';
      fl.append(li);
    }
    const here = S.room && S.room.owner.username;
    for (const f of F.friends) {
      fl.append(personRow(f, (li) => {
        const st = document.createElement('span'); st.className = 'state';
        const acts = document.createElement('span'); acts.className = 'acts';
        let action;
        const max = f.max || catalog?.roomMax;
        const cnt = max ? `${f.count}/${max}` : `${f.count}명`;
        const full = max && f.count >= max;
        if (here === f.username) { st.textContent = `같이 있어요 · 👥 ${cnt}`; st.classList.add('open'); }
        else if (!f.online) st.textContent = '오프라인';
        else if (!f.hosting) st.textContent = '집 비움';
        else if (full) st.textContent = `🈵 가득 참 · 👥 ${cnt}`;
        else if (f.open) { st.textContent = `🚪 문 열림 · 👥 ${cnt}`; st.classList.add('open'); action = btn('놀러가기', 'primary small', () => buddy.send('visit', f.username)); }
        else { st.textContent = `🔒 문 닫힘 · 👥 ${cnt}`; action = btn('똑똑', 'ghost small', () => buddy.send('knock', f.username)); }
        li.append(st, acts);
        if (action) acts.append(action);
        // 내 집에 있을 때: 온라인 친구를 바로 초대
        if (S.room?.isOwner && f.online && here !== f.username) {
          const inHere = (S.peers || []).some((p) => p.username === f.username);
          if (!inHere) acts.append(btn('📨 초대', 'ghost small', () => buddy.send('srv', { type: 'invite', username: f.username }), false, '내 집으로 초대하기 (문이 닫혀 있어도 들어올 수 있어요)'));
        }
        // 친구 집에 놀러 와 있을 때: 내 친구를 이 집으로 초대 (집주인이 허락해야 들어와요)
        if (S.room && !S.room.isOwner && f.online && here !== f.username) {
          const inHere = (S.peers || []).some((p) => p.username === f.username);
          if (!inHere) acts.append(btn('📨 이 집으로', 'ghost small', () => buddy.send('srv', { type: 'invite-fof', username: f.username }), false, `${S.room.owner.nickname}님 집으로 초대하기 (${S.room.owner.nickname}님이 허락하면 들어와요)`));
        }
        const li2 = { append: (...x) => acts.append(...x) };
        li2.append(btn(f.unread ? `✉️ ${f.unread}` : '✉️', f.unread ? 'primary small' : 'ghost small', () => window.DM && DM.open(f.username, f.nickname), false, '개인 채팅'));
        li2.append(btn('🎁', 'ghost small', () => { giftOpen = giftOpen === f.username ? null : f.username; renderFriends(); }, false, '코인 선물'));
        li2.append(btn('🐋', 'ghost small', () => window.HomeGame && HomeGame.openAquarium(f.username), false, '아쿠아리움 구경'));
        li2.append(btn('✕', 'x', () => { if (confirm(`${f.nickname}(@${f.username})님을 친구에서 삭제할까요?`)) buddy.send('friend-remove', f.username); }, false, '친구 삭제'));
        li2.append(btn('🚫', 'x', () => { if (confirm(`${f.nickname}(@${f.username})님을 차단할까요?\n채팅이 안 보이고, 내 집에 못 오고, 친구에서도 빠져요.`)) buddy.send('srv', { type: 'block', username: f.username }); }, false, '차단'));
      }));
      if (giftOpen === f.username) {
        const row = document.createElement('li'); row.className = 'gift-row';
        const left = u.giftLeft ?? 0;
        const inp = document.createElement('input'); inp.type = 'number'; inp.min = 1; inp.max = Math.max(1, Math.min(left, u.coins)); inp.value = Math.min(10, left, u.coins) || 1;
        const txt = document.createElement('span'); txt.textContent = `${f.nickname}님에게 🪙`;
        const send = btn('선물하기', 'primary small', () => {
          const n = Math.floor(Number(inp.value));
          if (!(n >= 1)) return;
          buddy.send('gift', { username: f.username, amount: n });
          giftOpen = null; renderFriends();
        }, left < 1 || u.coins < 1);
        const note = document.createElement('span'); note.className = 'note-inline';
        note.textContent = left < 1 ? '오늘은 다 보냈어요 (하루 100)' : `오늘 ${left}까지`;
        row.append(txt, inp, send, note);
        fl.append(row);
      }
    }
    $('outgoingNote').textContent = F.outgoing.length ? `수락을 기다리는 신청: ${F.outgoing.map((o) => o.nickname + '(@' + o.username + ')').join(', ')}` : '';
  }
  $('friendQuery').oninput = (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
  $('friendForm').onsubmit = (e) => {
    e.preventDefault();
    const q = $('friendQuery').value.trim();
    if (!/^[A-Z0-9]{8}$/.test(q)) { toast('데스크톱 코드는 영문/숫자 8자리예요'); return; }
    buddy.send('friend-add', q);
    $('friendQuery').value = '';
  };
  $('copyCode').onclick = async () => {
    try { await navigator.clipboard.writeText($('myCode').textContent); $('copyCode').textContent = '복사됨!'; } catch {}
    setTimeout(() => { $('copyCode').textContent = '복사'; }, 1200);
  };

  // 문 두드림 알림
  function renderKnock() {
    const k = S && S.knocks && S.knocks[0];
    $('knockBox').hidden = !k;
    if (k) $('knockText').textContent = k.via ? `${k.via.nickname}님의 친구 ${k.nickname}(@${k.username})님이 들어오고 싶어해요` : `${k.nickname}(@${k.username})님이 문을 두드려요`;
    // 초대장: 문 두드림 알림과 겹치지 않게 위쪽에
    const inv = S && S.invites && S.invites[S.invites.length - 1];
    $('inviteBox').hidden = !inv;
    $('inviteBox').classList.toggle('stacked', !!k);
    if (inv) $('inviteText').textContent = inv.via
      ? `${inv.via.nickname}님이 ${inv.nickname}(@${inv.username})님 집으로 초대했어요 · 수락하면 ${inv.nickname}님이 허락해야 들어가요`
      : `${inv.nickname}(@${inv.username})님이 자기 집으로 초대했어요${inv.max ? ` (지금 ${inv.count}/${inv.max}명)` : ''}`;
  }
  $('inviteYes').onclick = () => { const k = S.invites?.[S.invites.length - 1]; if (k) buddy.send('invite-answer', { username: k.username, accept: true }); };
  $('inviteNo').onclick = () => { const k = S.invites?.[S.invites.length - 1]; if (k) buddy.send('invite-answer', { username: k.username, accept: false }); };
  $('knockYes').onclick = () => { const k = S.knocks[0]; if (k) buddy.send('knock-answer', { username: k.username, accept: true }); };
  $('knockNo').onclick = () => { const k = S.knocks[0]; if (k) buddy.send('knock-answer', { username: k.username, accept: false }); };

  // ------------------------------------------------------------ 꾸미기 · 불 · 화면 모드
  $('decoBtn').onclick = () => {
    const v = viewing();
    if (!decorating && (!v || !v.editable)) { toast('다른 사람 집은 꾸밀 수 없어요'); return; }
    decorating = !decorating;
    $('decoBtn').classList.toggle('on', decorating);
    $('decoBtn').textContent = decorating ? '✅ 꾸미기 끝' : '✏️ 꾸미기';
    $('decoHint').hidden = !decorating;
    $('decoReset').hidden = !decorating;
    if (!decorating) selected = null;
    if (decorating) { closeComputer(); $('friends').hidden = true; }
    renderSel();
  };
  // 0.17 🧹 처음 상태로: 가구는 전부 가방에, 벽지는 기본 (컴퓨터 · 침대처럼 처음 받은 가구만 처음 자리에)
  $('decoReset').onclick = () => {
    const v = viewing();
    if (!v || !v.editable || !catalog) return;
    const n = layout.filter((it) => !catalog.items[it.item]?.free).length;
    if (!confirm(`집을 처음 상태로 되돌릴까요?\n\n· 놓은 가구 ${n}개는 전부 가방으로 들어가요 (없어지지 않아요)\n· 1층 · 2층 벽지, 방마다 벽지도 기본 벽지로\n· 컴퓨터 · 침대는 처음 자리로\n\n지금 꾸밈을 남기고 싶으면 먼저 🎒 가방 → 💾 인테리어 슬롯에 저장하세요.`)) return;
    layout = Object.entries(catalog.items).filter(([, d]) => d.free && d.start).map(([id, d]) => ({ item: id, ...d.start, rot: 0, flip: false }));
    selected = null; renderSel();
    saveLayout(true);
    for (const floor of [1, 2]) if ((v.home['wall' + floor] || 'basic') !== 'basic') buddy.send('wall', { item: 'basic', floor });
    toast('🧹 처음 상태로 되돌렸어요. 가구는 가방에 있어요');
  };
  for (const b of $('lightBtn').querySelectorAll('button')) b.onclick = () => {
    const v = viewing();
    if (!v || !v.editable) { toast('불은 집주인만 켜고 끌 수 있어요'); return; }
    const floor = Number(b.dataset.floor);
    buddy.send('light', { floor, on: !lightOn(v.home, floor) });
  };
  // 화면 모드 고르기 (컴퓨터 설정 · 화이트 · 다크 · 오로라 · 사용자 지정)
  const THEME_ICON = { system: '🖥️', light: '☀️', dark: '🌙', aurora: '🌈', custom: '🎨' };
  const THEME_NAME = { system: '컴퓨터 설정 따라가기', light: '화이트 모드', dark: '다크 모드', aurora: '오로라 모드', custom: '사용자 지정' };
  const CUSTOM_KEYS = ['bg', 'card', 'ink', 'accent', 'a1', 'a2', 'a3'];
  const CUSTOM_PRESETS = {
    '🍑 복숭아': { bg: '#fff3ec', card: '#ffffff', ink: '#3a2a26', accent: '#f2836b', aurora: true, a1: '#ffd3c4', a2: '#ffe7b8', a3: '#ffc9de' },
    '🌊 바다': { bg: '#eef6fb', card: '#ffffff', ink: '#1f3346', accent: '#3a8fd6', aurora: true, a1: '#bfe3ff', a2: '#c9f1ec', a3: '#d7d4ff' },
    '🌲 숲': { bg: '#eef5ee', card: '#ffffff', ink: '#233226', accent: '#4a9a5b', aurora: false, a1: '#cdeccf', a2: '#e8f3c4', a3: '#c4e7e0' },
    '🌌 밤하늘': { bg: '#181a2e', card: '#24263f', ink: '#ece9ff', accent: '#9d8cff', aurora: true, a1: '#3b2f74', a2: '#1f4f6e', a3: '#5a2b5e' },
  };
  const showTheme = () => {
    const t = window.buddyTheme || 'system';
    $('themeBtn').textContent = THEME_ICON[t] + ' 화면'; $('themeBtn').title = '화면 모드: ' + THEME_NAME[t];
    document.querySelectorAll('#themeModes button').forEach((b) => b.classList.toggle('active', b.dataset.mode === t));
    $('themeCustomBox').hidden = t !== 'custom';
    const c = window.buddyThemeCustom || {};
    if (!themeEditing) {
      for (const k of CUSTOM_KEYS) if (c[k]) $('tc-' + k).value = c[k];
      $('tc-aurora').checked = !!c.aurora;
    }
    $('auroraColors').hidden = !$('tc-aurora').checked;
    const bub = window.buddyBubble || {};
    if (!bubEditing) { $('bubOn').checked = !!bub.on; if (bub.mine) $('bubMine').value = bub.mine; if (bub.theirs) $('bubTheirs').value = bub.theirs; }
    $('bubBox').hidden = !$('bubOn').checked;
  };
  // 💬 말풍선 색 (0.17)
  let bubEditing = false, bubTimer = null;
  const sendBubble = () => {
    clearTimeout(bubTimer); bubEditing = true;
    $('bubBox').hidden = !$('bubOn').checked;
    bubTimer = setTimeout(() => { buddy.send('set-bubble', { on: $('bubOn').checked, mine: $('bubMine').value, theirs: $('bubTheirs').value }); setTimeout(() => { bubEditing = false; }, 300); }, 80);
  };
  for (const id of ['bubOn', 'bubMine', 'bubTheirs']) $(id).addEventListener('input', sendBubble);
  const BUB_PRESETS = { '🍑 복숭아': ['#ff9a7a', '#fff1ea'], '💙 하늘': ['#4a9eff', '#eef4ff'], '💚 민트': ['#3fbf8f', '#ecfbf4'], '💜 라벤더': ['#9b7cf0', '#f3efff'], '🖤 모노': ['#2e2a33', '#f1f0f2'], '🌙 밤': ['#7a6cff', '#2b2d45'] };
  for (const [name, [m, t]] of Object.entries(BUB_PRESETS)) {
    const b = document.createElement('button'); b.className = 'ghost small'; b.type = 'button';
    const i1 = document.createElement('i'); i1.style.background = m; const i2 = document.createElement('i'); i2.style.background = t;
    b.append(i1, i2, ' ' + name);
    b.onclick = () => { $('bubMine').value = m; $('bubTheirs').value = t; sendBubble(); };
    $('bubPresets').append(b);
  }
  let themeEditing = false, themeTimer = null;
  const readCustom = () => {
    const c = { aurora: $('tc-aurora').checked };
    for (const k of CUSTOM_KEYS) c[k] = $('tc-' + k).value;
    return c;
  };
  const sendCustom = () => {
    clearTimeout(themeTimer);
    themeEditing = true;
    $('auroraColors').hidden = !$('tc-aurora').checked;
    themeTimer = setTimeout(() => { buddy.send('set-theme', { mode: 'custom', custom: readCustom() }); setTimeout(() => { themeEditing = false; }, 300); }, 80);
  };
  document.addEventListener('buddy-theme', showTheme);
  $('themeBtn').onclick = () => { $('themeModal').hidden = false; showTheme(); };
  $('themeClose').onclick = () => { $('themeModal').hidden = true; };
  $('themeModal').addEventListener('mousedown', (e) => { if (e.target === $('themeModal')) $('themeModal').hidden = true; });
  document.querySelectorAll('#themeModes button').forEach((b) => {
    b.onclick = () => {
      const mode = b.dataset.mode;
      if (mode === 'custom') buddy.send('set-theme', { mode, custom: readCustom() });
      else buddy.send('set-theme', mode);
    };
  });
  for (const k of [...CUSTOM_KEYS, 'aurora']) $('tc-' + k).addEventListener('input', sendCustom);
  const presetBox = $('themePresets');
  for (const [name, c] of Object.entries(CUSTOM_PRESETS)) {
    const b = document.createElement('button'); b.className = 'ghost small'; b.textContent = name;
    b.style.background = `linear-gradient(120deg, ${c.a1}, ${c.a2}, ${c.a3})`; b.style.color = c.ink;
    b.onclick = () => { for (const k of CUSTOM_KEYS) $('tc-' + k).value = c[k]; $('tc-aurora').checked = c.aurora; sendCustom(); };
    presetBox.append(b);
  }

  // ------------------------------------------------------------ 패널
  document.querySelectorAll('.tabs button').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x === b));
      document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('active', p.id === 'pane-' + b.dataset.tab));
      setFishingLook(b.dataset.tab === 'fishing');
    };
  });
  // 낚시터에 들어가면 집 꾸미기 · 불 · 컴퓨터 버튼 대신 '집으로 돌아가기'
  function setFishingLook(on) {
    document.body.classList.toggle('fishing-mode', on);
    if (on && decorating) $('decoBtn').click();
    if (on) { closeComputer(); $('friends').hidden = true; }
  }
  $('leaveFishBtn').onclick = () => document.querySelector('.tabs button[data-tab=chat]').click();
  function shopRow(icon, name, sub, buttons) {
    const el = document.createElement('li');
    let ico = icon;
    if (typeof icon === 'string') { ico = document.createElement('span'); ico.className = 'ico'; ico.textContent = icon; }
    else ico.classList.add('thumb');
    const nm = document.createElement('span'); nm.className = 'name'; nm.textContent = name;
    if (sub) { const s = document.createElement('small'); s.textContent = sub; nm.append(s); }
    const box = document.createElement('span'); box.className = 'btns';
    for (const [text, disabled, onClick, cls] of buttons) {
      const b = document.createElement('button'); b.className = cls || 'primary small'; b.textContent = text; b.disabled = !!disabled; b.onclick = onClick;
      box.append(b);
    }
    el.append(ico, nm, box);
    return el;
  }
  function wallThumb(id) {
    const c = document.createElement('canvas'); c.width = 34; c.height = 34;
    const g = c.getContext('2d');
    g.save(); g.scale(34 / 120, 34 / 120);
    Furniture.drawFloorArea(g, id, 0, 0, 120, 80, 120, 5);
    g.restore();
    return c;
  }

  function renderPanels() {
    if (!S || !S.session || !catalog) return;
    const u = S.session.user;
    const v = viewing();
    $('coins').textContent = u.coins.toLocaleString();
    $('level').textContent = u.pet.level;
    $('expBar').style.width = Math.min(100, (u.pet.exp / u.pet.next) * 100) + '%';
    $('fullBar').style.width = u.pet.full + '%';
    $('moodBar').style.width = u.pet.mood + '%';
    $('homeTitle').textContent = v.editable ? '🏠 내 집' : `🏠 ${v.owner.nickname}님의 집`;
    $('miniTitle').textContent = MINI && S.fishing ? '🎣 낚시터' : $('homeTitle').textContent + (S.room ? ` · ${S.peers.length + 1}명` : '');
    // 남의 집에 놀러 왔으면 그 집 아쿠아리움도 바로 볼 수 있게
    const visiting = S.room && !S.room.isOwner;
    $('friendAquaBtn').hidden = !visiting;
    if (visiting) {
      $('friendAquaBtn').textContent = `🐋 ${S.room.owner.nickname}님 아쿠아리움`;
      $('friendAquaBtn').onclick = () => window.HomeGame && HomeGame.openAquarium(S.room.owner.username);
    }
    const badge = $('roomBadge');
    if (S.room) { badge.className = 'badge on'; const max = S.room.max || catalog.roomMax; badge.textContent = `👥 ${S.peers.length + 1}${max ? '/' + max : '명'}${S.room.locked ? ' · 🔒' : ' · 🚪 열림'}`; badge.title = max ? `이 방에 ${S.peers.length + 1}명이 있어요 (최대 ${max}명)` : ''; }
    else { badge.className = 'badge off'; badge.textContent = '혼자 놀기'; }
    for (const b of $('lightBtn').querySelectorAll('button')) {
      const f = Number(b.dataset.floor), on = lightOn(v.home, f);
      b.textContent = `${on ? '💡' : '🌙'} ${f}층`;
      b.classList.toggle('dark', !on);
      b.title = `${f}층 불 ${on ? '끄기' : '켜기'}`;
    }
    $('lightBtn').classList.toggle('off', !v.editable);

    $('allPetsBox').checked = !!S.view?.showAllPets;
    // 제작자 후원 링크 (서버에 설정했을 때만 보임)
    const sup = catalog.support;
    $('supportBtn').hidden = !(sup && /^https:\/\//.test(sup.url));
    if (sup) $('supportBtn').onclick = () => {
      if (confirm(`${sup.text || '만든 사람에게 커피 한 잔 사 주실래요? ☕'}\n\n외부 결제 페이지가 브라우저로 열려요. 게임 안에서는 돈이 오가지 않아요.`)) window.open(sup.url);
    };
    if (window.HomeGame) HomeGame.renderPanels();
    $('chatHint').textContent = S.room ? '' : '혼자일 땐 말풍선만 떠요. 친구 집에 놀러 가 보세요.';
    if (!$('computer').hidden) renderComputer();
    renderFriends();
    renderKnock();
  }
  function placeNew(id, floor) {
    const def = catalog.items[id];
    // 지금 화면의 배치에 더해요. (예전엔 서버에서 마지막으로 받은 배치로 다시 시작해서,
    // 방금 놓은 가구가 아직 저장 전이거나 저장이 안 됐으면 가방으로 돌아가 버렸음)
    const max = catalog.limits?.furnitureMax || 60;
    if (layout.length >= max) { toast(`가구는 한 집에 ${max}개까지 놓을 수 있어요. 다른 가구를 가방에 넣고 놓아 주세요.`); return; }
    const fl = FLOORS[floor];
    const y = def.ceiling ? fl.top + 40 : def.divider ? band(floor).max
      : def.wall ? Math.round(fl.top + (fl.wall - fl.top) * 0.6) : Math.round(rand(band(floor).min + 10, band(floor).max));
    const it = { item: id, x: Math.round(rand(140, LADDER_X - 80)), y, rot: 0, flip: false };
    layout.push(it);
    saveLayout(true);
    if (!decorating) $('decoBtn').click();
    selected = it; renderSel();
  }

  // ------------------------------------------------------------ 채팅
  const log = $('chatLog');
  // 채팅 시간: 컴퓨터 지역 설정과 상관없이 한국 표준시(KST)로, 오늘이 아니면 날짜도
  const KST_TIME = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: 'numeric', minute: '2-digit' });
  const KST_DAY = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' });
  function kstLabel(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const today = KST_DAY.format(new Date()) === KST_DAY.format(d);
    const md = Object.fromEntries(KST_DAY.formatToParts(d).map((x) => [x.type, x.value]));
    return (today ? '' : `${md.month}/${md.day} `) + KST_TIME.format(d);
  }
  function timeTag(ts) {
    const t = document.createElement('time'); t.className = 'msg-time';
    t.textContent = kstLabel(ts);
    if (ts) t.title = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'long', timeStyle: 'medium' }).format(new Date(ts)) + ' (한국 시간)';
    return t;
  }
  // 0.17 🪪 채팅 이름: 아이디는 안 보이고, 이름을 누르면 프로필 카드(아이디 포함)가 떠요
  function nameTag(m) {
    const b = document.createElement('b'); b.textContent = m.from || '?'; b.style.marginRight = '3px';
    b.className = 'chat-name ' + NickFX.domClass(m); b.style.cssText += ';' + NickFX.domStyle(m, m.color);
    if (m.username) { b.dataset.user = m.username; b.title = '눌러서 프로필 보기'; }
    if (m.pid) b.dataset.pid = m.pid;
    return b;
  }
  let wantProfile = null;
  function openProfile(username, pid) {
    if (!username) return;
    wantProfile = username.toLowerCase();
    const peer = pid === 'me' ? null : pid && pets.has(pid) ? pid : null;
    buddy.send('srv', { type: 'profile-get', ...(peer ? { peer } : {}), username, ...(username.toLowerCase() === (S?.session?.user?.username || '').toLowerCase() ? { self: true } : {}) });
  }
  for (const box of [$('chatLog'), $('fishChatLog')].filter(Boolean)) {
    box.addEventListener('click', (e) => {
      const b = e.target.closest('.chat-name');
      if (b && b.dataset.user) openProfile(b.dataset.user, b.dataset.pid);
    });
  }
  buddy.on('srv', (m) => {
    if (m.type !== 'profile-card' || !wantProfile || String(m.username).toLowerCase() !== wantProfile) return;
    wantProfile = null;
    const box = $('profileBox'); box.textContent = '';
    const extra = document.createElement('div'); extra.className = 'pcard-actions';
    if (m.self) {
      const ed = document.createElement('button'); ed.className = 'ghost small'; ed.textContent = '✏️ 프로필 꾸미기';
      ed.onclick = () => { $('profileModal').hidden = true; buddy.send('open-settings', 'profile'); };
      extra.append(ed);
    }
    const close = document.createElement('button'); close.className = 'ghost small'; close.textContent = '닫기';
    close.onclick = () => { $('profileModal').hidden = true; };
    extra.append(close);
    let asOthers = false;
    const draw = () => {
      box.querySelector('.pcard')?.remove();
      box.append(ProfileCard.render(m, catalog, { extra, asOthers }));
    };
    if (m.self) {   // 내 프로필: 숨긴 도감이 정말 숨겨졌는지 '친구에게 보이는 모습'으로 확인
      const tg = document.createElement('div'); tg.className = 'pcard-view-toggle';
      for (const [label, v] of [['🙋 내가 보는 모습', false], ['👀 친구에게 보이는 모습', true]]) {
        const b = document.createElement('button'); b.textContent = label; b.classList.toggle('on', v === asOthers);
        b.onclick = () => { asOthers = v; tg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); draw(); };
        tg.append(b);
      }
      box.append(tg);
    }
    draw();
    $('profileModal').hidden = false;
  });
  $('profileModal').addEventListener('click', (e) => { if (e.target === $('profileModal')) $('profileModal').hidden = true; });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('profileModal').hidden) $('profileModal').hidden = true; });

  // 0.17 💬 말풍선 채팅: 내가 보낸 건 오른쪽, 남이 보낸 건 왼쪽 (이름은 말풍선 위)
  // 같은 사람이 이어서 보내면(2분 안) 이름은 한 번만
  let lastFrom = null, lastAt = 0;
  const myName = () => (S?.session?.user?.username || '').toLowerCase();
  const isMine = (m) => !!(m.mine || m.pid === 'me' || (m.username && m.username.toLowerCase() === myName()));
  function chatShell(m, mine, inner, extraClass = '') {
    const div = document.createElement('div');
    div.className = 'msg ' + (mine ? 'mine' : 'theirs') + (extraClass ? ' ' + extraClass : '');
    const key = mine ? 'me' : (m.username || m.pid || m.from);
    const ts = m.ts || Date.now();
    if (key === lastFrom && ts - lastAt < 120_000) div.classList.add('cont');
    else if (!mine) { const head = document.createElement('div'); head.className = 'msg-head'; head.append(nameTag(m)); div.append(head); }
    lastFrom = key; lastAt = ts;
    const row = document.createElement('div'); row.className = 'msg-row';
    row.append(inner, timeTag(m.ts));
    div.append(row);
    return div;
  }
  function addMsg(m) {
    if (m.system) {
      const div = document.createElement('div');
      div.className = 'msg sys'; div.append(document.createTextNode(m.text), timeTag(m.ts));
      lastFrom = null;
      appendMsg(div);
      return;
    }
    const mine = isMine(m);
    const bub = document.createElement('div');
    if (m.emote) {   // 그림 이모티콘은 말풍선 없이 그림만
      bub.className = 'bubble emote-bubble';
      const img = document.createElement('img'); img.src = `assets/emotes/${m.emote}.png`; img.alt = '';
      bub.append(img);
    } else { bub.className = 'bubble'; bub.textContent = m.text; }
    appendMsg(chatShell(m, mine, bub));
  }
  function photoMsg(m, mine) {
    const img = document.createElement('img');
    img.className = 'chat-photo'; img.alt = '사진'; img.src = m.data;
    img.title = '눌러서 크게 보기';
    img.onclick = () => openPhoto(m.data, `${m.from || ''} · 이 방에서만 보여요`);
    img.onload = () => { const log = $('chatLog'); if (log.scrollHeight - log.scrollTop - log.clientHeight < 260) log.scrollTop = log.scrollHeight; };
    const bub = document.createElement('div'); bub.className = 'bubble photo-bubble'; bub.append(img);
    const div = chatShell(m, mine, bub, 'photo-msg');
    appendMsg(div);
    // 너무 많이 쌓이면 오래된 사진부터 빼기 (메모리)
    if (++photoN > PHOTO_KEEP) dropPhotos(photoN - PHOTO_KEEP);
    return div;
  }
  function appendMsg(div) {
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 30;
    log.append(div);
    if (atBottom) log.scrollTop = log.scrollHeight;    // 낚시 탭에도 같은 채팅을 보여 줌
    const flog = $('fishChatLog');
    if (flog) {
      const fb = flog.scrollHeight - flog.scrollTop - flog.clientHeight < 30;
      flog.append(div.cloneNode(true));
      while (flog.childElementCount > 120) flog.firstChild.remove();
      if (fb) flog.scrollTop = flog.scrollHeight;
    }
  }
  buddy.on('chat', (m) => { addMsg(m); if (m.pid && m.text && !m.emote) pets.get(m.pid)?.say(m.text); });   // 이모티콘은 말풍선 없이 그림만
  $('chatForm').onsubmit = (e) => {
    e.preventDefault();
    const t = $('chatInput').value.trim();
    if (t) buddy.send('send-chat', t);
    $('chatInput').value = '';
  };

  // ------------------------------------------------------------ 📷 방 안 사진 (0.15.1)
  // 서버에 저장하지 않아요: 지금 같은 방에 있는 사람에게만 바로 보이고, 방을 나가면 내 화면에서도 사진이 빠져요.
  const PHOTO_MAX = 360 * 1024, PHOTO_SIDE = 1280, PHOTO_KEEP = 30;
  let photoN = 0;
  // 보내기 전에 줄이기: 긴 변 1280px, JPEG 로 (투명한 부분은 흰색)
  async function shrinkPhoto(file) {
    if (!file || !/^image\//.test(file.type)) throw new Error('그림 파일만 보낼 수 있어요.');
    if (file.size > 40 * 1024 * 1024) throw new Error('사진 파일이 너무 커요. (40MB까지)');
    const bmp = await createImageBitmap(file);
    let side = PHOTO_SIDE;
    for (let tries = 0; tries < 6; tries++) {
      const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
      g.drawImage(bmp, 0, 0, w, h);
      for (const q of [0.85, 0.75, 0.62, 0.5]) {
        const data = c.toDataURL('image/jpeg', q);
        if (data.length <= PHOTO_MAX) { bmp.close?.(); return { data, w, h }; }
      }
      side = Math.round(side * 0.75);
    }
    bmp.close?.();
    throw new Error('사진을 충분히 줄이지 못했어요. 다른 사진으로 해 주세요.');
  }
  function dropPhotos(n = Infinity, why = '(지난 사진)') {
    for (const img of document.querySelectorAll('#chatLog img.chat-photo, #fishChatLog img.chat-photo')) {
      if (n-- <= 0) break;
      const note = document.createElement('span'); note.className = 'photo-gone'; note.textContent = `📷 ${why}`;
      img.replaceWith(note);
    }
    photoN = document.querySelectorAll('#chatLog img.chat-photo').length;
  }
  function openPhoto(src, cap) { $('photoBig').src = src; $('photoCap').textContent = cap; $('photoView').hidden = false; }
  $('photoView').onclick = () => { $('photoView').hidden = true; $('photoBig').removeAttribute('src'); };
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('photoView').hidden) $('photoView').click(); });
  function profileOf(id) {
    const p = pets.get(id)?.profile || (S?.peers || []).find((x) => x.id === id) || {};
    return { from: p.nickname, username: p.username, color: p.color, nameColor: p.nameColor, nameEffect: p.nameEffect };
  }
  // 0.17: 사진은 고르거나 붙여넣으면 바로 가지 않고, 입력칸 위에 올려 두었다가 [보내기]를 누르면 가요
  let pendingPhoto = null;
  function clearPending() { pendingPhoto = null; $('photoPending').hidden = true; $('photoPendImg').removeAttribute('src'); }
  async function stagePhoto(file) {
    if (!S?.room) { toast('방에 있을 때만 사진을 보낼 수 있어요. (내 집이나 친구 집)'); return; }
    let r;
    try { $('photoBtn').disabled = true; r = await shrinkPhoto(file); }
    catch (e) { toast(e.message || '사진을 열지 못했어요.'); return; }
    finally { $('photoBtn').disabled = false; }
    pendingPhoto = r;
    $('photoPendImg').src = r.data; $('photoPending').hidden = false;
    $('chatInput').focus();
  }
  function sendPending() {
    const r = pendingPhoto;
    if (!r) return false;
    if (!S?.room) { toast('방에 있을 때만 사진을 보낼 수 있어요. (내 집이나 친구 집)'); clearPending(); return false; }
    if (S.net !== 'online') { toast('서버와 연결돼 있을 때만 보낼 수 있어요.'); return false; }
    buddy.send('srv', { type: 'photo', data: r.data, w: r.w, h: r.h });
    const me = S.self || {};
    photoMsg({ from: me.nickname, username: S.session?.user?.username, color: me.color, nameColor: me.nameColor, nameEffect: S.session?.user?.nameEffect, data: r.data, ts: Date.now() }, true);
    pets.get('me')?.say('📷 사진');
    clearPending();
    return true;
  }
  $('photoPendX').onclick = clearPending;
  {
    const textSubmit = $('chatForm').onsubmit;
    $('chatForm').onsubmit = (e) => { e.preventDefault(); sendPending(); textSubmit(e); };
  }
  $('photoBtn').onclick = () => { $('photoFile').value = ''; $('photoFile').click(); };
  $('photoFile').onchange = () => { const f = $('photoFile').files[0]; if (f) stagePhoto(f); };
  // 붙여넣기 (캡처한 화면을 Ctrl+V)
  $('chatInput').addEventListener('paste', (e) => {
    const f = [...(e.clipboardData?.items || [])].find((it) => it.kind === 'file' && /^image\//.test(it.type))?.getAsFile();
    if (f) { e.preventDefault(); stagePhoto(f); }
  });
  // 채팅 칸에 끌어다 놓기
  const chatLogEl = $('chatLog');
  chatLogEl.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); chatLogEl.classList.add('drop-photo'); } });
  chatLogEl.addEventListener('dragleave', () => chatLogEl.classList.remove('drop-photo'));
  chatLogEl.addEventListener('drop', (e) => {
    chatLogEl.classList.remove('drop-photo');
    const f = [...(e.dataTransfer?.files || [])].find((x) => /^image\//.test(x.type));
    if (f) { e.preventDefault(); stagePhoto(f); }
  });
  buddy.on('srv', (m) => {
    if (m.type !== 'photo' || typeof m.data !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(m.data)) return;
    photoMsg({ ...profileOf(m.id), data: m.data, ts: m.ts || Date.now() }, false);
    pets.get(m.id)?.say('📷 사진');
  });
  if ($('fishChatForm')) {
    $('fishChatInput').addEventListener('keydown', (e) => e.stopPropagation());
    $('fishChatForm').onsubmit = (e) => {
      e.preventDefault();
      const t = $('fishChatInput').value.trim();
      if (t) buddy.send('send-chat', t);
      $('fishChatInput').value = '';
    };
  }
  document.querySelectorAll('[data-emote]').forEach((b) => {
    b.onclick = () => buddy.send('emote', { kind: b.dataset.emote });
    if (window.EmoteArt && EmoteArt.has(b.dataset.emote)) {   // 버튼도 이모지 글자 대신 그림 아이콘으로
      const img = document.createElement('img');
      img.src = `assets/emotes/${b.dataset.emote}.png`;
      img.style.cssText = 'height:26px;width:auto;vertical-align:middle;';
      b.textContent = ''; b.append(img);
    }
  });
  buddy.on('focus-chat', () => { document.querySelector('.tabs button[data-tab=chat]').click(); $('chatInput').focus(); });

  // 간식 나눠먹기: 둘 다 같이 먹는 모습
  buddy.on('snack', ({ from, to, icon }) => {
    const a = pets.get(from), b = pets.get(to);
    if (a && b) {
      a.emote(icon); a.happyT = 1;
      a.goTo(b.x + (a.x < b.x ? -34 : 34), b.y, () => { a.state = 'eat'; a.t = 1.6; a.dir = a.x < b.x ? 1 : -1; a.emote('😋'); });
      b.emote(icon); b.happyT = 1.4; setTimeout(() => b.emote('😋'), 700);
    } else (a || b)?.emote(icon);
  });
  const EMOTE_ICON = { wave: '👋', heart: '💖', cheer: '🎉', zzz: '💤', poke: '💥', bye: '🚶', good: '👍', dislike: '👎' };
  buddy.on('emote', ({ from, kind, target }) => {
    const pet = pets.get(target || from);
    if (!pet || (kind === 'poke' && from === 'me')) return;
    if (kind === 'poke') pet.hopT = 0.45;   // 누가 콕 찌르면 모두의 화면에서 폴짝
    if (window.EmoteArt && EmoteArt.has(kind)) {
      pet.emote(kind);   // 채팅 로그의 그림은 main.js 가 한 번만 남김 (예전엔 그림 줄 + 글자 줄이 둘 다 생겼음)
    } else if (EMOTE_ICON[kind]) pet.emote(EMOTE_ICON[kind]);
    pet.happyT = 0.6;
  });
  // 친구 캐릭터 위치 동기화: 그 친구 화면에서 보낸 자리를 그대로 따라감 (모두의 화면에서 같은 자리)
  buddy.on('peer-pos', ({ id, x, y, state, dir, inBed }) => {
    const pet = pets.get(id);
    if (!pet || pet.isMe) return;
    pet.target = { x, y, state, dir, inBed };
  });

  // ------------------------------------------------------------ 알림
  function toast(text, gain) {
    const d = document.createElement('div');
    d.className = 'toast' + (gain ? ' gain' : '');
    d.textContent = text;
    $('toasts').append(d);
    setTimeout(() => d.remove(), 3000);
    while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
  }
  buddy.on('toast', (t) => toast(t));
  buddy.on('reward', (r) => {
    const me = pets.get('me');
    if (r.reason === 'online') toast(`+${r.amount} 🪙 접속 보상`, true);
    else if (r.reason === 'chat') { toast(`+${r.amount} 🪙 대화 보상`, true); me?.emote('🪙'); }
    else if (r.reason === 'buy') toast(`구매 완료! (${r.amount} ${r.event ? catalog?.events?.[r.event]?.coin?.icon || '🎫' : '🪙'})`);
    else if (r.reason === 'event-coin') toast(`+${r.amount} ${(r.events || []).map((k) => catalog?.events?.[k]?.coin?.name ? `${catalog.events[k].coin.icon} ${catalog.events[k].coin.name}` : '').filter(Boolean).join(' · ')} 접속 보상`, true);
    else if (r.reason === 'gift-sent') toast(`🎁 ${r.to}님에게 🪙${-r.amount}을 선물했어요`);
    else if (r.reason === 'gift' || r.reason === 'admin') { me?.emote('🎁'); }
    else if (r.reason === 'skin') toast('캐릭터 그림을 바꿨어요!');
    else if (r.reason === 'expand') toast(`🏗️ ${r.name} 완료! 집이 넓어졌어요`, true);
    else if (r.reason === 'furn-sell') toast(`🛋️ ${catalog?.items?.[r.item]?.name || '가구'}을(를) 팔아서 ${r.event ? catalog?.events?.[r.event]?.coin?.icon || '🎫' : '🪙'}${r.amount.toLocaleString()}을 받았어요`, true);   // 0.17
    else if (r.reason === 'slot') toast(`💾 저장 슬롯을 한 칸 늘렸어요 (🪙${(-r.amount).toLocaleString()})`);
    else if (r.reason === 'pet-sell') toast(`🐾 '${r.name}'을(를) 되팔아서 🪙${r.amount}을 돌려받았어요`, true);
    else if (r.reason === 'snack-sent') toast(`${catalog?.foods[r.food]?.icon || '🍪'} ${r.to}님과 간식을 나눠 먹었어요!`);
    else if (r.reason === 'snack-got') me?.emote('😋');
    else if (r.reason === 'feed' || r.reason === 'levelup') {
      const food = catalog?.foods[r.food];
      if (me && food) {
        foodDrop = { icon: food.icon, x: clamp(me.x + 34, 30, RW - 30), y: me.y, t: 2 };
        me.goTo(foodDrop.x - 20, foodDrop.y, () => { me.state = 'eat'; me.t = 1.4; me.emote('😋'); });
      }
      if (r.reason === 'levelup') { toast(`⭐ 레벨 ${r.level} 달성! 보너스 코인`, true); setTimeout(() => me?.emote('⭐'), 1200); }
    }
  });

  // ------------------------------------------------------------ 상태 수신
  buddy.on('skins', (obj) => Skins.update(obj));
  buddy.invoke('get-skins').then((obj) => Skins.update(obj)).catch(() => {});
  buddy.on('home-state', (st) => {
    const roomChanged = S && ((S.room && S.room.code) !== (st.room && st.room.code));
    S = st;
    if (st.session) {
      catalog = st.session.catalog;
      const R = catalog.room;
      if (R && R.floors) { RH = R.h; FLOORS = R.floors; }
    }
    if (roomChanged && decorating) $('decoBtn').click();
    if (roomChanged && !MINI) { dropPhotos(Infinity, '(방을 나와서 사진은 안 보여요)'); clearPending(); }   // 📷 사진은 그 방에 있는 동안만
    $('offlineCover').hidden = st.net === 'online' || !st.session;
    $('offlineText').textContent = st.net === 'reconnecting' || st.net === 'connecting' ? '서버와 연결이 끊겼어요' : '오프라인이에요';
    const wasMeeting = document.body.classList.contains('meeting-mode');
    if (meetingMode() && !wasMeeting) enterMeetingLook();
    document.body.classList.toggle('meeting-mode', meetingMode());
    syncLayout();
    syncPets();
    renderPanels();
    if (window.HomeGame) HomeGame.onState(st);
    if (meetingMode()) renderMeetingBar();
    if (wasMeeting !== meetingMode()) setTimeout(fit, 0);
  });
  // 🏢 회의장에 들어가면: 채팅 탭만 남기고 열린 창 · 꾸미기 · 낚시를 모두 닫음
  function enterMeetingLook() {
    if (decorating) $('decoBtn').click();
    document.querySelector('.tabs button[data-tab=chat]')?.click();
    try { closeComputer(); } catch {}
    for (const el of document.querySelectorAll('.modal, .notice-modal')) el.hidden = true;
    if (aside.classList.contains('collapsed')) setCollapsed(false);
    mouse = null;
  }
  function renderMeetingBar() {
    const n = S.peers.length + 1;
    $('homeTitle').textContent = '🏢 운영자 회의장';
    $('roomBadge').className = 'badge on';
    $('roomBadge').textContent = `👥 ${n}명`;
    $('roomBadge').title = `회의장에 ${n}명이 있어요`;
    $('miniTitle').textContent = `🏢 회의장 · ${n}명`;
    $('chatHint').textContent = '🏢 회의장에서는 채팅만 할 수 있어요.';
    const mine = Object.entries(S.room.meeting.seats || {}).find(([, name]) => name === S.session?.user.username);
    $('meetSeat').textContent = mine ? `내 자리 ${mine[0]}번${mine[0] === '1' ? ' (대표)' : ''}` : '';
  }
  $('meetHomeBtn').onclick = () => buddy.send('open-my-room');
  $('settingsBtn').onclick = () => buddy.send('open-settings');
  $('allPetsBox').onchange = (e) => buddy.send('save-config', { showAllPets: e.target.checked });

  // ------------------------------------------------------------ 오른쪽 패널: 접기 · 넓이 조절 (이 컴퓨터에 기억)
  const aside = $('aside'), resizer = $('asideResizer');
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const MIN_W = 320, MAX_W = 640;
  function setAsideWidth(w) {
    w = Math.round(clamp(w, MIN_W, Math.min(MAX_W, innerWidth - 380)));
    document.documentElement.style.setProperty('--aside-w', w + 'px');
    return w;
  }
  function setCollapsed(c) {
    aside.classList.toggle('collapsed', c);
    resizer.classList.toggle('hidden', c);
    $('panelBtn').textContent = c ? '◀ 패널 열기' : '패널 닫기 ▶';
    store.set('asideCollapsed', c ? '1' : '0');
    setTimeout(fit, 200); // 방 그림 크기 다시 맞추기
  }
  setAsideWidth(Number(store.get('asideWidth')) || 420);
  setCollapsed(store.get('asideCollapsed') === '1');
  $('panelBtn').onclick = () => setCollapsed(!aside.classList.contains('collapsed'));
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); $('panelBtn').click(); }
  });
  // 다른 탭(채팅 등)을 누르면 접혀 있던 패널이 열림
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { if (aside.classList.contains('collapsed')) setCollapsed(false); }));
  let resizing = null;
  resizer.addEventListener('mousedown', (e) => {
    resizing = { x: e.clientX, w: aside.getBoundingClientRect().width };
    resizer.classList.add('drag'); document.body.classList.add('resizing');
    aside.style.transition = 'none';
    e.preventDefault();
  });
  addEventListener('mousemove', (e) => {
    if (!resizing) return;
    setAsideWidth(resizing.w + (resizing.x - e.clientX));
  });
  addEventListener('mouseup', () => {
    if (!resizing) return;
    resizing = null;
    resizer.classList.remove('drag'); document.body.classList.remove('resizing');
    aside.style.transition = '';
    store.set('asideWidth', Math.round(aside.getBoundingClientRect().width));
    fit();
  });
  resizer.addEventListener('dblclick', () => setCollapsed(true));

  // ------------------------------------------------------------ 업데이트 알림 띠
  function renderUpdate(u) {
    const bar = $('updateBar');
    if (!u || !['ready', 'manual', 'downloading'].includes(u.state)) { bar.hidden = true; return; }
    bar.hidden = false;
    if (u.state === 'downloading') { $('updateText').textContent = `🔄 새 버전을 받는 중이에요… ${u.percent || 0}%`; $('updateBtn').hidden = true; }
    if (u.state === 'ready') { $('updateText').textContent = `🔄 새 버전(v${u.version})이 준비됐어요. 다음에 껐다 켜면 바뀌어요.`; $('updateBtn').hidden = false; $('updateBtn').textContent = '지금 다시 시작'; $('updateBtn').onclick = () => buddy.send('update-install'); }
    if (u.state === 'manual') { $('updateText').textContent = `⬇️ 새 버전(v${u.version})이 나왔어요.`; $('updateBtn').hidden = false; $('updateBtn').textContent = '받으러 가기'; $('updateBtn').onclick = () => buddy.send('update-open'); }
  }
  buddy.on('update', renderUpdate);
  buddy.invoke('get-update').then(renderUpdate).catch(() => {});

  // ------------------------------------------------------------ 타이머 탭
  let timers = { timers: [], pin: false, miniPin: false, now: Date.now() };
  let tSkew = 0;
  const fmtT = (ms) => {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60;
    const two = (n) => String(n).padStart(2, '0');
    return h ? `${h}:${two(m)}:${two(x)}` : `${two(m)}:${two(x)}`;
  };
  const tLeft = (t) => (t.state === 'running' ? t.endsAt - (Date.now() + tSkew) : t.state === 'done' ? 0 : t.left);
  function renderTimers() {
    $('timerPinBox').checked = !!timers.pin;
    $('miniPinBox').checked = !!timers.miniPin;
    $('timerSoundBox').checked = timers.sound !== false;
    const ul = $('timerList'); ul.textContent = '';
    if (!timers.timers.length) { const li = document.createElement('li'); li.className = 'note'; li.textContent = '아직 타이머가 없어요. 위에서 만들어 보세요!'; ul.append(li); return; }
    for (const t of timers.timers) {
      const cmd = (op, extra) => buddy.send('timer-cmd', { op, id: t.id, ...extra });
      const multi = t.steps.length > 1;
      const plan = t.steps.map((x) => `${x.name} ${x.minutes}분`).join(' → ');
      const rep = t.repeat ? ` · 🔁 ${t.round}바퀴째${t.times ? `/${t.times}` : ''}` : '';
      const now = t.state === 'running' || t.state === 'paused' ? ` · 지금: ${t.stepName}${multi ? ` (${t.step + 1}/${t.steps.length})` : ''}${t.state === 'paused' ? ' 멈춤' : ''}` : t.state === 'done' ? ' · 끝!' : '';
      const buttons = [
        t.state === 'running' ? ['⏸', false, () => cmd('pause'), 'ghost small'] : ['▶', false, () => cmd('start'), 'primary small'],
      ];
      const titles = [t.state === 'running' ? '멈춤' : '시작'];
      if (multi) { buttons.push(['⏭', !(t.state === 'running' || t.state === 'paused'), () => cmd('skip'), 'ghost small']); titles.push('다음 단계로 건너뛰기'); }
      buttons.push(['↺', false, () => cmd('reset'), 'ghost small'], ['🔁', false, () => cmd('update', { repeat: !t.repeat }), t.repeat ? 'primary small' : 'ghost small'],
        ['🗑', false, () => { if (confirm(`'${t.name}' 타이머를 지울까요?`)) cmd('del'); }, 'ghost small']);
      titles.push('처음으로', '반복 켜기/끄기', '지우기');
      const icon = t.state === 'running' ? (/휴식|쉬/.test(t.stepName) ? '☕' : '⏳') : t.state === 'done' ? '✅' : '⏱️';
      const li = shopRow(icon, t.name, plan + rep + now, buttons);
      li.classList.add(t.state); li.dataset.id = t.id;
      const tm = document.createElement('span'); tm.className = 'tm'; tm.textContent = fmtT(tLeft(t));
      li.querySelector('.btns').before(tm);
      li.querySelectorAll('.btns button').forEach((b, i) => { b.title = titles[i]; });
      ul.append(li);
    }
  }
  setInterval(() => {
    for (const li of $('timerList').children) {
      const t = timers.timers.find((x) => x.id === li.dataset.id);
      if (t) li.querySelector('.tm').textContent = fmtT(tLeft(t));
    }
  }, 500);
  const gotTimers = (v) => { if (!v) return; timers = v; tSkew = v.now - Date.now(); renderTimers(); };
  buddy.on('timers', gotTimers);
  // 🗒 메모장 켜고 끄기 (화면 위에 떠 있는 작은 창)
  let stickyOn = false;
  const showSticky = () => { $('stickyBtn').classList.toggle('on', stickyOn); $('stickyBtn').textContent = stickyOn ? '🗒 메모장 끄기' : '🗒 메모장'; };
  buddy.on('timers', (t) => { if (t && 'stickyPin' in t) { stickyOn = !!t.stickyPin; showSticky(); } });
  buddy.invoke('get-timers').then((t) => { stickyOn = !!t?.stickyPin; showSticky(); }).catch(() => {});
  $('stickyBtn').onclick = () => { stickyOn = !stickyOn; showSticky(); buddy.send('sticky-pin', stickyOn); };
  buddy.invoke('get-timers').then(gotTimers).catch(() => {});
  // 단계 입력 줄 (이름 + 분)
  function stepRow(name = '', min = 25) {
    const row = document.createElement('div'); row.className = 'step-row';
    const no = document.createElement('span'); no.className = 'no';
    const nm = document.createElement('input'); nm.type = 'text'; nm.maxLength = 12; nm.placeholder = '단계 이름 (예: 공부)'; nm.value = name;
    const mn = document.createElement('input'); mn.type = 'number'; mn.min = 1; mn.max = 600; mn.value = min;
    const unit = document.createElement('span'); unit.className = 'note-inline'; unit.textContent = '분';
    const x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.title = '이 단계 빼기';
    x.onclick = () => { if ($('stepRows').children.length > 1) { row.remove(); numberSteps(); } };
    row.append(no, nm, mn, unit, x);
    return row;
  }
  function numberSteps() { [...$('stepRows').children].forEach((r, i) => { r.querySelector('.no').textContent = i + 1; }); }
  function resetStepForm() { $('stepRows').textContent = ''; $('stepRows').append(stepRow('공부', 50)); numberSteps(); }
  resetStepForm();
  $('addStepBtn').onclick = () => {
    if ($('stepRows').children.length >= 8) { toast('단계는 8개까지 넣을 수 있어요'); return; }
    $('stepRows').append(stepRow($('stepRows').children.length === 1 ? '휴식' : '', 10)); numberSteps();
  };
  $('timerForm').onsubmit = (e) => {
    e.preventDefault();
    const steps = [...$('stepRows').children].map((r) => ({ name: r.querySelector('input[type=text]').value.trim(), minutes: Math.round(Number(r.querySelector('input[type=number]').value)) }));
    if (steps.some((x) => !(x.minutes >= 1 && x.minutes <= 600))) { toast('시간은 1~600분 사이로 정해 주세요'); return; }
    buddy.send('timer-cmd', { op: 'add', name: $('timerName').value, steps, repeat: $('timerRepeat').checked, times: Number($('timerTimes').value) || 0 });
    $('timerName').value = ''; resetStepForm();
    toast('⏱️ 타이머를 만들었어요. ▶를 누르면 시작해요');
  };
  document.querySelectorAll('.timer-quick button').forEach((b) => {
    b.onclick = () => {
      const p = JSON.parse(b.dataset.preset);
      buddy.send('timer-cmd', { op: 'add', name: p.name, steps: p.steps.map(([name, minutes]) => ({ name, minutes })), repeat: p.repeat });
      toast(`⏱️ '${p.name}' 타이머를 만들었어요. ▶를 누르면 시작해요`);
    };
  });
  $('timerPinBox').onchange = (e) => buddy.send('timer-pin', e.target.checked);
  $('miniPinBox').onchange = (e) => buddy.send('mini-pin', e.target.checked);
  $('timerSoundBox').onchange = (e) => buddy.send('timer-sound', e.target.checked);
  $('timerTestBtn').onclick = () => buddy.send('timer-test');

  // home-game.js(낚시 · 펫 · 상점 등)가 쓰는 도구
  window.HomeCore = {
    get S() { return S; }, get catalog() { return catalog; }, get K() { return K; },
    get FLOORS() { return FLOORS; }, get RW() { return RW; }, get LADDER_X() { return LADDER_X; },
    viewing, toast, band, rand, clamp, shopRow, wallThumb, placeNew, findItem, geom, itemScale,
    me: () => pets.get('me'),
    charOf: (id) => pets.get(id),
    isMini: MINI,
    layout: () => layout,
    isDecorating: () => decorating,
  };

  buddy.invoke('get-chat').then((list) => { (list || []).forEach(addMsg); log.scrollTop = log.scrollHeight; });
  fit();
  showTheme();
  requestAnimationFrame(loop);
})();
