// 🗒 메모장: 오늘 할 일(달력) · 메모 · 체크리스트 · 다이어리. 이 컴퓨터에만 저장돼요.
(() => {
  const $ = (id) => document.getElementById(id);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const label = (k) => { const d = fromKey(k); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`; };
  const MEMO_COLORS = ['#fff3a8', '#ffd1dc', '#c9f2d0', '#cfe6ff', '#e8d9ff', '#ffe0b8'];
  const MOODS = ['😊', '😆', '😐', '😢', '😡', '😴'];

  let D = { v: 1, memos: [], lists: [], todos: {}, diary: {} };
  let selDay = keyOf(new Date());
  let calMonth = new Date(); calMonth.setDate(1);
  let diaryDay = keyOf(new Date());
  let saveTimer = null;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => buddy.send('sticky-save', D), 350); };

  function el(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on')) e[k] = v; else if (v != null && v !== false) e[k] = v;
    }
    for (const c of kids.flat()) if (c != null) e.append(c);
    return e;
  }

  // ------------------------------------------------ 탭
  document.querySelectorAll('nav.stabs button').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('nav.stabs button').forEach((x) => x.classList.toggle('active', x === b));
      document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('active', p.id === 'p-' + b.dataset.p));
      try { localStorage.setItem('stickyTab', b.dataset.p); } catch {}
    };
  });
  try { const t = localStorage.getItem('stickyTab'); if (t) document.querySelector(`nav.stabs button[data-p=${t}]`)?.click(); } catch {}
  $('closeBtn').onclick = () => buddy.send('widget-close');
  $('openHome').onclick = () => buddy.send('open-home');

  // 체크 목록 한 줄 (글자를 두 번 누르면 고치기)
  function checkRow(item, onChange, onDelete) {
    const cb = el('input', { type: 'checkbox', checked: !!item.done });
    cb.onchange = () => { item.done = cb.checked; onChange(); };
    const span = el('span', { text: item.text, title: '두 번 눌러서 고치기' });
    span.ondblclick = () => {
      const inp = el('input', { type: 'text', value: item.text, maxLength: 120 });
      const done = (ok) => { if (ok && inp.value.trim()) item.text = inp.value.trim(); onChange(); };
      inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) done(true); else if (e.key === 'Escape') done(false); };
      inp.onblur = () => done(true);
      span.replaceWith(inp); inp.focus(); inp.select();
    };
    return el('li', { class: item.done ? 'done' : '' }, cb, span, el('button', { class: 'x', text: '✕', title: '지우기', onclick: onDelete }));
  }

  // ------------------------------------------------ 📅 오늘 (달력 + 날짜별 할 일)
  function renderCal() {
    $('calTitle').textContent = `${calMonth.getFullYear()}년 ${calMonth.getMonth() + 1}월`;
    const cal = $('cal'); cal.textContent = '';
    for (const d of DOW) cal.append(el('span', { class: 'dow', text: d }));
    const start = new Date(calMonth); start.setDate(1 - start.getDay());
    const today = keyOf(new Date());
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = keyOf(d);
      const has = (D.todos[k] || []).length || (D.diary[k]?.text || '').trim();
      const cls = [d.getMonth() !== calMonth.getMonth() ? 'other' : '', k === today ? 'today' : '', k === selDay ? 'sel' : '', has ? 'has' : ''].join(' ');
      cal.append(el('button', { class: cls, text: d.getDate(), title: label(k), onclick: () => { selDay = k; diaryDay = k; renderToday(); renderDiary(); } }));
      if (i === 34 && d.getMonth() !== calMonth.getMonth()) break;   // 5줄이면 충분할 때
    }
  }
  function renderToday() {
    renderCal();
    const today = keyOf(new Date());
    $('todayTitle').textContent = (selDay === today ? '오늘 · ' : '') + label(selDay);
    const list = D.todos[selDay] || [];
    const done = list.filter((x) => x.done).length;
    $('todoBar').style.width = list.length ? `${Math.round(done / list.length * 100)}%` : '0';
    const ul = $('todoList'); ul.textContent = '';
    if (!list.length) ul.append(el('li', { class: 'muted', text: '할 일이 없어요. 아래에 적어 보세요.' }));
    for (const it of list) {
      ul.append(checkRow(it, () => { save(); renderToday(); }, () => { D.todos[selDay] = list.filter((x) => x !== it); if (!D.todos[selDay].length) delete D.todos[selDay]; save(); renderToday(); }));
    }
  }
  $('calPrev').onclick = () => { calMonth.setMonth(calMonth.getMonth() - 1); renderCal(); };
  $('calNext').onclick = () => { calMonth.setMonth(calMonth.getMonth() + 1); renderCal(); };
  $('goToday').onclick = () => { selDay = keyOf(new Date()); calMonth = new Date(); calMonth.setDate(1); renderToday(); };
  $('todoForm').onsubmit = (e) => {
    e.preventDefault();
    const t = $('todoInput').value.trim();
    if (!t) return;
    (D.todos[selDay] ||= []).push({ id: uid(), text: t, done: false });
    $('todoInput').value = '';
    save(); renderToday();
  };

  // ------------------------------------------------ 📝 메모
  function renderMemos() {
    const box = $('memos'); box.textContent = '';
    if (!D.memos.length) box.append(el('p', { class: 'muted', text: '[＋ 새 메모]로 메모를 붙여 보세요.' }));
    for (const m of D.memos) {
      const ta = el('textarea', { value: m.text, maxLength: 2000, placeholder: '메모…', rows: Math.min(10, Math.max(3, (m.text.match(/\n/g) || []).length + 2)) });
      ta.oninput = () => { m.text = ta.value; m.at = Date.now(); save(); };
      const sws = MEMO_COLORS.map((c) => el('button', { class: 'sw', style: `background:${c}`, title: '색 바꾸기', onclick: () => { m.color = c; save(); renderMemos(); } }));
      const d = new Date(m.at || Date.now());
      box.append(el('div', { class: 'memo', style: `background:${m.color}` }, ta,
        el('div', { class: 'bar' }, ...sws, el('span', { class: 'muted', text: ` ${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}` }),
          el('button', { class: 'x', text: '🗑', title: '메모 지우기', onclick: () => { if (!m.text.trim() || confirm('이 메모를 지울까요?')) { D.memos = D.memos.filter((x) => x !== m); save(); renderMemos(); } } }))));
    }
  }
  $('memoAdd').onclick = () => {
    D.memos.unshift({ id: uid(), text: '', color: MEMO_COLORS[D.memos.length % MEMO_COLORS.length], at: Date.now() });
    save(); renderMemos();
    setTimeout(() => $('memos').querySelector('textarea')?.focus(), 0);
  };

  // ------------------------------------------------ ✅ 체크리스트 (여러 목록)
  function renderLists() {
    const box = $('lists'); box.textContent = '';
    if (!D.lists.length) box.append(el('p', { class: 'muted', text: '[＋ 새 목록]으로 체크리스트를 만들어 보세요.' }));
    for (const L of D.lists) {
      const title = el('input', { type: 'text', class: 'ttl', value: L.title, maxLength: 40, placeholder: '목록 이름' });
      title.oninput = () => { L.title = title.value; save(); };
      const done = L.items.filter((x) => x.done).length;
      const ul = el('ul', { class: 'checks' });
      for (const it of L.items) ul.append(checkRow(it, () => { save(); renderLists(); }, () => { L.items = L.items.filter((x) => x !== it); save(); renderLists(); }));
      const inp = el('input', { type: 'text', maxLength: 120, placeholder: '항목 추가 (Enter)' });
      inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing && inp.value.trim()) { L.items.push({ id: uid(), text: inp.value.trim(), done: false }); save(); renderLists(); setTimeout(() => box.querySelector(`[data-l="${L.id}"] input[placeholder^="항목"]`)?.focus(), 0); } };
      box.append(el('div', { class: 'list', 'data-l': L.id },
        el('div', { class: 'row' }, title, el('span', { class: 'muted', text: `${done}/${L.items.length}` }),
          el('button', { class: 'x', text: '↺', title: '체크 모두 풀기', onclick: () => { L.items.forEach((x) => { x.done = false; }); save(); renderLists(); } }),
          el('button', { class: 'x', text: '🗑', title: '목록 지우기', onclick: () => { if (confirm(`'${L.title || '목록'}'을(를) 지울까요?`)) { D.lists = D.lists.filter((x) => x !== L); save(); renderLists(); } } })),
        el('div', { class: 'progress' }, el('i', { style: `width:${L.items.length ? Math.round(done / L.items.length * 100) : 0}%` })),
        ul, inp));
      box.lastChild.dataset.l = L.id;
    }
  }
  $('listAdd').onclick = () => { D.lists.unshift({ id: uid(), title: '', items: [] }); save(); renderLists(); setTimeout(() => $('lists').querySelector('.ttl')?.focus(), 0); };

  // ------------------------------------------------ 📔 다이어리
  function renderDiary() {
    $('dTitle').textContent = label(diaryDay) + (diaryDay === keyOf(new Date()) ? ' · 오늘' : '');
    const e = D.diary[diaryDay] || {};
    if (document.activeElement !== $('diaryText')) $('diaryText').value = e.text || '';
    const mood = $('mood'); mood.textContent = '';
    for (const m of MOODS) mood.append(el('button', { class: e.mood === m ? 'on' : '', text: m, onclick: () => { const x = (D.diary[diaryDay] ||= { text: '' }); x.mood = x.mood === m ? '' : m; save(); renderDiary(); renderCal(); } }));
  }
  $('diaryText').oninput = () => {
    const x = (D.diary[diaryDay] ||= { text: '' });
    x.text = $('diaryText').value; x.at = Date.now();
    if (!x.text.trim() && !x.mood) delete D.diary[diaryDay];
    save();
  };
  const shiftDay = (n) => { const d = fromKey(diaryDay); d.setDate(d.getDate() + n); diaryDay = keyOf(d); renderDiary(); };
  $('dPrev').onclick = () => shiftDay(-1);
  $('dNext').onclick = () => shiftDay(1);

  function renderAll() { renderToday(); renderMemos(); renderLists(); renderDiary(); }
  function setData(d) {
    if (!d || typeof d !== 'object') return;
    D = { v: 1, memos: Array.isArray(d.memos) ? d.memos : [], lists: Array.isArray(d.lists) ? d.lists : [], todos: d.todos && typeof d.todos === 'object' ? d.todos : {}, diary: d.diary && typeof d.diary === 'object' ? d.diary : {} };
  }
  buddy.invoke('sticky-get').then((d) => { setData(d); renderAll(); }).catch(() => renderAll());
  buddy.on('sticky-data', (d) => { setData(d); renderAll(); });
  // 자정이 지나면 '오늘'을 새로
  let lastDay = keyOf(new Date());
  setInterval(() => { const k = keyOf(new Date()); if (k !== lastDay) { if (selDay === lastDay) selDay = k; lastDay = k; renderToday(); } }, 60_000);
})();
