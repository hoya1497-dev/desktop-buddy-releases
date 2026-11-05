// 🏅 칭호 (0.17.2): 닉네임 앞 이모지 + 글씨체 + 만화 꾸밈 세트. 한 번에 하나만 달아요.
// 서버 catalog.titles 와 같은 id 를 써요 (조건 · 값은 서버가 정함, 그리는 방법은 여기).
// 글씨체 5개: 블랙한산스(두껍게) · 주아(동글) · 나눔손글씨 펜(손글씨) · 도현(반듯) · 연성(붓글씨)
window.Titles = (() => {
  const F = { bold: 'Black Han Sans', round: 'Jua', pen: 'Nanum Pen Script', clean: 'Do Hyeon', brush: 'Yeon Sung' };
  const FALLBACK = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif';
  const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

  // 칭호마다 그리는 방법 (paint). size: 기본 글자 크기 배율
  // e = { ctx, text, cx, mid, w, h, px, x0, t, fill(style), outline(color, width), font }
  const STYLE = {
    // 🌱 뉴비 — 새싹 스티커: 하얀 칼선 스티커 + 끝 글자에서 새싹이 쏙
    newbie: { font: F.round, size: 1.12, paint(e) {
      const { ctx, x0, w, h, mid } = e;
      ctx.save(); ctx.translate(e.cx, mid); ctx.rotate(-0.04); ctx.translate(-e.cx, -mid);
      sticker(ctx, x0 - h * 0.45, mid - h * 0.85, w + h * 0.9, h * 1.7, h * 0.85, '#ffffff', '#cfe9c8');
      e.fill('#3a9a3f');
      sprout(ctx, x0 + w + h * 0.05, mid - h * 0.45, h * 0.75, e.t);
      ctx.restore();
    } },
    // 🌙 한 달 — 밤하늘 리본: 남색 둥근 띠에 작은 별, 크림색 붓글씨
    month1: { font: F.brush, size: 1.15, paint(e) {
      const { ctx, x0, w, h, mid, t } = e;
      const bx = x0 - h * 0.6, bw = w + h * 1.2, by = mid - h * 0.8, bh = h * 1.6;
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#1d2350'); g.addColorStop(1, '#3d2f7a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, bh / 2); ctx.fill();
      for (let k = 0; k < 6; k++) { ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t * 1.8 + k * 1.3)); ctx.fillStyle = '#fff6c8'; ctx.fillRect(bx + bw * ((k * 0.37 + 0.08) % 1), by + bh * ((k * 0.53 + 0.2) % 0.8), Math.max(1, h / 12), Math.max(1, h / 12)); }
      ctx.globalAlpha = 1;
      e.fill('#fff1c4');
      ctx.font = `${Math.round(h * 0.8)}px ${FALLBACK}`; ctx.fillStyle = '#ffd86b'; ctx.fillText('☾', bx + bw - h * 0.42, mid - h * 0.05);
    } },
    // 💯 100일 — 빨간 도장: 비스듬한 이중 테두리 도장, 잉크 번짐
    day100: { font: F.clean, size: 1.05, paint(e) {
      const { ctx, x0, w, h, mid, cx } = e;
      ctx.save(); ctx.translate(cx, mid); ctx.rotate(-0.09); ctx.translate(-cx, -mid);
      const bx = x0 - h * 0.45, bw = w + h * 0.9, by = mid - h * 0.78, bh = h * 1.56;
      ctx.fillStyle = '#fffaf2'; ctx.beginPath(); ctx.roundRect(bx - h * 0.12, by - h * 0.12, bw + h * 0.24, bh + h * 0.24, h * 0.36); ctx.fill();   // 도장 찍힌 종이
      ctx.strokeStyle = '#d62f2f'; ctx.lineWidth = Math.max(1.2, h / 7);
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, h * 0.3); ctx.stroke();
      ctx.lineWidth = Math.max(0.8, h / 14); ctx.beginPath(); ctx.roundRect(bx + h * 0.16, by + h * 0.16, bw - h * 0.32, bh - h * 0.32, h * 0.2); ctx.stroke();
      e.fill('#d62f2f');
      // 잉크가 덜 묻은 곳 (점점이 지우기)
      ctx.fillStyle = '#fffaf2';
      for (let k = 0; k < 14; k++) { ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(bx + bw * ((k * 0.618) % 1), by + bh * ((k * 0.382 + 0.1) % 1), h * (0.05 + (k % 3) * 0.03), 0, 7); ctx.fill(); }
      ctx.restore();
    } },
    // 🌷 200일 — 손편지 사인: 분홍 손글씨 + 꼬리 긴 밑줄 + 끝에 하트
    day200: { font: F.pen, size: 1.55, paint(e) {
      const { ctx, x0, w, h, mid } = e;
      e.fill('#d23f86');
      ctx.strokeStyle = '#ee7fb2'; ctx.lineWidth = Math.max(1, h / 9); ctx.lineCap = 'round';
      const y = mid + h * 0.62;
      ctx.beginPath(); ctx.moveTo(x0 - h * 0.25, y + h * 0.1);
      ctx.bezierCurveTo(x0 + w * 0.3, y - h * 0.15, x0 + w * 0.7, y + h * 0.35, x0 + w + h * 0.2, y - h * 0.05);
      ctx.bezierCurveTo(x0 + w + h * 0.55, y - h * 0.25, x0 + w + h * 0.45, y - h * 0.75, x0 + w + h * 0.15, y - h * 0.45);
      ctx.stroke();
      heart(ctx, x0 + w + h * 0.75, mid - h * 0.35, h * 0.42, '#ff5fa2', e.t);
    } },
    // 🍀 300일 — 형광펜: 연두 형광펜으로 쓱 칠한 위에 진한 초록 글씨
    day300: { font: F.round, size: 1.1, paint(e) {
      const { ctx, x0, w, h, mid } = e;
      ctx.fillStyle = 'rgba(176,240,90,0.8)';
      ctx.beginPath(); ctx.moveTo(x0 - h * 0.3, mid - h * 0.05); ctx.lineTo(x0 + w + h * 0.35, mid - h * 0.28); ctx.lineTo(x0 + w + h * 0.3, mid + h * 0.52); ctx.lineTo(x0 - h * 0.25, mid + h * 0.6); ctx.closePath(); ctx.fill();
      e.outline('#ffffff', h / 4.5);
      e.fill('#1b5e20');
      ctx.font = `${Math.round(h * 0.75)}px ${EMOJI}`; ctx.fillText('🍀', x0 + w + h * 0.65, mid - h * 0.4);
    } },
    // 🎂 1주년 — 생일 가랜드: 위에 알록달록 깃발 줄 + 사탕 줄무늬 글자
    year1: { font: F.bold, size: 1.05, paint(e) {
      const { ctx, x0, w, h, mid, t } = e;
      const top = mid - h * 0.95, cols = ['#ff6b6b', '#ffd43b', '#4dabf7', '#51cf66', '#cc5de8'];
      ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = Math.max(0.8, h / 16);
      ctx.beginPath(); ctx.moveTo(x0 - h * 0.3, top); ctx.quadraticCurveTo(x0 + w / 2, top + h * 0.35, x0 + w + h * 0.3, top); ctx.stroke();
      const n = Math.max(3, Math.round((w + h * 0.6) / (h * 0.5)));
      for (let k = 0; k < n; k++) {
        const u = (k + 0.5) / n, fx = x0 - h * 0.3 + (w + h * 0.6) * u, fy = top + h * 0.35 * 4 * u * (1 - u) * 0.5;
        const sw = Math.sin(t * 2 + k) * h * 0.04;
        ctx.fillStyle = cols[k % cols.length]; ctx.beginPath(); ctx.moveTo(fx - h * 0.17, fy); ctx.lineTo(fx + h * 0.17, fy); ctx.lineTo(fx + sw, fy + h * 0.32); ctx.closePath(); ctx.fill();
      }
      e.outline('#7a3b12', h / 5);
      const pat = stripes(ctx, ['#ff8fab', '#fff5f7'], h / 3.2);
      e.fill(pat);
    } },
    // 🎈 500일 — 풍선 글자: 하늘색 통통한 테두리 + 하얀 글자 + 반짝 하이라이트
    day500: { font: F.round, size: 1.15, paint(e) {
      const { ctx, x0, w, h, mid } = e;
      e.outline('#1c7ed6', h / 2.2);
      e.outline('#74c0fc', h / 3.4);
      e.fill('#ffffff');
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      for (const [u, v] of [[0.12, -0.32], [0.62, -0.3]]) { ctx.beginPath(); ctx.ellipse(x0 + w * u, mid + h * v, h * 0.1, h * 0.06, -0.5, 0, 7); ctx.fill(); }
      balloon(ctx, x0 + w + h * 0.7, mid - h * 0.2, h * 0.55, '#ff6b6b', e.t);
    } },
    // 🏆 2주년 — 월계관: 양옆 잎사귀 + 위는 밝고 아래는 진한 남색 글자
    year2: { font: F.clean, size: 1.1, paint(e) {
      const { ctx, x0, w, h, mid } = e;
      laurel(ctx, x0 - h * 0.35, mid, h, -1, '#4c9a5b');
      laurel(ctx, x0 + w + h * 0.35, mid, h, 1, '#4c9a5b');
      e.outline('#ffffff', h / 4);
      const g = ctx.createLinearGradient(0, mid - h / 2, 0, mid + h / 2); g.addColorStop(0, '#5b7bd5'); g.addColorStop(1, '#1d2b64');
      e.fill(g);
    } },
    // 📅 개근 — 달력 한 장: 빨간 머리띠 달력 위에 글자 + 동그라미 체크
    attend: { font: F.clean, size: 1.0, paint(e) {
      const { ctx, x0, w, h, mid } = e;
      const bx = x0 - h * 0.4, bw = w + h * 0.8, by = mid - h * 0.95, bh = h * 1.85;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#c9c2b8'; ctx.lineWidth = Math.max(0.8, h / 14);
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, h * 0.18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.roundRect(bx, by, bw, h * 0.38, [h * 0.18, h * 0.18, 0, 0]); ctx.fill();
      ctx.fillStyle = '#ffffff'; for (const u of [0.25, 0.75]) { ctx.beginPath(); ctx.arc(bx + bw * u, by + h * 0.19, h * 0.07, 0, 7); ctx.fill(); }
      e.fill('#2b2f3a', 0, h * 0.2);
      ctx.strokeStyle = '#e03131'; ctx.lineWidth = Math.max(1, h / 9); ctx.beginPath(); ctx.ellipse(bx + bw + h * 0.25, mid + h * 0.1, h * 0.38, h * 0.32, -0.3, 0, 7); ctx.stroke();
    } },
    // 🎣 낚시왕 — 깊은 바다 띠: 남색→청록 바다, 위에서 빛줄기, 황금 물고기가 글자 위로 폴짝 + 작은 왕관
    fisher: { font: F.bold, size: 1.05, paint(e) {
      const { ctx, x0, w, h, mid, t } = e;
      const bx = x0 - h * 0.6, bw = w + h * 1.2, by = mid - h * 0.8, bh = h * 1.6;
      ctx.save();
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, bh * 0.35); ctx.clip();
      const g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, '#0e7490'); g.addColorStop(1, '#0b1f4d');
      ctx.fillStyle = g; ctx.fillRect(bx, by, bw, bh);
      ctx.globalAlpha = 0.18; ctx.fillStyle = '#e0faff';   // 빛줄기
      for (let k = 0; k < 3; k++) { const rx = bx + bw * (0.2 + k * 0.3) + Math.sin(t * 0.8 + k) * h * 0.2; ctx.beginPath(); ctx.moveTo(rx, by); ctx.lineTo(rx + h * 0.3, by); ctx.lineTo(rx - h * 0.2, by + bh); ctx.lineTo(rx - h * 0.45, by + bh); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(165,243,252,0.55)'; ctx.lineWidth = Math.max(0.8, h / 12);   // 물결 줄
      ctx.beginPath(); for (let x = 0; x <= bw; x += 1.5) { const y = by + bh * 0.82 + Math.sin(x / h * 3 + t * 2.4) * h * 0.06; x ? ctx.lineTo(bx + x, y) : ctx.moveTo(bx + x, y); } ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = Math.max(0.8, h / 13); ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, bh * 0.35); ctx.stroke();
      e.outline('#082f49', h / 5);
      const tg = ctx.createLinearGradient(0, mid - h / 2, 0, mid + h / 2); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#a5f3fc');
      e.fill(tg);
      // 황금 물고기 폴짝 (글자 오른쪽 위에서 원을 그리며)
      const u = (t * 0.5) % 1, ang = Math.PI * (1.15 - u * 1.3);
      const fx = bx + bw - h * 0.05 + Math.cos(ang) * h * 0.7, fy = by + h * 0.05 - Math.sin(ang) * h * 0.7;
      goldFish(ctx, fx, fy, h * 0.62, -ang + Math.PI / 2);
      crown(ctx, bx + h * 0.3, by - h * 0.12, h * 0.62, -0.32);
    } },
    // 📖 도감왕 — 황금 도감 표지: 진한 남색 가죽 표지 + 금박 테두리 · 모서리 장식 + 금박 글씨에 빛이 쓱 + 보석
    dex: { font: F.brush, size: 1.15, paint(e) {
      const { ctx, x0, w, h, mid, t } = e;
      const bx = x0 - h * 0.85, bw = w + h * 1.7, by = mid - h * 0.92, bh = h * 1.84;
      // 표지 (가죽 그라데이션 + 그림자)
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = h * 0.25; ctx.shadowOffsetY = h * 0.08;
      const g = ctx.createLinearGradient(bx, by, bx + bw, by + bh); g.addColorStop(0, '#1e3a5f'); g.addColorStop(0.55, '#14284a'); g.addColorStop(1, '#0b1a33');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, h * 0.22); ctx.fill(); ctx.restore();
      // 책등 (왼쪽 진한 띠 + 금줄 두 개)
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(bx + h * 0.08, by + h * 0.06, h * 0.32, bh - h * 0.12);
      const gold = ctx.createLinearGradient(0, by, 0, by + bh); gold.addColorStop(0, '#fff1a8'); gold.addColorStop(0.45, '#e9b949'); gold.addColorStop(0.55, '#c8901d'); gold.addColorStop(1, '#f7d774');
      ctx.fillStyle = gold; for (const yy of [by + h * 0.35, by + bh - h * 0.42]) ctx.fillRect(bx + h * 0.08, yy, h * 0.32, h * 0.07);
      // 금박 테두리 (이중) + 모서리 장식
      ctx.strokeStyle = gold; ctx.lineWidth = Math.max(0.8, h / 13);
      const ix = bx + h * 0.5, iy = by + h * 0.16, iw = bw - h * 0.66, ih = bh - h * 0.32;
      ctx.beginPath(); ctx.roundRect(ix, iy, iw, ih, h * 0.12); ctx.stroke();
      ctx.lineWidth = Math.max(0.5, h / 24); ctx.beginPath(); ctx.roundRect(ix + h * 0.09, iy + h * 0.09, iw - h * 0.18, ih - h * 0.18, h * 0.08); ctx.stroke();
      ctx.fillStyle = gold;
      for (const [cx2, cy2, sx, sy] of [[ix, iy, 1, 1], [ix + iw, iy, -1, 1], [ix, iy + ih, 1, -1], [ix + iw, iy + ih, -1, -1]]) {
        ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + sx * h * 0.32, cy2); ctx.quadraticCurveTo(cx2 + sx * h * 0.12, cy2 + sy * h * 0.12, cx2, cy2 + sy * h * 0.32); ctx.closePath(); ctx.fill();
      }
      // 금박 글씨 (진한 테두리 → 금 그라데이션 → 빛)
      e.outline('#3b2a05', h / 5);
      const tg = ctx.createLinearGradient(0, mid - h / 2, 0, mid + h / 2); tg.addColorStop(0, '#fffbe0'); tg.addColorStop(0.5, '#f4c84a'); tg.addColorStop(1, '#c58a12');
      e.fill(tg);
      e.shine(t * 0.8);
      // 보석 (오른쪽 위 모서리, 반짝)
      const gx = ix + iw, gy = iy, r = h * 0.2;
      ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.moveTo(gx, gy - r); ctx.lineTo(gx + r * 0.8, gy); ctx.lineTo(gx, gy + r); ctx.lineTo(gx - r * 0.8, gy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = gold; ctx.lineWidth = Math.max(0.6, h / 20); ctx.stroke();
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3); ctx.fillStyle = '#ffffff'; ctx.font = `${Math.round(h * 0.55)}px ${FALLBACK}`; ctx.fillText('✦', gx + r * 1.2, gy - r * 0.9); ctx.globalAlpha = 1;
    } },
    // 🐾 펫 부자 — 통통 튀는 글자 + 아래로 발자국이 콩콩
    petlover: { font: F.round, size: 1.1, letters: true, paint(e) {
      const { ctx, x0, w, h, mid, t } = e;
      for (let k = 0; k < 4; k++) paw(ctx, x0 + (w + h * 0.6) * (k / 3.2), mid + h * 0.72 - (k % 2) * h * 0.18, h * 0.22, `rgba(240,120,160,${0.35 + 0.15 * k})`);
      e.letters((ch, i) => ({ dy: Math.sin(t * 5 - i * 0.9) * h * 0.09, color: ['#e8590c', '#d6336c', '#ae3ec9'][i % 3] }), '#ffffff', h / 4);
    } },
    // 🏠 인테리어 장인 — 벽지 무늬 글자: 체크무늬로 채운 굵은 글자 + 진한 테두리
    decorator: { font: F.bold, size: 1.08, paint(e) {
      const { ctx, h } = e;
      e.outline('#5c3317', h / 3.6);
      e.fill(checker(ctx, '#ffe8cc', '#ffa94d', h / 3.6));
    } },
    // 시즌 이벤트 (하루가 '괜찮다' 한 모양 그대로)
    halloween: { font: F.bold, size: 1.05, generic: { color: '#ff8a1f', stroke: '#2b1640', strokeW: 3, shadow: '#7c3aed', spark: ['🦇', '·'], sparkColors: [null, '#a78bfa'] } },
    xmas:      { font: F.round, size: 1.1, generic: { color: '#d62828', stroke: '#ffffff', shadow: '#1b7f3b', spark: ['❄', '✦'], sparkColors: ['#9fd8ff', '#ffd43b'] } },
    newyear:   { font: F.brush, size: 1.2, generic: { color: '#c1121f', stroke: '#fff1c1', frame: 'tag', frameColor: '#fff0f0', frameLine: '#d4a017', spark: ['✦'], sparkColors: ['#e0b100'] } },
    // 🛡️ 운영자 — 공식 배지: 파란 방패 띠 + 흰 글자 + 빛이 쓱 + 인증 체크
    op: { font: F.bold, size: 1.05, paint(e) {
      const { ctx, x0, w, h, mid, t } = e;
      const bx = x0 - h * 0.5, bw = w + h * 1.0, by = mid - h * 0.78, bh = h * 1.56;
      const g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, '#3b82f6'); g.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx + h * 0.3, by); ctx.lineTo(bx + bw - h * 0.3, by); ctx.lineTo(bx + bw, mid); ctx.lineTo(bx + bw - h * 0.3, by + bh); ctx.lineTo(bx + h * 0.3, by + bh); ctx.lineTo(bx, mid); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#bfdbfe'; ctx.lineWidth = Math.max(0.8, h / 14); ctx.stroke();
      e.fill('#ffffff');
      e.shine(t);
      const r = h * 0.36, ccx = bx + bw + r * 1.1, ccy = mid - h * 0.3;
      ctx.fillStyle = '#1d9bf0'; ctx.beginPath(); ctx.arc(ccx, ccy, r, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, r / 3.2); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ccx - r * 0.45, ccy); ctx.lineTo(ccx - r * 0.1, ccy + r * 0.35); ctx.lineTo(ccx + r * 0.5, ccy - r * 0.35); ctx.stroke();
    } },
    // 🧪 베타 테스터 — 글리치: 청록 · 분홍으로 어긋난 글자 + 가끔 지직
    beta: { font: F.clean, size: 1.08, paint(e) {
      const { ctx, h, t } = e;
      const j = (Math.sin(t * 7) > 0.85) ? h * 0.12 : h * 0.06;
      // 까만 모니터 칩 위에
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.roundRect(e.x0 - h * 0.5, e.mid - h * 0.8, e.w + h, h * 1.6, h * 0.25); ctx.fill();
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = Math.max(0.6, h / 16); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      e.fill('rgba(0,229,255,0.9)', -j, 0);
      e.fill('rgba(255,46,151,0.9)', j, 0);
      ctx.globalCompositeOperation = 'source-over';
      e.fill('#f8fafc');
      ctx.fillStyle = 'rgba(15,23,42,0.45)';
      for (let y = e.mid - h / 2; y < e.mid + h / 2; y += Math.max(2, h / 5)) ctx.fillRect(e.x0 - j, y, e.w + j * 2, Math.max(0.6, h / 18));
    } },
    // 🎖️ 명예 버디 — 훈장 리본 띠: 끝이 접힌 빨간 리본 위 금빛 붓글씨
    honor: { font: F.brush, size: 1.15, paint(e) {
      const { ctx, x0, w, h, mid } = e;
      const bx = x0 - h * 0.5, bw = w + h * 1.0, by = mid - h * 0.62, bh = h * 1.24, tail = h * 0.55;
      ctx.fillStyle = '#7f1d1d';
      for (const s of [-1, 1]) { const ex = s < 0 ? bx : bx + bw; ctx.beginPath(); ctx.moveTo(ex, by + h * 0.25); ctx.lineTo(ex + s * tail, by + h * 0.25); ctx.lineTo(ex + s * tail * 0.6, by + h * 0.25 + bh / 2); ctx.lineTo(ex + s * tail, by + bh + h * 0.25); ctx.lineTo(ex, by + bh + h * 0.25); ctx.fill(); }
      const g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, '#e03131'); g.addColorStop(1, '#a51111');
      ctx.fillStyle = g; ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = Math.max(0.6, h / 16); ctx.strokeRect(bx + h * 0.08, by + h * 0.08, bw - h * 0.16, bh - h * 0.16);
      e.outline('#5c0a0a', h / 6);
      const gg = ctx.createLinearGradient(0, mid - h / 2, 0, mid + h / 2); gg.addColorStop(0, '#fff3b0'); gg.addColorStop(1, '#e0a800');
      e.fill(gg);
    } },
  };

  // ---------------------------------------------------------------- 작은 그림 도우미
  function sticker(ctx, x, y, w, h, r, fill, edge) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = h * 0.12; ctx.shadowOffsetY = h * 0.06;
    ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); ctx.restore();
    ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, h / 12); ctx.beginPath(); ctx.roundRect(x + h * 0.08, y + h * 0.08, w - h * 0.16, h - h * 0.16, r * 0.8); ctx.stroke();
  }
  function sprout(ctx, x, y, s, t) {
    const sway = Math.sin(t * 2) * 0.12;
    ctx.save(); ctx.translate(x, y + s * 0.4); ctx.rotate(sway);
    ctx.strokeStyle = '#3a9a3f'; ctx.lineWidth = Math.max(1, s / 7); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.05, -s * 0.3, 0, -s * 0.55); ctx.stroke();
    ctx.fillStyle = '#69c46d';
    ctx.beginPath(); ctx.ellipse(-s * 0.22, -s * 0.6, s * 0.24, s * 0.12, -0.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#8fd694';
    ctx.beginPath(); ctx.ellipse(s * 0.22, -s * 0.68, s * 0.26, s * 0.13, 0.5, 0, 7); ctx.fill();
    ctx.restore();
  }
  function heart(ctx, x, y, s, col, t) {
    const k = 1 + Math.sin(t * 4) * 0.08;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, s * 0.35); ctx.bezierCurveTo(-s * 0.6, -s * 0.05, -s * 0.35, -s * 0.55, 0, -s * 0.22); ctx.bezierCurveTo(s * 0.35, -s * 0.55, s * 0.6, -s * 0.05, 0, s * 0.35); ctx.fill();
    ctx.restore();
  }
  function balloon(ctx, x, y, s, col, t) {
    const dy = Math.sin(t * 2.2) * s * 0.08;
    ctx.strokeStyle = '#9aa0a6'; ctx.lineWidth = Math.max(0.6, s / 12);
    ctx.beginPath(); ctx.moveTo(x, y + s * 0.5 + dy); ctx.quadraticCurveTo(x - s * 0.2, y + s * 0.9, x + s * 0.05, y + s * 1.25); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y + dy, s * 0.38, s * 0.48, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(x - s * 0.12, y - s * 0.15 + dy, s * 0.08, s * 0.13, -0.4, 0, 7); ctx.fill();
  }
  function laurel(ctx, x, y, h, dir, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.8, h / 14);
    ctx.beginPath(); ctx.arc(-h * 0.9, 0, h * 0.95, -0.85, 0.85); ctx.stroke();
    ctx.fillStyle = col;
    for (let k = -3; k <= 3; k++) { const a = k * 0.26; const px = -h * 0.9 + Math.cos(a) * h * 0.95, py = Math.sin(a) * h * 0.95; ctx.save(); ctx.translate(px, py); ctx.rotate(a + 0.9); ctx.beginPath(); ctx.ellipse(h * 0.1, 0, h * 0.16, h * 0.07, 0, 0, 7); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  function paw(ctx, x, y, s, col) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y, s * 0.55, s * 0.45, 0, 0, 7); ctx.fill();
    for (const [dx, dy] of [[-0.55, -0.6], [-0.18, -0.85], [0.18, -0.85], [0.55, -0.6]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, s * 0.2, 0, 7); ctx.fill(); }
  }
  function goldFish(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const g = ctx.createLinearGradient(0, -s * 0.3, 0, s * 0.3); g.addColorStop(0, '#fff3a3'); g.addColorStop(1, '#f59f00');
    ctx.fillStyle = g; ctx.strokeStyle = '#8a5300'; ctx.lineWidth = Math.max(0.6, s / 9);
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.28, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.42, 0); ctx.lineTo(-s * 0.8, -s * 0.28); ctx.lineTo(-s * 0.72, 0); ctx.lineTo(-s * 0.8, s * 0.28); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(s * 0.26, -s * 0.06, Math.max(0.6, s * 0.06), 0, 7); ctx.fill();
    ctx.restore();
  }
  function crown(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const g = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.2); g.addColorStop(0, '#fff3a3'); g.addColorStop(1, '#e8a317');
    ctx.fillStyle = g; ctx.strokeStyle = '#8a5300'; ctx.lineWidth = Math.max(0.6, s / 10); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.2); ctx.lineTo(-s * 0.5, -s * 0.25); ctx.lineTo(-s * 0.25, 0); ctx.lineTo(0, -s * 0.45); ctx.lineTo(s * 0.25, 0); ctx.lineTo(s * 0.5, -s * 0.25); ctx.lineTo(s * 0.5, s * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, s * 0.03, s * 0.08, 0, 7); ctx.fill();
    ctx.restore();
  }
  function stripes(ctx, cols, size) {
    const c = document.createElement('canvas'); const n = Math.max(4, Math.round(size * 2)); c.width = c.height = n;
    const g = c.getContext('2d'); g.fillStyle = cols[1]; g.fillRect(0, 0, n, n);
    g.fillStyle = cols[0]; g.beginPath(); g.moveTo(0, 0); g.lineTo(n / 2, 0); g.lineTo(0, n / 2); g.fill(); g.beginPath(); g.moveTo(n, 0); g.lineTo(n, n / 2); g.lineTo(n / 2, n); g.lineTo(0, n); g.fill();
    return ctx.createPattern(c, 'repeat');
  }
  function checker(ctx, a, b, size) {
    const c = document.createElement('canvas'); const n = Math.max(2, Math.round(size)); c.width = c.height = n * 2;
    const g = c.getContext('2d'); g.fillStyle = a; g.fillRect(0, 0, n * 2, n * 2); g.fillStyle = b; g.fillRect(0, 0, n, n); g.fillRect(n, n, n, n);
    return ctx.createPattern(c, 'repeat');
  }

  // 시즌 이벤트용 (외곽선 · 그림자 · 틀 · 반짝이)
  function generic(e, st) {
    const { ctx, x0, w, h, mid, t } = e;
    if (st.frame === 'tag') {
      const padX = h * 0.55, padY = h * 0.3, fx = x0 - padX, fy = mid - h / 2 - padY, fw = w + padX * 2, fh = h + padY * 2, n = fh / 2;
      ctx.lineWidth = Math.max(1, h / 9); ctx.fillStyle = st.frameColor; ctx.strokeStyle = st.frameLine;
      ctx.beginPath(); ctx.moveTo(fx + n * 0.6, fy); ctx.lineTo(fx + fw, fy); ctx.lineTo(fx + fw, fy + fh); ctx.lineTo(fx + n * 0.6, fy + fh); ctx.lineTo(fx - n * 0.3, mid); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = st.frameLine; ctx.beginPath(); ctx.arc(fx + n * 0.35, mid, Math.max(1, h / 9), 0, 7); ctx.fill();
    }
    const sw = (st.strokeW || 2.4) * h / 10;
    if (st.shadow) { const d = Math.max(1, h / 7); e.outline(st.shadow, sw * 2, d, d); e.fill(st.shadow, d, d); }
    if (st.stroke) e.outline(st.stroke, sw * 2);
    e.fill(st.color);
    if (st.spark) {
      const spots = [[x0 + w + h * 0.55, mid - h * 0.55], [x0 + w + h * 1.05, mid + h * 0.15], [x0 + w + h * 0.4, mid + h * 0.6]];
      spots.forEach(([sx, sy], k) => {
        const ch = st.spark[k % st.spark.length], col = st.sparkColors[k % st.sparkColors.length];
        ctx.globalAlpha = Math.max(0.15, 0.55 + 0.45 * Math.sin(t * 3 + k * 1.7));
        ctx.font = `${Math.round(h * (k % 2 ? 0.7 : 0.85))}px ${col ? FALLBACK : EMOJI}`;
        if (col) ctx.fillStyle = col;
        ctx.fillText(ch, sx, sy);
      });
      ctx.globalAlpha = 1;
    }
  }

  const fontOf = (st, px) => `${px}px "${st.font}", ${FALLBACK}`;
  const ready = new Set();
  function load(id) {
    const st = STYLE[id]; if (!st || ready.has(st.font)) return true;
    if (!document.fonts) return true;
    if (document.fonts.check(`16px "${st.font}"`, '가')) { ready.add(st.font); return true; }
    document.fonts.load(`16px "${st.font}"`, '가나다abc').then(() => ready.add(st.font)).catch(() => {});
    return false;
  }

  // 닉네임 한 줄 그리기. (cx, cy) = 가운데. base: 기본 글자 크기(px). t: 초 (움직이는 꾸밈)
  // profile 에 운영자 닉네임 효과(nameEffect)가 있으면 글자 색은 그 효과로 (NickFX), 꾸밈은 칭호대로
  function draw(ctx, id, text, cx, cy, base, t = 0, profile = null) {
    const st = STYLE[id];
    if (!st) return null;
    load(id);
    const px = Math.round(base * st.size);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const font = fontOf(st, px);
    ctx.font = font;
    const mt = ctx.measureText(text);
    const w = mt.width;
    const asc = mt.actualBoundingBoxAscent || px * 0.4, desc = mt.actualBoundingBoxDescent || px * 0.4;
    const h = Math.max(px * 0.55, asc + desc);
    const mid = cy + (desc - asc) / 2;   // 글자가 실제로 그려진 가운데
    const x0 = cx - w / 2;
    const eff = profile && profile.nameEffect && window.NickFX ? profile : null;
    const e = {
      ctx, text, cx, cy, mid, w, h, px, x0, t, font,
      fill(style, dx = 0, dy = 0) {
        ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (eff && dx === 0 && dy === 0 && typeof style === 'string' && !/rgba/.test(style)) { NickFX.fillName(ctx, text, cx, cy, w + 1, eff, t); return; }
        ctx.fillStyle = style; ctx.fillText(text, cx + dx, cy + dy);
      },
      outline(color, width, dx = 0, dy = 0) {
        ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.strokeText(text, cx + dx, cy + dy);
      },
      shine(tt) {
        const sx = x0 + ((tt * 0.6) % 1.6 - 0.3) * w;
        const gr = ctx.createLinearGradient(sx - h, 0, sx + h, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(180,220,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save(); ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = gr; ctx.fillText(text, cx, cy); ctx.restore();
      },
      // 글자마다 따로 (통통 튀기 등): fn(글자, 번호) → { dy, color }
      letters(fn, strokeCol, strokeW) {
        ctx.font = font; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        let x = x0;
        [...text].forEach((ch, i) => {
          const o = fn(ch, i) || {};
          if (strokeCol) { ctx.strokeStyle = strokeCol; ctx.lineWidth = strokeW; ctx.lineJoin = 'round'; ctx.strokeText(ch, x, cy + (o.dy || 0)); }
          ctx.fillStyle = eff ? NickFX.canvasColor(eff, t, o.color) : o.color; ctx.fillText(ch, x, cy + (o.dy || 0));
          x += ctx.measureText(ch).width;
        });
        ctx.textAlign = 'center';
      },
    };
    try { if (st.paint) st.paint(e); else generic(e, st.generic); } catch (err) { ctx.fillStyle = '#333'; ctx.fillText(text, cx, cy); }
    ctx.restore();
    return { w, h };
  }

  // DOM(채팅 · 프로필 · 친구 목록)용 그림. 꾸밈이 글자 밖으로 나가니 넉넉히 그린 뒤 빈 곳을 잘라요.
  // ax, ay = 그림 안에서 글자 가운데(cx, cy) 자리 → 방 이름표에서 움직이는 그림을 같은 자리에 그릴 때 써요
  const cache = new Map();
  function image(id, text, base = 13, profile = null) {
    const st = STYLE[id];
    if (!st) return null;
    const key = `${id}|${text}|${base}|${profile?.nameEffect || ''}|${ready.has(st.font) ? 1 : 0}`;
    if (cache.has(key)) return cache.get(key);
    const k = 2, px = Math.round(base * st.size);
    const c = document.createElement('canvas');
    let g = c.getContext('2d');
    g.font = fontOf(st, px);
    const w = g.measureText(text).width;
    const W = Math.ceil(w + px * 5), H = Math.ceil(px * 4);
    c.width = W * k; c.height = H * k;
    g = c.getContext('2d', { willReadFrequently: true });
    g.scale(k, k);
    draw(g, id, text, W / 2, H / 2, base, 0.6, profile);
    // 빈 곳 자르기
    const data = g.getImageData(0, 0, c.width, c.height).data;
    let x1 = c.width, y1 = c.height, x2 = 0, y2 = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (data[(y * c.width + x) * 4 + 3] > 8) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
    if (x2 < x1) { x1 = 0; y1 = 0; x2 = c.width - 1; y2 = c.height - 1; }
    x1 = Math.max(0, x1 - 2); y1 = Math.max(0, y1 - 2); x2 = Math.min(c.width - 1, x2 + 2); y2 = Math.min(c.height - 1, y2 + 2);
    const out = document.createElement('canvas'); out.width = x2 - x1 + 1; out.height = y2 - y1 + 1;
    out.getContext('2d').drawImage(c, -x1, -y1);
    const res = { url: out.toDataURL('image/png'), canvas: out, w: out.width / k, h: out.height / k, ax: (W * k / 2 - x1) / k, ay: (H * k / 2 - y1) / k };
    if (ready.has(st.font)) cache.set(key, res);
    return res;
  }
  // 닉네임 칸에 넣을 요소: 칭호 이모지 + 꾸민 닉네임 그림
  function element(id, text, base = 13, profile = null, icon = '') {
    const span = document.createElement('span');
    span.className = 'title-name';
    if (icon) { const e = document.createElement('span'); e.className = 'title-icon'; e.textContent = icon; span.append(e); }
    const im = image(id, text, base, profile);
    if (!im) { span.append(document.createTextNode(text)); return span; }
    const img = document.createElement('img');
    img.src = im.url; img.alt = text; img.style.width = im.w + 'px'; img.style.height = im.h + 'px';
    span.append(img);
    if (!load(id)) document.fonts?.load(`16px "${STYLE[id].font}"`).then(() => { const n = image(id, text, base, profile); if (n) { img.src = n.url; img.style.width = n.w + 'px'; img.style.height = n.h + 'px'; } }).catch(() => {});
    return span;
  }
  return { STYLE, FONTS: F, draw, image, element, load, has: (id) => !!STYLE[id] };
})();
