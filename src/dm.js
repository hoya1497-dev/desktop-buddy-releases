// 친구와 1:1 개인 채팅
(() => {
  const $ = (id) => document.getElementById(id);
  const H = window.HomeCore;
  if (!H || H.isMini) return;
  const srv = (m) => buddy.send('srv', m);
  let peer = null, nick = '', msgs = [];

  const KT = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: 'numeric', minute: '2-digit' });
  const KD = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' });
  const me = () => H.S?.session?.user?.username;

  function open(username, nickname) {
    if (!username) return;
    peer = username; nick = nickname || (H.S?.friends?.friends || []).find((f) => f.username === username)?.nickname || username;
    msgs = [];
    $('friends').hidden = true;
    $('dmModal').hidden = false;
    $('dmTitle').textContent = `✉️ ${nick}(@${peer})님과 개인 채팅`;
    render('불러오는 중…');
    srv({ type: 'dm-get', with: peer });
    setTimeout(() => $('dmInput').focus(), 30);
  }
  function close() { $('dmModal').hidden = true; peer = null; }

  function render(note) {
    const log = $('dmLog'); log.textContent = '';
    if (note || !msgs.length) {
      const p = document.createElement('div'); p.className = 'dm-day';
      p.textContent = note || '아직 주고받은 메시지가 없어요. 먼저 인사해 보세요! 👋';
      log.append(p);
      if (note) return;
    }
    let lastDay = '';
    for (const m of msgs) {
      const day = KD.format(new Date(m.at));
      if (day !== lastDay) { const d = document.createElement('div'); d.className = 'dm-day'; d.textContent = day; log.append(d); lastDay = day; }
      const box = document.createElement('div'); box.className = 'dm-msg' + (m.from === me() ? ' mine' : '');
      let t;
      if (m.emote && window.EmoteArt && EmoteArt.has(m.emote)) {   // 0.17.3 이모티콘은 말풍선 없이 그림만
        t = document.createElement('img'); t.className = 'dm-emote'; t.src = `assets/emotes/${m.emote}.png`; t.alt = m.text || ''; t.title = m.text || '';
      } else { t = document.createElement('div'); t.className = 'txt'; t.textContent = m.text; }
      const tm = document.createElement('time'); tm.textContent = KT.format(new Date(m.at));
      box.append(t, tm); log.append(box);
    }
    log.scrollTop = log.scrollHeight;
  }

  // 0.17.3 😊 개인 채팅 이모티콘 (채팅 창과 같은 그림)
  const DM_EMOTES = [['wave', '안녕'], ['bye', '잘가'], ['zzz', '잘자'], ['good', '굿'], ['dislike', '싫어'], ['heart', '좋아'], ['cheer', '응원'], ['poke', '콕 찌르기']];
  for (const [kind, label] of DM_EMOTES) {
    const b = document.createElement('button'); b.type = 'button'; b.title = label; b.dataset.dmEmote = kind;
    const img = document.createElement('img'); img.src = `assets/emotes/${kind}.png`; img.alt = label;
    b.append(img);
    b.onclick = () => { if (peer) srv({ type: 'dm-send', to: peer, emote: kind }); };
    $('dmEmotes').append(b);
  }

  $('dmClose').onclick = close;
  $('dmForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('dmInput').value.trim();
    if (!text || !peer) return;
    srv({ type: 'dm-send', to: peer, text });
    $('dmInput').value = '';
  });
  $('dmInput').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') close(); });

  buddy.on('srv', (m) => {
    if (m.type === 'dm-history' && m.peer === peer) { msgs = m.msgs || []; render(); }
    else if (m.type === 'dm') {
      if (m.peer === peer && !$('dmModal').hidden) {
        msgs.push(m.msg); if (msgs.length > 100) msgs.shift(); render();
        if (m.msg.from !== me()) srv({ type: 'dm-read', with: peer });
      } else if (m.msg.from !== me()) {
        H.toast(`✉️ ${m.nickname || m.peer}: ${m.msg.text.slice(0, 40)}`);
      }
    }
  });
  buddy.on('open-dm', (username) => open(username));
  window.DM = { open };
})();
