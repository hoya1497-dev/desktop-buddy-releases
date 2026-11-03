// 0.17 🪪 프로필 카드: 설정 창(내 프로필 미리보기)과 집 창(채팅에서 이름 누르기)에서 같이 써요
window.ProfileCard = (() => {
  const THEMES = {
    cream:    { name: '크림',   bg: 'linear-gradient(135deg,#fff3dc,#ffd9b8)', accent: '#e8894a', ink: '#3a2a1e', card: '#fffaf3' },
    sky:      { name: '하늘',   bg: 'linear-gradient(135deg,#d8efff,#9fd0ff)', accent: '#3d8fe0', ink: '#1d2a3a', card: '#f5fbff' },
    mint:     { name: '민트',   bg: 'linear-gradient(135deg,#dcfbef,#9ee8cc)', accent: '#2fa784', ink: '#183a2f', card: '#f4fffa' },
    pink:     { name: '분홍',   bg: 'linear-gradient(135deg,#ffe1ef,#ffb3d2)', accent: '#e0569a', ink: '#3a1d2c', card: '#fff6fa' },
    lavender: { name: '라벤더', bg: 'linear-gradient(135deg,#ece3ff,#c9b5ff)', accent: '#8a62e0', ink: '#2a2040', card: '#faf7ff' },
    night:    { name: '밤하늘', bg: 'linear-gradient(135deg,#1e2350,#4b3f8f 60%,#7c5bb5)', accent: '#ffd66b', ink: '#f2efff', card: '#25223a' },
    sunset:   { name: '노을',   bg: 'linear-gradient(135deg,#ffb36b,#ff7a8a 55%,#9a6bd6)', accent: '#ff6b5a', ink: '#3a1e24', card: '#fff6f2' },
    forest:   { name: '숲',     bg: 'linear-gradient(135deg,#cfe8b8,#7fb86a 60%,#3f7a4a)', accent: '#4f8f3a', ink: '#1f2e19', card: '#f7fbf2' },
  };
  const SPECIES = { cat: '🐱', dog: '🐶', rabbit: '🐰' };

  function el(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on')) e[k] = v;
      else e.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null) e.append(c);
    return e;
  }
  const day = (t) => { const d = new Date(t); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };

  // p: 서버 profile-card, cat: { fish, pets } 카탈로그 (없으면 개수만)
  // 🎨 사용자 지정: 배경 두 색 + 포인트 색 + 카드 색 (글자색은 카드가 밝은지 어두운지 보고 자동)
  const DEF_CUSTOM = { bg1: '#ffe9c7', bg2: '#ffb38a', accent: '#e8894a', card: '#fffaf3' };
  function customTheme(c) {
    c = { ...DEF_CUSTOM, ...(c || {}) };
    const n = parseInt(c.card.slice(1), 16), lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return { name: '사용자 지정', bg: `linear-gradient(135deg,${c.bg1},${c.bg2})`, accent: c.accent, card: c.card, ink: lum > 0.55 ? '#2a2430' : '#f4f0fa' };
  }
  function themeOf(p) { return p.theme === 'custom' ? customTheme(p.custom) : THEMES[p.theme] || THEMES.cream; }
  function render(p, cat, opts = {}) {
    const th = themeOf(p);
    const card = el('div', { class: 'pcard', style: `--pc-accent:${th.accent};--pc-ink:${th.ink};--pc-card:${th.card}` });
    const banner = el('div', { class: 'pcard-banner', style: p.bg ? `background-image:url("${p.bg}")` : `background:${th.bg}` });
    card.append(banner);
    const av = el('div', { class: 'pcard-avatar' });
    if (p.avatar) av.append(el('img', { src: p.avatar, alt: '프로필 사진' }));
    else av.append(el('span', { text: SPECIES[p.species] || '🐾' }));
    card.append(av);
    const body = el('div', { class: 'pcard-body' });
    const nick = el('b', { class: 'pcard-nick ' + (window.NickFX ? NickFX.domClass(p) : ''), text: p.nickname || p.username });
    if (window.NickFX) nick.style.cssText += ';' + NickFX.domStyle(p, th.ink);
    body.append(el('div', { class: 'pcard-name' }, nick, el('span', { class: 'pcard-lv', text: `Lv.${p.level || 1}` })));
    body.append(el('div', { class: 'pcard-id', text: '@' + p.username + (p.friend ? ' · 친구' : '') }));
    if (p.joined) {
      const days = Math.max(1, Math.floor((Date.now() - p.joined) / 86400000) + 1);
      body.append(el('div', { class: 'pcard-joined', text: `🗓️ ${day(p.joined)} 가입 · 버디와 ${days.toLocaleString()}일째` }));
    }
    body.append(el('p', { class: 'pcard-bio' + (p.bio ? '' : ' empty'), text: p.bio || (p.self ? '자기소개를 써 보세요.' : '아직 자기소개가 없어요.') }));

    // 🐟 물고기 도감
    const fishAll = cat && cat.fish ? Object.entries(cat.fish).filter(([, f]) => f.cat !== 'T') : [];
    const sec = (title, count, hidden, grid) => el('div', { class: 'pcard-sec' },
      el('div', { class: 'pcard-sec-h' }, el('span', { text: title }), el('small', { text: hidden ? '🔒 비공개' : count })),
      hidden ? null : grid);
    if (p.fish) {
      const got = new Set(p.fish);
      const grid = el('div', { class: 'pcard-grid' });
      if (window.FishArt && fishAll.length) {
        for (const [code, f] of fishAll) if (got.has(code)) { const c = FishArt.thumb(f, 28); c.title = `#${code} ${f.name}`; grid.append(c); }
      }
      if (!grid.children.length) grid.append(el('span', { class: 'pcard-none', text: '아직 잡은 물고기가 없어요.' }));
      const n = fishAll.length ? fishAll.filter(([code]) => got.has(code)).length : p.fish.length;
      body.append(sec('🐟 물고기 도감', fishAll.length ? `${n}/${fishAll.length}` : `${n}종`, false, grid));
    } else body.append(sec('🐟 물고기 도감', '', true));
    if (p.pets) {
      const grid = el('div', { class: 'pcard-grid' });
      for (const kind of p.pets) {
        const c = window.PetArt ? PetArt.thumb(kind, 32) : el('span', { text: '🐾' });
        c.title = cat?.pets?.[kind]?.name || '';
        grid.append(c);
      }
      if (!p.pets.length) grid.append(el('span', { class: 'pcard-none', text: '아직 키우는 펫이 없어요.' }));
      body.append(sec('🐾 펫 도감', `${p.pets.length}종`, false, grid));
    } else body.append(sec('🐾 펫 도감', '', true));
    if (opts.extra) body.append(opts.extra);
    card.append(body);
    return card;
  }

  // 그림 줄이기: 꽉 채워서 자름(cover) → JPEG, 용량 안 넘을 때까지 품질 낮춤
  async function shrink(src, W, H, maxLen) {
    const bmp = src instanceof Blob ? await createImageBitmap(src) : await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    const k = Math.max(W / bmp.width, H / bmp.height);
    const w = bmp.width * k, h = bmp.height * k;
    g.imageSmoothingQuality = 'high';
    g.drawImage(bmp, (W - w) / 2, (H - h) / 2, w, h);
    bmp.close?.();
    for (const q of [0.88, 0.8, 0.7, 0.6, 0.5, 0.4]) {
      const d = c.toDataURL('image/jpeg', q);
      if (d.length <= maxLen) return d;
    }
    throw new Error('그림을 충분히 줄이지 못했어요. 다른 그림으로 해 주세요.');
  }

  return { render, shrink, THEMES, DEF_CUSTOM, customTheme, AVATAR: { w: 256, h: 256, max: 56 * 1024 * 1.33 }, BG: { w: 900, h: 360, max: 150 * 1024 * 1.33 } };
})();
