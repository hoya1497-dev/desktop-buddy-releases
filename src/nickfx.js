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
  function fillName(ctx, text, x, y, maxW, profile, t) {
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
    return eff === 'neon' ? 'nick-neon' : eff === 'rainbow' ? 'nick-rainbow' : '';
  }
  function domStyle(profile, fallback) {
    if (profile && profile.nameEffect === 'neon') return `color:#fff;--nick-glow:${neonGlow(profile)}`;
    if (profile && profile.nameEffect === 'rainbow') return '';
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
  return { canvasColor, applyCanvasGlow, fillName, drawNameLine, domClass, domStyle, RAINBOW };
})();
