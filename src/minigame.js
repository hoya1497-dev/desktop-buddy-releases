// 미니게임: 틱택토 · 가위바위보 · 바구니 받기
// AI와 하기는 이 창 안에서만, 친구와 대결은 서버가 판정해요.
(() => {
  const $ = (id) => document.getElementById(id);
  const H = window.HomeCore;
  if (!H || H.isMini) return;
  const srv = (m) => buddy.send('srv', m);
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif';
  const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

  const GAMES = {
    ttt: { name: '틱택토', icon: '⭕', rule: '3×3 칸에 번갈아 표시해서, 가로·세로·대각선으로 먼저 3개를 이으면 이겨요.' },
    rps: { name: '가위바위보', icon: '✊', rule: '먼저 2번 이기면 승리! 비기면 그 판은 다시 해요.' },
    basket: { name: '바구니 받기', icon: '🧺', rule: '떨어지는 음식을 바구니로 받으면 1점! 폭탄을 받거나 음식을 3번 놓치면 끝나요. 마우스나 ←→ 키로 움직여요.' },
  };
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const RPS_ICON = { r: '✊', p: '✋', s: '✌️' };
  const RPS_NAME = { r: '바위', p: '보', s: '가위' };
  const BEATS = { r: 's', p: 'r', s: 'p' };

  let pick = 'ttt';
  let cur = null;   // 지금 하는 게임

  function el(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e[k] = v;
      else if (v != null && v !== false) e[k] = v;
    }
    for (const c of kids.flat()) if (c != null) e.append(c);
    return e;
  }

  // ------------------------------------------------------------ 미니게임 탭
  document.querySelectorAll('#gameTabs button').forEach((b) => {
    b.onclick = () => {
      pick = b.dataset.game;
      document.querySelectorAll('#gameTabs button').forEach((x) => x.classList.toggle('active', x === b));
      renderTab();
    };
  });
  function people() {
    const S = H.S;
    if (!S || !S.session) return [];
    const me = S.session.user.username;
    const map = new Map();
    for (const p of S.peers || []) if (p.username && p.username !== me) map.set(p.username, { ...p, where: '같은 집' });
    for (const f of S.friends?.friends || []) if (f.online && !map.has(f.username)) map.set(f.username, { ...f, where: '친구 · 접속 중' });
    return [...map.values()];
  }
  function renderTab() {
    const g = GAMES[pick];
    $('gameRule').textContent = `${g.icon} ${g.rule}`;
    $('mgAiBtn').textContent = `🤖 AI랑 ${g.name} 하기`;
    const ul = $('mgPeople'); ul.textContent = '';
    const list = people();
    if (!list.length) ul.append(el('li', { class: 'note', text: '지금 같이 할 사람이 없어요. 친구 집에 놀러 가거나 친구가 접속하면 보여요.' }));
    for (const p of list) {
      const dot = el('span', { class: 'dot' }); dot.style.background = p.color || '#ccc';
      ul.append(el('li', {}, dot,
        el('span', { class: 'who' }, el('b', { text: p.nickname }), el('small', { text: `@${p.username} · ${p.where}` })),
        el('button', { class: 'primary small', text: '도전!', style: 'margin-left:auto', onclick: () => { srv({ type: 'mg-invite', game: pick, to: p.username }); } })));
    }
  }
  $('mgAiBtn').onclick = () => startAi(pick);
  buddy.on('home-state', () => { if ($('pane-games').classList.contains('active')) renderTab(); });
  document.querySelector('.tabs button[data-tab=games]').addEventListener('click', renderTab);
  renderTab();

  // ------------------------------------------------------------ 대결 신청 받기
  let invite = null;
  function showInvite(m) {
    invite = m;
    $('mgInviteText').textContent = `${m.from.nickname}(@${m.from.username})님이 ${GAMES[m.game]?.icon || ''} ${GAMES[m.game]?.name || ''} 대결을 신청했어요`;
    $('mgInviteBox').hidden = false;
    clearTimeout(showInvite.timer);
    showInvite.timer = setTimeout(() => { $('mgInviteBox').hidden = true; invite = null; }, 60_000);
  }
  $('mgInviteYes').onclick = () => { if (invite) srv({ type: 'mg-answer', id: invite.id, accept: true }); $('mgInviteBox').hidden = true; invite = null; };
  $('mgInviteNo').onclick = () => { if (invite) srv({ type: 'mg-answer', id: invite.id, accept: false }); $('mgInviteBox').hidden = true; invite = null; };

  // ------------------------------------------------------------ 게임 창
  function openModal(game) {
    $('mgModal').hidden = false;
    $('mgTitle').textContent = `${GAMES[game].icon} ${GAMES[game].name}`;
    $('mgArea').textContent = '';
    $('mgCanvas').hidden = game !== 'basket';
    $('mgAgain').hidden = true;
    $('mgStatus').textContent = '';
  }
  function closeModal() {
    stopBasket();
    $('mgModal').hidden = true;
    cur = null;
  }
  $('mgClose').onclick = () => {
    if (cur && cur.mode === 'online' && !cur.over) {
      if (!confirm('지금 그만두면 지는 걸로 처리돼요. 그만둘까요?')) return;
      srv({ type: 'mg-quit', id: cur.id });
    }
    closeModal();
  };
  $('mgAgain').onclick = () => {
    if (!cur) return;
    if (cur.mode === 'ai') startAi(cur.game);
    else { const opp = cur.players[1 - cur.you]; srv({ type: 'mg-invite', game: cur.game, to: opp.username }); $('mgStatus').textContent = `${opp.nickname}님에게 다시 신청했어요…`; $('mgAgain').hidden = true; }
  };
  function vs(turnIdx) {
    const box = $('mgVs'); box.textContent = '';
    const names = cur.players.map((p) => p.nickname);
    const a = el('span', { class: 'who' + (turnIdx === cur.you ? ' turn' : ''), text: `나 (${names[cur.you]})` });
    const b = el('span', { class: 'who' + (turnIdx === 1 - cur.you ? ' turn' : ''), text: names[1 - cur.you] });
    box.append(a, el('b', { text: 'VS' }), b);
  }
  function endText(winner) {
    if (winner == null) return '🤝 비겼어요!';
    return winner === cur.you ? '🎉 이겼어요!' : '😢 졌어요… 다음엔 이길 수 있어요!';
  }
  function meName() { return H.S?.session?.user.nickname || '나'; }

  // ------------------------------------------------------------ AI 시작
  function startAi(game) {
    stopBasket();
    cur = { mode: 'ai', game, you: 0, players: [{ nickname: meName() }, { nickname: '🤖 AI' }], over: false };
    openModal(game);
    if (game === 'ttt') { cur.state = { board: Array(9).fill(null), turn: Math.random() < 0.5 ? 0 : 1 }; renderTtt(); if (cur.state.turn === 1) setTimeout(aiTtt, 600); }
    if (game === 'rps') { cur.state = { score: [0, 0], round: 1, picked: [false, false], mine: null, last: null }; renderRps(); }
    if (game === 'basket') startBasket();
  }

  // ------------------------------------------------------------ 온라인 대결 (서버가 보내 주는 상태)
  buddy.on('srv', (m) => {
    if (m.type === 'mg-invite') return showInvite(m);
    if (m.type === 'mg-start') {
      stopBasket();
      cur = { mode: 'online', id: m.id, game: m.game, you: m.you, players: m.players, state: m.state, over: false };
      openModal(m.game);
      if (m.game === 'basket') startBasket(); else render();
      return;
    }
    if (!cur || cur.mode !== 'online' || m.id !== cur.id) return;
    if (m.type === 'mg-state') { cur.state = m.state; render(); }
    if (m.type === 'mg-end') {
      cur.state = m.state; cur.over = true;
      render();
      const why = { quit: m.winner === cur.you ? ' (상대가 그만뒀어요)' : '', left: m.winner === cur.you ? ' (상대 연결이 끊겼어요)' : '', timeout: ' (시간 초과)' }[m.reason] || '';
      $('mgStatus').textContent = endText(m.winner) + why;
      if (cur.game === 'basket') { basket.oppDone = true; basket.over = true; basket.items = []; }
      $('mgAgain').hidden = false;
      $('mgAgain').textContent = '한 판 더 신청';
    }
  });
  function render() {
    if (!cur) return;
    if (cur.game === 'ttt') renderTtt();
    if (cur.game === 'rps') renderRps();
    if (cur.game === 'basket' && cur.mode === 'online') { basket.opp = cur.state.scores[1 - cur.you]; basket.oppDone = cur.state.done[1 - cur.you]; }
  }

  // ------------------------------------------------------------ 틱택토
  const MARK = ['O', 'X'];
  function tttWinner(b) {
    for (const l of LINES) if (b[l[0]] != null && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { who: b[l[0]], line: l };
    if (b.every((c) => c != null)) return { who: null, line: [] };
    return null;
  }
  function renderTtt() {
    const st = cur.state;
    const res = tttWinner(st.board);
    vs(res ? -1 : st.turn);
    const grid = el('div', { class: 'ttt' });
    st.board.forEach((c, i) => {
      const mine = st.turn === cur.you && !res && !cur.over && c == null;
      const b = el('button', { text: c == null ? '' : MARK[c], class: c == null ? '' : c === 0 ? 'o' : 'x', disabled: !mine, onclick: () => playTtt(i) });
      if (res && res.line.includes(i)) b.classList.add('win');
      grid.append(b);
    });
    $('mgArea').textContent = ''; $('mgArea').append(grid);
    if (res) {
      if (cur.mode === 'ai') { cur.over = true; $('mgStatus').textContent = endText(res.who); $('mgAgain').hidden = false; $('mgAgain').textContent = '한 판 더'; }
    } else $('mgStatus').textContent = st.turn === cur.you ? `내 차례예요 (${MARK[cur.you]})` : `${cur.players[1 - cur.you].nickname} 차례…`;
  }
  function playTtt(i) {
    if (cur.mode === 'online') { srv({ type: 'mg-move', id: cur.id, cell: i }); return; }
    const st = cur.state;
    if (st.board[i] != null || st.turn !== 0) return;
    st.board[i] = 0; st.turn = 1;
    renderTtt();
    if (!tttWinner(st.board)) setTimeout(aiTtt, 500);
  }
  function minimax(b, me, turn) {
    const r = tttWinner(b);
    if (r) return { score: r.who == null ? 0 : r.who === me ? 10 : -10 };
    let best = null;
    for (let i = 0; i < 9; i++) {
      if (b[i] != null) continue;
      b[i] = turn;
      const s = minimax(b, me, 1 - turn).score * 0.9;
      b[i] = null;
      if (!best || (turn === me ? s > best.score : s < best.score)) best = { score: s, i };
    }
    return best;
  }
  function aiTtt() {
    if (!cur || cur.mode !== 'ai' || cur.game !== 'ttt' || cur.over) return;
    const st = cur.state;
    const empty = st.board.map((c, i) => (c == null ? i : -1)).filter((i) => i >= 0);
    if (!empty.length) return;
    // 가끔 실수해서 이길 수 있게 (30%)
    const i = Math.random() < 0.3 ? empty[Math.floor(Math.random() * empty.length)] : minimax([...st.board], 1, 1).i;
    st.board[i] = 1; st.turn = 0;
    renderTtt();
  }

  // ------------------------------------------------------------ 가위바위보
  function renderRps() {
    const st = cur.state;
    vs(-1);
    const wrap = el('div', { class: 'rps' });
    wrap.append(el('div', { class: 'score', text: `나 ${st.score[cur.you]} : ${st.score[1 - cur.you]} ${cur.players[1 - cur.you].nickname}` }));
    const reveal = el('div', { class: 'reveal' });
    if (st.last) {
      const mine = st.last.picks[cur.you], theirs = st.last.picks[1 - cur.you];
      reveal.append(el('span', {}, RPS_ICON[mine], el('small', { text: `나: ${RPS_NAME[mine]}` })), el('b', { text: 'vs', style: 'font-size:16px' }),
        el('span', {}, RPS_ICON[theirs], el('small', { text: `상대: ${RPS_NAME[theirs]}` })));
    } else reveal.append(el('span', { class: 'note', style: 'font-size:13px', text: '하나 골라요!' }));
    wrap.append(reveal);
    const picks = el('div', { class: 'picks' });
    const waiting = st.picked[cur.you];
    for (const k of ['r', 'p', 's']) {
      picks.append(el('button', { text: RPS_ICON[k], title: RPS_NAME[k], class: st.mine === k ? 'sel' : '', disabled: waiting || cur.over, onclick: () => playRps(k) }));
    }
    wrap.append(picks);
    $('mgArea').textContent = ''; $('mgArea').append(wrap);
    if (cur.over) return;
    if (waiting) $('mgStatus').textContent = `${RPS_NAME[st.mine]}! ${cur.players[1 - cur.you].nickname}님이 고르는 중…`;
    else if (st.last) $('mgStatus').textContent = st.last.winner == null ? '비겼어요! 한 번 더!' : st.last.winner === cur.you ? '이번 판은 내가 이겼어요! 다음 판!' : '이번 판은 졌어요… 다음 판!';
    else $('mgStatus').textContent = '먼저 2번 이기면 승리!';
  }
  function playRps(k) {
    if (cur.mode === 'online') { cur.state.mine = k; cur.state.picked[cur.you] = true; renderRps(); srv({ type: 'mg-move', id: cur.id, pick: k }); return; }
    const st = cur.state;
    st.mine = k; st.picked = [true, false];
    renderRps();
    setTimeout(() => {
      if (!cur || cur.mode !== 'ai') return;
      const ai = ['r', 'p', 's'][Math.floor(Math.random() * 3)];
      const w = k === ai ? null : BEATS[k] === ai ? 0 : 1;
      if (w != null) st.score[w]++;
      st.last = { picks: [k, ai], winner: w };
      st.picked = [false, false]; st.mine = null;
      if (st.score[0] >= 2 || st.score[1] >= 2) {
        cur.over = true; renderRps();
        $('mgStatus').textContent = endText(st.score[0] > st.score[1] ? 0 : 1);
        $('mgAgain').hidden = false; $('mgAgain').textContent = '한 판 더';
      } else renderRps();
    }, 700);
  }

  // ------------------------------------------------------------ 바구니 받기
  const FOODS = ['🍎', '🍩', '🍪', '🍕', '🍉', '🍓', '🍙', '🧁', '🍌', '🍰'];
  const cv = $('mgCanvas'), g = cv.getContext('2d');
  const BW = 480, BH = 340, BASKET_Y = 300, BASKET_W = 74;
  const basket = { on: false };
  function startBasket() {
    stopBasket();
    Object.assign(basket, {
      on: true, x: BW / 2, tx: BW / 2, items: [], score: 0, miss: 0, over: false, t: -3, spawn: 0, pops: [],
      opp: 0, oppDone: false, sentScore: -1, sendT: 0,
      ai: cur.mode === 'ai' ? { score: 0, next: rand(0.8, 1.4), end: rand(18, 70), done: false } : null,
    });
    vs(-1);
    $('mgStatus').textContent = '';
    basket.last = performance.now();
    basket.raf = requestAnimationFrame(basketLoop);
  }
  function stopBasket() { basket.on = false; cancelAnimationFrame(basket.raf); }
  cv.addEventListener('mousemove', (e) => {
    const r = cv.getBoundingClientRect();
    basket.tx = clamp((e.clientX - r.left) * (BW / r.width), BASKET_W / 2, BW - BASKET_W / 2);
  });
  const keys = {};
  addEventListener('keydown', (e) => {
    if (!basket.on || $('mgModal').hidden) return;
    if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) { keys[e.key.toLowerCase()] = true; e.preventDefault(); }
  });
  addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  function basketLoop(now) {
    if (!basket.on) return;
    const dt = Math.min(0.05, (now - basket.last) / 1000); basket.last = now;
    const b = basket;
    b.t += dt;
    const left = keys.arrowleft || keys.a, right = keys.arrowright || keys.d;
    if (left || right) b.tx = clamp(b.x + (right ? 1 : -1) * 420 * dt * 3, BASKET_W / 2, BW - BASKET_W / 2);
    b.x += (b.tx - b.x) * Math.min(1, dt * 18);

    if (b.t >= 0 && !b.over) {
      const lv = b.t;
      const speed = Math.min(430, 130 + lv * 5);
      const every = Math.max(0.36, 0.95 - lv * 0.012);
      const bombChance = Math.min(0.32, 0.18 + lv * 0.003);
      if ((b.spawn -= dt) <= 0) {
        b.spawn = every * rand(0.7, 1.3);
        const bomb = Math.random() < bombChance;
        b.items.push({ x: rand(20, BW - 20), y: -20, v: speed * rand(0.85, 1.15), bomb, icon: bomb ? '💣' : FOODS[Math.floor(Math.random() * FOODS.length)], spin: rand(-2, 2) });
      }
      for (const it of b.items) {
        it.y += it.v * dt;
        if (!it.gone && it.y >= BASKET_Y - 6 && it.y <= BASKET_Y + 14 && Math.abs(it.x - b.x) < BASKET_W / 2 + 6) {
          it.gone = true;
          if (it.bomb) { b.pops.push({ x: it.x, y: BASKET_Y - 20, text: '💥', t: 1.2, big: true }); gameOver('💣 폭탄을 받았어요!'); }
          else { b.score++; b.pops.push({ x: it.x, y: BASKET_Y - 24, text: '+1', t: 0.8 }); }
        } else if (!it.gone && it.y > BH + 20) {
          it.gone = true;
          if (!it.bomb) { b.miss++; b.pops.push({ x: it.x, y: BH - 26, text: '놓침!', t: 0.9 }); if (b.miss >= 3) gameOver('음식을 3번 놓쳤어요!'); }
        }
      }
      b.items = b.items.filter((it) => !it.gone);
      // 점수 보내기 (대결일 때)
      if (cur && cur.mode === 'online' && (b.sendT -= dt) <= 0 && b.score !== b.sentScore) {
        b.sendT = 0.4; b.sentScore = b.score; srv({ type: 'mg-move', id: cur.id, score: b.score });
      }
    }
    // AI도 같이 하는 것처럼
    if (b.ai && !b.ai.done && b.t > 0) {
      if ((b.ai.next -= dt) <= 0) { b.ai.next = rand(0.7, 1.3) * Math.max(0.45, 1 - b.t * 0.008); b.ai.score++; }
      if (b.t > b.ai.end) b.ai.done = true;
      b.opp = b.ai.score; b.oppDone = b.ai.done;
    }
    if (b.ai && b.over && b.oppDone && !cur.over) {
      cur.over = true;
      const w = b.score === b.opp ? null : b.score > b.opp ? 0 : 1;
      $('mgStatus').textContent = `${endText(w)} (나 ${b.score} : ${b.opp} AI)`;
      $('mgAgain').hidden = false; $('mgAgain').textContent = '한 판 더';
    }
    b.pops = b.pops.filter((p) => (p.t -= dt) > 0);
    drawBasket();
    basket.raf = requestAnimationFrame(basketLoop);
  }
  function gameOver(why) {
    const b = basket;
    if (b.over) return;
    b.over = true; b.why = why;
    if (cur && cur.mode === 'online') srv({ type: 'mg-move', id: cur.id, score: b.score, done: true });
    $('mgStatus').textContent = `${why} 내 점수 ${b.score}점 · ${b.oppDone ? '' : '상대가 아직 하는 중…'}`;
  }
  function drawBasket() {
    const b = basket;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const grad = g.createLinearGradient(0, 0, 0, BH);
    grad.addColorStop(0, '#9fd3f7'); grad.addColorStop(1, '#e8f6ff');
    g.fillStyle = grad; g.fillRect(0, 0, BW, BH);
    g.fillStyle = '#7cc46a'; g.fillRect(0, BH - 22, BW, 22);
    g.fillStyle = '#5fae4a'; for (let x = 0; x < BW; x += 8) g.fillRect(x, BH - 24 + (x % 3), 4, 3);
    // 떨어지는 것들
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `28px ${EMOJI}`;
    for (const it of b.items) {
      g.save(); g.translate(it.x, it.y); g.rotate(Math.sin(performance.now() / 300 + it.spin) * 0.25);
      g.fillText(it.icon, 0, 0); g.restore();
    }
    // 바구니
    const x = b.x - BASKET_W / 2, y = BASKET_Y;
    g.fillStyle = '#a8703f'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + BASKET_W, y); g.lineTo(x + BASKET_W - 8, y + 26); g.lineTo(x + 8, y + 26); g.closePath(); g.fill();
    g.fillStyle = '#7a4b28'; for (let i = 0; i < 4; i++) g.fillRect(x + 10, y + 5 + i * 6, BASKET_W - 20, 2);
    g.strokeStyle = '#7a4b28'; g.lineWidth = 3; g.beginPath(); g.ellipse(b.x, y, BASKET_W / 2, 6, 0, Math.PI, 0); g.stroke();
    // 점수판
    g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(8, 8, 150, 50); g.fillRect(BW - 168, 8, 160, 30);
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = `bold 16px ${FONT}`;
    g.fillText(`🧺 내 점수 ${b.score}`, 16, 28);
    g.font = `14px ${EMOJI}`; g.fillText('❤️'.repeat(3 - b.miss) + '🤍'.repeat(b.miss), 16, 50);
    g.textAlign = 'right'; g.font = `bold 13px ${FONT}`;
    const oppName = cur ? cur.players[1 - cur.you].nickname : '상대';
    g.fillText(`${oppName} ${b.opp}${b.oppDone ? ' (끝)' : ''}`, BW - 16, 28);
    // 팝업 글자
    g.textAlign = 'center';
    for (const p of b.pops) {
      g.globalAlpha = Math.min(1, p.t * 2);
      g.font = p.big ? `48px ${EMOJI}` : `bold 16px ${FONT}`;
      g.fillStyle = p.text === '+1' ? '#2e9a4a' : '#d64040';
      g.fillText(p.text, p.x, p.y - (1 - p.t) * 20);
      g.globalAlpha = 1;
    }
    // 시작 카운트다운 · 끝 화면
    if (b.t < 0) {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, BW, BH);
      g.fillStyle = '#fff'; g.font = `bold 64px ${FONT}`; g.fillText(String(Math.ceil(-b.t)), BW / 2, BH / 2 + 20);
      g.font = `14px ${FONT}`; g.fillText('마우스나 ←→ 키로 바구니를 움직여요', BW / 2, BH / 2 + 60);
    }
    if (b.over) {
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, BH / 2 - 50, BW, 100);
      g.fillStyle = '#fff'; g.font = `bold 26px ${FONT}`; g.fillText(`게임 끝! ${b.score}점`, BW / 2, BH / 2 - 6);
      g.font = `14px ${FONT}`;
      g.fillText(b.oppDone ? (b.why || '') : `${oppName}님이 아직 하는 중… (${b.opp}점)`, BW / 2, BH / 2 + 24);
    }
  }
})();
