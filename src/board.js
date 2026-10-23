// 집 화이트보드 (📝 흔적 남기기)
// 메모 붙이기 · 그림 그리기 · 내 흔적 고치기/옮기기 · 확대/축소 · 끌어서 밀기 · 집주인은 바탕색 바꾸기
(() => {
  const $ = (id) => document.getElementById(id);
  const H = window.HomeCore;
  if (!H || H.isMini) return;
  const srv = (m) => buddy.send('srv', m);
  let BW = 1200, BH = 750;
  const NOTE_COLORS = ['#fff3a8', '#ffd1dc', '#c9f2d0', '#cfe6ff', '#e8d9ff', '#ffe0b8'];
  const PEN_COLORS = ['#26222b', '#e0463a', '#f08a3a', '#f4c430', '#3aa36a', '#2f7ae5', '#9b4de0', '#ffffff'];
  const DEF_BG = '#fbfaf7';
  const load = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
  const keep = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

  let board = null;         // { owner, mine, items, style }
  let mode = 'view';
  let noteColor = load('boardNoteColor', NOTE_COLORS[0]), penColor = load('boardPenColor', PEN_COLORS[0]);
  let eraser = false;
  let lastRoom;
  let zoom = 1, panX = 0, panY = 0, fitted = false;
  let selId = null;         // 고르고 있는 흔적
  let noteEdit = null;      // { id | null, x, y }  메모 쓰는 중
  let drawEdit = null;      // 다시 그리는 그림 { id, img, x, y, w, h }

  const me = () => H.S?.session?.user?.username;
  const viewingOwner = () => {
    const S = H.S;
    if (S?.room && !S.room.isOwner) return S.room.owner;
    return S?.session ? { username: S.session.user.username, nickname: S.session.user.nickname } : null;
  };
  const isMine = (it) => it.username === me();
  const canDel = (it) => !!board && (board.mine || isMine(it));
  const itemById = (id) => board?.items.find((x) => x.id === id);

  // 한국 시간
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
      : '메모를 붙이거나 그림을 그려서 흔적을 남겨 보세요. 내가 남긴 건 나중에 고칠 수 있어요.';
    $('boardOpenBtn').textContent = mine ? '🖊 우리 집 화이트보드 보기' : `🖊 ${o?.nickname || '친구'}님 화이트보드 열기`;
    $('boardClearBtn').hidden = !(board && board.mine && board.items.length);
    const ul = $('boardList'); ul.textContent = '';
    const items = board && o && board.owner.username === o.username ? [...board.items].reverse() : [];
    $('boardCount').textContent = board ? `${items.length}개` : '';
    if (!items.length) ul.append(el('li', { class: 'note', text: board ? '아직 아무 흔적도 없어요.' : '불러오는 중…' }));
    for (const it of items) {
      const thumb = it.kind === 'draw' ? el('img', { class: 'bthumb', src: it.png, alt: '그림' }) : el('span', { class: 'bthumb', text: '📝', style: `background:${it.color}` });
      const name = el('span', { class: 'name', text: it.kind === 'draw' ? '🖊 그림' : it.text.slice(0, 40) },
        el('small', { text: `${it.nickname}(@${it.username}) · ${when(it.at)}${it.edited ? ' · 고침' : ''}`, title: fullWhen(it.at) + ' (한국 시간)' }));
      const btns = el('span', { class: 'btns' });
      if (canDel(it)) btns.append(el('button', { class: 'ghost small', text: '지우기', onclick: () => del(it) }));
      ul.append(el('li', {}, thumb, name, btns));
    }
  }
  function del(it) {
    const who = isMine(it) ? '내가 남긴' : `${it.nickname}님이 남긴`;
    if (confirm(`${who} ${it.kind === 'draw' ? '그림' : '메모'}을(를) 지울까요?`)) srv({ type: 'board-del', id: it.id });
  }
  $('boardOpenBtn').onclick = openBoard;
  $('boardClearBtn').onclick = () => { if (confirm('우리 집 화이트보드의 흔적을 모두 지울까요? 되돌릴 수 없어요.')) srv({ type: 'board-clear' }); };
  document.querySelector('.tabs button[data-tab=board]').addEventListener('click', () => { srv({ type: 'board-get' }); renderPane(); });

  // ------------------------------------------------------------ 보드 화면 (확대 · 밀기)
  const area = $('boardArea'), mover = $('boardMover'), stage = $('boardStage');
  function applyView() {
    stage.style.zoom = zoom;
    mover.style.left = Math.round(panX) + 'px';
    mover.style.top = Math.round(panY) + 'px';
    $('zoomVal').textContent = Math.round(zoom * 100) + '%';
    placeActions();
  }
  function clampPan() {
    const vw = area.clientWidth, vh = area.clientHeight, sw = BW * zoom, sh = BH * zoom;
    const m = 80;
    panX = sw + m * 2 <= vw ? (vw - sw) / 2 : Math.min(m, Math.max(vw - sw - m, panX));
    panY = sh + m * 2 <= vh ? (vh - sh) / 2 : Math.min(m, Math.max(vh - sh - m, panY));
  }
  function fit() {
    const vw = area.clientWidth || 900, vh = area.clientHeight || 560;
    zoom = Math.max(0.25, Math.min(1, (vw - 24) / BW, (vh - 24) / BH));
    panX = (vw - BW * zoom) / 2; panY = (vh - BH * zoom) / 2;
    applyView();
  }
  function zoomAt(nz, cx, cy) {   // cx, cy: 보드 화면 안 좌표 (이 점이 그대로 있게)
    nz = Math.max(0.25, Math.min(3, nz));
    const bx = (cx - panX) / zoom, by = (cy - panY) / zoom;
    zoom = nz; panX = cx - bx * zoom; panY = cy - by * zoom;
    clampPan(); applyView();
  }
  $('zoomIn').onclick = () => zoomAt(zoom * 1.25, area.clientWidth / 2, area.clientHeight / 2);
  $('zoomOut').onclick = () => zoomAt(zoom / 1.25, area.clientWidth / 2, area.clientHeight / 2);
  $('zoomVal').onclick = fit;
  area.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = area.getBoundingClientRect();
    zoomAt(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // 화면 좌표 → 보드 좌표
  const toBoard = (e) => { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) * BW / r.width, y: (e.clientY - r.top) * BH / r.height }; };

  function openBoard() {
    $('boardModal').hidden = false;
    setMode('view');
    srv({ type: 'board-get' });
    renderBoard();
    requestAnimationFrame(() => { fit(); fitted = true; });
  }
  function closeBoard() { $('boardModal').hidden = true; cancelNote(); endDraw(); select(null); }
  $('boardClose').onclick = closeBoard;
  new ResizeObserver(() => { if (!$('boardModal').hidden) { if (!fitted) fit(); else { clampPan(); applyView(); } } }).observe(area);

  function applyStyle() {
    const bg = board?.style?.bg || DEF_BG;
    stage.style.backgroundColor = bg;
    const n = parseInt(bg.slice(1), 16), l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    stage.classList.toggle('dark-bg', l < 0.45);
    $('boardBgTools').hidden = !board?.mine;
    $('boardBgPick').value = bg;
  }
  $('boardBgPick').addEventListener('change', (e) => srv({ type: 'board-style', bg: e.target.value }));
  $('boardBgPick').addEventListener('input', (e) => { stage.style.backgroundColor = e.target.value; });
  $('boardBgReset').onclick = () => srv({ type: 'board-style', bg: null });

  function renderBoard() {
    if ($('boardModal').hidden) return;
    const o = viewingOwner();
    $('boardTitle').textContent = o && o.username === me() ? '📝 우리 집 화이트보드' : `📝 ${o?.nickname || '친구'}님 집 화이트보드`;
    applyStyle();
    const box = $('boardItems'); box.textContent = '';
    if (!board) return;
    for (const it of board.items) {
      const meta = el('span', { class: 'b-meta', text: `${it.nickname} · ${when(it.at)}${it.edited ? ' · 고침' : ''}` });
      const node = it.kind === 'draw'
        ? el('div', { class: 'b-item b-draw' }, el('img', { src: it.png, alt: '그림', draggable: false, style: `width:${it.dw || it.w}px;height:${it.dh || it.h}px` }), meta)
        : el('div', { class: 'b-item b-note', style: `background:${it.color}` }, el('span', { text: it.text }), meta);
      node.dataset.id = it.id;
      node.style.left = it.x + 'px';
      node.style.top = it.y + 'px';
      node.title = `${it.nickname}(@${it.username})님이 남김 · ${fullWhen(it.at)} (한국 시간)${isMine(it) ? '\n끌어서 옮기고, 눌러서 고칠 수 있어요' : ''}`;
      if (isMine(it)) node.classList.add('mine');
      if (it.id === selId) node.classList.add('sel');
      if ((noteEdit && noteEdit.id === it.id) || (drawEdit && drawEdit.id === it.id)) node.classList.add('editing');
      if (it.fresh) { node.classList.add('new'); delete it.fresh; }
      box.append(node);
    }
    placeActions();
  }

  // ------------------------------------------------------------ 고르기 · 고치기 · 지우기 버튼
  function select(id) { selId = id; renderBoard(); }
  function placeActions() {
    const bar = $('itemActions');
    const it = selId && itemById(selId);
    const node = it && stage.querySelector(`[data-id="${selId}"]`);
    if (!it || !node || mode !== 'view') { bar.hidden = true; return; }
    bar.textContent = '';
    if (isMine(it)) bar.append(el('button', { class: 'ghost small', text: it.kind === 'note' ? '✏️ 고치기' : '🖊 다시 그리기', onclick: () => startEdit(it) }));
    if (canDel(it)) bar.append(el('button', { class: 'ghost small', text: '🗑 지우기', onclick: () => del(it) }));
    if (!bar.childElementCount) { bar.hidden = true; return; }
    bar.hidden = false;
    const ar = area.getBoundingClientRect(), nr = node.getBoundingClientRect();
    bar.style.left = Math.max(4, Math.min(ar.width - 200, nr.left - ar.left)) + 'px';
    bar.style.top = Math.max(4, nr.top - ar.top - 40) + 'px';
  }
  function startEdit(it) {
    select(null);
    if (it.kind === 'note') { setMode('note'); openNote(it.x, it.y, it); }
    else {
      setMode('draw');
      const img = new Image();
      img.onload = () => { drawEdit = { id: it.id, img, x: it.x, y: it.y, w: it.dw || it.w, h: it.dh || it.h }; $('drawCancel').hidden = false; $('drawPost').textContent = '고친 그림 저장'; redraw(); renderBoard(); };
      img.src = it.png;
    }
  }

  // ------------------------------------------------------------ 도구
  function setMode(m) {
    mode = m;
    document.querySelectorAll('#boardModes button').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
    area.classList.toggle('mode-note', m === 'note');
    area.classList.toggle('mode-draw', m === 'draw');
    $('noteTools').hidden = m !== 'note';
    $('penTools').hidden = m !== 'draw';
    $('boardStatus').textContent = {
      view: '끌어서 화이트보드를 밀고, 휠로 확대·축소해요. 내가 남긴 흔적은 끌어서 옮기고 눌러서 고칠 수 있어요.' + (board?.mine ? ' 집주인은 아무 흔적이나 지울 수 있어요.' : ''),
      note: '메모를 붙일 곳을 눌러요. Enter로 붙이고, Shift+Enter로 줄을 바꿔요. 가운데 버튼(휠)을 누른 채 끌면 화이트보드가 밀려요.',
      draw: '자유롭게 그린 다음 [그림 붙이기]를 눌러요. 휠로 확대해서 자세히 그릴 수 있어요. 가운데 버튼(휠)을 누른 채 끌면 화이트보드가 밀려요.',
    }[m];
    if (m !== 'note') cancelNote();
    if (m !== 'draw') endDraw();
    if (m !== 'view') select(null);
    placeActions();
  }
  document.querySelectorAll('#boardModes button').forEach((b) => { b.onclick = () => setMode(b.dataset.mode); });
  function swatches(boxId, colors, get, set) {
    const box = $(boxId); box.textContent = '';
    for (const c of colors) {
      const b = el('button', { title: c, style: `background:${c}`, class: get().toLowerCase() === c ? 'sel' : '' });
      b.onclick = () => { set(c); refreshTools(); };
      box.append(b);
    }
  }
  function refreshTools() {
    swatches('noteColors', NOTE_COLORS, () => noteColor, (c) => { noteColor = c; keep('boardNoteColor', c); $('noteInputBox').style.background = c; });
    swatches('penColors', PEN_COLORS, () => penColor, (c) => { penColor = c; eraser = false; keep('boardPenColor', c); });
    $('noteColorPick').value = noteColor; $('penColorPick').value = penColor;
    $('penEraser').classList.toggle('on', eraser);
  }
  $('noteColorPick').addEventListener('input', (e) => { noteColor = e.target.value; keep('boardNoteColor', noteColor); $('noteInputBox').style.background = noteColor; refreshTools(); });
  $('penColorPick').addEventListener('input', (e) => { penColor = e.target.value; eraser = false; keep('boardPenColor', penColor); refreshTools(); });
  $('penEraser').onclick = () => { eraser = !eraser; refreshTools(); };
  refreshTools();

  // ------------------------------------------------------------ 마우스: 밀기 · 옮기기 · 메모 자리 고르기
  let pan = null, moving = null, spaceDown = false;
  addEventListener('keydown', (e) => { if (e.code === 'Space' && !$('boardModal').hidden && document.activeElement?.tagName !== 'TEXTAREA') { spaceDown = true; e.preventDefault(); } });
  addEventListener('keyup', (e) => { if (e.code === 'Space') spaceDown = false; });
  area.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.note-input') || e.target.closest('.item-actions')) return;
    const wantPan = e.button === 1 || spaceDown || (mode === 'view' && e.button === 0 && !e.target.closest('.b-item'));
    if (wantPan) {
      pan = { sx: e.clientX, sy: e.clientY, px: panX, py: panY, moved: false };
      area.classList.add('panning'); area.setPointerCapture(e.pointerId); e.preventDefault();
      return;
    }
    if (mode === 'view' && e.button === 0) {
      const node = e.target.closest('.b-item'); const it = node && itemById(node.dataset.id);
      if (!it) return;
      const p = toBoard(e);
      moving = { it, node, ox: p.x - it.x, oy: p.y - it.y, sx: e.clientX, sy: e.clientY, moved: false, mine: isMine(it) };
      area.setPointerCapture(e.pointerId); e.preventDefault();
      return;
    }
    if (mode === 'note' && e.button === 0) {
      const p = toBoard(e);
      openNote(p.x, p.y, null);
      e.preventDefault();
    }
  });
  area.addEventListener('pointermove', (e) => {
    if (pan) {
      panX = pan.px + e.clientX - pan.sx; panY = pan.py + e.clientY - pan.sy;
      if (Math.abs(e.clientX - pan.sx) + Math.abs(e.clientY - pan.sy) > 3) pan.moved = true;
      clampPan(); applyView();
    } else if (moving && moving.mine) {
      if (!moving.moved && Math.hypot(e.clientX - moving.sx, e.clientY - moving.sy) < 4) return;
      moving.moved = true;
      const p = toBoard(e);
      moving.nx = Math.round(Math.max(0, Math.min(BW - 40, p.x - moving.ox)));
      moving.ny = Math.round(Math.max(0, Math.min(BH - 30, p.y - moving.oy)));
      moving.node.style.left = moving.nx + 'px'; moving.node.style.top = moving.ny + 'px';
      $('itemActions').hidden = true;
    }
  });
  const endPointer = () => {
    if (pan) { area.classList.remove('panning'); if (!pan.moved && mode === 'view') select(null); pan = null; }
    if (moving) {
      const m = moving; moving = null;
      if (m.moved) { m.it.x = m.nx; m.it.y = m.ny; srv({ type: 'board-edit', id: m.it.id, x: m.nx, y: m.ny }); select(null); }
      else select(selId === m.it.id ? null : m.it.id);
    }
  };
  area.addEventListener('pointerup', endPointer);
  area.addEventListener('pointercancel', endPointer);

  // ---- 메모 쓰기 / 고치기
  function openNote(x, y, it) {
    noteEdit = { id: it ? it.id : null, x: Math.round(Math.max(0, Math.min(BW - 280, x))), y: Math.round(Math.max(0, Math.min(BH - 160, y))) };
    if (it) { noteColor = it.color; refreshTools(); }
    const box = $('noteInputBox');
    box.hidden = false; box.style.background = noteColor;
    box.style.left = noteEdit.x + 'px'; box.style.top = noteEdit.y + 'px';
    $('noteInput').value = it ? it.text : '';
    $('noteSave').textContent = it ? '고친 내용 저장' : '붙이기';
    renderBoard();
    setTimeout(() => { $('noteInput').focus(); $('noteInput').setSelectionRange($('noteInput').value.length, $('noteInput').value.length); }, 0);
  }
  function cancelNote() { $('noteInputBox').hidden = true; const was = noteEdit; noteEdit = null; if (was?.id) renderBoard(); }
  function saveNote() {
    const text = $('noteInput').value.trim();
    if (!noteEdit) return;
    if (text) {
      if (noteEdit.id) srv({ type: 'board-edit', id: noteEdit.id, text, color: noteColor });
      else srv({ type: 'board-add', kind: 'note', text, color: noteColor, x: noteEdit.x, y: noteEdit.y });
    }
    const wasEdit = !!noteEdit.id;
    cancelNote();
    if (wasEdit) setMode('view');
  }
  $('noteSave').onclick = saveNote;
  $('noteCancel').onclick = () => { const wasEdit = !!noteEdit?.id; cancelNote(); if (wasEdit) setMode('view'); };
  $('noteInput').addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { cancelNote(); return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); saveNote(); }
  });

  // ---- 그리기 (캔버스는 보드 크기의 2배로 그려서 확대해도 덜 흐리게)
  const dc = $('boardDraw'), dg = dc.getContext('2d');
  const K = dc.width / BW;
  let strokes = [], cur = null;
  function redraw() {
    dg.setTransform(1, 0, 0, 1, 0, 0);
    dg.clearRect(0, 0, dc.width, dc.height);
    dg.setTransform(K, 0, 0, K, 0, 0);
    if (drawEdit) dg.drawImage(drawEdit.img, drawEdit.x, drawEdit.y, drawEdit.w, drawEdit.h);
    for (const s of strokes.concat(cur ? [cur] : [])) paint(dg, s, 0, 0);
  }
  function paint(g, s, ox, oy) {
    g.save();
    g.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
    g.strokeStyle = s.erase ? '#000' : s.color; g.lineWidth = s.size; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    s.pts.forEach((p, i) => (i ? g.lineTo(p.x - ox, p.y - oy) : g.moveTo(p.x - ox, p.y - oy)));
    if (s.pts.length === 1) g.lineTo(s.pts[0].x - ox + 0.1, s.pts[0].y - oy);
    g.stroke();
    g.restore();
  }
  function endDraw() { strokes = []; cur = null; const was = drawEdit; drawEdit = null; $('drawCancel').hidden = true; $('drawPost').textContent = '그림 붙이기'; redraw(); if (was) renderBoard(); }
  dc.addEventListener('pointerdown', (e) => {
    if (mode !== 'draw' || e.button !== 0 || spaceDown) return;
    e.stopPropagation();
    dc.setPointerCapture(e.pointerId);
    cur = { color: penColor, size: Number($('penSize').value) || 8, erase: eraser, pts: [toBoard(e)] };
    redraw();
  });
  dc.addEventListener('pointermove', (e) => { if (cur) { cur.pts.push(toBoard(e)); redraw(); } });
  const endStroke = () => { if (cur) { strokes.push(cur); cur = null; redraw(); } };
  dc.addEventListener('pointerup', endStroke);
  dc.addEventListener('pointercancel', endStroke);
  $('drawUndo').onclick = () => { strokes.pop(); redraw(); };
  $('drawCancel').onclick = () => { endDraw(); setMode('view'); };
  $('drawPost').onclick = () => {
    if (!strokes.length && !drawEdit) { H.toast('먼저 그림을 그려 주세요'); return; }
    if (!strokes.length && drawEdit) { endDraw(); setMode('view'); return; }
    // 그린 부분(고치는 중이면 원래 그림 자리까지)만 잘라서 PNG로
    let x1 = BW, y1 = BH, x2 = 0, y2 = 0;
    if (drawEdit) { x1 = drawEdit.x; y1 = drawEdit.y; x2 = drawEdit.x + drawEdit.w; y2 = drawEdit.y + drawEdit.h; }
    for (const s of strokes) if (!s.erase) for (const p of s.pts) { x1 = Math.min(x1, p.x - s.size); y1 = Math.min(y1, p.y - s.size); x2 = Math.max(x2, p.x + s.size); y2 = Math.max(y2, p.y + s.size); }
    x1 = Math.max(0, Math.floor(x1)); y1 = Math.max(0, Math.floor(y1)); x2 = Math.min(BW, Math.ceil(x2)); y2 = Math.min(BH, Math.ceil(y2));
    const w = Math.max(4, x2 - x1), h = Math.max(4, y2 - y1);
    let k = Math.min(1, 600 / Math.max(w, h)), png = null;
    for (let tries = 0; tries < 7; tries++) {
      const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w * k)); c.height = Math.max(2, Math.round(h * k));
      const g = c.getContext('2d'); g.scale(k, k);
      if (drawEdit) g.drawImage(drawEdit.img, drawEdit.x - x1, drawEdit.y - y1, drawEdit.w, drawEdit.h);
      for (const s of strokes) paint(g, s, x1, y1);
      png = c.toDataURL('image/png');
      if (png.length < 60 * 1024 * 1.3) break;
      k *= 0.75; png = null;
    }
    if (!png) { H.toast('그림이 너무 복잡해요. 조금 더 단순하게 그려 주세요'); return; }
    if (drawEdit) srv({ type: 'board-edit', id: drawEdit.id, png, x: x1, y: y1, dw: w, dh: h });
    else srv({ type: 'board-add', kind: 'draw', png, x: x1, y: y1, dw: w, dh: h });
    endDraw();
    setMode('view');
  };

  // ------------------------------------------------------------ 서버에서 온 것
  buddy.on('srv', (m) => {
    if (m.type === 'board') {
      board = { owner: m.owner, mine: m.mine, items: m.items, style: m.style || {} };
      if (m.size) { BW = m.size.w; BH = m.size.h; stage.style.width = BW + 'px'; stage.style.height = BH + 'px'; dc.style.width = BW + 'px'; dc.style.height = BH + 'px'; }
      renderPane(); renderBoard(); setMode(mode);
      return;
    }
    if (!board || m.owner !== board.owner.username) return;
    if (m.type === 'board-item') board.items.push({ ...m.item, fresh: true });
    else if (m.type === 'board-upd') board.items = board.items.map((x) => (x.id === m.item.id ? m.item : x));
    else if (m.type === 'board-del') { board.items = board.items.filter((x) => x.id !== m.id); if (selId === m.id) selId = null; }
    else if (m.type === 'board-clear') { board.items = []; selId = null; }
    else if (m.type === 'board-style') board.style = m.style || {};
    else return;
    renderPane(); renderBoard();
  });
  // 다른 집으로 옮기면 그 집 화이트보드를 다시 불러옴
  buddy.on('home-state', (st) => {
    const code = st?.room?.code || null;
    if (code !== lastRoom) {
      lastRoom = code; board = null; selId = null;
      if ($('pane-board').classList.contains('active') || !$('boardModal').hidden) srv({ type: 'board-get' });
      renderPane(); renderBoard();
    }
  });
  renderPane();
})();
