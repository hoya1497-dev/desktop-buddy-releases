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
    pal: { o: '#1a1a20', k: '#2a2238', e: '#ffffff', n: '#e0463a' },
    rows: [
      '.oo......oo.',
      'ookoo..ookoo',
      '.ookoookoo..',
      '..okkkkko...',
      '.okkkkkkko..',
      'okkekkkekko.'.slice(0, 12),
      'okkkknkkkko.'.slice(0, 12),
      '.okkkkkkko..',
      '..oo....oo..',
    ],
  };
  ART.hwGhost = {
    pal: { o: '#c9c6e8', x: '#ffffff', e: '#1a1a20' },
    rows: [
      '....oooo....',
      '..oxxxxxxo..',
      '.oxxxxxxxxo.',
      '.oxxexxexxo.',
      '.oxxxxxxxxo.',
      '.oxxxxxxxxo.',
      '.oxxxxxxxxo.',
      '.oxxxxxxxxo.',
      '.oxoxoxoxxo.',
      '.ox..o..oxo.',
    ],
  };
  ART.hwBlackCat = {
    pal: { o: '#1a1a20', k: '#2e2a38', e: '#f4cf4f', n: '#e0463a' },
    rows: [
      '.oo......oo.',
      '.okoo....ooko'.slice(0, 12),
      '.okkoooookko.'.slice(0, 12),
      '.okkkkkkkkko.',
      'okkkkkkkkkkko'.slice(0, 12),
      'okkekkkkekko.'.slice(0, 12),
      'okkknnkkkko..'.slice(0, 12),
      '.okkkkkkkkko.',
      '..oo....oo..',
    ],
  };
  ART.hwPumpkinSlime = {
    pal: { o: '#6a3a10', m: '#f0883a', q: '#c9962c', e: '#1a1a20' },
    rows: [
      '....oo..oo....',
      '...omqoqqmo...'.slice(0, 12),
      '..ommmqqmmmo..'.slice(0, 12),
      '.ommmmqqmmmmo.'.slice(0, 12),
      'ommmmemmemmmo.'.slice(0, 12),
      'ommmmmmmmmmmo.'.slice(0, 12),
      '.ommmmmmmmmo..'.slice(0, 12),
      '..oommmmoo....'.slice(0, 12),
    ],
  };
  ART.xmasReindeer = {
    pal: { o: '#4a2e18', n: '#7a4a28', c: '#f0d8b0', e: '#1a1a20', r: '#e0463a' },
    rows: [
      'o.o......o.o',
      '.o.o....o.o.',
      '..onnnnnno..',
      '.onnnnnnnno.',
      '.oncncccnco.',
      'onccceccccno',
      'oncccccrccno',
      '.onccccccno.',
      '..oooooooo..',
      '.oo......oo.',
    ],
  };
  ART.xmasSnowOwl = {
    pal: { o: '#9aa8b8', x: '#ffffff', e: '#1a1a20', m: '#f09a20' },
    rows: [
      '....oooo....',
      '...oxxxxo...',
      '..oxxxxxxo..',
      '..oxexxexo..',
      '..oxxmmxxo..',
      '.oxxxxxxxxo.',
      '.oxxoxxoxxo.',
      '.oxxxxxxxxo.',
      '..oxxxxxxo..',
      '...o....o...',
    ],
  };
  ART.xmasElfMouse = {
    pal: { o: '#8a1a1a', g: '#e8e4d8', e: '#1a1a20', p: '#f6a9bf' },
    rows: [
      '.oo......oo.',
      'oggo....oggo',
      '.oggoooggo..',
      '.oggggggggo.',
      'ogggegggego.'.slice(0, 12),
      'oggpgggpggo.'.slice(0, 12),
      '.oggggggggo.',
      '..oo....oo..',
    ],
  };
  ART.xmasGingerbread = {
    pal: { o: '#7a4a1e', n: '#c9962c', x: '#ffffff', e: '#1a1a20', r: '#e0463a' },
    rows: [
      '..onno..onno.',
      '.onnnoonnnno.'.slice(0, 12),
      '..onnnnnnno..',
      '...onnnnno...',
      '..onnoonnno..',
      '.onnnnnnnnno.',
      'onnnexnexnno.'.slice(0, 12),
      '.onnnrnrnno..'.slice(0, 12),
      '..onnnnnnno..',
      '.onno....onno',
    ],
  };
  ART.nyGoldMouse = {
    pal: { o: '#9c6f1e', g: '#f4cf4f', e: '#1a1a20', p: '#f6a9bf' },
    rows: [
      '.oo......oo.',
      'oggo....oggo',
      '.oggoooggo..',
      '.oggggggggo.',
      'ogggegggego.'.slice(0, 12),
      'oggpgggpggo.'.slice(0, 12),
      '.oggggggggo.',
      '..oo....oo..',
    ],
  };
  ART.nyLuckyRabbit = {
    pal: { o: '#b04ae0', x: '#ffffff', e: '#1a1a20', p: '#f6a9bf' },
    rows: [
      '.ox......xo.',
      '.oxo....oxo.',
      '..oxo..oxo..',
      '..oxxxxxxo..',
      '.oxxxxxxxxo.',
      '.oxxexxexxo.',
      '.oxxxppxxxo.',
      '.oxxxxxxxxo.',
      '..oxxxxxxo..',
      '...o....o...',
    ],
  };
  ART.nyDragonling = {
    pal: { o: '#9c1e1e', r: '#e0463a', y: '#f4cf4f', e: '#1a1a20', x: '#ffffff' },
    rows: [
      '..x......x..',
      '.oro....oro.',
      '.orroooorro.',
      'orrrrrrrrrro',
      'orrerrrrerro',
      '.orryyyyrro.',
      '.orrryyrrro.',
      '.orrrrrrrro.',
      '..oo....oo..',
    ],
  };
  ART.nyCrane = {
    pal: { o: '#1a1a20', x: '#ffffff', e: '#1a1a20', m: '#e0463a' },
    rows: [
      '.......ox...',
      '......oxo...',
      '.....oxxo...',
      '..oooxxxo...',
      '.oxxxxxxo...',
      'oxxexxxxo...',
      'omxxxxxxxo..',
      '.oxxxxxxxxo.',
      '..o.....o...',
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
