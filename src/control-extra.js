// 0.17 설정 창: 💾 캐릭터 저장 슬롯 · 🪪 프로필 꾸미기 · 🖌️ 그림 그리기
(async () => {
  const $ = (id) => document.getElementById(id);
  const srv = (m) => buddy.send('srv', m);
  let st = await buddy.invoke('get-state');
  let catalog = st.catalog;
  let account = st.account;
  const el = (tag, props = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e[k] = v; else if (k === 'disabled') e.disabled = !!v; else e.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null) e.append(c);
    return e;
  };
  const when = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  // ---------------------------------------------------- 💾 캐릭터 슬롯
  let slots = null;
  let waitMsg = null;   // 'char' | 'profile' : 서버 오류를 어디에 보여 줄지
  function renderSlots() {
    const box = $('charSlots'); box.textContent = '';
    if (!account) { box.append(el('p', { class: 'note', text: '로그인하면 쓸 수 있어요.' })); $('charSlotBuy').hidden = true; $('charSlotInfo').textContent = ''; return; }
    if (!slots) { box.append(el('p', { class: 'note', text: '불러오는 중…' })); return; }
    slots.chars.forEach((c, i) => {
      const pic = el('div', { class: 'slot-pic' + (c?.custom ? ' photo' : '') });
      const src = c && (c.thumb || c.stand);
      if (src) { const img = el('img', { src, alt: '' }); if (!c.custom && c.faces === 'left') img.style.transform = 'scaleX(-1)'; pic.append(img); }
      else if (c && c.basic) pic.append(el('span', { text: '🐱', title: '기본 캐릭터' }));
      else pic.append(el('span', { class: 'slot-empty', text: '비어 있음' }));
      // 이름: 그 자리에서 고쳐요 (Electron 에선 prompt() 가 안 돼요)
      const name = el('input', { class: 'slot-name', maxlength: '16', value: c ? c.name : `캐릭터 ${i + 1}`, title: '슬롯 이름 (눌러서 바꾸기)' });
      name.onchange = () => { if (c && name.value.trim()) srv({ type: 'slot-rename', kind: 'char', i, name: name.value.trim() }); };
      name.onkeydown = (e) => { if (e.key === 'Enter') name.blur(); };
      const sub = el('div', { class: 'slot-sub', text: c ? (c.basic ? '기본 캐릭터 · ' : '') + when(c.at) + ' 저장' : '비어 있어요' });
      const btns = el('div', { class: 'slot-btns' },
        c ? el('button', { class: 'primary small', text: '입기', onclick: () => { waitMsg = 'char'; srv({ type: 'slot-load', kind: 'char', i }); $('charSlotMsg').textContent = '바꾸는 중…'; } }) : null,
        el('button', { class: 'ghost small', text: c ? '덮어쓰기' : '지금 그림 저장', onclick: () => {
          if (c && !confirm(`'${c.name}' 슬롯에 지금 캐릭터 그림을 덮어쓸까요?`)) return;
          waitMsg = 'char'; srv({ type: 'slot-save', kind: 'char', i, name: name.value.trim() || `캐릭터 ${i + 1}` });
        } }),
        c ? el('button', { class: 'link', text: '비우기', onclick: () => { if (confirm(`'${c.name}' 슬롯을 비울까요? (지금 입은 캐릭터는 그대로예요)`)) srv({ type: 'slot-del', kind: 'char', i }); } }) : null,
        c ? el('button', { class: 'link slot-more', text: openSlot === i ? '▴ 접기' : '▾ 펼쳐보기', onclick: () => toggleSlot(i) }) : null);
      // 🔽 펼쳐보기: 저장한 그림 전부 + 대표 이미지 정하기
      let more = null;
      if (c && openSlot === i) {
        more = el('div', { class: 'slot-detail' });
        const d = details.get(i);
        if (c.basic) more.append(el('p', { class: 'note', text: '기본 캐릭터(그림 없이 고양이 · 강아지 · 토끼)로 저장된 슬롯이에요.' }));
        else if (!d || d.at !== c.at) more.append(el('p', { class: 'note', text: '그림 불러오는 중…' }));
        else {
          const grid = el('div', { class: 'pose-grid' });
          for (const p of ['stand', 'sit', 'walk', 'lie', 'fall']) {
            const img = d.poses[p];
            const on = !c.custom && c.thumbPose === p;
            const cell = el('div', { class: 'pose-cell' + (on ? ' on' : '') + (img ? '' : ' none') },
              el('div', { class: 'pose-img' }, img ? el('img', { src: img, alt: '', style: d.faces === 'left' ? 'transform:scaleX(-1)' : '' }) : el('span', { text: '없음' })),
              el('small', { text: POSE_NAME[p] }),
              img ? el('button', { class: on ? 'primary small' : 'ghost small', text: on ? '✓ 대표' : '대표로', disabled: on, onclick: () => srv({ type: 'slot-thumb', kind: 'char', i, pose: p }) }) : null);
            grid.append(cell);
          }
          more.append(grid);
        }
        more.append(el('div', { class: 'slot-btns' },
          el('button', { class: 'ghost small', text: '📁 사진으로 대표 이미지 정하기', onclick: () => pickThumb(i) }),
          c.custom ? el('span', { class: 'note-inline', text: '✓ 지금은 직접 고른 사진이 대표예요' }) : null,
          c.custom ? el('button', { class: 'link', text: '기본으로', onclick: () => srv({ type: 'slot-thumb', kind: 'char', i, reset: true }) }) : null));
      }
      box.append(el('div', { class: 'slot-card' + (c ? '' : ' empty') }, pic, el('div', { class: 'slot-info' }, name, sub, btns)));
      if (more) box.append(more);
    });
    const next = slots.charNext;
    $('charSlotBuy').hidden = false;
    $('charSlotBuy').textContent = next == null ? '슬롯이 가득 찼어요' : `＋ 슬롯 늘리기 🪙${next.toLocaleString()}`;
    $('charSlotBuy').disabled = next == null || slots.coins < next;
    $('charSlotInfo').textContent = `${slots.charN}/${slots.charMax}칸 · 내 코인 🪙${(slots.coins || 0).toLocaleString()}`;
  }
  const POSE_NAME = { stand: '서 있기', sit: '앉기', walk: '걷기', lie: '눕기', fall: '떨어지기' };
  let openSlot = -1;
  const details = new Map();   // 슬롯 번호 → { at, faces, poses }
  function toggleSlot(i) {
    openSlot = openSlot === i ? -1 : i;
    const c = slots?.chars[i];
    if (openSlot === i && c && !c.basic && details.get(i)?.at !== c.at) srv({ type: 'slot-detail', kind: 'char', i });
    renderSlots();
  }
  function pickThumb(i) {   // 📁 사진 고르기 → ✂️ 맞추기(정사각형) → 대표 이미지
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp,image/gif,image/bmp';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      try {
        const r = await Cropper.open({ source: f, w: 160, h: 160, title: '✂️ 캐릭터 슬롯 대표 이미지 맞추기' });
        if (!r) return;
        waitMsg = 'char';
        srv({ type: 'slot-thumb', kind: 'char', i, img: Cropper.toData(r.canvas, 60_000, true) });
      } catch (e) { $('charSlotMsg').textContent = e.message; }
    };
    inp.click();
  }
  $('charSlotBuy').onclick = () => {
    if (!slots || slots.charNext == null) return;
    if (!confirm(`🪙${slots.charNext.toLocaleString()}로 캐릭터 슬롯을 한 칸 늘릴까요?`)) return;
    waitMsg = 'char'; srv({ type: 'slot-buy', kind: 'char' });
  };

  // ---------------------------------------------------- 🪪 프로필
  let prof = null;      // 서버에 저장된 내 프로필
  let draft = {};       // 아직 저장 안 한 바뀐 것
  const view = () => ({ ...prof, ...draft });
  let previewOthers = false;
  for (const b of document.querySelectorAll('#pfViewToggle button')) b.onclick = () => {
    previewOthers = b.dataset.v === '1';
    document.querySelectorAll('#pfViewToggle button').forEach((x) => x.classList.toggle('on', x === b));
    renderProfile();
  };
  function renderProfile() {
    const box = $('profilePreview');
    $('profileEdit').hidden = !account;
    if (!account) { box.textContent = ''; box.append(el('p', { class: 'note', text: '로그인하면 프로필을 꾸밀 수 있어요.' })); return; }
    if (!prof) { box.textContent = ''; box.append(el('p', { class: 'note', text: '불러오는 중…' })); return; }
    const v = view();
    box.textContent = '';
    box.append(ProfileCard.render(v, catalog, { asOthers: previewOthers }));
    const th = $('pfThemes'); th.textContent = '';
    for (const [k, t] of Object.entries(ProfileCard.THEMES)) {
      const b = el('button', { type: 'button', class: 'pf-theme' + (v.theme === k ? ' on' : ''), title: t.name, onclick: () => { draft.theme = k; dirty(); } });
      b.style.background = t.bg;
      b.append(el('span', { text: t.name }));
      th.append(b);
    }
    // 🎨 사용자 지정 (맨 끝 칸)
    {
      const c = { ...ProfileCard.DEF_CUSTOM, ...(v.custom || {}) };
      const b = el('button', { type: 'button', class: 'pf-theme custom' + (v.theme === 'custom' ? ' on' : ''), title: '사용자 지정', onclick: () => { draft.theme = 'custom'; if (!draft.custom) draft.custom = c; dirty(); } });
      b.style.background = `linear-gradient(135deg,${c.bg1},${c.bg2})`;
      b.append(el('span', { text: '🎨 사용자 지정' }));
      th.append(b);
      $('pfCustom').hidden = v.theme !== 'custom';
      for (const inp of document.querySelectorAll('#pfCustom input[data-c]')) if (document.activeElement !== inp) inp.value = c[inp.dataset.c];
    }
    if (document.activeElement !== $('pfBio')) $('pfBio').value = v.bio || '';
    $('pfBioCount').textContent = `${($('pfBio').value || '').length}/100`;
    $('pfShowFish').checked = !!v.showFish;
    $('pfShowPets').checked = !!v.showPets;
    $('pfAvatarDel').hidden = !v.avatar;
    $('pfBgDel').hidden = !v.bg;
  }
  function dirty() { $('pfSave').disabled = !Object.keys(draft).length; $('pfMsg').textContent = Object.keys(draft).length ? '저장하지 않은 게 있어요' : ''; renderProfile(); }
  $('pfBio').oninput = () => { draft.bio = $('pfBio').value.slice(0, 100); $('pfBioCount').textContent = `${draft.bio.length}/100`; dirty(); };
  for (const inp of document.querySelectorAll('#pfCustom input[data-c]')) {
    inp.oninput = () => { draft.theme = 'custom'; draft.custom = { ...ProfileCard.DEF_CUSTOM, ...(view().custom || {}), [inp.dataset.c]: inp.value }; dirty(); };
  }
  $('pfShowFish').onchange = (e) => { draft.showFish = e.target.checked; dirty(); };
  $('pfShowPets').onchange = (e) => { draft.showPets = e.target.checked; dirty(); };
  $('pfAvatarDel').onclick = () => { draft.avatar = null; dirty(); };
  $('pfBgDel').onclick = () => { draft.bg = null; dirty(); };
  let pickFor = null;
  $('pfAvatarPick').onclick = () => { pickFor = 'avatar'; $('pfFile').value = ''; $('pfFile').click(); };
  $('pfBgPick').onclick = () => { pickFor = 'bg'; $('pfFile').value = ''; $('pfFile').click(); };
  $('pfSave').onclick = () => {
    if (!Object.keys(draft).length) return;
    waitMsg = 'profile';
    srv({ type: 'profile-set', ...draft });
    $('pfSave').disabled = true; $('pfMsg').textContent = '저장하는 중…';
  };
  const SPEC = (t) => (t === 'bg' ? { ...ProfileCard.BG, title: '✂️ 배경 사진 맞추기' } : { ...ProfileCard.AVATAR, round: true, title: '✂️ 프로필 사진 맞추기' });
  $('pfFile').onchange = async () => {
    const f = $('pfFile').files[0]; if (!f) return;
    const target = pickFor, S = SPEC(target);
    try {
      const r = await Cropper.open({ source: f, w: S.w, h: S.h, round: S.round, title: S.title, extra: '🖌️ 이 사진 위에 그리기' });
      if (!r) return;
      if (r.extra) { await openPad(target); g.drawImage(r.canvas, 0, 0, cv.width, cv.height); return; }   // 맞춘 사진을 그리기 판에 올려서 그 위에 그리기
      draft[target] = await ProfileCard.shrink(r.canvas.toDataURL('image/png'), S.w, S.h, S.max); dirty();
    } catch (e) { $('pfMsg').textContent = e.message || '그림을 열지 못했어요.'; }
  };
  // ---------------------------------------------------- 🖌️ 그림 그리기
  const PALETTE = ['#222222', '#ffffff', '#e84a4a', '#f79a3e', '#f5d142', '#5cc95c', '#3fb8d9', '#4a6fe8', '#9a5ce0', '#f28fc4', '#8b5a2b', '#9aa0a6'];
  const cv = $('drawCanvas'), g = cv.getContext('2d', { willReadFrequently: true });
  let drawFor = 'avatar', color = '#222222', erasing = false, undo = [];
  for (const c of PALETTE) {
    const b = el('button', { type: 'button', class: 'draw-sw', title: c, onclick: () => { color = c; $('drawColor').value = c; erasing = false; $('drawEraser').classList.remove('on'); } });
    b.style.background = c; $('drawColors').append(b);
  }
  $('drawColor').oninput = (e) => { color = e.target.value; erasing = false; $('drawEraser').classList.remove('on'); };
  $('drawEraser').onclick = () => { erasing = !erasing; $('drawEraser').classList.toggle('on', erasing); };
  const snap = () => { undo.push(g.getImageData(0, 0, cv.width, cv.height)); if (undo.length > 30) undo.shift(); };
  function blank() { g.globalCompositeOperation = 'source-over'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, cv.width, cv.height); }
  async function openPad(target) {
    drawFor = target;
    const S = target === 'bg' ? ProfileCard.BG : ProfileCard.AVATAR;
    cv.width = S.w; cv.height = S.h;
    cv.classList.toggle('wide', target === 'bg');
    $('drawTitle').textContent = target === 'bg' ? '🖌️ 배경 그리기' : '🖌️ 프로필 사진 그리기';
    const cur = view()[target];
    $('drawOnPhoto').checked = false; $('drawOnPhoto').disabled = !cur;
    undo = []; blank();
    $('drawPad').hidden = false;
  }
  $('drawOnPhoto').onchange = async (e) => {
    snap(); blank();
    if (e.target.checked) {
      const src = view()[drawFor];
      if (src) await new Promise((res) => { const i = new Image(); i.onload = () => { g.drawImage(i, 0, 0, cv.width, cv.height); res(); }; i.onerror = res; i.src = src; });
    }
  };
  $('drawPhoto').onclick = () => {   // 그리기 판에서 사진 넣기 → 맞추고 → 다시 그리기 판
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp,image/gif,image/bmp';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      const S = SPEC(drawFor);
      $('drawPad').hidden = true;
      try {
        const r = await Cropper.open({ source: f, w: S.w, h: S.h, round: S.round, title: S.title });
        if (r) { snap(); g.drawImage(r.canvas, 0, 0, cv.width, cv.height); }
      } catch (e) { $('pfMsg').textContent = e.message; }
      $('drawPad').hidden = false;
    };
    inp.click();
  };
  $('pfAvatarDraw').onclick = () => openPad('avatar');
  $('pfBgDraw').onclick = () => openPad('bg');
  $('drawClose').onclick = () => { $('drawPad').hidden = true; };
  $('drawUndo').onclick = () => { const d = undo.pop(); if (d) g.putImageData(d, 0, 0); };
  $('drawClear').onclick = () => { snap(); blank(); };
  $('drawFill').onclick = () => { snap(); g.globalCompositeOperation = 'destination-over'; g.fillStyle = color; g.fillRect(0, 0, cv.width, cv.height); g.globalCompositeOperation = 'source-over';
    // 흰 바탕을 칠한 색으로: 거의 흰 점만 바꿈
    const d = g.getImageData(0, 0, cv.width, cv.height), p = d.data;
    const r = parseInt(color.slice(1, 3), 16), gg = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
    for (let i = 0; i < p.length; i += 4) if (p[i] > 248 && p[i + 1] > 248 && p[i + 2] > 248) { p[i] = r; p[i + 1] = gg; p[i + 2] = b; }
    g.putImageData(d, 0, 0);
  };
  let drawing = false, lx = 0, ly = 0;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  function stroke(x, y) {
    const size = Number($('drawSize').value) * (cv.width / 256);
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = erasing ? '#ffffff' : color;
    g.lineWidth = size; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(lx, ly); g.lineTo(x, y); g.stroke();
    lx = x; ly = y;
  }
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); snap(); drawing = true; [lx, ly] = pos(e); stroke(lx + 0.01, ly); });
  cv.addEventListener('pointermove', (e) => { if (drawing) stroke(...pos(e)); });
  for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, () => { drawing = false; });
  $('drawDone').onclick = async () => {
    const S = drawFor === 'bg' ? ProfileCard.BG : ProfileCard.AVATAR;
    try { draft[drawFor] = await ProfileCard.shrink(cv.toDataURL('image/png'), S.w, S.h, S.max); $('drawPad').hidden = true; dirty(); }
    catch (e) { $('pfMsg').textContent = e.message; }
  };

  // ---------------------------------------------------- 서버 소식
  buddy.on('srv', (m) => {
    if (m.type === 'slots') { slots = m; renderSlots(); }
    if (m.type === 'slot-detail' && m.kind === 'char') { details.set(m.i, { at: slots?.chars[m.i]?.at, faces: m.faces, poses: m.poses }); renderSlots(); }
    if (m.type === 'slot-done' && m.kind === 'char') $('charSlotMsg').textContent = m.what === 'save' ? `✅ '${m.name}'에 저장했어요.` : `✅ '${m.name}' 캐릭터로 바꿨어요!`;
    if (m.type === 'profile-card' && m.self) { prof = m; renderProfile(); }
    if (m.type === 'profile-saved') { draft = {}; $('pfMsg').textContent = '✅ 저장했어요!'; $('pfSave').disabled = true; }
    if (m.type === 'error') {
      if (waitMsg === 'char') $('charSlotMsg').textContent = m.message;
      if (waitMsg === 'profile') { $('pfMsg').textContent = m.message; $('pfSave').disabled = !Object.keys(draft).length; }
    }
  });
  function load() {
    renderSlots(); renderProfile();
    if (!account) return;
    srv({ type: 'slots-get' });
    srv({ type: 'profile-get', self: true });
  }
  buddy.on('account', async (acc) => {
    const changed = (acc && acc.username) !== (account && account.username);
    account = acc;
    if (changed) { slots = null; prof = null; draft = {}; }
    st = await buddy.invoke('get-state'); catalog = st.catalog || catalog;
    load();
  });
  buddy.on('skin-saved', (ok) => { if (ok === true && account) srv({ type: 'slots-get' }); });
  load();
})();
