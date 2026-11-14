// ✉️ 운영자에게 쪽지: 누구나 보내고 답장을 받아요. 운영자(공지 권한)는 📬 받은 쪽지함에서 읽고 답장해요.
(() => {
  const $ = (id) => document.getElementById(id);
  const H = window.HomeCore;
  if (!H || H.isMini) return;
  const srv = (m) => buddy.send('srv', m);
  let mine = [], inbox = null, unread = 0, newReplies = 0, tab = 'write';

  const KD = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const when = (t) => KD.format(new Date(t));

  function el(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e[k] = v;
    }
    for (const c of kids.flat()) if (c != null) e.append(c);
    return e;
  }
  const replies = (x) => x.replies.map((r) => el('div', { class: 'reply' }, el('span', { class: 'who', text: `↳ ${r.by} · ${when(r.at)}` }), r.text));

  function renderDot() {
    const n = newReplies + (inbox ? unread : 0);
    $('mailDot').hidden = !n;
    $('mailInboxCount').hidden = !unread;
    $('mailInboxCount').textContent = unread;
  }

  function renderMine() {
    const box = $('mailMine'); box.textContent = '';
    if (!mine.length) { box.append(el('p', { class: 'note', text: '아직 보낸 쪽지가 없어요.' })); return; }
    for (const x of mine) {
      box.append(el('article', { class: 'mail-item' + (x.fresh ? ' fresh' : '') },
        el('div', { class: 'meta' }, el('span', { text: when(x.at) }), el('span', { text: x.replies.length ? (x.fresh ? '📬 새 답장' : '답장 받음') : x.read ? '운영자가 읽었어요' : '보냄' })),
        el('div', { class: 'txt', text: x.text }),
        replies(x),
        x.replies.length ? null : el('div', { class: 'wait', text: '운영자가 답장하면 알림이 와요.' })));
    }
  }

  function renderInbox() {
    const box = $('mailInboxList'); box.textContent = '';
    const list = (inbox || []).filter((x) => !$('mailUnreadOnly').checked || !x.read);
    if (!list.length) { box.append(el('p', { class: 'note', text: $('mailUnreadOnly').checked ? '안 읽은 쪽지가 없어요.' : '받은 쪽지가 없어요.' })); return; }
    for (const x of list) {
      const input = el('input', { maxLength: 500, placeholder: '답장 쓰기 (Enter)', autocomplete: 'off' });
      input.addEventListener('keydown', (e) => e.stopPropagation());
      const form = el('form', {}, input, el('button', { class: 'primary small', text: '답장' }));
      form.onsubmit = (e) => { e.preventDefault(); const text = input.value.trim(); if (!text) return; srv({ type: 'mail-reply', id: x.id, text }); input.value = ''; };
      box.append(el('article', { class: 'mail-item' + (x.read ? '' : ' unread') },
        el('div', { class: 'meta' }, el('span', {}, el('b', { text: `#${x.id} ${x.nickname}` }), ` (@${x.from})`), el('span', { text: when(x.at) })),
        el('div', { class: 'txt', text: x.text }),
        replies(x),
        form,
        el('div', { class: 'acts' },
          el('button', { class: 'ghost small', text: x.read ? '안 읽음으로' : '✓ 읽음', onclick: () => srv({ type: 'mail-read', id: x.id, read: !x.read }) }),
          el('button', { class: 'ghost small', text: '🗑 지우기', onclick: () => { if (confirm(`#${x.id} 쪽지를 지울까요?`)) srv({ type: 'mail-del', id: x.id }); } }))));
    }
  }

  function render() {
    if ($('mailModal').hidden) return;
    $('mailTabs').hidden = !inbox;
    if (!inbox) tab = 'write';
    for (const b of $('mailTabs').querySelectorAll('button')) b.classList.toggle('on', b.dataset.tab === tab);
    $('mailWrite').hidden = tab !== 'write';
    $('mailInbox').hidden = tab !== 'inbox';
    if (tab === 'write') renderMine(); else renderInbox();
  }

  function open() {
    $('mailModal').hidden = false;
    if (inbox && unread && !newReplies) tab = 'inbox';
    render();
    srv({ type: 'mail-get', open: true });
    if (tab === 'write') setTimeout(() => $('mailText').focus(), 30);
  }
  const close = () => { $('mailModal').hidden = true; };

  $('mailBtn').onclick = () => ($('mailModal').hidden ? open() : close());
  $('mailClose').onclick = close;
  $('mailModal').addEventListener('mousedown', (e) => { if (e.target === $('mailModal')) close(); });
  for (const b of $('mailTabs').querySelectorAll('button')) b.onclick = () => { tab = b.dataset.tab; render(); };
  $('mailUnreadOnly').onchange = renderInbox;
  $('mailText').addEventListener('keydown', (e) => e.stopPropagation());
  $('mailText').addEventListener('input', () => { $('mailLen').textContent = $('mailText').value.length; });
  $('mailForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('mailText').value.trim();
    if (!text) { H.toast('쪽지 내용을 써 주세요.'); return; }
    srv({ type: 'mail-send', text });
  });

  buddy.on('srv', (m) => {
    if (m.type !== 'mail') return;
    mine = Array.isArray(m.mine) ? m.mine : [];
    newReplies = m.newReplies || 0;
    inbox = Array.isArray(m.inbox) ? m.inbox : null;
    unread = inbox ? m.unread || 0 : 0;
    if (m.sent) { $('mailText').value = ''; $('mailLen').textContent = '0'; H.toast('✉️ 운영자에게 쪽지를 보냈어요!'); }
    if (m.fresh && $('mailModal').hidden) H.toast(`✉️ ${m.fresh.from}님이 운영자에게 쪽지를 보냈어요`);
    // 쪽지함을 열어 둔 채로 답장이 오면 바로 읽음 처리
    if (!$('mailModal').hidden && newReplies && tab === 'write') srv({ type: 'mail-get', open: true });
    renderDot(); render();
  });
  window.Mail = { open };
})();
