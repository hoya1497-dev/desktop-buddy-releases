// 기본 캐릭터: 16x16 도트 고양이 · 강아지 · 토끼
// 문자: . 투명 / o 외곽선 / b 몸 / d 진한 몸(귀) / l 배(밝게) / e 눈 / n 코 / p 볼·귀 안쪽
(function () {
  const SPECIES = {
    cat: {
      name: '고양이',
      eyeRows: [7, 8], headTop: 4, earXs: [2, 13],
      body: [
        '................',
        '..oo........oo..',
        '..obo......obo..',
        '..obbo....obbo..',
        '..obbboooobbbo..',
        '.obbbbbbbbbbbbo.',
        '.obbbbbbbbbbbbo.',
        '.obbeebbbbeebbo.',
        '.obbeebbbbeebbo.',
        '.obppbbnnbbppbo.',
        '.obbbbllllbbbbo.',
        '.obbbllllllbbbo.',
        '.obbbllllllbbbo.',
        '..obbbbbbbbbbo..',
      ],
      tail: [[[15, 8, 'o'], [15, 9, 'o'], [15, 10, 'o']], [[15, 7, 'o'], [15, 8, 'o'], [14, 10, 'o']]],
    },
    dog: {
      name: '강아지',
      eyeRows: [6, 7], headTop: 2, earXs: [1, 14],
      body: [
        '................',
        '....oooooooo....',
        '..oobbbbbbbboo..',
        '.oddbbbbbbbbddo.',
        'oddobbbbbbbboddo',
        'oddobbbbbbbboddo',
        'oddobeebbeeboddo',
        '.odobeebbeebodo.',
        '..obpbbnnbbpbo..',
        '..obbbbllbbbbo..',
        '.obbbbllllbbbbo.',
        '.obbbllllllbbbo.',
        '.obbbllllllbbbo.',
        '..obbbbbbbbbbo..',
      ],
      tail: [[[15, 9, 'o'], [15, 10, 'o']], [[15, 8, 'o'], [14, 9, 'o']]],
    },
    rabbit: {
      name: '토끼',
      eyeRows: [7, 8], headTop: 4, earXs: [4, 11],
      body: [
        '....oo....oo....',
        '...opo....opo...',
        '...opo....opo...',
        '...obo....obo...',
        '..obbboooobbbo..',
        '.obbbbbbbbbbbbo.',
        '.obbbbbbbbbbbbo.',
        '.obbeebbbbeebbo.',
        '.obbeebbbbeebbo.',
        '.obppbbnnbbppbo.',
        '.obbbbllllbbbbo.',
        '.obbbllllllbbbo.',
        '.obbbllllllbbbo.',
        '..obbbbbbbbbbo..',
      ],
      tail: [[[15, 11, 'l'], [14, 12, 'l']], [[15, 12, 'l'], [14, 12, 'l']]],
    },
  };
  const LEGS = {
    stand: ['..obbo....obbo..', '..oooo....oooo..'],
    walkA: ['.obbo......obbo.', '.ooo........ooo.'],
    walkB: ['...obbo..obbo...', '...ooo....ooo...'],
    sit:   ['..obbbbbbbbbbo..', '..oooooooooooo..'],
    air:   ['obbo........obbo', 'ooo..........ooo'],
  };

  // 액세서리: 그림(rows) · 놓을 자리. 'top'은 머리 꼭대기에 아랫줄을 맞춤
  const ACC_PAL = { o: '#2a2028', p: '#f47aa0', P: '#c84a78', y: '#f4cf4f', Y: '#c9962c', r: '#e0463a', b: '#4a8ae0',
    v: '#8a5ad8', V: '#5a3aa8', k: '#1a1a22', w: '#ffffff', g: '#5cb85c', n: '#c08a50', s: '#9aa0a6', m: '#f0883a',
    c: '#6fd6f4', C: '#2a6fb8', R: '#a8302a', S: '#d8dde4', e: '#b0b6bf' };
  const ACC = {
    ribbon:     { place: 'ear', rows: ['pp.pp', 'ppPpp', 'pp.pp'] },
    flower:     { place: 'ear', rows: ['.p.', 'pyp', '.p.'] },
    beanie:     { place: 'top', x: 3, rows: ['....oooo....', '..oovvvvoo..', '.ovvvvvvvvo.', 'oVVVVVVVVVVo'] },
    strawhat:   { place: 'top', x: 1, rows: ['.....oooo.....', '....oyyyyo....', '....orrrro....', 'ooooYYYYYYoooo'] },
    partyhat:   { place: 'top', x: 5, rows: ['..y..', '..o..', '.oro.', '.oyo.', 'obrbo', 'ooooo'] },
    headphones: { place: 'top', x: 1, dy: 3, rows: ['...oooooooo...', '..o........o..', '.o..........o.', 'kk..........kk', 'kk..........kk', 'kk..........kk'] },
    crown:      { place: 'top', x: 4, rows: ['y..y..y.', 'yy.yy.yy', 'yyyyyyyy', 'yryybyry'] },
    wizard:     { place: 'top', x: 3, rows: ['......o.....', '.....ovo....', '....ovyvo...', '...ovvvvvo..', '..ovvvyvvvo.', 'oVVVVVVVVVVo'] },
    halo:       { place: 'top', x: 4, dy: -3, rows: ['.yyyyyy.', 'y......y', '.yyyyyy.'] },
    // 안경: 가는 동그란 은테 + 귀걸이 다리, 렌즈는 투명(눈이 보임) + 반짝
    glasses:    { place: 'eyes', x: 1, rows: ['..wSSw..wSSw..', 'SSS..SSSS..SSS', '..S..S..S..S..', '...SS....SS...'] },
    // 선글라스: 굵은 검은 테 + 파랗게 반사되는 큰 렌즈
    sunglasses: { place: 'eyes', x: 1, rows: ['kkkkkkkkkkkkkk', '.kwcck..kwcck.', '.kCCCk..kCCCk.', '..kkk....kkk..'] },
    bowtie:     { place: 'neck', x: 6, rows: ['rr.rr', 'rrRrr', 'rr.rr'].map((r) => r.replace('R', 'P').replace(/r/g, 'r')) },
    // ---- 운영자 전용 ----
    starband:   { place: 'top', x: 2, rows: ['.....y......', '....yyy.....', '.....y......', 'bbbbbbbbbbbb'] },
    flamecrown: { place: 'top', x: 4, rows: ['m..rr..m', 'mr.mm.rm', 'rmmyymmr', 'YYYYYYYY', 'YrYbbYrY'] },
    pirate:     { place: 'top', x: 1, rows: ['.....kkkk.....', '...kkkkkkkk...', '..kkkkwwkkkk..', '.kkkkwkkwkkkk.', 'kkkkkkkkkkkkkk', 'yyyyyyyyyyyyyy'] },
    knight:     { place: 'top', x: 2, dy: 1, rows: ['.....rr.....', '....rrr.....', '...SSSSSS...', '..SSSSSSSS..', '.SwSSSSSSSS.', 'eeeeeeeeeeee'] },
    horns:      { place: 'top', x: 2, rows: ['r..........r', 'rr........rr', '.Rr......rR.'] },
    visor:      { place: 'eyes', x: 1, rows: ['kkkkkkkkkkkkkk', 'kvcwvvvvvvcwvk', 'kVvvvvvvvvvvVk', '.kkkkkkkkkkkk.'] },
    eyepatch:   { place: 'eyes', x: 1, rows: ['.kkkkkkk.kkkk.', '.........kkkk.', '.........kkkk.', '..........kk..'] },
    heartglass: { place: 'eyes', x: 2, rows: ['pp.pp..pp.pp', 'pPPPpkkpPPPp', '.pPp....pPp.', '..p......p..'] },
    medal:      { place: 'neck', x: 5, rows: ['rb..br', '.rbbr.', '..yy..', '.yYYy.', '..yy..'] },
    scarf:      { place: 'neck', x: 2, rows: ['rrrrrrrrrrrr', 'RRRRRRRRRrrR', '........rR..', '........rR..'] },
  };
  function accOrigin(sp, a, rows) {
    const h = rows.length;
    if (a.place === 'top') return [a.x, sp.headTop - h + 1 + (a.dy || 0)];
    if (a.place === 'ear') return [sp.earXs[1] - 2, sp.headTop - 2];
    if (a.place === 'eyes') return [a.x, sp.eyeRows[0] - 1];
    if (a.place === 'neck') return [a.x, 12];
    return [0, 0];
  }

  // 눈 모양: open / closed(감음) / happy(^^)
  function eyes(rows, mode, eyeRows) {
    if (mode === 'open') return rows;
    const [a, b] = eyeRows;
    return rows.map((r, i) => {
      if (i === a) return r.replace(/e/g, mode === 'happy' ? 'o' : 'b');
      if (i === b) return r.replace(/e/g, mode === 'happy' ? 'b' : 'o');
      return r;
    });
  }

  function hexToRgb(hex) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    if (Number.isNaN(n)) return [242, 166, 90];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const mix = (rgb, t, k) => rgb.map((c, i) => Math.round(c + (t[i] - c) * k));
  const css = (rgb) => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;

  function palette(color) {
    const base = hexToRgb(color);
    return {
      o: css(mix(base, [30, 20, 25], 0.72)),
      b: css(base),
      d: css(mix(base, [40, 25, 20], 0.35)),
      l: css(mix(base, [255, 255, 255], 0.55)),
      e: '#231a1f',
      n: '#3a2228',
      p: 'rgba(255,120,150,0.75)',
    };
  }

  // 캐릭터를 1칸 = 1픽셀인 작은 그림으로 먼저 만들고(캐시), 그걸 통째로 키워서 그림.
  // 칸마다 따로 사각형을 그리면 화면 배율이 125%·150%인 컴퓨터에서 칸 사이에 틈이 생겨
  // 도트 무늬가 보이고 군데군데 비쳐 보였음.
  const PAD_X = 6, PAD_Y = 10, BW = 16 + PAD_X * 2, BH = 18 + PAD_Y + 4;
  const cache = new Map();
  function bitmapOf(opts, pal) {
    const accKey = opts.acc ? ['neck', 'face', 'head'].map((k) => opts.acc[k] || '').join(',') : '';
    const key = [opts.species, opts.legs, opts.eyes, opts.flip ? 1 : 0, opts.tailFrame || 0, accKey, pal.o, pal.b, pal.d, pal.l, pal.e, pal.n, pal.p].join('|');
    let c = cache.get(key);
    if (c) return c;
    const sp = SPECIES[opts.species] || SPECIES.cat;
    c = document.createElement('canvas'); c.width = BW; c.height = BH;
    const g = c.getContext('2d', { willReadFrequently: true });
    const rows = eyes(sp.body, opts.eyes || 'open', sp.eyeRows).concat(LEGS[opts.legs] || LEGS.stand);
    const px = (x, y, col) => {
      const dx = opts.flip ? 15 - x : x;
      g.fillStyle = col;
      g.fillRect(dx + PAD_X, y + PAD_Y, 1, 1);
    };
    for (let y = 0; y < rows.length; y++) {
      const r = rows[y];
      for (let x = 0; x < 16; x++) { const ch = r[x]; if (ch && ch !== '.') px(x, y, pal[ch]); }
    }
    for (const [x, y, col] of sp.tail[opts.tailFrame || 0]) px(x, y, pal[col]);
    const acc = opts.acc || {};
    for (const slot of ['neck', 'face', 'head']) {   // 목 → 얼굴 → 머리 순서로
      const a = ACC[acc[slot]];
      if (!a) continue;
      const [ox, oy] = accOrigin(sp, a, a.rows);
      a.rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.' && ACC_PAL[ch]) px(ox + i, oy + j, ACC_PAL[ch]); }));
    }
    if (cache.size > 400) cache.clear();
    cache.set(key, c);
    return c;
  }

  /** opts: { species, legs, eyes, flip, scale, color | palette, tailFrame, acc } — (left, top)은 16×16 칸의 왼쪽 위 */
  function drawPet(ctx, left, top, opts) {
    const s = opts.scale;
    const pal = opts.palette || palette(opts.color);
    const bm = bitmapOf(opts, pal);
    const was = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bm, left - PAD_X * s, top - PAD_Y * s, BW * s, BH * s);
    ctx.imageSmoothingEnabled = was;
  }

  window.Sprites = {
    drawPet, palette, SIZE: 16, ACC, clearCache: () => cache.clear(),
    species: Object.fromEntries(Object.entries(SPECIES).map(([k, v]) => [k, v.name])),
  };
})();
