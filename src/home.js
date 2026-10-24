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
    const w = steps ? steps[lv].w : (catalog?.room?.w || 600);
    if (w !== RW) { RW = w; LADDER_X = RW - 44; fit(); }
  }
  new ResizeObserver(fit).observe($('stage'));
  function toRoom(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (RW / r.width), y: (e.clientY - r.top) * (RH / r.height) };
  }

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
    drawLabels() {
      const crown = showCrown(this.profile.username) ? '👑 ' : '';
      const name = crown + this.profile.nickname, tail = this.profile.status ? ' · ' + this.profile.status : '';
      const line2 = this.profile.username ? '@' + this.profile.username : '';
      const top = pill([name, tail], line2, this.x, this.y - PET_H - 6, this.isMe, this.profile) - 4;
      if (this.bubble) bubble(this.bubble.text, this.x, top);
      this.emotes.forEach((e, i) => {
        ctx.globalAlpha = Math.min(1, e.t * 2);
        ctx.font = `24px ${EMOJI_FONT}`; ctx.textAlign = 'center';
        ctx.fillText(e.icon, this.x + 24 + i * 6, this.y - PET_H - 4 - (1.8 - e.t) * 26);
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
  function pill(text, sub, cx, bottom, mine, profile) {
    const [name, tail] = Array.isArray(text) ? text : [text, ''];
    text = name + tail;
    ctx.font = `600 11px ${FONT}`;
    let w = ctx.measureText(text).width;
    if (sub) { ctx.font = `10px ${FONT}`; w = Math.max(w, ctx.measureText(sub).width); }
    w = Math.min(200, w) + 14;
    const h = sub ? 29 : 18;
    const x = Math.round(clamp(cx - w / 2, 2, RW - w - 2)), y = Math.round(bottom - h);
    ctx.fillStyle = mine ? 'rgba(30,30,40,0.72)' : 'rgba(40,60,110,0.82)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 9); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const t = performance.now() / 1000;
    ctx.font = `600 11px ${FONT}`;
    NickFX.drawNameLine(ctx, name, tail, x + w / 2, y + (sub ? 10 : h / 2 + 0.5), w - 10, profile, t);
    if (sub) { ctx.font = `10px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.fillText(sub, x + w / 2, y + 21, w - 10); }
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
    Furniture.drawFloorArea(ctx, home.wall2 || 'basic', 0, FLOORS[2].top, RW, FLOORS[2].wall, FLOORS[2].bottom, 7);
    Furniture.drawFloorArea(ctx, home.wall1 || 'basic', 0, FLOORS[1].top, RW, FLOORS[1].wall, FLOORS[1].bottom, 3);
    // 층 사이 바닥판
    const slabTop = FLOORS[2].bottom, slabH = FLOORS[1].top - FLOORS[2].bottom;
    ctx.fillStyle = '#5c3a26'; ctx.fillRect(0, slabTop, RW, slabH);
    ctx.fillStyle = '#7a4b28'; ctx.fillRect(0, slabTop, RW, 2);
    // 사다리 (2층 바닥 ~ 1층 바닥)
    const x = LADDER_X, top = ladderY(2) - 4, bot = ladderY(1) + 14;
    ctx.fillStyle = '#3b2a25'; ctx.fillRect(x - 18, top, 36, slabH + 4);              // 바닥판 구멍
    ctx.fillStyle = '#a8703f';
    ctx.fillRect(x - 16, top, 5, bot - top); ctx.fillRect(x + 11, top, 5, bot - top);
    for (let y = top + 10; y < bot - 4; y += 16) ctx.fillRect(x - 11, y, 22, 4);
    ctx.fillStyle = '#7a4b28';
    ctx.fillRect(x - 12, top, 1, bot - top); ctx.fillRect(x + 15, top, 1, bot - top);
  }

  // 가구 크기 · 회전 중심
  function geom(it) {
    const sz = Furniture.size(it.item, itemScale(it.item));
    return { cx: it.x, cy: it.y - sz.h / 2, w: sz.w, h: sz.h, r: Math.max(sz.w, sz.h) / 2 };
  }
  function drawItem(it) {
    const g = geom(it);
    const def = catalog.items[it.item] || {};
    if (!def.wall && it.item !== 'rug') {
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
  function drawDarkness() {
    const v = viewing();
    if (!v || ![1, 2].some((f) => !lightOn(v.home, f))) return;
    const dc = darkCanvas;
    if (dc.width !== RW) { dc.width = RW; dc.height = RH; }
    const g = dc.getContext('2d');
    g.clearRect(0, 0, RW, RH);
    g.globalCompositeOperation = 'source-over';
    for (const f of [1, 2]) {
      const theme = Furniture.THEMES[v.home['wall' + f]] || Furniture.THEMES.basic;
      if (theme.kind !== 'room' || lightOn(v.home, f)) continue;
      g.fillStyle = 'rgba(10,12,32,0.62)';
      g.fillRect(0, FLOORS[f].top, RW, FLOORS[f].bottom - FLOORS[f].top);
    }
    g.globalCompositeOperation = 'destination-out';
    for (const it of layout) {
      if (lightOn(v.home, floorOf(it.y))) continue;
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
      g.fillStyle = grad;
      g.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(dc, 0, 0, RW, RH);
  }

  // 낚시터에 있으면 집 그림 자리에 큰 낚시터를 그림 (미니맵도 같음)
  const fishingMode = () => !!(window.HomeGame && HomeGame.fishingActive());
  function render() {
    ctx.setTransform(K, 0, 0, K, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, RW, RH);
    if (!catalog) return;
    if (fishingMode()) { HomeGame.drawFishing(ctx, RW, RH, MINI); return; }
    drawHouse();
    const flat = layout.filter((it) => it.item === 'rug');
    flat.forEach(drawItem);
    const things = layout.filter((it) => it.item !== 'rug').map((it) => ({ y: it.y, draw: () => drawItem(it) }));
    for (const p of pets.values()) things.push({ y: p.sortY(), draw: () => p.draw() });
    if (foodDrop) things.push({ y: foodDrop.y, draw: () => { ctx.font = `26px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.fillText(foodDrop.icon, foodDrop.x, foodDrop.y); } });
    if (window.HomeGame) HomeGame.addThings(ctx, things);   // 키우는 동물
    things.sort((a, b) => a.y - b.y).forEach((t) => t.draw());
    drawDarkness();
    for (const p of pets.values()) p.drawLabels();
  }

  let last = performance.now();
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    for (const p of pets.values()) p.update(dt);
    if (window.HomeGame) HomeGame.update(dt);
    if (foodDrop && (foodDrop.t -= dt) <= 0) foodDrop = null;
    render();
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------ 마우스
  function itemAt(p) {
    for (let i = layout.length - 1; i >= 0; i--) {
      const g = geom(layout[i]);
      if (Math.abs(p.x - g.cx) <= g.w / 2 + 3 && Math.abs(p.y - g.cy) <= g.h / 2 + 3) return layout[i];
    }
    return null;
  }
  const petAt = (p) => [...pets.values()].reverse().find((x) => x.hit(p));
  let saveTimer = null;
  function saveLayout(now = false) {
    clearTimeout(saveTimer);
    const go = () => buddy.send('place', layout.map(({ item, x, y, rot, flip, uid }) => ({ item, x, y, rot: rot || 0, flip: !!flip, ...(uid ? { uid } : {}) })));
    if (now) go(); else saveTimer = setTimeout(go, 350);
  }

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
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
      mouse.item.x = Math.round(clamp(p.x - mouse.ox, 10, RW - 10));
      mouse.item.y = Math.round(clamp(p.y - mouse.oy, 40, RH - 4));
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
      else { pet.emote('💥'); buddy.send('poke', { target: pet.id }); }
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
    if (decorating) return;
    const pet = petAt(toRoom(e));
    if (pet) buddy.send('char-menu', { id: pet.id });   // 내 캐릭터: 자세 · 상태 메뉴, 친구: 간식 · 대결 메뉴
  });
  canvas.addEventListener('wheel', (e) => {
    if (!decorating) return;
    const it = itemAt(toRoom(e)) || selected;
    if (!it) return;
    e.preventDefault();
    selected = it;
    it.rot = (((it.rot || 0) + (e.deltaY > 0 ? 15 : -15)) % 360 + 360) % 360;
    renderSel(); saveLayout();
  }, { passive: false });

  // ------------------------------------------------------------ 가구 회전 · 뒤집기 · 넣기
  function renderSel() {
    $('selBar').hidden = !(decorating && selected);
    if (!selected || !catalog) return;
    const def = catalog.items[selected.item];
    $('selName').textContent = def ? def.name : selected.item;
    $('rotRange').value = selected.rot || 0;
    $('rotVal').textContent = (selected.rot || 0) + '°';
    $('bagBtn').hidden = !!(def && def.required);
  }
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
    if (!decorating) selected = null;
    if (decorating) { closeComputer(); $('friends').hidden = true; }
    renderSel();
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
  };
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
    const u = S.session.user;
    const def = catalog.items[id];
    layout = u.home.items.map((x) => ({ ...x }));
    const fl = FLOORS[floor];
    const y = def.wall ? Math.round(fl.top + (fl.wall - fl.top) * 0.6) : Math.round(rand(band(floor).min + 10, band(floor).max));
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
  function addMsg(m) {
    const div = document.createElement('div');
    if (m.system) { div.className = 'msg sys'; div.append(document.createTextNode(m.text), timeTag(m.ts)); }
    else {
      div.className = 'msg';
      const b = document.createElement('b'); b.textContent = m.from; b.style.marginRight = '3px';
      b.className = NickFX.domClass(m); b.style.cssText += ';' + NickFX.domStyle(m, m.color);
      const id = document.createElement('small'); id.textContent = m.username ? '@' + m.username : '';
      div.append(b, id, document.createTextNode(m.text), timeTag(m.ts));
    }
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
  buddy.on('chat', (m) => { addMsg(m); if (m.pid) pets.get(m.pid)?.say(m.text); });
  $('chatForm').onsubmit = (e) => {
    e.preventDefault();
    const t = $('chatInput').value.trim();
    if (t) buddy.send('send-chat', t);
    $('chatInput').value = '';
  };
  if ($('fishChatForm')) {
    $('fishChatInput').addEventListener('keydown', (e) => e.stopPropagation());
    $('fishChatForm').onsubmit = (e) => {
      e.preventDefault();
      const t = $('fishChatInput').value.trim();
      if (t) buddy.send('send-chat', t);
      $('fishChatInput').value = '';
    };
  }
  document.querySelectorAll('[data-emote]').forEach((b) => { b.onclick = () => buddy.send('emote', { kind: b.dataset.emote }); });
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
  const EMOTE_ICON = { wave: '👋', heart: '💖', cheer: '🎉', zzz: '💤', poke: '💥' };
  buddy.on('emote', ({ from, kind, target }) => {
    const pet = pets.get(target || from);
    if (!pet || (kind === 'poke' && from === 'me')) return;
    if (kind === 'poke') pet.hopT = 0.45;   // 누가 콕 찌르면 모두의 화면에서 폴짝
    if (EMOTE_ICON[kind]) pet.emote(EMOTE_ICON[kind]);
    pet.happyT = 0.6;
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
    $('offlineCover').hidden = st.net === 'online' || !st.session;
    $('offlineText').textContent = st.net === 'reconnecting' || st.net === 'connecting' ? '서버와 연결이 끊겼어요' : '오프라인이에요';
    syncLayout();
    syncPets();
    renderPanels();
    if (window.HomeGame) HomeGame.onState(st);
  });
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
