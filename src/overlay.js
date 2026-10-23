// 오버레이: 캐릭터 물리, 행동, 그리기, 마우스 상호작용
(() => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  let W = innerWidth, H = innerHeight, DPR = devicePixelRatio || 1;

  const G = 2200;          // 중력 (px/s²)
  const WALK = 110;        // 걷는 속도 (px/s)
  const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif';

  let floorY = H - 40;
  let cfg = { petScale: 3, occlusion: true, hideOthers: false, showPetsDesktop: true };
  let rawWindows = [];
  let platforms = [];
  const pets = new Map();

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function resize() {
    W = innerWidth; H = innerHeight; DPR = devicePixelRatio || 1;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    rebuildPlatforms();
  }
  addEventListener('resize', resize);

  // ------------------------------------------------------------ 발판(바닥 + 지정한 창 윗면)
  function subtract(parts, a, b) {
    const out = [];
    for (const [x1, x2] of parts) {
      if (b <= x1 || a >= x2) { out.push([x1, x2]); continue; }
      if (a > x1) out.push([x1, a]);
      if (b < x2) out.push([b, x2]);
    }
    return out;
  }

  function rebuildPlatforms() {
    const segs = [{ winId: 'floor', x1: 0, x2: W, y: floorY, wx: 0, wy: floorY }];
    rawWindows.forEach((w, i) => {
      if (!w.target) return;
      const y = w.y;
      if (y < 60 || y > floorY - 30) return; // 화면 맨 위(최대화)나 바닥 근처는 제외
      let parts = [[Math.max(0, w.x), Math.min(W, w.x + w.w)]];
      if (cfg.occlusion) {
        // 앞쪽에 있는 창(목록에서 더 앞)에 가려진 부분은 밟을 수 없음
        for (let j = 0; j < i; j++) {
          const o = rawWindows[j];
          if (y >= o.y && y <= o.y + o.h) parts = subtract(parts, o.x, o.x + o.w);
        }
      }
      for (const [a, b] of parts) {
        if (b - a >= 30) segs.push({ winId: w.id, x1: a, x2: b, y, wx: w.x, wy: w.y });
      }
    });
    segs.sort((a, b) => a.y - b.y);
    platforms = segs;

    // 창이 움직이면 그 위에 선 캐릭터도 같이 이동
    const tNow = performance.now();
    for (const pet of pets.values()) {
      if (pet.dragging || pet.air) continue;               // 잡고 있는 동안은 건드리지 않음
      if (pet.platWin === 'floor') { pet.y = floorY; continue; }
      const seg = platforms.find((s) => s.winId === pet.platWin);
      if (!seg) { pet.fall(); continue; }
      const dx = seg.wx - pet.wx, dy = seg.wy - pet.wy;
      const dt = Math.max(0.05, (tNow - (pet.lastFollow || tNow - 250)) / 1000);
      pet.lastFollow = tNow;
      pet.x += dx; pet.y += dy;
      pet.wx = seg.wx; pet.wy = seg.wy;
      // 창 흔들기: 짧은 시간에 많이 움직이거나 방향이 자주 바뀌면 떨어짐
      const move = Math.abs(dx) + Math.abs(dy);
      pet.shake = (pet.shake || 0) * Math.pow(0.25, dt) + move;
      const flip = dx !== 0 && pet.lastDx && Math.sign(dx) !== Math.sign(pet.lastDx);
      if (dx !== 0) pet.lastDx = dx;
      pet.flips = (pet.flips || 0) * Math.pow(0.3, dt) + (flip ? 1 : 0);
      if (move / dt > 3000 || (pet.flips > 2.2 && pet.shake > 250)) { // 확 끌거나, 좌우로 흔들면
        pet.shake = 0; pet.flips = 0;
        // 흔든 창에는 잠깐 다시 못 올라가게 해서 진짜로 떨어지게
        pet.noLandWin = seg.winId; pet.noLandUntil = tNow + 1200;
        const vx = clamp(dx / dt * 0.6, -900, 900);
        pet.fall(Math.abs(vx) < 150 ? (Math.random() < 0.5 ? -220 : 220) : vx, Math.min(0, dy / dt * 0.5) - 260);
        pet.emote('😵');
        continue;
      }
      if (!pet.currentSeg()) pet.fall();
    }
  }

  // ------------------------------------------------------------ 캐릭터
  class Pet {
    constructor(id, profile) {
      this.id = id;
      this.isMe = id === 'me';
      this.profile = { nickname: '', color: '#f2a65a', status: '' };
      this.x = rand(80, Math.max(120, W - 80));
      this.y = 0;
      this.vx = 0; this.vy = 0;
      this.air = true;
      this.dragging = false;
      this.dir = Math.random() < 0.5 ? -1 : 1;
      this.state = 'fall';
      this.stateT = 0;
      this.anim = 0;
      this.blinkT = rand(1, 4);
      this.happyT = 0;
      this.platWin = 'floor'; this.wx = 0; this.wy = floorY;
      this.bubble = null;      // { text, t }
      this.emotes = [];        // { icon, t, max }
      this.setProfile(profile);
    }
    setProfile(p) {
      const before = this.profile.pose;
      this.profile = { ...this.profile, ...p };
      this.pal = Sprites.palette(this.profile.color);
      // 자세를 바꾸면 바로 그 자세로 (공중에 있으면 내려온 뒤에)
      if (this.profile.pose !== before && !this.air && !this.dragging) this.think();
    }
    // 우클릭 → 자세에서 고른 자세 (없으면 null = 자유롭게)
    forcedState() { return { stand: 'idle', sit: 'sit', lie: 'sleep' }[this.profile.pose] || null; }
    get s() { return cfg.petScale; }
    get w() { return 16 * this.s; }
    get h() { return 16 * this.s; }

    currentSeg() {
      return platforms.find((s) => s.winId === this.platWin && this.x >= s.x1 - 1 && this.x <= s.x2 + 1);
    }
    setState(st, t) { this.state = st; this.stateT = t; }
    fall(vx = 0, vy = 0) { this.air = true; this.vx = vx; this.vy = vy; this.setState('fall', 0); }

    land(seg) {
      const impact = this.vy;
      this.air = false; this.vx = 0; this.vy = 0;
      this.y = seg.y;
      this.platWin = seg.winId; this.wx = seg.wx; this.wy = seg.wy;
      if (impact > 1500) this.emote('💫');
      this.setState('land', impact > 900 ? 0.35 : 0.15);
    }

    // 상태(공부중/게임중 등)에 따라 행동 성향이 조금 달라짐
    mood() {
      const st = (this.profile.status || '').toLowerCase();
      if (/공부|study|독서/.test(st)) return { walk: 2, idle: 2, sit: 6, sleep: 1, jump: 1 };
      if (/게임|game/.test(st)) return { walk: 4, idle: 1, sit: 1, sleep: 0.5, jump: 4 };
      if (/휴식|자리비움|afk|졸/.test(st)) return { walk: 1, idle: 2, sit: 2, sleep: 6, jump: 0.5 };
      if (/코딩|작업|work/.test(st)) return { walk: 2, idle: 2, sit: 5, sleep: 0.5, jump: 1 };
      return { walk: 4, idle: 2, sit: 2, sleep: 1, jump: 2 };
    }

    think() {
      const forced = this.forcedState();
      if (forced) { this.pendingJump = null; this.setState(forced, 3); return; }
      const m = { ...this.mood() };
      // 올라갈 창이 있으면 바닥에서 점프를 더 자주, 창 위에선 더 오래 머묾
      if (platforms.length > 1) {
        if (this.platWin === 'floor') m.jump += 3; else { m.jump *= 0.5; m.sit += 1; }
      }
      if (this.state === 'sleep' && Math.random() < 0.4) { this.setState('sleep', rand(6, 14)); return; }
      const total = m.walk + m.idle + m.sit + m.sleep + m.jump;
      let r = Math.random() * total;
      if ((r -= m.walk) < 0) { this.dir = Math.random() < 0.5 ? -1 : 1; this.setState('walk', rand(1.5, 5)); return; }
      if ((r -= m.idle) < 0) { this.setState('idle', rand(1.5, 4)); return; }
      if ((r -= m.sit) < 0) { this.setState('sit', rand(3, 9)); return; }
      if ((r -= m.sleep) < 0) { this.setState('sleep', rand(8, 18)); return; }
      if (!this.tryJump()) this.setState('walk', rand(1.5, 4));
    }

    // 다른 발판(창 위 또는 바닥)으로 점프
    tryJump() {
      const cands = platforms.filter((s) => {
        if (s.winId === this.platWin) return false;
        if (s.x2 - s.x1 < 50) return false;
        const dy = this.y - s.y;
        const dx = Math.min(Math.abs(s.x1 - this.x), Math.abs(s.x2 - this.x));
        return dy < 850 && dy > -900 && dx < 600;
      });
      if (!cands.length) return false;
      const seg = cands[Math.floor(Math.random() * cands.length)];
      const tx = rand(seg.x1 + 15, seg.x2 - 15);
      const hgt = Math.max(60, this.y - seg.y + 60);
      const vy0 = -Math.sqrt(2 * G * hgt);
      const a = 0.5 * G, b = vy0, c = this.y - seg.y;
      const disc = b * b - 4 * a * c;
      if (disc < 0) return false;
      const t = (-b + Math.sqrt(disc)) / (2 * a);
      const vx = (tx - this.x) / t;
      if (Math.abs(vx) > 650) return false;
      this.dir = vx >= 0 ? 1 : -1;
      this.pendingJump = { vx, vy: vy0 };
      this.setState('crouch', 0.25);
      return true;
    }

    say(text) {
      this.bubble = { text, t: Math.min(12, 4 + text.length * 0.12) };
    }
    emote(icon) {
      this.emotes.push({ icon, t: 1.8, max: 1.8, dx: rand(-8, 8) });
      if (this.emotes.length > 4) this.emotes.shift();
    }
    hop(power = 520) {
      if (this.dragging) return;
      this.fall(rand(-40, 40), -power);
    }

    update(dt) {
      this.anim += dt;
      if (this.isMe && (this.profile.hungry || this.profile.sad)) {
        this.needT = (this.needT ?? rand(8, 15)) - dt;
        if (this.needT <= 0) { this.needT = rand(15, 30); this.emote(this.profile.hungry ? '🍖' : '💧'); }
      }
      this.happyT = Math.max(0, this.happyT - dt);
      this.blinkT -= dt;
      if (this.blinkT < -0.12) this.blinkT = rand(2, 5);
      if (this.bubble && (this.bubble.t -= dt) <= 0) this.bubble = null;
      this.emotes = this.emotes.filter((e) => (e.t -= dt) > 0);

      if (this.dragging) return;

      if (this.air) {
        const prevY = this.y;
        this.vy += G * dt;
        this.vx *= 1 - 0.15 * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        const hw = this.w / 2;
        if (this.x < hw) { this.x = hw; this.vx = Math.abs(this.vx) * 0.5; }
        if (this.x > W - hw) { this.x = W - hw; this.vx = -Math.abs(this.vx) * 0.5; }
        if (this.y - this.h < 0 && this.vy < 0) { this.y = this.h; this.vy = Math.abs(this.vy) * 0.3; }
        if (this.vy > 0) {
          for (const seg of platforms) {
            if (seg.winId === this.noLandWin && performance.now() < this.noLandUntil) continue;
            if (this.x >= seg.x1 && this.x <= seg.x2 && prevY <= seg.y + 0.5 && this.y >= seg.y) {
              this.land(seg); break;
            }
          }
        }
        if (this.air && this.y > floorY) this.land(platforms.find((p) => p.winId === 'floor'));
        return;
      }

      const seg = this.currentSeg();
      if (!seg) { this.fall(); return; }

      if (this.state === 'walk') {
        this.x += this.dir * WALK * dt;
        const lo = seg.x1 + 4, hi = seg.x2 - 4;
        if (this.x < lo || this.x > hi) {
          if (seg.winId !== 'floor' && Math.random() < 0.25) {
            this.x = this.dir > 0 ? seg.x2 + 2 : seg.x1 - 2;   // 가장자리에서 뛰어내림
            this.fall(this.dir * 90, -120);
            return;
          }
          this.dir *= -1;
          this.x = clamp(this.x, lo, hi);
        }
      }

      this.stateT -= dt;
      if (this.stateT <= 0) {
        if (this.state === 'crouch' && this.pendingJump) {
          const j = this.pendingJump; this.pendingJump = null;
          this.fall(j.vx, j.vy);
          this.setState('jump', 0);
          return;
        }
        this.think();
      }
    }

    frame() {
      let legs = 'stand';
      let eyes = this.blinkT < 0 ? 'closed' : 'open';
      let bob = 0;
      let tail = 0;
      if (this.dragging || this.air) legs = 'air';
      else if (this.state === 'walk') {
        const f = Math.floor(this.anim / 0.22) % 2;
        legs = f ? 'walkB' : 'walkA';
        bob = f ? -1 : 0;
        tail = f;
      } else if (this.state === 'sit' || this.state === 'crouch' || this.state === 'land') legs = 'sit';
      else if (this.state === 'sleep') { legs = 'sit'; eyes = 'closed'; }
      else tail = Math.floor(this.anim / 0.8) % 2;
      if (this.happyT > 0) eyes = 'happy';
      if (this.dragging) eyes = 'happy';
      return { legs, eyes, bob, tail };
    }

    hit(px, py) {
      const pad = 4;
      const hw = (this.dw || this.w) / 2;
      const h = this.dw ? this.h * 1.15 : this.h;
      return px >= this.x - hw - pad && px <= this.x + hw + pad &&
        py >= this.y - h - pad && py <= this.y + pad;
    }

    draw(hovered) {
      const s = this.s;
      const f = this.frame();
      const left = Math.round(this.x - this.w / 2);
      const top = Math.round(this.y - this.h + f.bob * s);

      // 그림자
      if (!this.air) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - 1, this.w * 0.36, s * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 직접 올린 그림이 있으면 그걸로, 없으면 기본 도트 고양이
      const skin = Skins.get(this.profile.username, this.profile.skin);
      this.dw = 0;
      if (skin) {
        const pose = this.dragging || this.air ? 'fall' : this.state === 'sleep' && !this.air ? 'lie'
          : f.legs === 'sit' ? 'sit' : f.legs.startsWith('walk') ? 'walk' : 'stand';
        const tilt = pose === 'walk' ? (f.legs === 'walkB' ? 0.07 : -0.07)
          : pose === 'fall' ? Math.sin(this.anim * 12) * (Skins.has(skin, 'fall') ? 0.06 : 0.12) : 0;
        this.dw = Skins.draw(ctx, skin, pose, this.x, this.y + f.bob * s * 2, this.h * 1.15, this.dir, tilt);
      }
      if (!this.dw) {
        Sprites.drawPet(ctx, left, top, {
          species: this.profile.species, acc: this.profile.acc, scale: s, palette: this.pal, legs: f.legs, eyes: f.eyes,
          flip: this.dir > 0, tailFrame: f.tail,
        });
      }

      // 상태에 맞는 소품 (앉아 있을 때)
      if ((this.state === 'sit' || this.state === 'sleep') && !this.air) {
        const st = this.profile.status || '';
        let prop = '';
        if (/공부|study|독서/i.test(st)) prop = '📖';
        else if (/게임|game/i.test(st)) prop = '🎮';
        else if (/코딩|작업|work/i.test(st)) prop = '💻';
        if (prop) {
          ctx.font = `${Math.round(s * 6)}px ${FONT}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
          const side = this.dir > 0 ? 1 : -1;
          ctx.fillText(prop, this.x + side * this.w * 0.55, this.y - s);
        }
      }
      if (this.state === 'sleep' && !this.air) {
        const k = (this.anim % 2) / 2;
        ctx.font = `bold ${Math.round(10 + k * 6)}px ${FONT}`;
        ctx.fillStyle = `rgba(90,110,200,${1 - k})`;
        ctx.textAlign = 'left';
        ctx.fillText('z', this.x + this.w * 0.35 + k * 10, this.y - this.h - k * 18);
      }

      // 이름/상태 표시
      // 닉네임(굵게) 아래에 @아이디(작게). 내 캐릭터는 마우스를 올렸을 때만 이름 표시.
      let labelTop = (this.dw ? this.y - this.h * 1.15 : top) - 6;
      const showName = !this.isMe || hovered;
      const line1 = [showName ? this.profile.nickname : '', this.profile.status].filter(Boolean).join(' · ');
      const line2 = showName && this.profile.username ? '@' + this.profile.username : '';
      if (line1) labelTop = drawPill(line1, this.x, labelTop, this.isMe, line2) - 6;

      if (this.bubble) drawBubble(this.bubble.text, this.x, labelTop);

      for (const e of this.emotes) {
        const k = 1 - e.t / e.max;
        ctx.globalAlpha = Math.min(1, e.t * 2);
        ctx.font = `${Math.round(s * 7)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(e.icon, this.x + this.w * 0.45 + e.dx, top - k * 40);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ------------------------------------------------------------ 따라다니는 펫 (집에 꺼내 둔 펫)
  const followers = new Map(); // `${주인}:${펫}` -> { x, y, dir, hop, kind, owner }
  function updateFollowers(dt) {
    const alive = new Set();
    if (cfg.showPetsDesktop) {
      for (const owner of visiblePets()) {
        const list = !owner.isMe && cfg.showAllPets && owner.profile.allPets ? owner.profile.allPets : (owner.profile.pets || []);
        list.slice(0, 12).forEach((p, i) => {
          const key = owner.id + ':' + p.id;
          alive.add(key);
          let f = followers.get(key);
          if (!f) { f = { x: owner.x - owner.dir * 30, y: owner.y, dir: owner.dir, hop: 0, t: Math.random() * 6 }; followers.set(key, f); }
          f.kind = p.kind; f.owner = owner;
          f.t += dt;
          // 주인 뒤쪽에 줄 서서 따라감
          const gap = owner.w * 0.55 + (i + 1) * Math.max(18, cfg.petScale * 9);
          const tx = clamp(owner.x - owner.dir * gap, 10, W - 10);
          const ty = owner.y;
          const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
          if (d > 600) { f.x = tx; f.y = ty; }   // 너무 멀어지면(던졌을 때 등) 바로 옆으로
          else if (d > 3) {
            const sp = Math.max(70, d * 3.2) * dt;
            f.x += dx / d * Math.min(sp, d); f.y += dy / d * Math.min(sp, d);
            if (Math.abs(dx) > 1) f.dir = dx > 0 ? 1 : -1;
            f.hop = Math.abs(Math.sin(f.t * 10)) * cfg.petScale * 1.2;
          } else { f.hop = 0; f.dir = owner.dir; }
        });
      }
    }
    for (const k of [...followers.keys()]) if (!alive.has(k)) followers.delete(k);
  }
  function drawFollowers(ofOwner) {
    const sc = Math.max(1, Math.round(cfg.petScale * 0.75));
    for (const f of followers.values()) {
      if (f.owner !== ofOwner) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(Math.round(f.x - 5 * sc), Math.round(f.y - 1), 10 * sc, Math.max(2, sc));
      PetArt.draw(ctx, f.kind, f.x, f.y, sc, f.dir < 0, f.hop);
    }
  }

  // ------------------------------------------------------------ 말풍선 / 라벨
  function drawPill(text, cx, bottom, mine, sub) {
    ctx.font = `600 12px ${FONT}`;
    let w = ctx.measureText(text).width;
    if (sub) { ctx.font = `10px ${FONT}`; w = Math.max(w, ctx.measureText(sub).width); }
    w = Math.min(220, w) + 16;
    const h = sub ? 32 : 20;
    const x = Math.round(cx - w / 2), y = Math.round(bottom - h);
    ctx.fillStyle = mine ? 'rgba(30,30,40,0.72)' : 'rgba(40,60,110,0.82)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText(text, cx, y + (sub ? 11 : h / 2 + 0.5), w - 12);
    if (sub) {
      ctx.font = `10px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(sub, cx, y + 24, w - 12);
    }
    ctx.textBaseline = 'alphabetic';
    return y;
  }

  function wrap(text, maxW) {
    const lines = [];
    let line = '';
    for (const ch of text) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = ch; } else line = test;
      if (lines.length === 4) break;
    }
    if (lines.length < 4 && line) lines.push(line);
    if (lines.length === 4 && lines.join('').length < text.length) lines[3] = lines[3].slice(0, -1) + '…';
    return lines;
  }

  function drawBubble(text, cx, bottom) {
    ctx.font = `14px ${FONT}`;
    const lines = wrap(text, 200);
    const lh = 19;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 22;
    const h = lines.length * lh + 14;
    const x = Math.round(clamp(cx - w / 2, 4, W - w - 4));
    const y = Math.round(bottom - h - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.97)';
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 6, y + h - 1); ctx.lineTo(cx, y + h + 8); ctx.lineTo(cx + 6, y + h - 1);
    ctx.fill();
    ctx.fillStyle = '#1d1d24';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x + 11, y + 8 + i * lh));
    ctx.textBaseline = 'alphabetic';
  }

  // ------------------------------------------------------------ 마우스
  let mouse = { x: -1, y: -1 };
  let hovered = null;
  let ignoring = true;
  let drag = null;

  function setIgnore(v) {
    if (v !== ignoring) { ignoring = v; buddy.send('set-ignore', v); }
  }
  function visiblePets() {
    return [...pets.values()].filter((p) => p.isMe || !cfg.hideOthers);
  }
  function hitPet(x, y) {
    const list = visiblePets();
    for (let i = list.length - 1; i >= 0; i--) if (list[i].hit(x, y)) return list[i];
    return null;
  }
  function refreshHover() {
    if (drag) return;
    hovered = hitPet(mouse.x, mouse.y);
    const overChat = typeof chatHit === 'function' && chatHit(mouse.x, mouse.y);
    setIgnore(!hovered && !overChat);
    document.body.style.cursor = hovered ? 'grab' : 'default';
  }

  addEventListener('mousemove', (e) => {
    mouse = { x: e.clientX, y: e.clientY };
    if (drag) {
      const p = drag.pet;
      p.x = clamp(e.clientX - drag.ox, p.w / 2, W - p.w / 2);
      p.y = clamp(e.clientY - drag.oy, p.h, floorY);
      const now = performance.now();
      drag.hist.push({ x: e.clientX, y: e.clientY, t: now });
      while (drag.hist.length > 2 && now - drag.hist[0].t > 90) drag.hist.shift();
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 5) drag.moved = true;
      return;
    }
    refreshHover();
  });

  addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const p = hitPet(e.clientX, e.clientY);
    if (!p) return;
    drag = {
      pet: p, ox: e.clientX - p.x, oy: e.clientY - p.y, sx: e.clientX, sy: e.clientY,
      t0: performance.now(), moved: false, hist: [{ x: e.clientX, y: e.clientY, t: performance.now() }],
    };
    p.dragging = true; p.air = false;
    document.body.style.cursor = 'grabbing';
    setIgnore(false);
  });

  addEventListener('mouseup', (e) => {
    if (!drag || e.button !== 0) return;
    const p = drag.pet;
    p.dragging = false;
    if (!drag.moved) {
      if (p.isMe) openChat();
      else {
        // 친구 캐릭터 클릭: 콕 찌르기
        p.happyT = 0.7;
        p.hop(420);
        p.emote(['❗', '💕', '✨', '😆'][Math.floor(Math.random() * 4)]);
        buddy.send('poke', { target: p.id });
      }
    } else {
      // 던지기 (멈춰 있다가 놓으면 그 자리에서 그냥 떨어짐)
      const h = drag.hist;
      const a = h[0], b = h[h.length - 1];
      const still = performance.now() - b.t > 120;
      const dt = Math.max(16, b.t - a.t) / 1000;
      if (still) p.fall(0, 0);
      else p.fall(clamp((b.x - a.x) / dt, -1800, 1800), clamp((b.y - a.y) / dt, -1800, 1800));
      if (Math.abs(p.vx) > 300) p.dir = p.vx > 0 ? 1 : -1;
    }
    drag = null;
    refreshHover();
  });

  addEventListener('dblclick', (e) => {
    const p = hitPet(e.clientX, e.clientY);
    if (p && p.isMe) { closeChat(); buddy.send('open-control'); }
  });

  // ------------------------------------------------------------ 말풍선 채팅 입력
  const chatBox = document.getElementById('chatBox');
  const chatInput = document.getElementById('chatInput');
  let chatOpen = false;
  function openChat() {
    if (chatOpen) { chatInput.focus(); return; }
    chatOpen = true;
    chatBox.hidden = false;
    chatInput.value = '';
    buddy.send('overlay-focus', true);
    setTimeout(() => chatInput.focus(), 30);
    placeChat();
  }
  function closeChat() {
    if (!chatOpen) return;
    chatOpen = false;
    chatBox.hidden = true;
    chatInput.blur();
    buddy.send('overlay-focus', false);
  }
  function placeChat() {
    const me = pets.get('me');
    if (!chatOpen || !me) return;
    const w = chatBox.offsetWidth || 240, h = chatBox.offsetHeight || 44;
    const top = (me.dw ? me.y - me.h * 1.15 : me.y - me.h) - h - 14;
    chatBox.style.left = Math.round(clamp(me.x - w / 2, 6, W - w - 6)) + 'px';
    chatBox.style.top = Math.round(Math.max(6, top)) + 'px';
  }
  function chatHit(x, y) {
    if (!chatOpen) return false;
    const r = chatBox.getBoundingClientRect();
    return x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 4 && y <= r.bottom + 10;
  }
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeChat(); return; }
    if (e.key === 'Enter' && !e.isComposing) {
      const t = chatInput.value.trim();
      if (t) buddy.send('send-chat', t);
      chatInput.value = '';
      closeChat();
    }
  });
  chatInput.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== chatInput) closeChat(); }, 80));

  addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const p = hitPet(e.clientX, e.clientY);
    if (p) buddy.send('pet-menu', { id: p.id });
  });

  // ------------------------------------------------------------ 메인 프로세스에서 오는 이벤트
  function ensureMe(profile) {
    if (!pets.has('me')) pets.set('me', new Pet('me', profile));
    else pets.get('me').setProfile(profile);
  }

  buddy.on('init', (d) => {
    floorY = d.floorY;
    cfg = { ...cfg, ...d.config };
    resize();
    ensureMe(d.self);
  });
  buddy.on('config', (c) => { cfg = { ...cfg, ...c }; rebuildPlatforms(); });
  buddy.on('self', (p) => ensureMe(p));
  buddy.on('windows', (wins) => { rawWindows = wins; rebuildPlatforms(); });
  buddy.on('peers', (list) => {
    const ids = new Set(list.map((p) => p.id));
    for (const id of [...pets.keys()]) if (id !== 'me' && !ids.has(id)) pets.delete(id);
    for (const p of list) {
      const { id, ...profile } = p;
      if (pets.has(id)) pets.get(id).setProfile(profile);
      else pets.set(id, new Pet(id, profile));
    }
  });
  buddy.on('chat', ({ id, text }) => { pets.get(id)?.say(text); });
  // 간식 나눠먹기
  buddy.on('snack', ({ from, to, icon, name }) => {
    const a = pets.get(from), b = pets.get(to);
    if (a) { a.emote(icon); a.happyT = 1.2; a.hop(300); if (from === 'me') a.say(`${name} 나눠 먹자! ${icon}`); }
    if (b) { setTimeout(() => { b.emote(icon); b.emote('😋'); b.happyT = 1.5; b.hop(360); if (to === 'me') b.say(`${a ? a.profile.nickname + '님이 ' : ''}${name}을(를) 나눠줬어요! 냠냠`); }, 500); }
  });
  buddy.on('skins', (obj) => Skins.update(obj));
  buddy.invoke('get-skins').then((obj) => Skins.update(obj)).catch(() => {});
  buddy.on('summon', () => {
    const me = pets.get('me');
    if (!me) return;
    me.x = W / 2; me.y = me.h + 10; me.fall(0, 0);
    me.emote('✨');
  });

  const EMOTE_ICON = { wave: '👋', heart: '💖', cheer: '🎉', zzz: '💤', coin: '🪙', gift: '🎁', mail: '✉️' };
  buddy.on('emote', ({ from, kind, target, fromName }) => {
    const pet = pets.get(target || from);
    if (!pet) return;
    if (kind === 'poke') {
      // 다른 사람이 내(또는 누군가의) 캐릭터를 찔렀을 때
      if (from === 'me') return; // 내가 찌른 건 이미 표시함
      pet.happyT = 0.7;
      pet.hop(480);
      pet.emote('💥');
      if (fromName) pet.say(`${fromName}님이 콕 찔렀어요!`);
      return;
    }
    const icon = EMOTE_ICON[kind];
    if (!icon) return;
    pet.emote(icon);
    if (target && from !== 'me' && fromName) pet.say(`${fromName}님: ${icon}`);
    if (kind === 'cheer' || kind === 'wave') pet.hop(380);
  });

  // ------------------------------------------------------------ 타이머 알람: 삐비빅 (전자시계 소리)
  let audio = null;
  function beep(at, freq, len) {
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.12, at + 0.005);
    g.gain.setValueAtTime(0.12, at + len - 0.01);
    g.gain.linearRampToValueAtTime(0, at + len);
    o.connect(g).connect(audio.destination);
    o.start(at); o.stop(at + len + 0.02);
  }
  buddy.on('alarm', ({ kind }) => {
    try {
      audio = audio || new AudioContext();
      if (audio.state === 'suspended') audio.resume();
      const t0 = audio.currentTime + 0.05;
      // 끝: 삐비빅 × 4번, 반복 회차 넘어갈 때: 삐비빅 × 2번
      const sets = kind === 'round' ? 2 : 4;
      for (let k = 0; k < sets; k++) for (let i = 0; i < 3; i++) beep(t0 + k * 0.55 + i * 0.1, 2700, 0.06);
    } catch (e) { console.error('알람 소리 실패', e); }
    const me = pets.get('me');
    if (me) { me.emote('⏰'); me.hop(420); }
  });

  // ------------------------------------------------------------ 루프
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const p of pets.values()) p.update(dt);
    updateFollowers(dt);
    refreshHover();
    placeChat();

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    for (const p of visiblePets()) if (!p.isMe) { drawFollowers(p); p.draw(p === hovered); }
    const me = pets.get('me');
    if (me) { drawFollowers(me); me.draw(me === hovered); } // 내 캐릭터는 항상 맨 앞
    requestAnimationFrame(loop);
  }
  resize();
  requestAnimationFrame(loop);
})();
