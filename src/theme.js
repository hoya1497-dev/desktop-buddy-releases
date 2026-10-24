// 화면 모드: 컴퓨터 설정 · 화이트 · 다크 · 🌈 오로라 · 🎨 사용자 지정
// 메인에서 { mode, custom } 을 받아서 모든 창에 같은 색을 입혀요.
// Electron(특히 Windows)에선 confirm/alert 창을 닫은 뒤 입력칸에 글자가 안 쳐지는 문제가 있어서
// 창이 끝나면 메인에 '창 포커스 다시 잡기'를 부탁해요. (물고기 팔기 뒤 채팅이 안 쳐지던 버그)
(() => {
  if (!window.buddy) return;
  for (const name of ['confirm', 'alert']) {
    const orig = window[name].bind(window);
    window[name] = (...a) => {
      const active = document.activeElement;
      const r = orig(...a);
      buddy.send('refocus');
      setTimeout(() => { if (active && active.focus && document.contains(active) && /INPUT|TEXTAREA/.test(active.tagName)) active.focus(); }, 60);
      return r;
    };
  }
})();
(() => {
  const root = document.documentElement;
  const VARS = ['--bg', '--card', '--ink', '--muted', '--line', '--input', '--accent', '--a1', '--a2', '--a3', '--a4'];
  const hex = (h) => { const n = parseInt(String(h).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const lum = (h) => { const [r, g, b] = hex(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };

  function apply(p) {
    const mode = typeof p === 'string' ? p : (p && p.mode) || 'system';
    const c = (p && p.custom) || {};
    for (const v of VARS) root.style.removeProperty(v);
    root.style.removeProperty('color-scheme');
    delete root.dataset.aurora;
    if (['light', 'dark', 'aurora', 'custom'].includes(mode)) root.dataset.theme = mode; else delete root.dataset.theme;
    if (mode === 'aurora') root.dataset.aurora = '1';
    if (mode === 'custom' && /^#[0-9a-f]{6}$/i.test(c.bg || '')) {
      const dark = lum(c.bg) < 0.45;
      const set = (k, v) => root.style.setProperty(k, v);
      set('--bg', c.bg);
      set('--ink', c.ink);
      set('--accent', c.accent);
      set('--muted', mix(c.ink, c.bg, 0.45));
      set('--line', mix(c.card, c.ink, 0.14));
      set('--input', mix(c.card, c.bg, 0.5));
      set('color-scheme', dark ? 'dark' : 'light');
      root.dataset.base = dark ? 'dark' : 'light';
      if (c.aurora) {
        root.dataset.aurora = '1';
        set('--a1', c.a1); set('--a2', c.a2); set('--a3', c.a3); set('--a4', mix(c.a1, c.a3, 0.5));
        set('--card', rgba(c.card, dark ? 0.78 : 0.74));
      } else set('--card', c.card);
    } else delete root.dataset.base;
    window.buddyTheme = mode;
    window.buddyThemeCustom = c;
    document.dispatchEvent(new CustomEvent('buddy-theme', { detail: mode }));
  }
  buddy.invoke('get-theme').then(apply).catch(() => {});
  buddy.on('theme', apply);
  window.BuddyTheme = { apply };
})();
