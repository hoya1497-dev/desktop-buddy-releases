// 화면에 고정하는 작은 타이머 창 (시간 계산은 메인에서 하고 여기선 보여 주기만)
(() => {
  const $ = (id) => document.getElementById(id);
  let view = { timers: [], now: Date.now() };
  let skew = 0; // 메인과 이 창의 시계 차이

  const fmt = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    const two = (n) => String(n).padStart(2, '0');
    return h ? `${h}:${two(m)}:${two(x)}` : `${two(m)}:${two(x)}`;
  };
  const leftOf = (t) => (t.state === 'running' ? t.endsAt - (Date.now() + skew) : t.state === 'done' ? 0 : t.left);

  function btn(text, title, fn) {
    const b = document.createElement('button');
    b.textContent = text; b.title = title; b.onclick = fn;
    return b;
  }
  function render() {
    const ul = $('list'); ul.textContent = '';
    // 돌아가는 것 → 멈춘 것 → 끝난 것 → 대기 순으로
    const order = { running: 0, paused: 1, done: 2, idle: 3 };
    const list = [...view.timers].sort((a, b) => order[a.state] - order[b.state]);
    $('empty').hidden = list.length > 0;
    for (const t of list) {
      const li = document.createElement('li'); li.className = t.state; li.dataset.id = t.id;
      const nm = document.createElement('span'); nm.className = 'nm';
      const b = document.createElement('b'); b.textContent = t.name;
      const sm = document.createElement('small');
      sm.textContent = (t.state === 'done' ? '끝! ' : t.state === 'paused' ? '멈춤 · ' : '') + (t.repeat ? `🔁 ${t.round}번째` : `${t.minutes}분`);
      const bar = document.createElement('div'); bar.className = 'bar'; bar.append(document.createElement('i'));
      nm.append(b, sm, bar);
      const tm = document.createElement('span'); tm.className = 'tm';
      li.append(nm, tm);
      if (t.state === 'running') li.append(btn('⏸', '잠깐 멈춤', () => buddy.send('timer-cmd', { op: 'pause', id: t.id })));
      else li.append(btn('▶', t.state === 'done' ? '다시 시작' : '시작', () => buddy.send('timer-cmd', { op: 'start', id: t.id })));
      li.append(btn('↺', '처음으로', () => buddy.send('timer-cmd', { op: 'reset', id: t.id })));
      ul.append(li);
    }
    tick();
    requestAnimationFrame(() => buddy.send('widget-size', { h: $('card').offsetHeight + 12 }));
  }
  function tick() {
    for (const li of $('list').children) {
      const t = view.timers.find((x) => x.id === li.dataset.id);
      if (!t) continue;
      const left = leftOf(t);
      li.querySelector('.tm').textContent = fmt(left);
      const total = t.minutes * 60_000;
      li.querySelector('.bar i').style.width = Math.max(0, Math.min(100, (1 - left / total) * 100)) + '%';
    }
  }
  buddy.on('timers', (v) => { view = v; skew = v.now - Date.now(); render(); });
  buddy.invoke('get-timers').then((v) => { view = v; skew = v.now - Date.now(); render(); }).catch(() => {});
  setInterval(tick, 250);
  $('closeBtn').onclick = () => buddy.send('widget-close');
  $('openBtn').onclick = () => buddy.send('open-home');
})();
