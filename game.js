// 게임 기능: 상점(음식·펫·액세서리) · 출석 · 낚시 · 도감 · 어항 · 아쿠아리움 · 물고기 선물/교환 · 펫
const crypto = require('crypto');
const C = require('./catalog');

const now = () => Date.now();
const kstDay = () => new Date(now() + 9 * 3600_000).toISOString().slice(0, 10);
const rid = (p) => p + crypto.randomBytes(5).toString('hex');
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n);
const FISH = C.fish;
const FISH_CODES = Object.keys(FISH);

// ---------------------------------------------------------------- 데이터 준비
function migrate(u) {
  u.food ||= {};
  u.acc ||= { owned: {}, eq: {} };
  u.attend ||= { count: 0, last: '' };
  u.fishInv ||= {};
  u.dex ||= {};
  u.tanks ||= {};
  u.tankFed ||= {};
  u.aquarium ||= [];
  u.pets ||= [];
  u.tradesIn ||= [];
  u.tradesOut ||= [];
  u.daily ||= {};
  u.rods ||= { rod1: true };      // 가진 낚싯대
  if (!u.rods[u.rod]) u.rod = 'rod1';   // 쓰는 낚싯대
  // 🎉 이벤트 전용 코인: 이벤트마다 따로 { halloween: 🎃, christmas: 🎄, newyear: 🧧 }
  if (!u.eventCoins || typeof u.eventCoins !== 'object') u.eventCoins = { halloween: Number(u.eventCoins) || 0 };
  // 예전 '어항'(aquarium) 가구 → 중간 어항
  if (u.owned.aquarium) { u.owned.tankM = (u.owned.tankM || 0) + u.owned.aquarium; delete u.owned.aquarium; }
  for (const it of u.home.items) if (it.item === 'aquarium') it.item = 'tankM';
  ensureTankUids(u.home.items);
}

// 하루 단위 횟수 (한국 시간 자정에 초기화)
function daily(u, key) {
  const d = kstDay();
  if (!u.daily[key] || u.daily[key].day !== d) u.daily[key] = { day: d, n: 0 };
  return u.daily[key];
}

const PET_MAX_LV = 5;          // 펫 레벨은 1~5
const PAT_EXP = 4, PAT_EVERY = 30_000;   // 30초에 한 번 쓰다듬으면 경험치 조금
// 경험치를 더하고 레벨업 (5레벨이면 멈춤). 올랐으면 새 레벨을 돌려줌
function petGain(pet, exp) {
  if (pet.level >= PET_MAX_LV) { pet.level = PET_MAX_LV; pet.exp = 0; return 0; }
  pet.exp += exp;
  let up = 0;
  while (pet.level < PET_MAX_LV && pet.exp >= petNeed(pet.level)) { pet.exp -= petNeed(pet.level); pet.level++; up = pet.level; }
  if (pet.level >= PET_MAX_LV) { pet.exp = 0; ensureTrait(pet); }
  return up;
}
// 0.17.3 🐾 펫 성격: 5레벨이 되는 순간 확률로 딱 한 번 정해지고 그 뒤로 안 바뀜 (레벨을 내려도 그대로, 5레벨 전엔 안 보여 줌)
function pickTrait(rnd = Math.random) {
  const list = Object.entries(C.petTraits);
  let r = rnd() * list.reduce((n, [, t]) => n + t.weight, 0);
  for (const [id, t] of list) if ((r -= t.weight) < 0) return id;
  return list[0][0];
}
function ensureTrait(pet) {
  if (pet.level >= PET_MAX_LV && !C.petTraits[pet.trait]) pet.trait = pickTrait();
  return pet.trait;
}
// 다른 사람에게 보내는 펫 정보 (성격은 5레벨부터)
function petPublic(p, extra = {}) {
  ensureTrait(p);
  return { id: p.id, kind: p.kind, name: p.name, ...extra, level: p.level, hungry: p.full < 30,
    ...(p.level >= PET_MAX_LV && p.trait ? { trait: p.trait } : {}), ...(p.ending ? { ending: p.ending } : {}) };
}
function tickPets(u) {
  const t = now();
  for (const p of u.pets) {
    if (p.level > PET_MAX_LV) { p.level = PET_MAX_LV; p.exp = 0; }
    ensureTrait(p);   // 예전부터 5레벨이던 펫 · 관리자 petlevel 로 5가 된 펫도 여기서 성격이 정해짐
    const h = (t - (p.updated || t)) / 3600_000;
    if (h > 0) {
      p.full = Math.max(0, p.full - 3 * h);
      if (p.full < 20) p.love = Math.max(0, p.love - 1 * h);
      p.updated = t;
    }
  }
}
const petNeed = (lv) => 30 + lv * 20;

