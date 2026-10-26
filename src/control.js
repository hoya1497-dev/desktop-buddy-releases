// 설정 · 채팅 창
(async () => {
  const $ = (id) => document.getElementById(id);
  const state = await buddy.invoke('get-state');
  let config = state.config;

  const save = (partial) => {
    config = { ...config, ...partial };
    buddy.send('save-config', partial);
  };

  // ---------------------------------------------------- 탭
  document.querySelectorAll('nav button').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('nav button').forEach((x) => x.classList.toggle('active', x === b));
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + b.dataset.tab));
      if (b.dataset.tab === 'windows') loadWindows();
    };
  });

  // ---------------------------------------------------- 미리보기
  function drawPreview(color) {
    const c = $('preview'); const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 48, 48);
    Sprites.drawPet(ctx, 0, 0, { species: config.species, scale: 3, color, legs: 'stand', eyes: 'open' });
  }
  // 캐릭터 종류 (고양이 · 강아지 · 토끼)
  function renderSpecies() {
    const row = $('speciesRow'); row.textContent = '';
    for (const [id, name] of Object.entries(Sprites.species)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = config.species === id ? 'on' : '';
      const c = document.createElement('canvas'); c.width = 48; c.height = 48;
      Sprites.drawPet(c.getContext('2d'), 0, 0, { species: id, scale: 3, color: config.color, legs: 'stand', eyes: 'open' });
      const t = document.createElement('span'); t.textContent = name;
      b.append(c, t);
      b.onclick = () => { save({ species: id }); renderSpecies(); drawPreview(config.color); if (typeof showCurrent === 'function') showCurrent(); };
      row.append(b);
    }
  }
  function renderSelf(p) {
    $('selfLine').textContent = `${p.nickname}${p.status ? ' · ' + p.status : ''}`;
    drawPreview(p.color);
    const note = $('nameEffectNote');
    if (p.nameEffect) { note.hidden = false; note.textContent = `✨ 운영자가 닉네임에 '${(window.NickFX && NickFX.LABEL[p.nameEffect]) || p.nameEffect}' 효과를 줬어요!${p.nameEffect === 'neon' ? ' (빛 색은 아래 글자색으로 바꿀 수 있어요)' : ''}`; }
    else note.hidden = true;
  }
  renderSelf(state.self);
  buddy.on('self', renderSelf);

  // ---------------------------------------------------- 내 캐릭터
  $('nickname').value = config.nickname;
  $('nickname').onchange = (e) => save({ nickname: e.target.value.trim() || '나' });
  $('color').value = config.color;
  $('color').oninput = (e) => drawPreview(e.target.value);
  $('color').onchange = (e) => { save({ color: e.target.value }); renderSpecies(); };
  ['#f2a65a', '#8fb8ff', '#b9a3ff', '#7fd4a6', '#ff9ec4', '#d9d4cc', '#5b5560'].forEach((hex) => {
    const b = document.createElement('button');
    b.style.background = hex; b.title = hex;
    b.onclick = () => { $('color').value = hex; save({ color: hex }); drawPreview(hex); renderSpecies(); };
    $('swatches').append(b);
  });
  renderSpecies();
  // ---------------------------------------------------- 닉네임 글자색 (채팅 · 이름표)
  $('nameColor').value = config.nameColor || '#ffffff';
  $('nameColor').onchange = (e) => save({ nameColor: e.target.value });
  $('nameColorReset').onclick = () => { $('nameColor').value = '#ffffff'; save({ nameColor: null }); };
  ['#ffffff', '#ff6b6b', '#ffb347', '#ffe066', '#6cf0ff', '#6b9fff', '#b78cff', '#ff8cc6'].forEach((hex) => {
    const b = document.createElement('button');
    b.style.background = hex; b.title = hex;
    b.onclick = () => { $('nameColor').value = hex; save({ nameColor: hex }); };
    $('nameSwatches').append(b);
  });
  const scaleName = (v) =>['', '', '아주 작게', '작게', '보통', '조금 크게', '크게', '아주 크게', '엄청 크게'][v] || '';
  $('petScale').value = config.petScale;
  $('scaleVal').textContent = scaleName(config.petScale);
  $('petScale').oninput = (e) => { $('scaleVal').textContent = scaleName(Number(e.target.value)); };
  $('petScale').onchange = (e) => save({ petScale: Number(e.target.value) });
  $('themeSel').value = config.theme || 'system';
  $('themeSel').onchange = (e) => buddy.send('set-theme', e.target.value);
  document.addEventListener('buddy-theme', (e) => { $('themeSel').value = e.detail; });

  // ---------------------------------------------------- 캐릭터 그림
  const picked = {};          // pose -> 줄인 PNG data URL
  const MAX_SIDE = 128;
  function drawSkinPreview(pose, src) {
    const c = $('pv-' + pose); const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    if (!src) {
      const legs = pose === 'sit' || pose === 'lie' ? 'sit' : pose === 'walk' ? 'walkA' : 'stand';
      g.globalAlpha = pose === 'lie' || pose === 'fall' ? 0.45 : 1;   // 선택 칸은 흐리게: 안 넣으면 이렇게 대신 보여요
      Sprites.drawPet(g, 0, 0, { species: config.species, scale: 6, color: config.color, legs, eyes: pose === 'lie' ? 'closed' : 'open' });
      g.globalAlpha = 1;
      return;
    }
    const im = new Image();
    im.onload = () => {
      const k = Math.min(c.width / im.width, c.height / im.height);
      g.imageSmoothingEnabled = im.height >= 64;
      g.drawImage(im, (c.width - im.width * k) / 2, c.height - im.height * k, im.width * k, im.height * k);
    };
    im.src = src;
  }
  // 고른 그림을 캔버스에 다시 그려서 128px PNG로 만듦 (원본 파일의 다른 정보는 버려짐)
  function shrink(file) {
    return new Promise((resolve, reject) => {
      if (file.size > 8 * 1024 * 1024) { reject(new Error('8MB 이하 그림만 고를 수 있어요.')); return; }
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('그림을 읽지 못했어요.'));
      fr.onload = () => {
        const im = new Image();
        im.onerror = () => reject(new Error('그림 파일이 아니에요.'));
        im.onload = () => {
          const k = Math.min(1, MAX_SIDE / Math.max(im.width, im.height));
          const w = Math.max(4, Math.round(im.width * k)), h = Math.max(4, Math.round(im.height * k));
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d');
          g.imageSmoothingEnabled = !(im.width <= 64 && im.height <= 64);
          g.imageSmoothingQuality = 'high';   // 크게 줄일 때 거칠어지지 않게
          g.drawImage(im, 0, 0, w, h);
          resolve(c.toDataURL('image/png'));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  let currentSkin = null;
  const REQUIRED = ['stand', 'sit', 'walk'], OPTIONAL = ['lie', 'fall'];
  // 고른 그림 > 지금 쓰는 그림. 선택 칸에서 [빼기]를 누르면 picked[pose] = null
  const finalOf = (pose) => (pose in picked ? picked[pose] : currentSkin && currentSkin[pose]) || null;
  function showCurrent() {
    for (const pose of [...REQUIRED, ...OPTIONAL]) drawSkinPreview(pose, finalOf(pose));
    for (const pose of OPTIONAL) document.querySelector(`[data-clear=${pose}]`).hidden = !finalOf(pose);
  }
  const facesNow = () => document.querySelector('input[name=faces]:checked').value;
  function syncApply() {
    // 그림을 새로 고르지 않고 보는 방향만 바꿔도 적용할 수 있게
    const changed = Object.keys(picked).length > 0 || (!!currentSkin && facesNow() !== (currentSkin.faces || 'right'));
    const ready = REQUIRED.every((p) => finalOf(p));
    $('skinApply').disabled = !(changed && ready);
    if (changed && !ready) $('skinMsg').textContent = '서 있기 · 앉기 · 걷기 3장은 꼭 있어야 적용할 수 있어요.';
  }
  document.querySelectorAll('input[name=faces]').forEach((r) => r.addEventListener('change', () => {
    syncApply();
    if (!$('skinApply').disabled) $('skinMsg').textContent = '보는 방향을 바꿨어요. [적용하기]를 누르면 반영돼요.';
  }));
  document.querySelectorAll('[data-clear]').forEach((b) => {
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); picked[b.dataset.clear] = null; showCurrent(); syncApply(); };
  });
  async function loadCurrent() {
    const acc = state.account;
    const all = await buddy.invoke('get-skins').catch(() => ({}));
    currentSkin = acc && all[acc.username] ? all[acc.username] : null;
    if (currentSkin) document.querySelector(`input[name=faces][value=${currentSkin.faces || 'right'}]`).checked = true;
    showCurrent();
  }
  buddy.on('skins', (all) => { if (state.account && all[state.account.username]) { currentSkin = all[state.account.username]; showCurrent(); } });
  document.querySelectorAll('.skin-slot input[type=file]').forEach((inp) => {
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;
      try {
        picked[inp.dataset.pose] = await shrink(f);
        $('skinMsg').textContent = '';
      } catch (e) { $('skinMsg').textContent = e.message; }
      inp.value = '';
      showCurrent();
      syncApply();
    };
  });
  $('skinApply').onclick = () => {
    const imgs = {};
    for (const pose of [...REQUIRED, ...OPTIONAL]) { const v = finalOf(pose); if (v) imgs[pose] = v; }
    const total = Object.values(imgs).reduce((n, v) => n + v.length, 0);
    if (total > 380 * 1024) { $('skinMsg').textContent = '그림이 너무 복잡해서 용량이 커요. 더 단순한 그림을 써 주세요.'; return; }
    if (!state.account) { $('skinMsg').textContent = '로그인해야 바꿀 수 있어요.'; return; }
    const faces = document.querySelector('input[name=faces]:checked').value;
    buddy.send('skin-set', { ...imgs, faces });
    $('skinMsg').textContent = '올리는 중…';
  };
  $('skinReset').onclick = () => {
    if (!state.account) { $('skinMsg').textContent = '로그인해야 바꿀 수 있어요.'; return; }
    if (!confirm('기본 고양이로 되돌릴까요?')) return;
    for (const k of Object.keys(picked)) delete picked[k];
    currentSkin = null;
    buddy.send('skin-set', { reset: true });
    showCurrent();
  };
  buddy.on('skin-saved', (ok) => {
    if (typeof ok === 'string') { $('skinMsg').textContent = ok; return; } // 서버가 거절한 이유
    $('skinMsg').textContent = ok ? '적용됐어요! 바탕화면과 집에서 확인해 보세요.' : '로그인해야 바꿀 수 있어요.';
    if (ok) { for (const k of Object.keys(picked)) delete picked[k]; $('skinApply').disabled = true; }
  });
  loadCurrent();

  const statusSel = $('status');
  const opts = [['auto', '🔍 자동 감지'], ...state.presets.map((p) => [p, p]), ['custom', '✏️ 직접 입력'], ['none', '표시 안 함']];
  for (const [v, l] of opts) {
    const o = document.createElement('option'); o.value = v; o.textContent = l; statusSel.append(o);
  }
  function syncStatus() {
    statusSel.value = config.status;
    $('customStatus').hidden = config.status !== 'custom';
    $('customStatus').value = config.customStatus || '';
  }
  syncStatus();
  statusSel.onchange = () => { save({ status: statusSel.value }); syncStatus(); };
  $('customStatus').onchange = (e) => save({ customStatus: e.target.value });
  buddy.on('config', (c) => { config = c; syncStatus(); });

  $('hideOthers').checked = config.hideOthers;
  $('hideOthers').onchange = (e) => save({ hideOthers: e.target.checked });
  $('showPetsDesktop').checked = config.showPetsDesktop !== false;
  $('showPetsDesktop').onchange = (e) => save({ showPetsDesktop: e.target.checked });
  $('showAllPets').checked = !!config.showAllPets;
  $('showAllPets').onchange = (e) => save({ showAllPets: e.target.checked });

  // ---------------------------------------------------- 창 목록
  async function loadWindows() {
    const { apps, gwError } = await buddy.invoke('list-windows');
    $('gwError').hidden = !gwError;
    $('gwError').textContent = gwError + (state.platform === 'darwin'
      ? ' (시스템 설정 → 개인정보 보호 및 보안 → 화면 기록에서 이 앱을 허용해 주세요)' : '');
    const ul = $('winList'); ul.textContent = '';
    const selected = new Set(config.targets);
    const names = new Set(apps.map((a) => a.owner));
    const rows = [...apps, ...config.targets.filter((t) => !names.has(t)).map((t) => ({ owner: t, titles: [], closed: true }))];
    for (const a of rows) {
      const li = document.createElement('li');
      const lab = document.createElement('label'); lab.className = 'check';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = selected.has(a.owner);
      cb.onchange = () => {
        const set = new Set(config.targets);
        if (cb.checked) set.add(a.owner); else set.delete(a.owner);
        save({ targets: [...set] });
      };
      const name = document.createElement('span'); name.textContent = a.owner;
      lab.append(cb, name);
      if (a.closed) { const s = document.createElement('span'); s.className = 'closed'; s.textContent = '(지금 열려 있지 않음)'; lab.append(s); }
      li.append(lab);
      if (a.titles.length) {
        const t = document.createElement('div'); t.className = 'titles'; t.textContent = a.titles.join(' / ');
        li.append(t);
      }
      ul.append(li);
    }
    if (!rows.length) ul.innerHTML = '<li class="note">열린 창을 찾지 못했어요.</li>';
  }
  $('refreshWins').onclick = loadWindows;
  $('occlusion').checked = config.occlusion;
  $('occlusion').onchange = (e) => save({ occlusion: e.target.checked });
  // ---------------------------------------------------- 계정
  function renderAccount(acc) {
    $('accountLine').textContent = acc ? `@${acc.username} 로 로그인됨` : '로그인하지 않았어요 (혼자 놀기 모드)';
    $('myCode').textContent = acc ? acc.code : '-';
    $('logoutBtn').hidden = !acc;
  }
  renderAccount(state.account);
  buddy.on('account', (acc) => { state.account = acc; renderAccount(acc); loadCurrent(); });
  $('logoutBtn').onclick = () => buddy.send('logout');
  $('autoStart').checked = config.autoStart !== false;
  $('autoStart').onchange = (e) => save({ autoStart: e.target.checked });
  $('serverLine').textContent = config.serverUrl;

  // ---------------------------------------------------- 비밀번호 · 차단
  $('pwBtn').onclick = () => {
    const cur = $('pwCur').value, next = $('pwNew').value;
    if (!state.account) { $('pwMsg').textContent = '로그인해야 바꿀 수 있어요.'; return; }
    if (next.length < 8) { $('pwMsg').textContent = '새 비밀번호는 8자 이상으로 정해 주세요.'; return; }
    if (next !== $('pwNew2').value) { $('pwMsg').textContent = '새 비밀번호 확인이 달라요.'; return; }
    buddy.send('srv', { type: 'password-change', current: cur, next });
    $('pwMsg').textContent = '바꾸는 중…';
    $('pwCur').value = ''; $('pwNew').value = ''; $('pwNew2').value = '';
  };
  $('unBtn').onclick = () => {
    const current = $('unCur').value.trim(), password = $('unPw').value, next = $('unNew').value.trim();
    if (!state.account) { $('unMsg').textContent = '로그인해야 바꿀 수 있어요.'; return; }
    if (!current || !password || !next) { $('unMsg').textContent = '세 칸을 모두 채워 주세요.'; return; }
    if (!/^[A-Za-z0-9_가-힣]{2,16}$/.test(next)) { $('unMsg').textContent = '새 아이디는 한글/영문/숫자/_ 2~16자예요.'; return; }
    if (current.toLowerCase() !== state.account.username.toLowerCase()) { $('unMsg').textContent = '지금 아이디가 맞지 않아요.'; return; }
    if (!confirm(`아이디를 @${current} → @${next}(으)로 바꿀까요?`)) return;
    buddy.send('srv', { type: 'username-change', current, password, next });
    $('unMsg').textContent = '바꾸는 중…';
    $('unPw').value = '';
  };
  function renderBlocked(list) {
    const ul = $('blockedList'); ul.textContent = '';
    if (!list || !list.length) { const li = document.createElement('li'); li.className = 'note'; li.textContent = '차단한 사람이 없어요.'; ul.append(li); return; }
    for (const b of list) {
      const li = document.createElement('li');
      const row = document.createElement('div'); row.className = 'row between';
      const nm = document.createElement('span'); nm.textContent = `${b.nickname} (@${b.username})`;
      const btn = document.createElement('button'); btn.className = 'ghost small'; btn.textContent = '차단 풀기';
      btn.onclick = () => buddy.send('srv', { type: 'unblock', username: b.username });
      row.append(nm, btn); li.append(row); ul.append(li);
    }
  }
  renderBlocked(state.blocked);
  buddy.on('srv', (m) => {
    if (m.type === 'password-result') $('pwMsg').textContent = m.message;
    if (m.type === 'username-result') { $('unMsg').textContent = (m.ok ? '✅ ' : '') + m.message; if (m.ok) { $('unCur').value = ''; $('unNew').value = ''; } }
    if (m.type === 'friends') renderBlocked(m.blocked);
  });

  $('statusRules').value = config.statusRules;
  $('saveRules').onclick = () => {
    save({ statusRules: $('statusRules').value });
    $('saveRules').textContent = '저장됨!';
    setTimeout(() => { $('saveRules').textContent = '규칙 저장'; }, 1200);
  };
})();
