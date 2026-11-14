// 0.17: 💾 캐릭터 · 집 저장 슬롯, 🪪 프로필
// server.js 의 handle() 에서 먼저 불러요. 처리했으면 true.
const C = require('./catalog');
const Tit = require('./titles');

const PROFILE_AVATAR_MAX = 60 * 1024;    // 프로필 사진 (앱이 256px 로 줄여서 보냄)
const PROFILE_BG_MAX = 160 * 1024;       // 배경 사진 (앱이 900×360 으로 줄여서 보냄)
const PROFILE_THEMES = ['cream', 'sky', 'mint', 'pink', 'lavender', 'night', 'sunset', 'forest', 'custom'];   // custom: 0.17 사용자 지정 색
const HEX = /^#[0-9a-f]{6}$/i;
const CUSTOM_DEFAULT = { bg1: '#ffe9c7', bg2: '#ffb38a', accent: '#e8894a', card: '#fffaf3' };
const POSES = ['stand', 'sit', 'walk', 'lie', 'fall'];
const SLOT_THUMB_MAX = 48 * 1024;   // 0.17.2 슬롯 대표 이미지 (캐릭터 160×160, 인테리어 240×180)

function migrate(u) {
  if (!u.slots || typeof u.slots !== 'object') u.slots = {};
  const s = u.slots;
  const L = C.limits;
  if (!Array.isArray(s.chars)) s.chars = [];
  if (!Array.isArray(s.homes)) s.homes = [];
  s.charN = Math.max(L.charSlots.free, Math.min(L.charSlots.max, Number(s.charN) || 0));
  s.homeN = Math.max(L.homeSlots.free, Math.min(L.homeSlots.max, Number(s.homeN) || 0));
  if (!u.profile || typeof u.profile !== 'object') u.profile = {};
  const p = u.profile;
  if (typeof p.bio !== 'string') p.bio = '';
  if (!PROFILE_THEMES.includes(p.theme)) p.theme = 'cream';
  if (typeof p.showFish !== 'boolean') p.showFish = true;
  if (typeof p.showPets !== 'boolean') p.showPets = true;
  if (!p.custom || typeof p.custom !== 'object') p.custom = { ...CUSTOM_DEFAULT };
}

// 다음 슬롯 값 (null 이면 더 못 늘림)
function nextPrice(kind, n) {
  const L = kind === 'char' ? C.limits.charSlots : C.limits.homeSlots;
  if (n >= L.max) return null;
  return (n - L.free + 1) * L.step;
}

function imgOk(data, max) {
  if (typeof data !== 'string' || data.length > max * 1.37 + 40) return false;
  const mm = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!mm) return false;
  const head = Buffer.from(mm[2].slice(0, 24), 'base64');
  return (mm[1] === 'jpeg' && head[0] === 0xff && head[1] === 0xd8)
    || (mm[1] === 'png' && head.slice(0, 4).toString('hex') === '89504e47')
    || (mm[1] === 'webp' && head.slice(0, 4).toString() === 'RIFF' && head.slice(8, 12).toString() === 'WEBP');
}

