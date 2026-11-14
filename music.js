// 🎵 레코드 플레이어로 같이 노래 듣기 (유튜브)
// - 집에 '레코드 플레이어'를 둔 집주인의 방에서만 켜져요.
// - 집주인이 넣은 노래는 바로 대기열 앞쪽(집주인 노래끼리는 넣은 순서)으로, 놀러 온 친구는 '신청' → 집주인이 수락해야 대기열 맨 뒤로.
// - 서버가 '언제 시작했는지(startedAt)'를 들고 있고, 모두 그 시각에 맞춰 같은 부분을 들어요.
// - 영상 길이는 처음 재생한 사람의 앱이 알려 주고, 끝나면 서버가 다음 곡을 자동으로 틀어요.
// - 🔂 한 곡 반복 / 🔁 전체 반복(끝난 곡이 대기열 맨 뒤로): 집주인이 정하고, 집주인 계정에 저장돼요(u.music.repeat).
// - ⭐ 즐겨찾기(u.music.favs): 각자 계정에 저장. 링크를 다시 안 넣어도 바로 틀기 · 대기열 · 신청.
// - 🏠 집 배경음(u.music.bgm): 즐겨찾기에서 고른 여러 곡. 대기열이 비어 있으면 저절로 나오고(앱을 다시 켜도),
//   대기열에 노래가 들어오면(집주인이 넣거나 친구 신청을 수락하면) 바로 멈추고, 대기열이 다시 비면 이어서 나와요.
// - 📁 즐겨찾기 폴더(u.music.folders, 0.17.7): 각자 만든 폴더(잔잔한 노래 · 신나는 노래 …)에 즐겨찾기 곡을 넣어 둠.
//   한 곡이 여러 폴더에 들어갈 수 있고, 즐겨찾기에서 빼면 폴더에서도 빠져요. 폴더째 대기열에 넣거나(집주인) 배경음으로 고를 수 있어요.
const VID = /^[A-Za-z0-9_-]{11}$/;
const MAX_QUEUE = 30;
const MAX_PENDING = 15;
const PER_USER_PENDING = 3;
const LOAD_DELAY = 1500;              // 다 같이 불러올 시간 (ms)
const MAX_SONG_SEC = 3 * 3600;        // 길이를 모르면 최대 3시간 뒤엔 넘어감
const MAX_FAVS = 100;                 // 즐겨찾기 곡 수
const MAX_BGM = 30;                   // 배경음 곡 수
const REPEATS = ['off', 'one', 'all'];
const MAX_FOLDERS = 20;               // 📁 폴더 수
const FOLDER_NAME = 20;               // 📁 폴더 이름 글자 수

// 계정에 저장되는 음악 설정 (예전 계정엔 없어서 여기서 채워 줌)
function migrateUser(u) {
  const m = (u.music && typeof u.music === 'object') ? u.music : {};
  const favs = Array.isArray(m.favs) ? m.favs.filter((f) => f && VID.test(f.vid)).slice(0, MAX_FAVS) : [];
  const b = (m.bgm && typeof m.bgm === 'object') ? m.bgm : {};
  const list = Array.isArray(b.list) ? [...new Set(b.list.filter((v) => favs.some((f) => f.vid === v)))].slice(0, MAX_BGM) : [];
  u.music = {
    favs: favs.map((f) => ({ vid: f.vid, title: String(f.title || '').slice(0, 100) || 'YouTube 영상' })),
    bgm: { on: !!b.on && list.length > 0, list, mode: b.mode === 'one' ? 'one' : 'all' },
    repeat: REPEATS.includes(m.repeat) ? m.repeat : 'off',
    folders: (Array.isArray(m.folders) ? m.folders : []).filter((f) => f && typeof f.id === 'string').slice(0, MAX_FOLDERS).map((f) => ({
      id: f.id.slice(0, 16), name: String(f.name || '폴더').slice(0, FOLDER_NAME) || '폴더',
      vids: [...new Set((Array.isArray(f.vids) ? f.vids : []).filter((v) => favs.some((x) => x.vid === v)))].slice(0, MAX_FAVS),
    })),
  };
  return u.music;
}

