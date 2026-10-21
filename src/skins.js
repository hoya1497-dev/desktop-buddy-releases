// 사용자가 올린 캐릭터 그림(서 있기 · 앉기 · 걷기) 캐시와 그리기
window.Skins = (() => {
  const data = {}; // username -> { v, faces, imgs: { stand, sit, walk } }

  function update(obj) {
    for (const [username, s] of Object.entries(obj || {})) {
      const cur = data[username];
      if (cur && cur.v === s.v) continue;
      const imgs = {};
      for (const pose of ['stand', 'sit', 'walk']) {
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
    const im = s.imgs[pose] || s.imgs.stand;
    if (!im || !im.complete || !im.naturalWidth) return 0;
    const w = height * (im.naturalWidth / im.naturalHeight);
    const flip = (dir > 0) !== (s.faces === 'right');
    ctx.save();
    ctx.imageSmoothingEnabled = im.naturalHeight >= 64; // 작은 도트 그림은 또렷하게
    ctx.translate(cx, bottom);
    if (flip) ctx.scale(-1, 1);
    if (tilt) ctx.rotate(tilt);
    ctx.drawImage(im, -w / 2, -height, w, height);
    ctx.restore();
    return w;
  }

  return { update, get, draw };
})();
