// 미니게임: 틱택토 · 가위바위보 · 바구니 받기 (친구와 대결)
// AI 대결은 앱 안에서만 하고, 사람끼리 대결할 때만 서버가 판정해요.
// - 틱택토 / 가위바위보: 서버가 판을 들고 있고 차례 · 승패를 정함 (상대 선택은 둘 다 낼 때까지 숨김)
// - 바구니: 각자 자기 화면에서 하고 점수만 보내면 서버가 비교

const GAMES = { ttt: '틱택토', rps: '가위바위보', basket: '바구니 받기' };
const INVITE_TTL = 60_000;
const MIN_VERSION = '0.7.0';
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const BEATS = { r: 's', p: 'r', s: 'p' };

function create({ send, sessionOf, canChallenge, olderThan, rid }) {
  const invites = new Map();   // id -> { id, game, from: userId, to: userId, until }
  const matches = new Map();   // id -> match
  const byUser = new Map();    // userId -> matchId

  const card = (u) => ({ username: u.username, nickname: u.nickname });
  const err = (ws, message) => send(ws, { type: 'error', message });

  function publicState(m, idx) {
    if (m.game === 'ttt') return { board: m.board, turn: m.turn };
    if (m.game === 'rps') {
      return {
        score: m.score, round: m.round,
        picked: m.picks.map((p) => p != null),
        mine: m.picks[idx], last: m.last,
      };
    }
    return { scores: m.scores, done: m.done };
  }
  function pushState(m, type = 'mg-state', extra = {}) {
    m.players.forEach((u, i) => {
      const ws = sessionOf(u.id);
      if (ws) send(ws, { type, id: m.id, game: m.game, you: i, players: m.players.map(card), state: publicState(m, i), ...extra });
    });
  }
  function finish(m, winner, reason) {
    if (m.over) return;
    m.over = true;
    clearTimeout(m.timer);
    matches.delete(m.id);
    for (const u of m.players) if (byUser.get(u.id) === m.id) byUser.delete(u.id);
    pushState(m, 'mg-end', { winner, reason });
  }

  function invite(ws, msg) {
    const u = ws.user;
    const game = String(msg.game || '');
    if (!GAMES[game]) return;
    if (byUser.has(u.id)) return err(ws, '이미 하고 있는 게임이 있어요.');
    const target = canChallenge(ws, String(msg.to || ''));
    if (typeof target === 'string') return err(ws, target);
    const tws = sessionOf(target.id);
    if (!tws) return err(ws, `${target.nickname}님은 지금 접속해 있지 않아요.`);
    if (olderThan(tws.clientVersion || '0.0.0', MIN_VERSION)) return err(ws, `${target.nickname}님 앱이 예전 버전이라 미니게임을 못 해요. 업데이트를 기다려 주세요!`);
    if (byUser.has(target.id)) return err(ws, `${target.nickname}님은 지금 다른 게임 중이에요.`);
    for (const [k, v] of invites) if (v.from === u.id || v.until < Date.now()) invites.delete(k);  // 내 예전 신청은 취소
    const id = rid('g');
    invites.set(id, { id, game, from: u.id, to: target.id, until: Date.now() + INVITE_TTL });
    send(tws, { type: 'mg-invite', id, game, from: card(u) });
    send(ws, { type: 'notice', message: `🎮 ${target.nickname}님에게 ${GAMES[game]} 대결을 신청했어요. 수락을 기다리는 중…` });
  }

  function answer(ws, msg, userById) {
    const inv = invites.get(String(msg.id || ''));
    const u = ws.user;
    if (!inv || inv.to !== u.id) return;
    invites.delete(inv.id);
    const from = userById(inv.from);
    const fws = from && sessionOf(from.id);
    if (!msg.accept) { if (fws) send(fws, { type: 'notice', message: `🎮 ${u.nickname}님이 대결을 거절했어요.` }); return; }
    if (inv.until < Date.now()) return err(ws, '대결 신청 시간이 지났어요.');
    if (!fws) return err(ws, '상대가 접속해 있지 않아요.');
    if (byUser.has(u.id) || byUser.has(from.id)) return err(ws, '둘 중 한 명이 이미 다른 게임 중이에요.');
    const m = { id: inv.id, game: inv.game, players: [from, u], started: Date.now() };
    if (m.game === 'ttt') { m.board = Array(9).fill(null); m.turn = Math.random() < 0.5 ? 0 : 1; }
    if (m.game === 'rps') { m.score = [0, 0]; m.round = 1; m.picks = [null, null]; m.last = null; }
    if (m.game === 'basket') { m.scores = [0, 0]; m.done = [false, false]; m.timer = setTimeout(() => endBasket(m, true), 5 * 60_000); }
    matches.set(m.id, m);
    byUser.set(from.id, m.id); byUser.set(u.id, m.id);
    pushState(m, 'mg-start');
  }

  function endBasket(m, timeout) {
    const [a, b] = m.scores;
    finish(m, a === b ? null : a > b ? 0 : 1, timeout ? 'timeout' : 'score');
  }

  function move(ws, msg) {
    const m = matches.get(String(msg.id || ''));
    if (!m || m.over) return;
    const idx = m.players.findIndex((p) => p.id === ws.user.id);
    if (idx < 0) return;

    if (m.game === 'ttt') {
      const cell = Number(msg.cell);
      if (m.turn !== idx || !(cell >= 0 && cell < 9) || m.board[cell] != null) return;
      m.board[cell] = idx;
      const line = LINES.find((l) => l.every((c) => m.board[c] === idx));
      if (line) return finish(m, idx, 'line');
      if (m.board.every((c) => c != null)) return finish(m, null, 'draw');
      m.turn = 1 - idx;
      return pushState(m);
    }

    if (m.game === 'rps') {
      const pick = String(msg.pick || '');
      if (!BEATS[pick] || m.picks[idx] != null) return;
      m.picks[idx] = pick;
      if (m.picks.some((p) => p == null)) return pushState(m);
      const [a, b] = m.picks;
      const w = a === b ? null : BEATS[a] === b ? 0 : 1;
      if (w != null) m.score[w]++;
      m.last = { picks: [a, b], winner: w, round: m.round };
      m.picks = [null, null];
      if (m.score[0] >= 2 || m.score[1] >= 2) return finish(m, m.score[0] > m.score[1] ? 0 : 1, 'score');
      if (w != null) m.round++;
      return pushState(m);
    }

    if (m.game === 'basket') {
      if (m.done[idx]) return;
      const score = Math.floor(Number(msg.score));
      // 말이 안 되는 점수는 받지 않음 (1초에 3개 이상은 못 받음)
      const maxNow = Math.ceil((Date.now() - m.started) / 1000 * 3) + 3;
      if (!(score >= m.scores[idx]) || score > maxNow || score > 9999) return;
      m.scores[idx] = score;
      if (msg.done) m.done[idx] = true;
      if (m.done[0] && m.done[1]) return endBasket(m, false);
      return pushState(m);
    }
  }

  function quit(ws, msg) {
    const id = msg && msg.id ? String(msg.id) : byUser.get(ws.user.id);
    const m = matches.get(id);
    if (!m) return;
    const idx = m.players.findIndex((p) => p.id === ws.user.id);
    if (idx < 0) return;
    finish(m, 1 - idx, 'quit');
  }

  // 접속이 끊기면 진행 중이던 게임은 상대 승리
  function disconnect(user) {
    const id = byUser.get(user.id);
    if (id) {
      const m = matches.get(id);
      if (m) { const idx = m.players.findIndex((p) => p.id === user.id); finish(m, 1 - idx, 'left'); }
    }
    for (const [k, v] of invites) if (v.from === user.id || v.to === user.id) invites.delete(k);
  }

  function handle(ws, m, userById) {
    switch (m.type) {
      case 'mg-invite': invite(ws, m); return true;
      case 'mg-answer': answer(ws, m, userById); return true;
      case 'mg-move': move(ws, m); return true;
      case 'mg-quit': quit(ws, m); return true;
      default: return false;
    }
  }
  return { handle, disconnect, GAMES };
}

module.exports = { create, GAMES };