function create(ctx) {
  const { send, clean, now, store, pushMe, placeItems, skinChanged, byName, rooms, perSocket, db, levelOf, catalogItems } = ctx;
  const err = (ws, message) => send(ws, { type: 'error', message });

  // 슬롯 목록 (캐릭터는 서 있는 그림만 미리보기로)
  function slotsView(u) {
    const s = u.slots;
    return {
      type: 'slots', coins: u.coins,
      charN: s.charN, homeN: s.homeN,
      charNext: nextPrice('char', s.charN), homeNext: nextPrice('home', s.homeN),
      charMax: C.limits.charSlots.max, homeMax: C.limits.homeSlots.max,
      chars: Array.from({ length: s.charN }, (_, i) => {
        const c = s.chars[i];
        // 대표 이미지: 직접 고른 사진(thumb) > 고른 포즈(thumbPose) > 서 있는 그림
        return c ? { name: c.name, at: c.at, basic: !!c.basic, faces: c.faces, stand: c.stand || null,
          thumb: c.thumb || (c.thumbPose && c[c.thumbPose]) || null, thumbPose: c.thumb ? null : (c.thumbPose || 'stand'), custom: !!c.thumb,
          poses: POSES.filter((p) => c[p]) } : null;
      }),
      homes: Array.from({ length: s.homeN }, (_, i) => {
        const h = s.homes[i];
        return h ? { name: h.name, at: h.at, count: h.items.length, wall1: h.wall1, wall2: h.wall2, thumb: h.thumb || h.shot || null, custom: !!h.thumb } : null;
      }),
    };
  }
  const pushSlots = (ws) => send(ws, slotsView(ws.user));
  const idx = (u, kind, i) => {
    const n = kind === 'char' ? u.slots.charN : u.slots.homeN;
    i = Math.floor(Number(i));
    return Number.isInteger(i) && i >= 0 && i < n ? i : -1;
  };

  // 🪪 프로필: 보는 사람에게 보여 줄 내용
  function profileView(f, viewer) {
    const p = f.profile;
    const self = viewer.id === f.id;
    const out = {
      type: 'profile-card', self,
      username: f.username, nickname: f.nickname, color: f.color, nameColor: f.nameColor, nameEffect: f.nameEffect && (f.nameEffect === 'rainbow' || f.nameEffectOn !== false) ? f.nameEffect : null,
      title: Tit.equipped(f), titleIcon: Tit.equipped(f) ? C.titles[Tit.equipped(f)].icon : null,   // 🏅 0.17.2
      level: levelOf(f), joined: f.created || null,
      bio: p.bio, theme: p.theme, custom: p.custom, avatar: p.avatar || null, bg: p.bg || null,
      species: f.species, skin: f.skin?.v ? { v: f.skin.v } : null,
      showFish: p.showFish, showPets: p.showPets,
      friend: f.friends.includes(viewer.id),
    };
    if (p.showFish || self) {
      out.fish = Object.keys(f.dex || {}).filter((code) => C.fish[code]);
    }
    if (p.showPets || self) {
      const kinds = new Set();
      for (const pet of f.pets || []) if ((pet.out || !pet.private) && C.pets[pet.kind]) kinds.add(pet.kind);   // 0.17.8 숨긴 펫도 꺼내 두면 보임
      out.pets = [...kinds];
    }
    return out;
  }
  // 같은 방에 있거나, 친구이거나, 나 자신일 때만 볼 수 있어요 (아이디로 아무나 찾아보는 건 막음)
  function canSee(ws, f) {
    const u = ws.user;
    if (f.id === u.id) return true;
    if (f.blocked.includes(u.id) || u.blocked.includes(f.id)) return false;
    if (u.friends.includes(f.id)) return true;
    const room = ws.room && rooms.get(ws.room);
    if (room) for (const c of room.values()) if (c.user && c.user.id === f.id) return true;
    return false;
  }

  function handle(ws, m) {
    const u = ws.user;
    switch (m.type) {
      case 'slots-get': pushSlots(ws); return true;

      case 'slot-buy': {
        const kind = m.kind === 'home' ? 'home' : 'char';
        const key = kind === 'char' ? 'charN' : 'homeN';
        const price = nextPrice(kind, u.slots[key]);
        if (price == null) return err(ws, '슬롯을 더 늘릴 수 없어요.'), true;
        if (u.coins < price) return err(ws, '코인이 부족해요.'), true;
        u.coins -= price;
        u.slots[key]++;
        store.save();
        pushMe(ws, { amount: -price, reason: 'slot' });
        pushSlots(ws);
        return true;
      }

      case 'slot-save': {
        const kind = m.kind === 'home' ? 'home' : 'char';
        const i = idx(u, kind, m.i);
        if (i < 0) return true;
        if (!perSocket(ws, 'slot-save', 20, 60_000)) return err(ws, '잠시 후 다시 해 주세요.'), true;
        const name = clean(m.name, 16) || `${kind === 'char' ? '캐릭터' : '인테리어'} ${i + 1}`;
        if (kind === 'char') {
          // 그림만 저장 (닉네임 색 · 효과는 저장하지 않아요)
          if (!u.skin.v) u.slots.chars[i] = { name, at: now(), basic: true };
          else {
            const prev = u.slots.chars[i];
            const c = { name, at: now(), faces: u.skin.faces, ...(prev?.thumb ? { thumb: prev.thumb } : {}), ...(prev?.thumbPose ? { thumbPose: prev.thumbPose } : {}) };
            for (const pose of POSES) if (u.skin[pose]) c[pose] = u.skin[pose];
            u.slots.chars[i] = c;
          }
        } else {
          const prev = u.slots.homes[i];
          u.slots.homes[i] = {
            name, at: now(), wall1: u.home.wall1, wall2: u.home.wall2,
            items: u.home.items.map((it) => ({ ...it })),
            // 📸 저장할 때 앱이 찍은 방 사진 (없으면 예전 것). 직접 고른 대표 이미지는 덮어써도 그대로
            ...(imgOk(m.shot, SLOT_THUMB_MAX) ? { shot: m.shot } : prev?.shot ? { shot: prev.shot } : {}),
            ...(prev?.thumb ? { thumb: prev.thumb } : {}),
          };
        }
        store.save();
        pushSlots(ws);
        send(ws, { type: 'slot-done', kind, what: 'save', i, name });
        return true;
      }

      case 'slot-rename': {
        const kind = m.kind === 'home' ? 'home' : 'char';
        const i = idx(u, kind, m.i);
        const list = kind === 'char' ? u.slots.chars : u.slots.homes;
        if (i < 0 || !list[i]) return true;
        list[i].name = clean(m.name, 16) || list[i].name;
        store.save();
        pushSlots(ws);
        return true;
      }

      case 'slot-thumb': {   // 🖼️ 대표 이미지: img(사진) · pose(캐릭터 포즈) · reset(기본으로)
        const kind = m.kind === 'home' ? 'home' : 'char';
        const i = idx(u, kind, m.i);
        const sl = i >= 0 && (kind === 'char' ? u.slots.chars : u.slots.homes)[i];
        if (!sl) return true;
        if (!perSocket(ws, 'slot-thumb', 20, 60_000)) return err(ws, '잠시 후 다시 해 주세요.'), true;
        if (m.reset) { delete sl.thumb; delete sl.thumbPose; }
        else if (kind === 'char' && POSES.includes(m.pose) && sl[m.pose]) { delete sl.thumb; sl.thumbPose = m.pose; }
        else if (imgOk(m.img, SLOT_THUMB_MAX)) sl.thumb = m.img;
        else return err(ws, '대표 이미지가 너무 크거나 그림 파일이 아니에요.'), true;
        store.save();
        pushSlots(ws);
        return true;
      }

      case 'slot-detail': {   // 🔽 펼쳐보기: 캐릭터 슬롯에 저장한 그림 전부
        const i = idx(u, 'char', m.i);
        const c = i >= 0 && u.slots.chars[i];
        if (!c) return true;
        const out = { type: 'slot-detail', kind: 'char', i, faces: c.faces, basic: !!c.basic, poses: {} };
        for (const p of POSES) if (c[p]) out.poses[p] = c[p];
        send(ws, out);
        return true;
      }

      case 'slot-del': {
        const kind = m.kind === 'home' ? 'home' : 'char';
        const i = idx(u, kind, m.i);
        if (i < 0) return true;
        (kind === 'char' ? u.slots.chars : u.slots.homes)[i] = null;
        store.save();
        pushSlots(ws);
        return true;
      }

      case 'slot-load': {
        const kind = m.kind === 'home' ? 'home' : 'char';
        const i = idx(u, kind, m.i);
        if (i < 0) return true;
        if (!perSocket(ws, 'slot-load', 12, 60_000)) return err(ws, '잠시 후 다시 해 주세요.'), true;
        if (kind === 'char') {
          const c = u.slots.chars[i];
          if (!c) return err(ws, '빈 슬롯이에요.'), true;
          const v = Math.max(u.skin.v || 0, u.skin.last || 0) + 1;
          if (c.basic) u.skin = { v: 0, faces: 'right', last: v };
          else {
            u.skin = { v, faces: c.faces === 'left' ? 'left' : 'right' };
            for (const pose of POSES) if (c[pose]) u.skin[pose] = c[pose];
          }
          skinChanged(ws);
          send(ws, { type: 'slot-done', kind, what: 'load', i, name: c.name });
          return true;
        }
        const h = u.slots.homes[i];
        if (!h) return err(ws, '빈 슬롯이에요.'), true;
        // 판 가구 · 지금 가진 것보다 많은 가구는 placeItems 가 알아서 빼요
        const before = h.items.filter((it) => catalogItems[it.item] && !catalogItems[it.item].required).length;
        if (!placeItems(ws, h.items)) return true;
        for (const [k, w] of [['wall1', h.wall1], ['wall2', h.wall2]]) if (C.walls[w] && (w === 'basic' || u.owned[w])) u.home[k] = w;
        const after = u.home.items.filter((it) => !catalogItems[it.item]?.required).length;
        store.save();
        ctx.afterHomeChange(ws);
        send(ws, { type: 'slot-done', kind, what: 'load', i, name: h.name, skipped: Math.max(0, before - after) });
        return true;
      }

      // ---------------- 🪪 프로필
      case 'profile-set': {
        if (!perSocket(ws, 'profile-set', 20, 60_000)) return err(ws, '잠시 후 다시 해 주세요.'), true;
        const p = u.profile;
        if ('bio' in m) p.bio = clean(String(m.bio || '').replace(/\s+/g, ' '), C.limits.bioMax);
        if ('theme' in m && PROFILE_THEMES.includes(m.theme)) p.theme = m.theme;
        if (m.custom && typeof m.custom === 'object') {   // 🎨 사용자 지정 테마 색 (#rrggbb 만)
          const c = {};
          for (const k of Object.keys(CUSTOM_DEFAULT)) c[k] = HEX.test(String(m.custom[k])) ? String(m.custom[k]).toLowerCase() : p.custom[k] || CUSTOM_DEFAULT[k];
          p.custom = c;
        }
        if ('showFish' in m) p.showFish = !!m.showFish;
        if ('showPets' in m) p.showPets = !!m.showPets;
        if ('avatar' in m) {
          if (m.avatar === null) delete p.avatar;
          else if (imgOk(m.avatar, PROFILE_AVATAR_MAX)) p.avatar = m.avatar;
          else return err(ws, '프로필 사진이 너무 크거나 그림 파일이 아니에요.'), true;
        }
        if ('bg' in m) {
          if (m.bg === null) delete p.bg;
          else if (imgOk(m.bg, PROFILE_BG_MAX)) p.bg = m.bg;
          else return err(ws, '배경 사진이 너무 크거나 그림 파일이 아니에요.'), true;
        }
        store.save();
        send(ws, profileView(u, u));
        send(ws, { type: 'profile-saved' });
        return true;
      }

      case 'profile-get': {
        if (!perSocket(ws, 'profile-get', 40, 60_000)) return true;
        let f = null;
        if (m.self) f = u;
        else if (m.peer && ws.room) { const c = rooms.get(ws.room)?.get(String(m.peer)); f = c?.user || null; }
        if (!f && m.username) f = byName(m.username);
        if (!f || !canSee(ws, f)) return err(ws, '지금은 이 사람의 프로필을 볼 수 없어요. (같은 방에 있거나 친구일 때만 볼 수 있어요)'), true;
        send(ws, profileView(f, u));
        return true;
      }
    }
    return false;
  }
  return { handle, slotsView };
}

module.exports = { create, migrate, PROFILE_THEMES };
