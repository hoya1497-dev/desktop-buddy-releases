// 홈에서 키우는 동물 8종 (12x12 도트)
window.PetArt = (() => {
  const ART = {
    hamster: {
      pal: { o: '#5a3a24', b: '#e8a85c', l: '#fbe3c2', p: '#f6a9bf', e: '#1a1a20', n: '#c0505a' },
      rows: [
        '............',
        '..oo....oo..',
        '.opbo..obpo.',
        '.obbbbbbbbo.',
        'obbbbbbbbbbo',
        'obebbbbbbebo',
        'obpbbnnbbpbo',
        'obllllllllbo',
        'obllllllllbo',
        '.obbllllbbo.',
        '..oooooooo..',
        '.oo......oo.',
      ],
    },
    chick: {
      pal: { o: '#8a6a10', b: '#ffd84a', e: '#1a1a20', m: '#f08a20' },
      rows: [
        '....oooo....',
        '...obbbbo...',
        '..obbbbbbo..',
        '..obebbebo..',
        '..obbmmbbo..',
        '.obbbbbbbbo.',
        'obbbbbbbbbbo',
        'obbbbbbbbbbo',
        '.obbbbbbbbo.',
        '..oooooooo..',
        '...m....m...',
        '..mm...mm...',
      ],
    },
    turtle: {
      pal: { o: '#2a4a24', g: '#6cbf55', G: '#3f8a3a', k: '#a8d890', e: '#1a1a20' },
      rows: [
        '............',
        '............',
        '............',
        '...oooooo...',
        '..oGgGgGgo..',
        '.oGgGgGgGgoo',
        '.oGgGgGgGgok',
        '.ooooooooook',
        '.okko...okko',
        '.oo......oo.',
        '............',
        '............',
      ].slice(0, 10),
    },
    hedgehog: {
      pal: { o: '#3a2418', N: '#7a5030', c: '#f0d8b0', e: '#1a1a20', n: '#1a1a20' },
      rows: [
        '............',
        '...o.o.o....',
        '..oNoNoNo...',
        '.oNNNNNNNo..',
        'oNNNNNNNNco.',
        'oNNNNNNNceco',
        'oNNNNNNNcccn',
        '.oNNNNNNcco.',
        '..oooooooo..',
        '..oc....oc..',
      ],
    },
    parrot: {
      pal: { o: '#1e3a1e', r: '#e0463a', g: '#4cb050', b: '#3a7ad8', y: '#f4c430', e: '#1a1a20', m: '#c08040' },
      rows: [
        '....ooo.....',
        '...orrro....',
        '..orrerryo..',
        '..orrrrryyo.',
        '..oggggggo..',
        '.ogggggggo..',
        '.oggbbgggo..',
        '.ogbbbgggo..',
        '..oggggggo..',
        '...oggggo...',
        '...om..mo...',
      ],
    },
    penguin: {
      pal: { o: '#101018', k: '#2a2a36', x: '#ffffff', e: '#1a1a20', m: '#f09a20' },
      rows: [
        '....oooo....',
        '...okkkko...',
        '..okkkkkko..',
        '..okxxxxko..',
        '..okexxeko..',
        '..okxmmxko..',
        '.okkxxxxkko.',
        '.okxxxxxxko.',
        '.okxxxxxxko.',
        '..okxxxxko..',
        '...oooooo...',
        '..mm....mm..',
      ],
    },
    fox: {
      pal: { o: '#5a2a10', m: '#f0883a', x: '#ffffff', e: '#1a1a20', k: '#1a1a20' },
      rows: [
        '.oo......oo.',
        '.omo....omo.',
        '.ommoooommo.',
        'ommmmmmmmmmo',
        'ommemmmmemmo',
        'oxxmmmmmmxxo',
        '.oxxxkkxxxo.',
        '..oxxxxxxo..',
        '.ommmmmmmmo.',
        '.ommmmmmmmo.',
        '..oo....oo..',
      ],
    },
    panda: {
      pal: { o: '#101018', k: '#2a2a32', x: '#ffffff', e: '#ffffff' },
      rows: [
        '.oo......oo.',
        'okko....okko',
        'okkooooookko',
        '.oxxxxxxxxo.',
        'oxkkxxxxkkxo',
        'oxkexxxxekxo',
        'oxxxxkkxxxxo',
        '.oxxxxxxxxo.',
        'okkxxxxxxkko',
        'okkxxxxxxkko',
        '.oxxxxxxxxo.',
        '.okko..okko.',
      ],
    },
  };

  // ---- 🎉 시즌 이벤트 전용 펫 (P12~P23)
  ART.hwBat = {
    pal: { o: '#1c1426', b: '#5a4680', l: '#7d6aa8', d: '#3a2c58', M: '#6a2f62', m: '#a8558e', e: '#1c1426', w: '#ffffff', p: '#f08ab0', f: '#ffffff', y: '#ffd84a' },
    rows: [
      '.....o....o.....',
      '....olo..odo....',
      '....olboobdo....',
      'o...olbbbbdo...o',
      'oo.olbbbbbbdo.oo',
      'omoobwebbweboomo',
      'ommobeebbeebommo',
      'omMobpbddbpboMmo',
      'omMMobfbbfboMMmo',
      'oMmModdddddoMmMo',
      '.oMoMooooooMoMo.',
      '..o.o......o.o..',
    ],
  };
  ART.hwGhost = {
    pal: { o: '#7a74a8', x: '#ffffff', s: '#e2e0f4', S: '#c4c0e4', e: '#2a2440', w: '#ffffff', p: '#f6a9bf', r: '#e0566a', g: '#b8f0ff' },
    rows: [
      '....oooooo....',
      '...oxxxxxxo...',
      '..oxxxxxxxxo..',
      '.oxxxxxxxxxxo.',
      '.oxxwexxewxxo.',
      '.oxxeexxeexxo.',
      'oxxpxxxxxxpxxo',
      'oxsxxxerxxxsxo',
      'oxsxxxxrxxxsxo',
      'oxssxxxxxxssxo',
      'oSssssxxssssSo',
      '.oSsoSssSosSo.',
      '..oo.oooo.oo..',
    ],
  };
  ART.hwBlackCat = {
    pal: { o: '#0e0c14', k: '#2e2a3c', l: '#4a4560', e: '#f4cf4f', E: '#1a1a20', h: '#6a3aa0', H: '#9a62d0', y: '#f4cf4f', p: '#f08ab0', n: '#f08ab0', w: '#ffffff' },
    rows: [
      '......oo......',
      '.....oHho.....',
      '....ohHhho....',
      '...ohhhhhho...',
      '.oooyyyyyyooo.',
      'ohhhhhhhhhhhho',
      '.okoooooooooko',
      '.olkkkkkkkkko.',
      '.okeEkkkkeEko.',
      'oklkkknnkkkko.',
      'okpkkkkkkkpko.',
      '.okkkkkkkkko..',
      '.okkoo.ookkoko',
      '..oo.....ooo..',
    ],
  };
  ART.hwPumpkinSlime = {
    pal: { o: '#6a3010', m: '#f08a2a', l: '#ffb054', d: '#c9601a', D: '#a04a14', g: '#4a8a2a', G: '#7ac24a', s: '#5a3a1a', e: '#3a1808', y: '#ffe066' },
    rows: [
      '.......o.oo...',
      '......osoGGo..',
      '...oooosooo...',
      '..oomdmmdmoo..',
      '.olmmdmmdmmdo.',
      'olmmemmmmemmdo',
      'olmeyemmeyemdo',
      'olmmmmmmmmmmdo',
      'olmemmmmmmemdo',
      'olmmeyeeyemmdo',
      'odmmmeeeemmmdo',
      '.odmmdmmdmmdo.',
      '..oooooooooo..',
    ],
  };
  ART.xmasReindeer = {
    pal: { o: '#3a2210', a: '#c9a070', A: '#8a6a40', n: '#a8683a', l: '#c8885a', d: '#7a4a28', c: '#f4e0c0', e: '#1a1a20', w: '#ffffff', r: '#ff3a3a', R: '#ffb0a0', g: '#2e8a4a', y: '#f4cf4f' },
    rows: [
      'o.o..o..o..o.o',
      '.oAoaooooaoAo.',
      '..oaao..oaao..',
      '...oao..oao...',
      '..oolnnnndoo..',
      '.odlnnnnnnddo.',
      '.odnwennewndo.',
      '.odneenneendo.',
      '..onccrrccno..',
      '..odccRrccdo..',
      '...oggggggo...',
      '..onnoyyonno..',
      '..oo..oo..oo..',
    ],
  };
  ART.xmasSnowOwl = {
    pal: { o: '#6a7890', x: '#ffffff', s: '#dfe8f2', S: '#b8c6d8', e: '#1a1a20', y: '#f4cf4f', m: '#f09a20', r: '#e0463a', R: '#a82a2a', k: '#8a96aa' },
    rows: [
      '.oo........oo.',
      '.oxo......oxo.',
      '.oxxooooooxxo.',
      'oxxxxxxxxxxxxo',
      'oxsssxxxxsssxo',
      'oswesxxxxsweso',
      'oseesxmmxseeso',
      'oxsssxmmxsssxo',
      'orrrrrrrrrrrro',
      'osRrrrrrrRrRso',
      'osskssxxssrRso',
      'oSssksssskRsSo',
      '.ooomoooomooo.',
    ],
  };
  ART.xmasElfMouse = {
    pal: { o: '#3a3440', g: '#bcb8c8', l: '#dcd8e6', d: '#8e8a9e', p: '#f6a9bf', e: '#1a1a20', w: '#ffffff', h: '#2e9a4a', H: '#5ac46a', r: '#e0463a', y: '#f4cf4f', x: '#ffffff' },
    rows: [
      '..........oy..',
      '.........oyyo.',
      '........ohho..',
      '....oooohHo...',
      '...ohHhhhho...',
      '..oxxxxxxxxo..',
      '.ooxrxxxrxxoo.',
      'opgoooooooogpo',
      'oppgllllllgppo',
      '.oogwegwegoo..',
      '..ogeegeegdo..',
      '..ogpgrrgpgo..',
      '...odggggdo...',
      '...oo....oo...',
    ],
  };
  ART.xmasGingerbread = {
    pal: { o: '#5a3010', n: '#c87a3a', l: '#e09a5a', d: '#9a5a24', x: '#ffffff', e: '#2a1408', r: '#e0463a', g: '#2e9a4a', p: '#f08ab0' },
    rows: [
      '....ooooo....',
      '...olnnnno...',
      '..olnnnnnno..',
      '..olennneno..',
      '..opnnnnnpo..',
      '..onxnnnxno..',
      '...onxxxno...',
      'oooonrgrnoooo',
      'oxlnnnxnnndxo',
      'oooonnxnnoooo',
      '...onnnnno...',
      '..onnnonnno..',
      '..oxno.onxo..',
      '..ooo...ooo..',
    ],
  };
  ART.nyGoldMouse = {
    pal: { o: '#7a5210', g: '#f4cf4f', l: '#fff0a0', d: '#c9962c', p: '#f6a9bf', e: '#1a1a20', w: '#ffffff', r: '#d8302a', y: '#ffe066', c: '#e0b030', C: '#9c6f1e' },
    rows: [
      '.oo........oo.',
      'oppo..rr..oppo',
      'oppgoorroogppo',
      'ogglggggggdggo',
      '.oggggggggggo.',
      '.oggweggweggo.',
      '.ogpeeggeepgo.',
      '..ogggnngggo..',
      '..oggCCCCggo..',
      '..olCyccyCdo.p',
      '..olCcCCcCdop.',
      '..odCccccCdo..',
      '..oddCCCCddo..',
      '...oo....oo...',
    ],
  };
  ART.nyLuckyRabbit = {
    pal: { o: '#7a5a7a', x: '#ffffff', s: '#ece6f0', p: '#f6a9bf', e: '#1a1a20', w: '#ffffff', r: '#e0463a', R: '#a82a3a', y: '#f4cf4f', b: '#4a7ad8', B: '#7aa8f0', n: '#f08a9a' },
    rows: [
      '..oo......oo..',
      '.oxpo....opxo.',
      '.oxpo....opxo.',
      '.oxpo....opxo.',
      '..oxpoooopxo..',
      '..oxxxxxxxxo..',
      '.oxxxxxxxxxxo.',
      '.oxwexxxxwexo.',
      '.oxeexxxxeexo.',
      '.onxxxppxxxno.',
      '..orrryyrrro..',
      '.obBrryyrrBbo.',
      '..oooRooRooo..',
    ],
  };
  ART.nyDragonling = {
    pal: { o: '#6a1010', r: '#e0463a', l: '#ff7a5a', d: '#a82a2a', y: '#f4cf4f', Y: '#fff0a0', e: '#1a1a20', w: '#ffffff', c: '#ffd8a0', g: '#2e9a6a' },
    rows: [
      '.y..........y.',
      '.oyo......oyo.',
      '..oyoyoooyyo..',
      '..orrrrrrrro..',
      '.orllrrrrddro.',
      'orrwerrrrewrro',
      'orreerrrreerro',
      'yorrrccccrrroy',
      '.yorccccccroy.',
      '.odrcYccYcrdo.',
      '.odrrccccrrdo.',
      '..odrroorrdo..',
      '..oo.oooo.oo..',
    ],
  };
  ART.nyCrane = {
    pal: { o: '#2a2a36', x: '#ffffff', s: '#e4e8ee', S: '#b8c0cc', k: '#1a1a20', r: '#e0463a', e: '#1a1a20', m: '#c8a050', l: '#5a5a66' },
    rows: [
      '....oo........',
      '...orro.......',
      '..oxxxxo......',
      'mmoxexxo......',
      '..okxxxo......',
      '...okxo.......',
      '....oxo.......',
      '....oxxoooo...',
      '...oxxxxssSko.',
      '...oxxxssSSkko',
      '....oxsSSkkko.',
      '.....ooooooo..',
      '......l..l....',
      '.....ll..ll...',
    ],
  };

  // ---- 운영자 전용 펫 (P09~P11)
  ART.unicorn = {
    pal: { o: '#6a5a78', b: '#ffffff', l: '#ece6f4', y: '#f4cf4f', p: '#f6a9bf', v: '#b79be8', c: '#7fd6e8', e: '#1a1a20' },
    rows: [
      '.........y..',
      '........yy..',
      '.pv....obbo.',
      'pvcv..obbbbo',
      '.pvc.obbebbo',
      '..pvobbbbbbo',
      '..pobbbbllo.',
      '.obbbbbbbo..',
      'obbbbbbbbo..',
      'obllllllbo..',
      '.olo..olo...',
      '.oo...oo....',
    ],
  };
  ART.dragon = {
    pal: { o: '#2a4a24', g: '#6cbf55', G: '#3f8a3a', y: '#f4e08a', v: '#b79be8', V: '#7d62b8', r: '#e0564f', e: '#1a1a20', x: '#ffffff' },
    rows: [
      '..x......x..',
      '.oGo....oGo.',
      '.oggoooogggo'.slice(0, 12),
      '.oggggggggo.',
      'Vogxegggexgo'.slice(0, 12),
      'VVogggrrgggo'.slice(0, 12),
      'VVVogggggo..',
      'VVoggyyyggo.',
      '.ogggyyyggo.',
      '.ogggyyygggo',
      '..oggoogggo.',
      '..oo....oo..',
    ],
  };
  ART.phoenix = {
    pal: { o: '#7a2a1a', r: '#e0463a', m: '#f08a3a', y: '#f4cf4f', Y: '#fff1a0', e: '#1a1a20' },
    rows: [
      '...y.y......',
      '..yoyoy.....',
      '...orro.....',
      '..orermo....',
      '.yorrrmo....',
      '..ormmmmo...',
      '.ormyYymmo..',
      'ormmyYYmmmo.',
      '.ormmyymmmmo',
      '..ormmmmmyYo',
      '...oooroyYy.',
      '....y.y..y..',
    ],
  };

  const cache = new Map();
  function bitmap(kind) {
    if (cache.has(kind)) return cache.get(kind);
    const a = ART[kind];
    if (!a) return null;
    const w = Math.max(...a.rows.map((r) => r.length)), h = a.rows.length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    a.rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && a.pal[ch]) { g.fillStyle = a.pal[ch]; g.fillRect(x, y, 1, 1); } }));
    cache.set(kind, c);
    return c;
  }
  /** 발 위치(cx, bottom) 기준으로 그림. flip: 왼쪽 보기 */
  function draw(ctx, kind, cx, bottom, scale, flip = false, hop = 0) {
    const bm = bitmap(kind);
    if (!bm) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(cx), Math.round(bottom - hop));
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(bm, -bm.width * scale / 2, -bm.height * scale, bm.width * scale, bm.height * scale);
    ctx.restore();
  }
  function thumb(kind, side = 36) {
    const c = document.createElement('canvas');
    c.width = side; c.height = side;
    const bm = bitmap(kind);
    if (!bm) return c;
    const g = c.getContext('2d');
    const k = Math.floor(side / Math.max(bm.width, bm.height));
    g.imageSmoothingEnabled = false;
    g.drawImage(bm, (side - bm.width * k) / 2, side - bm.height * k, bm.width * k, bm.height * k);
    return c;
  }
  return { bitmap, draw, thumb, kinds: Object.keys(ART) };
})();
