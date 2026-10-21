// 도트 가구 + 벽지/바닥 테마. 그림은 글자 격자로 그려 두고, 한 칸 = 1픽셀로 캐시한 뒤 확대해서 또렷하게 그림.
window.Furniture = (() => {
  // 공용 색
  const PAL = {
    o: '#3b2a25', k: '#26222b', w: '#a8703f', W: '#7a4b28', l: '#d39b5b', n: '#8b5a3c', N: '#5c3a26',
    g: '#6cbf55', G: '#3f8a3a', r: '#e0564f', R: '#a3383a', b: '#6aa2e8', B: '#3d67a8', y: '#f4cf4f',
    Y: '#c9962c', s: '#9aa0a6', S: '#d7dbe0', x: '#ffffff', p: '#f6a9bf', P: '#d9708f', c: '#f3e3c3',
    t: '#7fd6e8', T: '#3aa0b8', m: '#f0a050', q: '#cf6f45', Q: '#9c4b2b', v: '#b79be8', V: '#7d62b8',
    a: '#e8e2da', A: '#bdb5aa',
  };

  // ---------------------------------------------------------------- 그림 (글자 격자)
  const ART = {
    computer: [
      '......oooooooooooo......',
      '......okkkkkkkkkko......',
      '......okttttttttko......',
      '......okttxtttttko......',
      '......okttttttttko......',
      '......okttttttttko......',
      '......okkkkkkkkkko......',
      '......ooooossooooo......',
      '..........osso..........',
      '........oossssoo..oSSSo.',
      'oooooooooooooooooooooooo',
      'ollllllllllllllllllllllo',
      'owwwwwwwwwwwwwwwwwwwwwwo',
      'oooooooooooooooooooooooo',
      '.ow..................wo.',
      '.ow..................wo.',
      '.ow..................wo.',
      '.oo..................oo.',
    ],
    bed: [
      'oooo....................',
      'owwo....................',
      'owwooooooooooooooooooooo',
      'owwoxxxxxopppppppppppppo',
      'owwoxxxxxopppppppppppppo',
      'owwooooooopPpPpPpPpPpPpo',
      'owwocccccccccccccccccccо'.replace(/[^.a-zA-Z@]/g, 'o'),
      'owwowwwwwwwwwwwwwwwwwwwo',
      'oooooooooooooooooooooooo',
      'ow....................wo',
      'oo....................oo',
    ],
    sofa: [
      '..oooooooooooooooooooo..',
      '.obbbbbbbbbbbbbbbbbbbbo.',
      '.obbbbbbbbbbbbbbbbbbbbo.',
      'oobbbbbbbbbbbbbbbbbbbboo',
      'obboooooooooooooooooobbo',
      'obbobbbbbbbbbbbbbbbbobbo',
      'obbobbbbbbbbbbbbbbbbobbo',
      'oBBooooooooooooooooooBBo',
      'oBBBBBBBBBBBBBBBBBBBBBBo',
      'oooooooooooooooooooooooo',
      '.oN..................No.',
    ],
    chair: [
      'oooo........',
      'onno........',
      'onno........',
      'onno........',
      'onno........',
      'onno........',
      'onnooooooooo',
      'onnnnnnnnnno',
      'oooooooooooo',
      'ono......ono',
      'ono......ono',
      'ono......ono',
      'ooo......ooo',
    ],
    table: [
      'oooooooooooooooooo',
      'ollllllllllllllllo',
      'owwwwwwwwwwwwwwwwo',
      'oooooooooooooooooo',
      '.ow............wo.',
      '.ow............wo.',
      '.ow............wo.',
      '.ow............wo.',
      '.oo............oo.',
    ],
    plant: [
      '....o.o.....',
      '...ogogo....',
      '..oggGggo...',
      '.ogGgggGgo..',
      '.oggGgGggo..',
      '..oggGggo...',
      '...ooGoo....',
      '..oooooooo..',
      '..oqqqqqqo..',
      '..oQQQQQQo..',
      '...oqqqqo...',
      '...oooooo...',
    ],
    cactus: [
      '...oooo...',
      '..oggGgo..',
      '..ogGggo..',
      '..oggGgo..',
      '..ogGggo..',
      '..oggGgo..',
      '.oooooooo.',
      '.oqqqqqqo.',
      '.oQQQQQQo.',
      '..oqqqqo..',
      '..oooooo..',
    ],
    lamp: [
      '..oooooo..',
      '.oyyyyyyo.',
      '.oyyyyyyo.',
      'oyyyyyyyyo',
      'oooooooooo',
      '....os....',
      '....os....',
      '....os....',
      '....os....',
      '....os....',
      '....os....',
      '....os....',
      '....os....',
      '....os....',
      '....os....',
      '...oooo...',
      '..osssso..',
      '..oooooo..',
    ],
    frame: [
      'oooooooooooooo',
      'onnnnnnnnnnnno',
      'onbbbbbbbbbbno',
      'onbbbbbbbybbno',
      'onbbbbbbbbbbno',
      'onbbbgggbbbbno',
      'onbgggggggbbno',
      'onggggggggggno',
      'onGGGGGGGGGGno',
      'onnnnnnnnnnnno',
      'oooooooooooooo',
    ],
    clock: [
      '...oooooo...',
      '..oxxxxxxo..',
      '.oxxxxkxxxo.',
      'oxxxxxkxxxxo',
      'oxxxxxkxxxxo',
      'oxxxxxkkkxxo',
      'oxxxxxxxxxxo',
      'oxxxxxxxxxxo',
      '.oxxxxxxxxo.',
      '..oxxxxxxo..',
      '...oooooo...',
    ],
    teddy: [
      '.oo......oo.',
      'onno....onno',
      'onnoooooonno',
      '.onnnnnnnno.',
      '.onknnnnkno.',
      '.onnnccnnno.',
      '..onnkknno..',
      '.oonnnnnnoo.',
      'onnncccnnnno',
      'onnncccnnnno',
      '.onnnnnnnno.',
      '.oooo..oooo.',
    ],
    bunny: [
      '.oo..oo...',
      '.oao.oao..',
      '.opo.opo..',
      '.oao.oao..',
      '.oaoooao..',
      'oaaaaaaao.',
      'oakaaakao.',
      'oaaapaaao.',
      '.oaaaaao..',
      'oaaaaaaao.',
      'oaaaaaaao.',
      '.ooo.ooo..',
    ],
    catdoll: [
      '.oo......oo.',
      '.omo....omo.',
      '.ommoooommo.',
      'ommmmmmmmmmo',
      'ommkmmmmkmmo',
      'ommmmppmmmmo',
      '.ommmmmmmmo.',
      '..ommmmmmo..',
      '.ommmmmmmmo.',
      '.ommmmmmmmo.',
      '..oooooooo..',
    ],
    duck: [
      '...ooo....',
      '..oyyyo...',
      '..oykyoo..',
      '..oyyymmo.',
      '...oyyoo..',
      '.ooyyyyo..',
      'oyyyyyyyo.',
      'oyyYyyyyo.',
      'oyyYYyyyo.',
      '.oyyyyyo..',
      '..ooooo...',
    ],
    books: [
      'oooooooooooooooo',
      'owwwwwwwwwwwwwwo',
      'owrbgyrbgyrbgywo',
      'owrbgyrbgyrbgywo',
      'owrbgyrbgyrbgywo',
      'owwwwwwwwwwwwwwo',
      'owgyrbpgyrbpgywo',
      'owgyrbpgyrbpgywo',
      'owgyrbpgyrbpgywo',
      'owwwwwwwwwwwwwwo',
      'owbpgrybpgrybpwo',
      'owbpgrybpgrybpwo',
      'owbpgrybpgrybpwo',
      'owwwwwwwwwwwwwwo',
      'oooooooooooooooo',
      'oN............No',
    ],
    tv: [
      '......o....o......',
      '.......o..o.......',
      '........oo........',
      'oooooooooooooooooo',
      'okkkkkkkkkkkkkkkko',
      'okttxtttttttttttko',
      'oktttttttttttttTko',
      'okttttttttttttTTko',
      'oktttttttttttTTTko',
      'okkkkkkkkkkkkkkkko',
      'oooooooooooooooooo',
      '...oo........oo...',
    ],
    tankS: [
      '...oooooooo...',
      '..oSSSSSSSSo..',
      '.otttttttttto.',
      'ottttttttttttо'.replace(/[^.a-zA-Z@]/g, 'o'),
      'otttttttttttto',
      'otttttttttttto',
      'otttttttttttto',
      '.oyyyyyyyyyyo.',
      '..oooooooooo..',
      '...onnnnnno...',
      '...oooooooo...',
    ],
    tankM: [
      'oooooooooooooooo',
      'oSSSSSSSSSSSSSSo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obgbbbbbbgbbbgbo',
      'oggbbbbbggbbbggo',
      'oyyyyyyyyyyyyyyo',
      'oooooooooooooooo',
      'onnnnnnnnnnnnnno',
      'oooooooooooooooo',
    ],
    tankL: [
      'oooooooooooooooooooooooo',
      'oSSSSSSSSSSSSSSSSSSSSSSo',
      'oBBBBBBBBBBBBBBBBBBBBBBo',
      'obbbbbbbbbbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbbbbbbbbbo',
      'obgbbbbbbbgbbbbbbbgbbgbo',
      'oggbbbgbbggbbbgbbbggbggo',
      'oyyyyyyyyyyyyyyyyyyyyyyo',
      'oooooooooooooooooooooooo',
      'onnnnnnnnnnnnnnnnnnnnnno',
      'on.oo..............oo.no'.replace(/\./g, 'n'),
      'oooooooooooooooooooooooo',
    ],
    guitar: [
      '...ooo...',
      '...oNo...',
      '...oNo...',
      '...oNo...',
      '...oNo...',
      '...oNo...',
      '...oNo...',
      '...oNo...',
      '..ooloo..',
      '.olllllo.',
      'olllllllo',
      'olllklllo',
      'olllklllo',
      '.olllllo.',
      'olllllllo',
      'olllllllo',
      '.olllllo.',
      '..ooooo..',
    ],
    piano: [
      'oooooooooooooooooooooo',
      'oNNNNNNNNNNNNNNNNNNNNo',
      'oNNNNNNNNNNNNNNNNNNNNo',
      'oNNNNNNNNNNNNNNNNNNNNo',
      'oNNNNNNNNNNNNNNNNNNNNo',
      'oooooooooooooooooooooo',
      'oxkxkxxkxkxkxxkxkxxkxo',
      'oxkxkxxkxkxkxxkxkxxkxo',
      'oxxxxxxxxxxxxxxxxxxxxo',
      'oooooooooooooooooooooo',
      'oNNNNNNNNNNNNNNNNNNNNo',
      'oNNNNNNNNNNNNNNNNNNNNo',
      'oooooooooooooooooooooo',
      'oN..................No',
      'oo..................oo',
    ],
    rug: [
      '..oooooooooooooooooooo..',
      '.orrrrrrrrrrrrrrrrrrrro.',
      '.oryyyyyyyyyyyyyyyyyyro.',
      '.orrrrrrrrrrrrrrrrrrrro.',
      '..oooooooooooooooooooo..',
    ],
    cushion: [
      '.oooooooo.',
      'ovvvvvvvvo',
      'ovVvvvvVvo',
      'ovvvvvvvvo',
      '.oooooooo.',
    ],
  };

  // 그림을 코드로 만드는 것들 (창문 · 트리)
  function windowArt(panes, paneW, paneH, rows) {
    const inner = panes * paneW + (panes + 1);
    const w = inner + 2;
    const out = ['o'.repeat(w)];
    const bar = 'o' + 'x'.repeat(inner) + 'o';
    out.push(bar);
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < paneH; i++) {
        let line = 'ox';
        for (let p = 0; p < panes; p++) line += '@'.repeat(paneW) + 'x';
        out.push(line + 'o');
      }
      out.push(bar);
    }
    out.push('o'.repeat(w));
    return out;
  }
  function roundWindow(d) {
    const out = [];
    const c = (d - 1) / 2;
    for (let y = 0; y < d; y++) {
      let line = '';
      for (let x = 0; x < d; x++) {
        const r = Math.hypot(x - c, y - c);
        if (r > c + 0.5) line += '.';
        else if (r > c - 0.6) line += 'o';
        else if (r > c - 1.6) line += 'x';
        else if (Math.abs(x - c) < 0.6 || Math.abs(y - c) < 0.6) line += 'x';
        else line += '@';
      }
      out.push(line);
    }
    return out;
  }
  function treeArt() {
    const w = 17, out = [];
    const mid = 8;
    out.push('.'.repeat(mid) + 'y' + '.'.repeat(mid));
    out.push('.'.repeat(mid - 1) + 'yyy' + '.'.repeat(mid - 1));
    const orn = 'rgbgygpgrgbgygpg';
    let k = 0;
    for (let i = 0; i < 15; i++) {
      const half = 1 + Math.floor(i * 0.55) + (i % 5 === 4 ? -1 : 0);
      let line = '';
      for (let x = 0; x < w; x++) {
        const dx = Math.abs(x - mid);
        if (dx === half) line += 'o';
        else if (dx < half) line += (i + x) % 4 === 0 && dx < half - 0 ? orn[(k++) % orn.length] : (dx % 3 === 0 ? 'G' : 'g');
        else line += '.';
      }
      out.push(line);
    }
    out.push('.'.repeat(mid - 1) + 'oNo' + '.'.repeat(mid - 1));
    out.push('.'.repeat(mid - 1) + 'oNo' + '.'.repeat(mid - 1));
    out.push('.'.repeat(mid - 3) + 'oqqqqqo' + '.'.repeat(mid - 3));
    out.push('.'.repeat(mid - 3) + 'oQQQQQo' + '.'.repeat(mid - 3));
    out.push('.'.repeat(mid - 3) + 'ooooooo' + '.'.repeat(mid - 3));
    return out;
  }
  ART.window = windowArt(2, 5, 4, 2);
  ART.windowBig = windowArt(3, 5, 5, 2);
  ART.windowRound = roundWindow(15);
  ART.tree = treeArt();
  ART.curtainWindow = ART.window.map((row, i, all) => (i === all.length - 1 ? '..' + row + '..' : 'pp' + row + 'pp'));

  // 어항 속 물이 있는 칸 (물고기가 헤엄치는 범위): [x1, y1, x2, y2]
  const TANK_WATER = { tankS: [2, 3, 11, 6], tankM: [1, 2, 14, 8], tankL: [1, 3, 22, 10] };

  // 빛나는 가구 (불 끄면 은은하게 밝혀 줌): [가로 위치 비율, 세로 위치 비율, 반지름(칸)]
  const GLOW = { lamp: [0.5, 0.12, 30], tv: [0.5, 0.5, 18], tree: [0.5, 0.45, 22], tankS: [0.5, 0.45, 10], tankM: [0.5, 0.45, 14], tankL: [0.5, 0.45, 18], computer: [0.5, 0.25, 14] };

  // ---------------------------------------------------------------- 캐시
  const cache = new Map();
  function sky(h = new Date().getHours()) {
    if (h >= 6 && h < 17) return '#9fd3f7';
    if (h >= 17 && h < 20) return '#f6b38a';
    return '#1d2350';
  }
  function bitmap(id) {
    const art = ART[id];
    if (!art) return null;
    const skyColor = sky();
    const key = id + skyColor;
    let c = cache.get(key);
    if (c) return c;
    const w = Math.max(...art.map((r) => r.length)), h = art.length;
    c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < art[y].length; x++) {
        const ch = art[y][x];
        if (ch === '.' || ch === ' ') continue;
        g.fillStyle = ch === '@' ? skyColor : (PAL[ch] || '#f0f');
        g.fillRect(x, y, 1, 1);
      }
    }
    cache.set(key, c);
    return c;
  }

  /** 가구를 바닥 가운데(x, y) 기준으로 그림. scale = 한 칸의 크기(px) */
  function draw(ctx, id, x, y, scale, rot = 0, flip = false) {
    const bm = bitmap(id);
    if (!bm) return null;
    const w = bm.width * scale, h = bm.height * scale;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, y - h / 2);
    if (rot) ctx.rotate((rot * Math.PI) / 180);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(bm, -w / 2, -h / 2, w, h);
    ctx.restore();
    return { w, h };
  }
  const size = (id, scale) => { const bm = bitmap(id); return bm ? { w: bm.width * scale, h: bm.height * scale } : { w: 40, h: 40 }; };

  /** 작은 미리보기 (상점 목록용) */
  function thumb(id, side = 34) {
    const bm = bitmap(id);
    const c = document.createElement('canvas');
    c.width = side; c.height = side;
    if (!bm) return c;
    const g = c.getContext('2d');
    const k = Math.max(1, Math.floor(Math.min(side / bm.width, side / bm.height)));
    g.imageSmoothingEnabled = false;
    g.drawImage(bm, Math.floor((side - bm.width * k) / 2), Math.floor((side - bm.height * k) / 2), bm.width * k, bm.height * k);
    return c;
  }

  // ---------------------------------------------------------------- 벽지 · 바닥 테마
  // 한 층을 그림: 벽 영역(x0..x1, top..wallBottom), 바닥 영역(wallBottom..bottom)
  function stars(ctx, x, y, w, h, seed, n) {
    let s = seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < n; i++) {
      const px = x + Math.floor(rnd() * w), py = y + Math.floor(rnd() * h);
      const big = rnd() > 0.85;
      ctx.fillStyle = big ? '#fff6c8' : 'rgba(255,255,255,0.85)';
      ctx.fillRect(px, py, big ? 3 : 2, big ? 3 : 2);
    }
  }
  function pixelCloud(ctx, x, y, k) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 2 * k, y, 6 * k, 2 * k);
    ctx.fillRect(x, y + 2 * k, 12 * k, 2 * k);
    ctx.fillRect(x + k, y + 4 * k, 9 * k, k);
  }
  function grass(ctx, x, top, w, h, base, dark, seed) {
    ctx.fillStyle = base; ctx.fillRect(x, top, w, h);
    let s = seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    ctx.fillStyle = dark;
    for (let i = 0; i < w * h / 260; i++) {
      const px = x + Math.floor(rnd() * w / 3) * 3, py = top + 4 + Math.floor(rnd() * (h - 6) / 3) * 3;
      ctx.fillRect(px, py, 3, 3);
      ctx.fillRect(px + 3, py - 3, 3, 3);
    }
  }

  const THEMES = {
    // 실내 (단색 벽, 나무 바닥)
    basic:   { name: '크림 방',     kind: 'room', wall: '#f3e6d3', floor: '#c99a6b' },
    sky:     { name: '하늘 방',     kind: 'room', wall: '#cfe6f7', floor: '#b8916b' },
    mint:    { name: '민트 방',     kind: 'room', wall: '#d3efe3', floor: '#a7835e' },
    peach:   { name: '복숭아 방',   kind: 'room', wall: '#fbd9cf', floor: '#c48b6a' },
    lavender:{ name: '라벤더 방',   kind: 'room', wall: '#e2d8f3', floor: '#a88f7a' },
    navy:    { name: '밤 방',       kind: 'room', wall: '#2f3456', floor: '#5b4a5e' },
    // 바깥
    meadowDay:   { name: '초원 (낮)',     kind: 'meadow', night: false },
    meadowNight: { name: '초원 (밤)',     kind: 'meadow', night: true },
    roofNight:   { name: '옥상 (밤하늘)', kind: 'roof', night: true },
    roofDay:     { name: '옥상 (낮)',     kind: 'roof', night: false },
  };

  function drawFloorArea(ctx, themeId, x, top, w, wallBottom, bottom, seed) {
    const t = THEMES[themeId] || THEMES.basic;
    const wallH = wallBottom - top, floorH = bottom - wallBottom;
    if (t.kind === 'room') {
      ctx.fillStyle = t.wall; ctx.fillRect(x, top, w, wallH);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x, wallBottom - 6, w, 6);      // 걸레받이
      ctx.fillStyle = t.floor; ctx.fillRect(x, wallBottom, w, floorH);
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      for (let yy = wallBottom + 24; yy < bottom; yy += 24) ctx.fillRect(x, yy, w, 2);  // 바닥 이음매만 살짝
      return;
    }
    // 하늘
    const night = t.night;
    ctx.fillStyle = night ? '#1b2048' : '#9fd3f7'; ctx.fillRect(x, top, w, wallH);
    ctx.fillStyle = night ? '#252b5c' : '#b9e1fa'; ctx.fillRect(x, top + wallH * 0.55, w, wallH * 0.45);
    if (night) {
      stars(ctx, x, top, w, wallH * 0.85, seed, Math.round(w * wallH / 900));
      ctx.fillStyle = '#fff6c8'; ctx.fillRect(x + w - 90, top + 26, 18, 18);           // 달
      ctx.fillStyle = night ? '#1b2048' : '#9fd3f7'; ctx.fillRect(x + w - 84, top + 22, 14, 14);
    } else {
      ctx.fillStyle = '#ffe680'; ctx.fillRect(x + w - 92, top + 22, 22, 22);           // 해
      pixelCloud(ctx, x + 60, top + 40, 4);
      pixelCloud(ctx, x + 260, top + 70, 3);
    }
    if (t.kind === 'meadow') {
      // 먼 언덕
      ctx.fillStyle = night ? '#24412f' : '#8fd17a';
      for (let i = 0; i < w; i += 6) {
        const hgt = 16 + Math.round(10 * Math.sin((i + seed) / 60));
        ctx.fillRect(x + i, wallBottom - hgt, 6, hgt);
      }
      grass(ctx, x, wallBottom, w, floorH, night ? '#2f5a3a' : '#79c25e', night ? '#244a2e' : '#5fa84a', seed);
    } else {
      // 옥상: 난간 + 타일
      ctx.fillStyle = night ? '#4a4f66' : '#c8c3bb'; ctx.fillRect(x, wallBottom - 20, w, 4);
      for (let i = x + 10; i < x + w; i += 30) ctx.fillRect(i, wallBottom - 20, 4, 20);
      ctx.fillStyle = night ? '#4b4659' : '#cfc6b8'; ctx.fillRect(x, wallBottom, w, floorH);
      ctx.fillStyle = night ? '#3e3a4c' : '#b9af9f';
      for (let yy = wallBottom; yy < bottom; yy += 20) ctx.fillRect(x, yy, w, 2);
      for (let yy = wallBottom, row = 0; yy < bottom; yy += 20, row++) {
        for (let xx = x + (row % 2 ? 0 : 20); xx < x + w; xx += 40) ctx.fillRect(xx, yy, 2, 20);
      }
    }
  }

  return { ART, PAL, GLOW, THEMES, TANK_WATER, draw, size, thumb, bitmap, sky, drawFloorArea };
})();
