// 🏢 운영자 회의장 배경 (회사 회의실, 옆에서 본 모습)
// MeetScene.draw(g, W, H, t, drawSeat, opt)
//   drawSeat(g, n, seat) 를 깊이 순서대로 불러줘요 → 자리에 앉은 버디를 그 자리에서 그리면 됨
//   seat = { n, cx, bottom, dir(1=오른쪽 보기, -1=왼쪽 보기), scale(1 = 기본 키) }
// 1번: 테이블 머리(왼쪽 끝), 사람들을 봄 · 2~7번: 양쪽으로 마주 앉아 1번을 봄 · 8번: 오른쪽 구석 장 위에 인형처럼
window.MeetScene = (() => {
  const W0 = 800, H0 = 600;
  const FLOOR_Y = 392;
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  // 자리 (뒷줄 2·4·6 은 테이블 뒤, 앞줄 3·5·7 은 테이블 앞)
  const SEATS = {
    1: { n: 1, cx: 138, bottom: 470, dir: 1, scale: 1, chair: 'boss' },
    2: { n: 2, cx: 268, bottom: 414, dir: -1, scale: 1, chair: 'back' },
    4: { n: 4, cx: 398, bottom: 414, dir: -1, scale: 1, chair: 'back' },
    6: { n: 6, cx: 528, bottom: 414, dir: -1, scale: 1, chair: 'back' },
    3: { n: 3, cx: 292, bottom: 548, dir: -1, scale: 1, chair: 'front' },
    5: { n: 5, cx: 422, bottom: 548, dir: -1, scale: 1, chair: 'front' },
    7: { n: 7, cx: 552, bottom: 548, dir: -1, scale: 1, chair: 'front' },
    8: { n: 8, cx: 744, bottom: 456, dir: -1, scale: 0.62, chair: 'doll' },
  };

  const TIMES = { morning: 1, day: 1, evening: 1, night: 1 };
  const SEASONS = { spring: '🌸 봄', summer: '🌿 여름', autumn: '🍁 가을', winter: '❄️ 겨울' };
  // 계절: 'auto' 면 지금 달로 (3~5 봄 · 6~8 여름 · 9~11 가을 · 12~2 겨울)
  function seasonOf(opt = {}) {
    if (SEASONS[opt.season]) return opt.season;
    const m = new Date().getMonth() + 1;
    return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
  }
  // 겨울 아침 · 낮 하늘은 살짝 흐리게
  const SKY_WINTER = { morning: ['#b9cbe0', '#ece4e2'], day: ['#a8c4df', '#e2ebf2'] };
  function timeOf(opt = {}) {
    if (TIMES[opt.time]) return opt.time;
    const h = new Date().getHours();
    return h >= 5 && h < 10 ? 'morning' : h >= 10 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'evening' : 'night';
  }
  const SKY = {
    morning: ['#a9cdea', '#f6dcc8'],
    day: ['#6fb8ea', '#cfeafb'],
    evening: ['#53457e', '#f0a070'],
    night: ['#0b1030', '#26346a'],
  };

  // ------------------------------------------------------------ 벽 · 천장 · 바닥
  function room(g, time, t) {
    // 천장
    R(g, 0, 0, W0, 34, '#ecebe7');
    R(g, 0, 34, W0, 4, '#cfcdc7');
    for (const lx of [150, 400, 650]) {
      R(g, lx - 70, 12, 140, 14, '#d8d6d0');
      R(g, lx - 66, 14, 132, 10, time === 'night' ? '#fffbe8' : '#fdfcf6');
      // 아래로 퍼지는 은은한 빛
      const gr = g.createLinearGradient(0, 38, 0, 260);
      gr.addColorStop(0, 'rgba(255,250,225,0.20)'); gr.addColorStop(1, 'rgba(255,250,225,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(lx - 66, 38); g.lineTo(lx + 66, 38); g.lineTo(lx + 120, 260); g.lineTo(lx - 120, 260); g.closePath(); g.fill();
    }
    // 위쪽 벽 (밝은 회색)
    const wg = g.createLinearGradient(0, 38, 0, 312);
    wg.addColorStop(0, '#e6e2da'); wg.addColorStop(1, '#dcd7ce');
    g.fillStyle = wg; g.fillRect(0, 38, W0, 274);
    // 빛 그라데이션을 벽 위에 다시 (천장 조명 → 벽)
    for (const lx of [150, 400, 650]) {
      const gr = g.createRadialGradient(lx, 40, 10, lx, 40, 200);
      gr.addColorStop(0, 'rgba(255,252,236,0.35)'); gr.addColorStop(1, 'rgba(255,252,236,0)');
      g.fillStyle = gr; g.fillRect(lx - 200, 38, 400, 200);
    }
    // 아래쪽 벽: 나무 판넬 (몰딩 + 세로 줄)
    R(g, 0, 312, W0, 6, '#8a6444');
    R(g, 0, 312, W0, 2, '#a57c58');
    R(g, 0, 318, W0, 70, '#b88f66');
    for (let x = 0; x < W0; x += 40) { R(g, x, 318, 2, 70, '#a37b54'); R(g, x + 2, 318, 1, 70, '#c9a37a'); }
    R(g, 0, 318, W0, 3, 'rgba(0,0,0,0.10)');
    // 걸레받이
    R(g, 0, 386, W0, 8, '#4a3528');
    R(g, 0, 386, W0, 2, '#5e4534');
    // 바닥: 회사 카펫 타일 (두 가지 결이 번갈아)
    R(g, 0, FLOOR_Y + 2, W0, H0 - FLOOR_Y - 2, '#4f5868');
    const TS = 52;
    for (let y = FLOOR_Y + 2, row = 0; y < H0; y += TS, row++) {
      for (let x = -((row % 2) * TS) / 2, col = 0; x < W0; x += TS, col++) {
        const alt = (row + col) % 2 === 0;
        R(g, x, y, TS - 2, TS - 2, alt ? '#525c6d' : '#4b5464');
        // 타일 결 (가로 / 세로)
        g.fillStyle = alt ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
        for (let k = 4; k < TS - 4; k += 6) alt ? g.fillRect(Math.round(x + 3), y + k, TS - 8, 2) : g.fillRect(Math.round(x + k), y + 3, 2, TS - 8);
      }
    }
    // 벽 쪽 바닥 그림자
    const fg = g.createLinearGradient(0, FLOOR_Y, 0, FLOOR_Y + 40);
    fg.addColorStop(0, 'rgba(0,0,0,0.28)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fg; g.fillRect(0, FLOOR_Y + 2, W0, 40);
  }

  // ------------------------------------------------------------ 창문 (도시 풍경, 시간대 따라)
  const WX = 318, WY = 64, WW = 452, WH = 228;
  function windowView(g, time, t, season) {
    // 창틀 그림자 · 틀
    R(g, WX - 10, WY - 10, WW + 20, WH + 22, '#b9b4ab');
    R(g, WX - 6, WY - 6, WW + 12, WH + 12, '#8d929a');
    // 하늘
    const c = (season === 'winter' && SKY_WINTER[time]) || SKY[time];
    const sg = g.createLinearGradient(0, WY, 0, WY + WH);
    sg.addColorStop(0, c[0]); sg.addColorStop(1, c[1]);
    g.fillStyle = sg; g.fillRect(WX, WY, WW, WH);
    if (time === 'night') {
      for (let i = 0; i < 40; i++) {
        g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.5 + rnd(i + 9)) + i));
        R(g, WX + rnd(i) * WW, WY + rnd(i + 300) * 90, 2, 2, '#fff');
      }
      g.globalAlpha = 1;
    } else {
      // 구름 몇 조각
      g.fillStyle = time === 'evening' ? 'rgba(255,214,190,0.55)' : 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 4; i++) {
        const cx = WX + ((rnd(i + 40) * WW + t * 4 * (0.5 + rnd(i))) % (WW + 120)) - 60, cy = WY + 24 + rnd(i + 60) * 50;
        g.fillRect(Math.round(cx), Math.round(cy), 64, 10); g.fillRect(Math.round(cx + 12), Math.round(cy - 8), 34, 10);
      }
    }
    // 먼 빌딩 (연하게) → 가까운 빌딩 (진하게)
    const far = { morning: '#9fb0c6', day: '#93a9c4', evening: '#6c5f88', night: '#1b2348' }[time];
    const near = { morning: '#6f8098', day: '#64788f', evening: '#3f3a5e', night: '#121733' }[time];
    const lit = time === 'night' ? '#ffd877' : time === 'evening' ? '#ffcf8a' : 'rgba(220,236,250,0.75)';
    g.save(); g.beginPath(); g.rect(WX, WY, WW, WH); g.clip();
    for (let i = 0, x = WX - 10; x < WX + WW; i++) {
      const w = 34 + Math.floor(rnd(i + 900) * 30), h = 70 + Math.floor(rnd(i + 950) * 80);
      R(g, x, WY + WH - h, w, h, far);
      if (season === 'winter') R(g, x, WY + WH - h, w, 3, time === 'night' ? '#3a4672' : '#eef3f8');
      x += w + 4;
    }
    for (let i = 0, x = WX - 20; x < WX + WW; i++) {
      const w = 40 + Math.floor(rnd(i + 100) * 36), h = 40 + Math.floor(rnd(i + 150) * 110);
      const top = WY + WH - h;
      R(g, x, top, w, h, near);
      if (rnd(i + 170) > 0.6) R(g, x + w / 2 - 1, top - 14, 2, 14, near);   // 안테나
      if (season === 'winter') { R(g, x, top, w, 4, time === 'night' ? '#5a6690' : '#f4f7fb'); R(g, x + 3, top + 4, w - 6, 2, time === 'night' ? '#3e4a74' : '#dfe7f0'); }
      // 창문 불빛
      for (let yy = top + 8; yy < WY + WH - 6; yy += 12) {
        for (let xx = x + 5; xx < x + w - 8; xx += 9) {
          const k = rnd(xx * 3.1 + yy * 7.7);
          if (time === 'night' ? k > 0.55 : time === 'evening' ? k > 0.7 : k > 0.82) R(g, xx, yy, 4, 5, lit);
        }
      }
      x += w + 6;
    }
    streetTrees(g, time, t, season);
    seasonFall(g, time, t, season);
    // 유리 반사 (사선 빛)
    g.fillStyle = 'rgba(255,255,255,0.10)';
    for (const ox of [40, 200, 340]) { g.beginPath(); g.moveTo(WX + ox, WY + WH); g.lineTo(WX + ox + 50, WY + WH); g.lineTo(WX + ox + 140, WY); g.lineTo(WX + ox + 90, WY); g.closePath(); g.fill(); }
    g.restore();
    // 창살 (세 칸) · 창틀
    for (const k of [1, 2]) R(g, WX + (WW / 3) * k - 3, WY, 6, WH, '#8d929a');
    R(g, WX, WY + 150, WW, 5, '#8d929a');
    R(g, WX, WY, WW, 2, '#6f747c');
    // 블라인드 (위쪽에 반쯤 내려옴)
    R(g, WX - 8, WY - 8, WW + 16, 10, '#f2f0ec');
    for (let y = WY + 2; y < WY + 40; y += 6) { R(g, WX, y, WW, 4, '#efede8'); R(g, WX, y + 4, WW, 1, '#c9c5be'); }
    R(g, WX + 70, WY + 40, 2, 60, '#c9c5be'); R(g, WX + 68, WY + 100, 6, 6, '#bdb8b0');   // 블라인드 줄
    // 창턱
    R(g, WX - 16, WY + WH + 6, WW + 32, 8, '#f4f2ee');
    R(g, WX - 16, WY + WH + 14, WW + 32, 3, '#b9b4ab');
  }

  // 창 아래쪽 가로수 줄 — 계절마다 나무 종류가 달라요
  //   봄: 벚나무 · 여름: 둥근 느티나무 + 키 큰 미루나무 · 가을: 노란 은행나무 + 빨간 단풍나무 · 겨울: 눈 쌓인 앙상한 나무 + 눈 덮인 소나무
  // 잎 덩어리 하나: 2px 줄마다 원(타원) 폭만큼, 위쪽 왼편은 밝게 · 아래쪽은 어둡게
  function blob(g, cx, cy, rx, ry, c) {
    for (let y = -ry; y < ry; y += 2) {
      const f = 1 - ((y + 1) * (y + 1)) / (ry * ry);
      const w = Math.round(rx * Math.sqrt(Math.max(0, f)));
      if (w < 1) continue;
      const k = (y + ry) / (2 * ry);   // 0 위 → 1 아래
      R(g, cx - w, cy + y, w * 2, 2, k > 0.7 ? c.dark : c.mid);
      if (k < 0.42) R(g, cx - w, cy + y, Math.max(2, Math.round(w * 0.85)), 2, c.light);
    }
  }
  // 도트 선 (가지)
  function pline(g, x0, y0, x1, y1, w, c) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 1.5));
    for (let i = 0; i <= n; i++) R(g, x0 + ((x1 - x0) * i) / n - w / 2, y0 + ((y1 - y0) * i) / n - w / 2, w, w, c);
  }
  // 갈라지는 가지 (끝점 목록을 돌려줘요)
  function branches(g, x, y, len, ang, depth, w, c, ends, seed) {
    const x1 = x + Math.cos(ang) * len, y1 = y - Math.sin(ang) * len;
    pline(g, x, y, x1, y1, w, c);
    if (depth <= 0) { ends.push([x1, y1]); return; }
    const sp = 0.42 + rnd(seed) * 0.25;
    branches(g, x1, y1, len * 0.72, ang + sp, depth - 1, Math.max(1, w - 1), c, ends, seed * 3 + 1);
    branches(g, x1, y1, len * 0.72, ang - sp, depth - 1, Math.max(1, w - 1), c, ends, seed * 3 + 2);
  }
  const trunk = (g, x, base, h, w, c) => { R(g, x - w / 2, base - h, w, h, c); R(g, x + w / 2 - 2, base - h, 2, h, 'rgba(0,0,0,0.2)'); };

  // 잎 무더기: 덩어리마다 아래쪽 그늘 → 가운데 → 위 왼쪽 밝은 면 순서로 겹쳐서 몽글몽글하게
  // parts = [[dx, dy, rx, ry, 색 번호], ...]  cs = [{ light, mid, dark }, ...]
  function canopy(g, cx, cy, sz, parts, cs) {
    const P = parts.map(([dx, dy, rx, ry, k]) => [cx + dx * sz, cy + dy * sz, Math.max(2, rx * sz), Math.max(2, ry * sz), cs[k || 0]]);
    const ell = (x, y, rx, ry, col) => {
      for (let yy = -ry; yy < ry; yy += 2) {
        const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - ((yy + 1) * (yy + 1)) / (ry * ry))));
        if (w > 0) R(g, x - w, y + yy, w * 2, 2, col);
      }
    };
    for (const [x, y, rx, ry, c] of P) ell(x, y + 3, rx, ry, c.dark);
    for (const [x, y, rx, ry, c] of P) ell(x, y, rx, ry * 0.9, c.mid);
    for (const [x, y, rx, ry, c] of P) ell(x - rx * 0.22, y - ry * 0.3, rx * 0.6, ry * 0.5, c.light);
  }
  const sprinkle = (g, cx, cy, sz, w, h, n, seed, cols) => { for (let k = 0; k < n; k++) R(g, cx + (rnd(seed * 13 + k) - 0.5) * w * sz, cy + (rnd(seed * 7 + k) - 0.5) * h * sz, 2, 2, cols[k % cols.length]); };

  // 🌸 벚나무: 우산처럼 넓게 퍼진 분홍 꽃 · 아래로 가지가 살짝 보임
  function cherry(g, x, base, sz, i) {
    const tr = '#5a3a2a', h = 18 * sz, cy = base - h - 12 * sz;
    trunk(g, x, base, h, 6, tr);
    pline(g, x, base - h + 2, x - 14 * sz, cy + 6 * sz, 3, tr); pline(g, x, base - h + 2, x + 15 * sz, cy + 5 * sz, 3, tr); pline(g, x, base - h, x + 2, cy, 3, tr);
    const C = [{ light: '#fff0f4', mid: '#fbc0d2', dark: '#e88aa8' }, { light: '#ffe4ec', mid: '#f7a8c2', dark: '#d9708f' }];
    canopy(g, x, cy, sz, [[-20, 2, 10, 7, 1], [-9, -5, 11, 8, 0], [6, -6, 11, 8, 1], [19, 1, 10, 7, 0], [-1, 3, 12, 7, 0], [-29, 6, 6, 5, 0], [29, 6, 6, 5, 1]], C);
    pline(g, x - 10 * sz, cy + 9 * sz, x - 16 * sz, cy + 11 * sz, 2, tr); pline(g, x + 11 * sz, cy + 9 * sz, x + 18 * sz, cy + 10 * sz, 2, tr);   // 꽃 아래로 삐죽 나온 가지
    sprinkle(g, x, cy - 2 * sz, sz, 56, 14, 8, i + 1, ['#ffffff', '#d9708f']);
  }
  // 🌿 느티나무: 크고 둥글게 부푼 진초록
  function zelkova(g, x, base, sz, i) {
    const h = 16 * sz, cy = base - h - 16 * sz;
    trunk(g, x, base, h, 7, '#5a3a24');
    pline(g, x, base - h + 2, x - 9 * sz, cy + 8 * sz, 3, '#5a3a24'); pline(g, x, base - h + 2, x + 9 * sz, cy + 8 * sz, 3, '#5a3a24');
    const C = [{ light: '#8ed46c', mid: '#4aa844', dark: '#2a7230' }, { light: '#7cc65e', mid: '#3c963a', dark: '#24662c' }];
    canopy(g, x, cy, sz, [[0, -10, 15, 12, 0], [-13, 0, 11, 10, 1], [13, 0, 11, 10, 0], [0, 6, 14, 8, 1], [-6, -20, 9, 7, 1], [7, -19, 9, 7, 0]], C);
    sprinkle(g, x, cy - 6 * sz, sz, 34, 26, 5, i + 3, ['#b6ea9c']);
  }
  // 🌿 미루나무: 가늘고 키 큰 초록 기둥
  function poplar(g, x, base, sz, i) {
    const h = 10 * sz, cy = base - h - 22 * sz;
    trunk(g, x, base, h, 4, '#5a3a24');
    const C = [{ light: '#9ade80', mid: '#56b04a', dark: '#2f7f34' }];
    canopy(g, x, cy, sz, [[0, 12, 9, 10], [0, 0, 10, 12], [0, -14, 8, 11], [0, -26, 5, 7]], C);
    sprinkle(g, x, cy - 6 * sz, sz, 12, 36, 4, i + 5, ['#c2f0aa']);
  }
  // 🍁 은행나무: 위로 갸름한 샛노란 달걀 모양
  function ginkgo(g, x, base, sz, i) {
    const h = 12 * sz, cy = base - h - 18 * sz;
    trunk(g, x, base, h, 5, '#5a3a24');
    const C = [{ light: '#fff09a', mid: '#f6c62c', dark: '#cf9417' }, { light: '#ffe680', mid: '#ecb820', dark: '#c48612' }];
    canopy(g, x, cy, sz, [[0, -20, 6, 7, 0], [-2, -10, 10, 9, 1], [1, 0, 13, 10, 0], [-1, 9, 15, 8, 1], [-11, 12, 7, 5, 0], [11, 12, 7, 5, 1]], C);
    sprinkle(g, x, cy, sz, 24, 40, 6, i + 7, ['#fff6c0', '#b07a10']);
  }
  // 🍁 단풍나무: 빨강 · 주황이 섞인 들쭉날쭉한 덩어리
  function maple(g, x, base, sz, i) {
    const h = 15 * sz, cy = base - h - 13 * sz;
    trunk(g, x, base, h, 5, '#4a2e20');
    pline(g, x, base - h + 2, x - 12 * sz, cy + 6 * sz, 3, '#4a2e20'); pline(g, x, base - h + 2, x + 12 * sz, cy + 5 * sz, 3, '#4a2e20');
    const C = [{ light: '#ff9a5a', mid: '#e5482c', dark: '#a82a24' }, { light: '#ffc060', mid: '#f07a2a', dark: '#c4502a' }];
    canopy(g, x, cy, sz, [[0, -8, 14, 10, 0], [-14, 1, 10, 9, 1], [14, 0, 10, 9, 0], [-5, -18, 9, 7, 1], [8, -17, 8, 7, 0], [0, 6, 12, 7, 1]], C);
    sprinkle(g, x, cy - 4 * sz, sz, 40, 26, 7, i + 9, ['#ffd36a', '#7a1a1a']);
  }
  // ❄️ 앙상한 나무: 갈라지는 가지 끝마다 눈
  function bareTree(g, x, base, sz, i) {
    const tr = '#4a3a30', h = 18 * sz;
    trunk(g, x, base, h, 6, tr);
    const ends = [];
    branches(g, x, base - h, 11 * sz, Math.PI / 2 + 0.4, 2, 4, tr, ends, i + 2);
    branches(g, x, base - h, 12 * sz, Math.PI / 2 - 0.35, 2, 4, tr, ends, i + 9);
    branches(g, x, base - h, 9 * sz, Math.PI / 2, 1, 3, tr, ends, i + 4);
    for (const [ex, ey] of ends) { R(g, ex - 4, ey - 2, 8, 3, '#ffffff'); R(g, ex - 2, ey - 3, 4, 1, '#ffffff'); }
    R(g, x - 4, base - h - 1, 8, 2, '#f4f7fb');   // 갈라지는 곳에 쌓인 눈
  }
  // ❄️ 소나무: 층층이 삼각형 + 층마다 소복한 눈
  function snowPine(g, x, base, sz, i) {
    trunk(g, x, base, 8 * sz, 6, '#4a3424');
    const tiers = 3, th = 15 * sz;
    let top = 0;
    for (let t = 0; t < tiers; t++) {
      const ty = base - 8 * sz - (tiers - t) * th * 0.7 - th * 0.3, half = (8 + t * 5) * sz;
      if (!t) top = ty;
      for (let y = 0; y < th; y += 2) {
        const w = Math.round(2 + (y / th) * half);
        R(g, x - w, ty + y, w * 2, 2, y > th * 0.62 ? '#1f4a3a' : '#2f6a50');
        if (y < th * 0.42) R(g, x - w, ty + y, w * 2, 2, '#f6f9fc');
        else if (y < th * 0.58) R(g, x - w, ty + y, Math.round(w * 0.9), 2, '#dbe5f0');
      }
    }
    R(g, x - 2, top - 3, 4, 4, '#ffffff');
  }
  const KINDS = { spring: [cherry, cherry], summer: [zelkova, poplar], autumn: [ginkgo, maple], winter: [bareTree, snowPine] };

  function streetTrees(g, time, t, season) {
    const base = WY + WH;
    const kinds = KINDS[season];
    for (let i = 0, x = WX + 14; x < WX + WW + 30; i++) {
      const pick = kinds[(i + (rnd(i + 77) > 0.75 ? 1 : 0)) % 2];
      const sz = 1.15 + rnd(i + 430) * 0.3;
      pick(g, x, base - 4, sz, i);
      x += Math.round((pick === poplar || pick === snowPine || pick === ginkgo ? 40 : 66) * sz) + Math.floor(rnd(i + 400) * 12);
    }
    // 길: 봄엔 꽃잎 · 가을엔 낙엽 · 겨울엔 눈이 쌓인 길
    R(g, WX, base - 4, WW, 4, season === 'winter' ? '#e8eef5' : season === 'summer' ? '#5f8a4a' : '#6c7280');
    if (season === 'spring' || season === 'autumn') {
      for (let k = 0; k < 60; k++) R(g, WX + rnd(k + 600) * WW, base - 4 + (k % 2) * 2, 2, 2, season === 'spring' ? (k % 2 ? '#ffd0de' : '#f59ab8') : ['#f2c230', '#e8582e', '#ffb24a'][k % 3]);
    }
    // 시간대 그늘 (밤엔 어둡게, 저녁엔 노을빛)
    const shade = { night: 'rgba(8,12,40,0.55)', evening: 'rgba(70,30,60,0.22)', morning: 'rgba(255,220,200,0.08)', day: null }[time];
    if (shade) { g.fillStyle = shade; g.fillRect(WX, base - 100, WW, 100); }
  }
  // 꽃잎 · (여름) 없음 · 낙엽 · 눈 이 창밖에 흩날림
  function seasonFall(g, time, t, season) {
    if (season === 'summer') return;
    const n = season === 'winter' ? 46 : 22;
    const dim = time === 'night' ? 0.55 : 1;
    for (let i = 0; i < n; i++) {
      const sp = 14 + rnd(i + 30) * 18;
      const x = WX + ((rnd(i + 11) * WW + t * (season === 'winter' ? 6 : 16) + Math.sin(t * 1.3 + i) * 8) % WW + WW) % WW;
      const y = WY + 30 + ((rnd(i + 21) * WH + t * sp) % (WH - 30));
      g.globalAlpha = dim;
      if (season === 'winter') R(g, x, y, i % 4 ? 2 : 3, i % 4 ? 2 : 3, '#ffffff');
      else if (season === 'spring') { R(g, x, y, 3, 2, i % 2 ? '#ffd0de' : '#ffb3c9'); R(g, x + 1, y + 2, 2, 1, '#f59ab8'); }
      else { const c = ['#e8742e', '#d9472c', '#f2b136'][i % 3]; R(g, x, y, 4, 3, c); R(g, x + 1, y + 3, 2, 1, c); }
    }
    g.globalAlpha = 1;
  }

  // ------------------------------------------------------------ 발표 화면 · 시계 · 화분
  function screen(g) {
    const x = 44, y = 84, w = 204, h = 124;
    R(g, x + 4, y + 6, w, h, 'rgba(0,0,0,0.18)');             // 그림자
    R(g, x, y, w, h, '#22252b');                               // 베젤
    R(g, x + 6, y + 6, w - 12, h - 12, '#f7f8fb');             // 화면
    R(g, x + 6, y + 6, w - 12, 18, '#3d6fd8');                 // 제목 줄
    g.font = 'bold 11px "Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
    g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillText('운영 회의', x + 13, y + 15.5);
    g.textBaseline = 'alphabetic';
    // 막대그래프
    const base = y + h - 18;
    R(g, x + 18, base, 100, 2, '#9aa3b2');
    [[22, '#7fa8f0'], [38, '#7fa8f0'], [30, '#7fa8f0'], [56, '#3d6fd8'], [48, '#f2a65a']].forEach(([bh, col], i) => R(g, x + 22 + i * 19, base - bh, 12, bh, col));
    // 오른쪽 목록 줄
    for (let i = 0; i < 4; i++) { R(g, x + 132, y + 40 + i * 16, 6, 6, i === 0 ? '#f2a65a' : '#7fa8f0'); R(g, x + 142, y + 41 + i * 16, 40 - (i % 2) * 12, 4, '#c3cad6'); }
    // 아래 받침 (얇은 바)
    R(g, x + w / 2 - 20, y + h, 40, 4, '#3a3e46');
    // 전원 불빛
    R(g, x + w - 12, y + h - 4, 3, 2, '#5cd17a');
  }
  function clock(g) {
    const cx = 284, cy = 110, r = 18;
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.arc(cx + 2, cy + 3, r + 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3a3e46'; g.beginPath(); g.arc(cx, cy, r + 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fbfbf8'; g.beginPath(); g.arc(cx, cy, r - 1, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; R(g, cx + Math.sin(a) * (r - 5) - 1, cy - Math.cos(a) * (r - 5) - 1, 2, 2, '#555'); }
    const d = new Date();
    const hand = (a, len, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len); g.stroke(); };
    hand(((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2, 8, 2.5, '#2a2a2e');
    hand((d.getMinutes() / 60) * Math.PI * 2, 12, 2, '#2a2a2e');
    hand((d.getSeconds() / 60) * Math.PI * 2, 13, 1, '#e0463a');
    R(g, cx - 1.5, cy - 1.5, 3, 3, '#2a2a2e');
  }
  function plant(g, x, floor) {
    // 큰 화분 (왼쪽 구석)
    R(g, x - 16, floor - 40, 32, 40, '#e9e6e0');
    R(g, x - 18, floor - 44, 36, 6, '#f6f4f0');
    R(g, x + 8, floor - 38, 6, 36, '#d6d2ca');
    R(g, x - 14, floor - 46, 28, 3, '#5a3e2a');
    const leaf = (lx, ly, w, h, c) => R(g, x + lx, floor + ly, w, h, c);
    const L = '#3f8a4a', D = '#2c6b3a', H = '#5cae5a';
    [[-4, -120, 8, 76, D], [-22, -104, 10, 50, L], [-30, -96, 10, 14, H], [14, -108, 10, 56, L], [22, -98, 10, 14, H],
      [-14, -132, 10, 40, L], [4, -140, 10, 50, H], [-10, -84, 8, 34, D], [8, -88, 8, 36, D], [-34, -78, 12, 8, L], [24, -82, 12, 8, L]]
      .forEach(([a, b, w, h, c]) => leaf(a, b, w, h, c));
  }

  // ------------------------------------------------------------ 의자
  function officeChair(g, cx, y, faceLeft, boss) {
    // y = 앉는 면 높이(캐릭터 발/엉덩이 위치)
    const dk = boss ? '#3a2a24' : '#2b2f38', md = boss ? '#4e3a30' : '#3a404c', hi = boss ? '#6a5040' : '#4c5462';
    const s = faceLeft ? 1 : -1;               // 등받이는 바라보는 쪽 반대편
    const bx = cx + s * 22;                    // 등받이 가운데
    const backTop = y - (boss ? 78 : 60);
    // 등받이
    R(g, bx - 8, backTop + 4, 16, y - backTop, dk);
    R(g, bx - 6, backTop, 12, 6, dk);
    R(g, bx - 5, backTop + 4, 10, y - backTop - 6, md);
    R(g, bx - 3 - s * 2, backTop + 6, 3, y - backTop - 14, hi);
    if (boss) { for (let k = 0; k < 3; k++) R(g, bx - 4, backTop + 18 + k * 16, 8, 2, dk); R(g, bx - 7, backTop - 6, 14, 8, dk); R(g, bx - 5, backTop - 4, 10, 4, md); }
    // 앉는 면
    R(g, cx - 28, y, 56, 12, dk);
    R(g, cx - 26, y + 1, 52, 5, md);
    R(g, cx - 24, y + 1, 48, 2, hi);
    // 팔걸이 (등받이 쪽에서 앞으로)
    R(g, cx + s * 2 - (s > 0 ? 0 : 26), y - 18, 26, 4, dk);
    R(g, cx + s * 14 - 2, y - 16, 4, 16, dk);
    // 가스 실린더 · 다리 · 바퀴
    R(g, cx - 3, y + 12, 6, 20, '#8a8f98');
    R(g, cx - 1, y + 12, 2, 20, '#b4b9c1');
    R(g, cx - 30, y + 32, 60, 5, '#2a2d33');
    R(g, cx - 10, y + 30, 20, 4, '#2a2d33');
    for (const wx of [-30, -6, 22]) { R(g, cx + wx, y + 37, 8, 6, '#1c1e22'); R(g, cx + wx + 2, y + 38, 3, 2, '#3a3e46'); }
  }

  // ------------------------------------------------------------ 테이블 · 테이블 위 물건
  const TX = 192, TW = 462, TT = 402, TD = 34, TF = 16;
  function table(g) {
    // 그림자
    g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(TX + 28, TT + TD + TF + 56, TW - 56, 4);
    // 다리 (판넬형 두 개)
    for (const lx of [TX + 34, TX + TW - 58]) {
      R(g, lx, TT + TD + TF, 24, 56, '#4a3020');
      R(g, lx + 3, TT + TD + TF, 4, 56, '#5e3e2a');
      R(g, lx - 6, TT + TD + TF + 52, 36, 6, '#3a251a');
    }
    // 가운데 가림판
    R(g, TX + 58, TT + TD + TF, TW - 116, 26, '#523523');
    R(g, TX + 58, TT + TD + TF, TW - 116, 3, 'rgba(0,0,0,0.25)');
    // 윗면 (뒤가 살짝 어둡게) + 둥근 모서리
    const tg = g.createLinearGradient(0, TT, 0, TT + TD);
    tg.addColorStop(0, '#7c5236'); tg.addColorStop(1, '#94653f');
    g.fillStyle = tg;
    g.beginPath();
    g.moveTo(TX + 14, TT); g.lineTo(TX + TW - 14, TT); g.quadraticCurveTo(TX + TW, TT, TX + TW, TT + 14);
    g.lineTo(TX + TW, TT + TD); g.lineTo(TX, TT + TD); g.lineTo(TX, TT + 14); g.quadraticCurveTo(TX, TT, TX + 14, TT); g.closePath(); g.fill();
    // 나뭇결
    g.fillStyle = 'rgba(255,230,190,0.08)';
    for (let i = 0; i < 6; i++) g.fillRect(TX + 20 + rnd(i + 20) * (TW - 120), TT + 6 + (i % 4) * 7, 60 + rnd(i + 30) * 80, 1);
    R(g, TX + 4, TT + TD - 3, TW - 8, 3, '#a8784c');           // 앞 모서리 하이라이트
    // 앞면
    R(g, TX, TT + TD, TW, TF, '#5a3a26');
    R(g, TX, TT + TD, TW, 2, '#6e4a32');
    R(g, TX, TT + TD + TF - 2, TW, 2, '#47301f');
  }
  function tableItems(g) {
    const top = TT, mid = TT + TD / 2;
    // 가운데 회의용 전화 (스피커폰)
    R(g, 410, mid - 4, 34, 8, '#2a2d33'); R(g, 414, mid - 7, 26, 4, '#3a3e46'); R(g, 425, mid - 5, 4, 2, '#5cd17a');
    // 메모장 + 펜
    for (const [nx, ny] of [[350, top + 18], [478, top + 8], [588, top + 18], [300, top + 22]]) {
      R(g, nx, ny, 26, 9, '#fbfaf4'); R(g, nx, ny, 26, 2, '#f2c94c'); R(g, nx + 4, ny + 4, 16, 1, '#c9c9c0'); R(g, nx + 28, ny + 3, 14, 2, '#2a5ab8');
    }
    // 물병 · 컵
    for (const bx of [330, 462, 566]) {
      R(g, bx, top - 6, 8, 22, 'rgba(170,215,245,0.85)'); R(g, bx + 1, top - 4, 2, 16, 'rgba(255,255,255,0.7)');
      R(g, bx + 1, top - 10, 6, 4, '#3a7ad8');
    }
    R(g, 520, top + 2, 10, 10, '#f4f2ee'); R(g, 530, top + 4, 3, 5, '#f4f2ee'); R(g, 521, top + 2, 8, 2, '#6a4430');   // 커피잔
    // 대표 자리 앞 서류 묶음
    R(g, 198, mid - 2, 30, 10, '#fbfaf4'); R(g, 200, mid - 4, 30, 2, '#e4e2da'); R(g, 200, mid + 2, 22, 1, '#c9c9c0');
  }

  // ------------------------------------------------------------ 8번 자리: 구석 수납장 + 인형 방석
  function credenza(g) {
    const x = 664, y = 458, w = 128, h = 104;
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 4, y + h, w - 4, 6);
    R(g, x, y, w, h, '#6e4a32');
    R(g, x - 4, y - 6, w + 8, 8, '#8a6040');
    R(g, x - 4, y - 6, w + 8, 2, '#a8784c');
    R(g, x + 6, y + 8, w / 2 - 9, h - 18, '#7c5638'); R(g, x + w / 2 + 3, y + 8, w / 2 - 9, h - 18, '#7c5638');
    R(g, x + w / 2 - 8, y + 44, 3, 14, '#d8c8a0'); R(g, x + w / 2 + 5, y + 44, 3, 14, '#d8c8a0');
    R(g, x + 4, y + h - 4, 6, 6, '#3a251a'); R(g, x + w - 10, y + h - 4, 6, 6, '#3a251a');
    // 작은 화분
    R(g, x + 6, y - 22, 16, 16, '#f0ede6'); R(g, x + 6, y - 22, 16, 3, '#dcd8d0');
    [[2, -40, 6, 18], [10, -46, 6, 24], [18, -38, 6, 16], [-2, -32, 6, 8], [22, -30, 6, 8]].forEach(([a, b, ww, hh], i) => R(g, x + 6 + a, y + b, ww, hh, i % 2 ? '#5cae5a' : '#3f8a4a'));
    // 인형용 방석 (분홍)
    R(g, 720, y - 10, 48, 8, '#e98aa8'); R(g, 722, y - 12, 44, 4, '#f4a6bf'); R(g, 726, y - 12, 10, 2, '#fbd0dd');
  }

  // 화면 맨 앞: 아주 옅은 비네트
  function vignette(g) {
    const vg = g.createRadialGradient(W0 / 2, H0 / 2, 260, W0 / 2, H0 / 2, 560);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,12,24,0.22)');
    g.fillStyle = vg; g.fillRect(0, 0, W0, H0);
  }

  /** W·H 는 캔버스(논리) 크기. 800×600 기준으로 그리고 남는 폭은 가운데 맞춤 */
  function draw(g, W, H, t, drawSeat, opt) {
    const time = timeOf(opt), season = seasonOf(opt);
    const s = Math.min(W / W0, H / H0);
    g.save();
    if (s !== 1 || W !== W0) { g.fillStyle = '#2a2e38'; g.fillRect(0, 0, W, H); g.translate((W - W0 * s) / 2, (H - H0 * s) / 2); g.scale(s, s); }
    const seat = (n) => { if (drawSeat) { try { drawSeat(g, n, SEATS[n]); } catch (e) { /* 한 명 그리다 실패해도 회의장은 계속 */ } } };
    room(g, time, t);
    windowView(g, time, t, season);
    screen(g);
    clock(g);
    plant(g, 40, FLOOR_Y + 70);
    // 뒷줄 의자 → 뒷줄 사람 → 테이블 → 1번 → 앞줄 → 구석 8번
    for (const n of [6, 4, 2]) officeChair(g, SEATS[n].cx, SEATS[n].bottom, true, false);
    for (const n of [6, 4, 2]) seat(n);
    table(g);
    tableItems(g);
    officeChair(g, SEATS[1].cx, SEATS[1].bottom, false, true);
    seat(1);
    credenza(g);
    seat(8);
    for (const n of [7, 5, 3]) { officeChair(g, SEATS[n].cx, SEATS[n].bottom, true, false); seat(n); }
    vignette(g);
    g.restore();
  }

  return { draw, SEATS, W: W0, H: H0, timeOf, seasonOf, SEASONS };
})();
