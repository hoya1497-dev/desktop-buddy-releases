// 📢 공지 패널: 맨 위 한 줄에 최신 공지, 누르면 전체 공지. 운영자(writer)만 쓰고 고치고 지울 수 있어요.
(() => {
  const $ = (id) => document.getElementById(id);
  const H = window.HomeCore;
  if (!H || H.isMini) return;
  const srv = (m) => buddy.send('srv', m);
  let list = [], canEdit = false, editing = null; // editing: null | 'new' | 공지 id

  const KD = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const KS = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' });
  const seenAt = () => { try { return Number(localStorage.getItem('noticeSeen')) || 0; } catch { return 0; } };
  const markSeen = () => { try { if (list[0]) localStorage.setItem('noticeSeen', String(list[0].at)); } catch {} };
  const isNew = (n) => n.at > seenAt();

  function el(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e[k] = v; else e[k] = v;
    }
    for (const c of kids.flat()) if (c != null) e.append(c);
    return e;
  }

  function renderBar() {
    const bar = $('noticeBar');
    const top = list[0];
    bar.hidden = !top && !canEdit;
    $('noticeBarText').textContent = top ? `${top.title} · ${KS.format(new Date(top.at))}` : '아직 공지가 없어요. 눌러서 첫 공지를 써 보세요.';
    $('noticeNew').hidden = !(top && isNew(top));
  }

  function renderModal() {
    if ($('noticeModal').hidden) return;
    $('noticeTools').hidden = !canEdit || !!editing;
    $('noticeForm').hidden = !editing;
    const box = $('noticeList'); box.textContent = '';
    if (!list.length) box.append(el('p', { class: 'note', text: canEdit ? '아직 공지가 없어요. [새 공지 쓰기]로 첫 업데이트 소식을 올려 보세요.' : '아직 공지가 없어요.' }));
    const seen = Number(box.dataset.seen || 0);
    for (const n of list) {
      const head = el('h3', {}, el('span', { text: n.title }), n.at > seen ? el('span', { class: 'new', text: 'NEW' }) : null);
      const meta = el('div', { class: 'meta', text: `${KD.format(new Date(n.at))}${n.edited ? ' · 고침' : ''} · ${n.by}` });
      const item = el('article', { class: 'notice-item' }, head, meta, el('div', { class: 'body', text: n.body || '' }));
      if (canEdit) {
        item.append(el('div', { class: 'acts' },
          el('button', { class: 'ghost small', text: '✏️ 고치기', onclick: () => startEdit(n) }),
          el('button', { class: 'ghost small', text: '🗑 지우기', onclick: () => { if (confirm(`'${n.title}' 공지를 지울까요?`)) srv({ type: 'notice-del', id: n.id }); } })));
      }
      box.append(item);
    }
  }

  function open() {
    $('noticeModal').hidden = false;
    $('noticeList').dataset.seen = String(seenAt());  // 열 때 기준으로 NEW 표시
    markSeen();
    renderBar(); renderModal();
    srv({ type: 'notices-get' });
  }
  function close() { $('noticeModal').hidden = true; editing = null; }
  function startEdit(n) {
    editing = n ? n.id : 'new';
    $('noticeTitle').value = n ? n.title : '';
    $('noticeBody').value = n ? n.body : '';
    $('noticeSave').textContent = n ? '고친 내용 저장' : '올리기';
    $('noticeFormNote').textContent = n ? '' : '올리면 접속한 친구들에게 알림이 가요.';
    renderModal();
    setTimeout(() => $('noticeTitle').focus(), 20);
  }

  $('noticeBar').onclick = open;
  $('noticeBar').onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
  $('noticeClose').onclick = close;
  $('noticeModal').addEventListener('mousedown', (e) => { if (e.target === $('noticeModal') && !editing) close(); });
  $('noticeWrite').onclick = () => startEdit(null);
  $('noticeCancel').onclick = () => { editing = null; renderModal(); };
  for (const id of ['noticeTitle', 'noticeBody']) $(id).addEventListener('keydown', (e) => e.stopPropagation());
  $('noticeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('noticeTitle').value.trim(), body = $('noticeBody').value.trim();
    if (!title) { $('noticeFormNote').textContent = '제목을 써 주세요.'; return; }
    if (editing === 'new') srv({ type: 'notice-post', title, body });
    else srv({ type: 'notice-edit', id: editing, title, body });
    editing = null;
    $('noticeFormNote').textContent = '';
  });

  buddy.on('srv', (m) => {
    if (m.type !== 'notices') return;
    list = Array.isArray(m.list) ? m.list : [];
    canEdit = !!m.canEdit;
    if (!$('noticeModal').hidden) markSeen();
    renderBar(); renderModal();
    if (m.fresh && list[0] && $('noticeModal').hidden) H.toast(`📢 새 공지: ${list[0].title}`);
  });
  // 집 창이 처음 열릴 때 공지를 받아 옴
  let asked = false;
  buddy.on('home-state', (st) => { if (!asked && st?.session) { asked = true; srv({ type: 'notices-get' }); } });
  window.Notices = { open };
})();