function view(u) {
  tickPets(u);
  const casts = daily(u, 'casts');
  return {
    food: u.food,
    acc: u.acc,
    attend: { count: u.attend.count, today: u.attend.last === kstDay(), next: (u.attend.count % 7) + 1 },
    fishInv: u.fishInv,
    dex: u.dex,
    aquarium: u.aquarium,
    tanks: u.tanks,
    tankFed: u.tankFed,
    pets: u.pets.map((p) => { const { trait, ...o } = p; return { ...o, ...(p.level >= PET_MAX_LV && trait ? { trait } : {}), full: Math.round(p.full), love: Math.round(p.love), next: petNeed(p.level) }; }),   // 성격은 5레벨 전엔 비밀
    rods: u.rods, rod: u.rod,
    castsLeft: C.limits.castsPerDay ? Math.max(0, C.limits.castsPerDay - casts.n) : 9999,   // 9999 = 제한 없음
    fishGiftLeft: Math.max(0, C.limits.fishGiftPerDay - daily(u, 'fishGift').n),
    tradesLeft: Math.max(0, C.limits.tradesPerDay - daily(u, 'trades').n),
    onlineLeft: Math.max(0, C.limits.onlinePerDay - daily(u, 'online').n),
  };
}

// 다른 사람에게 보여 줄 집 (꺼내 둔 펫, 어항 속 물고기 포함)
function homeView(u) {
  tickPets(u);
  return {
    ...u.home,
    pets: u.pets.filter((p) => p.out).map((p) => petPublic(p, { floor: p.floor })),   // 0.17.8 꺼내 둔 펫은 늘 보임 (🙈 숨기기는 쉬는 펫에만)
    tanks: u.tanks,
    tankFed: u.tankFed,
  };
}

function ensureTankUids(items) {
  const seen = new Set();
  for (const it of items) {
    if (!C.items[it.item] || !C.items[it.item].tank) { delete it.uid; continue; }
    if (typeof it.uid !== 'string' || !/^t[0-9a-f]{10}$/.test(it.uid) || seen.has(it.uid)) it.uid = rid('t');
    seen.add(it.uid);
  }
}
// 가구 배치가 바뀐 뒤: 치운 어항 속 물고기는 가방으로
function onPlace(u) {
  ensureTankUids(u.home.items);
  const alive = new Set(u.home.items.filter((it) => it.uid).map((it) => it.uid));
  for (const uid of Object.keys(u.tanks)) {
    if (alive.has(uid)) continue;
    for (const code of u.tanks[uid]) u.fishInv[code] = (u.fishInv[code] || 0) + 1;
    delete u.tanks[uid];
    delete u.tankFed[uid];
  }
}

function addFish(u, code, n = 1, size = null) {
  u.fishInv[code] = (u.fishInv[code] || 0) + n;
  const d = (u.dex[code] ||= { n: 0, best: 0, first: now() });
  d.n += n;
  if (size && size > d.best) d.best = size;
}
function takeFish(u, code, n = 1) {
  if ((u.fishInv[code] || 0) < n) return false;
  u.fishInv[code] -= n;
  if (u.fishInv[code] <= 0) delete u.fishInv[code];
  return true;
}

// 도감에 적힌 확률(%) 그대로 뽑기
// 낚싯대 운에 따라 뽑기 (null = 꽝)
function roll(rodId) {
  const rod = C.rods[rodId] || C.rods.rod1;
  const total = C.nothingWeight * rod.luck.N + FISH_CODES.reduce((s, c) => s + C.rodWeight(rod, FISH[c]), 0);
  let r = Math.random() * total;
  if ((r -= C.nothingWeight * rod.luck.N) < 0) return null;
  for (const code of FISH_CODES) { if ((r -= C.rodWeight(rod, FISH[code])) < 0) return FISH[code]; }
  return FISH['01'];
}
function rollSize(f) {
  if (!f.size) return null;
  const [a, b] = f.size;
  return Math.round(a + (b - a) * Math.pow(Math.random(), 1.6)); // 작은 쪽이 더 자주
}

