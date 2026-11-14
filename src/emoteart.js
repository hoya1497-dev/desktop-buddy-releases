// 채팅 이모티콘 — 하루가 보내준 캐릭터 그림(PNG)을 그대로 불러와서 그림
window.EmoteArt = (() => {
  const FILES = {
    wave: 'wave',
    bye: 'bye',
    zzz: 'zzz',
    good: 'good',
    dislike: 'dislike',
    heart: 'heart',
    cheer: 'cheer',
    poke: 'poke',
  };

  const imgs = {};
  for (const [kind, file] of Object.entries(FILES)) {
    const im = new Image();
    im.src = `assets/emotes/${file}.png`;
    imgs[kind] = im;
  }

  function has(kind) { return !!imgs[kind]; }

  /** (cx, bottom) 기준 아래쪽 가운데 정렬로 그림. size: 그려질 세로 높이(px) */
  function draw(ctx, kind, cx, bottom, size = 28) {
    const im = imgs[kind];
    if (!im || !im.complete || !im.naturalWidth) return;
    const h = size;
    const w = h * (im.naturalWidth / im.naturalHeight);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(im, Math.round(cx - w / 2), Math.round(bottom - h), Math.round(w), Math.round(h));
    ctx.restore();
  }

  return { draw, has, kinds: Object.keys(FILES) };
})();
