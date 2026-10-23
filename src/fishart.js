// 물고기 · 쓰레기 도트 그림을 모양 재료(shape, c1, c2, pat)로 만들어 냄. 머리는 오른쪽.
window.FishArt = (() => {
  const SIZE = { T: [16, 14], S: [20, 12], M: [26, 14], L: [36, 18] };

  function hexToRgb(h) { const n = parseInt(String(h).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const toHex = (r) => '#' + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, k) => { const x = hexToRgb(a), y = hexToRgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * k)); };

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
      if (!(neg && pos)) b.set(x, y, c);
    }
  }
  function rect(b, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) b.set(x + i, y + j, c); }
  function line(b, x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) b.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }
  function outline(b, col) {
    const add = [];
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      if (b.g[y][x]) continue;
      if (b.get(x - 1, y) || b.get(x + 1, y) || b.get(x, y - 1) || b.get(x, y + 1)) add.push([x, y]);
    }
    for (const [x, y] of add) b.g[y][x] = col;
  }
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) & 7;

  // 몸통 무늬
  function painter(a, cx, cy, rx, ry) {
    const { c1, c2 } = a;
    switch (a.pat) {
      case 'belly': return (x, y) => (y > cy + ry * 0.12 ? c2 : c1);
      case 'stripe': return (x, y) => (Math.abs(y - cy) < ry * 0.75 && Math.floor(x / 3) % 2 === 0 && x < cx + rx * 0.5 ? c2 : c1);
      case 'band': {
        const b1 = Math.round(cx - rx * 0.35), b2 = Math.round(cx + rx * 0.35);
        return (x) => (Math.abs(x - b1) <= 1 || Math.abs(x - b2) <= 1 ? c2 : c1);
      }
      case 'spot': return (x, y) => (hash(x, y) === 0 ? c2 : c1);
      default: return () => c1;
    }
  }
  function eye(b, x, y, big) {
    b.set(x, y, '#1a1a20');
    if (big) { b.set(x + 1, y, '#1a1a20'); b.set(x, y - 1, '#ffffff'); }
  }

  const SHAPES = {
    fish(b, a) {
      const cx = b.w * 0.55, cy = b.h / 2, rx = b.w * 0.3, ry = b.h * 0.32;
      const fin = mix(a.c1, '#000000', 0.2);
      tri(b, [cx - rx + 2, cy], [2, cy - ry * 1.1], [2, cy + ry * 1.1], fin);
      tri(b, [cx - rx * 0.3, cy - ry + 1], [cx + rx * 0.2, cy - ry + 1], [cx - rx * 0.4, cy - ry - 2], fin);
      ellipse(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      eye(b, cx + rx * 0.6, cy - ry * 0.25, b.w > 24);
    },
    long(b, a) {
      const cx = b.w * 0.55, cy = b.h / 2, rx = b.w * 0.36, ry = b.h * 0.22;
      const fin = mix(a.c1, '#000000', 0.2);
      tri(b, [cx - rx + 2, cy], [1, cy - ry * 1.4], [1, cy + ry * 1.4], fin);
      tri(b, [cx - rx * 0.1, cy - ry + 1], [cx + rx * 0.25, cy - ry + 1], [cx, cy - ry - 2], fin);
      ellipse(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      eye(b, cx + rx * 0.7, cy - ry * 0.2, b.w > 24);
    },
    flat(b, a) {
      const cx = b.w * 0.55, cy = b.h / 2, rx = b.w * 0.24, ry = b.h * 0.38;
      const fin = mix(a.c1, '#000000', 0.25);
      tri(b, [cx - rx * 0.4, cy - ry + 1], [cx + rx * 0.5, cy - ry + 1], [cx - rx * 0.6, 0], fin);
      tri(b, [cx - rx * 0.4, cy + ry - 1], [cx + rx * 0.5, cy + ry - 1], [cx - rx * 0.6, b.h - 1], fin);
      tri(b, [cx - rx + 2, cy], [cx - rx - 4, cy - 3], [cx - rx - 4, cy + 3], fin);
      ellipse(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      eye(b, cx + rx * 0.55, cy - ry * 0.3);
    },
    fancy(b, a) {
      const cx = b.w * 0.64, cy = b.h / 2, rx = b.w * 0.2, ry = b.h * 0.3;
      const t = a.c2, t2 = mix(a.c2, a.c1, 0.4);
      tri(b, [cx - rx + 1, cy], [0, 0], [6, cy], t);           // 하늘하늘한 꼬리
      tri(b, [cx - rx + 1, cy], [0, b.h - 1], [6, cy], t);
      tri(b, [cx - rx + 1, cy], [2, cy - 2], [2, cy + 2], t2);
      for (let y = 1; y < b.h - 1; y += 2) b.set(2, y, t2);
      tri(b, [cx - 2, cy - ry + 1], [cx + 2, cy - ry + 1], [cx - 4, cy - ry - 3], t);
      tri(b, [cx - 1, cy + ry - 1], [cx + 2, cy + ry - 1], [cx - 2, cy + ry + 2], t2);
      ellipse(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      eye(b, cx + rx * 0.55, cy - ry * 0.25);
    },
    puffer(b, a) {
      const cx = b.w * 0.55, cy = b.h / 2, r = b.h * 0.36;
      const sp = mix(a.c1, '#000000', 0.4);
      for (let k = 0; k < 10; k++) { const t = (k / 10) * Math.PI * 2; b.set(cx + Math.cos(t) * (r + 1.5), cy + Math.sin(t) * (r + 1.2), sp); }
      tri(b, [cx - r, cy], [cx - r - 4, cy - 2], [cx - r - 4, cy + 2], sp);
      ellipse(b, cx, cy, r, r * 0.9, painter(a, cx, cy, r, r));
      eye(b, cx + r * 0.45, cy - r * 0.3);
      b.set(cx + r, cy + 1, '#c0505a');
    },
    seahorse(b, a) {
      const x0 = b.w * 0.45;
      ellipse(b, x0 + 2, 3, 2.5, 2, a.c1);
      line(b, x0 + 4, 3, x0 + 7, 3, a.c1);
      for (let i = 0; i < 7; i++) ellipse(b, x0 + Math.sin(i / 2) * 1.5, 5 + i, 2.2 - i * 0.15, 1, i % 2 ? a.c2 : a.c1);
      line(b, x0 - 1, 11, x0 - 3, 11, a.c1); b.set(x0 - 3, 10, a.c1);
      b.set(x0 - 2, 6, a.c2); b.set(x0 - 3, 5, a.c2);
      eye(b, x0 + 3, 2);
    },
    shrimp(b, a) {
      for (let i = 0; i < 6; i++) ellipse(b, 4 + i * 2.2, b.h / 2 + Math.sin(i / 1.6) * 2 - 1, 1.6, 1.8, i % 2 ? a.c2 : a.c1);
      tri(b, [3, 6], [0, 3], [0, 9], a.c1);
      line(b, 16, 4, 19, 1, a.c1); line(b, 16, 4, 19, 6, a.c2);
      for (let i = 0; i < 4; i++) b.set(7 + i * 2, b.h / 2 + 2, a.c2);
      eye(b, 16, 4);
    },
    crab(b, a) {
      ellipse(b, 7, 6, 5, 4.5, (x, y) => ((x + y) % 3 === 0 ? mix(a.c2, '#000000', 0.25) : a.c2));
      ellipse(b, 13, 8, 3, 2.2, a.c1);
      ellipse(b, 17, 6, 2, 1.6, a.c1); ellipse(b, 17, 10, 2, 1.6, a.c1);
      for (let i = 0; i < 3; i++) line(b, 12 + i * 2, 10, 11 + i * 2, 11, a.c1);
      b.set(14, 6, '#1a1a20'); b.set(15, 6, '#1a1a20');
    },
    catfish(b, a) {
      SHAPES.long(b, { ...a, pat: 'belly' });
      const x = b.w * 0.55 + b.w * 0.36;
      line(b, x, b.h / 2 + 1, x + 3, b.h / 2 + 4, a.c2);
      line(b, x, b.h / 2, x + 3, b.h / 2 - 3, a.c2);
    },
    flatfish(b, a) {
      const cx = b.w * 0.52, cy = b.h / 2, rx = b.w * 0.34, ry = b.h * 0.38;
      ellipse(b, cx, cy, rx + 1.5, ry + 1.2, a.c2);
      tri(b, [cx - rx, cy], [2, cy - 3], [2, cy + 3], a.c2);
      ellipse(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      eye(b, cx + rx * 0.55, cy - 2); eye(b, cx + rx * 0.7, cy - 1);
    },
    eel(b, a) {
      const cy = b.h / 2, r = Math.max(1.6, b.h * 0.16);
      for (let x = 2; x < b.w - 2; x += 0.5) ellipse(b, x, cy + Math.sin(x * 0.45) * b.h * 0.18, r, r, painter(a, b.w / 2, cy, b.w / 2, r));
      eye(b, b.w - 4, cy + Math.sin((b.w - 4) * 0.45) * b.h * 0.18 - 1);
    },
    squid(b, a) {
      const cy = b.h / 2;
      ellipse(b, b.w * 0.33, cy, b.w * 0.25, b.h * 0.26, a.c1);
      tri(b, [3, cy], [b.w * 0.15, cy - b.h * 0.45], [b.w * 0.15, cy + b.h * 0.45], a.c2);
      for (let k = -3; k <= 3; k++) line(b, b.w * 0.58, cy + k * 0.7, b.w - 2, cy + k * 1.4 + Math.sin(k) , a.c2);
      eye(b, b.w * 0.55, cy - 1, b.w > 24);
      for (let i = 0; i < 6; i++) b.set(b.w * 0.2 + i * 2, cy + (i % 2 ? 1 : -1), mix(a.c1, '#000000', 0.15));
    },
    octopus(b, a) {
      const cx = b.w / 2;
      ellipse(b, cx, b.h * 0.32, b.w * 0.28, b.h * 0.3, a.c1);
      for (let k = 0; k < 8; k++) {
        const x0 = cx - b.w * 0.3 + k * (b.w * 0.6 / 7);
        for (let j = 0; j < b.h * 0.45; j++) b.set(x0 + Math.sin(j * 0.8 + k) * 1.2, b.h * 0.5 + j, j % 3 === 2 ? a.c2 : a.c1);
      }
      eye(b, cx - 3, b.h * 0.38, true); eye(b, cx + 2, b.h * 0.38, true);
    },
    tuna(b, a) {
      const cx = b.w * 0.55, cy = b.h / 2, rx = b.w * 0.34, ry = b.h * 0.28;
      const fin = mix(a.c1, '#000000', 0.2);
      tri(b, [cx - rx + 2, cy], [1, cy - ry * 1.6], [5, cy], fin);
      tri(b, [cx - rx + 2, cy], [1, cy + ry * 1.6], [5, cy], fin);
      tri(b, [cx - 2, cy - ry + 1], [cx + 4, cy - ry + 1], [cx - 1, cy - ry - 3], fin);
      for (let i = 0; i < 4; i++) { b.set(cx - rx + 3 + i * 2, cy - ry - 0.5, '#f0c040'); b.set(cx - rx + 3 + i * 2, cy + ry + 0.5, '#f0c040'); }
      ellipse(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      eye(b, cx + rx * 0.7, cy - 1, true);
    },
    swordfish(b, a) {
      const cx = b.w * 0.5, cy = b.h * 0.6, rx = b.w * 0.3, ry = b.h * 0.2;
      const fin = mix(a.c1, '#000000', 0.15);
      tri(b, [cx - rx + 2, cy], [1, cy - ry * 2], [5, cy], fin);
      tri(b, [cx - rx + 2, cy], [1, cy + ry * 2], [5, cy], fin);
      tri(b, [cx - rx * 0.6, cy - ry], [cx + rx * 0.4, cy - ry], [cx - rx * 0.1, 0], a.c2 === '#d0e0f0' ? '#3a6ab8' : fin);
      line(b, cx + rx, cy, b.w - 1, cy - 1, mix(a.c1, '#ffffff', 0.3));
      ellipse(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      eye(b, cx + rx * 0.7, cy - 1);
    },
    sunfish(b, a) {
      const cx = b.w * 0.55, cy = b.h / 2, r = b.h * 0.38;
      tri(b, [cx - 4, cy - r + 1], [cx + 1, cy - r + 1], [cx - 4, 0], a.c1);
      tri(b, [cx - 4, cy + r - 1], [cx + 1, cy + r - 1], [cx - 4, b.h - 1], a.c1);
      ellipse(b, cx, cy, r * 1.15, r, (x, y) => (y > cy + 2 ? a.c2 : a.c1));
      rect(b, cx - r * 1.15 - 2, cy - 3, 3, 7, mix(a.c1, '#000000', 0.15));
      eye(b, cx + r * 0.7, cy - 2, true);
    },
    ray(b, a) {
      const cy = b.h / 2;
      tri(b, [b.w * 0.82, cy], [b.w * 0.5, 0], [b.w * 0.3, cy], a.c1);
      tri(b, [b.w * 0.82, cy], [b.w * 0.5, b.h - 1], [b.w * 0.3, cy], a.c1);
      line(b, b.w * 0.3, cy, 0, cy + 1, mix(a.c1, '#000000', 0.3));
      for (let i = 0; i < 5; i++) b.set(b.w * (0.45 + (i % 3) * 0.08), cy + (i - 2) * 2, a.c2);
      eye(b, b.w * 0.72, cy - 2); eye(b, b.w * 0.72, cy + 2);
    },
    shark(b, a) {
      const cx = b.w * 0.52, cy = b.h * 0.55, rx = b.w * 0.36, ry = b.h * 0.24;
      const fin = mix(a.c1, '#000000', 0.2);
      tri(b, [cx - rx + 2, cy], [1, cy - ry * 2.2], [6, cy], fin);
      tri(b, [cx - rx + 2, cy], [3, cy + ry * 1.3], [6, cy], fin);
      tri(b, [cx - rx * 0.1, cy - ry + 1], [cx + rx * 0.3, cy - ry + 1], [cx - rx * 0.15, cy - ry * 2.6], fin);
      tri(b, [cx + rx * 0.1, cy + ry - 1], [cx + rx * 0.4, cy + ry - 1], [cx, cy + ry * 2], fin);
      tri(b, [cx + rx - 1, cy - ry * 0.6], [cx + rx - 1, cy + ry * 0.6], [cx + rx + 4, cy], a.c1);
      ellipse(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      for (let i = 0; i < 3; i++) line(b, cx + rx * 0.45 + i * 1.5, cy - 1, cx + rx * 0.45 + i * 1.5, cy + 1, mix(a.c1, '#000000', 0.35));
      eye(b, cx + rx * 0.75, cy - 1);
    },
    hammer(b, a) {
      SHAPES.shark(b, { ...a, pat: 'belly' });
      const x = b.w * 0.52 + b.w * 0.36 + 2;
      rect(b, x, b.h * 0.55 - 4, 2, 9, a.c1);
      eye(b, x + 1, b.h * 0.55 - 4); eye(b, x + 1, b.h * 0.55 + 4);
    },
    turtle(b, a) {
      const cx = b.w * 0.48, cy = b.h / 2;
      ellipse(b, cx + b.w * 0.24, cy - 1, 3, 2.5, mix(a.c1, '#ffffff', 0.25));
      for (const [dx, dy] of [[0.12, -0.42], [0.12, 0.42], [-0.15, -0.35], [-0.15, 0.35]]) ellipse(b, cx + dx * b.w, cy + dy * b.h, 3, 2, mix(a.c1, '#ffffff', 0.25));
      ellipse(b, cx, cy, b.w * 0.2, b.h * 0.34, (x, y) => ((x + y) % 4 === 0 || (x - y) % 4 === 0 ? a.c2 : a.c1));
      eye(b, cx + b.w * 0.26, cy - 2);
    },
    dolphin(b, a, orca) {
      const cx = b.w * 0.5, cy = b.h * 0.55, rx = b.w * 0.34, ry = b.h * 0.24;
      const fin = mix(a.c1, '#000000', 0.15);
      tri(b, [cx - rx + 2, cy], [1, cy - ry * 1.4], [3, cy], fin);
      tri(b, [cx - rx + 2, cy], [1, cy + ry * 1.4], [3, cy], fin);
      tri(b, [cx - rx * 0.1, cy - ry + 1], [cx + rx * 0.25, cy - ry + 1], [cx - rx * (orca ? 0 : 0.3), cy - ry * (orca ? 3 : 2.2)], fin);
      tri(b, [cx + rx * 0.2, cy + ry - 1], [cx + rx * 0.45, cy + ry - 1], [cx + rx * 0.1, cy + ry * 1.8], fin);
      ellipse(b, cx, cy, rx, ry, (x, y) => (y > cy + ry * 0.2 ? a.c2 : a.c1));
      if (!orca) rect(b, cx + rx - 1, cy, 4, 2, a.c1);
      if (orca) ellipse(b, cx + rx * 0.55, cy - ry * 0.35, 2, 1, a.c2);
      eye(b, cx + rx * 0.75, cy - 1);
    },
    orca(b, a) { SHAPES.dolphin(b, a, true); },
    narwhal(b, a) {
      SHAPES.whale(b, a, 0.3);
      line(b, b.w * 0.88, b.h * 0.5, b.w - 1, b.h * 0.25, '#f4efe0');
    },
    whale(b, a, k = 0.38) {
      const cx = b.w * 0.5, cy = b.h * 0.52, rx = b.w * k, ry = b.h * 0.3;
      const fin = mix(a.c1, '#000000', 0.15);
      tri(b, [cx - rx + 2, cy], [1, cy - ry * 1.1], [3, cy], fin);
      tri(b, [cx - rx + 2, cy], [1, cy + ry * 1.1], [3, cy], fin);
      ellipse(b, cx, cy, rx, ry, (x, y) => (y > cy + ry * 0.35 ? ((x % 2) ? a.c2 : mix(a.c2, '#000000', 0.12)) : (a.pat === 'spot' && hash(x, y) === 0 ? a.c2 : a.c1)));
      tri(b, [cx + rx * 0.2, cy + ry * 0.6], [cx + rx * 0.45, cy + ry * 0.6], [cx, cy + ry * 1.7], fin);
      eye(b, cx + rx * 0.72, cy + 1);
    },
    sperm(b, a) {
      const cy = b.h * 0.52;
      SHAPES.whale(b, a, 0.32);
      rect(b, b.w * 0.6, cy - b.h * 0.3, b.w * 0.3, b.h * 0.55, a.c1);
      line(b, b.w * 0.62, cy + b.h * 0.27, b.w * 0.88, cy + b.h * 0.27, a.c2);
      eye(b, b.w * 0.68, cy + 1);
    },
    // ---------------- 쓰레기
    // ---- 신비 등급 (특이한 바다 생물)
    blob(b, a) {   // 블롭피쉬: 축 처진 분홍 젤리 얼굴
      const cx = b.w * 0.52, cy = b.h * 0.5, rx = b.w * 0.34, ry = b.h * 0.42;
      tri(b, [cx - rx + 2, cy], [1, cy - 3], [1, cy + 3], mix(a.c1, '#000000', 0.12));
      ellipse(b, cx, cy, rx, ry, (x, y) => (y > cy + ry * 0.45 ? mix(a.c1, '#ffffff', 0.25) : a.c1));
      ellipse(b, cx + rx * 0.62, cy + ry * 0.28, 3.4, 2.6, a.c2);   // 늘어진 코
      b.set(cx + rx * 0.62, cy + ry * 0.28 - 1, mix(a.c2, '#ffffff', 0.4));
      line(b, cx + rx * 0.25, cy + ry * 0.72, cx + rx * 0.62, cy + ry * 0.62, mix(a.c1, '#000000', 0.35));   // 시무룩한 입
      b.set(cx + rx * 0.3, cy - ry * 0.22, '#1a1a20'); b.set(cx + rx * 0.78, cy - ry * 0.28, '#1a1a20');
    },
    clione(b, a) {  // 바다의 천사(클리오네): 투명한 몸 + 주황 속 + 날개
      const cy = b.h / 2;
      tri(b, [b.w * 0.55, cy - 2], [b.w * 0.55, cy + 2], [2, cy], a.c1);   // 꼬리처럼 가늘어지는 몸
      ellipse(b, b.w * 0.58, cy, b.w * 0.16, b.h * 0.3, a.c1);
      ellipse(b, b.w * 0.8, cy, b.w * 0.12, b.h * 0.26, a.c1);           // 머리
      ellipse(b, b.w * 0.6, cy, 2, 1.6, a.c2);                            // 빨간 속
      b.set(b.w * 0.86, cy - 2, a.c2); b.set(b.w * 0.88, cy - 3, a.c2);   // 작은 뿔
      ellipse(b, b.w * 0.62, 2, 3, 1.8, mix(a.c1, '#9fd8ff', 0.4));      // 위 날개
      ellipse(b, b.w * 0.62, b.h - 3, 3, 1.8, mix(a.c1, '#9fd8ff', 0.4)); // 아래 날개
      eye(b, b.w * 0.86, cy);
    },
    kraken(b, a) {  // 크라켄: 오른쪽 머리, 뒤로 휘날리는 큰 촉수
      const cy = b.h / 2;
      for (let k = 0; k < 7; k++) {
        const off = (k - 3) * (b.h * 0.12);
        for (let x = 1; x < b.w * 0.62; x += 0.5) {
          const y = cy + off * (0.4 + (b.w * 0.62 - x) / (b.w * 0.62) * 0.9) + Math.sin(x * 0.5 + k) * 1.4;
          b.set(x, y, Math.round(x * 2) % 9 === 0 && k % 2 ? a.c2 : mix(a.c1, '#000000', 0.1 * (k % 2)));
        }
      }
      ellipse(b, b.w * 0.74, cy, b.w * 0.2, b.h * 0.38, a.c1);
      for (let i = 0; i < 5; i++) b.set(b.w * 0.66 + i * 2, cy - b.h * 0.2 + (i % 2), mix(a.c1, '#ffffff', 0.2));
      ellipse(b, b.w * 0.8, cy - 1, 2, 2, '#f4cf4f'); b.set(b.w * 0.8, cy - 1, '#1a1a20'); b.set(b.w * 0.8, cy, '#1a1a20');
    },
    oarfish(b, a) { // 산갈치: 아주 긴 은빛 리본 + 빨간 지느러미
      const cy = b.h * 0.58;
      for (let x = 1; x < b.w - 3; x += 0.5) {
        const y = cy + Math.sin(x * 0.35) * b.h * 0.12, t = Math.max(1, 2.2 * (x / b.w) + 0.6);
        ellipse(b, x, y, 0.8, t, (xx, yy) => (yy > y + t * 0.3 ? mix(a.c1, '#ffffff', 0.5) : a.c1));
        if (Math.round(x * 2) % 2 === 0) b.set(x, y - t - 1, a.c2);
      }
      const hx = b.w - 4, hy = cy + Math.sin(hx * 0.35) * b.h * 0.12;
      ellipse(b, hx, hy, 2.6, 2.4, a.c1);
      for (let i = 0; i < 5; i++) line(b, hx - 1, hy - 2, hx - 3 + i, hy - 7 - (i % 2), a.c2);   // 머리 깃털
      eye(b, hx + 1, hy - 1);
    },
    angler(b, a) {  // 초롱아귀: 어두운 몸 + 날카로운 이빨 + 빛나는 초롱
      const cx = b.w * 0.5, cy = b.h * 0.58, rx = b.w * 0.3, ry = b.h * 0.36;
      tri(b, [cx - rx + 2, cy], [1, cy - 4], [1, cy + 4], mix(a.c1, '#000000', 0.25));
      ellipse(b, cx, cy, rx, ry, a.c1);
      line(b, cx + rx * 0.2, cy + 1, cx + rx, cy + 2, '#1a1020');   // 큰 입
      for (let i = 0; i < 4; i++) { b.set(cx + rx * 0.3 + i * 1.6, cy + 2, '#ffffff'); b.set(cx + rx * 0.4 + i * 1.6, cy, '#ffffff'); }
      line(b, cx + rx * 0.1, cy - ry, cx + rx * 0.7, cy - ry - 3, mix(a.c1, '#ffffff', 0.3));   // 초롱 줄기
      line(b, cx + rx * 0.7, cy - ry - 3, cx + rx * 1.05, cy - ry - 1, mix(a.c1, '#ffffff', 0.3));
      ellipse(b, cx + rx * 1.12, cy - ry, 1.6, 1.6, a.c2); b.set(cx + rx * 1.12, cy - ry - 1, '#ffffff');
      eye(b, cx + rx * 0.45, cy - ry * 0.4);
    },
    barreleye(b, a) { // 배럴아이: 투명한 머리 안에 초록 눈
      const cx = b.w * 0.5, cy = b.h * 0.6, rx = b.w * 0.3, ry = b.h * 0.3;
      tri(b, [cx - rx + 2, cy], [1, cy - 4], [1, cy + 4], mix(a.c1, '#000000', 0.2));
      ellipse(b, cx, cy, rx, ry, painter(a, cx, cy, rx, ry));
      ellipse(b, cx + rx * 0.45, cy - ry * 1.1, rx * 0.5, ry * 0.85, 'rgba(190,240,255,0.55)');   // 투명 머리
      ellipse(b, cx + rx * 0.35, cy - ry * 1.05, 1.4, 1.4, a.c2); ellipse(b, cx + rx * 0.65, cy - ry * 1.05, 1.4, 1.4, a.c2);
      b.set(cx + rx * 0.95, cy, '#1a1a20');
    },
    dumbo(b, a) {   // 덤보문어: 귀처럼 생긴 지느러미
      const cx = b.w * 0.55, cy = b.h * 0.42;
      ellipse(b, cx, cy, b.w * 0.24, b.h * 0.34, a.c1);
      ellipse(b, cx - b.w * 0.24, cy - b.h * 0.18, 2.6, 2, a.c2); ellipse(b, cx + b.w * 0.24, cy - b.h * 0.18, 2.6, 2, a.c2);   // 귀
      for (let k = 0; k < 5; k++) { const x0 = cx - b.w * 0.18 + k * (b.w * 0.36 / 4); for (let j = 0; j < b.h * 0.32; j++) b.set(x0 + Math.sin(j * 0.9 + k) * 0.8, cy + b.h * 0.3 + j, a.c1); }
      eye(b, cx - 2, cy); eye(b, cx + 2, cy);
    },
    leafy(b, a) {   // 나뭇잎해룡: 잎사귀를 두른 해마
      const x0 = b.w * 0.5;
      ellipse(b, x0 + 3, 3, 2.6, 1.8, a.c1); line(b, x0 + 5, 3, x0 + 9, 3, a.c1);
      for (let i = 0; i < 7; i++) ellipse(b, x0 + Math.sin(i / 2) * 1.5, 5 + i, 2 - i * 0.12, 1, i % 2 ? a.c2 : a.c1);
      const leaf = mix(a.c2, '#3f8a3a', 0.3);
      [[x0 - 3, 4], [x0 + 3, 7], [x0 - 4, 9], [x0 + 3, 10], [x0 - 2, 1], [x0 - 5, 6]].forEach(([x, y]) => { ellipse(b, x, y, 1.6, 1, leaf); b.set(x - 2, y, leaf); });
      line(b, x0 - 1, 11, x0 - 4, 11, a.c1);
      eye(b, x0 + 4, 2);
    },
    axolotl(b, a) { // 우파루파: 분홍 몸 + 머리 양옆 깃털 아가미
      const cy = b.h * 0.55;
      ellipse(b, b.w * 0.45, cy, b.w * 0.3, b.h * 0.22, a.c1);
      tri(b, [b.w * 0.2, cy], [1, cy - 2], [1, cy + 2], mix(a.c1, '#ffffff', 0.3));
      ellipse(b, b.w * 0.76, cy - 1, b.w * 0.14, b.h * 0.28, a.c1);   // 머리
      for (let i = 0; i < 3; i++) { line(b, b.w * 0.7, cy - 3, b.w * 0.62 - i, cy - 6 - i, a.c2); line(b, b.w * 0.7, cy + 1, b.w * 0.62 - i, cy + 4 + i, a.c2); }
      b.set(b.w * 0.36, cy + b.h * 0.26, a.c1); b.set(b.w * 0.56, cy + b.h * 0.26, a.c1);   // 다리
      eye(b, b.w * 0.82, cy - 2); b.set(b.w * 0.88, cy, mix(a.c1, '#000000', 0.4));
    },
    nessie(b, a) {  // 네시: 긴 목 + 혹 + 지느러미발
      const cy = b.h * 0.72;
      ellipse(b, b.w * 0.42, cy, b.w * 0.24, b.h * 0.2, a.c1);
      ellipse(b, b.w * 0.3, cy - b.h * 0.18, b.w * 0.08, b.h * 0.12, a.c1);   // 혹
      tri(b, [b.w * 0.2, cy], [1, cy - 1], [3, cy + 3], a.c1);
      for (let i = 0; i < 12; i++) { const t = i / 11; ellipse(b, b.w * 0.6 + t * b.w * 0.24, cy - 2 - Math.sin(t * Math.PI / 2) * b.h * 0.52, 1.6, 1.6, a.c1); }
      ellipse(b, b.w * 0.88, cy - 2 - b.h * 0.52, 2.6, 1.8, a.c1);   // 머리
      ellipse(b, b.w * 0.32, cy + b.h * 0.17, 2.4, 1.2, a.c2); ellipse(b, b.w * 0.54, cy + b.h * 0.17, 2.4, 1.2, a.c2);
      for (let i = 0; i < 4; i++) b.set(b.w * 0.34 + i * 3, cy - 1, a.c2);
      eye(b, b.w * 0.9, cy - 3 - b.h * 0.52);
    },
    can(b) { rect(b, 5, 2, 6, 10, '#c8ccd2'); rect(b, 5, 5, 6, 4, '#d9534f'); rect(b, 5, 2, 6, 1, '#8a9098'); b.set(7, 6, '#ffffff'); b.set(8, 6, '#ffffff'); },
    tire(b) { ellipse(b, 8, 7, 6, 6, '#2a2a30'); ellipse(b, 8, 7, 2.8, 2.8, null); for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 8, y - 7); if (d < 3) b.g[y] && (b.g[y][x] = null); else if (d < 4 && b.g[y][x]) b.g[y][x] = '#6a6a72'; } },
    boot(b) { rect(b, 4, 1, 5, 9, '#7a5030'); rect(b, 4, 9, 10, 3, '#7a5030'); rect(b, 4, 12, 10, 1, '#3a2418'); b.set(6, 4, '#5a3820'); b.set(11, 10, '#a07048'); },
    bottle(b) { rect(b, 6, 4, 4, 9, '#5aa86a'); rect(b, 7, 1, 2, 3, '#5aa86a'); rect(b, 7, 0, 2, 1, '#8a6a4a'); b.set(7, 6, '#bfe8c8'); b.set(7, 7, '#bfe8c8'); },
    bag(b) { ellipse(b, 8, 8, 5, 4.5, '#eef0f2'); rect(b, 5, 2, 1, 4, '#eef0f2'); rect(b, 10, 2, 1, 4, '#eef0f2'); b.set(7, 8, '#c8ccd2'); b.set(9, 9, '#c8ccd2'); },
    paper(b) { rect(b, 3, 3, 10, 9, '#d8d4c8'); for (let i = 0; i < 4; i++) line(b, 5, 5 + i * 2, 11 - (i % 2) * 2, 5 + i * 2, '#8a867a'); b.set(12, 3, '#b8b4a8'); },
    umbrella(b) { for (let x = 2; x <= 13; x++) for (let y = 2; y <= 6; y++) if (Math.hypot(x - 7.5, (y - 6) * 1.4) <= 6) b.set(x, y, x % 4 < 2 ? '#d9534f' : '#f0f0f0'); line(b, 8, 6, 8, 12, '#3a3a3a'); b.set(7, 12, '#3a3a3a'); b.set(6, 11, '#3a3a3a'); line(b, 10, 4, 13, 8, '#3a3a3a'); },
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
    (SHAPES[a.shape] || SHAPES.fish)(b, { c1: a.c1 || '#8aa', c2: a.c2 || '#dde', pat: a.pat });
    outline(b, fish.cat === 'T' ? '#2a2630' : mix(a.c1 || '#888888', '#000000', 0.62));
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
