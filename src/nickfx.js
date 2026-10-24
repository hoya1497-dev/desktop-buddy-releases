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
    if (eff === 'neon') return (profile.nameColor || '#6cf0ff');
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
  // DOM(채팅창 · 친구 목록 등)에 쓸 class + 인라인 색
  function domClass(profile) {
    const eff = profile && profile.nameEffect;
    return eff === 'neon' ? 'nick-neon' : eff === 'rainbow' ? 'nick-rainbow' : '';
  }
  function domStyle(profile, fallback) {
    if (profile && profile.nameEffect === 'neon') return `color:${profile.nameColor || '#6cf0ff'};--nick-glow:${profile.nameColor || '#6cf0ff'}`;
    if (profile && profile.nameEffect === 'rainbow') return '';
    return `color:${(profile && profile.nameColor) || fallback || 'inherit'}`;
  }
  return { canvasColor, applyCanvasGlow, domClass, domStyle, RAINBOW };
})();