// ---------------------------------------------------------------- 메시지 처리
// ctx: { ws, u, send, pushMe, save, byName, sessions, isFriend, blockedEither, roomOf, broadcastHome, roomBroadcast }
function handle(ctx, m) {
  const { ws, u, send, pushMe, save } = ctx;
  const err = (message) => send(ws, { type: 'error', message });

  // 당기기: 너무 일찍(입질 전)이면 도망, 꽝이면 꽝, 걸려 있으면 잡힘
  function reel() {
    const f = ws.fish;
    ws.fish = null;
    // 0.17.2: 찌가 없으면(서버가 다시 켜졌거나 연결이 끊겼다 붙음) 아무 대답도 안 해서 앱이 '감는 중…'에 멈췄음 → 알려 줌
    if (!f) { send(ws, { type: 'fish-result', kind: 'lost' }); ctx.fishPeer({ state: 'idle' }); return; }
    clearTimeout(f.timer);
    const t = now();
    const miss = (kind) => { send(ws, { type: 'fish-result', kind }); ctx.fishPeer({ state: 'result', kind }); };
    if (!f.got) return miss('nothing');
    if (t < f.biteAt - 250) return miss('early');
    const got = f.got;
    const size = rollSize(got);
    const isNew = !u.dex[got.code];
    const prevBest = u.dex[got.code]?.best || 0;
    addFish(u, got.code, 1, size);
    save();
    send(ws, { type: 'fish-result', kind: 'catch', code: got.code, size, isNew, record: !!size && size > prevBest && !isNew });
    ctx.fishPeer({ state: 'result', kind: 'catch', code: got.code, size });
    pushMe(ws);
    if (got.rar === 'E' || got.rar === 'L' || got.rar === 'X') ctx.roomBroadcast({ type: 'brag', nickname: u.nickname, username: u.username, code: got.code, size });
  }
  switch (m.type) {
    // ------------------------------------------------ 상점
    case 'buy': {
      const id = String(m.item || '');
      const n = Math.max(1, Math.min(20, Math.floor(Number(m.n) || 1)));
      // 🎉 이벤트 전용 아이템(벽지·가구·펫)은 해당 이벤트가 켜져 있을 때만, 이벤트 코인으로만 살 수 있음
      const eventBlocked = (def) => def.event && !ctx.events()[def.event];
      let price, apply, event;
      if (C.items[id]) {
        const def = C.items[id];
        if (def.free === true) return;
        if (eventBlocked(def)) return err('지금은 열려 있지 않은 이벤트 아이템이에요.');
        if (def.max && (u.owned[id] || 0) >= def.max) return err(`${def.name}은(는) ${def.max}개만 가질 수 있어요.`);   // 레코드 · 미러볼은 하나만
        price = def.price; event = def.event; apply = () => { u.owned[id] = (u.owned[id] || 0) + 1; };
      } else if (C.walls[id]) {
        const def = C.walls[id];
        if (id === 'basic' || u.owned[id]) return err('이미 가지고 있어요.');
        if (eventBlocked(def)) return err('지금은 열려 있지 않은 이벤트 아이템이에요.');
        price = def.price; event = def.event; apply = () => { u.owned[id] = 1; };
      } else if (C.foods[id] || C.petFoods[id]) {
        price = (C.foods[id] || C.petFoods[id]).price * n; apply = () => { u.food[id] = (u.food[id] || 0) + n; };
      } else if (C.pets[id]) {
        const def = C.pets[id];
        if (def.limited) return err('한정 펫이라 상점에서 살 수 없어요.');   // 0.17.5 🍫
        if (def.secret || def.price == null) return err('운영자 전용 펫이라 살 수 없어요. 특별한 보상으로만 받을 수 있어요!');
        if (eventBlocked(def)) return err('지금은 열려 있지 않은 이벤트 아이템이에요.');
        if (u.pets.length >= C.limits.petsMax) return err(`펫은 ${C.limits.petsMax}마리까지 키울 수 있어요.`);
        price = def.price; event = def.event;
        apply = () => u.pets.push({ id: rid('p'), kind: id, name: def.name, out: false, floor: 1, full: 70, love: 10, level: 1, exp: 0, updated: now() });
      } else if (C.rods[id]) {
        if (C.rods[id].secret || C.rods[id].price == null) return err('운영자 전용 낚싯대라 살 수 없어요. 특별한 보상으로만 받을 수 있어요!');
        if (u.rods[id]) return err('이미 가지고 있는 낚싯대예요.');
        price = C.rods[id].price; apply = () => { u.rods[id] = true; u.rod = id; };   // 사면 바로 장착
      } else if (C.accessories[id]) {
        return err('액세서리는 칭호로 바뀌었어요. 상점 → 🏅 칭호를 확인해 보세요.');   // 0.17.2
        const a = C.accessories[id];
        if (a.secret) return err('운영자 전용 액세서리라 살 수 없어요. 특별한 보상으로만 받을 수 있어요!');
        if (a.price == null) return err('출석 7일째에만 받을 수 있는 액세서리예요.');
        if (u.acc.owned[id]) return err('이미 가지고 있어요.');
        price = a.price; apply = () => { u.acc.owned[id] = true; };
      } else return;
      if (event) {
        const coin = C.events[event].coin;
        if ((u.eventCoins[event] || 0) < price) return err(`${coin.icon} ${coin.name}이 부족해요.`);
        u.eventCoins[event] -= price;
      } else {
        if (u.coins < price) return err('코인이 부족해요.');
        u.coins -= price;
      }
      apply();
      save();
      pushMe(ws, { amount: -price, reason: 'buy', item: id, event: event || null });
      if (C.pets[id]) { ctx.broadcastHome(); ctx.profileChanged(); }
      return true;
    }

    case 'furn-sell': {   // 0.17 🛋️ 가방에 있는 가구 되팔기 (산 값의 30%)
      const id = String(m.item || '');
      const def = C.items[id];
      if (!def) return true;
      const n = Math.max(1, Math.min(200, Math.floor(Number(m.n) || 1)));
      if (def.noSell) return err(`${def.name}은(는) 팔 수 없어요.`);
      if (def.free === true || def.required || def.price == null) return err('기본으로 받은 가구는 팔 수 없어요.');
      if (def.event && !ctx.events()[def.event]) return err('이벤트가 끝난 가구는 팔 수 없어요. (이벤트 코인으로 돌려받는 거라서요)');
      const placed = u.home.items.filter((it) => it.item === id).length;
      const left = (u.owned[id] || 0) - placed;
      if (left < n) return err('가방에 남은 가구만 팔 수 있어요. 방에 놓은 건 꾸미기에서 가방에 넣고 팔아요.');
      if (def.free && (u.owned[id] || 0) - n < 1) return err(`처음 받은 ${def.name}은(는) 하나는 남겨 둬야 해요.`);   // 침대처럼 처음 받은 가구
      const each = Math.floor(def.price * (C.limits.sellRate || 0.3));
      const got = each * n;
      u.owned[id] -= n;
      if (u.owned[id] <= 0) delete u.owned[id];
      if (def.event) u.eventCoins[def.event] = (u.eventCoins[def.event] || 0) + got;
      else u.coins += got;
      save();
      pushMe(ws, { amount: got, reason: 'furn-sell', item: id, n, event: def.event || null });
      return true;
    }

    case 'acc-equip': {
      return true;   // 0.17.2 액세서리 없어짐 (예전 앱이 보내도 무시)
      const slot = ['head', 'face', 'neck'].includes(m.slot) ? m.slot : null;
      if (!slot) return;
      if (m.id == null) delete u.acc.eq[slot];
      else {
        const a = C.accessories[m.id];
        if (!a || a.slot !== slot || !u.acc.owned[m.id]) return;
        u.acc.eq[slot] = m.id;
      }
      save(); pushMe(ws); ctx.profileChanged();
      return true;
    }

    // ------------------------------------------------ 출석
    case 'checkin': {
      const d = kstDay();
      if (u.attend.last === d) return err('오늘은 이미 출석했어요. 내일 또 와요!');
      u.attend.last = d;
      u.attend.count += 1;
      const day = ((u.attend.count - 1) % 7) + 1;
      const reward = { reason: 'checkin', day, count: u.attend.count };
      if (day < 7) {
        reward.amount = C.attendance.coins[day - 1];
        u.coins += reward.amount;
      } else {   // 0.17.2: 7일째는 코인 (예전엔 액세서리)
        reward.amount = C.attendance.day7Fallback; u.coins += reward.amount;
      }
      save(); pushMe(ws, reward);
      return true;
    }

    // ------------------------------------------------ 음식 주기 (나 · 펫)
    case 'feed': {
      const id = String(m.food || '');
      if ((u.food[id] || 0) < 1) return err('가방에 그 음식이 없어요.');
      if (!m.target || m.target === 'me') {
        const food = C.foods[id];
        if (!food) return err('그건 펫이나 어항에게 주는 먹이예요.');
        const p = ctx.tickPet();
        if (p.full >= 98) return err('배불러서 더 못 먹어요!');
        u.food[id] -= 1; if (!u.food[id]) delete u.food[id];
        p.full = Math.min(100, p.full + food.full);
        p.mood = Math.min(100, p.mood + food.mood);
        p.exp += food.exp;
        let bonus = 0;
        while (p.exp >= ctx.expNeeded(p.level)) { p.exp -= ctx.expNeeded(p.level); p.level++; bonus += 50 * p.level; }
        u.coins += bonus;
        save();
        pushMe(ws, { amount: bonus, reason: bonus ? 'levelup' : 'feed', food: id, level: p.level });
        return true;
      }
      const pet = u.pets.find((p) => p.id === m.target);
      const food = C.petFoods[id];
      if (!pet) return;
      if (!food || food.tank) return err('그건 펫이 먹을 수 없어요.');
      tickPets(u);
      if (pet.full >= 98) return err(`${pet.name}은(는) 배불러요!`);
      u.food[id] -= 1; if (!u.food[id]) delete u.food[id];
      const liked = C.pets[pet.kind].likes.includes(id);
      pet.full = Math.min(100, pet.full + food.full);
      pet.love = Math.min(100, pet.love + food.love * (liked ? 2 : 1));
      const up = petGain(pet, liked ? 15 : 8);
      save();
      pushMe(ws, { reason: 'pet-feed', pet: pet.id, liked, levelUp: up, name: pet.name, ...(up >= PET_MAX_LV ? { trait: pet.trait } : {}) });
      if (pet.out) { ctx.broadcastHome(); if (up) ctx.profileChanged(); }
      return true;
    }

    case 'rod-equip': {
      const id = String(m.id || '');
      if (!u.rods[id]) return err('가지고 있지 않은 낚싯대예요.');
      u.rod = id;
      save(); pushMe(ws); ctx.profileChanged();
      return true;
    }

    // ------------------------------------------------ 간식 나눠먹기 (같은 방 친구 캐릭터 우클릭)
    case 'share-snack': {
      const id = String(m.food || '');
      const food = C.foods[id];
      if (!food) return err('캐릭터가 먹는 음식만 나눠먹을 수 있어요.');
      if ((u.food[id] || 0) < 1) return err('가방에 그 음식이 없어요. 상점에서 사 올 수 있어요!');
      const fws = ctx.roomPeer(m.target);
      if (!fws) return err('같은 집에 있는 사람하고만 나눠먹을 수 있어요.');
      const f = fws.user;
      if (ctx.blockedEither(f)) return err('그 사람과는 나눠먹을 수 없어요.');
      const d = daily(u, 'snack');
      if (d.n >= C.limits.snackPerDay) return err(`간식 나눠먹기는 하루 ${C.limits.snackPerDay}번까지예요.`);
      d.n += 1;
      u.food[id] -= 1; if (!u.food[id]) delete u.food[id];
      // 반씩 나눠 먹고, 같이 먹어서 기분은 조금 더 좋아짐
      const share = (who, pet) => {
        pet.full = Math.min(100, pet.full + Math.ceil(food.full / 2));
        pet.mood = Math.min(100, pet.mood + Math.ceil(food.mood / 2) + 4);
        pet.exp += Math.ceil(food.exp / 2);
        let bonus = 0;
        while (pet.exp >= ctx.expNeeded(pet.level)) { pet.exp -= ctx.expNeeded(pet.level); pet.level++; bonus += 50 * pet.level; }
        who.coins += bonus;
        return bonus;
      };
      share(u, ctx.tickPet());
      share(f, ctx.tickPetOf(f));
      save();
      pushMe(ws, { reason: 'snack-sent', food: id, to: f.nickname });
      ctx.pushMeTo(fws, { reason: 'snack-got', food: id, from: u.nickname });
      ctx.roomBroadcast({ type: 'snack', from: ctx.peerId, to: fws.peerId, food: id });
      send(fws, { type: 'notice', message: `${food.icon} ${u.nickname}(@${u.username})님이 ${food.name}을(를) 나눠줬어요! 냠냠` });
      return true;
    }

    // ------------------------------------------------ 펫
    case 'pet-fav': {   // 0.17.8 ⭐ 펫 즐겨찾기 (펫 탭 맨 위로)
      const pet = u.pets.find((p) => p.id === m.id);
      if (!pet) return;
      if (m.on) pet.fav = true; else delete pet.fav;
      save(); pushMe(ws);
      return true;
    }
    case 'pet-out': {
      const pet = u.pets.find((p) => p.id === m.id);
      if (!pet) return;
      if (m.out && !pet.out && u.pets.filter((p) => p.out).length >= C.limits.petsOut) return err(`펫은 동시에 ${C.limits.petsOut}마리까지 꺼낼 수 있어요.`);
      pet.out = !!m.out;
      if (m.floor === 1 || m.floor === 2) pet.floor = m.floor;
      save(); pushMe(ws); ctx.broadcastHome(); ctx.profileChanged();
      return true;
    }
    case 'pet-sell': {   // 잘못 산 펫 되팔기: 산 값의 절반
      const pet = u.pets.find((p) => p.id === m.id);
      if (!pet) return;
      const def = C.pets[pet.kind];
      if (def?.limited) return err('한정 펫은 되팔 수 없어요.');   // 0.17.5 🍫
      if (!def || def.secret || def.price == null) return err('운영자 전용 펫은 되팔 수 없어요.');
      const amount = Math.floor(def.price / 2);
      u.pets = u.pets.filter((p) => p !== pet);
      u.coins += amount;
      save();
      pushMe(ws, { amount, reason: 'pet-sell', name: pet.name });
      if (pet.out) ctx.broadcastHome();
      ctx.profileChanged();
      return true;
    }
    case 'pet-private': {   // 🙈 쉬는 동안 숨기기 (0.17.8): 친구가 '펫 전부 보기'를 켜도 안 꺼낸 이 펫은 안 보임. 꺼내 두면 늘 보임
      const pet = u.pets.find((p) => p.id === m.id);
      if (!pet) return;
      pet.private = !!m.private;
      save(); pushMe(ws); ctx.broadcastHome(); ctx.profileChanged();
      return true;
    }
    case 'pet-rename': {
      const pet = u.pets.find((p) => p.id === m.id);
      if (!pet) return;
      pet.name = clean(m.name, 10) || C.pets[pet.kind].name;
      save(); pushMe(ws); if (pet.out) { ctx.broadcastHome(); ctx.profileChanged(); }
      return true;
    }
    case 'pet-ending': {   // 0.17.3 말끝에 붙이는 말 (빈칸이면 없앰)
      const pet = u.pets.find((p) => p.id === m.id);
      if (!pet) return;
      const e = clean(m.ending, 20).replace(/\s+/g, '');
      if ([...e].length > C.petEndingMax) return err(`말끝에 붙이는 말은 ${C.petEndingMax}글자까지예요.`);
      if (e) pet.ending = e; else delete pet.ending;
      save(); pushMe(ws, { reason: 'pet-ending', pet: pet.id, name: pet.name, ending: e });
      if (pet.out) ctx.broadcastHome();
      ctx.profileChanged();
      return true;
    }
    case 'pet-pat': {
      const pet = u.pets.find((p) => p.id === m.id);
      if (!pet || !ctx.perSocket('pat-' + pet.id, 1, 8000)) return;
      pet.love = Math.min(100, pet.love + 1);
      // 교감: 30초에 한 번씩 쓰다듬으면 경험치가 조금 올라요
      let gained = 0, up = 0;
      if (pet.level < PET_MAX_LV && now() - (pet.patAt || 0) >= PAT_EVERY) { pet.patAt = now(); gained = PAT_EXP; up = petGain(pet, PAT_EXP); }
      save(); pushMe(ws, gained ? { reason: 'pet-pat', pet: pet.id, exp: gained, levelUp: up, name: pet.name, ...(up >= PET_MAX_LV ? { trait: pet.trait } : {}) } : undefined);
      if (up && pet.out) { ctx.broadcastHome(); ctx.profileChanged(); }
      return true;
    }

    // ------------------------------------------------ 낚시
    case 'fish-cast': {
      // 이미 물고기가 걸려 있으면(앱을 다시 켰을 때 등) 그것부터 낚아 줌
      if (ws.fish && ws.fish.got && now() >= ws.fish.biteAt) return reel(), true;
      if (ws.fish && now() < ws.fish.until) return err('찌가 아직 물에 있어요!');
      const c = daily(u, 'casts');
      if (C.limits.castsPerDay && c.n >= C.limits.castsPerDay) return err(`오늘 낚시는 여기까지! (하루 ${C.limits.castsPerDay}번) 내일 또 해요.`);
      c.n += 1;
      const wait = 3000 + Math.floor(Math.random() * 8000);
      // 무엇이 걸릴지는 던질 때 정함. 꽝이면 입질(!) 없이 끝나고,
      // 입질이 오면 이미 걸린 거라서 늦게 당겨도 놓치지 않음 (너무 일찍 당기면 도망감)
      const got = roll(u.rod);
      const f = { biteAt: now() + wait, got, until: got ? now() + wait + 600_000 : now() + wait };
      ws.fish = f;
      if (!got) {
        f.timer = setTimeout(() => {
          if (ws.fish !== f) return;
          ws.fish = null;
          send(ws, { type: 'fish-result', kind: 'nothing' });
          ctx.fishPeer({ state: 'result', kind: 'nothing' });
        }, Math.max(500, wait - 300));
      }
      save();
      send(ws, { type: 'fish-cast', wait, window: 1600, left: C.limits.castsPerDay ? C.limits.castsPerDay - c.n : 9999, hold: true });
      ctx.fishPeer({ state: 'waiting', rod: u.rod });
      return true;
    }
    case 'fish-reel':
      reel();
      return true;
    case 'fish-sell': {
      const code = String(m.code || ''), n = Math.max(1, Math.floor(Number(m.n) || 1));
      const f = FISH[code];
      if (!f || !takeFish(u, code, n)) return err('가방에 그만큼 없어요.');
      const coins = f.price * n;
      u.coins += coins;
      save(); pushMe(ws, { amount: coins, reason: f.cat === 'T' ? 'recycle' : 'fish-sell', code, n });
      return true;
    }
    case 'fish-sell-many': {   // 골라서 한 번에 팔기: items = [{ code, n }]
      if (!Array.isArray(m.items) || !m.items.length || m.items.length > 200) return;
      const want = {};
      for (const it of m.items) {
        const code = String(it?.code || ''), n = Math.floor(Number(it?.n) || 0);
        if (!FISH[code] || n < 1) continue;
        want[code] = (want[code] || 0) + n;
      }
      const codes = Object.keys(want);
      if (!codes.length) return;
      // 하나라도 모자라면 아무것도 안 팖 (반만 팔리는 일 없게)
      for (const code of codes) if ((u.fishInv[code] || 0) < want[code]) return err(`가방에 ${FISH[code].name}이(가) 그만큼 없어요.`);
      let coins = 0, n = 0;
      for (const code of codes) { takeFish(u, code, want[code]); coins += FISH[code].price * want[code]; n += want[code]; }
      u.coins += coins;
      save(); pushMe(ws, { amount: coins, reason: 'fish-sell-many', n, kinds: codes.length });
      return true;
    }
    case 'fish-gift': {
      const f = ctx.byName(m.username), code = String(m.code || '');
      if (!f || !ctx.isFriend(f) || ctx.blockedEither(f)) return err('친구에게만 선물할 수 있어요.');
      if (!FISH[code]) return;
      const g = daily(u, 'fishGift');
      if (g.n >= C.limits.fishGiftPerDay) return err(`물고기 선물은 하루 ${C.limits.fishGiftPerDay}번까지예요.`);
      if (!takeFish(u, code)) return err('가방에 그 물고기가 없어요.');
      g.n += 1;
      addFish(f, code, 1);
      save();
      pushMe(ws, { reason: 'fish-gift-sent', code, to: f.nickname });
      const fs = ctx.sessions.get(f.id);
      if (fs) { ctx.pushMeTo(fs, { reason: 'fish-gift', code, from: u.nickname }); send(fs, { type: 'notice', message: `🎁 ${u.nickname}(@${u.username})님이 #${code} ${FISH[code].name}을(를) 선물했어요!`, popup: true }); }
      return true;
    }
    case 'fish-view': { // 친구 가방 구경 (교환 고르기용)
      const f = ctx.byName(m.username);
      if (!f || (!ctx.isFriend(f) && f.id !== u.id) || ctx.blockedEither(f)) return;
      send(ws, { type: 'fish-view', username: f.username, nickname: f.nickname, inv: f.fishInv, dexCount: Object.keys(f.dex).length });
      return true;
    }
    case 'trade-offer': {
      const f = ctx.byName(m.username), give = String(m.give || ''), get = String(m.get || '');
      if (!f || !ctx.isFriend(f) || ctx.blockedEither(f)) return err('친구하고만 교환할 수 있어요.');
      if (!FISH[give] || !FISH[get]) return;
      if ((u.fishInv[give] || 0) < 1) return err('내 가방에 그 물고기가 없어요.');
      if ((f.fishInv[get] || 0) < 1) return err('친구 가방에 그 물고기가 없어요.');
      const tr = daily(u, 'trades');
      if (tr.n >= C.limits.tradesPerDay) return err(`교환 신청은 하루 ${C.limits.tradesPerDay}번까지예요.`);
      if (f.tradesIn.length >= 20) return err('친구가 받은 교환 신청이 너무 많아요.');
      tr.n += 1;
      const id = rid('x');
      f.tradesIn.push({ id, from: u.id, give, get, at: now() });
      u.tradesOut.push({ id, to: f.id, give, get, at: now() });
      save();
      pushMe(ws, { reason: 'trade-sent' });
      const fs = ctx.sessions.get(f.id);
      if (fs) { ctx.pushMeTo(fs); send(fs, { type: 'notice', message: `🔄 ${u.nickname}님이 교환을 신청했어요: 내 #${get} ${FISH[get].name} ↔ #${give} ${FISH[give].name}`, popup: true }); }
      return true;
    }
    case 'trade-answer': {
      const i = u.tradesIn.findIndex((t) => t.id === m.id);
      if (i < 0) return;
      const t = u.tradesIn[i];
      const p = ctx.userById(t.from);
      u.tradesIn.splice(i, 1);
      if (p) p.tradesOut = p.tradesOut.filter((x) => x.id !== t.id);
      const ps = p && ctx.sessions.get(p.id);
      if (!p) { save(); pushMe(ws); return true; }
      if (m.accept) {
        if ((p.fishInv[t.give] || 0) < 1 || (u.fishInv[t.get] || 0) < 1) {
          save(); pushMe(ws);
          return err('둘 중 한 명이 그 물고기를 더 이상 가지고 있지 않아서 교환할 수 없어요.');
        }
        takeFish(p, t.give); takeFish(u, t.get);
        addFish(u, t.give); addFish(p, t.get);
        save();
        pushMe(ws, { reason: 'trade-done', got: t.give });
        if (ps) { ctx.pushMeTo(ps, { reason: 'trade-done', got: t.get }); send(ps, { type: 'notice', message: `🔄 ${u.nickname}님이 교환을 받았어요! #${t.get} ${FISH[t.get].name}이(가) 들어왔어요.`, popup: true }); }
      } else {
        save(); pushMe(ws);
        if (ps) { ctx.pushMeTo(ps); send(ps, { type: 'notice', message: `${u.nickname}님이 교환을 거절했어요.` }); }
      }
      return true;
    }
    case 'trade-cancel': {
      const t = u.tradesOut.find((x) => x.id === m.id);
      if (!t) return;
      u.tradesOut = u.tradesOut.filter((x) => x.id !== t.id);
      const f = ctx.userById(t.to);
      if (f) { f.tradesIn = f.tradesIn.filter((x) => x.id !== t.id); const fs = ctx.sessions.get(f.id); if (fs) ctx.pushMeTo(fs); }
      save(); pushMe(ws);
      return true;
    }

    // ------------------------------------------------ 어항
    case 'tank-put': {
      const it = u.home.items.find((x) => x.uid === m.uid);
      const code = String(m.code || '');
      if (!it || !FISH[code]) return;
      const tank = C.items[it.item].tank;
      if (!tank.allow.includes(FISH[code].cat)) return err(FISH[code].cat === 'L' ? '큰 물고기는 아쿠아리움에만 넣을 수 있어요.' : '이 어항에는 넣을 수 없어요.');
      const list = (u.tanks[it.uid] ||= []);
      if (list.length >= tank.cap) return err(`이 어항은 ${tank.cap}마리까지예요.`);
      if (!takeFish(u, code)) return err('가방에 그 물고기가 없어요.');
      list.push(code);
      save(); pushMe(ws); ctx.broadcastHome();
      return true;
    }
    case 'tank-take': {
      const list = u.tanks[m.uid];
      const i = Math.floor(Number(m.i));
      if (!list || !(i >= 0 && i < list.length)) return;
      const [code] = list.splice(i, 1);
      u.fishInv[code] = (u.fishInv[code] || 0) + 1;
      save(); pushMe(ws); ctx.broadcastHome();
      return true;
    }
    case 'tank-feed': {
      const isAqua = m.uid === 'aquarium';
      if (!isAqua && !u.home.items.some((x) => x.uid === m.uid)) return;
      if ((u.food.fishfood || 0) < 1) return err('물고기 밥이 없어요. 상점에서 살 수 있어요.');
      u.food.fishfood -= 1; if (!u.food.fishfood) delete u.food.fishfood;
      u.tankFed[m.uid] = now();
      save(); pushMe(ws, { reason: 'tank-feed', uid: m.uid }); ctx.broadcastHome();
      return true;
    }

    // ------------------------------------------------ 아쿠아리움
    case 'aqua-put': {
      const code = String(m.code || '');
      if (!FISH[code] || FISH[code].cat === 'T') return err('쓰레기는 넣을 수 없어요.');
      if (u.aquarium.length >= C.limits.aquariumCap) return err(`아쿠아리움은 ${C.limits.aquariumCap}마리까지예요.`);
      if (!takeFish(u, code)) return err('가방에 그 물고기가 없어요.');
      u.aquarium.push(code);
      save(); pushMe(ws);
      return true;
    }
    case 'aqua-take': {
      const i = Math.floor(Number(m.i));
      if (!(i >= 0 && i < u.aquarium.length)) return;
      const [code] = u.aquarium.splice(i, 1);
      u.fishInv[code] = (u.fishInv[code] || 0) + 1;
      save(); pushMe(ws);
      return true;
    }
    case 'aqua-view': {
      const f = ctx.byName(m.username) || u;
      const allowed = f.id === u.id || ctx.isFriend(f) || ctx.roomOf(f);
      if (!allowed || ctx.blockedEither(f)) return err('친구의 아쿠아리움만 구경할 수 있어요.');
      send(ws, { type: 'aqua', username: f.username, nickname: f.nickname, fish: f.aquarium, fed: f.tankFed.aquarium || 0, mine: f.id === u.id });
      return true;
    }
    default:
      return false;
  }
}

// 관리자: 물고기 지급
function adminGiveFish(u, code, n) {
  if (!FISH[code]) return false;
  addFish(u, code, n);
  return true;
}

module.exports = { migrate, view, homeView, onPlace, handle, adminGiveFish, daily, kstDay, tickPets, PET_MAX_LV, petPublic, pickTrait };
