// 사용자가 올린 캐릭터 그림(서 있기 · 앉기 · 걷기) 캐시와 그리기
window.Skins = (() => {
  const data = {}; // username -> { v, faces, imgs: { stand, sit, walk } }

  function update(obj) {
    for (const [username, s] of Object.entries(obj || {})) {
      const cur = data[username];
      if (cur && cur.v === s.v) continue;
      const imgs = {};
      for (const pose of ['stand', 'sit', 'walk', 'lie', 'fall']) {
        if (!s[pose]) continue;
        const im = new Image();
        im.src = s[pose];
        imgs[pose] = im;
      }
      data[username] = { v: s.v, faces: s.faces || 'right', imgs };
    }
  }

  // profile.skin = { v, faces } 가 있을 때만 그림을 씀
  function get(username, skin) {
    if (!username || !skin || !skin.v) return null;
    const s = data[username];
    return s && s.v === skin.v ? s : null;
  }

  /**
   * 발 위치(cx, bottom) 기준으로 그림. height는 그림 높이(px).
   * dir: 1이면 오른쪽을 보고, -1이면 왼쪽을 봄.
   * 돌려준 값은 그려진 폭(아직 로딩 중이면 0).
   */
  function draw(ctx, s, pose, cx, bottom, height, dir, tilt = 0) {
    // 눕기 · 떨어지기 그림이 없으면 앉기 · 서 있기로 대신
    const FALLBACK = { lie: 'sit', fall: 'stand' };
    let im = s.imgs[pose];
    if (!im || !im.complete || !im.naturalWidth) im = s.imgs[FALLBACK[pose]] || s.imgs.stand;
    if (!im || !im.complete || !im.naturalWidth) return 0;
    // 누운 그림은 옆으로 길쭉하니까, 서 있는 그림과 같은 비율로 줄여서 너무 커지지 않게
    if (im === s.imgs.lie && s.imgs.stand && s.imgs.stand.naturalHeight) {
      height *= Math.max(0.35, Math.min(1, im.naturalHeight / s.imgs.stand.naturalHeight));
    }
    const w = height * (im.naturalWidth / im.naturalHeight);
    const flip = (dir > 0) !== (s.faces === 'right');
    ctx.save();
    ctx.imageSmoothingEnabled = im.naturalHeight >= 64; // 작은 도트 그림은 또렷하게
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(cx, bottom);
    if (flip) ctx.scale(-1, 1);
    if (tilt) ctx.rotate(tilt);
    ctx.drawImage(im, -w / 2, -height, w, height);
    ctx.restore();
    return w;
  }

  const has = (s, pose) => !!(s && s.imgs[pose]);
  return { update, get, draw, has };
})();
