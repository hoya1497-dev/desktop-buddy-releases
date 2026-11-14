// 🏅 칭호 (0.17.2): 열리는 조건 · 사기 · 달기 · 운영자 닉네임 효과 켜고 끄기 · 액세서리 정리(돌려주기)
const C = require('./catalog');
const T = C.titles;
const DAY = 86_400_000;

// 예전 데이터 정리 (한 번만): 액세서리 → 산 값 돌려주기 · 운영자 액세서리는 🎖️ 명예 버디
function migrate(u, now) {
  if (!u.titles || typeof u.titles !== 'object') u.titles = {};
  const t = u.titles;
  if (!t.owned || typeof t.owned !== 'object') t.owned = {};
  if (!t.seen || typeof t.seen !== 'object') t.seen = {};   // 이벤트 중 접속한 적 있음
  if (t.eq && !T[t.eq]) t.eq = null;
  if (typeof u.nameEffectOn !== 'boolean') u.nameEffectOn = true;
  if (!u.accDone) {
    const owned = Object.keys((u.acc && u.acc.owned) || {}).filter((id) => u.acc.owned[id] && C.accessories[id]);
    let coins = 0, secret = 0;
    for (const id of owned) {
      const a = C.accessories[id];
      if (a.secret) secret++;
      else if (a.price) coins += a.price;
    }
    if (coins) u.coins += coins;
    if (secret) t.owned.honor = true;
    if (owned.length) u.accNote = { coins, honor: !!secret, n: owned.length, at: now };
    u.acc = { owned: {}, eq: {} };
    u.accDone = true;
  }
}

const daysOf = (u, now) => Math.max(0, Math.floor((now - (u.created || now)) / DAY));
// 조건 진행: { have, need, ok, text }
function progress(u, id, ctx) {
  const d = T[id], n = d.need || {};
  if (d.secret) {
    const ok = id === 'op' ? !!u.noticeWriter || !!u.titles.owned.op : !!u.titles.owned[id];
    return { ok, have: ok ? 1 : 0, need: 1, text: '운영자만 줄 수 있어요' };
  }
  if ('days' in n) { const have = daysOf(u, ctx.now); return { ok: have >= n.days, have, need: n.days, text: n.days ? `가입 ${n.days}일` : '처음 시작하면 바로' }; }
  if (n.attend) { const have = u.attend?.count || 0; return { ok: have >= n.attend, have, need: n.attend, text: `출석 ${n.attend}번` }; }
  if (n.legend) { const have = Object.keys(u.dex || {}).filter((c) => C.fish[c]?.rar === 'L').length; return { ok: have >= n.legend, have, need: n.legend, text: '전설 물고기 낚기' }; }
  if (n.dexAll) { const all = Object.keys(C.fish).filter((c) => C.fish[c].cat !== 'T'); const have = all.filter((c) => u.dex?.[c]).length; return { ok: have >= all.length, have, need: all.length, text: '물고기 도감 다 채우기' }; }
  if (n.pets) { const have = (u.pets || []).length; return { ok: have >= n.pets, have, need: n.pets, text: `펫 ${n.pets}마리` }; }
  if (n.furniture) { let have = 0; for (const [k, v] of Object.entries(u.owned || {})) if (C.items[k] && C.items[k].free !== true) have += v || 0; return { ok: have >= n.furniture, have, need: n.furniture, text: `가구 ${n.furniture}개 가지기` }; }
  if (n.event) { const ok = !!u.titles.seen[n.event]; return { ok, have: ok ? 1 : 0, need: 1, text: `${C.events[n.event]?.name || ''} 이벤트 중 접속` }; }
  return { ok: false, have: 0, need: 1, text: '' };
}
// 켜진 이벤트에 지금 접속해 있으면 그 이벤트 칭호가 열림
function markEvents(u, events) { for (const k of Object.keys(C.events)) if (events[k]) u.titles.seen[k] = true; }

// 지금 단 칭호 (가진 것만, op 는 공지 권한도 인정)
function equipped(u) {
  const id = u.titles && u.titles.eq;
  if (!id || !T[id]) return null;
  if (!owns(u, id)) return null;
  return id;
}
const owns = (u, id) => !!u.titles.owned[id] || (id === 'op' && !!u.noticeWriter);

// 앱에 보내는 내 칭호 상태
function view(u, ctx) {
  const list = {};
  for (const id of Object.keys(T)) {
    const p = progress(u, id, ctx);
    if (T[id].secret && !owns(u, id)) continue;   // 운영자 전용은 가진 사람에게만
    list[id] = { ...p, owned: owns(u, id) };
  }
  return { eq: equipped(u), list };
}

function create(ctx) {
  const { send, now, store, pushMe, events, broadcastProfile } = ctx;
  const err = (ws, message) => send(ws, { type: 'error', message });
  function handle(ws, m) {
    const u = ws.user;
    switch (m.type) {
      case 'title-buy': {
        const id = String(m.id || ''), d = T[id];
        if (!d || d.secret || d.price == null) return err(ws, '살 수 없는 칭호예요.'), true;
        if (owns(u, id)) return err(ws, '이미 가지고 있어요.'), true;
        markEvents(u, events());
        if (!progress(u, id, { now: now() }).ok) return err(ws, `아직 열리지 않았어요. (${progress(u, id, { now: now() }).text})`), true;
        if (d.event && !events()[d.event]) return err(ws, '이벤트 칭호는 그 이벤트가 열려 있을 때만 살 수 있어요.'), true;
        if (d.event) {
          const coin = C.events[d.event].coin;
          if ((u.eventCoins[d.event] || 0) < d.price) return err(ws, `${coin.icon} ${coin.name}이 부족해요.`), true;
          u.eventCoins[d.event] -= d.price;
        } else {
          if (u.coins < d.price) return err(ws, '코인이 부족해요.'), true;
          u.coins -= d.price;
        }
        u.titles.owned[id] = true;
        if (!u.titles.eq) u.titles.eq = id;   // 처음 산 칭호는 바로 달아 줌
        store.save();
        pushMe(ws, { amount: -d.price, reason: 'title-buy', id, event: d.event || null });
        broadcastProfile(ws);
        return true;
      }
      case 'title-equip': {   // id: 달기, null: 떼기 (한 번에 하나)
        if (m.id == null) u.titles.eq = null;
        else { const id = String(m.id); if (!T[id] || !owns(u, id)) return err(ws, '가지고 있는 칭호만 달 수 있어요.'), true; u.titles.eq = id; }
        store.save(); pushMe(ws); broadcastProfile(ws);
        return true;
      }
      case 'name-effect-toggle': {   // 운영자가 준 닉네임 효과 켜고 끄기
        if (!u.nameEffect) return err(ws, '닉네임 효과가 없어요.'), true;
        if (u.nameEffect === 'rainbow') return err(ws, '🌈 무지개 효과는 끌 수 없어요.'), true;   // 가장 높은 효과
        u.nameEffectOn = !!m.on;
        store.save(); pushMe(ws); broadcastProfile(ws);
        return true;
      }
    }
    return false;
  }
  return { handle };
}

module.exports = { migrate, progress, markEvents, equipped, owns, view, create };