function create({ send, clean, now, rooms, sessions, ownerOf, perSocket, save = () => {}, pushMe = () => {} }) {
  const states = new Map();   // 방 코드 -> { seq, current, queue, pending, timer }
  const hasRecord = (owner) => !!owner && (owner.home?.items || []).some((it) => it.item === 'record');
  const st = (code) => {
    let s = states.get(code);
    // dur: 영상 길이 기억 (반복 · 배경음은 길이를 아니까 바로 다음 곡 시간을 맞춤), bad: 재생이 막힌 배경음
    if (!s) { s = { seq: 0, current: null, queue: [], pending: [], timer: null, dur: new Map(), bad: new Set() }; states.set(code, s); }
    return s;
  };
  const song = (x) => x && { id: x.id, vid: x.vid, title: x.title, by: x.by, nick: x.nick, owner: !!x.owner, ...(x.bgm ? { bgm: true } : {}) };
  const mus = (u) => (u ? migrateUser(u) : null);
  const repeatOf = (owner) => mus(owner)?.repeat || 'off';

  function audience(code, owner) {
    const out = new Set();
    const room = rooms.get(code);
    if (room) for (const c of room.values()) out.add(c);
    const os = owner && sessions.get(owner.id);
    if (os && os.room === code) out.add(os);
    return out;
  }
  function view(code, ws) {
    const owner = ownerOf(code);
    const s = states.get(code);
    const isOwner = !!owner && ws.user.id === owner.id;
    return {
      type: 'music', room: code, isOwner, hasRecord: hasRecord(owner), serverNow: now(),
      current: s?.current ? { ...song(s.current), startedAt: s.current.startedAt, duration: s.current.duration || 0 } : null,
      repeat: repeatOf(owner),
      bgm: owner ? { on: mus(owner).bgm.on, mode: mus(owner).bgm.mode, n: mus(owner).bgm.list.length } : null,
      queue: (s?.queue || []).map(song),
      // 신청 목록: 집주인은 전부, 친구는 자기가 신청한 것만
      pending: (s?.pending || []).filter((p) => isOwner || p.by === ws.user.username).map(song),
    };
  }
  function cast(code) {
    const owner = ownerOf(code);
    const aud = audience(code, owner);
    if (!aud.size) { stop(code); return; }
    for (const c of aud) send(c, view(code, c));
  }
  function stop(code) {
    const s = states.get(code);
    if (s) clearTimeout(s.timer);
    states.delete(code);
  }
  // 다음 곡: 반복 설정 → 대기열 → (비었으면) 집 배경음
  // opts.skip: 집주인이 다음 곡을 누름(한 곡 반복이어도 넘어감) · opts.drop: 재생이 막힌 곡(다시 안 넣음)
  function advance(code, opts = {}) {
    const s = st(code);
    clearTimeout(s.timer);
    const owner = ownerOf(code);
    if (!hasRecord(owner)) { s.current = null; s.queue = []; cast(code); return; }
    const prev = s.current;
    const mode = repeatOf(owner);
    let next = null;
    if (prev && !prev.bgm && mode === 'one' && !opts.skip && !opts.drop) next = prev;
    else {
      if (prev && !prev.bgm && mode === 'all' && !opts.drop && s.queue.length < MAX_QUEUE) s.queue.push(prev);
      next = s.queue.shift() || null;
    }
    if (!next) next = bgmNext(s, owner, prev, opts);
    start(code, s, next);
  }
  function start(code, s, next) {
    s.current = next ? { ...next, id: 'm' + (++s.seq).toString(36), startedAt: now() + LOAD_DELAY, duration: s.dur.get(next.vid) || 0 } : null;
    if (s.current) {
      const id = s.current.id;
      const wait = s.current.duration ? LOAD_DELAY + s.current.duration * 1000 + 1200 : MAX_SONG_SEC * 1000;
      s.timer = setTimeout(() => { if (states.get(code)?.current?.id === id) advance(code); }, wait);
    }
    cast(code);
  }
  // 🏠 배경음에서 다음 곡 (배경음이 꺼져 있거나 곡이 없으면 null)
  function bgmNext(s, owner, prev, opts) {
    const m = mus(owner);
    if (!m?.bgm.on) return null;
    const list = m.bgm.list.filter((v) => !s.bad.has(v));
    if (!list.length) return null;
    let vid;
    const at = prev?.bgm ? list.indexOf(prev.vid) : -1;
    if (prev?.bgm && at >= 0 && m.bgm.mode === 'one' && !opts.skip && !opts.drop) vid = prev.vid;
    else if (prev?.bgm) vid = list[(at + 1) % list.length];
    else vid = list.includes(s.bgmLast) ? s.bgmLast : list[0];   // 대기열 노래 뒤엔 멈췄던 배경음부터
    s.bgmLast = vid;
    const f = m.favs.find((x) => x.vid === vid);
    return { vid, title: f?.title || 'YouTube 영상', by: owner.username, nick: owner.nickname, owner: true, bgm: true };
  }
  // 아무것도 안 나오고 있으면 배경음 시작 (집에 들어올 때 · 앱을 켤 때 · 배경음 설정이 바뀔 때)
  function wake(code) {
    const s = states.get(code);
    const owner = ownerOf(code);
    if (!hasRecord(owner) || !mus(owner).bgm.on) return false;
    if (!s || (!s.current && !s.queue.length)) { advance(code); return true; }
    return false;
  }
  // 배경음 설정이 바뀌면: 배경음이 나오는 중이거나 조용할 때만 바로 맞춰 줌 (대기열 노래는 그대로)
  function bgmChanged(code) {
    const s = states.get(code);
    const owner = ownerOf(code);
    if (!s) { if (audience(code, owner).size) wake(code); return; }
    const m = mus(owner);
    if (!s.current && !s.queue.length) { advance(code); return; }
    if (s.current?.bgm && (!m.bgm.on || !m.bgm.list.includes(s.current.vid))) { advance(code, { drop: true }); return; }
    cast(code);
  }
  // 대기열에 노래가 들어옴 → 배경음이 나오던 중이면 바로 멈추고 대기열 노래로
  const queued = (code, s) => { if (!s.current || s.current.bgm) advance(code, { skip: true }); else cast(code); };
  function setDuration(code, vid, sec) {
    const s = states.get(code);
    if (!s?.current || s.current.vid !== vid || s.current.duration) return;
    const d = Math.round(Number(sec));
    if (!(d >= 1 && d <= MAX_SONG_SEC)) return;
    s.current.duration = d;
    s.dur.set(vid, d);
    clearTimeout(s.timer);
    const id = s.current.id;
    const left = s.current.startedAt + d * 1000 - now() + 1200;
    s.timer = setTimeout(() => { if (states.get(code)?.current?.id === id) advance(code); }, Math.max(1000, left));
    cast(code);
  }
  const newSong = (s, u, m, owner) => ({ id: 'm' + (++s.seq).toString(36), vid: m.vid, title: clean(m.title, 100) || 'YouTube 영상', by: u.username, nick: u.nickname, owner });

  // ⭐ 즐겨찾기 · 🏠 배경음 · 🔁 반복: 내 계정 설정이라 어느 집에 있든 바꿀 수 있어요
  function handleMine(ws, m) {
    const u = ws.user;
    const err = (message) => send(ws, { type: 'error', message });
    const my = mus(u);
    const done = (bgm) => { save(); pushMe(ws); if (bgm) bgmChanged(u.code); };
    if (!perSocket(ws, 'music-mine', 40, 10_000)) { err('너무 빨리 누르고 있어요. 잠깐만요!'); return; }
    switch (m.type) {
      case 'music-fav': {     // { op: 'add' | 'del' | 'move', vid, title, to }
        const vid = String(m.vid || '');
        if (!VID.test(vid)) return;
        const at = my.favs.findIndex((f) => f.vid === vid);
        if (m.op === 'add') {
          if (at >= 0) return;
          if (my.favs.length >= MAX_FAVS) { err(`즐겨찾기는 ${MAX_FAVS}곡까지예요. 안 듣는 노래를 빼 주세요.`); return; }
          my.favs.push({ vid, title: clean(m.title, 100) || 'YouTube 영상' });
          done(false);
        } else if (m.op === 'del') {
          if (at < 0) return;
          my.favs.splice(at, 1);
          for (const f of my.folders) f.vids = f.vids.filter((v) => v !== vid);   // 📁 폴더에서도 빠짐
          const inBgm = my.bgm.list.includes(vid);
          my.bgm.list = my.bgm.list.filter((v) => v !== vid);
          if (!my.bgm.list.length) my.bgm.on = false;
          done(inBgm);
        }
        return;
      }
      case 'music-bgm': {     // { on, mode, add: vid, del: vid, move: { vid, to } }
        if (typeof m.add === 'string') {
          if (!my.favs.some((f) => f.vid === m.add)) return;
          if (my.bgm.list.includes(m.add)) return;
          if (my.bgm.list.length >= MAX_BGM) { err(`배경음은 ${MAX_BGM}곡까지 고를 수 있어요.`); return; }
          my.bgm.list.push(m.add);
          if (my.bgm.list.length === 1 && m.on !== false) my.bgm.on = true;   // 처음 고르면 바로 켜짐
        }
        if (typeof m.del === 'string') { my.bgm.list = my.bgm.list.filter((v) => v !== m.del); if (!my.bgm.list.length) my.bgm.on = false; }
        if (m.move && typeof m.move.vid === 'string') {
          const from = my.bgm.list.indexOf(m.move.vid), to = Math.floor(Number(m.move.to));
          if (from >= 0 && Number.isFinite(to)) { const [v] = my.bgm.list.splice(from, 1); my.bgm.list.splice(Math.max(0, Math.min(my.bgm.list.length, to)), 0, v); }
        }
        if (m.mode === 'one' || m.mode === 'all') my.bgm.mode = m.mode;
        if (typeof m.on === 'boolean') {
          if (m.on && !my.bgm.list.length) { err('배경음으로 쓸 노래를 즐겨찾기에서 먼저 골라 주세요. (🏠 버튼)'); return; }
          my.bgm.on = m.on;
        }
        const st0 = states.get(u.code);
        if (st0) st0.bad.clear();   // 다시 고르면 막혔던 곡도 한 번 더 시도
        done(true);
        return;
      }
      case 'music-folder': {  // 📁 { op: 'add', name } | { op: 'rename', id, name } | { op: 'del', id } | { op: 'put', id, vid, on } | { op: 'bgm', id }
        const name = clean(m.name, FOLDER_NAME);
        const f = my.folders.find((x) => x.id === m.id);
        if (m.op === 'add') {
          if (!name) { err('폴더 이름을 적어 주세요.'); return; }
          if (my.folders.length >= MAX_FOLDERS) { err(`폴더는 ${MAX_FOLDERS}개까지 만들 수 있어요.`); return; }
          if (my.folders.some((x) => x.name === name)) { err('같은 이름의 폴더가 있어요.'); return; }
          const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
          const first = typeof m.vid === 'string' && my.favs.some((x) => x.vid === m.vid) ? [m.vid] : [];   // 편집 중에 만들면 그 노래를 바로 넣음
          my.folders.push({ id, name, vids: first });
          save(); pushMe(ws, { reason: 'music-folder', op: 'add', id, name });
          return;
        }
        if (!f) return;
        if (m.op === 'rename') {
          if (!name) { err('폴더 이름을 적어 주세요.'); return; }
          if (my.folders.some((x) => x !== f && x.name === name)) { err('같은 이름의 폴더가 있어요.'); return; }
          f.name = name; done(false); return;
        }
        if (m.op === 'del') { my.folders = my.folders.filter((x) => x !== f); done(false); return; }   // 노래는 즐겨찾기에 그대로
        if (m.op === 'put') {
          const vid = String(m.vid || '');
          if (!my.favs.some((x) => x.vid === vid)) return;
          const has = f.vids.includes(vid);
          if (m.on && !has) f.vids.push(vid);
          else if (!m.on && has) f.vids = f.vids.filter((v) => v !== vid);
          else return;
          done(false); return;
        }
        if (m.op === 'bgm') {   // 이 폴더 노래들로 배경음을 바꿈
          if (!f.vids.length) { err('폴더가 비어 있어요. 노래를 먼저 넣어 주세요.'); return; }
          my.bgm.list = f.vids.slice(0, MAX_BGM);
          my.bgm.on = true;
          const st0 = states.get(u.code); if (st0) st0.bad.clear();
          done(true);
          send(ws, { type: 'notice', message: `🏠 배경음을 📁 ${f.name} 폴더로 바꿨어요 (${my.bgm.list.length}곡)` });
          return;
        }
        return;
      }
      case 'music-repeat': {  // 'off' | 'one' | 'all' (우리 집 레코드)
        if (!REPEATS.includes(m.mode)) return;
        my.repeat = m.mode;
        save(); pushMe(ws);
        if (states.get(u.code)) cast(u.code);
        return;
      }
    }
  }

  function handle(ws, m) {
    if (!String(m.type || '').startsWith('music-')) return false;
    if (m.type === 'music-fav' || m.type === 'music-bgm' || m.type === 'music-repeat' || m.type === 'music-folder') { handleMine(ws, m); return true; }
    const u = ws.user;
    const code = ws.room;
    const err = (message) => send(ws, { type: 'error', message });
    if (!code) { if (m.type === 'music-get') send(ws, { type: 'music', room: null }); return true; }
    const owner = ownerOf(code);
    const isOwner = !!owner && owner.id === u.id;
    const s = st(code);
    switch (m.type) {
      case 'music-get':
        if (isOwner || audience(code, owner).size) { if (wake(code)) return true; }   // 🏠 조용하면 배경음부터 (wake 가 모두에게 보내 줌)
        send(ws, view(code, ws)); return true;
      case 'music-duration': setDuration(code, String(m.vid || ''), m.duration); return true;
      case 'music-folder-play': {   // 📁 집주인: 폴더 노래를 대기열에 다 넣기 (shuffle 이면 섞어서)
        if (!isOwner) { err('폴더째 넣기는 우리 집에서만 돼요. 친구 집에선 한 곡씩 신청해 주세요.'); return true; }
        if (!hasRecord(owner)) { err('이 집에는 레코드 플레이어가 없어요. (상점 → 가구)'); return true; }
        if (!perSocket(ws, 'music', 12, 60_000)) { err('노래를 너무 빨리 넣고 있어요. 잠깐만요!'); return true; }
        const my = mus(u);
        const f = my.folders.find((x) => x.id === m.id);
        if (!f || !f.vids.length) { err('폴더가 비어 있어요.'); return true; }
        let vids = f.vids.slice();
        if (m.shuffle) for (let i = vids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [vids[i], vids[j]] = [vids[j], vids[i]]; }
        const room = MAX_QUEUE - s.queue.length;
        if (room <= 0) { err(`대기열은 ${MAX_QUEUE}곡까지예요.`); return true; }
        const items = vids.slice(0, room).map((vid) => newSong(s, u, { vid, title: (my.favs.find((x) => x.vid === vid) || {}).title }, true));
        const at = s.queue.findIndex((q) => !q.owner);   // 집주인 노래끼리는 넣은 순서, 친구 노래보다 앞
        if (at < 0) s.queue.push(...items); else s.queue.splice(at, 0, ...items);
        send(ws, { type: 'notice', message: `📁 ${f.name} 폴더에서 ${items.length}곡을 대기열에 넣었어요${vids.length > items.length ? ` (대기열이 꽉 차서 ${vids.length - items.length}곡은 못 넣었어요)` : ''}${m.shuffle ? ' · 🔀 섞어서' : ''}` });
        queued(code, s);
        return true;
      }
      case 'music-play':      // 집주인: ⭐ 즐겨찾기에서 '지금 틀기' (대기열 맨 앞에 넣고 바로 넘어감)
      case 'music-add':       // 집주인: 바로 대기열에
      case 'music-request': { // 친구: 집주인에게 신청
        if (!hasRecord(owner)) { err('이 집에는 레코드 플레이어가 없어요. (상점 → 가구)'); return true; }
        if (!perSocket(ws, 'music', 12, 60_000)) { err('노래를 너무 빨리 넣고 있어요. 잠깐만요!'); return true; }
        if (!VID.test(String(m.vid || ''))) { err('유튜브 링크가 올바르지 않아요.'); return true; }
        if (isOwner) {
          if (s.queue.length >= MAX_QUEUE) { err(`대기열은 ${MAX_QUEUE}곡까지예요.`); return true; }
          const item = newSong(s, u, m, true);
          if (m.type === 'music-play') { s.queue.unshift(item); advance(code, { skip: true }); return true; }
          // 집주인 노래는 친구 노래보다 앞에 (집주인 노래끼리는 넣은 순서대로)
          const at = s.queue.findIndex((q) => !q.owner);
          if (at < 0) s.queue.push(item); else s.queue.splice(at, 0, item);
          queued(code, s);   // 배경음이 나오던 중이면 멈추고 이 노래로
        } else {
          if (s.pending.length >= MAX_PENDING) { err('신청이 너무 많이 밀려 있어요. 조금 뒤에 해 주세요.'); return true; }
          if (s.pending.filter((p) => p.by === u.username).length >= PER_USER_PENDING) { err(`한 사람은 ${PER_USER_PENDING}곡까지 신청할 수 있어요.`); return true; }
          s.pending.push(newSong(s, u, m, false));
          send(ws, { type: 'notice', message: '🎵 노래를 신청했어요. 집주인이 수락하면 대기열에 올라가요.' });
          const os = sessions.get(owner.id);
          if (os && os.room === code) send(os, { type: 'notice', message: `🎵 ${u.nickname}님이 노래를 신청했어요: ${clean(m.title, 40) || m.vid}` });
          cast(code);
        }
        return true;
      }
      case 'music-answer': {  // 집주인: 신청 수락 / 거절
        if (!isOwner) return true;
        const p = s.pending.find((x) => x.id === String(m.id || ''));
        if (!p) return true;
        s.pending = s.pending.filter((x) => x !== p);
        const rs = [...audience(code, owner)].find((c) => c.user.username === p.by);
        if (m.accept) {
          if (s.queue.length >= MAX_QUEUE) { err(`대기열은 ${MAX_QUEUE}곡까지예요.`); s.pending.unshift(p); return true; }
          s.queue.push(p);
          if (rs) send(rs, { type: 'notice', message: `🎵 신청한 노래가 대기열에 올라갔어요: ${p.title}` });
          if (!s.current || s.current.bgm) { queued(code, s); return true; }
        } else if (rs) send(rs, { type: 'notice', message: `🎵 이번엔 신청한 노래를 못 틀었어요: ${p.title}` });
        cast(code);
        return true;
      }
      case 'music-error': {   // 유튜브가 '다른 곳에서 재생 금지'인 영상: 시작하고 30초 안에 알려 오면 다음 곡으로
        const cur = s.current;
        if (cur && cur.vid === String(m.vid || '') && now() - cur.startedAt < 30_000) {
          for (const c of audience(code, owner)) send(c, { type: 'notice', message: `🎵 '${cur.title}'은(는) 유튜브에서 다른 곳 재생을 막아 둔 영상이라 다음 곡으로 넘어가요.` });
          if (cur.bgm) s.bad.add(cur.vid);   // 막힌 배경음은 이번엔 건너뜀 (배경음을 다시 고르면 다시 시도)
          advance(code, { drop: true });
        }
        return true;
      }
      case 'music-move': {    // 집주인: 대기열 순서 바꾸기 (끌어서 옮기기 · ▲▼). to = 옮길 자리 (0 = 맨 앞)
        if (!isOwner) return true;
        if (!perSocket(ws, 'music-move', 30, 10_000)) return true;
        const from = s.queue.findIndex((x) => x.id === String(m.id || ''));
        const to = Math.floor(Number(m.to));
        if (from < 0 || !Number.isFinite(to)) { cast(code); return true; }
        const [item] = s.queue.splice(from, 1);
        s.queue.splice(Math.max(0, Math.min(s.queue.length, to)), 0, item);
        cast(code);
        return true;
      }
      case 'music-skip':      // 집주인: 다음 곡 (한 곡 반복이어도 넘어감)
        if (isOwner) advance(code, { skip: true });
        return true;
      case 'music-remove': {  // 집주인: 대기열에서 빼기 / 친구: 내 신청 취소
        const id = String(m.id || '');
        if (isOwner) s.queue = s.queue.filter((x) => x.id !== id);
        s.pending = s.pending.filter((x) => !(x.id === id && (isOwner || x.by === u.username)));
        cast(code);
        return true;
      }
      default: return true;
    }
  }
  // 집에서 레코드를 치우면 노래도 멈춤
  function homeChanged(code) {
    const s = states.get(code);
    if (s && !hasRecord(ownerOf(code))) { clearTimeout(s.timer); s.current = null; s.queue = []; s.pending = []; cast(code); }
    else if (hasRecord(ownerOf(code)) && audience(code, ownerOf(code)).size) wake(code);   // 레코드를 놓으면 배경음 시작
  }
  return { handle, cast, homeChanged, stop };
}

module.exports = { create, migrateUser };
