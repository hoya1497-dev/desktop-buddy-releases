// 도트 가구 + 벽지/바닥 테마. 그림은 글자 격자로 그려 두고, 한 칸 = 1픽셀로 캐시한 뒤 확대해서 또렷하게 그림.
window.Furniture = (() => {
  // 공용 색
  const PAL = {
    o: '#3b2a25', k: '#26222b', w: '#a8703f', W: '#7a4b28', l: '#d39b5b', n: '#8b5a3c', N: '#5c3a26',
    g: '#6cbf55', G: '#3f8a3a', r: '#e0564f', R: '#a3383a', b: '#6aa2e8', B: '#3d67a8', y: '#f4cf4f',
    Y: '#c9962c', s: '#9aa0a6', S: '#d7dbe0', x: '#ffffff', p: '#f6a9bf', P: '#d9708f', c: '#f3e3c3',
    t: '#7fd6e8', T: '#3aa0b8', m: '#f0a050', q: '#cf6f45', Q: '#9c4b2b', v: '#b79be8', V: '#7d62b8',
    a: '#e8e2da', A: '#bdb5aa', C: '#d9c49c',
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
  // 창문 (0.13.6 다듬음): 흰 나무 틀 + 아래·오른쪽 그늘, 유리에 비스듬한 반사, 아래 창턱
  // '@' 는 시간에 따라 바뀌는 하늘색, h 는 유리 반사, S/s 는 틀 그늘
  function windowArt(panes, paneW, paneH, rows) {
    const inner = panes * paneW + (panes + 1);
    const w = inner + 2;
    const out = ['.' + 'o'.repeat(w) + '.'];
    const bar = (shade) => '.o' + (shade ? 'x' + 'S'.repeat(inner - 1) : 'x'.repeat(inner)) + 'o.';
    out.push(bar(false));
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < paneH; i++) {
        let line = '.ox';
        for (let p = 0; p < panes; p++) {
          let pane = '';
          for (let k = 0; k < paneW; k++) {
            const glare = k + i === 1 || (k + i === 3 && k > 0);   // 왼쪽 위 두 줄 반사
            pane += glare ? 'h' : '@';
          }
          line += pane + (p === panes - 1 ? 'S' : 'x');
        }
        out.push(line + 'o.');
      }
      out.push(r === rows - 1 ? bar(true) : bar(false));
    }
    // 창턱: 양쪽으로 한 칸씩 튀어나옴
    out.push('o'.repeat(w + 2));
    out.push('o' + 'x'.repeat(w) + 'o');
    out.push('o' + 's'.repeat(w) + 'o');
    out.push('o'.repeat(w + 2));
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
        else if (r > c - 1.6) line += x + y > 2 * c + 1 ? 'S' : 'x';
        else if (r > c - 2.4 && x + y > 2 * c + 2) line += 'S';
        else if (Math.abs(x - c) < 0.6 || Math.abs(y - c) < 0.6) line += 'x';
        else if (x < c && y < c && (x + y === Math.round(c) - 1 || x + y === Math.round(c) + 1)) line += 'h';
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
  ART.curtainWindow = (() => {
    // 위는 넓게 드리우고 끈으로 묶은 뒤 아래로 살짝 퍼지는 커튼
    const win = ART.window, n = win.length, w = win[0].length;
    const tie = Math.floor(n * 0.6), sill = n - 4;
    const rows = ['o' + 'Y'.repeat(w + 2) + 'o'];
    for (let i = 0; i < n; i++) {
      let mid = win[i].slice(1, -1);
      if (i >= sill) { rows.push('...' + mid + '...'); continue; }
      // 유리 위로 겹치는 폭: 꼭대기 3칸 → 끈 0칸 → 아래 1칸
      const ov = i < tie ? Math.round(3 * (1 - i / tie)) : (i === tie ? 0 : 1);
      const f = (k) => ((k + (i < tie ? 0 : 1)) % 2 ? 'P' : 'p');
      const drapeL = Array.from({ length: ov }, (_, k) => f(k + 1)).join('');
      const drapeR = Array.from({ length: ov }, (_, k) => f(ov - k)).join('');
      if (ov) mid = drapeL + 'o' + mid.slice(ov + 1, mid.length - ov - 1) + 'o' + drapeR;
      const l = i === tie ? 'oRR' : 'o' + f(0) + 'p';
      const r = i === tie ? 'RRo' : 'p' + f(0) + 'o';
      rows.push(l + mid + r);
    }
    return rows;
  })();

  const GLOW_EXTRA = {};
  // ---------------------------------------------------------------- 새 가구 (0.8)
  // 침대 3종: 하늘색 · 공주(캐노피) · 이층
  ART.bedBlue = ART.bed.map((r) => r.replace(/p/g, 'b').replace(/P/g, 'B').replace(/w/g, 'S'));
  ART.bedCanopy = [
    'oooooooooooooooooooooooo',
    'oPpPpPpPpPpPpPpPpPpPpPpo',
    'oppppoo..........oopppo.',
    'opppo..............oppo.',
    'oppo................owo.',
    'owwo................owo.',
    ...ART.bed.slice(2).map((r) => r.replace(/x/g, 'a')),
  ];
  ART.bedBunk = [
    'oo....................oo',
    'oNo..................oNo',
    'oNoooooooooooooooooooooNo'.slice(0, 24),
    'oNxxxxxobbbbbbbbbbbbbbNo',
    'oNoooooobBbBbBbBbBbBbBNo',
    'oNwwwwwwwwwwwwwwwwwwwwNo',
    'oNo..............oNNNoNo',
    'oNo..............oN.NoNo',
    'oNo..............oNNNoNo',
    'oNo..............oN.NoNo',
    'oNoooooooooooooooooooooNo'.slice(0, 24),
    'oNxxxxxorrrrrrrrrrrrrrNo',
    'oNoooooorRrRrRrRrRrRrRNo',
    'oNwwwwwwwwwwwwwwwwwwwwNo',
    'oo....................oo',
  ];
  ART.desk = [
    '..ooo..........oooo.....',
    '..oro..........obbo.oyo.',
    '..oro..........obbo.oyo.',
    'oooooooooooooooooooooooo',
    'olllllllllllllllllllllllo'.slice(0, 24),
    'oooooooooooooooooooooooo',
    'owwwwwwo..........owwwwo',
    'owoyyowo..........owwwwo',
    'owwwwwwo..........owwwwo',
    'owoyyowo..........owwwwo',
    'owwwwwwo..........owwwwo',
    'oooooooo..........oooooo',
  ];
  ART.wardrobe = [
    'oooooooooooooooo',
    'oWWWWWWWWWWWWWWo',
    'owwwwwwoowwwwwwo',
    'owlllllooolllllwo'.slice(0, 16),
    'owlllllooolllllo',
    'owllllyooyllllwo',
    'owlllllooolllllo',
    'owlllllooolllllo',
    'owlllllooolllllo',
    'owlllllooolllllo',
    'owlllllooolllllo',
    'owwwwwwoowwwwwwo',
    'owwwwwwwwwwwwwwo',
    'oyywwwwwwwwwwyyo',
    'oooooooooooooooo',
    '.oo..........oo.',
  ];
  ART.fridge = [
    'oooooooooooo',
    'oSSSSSSSSSSo',
    'oxxxxxxxxxso',
    'oxxxxxxxxxso',
    'oxxxxxxxxksko'.slice(0, 12),
    'oxxxxxxxxxso',
    'oooooooooooo',
    'oxxxxxxxxxso',
    'oxxxxxxxxkso',
    'oxxxxxxxxkso',
    'oxxxxxxxxxso',
    'oxxxxxxxxxso',
    'oxxxxxxxxxso',
    'oxxxxxxxxxso',
    'oSSSSSSSSSSo',
    'oooooooooooo',
  ];
  ART.arcade = [
    '.oooooooooooo.',
    '.oVVVVVVVVVVo.',
    '.ovyrvbvgvyvo.',
    'ooooooooooooooo'.slice(0, 14),
    'okkkkkkkkkkkko',
    'okttttttttttko',
    'oktxtttttgttko',
    'okttttgttttTko',
    'oktttttttrttko',
    'okkkkkkkkkkkko',
    'ooooooooooooooo'.slice(0, 14),
    'oVVVVVVVVVVVVo',
    'oVkVVrVVbVVVVo',
    'oVVVVVVVVVVVVo',
    'ovvvvvvvvvvvvo',
    'ovvvvvvvvvvvvo',
    'ovvvvvvvvvvvvo',
    'oooooooooooooo',
  ];
  ART.beanbag = [
    '.....oooooo.....',
    '...oommmmmmoo...',
    '..ommmmmmmmmmo..',
    '.ommmmmmmmmmmmo.',
    '.ommqqqqqqqqmmo.',
    'ommqqqqqqqqqqmmo',
    'ommmqqqqqqqqmmmo',
    'oqmmmmmmmmmmmmqo',
    'oqqqmmmmmmmmqqqo',
    '.oqqqqqqqqqqqqo.',
    '..oooooooooooo..',
  ];
  ART.globe = [
    '....oooo....',
    '..oobbggoo..',
    '.obbggggbbo.',
    'obbbbgggbbbo',
    'obggbbbbbbbo',
    'obgggbbbggbo',
    'obbggbbbgggo',
    '.obbbbbbbgo.',
    '..oobbbboo..',
    '....oYYo....',
    '.....oYo....',
    '...oooooo...',
    '...oYYYYo...',
    '...oooooo...',
  ];
  ART.record = { pal: {
    o: '#2e1c12', l: '#a8703f', L: '#cf9558', c: '#3b2a25', b: '#7f4f2b',
    k: '#15131a', s: '#4a4f58', S: '#8a909c', r: '#7a1f28', R: '#b23a44',
    m: '#c8ccd2', M: '#eef0f4',
    1: '#7d62b8', 2: '#3d67a8', 3: '#a3383a', 4: '#d9708f', 5: '#c9962c',
  }, rows: [
    'ooooooooooooooooooo',
    'olllllllllllllllllo',
    'occcccSSssccccbmbbo',
    'occcSkkkkkkscmmmbbo',
    'occSkkkkkkkkmcblbbo',
    'ocSkkkRRrrMmksblbbo',
    'ocskkkrrMrkkksblbbo',
    'occskkkkkkkkscblbbo',
    'occcskkkkkksccblbbo',
    'occcccssssccccblbbo',
    'ooooooooooooooooooo',
    'oLLLLLLLLLLLLLLLLLo',
    'o1112223334445555Lo',
    'o1112223334445555Lo',
    'o1112223334445555Lo',
    'oLLLLLLLLLLLLLLLLLo',
    'ooooooooooooooooooo',
    '.ol..............lo',
    '.oo..............oo',
  ] };
  // 와인바 가구: 벽 와인랙 · 바 카운터 · 바 스툴 (가구 전용 팔레트로 그라데이션을 더 풍부하게)
  ART.wineRack = { pal: { o: '#2e1c12', b: '#5a3720', c: '#7f4f2b', l: '#a8703f', L: '#cf9558', W: '#ecc28a', r: '#7a1f28', R: '#b23a44', e: '#e2616b', E: '#f6b0b6', g: '#2b5e2f', G: '#4f9a4f', f: '#86d17e', F: '#d6f2c9', y: '#9c6a12', Y: '#d9a530', u: '#f6d34f', U: '#fdeeb0', s: '#5c6672', S: '#9aa6b2', t: '#d7dee6', T: '#ffffff' }, rows: [
    'oooooooooooooooooooooo',
    'occcccccccccccccccccco',
    'ollllllllllllllllllllo',
    '.oooooooooooooooooooo.',
    '.oRo.oGo.oRo.oYo.oGo..',
    'oReroGfgoReroYuyoGfgo.',
    'oreRogfGoreRoyuYogfGo.',
    'oeeRoffGoeeRouuYoffGo.',
    'oreRogfGoreRoyuYogfGoo',
    'oooooooooooooooooooooo',
    'ollllllllllllllllllllo',
    'oLLLLLLLLLLLLLLLLLLLLo',
    '.ofGGgoeRRrouYYyoeRRro',
    'ooggggorrrroyyyyorrrro',
    'oooooooooooooooooooooo',
    'occcccccccccccccccccco',
  ] };
  ART.wineCounter = { pal: { o: '#2e1c12', b: '#5a3720', c: '#7f4f2b', l: '#a8703f', L: '#cf9558', W: '#ecc28a', r: '#7a1f28', R: '#b23a44', e: '#e2616b', E: '#f6b0b6', g: '#2b5e2f', G: '#4f9a4f', f: '#86d17e', F: '#d6f2c9', y: '#9c6a12', Y: '#d9a530', u: '#f6d34f', U: '#fdeeb0', s: '#5c6672', S: '#9aa6b2', t: '#d7dee6', T: '#ffffff' }, rows: [
    '.ooooooooooooooooooooooo.',
    '.occccccccccccccccccccco.',
    '..ooSoooooSoooooSooooSo..',
    '...oSo...oSo...oSo..oSo..',
    '...oSo...oSo...oSo..oSo..',
    '..otTso.otTso.otTsootTso.',
    '.oStTSsoStTSsoStTSsStTSso',
    '.osssssosssssosssssssssso',
    'ooooooooooooooooooooooooo',
    '.ooooooooooooooooooooooo.',
    '..oRoooGoooYooRooGooYoo..',
    '.oReroGfgoYuyRerGfgYuyo..',
    '.oreRogfGoyuYreRgfGyuYoo.',
    'ooooooooooooooooooooooooo',
    'ooooooooooooooooooooooooo',
    'oWWWWWWWWWWWWWWWWWWWWWWWo',
    'oLLLLLLLLLLLLLLLLLLLLLLLo',
    'ooooooooooooooooooooooooo',
    'occccccccccccccccccccccco',
    'ouuuuuuuuuuuuuuuuuuuuuuuo',
    'ooooooooooooooooooooooooo',
  ] };
  ART.barStool = { pal: { o: '#2e1c12', b: '#5a3720', c: '#7f4f2b', l: '#a8703f', L: '#cf9558', W: '#ecc28a', r: '#7a1f28', R: '#b23a44', e: '#e2616b', E: '#f6b0b6', y: '#9c6a12', Y: '#d9a530', u: '#f6d34f' }, rows: [
    '.ooRRRRRRoo.',
    'oReERRRRRRRo',
    'orrrrrrrrrro',
    '.ooolccbooo.',
    '...olccbo...',
    '...olccbo...',
    '...olccbo...',
    '...olccbo...',
    '...olccbo...',
    '..oolccboo..',
    '.oYuYYYYYYo.',
    '..oolccboo..',
    '...olccbo...',
    '..oolccboo..',
    '.oLLLLLLLLo.',
    'oWlWWWWWWWWo',
    '.oooooooooo.',
  ] };
  ART.speaker = [
    'oooooooooo',
    'okkkkkkkko',
    'okkssssskko'.slice(0, 10),
    'oksskkssko',
    'oksskkssko',
    'okkssssskko'.slice(0, 10),
    'okkkkkkkko',
    'okkkSSkkko',
    'okkSkkSkko',
    'okSkkkkSko',
    'okSkkkkSko',
    'okkSkkSkko',
    'okkkSSkkko',
    'okkkkkkkko',
    'oooooooooo',
  ];
  ART.mirror = [
    '..oooooooo..',
    '.oyyyyyyyyo.',
    'oyttttttttyo',
    'oytxtttttTyo',
    'oyttxttttTyo',
    'oytttttttTyo',
    'oyttttttTTyo',
    'oytttttTTtyo',
    'oyttttttttyo',
    'oyttttttttyo',
    'oyttttttttyo',
    '.oyyyyyyyyo.',
    '..oooooooo..',
    '....oYYo....',
    '..oooooooo..',
  ];
  ART.cattower = [
    '..ooooooooo.....',
    '..ovvvvvvvo.....',
    '..oVVVVVVVo.....',
    '....ocAco.......',
    '....oAcAo.......',
    '....ocAco.oooooo',
    '....oAcAo.ovvvvo',
    '....ocAco.oVVVVo',
    '....oAcAo...oco.',
    '....ocAco...oAo.',
    '....oAcAo...oco.',
    '....ocAco...oAo.',
    'oooooooooooooooo',
    'ovvvvvvvvvvvvvvo',
    'oVVVVVVVVVVVVVVo',
    'oooooooooooooooo',
  ];
  // 벽에 거는 것
  ART.poster = [
    'oooooooooooo',
    'oxxxxxxxxxxo',
    'oxbbbbbbbbxo',
    'oxbbbyybbbxo',
    'oxbbyyyybbxo',
    'oxbbbyybbbxo',
    'oxggggggggxo',
    'oxgGgggGggxo',
    'oxxxxxxxxxxo',
    'oxkkkxkkkkxo',
    'oxxxxxxxxxxo',
    'oooooooooooo',
  ];
  ART.shelf = [
    '..ooo.ooo....ooo....',
    '..oro.obo...oggo....'.slice(0, 20),
    '..oro.obo..ogGgo....'.slice(0, 20),
    '..oro.obo..oqqqo....'.slice(0, 20),
    'oooooooooooooooooooo',
    'owwwwwwwwwwwwwwwwwwo',
    'oooooooooooooooooooo',
    '.oWo............oWo.',
    '.oo..............oo.',
  ];
  ART.neon = [
    '.ppp....ppp.',
    'pPPPp..pPPPp',
    'pPxPPppPPPPp',
    'pPPPPPPPPPPp',
    'pPPPPPPPPPPp',
    '.pPPPPPPPPp.',
    '..pPPPPPPp..',
    '...pPPPPp...',
    '....pPPp....',
    '.....pp.....',
  ];
  // ---------------------------------------------------------------- 🎉 시즌 이벤트 소품 30종 (할로윈 10 · 크리스마스 10 · 새해 10)
  Object.assign(PAL, {'d': '#5a3a7a', 'D': '#2e2046', 'e': '#ffe9a8', 'E': '#f28a1e', 'f': '#b8f0c0', 'F': '#4fae63', 'h': '#f7fbff', 'H': '#bcdcf0', 'i': '#2f7a44', 'I': '#1d4f2c', 'j': '#7c1d2a', 'J': '#ffc4c4', 'u': '#e04ab0', 'U': '#ff9ad8', 'z': '#454552', 'Z': '#6f6f7e', 'K': '#9a9aa8', 'L': '#efe0bb', 'M': '#383744', 'C': '#ffd23f', 'X': '#a8740f'});
  Object.assign(ART, {
    hwPumpkinLamp: [
      '.......ooo......',
      '.......oIo......',
      '...ooooiIoooo...',
      '..oEEqoEEoqEEo..',
      '.oEEEqEEEEqEEEo.',
      '.oEeeqEEEEqeeEo.',
      'oEEeeEqEEqEeeEEo',
      'oEEEEEqeeqEEEEEo',
      'oEEqEEEEEEEEqEEo',
      'oEEeEeeEEeeEeEEo',
      'oEEeeeeeeeeeeEEo',
      '.oEEqeeEEeeqEEo.',
      '..oqqqqqqqqqqo..',
      '...oooooooooo...',
    ],
    hwCauldron: [
      '.....f....F.....',
      '...F..fF.f..f...',
      '......F...f.....',
      '.oooooooooooooo.',
      'oZKKKKKKKKKKKKZo',
      '.ozfFffFfFffFzo.',
      'ozZzzzzzzzzzzzzo',
      'ozZzzzzzzzzzzzzo',
      'ozZzzFzzzzFzzzzo',
      '.ozZzzzzzzzzzzo.',
      '..ozzzzzzzzzzo..',
      '..ozo.eEe..ozo..',
      '..ozoEEyEE.ozo..',
      '..ooo.qQq..ooo..',
    ],
    hwTombstone: [
      '...oooooo...',
      '..oKKKKKKo..',
      '.oKKKKKKKKo.',
      'oKKKKzKKKKZo',
      'oKKKzzzKKKZo',
      'oKKKKzKKKKZo',
      'oKKKKzKKKKZo',
      'oKKKKKKKKKZo',
      'oKzzKzzKzzZo',
      'oKKKKKKKKKZo',
      'oFKKKKKKKFZo',
      'oFFKKKKKFFZo',
      'gFgFFgFFgFFg',
      'oooooooooooo',
    ],
    hwGhostDoll: [
      '....oooo....',
      '...ohhhho...',
      '..ohhhhhho..',
      '.ohhhhhhhho.',
      '.ohkkhhkkho.',
      '.ohkkhhkkho.',
      'ohhJhhhhJhho',
      'ohhhhkkhhhho',
      'ohhhhkkhhhho',
      'ohHhhhhhhHho',
      'ohHHhhhhHHho',
      'oHo.oHHo.oHo',
      '.o...oo...o.',
    ],
    hwCandyBowl: [
      '....ooo..ooo....',
      '..oouuuooyyyoo..',
      '.orroUuoyCyopPo.',
      '.oddddddddddddo.',
      '.oEEEEEEEEEEEEo.',
      '.oEEkkEEEEkkEEo.',
      '.oEEEEEEEEEEEEo.',
      '..oEkEkEkEkEko..',
      '..oqEEEEEEEEqo..',
      '...oooooooooo...',
    ],
    hwSkullJar: [
      '...oooooo...',
      '...oqqqqo...',
      '..oooooooo..',
      '.oHHHHHHHHo.',
      'oHHohhhhoHHo',
      'oxHhhhhhhHHo',
      'oxHhkkhkkhHo',
      'oHHhkkhkkhHo',
      'oHHhhhkhhhHo',
      'oHHHhkhkhHHo',
      'oHHHHhhhHHHo',
      'ofFfFfFfFfFo',
      '.oFFFFFFFFo.',
      '..oooooooo..',
    ],
    hwBlackCatDoll: [
      '.....oo.....',
      '....odDo....',
      '...odddDo...',
      '..oEEEEEEo..',
      'odddddddddDo',
      '.kMMMMMMMMk.',
      '.kMCCMMCCMk.',
      '.kMMMJJMMMk.',
      '..kMMMMMMk..',
      '.kMMMMMMMMk.',
      'kMMMMMMMMMMkk',
      'kMMMMMMMMMMkMk',
      '.kkkk..kkkk.k.',
    ],
    hwBatGarland: [
      'EEE...............EEE',
      '...EEE.........EEE...',
      '...n..EEEEEEEEE..n...',
      'k.kkk.kk.kkk.kk.kkk.k',
      'kkeMekkkkeMekkkkeMekk',
      '.k.k.k..k.k.k..k.k.k.',
    ],
    hwCobwebRug: [
      '..oooooooooooooooooooo..',
      '.oEEEEEEEEEEEEEEEEEEEEo.',
      '.oEdSddSddSkkSddSddSdEo.',
      '.oESdSdSdSdkkdSdSdSdSEo.',
      '.oEEEEEEEEEEEEEEEEEEEEo.',
      '..oooooooooooooooooooo..',
    ],
    hwSpiderWeb: [
      '.S......S......S.',
      '..SS..SSSSS..SS..',
      '...SSS..S..SSS...',
      '...SSSSSSSSSSS...',
      '..SS.SSSSSSS.SS..',
      '..S.S.SSSSS.S.S..',
      'SSSSSSSSSSSSSSSSS',
      '..S.S.SSSSS.SSS..',
      '..SS.SSSSSSS.SS..',
      '...SSSSSSSSSSS...',
      '...SSS..S..kSS.k.',
      '..SS..SSSSS.kkk..',
      '.S......S..kerek.',
      '........S...kkk..',
      '........S..k...k.',
    ],
    xmasTree2: [
      '.........C.........',
      '........CeC........',
      '.......CCCCC.......',
      '........C.C........',
      '........oio........',
      '.......ohiio.......',
      '......ohiriio......',
      '.....ohiiiyiio.....',
      '....ohhiiiiihho....',
      '......oiiyiio......',
      '.....oiriiyiio.....',
      '....oiiiibiiiyo....',
      '..ohhiiiiiiiiihho..',
      '.....oiiiiyiio.....',
      '....oiyiiriiiio....',
      '...oiiiyiiiibiio...',
      '..oriiiiiyiiiiCio..',
      '.ohhhiiiiiiiiihhho.',
      '.ooooooooooooooooo.',
      '........oNo........',
      '........oNo........',
      '.....oRrrrrrRo.....',
      '.....oyyyyyyyo.....',
      '.....ooooooooo.....',
    ],
    xmasFireplace: [
      'oooooooooooooooooooo',
      'oWWWWWWWWWWWWWWWWWWo',
      'oiGiGiGirRrGiGiGiGio',
      'oooooooooooooooooooo',
      '.oqQqqqQqqqqQqqqQqo.',
      '.oqqooooooooooooqqo.',
      '.oqQokkkkkkkkkkoQqo.',
      '.oqqokkkkEkkkkkoqqo.',
      '.oQqokkkEyEkEkkoqQo.',
      '.oqqokkEyeyEyEkoqqo.',
      '.oqQokEyeeyyeyEoQqo.',
      '.oqqokNNNNNNNNkoqqo.',
      '.oQqozzzzzzzzzzoqqo.',
      '.oooooooooooooooooo.',
      'oZZZZZZZZZZZZZZZZZZo',
      'oooooooooooooooooooo',
    ],
    xmasGiftBox: [
      '...oo....oo...',
      '..oCCo..oCCo..',
      '..oCCCooCCCo..',
      '...ooCCCCoo...',
      'oooooooooooooo',
      'oRrrrrCCrrrrRo',
      'oooooooooooooo',
      '.orrxrCCrxrro.',
      '.orrrrCCrrrro.',
      '.oCCCCCCCCCCo.',
      '.orrrrCCrrrro.',
      '.oRrxrCCrrxRo.',
      '.oRRRRCCRRRRo.',
      '.oooooooooooo.',
    ],
    xmasSnowman: [
      '...oooooo...',
      '...okkkko...',
      '...okkkko...',
      '...orrrro...',
      '.oooooooooo.',
      '..ohhhhhho..',
      '..ohkhhkho..',
      '..ohhEEhho..',
      '..ohhkkhho..',
      '.orrrrrrrro.',
      'n.ohhrhhho.n',
      '.nohhhkhhhon',
      'ohhhhhhhhhho',
      'ohHhhhkhhhHo',
      'ohHhhhhhhhHo',
      '.ohHhhkhhHo.',
      '..oooooooo..',
    ],
    xmasCandyCane: [
      '...oooo...',
      '..orxxro..',
      '.orxoorxo.',
      'orxo..oxro',
      'oxro..orxo',
      'orxo..oooo',
      'oxroGGo...',
      'orxoGrGo..',
      'oxro.oo...',
      'orxo......',
      'oxro......',
      'orxo......',
      'oxro......',
      'orxo......',
      'oxro......',
      'oooo......',
    ],
    xmasSleigh: [
      '.....orRo..obBo',
      '.....oCCo..oCCo',
      '.oooooooooooooooo..oo',
      '.oRrrrrrrrrrrrrrRo.oro',
      '.oRrCCCCCCCCCCCrRooRro',
      '.oRrrrrrrrrrrrrrrrrrRo',
      '..oRrrrrrrrrrrrrrrrRo',
      '...oooooooooooooooooo',
      '....oY.....oY....oY',
      '.YYYYYYYYYYYYYYYYYYYYo',
      '..oooooooooooooooooooo',
    ],
    xmasBell: [
      '.....oo.....',
      '..oo.oo.oo..',
      '.oiGoroGiGo.',
      '.oGiorRoiGo.',
      '..ooorrooo..',
      '....oCCo....',
      '...oCCCCo...',
      '...oCeCCo...',
      '..oCeCCCCo..',
      '..oCCCCCYo..',
      '.oCCCCCCCYo.',
      'oYYYYYYYYYYo',
      '.oooooooooo.',
      '.....oko....',
      '......o.....',
    ],
    xmasStocking: [
      '...oo.......',
      '..o..o......',
      'oooooooooo..',
      'ohhhhhhhho..',
      'ohHhHhHhho..',
      'oooooooooo..',
      '.orrxrrro...',
      '.orrrrrro...',
      '.orxrrrxo...',
      '.orrrrrro...',
      '.orrrrrrooo.',
      '.orrxrrrrrGo',
      '.oGrrrrrrrGGo',
      '.oGGrrrrrGGGo',
      '..oGGooooooo',
      '...ooo......',
    ],
    xmasWreath: [
      '.................',
      '.....ooGiGoo.....',
      '...ooIiigrGgoo...',
      '..oigiiiGGiirgo..',
      '..oGigo...oiiIo..',
      '.oIgio.....oggGo.',
      '.oiro.......oiro.',
      '.iGG.........igi.',
      '.gGg.........Iii.',
      '.ggI.........iGi.',
      '.orIo.......orgo.',
      '.oigioo.o.ooGIgo.',
      '..oGGorrorroGGo..',
      '..oGioRrrrRoGGo..',
      '...ooIoorrogoo...',
      '.....oorooro.....',
      '.....oro.oro.....',
    ],
    xmasLightsGarland: [
      '.........................',
      'I...........I...........I',
      '.III.....III.III.....III.',
      '..k.IIIII.k...k.IIIII.k..',
      '..r...k...b...u...k...C..',
      '..r...y...b...u...r...C..',
      '......y...........r......',
    ],
    nyFortuneBox: [
      '....oo.oo....',
      '...oCCoCCo...',
      '....oCCCo....',
      '...ojrjrjo...',
      '..oCCCCCCCo..',
      '.orrrrrrrrro.',
      'orrrrCCCrrrro',
      'orrrCCyCCrrro',
      'orrrrCCCrrrro',
      'orRrrrrrrrRro',
      'orRrrrrrrrRro',
      '.oRRrrrrrRRo.',
      '..ooooooooo..',
    ],
    nyLanternStand: [
      '.....oo.....',
      '....oCCo....',
      '..oooooooo..',
      '..oCCCCCCo..',
      '.orrreerrro.',
      '.orreeeerro.',
      '.orreeeerro.',
      '.oCCCCCCCCo.',
      '.obbeeeebbo.',
      '.obbbeebbbo.',
      '..oCCCCCCo..',
      '..oooooooo..',
      '.....oo.....',
      '.....oWo....',
      '.....oWo....',
      '.....oWo....',
      '...oooWooo..',
      '...oNNNNNo..',
      '...ooooooo..',
    ],
    nyGoldCoinJar: [
      '....oo..oo....',
      '...oCCooCCo...',
      '..oCXCCCCXCo..',
      '..oCCCCXCCCo..',
      '..oooooooooo..',
      '...oNNNNNNo...',
      '..onnnnnnnno..',
      '.onlnnnnnnnNo.',
      'onlnnnCCnnnnNo',
      'onlnnCCyCnnnNo',
      'onlnnnCCnnnnNo',
      '.onnnnnnnnnNo.',
      '..onnnnnnnNo..',
      '...oooooooo...',
    ],
    nyRiceCakeTable: [
      '......S...S.......',
      '.......S...S......',
      '.....oooooooo.....',
      '....oxhgxhyxho....',
      '.....oaaaaaao.....',
      '......obbbbo...ss.',
      '.......oooo...ss..',
      'oooooooooooooooooo',
      'ollllllllllllllllo',
      'oooooooooooooooooo',
      '.oWo..........oWo.',
      '.oo............oo.',
    ],
    nyConfettiBalloon: [
      '....oooo....',
      '..ooHHHHoo..',
      '.oHxHHuHHHo.',
      '.oHHyHHHrHo.',
      'oHxHHHbHHHHo',
      'oHHHrHHHyHHo',
      'oHuHHHHHHuHo',
      'oHHHyHHrHHHo',
      '.oHHHHbHHHo.',
      '.oHrHHHHuHo.',
      '..ooHHHHoo..',
      '....oHHo....',
      '.....oo.....',
      '.....o......',
      '......o.....',
      '.....o......',
      '....oooo....',
      '....oCCo....',
      '....oooo....',
    ],
    nyDrumSet: [
      '.......ooo.......',
      '.....ooRCRoo.....',
      '....oCRrrrRCo....',
      '...orRrrrrrRro...',
      '..oCRrrrrrrrRCo..',
      '..oRrrrrrrbbbRo..',
      '..orrrrrrbbbbro..',
      '..oRrrrrbbbbbRo..',
      '..orrrrbbbbbbro..',
      '..oCrbbbbbbbrCo..',
      '...oRrbbbbbrRo...',
      '....oCrRbRrCo....',
      '.....oorCroo.....',
      '..oWo..ooo..oWo..',
      '...oWo.....oWo...',
      '....oWooooWo.....',
      '...oWo....oWo....',
    ],
    nyZodiacFlag: [
      'CoooooooooooooC',
      '.oCCCCCCCCCCCo.',
      '.orrrrrrrrrrro.',
      '.orCrrrrrrrCro.',
      '.orrrhhhhhrrro.',
      '.orrhhhhkhhrro.',
      '.orhhhhkkkhhro.',
      '.orhhhkkkkkhro.',
      '.orhhkkkkkkhro.',
      '.orhkkkkkkhhro.',
      '.orhkkhkkkhhro.',
      '.orrhhhkkkhrro.',
      '.orrrhhhhhrrro.',
      '.orCrrrrrrrCro.',
      '.oCCCCCCCCCCCo.',
      '.orrrrro.orrro.',
      '.orrrro...orro.',
      '.orro.......oo.',
      '.oo...........',
      '..C.........C..',
      '..Y.........Y..',
    ],
    nyNewYearClock: [
      '......oo......',
      '.....oYYo.....',
      '....ooooo.....',
      '...oXYYYYXo...',
      '..oXYhhhhYXo..',
      '..oYhhkhhhYo..',
      '.oXYhhkhhhYXo.',
      '.oYhhhkhhhhYo.',
      '.oYhhhrhhhhYo.',
      '.oYhhhhhhhhYo.',
      'oXYYhhhhhhYYXo',
      'oYYYYYYYYYYYYo',
      'oXXXXXXXXXXXXo',
      '.oooooooooooo.',
      '......oYo.....',
      '.......o......',
    ],
    nyKiteDeco: [
      'oooooooooooo',
      'obLLLrrLLLyo',
      'oLNLrrrrLNLo',
      'oLLNLrrLNLLo',
      'oLLLNoooNLLo',
      'oLLLo..oLLLo',
      'oNNNo..oNNNo',
      'oLLLo..oLLLo',
      'oLLLNooNLLLo',
      'oLLNLLLLNLLo',
      'oLNLLLLLLNLo',
      'oyLLLLLLLLbo',
      'oooooooooooo',
      '...r....b...',
      '..r......b..',
      '...r....b...',
      '....r..b....',
    ],
    nyFireworkFrame: [
      'oooooooooooooo',
      'oCCCCCCCCCCCCo',
      'oCDDDDDDDDDDCo',
      'oCDyDyDDuDuDCo',
      'oCDDCDDDDUDDCo',
      'oCDyDyDuUhUuCo',
      'oCDDDDDDDUDDCo',
      'oCDDDrDDuDuDCo',
      'oCDDrJrDDDDDCo',
      'oCDDDrDDDDhDCo',
      'oCkDkkDkkkDkCo',
      'oCkkkkkkkkkkCo',
      'oCCCCCCCCCCCCo',
      'oooooooooooooo',
    ],
  });
  // ---------------------------------------------------------------- 💡 조명 (0.14): 불을 끄면 은은하게 빛나요
  Object.assign(ART, {
    wallLamp: [
      '..oooooo..',
      '.oLLLLLLo.',
      '.oLLLLLLo.',
      'oLLLLLLLLo',
      'oooooooooo',
      '...oeeo...',
      '....oo....',
      '...oYYo...',
      '...oYYo...',
      '..oYYYYo..',
      '..oXXXXo..',
      '...oooo...',
    ],
    pendant: [
      '.....oo.....',
      '.....oo.....',
      '.....oo.....',
      '.....oo.....',
      '.....oo.....',
      '.....oo.....',
      '.....oo.....',
      '.....oo.....',
      '.....oo.....',
      '....oooo....',
      '...oYYYYo...',
      '..oYYYYYYo..',
      '.oYYYYYYYYo.',
      'oYYYYYYYYYYo',
      'oXXXXXXXXXXo',
      'oooooooooooo',
      '....oeeo....',
      '.....oo.....',
    ],
    fairyLights: [
      'o.............o.............o',
      '.oo.........oo.oo.........oo.',
      '...oo.....oo...o.oo.....oo.o.',
      '...o.ooooo.o...J...ooooo...C.',
      '...e...o...E...J...o...o...C.',
      '...e...C...E.......f...e.....',
      '.......C...........f...e.....',
    ],
    moodLamp: [
      '...oooo...',
      '..ommmmo..',
      '.omemmemo.',
      'ommmmmmmmo',
      'oeeeeeeeeo',
      'oooooooooo',
      '...oLLo...',
      '...oLLo...',
      '...oLLo...',
      '..oLLLLo..',
      '.oWWWWWWo.',
      '.oooooooo.',
    ],
    candles: [
      '...e..........',
      '..eCe.....e...',
      '...E.....eCe..',
      '..oLo.e...E...',
      '..oLoeCe.oLo..',
      '..oLo.E..oLo..',
      '..oLooLo.oLo..',
      '..oLooLo.oLo..',
      '.oYYYYYYYYYYo.',
      '..oooooooooo..',
    ],
  });
  // ---- HD BEGIN
  // 기본 가구 다시 그림 (0.13.6): 크기는 그대로, 음영 · 결 · 손잡이 같은 디테일을 더함. 그림마다 자기 색표(pal)를 씀
  Object.assign(ART, {
    computer: { pal: { a: '#3b2a25', b: '#1f1b24', c: '#86dcec', d: '#d4f6fc', e: '#45aac2', f: '#2a6f88', g: '#b4e894', h: '#2f2a36', i: '#d3d8de', j: '#a9b0b8', k: '#ef6a5e', l: '#c2443f', m: '#eef1f4', n: '#ecc28a', p: '#cf9558', q: '#a8703f', r: '#7f4f2b', s: '#f6d34f', t: '#d9a530' }, rows: [
      '......aaaaaaaaaaaa......',
      '......abbbbbbbbbba......',
      '......abccccccccba......',
      '......abcddeeeeeba......',
      '......abcdecccceba......',
      '......abceeffffeba......',
      '......abbbbbbbbbga......',
      '......aaaahhhhaaaa.aaa..',
      '..........aija.....akla.',
      '.amimia.aaiiiiaa...aka..',
      'annnnnnannnnnnnnaaannnaa',
      'appppppppqpppqqppppppppa',
      'arrraaaaaaaaaarrrrrrrrra',
      '.apa..........apppppppa.',
      '.aqa..........aqqqssqqa.',
      '.aqa..........arrrrrrra.',
      '.aqa..........aqqqttqqa.',
      '.aaa..........aaaaaaaaa.',
    ] },
    bed: { pal: { a: '#3b2a25', b: '#ecc28a', c: '#cf9558', d: '#a8703f', e: '#7f4f2b', f: '#f1f3f7', g: '#ffffff', h: '#ffe3ea', i: '#f6aac0', j: '#dc7896', k: '#cdd4de', l: '#a9506e' }, rows: [
      '.aa.....................',
      'abba....................',
      'acdeaaaaaaaaaaaaaaaaaaa.',
      'acdfgggggghiiijhiijhiija',
      'acdfgggggghiiijiiijiibba',
      'acdfkkkkkkhiiijiiijiibca',
      'acdfffffffhjjjjjjjjjjbca',
      'acdkkkkkkklllllllllllbca',
      'acdccccccccccccccccccbca',
      'acceaaaaaaaaaaaaaaaaaeea',
      'aaaa.................aa.',
    ] },
    bedBlue: { pal: { a: '#3b2a25', b: '#ffffff', c: '#eef1f4', d: '#d3d8de', e: '#a9b0b8', f: '#f1f3f7', g: '#cfe6ff', h: '#94c2f2', i: '#6aa2e8', j: '#cdd4de', k: '#4572b4' }, rows: [
      '.aa.....................',
      'abba....................',
      'acdeaaaaaaaaaaaaaaaaaaa.',
      'acdfbbbbbbghhhighhighhia',
      'acdfbbbbbbghhhihhhihhbba',
      'acdfjjjjjjghhhihhhihhbca',
      'acdfffffffgiiiiiiiiiibca',
      'acdjjjjjjjkkkkkkkkkkkbca',
      'acdccccccccccccccccccbca',
      'acceaaaaaaaaaaaaaaaaaeea',
      'aaaa.................aa.',
    ] },
    bedCanopy: { pal: { a: '#3b2a25', b: '#f6aac0', c: '#dc7896', d: '#ffe3ea', e: '#ef6a5e', f: '#f1f3f7', g: '#ffffff', h: '#ecd8b2', i: '#cdb38a', j: '#cdd4de', k: '#fbf1dc', l: '#a9506e', m: '#7f4f2b' }, rows: [
      'aaaaaaaaaaaaaaaaaaaaaaaa',
      'abbbbbbbbbbbbbbbbbbbbbba',
      'acccccaccaccaccaccacccca',
      'abdbaa.aa.aa.aa.aa.abdba',
      'abda................adba',
      'abda................adba',
      'abdbaaaaaaaaaaaaaaaabdba',
      'abefggggggdbbbcdbbcdbeba',
      'abbfggggggdbbbcbbbcbbbba',
      'ahifjjjjjjdbbbcbbbcbbkka',
      'ahifffffffdcccccccccckka',
      'ahijjjjjjjlllllllllllkka',
      'ahihhhhhhhhhhhhhhhhhhkka',
      'ahhmaaaaaaaaaaaaaaaaamka',
      'aaaa.................aaa',
    ] },
    bedBunk: { pal: { a: '#3b2a25', b: '#7f4f2b', c: '#f1f3f7', d: '#ffffff', e: '#cfe6ff', f: '#ecc28a', g: '#cdd4de', h: '#6aa2e8', i: '#4572b4', j: '#cf9558', k: '#a8703f', l: '#ffb1a6', m: '#ef6a5e', n: '#c2443f' }, rows: [
      'aaaaaaaaaaa...........aa',
      'abcdddddeeeaaaaaaaaaaafa',
      'abcgggggehhhihhhihhhhcfa',
      'abggggggeiiiiiiiiiiiigfa',
      'abjjjjjjjjjjjjjjjjjjjjfa',
      'abaaaaaaaaaaaaaaabbbbafa',
      'aa...............kjjk.aa',
      'aa...............k..k.aa',
      'aa...............kjjk.aa',
      'abaaaaaaaaaaaaaaallllafa',
      'abcggggglmmmnmmmnmmmmcfa',
      'abgggggglnnnnnnnnnnnngfa',
      'abjjjjjjjjjjjjjjjjjjjjfa',
      'abaaaaaaaaaaaaaaaaaaaafa',
      'aa....................aa',
    ] },
    desk: { pal: { a: '#3b2a25', b: '#6aa2e8', c: '#ef6a5e', d: '#f6d34f', e: '#86dcec', f: '#b4e894', g: '#d9a530', h: '#ecc28a', i: '#cf9558', j: '#a8703f', k: '#7f4f2b', l: '#5a3720' }, rows: [
      '..aab.........aaaa..c.d.',
      '..acbaa.......aeea..aaa.',
      '..acbfa.......agga..aba.',
      'aahhhhhaaaaaaahhhhaahhha',
      'aiiiiiiiiijjiiiiiijiiiia',
      'akkkkkkkkkkkkkkkkkkkkkka',
      'aiiiiiiilllllllllliiiiia',
      'ajjddjja..........akkkka',
      'alllllla..........akllka',
      'ajjddjja..........akllka',
      'ajjjjjja..........akkkka',
      'aaaaaaaa..........aaaaaa',
    ] },
    wardrobe: { pal: { a: '#3b2a25', b: '#7f4f2b', c: '#cf9558', d: '#5a3720', e: '#a8703f', f: '#fff2a8', g: '#d9a530', h: '#f6d34f' }, rows: [
      'aaaaaaaaaaaaaaaa',
      'abbbbbbbbbbbbbba',
      'acccccccdcccccca',
      'acbbbbbbdbbbbbba',
      'acbcccbbdbcccbba',
      'acbeeebbdbeeebba',
      'aceeeefbdfeeeeba',
      'acbbbbgbdgbbbbba',
      'acbcccbbdbcccbba',
      'acbeeebbdbeeebba',
      'abbbbbbbdbbbbbba',
      'acccccccccccccca',
      'aceeeehgggeeeeba',
      'abbbbbbbbbbbbbba',
      'abbbaaaaaaaabbba',
      '.aaa........aaa.',
    ] },
    fridge: { pal: { a: '#3b2a25', b: '#eef1f4', c: '#ef6a5e', d: '#fff2a8', e: '#a9b0b8', f: '#d9a530', g: '#7d848c', h: '#6aa2e8', i: '#d4f6fc', j: '#f6d34f', k: '#73c45a', l: '#f6aac0' }, rows: [
      'aaaaaaaaaaaa',
      'abbbbbbbbbba',
      'abcddbbbbeba',
      'abdffbbbbgba',
      'abdddbbbbgba',
      'aeeeeeeeeeea',
      'aeeeeeeeeeea',
      'abbbbbbbbbba',
      'abhijibbbeba',
      'abiiiibbbgba',
      'abkkkkbbbgba',
      'abbbbbbbbgba',
      'abbbbbcbbbba',
      'abblbbbbbbba',
      'abbbbbbbbbba',
      'aaaaaaaaaaaa',
    ] },
    arcade: { pal: { a: '#3b2a25', b: '#9677d4', c: '#f6d34f', d: '#ef6a5e', e: '#94c2f2', f: '#73c45a', g: '#654a9e', h: '#1f1b24', i: '#45aac2', j: '#2a6f88', k: '#ffffff', l: '#b4e894', m: '#fff2a8', n: '#43913e', p: '#c0a6f0', q: '#ffb1a6', r: '#e4d6ff', s: '#2f2a36' }, rows: [
      '.aaaaaaaaaaaa.',
      '.abcbdbebfbca.',
      '.agggggggggga.',
      'ahhhhhhhhhhhha',
      'ahiiiiiiiiiiha',
      'ahjkjjjjjjljha',
      'ahjjjjcmjjjjha',
      'ahjjejjjjdjjha',
      'ahjjjfjjfjjjha',
      'ahnnnnnnnnnnha',
      'ahhdhhhhhhhhha',
      'apphppppfpqppa',
      'abbbbbbdbebcba',
      'agggggggggggga',
      '.arrrrrrrrrra.',
      '.apppscmspppa.',
      '.apppsssspppa.',
      '.aaaaaaaaaaaa.',
    ] },
    beanbag: { pal: { a: '#3b2a25', b: '#f8c27e', c: '#f0a050', d: '#cf6f45', e: '#9c4b2b' }, rows: [
      '....aaaaaaaa....',
      '...abbcccccca...',
      '..abccccccccca..',
      '.aaccccccccccaa.',
      'abbaccccccccabca',
      'abcddddddddddcda',
      'accdbbbbbbbbdcda',
      'acdccccccccccdda',
      'addccccccccccdda',
      '.adeeeeeeeeeeda.',
      '..aaaaaaaaaaaa..',
    ] },
    globe: { pal: { a: '#3b2a25', b: '#ffffff', c: '#94c2f2', d: '#6aa2e8', e: '#cfe6ff', f: '#73c45a', g: '#43913e', h: '#f6d34f', i: '#d9a530', j: '#ecc28a', k: '#cf9558' }, rows: [
      '....aaaa....',
      '...abcdda...',
      '..aeffcdfa..',
      '..afffcdda..',
      '.accgccffda.',
      '.adcccdffda.',
      '..affddfga..',
      '..aaffddda..',
      '....agdaa...',
      '.....hi.....',
      '.....hi.....',
      '...aajjaaa..',
      '...akkkkka..',
      '...aaaaaaa..',
    ] },
    speaker: { pal: { a: '#3b2a25', b: '#2f2a36', c: '#b4e894', d: '#1f1b24', e: '#c6c9cf', f: '#6e727a', g: '#9a9ea6' }, rows: [
      'aaaaaaaaaa',
      'abbbbbbbca',
      'abbddddbba',
      'abbdefdbba',
      'abbdffdbba',
      'abbddddbba',
      'abbbddbbba',
      'abddffddba',
      'abdeegfdba',
      'adfgddgfda',
      'adfgddgfda',
      'abdfggfdba',
      'abddffddba',
      'abbbddbbba',
      'aaaaaaaaaa',
    ] },
    mirror: { pal: { a: '#3b2a25', b: '#a8703f', c: '#86dcec', d: '#d4f6fc', e: '#ffffff', f: '#45aac2', g: '#ecc28a' }, rows: [
      '...aaaaaa...',
      '..abccccba..',
      '.acccccccca.',
      '.acdddcccca.',
      '.aceddcccca.',
      '.acdddeccca.',
      '.acddecccca.',
      '.acdedccfca.',
      '.aceddccfca.',
      '.acdddccfca.',
      '.acdddccfca.',
      '.acccccffca.',
      '.acccccccca.',
      'agggggggggga',
      'aaaaaaaaaaaa',
    ] },
    cattower: { pal: { a: '#3b2a25', b: '#c0a6f0', c: '#9677d4', d: '#a9b0b8', e: '#fbf1dc', f: '#cdb38a', g: '#ef6a5e', h: '#e4d6ff' }, rows: [
      '.aaaaaaaaaa.....',
      '.abbbbbbbba.....',
      '.acaccccaaa.....',
      '..d.aeea........',
      '..d.affa........',
      '..d.aeea........',
      '..g.affa.aaaaaaa',
      '....aeea.aacccaa',
      '....affa...aea..',
      '....aeea...aea..',
      '....affa...aea..',
      '....aeea...aea..',
      'aaaahhhhaaahhhaa',
      'abbbbbbbbbbbbbba',
      'abbbbbbbbbbbbbba',
      'aaaaaaaaaaaaaaaa',
    ] },
    sofa: { pal: { a: '#3b2a25', b: '#6aa2e8', c: '#4572b4', d: '#cfe6ff', e: '#94c2f2', f: '#2c4c84' }, rows: [
      '.aaaaaaaaaaaaaaaaaaaaaa.',
      '.abbbbbbbbbbcbbbbbbbbba.',
      '.abbbbcbbbbbcbbbbcbbbba.',
      'addebbbbbbbbcbbbbbbbedda',
      'abbcddddddddddddddddebba',
      'abbceeeeeeecdeeeeeeeebba',
      'abbceeeeeeecdeeeeeeeebba',
      'abbcccccccccccccccccebba',
      'abbbbbbbbbbbbbbbbbbbbbba',
      'aaffaaaaaaaaaaaaaaaaffaa',
      '..aa................aa..',
    ] },
    chair: { pal: { a: '#3b2a25', b: '#cf9558', c: '#7f4f2b', d: '#ef6a5e', e: '#ecc28a', f: '#a8703f' }, rows: [
      'aaa.........',
      'aba.........',
      'aca.........',
      'aba.........',
      'aca.........',
      'abdaaaaaaaa.',
      'abdddddddda.',
      'aeeeeeeeeeea',
      'accaaaaaacca',
      'aba......aba',
      'abcaaaaaabfa',
      'aba......afa',
      'aaa......aaa',
    ] },
    table: { pal: { a: '#3b2a25', b: '#a8703f', c: '#cf9558', d: '#7f4f2b', e: '#5a3720' }, rows: [
      '..................',
      'aaaaaaaaaaaaaaaaaa',
      'abbbbbbbbbbbbbbbba',
      '.accddddddddddcca.',
      '.abdeeeeeeeeeecba.',
      '.aba..........aba.',
      '.aba..........aba.',
      '.aba..........aba.',
      '.aaa..........aaa.',
    ] },
    rug: { pal: { a: '#3b2a25', b: '#ecd8b2', c: '#c2443f', d: '#ef6a5e', e: '#ffb1a6', f: '#fff2a8' }, rows: [
      '.aaaaaaaaaaaaaaaaaaaaaa.',
      'bcddddddddddddddddddddcb',
      '.adefeeeefeeeefeeeefeda.',
      'bcddddddddddddddddddddcb',
      '.aaaaaaaaaaaaaaaaaaaaaa.',
    ] },
    cushion: { pal: { a: '#3b2a25', b: '#e4d6ff', c: '#c0a6f0', d: '#9677d4', e: '#654a9e' }, rows: [
      'aaaaaaaaaa',
      'abbbbbbbba',
      'acccdeccca',
      'adddddddda',
      'aaaaaaaaaa',
    ] },
    plant: { pal: { a: '#3b2a25', b: '#73c45a', c: '#b4e894', d: '#43913e', e: '#2b6431', f: '#f3a878', g: '#55321a', h: '#9a4a28', i: '#d0723f' }, rows: [
      '.....aa.....',
      '....abca....',
      '..aabcbbaa..',
      '.abcbbdbbca.',
      'abcbdbdbdbca',
      '.abbedddeba.',
      'acbdbbdbbdba',
      '.affggggffa.',
      '..ahhhhhha..',
      '...aiiiia...',
      '...aiiiia...',
      '...aaaaaa...',
    ] },
    cactus: { pal: { a: '#3b2a25', b: '#f6aac0', c: '#dc7896', d: '#b4e894', e: '#73c45a', f: '#fbf1dc', g: '#43913e', h: '#55321a', i: '#d0723f' }, rows: [
      '...abca...',
      'aa.adea.aa',
      'af.adea.fa',
      'aa.afegaea',
      'aeaedegaa.',
      '.aaedfa...',
      '...aeea...',
      '..ahhhha..',
      '..aiiiia..',
      '..aiiiia..',
      '..aaaaaa..',
    ] },
    lamp: { pal: { a: '#3b2a25', b: '#fff2a8', c: '#f6d34f', d: '#d9a530', e: '#9a9ea6', f: '#d3d8de', g: '#7d848c', h: '#eef1f4' }, rows: [
      '...aaaa...',
      '..abbbca..',
      '..abccca..',
      '.abbbbcca.',
      '.acccccca.',
      'aaaaddadaa',
      '....bb.e..',
      '....fg.e..',
      '....hg.e..',
      '....fg.e..',
      '....fg.d..',
      '....fg....',
      '....fg....',
      '....fg....',
      '....fg....',
      '..aaggaa..',
      '.affffffa.',
      '.aaaaaaaa.',
    ] },
    books: { pal: { a: '#3b2a25', b: '#5a3720', c: '#c0a6f0', d: '#73c45a', e: '#43913e', f: '#d0723f', g: '#e8dcc8', h: '#cdb38a', i: '#9a4a28', j: '#9677d4', k: '#fff2a8', l: '#cf9558', m: '#7aa5a0', n: '#6aa2e8', p: '#4572b4', q: '#ef6a5e', r: '#b4e894', s: '#c2443f', t: '#4f7a76', u: '#e9c46a', v: '#d9a530' }, rows: [
      'aaaaaaaaaaaaaaaa',
      'abbbbbcbbdebbcca',
      'afcghdcgbdecbcca',
      'aijkkejhbkkjbjja',
      'afcghdcgbdecbcca',
      'alllllllllllllla',
      'abbmncdbnpqbbbba',
      'aqbmncddnpqbdrba',
      'asbtpjeekksbffba',
      'aqbmncddnpqbffba',
      'alllllllllllllla',
      'aubbgdebqsbbfiba',
      'avkkhkkskkkkkkta',
      'auqsgdeqqsqsfima',
      'alllllllllllllla',
      'aaaaaaaaaaaaaaaa',
    ] },
    tv: { pal: { a: '#3b2a25', b: '#46404f', c: '#1f1b24', d: '#86dcec', e: '#ffffff', f: '#d4f6fc', g: '#45aac2', h: '#f6d34f', i: '#fff2a8', j: '#2a6f88', k: '#ef6a5e' }, rows: [
      '......a....a......',
      '.......a..a.......',
      'aaaaaaabaabaaaaaaa',
      'acccccccccccccccca',
      'acddddddddddddddca',
      'acdefggggggghiggca',
      'acdfggggggggggggca',
      'acdgggggggjjjjggca',
      'acdgggggjjjjjjjjca',
      'acccccccccccccccka',
      'aaacccaaaaaacccaaa',
      '...aaa......aaa...',
    ] },
    guitar: { pal: { a: '#3b2a25', b: '#7c4c28', c: '#a46c3e', d: '#a9b0b8', e: '#de7f2c', f: '#f6a54e', g: '#eef1f4', h: '#ffd08a', i: '#1f1b24', j: '#55321a', k: '#a65520' }, rows: [
      '..aaaaa..',
      '..abbba..',
      '...aca...',
      '...ada...',
      '...aca...',
      '...ada...',
      '...aca...',
      '...ada...',
      '...aea...',
      '..afgea..',
      '.ahfgeea.',
      '.affgeea.',
      '.afigiea.',
      'afhfgfeea',
      'aeffgfeea',
      'aeejjjeka',
      '.aeeeeka.',
      '..aaaaa..',
    ] },
    piano: { pal: { a: '#3b2a25', b: '#2f2a36', c: '#fff2a8', d: '#d9a530', e: '#fbf1dc', f: '#ffffff', g: '#46404f', h: '#1f1b24', i: '#a9b0b8', j: '#d3d8de' }, rows: [
      'aaaaaaaaaaaaaaaaaaaaaa',
      'abcbbbbbbbbbbbbbbbbcba',
      'abdbbbbeffffffebbbbdba',
      'abbbbbbeggegggebbbbbba',
      'abbbbbbeeeeeeeebbbbbba',
      'abbbbbbbbbbbbbbbbbbbba',
      'ahhhhhhhhhhhhhhhhhhhha',
      'afhhfhhffifhhfhhfhhffa',
      'ajjijjijjijjijjijjijja',
      'agggggggggggggggggggga',
      '.abbhhhhhhhhhhhhhhbba.',
      '.abbhgggggggggggghbba.',
      '.abbhhhhhhhhhhhhhhbba.',
      '.abbbbbbbbbbbbbbbbbba.',
      '.aaaaaaaaaaaaaaaaaaaa.',
    ] },
    teddy: { pal: { a: '#3b2a25', b: '#c9925e', c: '#a46c3e', d: '#1f1b24', e: '#ecd8b2', f: '#ffb1a6', g: '#ef6a5e', h: '#c2443f', i: '#7c4c28' }, rows: [
      '..a......a..',
      '.abaaaaaaba.',
      '.abbbbbccba.',
      '..abbbbcca..',
      '..acdeecda..',
      '..aceedeca..',
      '...acccca...',
      '..acfghgfa..',
      '.accbbbbcca.',
      'aiicbbbbciia',
      'aiacbbbbcaia',
      '.a.aaaaaa.a.',
    ] },
    bunny: { pal: { a: '#3b2a25', b: '#f6aac0', c: '#eef1f4', d: '#ffffff', e: '#1f1b24', f: '#ffe3ea', g: '#dc7896', h: '#d3d8de' }, rows: [
      '.aaa..aaa.',
      '.aba..aba.',
      '.aba..aba.',
      '.aba..aba.',
      '.acdaacca.',
      '..adddca..',
      '.acedceca.',
      '..fcggcf..',
      '..acccca..',
      '.achhhhca.',
      '.achhhhca.',
      '..aaaaaa..',
    ] },
    catdoll: { pal: { a: '#3b2a25', b: '#f6aac0', c: '#f6a54e', d: '#ffd08a', e: '#de7f2c', f: '#1f1b24', g: '#ffe3ea', h: '#fbf1dc', i: '#dc7896' }, rows: [
      '.aaa....aaa.',
      '.abcaaaacba.',
      '.acddeeecca.',
      '.acdddcccca.',
      '.acfdcccfca.',
      '.agchiihcga.',
      '..acchhcca..',
      '..acccccca..',
      '.acchhhhca..',
      '.aachhhhcaa.',
      '...aaaaaa...',
    ] },
    duck: { pal: { a: '#3b2a25', b: '#fff2a8', c: '#1f1b24', d: '#f6d34f', e: '#f6aac0', f: '#d9a530' }, rows: [
      '...aa.....',
      '..abba....',
      '.abbcda...',
      '.adeddaaaa',
      '..adda.aa.',
      '..abbdaa..',
      '.abbbbbda.',
      'adbbbffffa',
      '.adddfffa.',
      '.affffffa.',
      '..aaaaaa..',
    ] },
    frame: { pal: { a: '#3b2a25', b: '#fff2a8', c: '#d4f6fc', d: '#d9a530', e: '#ffffff', f: '#86dcec', g: '#f6d34f', h: '#73c45a', i: '#b4e894', j: '#43913e' }, rows: [
      'aaaaaaaaaaaaaa',
      'abbbbbbbbbbbba',
      'abccccccccccda',
      'abcceecccebcda',
      'abfffffffgffda',
      'abffhiffffffda',
      'abfhihhfjjjfda',
      'abhhhhhhhhhhda',
      'abjjjjjjjjjjda',
      'abddddddddddda',
      'aaaaaaaaaaaaaa',
    ] },
    clock: { pal: { a: '#3b2a25', b: '#eef1f4', c: '#9a9ea6', d: '#ffffff', e: '#1f1b24', f: '#ef6a5e' }, rows: [
      '....aaaa....',
      '..aabbcbaa..',
      '.abdddedbba.',
      'abddddeddbba',
      'abddddeddbba',
      'abcdddfeebca',
      'abddddddbbba',
      'abbbddbbbbba',
      '.abbbbbbbba.',
      '..aabbcbaa..',
      '....aaaa....',
    ] },
    poster: { pal: { a: '#3b2a25', b: '#654a9e', c: '#9677d4', d: '#ffffff', e: '#f6d34f', f: '#fff2a8', g: '#43913e', h: '#73c45a', i: '#2b6431', j: '#fbf1dc', k: '#2f2a36', l: '#9a9ea6' }, rows: [
      'aaaaaaaaaaaa',
      'abbbbbbbbbba',
      'acdcceeccdca',
      'acccefeedcca',
      'accceeeeccda',
      'accdceecccca',
      'aghhhgghhhga',
      'aggggiggggga',
      'ajjjjjjjjjja',
      'ajkkkkkkkkja',
      'ajjlllllljja',
      'aaaaaaaaaaaa',
    ] },
    shelf: { pal: { a: '#3b2a25', b: '#ef6a5e', c: '#fff2a8', d: '#73c45a', e: '#94c2f2', f: '#6aa2e8', g: '#f6d34f', h: '#d0723f', i: '#86dcec', j: '#d9a530', k: '#ecc28a', l: '#7f4f2b' }, rows: [
      '..aa..aa...aaaa.....',
      '..abaaca...adda.aaa.',
      '..abefcga..ahha.aia.',
      '..abefcga..ahha.aja.',
      'aakkkkkkkaakkkkakkka',
      'aallaaaaaaaaaaaallaa',
      '..aa............aa..',
      '..aa............aa..',
      '..a.............a...',
    ] },
    neon: { pal: { a: '#3b2a25', b: '#f6aac0', c: '#dc7896', d: '#ffffff', e: '#ffe3ea' }, rows: [
      '..aaa..aaa..',
      '.abbcaacbba.',
      'abdebccbebba',
      'abebbbbbbbba',
      '.abbbbbbbba.',
      '..acbbbbca..',
      '...acbbca...',
      '....acca....',
      '.....aa.....',
      '............',
    ] },
    tankS: { pal: { a: '#3b2a25', b: '#d4f6fc', c: '#ffffff', d: '#86dcec', e: '#73c45a', f: '#43913e', g: '#f6d34f', h: '#fff2a8', i: '#46404f' }, rows: [
      '...aaaaaaaa...',
      '..abbbbbbbba..',
      '.abbbbbbbbbba.',
      'abcddddddddbba',
      'abcdddddddddba',
      'abcdeddddeddba',
      'abddeddddefdba',
      '.agghggghggga.',
      '..agggggggga..',
      '...aiiiiiia...',
      '...aaaaaaaa...',
    ] },
    tankM: { pal: { a: '#3b2a25', b: '#ffffff', c: '#d4f6fc', d: '#86dcec', e: '#45aac2', f: '#73c45a', g: '#43913e', h: '#f6d34f', i: '#fff2a8', j: '#46404f' }, rows: [
      'aaaaaaaaaaaaaaaa',
      'abccccccccccccca',
      'abccccccccccccca',
      'abddddddddddddea',
      'abddddddddddddea',
      'abddddddddddddea',
      'abddddddddddddea',
      'abfddddfddddfdea',
      'abfgdddfgdddfgea',
      'abhhihhihhihhiha',
      'ahhhhhhhhhhhhhha',
      'ajjjjjjjjjjjjjja',
      'aaaaaaaaaaaaaaaa',
    ] },
    tankL: { pal: { a: '#3b2a25', b: '#ffffff', c: '#d4f6fc', d: '#86dcec', e: '#45aac2', f: '#73c45a', g: '#43913e', h: '#f6d34f', i: '#fff2a8', j: '#46404f' }, rows: [
      'aaaaaaaaaaaaaaaaaaaaaaaa',
      'abccccccccccccccccccccca',
      'abccccccccccccccccccccca',
      'abccccccccccccccccccccca',
      'abddddddddddddddddddddea',
      'abddddddddddddddddddddea',
      'abddddddddddddddddddddea',
      'abddddddddddddddddddddea',
      'abddddddddddddddddddddea',
      'abfddddfddddfddddfddddea',
      'abfgdddfgdddfgdddfgdddea',
      'abhhihhihhihhihhihhihhia',
      'abhhhhhhhhhhhhhhhhhhhhha',
      'ahhhhhhhhhhhhhhhhhhhhhha',
      'ajjjjjjjjjjjjjjjjjjjjjja',
      'aaaaaaaaaaaaaaaaaaaaaaaa',
    ] },
    rugRound: { pal: { a: '#3b2a25', b: '#fbf1dc', c: '#f6aac0', d: '#dc7896' }, rows: [
      '.....aaaaaaaaaaaa.....',
      '.aaaabbbbccccbbbbaaaa.',
      'adbbcccbbbccbbbcccbbda',
      'adbbcccbbbccbbbcccbbda',
      '.aaaabbbbccccbbbbaaaa.',
      '.....aaaaaaaaaaaa.....',
    ] },
    rugStripe: { pal: { a: '#ecd8b2', b: '#3b2a25', c: '#fbf1dc', d: '#6aa2e8', e: '#2c4c84', f: '#f6d34f' }, rows: [
      'abbbbbbbbbbbbbbbbbbbbbba',
      '.bccddeeccffccddeeccffb.',
      'aeccddeeccffccddeeccffea',
      '.bccddeeccffccddeeccffb.',
      'abbbbbbbbbbbbbbbbbbbbbba',
    ] },
    tvStand: { pal: { a: '#3b2a25', b: '#7f4f2b', c: '#cf9558', d: '#5a3720', e: '#a8703f', f: '#ef6a5e', g: '#6aa2e8', h: '#f6d34f', i: '#2f2a36', j: '#b4e894' }, rows: [
      'aaaaaaaaaaaaaaaaaaaaaaaaaa',
      'abbbbbbbbbbbbbbbbbbbbbbbba',
      'accccccccddddddddcccccccca',
      'aceeeeeebddddddfgceeeeeeba',
      'aceeeeehbdijiidfgcheeeeeba',
      'aceeeeeebdiiiidfgceeeeeeba',
      'abbaaaaaaabbbbbbaaaaaaabba',
      '.aa....................aa.',
    ] },
  });
  // ---- HD END
  Object.assign(GLOW_EXTRA, {
    arcade: [0.5, 0.4, 20], neon: [0.5, 0.45, 24], fridge: [0.5, 0.3, 6],
    hwPumpkinLamp: [0.5, 0.45, 18], xmasTree2: [0.5, 0.4, 22], xmasFireplace: [0.5, 0.55, 20],
    xmasLightsGarland: [0.5, 0.5, 18], nyLanternStand: [0.5, 0.4, 18],
    wallLamp: [0.5, 0.3, 26], pendant: [0.5, 0.88, 30], fairyLights: [0.5, 0.6, 28], moodLamp: [0.5, 0.35, 22], candles: [0.5, 0.25, 18],
    wineCounter: [0.5, 0.92, 20],
  });

  // 어항 속 물이 있는 칸 (물고기가 헤엄치는 범위): [x1, y1, x2, y2]
  const TANK_WATER = { tankS: [2, 3, 11, 6], tankM: [1, 2, 14, 8], tankL: [1, 3, 22, 10] };

  // 빛나는 가구 (불 끄면 은은하게 밝혀 줌): [가로 위치 비율, 세로 위치 비율, 반지름(칸)]
  const GLOW = { lamp: [0.5, 0.12, 30], tv: [0.5, 0.5, 18], tree: [0.5, 0.45, 22], tankS: [0.5, 0.45, 10], tankM: [0.5, 0.45, 14], tankL: [0.5, 0.45, 18], computer: [0.5, 0.25, 14], ...GLOW_EXTRA };

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
    // 글자 격자만 있거나, { pal: 이 그림만의 색, rows: 격자 } (0.13.6 다시 그린 기본 가구)
    const rows = Array.isArray(art) ? art : art.rows, pal = Array.isArray(art) ? PAL : art.pal;
    const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
    c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const ch = rows[y][x];
        if (ch === '.' || ch === ' ') continue;
        g.fillStyle = ch === '@' && pal === PAL ? skyColor : (pal[ch] || '#f0f');
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

  // ---------------------------------------------------------------- 🎉 시즌 이벤트 벽지 15종: 무늬 · 분위기를 직접 그림 (한 칸 = 4px 도트)
  const EV = (() => {
    const U = 4;
    const seeded = (seed) => { let s = seed * 7919 + 13; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
    const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    // 글자 격자 도장: rows 의 각 글자를 colors[글자] 색으로 한 칸 U 크기로 찍음
    const stamp = (ctx, rows, colors, x, y, u = U) => {
      for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
        const c = colors[rows[j][i]];
        if (c) R(ctx, c, x + i * u, y + j * u, u, u);
      }
    };
    const vgrad = (ctx, x, y, w, h, stops) => {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      stops.forEach(([p, c]) => g.addColorStop(p, c));
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    };
    const clip = (ctx, x, y, w, h, fn) => { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); fn(); ctx.restore(); };
    const baseboard = (ctx, x, wb, w, c) => { R(ctx, c, x, wb - 8, w, 8); R(ctx, 'rgba(0,0,0,.18)', x, wb - 2, w, 2); };
    const planks = (ctx, x, y, w, h, a, b, seed, plankH = 16) => {
      const rnd = seeded(seed);
      for (let yy = y, row = 0; yy < y + h; yy += plankH, row++) {
        R(ctx, row % 2 ? a : b, x, yy, w, plankH);
        R(ctx, 'rgba(0,0,0,.22)', x, yy + plankH - 2, w, 2);
        for (let xx = x + ((row * 37) % 70); xx < x + w; xx += 70 + Math.floor(rnd() * 50)) R(ctx, 'rgba(0,0,0,.22)', xx, yy, 2, plankH - 2);
      }
    };
    const twinkles = (ctx, x, y, w, h, seed, n, cols) => {
      const rnd = seeded(seed);
      for (let i = 0; i < n; i++) {
        const px = x + Math.floor(rnd() * w / U) * U, py = y + Math.floor(rnd() * h / U) * U;
        const c = cols[Math.floor(rnd() * cols.length)];
        if (rnd() > 0.8) { R(ctx, c, px - U, py, U * 3, U); R(ctx, c, px, py - U, U, U * 3); } else R(ctx, c, px, py, U, U);
      }
    };
    const burst = (ctx, cx, cy, r, c1, c2) => {
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        for (let t = 1; t <= 3; t++) {
          const rr = (r * t) / 3;
          R(ctx, t === 3 ? c2 : c1, cx + Math.cos(a) * rr - U / 2, cy + Math.sin(a) * rr - U / 2, U, U);
        }
      }
      R(ctx, '#fff', cx - U / 2, cy - U / 2, U, U);
    };
    const tile = (x, w, step, fn) => { for (let xx = x - step; xx < x + w + step; xx += step) fn(xx); };

    const PUMPKIN = ['..g...', '.oEEo.', 'oEqEEo', 'oEqEEo', '.oooo.'];
    const PC = { g: '#3f8a3a', o: '#7a3a12', E: '#f7a33c', q: '#d9761c' };
    const BAT = ['k.....k', 'kk.k.kk', 'kkkkkkk', '.k.k.k.'];
    const CANDY = ['.p.ooo.p.', 'ppoyyyopp', '.p.ooo.p.'];
    const CORN = ['.x.', 'yyy', 'EEE', '.E.'];

    return {
      // 🎃 호박밭 방: 따뜻한 주황 벽에 호박 무늬 격자 + 덩굴 테두리, 짙은 나무 바닥
      hwWallPumpkin(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        vgrad(ctx, x, top, w, H, [[0, '#f2a34e'], [1, '#e2802f']]);
        clip(ctx, x, top, w, H, () => {
          for (let yy = top + 28, row = 0; yy < wb - 30; yy += 44, row++) tile(x + (row % 2) * 40, w, 80, (xx) => {
            R(ctx, 'rgba(255,255,255,.12)', xx + 6, yy - 16, U, U); R(ctx, 'rgba(255,255,255,.12)', xx + 46, yy + 6, U, U);
            stamp(ctx, PUMPKIN, PC, xx, yy);
          });
          // 위쪽 덩굴 테두리
          R(ctx, '#2f6a2e', x, top, w, 10);
          tile(x, w, 24, (xx) => { R(ctx, '#4f9a3c', xx, top + 10, 12, U); R(ctx, '#4f9a3c', xx + 8, top + 14, U, U); R(ctx, '#2f6a2e', xx + 16, top + 6, 8, U); });
        });
        baseboard(ctx, x, wb, w, '#5a3014');
        planks(ctx, x, wb, w, bottom - wb, '#4a2c18', '#553320', seed);
        // 바닥 위 짚 부스러기
        const rnd = seeded(seed + 3);
        for (let i = 0; i < w / 18; i++) R(ctx, '#c9a24a', x + rnd() * w, wb + 6 + rnd() * (bottom - wb - 10), U * 2, 2);
      },
      // 🪦 묘지 방: 달 뜬 밤, 안개 낀 언덕에 묘비 · 십자가 실루엣, 마른 나무
      hwWallGraveyard(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        vgrad(ctx, x, top, w, H, [[0, '#1c1a33'], [0.7, '#3a3656'], [1, '#55506e']]);
        clip(ctx, x, top, w, H, () => {
          twinkles(ctx, x, top, w, H * 0.5, seed, w / 22, ['#fff6c8', '#cfd6ff']);
          const mx = x + w - 110;
          ctx.save(); ctx.shadowColor = '#fff3c4'; ctx.shadowBlur = 30; R(ctx, '#fff3c4', mx + 6, top + 24, 18, 18); ctx.restore();
          stamp(ctx, ['.mmm.', 'mmmmm', 'mmmmm', 'mmmmm', '.mmm.'], { m: '#fff3c4' }, mx, top + 18, 6);
          stamp(ctx, ['..s', '...'], { s: '#e6d9a8' }, mx + 6, top + 26, 6);
          // 먼 언덕
          ctx.fillStyle = '#2a2740';
          for (let i = 0; i < w; i += U) { const h = 30 + Math.round(12 * Math.sin((i + seed * 9) / 70)); ctx.fillRect(x + i, wb - h, U, h); }
          // 묘비 · 십자가 · 나무
          const rnd = seeded(seed);
          for (let xx = x + 20; xx < x + w; xx += 56 + Math.floor(rnd() * 40)) {
            const t = rnd(), base = wb - 22 - Math.floor(rnd() * 10);
            if (t < 0.45) stamp(ctx, ['.ooo.', 'ooooo', 'oo.oo', 'ooooo', 'ooooo', 'ooooo'], { o: '#1a1828' }, xx, base - 24);
            else if (t < 0.8) stamp(ctx, ['.o.', 'ooo', '.o.', '.o.', '.o.'], { o: '#1a1828' }, xx, base - 20);
            else stamp(ctx, ['o...o..', '.o.o..o', '..oo.o.', '...oo..', '...o...', '...o...', '..ooo..'], { o: '#14121f' }, xx, base - 28, 6);
          }
          // 안개
          for (let i = 0; i < 3; i++) R(ctx, 'rgba(200,205,230,.10)', x, wb - 30 + i * 8, w, 6);
        });
        baseboard(ctx, x, wb, w, '#1e1c2c');
        R(ctx, '#2c3326', x, wb, w, bottom - wb);
        const rnd = seeded(seed + 1);
        for (let i = 0; i < w / 6; i++) { const px = x + Math.floor(rnd() * w / U) * U, py = wb + Math.floor(rnd() * (bottom - wb) / U) * U; R(ctx, rnd() > 0.5 ? '#3c4a32' : '#232a1e', px, py, U, U); }
        for (let i = 0; i < w / 30; i++) { const px = x + rnd() * w, py = wb + 4 + rnd() * (bottom - wb - 12); R(ctx, '#4f6640', px, py, U, U * 2); R(ctx, '#4f6640', px + U, py - U, U, U * 2); }
      },
      // 🦇 박쥐동굴 방: 울퉁불퉁 바위 벽 + 종유석, 눈이 빛나는 박쥐들, 자갈 바닥
      hwWallBat(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        R(ctx, '#2a2433', x, top, w, H);
        clip(ctx, x, top, w, H, () => {
          const rnd = seeded(seed);
          for (let yy = top; yy < wb; yy += 20) for (let xx = x - 20 + ((yy / 20) % 2) * 18; xx < x + w; xx += 36 + Math.floor(rnd() * 10)) {
            R(ctx, rnd() > 0.5 ? '#332c40' : '#2e2839', xx, yy, 34, 18);
            R(ctx, 'rgba(255,255,255,.05)', xx, yy, 34, 3);
          }
          // 종유석
          for (let xx = x; xx < x + w; xx += 28) { const len = 8 + Math.floor(rnd() * 5) * U; for (let k = 0; k < len; k += U) R(ctx, '#1d1826', xx + Math.floor(k / 12) * 2, top + k, Math.max(U, 14 - Math.floor(k / 4)), U); }
          // 박쥐
          for (let i = 0; i < w / 120; i++) {
            const bx = x + 30 + rnd() * (w - 60), by = top + 40 + rnd() * (H - 90);
            stamp(ctx, BAT, { k: '#120f18' }, bx, by);
            R(ctx, '#ffd84a', bx + 2 * U, by + 2 * U, 2, 2); R(ctx, '#ffd84a', bx + 4 * U + 2, by + 2 * U, 2, 2);
          }
        });
        baseboard(ctx, x, wb, w, '#1a1520');
        R(ctx, '#211c28', x, wb, w, bottom - wb);
        const rnd = seeded(seed + 2);
        for (let i = 0; i < w / 5; i++) R(ctx, ['#2e2838', '#3a3346', '#18141e'][i % 3], x + Math.floor(rnd() * w / U) * U, wb + Math.floor(rnd() * (bottom - wb) / U) * U, U * (1 + (i % 2)), U);
      },
      // 🏚️ 폐가 방: 빛바랜 다마스크 벽지, 찢어진 틈 사이 나무판, 구석 거미줄, 삐걱대는 바닥
      hwWallHaunted(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        R(ctx, '#4d3d52', x, top, w, H);
        clip(ctx, x, top, w, H, () => {
          for (let yy = top + 8, row = 0; yy < wb; yy += 36, row++) tile(x + (row % 2) * 24, w, 48, (xx) =>
            stamp(ctx, ['..d..', '.ddd.', 'dd.dd', '.ddd.', '..d..'], { d: '#5f4c66' }, xx, yy));
          // 세로 줄무늬
          tile(x, w, 48, (xx) => R(ctx, 'rgba(0,0,0,.08)', xx + 44, top, 4, H));
          // 찢어진 곳
          const rnd = seeded(seed);
          for (let i = 0; i < Math.max(1, w / 260); i++) {
            const tx = x + 60 + rnd() * (w - 160), ty = top + 30 + rnd() * (H - 90);
            stamp(ctx, ['..eeee..', '.ewwwwe.', 'ewwwwwwe', 'eWWWWWWe', 'ewwwwwwe', 'ewwwwwe.', '.eWWWWe.', '..eewe..', '....e...'], { e: '#8c7a92', w: '#7a5434', W: '#3e2716' }, tx, ty, 5);
          }
          // 구석 거미줄
          const web = (cx, dir) => { for (let k = 0; k < 6; k++) { R(ctx, 'rgba(230,230,240,.55)', cx + dir * k * 8, top + k * 2, 2, 40 - k * 6); R(ctx, 'rgba(230,230,240,.55)', cx, top + k * 7, dir * (44 - k * 7), 2); } };
          web(x, 1); web(x + w - 2, -1);
          // 삐뚤어진 액자
          ctx.save(); ctx.translate(x + w * 0.42, top + 70); ctx.rotate(0.12);
          R(ctx, '#3b2a1c', -26, -30, 52, 56); R(ctx, '#7a6a52', -20, -24, 40, 44); R(ctx, '#2a2230', -12, -14, 24, 26);
          R(ctx, '#e6e0d0', -6, -8, 4, 4); R(ctx, '#e6e0d0', 4, -8, 4, 4);
          ctx.restore();
        });
        baseboard(ctx, x, wb, w, '#2d2232');
        planks(ctx, x, wb, w, bottom - wb, '#3a2e3a', '#33283a', seed, 20);
        const rnd = seeded(seed + 5);
        for (let i = 0; i < w / 40; i++) R(ctx, 'rgba(0,0,0,.35)', x + rnd() * w, wb + 4 + Math.floor(rnd() * 4) * 20, 20 + rnd() * 30, 3);
      },
      // 🍬 캔디 방: 보라 벽에 사탕 · 캔디콘 무늬, 주황 · 검정 체크 바닥
      hwWallCandy(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        vgrad(ctx, x, top, w, H, [[0, '#6b2f78'], [1, '#55245f']]);
        clip(ctx, x, top, w, H, () => {
          tile(x, w, 40, (xx) => R(ctx, 'rgba(255,255,255,.06)', xx, top, 20, H));
          const cols = [{ p: '#ff8ad8', o: '#7a1f5a', y: '#ffd84a' }, { p: '#7fd6e8', o: '#1d5a6e', y: '#f28a1e' }, { p: '#b8f0c0', o: '#2f6a3a', y: '#ff6b6b' }];
          for (let yy = top + 20, row = 0; yy < wb - 20; yy += 40, row++) tile(x + (row % 2) * 36, w, 72, (xx) => {
            if ((Math.floor(xx / 72) + row) % 2) stamp(ctx, CANDY, cols[(row + Math.abs(Math.floor(xx / 72))) % 3], xx, yy);
            else stamp(ctx, CORN, { x: '#fff', y: '#ffd84a', E: '#f28a1e' }, xx + 12, yy - 2);
          });
          // 위쪽 스캘럽 장식
          tile(x, w, 24, (xx) => { R(ctx, '#f28a1e', xx, top, 24, 6); R(ctx, '#f28a1e', xx + 4, top + 6, 16, 4); R(ctx, '#111', xx + 10, top + 10, 4, 4); });
        });
        baseboard(ctx, x, wb, w, '#2a1030');
        const sq = 20;
        for (let yy = wb, r = 0; yy < bottom; yy += sq, r++) for (let xx = x, c = 0; xx < x + w; xx += sq, c++) R(ctx, (r + c) % 2 ? '#1f1a22' : '#f28a1e', xx, yy, sq, sq);
        R(ctx, 'rgba(0,0,0,.15)', x, wb, w, 4);
      },

      // ❄️ 설경 방: 눈 내리는 하늘, 눈 쌓인 전나무 숲, 눈밭 바닥
      xmasWallSnow(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        vgrad(ctx, x, top, w, H, [[0, '#9cc7e8'], [1, '#e3f1fb']]);
        clip(ctx, x, top, w, H, () => {
          ctx.fillStyle = '#d4e6f3';
          for (let i = 0; i < w; i += U) { const h = 40 + Math.round(16 * Math.sin((i + seed * 11) / 90)); ctx.fillRect(x + i, wb - h, U, h); }
          const rnd = seeded(seed);
          for (let xx = x + 10; xx < x + w; xx += 46 + Math.floor(rnd() * 30)) {
            const s = rnd() > 0.5 ? 6 : 5, base = wb - 10 - Math.floor(rnd() * 3) * U;
            stamp(ctx, ['...h...', '..hih..', '..iih..', '.hiiih.', '.iiiii.', 'hiihiih', 'iiiiiii', '...n...', '...n...'], { h: '#ffffff', i: '#2f6a46', n: '#5c3a26' }, xx, base - 9 * s, s);
          }
          ctx.fillStyle = '#f4f9fd';
          for (let i = 0; i < w; i += U) { const h = 14 + Math.round(5 * Math.sin((i + seed * 5) / 40)); ctx.fillRect(x + i, wb - h, U, h); }
          twinkles(ctx, x, top, w, H - 20, seed + 4, w / 9, ['#ffffff', '#ffffff', '#eaf4ff']);
        });
        R(ctx, '#f2f8fc', x, wb, w, bottom - wb);
        R(ctx, 'rgba(120,160,200,.18)', x, wb, w, 4);
        const rnd = seeded(seed + 6);
        for (let i = 0; i < w / 14; i++) R(ctx, 'rgba(150,185,215,.35)', x + Math.floor(rnd() * w / U) * U, wb + 8 + Math.floor(rnd() * (bottom - wb - 10) / U) * U, U * 3, U);
      },
      // 🔥 벽난로 방: 붉은 벽돌 벽 + 나무 징두리판, 위쪽 전나무 가랜드와 전구, 따뜻한 나무 바닥에 러그
      xmasWallFireplace(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        R(ctx, '#8a3a2c', x, top, w, H);
        clip(ctx, x, top, w, H, () => {
          for (let yy = top, row = 0; yy < wb; yy += 16, row++) {
            R(ctx, '#6a2a20', x, yy + 14, w, 2);
            for (let xx = x - 20 + (row % 2) * 20; xx < x + w; xx += 40) { R(ctx, '#6a2a20', xx, yy, 2, 14); R(ctx, row % 3 ? '#9a4434' : '#7e3326', xx + 4, yy + 2, 30, 4); }
          }
          // 나무 징두리판
          R(ctx, '#5c3a26', x, wb - 56, w, 56); R(ctx, '#7a4b28', x, wb - 56, w, 6);
          tile(x, w, 60, (xx) => { R(ctx, '#4a2e1c', xx + 8, wb - 44, 44, 30); R(ctx, '#6a4229', xx + 10, wb - 42, 40, 26); });
          // 가랜드 + 전구
          for (let xx = x; xx < x + w; xx += U) { const y = top + 10 + Math.round(8 * Math.sin(((xx - x) % 80) / 80 * Math.PI)); R(ctx, '#2f6a46', xx, y, U, 8); R(ctx, '#3f8a3a', xx, y + 2, U, 3); }
          tile(x, w, 40, (xx) => { const y = top + 18 + Math.round(8 * Math.sin(((xx - x + 400) % 80) / 80 * Math.PI)); R(ctx, ['#ff6b6b', '#ffd84a', '#7fd6e8'][Math.abs(Math.floor(xx / 40)) % 3], xx, y, U, U * 2); });
        });
        baseboard(ctx, x, wb, w, '#3b2414');
        planks(ctx, x, wb, w, bottom - wb, '#7a4b2c', '#6e4327', seed);
        const rw = Math.min(260, w * 0.4), rx = x + w / 2 - rw / 2, ry = wb + (bottom - wb) * 0.35;
        R(ctx, '#a3383a', rx, ry, rw, 30); R(ctx, '#f4cf4f', rx + 6, ry + 6, rw - 12, 3); R(ctx, '#f4cf4f', rx + 6, ry + 21, rw - 12, 3);
        tile(rx + 10, rw - 30, 20, (xx) => { if (xx > rx && xx < rx + rw - 14) R(ctx, '#3f8a3a', xx, ry + 12, 8, 6); });
      },
      // 💡 트리전구 방: 짙은 초록 벽에 색색 전구 줄이 겹겹이, 반짝이는 별, 체크무늬 카펫
      xmasWallLights(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        vgrad(ctx, x, top, w, H, [[0, '#14301f'], [1, '#1d4a2c']]);
        clip(ctx, x, top, w, H, () => {
          twinkles(ctx, x, top, w, H, seed, w / 16, ['rgba(255,240,180,.5)']);
          const cols = ['#ff5a5a', '#ffd84a', '#5ab8ff', '#7cf08a', '#ff8ad8'];
          for (let line = 0; line < 3; line++) {
            const y0 = top + 26 + line * 54, span = 120 + line * 20;
            for (let xx = x; xx < x + w; xx += 2) { const y = y0 + Math.round(18 * Math.sin(((xx - x + line * 40) % span) / span * Math.PI)); R(ctx, '#0b1a10', xx, y, 2, 2); }
            let n = 0;
            for (let xx = x + 10 + line * 12; xx < x + w; xx += 24, n++) {
              const y = y0 + Math.round(18 * Math.sin(((xx - x + line * 40) % span) / span * Math.PI));
              const c = cols[(n + line) % cols.length];
              ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = 10; R(ctx, c, xx - 2, y + 2, U + 2, U * 2); ctx.restore();
              R(ctx, '#333', xx - 1, y, U, 3); R(ctx, 'rgba(255,255,255,.6)', xx - 1, y + 3, 2, 3);
            }
          }
        });
        baseboard(ctx, x, wb, w, '#0e2416');
        R(ctx, '#7a1f2a', x, wb, w, bottom - wb);
        for (let xx = x; xx < x + w; xx += 24) R(ctx, 'rgba(20,60,30,.55)', xx, wb, 8, bottom - wb);
        for (let yy = wb + 8; yy < bottom; yy += 24) R(ctx, 'rgba(20,60,30,.55)', x, yy, w, 8);
        for (let xx = x + 11; xx < x + w; xx += 24) R(ctx, 'rgba(255,216,74,.35)', xx, wb, 2, bottom - wb);
      },
      // 🎁 선물상자 방: 포장지 같은 벽지 (초록 바탕 + 금색 리본 줄 + 작은 선물 · 별 무늬), 빨강 · 초록 체크 바닥
      xmasWallGift(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        R(ctx, '#2a6a4e', x, top, w, H);
        clip(ctx, x, top, w, H, () => {
          tile(x, w, 120, (xx) => { R(ctx, '#e6b33a', xx + 56, top, 8, H); R(ctx, '#ffd84a', xx + 58, top, 2, H); });
          R(ctx, '#e6b33a', x, top + H * 0.45, w, 8); R(ctx, '#ffd84a', x, top + H * 0.45 + 2, w, 2);
          const gift = ['.y.y.', 'ooyoo', 'rryrr', 'rryrr', 'rryrr'];
          for (let yy = top + 16, row = 0; yy < wb - 20; yy += 40, row++) tile(x + 20 + (row % 2) * 30, w, 60, (xx) => {
            if ((row + Math.abs(Math.floor(xx / 60))) % 2) stamp(ctx, gift, { y: '#ffd84a', o: '#a3383a', r: '#e0564f' }, xx, yy);
            else stamp(ctx, ['..x..', '.xxx.', 'xxxxx', '.x.x.'], { x: 'rgba(255,255,255,.75)' }, xx, yy + 2);
          });
          // 가운데 큰 리본 매듭
          tile(x, w, 240, (xx) => stamp(ctx, ['yy..yy', 'yyyyyy', '.yyyy.', 'y.yy.y'], { y: '#ffd84a' }, xx + 106, top + H * 0.45 - 14));
        });
        baseboard(ctx, x, wb, w, '#1b4232');
        R(ctx, '#c9433d', x, wb, w, bottom - wb);
        for (let xx = x; xx < x + w; xx += 32) R(ctx, 'rgba(30,90,50,.6)', xx, wb, 12, bottom - wb);
        for (let yy = wb + 10; yy < bottom; yy += 32) R(ctx, 'rgba(30,90,50,.6)', x, yy, w, 12);
        for (let yy = wb + 15; yy < bottom; yy += 32) R(ctx, 'rgba(255,255,255,.25)', x, yy, w, 2);
      },
      // 🌌 북극 방: 오로라가 일렁이는 밤하늘, 빙산 실루엣, 반짝이는 얼음 바닥
      xmasWallNorthPole(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        vgrad(ctx, x, top, w, H, [[0, '#0e1636'], [1, '#22355e']]);
        clip(ctx, x, top, w, H, () => {
          twinkles(ctx, x, top, w, H * 0.8, seed, w / 12, ['#ffffff', '#cfe6ff', '#fff6c8']);
          const bands = [['rgba(90,240,170,.35)', 0, 30], ['rgba(80,200,255,.28)', 22, 40], ['rgba(180,120,255,.22)', 44, 26]];
          for (const [c, off, amp] of bands) for (let xx = x; xx < x + w; xx += U) {
            const y = top + 30 + off + Math.round(amp * Math.sin((xx - x) / 110 + off)) ;
            R(ctx, c, xx, y, U, 26 + Math.round(10 * Math.sin((xx - x) / 37)));
          }
          ctx.fillStyle = '#cfe6f7';
          const rnd = seeded(seed);
          for (let xx = x; xx < x + w; xx += 90 + Math.floor(rnd() * 40)) {
            const h = 30 + Math.floor(rnd() * 26), bw = 60 + Math.floor(rnd() * 40);
            for (let k = 0; k < bw; k += U) { const hh = Math.round(h * (1 - Math.abs(k - bw / 2) / (bw / 2)) ** 0.7); R(ctx, '#cfe6f7', xx + k, wb - hh, U, hh); R(ctx, '#a9cbe6', xx + k + (k > bw / 2 ? 0 : 0), wb - hh * 0.4, U, hh * 0.4); }
          }
        });
        baseboard(ctx, x, wb, w, '#8fb6d6');
        vgrad(ctx, x, wb, w, bottom - wb, [[0, '#d8ecfa'], [1, '#b6d8f0']]);
        const rnd = seeded(seed + 9);
        for (let i = 0; i < w / 50; i++) { const cx = x + rnd() * w, cy = wb + 10 + rnd() * (bottom - wb - 20); R(ctx, 'rgba(255,255,255,.8)', cx, cy, 20 + rnd() * 20, 2); R(ctx, 'rgba(140,180,215,.6)', cx + 6, cy + 4, 12, 2); }
      },

      // 🎆 불꽃놀이 방: 밤하늘 가득 불꽃, 아래 도시 불빛 실루엣, 기와 같은 어두운 바닥
      nyWallFirework(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        vgrad(ctx, x, top, w, H, [[0, '#0e0e2a'], [1, '#2a2050']]);
        clip(ctx, x, top, w, H, () => {
          twinkles(ctx, x, top, w, H * 0.7, seed, w / 20, ['#ffffff']);
          const pal = [['#ffd84a', '#ff8a1e'], ['#ff6bd0', '#b04fd6'], ['#7cf0ff', '#3a8aff'], ['#9cff7a', '#3ac06a'], ['#ff6b6b', '#ffd84a']];
          const rnd = seeded(seed);
          for (let i = 0; i < Math.max(3, w / 110); i++) {
            const [c1, c2] = pal[i % pal.length];
            burst(ctx, x + 40 + rnd() * (w - 80), top + 36 + rnd() * (H - 110), 22 + rnd() * 16, c1, c2);
          }
          // 도시 실루엣 + 창문 불빛
          for (let xx = x; xx < x + w; xx += 24) {
            const h = 20 + Math.floor(rnd() * 5) * 8;
            R(ctx, '#120f24', xx, wb - h, 22, h);
            for (let wy = wb - h + 6; wy < wb - 6; wy += 10) for (let wx = xx + 4; wx < xx + 18; wx += 8) if (rnd() > 0.55) R(ctx, '#ffd98a', wx, wy, 4, 4);
          }
        });
        baseboard(ctx, x, wb, w, '#141024');
        R(ctx, '#2c2840', x, wb, w, bottom - wb);
        for (let yy = wb, r = 0; yy < bottom; yy += 14, r++) { R(ctx, '#3a3552', x, yy, w, 3); for (let xx = x + (r % 2) * 14; xx < x + w; xx += 28) R(ctx, '#1e1b30', xx, yy + 3, 3, 11); }
      },
      // ✨ 금빛 방: 금색 바탕에 전통 구름무늬, 붉은 옻칠 징두리판, 반들반들한 짙은 마루
      nyWallGold(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        vgrad(ctx, x, top, w, H, [[0, '#d9a63a'], [1, '#b8862a']]);
        clip(ctx, x, top, w, H, () => {
          const CLOUD = ['..ccc.....', '.c...c.cc.', 'c..c..c..c', 'c.c.c.....', '.c..c.cccc', '..cc......'];
          for (let yy = top + 14, row = 0; yy < wb - 60; yy += 38, row++) tile(x + (row % 2) * 50, w, 100, (xx) => stamp(ctx, CLOUD, { c: '#f7d77a' }, xx, yy));
          // 붉은 징두리판 + 금 테두리
          R(ctx, '#8e1f24', x, wb - 50, w, 50); R(ctx, '#ffd23f', x, wb - 50, w, 4); R(ctx, '#ffd23f', x, wb - 12, w, 2);
          tile(x, w, 40, (xx) => stamp(ctx, ['.y.', 'y.y', '.y.'], { y: '#e6b33a' }, xx + 14, wb - 36));
          R(ctx, '#ffd23f', x, top, w, 4);
        });
        baseboard(ctx, x, wb, w, '#5a1418');
        planks(ctx, x, wb, w, bottom - wb, '#6a2c1c', '#5e2618', seed, 18);
        for (let xx = x; xx < x + w; xx += 80) R(ctx, 'rgba(255,220,150,.10)', xx, wb, 30, bottom - wb);
      },
      // 🌅 해돋이 방: 남색에서 분홍 · 주황으로 물드는 하늘, 떠오르는 해, 산 능선과 바다, 전망대 나무 데크
      nyWallSunrise(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        vgrad(ctx, x, top, w, H, [[0, '#2a2e6a'], [0.45, '#d56a8a'], [0.8, '#ffb35a'], [1, '#ffd98a']]);
        clip(ctx, x, top, w, H, () => {
          twinkles(ctx, x, top, w, H * 0.25, seed, w / 40, ['rgba(255,255,255,.8)']);
          const sx = x + w / 2, sy = wb - 34, r = 44;
          ctx.save(); ctx.shadowColor = '#ffe08a'; ctx.shadowBlur = 40;
          for (let yy = -r; yy <= 0; yy += U) { const half = Math.floor(Math.sqrt(r * r - yy * yy) / U) * U; R(ctx, '#ff7a3a', sx - half, sy + yy, half * 2, U); }
          ctx.restore();
          // 산 능선 (양쪽)
          for (let i = 0; i < w; i += U) {
            const d = Math.abs(i - w / 2) / (w / 2);
            const h = Math.round(d * 60 + 8 * Math.sin(i / 23)) ;
            if (h > 0) { R(ctx, '#3a2a4e', x + i, wb - 30 - h * 0.7, U, h * 0.7 + 4); R(ctx, '#251c38', x + i, wb - 30 - h * 0.35, U, h * 0.35 + 4); }
          }
          // 바다 + 햇빛 기둥
          R(ctx, '#3e4f8a', x, wb - 30, w, 30);
          for (let yy = wb - 28; yy < wb; yy += 6) { const ww = 70 - (wb - yy) * 1.2; R(ctx, '#ffb35a', sx - ww / 2, yy, ww, 3); R(ctx, 'rgba(255,255,255,.25)', x, yy + 3, w, 1); }
        });
        baseboard(ctx, x, wb, w, '#5c3a26');
        planks(ctx, x, wb, w, bottom - wb, '#b07a4a', '#a06d40', seed, 16);
        R(ctx, '#7a4b28', x, wb - 6, w, 6);
        tile(x, w, 50, (xx) => R(ctx, '#7a4b28', xx, wb - 24, 6, 18));
        R(ctx, '#8a5a32', x, wb - 26, w, 4);
      },
      // 🎊 색종이 방: 분홍 벽에 삼각 깃발 줄 · 꼬불꼬불 종이 테이프 · 흩날리는 색종이, 하늘색 바닥 위 색종이
      nyWallConfetti(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        vgrad(ctx, x, top, w, H, [[0, '#fbc4d4'], [1, '#f6a9bf']]);
        const cols = ['#ff5a7a', '#ffd84a', '#5ab8ff', '#7cf08a', '#b79be8', '#ff9a3c'];
        clip(ctx, x, top, w, H, () => {
          tile(x, w, 30, (xx) => R(ctx, 'rgba(255,255,255,.18)', xx, top, 10, H));
          // 꼬불 테이프
          for (let k = 0; k < 4; k++) for (let yy = top; yy < wb; yy += 2) R(ctx, cols[k + 1], x + (k + 0.5) * w / 4 + Math.round(10 * Math.sin(yy / 9 + k)), yy, 3, 2);
          // 흩날리는 색종이
          const rnd = seeded(seed);
          for (let i = 0; i < w / 6; i++) { const c = cols[i % cols.length]; const px = x + rnd() * w, py = top + 20 + rnd() * (H - 30); if (i % 3) R(ctx, c, px, py, 6, 3); else R(ctx, c, px, py, 3, 6); }
          // 삼각 깃발 줄
          for (let xx = x; xx < x + w; xx += 2) R(ctx, '#7a4b28', xx, top + 10 + Math.round(10 * Math.sin(((xx - x) % 160) / 160 * Math.PI)), 2, 2);
          let n = 0;
          for (let xx = x + 6; xx < x + w; xx += 20, n++) {
            const y = top + 12 + Math.round(10 * Math.sin(((xx - x) % 160) / 160 * Math.PI));
            for (let k = 0; k < 4; k++) R(ctx, cols[n % cols.length], xx + k * 2, y + k * U, 16 - k * 4, U);
          }
        });
        baseboard(ctx, x, wb, w, '#d9708f');
        R(ctx, '#9fe0f0', x, wb, w, bottom - wb);
        for (let yy = wb + 20; yy < bottom; yy += 20) R(ctx, 'rgba(255,255,255,.35)', x, yy, w, 2);
        const rnd = seeded(seed + 7);
        for (let i = 0; i < w / 10; i++) R(ctx, cols[i % cols.length], x + rnd() * w, wb + 6 + rnd() * (bottom - wb - 10), 6, 3);
      },
      // 🏮 등불 방: 한옥 나무 기둥 · 서까래 사이 은은히 빛나는 창호지 문살, 청사초롱이 걸린 따뜻한 마루
      nyWallLantern(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        R(ctx, '#3a2418', x, top, w, H);
        clip(ctx, x, top, w, H, () => {
          const seg = 160;
          tile(x, w, seg, (xx) => {
            // 창호지 문 (격자 문살)
            const dx = xx + 18, dy = top + 40, dw = seg - 36, dh = H - 60;
            R(ctx, '#f5e2b0', dx, dy, dw, dh);
            ctx.save(); ctx.shadowColor = '#ffcf7a'; ctx.shadowBlur = 18; R(ctx, 'rgba(255,214,140,.35)', dx + 8, dy + 8, dw - 16, dh - 16); ctx.restore();
            for (let gx = dx; gx <= dx + dw; gx += dw / 6) R(ctx, '#6b4426', gx - 2, dy, 4, dh);
            for (let gy = dy; gy <= dy + dh; gy += dh / 6) R(ctx, '#6b4426', dx, gy - 2, dw, 4);
            R(ctx, '#2a180e', xx, top, 14, H);   // 기둥
            R(ctx, '#4a2e1c', xx + 2, top, 4, H);
          });
          // 서까래
          R(ctx, '#2a180e', x, top, w, 26);
          tile(x, w, 30, (xx) => { R(ctx, '#4a2e1c', xx, top + 4, 18, 18); R(ctx, '#a3383a', xx + 6, top + 10, 6, 6); });
          // 청사초롱
          tile(x + 80, w, seg, (xx) => {
            R(ctx, '#2a180e', xx - 1, top + 26, 2, 14);
            ctx.save(); ctx.shadowColor = '#ffb35a'; ctx.shadowBlur = 16;
            stamp(ctx, ['.yyy.', 'rrrrr', 'rreer', 'rrrrr', 'yyyyy', 'bbbbb', 'bbeeb', '.yyy.', '..r..'], { y: '#ffd23f', r: '#d33a3a', e: '#ffe9a8', b: '#2f5fb8' }, xx - 10, top + 40);
            ctx.restore();
          });
        });
        baseboard(ctx, x, wb, w, '#2a180e');
        planks(ctx, x, wb, w, bottom - wb, '#9a6236', '#8c5830', seed, 14);
        for (let xx = x; xx < x + w; xx += 120) R(ctx, 'rgba(255,210,140,.12)', xx + 20, wb, 60, bottom - wb);
      },

      // ---------------- 분위기 벽지 (0.13.5, 언제나 상점에) — 불을 끄면 일반 방처럼 어두워짐
      // 🪵 원목 패널 방: 호두나무 세로 판넬 + 몰딩, 짙은 마루
      moodWalnut(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top, rnd = seeded(seed);
        R(ctx, '#5a3a26', x, top, w, H);
        clip(ctx, x, top, w, H, () => {
          tile(x, w, 36, (xx) => {
            R(ctx, rnd() > 0.5 ? '#5f3e29' : '#553522', xx, top, 36, H);
            R(ctx, 'rgba(0,0,0,.28)', xx, top, 2, H);
            R(ctx, 'rgba(255,220,170,.06)', xx + 2, top, 3, H);
            for (let k = 0; k < 3; k++) R(ctx, 'rgba(0,0,0,.08)', xx + 8 + Math.floor(rnd() * 22), top + Math.floor(rnd() * H), 2, 18 + Math.floor(rnd() * 30));   // 나뭇결
          });
          R(ctx, '#3e2618', x, top, w, 8); R(ctx, '#7a5236', x, top + 8, w, 2);                       // 천장 몰딩
          const rail = top + Math.round(H * 0.62);
          R(ctx, '#3e2618', x, rail, w, 6); R(ctx, '#80583a', x, rail, w, 2);                       // 허리 몰딩
          tile(x + 18, w, 72, (xx) => { R(ctx, 'rgba(0,0,0,.14)', xx, rail + 14, 52, wb - rail - 26); R(ctx, 'rgba(255,220,170,.05)', xx + 2, rail + 16, 48, 2); });
        });
        baseboard(ctx, x, wb, w, '#2e1c12');
        planks(ctx, x, wb, w, bottom - wb, '#4a2e1e', '#402818', seed, 14);
      },
      // 🧱 벽돌 카페 방: 붉은 벽돌 + 줄눈, 위쪽은 은은한 조명 그라데이션, 진한 마루
      moodBrick(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top, rnd = seeded(seed + 1);
        R(ctx, '#d8c9b6', x, top, w, H);   // 줄눈
        clip(ctx, x, top, w, H, () => {
          const bh = 12, bw = 32;
          for (let yy = top, row = 0; yy < wb; yy += bh, row++) tile(x + (row % 2 ? bw / 2 : 0), w, bw, (xx) => {
            const c = ['#a4513a', '#984a35', '#ae5a40', '#8e4330', '#b0634a'][Math.floor(rnd() * 5)];
            R(ctx, c, xx + 1, yy + 1, bw - 2, bh - 2);
            R(ctx, 'rgba(255,230,200,.10)', xx + 1, yy + 1, bw - 2, 2);
            if (rnd() > 0.85) R(ctx, 'rgba(0,0,0,.12)', xx + 4 + rnd() * 18, yy + 4, 6, 3);
          });
          vgrad(ctx, x, top, w, H, [[0, 'rgba(30,14,8,.40)'], [0.45, 'rgba(30,14,8,.05)'], [1, 'rgba(30,14,8,.25)']]);
        });
        baseboard(ctx, x, wb, w, '#2b1a12');
        planks(ctx, x, wb, w, bottom - wb, '#5a3a28', '#4e3222', seed, 14);
      },
      // 🌲 숲 서재 방: 짙은 초록 벽 + 금빛 가는 줄 + 아래쪽 나무 판넬, 헤링본 바닥
      moodForest(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        vgrad(ctx, x, top, w, H, [[0, '#1f3a2e'], [1, '#2b4d3c']]);
        clip(ctx, x, top, w, H, () => {
          tile(x, w, 44, (xx) => R(ctx, 'rgba(220,190,110,.10)', xx, top, 2, H));          // 금빛 세로 줄
          tile(x + 22, w, 44, (xx) => { for (let yy = top + 20; yy < wb; yy += 40) R(ctx, 'rgba(220,190,110,.16)', xx - 2, yy, 4, 4); });
          const rail = top + Math.round(H * 0.6);
          R(ctx, '#3a2618', x, rail, w, H - (rail - top));
          R(ctx, '#c9a24a', x, rail, w, 2); R(ctx, '#2a1a10', x, rail + 2, w, 4);
          tile(x + 10, w, 60, (xx) => { R(ctx, '#46301f', xx, rail + 14, 46, wb - rail - 24); R(ctx, 'rgba(0,0,0,.2)', xx, rail + 14, 46, 2); });
        });
        baseboard(ctx, x, wb, w, '#24170e');
        // 헤링본 마루
        R(ctx, '#6e4a2e', x, wb, w, bottom - wb);
        clip(ctx, x, wb, w, bottom - wb, () => {
          for (let yy = wb, row = 0; yy < bottom; yy += 8, row++) tile(x + (row % 2) * 12, w, 24, (xx) => {
            R(ctx, row % 2 ? '#7a5434' : '#644228', xx, yy, 12, 8);
            R(ctx, 'rgba(0,0,0,.2)', xx + 11, yy, 1, 8);
          });
        });
      },
      // 🍷 와인 벨벳 방: 버건디 다마스크 무늬 + 금빛 몰딩, 짙은 마루
      moodVelvet(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        vgrad(ctx, x, top, w, H, [[0, '#4a1622'], [1, '#5e1d2b']]);
        clip(ctx, x, top, w, H, () => {
          const D = ['..x..', '.x.x.', 'x.o.x', '.x.x.', '..x..'];
          for (let yy = top + 18, row = 0; yy < wb - 12; yy += 34, row++) tile(x + (row % 2) * 24, w, 48, (xx) => stamp(ctx, D, { x: 'rgba(240,180,120,.16)', o: 'rgba(240,190,120,.28)' }, xx, yy));
          R(ctx, '#2e0c14', x, top, w, 6); R(ctx, '#b8893a', x, top + 6, w, 2);
          vgrad(ctx, x, top, w, H, [[0, 'rgba(0,0,0,.25)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.2)']]);
        });
        R(ctx, '#b8893a', x, wb - 10, w, 2);
        baseboard(ctx, x, wb, w, '#24080e');
        planks(ctx, x, wb, w, bottom - wb, '#3e2418', '#361e14', seed, 14);
      },
      // 🕯️ 빈티지 줄무늬 방: 따뜻한 베이지 줄무늬 벽지 + 흰 판넬 웨인스코팅
      moodVintage(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        R(ctx, '#e8d6b8', x, top, w, H);
        clip(ctx, x, top, w, H, () => {
          tile(x, w, 28, (xx) => { R(ctx, '#dcc5a2', xx, top, 12, H); R(ctx, 'rgba(160,110,70,.18)', xx + 18, top, 2, H); });
          tile(x + 6, w, 28, (xx) => { for (let yy = top + 16; yy < wb; yy += 28) R(ctx, 'rgba(160,90,70,.25)', xx, yy, U, U); });   // 작은 꽃점
          const rail = top + Math.round(H * 0.6);
          R(ctx, '#f2ead8', x, rail, w, H - (rail - top));
          R(ctx, '#fff8ea', x, rail, w, 3); R(ctx, 'rgba(0,0,0,.12)', x, rail + 3, w, 2);
          tile(x + 10, w, 56, (xx) => { R(ctx, 'rgba(120,90,60,.16)', xx, rail + 14, 42, 2); R(ctx, 'rgba(120,90,60,.16)', xx, rail + 14, 2, wb - rail - 24); R(ctx, 'rgba(255,255,255,.7)', xx + 42, rail + 14, 2, wb - rail - 24); R(ctx, 'rgba(255,255,255,.7)', xx, wb - 10, 44, 2); });
          vgrad(ctx, x, top, w, H, [[0, 'rgba(90,50,20,.18)'], [0.4, 'rgba(90,50,20,0)']]);
        });
        baseboard(ctx, x, wb, w, '#8a6a4a');
        planks(ctx, x, wb, w, bottom - wb, '#a8754a', '#9c6c42', seed, 14);
      },
      // 🏮 한옥 방: 한지 창살 벽 + 나무 기둥, 노란 장판 바닥 (따뜻하고 차분하게)
      moodHanok(ctx, x, top, w, wb, bottom, seed) {
        const H = wb - top;
        vgrad(ctx, x, top, w, H, [[0, '#efe2c4'], [1, '#e6d4ae']]);
        clip(ctx, x, top, w, H, () => {
          const seg = 150;
          tile(x, w, seg, (xx) => {
            // 창살 (한지 위 가는 나무 격자)
            for (let gx = xx + 22; gx < xx + seg - 18; gx += 16) R(ctx, 'rgba(110,70,40,.35)', gx, top + 24, 2, H - 52);
            for (let gy = top + 24; gy < wb - 26; gy += 16) R(ctx, 'rgba(110,70,40,.35)', xx + 22, gy, seg - 42, 2);
            R(ctx, '#5a3a22', xx, top, 12, H); R(ctx, '#7a5232', xx + 2, top, 3, H);   // 기둥
          });
          R(ctx, '#5a3a22', x, top, w, 14); R(ctx, '#7a5232', x, top + 14, w, 3);     // 인방
          R(ctx, '#5a3a22', x, wb - 22, w, 10);
        });
        baseboard(ctx, x, wb, w, '#4a2e1a');
        // 장판: 노르스름한 큰 네모
        R(ctx, '#d9a95a', x, wb, w, bottom - wb);
        clip(ctx, x, wb, w, bottom - wb, () => {
          for (let yy = wb; yy < bottom; yy += 30) R(ctx, 'rgba(120,70,20,.18)', x, yy, w, 2);
          for (let yy = wb, row = 0; yy < bottom; yy += 30, row++) tile(x + (row % 2) * 45, w, 90, (xx) => R(ctx, 'rgba(120,70,20,.18)', xx, yy, 2, 30));
          R(ctx, 'rgba(255,240,200,.15)', x, wb, w, 6);
        });
      },
    };
  })();

  const THEMES = {
    // 실내 (단색 벽, 나무 바닥)
    basic:   { name: '크림 방',     kind: 'room', wall: '#f3e6d3', floor: '#c99a6b' },
    sky:     { name: '하늘 방',     kind: 'room', wall: '#cfe6f7', floor: '#b8916b' },
    mint:    { name: '민트 방',     kind: 'room', wall: '#d3efe3', floor: '#a7835e' },
    peach:   { name: '복숭아 방',   kind: 'room', wall: '#fbd9cf', floor: '#c48b6a' },
    lavender:{ name: '라벤더 방',   kind: 'room', wall: '#e2d8f3', floor: '#a88f7a' },
    navy:    { name: '밤 방',       kind: 'room', wall: '#2f3456', floor: '#5b4a5e' },
    // 분위기 벽지 (그림은 EV 쪽에서, 불 끄기는 일반 방처럼)
    moodWalnut:  { name: '원목 패널 방',  kind: 'room', paint: true, wall: '#5a3a26', floor: '#4a2e1e' },
    moodBrick:   { name: '벽돌 카페 방',  kind: 'room', paint: true, wall: '#a4513a', floor: '#5a3a28' },
    moodForest:  { name: '숲 서재 방',    kind: 'room', paint: true, wall: '#1f3a2e', floor: '#6e4a2e' },
    moodVelvet:  { name: '와인 벨벳 방',  kind: 'room', paint: true, wall: '#4a1622', floor: '#3e2418' },
    moodVintage: { name: '빈티지 줄무늬 방', kind: 'room', paint: true, wall: '#e8d6b8', floor: '#a8754a' },
    moodHanok:   { name: '한옥 방',       kind: 'room', paint: true, wall: '#efe2c4', floor: '#d9a95a' },
    // 바깥
    meadowDay:   { name: '초원 (낮)',     kind: 'meadow', night: false },
    meadowNight: { name: '초원 (밤)',     kind: 'meadow', night: true },
    roofNight:   { name: '옥상 (밤하늘)', kind: 'roof', night: true },
    roofDay:     { name: '옥상 (낮)',     kind: 'roof', night: false },
    // 🎃 할로윈 이벤트 전용
    hwWallPumpkin:   { name: '호박밭 방',   kind: 'event', wall: '#f0a24a', floor: '#4a3020' },
    hwWallGraveyard: { name: '묘지 방',     kind: 'event', wall: '#2a2a38', floor: '#3a3a30' },
    hwWallBat:       { name: '박쥐동굴 방', kind: 'event', wall: '#241f2e', floor: '#17141c' },
    hwWallHaunted:   { name: '폐가 방',     kind: 'event', wall: '#4a3a4a', floor: '#2e2436' },
    hwWallCandy:     { name: '캔디 방',     kind: 'event', wall: '#6a2e5a', floor: '#e0564f' },
    // 🎄 크리스마스 이벤트 전용
    xmasWallSnow:      { name: '설경 방',     kind: 'event', wall: '#dff0fa', floor: '#eef6fb' },
    xmasWallFireplace: { name: '벽난로 방',   kind: 'event', wall: '#7a2e2a', floor: '#5c3a26' },
    xmasWallLights:    { name: '트리전구 방', kind: 'event', wall: '#1c3a2a', floor: '#2a5a3a' },
    xmasWallGift:      { name: '선물상자 방', kind: 'event', wall: '#2a5a4a', floor: '#c9962c' },
    xmasWallNorthPole: { name: '북극 방',     kind: 'event', wall: '#2a3a5a', floor: '#cfe6f7' },
    // 🧧 새해 이벤트 전용
    nyWallFirework: { name: '불꽃놀이 방', kind: 'event', wall: '#1a1a38', floor: '#3a2a5a' },
    nyWallGold:     { name: '금빛 방',     kind: 'event', wall: '#9c6f1e', floor: '#f4cf4f' },
    nyWallSunrise:  { name: '해돋이 방',   kind: 'event', wall: '#f0a24a', floor: '#e0564f' },
    nyWallConfetti: { name: '색종이 방',   kind: 'event', wall: '#f6a9bf', floor: '#7fd6e8' },
    nyWallLantern:  { name: '등불 방',     kind: 'event', wall: '#3a2418', floor: '#a3383a' },
  };

  function drawFloorArea(ctx, themeId, x, top, w, wallBottom, bottom, seed) {
    const t = THEMES[themeId] || THEMES.basic;
    if ((t.kind === 'event' || t.paint) && EV[themeId]) { EV[themeId](ctx, x, top, w, wallBottom, bottom, seed); return; }
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
