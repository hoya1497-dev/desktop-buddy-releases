// 집 화이트보드 (📝 흔적 남기기): 메모 붙이기 · 그림 그리기 · 누가 남겼는지 보기 · 지우기
(() => {
  const $ = (id) => document.getElementById(id);
  const H = window.HomeCore;
  if (!H || H.isMini) return;
  const srv = (m) => buddy.send('srv', m);
  const BW = 800, BH = 500;
  const NOTE_COLORS = ['#fff3a8', '#ffd1dc', '#c9f2d0', '#cfe6ff', '#e8d9ff', '#ffe0b8'];
  const PEN_COLORS = ['#26222b', '#e0463a', '#f08a3a', '#f4c430', '#3aa36a', '#2f7ae5', '#9b4de0', '#ffffff'];

  let board = null;         // { owner: { username, nickname }, mine, items }
  let mode = 'view';
  let noteColor = NOTE_COLORS[0], penColor = PEN_COLORS[0];
  let lastRoom;

  const me = () => H.S?.session?.user?.username;
  const viewingOwner = () => {
    const S = H.S;
    if (S?.room && !S.room.isOwner) return S.room.owner;
    return S?.session ? { username: S.session.user.username, nickname: S.session.user.nickname } : null;
  };
  const canDel = (it) => !!board && (board.mine || it.username === me());

  // 한국 시간으로 표시 (채팅과 같은 방식)
  const KT = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: 'numeric', minute: '2-digit' });
  const KD = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' });
  function when(ts) {
    const d = new Date(ts);
    const md = Object.fromEntries(KD.formatToParts(d).map((x) => [x.type, x.value]));
    return (KD.format(new Date()) === KD.format(d) ? '' : `${md.month}/${md.day} `) + KT.format(d);
  }
  const fullWhen = (ts) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'long', timeStyle: 'short' }).format(new Date(ts));

  function el(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on')) e[k] = v; else if (v != null && v !== false) e[k] = v;
    }
    for (const c of kids.flat()) if (c != null) e.append(c);
    return e;
  }

  // ------------------------------------------------------------ 패널 (📝 흔적 탭)
  function renderPane() {
    const o = viewingOwner();
    const mine = o && o.username === me();
    $('boardWhere').textContent = mine ? '📝 우리 집 흔적' : `📝 ${o?.nickname || '친구'}님 집에 흔적 남기기`;
    $('boardHint').textContent = mine
      ? '친구들이 놀러 와서 남긴 메모와 그림이에요. 기분 나쁜 건 집주인이 지울 수 있어요.'
      : '메모를 붙이거나 그림을 그려서 흔적을 남겨 보세요. 누가 남겼는지 집주인과 친구들이 볼 수 있어요.';
    $('boardOpenBtn').textContent = mine ? '🖊 우리 집 화이트보드 보기' : `🖊 ${o?.nickname || '친구'}님 화이트보드 열기`;
    $('boardClearBtn').hidden = !(board && board.mine && board.items.length);
    const ul = $('boardList'); ul.textContent = '';
    const items = board && o && board.owner.username === o.username ? [...board.items].reverse() : [];
    $('boardCount').textContent = board ? `${items.length}개` : '';
    if (!items.length) ul.append(el('li', { class: 'note', text: board ? '아직 아무 흔적도 없어요.' : '불러오는 중…' }));
    for (const it of items) {
      const thumb = it.kind === 'draw' ? el('img', { class: 'bthumb', src: it.png, alt: '그림' }) : el('span', { class: 'bthumb', text: '📝', style: `background:${it.color}` });
      const name = el('span', { class: 'name', text: it.kind === 'draw' ? '🖊 그림' : it.text.slice(0, 40) },
        el('small', { text: `${it.nickname}(@${it.username}) · ${when(it.at)}`, title: fullWhen(it.at) + ' (한국 시간)' }));
      const btns = el('span', { class: 'btns' });
      if (canDel(it)) btns.append(el('button', { class: 'ghost small', text: '지우기', onclick: () => del(it) }));
      ul.append(el('li', {}, thumb, name, btns));
    }
  }
  function del(it) {
    const who = it.username === me() ? '내가 남긴' : `${it.nickname}님이 남긴`;
    if (confirm(`${who} ${it.kind === 'draw' ? '그림' : '메모'}을(를) 지울까요?`)) srv({ type: 'board-del', id: it.id });
  }
  $('boardOpenBtn').onclick = openBoard;
  $('boardClearBtn').onclick = () => { if (confirm('우리 집 화이트보드의 흔적을 모두 지울까요? 되돌릴 수 없어요.')) srv({ type: 'board-clear' }); };
  document.querySelector('.tabs button[data-tab=board]').addEventListener('click', () => { srv({ type: 'board-get' }); renderPane(); });

  // ------------------------------------------------------------ 화이트보드 창
  const area = $('boardArea');
  function scale() { return area.clientWidth / BW || 1; }
  function openBoard() {
    $('boardModal').hidden = false;
    setMode('view');
    srv({ type: 'board-get' });
    renderBoard();
  }
  $('boardClose').onclick = () => { $('boardModal').hidden = true; cancelNote(); clearStrokes(); };

  function renderBoard() {
    if ($('boardModal').hidden) return;
    const o = viewingOwner();
    $('boardTitle').textContent = o && o.username === me() ? '📝 우리 집 화이트보드' : `📝 ${o?.nickname || '친구'}님 집 화이트보드`;
    const box = $('boardItems'); box.textContent = '';
    if (!board) return;
    const k = scale();
    for (const it of board.items) {
      const meta = el('span', { class: 'b-meta', text: `${it.nickname} · ${when(it.at)}` });
      const node = it.kind === 'draw'
        ? el('div', { class: 'b-item b-draw' }, el('img', { src: it.png, alt: '그림', style: `width:${it.dw || it.w}px;height:${it.dh || it.h}px` }), meta)
        : el('div', { class: 'b-item b-note', style: `background:${it.color}` }, el('span', { text: it.text }), meta);
      node.style.left = (it.x / BW * 100) + '%';
      node.style.top = (it.y / BH * 100) + '%';
      node.style.transform = `scale(${k})`;
      node.title = `${it.nickname}(@${it.username})님이 남김 · ${fullWhen(it.at)} (한국 시간)`;
      if (it.fresh) { node.classList.add('new'); delete it.fresh; }
      if (canDel(it)) node.append(el('button', { class: 'b-del', text: '✕', title: '지우기', onclick: (e) => { e.stopPropagation(); del(it); } }));
      box.append(node);
    }
  }
  new ResizeObserver(() => { renderBoard(); redraw(); }).observe(area);

  // 도구: 보기 · 메모 · 그리기
  function setMode(m) {
    mode = m;
    document.querySelectorAll('#boardModes button').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
    area.classList.toggle('mode-note', m === 'note');
    area.classList.toggle('mode-draw', m === 'draw');
    $('noteColors').hidden = m !== 'note';
    for (const id of ['penColors', 'penSize', 'drawUndo', 'drawPost']) $(id).hidden = m !== 'draw';
    $('boardStatus').textContent = {
      view: '메모나 그림에 마우스를 올리면 누가 언제 남겼는지 보여요.' + (board?.mine ? ' 집주인은 ✕로 지울 수 있어요.' : ''),
      note: '메모를 붙일 곳을 눌러요. Enter로 붙이고, Esc로 취소해요.',
      draw: '자유롭게 그린 다음 [그림 붙이기]를 눌러요. 그린 부분만 화이트보드에 붙어요.',
    }[m];
    if (m !== 'note') cancelNote();
    if (m !== 'draw') clearStrokes();
  }
  document.querySelectorAll('#boardModes button').forEach((b) => { b.onclick = () => setMode(b.dataset.mode); });
  function swatches(boxId, colors, get, set) {
    const box = $(boxId); box.textContent = '';
    for (const c of colors) {
      const b = el('button', { title: c, style: `background:${c}`, class: get() === c ? 'sel' : '' });
      b.onclick = () => { set(c); swatches(boxId, colors, get, set); };
      box.append(b);
    }
  }
  swatches('noteColors', NOTE_COLORS, () => noteColor, (c) => { noteColor = c; $('noteInputBox').style.background = c; });
  swatches('penColors', PEN_COLORS, () => penColor, (c) => { penColor = c; });

  const toBoard = (e) => { const r = area.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * BW, y: (e.clientY - r.top) / r.height * BH }; };

  // ---- 메모
  let notePos = null;
  area.addEventListener('mousedown', (e) => {
    if (mode !== 'note' || e.target.closest('.note-input') || e.target.closest('.b-del')) return;
    const p = toBoard(e);
    notePos = { x: Math.round(Math.min(BW - 120, Math.max(0, p.x))), y: Math.round(Math.min(BH - 60, Math.max(0, p.y))) };
    const box = $('noteInputBox');
    box.hidden = false; box.style.background = noteColor;
    box.style.left = (notePos.x / BW * 100) + '%'; box.style.top = (notePos.y / BH * 100) + '%';
    $('noteInput').value = '';
    setTimeout(() => $('noteInput').focus(), 0);
    e.preventDefault();
  });
  function cancelNote() { $('noteInputBox').hidden = true; notePos = null; }
  $('noteInput').addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { cancelNote(); return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      const text = $('noteInput').value.trim();
      if (text && notePos) srv({ type: 'board-add', kind: 'note', text, color: noteColor, x: notePos.x, y: notePos.y });
      cancelNote();
    }
  });

  // ---- 그리기
  const dc = $('boardDraw'), dg = dc.getContext('2d');
  let strokes = [], cur = null;
  function redraw() {
    dg.clearRect(0, 0, BW, BH);
    for (const s of strokes.concat(cur ? [cur] : [])) paint(dg, s, 0, 0);
  }
  function paint(g, s, ox, oy) {
    g.strokeStyle = s.color; g.lineWidth = s.size; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    s.pts.forEach((p, i) => (i ? g.lineTo(p.x - ox, p.y - oy) : g.moveTo(p.x - ox, p.y - oy)));
    if (s.pts.length === 1) g.lineTo(s.pts[0].x - ox + 0.1, s.pts[0].y - oy);
    g.stroke();
  }
  function clearStrokes() { strokes = []; cur = null; redraw(); }
  dc.addEventListener('pointerdown', (e) => {
    if (mode !== 'draw') return;
    dc.setPointerCapture(e.pointerId);
    cur = { color: penColor, size: Number($('penSize').value) || 6, pts: [toBoard(e)] };
    redraw();
  });
  dc.addEventListener('pointermove', (e) => { if (cur) { cur.pts.push(toBoard(e)); redraw(); } });
  const endStroke = () => { if (cur) { strokes.push(cur); cur = null; redraw(); } };
  dc.addEventListener('pointerup', endStroke);
  dc.addEventListener('pointercancel', endStroke);
  $('drawUndo').onclick = () => { strokes.pop(); redraw(); };
  $('drawPost').onclick = () => {
    if (!strokes.length) { H.toast('먼저 그림을 그려 주세요'); return; }
    // 그린 부분만 잘라서 PNG로 (40KB 넘으면 조금씩 줄임)
    let x1 = BW, y1 = BH, x2 = 0, y2 = 0;
    for (const s of strokes) for (const p of s.pts) { x1 = Math.min(x1, p.x - s.size); y1 = Math.min(y1, p.y - s.size); x2 = Math.max(x2, p.x + s.size); y2 = Math.max(y2, p.y + s.size); }
    x1 = Math.max(0, Math.floor(x1)); y1 = Math.max(0, Math.floor(y1)); x2 = Math.min(BW, Math.ceil(x2)); y2 = Math.min(BH, Math.ceil(y2));
    const w = Math.max(4, x2 - x1), h = Math.max(4, y2 - y1);
    let k = Math.min(1, 400 / Math.max(w, h)), png = null;
    for (let tries = 0; tries < 6; tries++) {
      const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w * k)); c.height = Math.max(2, Math.round(h * k));
      const g = c.getContext('2d'); g.scale(k, k);
      for (const s of strokes) paint(g, s, x1, y1);
      png = c.toDataURL('image/png');
      if (png.length < 40 * 1024 * 1.3) break;
      k *= 0.75; png = null;
    }
    if (!png) { H.toast('그림이 너무 복잡해요. 조금 더 단순하게 그려 주세요'); return; }
    srv({ type: 'board-add', kind: 'draw', png, x: x1, y: y1, dw: w, dh: h });
    clearStrokes();
    setMode('view');
  };

  // ------------------------------------------------------------ 서버에서 온 것
  buddy.on('srv', (m) => {
    if (m.type === 'board') { board = { owner: m.owner, mine: m.mine, items: m.items }; renderPane(); renderBoard(); setMode(mode); }
    else if (!board || m.owner !== board.owner.username) return;
    else if (m.type === 'board-item') { board.items.push({ ...m.item, fresh: true }); renderPane(); renderBoard(); }
    else if (m.type === 'board-del') { board.items = board.items.filter((x) => x.id !== m.id); renderPane(); renderBoard(); }
    else if (m.type === 'board-clear') { board.items = []; renderPane(); renderBoard(); }
  });
  // 다른 집으로 옮기면 그 집 화이트보드를 다시 불러옴
  buddy.on('home-state', (st) => {
    const code = st?.room?.code || null;
    if (code !== lastRoom) {
      lastRoom = code; board = null;
      if ($('pane-board').classList.contains('active') || !$('boardModal').hidden) srv({ type: 'board-get' });
      renderPane(); renderBoard();
    }
  });
  renderPane();
})();
