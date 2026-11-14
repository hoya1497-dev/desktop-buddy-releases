// 🎣 낚시터 배경: 시간대(아침 · 낮 · 저녁 · 밤) × 계절(봄 · 여름 · 가을 · 겨울)
// FishScene.back(g, W, H, opt, t)  → 하늘 · 산 · 건너편 숲 · 물 (부두 · 사람보다 먼저)
// FishScene.front(g, W, H, opt, t) → 꽃잎 · 낙엽 · 눈 · 반딧불 · 부두 위 눈 (맨 마지막)
// opt = { time: 'auto'|'morning'|'day'|'evening'|'night', season: 'auto'|'spring'|'summer'|'autumn'|'winter' }
window.FishScene = (() => {
  const WATER_Y = 300, DECK_Y = 410;
  const TIMES = { morning: '🌅 아침', day: '☀️ 낮', evening: '🌇 저녁', night: '🌙 밤' };
  const SEASONS = { spring: '🌸 봄', summer: '🌿 여름', autumn: '🍁 가을', winter: '❄️ 겨울' };

  function resolve(opt = {}) {
    const now = new Date();
    const h = now.getHours(), m = now.getMonth() + 1;
    const time = TIMES[opt.time] ? opt.time : h >= 5 && h < 10 ? 'morning' : h >= 10 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'evening' : 'night';
    const season = SEASONS[opt.season] ? opt.season : m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
    return { time, season };
  }

  // 결정적인 난수 (매 프레임 같은 자리에 나무 · 별이 서도록)
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  // ---- 하늘 색 (위 → 지평선)
  const SKY = {
    morning: ['#9cc8ee', '#f8d9c4', '#ffe9c9'],
    day: ['#5fb4ef', '#a9dbfb', '#e2f5ff'],
    evening: ['#4a3f7a', '#e0707a', '#ffb36b'],
    night: ['#070b24', '#141c48', '#2a3770'],
  };
  // 겨울 낮은 살짝 흐리게
  const SKY_WINTER = { morning: ['#b9cbe0', '#e6dfe2', '#f4ece6'], day: ['#a8c4df', '#d3e2ef', '#eef4f8'] };

  // ---- 계절 색
  const PAL = {
    spring: { far: '#9fb8d8', mid: '#8fcf7a', midD: '#6db35e', ground: '#a5d98a', trees: ['#ffc4d6', '#ffb0c8', '#ffd9e4', '#f59ab8'], trunk: '#7a5236', water: ['#5fb0e0', '#2f74a8'] },
    summer: { far: '#7fa3c9', mid: '#4f9e48', midD: '#3a8238', ground: '#5cae4c', trees: ['#3f9a3c', '#2f8a34', '#57b04a', '#2a7a30'], trunk: '#5a3a24', water: ['#3fa2d8', '#145c90'] },
    autumn: { far: '#a59bb8', mid: '#c9a04a', midD: '#a87e3a', ground: '#d2ad5a', trees: ['#e8742e', '#d9472c', '#f2b136', '#c9602a', '#a8402a'], trunk: '#5a3a24', water: ['#5a98c0', '#26587e'] },
    winter: { far: '#b8c6dc', mid: '#e8eef6', midD: '#c8d4e4', ground: '#f2f6fb', trees: ['#2f5a48', '#3a6a54', '#26503f'], trunk: '#4a3a30', water: ['#7aa8c8', '#3a6a8e'] },
  };

  function sky(g, W, s) {
    const c = (s.season === 'winter' && SKY_WINTER[s.time]) || SKY[s.time];
    const grad = g.createLinearGradient(0, 0, 0, WATER_Y);
    grad.addColorStop(0, c[0]); grad.addColorStop(0.62, c[1]); grad.addColorStop(1, c[2]);
    g.fillStyle = grad; g.fillRect(0, 0, W, WATER_Y);
  }

  function stars(g, W, t) {
    for (let i = 0; i < 90; i++) {
      const x = rnd(i) * W, y = rnd(i + 500) * 230;
      g.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + rnd(i + 9) * 1.4) + i));
      R(g, x, y, rnd(i + 77) > 0.85 ? 3 : 2, rnd(i + 77) > 0.85 ? 3 : 2, i % 7 === 0 ? '#ffe9b0' : '#ffffff');
    }
    g.globalAlpha = 1;
  }

  // 해 · 달 자리 (시간대마다)
  function bodyPos(W, time) {
    if (time === 'morning') return { x: W * 0.18, y: 150 };
    if (time === 'day') return { x: W * 0.72, y: 62 };
    if (time === 'evening') return { x: W * 0.62, y: 172 };
    return { x: W * 0.8, y: 70 };
  }
  // 픽셀 원
  function disc(g, cx, cy, r, c) {
    g.fillStyle = c;
    for (let y = -r; y <= r; y += 3) { const w = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 3); }
  }
  function sunMoon(g, W, s) {
    const p = bodyPos(W, s.time);
    if (s.time === 'night') {
      g.save(); g.shadowColor = 'rgba(255,240,190,0.8)'; g.shadowBlur = 30; disc(g, p.x, p.y, 22, '#fff4cc'); g.restore();
      disc(g, p.x + 9, p.y - 6, 18, SKY.night[0]);   // 초승달
      return;
    }
    const col = s.time === 'evening' ? '#ff8a4a' : s.time === 'morning' ? '#ffd27a' : '#fff1a0';
    g.save(); g.shadowColor = col; g.shadowBlur = s.time === 'day' ? 40 : 60;
    disc(g, p.x, p.y, s.time === 'evening' ? 34 : 26, col); g.restore();
    if (s.time !== 'day') disc(g, p.x, p.y, s.time === 'evening' ? 26 : 18, s.time === 'evening' ? '#ffb070' : '#ffe9a8');
  }

  function clouds(g, W, s, t) {
    if (s.time === 'night') return;
    const n = s.season === 'summer' ? 5 : s.season === 'winter' ? 6 : 4;
    const col = s.time === 'evening' ? 'rgba(255,190,170,0.85)' : s.season === 'winter' ? 'rgba(240,244,250,0.9)' : 'rgba(255,255,255,0.92)';
    const shade = s.time === 'evening' ? 'rgba(170,90,120,0.45)' : 'rgba(170,200,230,0.5)';
    for (let i = 0; i < n; i++) {
      const big = s.season === 'summer' && i % 2 === 0;
      const w = (big ? 110 : 70) + rnd(i + 40) * 40, y = 30 + i * 34 + rnd(i) * 10;
      const x = ((rnd(i + 3) * W + t * (4 + i * 1.5)) % (W + 220)) - 110;
      R(g, x, y, w, 14, col); R(g, x + w * 0.15, y - 10, w * 0.5, 12, col); R(g, x + w * 0.45, y - (big ? 26 : 16), w * 0.35, big ? 18 : 8, col);
      if (big) R(g, x + w * 0.3, y - 16, w * 0.5, 8, col);
      R(g, x + 6, y + 10, w - 12, 4, shade);
    }
  }

  // 먼 산 (두 겹)
  function mountains(g, W, s) {
    const P = PAL[s.season];
    const peaks = (seed, base, amp, step, col, snow) => {
      for (let x = 0; x < W; x += step) {
        const hgt = base + amp * (0.5 + 0.5 * Math.sin(x / 140 + seed)) + amp * 0.5 * Math.sin(x / 47 + seed * 2);
        R(g, x, WATER_Y - hgt, step, hgt, col);
        if (snow && hgt > base + amp * 0.75) R(g, x, WATER_Y - hgt, step, 8, '#f4f8ff');
      }
    };
    peaks(1.3, 70, 60, 6, P.far, s.season === 'winter' || s.season === 'spring');
    peaks(4.1, 44, 34, 6, shadeHex(P.far, -0.12), s.season === 'winter');
  }

  // 건너편 언덕 + 숲
  function farBank(g, W, s) {
    const P = PAL[s.season];
    for (let x = 0; x < W; x += 8) {
      const hh = 26 + Math.round(12 * Math.sin((x + 30) / 70) + 6 * Math.sin(x / 23));
      R(g, x, WATER_Y - hh, 8, hh, P.mid);
      R(g, x, WATER_Y - 6, 8, 6, P.midD);
    }
    // 나무 줄
    const n = Math.ceil(W / 46);
    for (let i = 0; i < n; i++) {
      const x = i * 46 + rnd(i) * 20, base = WATER_Y - 18 - rnd(i + 9) * 10;
      const col = P.trees[Math.floor(rnd(i + 21) * P.trees.length)];
      if (s.season === 'winter' || (i % 4 === 1 && s.season !== 'spring')) pine(g, x, base, 16 + rnd(i + 2) * 10, s.season === 'winter' ? P.trees[i % 3] : shadeHex(col, -0.15), s.season === 'winter');
      else roundTree(g, x, base, 14 + rnd(i + 2) * 8, col, P.trunk, s.season);
    }
    // 겨울: 언덕에 눈 반짝 · 봄: 꽃 점점
    if (s.season === 'spring') for (let i = 0; i < W / 14; i++) R(g, rnd(i + 900) * W, WATER_Y - 4 - rnd(i + 1300) * 14, 3, 3, i % 3 ? '#fff6a8' : '#ffffff');
    if (s.season === 'autumn') for (let i = 0; i < W / 10; i++) R(g, rnd(i + 900) * W, WATER_Y - 3 - rnd(i + 1300) * 10, 4, 2, i % 2 ? '#e8b04a' : '#c98a3a');   // 억새
  }
  function roundTree(g, x, base, r, col, trunk, season) {
    R(g, x - 2, base - 4, 5, 10, trunk);
    const hi = shadeHex(col, 0.18), lo = shadeHex(col, -0.18);
    R(g, x - r, base - r * 1.4, r * 2, r * 1.2, col);
    R(g, x - r * 0.7, base - r * 1.9, r * 1.4, r * 0.6, col);
    R(g, x - r * 0.7, base - r * 1.8, r * 0.7, r * 0.5, hi);
    R(g, x - r, base - r * 0.5, r * 2, r * 0.3, lo);
    if (season === 'spring') for (let k = 0; k < 4; k++) R(g, x - r + rnd(x + k) * r * 2, base - r * 1.7 + rnd(x + k + 5) * r * 1.2, 3, 3, '#ffffff');
  }
  function pine(g, x, base, h, col, snow) {
    R(g, x - 2, base - 4, 4, 8, '#4a3a30');
    for (let k = 0; k < 3; k++) {
      const w = h * (0.9 - k * 0.25), y = base - 6 - k * h * 0.32;
      R(g, x - w / 2, y - h * 0.3, w, h * 0.3, col);
      if (snow) R(g, x - w / 2 + 2, y - h * 0.3, w - 4, 3, '#f4f8ff');
    }
  }

  function water(g, W, H, s, t) {
    const P = PAL[s.season];
    const tint = { morning: ['#8cc0e0', '#3f7aa8'], day: P.water, evening: ['#c2788a', '#3a3a6e'], night: ['#1c3466', '#060f28'] }[s.time];
    const grad = g.createLinearGradient(0, WATER_Y, 0, H);
    grad.addColorStop(0, tint[0]); grad.addColorStop(1, tint[1]);
    g.fillStyle = grad; g.fillRect(0, WATER_Y, W, H - WATER_Y);
    // 건너편 숲이 물에 비침
    g.globalAlpha = s.time === 'night' ? 0.25 : 0.3;
    R(g, 0, WATER_Y, W, 10, PAL[s.season].midD);
    g.globalAlpha = 1;
    // 해 · 달 기둥
    const p = bodyPos(W, s.time);
    const col = s.time === 'night' ? 'rgba(255,240,190,' : s.time === 'evening' ? 'rgba(255,170,90,' : 'rgba(255,250,220,';
    for (let y = WATER_Y + 6, k = 0; y < H; y += 9, k++) {
      const w = (s.time === 'day' ? 26 : 40) * (1 - k * 0.025) + Math.sin(t * 2 + k) * 6;
      if (w <= 4) break;
      g.fillStyle = col + (s.time === 'day' ? 0.25 : 0.55) * (1 - k / 40) + ')';
      g.fillRect(Math.round(p.x - w / 2 + Math.sin(t * 1.3 + k * 0.7) * 4), y, Math.round(w), 3);
    }
    // 잔물결
    g.fillStyle = s.time === 'night' ? 'rgba(160,190,255,0.22)' : 'rgba(255,255,255,0.32)';
    for (let i = 0; i < 22; i++) { const x = ((i * 83 + t * (10 + (i % 3) * 6)) % (W + 60)) - 30; g.fillRect(Math.round(x), WATER_Y + 14 + (i * 37) % (H - WATER_Y - 20), 22, 3); }
    // 계절 물 위 장식
    if (s.season === 'winter') {   // 가장자리 얼음
      g.fillStyle = 'rgba(235,245,255,0.75)';
      for (let x = 0; x < W; x += 12) { const d = 6 + Math.round(5 * Math.sin(x / 31) + 3 * Math.sin(x / 9)); g.fillRect(x, WATER_Y, 12, d); }
      g.fillStyle = 'rgba(235,245,255,0.55)';
      for (let i = 0; i < 6; i++) { const x = rnd(i + 70) * W, y = WATER_Y + 30 + rnd(i + 71) * 60; g.fillRect(x, y, 30 + rnd(i) * 30, 5); }
    }
    if (s.season === 'spring') for (let i = 0; i < 26; i++) { const x = (rnd(i + 30) * W + t * 6) % W, y = WATER_Y + 10 + rnd(i + 31) * (H - WATER_Y - 20); R(g, x, y, 3, 2, '#ffc8d8'); }
    if (s.season === 'autumn') for (let i = 0; i < 16; i++) { const x = (rnd(i + 30) * W + t * 5) % W, y = WATER_Y + 12 + rnd(i + 31) * (H - WATER_Y - 30); R(g, x, y, 5, 3, ['#e8742e', '#d9472c', '#f2b136'][i % 3]); }
    if (s.season === 'summer') {   // 연잎
      for (let i = 0; i < 5; i++) { const x = W - 60 - i * 70 - rnd(i) * 30, y = H - 50 - rnd(i + 3) * 70; R(g, x, y, 22, 6, '#3f8a3a'); R(g, x + 4, y - 2, 14, 2, '#5cae4c'); if (i === 1) { R(g, x + 8, y - 6, 6, 4, '#ffb0c8'); R(g, x + 10, y - 8, 2, 2, '#fff'); } }
    }
    if (s.time === 'morning') {   // 물안개
      for (let i = 0; i < 4; i++) { const x = ((rnd(i) * W + t * 8) % (W + 300)) - 150; g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(Math.round(x), WATER_Y - 6 + i * 9, 260, 8); }
    }
  }

  // 건너편 오두막 (저녁 · 밤엔 창문에 불)
  function cabin(g, W, s) {
    const x = Math.round(W * 0.34), y = WATER_Y - 22;
    R(g, x, y - 18, 30, 18, s.season === 'winter' ? '#8a6a52' : '#9a6a44');
    R(g, x - 4, y - 26, 38, 8, s.season === 'winter' ? '#f4f8ff' : '#a8443a');
    R(g, x + 2, y - 32, 26, 6, s.season === 'winter' ? '#f4f8ff' : '#a8443a');
    R(g, x + 22, y - 40, 5, 10, '#6a4a3a');
    R(g, x + 6, y - 13, 7, 7, s.time === 'evening' || s.time === 'night' ? '#ffd27a' : '#cfe6f7');
    R(g, x + 18, y - 12, 6, 12, '#5a3a24');
  }
  // 산 · 숲 · 오두막은 따로 그린 뒤 시간대 색감(노을 · 밤 어둠)을 그 위에만 입힘
  const land = document.createElement('canvas');
  function landscape(g, W, s) {
    if (land.width !== W) { land.width = W; land.height = WATER_Y; }
    const l = land.getContext('2d');
    l.clearRect(0, 0, W, WATER_Y);
    l.imageSmoothingEnabled = false;
    mountains(l, W, s);
    farBank(l, W, s);
    cabin(l, W, s);
    if (s.time !== 'day') {
      l.save();
      l.globalCompositeOperation = 'source-atop';
      l.fillStyle = s.time === 'night' ? 'rgba(12,20,60,0.62)' : s.time === 'evening' ? 'rgba(150,50,90,0.28)' : 'rgba(255,190,170,0.14)';
      l.fillRect(0, 0, W, WATER_Y);
      l.restore();
      if (s.time === 'night' || s.time === 'evening') {   // 불 켜진 창문은 어둡게 덮지 않음
        const x = Math.round(W * 0.34), y = WATER_Y - 22;
        l.save(); l.shadowColor = '#ffcc66'; l.shadowBlur = 12; R(l, x + 6, y - 13, 7, 7, '#ffd27a'); l.restore();
      }
    }
    g.drawImage(land, 0, 0);
  }
  // 새 떼 (아침 · 낮 · 저녁)
  function birds(g, W, s, t) {
    if (s.time === 'night' || s.season === 'winter') return;
    const col = s.time === 'evening' ? '#3a2a3a' : '#4a5a6a';
    for (let i = 0; i < 5; i++) {
      const x = ((t * 18 + i * 26) % (W + 200)) - 100, y = 90 + i * 7 + Math.sin(t * 2 + i) * 3, f = Math.sin(t * 8 + i) > 0;
      R(g, x, y, 3, 2, col); R(g, x - 3, y - (f ? 2 : 0), 3, 2, col); R(g, x + 3, y - (f ? 2 : 0), 3, 2, col);
    }
  }
  // 작은 나룻배 (낮 · 아침, 겨울 빼고)
  function boat(g, W, s, t) {
    if (s.season === 'winter' || s.time === 'night') return;
    const x = Math.round(W * 0.82 + Math.sin(t * 0.3) * 20), y = WATER_Y + 34 + Math.round(Math.sin(t * 1.4) * 2);
    R(g, x, y, 44, 6, '#7a4a2a'); R(g, x + 4, y + 6, 36, 4, '#5a3420'); R(g, x + 18, y - 22, 3, 22, '#5a3420');
    R(g, x + 21, y - 20, 14, 14, '#f4ece0'); R(g, x + 2, y + 10, 40, 2, 'rgba(255,255,255,0.35)');
  }

  function back(g, W, H, opt, t) {
    const s = resolve(opt);
    g.imageSmoothingEnabled = false;
    sky(g, W, s);
    if (s.time === 'night') stars(g, W, t);
    sunMoon(g, W, s);
    clouds(g, W, s, t);
    birds(g, W, s, t);
    landscape(g, W, s);
    water(g, W, H, s, t);
    boat(g, W, s, t);
    return s;
  }

  // 날리는 것들 (부두 · 사람 위에)
  function front(g, W, H, opt, t) {
    const s = resolve(opt);
    if (s.season === 'winter') {
      R(g, 0, DECK_Y - 3, W - 40, 4, '#f4f8ff');   // 부두 위 눈
      for (let i = 0; i < 70; i++) {
        const sp = 18 + rnd(i) * 22, x = (rnd(i + 1) * W + Math.sin(t + i) * 12) % W, y = (rnd(i + 2) * H + t * sp) % H;
        R(g, x, y, i % 4 ? 2 : 3, i % 4 ? 2 : 3, 'rgba(255,255,255,0.9)');
      }
    } else if (s.season === 'spring') {
      for (let i = 0; i < 26; i++) {
        const sp = 14 + rnd(i) * 14, x = (rnd(i + 1) * W + t * 20 + Math.sin(t * 1.5 + i) * 18) % W, y = (rnd(i + 2) * H + t * sp) % H;
        R(g, x, y, 4, 3, i % 3 ? '#ffc4d6' : '#ffe2ea');
      }
    } else if (s.season === 'autumn') {
      for (let i = 0; i < 16; i++) {
        const sp = 16 + rnd(i) * 16, x = (rnd(i + 1) * W + t * 14 + Math.sin(t * 1.2 + i) * 24) % W, y = (rnd(i + 2) * H + t * sp) % H;
        const c = ['#e8742e', '#d9472c', '#f2b136', '#c9602a'][i % 4];
        R(g, x, y, 5, 3, c); R(g, x + 1, y + 3, 3, 1, shadeHex(c, -0.25));
      }
    } else if (s.season === 'summer' && (s.time === 'night' || s.time === 'evening')) {   // 반딧불
      for (let i = 0; i < 22; i++) {
        const x = (rnd(i + 1) * W + Math.sin(t * 0.7 + i) * 30) % W, y = 200 + rnd(i + 2) * 200 + Math.sin(t * 0.9 + i * 2) * 14;
        const a = 0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i));
        g.save(); g.shadowColor = 'rgba(220,255,120,0.9)'; g.shadowBlur = 8; R(g, x, y, 3, 3, `rgba(230,255,140,${a})`); g.restore();
      }
    }
  }

  function shadeHex(h, k) {
    const n = parseInt(h.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
  }

  return { back, front, resolve, TIMES, SEASONS };
})();
