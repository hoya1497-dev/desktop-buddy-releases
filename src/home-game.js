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
  const C = () => H.catalog;
  const U = () => (H.S && H.S.session ? H.S.session.user : null);
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
  const dexPageOf = { S: 0, M: 0, L: 0, T: 0 };
  $('dexTabs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { dexFilter = b.dataset.dex; renderDex(); }));
  const openTab = (name) => document.querySelector(`.tabs button[data-tab=${name}]`)?.click();

  // ------------------------------------------------------------ 상점
  function renderShop() {
    const u = U(), c = C();
    if (!u || !c) return;
    $('shopNote').textContent = `오늘 접속 코인 🪙${c.limits.onlinePerDay - (u.onlineLeft ?? 0)}/${c.limits.onlinePerDay} 받음 · 친구와 대화하면 30초마다 🪙30`;
    const row = H.shopRow;
    const items = $('shopItems'), tanks = $('shopTanks'), wallItems = $('shopWallItems');
    items.textContent = ''; tanks.textContent = ''; wallItems.textContent = '';
    for (const [id, it] of Object.entries(c.items)) {
      if (it.free === true) continue;
      const own = u.owned[id] || 0;
      const sub = `🪙 ${it.price}${own ? ` · ${own}개 있음` : ''}${it.tank ? ` · ${it.tank.cap}마리 · ${it.tank.allow.includes('M') ? '작은·중간' : '작은'} 물고기` : ''}`;
      const r = row(Furniture.thumb(id), it.name, sub, [['사기', u.coins < it.price, () => srv({ type: 'buy', item: id })]]);
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
    const pets = $('shopPets'); pets.textContent = '';
    const full = u.pets.length >= c.limits.petsMax;
    for (const [id, p] of Object.entries(c.pets)) {
      const likes = p.likes.map((x) => c.petFoods[x]?.name).join(', ');
      pets.append(row(PetArt.thumb(id, 34), p.name, `${p.code} · 🪙 ${p.price} · 좋아하는 것: ${likes}`, [['데려오기', full || u.coins < p.price, () => srv({ type: 'buy', item: id })]]));
    }
    if (full) pets.append(el('li', { class: 'note', text: `펫은 ${c.limits.petsMax}마리까지 키울 수 있어요.` }));
    const acc = $('shopAcc'); acc.textContent = '';
    for (const [id, a] of Object.entries(c.accessories)) {
      const own = u.acc.owned[id];
      const sub = `${a.code} · ` + (a.price == null ? '📅 출석 7일째 선물로만 나와요' : `🪙 ${a.price}`);
      acc.append(row(accThumb(id), a.name, own ? `${a.code} · 가지고 있음` : sub, [[own ? '있음' : a.price == null ? '출석 전용' : '사기', own || a.price == null || u.coins < a.price, () => srv({ type: 'buy', item: id })]]));
    }
    const walls = $('shopWalls'); walls.textContent = '';
    for (const [id, w] of Object.entries(c.walls)) {
      const own = id === 'basic' || u.owned[id];
      const on1 = u.home.wall1 === id, on2 = u.home.wall2 === id;
      const sub = own ? ([on2 && '2층', on1 && '1층'].filter(Boolean).join('·') + (on1 || on2 ? '에 바름' : '가지고 있음')) : `🪙 ${w.price}`;
      const buttons = own
        ? [['2층', on2, () => buddy.send('wall', { item: id, floor: 2 }), 'ghost small'], ['1층', on1, () => buddy.send('wall', { item: id, floor: 1 }), 'ghost small']]
        : [['사기', u.coins < w.price, () => srv({ type: 'buy', item: id })]];
      walls.append(row(H.wallThumb(id), w.name, sub, buttons));
    }
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
      grid.append(fishCell(f, n, false, () => openFish(code)));
    }
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
    let any = false;
    for (const [id, n] of Object.entries(u.owned)) {
      const def = c.items[id];
      if (!def || def.required) continue;
      const left = n - (placed[id] || 0);
      any = true;
      bag.append(H.shopRow(Furniture.thumb(id), def.name, `${left}개 남음 · 방에 ${placed[id] || 0}개`, [
        ['2층에', left <= 0 || !v.editable, () => H.placeNew(id, 2), 'ghost small'],
        ['1층에', left <= 0 || !v.editable, () => H.placeNew(id, 1), 'ghost small'],
      ]));
    }
    $('bagNote').textContent = !any ? '아직 가구가 없어요. 상점에서 사 보세요!' : v.editable ? '놓을 층을 고르세요' : '내 집에서만 놓을 수 있어요';
  }
  $('sellTrashBtn').onclick = () => {
    const u = U(); let n = 0, coins = 0;
    for (const [code, k] of Object.entries(u.fishInv)) if (FISH()[code]?.cat === 'T' && k > 0) { srv({ type: 'fish-sell', code, n: k }); n += k; coins += k * FISH()[code].price; }
    if (n) H.toast(`🗑️ 쓰레기 ${n}개를 재활용했어요 (+🪙${coins})`, true);
  };
  $('sellDupBtn').onclick = () => {
    const u = U(); let n = 0, coins = 0;
    const sells = [];
    for (const [code, k] of Object.entries(u.fishInv)) {
      const f = FISH()[code];
      if (f && f.cat !== 'T' && k > 1) { sells.push({ code, n: k - 1 }); n += k - 1; coins += (k - 1) * f.price; }
    }
    if (!n || !confirm(`중복된 물고기 ${n}마리를 팔까요? (+🪙${coins})\n종류마다 1마리씩은 남겨 둬요.`)) return;
    for (const x of sells) srv({ type: 'fish-sell', code: x.code, n: x.n });
    H.toast(`🪙 중복 물고기 ${n}마리를 팔았어요 (+🪙${coins})`, true);
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
  const dexList = (cat) => Object.values(FISH()).filter((f) => f.cat === cat).sort((a, b) => a.code.localeCompare(b.code));
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
      b.textContent = `${{ S: '작은', M: '중간', L: '큰', T: '쓰레기' }[b.dataset.dex]} ${n}/${L.length}`;
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
    $('dexChance').textContent = `${f.chance}% (한 번 던질 때)`;
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
  const scene = $('fishScene'), sg = scene.getContext('2d');
  const fishing = { state: 'idle', t: 0, biteAt: 0, end: 0, msg: '', msgT: 0, splash: 0 };
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
    b.textContent = { idle: '🎣 던지기', result: '🎣 다시 던지기', casting: '던지는 중…', waiting: '당기기', bite: '❗ 지금 당겨!', reeling: '감는 중…' }[fishing.state];
    b.disabled = fishing.state === 'casting' || fishing.state === 'reeling' || (u && u.castsLeft <= 0 && (fishing.state === 'idle' || fishing.state === 'result'));
    if (u) $('castInfo').textContent = `오늘 ${u.castsLeft}번 남음`;
  }
  function onFishCast(m) {
    fishing.state = 'waiting';
    fishing.t = 0;
    fishing.biteAt = performance.now() + m.wait;
    fishing.end = fishing.biteAt + m.window;
    updateCastBtn();
  }
  function onFishResult(m) {
    fishing.state = 'result'; fishing.t = 0; fishing.splash = 1;
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
    $('catchOk').textContent = f.cat === 'T' ? '버려진 걸 주웠어요 ♻️' : (f.rar === 'L' ? '전설이다!! 🎉' : '좋아요!');
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
      ul.append(el('li', { onclick: () => openFish(r.code), title: f.name }, FishArt.thumb(f, 40), el('span', { text: f.name }), r.size ? el('span', { class: 'note-inline', text: r.size + 'cm' }) : null));
    }
    if (!recent.length) ul.append(el('li', { class: 'note', style: 'width:auto;border:0', text: '아직 없어요' }));
  }
  function drawScene(dt) {
    const W = scene.width, Hh = scene.height, g = sg;
    const t = performance.now() / 1000;
    if (fishing.state === 'waiting' && performance.now() >= fishing.biteAt) { fishing.state = 'bite'; updateCastBtn(); }
    if ((fishing.state === 'bite' || fishing.state === 'waiting') && performance.now() > fishing.end + 400) {
      srv({ type: 'fish-reel' }); fishing.state = 'reeling'; updateCastBtn();
    }
    fishing.t += dt;
    if (fishing.msgT > 0) fishing.msgT -= dt;
    fishing.splash = Math.max(0, fishing.splash - dt);
    const h = new Date().getHours();
    const night = h < 6 || h >= 20, dusk = h >= 17 && h < 20;
    g.imageSmoothingEnabled = false;
    g.fillStyle = night ? '#1b2048' : dusk ? '#f2a77e' : '#9fd3f7'; g.fillRect(0, 0, W, 90);
    g.fillStyle = night ? '#fff6c8' : '#fff1a0'; g.fillRect(W - 50, 18, 14, 14);
    g.fillStyle = night ? '#24412f' : '#7cc46a';
    for (let x = 0; x < W; x += 6) { const hh = 10 + Math.round(6 * Math.sin((x + 40) / 37)); g.fillRect(x, 90 - hh, 6, hh); }
    g.fillStyle = night ? '#183a63' : '#3b88c4'; g.fillRect(0, 90, W, Hh - 90);
    g.fillStyle = night ? '#1f4a7a' : '#5aa3da';
    for (let i = 0; i < 8; i++) { const x = ((i * 47 + t * 12) % (W + 40)) - 20; g.fillRect(Math.round(x), 100 + (i * 23) % 80, 14, 2); }
    // 부두
    g.fillStyle = '#8a5a3c'; g.fillRect(0, 96, 90, 10);
    g.fillStyle = '#5c3a26'; g.fillRect(0, 106, 90, 3); g.fillRect(12, 109, 6, 60); g.fillRect(64, 109, 6, 60);
    // 캐릭터
    const u = U();
    Sprites.drawPet(g, 30, 64, { species: u?.species || 'cat', scale: 2, color: u?.color || '#f2a65a', legs: 'sit', eyes: fishing.state === 'bite' ? 'open' : (fishing.state === 'result' && fishing.msgT > 0 ? 'happy' : 'open'), acc: u?.acc?.eq || {}, flip: true });
    // 낚싯대 + 줄 + 찌
    const rodTip = { x: 92, y: 50 };
    g.strokeStyle = '#6e452c'; g.lineWidth = 3; g.beginPath(); g.moveTo(66, 88); g.lineTo(rodTip.x, rodTip.y); g.stroke();
    let bob = null;
    if (fishing.state === 'casting') { const k = Math.min(1, fishing.t / 0.6); bob = { x: rodTip.x + 110 * k, y: rodTip.y + (100 - 50) * k - Math.sin(k * Math.PI) * 40 }; }
    else if (fishing.state === 'waiting') bob = { x: 202, y: 112 + Math.sin(t * 3) * 1.5 };
    else if (fishing.state === 'bite') bob = { x: 202 + Math.sin(t * 40) * 2, y: 118 + Math.sin(t * 25) * 3 };
    else if (fishing.state === 'reeling') { const k = Math.min(1, fishing.t / 0.5); bob = { x: 202 - 100 * k, y: 112 - 50 * k }; }
    if (bob) {
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(rodTip.x, rodTip.y); g.lineTo(bob.x, bob.y); g.stroke();
      g.fillStyle = '#e04a3a'; g.fillRect(Math.round(bob.x) - 3, Math.round(bob.y) - 4, 6, 4);
      g.fillStyle = '#ffffff'; g.fillRect(Math.round(bob.x) - 3, Math.round(bob.y), 6, 3);
      if (fishing.state === 'waiting' || fishing.state === 'bite') {
        g.strokeStyle = 'rgba(255,255,255,0.5)';
        const rr = 6 + ((t * 8) % 8);
        g.beginPath(); g.ellipse(bob.x, bob.y + 3, rr, rr / 3, 0, 0, Math.PI * 2); g.stroke();
      }
      if (fishing.state === 'bite') {
        g.fillStyle = '#fff'; g.fillRect(bob.x + 8, bob.y - 26, 14, 20);
        g.fillStyle = '#e04a3a'; g.font = `bold 16px ${FONT}`; g.textAlign = 'center'; g.fillText('!', bob.x + 15, bob.y - 10);
      }
    }
    if (fishing.splash > 0) {
      g.fillStyle = `rgba(255,255,255,${fishing.splash})`;
      for (let i = 0; i < 6; i++) g.fillRect(100 + i * 6, 100 - (1 - fishing.splash) * 20 - (i % 3) * 4, 3, 3);
    }
    if (fishing.msgT > 0 && fishing.msg) {
      g.font = `bold 13px ${FONT}`; g.textAlign = 'center';
      const w = g.measureText(fishing.msg).width + 20;
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(W / 2 - w / 2, 150, w, 24);
      g.fillStyle = '#fff'; g.fillText(fishing.msg, W / 2, 167);
    }
  }

  // ------------------------------------------------------------ 펫 (관리 탭)
  const petRename = { id: null, draft: null }; // 이름 고치는 중인 펫 (화면이 새로 그려져도 유지)
  function renderPets() {
    const u = U(), c = C();
    if (!u || !c) return;
    const outN = u.pets.filter((p) => p.out).length;
    $('petNote').textContent = u.pets.length
      ? `${u.pets.length}/${c.limits.petsMax}마리 · 집에 꺼내 둔 펫 ${outN}/${c.limits.petsOut} · 꺼내면 친구들도 볼 수 있어요`
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
      if (myPetFoods.length) { acts.append(sel); acts.append(btn('밥 주기', 'primary small', () => srv({ type: 'feed', food: sel.value, target: p.id }), p.full >= 98)); }
      else acts.append(el('span', { class: 'note-inline', text: '먹이가 없어요 (상점 → 음식)' }));
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
          el('div', { class: 'who' }, nameEl, el('span', { class: 'note-inline', text: `Lv.${p.level}` }),
            el('small', { text: `${kind.code} ${kind.name}${p.out ? ` · ${p.floor}층에 나와 있어요` : ' · 쉬는 중'} · 좋아하는 것: ${kind.likes.map((x) => c.petFoods[x]?.name).join(', ')}` }))),
        el('div', { class: 'bars' }, el('span', {}, '🍖 ', bar('full', p.full)), el('span', {}, '💗 ', bar('love', p.love)), el('span', { class: 'note-inline', text: `경험치 ${p.exp}/${p.next}` })),
        acts));
    }
  }

  // ------------------------------------------------------------ 방 안에서 돌아다니는 펫
  const roomPets = new Map(); // id -> { x, y, tx, dir, t, hop, heart }
  function visiblePets() {
    const v = H.viewing();
    if (!v) return [];
    if (v.editable) return (U()?.pets || []).filter((p) => p.out);
    return (H.S.room?.home?.pets || []);
  }
  function syncRoomPets() {
    const list = visiblePets();
    const ids = new Set(list.map((p) => p.id));
    for (const id of [...roomPets.keys()]) if (!ids.has(id)) roomPets.delete(id);
    for (const p of list) {
      let r = roomPets.get(p.id);
      const b = H.band(p.floor || 1);
      if (!r || r.floor !== p.floor) {
        r = { x: rand(60, H.LADDER_X - 60), y: rand(b.min, b.max), tx: null, ty: null, dir: 1, t: rand(1, 3), hop: 0, heart: 0, floor: p.floor };
        roomPets.set(p.id, r);
      }
      r.p = p;
    }
  }
  function updateRoomPets(dt) {
    for (const r of roomPets.values()) {
      r.heart = Math.max(0, r.heart - dt);
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
          ctx.font = `bold 10px ${FONT}`; ctx.fillStyle = 'rgba(0,0,0,0.65)';
          const w = ctx.measureText(r.p.name).width + 10;
          ctx.fillRect(Math.round(r.x - w / 2), Math.round(r.y - 40), w, 14);
          ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(r.p.name, r.x, r.y - 33); ctx.textBaseline = 'alphabetic';
        }
      } });
    }
  }
  function onClick(p) {
    for (const [id, r] of roomPets) {
      if (Math.abs(p.x - r.x) < 22 && p.y < r.y + 4 && p.y > r.y - 46) {
        r.heart = 1.2; r.hop = 8;
        if (H.viewing()?.editable) srv({ type: 'pet-pat', id });
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
  function waterCanvas(id) { const c = $(id); if (c.width !== 480) { c.width = 480; c.height = 270; } return c; }
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
    for (let i = 0; i < 7; i++) {
      const bx = 30 + i * 70 + (i % 2) * 10;
      for (let j = 0; j < 9; j++) { g.fillStyle = j % 2 ? '#3f8a3a' : '#5fae4a'; g.fillRect(bx + Math.round(Math.sin(t * 1.4 + j * 0.6 + i) * 3), Hh - 22 - j * 7, 5, 7); }
    }
    g.fillStyle = '#8a8a9a'; g.fillRect(W - 120, Hh - 34, 40, 14); g.fillRect(W - 112, Hh - 42, 22, 8);
    // 거품
    g.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 10; i++) { const y = Hh - ((t * 30 + i * 37) % Hh); g.fillRect(40 + (i * 53) % (W - 80) + Math.sin(t * 3 + i) * 3, y, 3, 3); }
    // 밥
    const fedAgo = (Date.now() - (viewer.fed || 0)) / 1000;
    if (viewer.fed && fedAgo < 300) {
      g.fillStyle = '#c87a3a';
      for (let i = 0; i < 14; i++) g.fillRect((i * 37) % W, ((t * 18 + i * 29) % (Hh - 30)), 3, 3);
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
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!$('pane-fishing').classList.contains('active') && fishing.state !== 'waiting' && fishing.state !== 'bite') { /* 낚시 탭이 안 보이면 그리기 생략 */ }
    else drawScene(dt);
    if (viewer.kind === 'tank' && !$('tankModal').hidden) drawWater(waterCanvas('tankCanvas'), 'tank');
    if (viewer.kind === 'aqua' && !$('aquaModal').hidden) drawWater(waterCanvas('aquaCanvas'), 'aqua');
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  buddy.on('srv', (m) => {
    if (m.type === 'fish-cast') onFishCast(m);
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
    } else if (r.reason === 'fish-sell' || r.reason === 'recycle') {
      if (r.n === 1) H.toast(`${r.reason === 'recycle' ? '♻️' : '🪙'} ${F[r.code]?.name} +🪙${r.amount}`, true);
    } else if (r.reason === 'fish-gift-sent') H.toast(`🎁 ${r.to}님에게 ${eul(F[r.code]?.name || '물고기')} 선물했어요`);
    else if (r.reason === 'trade-done') H.toast(`🔄 교환 완료! #${r.got} ${iga(F[r.got]?.name || '물고기')} 들어왔어요`, true);
    else if (r.reason === 'trade-sent') H.toast('🔄 교환을 신청했어요');
    else if (r.reason === 'pet-feed') { H.toast(r.levelUp ? `⭐ 펫이 레벨 ${r.levelUp}이 됐어요!` : r.liked ? '💗 좋아하는 먹이라 엄청 기뻐해요!' : '냠냠 😋'); const rp = roomPets.get(r.pet); if (rp) rp.heart = 1.2; }
    else if (r.reason === 'tank-feed') { H.toast('🫙 물고기들이 밥을 먹어요'); viewer.fed = Date.now(); }
    else if (r.reason === 'online-max') H.toast(`오늘 접속 코인 🪙${c.limits.onlinePerDay}을 다 받았어요. 내일 또 쌓여요!`);
    else if (r.reason === 'fish-gift' || r.reason === 'admin') { /* 알림은 따로 떠요 */ }
  });

  function onState() {
    syncRoomPets();
    if (!$('fishModal').hidden) renderFishModal();
    renderTank();
    renderAqua();
    renderAttend();
    updateCastBtn();
  }
  function renderPanels() {
    renderShop();
    renderBag();
    renderDex();
    renderPets();
    renderAttend();
    if (!recent.length) renderRecent();
  }

  window.HomeGame = { afterItem, addThings, update: updateRoomPets, onClick, openTank, openAquarium, renderPanels, onState };
})();
