// 닉네임 색 커스터마이징 + 운영자 전용 네온/무지개 효과. 여러 창(집 · 바탕화면 · 설정)에서 같이 씀.
// profile.nameColor: 내가 고른 닉네임 글자색(#rrggbb) · profile.nameEffect: 운영자가 준 효과('neon'|'rainbow'|null)
window.NickFX = (() => {
  const RAINBOW = ['#ff5a5a', '#ff9a3c', '#ffd23c', '#5adf6b', '#4ab8ff', '#8a6bff', '#ff6bd0'];

  // 캔버스에 그릴 때 쓸 色: t(초 단위 시간)에 따라 네온은 깜빡, 무지개는 색이 도는 효과
  function canvasColor(profile, t, fallback) {
    const eff = profile && profile.nameEffect;
    if (eff === 'rainbow') {
      const i = Math.floor((t * 2) % RAINBOW.length);
      return RAINBOW[i];
    }
    if (eff === 'neon') return '#ffffff';   // 네온: 글자는 흰색, 고른 색은 빛(glow)으로
    return (profile && profile.nameColor) || fallback || '#fff';
  }
  // 캔버스 텍스트에 효과를 적용하고(그려야 할 ctx 설정), 원상복구용 함수를 돌려줌
  function applyCanvasGlow(ctx, profile, t) {
    const eff = profile && profile.nameEffect;
    if (eff === 'neon') {
      const glow = profile.nameColor || '#6cf0ff';
      ctx.shadowColor = glow;
      ctx.shadowBlur = 6 + 3 * Math.sin(t * 6);
      return () => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; };
    }
    if (eff === 'rainbow') {
      ctx.shadowColor = canvasColor(profile, t);
      ctx.shadowBlur = 4;
      return () => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; };
    }
    return () => {};
  }
  // 네온 간판처럼: 고른 색 빛을 넓게 → 좁게 겹쳐 그린 뒤 흰 글자를 맨 위에. 네온이 아니면 한 번만 그림
  const neonGlow = (profile) => profile.nameColor || '#6cf0ff';

  // ---- 0.14.1 새 효과: 그라데이션 글자 + 반짝이 (gold 골드 · galaxy 은하수 · fire 불꽃)
  const GRAD = {
    gold:   { stops: ['#c98a12', '#ffd34d', '#fff6c8', '#ffd34d', '#c98a12'], glow: 'rgba(255,200,60,0.55)', speed: 0.45, spark: '#fffbe0', sparkN: 3 },
    galaxy: { stops: ['#b79bff', '#8fd3ff', '#ffb3e6', '#8fd3ff', '#b79bff'], glow: 'rgba(138,107,255,0.75)', speed: 0.25, spark: '#ffffff', sparkN: 4 },
    fire:   { stops: ['#ff4d2e', '#ff9a3c', '#ffe066', '#ff9a3c', '#ff4d2e'], glow: 'rgba(255,90,30,0.7)', speed: 0.6, spark: '#ffcf6a', sparkN: 3 },
  };
  const rnd = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  // 4갈래 반짝이 (✦ 모양)
  function sparkle(ctx, x, y, r, col, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
    ctx.restore();
  }
  function fillGrad(ctx, text, x, y, maxW, eff, t) {
    const G = GRAD[eff];
    const w = Math.min(maxW || Infinity, ctx.measureText(text).width) || 1;
    const fs = parseFloat(/(\d+(?:\.\d+)?)px/.exec(ctx.font)?.[1] || 12);
    const left = ctx.textAlign === 'center' ? x - w / 2 : ctx.textAlign === 'right' ? x - w : x;
    const mid = ctx.textBaseline === 'middle' ? y : ctx.textBaseline === 'top' ? y + fs / 2 : y - fs * 0.35;
    // 글자 폭의 2배짜리 그라데이션을 옆으로 흘려 보냄 (끝 색 = 처음 색이라 이음매가 안 보임)
    const span = Math.max(40, w * 1.6), off = ((t * G.speed) % 1) * span;
    let grad;
    if (eff === 'fire') {   // 불꽃은 아래(빨강) → 위(노랑)로 일렁임
      const h = fs * 1.2, wob = Math.sin(t * 7) * fs * 0.12;
      grad = ctx.createLinearGradient(0, mid + h / 2, 0, mid - h / 2 + wob);
      grad.addColorStop(0, '#ff3b1f'); grad.addColorStop(0.45, '#ff8a2a'); grad.addColorStop(0.85, '#ffd84a'); grad.addColorStop(1, '#fff3a0');
    } else {
      grad = ctx.createLinearGradient(left - span + off, 0, left + off, 0);
      G.stops.forEach((c, i) => grad.addColorStop(i / (G.stops.length - 1), c));
      // 그라데이션 바깥도 같은 무늬가 되도록 한 번 더 (반복)
      const g2 = ctx.createLinearGradient(left - span + off, 0, left + span + off, 0);
      [...G.stops, ...G.stops.slice(1)].forEach((c, i, a) => g2.addColorStop(i / (a.length - 1), c));
      grad = g2;
    }
    ctx.save();
    // 은은한 빛 + 아주 얇은 어두운 테두리 (밝은 배경에서도 읽히게)
    ctx.shadowColor = G.glow; ctx.shadowBlur = eff === 'fire' ? 6 + 2 * Math.sin(t * 9) : 5;
    ctx.lineWidth = Math.max(1, fs / 9); ctx.strokeStyle = eff === 'galaxy' ? 'rgba(40,20,90,0.55)' : 'rgba(90,40,0,0.45)';
    ctx.strokeText(text, x, y, maxW);
    ctx.fillStyle = grad; ctx.fillText(text, x, y, maxW);
    ctx.shadowBlur = 0;
    // 골드: 하얀 빛줄기가 2.5초마다 한 번 쓱 지나감
    if (eff === 'gold') {
      const k = (t % 2.5) / 0.9;
      if (k < 1) {
        const sx = left - fs + k * (w + fs * 2);
        const sh = ctx.createLinearGradient(sx - fs * 0.7, 0, sx + fs * 0.7, 0);
        sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.95)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = sh; ctx.fillText(text, x, y, maxW);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    // 반짝이 (골드 · 은하수: 글자 위아래 ✦ / 불꽃: 위로 날리는 불티)
    for (let i = 0; i < G.sparkN; i++) {
      if (eff === 'fire') {
        const life = (t * 0.9 + rnd(i + 3)) % 1;
        const px = left + rnd(i + 11) * w + Math.sin(t * 4 + i) * 2, py = mid - fs * 0.4 - life * fs * 0.9;
        ctx.globalAlpha = (1 - life) * 0.9; ctx.fillStyle = life < 0.5 ? '#ffe066' : '#ff8a2a';
        ctx.fillRect(Math.round(px), Math.round(py), Math.max(1, fs / 7), Math.max(1, fs / 7));
        ctx.globalAlpha = 1;
        continue;
      }
      const a = Math.sin(t * (2.2 + rnd(i) * 1.5) + i * 2.1);
      if (a <= 0.05) continue;
      const px = left + (0.08 + rnd(i + 5) * 0.84) * w, py = mid + (rnd(i + 9) < 0.5 ? -1 : 1) * fs * (0.42 + rnd(i + 2) * 0.15);
      sparkle(ctx, px, py, fs * (0.22 + 0.12 * a), G.spark, a);
    }
    ctx.restore();
  }

  function fillName(ctx, text, x, y, maxW, profile, t) {
    if (profile && GRAD[profile.nameEffect]) { fillGrad(ctx, text, x, y, maxW, profile.nameEffect, t); return; }
    if (profile && profile.nameEffect === 'neon') {
      const pulse = 0.75 + 0.25 * Math.sin(t * 5);
      ctx.save();
      ctx.shadowColor = neonGlow(profile);
      ctx.fillStyle = neonGlow(profile);
      for (const blur of [16, 8, 3]) { ctx.shadowBlur = blur * pulse; ctx.fillText(text, x, y, maxW); }
      ctx.shadowBlur = 2; ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x, y, maxW);
      ctx.restore();
      return;
    }
    const restore = profile ? applyCanvasGlow(ctx, profile, t) : () => {};
    ctx.fillStyle = profile ? canvasColor(profile, t, '#fff') : '#fff';
    ctx.fillText(text, x, y, maxW);
    restore();
  }
  // DOM(채팅창 · 친구 목록 등)에 쓸 class + 인라인 색
  function domClass(profile) {
    const eff = profile && profile.nameEffect;
    return eff === 'neon' ? 'nick-neon' : eff === 'rainbow' ? 'nick-rainbow' : GRAD[eff] ? 'nick-' + eff : '';
  }
  function domStyle(profile, fallback) {
    if (profile && profile.nameEffect === 'neon') return `color:#fff;--nick-glow:${neonGlow(profile)}`;
    if (profile && (profile.nameEffect === 'rainbow' || GRAD[profile.nameEffect])) return '';
    return `color:${(profile && profile.nameColor) || fallback || 'inherit'}`;
  }
  // 이름표 한 줄: 닉네임은 닉네임 색·효과로, 뒤에 붙는 상태(' · 공부 중' 등)는 항상 흰색으로 그림
  function drawNameLine(ctx, name, tail, cx, cy, maxW, profile, t) {
    const nw = name ? ctx.measureText(name).width : 0, tw = tail ? ctx.measureText(tail).width : 0;
    const k = Math.min(1, maxW / Math.max(1, nw + tw));
    const align = ctx.textAlign;
    ctx.textAlign = 'left';
    let x = cx - (nw + tw) * k / 2;
    if (name) {
      fillName(ctx, name, x, cy, nw * k, profile, t);
      x += nw * k;
    }
    if (tail) { ctx.fillStyle = '#fff'; ctx.fillText(tail, x, cy, tw * k); }
    ctx.textAlign = align;
  }
  // 효과 이름 (설정 창 안내 · 관리자 알림에 씀)
  const LABEL = { neon: '네온', rainbow: '무지개', gold: '골드', galaxy: '은하수', fire: '불꽃' };
  return { canvasColor, applyCanvasGlow, fillName, drawNameLine, domClass, domStyle, RAINBOW, LABEL };
})();
