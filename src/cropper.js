// ✂️ 사진 맞추기 창 (설정 창 · 집 창 같이 씀, 0.17.2)
// Cropper.open({ source, w, h, round, title, extra }) → Promise<{ canvas, extra } | null>
//   source: File · Blob · dataURL,  w×h: 결과 그림 크기,  round: 동그랗게 보이는 그림(바깥 어둡게)
//   extra: 왼쪽 아래 버튼 글자(예: '🖌️ 이 사진 위에 그리기') — 누르면 { canvas, extra: true }
window.Cropper = (() => {
  let box = null, cc, cg, st = null, resolve = null;
  const q = (s) => box.querySelector(s);
  function build() {
    box = document.createElement('div');
    box.className = 'draw-pad crop-pad'; box.hidden = true;
    box.innerHTML = `<div class="draw-box">
      <div class="row between"><b class="crop-title">사진 맞추기</b><button class="ghost small" data-act="cancel">취소</button></div>
      <p class="note" style="margin:0">사진을 끌어서 자리를 옮기고, 아래 막대(또는 마우스 휠)로 크기를 맞춰요.</p>
      <div class="crop-stage"><canvas class="crop-canvas"></canvas></div>
      <div class="row"><span class="note-inline">작게</span><input type="range" class="crop-zoom" min="0" max="1000" value="0" style="flex:1"><span class="note-inline">크게</span></div>
      <div class="draw-tools">
        <button class="ghost small" data-act="cover">⬛ 꽉 채우기</button>
        <button class="ghost small" data-act="contain">🖼️ 사진 전체 보이기</button>
        <button class="ghost small" data-act="center">⊕ 가운데로</button>
        <label class="check" style="margin:0">빈 곳 색 <input type="color" class="crop-fill" value="#ffffff"></label>
      </div>
      <div class="row between"><button class="ghost small" data-act="extra"></button><button class="primary small" data-act="done">이대로 쓰기</button></div>
    </div>`;
    document.body.append(box);
    cc = q('.crop-canvas'); cg = cc.getContext('2d');
    q('.crop-zoom').oninput = (e) => zoomAt(sliderToZoom(Number(e.target.value)));
    q('.crop-fill').oninput = draw;
    cc.addEventListener('wheel', (e) => { e.preventDefault(); const r = cc.getBoundingClientRect(); zoomAt(st.k * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    let drag = null;
    cc.addEventListener('pointerdown', (e) => { cc.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, ox: st.ox, oy: st.oy }; });
    cc.addEventListener('pointermove', (e) => { if (!drag) return; st.ox = drag.ox + e.clientX - drag.x; st.oy = drag.oy + e.clientY - drag.y; draw(); });
    for (const ev of ['pointerup', 'pointercancel']) cc.addEventListener(ev, () => { drag = null; });
    box.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (!a || !st) return;
      if (a === 'cover') { st.k = st.cover; st.ox = st.oy = 0; sync(); draw(); }
      else if (a === 'contain') { st.k = st.contain; st.ox = st.oy = 0; sync(); draw(); }
      else if (a === 'center') { st.ox = st.oy = 0; draw(); }
      else if (a === 'cancel') finish(null);
      else if (a === 'done' || a === 'extra') finish({ canvas: result(), extra: a === 'extra' });
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && st) finish(null); });
  }
  const zoomToSlider = (k) => Math.round(1000 * Math.log(k / st.kMin) / Math.log(st.kMax / st.kMin));
  const sliderToZoom = (v) => st.kMin * Math.pow(st.kMax / st.kMin, v / 1000);
  const sync = () => { q('.crop-zoom').value = zoomToSlider(st.k); };
  function paint(g, scale) {
    const { img, k, ox, oy, DW, DH } = st;
    g.save(); g.scale(scale, scale);
    g.fillStyle = q('.crop-fill').value; g.fillRect(0, 0, DW, DH);
    g.imageSmoothingQuality = 'high';
    const w = img.width * k, h = img.height * k;
    g.drawImage(img, DW / 2 + ox - w / 2, DH / 2 + oy - h / 2, w, h);
    g.restore();
  }
  function draw() {
    cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, cc.width, cc.height);
    paint(cg, 2);
    if (st.round) {   // 동그랗게 보이는 그림: 원 바깥은 어둡게
      cg.save(); cg.fillStyle = 'rgba(0,0,0,.45)'; cg.beginPath(); cg.rect(0, 0, cc.width, cc.height);
      cg.arc(cc.width / 2, cc.height / 2, Math.min(cc.width, cc.height) / 2 - 2, 0, Math.PI * 2, true); cg.fill('evenodd'); cg.restore();
    }
  }
  function zoomAt(nk, px = st.DW / 2, py = st.DH / 2) {
    nk = Math.max(st.kMin, Math.min(st.kMax, nk));
    const r = nk / st.k;
    st.ox = (st.ox - (px - st.DW / 2)) * r + (px - st.DW / 2);
    st.oy = (st.oy - (py - st.DH / 2)) * r + (py - st.DH / 2);
    st.k = nk; sync(); draw();
  }
  function result() {
    const c = document.createElement('canvas'); c.width = st.w; c.height = st.h;
    paint(c.getContext('2d'), st.w / st.DW);
    return c;
  }
  function finish(v) {
    box.hidden = true;
    try { st?.img.close?.(); } catch {}
    st = null;
    const r = resolve; resolve = null;
    if (r) r(v);
  }
  async function load(src) {
    if (src instanceof Blob) {
      if (!/^image\//.test(src.type)) throw new Error('그림 파일만 넣을 수 있어요.');
      return createImageBitmap(src);
    }
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('그림을 열지 못했어요.')); i.src = src; });
  }
  async function open({ source, w, h, round = false, title = '✂️ 사진 맞추기', extra = '', fill = '#ffffff' }) {
    if (!box) build();
    if (resolve) finish(null);
    const img = await load(source);
    const dw = w === h ? 240 : w / h >= 1.6 ? 380 : 300, dh = Math.round(dw * h / w);   // 화면에 보이는 틀 크기
    cc.width = dw * 2; cc.height = dh * 2; cc.style.width = dw + 'px'; cc.style.height = dh + 'px';
    const cover = Math.max(dw / img.width, dh / img.height), contain = Math.min(dw / img.width, dh / img.height);
    st = { img, w, h, DW: dw, DH: dh, round, cover, contain, kMin: contain * 0.6, kMax: cover * 5, k: cover, ox: 0, oy: 0 };
    q('.crop-title').textContent = title;
    q('.crop-fill').value = fill;
    const ex = q('[data-act=extra]'); ex.textContent = extra; ex.hidden = !extra;
    sync(); draw();
    box.hidden = false;
    return new Promise((r) => { resolve = r; });
  }
  // 줄여서 dataURL (JPEG, 용량 넘으면 품질 낮춤). png: true 면 투명 유지 PNG 먼저 시도
  function toData(canvas, maxLen, png = false) {
    if (png) { const d = canvas.toDataURL('image/png'); if (d.length <= maxLen) return d; }
    const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(canvas, 0, 0);
    for (const qv of [0.88, 0.8, 0.7, 0.6, 0.5, 0.4]) { const d = c.toDataURL('image/jpeg', qv); if (d.length <= maxLen) return d; }
    throw new Error('그림을 충분히 줄이지 못했어요.');
  }
  return { open, toData };
})();
