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
    const box = $('stage').getBoundingClientRect();
    const side = Math.max(200, Math.floor(Math.min(box.width, box.height)));
    const dpr = devicePixelRatio || 1;
    const px = Math.round(side * dpr);
    canvas.style.width = side + 'px';
    canvas.style.height = side + 'px';
    if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
    K = px / RW;
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
    const v = viewing();
    const selIdx = selected ? layout.indexOf(selected) : -1;
    layout = v ? v.home.items.map((it) => ({ rot: 0, ...it })) : [];
    selected = selIdx >= 0 && layout[selIdx] ? layout[selIdx] : null;
    renderSel();
  }
  const findItem = (id) => layout.find((it) => it.item === id);
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
    setProfile(p) { this.profile = p; this.pal = Sprites.palette(p.color); }
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
      this.state = 'walk'; this.onArrive = cb || null;
    }
    emote(icon) { this.emotes.push({ icon, t: 1.8 }); if (this.emotes.length > 4) this.emotes.shift(); }
    say(text) { this.bubble = { text, t: Math.min(12, 4 + text.length * 0.12) }; }
    update(dt) {
      this.anim += dt;
      this.happyT = Math.max(0, this.happyT - dt);
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
        const bed = findItem('bed');
        if (r < 0.1 && bed) this.goTo(bed.x, bed.y - 16, () => { this.state = 'sleep'; this.t = rand(8, 16); });
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
      if (this.state === 'sleep') { const bed = findItem('bed'); if (bed) return bed.y + 1; }
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
      const bob = legs === 'walkB' ? -2 : 0;
      if (this.state !== 'climb') {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(this.x, this.y - 1, 17, 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      const skin = Skins.get(this.profile.username, this.profile.skin);
      this.dw = 0;
      if (skin) {
        const pose = legs === 'sit' ? 'sit' : legs.startsWith('walk') ? 'walk' : 'stand';
        const tilt = pose === 'walk' ? (legs === 'walkB' ? 0.07 : -0.07) : (this.dragging ? Math.sin(this.anim * 12) * 0.12 : 0);
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
      const line1 = this.profile.nickname + (this.profile.status ? ' · ' + this.profile.status : '');
      const line2 = this.profile.username ? '@' + this.profile.username : '';
      const top = pill(line1, line2, this.x, this.y - PET_H - 6, this.isMe) - 4;
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
  function pill(text, sub, cx, bottom, mine) {
    ctx.font = `600 11px ${FONT}`;
    let w = ctx.measureText(text).width;
    if (sub) { ctx.font = `10px ${FONT}`; w = Math.max(w, ctx.measureText(sub).width); }
    w = Math.min(200, w) + 14;
    const h = sub ? 29 : 18;
    const x = Math.round(clamp(cx - w / 2, 2, RW - w - 2)), y = Math.round(bottom - h);
    ctx.fillStyle = mine ? 'rgba(30,30,40,0.72)' : 'rgba(40,60,110,0.82)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 9); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.font = `600 11px ${FONT}`;
    ctx.fillText(text, x + w / 2, y + (sub ? 10 : h / 2 + 0.5), w - 10);
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
  function drawDarkness() {
    const v = viewing();
    if (!v || v.home.light !== false) return;
    const dc = darkCanvas;
    if (dc.width !== RW) { dc.width = RW; dc.height = RH; }
    const g = dc.getContext('2d');
    g.clearRect(0, 0, RW, RH);
    g.globalCompositeOperation = 'source-over';
    for (const f of [1, 2]) {
      const theme = Furniture.THEMES[v.home['wall' + f]] || Furniture.THEMES.basic;
      if (theme.kind !== 'room') continue;
      g.fillStyle = 'rgba(10,12,32,0.62)';
      g.fillRect(0, FLOORS[f].top, RW, FLOORS[f].bottom - FLOORS[f].top);
    }
    g.globalCompositeOperation = 'destination-out';
    for (const it of layout) {
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
      const hov = decorating ? itemAt(p) : (petAt(p) || itemAt(p)?.item === 'computer');
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
      if (pet.isMe) { buddy.send('pat'); pet.emote('💗'); }
      else { pet.emote('💥'); buddy.send('poke', { target: pet.id }); }
      return;
    }
    if (m.kind === 'click' && e.target === canvas) {
      const p = toRoom(e);
      if (window.HomeGame && HomeGame.onClick(p)) return;   // 동물 쓰다듬기
      const it = itemAt(p);
      if (it && it.item === 'computer') { goDesk(); return; }
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
    if (pet && !pet.isMe) buddy.send('char-menu', { id: pet.id });
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
    const nm = document.createElement('b'); nm.textContent = p.nickname;
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
    $('friendDot').hidden = !F.incoming.length;
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
        let action;
        if (here === f.username) { st.textContent = '같이 있어요'; st.classList.add('open'); }
        else if (!f.online) st.textContent = '오프라인';
        else if (!f.hosting) st.textContent = '집 비움';
        else if (f.open) { st.textContent = `🚪 문 열림 · ${f.count}명`; st.classList.add('open'); action = btn('놀러가기', 'primary small', () => buddy.send('visit', f.username)); }
        else { st.textContent = `🔒 문 닫힘 · ${f.count}명`; action = btn('똑똑', 'ghost small', () => buddy.send('knock', f.username)); }
        li.append(st);
        if (action) li.append(action);
        li.append(btn('🎁', 'ghost small', () => { giftOpen = giftOpen === f.username ? null : f.username; renderFriends(); }, false, '코인 선물'));
        li.append(btn('🐋', 'ghost small', () => window.HomeGame && HomeGame.openAquarium(f.username), false, '아쿠아리움 구경'));
        li.append(btn('✕', 'x', () => { if (confirm(`${f.nickname}(@${f.username})님을 친구에서 삭제할까요?`)) buddy.send('friend-remove', f.username); }, false, '친구 삭제'));
        li.append(btn('🚫', 'x', () => { if (confirm(`${f.nickname}(@${f.username})님을 차단할까요?\n채팅이 안 보이고, 내 집에 못 오고, 친구에서도 빠져요.`)) buddy.send('srv', { type: 'block', username: f.username }); }, false, '차단'));
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
    if (k) $('knockText').textContent = `${k.nickname}(@${k.username})님이 문을 두드려요`;
  }
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
  $('lightBtn').onclick = () => {
    const v = viewing();
    if (!v || !v.editable) { toast('불은 집주인만 켜고 끌 수 있어요'); return; }
    buddy.send('light', v.home.light === false);
  };
  const THEME_ICON = { system: '🖥️', light: '☀️', dark: '🌙' };
  const THEME_NEXT = { system: 'light', light: 'dark', dark: 'system' };
  const THEME_NAME = { system: '컴퓨터 설정 따라가기', light: '화이트 모드', dark: '다크 모드' };
  const showTheme = () => { const t = window.buddyTheme || 'system'; $('themeBtn').textContent = THEME_ICON[t] + ' 화면'; $('themeBtn').title = '화면 모드: ' + THEME_NAME[t]; };
  document.addEventListener('buddy-theme', showTheme);
  $('themeBtn').onclick = () => { const next = THEME_NEXT[window.buddyTheme || 'system']; buddy.send('set-theme', next); toast(THEME_NAME[next]); };

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
    if (S.room) { badge.className = 'badge on'; badge.textContent = `${S.peers.length + 1}명${S.room.locked ? ' · 🔒' : ' · 🚪 열림'}`; }
    else { badge.className = 'badge off'; badge.textContent = '혼자 놀기'; }
    const lightOn = v.home.light !== false;
    $('lightBtn').textContent = lightOn ? '💡 불 끄기' : '💡 불 켜기';
    $('lightBtn').classList.toggle('off', !v.editable);

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
  function addMsg(m) {
    const div = document.createElement('div');
    if (m.system) { div.className = 'msg sys'; div.textContent = m.text; }
    else {
      div.className = 'msg';
      const b = document.createElement('b'); b.textContent = m.from; b.style.color = m.color || 'inherit'; b.style.marginRight = '3px';
      const id = document.createElement('small'); id.textContent = m.username ? '@' + m.username : '';
      div.append(b, id, document.createTextNode(m.text));
    }
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 30;
    log.append(div);
    if (atBottom) log.scrollTop = log.scrollHeight;
  }
  buddy.on('chat', (m) => { addMsg(m); if (m.pid) pets.get(m.pid)?.say(m.text); });
  $('chatForm').onsubmit = (e) => {
    e.preventDefault();
    const t = $('chatInput').value.trim();
    if (t) buddy.send('send-chat', t);
    $('chatInput').value = '';
  };
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
    else if (r.reason === 'buy') toast(`구매 완료! (${r.amount} 🪙)`);
    else if (r.reason === 'gift-sent') toast(`🎁 ${r.to}님에게 🪙${-r.amount}을 선물했어요`);
    else if (r.reason === 'gift' || r.reason === 'admin') { me?.emote('🎁'); }
    else if (r.reason === 'skin') toast('캐릭터 그림을 바꿨어요!');
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
      if (R && R.floors) { RW = R.w; RH = R.h; FLOORS = R.floors; LADDER_X = R.ladderX; }
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
      const sub = `${t.minutes}분${t.repeat ? ` · 🔁 반복 (${t.round}번째)` : ''}${t.state === 'paused' ? ' · 멈춤' : t.state === 'done' ? ' · 끝!' : t.state === 'running' ? ' · 진행 중' : ''}`;
      const li = shopRow(t.state === 'running' ? '⏳' : t.state === 'done' ? '✅' : '⏱️', t.name, sub, [
        t.state === 'running' ? ['⏸', false, () => cmd('pause'), 'ghost small'] : ['▶', false, () => cmd('start'), 'primary small'],
        ['↺', false, () => cmd('reset'), 'ghost small'],
        ['🔁', false, () => cmd('update', { repeat: !t.repeat }), t.repeat ? 'primary small' : 'ghost small'],
        ['🗑', false, () => { if (confirm(`'${t.name}' 타이머를 지울까요?`)) cmd('del'); }, 'ghost small'],
      ]);
      li.classList.add(t.state); li.dataset.id = t.id;
      const tm = document.createElement('span'); tm.className = 'tm'; tm.textContent = fmtT(tLeft(t));
      li.querySelector('.btns').before(tm);
      li.querySelectorAll('.btns button').forEach((b, i) => { b.title = [t.state === 'running' ? '멈춤' : '시작', '처음으로', '반복 켜기/끄기', '지우기'][i]; });
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
  buddy.invoke('get-timers').then(gotTimers).catch(() => {});
  $('timerForm').onsubmit = (e) => {
    e.preventDefault();
    const minutes = Math.round(Number($('timerMin').value));
    if (!(minutes >= 1 && minutes <= 600)) { toast('1~600분 사이로 정해 주세요'); return; }
    buddy.send('timer-cmd', { op: 'add', name: $('timerName').value, minutes, repeat: $('timerRepeat').checked });
    $('timerName').value = '';
    toast('⏱️ 타이머를 만들었어요. ▶를 누르면 시작해요');
  };
  document.querySelectorAll('.timer-quick button').forEach((b) => {
    b.onclick = () => { const [m, n, r] = b.dataset.q.split('|'); buddy.send('timer-cmd', { op: 'add', name: n, minutes: Number(m), repeat: r === '1' }); };
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
