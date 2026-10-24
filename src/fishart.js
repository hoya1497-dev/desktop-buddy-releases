// 물고기 · 쓰레기 도트 그림을 모양 재료(shape, c1, c2, pat)로 만들어 냄. 머리는 오른쪽.
// 몸통은 위가 밝고 아래가 어두운 3단 명암, 지느러미는 줄무늬 결, 테두리는 옆 색을 어둡게 한 색.
window.FishArt = (() => {
  const SIZE = { T: [16, 14], S: [20, 12], M: [26, 14], L: [36, 18] };

  function hexToRgb(h) { const n = parseInt(String(h).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const toHex = (r) => '#' + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, k) => { const x = hexToRgb(a), y = hexToRgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * k)); };
  const lit = (c, k) => mix(c, '#fff8e8', k);
  const dim = (c, k) => mix(c, '#141020', k);
  const INK = '#1a1a20';

  function grid(w, h) {
    const g = Array.from({ length: h }, () => new Array(w).fill(null));
    const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h && c) g[y][x] = c; };
    return { w, h, g, set, get: (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? g[y][x] : null) };
  }
  function ellipse(b, cx, cy, rx, ry, paint) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1.02) b.set(x, y, typeof paint === 'function' ? paint(x, y) : paint);
      }
    }
  }
  function tri(b, p, q, r, c) {
    const minX = Math.floor(Math.min(p[0], q[0], r[0])), maxX = Math.ceil(Math.max(p[0], q[0], r[0]));
    const minY = Math.floor(Math.min(p[1], q[1], r[1])), maxY = Math.ceil(Math.max(p[1], q[1], r[1]));
    const s = (a, b2, c2) => (a[0] - c2[0]) * (b2[1] - c2[1]) - (b2[0] - c2[0]) * (a[1] - c2[1]);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const pt = [x, y];
      const d1 = s(pt, p, q), d2 = s(pt, q, r), d3 = s(pt, r, p);
      const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(neg && pos)) b.set(x, y, typeof c === 'function' ? c(x, y) : c);
    }
  }
  function rect(b, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) b.set(x + i, y + j, typeof c === 'function' ? c(x + i, y + j) : c); }
  function line(b, x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) b.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }
  // 테두리: 바로 옆 칸 색을 어둡게 (쓰레기는 한 가지 진한 색)
  function outline(b, fixed) {
    const add = [];
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      if (b.g[y][x]) continue;
      const n = b.get(x - 1, y) || b.get(x + 1, y) || b.get(x, y + 1) || b.get(x, y - 1);
      if (n) add.push([x, y, fixed || dim(n, n === INK ? 0 : 0.62)]);
    }
    for (const [x, y, c] of add) b.g[y][x] = c;
  }
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) & 7;

  // 몸통 무늬
  function painter(a, cx, cy, rx, ry) {
    const { c1, c2 } = a;
    switch (a.pat) {
      case 'belly': return (x, y) => (y > cy + ry * 0.15 ? c2 : c1);
      case 'stripe': return (x, y) => (Math.abs(y - cy) < ry * 0.8 && Math.floor((x - cx + 60) / 3) % 2 === 0 && x < cx + rx * 0.45 ? c2 : c1);
      case 'band': {
        const b1 = Math.round(cx - rx * 0.4), b2 = Math.round(cx + rx * 0.3);
        return (x) => (Math.abs(x - b1) <= 1 || Math.abs(x - b2) <= 1 ? c2 : Math.abs(x - b1) === 2 || Math.abs(x - b2) === 2 ? INK : c1);
      }
      // 줄 맞춘 점박이 (가장자리엔 안 찍음)
      case 'spot': return (x, y) => {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        return dx * dx + dy * dy < 0.6 && (x + (y % 4 < 2 ? 0 : 2)) % 4 === 0 && y % 2 === 0 ? c2 : c1;
      };
      default: return () => c1;
    }
  }
  // 둥근 몸통 + 명암 (위 밝게, 아래 어둡게, 등에 반짝이 한 줄)
  function body(b, cx, cy, rx, ry, paint, opt = {}) {
    const hy = Math.round(cy - ry * 0.5);
    ellipse(b, cx, cy, rx, ry, (x, y) => {
      const c = typeof paint === 'function' ? paint(x, y) : paint;
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (!opt.noShine && y === hy && dx > -0.45 && dx < 0.35 && ry >= 3) return lit(c, 0.45);
      if (dy < -0.6 || (dx > 0.82 && dy < 0)) return lit(c, 0.2);
      if (dy > 0.62 || dx < -0.8) return dim(c, 0.2);
      return c;
    });
  }
  // 갈라진 꼬리: x0에서 붙어 왼쪽(xe)으로 퍼짐. fork 0 = 부채꼴, 1 = 깊게 갈라짐
  function tail(b, x0, cy, xe, spread, col, fork = 0.5) {
    const len = x0 - xe;
    for (let i = 0; i <= len; i++) {
      const t = i / len, h = 0.8 + spread * t, notch = fork * spread * Math.max(0, t - 0.6) * 1.6;
      for (let y = Math.floor(cy - h); y <= Math.ceil(cy + h); y++) {
        const d = Math.abs(y - cy);
        if (d > h || d < notch) continue;
        b.set(x0 - i, y, (y + 60) % 2 ? col : lit(col, 0.18));
      }
    }
  }
  // 지느러미 (결이 보이게)
  function fin(b, p, q, r, col) { tri(b, p, q, r, (x) => ((x + 60) % 2 ? col : lit(col, 0.16))); }
  function gill(b, x, cy, ry, col) { for (let y = Math.round(cy - ry * 0.45); y <= Math.round(cy + ry * 0.45); y++) b.set(x + (Math.abs(y - cy) > ry * 0.3 ? -1 : 0), y, col); }
  function eye(b, x, y, big) {
    x = Math.round(x); y = Math.round(y);
    if (big) {
      b.set(x, y, INK); b.set(x + 1, y, INK); b.set(x, y + 1, INK); b.set(x + 1, y + 1, INK);
      b.set(x, y, '#ffffff');
    } else {
      b.set(x, y, INK);
      if (b.get(x - 1, y)) b.set(x - 1, y, mix(b.get(x - 1, y), '#ffffff', 0.55));
    }
  }

  // 다듬기: 혼자 튀어나온 점은 지우고, 1칸짜리 구멍은 메움
  function tidy(b) {
    for (let pass = 0; pass < 2; pass++) {
      const n4 = (x, y) => [b.get(x - 1, y), b.get(x + 1, y), b.get(x, y - 1), b.get(x, y + 1)].filter(Boolean);
      const del = [], fill = [];
      for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
        const n = n4(x, y);
        const n8 = n.length + [b.get(x - 1, y - 1), b.get(x + 1, y - 1), b.get(x - 1, y + 1), b.get(x + 1, y + 1)].filter(Boolean).length;
        if (b.g[y][x] && n8 === 0) del.push([x, y]);
        else if (!b.g[y][x] && n.length >= 3) fill.push([x, y, n[0]]);
      }
      for (const [x, y] of del) b.g[y][x] = null;
      for (const [x, y, c] of fill) b.g[y][x] = c;
    }
  }

  // 손으로 찍은 도트: rows의 글자마다 pal 색 ('.'은 빈칸)
  function pix(b, rows, pal, ox = 0, oy = 0) {
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.' && pal[ch]) b.set(ox + x, oy + y, pal[ch]); }));
  }

  const SHAPES = {
    fish(b, a) {
      const cx = b.w * 0.55, cy = (b.h - 1) / 2, rx = b.w * 0.32, ry = b.h * 0.34;
      const fn = dim(a.c1, 0.18);
      tail(b, cx - rx + 2, cy, 1, ry * 1.05, fn, b.w > 24 ? 0.7 : 0.45);
      fin(b, [cx - rx * 0.45, cy - ry + 1], [cx + rx * 0.25, cy - ry + 1], [cx - rx * 0.55, cy - ry - 2.2], fn);
      fin(b, [cx - rx * 0.3, cy + ry - 1], [cx + rx * 0.05, cy + ry - 1], [cx - rx * 0.45, cy + ry + 1.6], fn);
      body(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      if (a.pat !== 'stripe' && a.pat !== 'band') gill(b, Math.round(cx + rx * 0.35), cy, ry, dim(a.c1, 0.32));
      if (a.pat !== 'stripe' && a.pat !== 'band') fin(b, [cx, cy + 1], [cx + 2, cy + 1], [cx - 2, cy + 2.5], lit(fn, 0.1));
      b.set(cx + rx - 0.5, cy + 1, dim(a.c1, 0.45));
      eye(b, cx + rx * 0.6, cy - ry * 0.3, b.w > 24);
    },
    long(b, a) {
      const cx = b.w * 0.54, cy = (b.h - 1) / 2, rx = b.w * 0.38, ry = b.h * 0.24;
      const fn = dim(a.c1, 0.18);
      tail(b, cx - rx + 2, cy, 0, ry * 1.5, fn, b.w > 24 ? 0.8 : 0.5);
      fin(b, [cx - rx * 0.2, cy - ry + 1], [cx + rx * 0.2, cy - ry + 1], [cx - rx * 0.15, cy - ry - 2], fn);
      fin(b, [cx - rx * 0.6, cy - ry + 1], [cx - rx * 0.45, cy - ry + 1], [cx - rx * 0.6, cy - ry - 1], fn);
      fin(b, [cx - rx * 0.35, cy + ry - 1], [cx - rx * 0.1, cy + ry - 1], [cx - rx * 0.4, cy + ry + 1.4], fn);
      body(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      gill(b, Math.round(cx + rx * 0.55), cy, ry, dim(a.c1, 0.32));
      b.set(cx + rx - 0.5, cy + 1, dim(a.c1, 0.45));
      eye(b, cx + rx * 0.72, cy - ry * 0.3, b.w > 24);
    },
    flat(b, a) {
      const cx = b.w * 0.56, cy = (b.h - 1) / 2, rx = b.w * 0.25, ry = b.h * 0.38;
      const fn = dim(a.c1, 0.22);
      fin(b, [cx - rx * 0.6, cy - ry + 1], [cx + rx * 0.5, cy - ry + 1], [cx - rx * 0.9, 0], fn);
      fin(b, [cx - rx * 0.6, cy + ry - 1], [cx + rx * 0.4, cy + ry - 1], [cx - rx * 0.9, b.h - 1], fn);
      tail(b, cx - rx + 1, cy, cx - rx - 5, 3.2, fn, 0.3);
      body(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      b.set(cx + rx - 0.5, cy + 1, dim(a.c1, 0.45));
      eye(b, cx + rx * 0.5, cy - ry * 0.32);
    },
    fancy(b, a) {
      const cx = b.w * 0.66, cy = (b.h - 1) / 2, rx = b.w * 0.2, ry = b.h * 0.3;
      const t = a.c2, t2 = mix(a.c2, a.c1, 0.35);
      // 하늘하늘한 부채꼬리 (끝으로 갈수록 연해지고 가운데가 살짝 파임)
      const ax = cx - rx + 1, tr = ax - 0.5;
      for (let y = 0; y < b.h; y++) for (let x = 0; x <= ax; x++) {
        const dy = Math.abs(y - cy), u = (ax - x) / tr;
        const half = 1 + (b.h / 2 - 1.2) * Math.sin(Math.min(1, u * 1.15) * Math.PI / 2);
        if (dy > half || (u > 0.75 && dy < (u - 0.75) * 8)) continue;
        b.set(x, y, Math.round(dy) % 3 === 2 ? t2 : lit(t, u * 0.35));
      }
      fin(b, [cx - 3, cy - ry + 1], [cx + 2, cy - ry + 1], [cx - 4, cy - ry - 2.4], t);
      fin(b, [cx - 1, cy + ry - 1], [cx + 2, cy + ry - 1], [cx - 3, cy + ry + 2], t2);
      body(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      eye(b, cx + rx * 0.5, cy - ry * 0.25);
    },
    puffer(b, a) {
      const cx = b.w * 0.55, cy = (b.h - 1) / 2, r = b.h * 0.38;
      const sp = dim(a.c1, 0.4);
      for (let k = 0; k < 12; k++) { const t = (k / 12) * Math.PI * 2 + 0.26; line(b, cx + Math.cos(t) * r, cy + Math.sin(t) * r * 0.9, cx + Math.cos(t) * (r + 2.2), cy + Math.sin(t) * (r * 0.9 + 2), lit(a.c1, 0.15)); }
      tail(b, cx - r + 1, cy, cx - r - 4, 2.2, dim(a.c1, 0.2), 0);
      body(b, cx, cy, r, r * 0.9, (x, y) => (y > cy + r * 0.25 ? a.c2 : painter(a, cx, cy, r, r)(x, y)));
      eye(b, cx + r * 0.4, cy - r * 0.35);
      b.set(cx + r, cy + 1, '#c0505a');
    },
    seahorse(b, a) {
      const x0 = b.w * 0.45;
      ellipse(b, x0 + 2, 3, 2.5, 2, (x, y) => (y < 3 ? lit(a.c1, 0.25) : a.c1));
      line(b, x0 + 4, 3, x0 + 7, 3, a.c1); b.set(x0 + 7, 2, dim(a.c1, 0.2));
      b.set(x0 + 1, 0, a.c2); b.set(x0 + 2, 0, a.c2);   // 왕관
      for (let i = 0; i < 7; i++) ellipse(b, x0 + Math.sin(i / 2) * 1.5, 5 + i, 2.2 - i * 0.15, 1, (x) => (x > x0 + Math.sin(i / 2) * 1.5 ? lit(i % 2 ? a.c2 : a.c1, 0.2) : i % 2 ? a.c2 : a.c1));
      line(b, x0 - 1, 11, x0 - 3, 11, a.c1); b.set(x0 - 3, 10, a.c1); b.set(x0 - 2, 9, a.c1);
      fin(b, [x0 - 2, 5], [x0 - 2, 8], [x0 - 5, 6], lit(a.c2, 0.2));
      eye(b, x0 + 3, 2);
    },
    shrimp(b, a) {   // 새우: 등을 둥글게 만 몸 + 마디 + 부채 꼬리 + 긴 더듬이
      pix(b, [
        '...............aa...',
        '.....HHHH.....a..aa.',
        '...HHAAAAHH..a.....a',
        '..HAABAABAAHHH......',
        '.HAABAABAABAAAHH....',
        '.AABAABAABAAAAAEA...',
        'TAABAABAABAAAAAAAAr.',
        'TTDABDABDABDAAAADD..',
        'TTTDDDDDDDDDDDDD....',
        'TT..L..L..L..L......',
        'T..L..L..L..L.......',
      ], { H: lit(a.c1, 0.3), A: a.c1, B: lit(a.c2, 0.2), D: dim(a.c1, 0.2), T: lit(a.c2, 0.1), L: a.c2, a: dim(a.c1, 0.1), r: lit(a.c1, 0.15), E: INK }, 0, 1);
    },
    crab(b, a) {
      const sh = a.c2;
      ellipse(b, 7, 6, 5, 4.5, (x, y) => { const d = Math.hypot(x - 7, (y - 6) * 1.1); return Math.round(d) === 2 || Math.round(d) === 4 ? dim(sh, 0.25) : y < 4 ? lit(sh, 0.25) : sh; });
      b.set(7, 6, dim(sh, 0.35));
      ellipse(b, 13, 8, 3, 2.2, (x, y) => (y < 8 ? lit(a.c1, 0.2) : a.c1));
      ellipse(b, 17, 6, 2, 1.6, (x, y) => (y < 6 ? lit(a.c1, 0.25) : a.c1)); ellipse(b, 17, 10, 2, 1.6, a.c1);
      b.set(19, 6, null); b.set(19, 10, null);
      for (let i = 0; i < 3; i++) line(b, 12 + i * 2, 10, 11 + i * 2, 12, dim(a.c1, 0.2));
      line(b, 14, 7, 14, 5, a.c1); line(b, 15, 7, 15, 5, a.c1);
      b.set(14, 4, INK); b.set(15, 4, INK);
    },
    catfish(b, a) {
      SHAPES.long(b, { ...a, pat: 'belly' });
      const x = b.w * 0.54 + b.w * 0.38;
      line(b, x, b.h / 2 + 1, x + 3, b.h / 2 + 4, a.c2);
      line(b, x, b.h / 2, x + 3, b.h / 2 - 3, a.c2);
    },
    flatfish(b, a) {
      const cx = b.w * 0.52, cy = (b.h - 1) / 2, rx = b.w * 0.34, ry = b.h * 0.38;
      ellipse(b, cx, cy, rx + 1.5, ry + 1.2, (x, y) => ((x + 60) % 2 ? a.c2 : lit(a.c2, 0.18)));
      tail(b, cx - rx, cy, 1, 3, dim(a.c2, 0.1), 0);
      body(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      eye(b, cx + rx * 0.55, cy - 2); eye(b, cx + rx * 0.75, cy - 1);
      b.set(cx + rx, cy + 1, dim(a.c1, 0.45));
    },
    eel(b, a) {
      const cy = (b.h - 1) / 2, r = Math.max(1.6, b.h * 0.16), amp = b.h * 0.18;
      const paint = painter(a, b.w / 2, cy, b.w / 2, r);
      for (let x = 2; x < b.w - 2; x += 0.5) {
        const yc = cy + Math.sin(x * 0.45) * amp;
        ellipse(b, x, yc, r, r, (xx, yy) => (yy < yc - r * 0.4 ? lit(paint(xx, yy), 0.28) : yy > yc + r * 0.5 ? dim(paint(xx, yy), 0.18) : paint(xx, yy)));
      }
      for (let x = 3; x < b.w - 6; x++) { const yc = cy + Math.sin(x * 0.45) * amp; if (!b.get(x, Math.round(yc - r - 1))) b.set(x, yc - r - 0.6, (x % 2) ? dim(a.c1, 0.15) : lit(a.c1, 0.1)); }
      const ex = b.w - 4;
      eye(b, ex, cy + Math.sin(ex * 0.45) * amp - 1);
      b.set(b.w - 2, cy + Math.sin((b.w - 2) * 0.45) * amp + 1, dim(a.c1, 0.45));
    },
    squid(b, a) {
      const cy = (b.h - 1) / 2;
      fin(b, [3, cy], [b.w * 0.15, cy - b.h * 0.45], [b.w * 0.15, cy + b.h * 0.45], a.c2);
      body(b, b.w * 0.34, cy, b.w * 0.25, b.h * 0.26, a.c1);
      for (let k = -3; k <= 3; k++) line(b, b.w * 0.58, cy + k * 0.7, b.w - 2, cy + k * 1.4 + Math.sin(k), k % 2 ? a.c2 : lit(a.c2, 0.2));
      eye(b, b.w * 0.55, cy - 1, b.w > 24);
      for (let i = 0; i < 6; i++) b.set(b.w * 0.2 + i * 2, cy + (i % 2 ? 1 : -1), dim(a.c2, 0.1));
    },
    octopus(b, a) {   // 문어: 둥근 머리 + 큰 눈 + 바깥으로 말린 다리 8개
      pix(b, [
        '..........HHHHHH..........',
        '........HHAAAAAAHH........',
        '.......HAAAHHAAAAAA.......',
        '......HAAHAAAAAABAAA......',
        '......AAAAAAAAAAAAAA......',
        '......AAAAAAAAAAAAAA......',
        '......AWEEAAAAAAWEEA......',
        '......AEEEAAAAAAEEEA......',
        '.......AAAAAMMAAAAA.......',
        '....AAAADAAAAAADAAAAAA....',
        '..AAADDAADAAAADAADDAAAA...',
        '.AAD..SA..SA..AS..AS.DAA..',
        '.AA..AA...AA..AA...AA..AA.',
        '..AA.A...AA....AA...A.AA..',
      ].map((r) => r.slice(0, 26)), { H: lit(a.c1, 0.3), A: a.c1, B: a.c2, D: dim(a.c1, 0.22), S: a.c2, M: dim(a.c1, 0.4), W: '#ffffff', E: INK });
    },
    tuna(b, a) {
      const cx = b.w * 0.55, cy = (b.h - 1) / 2, rx = b.w * 0.35, ry = b.h * 0.28;
      const fn = dim(a.c1, 0.15);
      tail(b, cx - rx + 2, cy, 0, ry * 1.9, fn, 1);
      fin(b, [cx - 2, cy - ry + 1], [cx + 4, cy - ry + 1], [cx - 2, cy - ry - 3.2], fn);
      fin(b, [cx - 1, cy + ry - 1], [cx + 3, cy + ry - 1], [cx - 1, cy + ry + 2.4], lit(fn, 0.2));
      for (let i = 0; i < 4; i++) { const fx = cx - rx + 3 + i * 2, k = Math.sqrt(Math.max(0, 1 - ((fx - cx) / rx) ** 2)) * ry; b.set(fx, cy - k - 0.6, '#f0c040'); b.set(fx, cy + k + 0.6, '#f0c040'); }
      body(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      line(b, cx - rx * 0.6, cy, cx + rx * 0.3, cy, lit(a.c1, 0.25));
      gill(b, Math.round(cx + rx * 0.5), cy, ry, dim(a.c1, 0.3));
      fin(b, [cx + 2, cy], [cx + 4, cy], [cx - 1, cy + 1.6], lit(fn, 0.25));
      eye(b, cx + rx * 0.68, cy - 1.5, true);
    },
    swordfish(b, a) {
      const cx = b.w * 0.5, cy = b.h * 0.6, rx = b.w * 0.3, ry = b.h * 0.2;
      const fn = dim(a.c1, 0.15);
      tail(b, cx - rx + 2, cy, 0, ry * 2.1, fn, 1);
      fin(b, [cx - rx * 0.6, cy - ry], [cx + rx * 0.4, cy - ry], [cx - rx * 0.1, 0], a.c2 === '#d0e0f0' ? '#3a6ab8' : fn);
      fin(b, [cx + rx * 0.2, cy + ry - 1], [cx + rx * 0.4, cy + ry - 1], [cx + rx * 0.1, cy + ry + 3], fn);
      line(b, cx + rx, cy - 0.5, b.w - 1, cy - 1.5, lit(a.c1, 0.35));
      body(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      eye(b, cx + rx * 0.7, cy - 1);
    },
    sunfish(b, a) {
      const cx = b.w * 0.55, cy = (b.h - 1) / 2, r = b.h * 0.38;
      fin(b, [cx - 4, cy - r + 1], [cx + 1, cy - r + 1], [cx - 4, 0], a.c1);
      fin(b, [cx - 4, cy + r - 1], [cx + 1, cy + r - 1], [cx - 4, b.h - 1], a.c1);
      rect(b, Math.round(cx - r * 1.15 - 2), Math.round(cy - 3), 3, 7, (x, y) => ((y + 60) % 2 ? dim(a.c1, 0.15) : a.c1));
      body(b, cx, cy, r * 1.15, r, (x, y) => (y > cy + 2 ? a.c2 : a.c1));
      for (let i = 0; i < 4; i++) b.set(cx - r * 0.5 + i * 2, cy - 1 + (i % 2) * 3, lit(a.c1, 0.3));
      eye(b, cx + r * 0.7, cy - 2, true);
      b.set(cx + r * 1.15, cy + 1, dim(a.c1, 0.4));
    },
    ray(b, a) {
      const cy = (b.h - 1) / 2;
      const wing = (x, y) => { const d = Math.abs(y - cy) / (b.h / 2); return y < cy ? lit(a.c1, 0.2 * (1 - d)) : d > 0.7 ? dim(a.c1, 0.15) : a.c1; };
      line(b, b.w * 0.3, cy, 0, cy + 1, dim(a.c1, 0.3));
      tri(b, [b.w * 0.84, cy], [b.w * 0.5, 0], [b.w * 0.3, cy], wing);
      tri(b, [b.w * 0.84, cy], [b.w * 0.5, b.h - 1], [b.w * 0.3, cy], wing);
      line(b, b.w * 0.36, cy, b.w * 0.78, cy, lit(a.c1, 0.22));
      for (let i = 0; i < 5; i++) b.set(b.w * (0.45 + (i % 3) * 0.08), cy + (i - 2) * 2, a.c2);
      eye(b, b.w * 0.72, cy - 2); eye(b, b.w * 0.72, cy + 2);
    },
    shark(b, a) {
      const cx = b.w * 0.52, cy = b.h * 0.55, rx = b.w * 0.36, ry = b.h * 0.24;
      const fn = dim(a.c1, 0.18);
      tri(b, [cx - rx + 2, cy], [1, cy - ry * 2.3], [6, cy], (x, y) => ((y + 60) % 2 ? fn : lit(fn, 0.14)));
      tri(b, [cx - rx + 2, cy], [3, cy + ry * 1.3], [6, cy], fn);
      fin(b, [cx - rx * 0.1, cy - ry + 1], [cx + rx * 0.3, cy - ry + 1], [cx - rx * 0.15, cy - ry * 2.6], fn);
      fin(b, [cx + rx * 0.1, cy + ry - 1], [cx + rx * 0.45, cy + ry - 1], [cx - rx * 0.05, cy + ry * 2.1], fn);
      tri(b, [cx + rx - 1, cy - ry * 0.6], [cx + rx - 1, cy + ry * 0.6], [cx + rx + 4, cy], (x, y) => (y < cy ? lit(a.c1, 0.15) : a.pat === 'belly' ? a.c2 : a.c1));
      body(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      for (let i = 0; i < 3; i++) line(b, cx + rx * 0.45 + i * 1.5, cy - 1, cx + rx * 0.45 + i * 1.5, cy + 1, dim(a.c1, 0.35));
      b.set(cx + rx + 1, cy + 1.5, dim(a.c1, 0.5)); b.set(cx + rx, cy + 1.5, dim(a.c1, 0.5));
      eye(b, cx + rx * 0.78, cy - 1);
    },
    hammer(b, a) {
      SHAPES.shark(b, { ...a, pat: 'belly' });
      const x = Math.round(b.w * 0.52 + b.w * 0.36 + 2), y = Math.round(b.h * 0.55);
      rect(b, x, y - 4, 2, 9, (xx, yy) => (yy < y ? lit(a.c1, 0.15) : a.c1));
      eye(b, x + 1, y - 4); eye(b, x + 1, y + 4);
    },
    turtle(b, a) {
      const cx = b.w * 0.48, cy = (b.h - 1) / 2, skin = lit(a.c1, 0.25);
      for (const [dx, dy] of [[0.12, -0.42], [0.12, 0.42], [-0.15, -0.35], [-0.15, 0.35]]) ellipse(b, cx + dx * b.w, cy + dy * b.h, 3, 2, (x, y) => ((x + y) % 3 === 0 ? dim(skin, 0.12) : skin));
      ellipse(b, cx + b.w * 0.25, cy - 0.5, 3, 2.5, (x, y) => (y < cy - 1 ? lit(skin, 0.2) : skin));
      tri(b, [cx - b.w * 0.2, cy], [cx - b.w * 0.3, cy - 1], [cx - b.w * 0.3, cy + 1], skin);
      // 등껍질: 육각 무늬 + 밝은 윗면
      const sx = cx, rx = b.w * 0.21, ry = b.h * 0.36;
      ellipse(b, sx, cy, rx, ry, (x, y) => {
        const u = Math.round((x - sx) / 3), v = Math.round((y - cy + (u % 2 ? 1.5 : 0)) / 3);
        const edge = Math.abs((x - sx) / 3 - u) > 0.36 || Math.abs((y - cy + (u % 2 ? 1.5 : 0)) / 3 - v) > 0.36;
        const dy = (y - cy) / ry, dx = (x - sx) / rx;
        if (dx * dx + dy * dy > 0.7) return dim(a.c2, 0.15);
        const c = edge ? a.c2 : a.c1;
        return dy < -0.3 ? lit(c, 0.2) : c;
      });
      eye(b, cx + b.w * 0.27, cy - 1.5);
    },
    dolphin(b, a, orca) {
      const cx = b.w * 0.5, cy = b.h * 0.55, rx = b.w * 0.34, ry = b.h * 0.24;
      const fn = dim(a.c1, 0.15);
      tail(b, cx - rx + 2, cy, 0, ry * 1.5, fn, 0.7);
      fin(b, [cx - rx * 0.1, cy - ry + 1], [cx + rx * 0.25, cy - ry + 1], [cx - rx * (orca ? 0 : 0.3), cy - ry * (orca ? 3 : 2.2)], fn);
      fin(b, [cx + rx * 0.2, cy + ry - 1], [cx + rx * 0.45, cy + ry - 1], [cx + rx * 0.1, cy + ry * 1.8], fn);
      body(b, cx, cy, rx, ry, (x, y) => (y > cy + ry * 0.2 ? a.c2 : a.c1));
      if (!orca) { rect(b, Math.round(cx + rx - 1), Math.round(cy), 4, 1, a.c1); rect(b, Math.round(cx + rx - 1), Math.round(cy + 1), 4, 1, a.c2); }
      if (orca) ellipse(b, cx + rx * 0.55, cy - ry * 0.35, 2, 1, a.c2);
      if (orca) { b.set(cx - rx * 0.1, cy - ry * 0.4, '#b8bcc8'); b.set(cx - rx * 0.2, cy - ry * 0.4, '#b8bcc8'); }
      eye(b, cx + rx * 0.75, cy - 1);
    },
    orca(b, a) { SHAPES.dolphin(b, a, true); },
    narwhal(b, a) {
      SHAPES.whale(b, a, 0.3);
      const x0 = Math.round(b.w * 0.8), y0 = Math.round(b.h * 0.5);
      for (let i = 0; i <= b.w - 1 - x0; i++) b.set(x0 + i, y0 - Math.round(i * 0.55), i % 2 ? '#d8cfb8' : '#f4efe0');
    },
    whale(b, a, k = 0.38) {
      const cx = b.w * 0.5, cy = b.h * 0.52, rx = b.w * k, ry = b.h * 0.3;
      const fn = dim(a.c1, 0.15);
      tail(b, cx - rx + 2, cy, 0, ry * 1.15, fn, 0.8);
      body(b, cx, cy, rx, ry, (x, y) => (y > cy + ry * 0.35 ? ((x % 2) ? a.c2 : dim(a.c2, 0.14)) : (a.pat === 'spot' && hash(x, y) === 0 ? a.c2 : a.c1)));
      fin(b, [cx + rx * 0.2, cy + ry * 0.6], [cx + rx * 0.45, cy + ry * 0.6], [cx - rx * 0.05, cy + ry * 1.7], fn);
      b.set(cx - rx * 0.15, cy - ry - 0.5, fn); b.set(cx - rx * 0.1, cy - ry - 0.5, fn);
      line(b, cx + rx * 0.55, cy + ry * 0.3, cx + rx * 0.95, cy + ry * 0.1, dim(a.c1, 0.35));
      eye(b, cx + rx * 0.7, cy);
    },
    sperm(b, a) {
      const cy = b.h * 0.52;
      SHAPES.whale(b, a, 0.32);
      const x0 = Math.round(b.w * 0.6), y0 = Math.round(cy - b.h * 0.3), w = Math.round(b.w * 0.3), h = Math.round(b.h * 0.55);
      rect(b, x0, y0, w, h, (x, y) => (y === y0 ? lit(a.c1, 0.2) : y === y0 + 1 && x > x0 + 1 && x < x0 + w - 3 ? lit(a.c1, 0.4) : x === x0 + w - 1 ? lit(a.c1, 0.12) : a.c1));
      b.set(x0 + w - 1, y0, null);
      line(b, b.w * 0.62, cy + b.h * 0.27, b.w * 0.88, cy + b.h * 0.27, a.c2);
      eye(b, b.w * 0.68, cy);
    },
    // ---- 신비 등급 (특이한 바다 생물)
    blob(b, a) {   // 블롭피쉬: 축 처진 분홍 젤리 얼굴
      const cx = b.w * 0.52, cy = (b.h - 1) * 0.5, rx = b.w * 0.34, ry = b.h * 0.42;
      tail(b, cx - rx + 2, cy, 1, 3, dim(a.c1, 0.12), 0);
      body(b, cx, cy, rx, ry, (x, y) => (y > cy + ry * 0.45 ? lit(a.c1, 0.25) : a.c1), { noShine: true });
      for (let i = 0; i < 4; i++) b.set(cx - rx * 0.4 + i * 2, cy - ry * 0.55 + (i % 2), lit(a.c1, 0.35));
      ellipse(b, cx + rx * 0.62, cy + ry * 0.28, 3.4, 2.6, (x, y) => (y < cy + ry * 0.28 ? lit(a.c2, 0.15) : a.c2));   // 늘어진 코
      b.set(cx + rx * 0.5, cy + ry * 0.28 - 1.5, lit(a.c2, 0.55));
      line(b, cx + rx * 0.25, cy + ry * 0.72, cx + rx * 0.62, cy + ry * 0.62, dim(a.c1, 0.35));   // 시무룩한 입
      b.set(cx + rx * 0.3, cy - ry * 0.22, INK); b.set(cx + rx * 0.78, cy - ry * 0.28, INK);
    },
    clione(b, a) {  // 바다의 천사(클리오네): 투명한 몸 + 주황 속 + 날개
      const cy = (b.h - 1) / 2;
      const glass = (x, y) => (y < cy - 1 ? '#ffffff' : y > cy + 1 ? mix(a.c1, '#9fd8ff', 0.35) : a.c1);
      tri(b, [b.w * 0.55, cy - 2], [b.w * 0.55, cy + 2], [2, cy], glass);
      ellipse(b, b.w * 0.58, cy, b.w * 0.16, b.h * 0.3, glass);
      ellipse(b, b.w * 0.8, cy, b.w * 0.12, b.h * 0.26, glass);           // 머리
      ellipse(b, b.w * 0.6, cy, 2, 1.6, a.c2); b.set(b.w * 0.58, cy - 1, lit(a.c2, 0.4));   // 빨간 속
      b.set(b.w * 0.86, cy - 2, a.c2); b.set(b.w * 0.88, cy - 3, a.c2);   // 작은 뿔
      const wing = (x, y) => (x % 2 ? mix(a.c1, '#9fd8ff', 0.45) : mix(a.c1, '#9fd8ff', 0.25));
      ellipse(b, b.w * 0.62, 2, 3, 1.8, wing);      // 위 날개
      ellipse(b, b.w * 0.62, b.h - 3, 3, 1.8, wing); // 아래 날개
      eye(b, b.w * 0.86, cy);
    },
    kraken(b, a) {  // 크라켄: 오른쪽 머리, 뒤로 휘날리는 굵은 촉수 (끝은 가늘고 말림)
      const cy = (b.h - 1) / 2, xm = b.w * 0.64;
      for (let k = 0; k < 4; k++) {
        const off = (k - 1.5) * (b.h * 0.27), dark = k % 2 ? 0.18 : 0;
        let ex = 0, ey = 0;
        for (let x = 3; x < xm; x += 0.25) {
          const u = (xm - x) / xm;
          const y = cy + off * (0.25 + u * 0.75) + Math.sin(x * 0.5 + k * 1.7) * 1.8 * u;
          const t = 0.3 + (1 - u) * 0.9;
          if (x === 3) { ex = x; ey = y; }
          ellipse(b, x, y, 0.5, t, (xx, yy) => (yy > y + 0.2 && t > 0.8 && Math.round(xx) % 3 === 0 ? a.c2 : yy < y - 0.3 ? lit(a.c1, 0.2 - dark) : dim(a.c1, dark)));
        }
        const dir = off < 0 ? -1 : 1;   // 말린 끝
        b.set(ex - 1, ey, dim(a.c1, dark)); b.set(ex - 2, ey + dir, dim(a.c1, dark)); b.set(ex - 1, ey + dir * 2, dim(a.c1, dark));
      }
      body(b, b.w * 0.75, cy, b.w * 0.2, b.h * 0.4, a.c1);
      for (let i = 0; i < 4; i++) b.set(b.w * 0.66 + i * 2.2, cy + b.h * 0.18 + (i % 2), lit(a.c2, 0.1));
      ellipse(b, b.w * 0.8, cy - 1, 2, 2, '#f4cf4f'); b.set(b.w * 0.8, cy - 1, INK); b.set(b.w * 0.8, cy, INK); b.set(b.w * 0.8 - 1, cy - 2, '#fff6c0');
    },
    oarfish(b, a) { // 산갈치: 아주 긴 은빛 리본 + 빨간 지느러미
      const cy = b.h * 0.58;
      for (let x = 1; x < b.w - 3; x += 0.5) {
        const y = cy + Math.sin(x * 0.35) * b.h * 0.12, t = Math.max(1, 2.2 * (x / b.w) + 0.6);
        ellipse(b, x, y, 0.8, t, (xx, yy) => (yy < y - t * 0.4 ? lit(a.c1, 0.4) : yy > y + t * 0.3 ? dim(a.c1, 0.12) : a.c1));
        if (Math.round(x * 2) % 2 === 0) b.set(x, y - t - 1, Math.round(x) % 3 ? a.c2 : lit(a.c2, 0.3));
      }
      const hx = b.w - 4, hy = cy + Math.sin(hx * 0.35) * b.h * 0.12;
      ellipse(b, hx, hy, 2.6, 2.4, (x, y) => (y < hy - 0.5 ? lit(a.c1, 0.3) : a.c1));
      for (let i = 0; i < 5; i++) line(b, hx - 1, hy - 2, hx - 3 + i, hy - 7 - (i % 2), i % 2 ? a.c2 : lit(a.c2, 0.25));   // 머리 깃털
      eye(b, hx + 1, hy - 1);
    },
    angler(b, a) {  // 초롱아귀: 어두운 몸 + 날카로운 이빨 + 빛나는 초롱
      const cx = b.w * 0.5, cy = b.h * 0.58, rx = b.w * 0.3, ry = b.h * 0.36;
      tail(b, cx - rx + 2, cy, 1, 4, dim(a.c1, 0.25), 0.3);
      body(b, cx, cy, rx, ry, a.c1);
      line(b, cx + rx * 0.2, cy + 1, cx + rx, cy + 2, '#1a1020');   // 큰 입
      for (let i = 0; i < 4; i++) { b.set(cx + rx * 0.3 + i * 1.6, cy + 2, '#ffffff'); b.set(cx + rx * 0.4 + i * 1.6, cy, '#ffffff'); }
      line(b, cx + rx * 0.1, cy - ry, cx + rx * 0.7, cy - ry - 3, lit(a.c1, 0.3));   // 초롱 줄기
      line(b, cx + rx * 0.7, cy - ry - 3, cx + rx * 1.05, cy - ry - 1, lit(a.c1, 0.3));
      ellipse(b, cx + rx * 1.12, cy - ry, 1.6, 1.6, a.c2); b.set(cx + rx * 1.12, cy - ry - 1, '#ffffff');
      eye(b, cx + rx * 0.45, cy - ry * 0.4);
    },
    barreleye(b, a) { // 배럴아이: 투명한 머리 안에 초록 눈
      const cx = b.w * 0.5, cy = b.h * 0.6, rx = b.w * 0.3, ry = b.h * 0.3;
      tail(b, cx - rx + 2, cy, 1, 4, dim(a.c1, 0.2), 0.4);
      body(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      const hx = cx + rx * 0.45, hy = cy - ry * 1.1;
      ellipse(b, hx, hy, rx * 0.5, ry * 0.85, (x, y) => (y < hy - 1 ? '#e6fbff' : '#a8dcea'));   // 투명 머리
      ellipse(b, cx + rx * 0.35, cy - ry * 1.05, 1.4, 1.4, a.c2); ellipse(b, cx + rx * 0.65, cy - ry * 1.05, 1.4, 1.4, a.c2);
      b.set(cx + rx * 0.95, cy, INK);
    },
    dumbo(b, a) {   // 덤보문어: 귀처럼 생긴 지느러미
      const cx = b.w * 0.55, cy = b.h * 0.42;
      for (let k = 0; k < 5; k++) { const x0 = cx - b.w * 0.18 + k * (b.w * 0.36 / 4); for (let j = 0; j < b.h * 0.32; j++) b.set(x0 + Math.sin(j * 0.9 + k) * 0.8, cy + b.h * 0.3 + j, k % 2 ? dim(a.c1, 0.12) : a.c1); }
      body(b, cx, cy, b.w * 0.24, b.h * 0.34, a.c1);
      const ear = (x, y) => ((x + 60) % 2 ? a.c2 : lit(a.c2, 0.2));
      ellipse(b, cx - b.w * 0.25, cy - b.h * 0.18, 2.6, 2, ear); ellipse(b, cx + b.w * 0.25, cy - b.h * 0.18, 2.6, 2, ear);   // 귀
      b.set(cx - 3, cy + 2, lit(a.c1, 0.4)); b.set(cx + 3, cy + 2, lit(a.c1, 0.4));
      eye(b, cx - 2, cy); eye(b, cx + 2, cy);
    },
    leafy(b, a) {   // 나뭇잎해룡: 잎사귀를 두른 해마
      const x0 = b.w * 0.5;
      const leaf = mix(a.c2, '#3f8a3a', 0.3);
      [[x0 - 3, 4], [x0 + 3, 7], [x0 - 4, 9], [x0 + 3, 10], [x0 - 2, 1], [x0 - 5, 6]].forEach(([x, y]) => { ellipse(b, x, y, 1.6, 1, (xx, yy) => (yy < y ? lit(leaf, 0.25) : leaf)); b.set(x - 2, y, dim(leaf, 0.15)); });
      ellipse(b, x0 + 3, 3, 2.6, 1.8, (x, y) => (y < 3 ? lit(a.c1, 0.25) : a.c1)); line(b, x0 + 5, 3, x0 + 9, 3, a.c1);
      for (let i = 0; i < 7; i++) ellipse(b, x0 + Math.sin(i / 2) * 1.5, 5 + i, 2 - i * 0.12, 1, i % 2 ? a.c2 : a.c1);
      line(b, x0 - 1, 11, x0 - 4, 11, a.c1);
      eye(b, x0 + 4, 2);
    },
    axolotl(b, a) { // 우파루파: 분홍 몸 + 머리 양옆 깃털 아가미
      const cy = b.h * 0.55;
      tri(b, [b.w * 0.2, cy], [1, cy - 2], [1, cy + 2], lit(a.c1, 0.3));
      b.set(b.w * 0.36, cy + b.h * 0.26, a.c1); b.set(b.w * 0.56, cy + b.h * 0.26, a.c1);   // 다리
      body(b, b.w * 0.45, cy, b.w * 0.3, b.h * 0.22, a.c1);
      for (let i = 0; i < 3; i++) { line(b, b.w * 0.7, cy - 3, b.w * 0.62 - i, cy - 6 - i, i === 1 ? lit(a.c2, 0.25) : a.c2); line(b, b.w * 0.7, cy + 1, b.w * 0.62 - i, cy + 4 + i, i === 1 ? lit(a.c2, 0.25) : a.c2); }
      body(b, b.w * 0.76, cy - 1, b.w * 0.14, b.h * 0.28, a.c1, { noShine: true });   // 머리
      eye(b, b.w * 0.82, cy - 2); b.set(b.w * 0.88, cy, dim(a.c1, 0.4));
      b.set(b.w * 0.8, cy, mix(a.c1, a.c2, 0.5));
    },
    nessie(b, a) {  // 네시: 긴 목 + 혹 + 지느러미발
      const cy = b.h * 0.72;
      tri(b, [b.w * 0.2, cy], [1, cy - 1], [3, cy + 3], a.c1);
      ellipse(b, b.w * 0.32, cy + b.h * 0.17, 2.4, 1.2, a.c2); ellipse(b, b.w * 0.54, cy + b.h * 0.17, 2.4, 1.2, a.c2);
      body(b, b.w * 0.42, cy, b.w * 0.24, b.h * 0.2, a.c1);
      ellipse(b, b.w * 0.3, cy - b.h * 0.18, b.w * 0.08, b.h * 0.12, (x, y) => (y < cy - b.h * 0.2 ? lit(a.c1, 0.2) : a.c1));   // 혹
      for (let i = 0; i < 12; i++) { const t = i / 11, nx = b.w * 0.6 + t * b.w * 0.24, ny = cy - 2 - Math.sin(t * Math.PI / 2) * b.h * 0.52; ellipse(b, nx, ny, 1.6, 1.6, (x, y) => (x > nx ? dim(a.c1, 0.1) : lit(a.c1, 0.12))); }
      ellipse(b, b.w * 0.88, cy - 2 - b.h * 0.52, 2.6, 1.8, (x, y) => (y < cy - 2 - b.h * 0.52 ? lit(a.c1, 0.2) : a.c1));   // 머리
      for (let i = 0; i < 4; i++) b.set(b.w * 0.34 + i * 3, cy - 1, a.c2);
      eye(b, b.w * 0.9, cy - 3 - b.h * 0.52);
    },
    // ---------------- 쓰레기
    can(b) {
      rect(b, 5, 2, 6, 10, (x) => (x === 5 ? '#9aa0a8' : x === 6 ? '#eef0f4' : x === 10 ? '#a8aeb6' : '#c8ccd2'));
      rect(b, 5, 5, 6, 4, (x) => (x === 5 ? '#a83a36' : x === 6 ? '#f07a72' : x === 10 ? '#b84440' : '#d9534f'));
      rect(b, 5, 2, 6, 1, '#8a9098'); rect(b, 5, 11, 6, 1, '#8a9098'); b.set(9, 1, '#b8bec6'); b.set(10, 1, '#b8bec6');
      b.set(8, 6, '#ffffff'); b.set(9, 6, '#ffffff'); b.set(8, 7, '#ffd0c8');
    },
    tire(b) {
      for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x - 7.5, y - 6.5);
        if (d >= 6.4 || d < 2.6) continue;
        const ang = Math.atan2(y - 6.5, x - 7.5);
        b.set(x, y, d > 5.4 ? (Math.round(ang * 4) % 2 ? '#22222a' : '#34343c') : d < 3.6 ? '#7a7a84' : y < 6 ? '#44444c' : '#2a2a30');
      }
      b.set(5, 3, '#6a6a74'); b.set(4, 4, '#6a6a74');
    },
    boot(b) {
      rect(b, 4, 1, 5, 9, (x) => (x === 4 ? '#5a3820' : x === 5 ? '#9a6a44' : '#7a5030'));
      rect(b, 4, 9, 10, 3, (x, y) => (y === 9 ? '#9a6a44' : '#7a5030'));
      rect(b, 4, 12, 10, 1, '#3a2418'); rect(b, 4, 1, 5, 1, '#5a3820');
      b.set(6, 4, '#5a3820'); b.set(7, 5, '#5a3820'); b.set(11, 10, '#a07048'); b.set(13, 11, '#2a1810');
    },
    bottle(b) {
      rect(b, 6, 4, 4, 9, (x) => (x === 6 ? '#3f8a52' : x === 9 ? '#4a9a5e' : '#5aa86a'));
      rect(b, 7, 1, 2, 3, '#5aa86a'); rect(b, 7, 0, 2, 1, '#8a6a4a'); b.set(8, 0, '#a8845e');
      b.set(7, 5, '#d8f4dc'); b.set(7, 6, '#bfe8c8'); b.set(7, 7, '#bfe8c8'); rect(b, 6, 8, 4, 2, '#e8dcc0'); b.set(7, 8, '#c8b898');
    },
    bag(b) {
      ellipse(b, 8, 8, 5, 4.5, (x, y) => (y > 10 ? '#d0d4da' : x < 6 ? '#e2e5e9' : '#f4f6f8'));
      rect(b, 5, 2, 1, 4, '#e2e5e9'); rect(b, 10, 2, 1, 4, '#f4f6f8');
      b.set(7, 8, '#c8ccd2'); b.set(9, 9, '#c8ccd2'); b.set(8, 10, '#c8ccd2'); b.set(10, 6, '#ffffff');
    },
    paper(b) {
      rect(b, 3, 3, 10, 9, (x, y) => (y === 3 ? '#e8e4d8' : (x + y) % 5 === 0 ? '#c8c4b6' : '#d8d4c8'));
      rect(b, 4, 4, 4, 3, '#a8a496');
      for (let i = 0; i < 3; i++) line(b, 9, 5 + i, 11, 5 + i, '#8a867a');
      for (let i = 0; i < 2; i++) line(b, 4, 9 + i, 11 - i * 2, 9 + i, '#8a867a');
      b.set(12, 3, '#b8b4a8'); b.set(12, 11, '#b0ac9e'); b.set(3, 11, '#b0ac9e');
    },
    umbrella(b) {
      for (let x = 2; x <= 13; x++) for (let y = 2; y <= 6; y++) if (Math.hypot(x - 7.5, (y - 6) * 1.4) <= 6) {
        const red = x % 4 < 2;
        b.set(x, y, y <= 3 ? (red ? '#f07a72' : '#ffffff') : y === 6 ? (red ? '#a83a36' : '#c8c8c8') : red ? '#d9534f' : '#f0f0f0');
      }
      line(b, 8, 6, 8, 12, '#3a3a3a'); b.set(7, 12, '#3a3a3a'); b.set(6, 11, '#3a3a3a');
      line(b, 10, 4, 13, 8, '#3a3a3a'); b.set(8, 1, '#3a3a3a');
    },
  };

  const cache = new Map();
  /** 물고기 그림 (1칸 = 1픽셀 캔버스). fish: catalog의 물고기 정보 */
  function bitmap(fish) {
    if (!fish) return null;
    const key = fish.code;
    if (cache.has(key)) return cache.get(key);
    const [w, h] = SIZE[fish.cat] || SIZE.S;
    const b = grid(w, h);
    const a = fish.art || {};
    (SHAPES[a.shape] || SHAPES.fish)(b, { c1: a.c1 || '#88aaaa', c2: a.c2 || '#ddddee', pat: a.pat });
    tidy(b);
    // 테두리가 잘리지 않게 사방 1칸 여백
    const p = grid(w + 2, h + 2);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.g[y + 1][x + 1] = b.g[y][x];
    outline(p, fish.cat === 'T' ? '#2a2630' : null);
    return finish(key, p);
  }
  function finish(key, b) {
    const w = b.w, h = b.h;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (b.g[y][x]) { g.fillStyle = b.g[y][x]; g.fillRect(x, y, 1, 1); }
    cache.set(key, c);
    return c;
  }
  /** 크게 그리기 (가운데 기준, scale = 칸 크기) */
  function draw(ctx, fish, cx, cy, scale, flip = false) {
    const bm = bitmap(fish);
    if (!bm) return;
    ctx.save();
    ctx.imageSmoothingEnabled = scale < 1;
    ctx.translate(cx, cy);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(bm, -bm.width * scale / 2, -bm.height * scale / 2, bm.width * scale, bm.height * scale);
    ctx.restore();
  }
  function thumb(fish, side = 40, unknown = false) {
    const c = document.createElement('canvas');
    c.width = side; c.height = side;
    const bm = bitmap(fish);
    if (!bm) return c;
    const g = c.getContext('2d');
    const k = Math.max(1, Math.floor(Math.min(side / bm.width, side / bm.height)));
    g.imageSmoothingEnabled = false;
    g.drawImage(bm, Math.floor((side - bm.width * k) / 2), Math.floor((side - bm.height * k) / 2), bm.width * k, bm.height * k);
    if (unknown) { g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(60,60,72,0.85)'; g.fillRect(0, 0, side, side); }
    return c;
  }
  return { bitmap, draw, thumb, SIZE };
})();
