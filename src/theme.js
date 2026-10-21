// 화이트/다크 모드: 설정에서 고른 값을 모든 창에 적용 ('system'이면 컴퓨터 설정을 따름)
(() => {
  const apply = (t) => {
    const root = document.documentElement;
    if (t === 'light' || t === 'dark') root.dataset.theme = t; else delete root.dataset.theme;
    window.buddyTheme = t || 'system';
    document.dispatchEvent(new CustomEvent('buddy-theme', { detail: window.buddyTheme }));
  };
  buddy.invoke('get-theme').then(apply).catch(() => {});
  buddy.on('theme', apply);
})();
