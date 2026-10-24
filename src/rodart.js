// 낚싯대 도트 그림. 손잡이는 왼쪽 아래, 끝은 오른쪽 위 (낚시터 각도와 같음).
window.RodArt = (() => {
  function hexToRgb(h) { const n = parseInt(String(h).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const toHex = (r) => '#' + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, k) => { const x = hexToRgb(a), y = hexToRgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * k)); };
  const lit = (c, k) => mix(c, '#fff8e8', k);
  const dim = (c, k) => mix(c, '#141020', k);

  // 낚싯대마다: blank 몸통 · grip 손잡이 · wrap 감은 실 · reel 릴 · guide 고리 · 특징(fx)
  const KINDS = {
    rod1: { blank: '#c9a45c', grip: '#8a6a3a', wrap: '#e8d8a8', reel: '#7a5030', guide: '#5c4030', fx: 'node' },
    rod2: { blank: '#8b5a3c', grip: '#d8b080', wrap: '#3a2418', reel: '#5c3a26', guide: '#c8ccd2', fx: 'grain' },
    rod3: { blank: '#9aa0a6', grip: '#34343c', wrap: '#5a6068', reel: '#c8ccd2', guide: '#eef0f4', fx: 'metal' },
    rod4: { blank: '#2a2a32', grip: '#4a4a52', wrap: '#d9483a', reel: '#3a3a42', guide: '#c8ccd2', fx: 'weave' },
    rod5: { blank: '#d7dbe0', grip: '#3a4a6a', wrap: '#4a8ae0', reel: '#eef0f4', guide: '#ffffff', fx: 'metal' },
    rod6: { blank: '#f4cf4f', grip: '#7a2a2a', wrap: '#ffffff', reel: '#f4cf4f', guide: '#fff6c0', fx: 'gem' },
    rod7: { blank: '#e8894a', grip: '#3a2030', wrap: '#f4cf4f', reel: '#f4cf4f', guide: '#fff0b0', fx: 'flame' },
    rod8: { blank: '#b04ae0', grip: '#2a1a3a', wrap: '#5ae0e8', reel: '#d8a0f0', guide: '#ffffff', fx: 'star' },
  };
  const W = 29, H = 28, BOT = 26, TOP = 1, X0 = 2, SLOPE = 1;   // 45도라 계단 없이 매끈한 도트 선
  const cx = (y) => X0 + (BOT - y) * SLOPE;
  // 칸 위치: 손잡이 끝(버트)과 끝(팁) — 낚싯줄은 TIP에서 나감
  const BUTT = { x: Math.round(cx(BOT)), y: BOT }, TIP = { x: Math.round(cx(TOP)), y: TOP };

  function build(id) {
    const k = KINDS[id] || KINDS.rod1;
    const g = Array.from({ length: H + 2 }, () => new Array(W + 2).fill(null));
    const set = (x, y, c) => { x = Math.round(x) + 1; y = Math.round(y) + 1; if (x >= 0 && y >= 0 && x < W + 2 && y < H + 2 && c) g[y][x] = c; };
    const get = (x, y) => (x >= 0 && y >= 0 && x < W + 2 && y < H + 2 ? g[y][x] : null);
    for (let y = TOP; y <= BOT; y++) {
      const u = (BOT - y) / (BOT - TOP);           // 0 손잡이 → 1 끝
      const x = Math.floor(cx(y));
      const grip = u < 0.26, wide = u < 0.84;
      const w = grip ? 3 : wide ? 2 : 1;
      let base = grip ? k.grip : k.blank;
      if (k.fx === 'flame' && !grip) base = mix(k.blank, '#d83a3a', Math.max(0, u - 0.4) * 1.3);
      for (let i = 0; i < w; i++) {
        let c = base;
        if (w > 1) c = i === 0 ? lit(base, 0.28) : i === 2 ? dim(base, 0.18) : base;
        if (grip && k.fx === 'grain') c = (y + i) % 3 === 0 ? dim(c, 0.12) : c;              // 코르크 결
        if (grip && k.fx !== 'grain' && y % 2 === 0 && i === 1) c = dim(base, 0.12);          // 감은 손잡이
        if (!grip && k.fx === 'node' && y % 5 === 0) c = dim(k.blank, 0.28);                 // 대나무 마디
        if (!grip && k.fx === 'grain' && i === 0 && y % 4 === 1) c = dim(k.blank, 0.15);
        if (!grip && k.fx === 'metal' && i === 0) c = lit(k.blank, 0.55);
        if (!grip && k.fx === 'weave' && i === 1 && y % 2 === 0) c = lit(k.blank, 0.14);
        if (!grip && k.fx === 'star' && y % 6 === 2) c = '#ffffff';
        set(x + i, y, c);
      }
    }
    // 손잡이 끝 마개 · 손잡이와 몸통 사이 감은 실
    const yb = BOT, yg = Math.round(BOT - (BOT - TOP) * 0.26);
    for (let i = 0; i < 3; i++) set(Math.floor(cx(yb)) + i, yb + 1, dim(k.grip, 0.35));
    for (let i = 0; i < 3; i++) set(Math.floor(cx(yg)) + i, yg, k.wrap);
    // 고리 3개: 몸통에 감은 실 + 오른쪽 아래로 작은 고리
    for (const u of [0.45, 0.63, 0.8]) {
      const y = Math.round(BOT - (BOT - TOP) * u), x = Math.floor(cx(y));
      set(x, y, lit(k.wrap, 0.2)); set(x + 1, y, k.wrap);
      set(x + 2, y + 1, k.guide);
    }
    // 끝 장식
    set(TIP.x, TIP.y, k.fx === 'gem' || k.fx === 'flame' ? '#fff6c0' : lit(k.blank, 0.4));
    // 릴 (손잡이 아래 오른쪽)
    const ry = BOT - 4, rx = Math.floor(cx(ry)) + 4;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (dx * dx + dy * dy > 5) continue;
      const c = dx * dx + dy * dy <= 1 ? dim(k.reel, 0.3) : dy < 0 ? lit(k.reel, 0.25) : k.reel;
      set(rx + dx, ry + dy, c);
    }
    set(rx, ry, lit(k.reel, 0.5));
    set(rx - 3, ry - 1, dim(k.reel, 0.2));                    // 릴 다리
    set(rx + 3, ry + 1, dim(k.grip, 0.2)); set(rx + 3, ry + 2, k.wrap);   // 손잡이 노브
    if (k.fx === 'gem') { set(rx, ry, '#e0303a'); set(rx - 1, ry - 1, '#ff8890'); }
    if (k.fx === 'star') set(rx, ry, '#5ae0e8');
    // 테두리 (옆 색을 어둡게)
    // 몸통은 줄마다 양옆에만 테두리를 찍어 45도 선이 톱니 없이 매끈하게
    const edge = new Set();
    for (let y = TOP + 1; y <= BOT + 1; y++) {
      const row = g[y]; let l = row.findIndex(Boolean), r = row.length - 1 - [...row].reverse().findIndex(Boolean);
      if (l < 0) continue;
      if (l > 0 && !row[l - 1]) { row[l - 1] = dim(row[l], 0.6); edge.add(y * 1000 + l - 1); }
      if (r < row.length - 1 && !row[r + 1]) { row[r + 1] = dim(row[r], 0.6); edge.add(y * 1000 + r + 1); }
    }
    const body = (x, y) => (edge.has(y * 1000 + x) ? null : get(x, y));
    const add = [];
    for (let y = 0; y < H + 2; y++) for (let x = 0; x < W + 2; x++) {
      if (g[y][x]) continue;
      const n = body(x - 1, y) || body(x + 1, y) || body(x, y + 1) || body(x, y - 1);
      if (n) add.push([x, y, dim(n, 0.6)]);
    }
    for (const [x, y, c] of add) g[y][x] = c;
    const c = document.createElement('canvas'); c.width = W + 2; c.height = H + 2;
    const cg = c.getContext('2d');
    for (let y = 0; y < H + 2; y++) for (let x = 0; x < W + 2; x++) if (g[y][x]) { cg.fillStyle = g[y][x]; cg.fillRect(x, y, 1, 1); }
    return c;
  }
  const cache = new Map();
  function bitmap(id) { if (!cache.has(id)) cache.set(id, build(id)); return cache.get(id); }
  /** 끝(팁)이 (tx, ty)에 오도록 그리기. len: 손잡이까지 대략의 세로 길이(px) */
  function drawAt(ctx, id, tx, ty, len) {
    const bm = bitmap(id), s = Math.max(1, Math.round(len / (BOT - TOP)));   // 칸 크기는 정수로 (흐려지지 않게)
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bm, Math.round(tx - (TIP.x + 1.5) * s), Math.round(ty - (TIP.y + 0.5) * s), Math.round(bm.width * s), Math.round(bm.height * s));
    ctx.restore();
  }
  function thumb(id, side = 34) {
    const c = document.createElement('canvas'); c.width = side; c.height = side;
    const bm = bitmap(id), g = c.getContext('2d');
    const k = Math.max(1, Math.floor(Math.min(side / bm.width, side / bm.height)));
    g.imageSmoothingEnabled = false;
    g.drawImage(bm, Math.floor((side - bm.width * k) / 2), Math.floor((side - bm.height * k) / 2), bm.width * k, bm.height * k);
    return c;
  }
  return { bitmap, drawAt, thumb, KINDS };
})();
