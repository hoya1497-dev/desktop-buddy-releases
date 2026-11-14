// 집 화이트보드 (흔적 남기기): 놀러 온 친구가 메모를 붙이거나 그림을 그려 둘 수 있어요.
// - 누가 남겼는지 남고, 집주인은 아무거나 지울 수 있고, 쓴 사람은 자기 것을 고치거나 옮기거나 지울 수 있어요.
// - 집주인은 화이트보드 바탕색을 바꿀 수 있어요.
// - 집마다 최대 60개 · 그림 합계 600KB까지. 넘치면 오래된 것부터 빠져요.
const BOARD_W = 1200, BOARD_H = 750;
const MAX_ITEMS = 60;
const MAX_TOTAL_BYTES = 600 * 1024;
const MAX_PNG_BYTES = 60 * 1024;
const MAX_PNG_SIDE = 600;
const NOTE_MAX = 200;
const NOTE_COLORS = ['#fff3a8', '#ffd1dc', '#c9f2d0', '#cfe6ff', '#e8d9ff', '#ffe0b8'];
const HEX = /^#[0-9a-f]{6}$/i;

function create({ nameOf = () => null, send, clean, now, ownerOf, byName, sessions, rooms, perSocket, store }) {
  const view = (it) => {
    const n = nameOf(it.by);
    return {
      id: it.id, kind: it.kind, username: n ? n.username : it.username, nickname: n ? n.nickname : it.nickname, at: it.at, edited: it.edited || 0,
      x: it.x, y: it.y, text: it.text, color: it.color, png: it.png, w: it.w, h: it.h, dw: it.dw, dh: it.dh,
    };
  };
  const boardOf = (owner) => {
    const b = (owner.board ||= { items: [], seq: 0, v: 2 });
    if (!b.v) {   // 예전(800×500) 화이트보드를 새 크기(1200×750)에 맞게 늘림
      for (const it of b.items) {
        it.x = Math.round(it.x * 1.5); it.y = Math.round(it.y * 1.5);
        if (it.kind === 'draw') { it.dw = Math.round((it.dw || it.w) * 1.5); it.dh = Math.round((it.dh || it.h) * 1.5); }
      }
      b.v = 2;
    }
    return b;
  };
  const styleOf = (owner) => ({ bg: boardOf(owner).bg || null });
  const err = (ws, message) => send(ws, { type: 'error', message });

  // 지금 보고 있는 집: 놀러 가 있으면 그 집, 아니면 내 집
  function targetOf(ws) {
    if (ws.room) { const o = ownerOf(ws.room); if (o) return o; }
    return ws.user;
  }
  // 그 집 화이트보드를 보고 있을 사람들: 그 방에 있는 사람 + 집주인
  function audience(owner) {
    const out = new Set();
    const room = rooms.get(owner.code);
    if (room) for (const c of room.values()) out.add(c);
    const os = sessions.get(owner.id);
    if (os) out.add(os);
    return out;
  }
  function cast(owner, obj) { for (const c of audience(owner)) send(c, obj); }

  function checkPng(dataUrl) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) return null;
    const b64 = dataUrl.slice(22);
    if (b64.length > MAX_PNG_BYTES * 1.4) return null;
    const buf = Buffer.from(b64, 'base64');
    if (buf.length > MAX_PNG_BYTES || buf.length < 33) return null;
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (!sig.every((b, i) => buf[i] === b) || buf.toString('latin1', 12, 16) !== 'IHDR') return null;
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    if (w < 2 || h < 2 || w > MAX_PNG_SIDE || h > MAX_PNG_SIDE) return null;
    return { w, h, bytes: buf.length };
  }
  const bytesOf = (it) => (it.png ? Math.round((it.png.length - 22) * 0.75) : 0);
  const cleanText = (t) => String(t ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').trim().slice(0, NOTE_MAX);
  const pos = (m) => {
    const x = Math.round(Number(m.x)), y = Math.round(Number(m.y));
    return x >= 0 && x <= BOARD_W && y >= 0 && y <= BOARD_H ? { x, y } : null;
  };
  // 그림 크기 정보 (줄여서 보낸 그림을 화면에선 원래 크기로)
  function drawInfo(m, it) {
    const info = checkPng(m.png);
    if (!info) return false;
    it.png = m.png; it.w = info.w; it.h = info.h; delete it.dw; delete it.dh;
    const dw = Math.round(Number(m.dw)), dh = Math.round(Number(m.dh));
    if (dw > 0 && dh > 0 && dw <= BOARD_W && dh <= BOARD_H && Math.abs(dw / dh - info.w / info.h) < 0.2 * (info.w / info.h) + 0.1) { it.dw = dw; it.dh = dh; }
    return true;
  }
  function trim(b) { while (b.items.length > MAX_ITEMS || b.items.reduce((s, x) => s + bytesOf(x), 0) > MAX_TOTAL_BYTES) b.items.shift(); }

  function handle(ws, m) {
    const u = ws.user;
    switch (m.type) {
      case 'board-get': {
        const owner = targetOf(ws);
        const b = boardOf(owner);
        send(ws, { type: 'board', owner: { username: owner.username, nickname: owner.nickname }, mine: owner.id === u.id, items: b.items.map(view), size: { w: BOARD_W, h: BOARD_H }, style: styleOf(owner) });
        return true;
      }
      case 'board-add': {
        if (!perSocket(ws, 'board', 12, 60_000)) { err(ws, '흔적을 너무 빨리 남기고 있어요. 잠깐만요!'); return true; }
        const owner = targetOf(ws);
        if (owner.id !== u.id && ws.room !== owner.code) return true;
        const p = pos(m);
        if (!p) return true;
        const b = boardOf(owner);
        const it = { id: 'b' + (++b.seq).toString(36), by: u.id, username: u.username, nickname: u.nickname, at: now(), ...p };
        if (m.kind === 'note') {
          const text = cleanText(m.text);
          if (!text) return true;
          it.kind = 'note'; it.text = text;
          it.color = HEX.test(m.color) ? m.color : NOTE_COLORS[0];
        } else if (m.kind === 'draw') {
          it.kind = 'draw';
          if (!drawInfo(m, it)) { err(ws, '그림이 너무 크거나 올바르지 않아요. 조금 작게 그려 주세요.'); return true; }
        } else return true;
        b.items.push(it);
        trim(b);
        store.save();
        cast(owner, { type: 'board-item', owner: owner.username, item: view(it) });
        if (owner.id !== u.id) {
          const os = sessions.get(owner.id);
          if (os) send(os, { type: 'notice', message: `📝 ${u.nickname}(@${u.username})님이 우리 집에 ${it.kind === 'note' ? '메모' : '그림'}를 남겼어요` });
        }
        return true;
      }
      case 'board-edit': {   // 쓴 사람만: 메모 내용 · 색 · 위치, 그림 다시 그리기 · 위치
        if (!perSocket(ws, 'board-edit', 40, 60_000)) { err(ws, '너무 빨리 고치고 있어요. 잠깐만요!'); return true; }
        const owner = targetOf(ws);
        if (owner.id !== u.id && ws.room !== owner.code) return true;
        const b = boardOf(owner);
        const it = b.items.find((x) => x.id === String(m.id || ''));
        if (!it) return true;
        if (it.by !== u.id) { err(ws, '내가 남긴 흔적만 고칠 수 있어요.'); return true; }
        if ('x' in m || 'y' in m) { const p = pos(m); if (p) Object.assign(it, p); }
        if (it.kind === 'note') {
          if ('text' in m) { const t = cleanText(m.text); if (t) it.text = t; }
          if (HEX.test(m.color || '')) it.color = m.color;
        } else if (it.kind === 'draw' && m.png) {
          if (!drawInfo(m, it)) { err(ws, '그림이 너무 크거나 올바르지 않아요. 조금 작게 그려 주세요.'); return true; }
          trim(b);
        }
        it.edited = now();
        store.save();
        cast(owner, { type: 'board-upd', owner: owner.username, item: view(it) });
        return true;
      }
      case 'board-style': {   // 집주인만: 화이트보드 바탕색
        const owner = targetOf(ws);
        if (owner.id !== u.id) { err(ws, '화이트보드 색은 집주인만 바꿀 수 있어요.'); return true; }
        const b = boardOf(owner);
        if (m.bg === null || m.bg === '') delete b.bg;
        else if (HEX.test(m.bg || '')) b.bg = m.bg;
        else return true;
        store.save();
        cast(owner, { type: 'board-style', owner: owner.username, style: styleOf(owner) });
        return true;
      }
      case 'board-del': {
        const owner = targetOf(ws);
        const b = boardOf(owner);
        const it = b.items.find((x) => x.id === String(m.id || ''));
        if (!it) return true;
        if (owner.id !== u.id && it.by !== u.id) { err(ws, '집주인이나 쓴 사람만 지울 수 있어요.'); return true; }
        b.items = b.items.filter((x) => x !== it);
        store.save();
        cast(owner, { type: 'board-del', owner: owner.username, id: it.id });
        return true;
      }
      case 'board-clear': {
        const owner = targetOf(ws);
        if (owner.id !== u.id) { err(ws, '집주인만 전부 지울 수 있어요.'); return true; }
        boardOf(owner).items = [];
        store.save();
        cast(owner, { type: 'board-clear', owner: owner.username });
        return true;
      }
      default: return false;
    }
  }
  return { handle, NOTE_COLORS };
}

module.exports = { create, BOARD_W, BOARD_H, NOTE_COLORS };
