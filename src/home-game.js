// 집 화면의 게임 기능: 상점 · 가방 · 출석 · 낚시 · 도감 · 어항 · 아쿠아리움 · 선물/교환 · 펫
// home.js 가 만든 window.HomeCore 를 쓰고, window.HomeGame 으로 연결 지점을 내줌
(() => {
  const H = window.HomeCore;
  const $ = (id) => document.getElementById(id);
  const srv = (m) => buddy.send('srv', m);
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif';
  const CAT_NAME = { T: '쓰레기', S: '작은 물고기', M: '중간 물고기', L: '큰 물고기' };

  // 집 주인 왕관: 혼자 있을 땐 안 보이고, 방에 다른 사람이 있을 때만 주인 이름 앞에 보임
  function showCrownDock(username) {
    const s = H.S;
    if (!s || !s.room || !username) return false;
    const ownerName = s.room.isOwner ? U()?.username : s.room.owner.username;
    if (username !== ownerName) return false;
    return s.room.isOwner ? (s.peers || []).length > 0 : true;
  }
  // 받침에 맞춰 을/를, 이/가
  const batchim = (w) => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
  const eul = (w) => w + (batchim(w) ? '을' : '를');
  const iga = (w) => w + (batchim(w) ? '이' : '가');

  function el(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on')) e[k] = v;
      else if (k === 'text') e.textContent = v;
      else if (v !== undefined && v !== null && v !== false) e[k] = v;
    }
    for (const c of kids.flat()) if (c != null) e.append(c);
    return e;
  }
  const btn = (text, cls, onclick, disabled, title) => el('button', { class: cls || 'primary small', text, onclick, disabled: !!disabled, title });

  const S = () => H.S;
  // 운영자 전용 액세서리: 가진 것만 서버가 진짜 이름을 알려 줌
  const C = () => {
    const c = H.catalog, names = U()?.secretNames;
    if (c && names) for (const [id, name] of Object.entries(names)) for (const group of [c.accessories, c.pets, c.rods]) if (group && group[id]) group[id].name = name;
    return c;
  };
  const U = () => (H.S && H.S.session ? H.S.session.user : null);
  // 🎉 이벤트 전용 아이템(벽지·가구·펫)은 이벤트 코인으로만 살 수 있음
  // 이벤트마다 전용 코인이 따로: 🎃 호박 코인 · 🎄 트리 코인 · 🧧 복주머니 코인 (일반 코인 🪙과 별개)
  const evCoins = (u) => (u.eventCoins && typeof u.eventCoins === 'object' ? u.eventCoins : {});
  const eventWallet = (def, u) => {
    if (!def.event) return { bal: u.coins, icon: '🪙' };
    const coin = C().events?.[def.event]?.coin || { icon: '🎫' };
    return { bal: evCoins(u)[def.event] || 0, icon: coin.icon };
  };
  const FISH = () => (C() ? C().fish : {});
  const rar = (f) => C().rarity[f.rar];

  // ------------------------------------------------------------ 탭 안의 작은 탭
  function subtabs(navId, attr, secClass) {
    const nav = $(navId);
    nav.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        nav.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
        const pane = nav.parentElement;
        pane.querySelectorAll('.' + secClass).forEach((s) => { s.hidden = s.dataset.sec !== b.dataset[attr]; });
        if (attr === 'dex') renderDex();
      };
    });
  }
  subtabs('shopTabs', 'shop', 'shop-sec');
  subtabs('bagTabs', 'bag', 'bag-sec');
  subtabs('dexTabs', 'dex', 'dex-sec');
  let dexFilter = 'S';
  const dexPageOf = { S: 0, M: 0, L: 0, X: 0, T: 0 };
  $('dexTabs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { dexFilter = b.dataset.dex; renderDex(); }));
  const openTab = (name) => document.querySelector(`.tabs button[data-tab=${name}]`)?.click();

  // ------------------------------------------------------------ 상점
  function renderShop() {
    const u = U(), c = C();
    if (!u || !c) return;
    const activeEvents = Object.values(c.events || {}).filter((e) => e.on).map((e) => `${e.icon} ${e.name}`).join(', ');
    $('shopNote').textContent = `오늘 접속 코인 🪙${c.limits.onlinePerDay - (u.onlineLeft ?? 0)}/${c.limits.onlinePerDay} 받음 · 친구와 대화하면 30초마다 🪙30`
      + (activeEvents ? ` · 🎉 ${activeEvents} 이벤트 진행 중! '🎉 이벤트' 탭을 확인해 보세요` : '');
    const row = H.shopRow;
    const items = $('shopItems'), tanks = $('shopTanks'), wallItems = $('shopWallItems');
    items.textContent = ''; tanks.textContent = ''; wallItems.textContent = '';
    // 🎉 이벤트 상점: 켜진 이벤트의 전용 벽지·가구·펫은 일반 탭이 아니라 여기에만 나옴
    const evBox = $('shopEvent'); evBox.textContent = '';
    const evOn = Object.entries(c.events || {}).filter(([, e]) => e.on);
    const evTab = $('shopEventTab');
    evTab.hidden = !evOn.length;
    if (!evOn.length && evTab.classList.contains('active')) $('shopTabs').querySelector('button[data-shop=furniture]').click();
    const wal = $('shopEventWallet'); wal.textContent = '';
    const earned = u.eventEarned && typeof u.eventEarned === 'object' ? u.eventEarned : {};
    for (const [key, e] of evOn) {
      const coin = e.coin || { name: '이벤트 코인', icon: '🎫' };
      wal.append(el('div', { class: 'ecoin-card ecoin-' + key },
        el('span', { class: 'ecoin ecoin-' + key, text: coin.icon }),
        el('div', {}, el('div', {}, `${coin.name} `, el('b', { text: (evCoins(u)[key] || 0).toLocaleString() })),
          el('small', { text: `접속해 있으면 5분마다 +${c.rewards?.eventCoin ?? 10} · 지금까지 접속으로 번 ${coin.icon}${(earned[key] || 0).toLocaleString()}` }))));
    }
    const evLists = {};
    for (const [key, e] of evOn) {
      const mk = (label) => { const ul = el('ul', { class: 'shop' }); return [el('h4', { text: label }), ul]; };
      const [h1, walls] = mk('벽지'), [h2, furn] = mk('가구 · 장식'), [h3, pets] = mk('펫');
      evBox.append(el('h3', {}, `${e.icon} ${e.name} 이벤트 `, el('span', { class: 'note-inline', text: `${e.coin?.icon || '🎫'} ${e.coin?.name || '이벤트 코인'}으로만 살 수 있어요` })), h1, walls, h2, furn, h3, pets);
      evLists[key] = { walls, furn, pets };
    }
    // 🏗️ 집 넓히기 (가로로 한 단계씩)
    const steps = c.room?.expand || [];
    const lv = u.home.level || 0, next = steps[lv + 1];
    if (steps.length > 1) {
      const sub = next ? `지금 ${steps[lv].name} (가로 ${steps[lv].w}) → ${next.name} (가로 ${next.w}) · 🪙 ${next.price.toLocaleString()}` : `가장 넓은 집이에요 (가로 ${steps[lv].w})`;
      items.append(row('🏗️', `집 넓히기 ${lv}/${steps.length - 1}단계`, sub, next ? [['넓히기', u.coins < next.price, () => { if (confirm(`🪙${next.price.toLocaleString()}로 ${next.name}을(를) 할까요?\n집이 가로로 넓어져요. (되돌릴 수 없어요)`)) srv({ type: 'home-expand' }); }]] : [['완료', true, () => {}, 'ghost small']]));
    }
    for (const [id, it] of Object.entries(c.items)) {
      if (it.free === true) continue;
      const own = u.owned[id] || 0;
      const w = eventWallet(it, u);
      const sub = `${w.icon} ${it.price.toLocaleString()}${own ? ` · ${own}개 있음` : ''}${it.tank ? ` · ${it.tank.cap}마리 · ${it.tank.allow.includes('M') ? '작은·중간' : '작은'} 물고기` : ''}${it.wall && it.event ? ' · 벽에 거는 장식' : ''}`;
      const r = row(Furniture.thumb(id), it.name, sub, [['사기', w.bal < it.price, () => srv({ type: 'buy', item: id })]]);
      if (it.event) { evLists[it.event]?.furn.append(r); continue; }
      (it.tank ? tanks : it.wall ? wallItems : items).append(r);
    }
    const foods = $('shopFoods'); foods.textContent = '';
    for (const [id, f] of Object.entries(c.foods)) {
      foods.append(row(f.icon, f.name, `🪙 ${f.price} · 배부름 +${f.full} · 기분 +${f.mood} · 경험치 +${f.exp}${u.food[id] ? ` · ${u.food[id]}개 있음` : ''}`, [
        ['1개', u.coins < f.price, () => srv({ type: 'buy', item: id, n: 1 })],
        ['5개', u.coins < f.price * 5, () => srv({ type: 'buy', item: id, n: 5 }), 'ghost small'],
      ]));
    }
    const pf = $('shopPetFoods'); pf.textContent = '';
    for (const [id, f] of Object.entries(c.petFoods)) {
      const who = f.tank ? '어항 · 아쿠아리움 물고기' : Object.entries(c.pets).filter(([, p]) => p.likes.includes(id)).map(([, p]) => p.name).join('·') + '가 좋아해요';
      pf.append(row(f.icon, f.name, `🪙 ${f.price} · ${who}${u.food[id] ? ` · ${u.food[id]}개 있음` : ''}`, [
        ['1개', u.coins < f.price, () => srv({ type: 'buy', item: id, n: 1 })],
        ['5개', u.coins < f.price * 5, () => srv({ type: 'buy', item: id, n: 5 }), 'ghost small'],
      ]));
    }
    // 낚싯대
    const rodsUl = $('shopRods'); rodsUl.textContent = '';
    for (const [id, r] of Object.entries(c.rods || {})) {
      const own = !!(u.rods || {})[id], on = u.rod === id;
      if (r.secret && !own) { rodsUl.append(row(secretThumb(), '???', `${r.code} · 🔒 운영자 전용 낚싯대 · 살 수 없어요`, [['구매 불가', true, () => {}]])); continue; }
      const sub = `${r.code} · 전설 1종당 ${r.legend}% · 꽝 ${r.nothing}%` + (own ? '' : r.price ? ` · 🪙 ${r.price.toLocaleString()}` : '');
      const btns = own ? [[on ? '장착 중' : '장착', on, () => srv({ type: 'rod-equip', id }), on ? 'ghost small' : 'primary small']]
        : [['사기', u.coins < r.price, () => { if (confirm(`${r.name}을(를) 🪙${r.price.toLocaleString()}에 살까요? 사면 바로 장착돼요.`)) srv({ type: 'buy', item: id }); }]];
      rodsUl.append(row(RodArt.thumb(id, 34), r.name, sub, btns));
    }
    const pets = $('shopPets'); pets.textContent = '';
    const full = u.pets.length >= c.limits.petsMax;
    for (const [id, p] of Object.entries(c.pets)) {
      if (p.secret) {   // 운영자 전용 펫
        const own = u.pets.some((x) => x.kind === id);
        pets.append(row(own ? PetArt.thumb(id, 34) : secretThumb(), own ? p.name : '???', `${p.code} · ${own ? '✨ 운영자 보상 · 가지고 있음' : '🔒 비밀 펫 · 살 수 없어요'}`, [[own ? '있음' : '구매 불가', true, () => {}]]));
        continue;
      }
      const likes = p.likes.map((x) => c.petFoods[x]?.name).join(', ');
      const w = eventWallet(p, u);
      const pr = row(PetArt.thumb(id, 34), p.name, `${p.code} · ${w.icon} ${p.price.toLocaleString()} · 좋아하는 것: ${likes}`, [['데려오기', full || w.bal < p.price, () => srv({ type: 'buy', item: id })]]);
      if (p.event) evLists[p.event]?.pets.append(pr); else pets.append(pr);
    }
    if (full) pets.append(el('li', { class: 'note', text: `펫은 ${c.limits.petsMax}마리까지 키울 수 있어요.` }));
    const acc = $('shopAcc'); acc.textContent = '';
    for (const [id, a] of Object.entries(c.accessories)) {
      const own = u.acc.owned[id];
      if (a.secret) { // 운영자 전용: 안 가졌으면 ??? 로
        acc.append(row(own ? accThumb(id) : secretThumb(), own ? a.name : '???', own ? `${a.code} · ✨ 운영자 보상 · 가지고 있음` : `${a.code} · 🔒 비밀 액세서리 · 살 수 없어요`,
          [[own ? '있음' : '구매 불가', true, () => {}]]));
        continue;
      }
      const sub = `${a.code} · ` + (a.price == null ? '📅 출석 7일째 선물로만 나와요' : `🪙 ${a.price}`);
      acc.append(row(accThumb(id), a.name, own ? `${a.code} · 가지고 있음` : sub, [[own ? '있음' : a.price == null ? '출석 전용' : '사기', own || a.price == null || u.coins < a.price, () => srv({ type: 'buy', item: id })]]));
    }
    const walls = $('shopWalls'); walls.textContent = '';
    for (const [id, w] of Object.entries(c.walls)) {
      const own = id === 'basic' || u.owned[id];
      const on1 = u.home.wall1 === id, on2 = u.home.wall2 === id;
      const ew = eventWallet(w, u);
      const sub = own ? ([on2 && '2층', on1 && '1층'].filter(Boolean).join('·') + (on1 || on2 ? '에 바름' : '가지고 있음')) : `${ew.icon} ${w.price.toLocaleString()}`;
      const buttons = own
        ? [['2층', on2, () => buddy.send('wall', { item: id, floor: 2 }), 'ghost small'], ['1층', on1, () => buddy.send('wall', { item: id, floor: 1 }), 'ghost small']]
        : [['사기', ew.bal < w.price, () => srv({ type: 'buy', item: id })]];
      const wr = row(H.wallThumb(id), w.name, sub, buttons);
      if (w.event) evLists[w.event]?.walls.append(wr); else walls.append(wr);
    }
  }
  function renderRodPick() {
    const u = U(), c = C();
    if (!u || !c || !c.rods) return;
    const sel = $('rodPick');
    if (document.activeElement === sel) return;
    sel.textContent = '';
    for (const [id, r] of Object.entries(c.rods)) if ((u.rods || {})[id]) sel.append(el('option', { value: id, text: `${r.code} ${r.name}`, selected: u.rod === id }));
    const cur = c.rods[u.rod] || c.rods.rod1;
    $('rodInfo').textContent = `전설 1종당 ${cur.legend}% · 꽝 ${cur.nothing}% · 상점에서 더 좋은 낚싯대를 살 수 있어요`;
  }
  $('rodPick').onchange = (e) => srv({ type: 'rod-equip', id: e.target.value });
  function secretThumb() {
    const c = el('canvas', { width: 34, height: 34 });
    const g = c.getContext('2d');
    g.fillStyle = '#2a2236'; g.fillRect(2, 2, 30, 30);
    g.fillStyle = '#f4cf4f'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('?', 17, 18);
    return c;
  }
  function accThumb(id) {
    const c = el('canvas', { width: 34, height: 34 });
    const g = c.getContext('2d');
    const a = C().accessories[id];
    const eq = { [a.slot]: id };
    Sprites.drawPet(g, 1, 0, { species: U()?.species || 'cat', scale: 2, color: U()?.color || '#f2a65a', legs: 'stand', eyes: 'open', acc: eq });
    return c;
  }

  // ------------------------------------------------------------ 가방
  let sellSel = null, sellArmed = 0, sellArmT = null;   // ☑️ 골라서 팔기: code -> 개수
  function renderBag() {
    const u = U(), c = C();
    if (!u || !c) return;
    // 교환 신청
    const tl = $('tradeList'); tl.textContent = '';
    const fname = (code) => `#${code} ${FISH()[code]?.name || '?'}`;
    for (const t of u.tradesIn || []) {
      tl.append(H.shopRow(FishArt.thumb(FISH()[t.give], 34), `${t.fromName || '?'}님의 교환 신청`,
        `받기 ${fname(t.give)} ↔ 주기 ${fname(t.get)}`, [
          ['수락', (u.fishInv[t.get] || 0) < 1, () => srv({ type: 'trade-answer', id: t.id, accept: true })],
          ['거절', false, () => srv({ type: 'trade-answer', id: t.id, accept: false }), 'ghost small'],
        ]));
    }
    for (const t of u.tradesOut || []) {
      tl.append(H.shopRow(FishArt.thumb(FISH()[t.get], 34), `${t.toName || '?'}님에게 보낸 신청`,
        `주기 ${fname(t.give)} ↔ 받기 ${fname(t.get)} · 기다리는 중`, [['취소', false, () => srv({ type: 'trade-cancel', id: t.id }), 'ghost small']]));
    }
    $('tradeBox').hidden = !tl.children.length;

    // 물고기
    const grid = $('bagFish'); grid.textContent = '';
    const codes = Object.keys(u.fishInv).filter((k) => u.fishInv[k] > 0).sort();
    let total = 0, dups = 0, trash = 0;
    for (const code of codes) {
      const f = FISH()[code]; if (!f) continue;
      const n = u.fishInv[code];
      total += n; if (f.cat === 'T') trash += n; else if (n > 1) dups += n - 1;
      if (!sellSel) { grid.append(fishCell(f, n, false, () => openFish(code))); continue; }
      // ☑️ 골라서 팔기: 누르면 그 종류를 전부 고르고, −/+로 개수 조절
      const k = Math.min(sellSel.get(code) || 0, n);
      if (k) sellSel.set(code, k); else sellSel.delete(code);
      const li = fishCell(f, n, false, () => { if (sellSel.has(code)) sellSel.delete(code); else sellSel.set(code, n); renderBag(); });
      if (k) {
        li.classList.add('sel');
        const stop = (fn) => (e) => { e.stopPropagation(); fn(); renderBag(); };
        li.append(el('div', { class: 'step' },
          el('button', { class: 'ghost', text: '−', title: '하나 빼기', onclick: stop(() => { if (k > 1) sellSel.set(code, k - 1); else sellSel.delete(code); }) }),
          el('b', { text: `${k}/${n}` }),
          el('button', { class: 'ghost', text: '+', title: '하나 더', disabled: k >= n, onclick: stop(() => sellSel.set(code, Math.min(n, k + 1))) })));
      }
      grid.append(li);
    }
    for (const code of [...(sellSel?.keys() || [])]) if (!u.fishInv[code]) sellSel.delete(code);
    grid.classList.toggle('selecting', !!sellSel);
    renderSellBar();
    $('bagFishNote').textContent = codes.length ? `물고기 ${total}마리 · 누르면 팔기 · 어항에 풀기 · 선물 · 교환을 할 수 있어요` : '아직 잡은 게 없어요. 🎣 낚시 탭에서 낚아 보세요!';
    $('sellTrashBtn').disabled = !trash;
    $('sellTrashBtn').textContent = `🗑️ 쓰레기 재활용 (${trash})`;
    $('sellDupBtn').disabled = !dups;
    $('sellDupBtn').textContent = `중복만 팔기 (${dups})`;

    // 음식
    const bf = $('bagFood'); bf.textContent = '';
    const foodIds = Object.keys(u.food).filter((k) => u.food[k] > 0);
    for (const id of foodIds) {
      const f = c.foods[id], pf = c.petFoods[id];
      if (f) bf.append(H.shopRow(f.icon, `${f.name} ×${u.food[id]}`, `배부름 +${f.full} · 기분 +${f.mood} · 경험치 +${f.exp}`, [['먹이기', u.pet.full >= 98, () => srv({ type: 'feed', food: id, target: 'me' })]]));
      else if (pf) bf.append(H.shopRow(pf.icon, `${pf.name} ×${u.food[id]}`, pf.tank ? '어항이나 아쿠아리움을 열어서 줘요' : '🐾 펫 탭에서 줘요', [[pf.tank ? '아쿠아리움' : '펫 탭', false, () => (pf.tank ? openAquarium() : openTab('pets')), 'ghost small']]));
    }
    if (!foodIds.length) bf.append(el('li', { class: 'note', text: '음식이 없어요. 🛒 상점 → 음식에서 살 수 있어요.' }));

    // 액세서리
    const ba = $('bagAcc'); ba.textContent = '';
    const owned = Object.keys(u.acc.owned).filter((k) => u.acc.owned[k] && c.accessories[k]);
    const SLOT = { head: '머리', face: '얼굴', neck: '목' };
    for (const id of owned) {
      const a = c.accessories[id];
      const on = u.acc.eq[a.slot] === id;
      ba.append(H.shopRow(accThumb(id), a.name, `${a.code} · ${SLOT[a.slot]}${on ? ' · 쓰고 있음' : ''}`, [[on ? '벗기' : '쓰기', false, () => srv({ type: 'acc-equip', slot: a.slot, id: on ? null : id }), on ? 'ghost small' : 'primary small']]));
    }
    if (!owned.length) ba.append(el('li', { class: 'note', text: '액세서리가 없어요. 상점에서 사거나 출석 7일째에 받아요.' }));

    // 가구
    const v = H.viewing();
    const bag = $('bagItems'); bag.textContent = '';
    const placed = {};
    for (const it of u.home.items) placed[it.item] = (placed[it.item] || 0) + 1;
    // 방에 다 놓은 가구는 가방에서 숨김 (꾸미기에서 다시 가방에 넣으면 돌아옴)
    let any = false;
    for (const [id, n] of Object.entries(u.owned)) {
      const def = c.items[id];
      if (!def || def.required) continue;
      any = true;
      const left = n - (placed[id] || 0);
      if (left <= 0) continue;
      bag.append(H.shopRow(Furniture.thumb(id), def.name, `${left}개 남음${placed[id] ? ` · 방에 ${placed[id]}개` : ''}`, [
        ['2층에', !v.editable, () => H.placeNew(id, 2), 'ghost small'],
        ['1층에', !v.editable, () => H.placeNew(id, 1), 'ghost small'],
      ]));
    }
    if (any && !bag.children.length) bag.append(el('li', { class: 'note', text: '가방에 남은 가구가 없어요. 전부 방에 놓았어요!' }));
    $('bagNote').textContent = !any ? '아직 가구가 없어요. 상점에서 사 보세요!' : v.editable ? '놓을 층을 고르세요' : '내 집에서만 놓을 수 있어요';
  }
  $('sellTrashBtn').onclick = () => {
    const u = U(); let n = 0, coins = 0;
    for (const [code, k] of Object.entries(u.fishInv)) if (FISH()[code]?.cat === 'T' && k > 0) { srv({ type: 'fish-sell', code, n: k }); n += k; coins += k * FISH()[code].price; }
    if (n) H.toast(`🗑️ 쓰레기 ${n}개를 재활용했어요 (+🪙${coins})`, true);
  };
  // 중복만 팔기 = 골라서 팔기에 중복을 미리 골라 둔 상태로 열기 (확인창 없이 아래 막대에서 팔아요)
  $('sellDupBtn').onclick = () => {
    const u = U(); if (!u) return;
    sellSel = new Map();
    for (const [code, k] of Object.entries(u.fishInv)) { const f = FISH()[code]; if (f && f.cat !== 'T' && k > 1) sellSel.set(code, k - 1); }
    sellArmed = 0; renderBag();
    if (sellSel.size) H.toast('종류마다 1마리씩 남기고 골라 뒀어요. 아래에서 확인하고 팔아요.');
  };
  // ☑️ 골라서 팔기
  function sellTotals() {
    let n = 0, coins = 0;
    for (const [code, k] of sellSel || []) { n += k; coins += k * (FISH()[code]?.price || 0); }
    return { n, coins };
  }
  function renderSellBar() {
    $('sellBar').hidden = !sellSel;
    $('selectSellBtn').textContent = sellSel ? '☑️ 고르는 중…' : '☑️ 골라서 팔기';
    $('selectSellBtn').disabled = !!sellSel;
    if (!sellSel) return;
    const { n, coins } = sellTotals();
    $('sellSum').textContent = n ? `${sellSel.size}종류 · ${n}마리 고름 · +🪙${coins}` : '팔 물고기를 눌러서 골라요';
    const go = $('sellGoBtn');
    go.disabled = !n;
    go.classList.toggle('armed', !!sellArmed && !!n);
    go.textContent = sellArmed && n ? `정말 팔기 (+🪙${coins})` : '팔기';
  }
  const endSell = () => { sellSel = null; sellArmed = 0; clearTimeout(sellArmT); renderBag(); };
  $('selectSellBtn').onclick = () => { sellSel = new Map(); sellArmed = 0; renderBag(); };
  $('sellCancelBtn').onclick = endSell;
  $('sellAllBtn').onclick = () => {
    const u = U(); if (!u || !sellSel) return;
    const all = Object.entries(u.fishInv).filter(([c, k]) => k > 0 && FISH()[c]);
    if (all.every(([c, k]) => sellSel.get(c) === k)) sellSel.clear(); else for (const [c, k] of all) sellSel.set(c, k);
    sellArmed = 0; renderBag();
  };
  $('sellGoBtn').onclick = () => {
    const { n } = sellTotals();
    if (!n) return;
    if (!sellArmed) {   // 실수 방지: 한 번 더 눌러야 팔려요 (확인창을 안 써서 입력칸이 안 멈춰요)
      sellArmed = 1; renderSellBar();
      clearTimeout(sellArmT); sellArmT = setTimeout(() => { sellArmed = 0; renderSellBar(); }, 4000);
      return;
    }
    srv({ type: 'fish-sell-many', items: [...sellSel].map(([code, k]) => ({ code, n: k })) });
    endSell();
  };

  function fishCell(f, n, unknown, onclick) {
    const r = rar(f);
    const li = el('li', { class: unknown ? 'unknown' : '', onclick, title: unknown ? '아직 못 잡았어요' : f.name },
      el('span', { class: 'code', text: '#' + f.code }),
      FishArt.thumb(f, 44, unknown),
      el('span', { text: unknown ? '???' : f.name }),
      el('i', { class: 'rbar', style: `background:${r.color}` }));
    if (n > 0) li.append(el('span', { class: 'cnt', text: '×' + n, style: n > 1 ? 'color:var(--accent)' : '' }));
    return li;
  }

  // ------------------------------------------------------------ 물고기 자세히 (팔기 · 풀어주기 · 선물 · 교환)
  let fishOpen = null;
  function openFish(code) {
    fishOpen = code;
    $('fishModal').hidden = false;
    renderFishModal();
  }
  $('closeFish').onclick = () => { $('fishModal').hidden = true; fishOpen = null; };
  function renderFishModal(sub) {
    if (!fishOpen || $('fishModal').hidden) return;
    const u = U(), f = FISH()[fishOpen];
    if (!u || !f) return;
    const known = !!u.dex[f.code];
    const have = u.fishInv[f.code] || 0;
    const r = rar(f);
    $('fishTitle').textContent = `#${f.code} ${known ? f.name : '???'}`;
    const cv = $('fishBig'); const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    const bm = FishArt.bitmap(f);
    const k = Math.max(1, Math.floor(Math.min((cv.width - 20) / bm.width, (cv.height - 16) / bm.height)));
    g.imageSmoothingEnabled = false;
    g.drawImage(bm, (cv.width - bm.width * k) / 2, (cv.height - bm.height * k) / 2, bm.width * k, bm.height * k);
    if (!known) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(40,40,52,0.9)'; g.fillRect(0, 0, cv.width, cv.height); g.globalCompositeOperation = 'source-over'; }
    const d = u.dex[f.code];
    const info = $('fishInfo'); info.textContent = '';
    info.append(
      el('div', {}, el('span', { class: 'rar-badge', style: `background:${r.color}`, text: r.name }), ' ', CAT_NAME[f.cat]),
      el('div', { text: `🎣 한 번 던질 때 나올 확률 ${f.chance}%` }),
      f.size ? el('div', { text: `📏 크기 ${f.size[0]}~${f.size[1]}cm${d && d.best ? ` · 내 최고 ${d.best}cm` : ''}` }) : null,
      el('div', { text: known ? `📖 지금까지 ${d.n}마리 · 가방에 ${have}마리` : '아직 도감에 없어요' }),
      el('div', { text: `🪙 팔면 ${f.price}코인` }),
      el('div', { text: f.cat === 'T' ? '🏠 어항에 넣을 수 없어요 (재활용)' : `🏠 들어가는 곳: ${fitsOf(f).filter((x) => x.ok).map((x) => x.name).join(' · ')}` }),
    );
    const acts = $('fishActions'); acts.textContent = '';
    $('fishSub').textContent = '';
    if (have > 0) {
      acts.append(btn(f.cat === 'T' ? `♻️ 재활용 (+${f.price})` : `🪙 팔기 (+${f.price})`, 'ghost small', () => srv({ type: 'fish-sell', code: f.code, n: 1 })));
      if (f.cat !== 'T') {
        const tanks = myTanks().filter((t) => t.def.allow.includes(f.cat));
        if (tanks.length) acts.append(btn('🐠 어항에 풀기', 'ghost small', () => showTankChoice(f, tanks)));
        acts.append(btn('🐋 아쿠아리움에', 'ghost small', () => srv({ type: 'aqua-put', code: f.code })));
      }
      acts.append(btn('🎁 친구에게 선물', 'ghost small', () => showFriendChoice('gift', f)));
      acts.append(btn('🔄 교환 신청', 'ghost small', () => showFriendChoice('trade', f)));
    }
    if (sub) $('fishSub').append(sub);
  }
  function myTanks() {
    const u = U(), c = C();
    return u.home.items.filter((it) => it.uid && c.items[it.item]?.tank).map((it) => ({ uid: it.uid, item: it.item, def: c.items[it.item].tank, name: c.items[it.item].name, n: (u.tanks?.[it.uid] || []).length }));
  }
  function showTankChoice(f, tanks) {
    const box = el('div', { class: 'row' }, el('span', { class: 'note-inline', text: '어느 어항에?' }));
    for (const t of tanks) box.append(btn(`${t.name} (${t.n}/${t.def.cap})`, 'ghost small', () => srv({ type: 'tank-put', uid: t.uid, code: f.code }), t.n >= t.def.cap));
    renderFishModal(box);
  }
  function friendsList() { return (S().friends?.friends || []); }
  function showFriendChoice(kind, f) {
    const fr = friendsList();
    const u = U();
    if (!fr.length) { renderFishModal(el('p', { class: 'note', text: '친구가 없어요. 👥 친구에서 먼저 추가해 주세요.' })); return; }
    const left = kind === 'gift' ? u.fishGiftLeft : u.tradesLeft;
    const box = el('div', {}, el('p', { class: 'note', text: kind === 'gift' ? `누구에게 선물할까요? (오늘 ${left}번 남음)` : `누구와 교환할까요? (오늘 ${left}번 남음)` }));
    const row = el('div', { class: 'row' });
    for (const p of fr) {
      row.append(btn(`${p.nickname}`, 'ghost small', () => {
        if (kind === 'gift') {
          if (confirm(`${p.nickname}(@${p.username})님에게 #${f.code} ${eul(f.name)} 선물할까요?`)) srv({ type: 'fish-gift', username: p.username, code: f.code });
        } else {
          tradeTarget = { username: p.username, nickname: p.nickname, give: f.code };
          srv({ type: 'fish-view', username: p.username });
          renderFishModal(el('p', { class: 'note', text: `${p.nickname}님의 가방을 보는 중…` }));
        }
      }, left < 1, '@' + p.username));
    }
    box.append(row);
    renderFishModal(box);
  }
  let tradeTarget = null;
  function showTradePick(m) {
    if (!tradeTarget || tradeTarget.username !== m.username) return;
    const give = FISH()[tradeTarget.give];
    const box = el('div', {}, el('p', { class: 'note', text: `${m.nickname}님의 물고기 중 받고 싶은 걸 골라요. 내 #${give.code} ${eul(give.name)} 줄게요.` }));
    const list = el('ul', { class: 'fishrow small-row' });
    const codes = Object.keys(m.inv || {}).filter((k) => m.inv[k] > 0 && FISH()[k]).sort();
    for (const code of codes) {
      const f = FISH()[code];
      list.append(el('li', { title: f.name },
        FishArt.thumb(f, 40), el('span', { text: `#${code}` }), el('span', { text: f.name }),
        btn('이걸로', 'primary small', () => {
          srv({ type: 'trade-offer', username: m.username, give: give.code, get: code });
          tradeTarget = null;
          renderFishModal(el('p', { class: 'note', text: '교환을 신청했어요! 친구가 수락하면 바뀌어요.' }));
        })));
    }
    if (!codes.length) list.append(el('li', { class: 'note', text: '친구 가방이 비어 있어요.' }));
    box.append(list);
    renderFishModal(box);
  }

  // ------------------------------------------------------------ 출석
  function renderAttend() {
    const u = U(), c = C();
    if (!u || !c) return;
    $('attendDot').hidden = !!u.attend.today;
    if ($('attendModal').hidden) return;
    const doneInCycle = u.attend.today ? ((u.attend.count - 1) % 7) + 1 : u.attend.count % 7;
    const grid = $('attendGrid'); grid.textContent = '';
    for (let d = 1; d <= 7; d++) {
      const reward = d < 7 ? `🪙${c.attendance.coins[d - 1]}` : '🎁';
      const cls = d <= doneInCycle ? 'done' : (!u.attend.today && d === doneInCycle + 1 ? 'today' : '');
      grid.append(el('div', { class: cls }, `${d}일`, el('b', { text: d <= doneInCycle ? '✅' : reward }), d < 7 ? '코인' : '액세서리'));
    }
    $('checkinBtn').disabled = !!u.attend.today;
    $('checkinBtn').textContent = u.attend.today ? '오늘은 출석했어요 ✅' : `오늘 출석하기 (${doneInCycle + 1}일째)`;
    $('attendNote').textContent = `지금까지 ${u.attend.count}번 출석했어요.`;
  }
  $('attendBtn').onclick = () => { $('attendModal').hidden = false; renderAttend(); };
  $('closeAttend').onclick = () => { $('attendModal').hidden = true; };
  $('checkinBtn').onclick = () => srv({ type: 'checkin' });

  // ------------------------------------------------------------ 도감
  // 한 장에 한 마리씩 넘겨 보는 도감
  // 🔮 신비 등급은 따로 한 칸에 모아 보여 줘요
  const dexList = (cat) => Object.values(FISH()).filter((f) => (cat === 'X' ? f.rar === 'X' : f.cat === cat && f.rar !== 'X')).sort((a, b) => a.code.localeCompare(b.code));
  function fitsOf(f) {
    const c = C();
    const tanks = Object.entries(c.items).filter(([, it]) => it.tank).map(([, it]) => ({ name: it.name, ok: it.tank.allow.includes(f.cat) }));
    return [...tanks, { name: '아쿠아리움', ok: f.cat !== 'T' }];
  }
  function renderDex(turn) {
    const u = U(), c = C();
    if (!u || !c) return;
    const all = Object.values(FISH());
    const known = all.filter((f) => u.dex[f.code]).length;
    $('dexCount').textContent = `📖 ${known} / ${all.length}`;
    $('dexBar').style.width = (known / all.length * 100) + '%';
    $('dexNothing').textContent = `꽝 확률 ${c.nothingChance}%`;
    // 탭 이름에 모은 수
    $('dexTabs').querySelectorAll('button').forEach((b) => {
      const L = dexList(b.dataset.dex);
      const n = L.filter((f) => u.dex[f.code]).length;
      b.textContent = `${{ S: '작은', M: '중간', L: '큰', X: '🔮 신비', T: '쓰레기' }[b.dataset.dex]} ${n}/${L.length}`;
      b.classList.toggle('active', b.dataset.dex === dexFilter);
    });
    const list = dexList(dexFilter);
    if (!list.length) return;
    const i = dexPageOf[dexFilter] = clamp(dexPageOf[dexFilter], 0, list.length - 1);
    const f = list[i];
    const d = u.dex[f.code];
    const r = rar(f);
    const page = $('dexPage');
    if (turn) { page.classList.remove('turn-next', 'turn-prev'); void page.offsetWidth; page.classList.add(turn > 0 ? 'turn-next' : 'turn-prev'); }
    $('dexCode').textContent = `#${f.code}`;
    $('dexPageNo').textContent = `${i + 1} / ${list.length}쪽`;
    // 그림 (못 잡은 건 그림자)
    const cv = $('dexPic'), g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    const bm = FishArt.bitmap(f);
    const k = Math.max(1, Math.floor(Math.min((cv.width - 24) / bm.width, (cv.height - 24) / bm.height)));
    g.imageSmoothingEnabled = false;
    g.drawImage(bm, Math.round((cv.width - bm.width * k) / 2), Math.round((cv.height - bm.height * k) / 2), bm.width * k, bm.height * k);
    if (!d) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(38,36,48,0.92)'; g.fillRect(0, 0, cv.width, cv.height); g.globalCompositeOperation = 'source-over'; }
    $('dexName').textContent = d ? f.name : '???';
    const badge = $('dexRar'); badge.textContent = r.name; badge.style.background = r.color;
    $('dexCat').textContent = CAT_NAME[f.cat];
    const myRod = C().rods?.[U()?.rod];
    $('dexChance').textContent = myRod && U().rod !== 'rod1' ? `${f.chance}% → 내 낚싯대 ${myRod.chance[f.code]}%` : `${f.chance}% (한 번 던질 때)`;
    $('dexSize').textContent = f.size ? `${f.size[0]}~${f.size[1]}cm` : '-';
    $('dexPrice').textContent = f.cat === 'T' ? `재활용 🪙${f.price}` : `🪙${f.price}`;
    $('dexMine').textContent = d ? `${d.n}마리 잡음${d.best ? ` · 최고 ${d.best}cm` : ''} · 가방에 ${u.fishInv[f.code] || 0}마리` : '아직 못 잡았어요';
    const fit = $('dexFit'); fit.textContent = '';
    if (f.cat === 'T') fit.append(el('span', { class: 'no', style: 'grid-column: 1 / -1', text: '어항에 넣을 수 없어요 · 재활용해 주세요 ♻️' }));
    else for (const x of fitsOf(f)) fit.append(el('span', { class: x.ok ? 'ok' : 'no', text: x.name }));
    $('dexMore').hidden = !(u.fishInv[f.code] > 0);
    $('dexPrev').disabled = i === 0;
    $('dexNext').disabled = i === list.length - 1;
    // 아래 썸네일 줄: 눌러서 바로 그 쪽으로
    const strip = $('dexStrip'); strip.textContent = '';
    list.forEach((x, j) => {
      const b = el('button', { class: j === i ? 'on' : '', title: u.dex[x.code] ? x.name : '???', onclick: () => { const dir = j - dexPageOf[dexFilter]; dexPageOf[dexFilter] = j; renderDex(dir); } },
        el('small', { text: x.code }), FishArt.thumb(x, 30, !u.dex[x.code]));
      b.style.borderColor = j === i ? '' : (u.dex[x.code] ? rar(x).color + '88' : '');
      strip.append(b);
    });
    strip.children[i]?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }
  function dexTurn(dir) {
    const list = dexList(dexFilter);
    const next = clamp(dexPageOf[dexFilter] + dir, 0, list.length - 1);
    if (next === dexPageOf[dexFilter]) return;
    dexPageOf[dexFilter] = next;
    renderDex(dir);
  }
  $('dexPrev').onclick = () => dexTurn(-1);
  $('dexNext').onclick = () => dexTurn(1);
  $('dexMore').onclick = () => { const f = dexList(dexFilter)[dexPageOf[dexFilter]]; if (f) openFish(f.code); };
  addEventListener('keydown', (e) => {
    if (!$('pane-dex').classList.contains('active') || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
    if (e.key === 'ArrowLeft') dexTurn(-1);
    if (e.key === 'ArrowRight') dexTurn(1);
  });
  // 잡은 직후 도감을 열면 그 물고기 쪽으로
  function showInDex(code) {
    const f = FISH()[code]; if (!f) return;
    dexFilter = f.cat;
    dexPageOf[f.cat] = dexList(f.cat).findIndex((x) => x.code === code);
    openTab('dex');
    renderDex();
  }

  // ------------------------------------------------------------ 낚시
  const fishing = { state: 'idle', t: 0, biteAt: 0, end: 0, msg: '', msgT: 0, splash: 0, pop: null };
  // 같이 낚시: 같은 집에 있는 사람 중 낚시 탭을 연 사람들이 물가에 같이 앉아 있음
  const fishPeers = new Map(); // peerId -> { here, state, kind, code, size, t }
  let fishHereSent = null;
  function syncFishHere() {
    if (H.isMini) return;   // 미니맵 창은 같은 연결을 쓰니까 알리지 않음
    // 낚시 탭에 있으면 창을 닫아도 낚시터에 있는 걸로 (미니맵에 낚시터가 보임)
    const inFishing = $('pane-fishing').classList.contains('active');
    if (inFishing !== fishViewSent) { fishViewSent = inFishing; buddy.send('fishing-view', inFishing); }
    const on = inFishing && H.S?.net === 'online';
    if (on !== fishHereSent && H.S?.session) { fishHereSent = on; srv({ type: 'fish-here', on }); }
  }
  let fishViewSent = null;
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => setTimeout(syncFishHere, 0)));
  function fishersHere() {
    return (H.S?.peers || []).filter((p) => { const f = fishPeers.get(p.id); return f ? f.here : p.fishing; }).slice(0, 5);
  }
  function onFishPeer(m) {
    const prev = fishPeers.get(m.id) || {};
    fishPeers.set(m.id, { ...prev, here: m.here !== false, state: m.state || 'idle', kind: m.kind, code: m.code, size: m.size, rod: m.rod || prev.rod, t: performance.now(), t0: performance.now() });
    if (m.state === 'result' && m.kind === 'catch') {
      const p = (H.S?.peers || []).find((x) => x.id === m.id), f = FISH()[m.code];
      if (p && f && !H.isMini && $('pane-fishing').classList.contains('active')) H.toast(`🎣 ${p.nickname}님이 ${f.name}${m.size ? `(${m.size}cm)` : ''}을(를) 낚았어요!`);
    }
  }
  // 🎨 낚시터 배경 (시간 × 계절): 각자 고르고, 나한테만 보임
  let scene = { time: 'auto', season: 'auto' };
  try { const v = JSON.parse(localStorage.getItem('fishScene') || 'null'); if (v && typeof v === 'object') scene = { time: String(v.time || 'auto'), season: String(v.season || 'auto') }; } catch {}
  if (!H.isMini) {
    $('sceneTime').value = scene.time; $('sceneSeason').value = scene.season;
    if (!$('sceneTime').value) $('sceneTime').value = 'auto';
    if (!$('sceneSeason').value) $('sceneSeason').value = 'auto';
    const saveScene = () => {
      scene = { time: $('sceneTime').value, season: $('sceneSeason').value };
      try { localStorage.setItem('fishScene', JSON.stringify(scene)); } catch {}
    };
    $('sceneTime').onchange = saveScene; $('sceneSeason').onchange = saveScene;
  }
  addEventListener('storage', (e) => {   // 큰 창에서 바꾸면 미니맵도 같이
    if (e.key !== 'fishScene') return;
    try { const v = JSON.parse(e.newValue || 'null'); if (v) scene = { time: String(v.time || 'auto'), season: String(v.season || 'auto') }; } catch {}
  });
  // 낚시터 말풍선: 낚시하면서 친 채팅이 머리 위에 잠깐 보임
  const fishSay = new Map();   // pid('me' 또는 peerId) -> { text, t }
  buddy.on('chat', (m) => { if (m.pid && !m.system) fishSay.set(m.pid, { text: String(m.text || ''), t: performance.now() }); });
  // ✨ 잡은 물고기 자랑: 머리 위로 들어 올림
  const SHOW_SEC = 4.5;
  function showOff(r) {
    if (!FISH()[r.code]) return;
    fishing.show = { code: r.code, size: r.size, at: performance.now() };
    srv({ type: 'fish-show', code: r.code, size: r.size || 0 });
  }
  function onFishShow(m) {
    if (!FISH()[m.code]) return;
    if (!fishPeers.has(m.id)) fishPeers.set(m.id, { here: true, state: 'idle', t: performance.now(), t0: performance.now() });
    fishPeers.get(m.id).show = { code: m.code, size: m.size, at: performance.now() };
  }
  const recent = [];
  $('castBtn').onclick = () => {
    if (fishing.state === 'idle' || fishing.state === 'result') {
      srv({ type: 'fish-cast' });
      fishing.state = 'casting'; fishing.t = 0; fishing.msg = '';
      updateCastBtn();
    } else if (fishing.state === 'waiting' || fishing.state === 'bite') {
      srv({ type: 'fish-reel' });
      fishing.state = 'reeling'; fishing.t = 0;
      updateCastBtn();
    }
  };
  function updateCastBtn() {
    const b = $('castBtn');
    const u = U();
    b.classList.toggle('bite', fishing.state === 'bite');
    b.textContent = { idle: '🎣 던지기', result: '🎣 다시 던지기', casting: '던지는 중…', waiting: '당기기', bite: '❗ 걸렸다! 당기기', reeling: '감는 중…' }[fishing.state];
    b.disabled = fishing.state === 'casting' || fishing.state === 'reeling' || (u && u.castsLeft <= 0 && (fishing.state === 'idle' || fishing.state === 'result'));
    if (u) $('castInfo').textContent = u.castsLeft >= 9999 ? '횟수 제한 없음 🎣' : `오늘 ${u.castsLeft}번 남음`;
  }
  function onFishCast(m) {
    fishing.state = 'waiting';
    fishing.t = 0;
    fishing.biteAt = performance.now() + m.wait;
    fishing.end = fishing.biteAt + m.window;
    updateCastBtn();
  }
  function onFishResult(m) {
    fishing.state = 'result'; fishing.t = 0; fishing.splash = 1; fishing.kind = m.kind;
    if (m.kind === 'catch') fishing.pop = { code: m.code, t: 1.6 };
    const text = { early: '너무 빨랐어요! 물고기가 도망갔어요 💨', late: '앗, 놓쳤어요… 😢', nothing: '꽝! 아무것도 없어요 🫥' }[m.kind];
    if (text) { fishing.msg = text; fishing.msgT = 3; }
    if (m.kind === 'catch') showCatch(m);
    updateCastBtn();
  }
  function showCatch(m) {
    const f = FISH()[m.code];
    if (!f) return;
    const r = rar(f);
    recent.unshift({ code: m.code, size: m.size });
    if (recent.length > 12) recent.pop();
    renderRecent();
    fishing.msg = `${eul(f.name)} 낚았어요!`; fishing.msgT = 3;
    $('catchModal').hidden = false;
    const badge = $('catchBadge'); badge.textContent = `${r.name} · ${CAT_NAME[f.cat]}`; badge.style.background = r.color;
    const cv = $('catchCanvas'), g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    const grad = g.createRadialGradient(cv.width / 2, cv.height / 2, 10, cv.width / 2, cv.height / 2, cv.width / 2);
    grad.addColorStop(0, r.color + '55'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, cv.width, cv.height);
    const bm = FishArt.bitmap(f);
    const k = Math.max(1, Math.floor(Math.min((cv.width - 20) / bm.width, (cv.height - 20) / bm.height)));
    g.imageSmoothingEnabled = false;
    g.drawImage(bm, (cv.width - bm.width * k) / 2, (cv.height - bm.height * k) / 2, bm.width * k, bm.height * k);
    $('catchName').textContent = `#${f.code} ${f.name} 📖`;
    lastCatch = f.code;
    const bits = [];
    if (m.size) bits.push(`${m.size}cm`);
    if (m.isNew) bits.push('📖 도감에 새로 등록!');
    if (m.record) bits.push('🏆 최고 기록!');
    bits.push(`확률 ${f.chance}%`);
    $('catchInfo').textContent = bits.join(' · ');
    $('catchOk').textContent = f.cat === 'T' ? '버려진 걸 주웠어요 ♻️' : (f.rar === 'L' ? '전설이다!! 🎉' : f.rar === 'X' ? '신비한 생물이다!! 🔮' : '좋아요!');
  }
  let lastCatch = null;
  $('catchOk').onclick = () => { $('catchModal').hidden = true; };
  $('catchName').onclick = () => { $('catchModal').hidden = true; if (lastCatch) showInDex(lastCatch); };
  $('catchName').title = '도감에서 보기';
  $('catchName').style.cursor = 'pointer';
  function renderRecent() {
    const ul = $('recentList'); ul.textContent = '';
    for (const r of recent) {
      const f = FISH()[r.code];
      if (!f) continue;
      const dex = el('button', { class: 'dex-mini', text: '📖', title: '도감에서 보기', onclick: (e) => { e.stopPropagation(); openFish(r.code); } });
      ul.append(el('li', { onclick: () => showOff(r), title: `${f.name} 자랑하기` }, dex, FishArt.thumb(f, 40), el('span', { text: f.name }), r.size ? el('span', { class: 'note-inline', text: r.size + 'cm' }) : null));
    }
    if (!recent.length) ul.append(el('li', { class: 'note', style: 'width:auto;border:0', text: '아직 없어요' }));
  }
  // 낚시 상태 갱신 (찌가 물렸는지, 너무 늦었는지) — 그리기와 따로 매 프레임
  function updateFishing(dt) {
    if (fishing.state === 'waiting' && performance.now() >= fishing.biteAt) { fishing.state = 'bite'; updateCastBtn(); }
    // 입질(!)이 온 뒤에는 물고기가 계속 걸려 있음 — 자동으로 당기지 않고, 늦게 당겨도 안 놓침
    fishing.t += dt;
    if (fishing.msgT > 0) fishing.msgT -= dt;
    fishing.splash = Math.max(0, fishing.splash - dt);
    if (fishing.pop) { fishing.pop.t -= dt; if (fishing.pop.t <= 0) fishing.pop = null; }
  }
  // 낚시터 안에 있는지 (큰 집 창: 낚시 탭 / 미니맵: 큰 창에서 낚시터에 있을 때)
  const fishingActive = () => (H.isMini ? !!H.S?.fishing : $('pane-fishing').classList.contains('active'));
  function fishClick() {   // 화면을 눌러도 던지기 · 당기기
    if (!$('castBtn').disabled) $('castBtn').click();
  }

  // ------------------------------------------------------------ 큰 낚시터 그리기 (집 그림 자리, W×H 논리 좌표)
  const SLOT_X = (i) => 70 + i * 92;
  const DECK_Y = 410, WATER_Y = 300;
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }
  function namePill(g, text, cx, bottom, mine, fs, profile) {
    g.font = `bold ${fs}px ${FONT}`;
    const w = g.measureText(text).width + fs * 1.2, h = fs * 1.7;
    g.fillStyle = mine ? 'rgba(30,30,40,0.78)' : 'rgba(40,60,110,0.85)';
    roundRect(g, cx - w / 2, bottom - h, w, h, h / 2);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const t = performance.now() / 1000;
    if (profile && window.NickFX) NickFX.fillName(g, text, cx, bottom - h / 2 + 0.5, undefined, profile, t);
    else { g.fillStyle = '#fff'; g.fillText(text, cx, bottom - h / 2 + 0.5); }
    g.textBaseline = 'alphabetic';
    return bottom - h;
  }
  function drawFisher(g, i, who, st, t, mini) {
    const x = SLOT_X(i), y = DECK_Y;
    const fs = mini ? 19 : 13;
    // 낚싯대 끝 (그림은 캐릭터 · 이름표 위에 맨 나중에 그림)
    const tip = { x: x + 84, y: y - 96 };
    // 찌
    const rest = { x: x + 80, y: 452 + (i % 2) * 26 };
    let bob = null;
    const s = st.state;
    if (s === 'casting') { const k = Math.min(1, st.t / 0.6); bob = { x: tip.x + (rest.x - tip.x) * k, y: tip.y + (rest.y - tip.y) * k - Math.sin(k * Math.PI) * 60 }; }
    else if (s === 'waiting') bob = { x: rest.x, y: rest.y + Math.sin(t * 3 + i) * 2 };
    else if (s === 'bite') bob = { x: rest.x + Math.sin(t * 40) * 3, y: rest.y + 6 + Math.sin(t * 25) * 4 };
    else if (s === 'reeling') { const k = Math.min(1, st.t / 0.5); bob = { x: rest.x + (tip.x - rest.x) * k, y: rest.y + (tip.y - rest.y) * k }; }
    if (bob) {
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(tip.x, tip.y); g.lineTo(bob.x, bob.y); g.stroke();
      g.fillStyle = '#e04a3a'; g.fillRect(Math.round(bob.x) - 5, Math.round(bob.y) - 7, 10, 7);
      g.fillStyle = '#fff'; g.fillRect(Math.round(bob.x) - 5, Math.round(bob.y), 10, 5);
      if (s === 'waiting' || s === 'bite') {
        g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.5;
        const rr = 9 + ((t * 10 + i * 3) % 12);
        g.beginPath(); g.ellipse(bob.x, bob.y + 5, rr, rr / 3, 0, 0, Math.PI * 2); g.stroke();
      }
      if (s === 'bite') {
        g.fillStyle = '#fff'; roundRect(g, bob.x + 10, bob.y - 44, 24, 32, 6);
        g.fillStyle = '#e04a3a'; g.font = `bold 24px ${FONT}`; g.textAlign = 'center'; g.fillText('!', bob.x + 22, bob.y - 19);
      }
    }
    // 잡은 물고기가 물 위로 튀어 오름
    if (st.pop) {
      const f = FISH()[st.pop.code];
      if (f) {
        const k = 1 - st.pop.t / 1.6;
        const bm = FishArt.bitmap(f);
        const sc = Math.max(2, Math.min(4, Math.floor(60 / Math.max(bm.width, bm.height))));
        g.imageSmoothingEnabled = false;
        g.drawImage(bm, rest.x - bm.width * sc / 2, rest.y - 20 - Math.sin(k * Math.PI) * 90 - bm.height * sc / 2, bm.width * sc, bm.height * sc);
      }
    }
    // 캐릭터 (부두에 앉아 물 쪽을 봄)
    const skin = window.Skins && Skins.get(who.username, who.skin);
    let drawn = 0;
    if (skin) drawn = Skins.draw(g, skin, 'sit', x, y, 56, 1, 0);
    if (!drawn) {
      const happy = s === 'result' && st.kind === 'catch' && st.t < 3;
      Sprites.drawPet(g, x - 24, y - 48, { species: who.species || 'cat', scale: 3, palette: Sprites.palette(who.color || '#f2a65a'), legs: 'sit', eyes: happy ? 'happy' : 'open', acc: who.acc || {}, flip: true });
    }
    // 이름표 + 결과 말풍선
    const crown = showCrownDock(who.username) ? '👑 ' : '';
    let top = namePill(g, crown + (who.mine ? `나 · ${who.nickname}` : who.nickname), x + 4, y - 62, who.mine, fs, who);
    // 낚싯대 (종류마다 그림이 다름) — 캐릭터보다 위, 3배 크기라 줄여 보여도 덜 뭉개짐
    RodArt.drawAt(g, C()?.rods?.[who.rod] ? who.rod : 'rod1', tip.x, tip.y, 54);
    if (who.rod === 'rod7') { g.fillStyle = `rgba(255,220,120,${0.5 + 0.5 * Math.sin(t * 6)})`; g.fillRect(tip.x - 4, tip.y - 4, 8, 8); }   // 전설의 낚싯대는 반짝
    // ✨ 자랑: 물고기를 머리 위로 번쩍
    const sh = st.show && (performance.now() - st.show.at) / 1000 < SHOW_SEC ? st.show : null;
    const sf = sh && FISH()[sh.code];
    if (sf) {
      const age = (performance.now() - sh.at) / 1000;
      const bm = FishArt.bitmap(sf);
      const sc = Math.max(2, Math.min(4, Math.floor(64 / Math.max(bm.width, bm.height))));
      const lift = Math.min(1, age / 0.35);
      const fw = bm.width * sc, fh = bm.height * sc;
      const fy = top - 8 - fh - lift * 6 + Math.sin(t * 5) * 2 - (i % 2) * 34;   // 옆자리와 안 겹치게 번갈아 높이
      // 반짝이
      g.fillStyle = `rgba(255,230,140,${0.35 + 0.25 * Math.sin(t * 8)})`;
      g.beginPath(); g.ellipse(x + 4, fy + fh / 2, fw / 2 + 12, fh / 2 + 10, 0, 0, Math.PI * 2); g.fill();
      g.imageSmoothingEnabled = false;
      g.drawImage(bm, x + 4 - fw / 2, fy, fw, fh);
      g.fillStyle = '#fff6b0';
      for (let k = 0; k < 4; k++) { const a = t * 2 + k * 1.57; g.fillRect(Math.round(x + 4 + Math.cos(a) * (fw / 2 + 10)) - 2, Math.round(fy + fh / 2 + Math.sin(a) * (fh / 2 + 8)) - 2, 4, 4); }
      const txt = `✨ ${sf.name}${sh.size ? ` ${sh.size}cm` : ''}`;
      g.font = `bold ${fs}px ${FONT}`;
      const w = g.measureText(txt).width + fs, h = fs * 1.8;
      g.fillStyle = rar(sf).color;
      roundRect(g, x + 4 - w / 2, fy - h - 6, w, h, 8);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(txt, x + 4, fy - h / 2 - 6); g.textBaseline = 'alphabetic';
      top = fy - h - 6;
    }
    // 💬 채팅 말풍선
    const say = fishSay.get(who.mine ? 'me' : who.id);
    if (say && !sf && (performance.now() - say.t) / 1000 < 5) {
      g.font = `${fs}px ${FONT}`;
      let txt = say.text;
      while (txt.length > 1 && g.measureText(txt).width > 170) txt = txt.slice(0, -2) + '…';
      const w = g.measureText(txt).width + fs * 1.2, h = fs * 1.8, by = top - h - 10 - (i % 2) * (h + 6);   // 옆자리 말풍선과 번갈아
      g.fillStyle = 'rgba(255,255,255,0.96)'; roundRect(g, x + 4 - w / 2, by, w, h, 9);
      g.beginPath(); g.moveTo(x - 2, by + h); g.lineTo(x + 10, by + h); g.lineTo(x + 4, by + h + 6); g.fill();
      g.fillStyle = '#333'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(txt, x + 4, by + h / 2 + 0.5); g.textBaseline = 'alphabetic';
      return;
    }
    if (sf) return;
    if (s === 'result' && st.t < 3.5 && !who.mine) {
      const f = st.kind === 'catch' ? FISH()[st.code] : null;
      const txt = f ? `🎣 ${f.name}!` : { early: '너무 빨랐다!', late: '놓쳤다…', nothing: '꽝!' }[st.kind] || '';
      if (txt) {
        g.font = `bold ${fs}px ${FONT}`;
        const w = g.measureText(txt).width + fs, h = fs * 1.8;
        g.fillStyle = f ? rar(f).color : 'rgba(255,255,255,0.95)';
        roundRect(g, x + 4 - w / 2, top - h - 6, w, h, 8);
        g.fillStyle = f ? '#fff' : '#333'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(txt, x + 4, top - h / 2 - 6); g.textBaseline = 'alphabetic';
      }
    }
  }
  function drawFishing(g, W, Hh, mini) {
    const t = performance.now() / 1000;
    g.imageSmoothingEnabled = false;
    // 하늘 · 건너편 · 물 (고른 시간 · 계절)
    FishScene.back(g, W, Hh, scene, t);
    // 부두 (기둥 → 바닥판)
    g.fillStyle = '#4a2e1e';
    for (let x = 30; x < W - 40; x += 120) { g.fillRect(x, DECK_Y + 10, 14, Hh - DECK_Y); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x, DECK_Y + 10, 14, 8); g.fillStyle = '#4a2e1e'; }
    g.fillStyle = '#8a5a3c'; g.fillRect(0, DECK_Y, W - 40, 14);
    g.fillStyle = '#6e452c'; for (let x = 0; x < W - 40; x += 36) g.fillRect(x, DECK_Y, 2, 14);
    g.fillStyle = '#a8703f'; g.fillRect(0, DECK_Y, W - 40, 3);
    // 낚시하는 사람들: 나는 맨 왼쪽, 같이 들어온 친구들은 옆으로
    const u = U();
    const self = H.S?.self || {};
    const meSt = mini ? { state: 'idle', t: 9 } : { ...fishing, kind: fishing.kind, pop: fishing.pop, show: fishing.show };
    drawFisher(g, 0, { mine: true, nickname: u?.nickname || '나', username: u?.username, skin: self.skin, species: u?.species, color: u?.color, acc: u?.acc?.eq, rod: u?.rod }, meSt, t, mini);
    const list = fishersHere();
    list.forEach((p, i) => {
      const st = fishPeers.get(p.id) || { state: 'idle' };
      const age = (performance.now() - (st.t0 || st.t || 0)) / 1000;
      const view = { state: st.state === 'waiting' && age > 15 ? 'idle' : st.state, t: age, kind: st.kind, code: st.code,
        pop: st.state === 'result' && st.kind === 'catch' && age < 1.6 ? { code: st.code, t: 1.6 - age } : null };
      view.show = st.show;
      drawFisher(g, i + 1, { ...p, rod: st.rod || p.rod }, view, t, mini);
    });
    FishScene.front(g, W, Hh, scene, t);   // 눈 · 꽃잎 · 낙엽 · 반딧불
    // 내 낚시 결과 · 물보라
    if (!mini && fishing.splash > 0) {
      g.fillStyle = `rgba(255,255,255,${fishing.splash})`;
      const bx = SLOT_X(0) + 80;
      for (let i = 0; i < 8; i++) g.fillRect(bx - 20 + i * 6, 445 - (1 - fishing.splash) * 30 - (i % 3) * 6, 4, 4);
    }
    // 맨 위: 낚시터 인원 · 내 메시지
    const fs = mini ? 28 : 14;
    g.font = `bold ${fs}px ${FONT}`; g.textAlign = 'left';
    const label = `🎣 낚시터 · ${list.length + 1}명`;
    const lw = g.measureText(label).width + fs * 1.4;
    g.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(g, 12, 12, lw, fs * 2, fs);
    g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(label, 12 + fs * 0.7, 12 + fs); g.textBaseline = 'alphabetic';
    if (!mini && fishing.msgT > 0 && fishing.msg) {
      g.font = `bold 18px ${FONT}`; g.textAlign = 'center';
      const w = g.measureText(fishing.msg).width + 36;
      g.globalAlpha = Math.min(1, fishing.msgT * 2);
      g.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(g, W / 2 - w / 2, 70, w, 40, 20);
      g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(fishing.msg, W / 2, 90); g.textBaseline = 'alphabetic';
      g.globalAlpha = 1;
    }
    if (!mini && fishing.state === 'idle' && !fishing.msgT) {
      g.font = `14px ${FONT}`; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,0.9)';
      g.fillText('화면을 누르거나 오른쪽 🎣 던지기를 눌러요', W / 2, Hh - 24);
    }
  }

  // ------------------------------------------------------------ 펫 (관리 탭)
  const petRename = { id: null, draft: null }; // 이름 고치는 중인 펫 (화면이 새로 그려져도 유지)
  function renderPets() {
    const u = U(), c = C();
    if (!u || !c) return;
    const outN = u.pets.filter((p) => p.out).length;
    $('petNote').textContent = u.pets.length
      ? `${u.pets.length}/${c.limits.petsMax}마리 · 집에 꺼내 둔 펫 ${outN}/${c.limits.petsOut} · 👀 공개 펫은 친구들도 보고, 🔒 나만 보기 펫은 나만 봐요`
      : '아직 키우는 펫이 없어요. 🛒 상점 → 펫에서 데려올 수 있어요!';
    const ul = $('petList'); ul.textContent = '';
    const myPetFoods = Object.keys(u.food).filter((k) => c.petFoods[k] && !c.petFoods[k].tank && u.food[k] > 0);
    for (const p of u.pets) {
      const kind = c.pets[p.kind];
      const bar = (cls, v) => el('span', { class: 'bar ' + cls }, el('i', { style: `width:${v}%` }));
      const sel = el('select', {});
      for (const id of myPetFoods) {
        const liked = kind.likes.includes(id);
        sel.append(el('option', { value: id, text: `${c.petFoods[id].icon} ${c.petFoods[id].name} ×${u.food[id]}${liked ? ' ❤' : ''}` }));
      }
      const acts = el('div', { class: 'acts' });
      if (p.out) acts.append(btn('🏠 집 안으로 넣기', 'ghost small', () => srv({ type: 'pet-out', id: p.id, out: false })));
      else {
        acts.append(btn('2층에 꺼내기', 'ghost small', () => srv({ type: 'pet-out', id: p.id, out: true, floor: 2 }), outN >= c.limits.petsOut));
        acts.append(btn('1층에 꺼내기', 'ghost small', () => srv({ type: 'pet-out', id: p.id, out: true, floor: 1 }), outN >= c.limits.petsOut));
      }
      // 공개 / 나만 보기
      acts.append(btn(p.private ? '🔒 나만 보기' : '👀 친구들에게 공개', p.private ? 'ghost small private-on' : 'ghost small', () => srv({ type: 'pet-private', id: p.id, private: !p.private }), false,
        p.private ? '지금은 나만 봐요. 누르면 친구들에게도 보여요' : '지금은 친구들도 봐요. 누르면 나만 보게 바뀌어요'));
      if (myPetFoods.length) { acts.append(sel); acts.append(btn('밥 주기', 'primary small', () => srv({ type: 'feed', food: sel.value, target: p.id }), p.full >= 98)); }
      else acts.append(el('span', { class: 'note-inline', text: '먹이가 없어요 (상점 → 음식)' }));
      // 되팔기: 산 값의 절반 (운영자 펫은 안 됨)
      if (kind.secret) acts.append(el('span', { class: 'note-inline', text: '✨ 운영자 펫' }));
      else if (kind.price) {
        const back = Math.floor(kind.price / 2);
        acts.append(btn(`되팔기 🪙${back}`, 'ghost small', () => { if (confirm(`'${p.name}'을(를) 되팔까요?\n산 값의 절반인 🪙${back}을 돌려받고, 펫은 사라져요. (되돌릴 수 없어요)`)) srv({ type: 'pet-sell', id: p.id }); }, false, '산 값의 절반을 돌려받아요'));
      }
      // 이름 바꾸기: Electron에선 prompt()가 안 돼서 그 자리에서 입력칸으로 바꿔요
      let nameEl;
      if (petRename.id === p.id) {
        const inp = el('input', { type: 'text', maxLength: 10, value: petRename.draft ?? p.name, class: 'pet-name-input', placeholder: kind.name });
        const done = (ok) => {
          if (ok) srv({ type: 'pet-rename', id: p.id, name: inp.value.trim() });
          petRename.id = null; petRename.draft = null; renderPets();
        };
        inp.addEventListener('input', () => { petRename.draft = inp.value; });
        inp.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && !e.isComposing) done(true);
          else if (e.key === 'Escape') done(false);
        });
        nameEl = el('span', { class: 'pet-rename' }, inp,
          btn('저장', 'primary small', () => done(true)), btn('취소', 'ghost small', () => done(false)));
        // 처음 열 때만 전체 선택, 화면이 새로 그려질 땐 커서를 끝에 둬요
        setTimeout(() => { inp.focus(); if (petRename.draft == null) inp.select(); else inp.setSelectionRange(inp.value.length, inp.value.length); }, 0);
      } else {
        nameEl = el('b', { text: `${p.name} ` });
        acts.append(btn('✏️ 이름', 'ghost small', () => { petRename.id = p.id; petRename.draft = null; renderPets(); }, false, '이름 바꾸기 (10자까지)'));
      }
      ul.append(el('li', {},
        el('div', { class: 'top' }, PetArt.thumb(p.kind, 40),
          el('div', { class: 'who' }, nameEl, el('span', { class: 'note-inline', text: `Lv.${p.level}/5${p.level >= 5 ? ' ⭐' : ''}` }),
            el('small', { text: `${kind.code} ${kind.name}${p.out ? ` · ${p.floor}층에 나와 있어요` : ' · 쉬는 중'}${p.private ? ' · 🔒 나만 보기' : ''} · 좋아하는 것: ${kind.likes.map((x) => c.petFoods[x]?.name).join(', ')}` }))),
        el('div', { class: 'bars' }, el('span', {}, '🍖 ', bar('full', p.full)), el('span', {}, '💗 ', bar('love', p.love)), el('span', { class: 'note-inline', text: p.level >= 5 ? '최고 레벨! 주인 이름을 부르며 인사해요' : `경험치 ${p.exp}/${p.next} · 밥 주기나 쓰다듬기(30초마다)로 올라요` })),
        acts));
    }
  }

  // ------------------------------------------------------------ 방 안에서 돌아다니는 펫
  const roomPets = new Map(); // id -> { x, y, tx, dir, t, hop, heart }
  // 집주인 펫은 집 안을 돌아다니고, 놀러 온 사람의 펫은 자기 주인을 졸졸 따라다님
  function visiblePets() {
    const v = H.viewing();
    if (!v) return [];
    const S = H.S;
    const all = !!S.view?.showAllPets;   // 친구들 펫 전부 보기
    const host = S.room && !S.room.isOwner ? (S.peers || []).find((p) => p.owner) : null;
    let homePets = v.editable ? (U()?.pets || []).filter((p) => p.out) : (S.room?.home?.pets || []);
    if (all && host && host.allPets) homePets = host.allPets.map((p, i) => ({ ...p, floor: homePets.find((x) => x.id === p.id)?.floor || (i % 2 ? 2 : 1) }));
    const list = homePets.map((p) => ({ ...p, follow: null }));
    if (S.room) {
      if (!S.room.isOwner) (U()?.pets || []).filter((p) => p.out).slice(0, 4).forEach((p, i) => list.push({ ...p, follow: 'me', idx: i }));
      for (const peer of S.peers || []) {
        if (peer.owner) continue;
        const theirs = all && peer.allPets ? peer.allPets : (peer.pets || []);
        theirs.slice(0, 12).forEach((p, i) => list.push({ ...p, follow: peer.id, idx: i }));
      }
    }
    return list;
  }
  function syncRoomPets() {
    const list = visiblePets();
    const ids = new Set(list.map((p) => p.id));
    for (const id of [...roomPets.keys()]) if (!ids.has(id)) roomPets.delete(id);
    for (const p of list) {
      let r = roomPets.get(p.id);
      if (p.follow) {
        if (!r || r.follow !== p.follow) {
          const ch = H.charOf(p.follow);
          r = { x: ch ? ch.x - 30 : rand(60, H.LADDER_X - 60), y: ch ? ch.y : H.band(1).max, tx: null, ty: null, dir: 1, t: 0, hop: 0, heart: 0, follow: p.follow };
          roomPets.set(p.id, r);
        }
        r.idx = p.idx || 0;
      } else {
        const b = H.band(p.floor || 1);
        if (!r || r.follow || r.floor !== p.floor) {
          r = { x: rand(60, H.LADDER_X - 60), y: rand(b.min, b.max), tx: null, ty: null, dir: 1, t: rand(1, 3), hop: 0, heart: 0, floor: p.floor };
          roomPets.set(p.id, r);
        }
      }
      r.p = p;
    }
  }
  function followOwner(r, dt) {
    const ch = H.charOf(r.follow);
    if (!ch) return;
    r.t += dt;
    const behind = ch.dir > 0 ? -1 : 1;
    const tx = clamp(ch.x + behind * (32 + r.idx * 26), 20, H.RW - 20), ty = ch.y + (r.idx % 2) * 3;
    const dx = tx - r.x, dy = ty - r.y, d = Math.hypot(dx, dy);
    if (d > 260) { r.x = tx; r.y = ty; return; }
    if (d > 2) {
      const sp = Math.max(55, d * 3) * dt;
      r.x += dx / d * Math.min(sp, d); r.y += dy / d * Math.min(sp, d);
      if (Math.abs(dx) > 0.5) r.dir = dx > 0 ? 1 : -1;
      r.hop = Math.abs(Math.sin(r.t * 9)) * 3;
    } else { r.hop = 0; r.dir = ch.dir > 0 ? 1 : -1; }
  }
  // 🐾 교감: 펫 주인 닉네임 (내 펫이면 내 닉네임)
  function ownerNick(r) {
    if (r.follow) return H.charOf(r.follow)?.profile?.nickname || '';
    const S = H.S;
    return S.room && !S.room.isOwner ? S.room.owner.nickname : (U()?.nickname || '');
  }
  const GREET = (n) => [`${n} 안녕!`, `${n}, 안녕~ 💕`, `${n} 좋아!`, `${n} 보고 싶었어!`];
  function petLine(r) {
    const p = r.p || {};
    const hungry = p.hungry ?? (p.full != null && p.full < 30);
    if (hungry) return Math.random() < 0.5 ? '배고파…' : '배고파… 밥 줘 🍖';
    if ((p.level || 1) >= 5) { const n = ownerNick(r); const g = GREET(n || '주인님'); return g[Math.floor(Math.random() * g.length)]; }
    return null;
  }
  function petTalk(r, dt) {
    if (r.say && (r.say.t -= dt) <= 0) r.say = null;
    if (r.exp && (r.exp.t -= dt) <= 0) r.exp = null;
    r.sayT = (r.sayT ?? rand(6, 20)) - dt;
    if (r.sayT <= 0) {
      r.sayT = rand(35, 75);
      const line = petLine(r);
      if (line) r.say = { text: line, t: 3.5 };
    }
  }
  function updateRoomPets(dt) {
    for (const r of roomPets.values()) {
      r.heart = Math.max(0, r.heart - dt);
      petTalk(r, dt);
      if (r.follow) { followOwner(r, dt); continue; }
      const b = H.band(r.floor || 1);
      if (r.tx != null) {
        const dx = r.tx - r.x, dy = r.ty - r.y, d = Math.hypot(dx, dy);
        const sp = 60 * dt;
        if (d <= sp) { r.x = r.tx; r.y = r.ty; r.tx = null; r.t = rand(2, 6); }
        else { r.x += dx / d * sp; r.y += dy / d * sp; if (Math.abs(dx) > 0.5) r.dir = dx > 0 ? 1 : -1; }
        r.hop = Math.abs(Math.sin(performance.now() / 110)) * 3;
      } else {
        r.hop = 0;
        if ((r.t -= dt) <= 0) { r.tx = clamp(r.x + rand(-140, 140), 30, H.LADDER_X - 40); r.ty = rand(b.min, b.max); }
      }
    }
  }
  function addThings(ctx, things) {
    for (const r of roomPets.values()) {
      things.push({ y: r.y, draw: () => {
        ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fillRect(Math.round(r.x - 12), Math.round(r.y - 2), 24, 3);
        PetArt.draw(ctx, r.p.kind, r.x, r.y, 3, r.dir < 0, r.hop);
        if (r.heart > 0) {
          ctx.globalAlpha = Math.min(1, r.heart * 2);
          ctx.font = `16px "Segoe UI Emoji","Apple Color Emoji",sans-serif`; ctx.textAlign = 'center';
          ctx.fillText('💗', r.x, r.y - 50 - (1.2 - r.heart) * 18);
          ctx.globalAlpha = 1;
        }
        // 이름표는 항상 보이게 (레벨도 같이)
        const label = `${r.p.name}${r.p.level ? ' Lv.' + r.p.level : ''}`;
        ctx.font = `bold 10px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = (r.p.level || 1) >= 5 ? 'rgba(160,90,10,0.8)' : 'rgba(0,0,0,0.55)';
        const w = ctx.measureText(label).width + 10;
        ctx.fillRect(Math.round(r.x - w / 2), Math.round(r.y - 40), w, 14);
        ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(label, r.x, r.y - 33); ctx.textBaseline = 'alphabetic';
        if (r.exp) {   // 쓰다듬기 경험치
          ctx.globalAlpha = Math.min(1, r.exp.t * 2); ctx.font = `bold 11px ${FONT}`; ctx.fillStyle = '#e8894a';
          ctx.fillText(`+${r.exp.n} EXP`, r.x, r.y - 46 - (1.2 - r.exp.t) * 14); ctx.globalAlpha = 1;
        }
        if (r.say) {   // 말풍선
          ctx.font = `12px ${FONT}`;
          const tw = Math.min(170, ctx.measureText(r.say.text).width) + 14, th = 20;
          const bx = Math.round(clamp(r.x - tw / 2, 2, H.RW - tw - 2)), by = Math.round(r.y - 68);
          ctx.globalAlpha = Math.min(1, r.say.t * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.roundRect(bx, by, tw, th, 8); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(r.x - 4, by + th); ctx.lineTo(r.x, by + th + 5); ctx.lineTo(r.x + 4, by + th); ctx.fill();
          ctx.fillStyle = '#26222b'; ctx.textBaseline = 'middle'; ctx.fillText(r.say.text, bx + tw / 2, by + th / 2 + 0.5, tw - 8); ctx.textBaseline = 'alphabetic';
          ctx.globalAlpha = 1;
        }
      } });
    }
  }
  function onClick(p) {
    for (const [id, r] of roomPets) {
      if (Math.abs(p.x - r.x) < 22 && p.y < r.y + 4 && p.y > r.y - 46) {
        r.heart = 1.2; r.hop = 8;
        const line = petLine(r);   // 5레벨이면 주인 이름 부르며 인사, 배고프면 배고파
        if (line) { r.say = { text: line, t: 3.5 }; r.sayT = rand(35, 75); }
        if ((U()?.pets || []).some((x) => x.id === id)) srv({ type: 'pet-pat', id });
        return true;
      }
    }
    return false;
  }

  // ------------------------------------------------------------ 방 안 어항 속 물고기
  function tanksOf() {
    const v = H.viewing();
    if (!v) return {};
    return v.editable ? (U()?.tanks || {}) : (H.S.room?.home?.tanks || {});
  }
  function afterItem(ctx, it) {
    const def = C()?.items[it.item];
    if (!def || !def.tank) return;
    const list = tanksOf()[it.uid] || [];
    if (!list.length) return;
    const water = Furniture.TANK_WATER[it.item];
    const sc = H.itemScale(it.item);
    const bm = Furniture.bitmap(it.item);
    const w = bm.width * sc, hh = bm.height * sc;
    ctx.save();
    ctx.translate(it.x, it.y - hh / 2);
    if (it.rot) ctx.rotate(it.rot * Math.PI / 180);
    if (it.flip) ctx.scale(-1, 1);
    const x1 = -w / 2 + water[0] * sc, y1 = -hh / 2 + water[1] * sc, x2 = -w / 2 + (water[2] + 1) * sc, y2 = -hh / 2 + (water[3] + 1) * sc;
    ctx.beginPath(); ctx.rect(x1, y1, x2 - x1, y2 - y1); ctx.clip();
    const t = performance.now() / 1000;
    list.forEach((code, i) => {
      const f = FISH()[code]; if (!f) return;
      const seed = i * 1.7 + code.charCodeAt(1);
      const span = x2 - x1;
      const ph = (t * (0.18 + (seed % 3) * 0.05) + seed) % 2;
      const k = ph < 1 ? ph : 2 - ph;
      const fx = x1 + 4 + k * (span - 8);
      const fy = y1 + (y2 - y1) * (0.3 + ((seed * 0.37) % 0.5)) + Math.sin(t * 2 + seed) * 1.2;
      FishArt.draw(ctx, f, fx, fy, sc / 8, ph >= 1);
    });
    ctx.restore();
  }

  // ------------------------------------------------------------ 어항 · 아쿠아리움 크게 보기
  const viewer = { kind: null, uid: null, owner: null, fish: [], fed: 0, mine: false, swim: [] };
  // 어항은 480x270, 아쿠아리움은 훨씬 넓게 (물고기가 많이 들어가니까)
  function waterCanvas(id) {
    const c = $(id), [w, h] = id === 'aquaCanvas' ? [960, 460] : [480, 270];
    if (c.width !== w) { c.width = w; c.height = h; }
    return c;
  }
  function openTank(uid) {
    viewer.kind = 'tank'; viewer.uid = uid; viewer.swim = [];
    $('tankModal').hidden = false;
    renderTank();
  }
  function renderTank() {
    if (viewer.kind !== 'tank' || $('tankModal').hidden) return;
    const v = H.viewing(), u = U(), c = C();
    const it = H.layout().find((x) => x.uid === viewer.uid);
    if (!it) { $('tankModal').hidden = true; return; }
    const def = c.items[it.item];
    const list = tanksOf()[viewer.uid] || [];
    viewer.fish = list; viewer.mine = v.editable;
    viewer.fed = v.editable ? (u.tankFed?.[viewer.uid] || 0) : (H.S.room?.home?.tankFed?.[viewer.uid] || 0);
    $('tankTitle').textContent = `🐠 ${def.name} (${list.length}/${def.tank.cap})`;
    $('tankNote').textContent = `${def.tank.allow.includes('M') ? '작은·중간' : '작은'} 물고기를 넣을 수 있어요 · ${fedText(viewer.fed)}`;
    const ul = $('tankList'); ul.textContent = '';
    list.forEach((code, i) => {
      const f = FISH()[code]; if (!f) return;
      ul.append(el('li', { title: f.name }, FishArt.thumb(f, 40), el('span', { text: f.name }), v.editable ? btn('꺼내기', 'ghost small', () => srv({ type: 'tank-take', uid: viewer.uid, i })) : null));
    });
    if (!list.length) ul.append(el('li', { class: 'note', style: 'width:auto;border:0', text: '비어 있어요' }));
    $('tankOwnerBox').hidden = !v.editable;
    if (v.editable) {
      const pick = $('tankPick'); pick.textContent = '';
      for (const [code, n] of Object.entries(u.fishInv)) {
        const f = FISH()[code];
        if (f && n > 0 && def.tank.allow.includes(f.cat)) pick.append(el('option', { value: code, text: `#${code} ${f.name} ×${n}` }));
      }
      $('tankPutBtn').disabled = !pick.options.length || list.length >= def.tank.cap;
      if (!pick.options.length) pick.append(el('option', { text: '넣을 수 있는 물고기가 없어요' }));
      $('tankFeedBtn').disabled = !(u.food.fishfood > 0);
      $('tankFeedBtn').textContent = `🫙 밥 주기 (${u.food.fishfood || 0})`;
    }
  }
  $('tankPutBtn').onclick = () => srv({ type: 'tank-put', uid: viewer.uid, code: $('tankPick').value });
  $('tankFeedBtn').onclick = () => srv({ type: 'tank-feed', uid: viewer.uid });
  $('closeTank').onclick = () => { $('tankModal').hidden = true; viewer.kind = null; };

  function openAquarium(username) {
    const u = U();
    viewer.kind = 'aqua'; viewer.swim = [];
    $('aquaModal').hidden = false;
    if (!username || username === u.username) { viewer.owner = null; renderAqua(); srv({ type: 'aqua-view', username: u.username }); }
    else { viewer.owner = username; viewer.fish = []; $('aquaTitle').textContent = '🐋 불러오는 중…'; $('aquaList').textContent = ''; $('aquaOwnerBox').hidden = true; srv({ type: 'aqua-view', username }); }
  }
  function renderAqua(m) {
    if (viewer.kind !== 'aqua' || $('aquaModal').hidden) return;
    const u = U(), c = C();
    if (m) { if ((m.mine && viewer.owner) || (!m.mine && m.username !== viewer.owner)) return; viewer.fed = m.fed; viewer.nick = m.nickname; viewer.fish = m.fish; viewer.mine = m.mine; }
    if (!viewer.owner) { viewer.fish = u.aquarium; viewer.mine = true; viewer.fed = u.tankFed?.aquarium || viewer.fed || 0; viewer.nick = u.nickname; }
    $('aquaTitle').textContent = `🐋 ${viewer.mine ? '내' : viewer.nick + '님의'} 아쿠아리움 (${viewer.fish.length}/${c.limits.aquariumCap})`;
    const big = viewer.fish.filter((code) => FISH()[code]?.cat === 'L').length;
    $('aquaNote').textContent = `큰 물고기 ${big}마리 포함 · ${fedText(viewer.fed)}${viewer.mine ? ' · 친구들이 구경할 수 있어요' : ''}`;
    const ul = $('aquaList'); ul.textContent = '';
    viewer.fish.forEach((code, i) => {
      const f = FISH()[code]; if (!f) return;
      ul.append(el('li', { title: `${f.name} · ${rar(f).name}` }, FishArt.thumb(f, 40), el('span', { text: f.name }), viewer.mine ? btn('꺼내기', 'ghost small', () => srv({ type: 'aqua-take', i })) : null));
    });
    if (!viewer.fish.length) ul.append(el('li', { class: 'note', style: 'width:auto;border:0', text: viewer.mine ? '비어 있어요. 물고기를 넣어 자랑해 보세요!' : '아직 비어 있어요' }));
    $('aquaOwnerBox').hidden = !viewer.mine;
    if (viewer.mine) {
      const pick = $('aquaPick'); pick.textContent = '';
      const codes = Object.keys(u.fishInv).filter((k) => u.fishInv[k] > 0 && FISH()[k] && FISH()[k].cat !== 'T')
        .sort((a, b) => ({ L: 0, M: 1, S: 2 }[FISH()[a].cat] - { L: 0, M: 1, S: 2 }[FISH()[b].cat]) || a.localeCompare(b));
      for (const code of codes) pick.append(el('option', { value: code, text: `#${code} ${FISH()[code].name} ×${u.fishInv[code]}` }));
      $('aquaPutBtn').disabled = !codes.length || viewer.fish.length >= c.limits.aquariumCap;
      if (!codes.length) pick.append(el('option', { text: '넣을 물고기가 없어요' }));
      $('aquaFeedBtn').disabled = !(u.food.fishfood > 0);
      $('aquaFeedBtn').textContent = `🫙 밥 주기 (${u.food.fishfood || 0})`;
    }
  }
  $('aquaPutBtn').onclick = () => srv({ type: 'aqua-put', code: $('aquaPick').value });
  $('aquaFeedBtn').onclick = () => srv({ type: 'tank-feed', uid: 'aquarium' });
  $('closeAqua').onclick = () => { $('aquaModal').hidden = true; viewer.kind = null; };
  $('aquaBtn').onclick = () => openAquarium();
  function fedText(t) {
    if (!t) return '아직 밥을 안 먹었어요';
    const min = Math.floor((Date.now() - t) / 60000);
    return min < 1 ? '방금 밥을 먹었어요 😋' : min < 60 ? `${min}분 전에 밥을 먹었어요` : min < 1440 ? `${Math.floor(min / 60)}시간 전에 밥을 먹었어요` : '배고파 보여요…';
  }
  // 물속 그리기 (어항/아쿠아리움 공통)
  function drawWater(cv, kind) {
    const g = cv.getContext('2d');
    const W = cv.width, Hh = cv.height, t = performance.now() / 1000;
    const isAqua = kind === 'aqua';
    const grad = g.createLinearGradient(0, 0, 0, Hh);
    grad.addColorStop(0, isAqua ? '#1f6fa8' : '#3a9ad0'); grad.addColorStop(1, isAqua ? '#0b2a4a' : '#1d5d8a');
    g.fillStyle = grad; g.fillRect(0, 0, W, Hh);
    // 빛줄기
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 4; i++) { const x = ((i * 140 + t * 10) % (W + 200)) - 100; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 50, 0); g.lineTo(x + 120, Hh); g.lineTo(x + 70, Hh); g.fill(); }
    // 모래 · 수초 · 돌
    g.fillStyle = '#d9c38c'; g.fillRect(0, Hh - 22, W, 22);
    g.fillStyle = '#c4ab72'; for (let x = 0; x < W; x += 9) g.fillRect(x, Hh - 22 + (x % 3) * 3, 4, 2);
    const plants = Math.max(7, Math.round(W / 68));
    for (let i = 0; i < plants; i++) {
      const bx = 30 + i * ((W - 60) / plants) + (i % 2) * 10;
      for (let j = 0; j < 9; j++) { g.fillStyle = j % 2 ? '#3f8a3a' : '#5fae4a'; g.fillRect(bx + Math.round(Math.sin(t * 1.4 + j * 0.6 + i) * 3), Hh - 22 - j * 7, 5, 7); }
    }
    g.fillStyle = '#8a8a9a'; g.fillRect(W - 120, Hh - 34, 40, 14); g.fillRect(W - 112, Hh - 42, 22, 8);
    // 거품
    g.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < Math.round(W / 48); i++) { const y = Hh - ((t * 30 + i * 37) % Hh); g.fillRect(40 + (i * 53) % (W - 80) + Math.sin(t * 3 + i) * 3, y, 3, 3); }
    // 밥
    const fedAgo = (Date.now() - (viewer.fed || 0)) / 1000;
    if (viewer.fed && fedAgo < 300) {
      g.fillStyle = '#c87a3a';
      for (let i = 0; i < Math.round(W / 34); i++) g.fillRect((i * 67) % W, ((t * 18 + i * 29) % (Hh - 30)), 3, 3);
    }
    // 물고기
    const list = viewer.fish || [];
    while (viewer.swim.length < list.length) viewer.swim.push({ x: rand(40, W - 40), y: rand(30, Hh - 60), vx: rand(20, 45) * (Math.random() < 0.5 ? -1 : 1), ph: rand(0, 6) });
    viewer.swim.length = list.length;
    const hungry = !viewer.fed || fedAgo > 6 * 3600;
    list.forEach((code, i) => {
      const f = FISH()[code]; if (!f) return;
      const s = viewer.swim[i];
      const sc = isAqua ? ({ S: 2, M: 2.5, L: Math.max(2.5, Math.min(5, 3 + (f.size ? f.size[1] / 1500 : 0))) }[f.cat] || 2) : ({ S: 3, M: 3 }[f.cat] || 3);
      const bm = FishArt.bitmap(f);
      const half = bm.width * sc / 2;
      const speed = (hungry ? 0.6 : 1) * (viewer.fed && fedAgo < 300 ? 1.6 : 1);
      s.x += s.vx * speed / 60;
      if (s.x < half || s.x > W - half) { s.vx *= -1; s.x = clamp(s.x, half, W - half); }
      const fy = clamp(s.y + Math.sin(t * 1.3 + s.ph) * 8, bm.height * sc / 2 + 4, Hh - 26 - bm.height * sc / 2);
      FishArt.draw(g, f, s.x, fy, sc, s.vx < 0);
    });
    if (!list.length) {
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = `14px ${FONT}`; g.textAlign = 'center';
      g.fillText('물고기가 없어요', W / 2, Hh / 2);
    }
  }

  // ------------------------------------------------------------ 루프 · 연결 지점
  // 물고기 그림 하나가 이상해서(bitmap이 null 등) 오류가 나도 낚시 · 아쿠아리움 루프가
  // 영원히 멈추지 않게 감싸기 (예전엔 한 번 오류 나면 그 뒤로 화면이 안 그려졌음)
  const reportedTickErrors = new Set();
  function reportTickError(e) {
    const msg = String((e && e.stack) || e).slice(0, 1500);
    console.error(msg);
    if (reportedTickErrors.has(msg) || reportedTickErrors.size > 20) return;
    reportedTickErrors.add(msg);
    try { buddy.send('overlay-error', msg); } catch {}
  }
  let last = performance.now();
  let presenceT = 0;
  function tick(now) {
    try {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if ((presenceT -= dt) <= 0) { presenceT = 0.5; syncFishHere(); }
      if (!H.isMini) updateFishing(dt);
      if (viewer.kind === 'tank' && !$('tankModal').hidden) drawWater(waterCanvas('tankCanvas'), 'tank');
      if (viewer.kind === 'aqua' && !$('aquaModal').hidden) drawWater(waterCanvas('aquaCanvas'), 'aqua');
    } catch (e) {
      reportTickError(e);
      last = now;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  buddy.on('srv', (m) => {
    if (m.type === 'fish-peer') onFishPeer(m);
    else if (m.type === 'fish-show') onFishShow(m);
    else if (m.type === 'fish-cast') onFishCast(m);
    else if (m.type === 'fish-result') onFishResult(m);
    else if (m.type === 'fish-view') showTradePick(m);
    else if (m.type === 'aqua') renderAqua(m);
  });
  buddy.on('toast', () => {
    // 낚시를 던졌는데 거절당했으면(횟수 끝 등) 버튼을 되돌림
    if (fishing.state === 'casting' || fishing.state === 'reeling') setTimeout(() => { if (fishing.state === 'casting' || fishing.state === 'reeling') { fishing.state = 'idle'; updateCastBtn(); } }, 1500);
  });
  buddy.on('reward', (r) => {
    const c = C(); if (!c) return;
    const F = FISH();
    if (r.reason === 'checkin') {
      if (r.acc) H.toast(`🎁 출석 ${r.day}일째! 액세서리 '${c.accessories[r.acc]?.name}'을(를) 받았어요`, true);
      else H.toast(`📅 출석 ${r.day}일째! +🪙${r.amount}`, true);
      H.me()?.emote(r.acc ? '🎁' : '📅');
    } else if (r.reason === 'fish-sell-many') {
      H.toast(`🪙 물고기 ${r.n}마리를 팔았어요 (+🪙${r.amount})`, true);
    } else if (r.reason === 'fish-sell' || r.reason === 'recycle') {
      if (r.n === 1) H.toast(`${r.reason === 'recycle' ? '♻️' : '🪙'} ${F[r.code]?.name} +🪙${r.amount}`, true);
    } else if (r.reason === 'fish-gift-sent') H.toast(`🎁 ${r.to}님에게 ${eul(F[r.code]?.name || '물고기')} 선물했어요`);
    else if (r.reason === 'trade-done') H.toast(`🔄 교환 완료! #${r.got} ${iga(F[r.got]?.name || '물고기')} 들어왔어요`, true);
    else if (r.reason === 'trade-sent') H.toast('🔄 교환을 신청했어요');
    else if (r.reason === 'pet-feed') { H.toast(r.levelUp ? `⭐ ${r.name || '펫'}이(가) Lv.${r.levelUp}이 됐어요!${r.levelUp >= 5 ? ' 이제 말을 해요!' : ''}` : r.liked ? '💗 좋아하는 먹이라 엄청 기뻐해요!' : '냠냠 😋'); const rp = roomPets.get(r.pet); if (rp) { rp.heart = 1.2; rp.say = null; rp.sayT = 0.5; } }
    else if (r.reason === 'pet-pat') { const rp = roomPets.get(r.pet); if (rp) rp.exp = { n: r.exp, t: 1.2 }; if (r.levelUp) H.toast(`⭐ ${r.name || '펫'}이(가) Lv.${r.levelUp}이 됐어요!${r.levelUp >= 5 ? ' 이제 말을 해요!' : ''}`); }
    else if (r.reason === 'tank-feed') { H.toast('🫙 물고기들이 밥을 먹어요'); viewer.fed = Date.now(); }
    else if (r.reason === 'online-max') H.toast(`오늘 접속 코인 🪙${c.limits.onlinePerDay}을 다 받았어요. 내일 또 쌓여요!`);
    else if (r.reason === 'fish-gift' || r.reason === 'admin') { /* 알림은 따로 떠요 */ }
  });

  let lastRoom = null;
  function onState(st) {
    if (st && st.net !== 'online') fishHereSent = null;   // 다시 연결되면 다시 알림
    const code = st?.room?.code || null;
    if (code !== lastRoom) { lastRoom = code; fishPeers.clear(); }
    syncRoomPets();
    if (!$('fishModal').hidden) renderFishModal();
    renderTank();
    renderAqua();
    renderAttend();
    updateCastBtn();
  }
  function renderPanels() {
    renderRodPick();
    renderShop();
    renderBag();
    renderDex();
    renderPets();
    renderAttend();
    if (!recent.length) renderRecent();
  }

  window.HomeGame = { afterItem, addThings, update: updateRoomPets, onClick, openTank, openAquarium, renderPanels, onState, drawFishing, fishingActive, fishClick };
})();
