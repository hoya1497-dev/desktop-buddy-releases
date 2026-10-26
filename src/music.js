// 🎵 레코드 플레이어: 같은 방 사람들이 유튜브 노래를 같이 들어요.
// - 서버가 '지금 곡'과 '언제 시작했는지'를 알려 주면, 그 시각에 맞춰 같은 부분부터 틀어요.
// - 볼륨 · 소리 끄기는 나한테만 적용돼요.
(() => {
  const $ = (id) => document.getElementById(id);
  const H = window.HomeCore;
  if (!H || H.isMini) return;
  const srv = (m) => buddy.send('srv', m);

  let M = null;            // 서버가 보낸 음악 상태
  let offset = 0;          // 서버 시각 - 내 시각
  let playingKey = '';     // 지금 iframe 에 넣은 곡 (id:startedAt)
  let reported = '';       // 길이를 알려 준 곡 id
  let errored = '';        // 재생 오류를 알려 준 곡 id
  let ready = false, listenTimer = null, startTimer = null;
  let lastRoom;
  const store = (k, v) => { try { localStorage.setItem(k, String(v)); } catch {} };
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } };
  let vol = Number(load('musicVol', 60));
  let muted = load('musicMuted', '0') === '1';

  const frame = $('ytFrame');
  const serverNow = () => Date.now() + offset;
  const fmt = (s) => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  // 유튜브 링크 → 영상 번호(11자)
  function parseVid(text) {
    const t = String(text || '').trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(t)) return t;
    try {
      const u = new URL(t);
      if (/(^|\.)youtu\.be$/.test(u.hostname)) return u.pathname.slice(1, 12);
      if (/youtube(-nocookie)?\.com$/.test(u.hostname)) {
        if (u.searchParams.get('v')) return u.searchParams.get('v').slice(0, 11);
        const m = u.pathname.match(/\/(embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
        if (m) return m[2];
      }
    } catch {}
    return null;
  }

  // ---------------------------------------------------- 유튜브 플레이어 조종 (postMessage)
  function cmd(func, args = []) {
    try { frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*'); } catch {}
  }
  function applyVolume() {
    cmd('setVolume', [vol]);
    cmd(muted ? 'mute' : 'unMute');
    $('musicMute').textContent = muted || vol === 0 ? '🔇' : vol < 40 ? '🔉' : '🔊';
    $('musicVol').value = vol;
    $('musicVolText').textContent = muted ? '나만 소리 끔' : `내 볼륨 ${vol}`;
    renderBtn();
  }
  frame.addEventListener('load', () => {
    ready = false;
    clearInterval(listenTimer);
    if (frame.src === 'about:blank') return;
    // 플레이어가 상태를 보내 주도록 '듣고 있어요' 신호를 몇 번 보냄
    let n = 0;
    listenTimer = setInterval(() => {
      try { frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch {}
      applyVolume();
      if (++n > 10) clearInterval(listenTimer);
    }, 500);
  });
  addEventListener('message', (e) => {
    if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin)) return;
    let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
    if (!d || typeof d !== 'object') return;
    if (d.event === 'onReady' || d.event === 'initialDelivery') { ready = true; applyVolume(); }
    // 101 · 150: 영상 주인이 다른 곳 재생을 막음, 100: 없는 영상 → 서버에 알려서 다음 곡으로
    if (d.event === 'onError' && M?.current && [100, 101, 150, 153].includes(Number(d.info))) {
      if (errored !== M.current.id) { errored = M.current.id; srv({ type: 'music-error', vid: M.current.vid }); }
    }
    const info = d.info || {};
    const cur = M?.current;
    if (cur && info.duration > 0 && reported !== cur.id && !cur.duration) {
      reported = cur.id;
      srv({ type: 'music-duration', vid: cur.vid, duration: info.duration });
    }
  });

  function play() {
    const cur = M?.current;
    const key = cur ? `${cur.id}:${cur.startedAt}` : '';
    if (key === playingKey) return;
    playingKey = key;
    clearTimeout(startTimer);
    $('ytIdle').hidden = !!cur;
    if (!cur) { frame.src = 'about:blank'; return; }
    const elapsed = (serverNow() - cur.startedAt) / 1000;
    const go = (start) => {
      frame.src = `https://www.youtube-nocookie.com/embed/${cur.vid}?autoplay=1&start=${Math.max(0, Math.floor(start))}&enablejsapi=1&playsinline=1&rel=0`;
    };
    if (elapsed < 0) { frame.src = 'about:blank'; startTimer = setTimeout(() => go(0), -elapsed * 1000); }
    else go(elapsed);
  }

  // ---------------------------------------------------- 화면
  function hasRecordHere() {
    const v = H.viewing && H.viewing();
    return !!(v && v.home && (v.home.items || []).some((it) => it.item === 'record'));
  }
  function renderBtn() {
    const b = $('musicBtn');
    const show = !!(M && M.hasRecord) || hasRecordHere();
    b.hidden = !show;
    const cur = M?.current;
    b.classList.toggle('playing', !!cur);
    b.textContent = cur ? `${muted ? '🔇' : '🎵'} ${cur.title}` : '🎵 레코드';
    b.title = cur ? `지금 나오는 노래: ${cur.title} (누르면 레코드 플레이어)` : '레코드 플레이어 (다 같이 노래 듣기)';
  }
  function el(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e[k] = v; }
    for (const c of kids.flat()) if (c != null) e.append(c);
    return e;
  }
  const smallBtn = (text, cls, onclick, title) => el('button', { class: cls, text, onclick, title: title || '' });
  function songRow(s, extra) {
    return el('li', {}, el('span', { class: 't' }, s.owner ? el('span', { class: 'own', text: '집주인 ' }) : null, s.title, el('small', { text: `${s.nick}(@${s.by})` })), ...(extra || []));
  }
  function render() {
    renderBtn();
    if (!M) return;
    const own = M.isOwner;
    const owner = H.S?.room?.owner;
    $('musicWhere').textContent = owner ? (own ? '· 우리 집' : `· ${owner.nickname}님 집`) : '';
    const cur = M.current;
    const np = $('nowPlaying'); np.textContent = '';
    if (cur) {
      const el2 = (serverNow() - cur.startedAt) / 1000;
      np.append(`▶ ${cur.title}`, el('small', { text: `${cur.owner ? '집주인' : cur.nick + '님 신청'} · ${cur.duration ? `${fmt(el2)} / ${fmt(cur.duration)}` : '재생 중'}` }));
    } else np.textContent = M.hasRecord ? '대기열이 비었어요. 노래를 넣어 보세요!' : '이 집에는 레코드 플레이어가 없어요.';
    $('musicSkip').hidden = !own || !cur;
    $('musicAddBtn').textContent = own ? '넣기' : '신청';
    $('musicUrl').disabled = !M.hasRecord;
    $('musicHint').textContent = !M.hasRecord ? '레코드 플레이어는 상점 → 가구에서 살 수 있어요. 집에 두면 친구들과 같이 들을 수 있어요.'
      : own ? '집주인이 넣은 노래는 친구들 신청곡보다 먼저 나와요. 대기열은 ⠿를 잡고 끌거나 ▲▼로 순서를 바꿀 수 있어요. 친구 신청은 오른쪽에서 수락하면 대기열에 올라가요.'
        : '유튜브 링크를 넣으면 집주인에게 신청돼요. 수락되면 대기열에 올라가 차례대로 나와요. 볼륨과 소리 끄기는 나한테만 적용돼요.';
    if (!drag) renderQueue();
    $('pendingTitle').textContent = own ? `📮 친구들 신청 (${M.pending.length})` : '📮 내가 신청한 노래';
    const p = $('musicPending'); p.textContent = '';
    if (!M.pending.length) p.append(el('li', { class: 'note', text: own ? '들어온 신청이 없어요' : '신청한 노래가 없어요' }));
    for (const s of M.pending) {
      p.append(songRow(s, own
        ? [smallBtn('수락', 'primary small', () => srv({ type: 'music-answer', id: s.id, accept: true })), smallBtn('거절', 'ghost small', () => srv({ type: 'music-answer', id: s.id, accept: false }))]
        : [smallBtn('취소', 'ghost small', () => srv({ type: 'music-remove', id: s.id }))]));
    }
  }
  // ---------------------------------------------------- 대기열: 집주인은 끌어서(또는 ▲▼로) 순서를 바꿀 수 있어요
  let drag = null;   // { id, li }
  function moveSong(id, to) {
    const from = M.queue.findIndex((x) => x.id === id);
    if (from < 0) return;
    to = Math.max(0, Math.min(M.queue.length - 1, to));
    if (to === from) return;
    const [it] = M.queue.splice(from, 1);
    M.queue.splice(to, 0, it);   // 서버 답을 기다리지 않고 바로 보여 줌
    renderQueue();
    srv({ type: 'music-move', id, to });
  }
  function renderQueue() {
    const own = M?.isOwner;
    const q = $('musicQueue'); q.textContent = '';
    q.classList.toggle('sortable', !!own && M.queue.length > 1);
    if (!M.queue.length) { q.append(el('li', { class: 'note', text: '대기열이 비었어요' })); return; }
    M.queue.forEach((s, i) => {
      const btns = own ? [
        smallBtn('▲', 'x mv', () => moveSong(s.id, i - 1), '한 칸 위로'),
        smallBtn('▼', 'x mv', () => moveSong(s.id, i + 1), '한 칸 아래로'),
        smallBtn('✕', 'x', () => srv({ type: 'music-remove', id: s.id }), '대기열에서 빼기'),
      ] : [];
      if (own) { btns[0].disabled = i === 0; btns[1].disabled = i === M.queue.length - 1; }
      const li = songRow(s, btns);
      if (own && M.queue.length > 1) {
        li.prepend(el('span', { class: 'grip', text: '⠿', title: '끌어서 순서 바꾸기' }));
        li.draggable = true;
        li.dataset.id = s.id;
        li.addEventListener('dragstart', (e) => { drag = { id: s.id, li }; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', s.id); } catch {} });
        li.addEventListener('dragend', () => { li.classList.remove('dragging'); clearMarks(); drag = null; render(); });
        li.addEventListener('dragover', (e) => {
          if (!drag || drag.id === s.id) return;
          e.preventDefault();
          const r = li.getBoundingClientRect(), below = e.clientY > r.top + r.height / 2;
          clearMarks(); li.classList.add(below ? 'drop-below' : 'drop-above');
        });
        li.addEventListener('drop', (e) => {
          if (!drag) return;
          e.preventDefault();
          const r = li.getBoundingClientRect(), below = e.clientY > r.top + r.height / 2;
          const from = M.queue.findIndex((x) => x.id === drag.id);
          let to = i + (below ? 1 : 0);
          if (from < to) to--;
          const id = drag.id; drag = null; clearMarks();
          moveSong(id, to);
        });
      }
      q.append(li);
    });
  }
  const clearMarks = () => document.querySelectorAll('#musicQueue .drop-above, #musicQueue .drop-below').forEach((x) => x.classList.remove('drop-above', 'drop-below'));
  setInterval(() => { if (M?.current && !$('musicModal').classList.contains('closed')) render(); }, 1000);

  function open() {
    $('musicModal').classList.remove('closed');
    srv({ type: 'music-get' });
    render();
    setTimeout(() => $('musicUrl').focus(), 30);
  }
  function close() { $('musicModal').classList.add('closed'); }
  $('musicBtn').onclick = open;
  $('musicClose').onclick = close;
  $('musicModal').addEventListener('mousedown', (e) => { if (e.target === $('musicModal')) close(); });
  $('musicUrl').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') close(); });
  $('musicMute').onclick = () => { muted = !muted; store('musicMuted', muted ? 1 : 0); applyVolume(); };
  $('musicVol').oninput = (e) => { vol = Number(e.target.value); if (vol > 0 && muted) { muted = false; store('musicMuted', 0); } store('musicVol', vol); applyVolume(); };
  $('musicSkip').onclick = () => srv({ type: 'music-skip' });
  $('musicForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const vid = parseVid($('musicUrl').value);
    if (!vid) { $('musicHint').textContent = '유튜브 링크를 넣어 주세요. (youtube.com/watch?v=… 또는 youtu.be/…)'; return; }
    $('musicAddBtn').disabled = true;
    const info = await buddy.invoke('yt-info', vid).catch(() => null);
    $('musicAddBtn').disabled = false;
    if (info && info.ok === false && (info.status === 401 || info.status === 403 || info.status === 404)) {
      $('musicHint').textContent = '이 영상은 다른 곳에서 틀 수 없게 막혀 있거나 없는 영상이에요. 다른 영상을 넣어 주세요.';
      return;
    }
    const title = info?.title || `YouTube 영상 (${vid})`;
    srv({ type: M?.isOwner ? 'music-add' : 'music-request', vid, title });
    $('musicUrl').value = '';
  });

  buddy.on('srv', (m) => {
    if (m.type !== 'music') return;
    if (m.room == null) { M = null; playingKey = 'x'; play(); renderBtn(); return; }
    if (typeof m.serverNow === 'number') offset = m.serverNow - Date.now();
    M = m;
    play();
    render();
  });
  // 다른 집으로 옮기면 그 집 레코드 상태를 다시 받아 옴 (노래는 그 집 것으로 바뀜)
  buddy.on('home-state', (st) => {
    const code = st?.room?.code || null;
    if (code !== lastRoom) {
      lastRoom = code; M = null; playingKey = 'x'; play();
      if (code) srv({ type: 'music-get' });
    }
    renderBtn();
  });
  applyVolume();
  window.Music = { open, parseVid };
})();
