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
      const pic = el('div', { class: 'slot-pic' });
      if (c && c.stand) { const img = el('img', { src: c.stand, alt: '' }); if (c.faces === 'left') img.style.transform = 'scaleX(-1)'; pic.append(img); }
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
        c ? el('button', { class: 'link', text: '비우기', onclick: () => { if (confirm(`'${c.name}' 슬롯을 비울까요? (지금 입은 캐릭터는 그대로예요)`)) srv({ type: 'slot-del', kind: 'char', i }); } }) : null);
      box.append(el('div', { class: 'slot-card' + (c ? '' : ' empty') }, pic, el('div', { class: 'slot-info' }, name, sub, btns)));
    });
    const next = slots.charNext;
    $('charSlotBuy').hidden = false;
    $('charSlotBuy').textContent = next == null ? '슬롯이 가득 찼어요' : `＋ 슬롯 늘리기 🪙${next.toLocaleString()}`;
    $('charSlotBuy').disabled = next == null || slots.coins < next;
    $('charSlotInfo').textContent = `${slots.charN}/${slots.charMax}칸 · 내 코인 🪙${(slots.coins || 0).toLocaleString()}`;
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
  let cropBack = null;   // 그리기 판에서 '사진 넣기'로 왔으면 끝나고 그리기 판으로
  $('pfFile').onchange = async () => {
    const f = $('pfFile').files[0]; if (!f) return;
    try { await openCrop(pickFor, f); }
    catch (e) { $('pfMsg').textContent = e.message || '그림을 열지 못했어요.'; }
  };

  // ---------------------------------------------------- ✂️ 사진 맞추기
  const cc = $('cropCanvas'), cg = cc.getContext('2d');
  let crop = null;   // { target, img, k, kMin, kMax, ox, oy } — ox/oy: 사진 가운데가 틀 가운데에서 얼마나 (틀 기준 px)
  async function openCrop(target, file) {
    if (!/^image\//.test(file.type)) throw new Error('그림 파일만 넣을 수 있어요.');
    const img = await createImageBitmap(file);
    const S = target === 'bg' ? ProfileCard.BG : ProfileCard.AVATAR;
    const DW = target === 'bg' ? 380 : 240, DH = Math.round(DW * S.h / S.w);
    cc.width = DW * 2; cc.height = DH * 2; cc.style.width = DW + 'px'; cc.style.height = DH + 'px';
    const cover = Math.max(DW / img.width, DH / img.height), contain = Math.min(DW / img.width, DH / img.height);
    crop = { target, img, S, DW, DH, cover, contain, kMin: contain * 0.6, kMax: cover * 5, k: cover, ox: 0, oy: 0 };
    $('cropTitle').textContent = target === 'bg' ? '✂️ 배경 사진 맞추기' : '✂️ 프로필 사진 맞추기';
    cc.classList.toggle('round', target !== 'bg');
    syncZoom(); drawCrop();
    $('cropPad').hidden = false;
  }
  const zoomToSlider = (k) => Math.round(1000 * Math.log(k / crop.kMin) / Math.log(crop.kMax / crop.kMin));
  const sliderToZoom = (v) => crop.kMin * Math.pow(crop.kMax / crop.kMin, v / 1000);
  function syncZoom() { $('cropZoom').value = zoomToSlider(crop.k); }
  function paint(g, scale) {   // scale: 틀(화면) → 결과 그림 배율
    const { img, k, ox, oy, DW, DH } = crop;
    g.save(); g.scale(scale, scale);
    g.fillStyle = $('cropFill').value; g.fillRect(0, 0, DW, DH);
    g.imageSmoothingQuality = 'high';
    const w = img.width * k, h = img.height * k;
    g.drawImage(img, DW / 2 + ox - w / 2, DH / 2 + oy - h / 2, w, h);
    g.restore();
  }
  function drawCrop() {
    cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, cc.width, cc.height);
    paint(cg, 2);
    if (crop.target !== 'bg') {   // 프로필 사진은 동그랗게 보이니 바깥은 어둡게
      cg.save(); cg.fillStyle = 'rgba(0,0,0,.45)'; cg.beginPath(); cg.rect(0, 0, cc.width, cc.height);
      cg.arc(cc.width / 2, cc.height / 2, cc.width / 2 - 2, 0, Math.PI * 2, true); cg.fill('evenodd'); cg.restore();
    }
  }
  function zoomAt(nk, px = crop.DW / 2, py = crop.DH / 2) {   // (px,py) 를 기준으로 크게 · 작게
    nk = Math.max(crop.kMin, Math.min(crop.kMax, nk));
    const r = nk / crop.k;
    crop.ox = (crop.ox - (px - crop.DW / 2)) * r + (px - crop.DW / 2);
    crop.oy = (crop.oy - (py - crop.DH / 2)) * r + (py - crop.DH / 2);
    crop.k = nk; syncZoom(); drawCrop();
  }
  $('cropZoom').oninput = (e) => zoomAt(sliderToZoom(Number(e.target.value)));
  cc.addEventListener('wheel', (e) => { e.preventDefault(); const r = cc.getBoundingClientRect(); zoomAt(crop.k * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  let dragC = null;
  cc.addEventListener('pointerdown', (e) => { cc.setPointerCapture(e.pointerId); dragC = { x: e.clientX, y: e.clientY, ox: crop.ox, oy: crop.oy }; });
  cc.addEventListener('pointermove', (e) => { if (!dragC) return; crop.ox = dragC.ox + e.clientX - dragC.x; crop.oy = dragC.oy + e.clientY - dragC.y; drawCrop(); });
  for (const ev of ['pointerup', 'pointercancel']) cc.addEventListener(ev, () => { dragC = null; });
  $('cropCover').onclick = () => { crop.k = crop.cover; crop.ox = crop.oy = 0; syncZoom(); drawCrop(); };
  $('cropContain').onclick = () => { crop.k = crop.contain; crop.ox = crop.oy = 0; syncZoom(); drawCrop(); };
  $('cropCenter').onclick = () => { crop.ox = crop.oy = 0; drawCrop(); };
  $('cropFill').oninput = drawCrop;
  const closeCrop = () => { $('cropPad').hidden = true; crop?.img.close?.(); crop = null; };
  $('cropClose').onclick = () => { const back = cropBack; cropBack = null; closeCrop(); if (back) $('drawPad').hidden = false; };
  function cropResult() {
    const { S, DW } = crop;
    const c = document.createElement('canvas'); c.width = S.w; c.height = S.h;
    paint(c.getContext('2d'), S.w / DW);
    return c;
  }
  $('cropDone').onclick = async () => {
    const target = crop.target, c = cropResult();
    if (cropBack) {   // 그리기 판으로 돌아가서 그 위에 계속 그리기
      cropBack = null; closeCrop();
      snap(); g.drawImage(c, 0, 0, cv.width, cv.height); $('drawPad').hidden = false; return;
    }
    try { draft[target] = await ProfileCard.shrink(c.toDataURL('image/png'), crop.S.w, crop.S.h, crop.S.max); closeCrop(); dirty(); }
    catch (e) { $('pfMsg').textContent = e.message; }
  };
  $('cropDraw').onclick = () => {   // 맞춘 사진을 그리기 판에 올려서 그 위에 그리기
    const target = crop.target, c = cropResult();
    closeCrop();
    openPad(target).then(() => { g.drawImage(c, 0, 0, cv.width, cv.height); });
  };
  $('pfSave').onclick = () => {
    if (!Object.keys(draft).length) return;
    waitMsg = 'profile';
    srv({ type: 'profile-set', ...draft });
    $('pfSave').disabled = true; $('pfMsg').textContent = '저장하는 중…';
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
      try { cropBack = true; $('drawPad').hidden = true; await openCrop(drawFor, f); }
      catch (e) { cropBack = null; $('drawPad').hidden = false; $('pfMsg').textContent = e.message; }
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
