// Desktop Buddy 서버: 계정 · 코인 · 집 · 친구 · 방(데스크톱 코드) · 캐릭터 그림
// 실행: node server.js
// 환경변수: PORT(기본 8787), DATA_FILE(저장 파일 경로), TRUST_PROXY=1(호스팅 프록시 뒤에서 실제 IP 사용)

const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const { WebSocketServer } = require('ws');
const { Store } = require('./store');
const CATALOG = require('./catalog');
const game = require('./game');
const minigame = require('./minigame');
const boardMod = require('./board');
const musicMod = require('./music');
const extrasMod = require('./extras');
const titlesMod = require('./titles');
const limitedMod = require('./limited');   // 0.17.5 🍫 한정 선물 펫   // 0.17.2 🏅 칭호   // 0.17 💾 저장 슬롯 · 🪪 프로필

const PORT = Number(process.env.PORT) || 8787;
// Railway에 Volume을 붙이면 그 안에 자동으로 저장 (설정 안 해도 됨)
const DATA_FILE = process.env.DATA_FILE
  || (process.env.RAILWAY_VOLUME_MOUNT_PATH && path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'buddy-data.json'))
  || path.join(__dirname, 'data', 'buddy-data.json');
// 호스팅(Railway 등)의 프록시 뒤에서는 실제 접속자 IP를 씀
const TRUST_PROXY = process.env.TRUST_PROXY === '1' || !!process.env.RAILWAY_ENVIRONMENT_NAME || !!process.env.RAILWAY_ENVIRONMENT;

const START_COINS = 200;
const MAX_COINS = 9_999_999;
const TOKEN_TTL = 60 * 24 * 3600 * 1000;
const MAX_TOKENS = 5;
const MAX_PER_ROOM = 25;
const MAX_CONN_PER_IP = 40;   // 학교 · PC방처럼 같은 와이파이에서 여럿이 접속해도 되게
const PHOTO_MAX = 380 * 1024;   // 📷 사진 한 장 최대 크기 (앱이 보내기 전에 줄여요. 서버 한 번에 받는 최대 420KB 안쪽)
const PHOTO_PER_MIN = 6;
const MAX_FURNITURE = 200;   // 한 집에 놓을 수 있는 가구 수 (0.14.4: 60 → 200, 앱에는 catalog.limits.furnitureMax 로 알려 줌)
const MAX_FRIENDS = 100;
const MAX_PENDING = 30;
const MAX_SKIN_BYTES = 64 * 1024;   // 그림 1장당 최대 64KB (PNG)
const MAX_SKIN_SIDE = 256;
const ROOM_W = CATALOG.room.w, ROOM_H = CATALOG.room.h;
// 집 넓이 (증축 단계에 따라)
const roomW = (u) => (CATALOG.room.expand[Math.min(CATALOG.room.expand.length - 1, Math.max(0, u.home?.level || 0))] || {}).w || ROOM_W;
const ADMIN_PORT = Number(process.env.ADMIN_PORT) || 8788;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const EMOTES = new Set(['wave', 'heart', 'cheer', 'zzz', 'poke', 'bye', 'good', 'dislike']);
const POSES = ['stand', 'sit', 'walk'];      // 꼭 있어야 하는 그림
const EXTRA_POSES = ['lie', 'fall'];         // 있으면 쓰는 그림 (눕기 · 떨어지기)

const store = new Store(DATA_FILE);
const db = store.data;
const scrypt = promisify(crypto.scrypt);

// ------------------------------------------------------------ 도우미
const now = () => Date.now();
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n);
const send = (ws, obj) => { if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj)); };

class Limiter {
  constructor(max, windowMs) { this.max = max; this.win = windowMs; this.map = new Map(); }
  count(key) {
    const t = now();
    const arr = (this.map.get(key) || []).filter((x) => t - x < this.win);
    this.map.set(key, arr);
    return arr.length;
  }
  ok(key) { return this.count(key) < this.max; }
  hit(key) { this.count(key); this.map.get(key).push(now()); }
  take(key) { if (!this.ok(key)) return false; this.hit(key); return true; }
  sweep() { for (const k of this.map.keys()) if (this.count(k) === 0) this.map.delete(k); }
}
const regLimit = new Limiter(20, 3600_000);
const loginIpLimit = new Limiter(60, 600_000);
const loginNameFail = new Limiter(5, 900_000);
const tokenLimit = new Limiter(120, 600_000);
const joinFailLimit = new Limiter(10, 600_000);
const friendFailLimit = new Limiter(10, 600_000);
setInterval(() => [regLimit, loginIpLimit, loginNameFail, tokenLimit, joinFailLimit, friendFailLimit].forEach((l) => l.sweep()), 600_000);

function perSocket(ws, key, max, ms) {
  const t = now();
  const arr = (ws.rate[key] ||= []);
  while (arr.length && t - arr[0] > ms) arr.shift();
  if (arr.length >= max) return false;
  arr.push(t);
  return true;
}

async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return { salt: salt.toString('base64'), hash: key.toString('base64') };
}
const DUMMY = { salt: crypto.randomBytes(16).toString('base64'), hash: crypto.randomBytes(64).toString('base64') };
async function verifyPassword(pw, rec) {
  const key = await scrypt(pw, Buffer.from(rec.salt, 'base64'), 64, { N: 16384, r: 8, p: 1 });
  const stored = Buffer.from(rec.hash, 'base64');
  return stored.length === key.length && crypto.timingSafeEqual(stored, key);
}

// '0.4.2' < '0.5.0' 같은 버전 비교
function olderThan(a, b) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0), pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) < (pb[i] || 0); }
  return false;
}

function newCode() {
  for (;;) {
    let c = '';
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) c += CODE_CHARS[bytes[i] % CODE_CHARS.length];
    if (!db.codes[c]) return c;
  }
}
function issueToken(u, device) {
  const raw = crypto.randomBytes(32).toString('base64url');
  const hash = sha256(raw);
  u.tokens.push({ hash, created: now(), lastUsed: now(), device: clean(device, 30) });
  while (u.tokens.length > MAX_TOKENS) delete db.tokens[u.tokens.shift().hash];
  db.tokens[hash] = u.id;
  return raw;
}
// 관리자 재설정용 임시 비밀번호: 헷갈리는 글자(0/O, 1/l/I) 빼고 10자
function tempPassword() {
  const A = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(10), (b) => A[b % A.length]).join('');
}
// 관리자 users/user 명령에 보여줄 정보 (비밀번호 · 토큰 값은 절대 안 넣음)
function userInfo(u, detail) {
  migrate(u);
  const seen = Math.max(u.lastSeen || 0, ...u.tokens.map((t) => t.lastUsed || 0));
  const o = { username: u.username, nickname: u.nickname, code: u.code, created: u.created || null, lastSeen: seen || null,
    online: sessions.has(u.id), coins: u.coins, level: u.pet?.level || 1, friends: u.friends.length, appVersion: u.appVersion || null };
  if (!detail) return o;
  const nameOf = (id) => (db.users[id] ? `@${db.users[id].username}` : null);
  return { ...o, eventCoins: u.eventCoins || {}, dex: Object.keys(u.dex || {}).length, pets: (u.pets || []).length,
    nameEffect: u.nameEffect || null, noticeWriter: !!u.noticeWriter, locked: !!u.locked, noVisit: !!u.noVisit,
    friendList: u.friends.map(nameOf).filter(Boolean), blocked: u.blocked.length,
    reqIn: u.reqIn.map(nameOf).filter(Boolean), reqOut: u.reqOut.map(nameOf).filter(Boolean),
    devices: u.tokens.map((t) => ({ device: t.device || '', created: t.created, lastUsed: t.lastUsed })) };
}
function revokeToken(u, raw) {
  const hash = sha256(String(raw || ''));
  u.tokens = u.tokens.filter((t) => t.hash !== hash);
  delete db.tokens[hash];
}
const byName = (name) => db.users[db.names[String(name || '').trim().toLowerCase()]] || null;
// 운영자가 줄 수 있는 닉네임 효과 (0.14.1: 골드 · 은하수 · 불꽃 추가. 옛 앱에서는 그냥 기본 닉네임 색으로 보여요)
const NAME_EFFECTS = { neon: '네온', rainbow: '무지개', gold: '골드', galaxy: '은하수', fire: '불꽃' };
const ownerOf = (code) => (db.codes[code] ? db.users[db.codes[code]] : null);
// 0.17.3 관리자 명령: 터미널에서 한글을 못 칠 때를 위해 아이디 대신 데스크톱 코드(8자리)도 받음
const adminUser = (x) => byName(x) || ownerOf(String(x || '').trim().toUpperCase()) || null;
// 0.17.3 관리자 명령: 같은 종류 펫이 여럿일 때 이름 또는 번호(1, 2, #2, 2번)로 한 마리 고르기
function petListText(same) { return same.map((x, i) => `${i + 1}번 '${x.name}' Lv.${x.level}${CATALOG.petTraits[x.trait] ? ' ' + CATALOG.petTraits[x.trait].icon + CATALOG.petTraits[x.trait].name : ''}`).join(' · '); }
function pickPet(same, pick, kindName) {
  pick = String(pick || '').trim();
  if (!pick) return same.length === 1 ? { pet: same[0] } : { error: `${kindName}이(가) ${same.length}마리예요. 번호를 붙여 주세요 (예: 2): ${petListText(same)}` };
  const byNm = same.filter((x) => x.name === pick);
  if (byNm.length === 1) return { pet: byNm[0] };
  const n = /^#?\d+(번)?$/.test(pick) ? parseInt(pick.replace('#', ''), 10) : 0;
  if (n >= 1 && n <= same.length) return { pet: same[n - 1] };
  if (byNm.length > 1) return { error: `'${pick}' 이름이 ${byNm.length}마리라 번호로 골라 주세요: ${petListText(same)}` };
  return { error: `'${pick}'에 맞는 ${kindName}이(가) 없어요: ${petListText(same)}` };
}
// 0.17.2 운영자가 준 닉네임 효과는 본인이 설정에서 끌 수 있어요 (끄면 칭호 색 그대로)
// 🌈 무지개는 가장 높은 효과라 끌 수 없어요 (하루 결정)
const effectOf = (u) => (u.nameEffect && (u.nameEffect === 'rainbow' || u.nameEffectOn !== false) ? u.nameEffect : null);

// 예전 데이터에 새 기능 필드 채우기 + 기본 가구(컴퓨터, 침대) 지급
function migrate(u) {
  u.friends ||= []; u.reqIn ||= []; u.reqOut ||= []; u.blocked ||= [];
  u.skin ||= { v: 0, faces: 'right' };
  u.species ||= 'cat';
  u.giftDay ||= ''; u.giftSent ||= 0;
  u.nameColor ||= null;   // 닉네임 글자 색 (내가 고름, 안 고르면 기본)
  u.nameEffect ||= null;  // NAME_EFFECTS 중 하나 — 운영자만 줄 수 있음
  // 🎉 이벤트 전용 코인은 이벤트마다 따로(🎃 호박 · 🎄 트리 · 🧧 복주머니), 일반 코인과 별개
  if (!u.eventCoins || typeof u.eventCoins !== 'object') u.eventCoins = { halloween: Number(u.eventCoins) || 0 };
  if (!u.eventEarned || typeof u.eventEarned !== 'object') u.eventEarned = { halloween: Number(u.eventEarned) || 0 };   // 접속으로 번 누적 (관리자 지급 제외)
  // 복층 집으로 바뀌기 전 데이터: 벽지 하나 → 1층/2층, 가구는 1층으로 옮김
  if (!u.home.v2) {
    u.home.wall1 = u.home.wall2 = CATALOG.walls[u.home.wall] ? u.home.wall : 'basic';
    delete u.home.wall;
    for (const it of u.home.items) {
      if (!CATALOG.items[it.item]) continue;
      const fl = CATALOG.room.floors[1];
      if (it.y > 230) it.y = Math.round(fl.wall + 10 + ((it.y - 230) / 370) * (fl.bottom - fl.wall - 14));
      else it.y = Math.round(fl.top + 40 + (it.y / 230) * (fl.wall - fl.top - 50));
    }
    u.home.items = u.home.items.filter((it) => CATALOG.items[it.item]);
    u.home.light = true;
    u.home.v2 = true;
    for (const id of Object.keys(CATALOG.items)) { const def = CATALOG.items[id]; if (def.start) for (const it of u.home.items) if (it.item === id) Object.assign(it, def.start); }
  }
  for (const [id, def] of Object.entries(CATALOG.items)) {
    if (!def.free) continue;
    const key = 'gift_' + id;
    if (!u[key]) {
      u[key] = true;
      if ((u.owned[id] || 0) < 1) u.owned[id] = 1;
      if (!u.home.items.some((it) => it.item === id)) u.home.items.push({ item: id, ...def.start, rot: 0, flip: false });
    }
  }
  for (const it of u.home.items) {
    it.x = Math.min(roomW(u) - 10, Math.max(10, it.x));
    it.y = Math.min(ROOM_H - 4, Math.max(40, it.y));
    it.rot = Number.isFinite(it.rot) ? it.rot : 0;
  }
  // 0.17 가구 겹치는 순서: 예전엔 앱이 아래쪽(y)에 있는 가구를 앞에 그렸고, 이제는 놓은 순서대로(배열 순서) 그려요.
  // 한 번만, 러그가 아닌 가구를 y 순서로 줄 세워서 지금 보이는 모습을 그대로 지켜요
  if (!u.home.zOrder) {
    const isRug = (id) => /^rug|Rug$/.test(id);
    const slots = [], rest = [];
    u.home.items.forEach((it, i) => { if (!isRug(it.item)) { slots.push(i); rest.push(it); } });
    rest.sort((a, b) => a.y - b.y);
    slots.forEach((i, k) => { u.home.items[i] = rest[k]; });
    u.home.zOrder = true;
  }
  game.migrate(u);
  extrasMod.migrate(u);
  titlesMod.migrate(u, now());
}

// ------------------------------------------------------------ 캐릭터 상태
const expNeeded = (lv) => 40 + lv * 30;
// 하루 기준은 한국 시간
const kstDay = () => new Date(now() + 9 * 3600_000).toISOString().slice(0, 10);
function giftLeft(u) {
  if (u.giftDay !== kstDay()) return CATALOG.rewards.giftPerDay;
  return Math.max(0, CATALOG.rewards.giftPerDay - u.giftSent);
}
function tickPet(u) {
  const p = u.pet;
  const hours = (now() - p.updated) / 3600_000;
  if (hours > 0) {
    p.full = Math.max(0, p.full - 4 * hours);
    p.mood = Math.max(0, p.mood - (p.full < 20 ? 6 : 2) * hours);
    p.updated = now();
  }
  return p;
}
function userView(u) {
  const p = tickPet(u);
  return {
    username: u.username, code: u.code, coins: u.coins, eventCoins: u.eventCoins, eventEarned: u.eventEarned, nickname: u.nickname, color: u.color,
    nameColor: u.nameColor, nameEffect: effectOf(u), nameEffectOwned: u.nameEffect || null, nameEffectOn: u.nameEffect === 'rainbow' || u.nameEffectOn !== false, nameEffectLocked: u.nameEffect === 'rainbow',
    titles: titlesMod.view(u, { now: now() }),   // 🏅 0.17.2
    pet: { full: Math.round(p.full), mood: Math.round(p.mood), level: p.level, exp: p.exp, next: expNeeded(p.level) },
    owned: u.owned, home: u.home, locked: u.locked, noVisit: !!u.noVisit, skin: { v: u.skin.v, faces: u.skin.faces },
    species: u.species, giftLeft: giftLeft(u),
    ...game.view(u),
    secretNames: secretNames(u),
    music: musicMod.migrateUser(u),   // 🎵 ⭐ 즐겨찾기 · 🏠 배경음 · 🔁 반복 (0.15)
    noticeWriter: !!u.noticeWriter,   // 공지 패널에 글을 쓸 수 있는 사람 (관리자가 writer 명령으로 지정)
    tradesIn: u.tradesIn.map((t) => ({ ...t, fromName: db.users[t.from]?.nickname, fromUser: db.users[t.from]?.username })),
    tradesOut: u.tradesOut.map((t) => ({ ...t, toName: db.users[t.to]?.nickname, toUser: db.users[t.to]?.username })),
  };
}
// 운영자 전용 액세서리는 가진 사람에게만 이름이 보이게 (앱 데이터에도 ??? 로만 감)
// 제작자 후원 링크: Railway → Variables 에 SUPPORT_URL (https://…) 을 넣으면 앱에 '☕ 커피 사주기' 버튼이 생김
const SUPPORT_URL = /^https:\/\/[^\s]{4,300}$/.test(process.env.SUPPORT_URL || '') ? process.env.SUPPORT_URL : '';
const SUPPORT_TEXT = clean(process.env.SUPPORT_TEXT || '', 60);
function catalogFor() {
  // 운영자 전용(액세서리 · 펫 · 낚싯대)은 이름을 ??? 로 (가진 사람만 secretNames 로 진짜 이름을 받음)
  const hide = (obj, keep) => Object.fromEntries(Object.entries(obj).map(([id, x]) => [id, x.secret ? { ...keep(x), name: '???', price: null, secret: true } : x]));
  // 🎉 시즌 이벤트 전용 벽지 · 가구 · 펫도 목록에는 늘 넣어 보내요 (events[키].on 으로 켜짐/꺼짐만 알려 줌).
  // 이벤트가 꺼지면 앱이 이벤트 상점만 숨기고, 이미 산 펫 · 가구 · 벽지는 계속 보이고 쓸 수 있어요.
  // (0.14.2까지는 꺼진 이벤트 것을 목록에서 아예 빼서, 이미 산 펫을 꺼낼 수도 없었음.) 사는 건 game.js 에서 계속 막아요.
  const activeEvents = db.events || {};
  const accessories = hide(CATALOG.accessories, (a) => ({ code: a.code, slot: a.slot }));
  const pets = hide(CATALOG.pets, (p) => ({ code: p.code, likes: p.likes }));
  const rods = hide(CATALOG.rods, (r) => ({ code: r.code, color: r.color, chance: r.chance, nothing: r.nothing, legend: r.legend }));
  const walls = CATALOG.walls;
  const items = CATALOG.items;
  const events = Object.fromEntries(Object.entries(CATALOG.events).map(([k, v]) => [k, { ...v, on: !!activeEvents[k] }]));
  return { ...CATALOG, limits: { ...CATALOG.limits, furnitureMax: MAX_FURNITURE }, roomMax: MAX_PER_ROOM, accessories, pets, rods, walls, items, events, support: SUPPORT_URL ? { url: SUPPORT_URL, text: SUPPORT_TEXT } : null };
}
function secretNames(u) {
  const out = {};
  for (const [id, a] of Object.entries(CATALOG.accessories)) if (a.secret && u.acc?.owned?.[id]) out[id] = a.name;
  for (const [id, p] of Object.entries(CATALOG.pets)) if (p.secret && (u.pets || []).some((x) => x.kind === id)) out[id] = p.name;
  for (const [id, r] of Object.entries(CATALOG.rods)) if (r.secret && u.rods?.[id]) out[id] = r.name;
  return out;
}
function pushMe(ws, reward) { send(ws, { type: 'me', user: userView(ws.user), reward }); }
function addCoins(ws, n, reason) {
  const u = ws.user;
  u.coins = Math.min(MAX_COINS, u.coins + n);
  store.save();
  pushMe(ws, { amount: n, reason });
}

// ------------------------------------------------------------ 방
const sessions = new Map(); // userId -> ws
const rooms = new Map();    // 데스크톱 코드 -> Map(peerId -> ws)
// 👥 친구의 친구 초대: `${집주인id}:${초대받은id}` -> { by: 초대한 사람 id, exp, asked: 집주인에게 물어봤는지 }
const fofInvites = new Map();
const passes = new Map();   // `${ownerId}:${visitorId}` -> 만료시각 (문 두드리기 수락)
const ipConns = new Map();
let nextPeer = 1;

const isHosting = (u) => { const s = sessions.get(u.id); return !!s && s.room === u.code; };
function peerProfile(ws) {
  const u = ws.user;
  return {
    username: u.username, nickname: u.nickname, color: u.color, nameColor: u.nameColor, nameEffect: effectOf(u),
    title: titlesMod.equipped(u), titleIcon: titlesMod.equipped(u) ? CATALOG.titles[titlesMod.equipped(u)].icon : null,   // 🏅 0.17.2
    status: ws.status || '', species: u.species, acc: {}, pose: ws.pose || 'auto',
    owner: ws.room === u.code, skin: u.skin.v ? { v: u.skin.v, faces: u.skin.faces } : null,
    // 꺼내 둔 펫: 놀러 간 집에서도 주인을 따라다님
    pets: ws.room === MEET_CODE ? [] : (u.pets || []).filter((p) => p.out).slice(0, CATALOG.limits.petsOut).map((p) => game.petPublic(p)),   // 0.17.8 꺼내 둔 펫은 늘 보임
    // '친구들 펫 전부 보기'를 켠 사람한테는 꺼내 두지 않은 펫까지 보임
    allPets: ws.room === MEET_CODE ? [] : (u.pets || []).filter((p) => p.out || !p.private).slice(0, CATALOG.limits.petsMax).map((p) => game.petPublic(p)),   // 🙈 숨긴 펫은 쉬는 동안만 빠짐
    fishing: !!ws.fishingHere,
    rod: u.rod || 'rod1',
  };
}
// 보낸 사람을 차단한 사람에게는 보내지 않음 (채팅 · 이모트)
function broadcastFrom(code, obj, sender) {
  const room = rooms.get(code);
  if (!room) return;
  const data = JSON.stringify(obj);
  for (const c of room.values()) {
    if (c === sender || c.readyState !== c.OPEN) continue;
    if (c.user && c.user.blocked.includes(sender.user.id)) continue;
    c.send(data);
  }
}
function broadcast(code, obj, except) {
  const room = rooms.get(code);
  if (!room) return;
  const data = JSON.stringify(obj);
  for (const c of room.values()) if (c !== except && c.readyState === c.OPEN) c.send(data);
}
function leaveRoom(ws, reason) {
  const code = ws.room;
  if (!code) return;
  ws.room = null;
  const room = rooms.get(code);
  if (!room) return;
  room.delete(ws.peerId);
  broadcast(code, { type: 'peer-leave', id: ws.peerId });
  // 집주인이 나가면 방을 닫고 손님도 내보냄
  if (ws.user && ws.user.code === code) {
    for (const c of [...room.values()]) {
      c.room = null;
      send(c, { type: 'room-closed', message: reason || `${ws.user.nickname}님이 집을 비워서 방이 닫혔어요.` });
    }
    room.clear();
    notifyFriends(ws.user);
  } else {
    const owner = ownerOf(code);
    if (owner) notifyFriends(owner); // 친구 목록의 인원 수 갱신
  }
  if (room.size === 0) rooms.delete(code);
}

// ------------------------------------------------------------ 🏢 운영자 회의장
// 자리 1~8번 (db.meeting.seats = { '1': userId, ... }). 1번 = 대표, 8번 = 구석 인형 자리.
// 자리가 있는 사람만 채팅에 '/회의장' 을 쳐서 들어갈 수 있고, 자리는 운영자(공지 권한)가 '/자리 아이디 번호' 로 정해요.
// 회의장 안에서는 채팅만 돼요 (펫 · 낚시 · 이모트 · 놀러 가기 등은 막힘). 나갈 땐 '집으로 돌아가기'.
const MEET_CODE = 'MEETING';   // 데스크톱 코드(8자리)와 겹치지 않음
const MEET_SEATS = 8;
const MEET_MIN_VERSION = '0.14.0';   // 회의장 화면이 있는 앱 버전
const meetData = () => (db.meeting ||= { seats: {} });
const meetSeatOf = (uid) => Number(Object.keys(meetData().seats).find((n) => meetData().seats[n] === uid)) || 0;
function meetSeatNames() {
  const out = {};
  for (const [n, id] of Object.entries(meetData().seats)) { const x = db.users[id]; if (x) out[n] = x.username; }
  return out;
}
const inMeeting = (ws) => !!ws && ws.room === MEET_CODE;
function meetCastSeats() { broadcast(MEET_CODE, { type: 'meet-seats', seats: meetSeatNames() }); }
// 회의장에서 내보내서 내 집으로
function meetSendHome(ws, message) {
  if (!inMeeting(ws)) return;
  leaveRoom(ws);
  if (message) send(ws, { type: 'notice', message, popup: true });
  tryJoin(ws, ws.user);
}
function enterMeeting(ws) {
  const u = ws.user;
  if (inMeeting(ws)) return { ok: true };
  if (olderThan(String(ws.clientVersion || '0.0.0'), MEET_MIN_VERSION)) return { error: `🏢 회의장은 앱 v${MEET_MIN_VERSION} 이상에서 들어갈 수 있어요. 앱을 업데이트해 주세요.` };
  if (!meetSeatOf(u.id)) {
    return { error: u.noticeWriter
      ? `🏢 아직 내 회의장 자리가 없어요. '/자리 ${u.username} 번호(1~${MEET_SEATS})' 로 먼저 자리를 정해 주세요.`
      : '🏢 회의장은 자리를 받은 운영자만 들어갈 수 있어요.' };
  }
  leaveRoom(ws, `${u.nickname}님이 회의에 들어가서 방이 닫혔어요.`);
  ws.fishingHere = false;
  let room = rooms.get(MEET_CODE);
  if (!room) { room = new Map(); rooms.set(MEET_CODE, room); }
  ws.room = MEET_CODE;
  send(ws, {
    type: 'welcome', room: MEET_CODE, id: ws.peerId,
    owner: { username: '', nickname: '🏢 운영자 회의장' },
    isOwner: false, locked: true, max: MEET_SEATS, home: game.homeView(u),   // 집 그림 자리는 내 집으로 채워 둠 (화면엔 회의장만 그려요)
    meeting: { seats: meetSeatNames() },
    peers: [...room.values()].map((c) => ({ id: c.peerId, profile: peerProfile(c) })),
  });
  broadcast(MEET_CODE, { type: 'peer-join', id: ws.peerId, profile: peerProfile(ws) });
  room.set(ws.peerId, ws);
  notifyFriends(u);
  return { ok: true };
}
// 자리 정하기 (앱의 '/자리' 명령 · 관리자 명령 둘 다 여기로)
function meetSetSeat(target, n) {
  n = Math.floor(Number(n));
  if (!(n >= 1 && n <= MEET_SEATS)) return { error: `자리 번호는 1~${MEET_SEATS} 사이로 넣어 주세요.` };
  const seats = meetData().seats;
  const old = meetSeatOf(target.id);
  if (old === n) return { text: `@${target.username}님은 이미 ${n}번 자리예요.` };
  const prevId = seats[n];
  const prev = prevId && db.users[prevId];
  let extra = '';
  if (old) delete seats[old];
  seats[n] = target.id;
  if (prev) {
    if (old) { seats[old] = prev.id; extra = ` (원래 ${n}번이던 @${prev.username}님은 ${old}번으로 자리를 바꿨어요)`; }
    else {
      extra = ` (원래 ${n}번이던 @${prev.username}님은 자리가 없어졌어요)`;
      const ps = sessions.get(prev.id);
      if (ps) send(ps, { type: 'notice', message: `🏢 회의장 ${n}번 자리가 다른 사람에게 갔어요.` });
      meetSendHome(ps, '🏢 회의장 자리가 없어져서 집으로 돌아왔어요.');
    }
  }
  store.save();
  meetCastSeats();
  const ts = sessions.get(target.id);
  if (ts && !inMeeting(ts)) send(ts, { type: 'notice', message: `🏢 운영자 회의장 ${n}번 자리를 받았어요! 채팅에 /회의장 을 치면 들어가요.`, popup: true });
  console.log(`[회의장] @${target.username} → ${n}번${extra}`);
  return { text: `@${target.username}님을 ${n}번 자리로 정했어요.${extra}` };
}
function meetUnseat(target) {
  const old = meetSeatOf(target.id);
  if (!old) return { error: `@${target.username}님은 회의장 자리가 없어요.` };
  delete meetData().seats[old];
  store.save();
  meetSendHome(sessions.get(target.id), '🏢 회의장 자리가 빠져서 집으로 돌아왔어요.');
  meetCastSeats();
  console.log(`[회의장] @${target.username} ${old}번 자리 빼기`);
  return { text: `@${target.username}님의 ${old}번 자리를 뺐어요.` };
}
function meetSeatList() {
  const names = meetSeatNames(), room = rooms.get(MEET_CODE);
  const here = new Set(room ? [...room.values()].map((c) => c.user && c.user.id) : []);
  const list = [];
  for (let n = 1; n <= MEET_SEATS; n++) {
    const id = meetData().seats[n], x = id && db.users[id];
    list.push({ n, username: x ? x.username : null, nickname: x ? x.nickname : null, here: !!(x && here.has(x.id)), online: !!(x && sessions.has(x.id)) });
  }
  return list;
}
// 채팅으로 치는 회의장 명령. 알아들은 명령이면 true (채팅으로 퍼뜨리지 않음)
function meetCommand(ws, text) {
  const mt = /^\/(회의장|회의|자리빼기|자리)(?:\s+(.*))?$/.exec(text.trim());
  if (!mt) return false;
  const u = ws.user, cmd = mt[1], args = (mt[2] || '').trim().split(/\s+/).filter(Boolean);
  const say = (message) => send(ws, { type: 'notice', message });
  if (cmd === '회의장' || cmd === '회의') {
    const r = enterMeeting(ws);
    if (r.error) say(r.error);
    return true;
  }
  if (!u.noticeWriter) { say('🏢 자리 정하기는 운영자만 할 수 있어요.'); return true; }
  if (cmd === '자리' && !args.length) {
    const lines = meetSeatList().map((s) => `${s.n}번 ${s.username ? `${s.nickname}(@${s.username})${s.here ? ' 🟢회의 중' : ''}` : '비어 있음'}`);
    say(`🏢 회의장 자리 · ${lines.join(' · ')}`);
    return true;
  }
  const target = byName((args[0] || '').replace(/^@/, ''));
  if (!target) { say(cmd === '자리' ? `사용법: /자리 아이디 번호 (예: /자리 ${u.username} 1)` : '사용법: /자리빼기 아이디'); return true; }
  if (cmd === '자리') {
    if (!args[1]) { say(`몇 번 자리인지도 넣어 주세요. (예: /자리 ${target.username} 2)`); return true; }
    const r = meetSetSeat(target, args[1]);
    say(r.error || `🏢 ${r.text}`);
    return true;
  }
  const r = meetUnseat(target);
  say(r.error || `🏢 ${r.text}`);
  return true;
}
// 회의장 안에서 되는 것: 채팅 · 집으로 돌아가기 · 프로필 · 공지/쪽지/개인 채팅 읽기
const MEET_OK = new Set(['chat', 'photo', 'join', 'leave', 'profile', 'profile-get', 'profile-set', 'slots-get', 'skin-get', 'notices-get', 'mail-get', 'dm-get', 'dm-read',
  'logout', 'block', 'unblock', 'friend-accept', 'friend-decline']);
// 앱이 알아서 보내는 것 (조용히 무시)
const MEET_SILENT = new Set(['home-pos', 'overlay-pos', 'fish-here', 'music-get', 'music-duration', 'music-error', 'board-get', 'emote']);

// ------------------------------------------------------------ 친구
function friendCard(f) {
  const s = sessions.get(f.id);
  const hosting = isHosting(f);
  return {
    username: f.username, nickname: f.nickname, color: f.color,
    online: !!s, hosting, open: hosting && !f.locked && !f.noVisit, noVisit: !!f.noVisit,   // 0.17.8 🚫 출입 제한
    count: hosting ? (rooms.get(f.code)?.size || 0) : 0, max: MAX_PER_ROOM,
  };
}
// ------------------------------------------------------------ 공지 패널 (업데이트 소식)
// db.notices = [{ id, title, body, at, edited, by }] 최신이 앞. 글쓰기는 noticeWriter 인 사람만
const NOTICE_KEEP = 50;
const noticeList = () => (db.notices || []).map((n) => ({ id: n.id, title: n.title, body: n.body, at: n.at, edited: n.edited || 0, by: db.users[n.by]?.nickname || '운영자' }));
function sendNotices(ws, extra = {}) { send(ws, { type: 'notices', list: noticeList(), canEdit: !!ws.user?.noticeWriter, ...extra }); }
function castNotices(extra = {}) { for (const s of sessions.values()) sendNotices(s, extra); }

// ------------------------------------------------------------ 개인 채팅 (친구끼리만)
// 둘 사이 대화는 db.dms['작은id|큰id'] 에 최근 100개까지 저장. 안 읽은 개수는 u.dmUnread[친구id]
const DM_KEEP = 100;
const dmKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const dmView = (x) => ({ id: x.id, from: db.users[x.from]?.username || '?', text: x.text, at: x.at, ...(x.emote ? { emote: x.emote } : {}) });
// 0.17.3 개인 채팅 이모티콘: emote 가 있으면 새 앱은 그림만, 예전 앱은 text('👋 안녕!')를 보여 줌
const DM_EMOTE_TEXT = { wave: '👋 안녕!', bye: '🚶 잘가!', zzz: '💤 잘자...', good: '👍 굿!', dislike: '👎 싫어...', heart: '💖 좋아!', cheer: '🎉 신난다!', poke: '💥 콕!' };
// ------------------------------------------------------------ ✉️ 운영자에게 쪽지
// db.mail = { seq, list: [{ id, from, text, at, read, replies: [{ text, at, by }], fresh }] } 최근 MAIL_KEEP개.
// 받는 사람은 운영자(noticeWriter) 모두 + 관리자 명령(inbox). read: 운영자가 읽음, fresh: 보낸 사람이 아직 못 본 답장
const MAIL_KEEP = 300;
const mailBox = () => (db.mail ||= { seq: 0, list: [] });
const mailView = (x) => ({ id: x.id, from: db.users[x.from]?.username || '?', nickname: db.users[x.from]?.nickname || '(나간 사람)', text: x.text, at: x.at, read: !!x.read, fresh: !!x.fresh,
  replies: (x.replies || []).map((r) => ({ text: r.text, at: r.at, by: (r.by && db.users[r.by]?.nickname) || '운영자' })) });
// 쪽지는 줄바꿈을 살려요 (최대 10줄)
const cleanMail = (t) => String(t ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').split('\n').map((l) => l.trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n').trim().split('\n').slice(0, 10).join('\n').slice(0, 500);
const mailUnread = () => mailBox().list.filter((x) => !x.read).length;
function sendMail(ws, extra = {}) {
  const u = ws.user;
  if (!u) return;
  const list = mailBox().list;
  const mine = list.filter((x) => x.from === u.id).map(mailView).reverse();
  const out = { type: 'mail', mine, newReplies: mine.filter((x) => x.fresh).length, ...extra };
  if (u.noticeWriter) { out.inbox = list.map(mailView).reverse(); out.unread = mailUnread(); }
  send(ws, out);
}
function castMailToWriters(extra = {}) { for (const s of sessions.values()) if (s.user?.noticeWriter) sendMail(s, extra); }
// 운영자 답장 (앱의 운영자든 관리자 명령이든 같은 길로)
function replyMail(x, text, byUser) {
  (x.replies ||= []).push({ text, at: now(), by: byUser?.id || null });
  x.read = true; x.fresh = true;
  store.save();
  const s = sessions.get(x.from);
  if (s) { sendMail(s); send(s, { type: 'notice', message: `📬 운영자 답장이 왔어요: ${text.length > 40 ? text.slice(0, 40) + '…' : text}`, popup: true }); }
  castMailToWriters();
}

function friendsView(u) {
  const list = (ids) => ids.map((id) => db.users[id]).filter(Boolean);
  const unread = u.dmUnread || {};
  return {
    // 0.17.8 ⭐ 즐겨찾기 친구가 맨 위
    friends: list(u.friends).map((f) => ({ ...friendCard(f), unread: unread[f.id] || 0, fav: (u.favFriends || []).includes(f.id) }))
      .sort((a, b) => (b.fav - a.fav) || (b.open - a.open) || (b.online - a.online) || a.nickname.localeCompare(b.nickname)),
    incoming: list(u.reqIn).map((f) => ({ username: f.username, nickname: f.nickname, color: f.color })),
    outgoing: list(u.reqOut).map((f) => ({ username: f.username, nickname: f.nickname })),
    blocked: list(u.blocked).map((f) => ({ username: f.username, nickname: f.nickname })),
  };
}
function pushFriends(u) {
  const s = sessions.get(u.id);
  if (s) send(s, { type: 'friends', ...friendsView(u) });
}
function notifyFriends(u) {
  pushFriends(u);
  for (const id of u.friends) { const f = db.users[id]; if (f) pushFriends(f); }
}
const remove = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); };

// ------------------------------------------------------------ 캐릭터 그림 검사
function checkPng(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) return '그림은 PNG만 받아요.';
  const b64 = dataUrl.slice(22);
  if (b64.length > MAX_SKIN_BYTES * 1.4) return '그림이 너무 커요.';
  const buf = Buffer.from(b64, 'base64');
  if (buf.length > MAX_SKIN_BYTES) return '그림이 너무 커요.';
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length < 33 || !sig.every((b, i) => buf[i] === b) || buf.toString('latin1', 12, 16) !== 'IHDR') return '올바른 PNG 그림이 아니에요.';
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  if (w < 4 || h < 4 || w > MAX_SKIN_SIDE || h > MAX_SKIN_SIDE) return `그림은 ${MAX_SKIN_SIDE}px 이하여야 해요.`;
  return null;
}

// ------------------------------------------------------------ 로그인
async function handleAuth(ws, m) {
  if (ws.authBusy) return;
  ws.authBusy = true;
  const fail = (message) => send(ws, { type: 'auth-fail', mode: m.mode, message });
  ws.clientVersion = clean(m.version, 12);
  try {
    if (olderThan(String(m.version || '0.0.0'), CATALOG.minClientVersion)) {
      return send(ws, { type: 'auth-fail', mode: m.mode, code: 'update-required',
        message: `앱을 업데이트해야 접속할 수 있어요. (지금 v${clean(m.version, 12) || '?'} → 필요 v${CATALOG.minClientVersion} 이상)` });
    }
    if (m.mode === 'register') {
      if (!regLimit.take(ws.ip)) return fail('가입 시도가 너무 많아요. 잠시 후 다시 해 주세요.');
      const username = String(m.username || '').trim();
      const password = String(m.password || '');
      if (!/^[A-Za-z0-9_가-힣]{2,16}$/.test(username)) return fail('아이디는 한글/영문/숫자/_ 2~16자예요.');
      if (password.length < 8 || password.length > 72) return fail('비밀번호는 8~72자로 정해 주세요.');
      const key = username.toLowerCase();
      if (db.names[key] || (db.nameHold?.[key]?.until > now())) return fail('이미 사용 중인 아이디예요.');
      const { salt, hash } = await hashPassword(password);
      if (db.names[key]) return fail('이미 사용 중인 아이디예요.');
      const id = crypto.randomUUID();
      const nickname = clean(m.nickname, 16) || username;
      const u = {
        id, username, salt, hash, code: newCode(), created: now(),
        coins: START_COINS, nickname, color: '#f2a65a',
        pet: { full: 70, mood: 70, level: 1, exp: 0, updated: now() },
        owned: {}, home: { wall: 'basic', items: [] }, locked: false, tokens: [], lastChatReward: 0,
      };
      migrate(u);
      db.users[id] = u; db.names[key] = id; db.codes[u.code] = id;
      const token = issueToken(u, m.device);
      store.save();
      return loginSuccess(ws, u, token);
    }

    if (m.mode === 'login') {
      const username = String(m.username || '').trim();
      const key = username.toLowerCase();
      if (!loginIpLimit.take(ws.ip) || !loginNameFail.ok(key)) return fail('로그인 시도가 너무 많아요. 몇 분 뒤 다시 해 주세요.');
      const u = byName(username);
      const ok = await verifyPassword(String(m.password || '').slice(0, 72), u || DUMMY);
      if (!u || !ok) { loginNameFail.hit(key); return fail('아이디 또는 비밀번호가 맞지 않아요. 비밀번호를 까먹었으면 운영자에게 말해 주세요.'); }
      const token = issueToken(u, m.device);
      store.save();
      return loginSuccess(ws, u, token);
    }

    if (m.mode === 'token') {
      if (!tokenLimit.take(ws.ip)) return fail('잠시 후 다시 시도해 주세요.');
      const hash = sha256(String(m.token || ''));
      const u = db.users[db.tokens[hash]];
      const t = u && u.tokens.find((x) => x.hash === hash);
      if (!t || now() - t.lastUsed > TOKEN_TTL) {
        if (u && t) revokeToken(u, m.token);
        return fail('자동 로그인이 만료됐어요. 다시 로그인해 주세요.');
      }
      t.lastUsed = now();
      store.save();
      return loginSuccess(ws, u, null, hash);
    }
    fail('잘못된 요청이에요.');
  } finally {
    ws.authBusy = false;
  }
}

function loginSuccess(ws, u, token, tokenHash) {
  if (ws.readyState !== ws.OPEN) return;
  clearTimeout(ws.authTimer);
  migrate(u);
  const old = sessions.get(u.id);
  if (old && old !== ws) {
    send(old, { type: 'session-replaced', message: '다른 곳에서 같은 계정으로 로그인해서 연결이 끊겼어요.' });
    leaveRoom(old);
    old.close(4002, 'replaced');
  }
  sessions.set(u.id, ws);
  ws.user = u;
  u.lastSeen = now();
  if (ws.clientVersion) u.appVersion = ws.clientVersion;   // 0.17.3 마지막으로 접속한 앱 버전 (관리자 users · user 에서 확인)
  ws.tokenHash = tokenHash || (token ? sha256(token) : null);
  titlesMod.markEvents(u, db.events || {});   // 🏅 켜진 이벤트 칭호 열기
  send(ws, { type: 'auth-ok', token, user: userView(u), catalog: catalogFor(), serverNow: now() });
  if (u.accNote) {   // 0.17.2 액세서리가 칭호로 바뀌어서 정리한 것 알려 주기 (한 번만)
    const n = u.accNote;
    send(ws, { type: 'notice', popup: true, message: `🏅 액세서리가 '칭호'로 바뀌었어요! 가지고 있던 액세서리 ${n.n}개를 정리했어요.${n.coins ? ` 산 값 🪙${n.coins.toLocaleString()}을 돌려줬어요.` : ''}${n.honor ? ' 운영자에게 받은 액세서리 대신 🎖️ 명예 버디 칭호를 드려요.' : ''} 상점 → 🏅 칭호에서 확인해 보세요.` });
    delete u.accNote; store.save();
  }
  sendNotices(ws);
  sendMail(ws);
  notifyFriends(u);
  giveLimited(ws);   // 0.17.5 🍫 오늘이 선물 날이면 한정 펫
  ws.rewardTimer = setInterval(() => {
    if (ws.readyState !== ws.OPEN || sessions.get(u.id) !== ws) return;
    giveLimited(ws);   // 자정을 넘겨 접속해 있던 사람도 받게 (1분마다 확인)
    const d = game.daily(u, 'online');
    const left = CATALOG.limits.onlinePerDay - d.n;
    if (left <= 0) return;
    const n = Math.min(CATALOG.rewards.online, left);
    d.n += n;
    addCoins(ws, n, d.n >= CATALOG.limits.onlinePerDay ? 'online-max' : 'online');
  }, 60_000);
  // 🎉 시즌 이벤트 코인: 접속해 있으면 5분마다 자동으로 받음 (어떤 이벤트든 켜져 있을 때만)
  ws.eventCoinTimer = setInterval(() => {
    if (ws.readyState !== ws.OPEN || sessions.get(u.id) !== ws) return;
    const on = Object.keys(CATALOG.events).filter((k) => (db.events || {})[k]);
    if (!on.length) return;
    titlesMod.markEvents(u, db.events || {});   // 🏅 이벤트 칭호 열기
    const n = CATALOG.rewards.eventCoin;
    for (const k of on) {   // 켜진 이벤트마다 그 이벤트 코인을 따로 받음
      u.eventCoins[k] = (u.eventCoins[k] || 0) + n;
      u.eventEarned[k] = (u.eventEarned[k] || 0) + n;
    }
    store.save();
    pushMe(ws, { amount: n, reason: 'event-coin', events: on });
  }, CATALOG.rewards.eventCoinEveryMs);
}

// 0.17.5 🍫 한정 선물 펫 알림 (새 앱은 축하 창, 예전 앱은 공지 글)
function limitedNotice(ws, r) {
  const g = r.gift;
  if (r.full) { send(ws, { type: 'notice', popup: true, message: `${g.icon} ${g.name} 선물 펫이 왔는데 펫이 꽉 차서(${CATALOG.limits.petsMax}마리) 못 받았어요. 한 마리 정리하고 다시 접속해 주세요!` }); return; }
  send(ws, { type: 'limited-gift', key: r.key, kind: r.pet.kind, petId: r.pet.id, name: r.def.name, code: r.def.code, title: g.name, icon: g.icon });
  send(ws, { type: 'notice', message: `${g.icon} ${g.name} 선물! 한정 펫 '${r.def.name}'을(를) 받았어요. 펫 탭에서 확인해 보세요!` });
}
function giveLimited(ws) {
  const u = ws.user;
  if (!u || !CATALOG.limitedGifts) return;
  const got = limitedMod.check(u);
  if (!got.length) return;
  store.save();
  if (got.some((r) => !r.full)) { pushMe(ws); if (ws.room) broadcast(ws.room, { type: 'peer-update', id: ws.peerId, profile: peerProfile(ws) }, ws); }
  for (const r of got) { limitedNotice(ws, r); if (!r.full) console.log(`[선물] @${u.username} ${r.gift.name} ${r.def.code} ${r.def.name}`); }
}

// ------------------------------------------------------------ 방 들어가기
function tryJoin(ws, owner) {
  const u = ws.user;
  const isOwner = owner.id === u.id;
  if (!isOwner) {
    if (owner.blocked.includes(u.id) || u.blocked.includes(owner.id)) return send(ws, { type: 'error', message: '이 집에는 들어갈 수 없어요.' });
    if (!isHosting(owner)) return send(ws, { type: 'error', message: `${owner.nickname}님은 지금 집에 없어요.` });
    const passKey = `${owner.id}:${u.id}`;
    const pass = passes.get(passKey);
    if (owner.locked && !(pass && pass > now())) {
      const friend = owner.friends.includes(u.id);
      return send(ws, { type: 'error', message: `${owner.nickname}님의 방 문이 닫혀 있어요.${friend ? ' 친구 목록에서 문을 두드려 보세요.' : ''}` });
    }
    if (owner.noVisit) return send(ws, { type: 'error', message: `${owner.nickname}님은 지금 🚫 출입 제한 중이라 들어갈 수 없어요.` });   // 0.17.8 초대장 · 허락이 있어도 못 들어옴
    passes.delete(passKey);
  }
  const code = owner.code;
  let room = rooms.get(code);
  if (room && room.size >= MAX_PER_ROOM && ws.room !== code) return send(ws, { type: 'error', message: `방이 꽉 찼어요. (최대 ${MAX_PER_ROOM}명)` });
  if (ws.room === code) return;
  leaveRoom(ws);
  if (!(room = rooms.get(code))) { room = new Map(); rooms.set(code, room); }
  ws.room = code;
  send(ws, {
    type: 'welcome', room: code, id: ws.peerId,
    owner: { username: owner.username, nickname: owner.nickname },
    isOwner, locked: owner.locked, max: MAX_PER_ROOM, home: game.homeView(owner),
    peers: [...room.values()].map((c) => ({ id: c.peerId, profile: peerProfile(c) })),
  });
  broadcast(code, { type: 'peer-join', id: ws.peerId, profile: peerProfile(ws) });
  room.set(ws.peerId, ws);
  notifyFriends(owner);
}

// 🛋️ 가구 배치 저장 (꾸미기 · 0.17 집 슬롯 불러오기에서 같이 씀). 가진 개수보다 많은 가구는 빼요
function placeItems(ws, rawItems) {
  const u = ws.user;
  // 한도를 넘으면 예전엔 아무 말 없이 무시해서, 앱 화면엔 놓인 것처럼 보이다가 다음 가구를 꺼낼 때 가방으로 돌아갔어요.
  // → 안내하고, 지금 저장된 배치를 다시 보내서 앱 화면을 맞춰 줌
  if (rawItems.length > MAX_FURNITURE) {
    send(ws, { type: 'error', message: `가구는 한 집에 ${MAX_FURNITURE}개까지 놓을 수 있어요. 다른 가구를 가방에 넣고 놓아 주세요.` });
    pushMe(ws);
    return false;
  }
  const used = {};
  const items = [];
  for (const it of rawItems) {
    if (!it || !CATALOG.items[it.item]) continue;
    const x = Number(it.x), y = Number(it.y), rot = Number(it.rot) || 0;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(rot)) continue;
    used[it.item] = (used[it.item] || 0) + 1;
    if (used[it.item] > (u.owned[it.item] || 0)) continue;
    items.push({
      item: it.item,
      x: Math.round(Math.min(roomW(u) - 10, Math.max(10, x))),
      y: Math.round(Math.min(ROOM_H - 4, Math.max(40, y))),
      rot: ((Math.round(rot) % 360) + 360) % 360,
      flip: !!it.flip,
      ...(typeof it.uid === 'string' ? { uid: it.uid.slice(0, 16) } : {}),
      // 🧱 가벽 오른쪽 방 벽지 (가진 벽지만)
      ...(CATALOG.items[it.item].divider && typeof it.wall === 'string' && CATALOG.walls[it.wall] && (it.wall === 'basic' || u.owned[it.wall]) ? { wall: it.wall } : {}),
    });
  }
  // 컴퓨터처럼 뺄 수 없는 가구는 다시 넣어 둠
  for (const [id, def] of Object.entries(CATALOG.items)) {
    if (def.required && !items.some((it) => it.item === id)) items.push({ item: id, ...def.start, rot: 0, flip: false });
  }
  // 어항 번호표 이어 주기: 예전 앱은 번호표 없이 보내서, 그대로 두면 물고기가 가방으로 돌아가 버림.
  // 번호표가 없거나 모르는 번호면, 같은 종류의 원래 어항 번호를 순서대로 다시 붙여 줌
  {
    const prev = {}; // 어항 종류 -> 원래 번호들
    for (const it of u.home.items) if (it.uid && CATALOG.items[it.item]?.tank) (prev[it.item] ||= []).push(it.uid);
    const kindOf = new Map(); // 원래 번호 -> 어항 종류 (작은 어항 번호를 큰 어항에 붙이는 꼼수 방지)
    for (const [kind, uids] of Object.entries(prev)) for (const x of uids) kindOf.set(x, kind);
    const ok = (it, seen) => it.uid && kindOf.get(it.uid) === it.item && !seen.has(it.uid);
    const taken = new Set();
    for (const it of items) if (CATALOG.items[it.item]?.tank && ok(it, taken)) taken.add(it.uid); else if (CATALOG.items[it.item]?.tank) it._fix = true;
    for (const it of items) {
      if (!it._fix) continue;
      delete it._fix;
      const reuse = (prev[it.item] || []).find((x) => !taken.has(x));
      if (reuse) { it.uid = reuse; taken.add(reuse); } else delete it.uid;
    }
  }
  u.home.items = items;
  game.onPlace(u);   // 어항 번호 정리, 치운 어항 속 물고기는 가방으로
  store.save();
  pushMe(ws);
  broadcast(u.code, { type: 'home', home: game.homeView(u) });
  music.homeChanged(u.code);   // 레코드를 치웠으면 노래 멈춤
  return true;
}
// 캐릭터 그림이 바뀐 뒤: 저장 · 나에게 그림 보내기 · 같은 방 사람들에게 알리기 (skin-set · 0.17 캐릭터 슬롯)
function skinChanged(ws) {
  const u = ws.user;
  store.save();
  // 내 그림은 바로 같이 보내 줌 (따로 요청하다 막히면 나만 기본 고양이로 보였음)
  if (u.skin.v) send(ws, { type: 'skin', username: u.username, v: u.skin.v, faces: u.skin.faces, stand: u.skin.stand, sit: u.skin.sit, walk: u.skin.walk, lie: u.skin.lie, fall: u.skin.fall });
  pushMe(ws, { reason: 'skin' });
  if (ws.room) broadcast(ws.room, { type: 'peer-update', id: ws.peerId, profile: peerProfile(ws) }, ws);
}

// ------------------------------------------------------------ 로그인 후 메시지
function handle(ws, m) {
  const u = ws.user;
  if (inMeeting(ws) && !MEET_OK.has(m.type)) {
    if (!MEET_SILENT.has(m.type)) send(ws, { type: 'error', message: "🏢 회의장에서는 채팅만 할 수 있어요. 나가려면 '집으로 돌아가기'를 눌러요." });
    return;
  }
  switch (m.type) {
    case 'profile': {
      const p = m.profile || {};
      const before = u.nickname;
      if ('nickname' in p) u.nickname = clean(p.nickname, 16) || u.username;
      if ('color' in p && /^#[0-9a-f]{6}$/i.test(p.color)) u.color = p.color;
      if ('nameColor' in p) u.nameColor = p.nameColor === null || /^#[0-9a-f]{6}$/i.test(p.nameColor) ? (p.nameColor || null) : u.nameColor;
      if ('species' in p && CATALOG.species.includes(p.species)) u.species = p.species;
      if ('status' in p) ws.status = clean(p.status, 24);
      if ('pose' in p) ws.pose = ['stand', 'sit', 'lie'].includes(p.pose) ? p.pose : 'auto';
      store.save();
      if (ws.room) broadcast(ws.room, { type: 'peer-update', id: ws.peerId, profile: peerProfile(ws) }, ws);
      if (before !== u.nickname) notifyFriends(u);
      break;
    }

    case 'join': {
      if (!joinFailLimit.ok(ws.ip)) return send(ws, { type: 'error', message: '코드를 너무 많이 틀렸어요. 10분 뒤 다시 해 주세요.' });
      const code = clean(m.code, 8).toUpperCase();
      if (code === MEET_CODE) {   // 🏢 끊겼다 다시 붙으면 회의장으로 (자리가 없어졌으면 내 집으로)
        const r = enterMeeting(ws);
        if (r.error) { send(ws, { type: 'notice', message: r.error }); tryJoin(ws, u); }
        break;
      }
      if (inMeeting(ws) && code !== u.code) return send(ws, { type: 'error', message: "🏢 회의 중이에요. 먼저 '집으로 돌아가기'를 눌러요." });
      const owner = /^[A-Z0-9]{8}$/.test(code) ? ownerOf(code) : null;
      if (!owner) { joinFailLimit.hit(ws.ip); return send(ws, { type: 'error', message: '없는 데스크톱 코드예요.' }); }
      tryJoin(ws, owner);
      break;
    }

    case 'visit': { // 친구 목록에서 놀러 가기
      const f = byName(m.username);
      const pass = f && passes.get(`${f.id}:${u.id}`);
      if (!f || !(u.friends.includes(f.id) || (pass && pass > now()))) return send(ws, { type: 'error', message: '친구가 아니에요.' });
      tryJoin(ws, f);
      break;
    }

    case 'leave':
      leaveRoom(ws);
      send(ws, { type: 'left' });
      break;

    case 'chat': {
      if (typeof m.text === 'string' && m.text.trim().startsWith('/') && meetCommand(ws, clean(m.text, 200))) break;
      if (!ws.room) return;
      if (!perSocket(ws, 'chat', 5, 5000)) return send(ws, { type: 'error', message: '채팅을 너무 빨리 보내고 있어요. 잠깐만요!' });
      const text = clean(m.text, 200);
      if (!text) return;
      broadcastFrom(ws.room, { type: 'chat', id: ws.peerId, text, ts: now() }, ws);   // 보낸 시간 (서버 시계)
      const others = rooms.get(ws.room).size > 1;
      if (others && text.length >= 2 && text !== ws.lastChat &&
          now() - (u.lastChatReward || 0) >= CATALOG.rewards.chatCooldownSec * 1000) {
        u.lastChatReward = now();
        addCoins(ws, CATALOG.rewards.chat, 'chat');
      }
      ws.lastChat = text;
      break;
    }

    case 'photo': {   // 📷 0.15.1 방 안 사진: 서버에 저장하지 않고, 지금 같은 방에 있는 사람에게만 바로 전달
      if (!ws.room) return send(ws, { type: 'error', message: '방에 있을 때만 사진을 보낼 수 있어요.' });
      if (!perSocket(ws, 'photo', PHOTO_PER_MIN, 60_000)) return send(ws, { type: 'error', message: `사진은 1분에 ${PHOTO_PER_MIN}장까지 보낼 수 있어요. 잠깐만요!` });
      const data = typeof m.data === 'string' ? m.data : '';
      const mm = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
      if (!mm || data.length > PHOTO_MAX) return send(ws, { type: 'error', message: '사진이 너무 크거나 올바른 그림 파일이 아니에요.' });
      const head = Buffer.from(mm[2].slice(0, 24), 'base64');   // 진짜 그림 파일인지 앞부분 확인
      const okHead = (mm[1] === 'jpeg' && head[0] === 0xff && head[1] === 0xd8)
        || (mm[1] === 'png' && head.slice(0, 4).toString('hex') === '89504e47')
        || (mm[1] === 'webp' && head.slice(0, 4).toString() === 'RIFF' && head.slice(8, 12).toString() === 'WEBP');
      if (!okHead) return send(ws, { type: 'error', message: '올바른 그림 파일이 아니에요.' });
      const dim = (v) => Math.max(1, Math.min(4000, Math.round(Number(v) || 1)));
      broadcastFrom(ws.room, { type: 'photo', id: ws.peerId, data, w: dim(m.w), h: dim(m.h), ts: now() }, ws);   // 차단한 사람에게는 안 감
      break;
    }

    case 'fish-here': { // 낚시터에 들어왔는지 (같은 방 사람들 낚시 화면에 같이 보임)
      if (!perSocket(ws, 'fishhere', 10, 10_000)) return;
      const on = !!m.on;
      if (on === !!ws.fishingHere) return;
      ws.fishingHere = on;
      if (ws.room) broadcast(ws.room, { type: 'fish-peer', id: ws.peerId, here: on, state: 'idle' }, ws);
      break;
    }

    case 'fish-show': {   // 🐟 최근 잡은 물고기를 머리 위로 들어 자랑 (낚시터에 같이 있는 사람들에게)
      const code = String(m.code || '');
      if (!CATALOG.fish[code] || !u.dex?.[code]) return;
      if (!perSocket(ws, 'fishshow', 4, 10_000)) return;
      const size = Math.max(0, Math.min(9999, Math.floor(Number(m.size) || 0)));
      if (ws.room && ws.fishingHere) broadcast(ws.room, { type: 'fish-show', id: ws.peerId, code, size }, ws);
      break;
    }

    case 'emote': {
      if (!ws.room || !EMOTES.has(m.kind) || !perSocket(ws, 'emote', 8, 5000)) return;
      const room = rooms.get(ws.room);
      const target = typeof m.target === 'string' && room.has(m.target) ? m.target : undefined;
      broadcastFrom(ws.room, { type: 'emote', id: ws.peerId, kind: m.kind, target }, ws);
      break;
    }

    // 🧍 집 안 캐릭터 위치: 모두의 화면에서 같은 자리에 보이게 (주인 쪽이 정하고, 나머지는 그대로 따라감)
    case 'home-pos': {
      if (!ws.room || !perSocket(ws, 'home-pos', 12, 1000)) return;
      const x = Number(m.x), y = Number(m.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const dir = m.dir === -1 ? -1 : 1;
      const state = typeof m.state === 'string' ? m.state.slice(0, 16) : 'idle';
      broadcastFrom(ws.room, { type: 'peer-pos', id: ws.peerId, x, y, state, dir, inBed: !!m.inBed }, ws);
      break;
    }

    // 🚶 0.13.8 앱끼리만 쓰는 바탕화면 버디 위치 (새 앱은 각자 따로 움직여서 안 보내고 받아도 무시)
    case 'overlay-pos': {
      if (!ws.room || !perSocket(ws, 'overlay-pos', 12, 1000)) return;
      const fx = Number(m.fx);
      if (!Number.isFinite(fx) || fx < -0.2 || fx > 1.2) return;
      const dir = m.dir === -1 ? -1 : 1;
      const state = typeof m.state === 'string' ? m.state.slice(0, 16) : 'idle';
      broadcastFrom(ws.room, { type: 'overlay-peer-pos', id: ws.peerId, fx, dir, state }, ws);
      break;
    }

    // ---------------- 친구
    case 'friend-add':
    case 'friend-add-peer': {   // peer: 같은 방에 있는 사람에게 바로 신청 (코드 없이)
      if (!perSocket(ws, 'friend', 10, 60_000)) return send(ws, { type: 'error', message: '잠시 후 다시 해 주세요.' });
      let f;
      if (m.type === 'friend-add-peer') {
        const r = ws.room && rooms.get(ws.room);
        const c = r && r.get(String(m.id || ''));
        f = c && c !== ws ? c.user : null;
        if (!f) return send(ws, { type: 'error', message: '같은 방에 있는 사람에게만 신청할 수 있어요.' });
      } else {
        if (!friendFailLimit.ok(ws.ip)) return send(ws, { type: 'error', message: '너무 많이 틀렸어요. 10분 뒤 다시 해 주세요.' });
        // 친구 추가는 데스크톱 코드로만 (아이디를 찍어 보며 누가 가입했는지 알아내는 걸 막음)
        const code = clean(m.query, 8).toUpperCase();
        f = /^[A-Z0-9]{8}$/.test(code) ? ownerOf(code) : null;
        if (!f) { friendFailLimit.hit(ws.ip); return send(ws, { type: 'error', message: '그 데스크톱 코드를 가진 사람이 없어요.' }); }
      }
      if (f.id === u.id) return send(ws, { type: 'error', message: '나 자신은 친구로 추가할 수 없어요.' });
      if (f.blocked.includes(u.id) || u.blocked.includes(f.id)) return send(ws, { type: 'error', message: '이 사람은 친구로 추가할 수 없어요.' });
      if (u.friends.includes(f.id)) return send(ws, { type: 'error', message: '이미 친구예요.' });
      if (u.friends.length >= MAX_FRIENDS) return send(ws, { type: 'error', message: `친구는 ${MAX_FRIENDS}명까지예요.` });
      if (u.reqIn.includes(f.id)) { // 상대도 나에게 신청했으면 바로 친구
        remove(u.reqIn, f.id); remove(f.reqOut, u.id);
        u.friends.push(f.id); f.friends.push(u.id);
        send(sessions.get(f.id), { type: 'notice', message: `${u.nickname}(@${u.username})님과 친구가 됐어요!` });
        send(ws, { type: 'notice', message: `${f.nickname}(@${f.username})님과 친구가 됐어요!` });
      } else {
        if (u.reqOut.includes(f.id)) return send(ws, { type: 'error', message: '이미 친구 신청을 보냈어요.' });
        if (u.reqOut.length >= MAX_PENDING || f.reqIn.length >= MAX_PENDING) return send(ws, { type: 'error', message: '대기 중인 신청이 너무 많아요.' });
        u.reqOut.push(f.id); f.reqIn.push(u.id);
        send(sessions.get(f.id), { type: 'notice', message: `${u.nickname}(@${u.username})님이 친구 신청을 보냈어요.`, friendRequest: true });
        send(ws, { type: 'notice', message: `${f.nickname}(@${f.username})님에게 친구 신청을 보냈어요.` });
      }
      store.save();
      pushFriends(u); pushFriends(f);
      break;
    }
    case 'friend-accept':
    case 'friend-decline': {
      const f = byName(m.username);
      if (!f || !u.reqIn.includes(f.id)) return;
      remove(u.reqIn, f.id); remove(f.reqOut, u.id);
      if (m.type === 'friend-accept' && u.friends.length < MAX_FRIENDS) {
        u.friends.push(f.id); f.friends.push(u.id);
        send(sessions.get(f.id), { type: 'notice', message: `${u.nickname}(@${u.username})님이 친구 신청을 받았어요!` });
      }
      store.save();
      pushFriends(u); pushFriends(f);
      break;
    }
    case 'notices-get': sendNotices(ws); break;
    case 'mail-get': {   // 쪽지함 열기 (open 이면 내 쪽지의 새 답장을 읽음 처리)
      if (m.open) {
        let changed = false;
        for (const x of mailBox().list) if (x.from === u.id && x.fresh) { x.fresh = false; changed = true; }
        if (changed) store.save();
      }
      sendMail(ws);
      break;
    }
    case 'mail-send': {
      if (!perSocket(ws, 'mail', 3, 10 * 60_000)) return send(ws, { type: 'error', message: '쪽지는 10분에 3개까지 보낼 수 있어요. 잠시 후에 다시 보내 주세요.' });
      const text = cleanMail(m.text);
      if (!text) return send(ws, { type: 'error', message: '쪽지 내용을 써 주세요.' });
      const box = mailBox();
      box.list.push({ id: ++box.seq, from: u.id, text, at: now(), read: false, replies: [] });
      if (box.list.length > MAIL_KEEP) box.list.splice(0, box.list.length - MAIL_KEEP);
      store.save();
      sendMail(ws, { sent: true });
      console.log(`[쪽지] @${u.username}: ${text}`);
      castMailToWriters({ fresh: { from: u.nickname, text } });
      break;
    }
    case 'mail-reply': {
      if (!u.noticeWriter) return send(ws, { type: 'error', message: '쪽지 답장은 운영자만 할 수 있어요.' });
      const x = mailBox().list.find((y) => y.id === Number(m.id));
      const text = cleanMail(m.text);
      if (!x || !text) return;
      replyMail(x, text, u);
      break;
    }
    case 'mail-read': {   // 운영자: 읽음 / 안 읽음 표시
      if (!u.noticeWriter) return;
      const x = mailBox().list.find((y) => y.id === Number(m.id));
      if (!x) return;
      x.read = m.read !== false;
      store.save(); castMailToWriters();
      break;
    }
    case 'mail-del': {   // 운영자: 쪽지 지우기
      if (!u.noticeWriter) return;
      const box = mailBox();
      box.list = box.list.filter((y) => y.id !== Number(m.id));
      store.save(); castMailToWriters();
      break;
    }
    case 'notice-post':
    case 'notice-edit': {
      if (!u.noticeWriter) return send(ws, { type: 'error', message: '공지는 운영자만 쓸 수 있어요.' });
      if (!perSocket(ws, 'notice', 20, 60_000)) return;
      const title = clean(m.title, 60);
      const body = String(m.body || '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').trim().slice(0, 3000);
      if (!title) return send(ws, { type: 'error', message: '공지 제목을 써 주세요.' });
      db.notices ||= [];
      if (m.type === 'notice-post') {
        db.noticeSeq = (db.noticeSeq || 0) + 1;
        db.notices.unshift({ id: 'n' + db.noticeSeq, title, body, at: now(), by: u.id });
        if (db.notices.length > NOTICE_KEEP) db.notices.length = NOTICE_KEEP;
        store.save();
        console.log(`[공지] @${u.username}: ${title}`);
        castNotices({ fresh: db.notices[0].id });
      } else {
        const n = db.notices.find((x) => x.id === String(m.id || ''));
        if (!n) return;
        n.title = title; n.body = body; n.edited = now();
        store.save(); castNotices();
      }
      break;
    }
    case 'notice-del': {
      if (!u.noticeWriter) return send(ws, { type: 'error', message: '공지는 운영자만 지울 수 있어요.' });
      db.notices = (db.notices || []).filter((x) => x.id !== String(m.id || ''));
      store.save(); castNotices();
      break;
    }
    case 'dm-send': {
      const f = byName(m.to);
      if (!f || !u.friends.includes(f.id)) return send(ws, { type: 'error', message: '친구에게만 개인 채팅을 보낼 수 있어요.' });
      if (f.blocked.includes(u.id) || u.blocked.includes(f.id)) return send(ws, { type: 'error', message: '이 친구에게는 보낼 수 없어요.' });
      if (!perSocket(ws, 'dm', 20, 60_000)) return send(ws, { type: 'error', message: '메시지를 너무 빨리 보내고 있어요. 잠깐만요!' });
      const emote = m.emote && EMOTES.has(m.emote) ? m.emote : null;
      const text = emote ? DM_EMOTE_TEXT[emote] : clean(m.text, 300);
      if (!text) return;
      db.dms ||= {};
      const key = dmKey(u.id, f.id);
      const box = (db.dms[key] ||= { seq: 0, msgs: [] });
      const msg = { id: ++box.seq, from: u.id, text, at: now(), ...(emote ? { emote } : {}) };
      box.msgs.push(msg);
      if (box.msgs.length > DM_KEEP) box.msgs.splice(0, box.msgs.length - DM_KEEP);
      f.dmUnread ||= {}; f.dmUnread[u.id] = Math.min(99, (f.dmUnread[u.id] || 0) + 1);
      store.save();
      const v = dmView(msg);
      send(ws, { type: 'dm', peer: f.username, msg: v });
      const fs = sessions.get(f.id);
      if (fs) { send(fs, { type: 'dm', peer: u.username, nickname: u.nickname, msg: v }); pushFriends(f); }
      break;
    }
    case 'dm-get': {   // 대화 불러오기 + 읽음 처리
      const f = byName(m.with);
      if (!f || !u.friends.includes(f.id)) return;
      const box = db.dms?.[dmKey(u.id, f.id)];
      if (u.dmUnread?.[f.id]) { delete u.dmUnread[f.id]; store.save(); pushFriends(u); }
      send(ws, { type: 'dm-history', peer: f.username, nickname: f.nickname, msgs: (box?.msgs || []).map(dmView) });
      break;
    }
    case 'dm-read': {
      const f = byName(m.with);
      if (f && u.dmUnread?.[f.id]) { delete u.dmUnread[f.id]; store.save(); pushFriends(u); }
      break;
    }
    case 'friend-remove': {
      const f = byName(m.username);
      if (!f) return;
      remove(u.friends, f.id); remove(f.friends, u.id);
      remove(u.reqOut, f.id); remove(f.reqIn, u.id);
      if (u.favFriends) remove(u.favFriends, f.id); if (f.favFriends) remove(f.favFriends, u.id);   // 0.17.8
      store.save();
      pushFriends(u); pushFriends(f);
      break;
    }
    case 'friend-fav': {   // 0.17.8 ⭐ 친구 즐겨찾기 (나만 보는 표시, 친구에겐 안 알려짐)
      const f = byName(m.username);
      if (!f || !u.friends.includes(f.id)) return;
      u.favFriends = (u.favFriends || []).filter((id) => id !== f.id && u.friends.includes(id));
      if (m.on) u.favFriends.unshift(f.id);
      store.save();
      pushFriends(u);
      break;
    }
    case 'knock': {
      const f = byName(m.username);
      if (!f || !u.friends.includes(f.id)) return;
      if (f.blocked.includes(u.id)) return send(ws, { type: 'error', message: '이 집에는 들어갈 수 없어요.' });
      if (f.noVisit) return send(ws, { type: 'error', message: `${f.nickname}님은 지금 🚫 출입 제한 중이라 노크할 수 없어요.` });   // 0.17.8
      if (!perSocket(ws, 'knock', 1, 15_000)) return send(ws, { type: 'error', message: '방금 두드렸어요. 조금 기다려 주세요.' });
      const host = sessions.get(f.id);
      if (!host || !isHosting(f)) return send(ws, { type: 'error', message: `${f.nickname}님은 지금 집에 없어요.` });
      send(host, { type: 'knock', from: { username: u.username, nickname: u.nickname, color: u.color } });
      send(ws, { type: 'notice', message: `${f.nickname}님 방 문을 똑똑 두드렸어요. 대답을 기다려요…` });
      break;
    }
    case 'home-expand': {   // 🏗️ 집 넓히기 (한 단계씩)
      const steps = CATALOG.room.expand;
      const lv = u.home.level || 0;
      const next = steps[lv + 1];
      if (!next) return send(ws, { type: 'error', message: '이미 가장 넓은 집이에요!' });
      if (u.coins < next.price) return send(ws, { type: 'error', message: `코인이 부족해요. (🪙${next.price.toLocaleString()} 필요)` });
      u.coins -= next.price;
      u.home.level = lv + 1;
      store.save();
      pushMe(ws, { amount: -next.price, reason: 'expand', name: next.name });
      broadcast(u.code, { type: 'home', home: game.homeView(u) });
      console.log(`[증축] @${u.username} → ${u.home.level}단계 (${next.w})`);
      break;
    }
    case 'invite': {   // 친구를 내 방으로 초대 (문이 닫혀 있어도 들어올 수 있는 초대장)
      const f = byName(m.username);
      if (!f || !u.friends.includes(f.id)) return send(ws, { type: 'error', message: '친구만 초대할 수 있어요.' });
      if (f.blocked.includes(u.id) || u.blocked.includes(f.id)) return send(ws, { type: 'error', message: '이 친구는 초대할 수 없어요.' });
      if (ws.room !== u.code) return send(ws, { type: 'error', message: '내 집에 있을 때만 초대할 수 있어요.' });
      if (u.noVisit) return send(ws, { type: 'error', message: '🚫 출입 제한 중엔 초대를 보낼 수 없어요. (컴퓨터에서 출입 제한을 꺼 주세요)' });   // 0.17.8
      if (f.noVisit) return send(ws, { type: 'error', message: `${f.nickname}님은 지금 🚫 출입 제한 중이라 초대를 받을 수 없어요.` });
      if (!perSocket(ws, 'invite-' + f.id, 1, 10_000)) return send(ws, { type: 'error', message: '방금 초대했어요. 조금만 기다려 주세요.' });
      const fs2 = sessions.get(f.id);
      if (!fs2) return send(ws, { type: 'error', message: `${f.nickname}님은 지금 오프라인이에요.` });
      if (fs2.room === u.code) return send(ws, { type: 'notice', message: `${f.nickname}님은 이미 같이 있어요.` });
      const count = rooms.get(u.code)?.size || 0;
      if (count >= MAX_PER_ROOM) return send(ws, { type: 'error', message: `방이 꽉 찼어요. (${count}/${MAX_PER_ROOM})` });
      passes.set(`${u.id}:${f.id}`, now() + 5 * 60_000);   // 5분 안에 수락하면 문이 닫혀 있어도 들어옴
      send(fs2, { type: 'invite', from: { username: u.username, nickname: u.nickname, color: u.color }, count, max: MAX_PER_ROOM });
      send(ws, { type: 'notice', message: `📨 ${f.nickname}(@${f.username})님을 내 집으로 초대했어요.` });
      break;
    }
    case 'invite-fof': {   // 👥 남의 집에 놀러 와 있는 사람이 자기 친구를 이 집으로 초대 (집주인 허락을 받아야 들어옴)
      const owner = ws.room && ownerOf(ws.room);
      if (!owner || owner.id === u.id) return send(ws, { type: 'error', message: '친구 집에 놀러 가 있을 때만 쓸 수 있어요. 내 집에서는 📨 초대를 써요.' });
      const f = byName(m.username);
      if (!f || !u.friends.includes(f.id)) return send(ws, { type: 'error', message: '내 친구만 초대할 수 있어요.' });
      if (f.id === owner.id) return send(ws, { type: 'error', message: '집주인은 이미 여기 있어요.' });
      if (owner.noVisit) return send(ws, { type: 'error', message: `${owner.nickname}님 집은 지금 🚫 출입 제한 중이에요.` });   // 0.17.8
      if (f.noVisit) return send(ws, { type: 'error', message: `${f.nickname}님은 지금 🚫 출입 제한 중이라 초대를 받을 수 없어요.` });
      if ([f, owner].some((x) => x.blocked.includes(f === x ? owner.id : f.id))) return send(ws, { type: 'error', message: '이 친구는 이 집에 초대할 수 없어요.' });
      if (!perSocket(ws, 'invite-' + f.id, 1, 10_000)) return send(ws, { type: 'error', message: '방금 초대했어요. 조금만 기다려 주세요.' });
      const fs2 = sessions.get(f.id);
      if (!fs2) return send(ws, { type: 'error', message: `${f.nickname}님은 지금 오프라인이에요.` });
      if (fs2.room === owner.code) return send(ws, { type: 'notice', message: `${f.nickname}님은 이미 같이 있어요.` });
      const count = rooms.get(owner.code)?.size || 0;
      if (count >= MAX_PER_ROOM) return send(ws, { type: 'error', message: `방이 꽉 찼어요. (${count}/${MAX_PER_ROOM})` });
      fofInvites.set(`${owner.id}:${f.id}`, { by: u.id, exp: now() + 5 * 60_000 });
      send(fs2, { type: 'invite', from: { username: owner.username, nickname: owner.nickname, color: owner.color }, via: { username: u.username, nickname: u.nickname }, count, max: MAX_PER_ROOM });
      send(ws, { type: 'notice', message: `📨 ${f.nickname}(@${f.username})님을 ${owner.nickname}님 집으로 초대했어요. 수락하면 ${owner.nickname}님이 허락해야 들어와요.` });
      break;
    }
    case 'fof-accept': {   // 친구의 친구 초대를 수락 → 집주인에게 들어가도 되는지 물어봄
      const owner = byName(m.username);
      const inv = owner && fofInvites.get(`${owner.id}:${u.id}`);
      if (!owner || !inv || inv.exp < now()) return send(ws, { type: 'error', message: '초대가 끝났어요. 다시 초대해 달라고 해 주세요.' });
      const host = sessions.get(owner.id);
      if (!host || !isHosting(owner)) return send(ws, { type: 'error', message: `${owner.nickname}님은 지금 집에 없어요.` });
      inv.asked = true; inv.exp = now() + 5 * 60_000;
      const by = db.users[inv.by];
      send(host, { type: 'knock', from: { username: u.username, nickname: u.nickname, color: u.color }, via: by ? { username: by.username, nickname: by.nickname } : null });
      send(ws, { type: 'notice', message: `${owner.nickname}님에게 들어가도 되는지 물어봤어요. 허락을 기다려요…` });
      break;
    }
    case 'invite-answer': {   // 거절했을 때만 알려 줌 (수락하면 바로 들어옴)
      const v = byName(m.username);
      if (v && !m.accept && fofInvites.has(`${v.id}:${u.id}`)) {   // 친구의 친구 초대 거절 → 초대한 사람에게 알림
        const inv = fofInvites.get(`${v.id}:${u.id}`); fofInvites.delete(`${v.id}:${u.id}`);
        const bs = sessions.get(inv.by);
        if (bs) send(bs, { type: 'notice', message: `${u.nickname}님이 지금은 못 온대요.` });
        return;
      }
      if (!v || !u.friends.includes(v.id) || m.accept) return;
      passes.delete(`${v.id}:${u.id}`);
      const vs = sessions.get(v.id);
      if (vs) send(vs, { type: 'notice', message: `${u.nickname}님이 지금은 못 온대요.` });
      break;
    }
    case 'knock-answer': {
      const v = byName(m.username);
      const fof = v && fofInvites.get(`${u.id}:${v.id}`);
      if (!v || !(u.friends.includes(v.id) || (fof && fof.asked && fof.exp > now()))) return;
      if (fof) fofInvites.delete(`${u.id}:${v.id}`);
      const vs = sessions.get(v.id);
      if (m.accept) {
        passes.set(`${u.id}:${v.id}`, now() + 120_000);
        send(vs, { type: 'knock-result', accept: true, username: u.username, nickname: u.nickname });
      } else {
        send(vs, { type: 'knock-result', accept: false, username: u.username, nickname: u.nickname });
      }
      break;
    }

    // ---------------- 집
    case 'place': {
      if (!Array.isArray(m.items)) return;
      placeItems(ws, m.items);
      break;
    }
    case 'wall': {
      if (!CATALOG.walls[m.item] || (m.item !== 'basic' && !u.owned[m.item])) return;
      if (m.floor === 2) u.home.wall2 = m.item; else u.home.wall1 = m.item;
      store.save();
      pushMe(ws);
      broadcast(u.code, { type: 'home', home: game.homeView(u) });
      break;
    }
    case 'light': {   // floor 를 주면 그 층만, 없으면 두 층 다
      const on = !!m.on;
      if (m.floor === 1 || m.floor === 2) u.home['light' + m.floor] = on;
      else { u.home.light1 = on; u.home.light2 = on; }
      u.home.light = u.home.light1 !== false && u.home.light2 !== false;   // 예전 앱용: 둘 다 켜져 있어야 '켜짐'
      store.save();
      pushMe(ws);
      broadcast(u.code, { type: 'home', home: game.homeView(u) });
      break;
    }

    case 'gift': { // 친구에게 코인 선물 (하루 100까지)
      const f = byName(m.username);
      const amount = Math.floor(Number(m.amount));
      if (!f || !u.friends.includes(f.id) || f.blocked.includes(u.id)) return send(ws, { type: 'error', message: '친구에게만 선물할 수 있어요.' });
      if (!Number.isFinite(amount) || amount < 1) return send(ws, { type: 'error', message: '선물할 코인 수를 확인해 주세요.' });
      if (!perSocket(ws, 'gift', 5, 60_000)) return send(ws, { type: 'error', message: '잠시 후 다시 해 주세요.' });
      if (u.giftDay !== kstDay()) { u.giftDay = kstDay(); u.giftSent = 0; }
      const left = CATALOG.rewards.giftPerDay - u.giftSent;
      if (amount > left) return send(ws, { type: 'error', message: `오늘은 🪙${left}까지 더 선물할 수 있어요. (하루 ${CATALOG.rewards.giftPerDay})` });
      if (u.coins < amount) return send(ws, { type: 'error', message: '코인이 부족해요.' });
      u.coins -= amount;
      f.coins = Math.min(MAX_COINS, f.coins + amount);
      u.giftSent += amount;
      store.save();
      pushMe(ws, { amount: -amount, reason: 'gift-sent', to: f.nickname });
      const fs = sessions.get(f.id);
      if (fs) {
        pushMe(fs, { amount, reason: 'gift', from: u.nickname });
        send(fs, { type: 'notice', message: `🎁 ${u.nickname}(@${u.username})님이 🪙${amount}을 선물했어요!`, popup: true });
      }
      break;
    }

    case 'pat': {
      if (!perSocket(ws, 'pat', 1, 8000)) return;
      const p = tickPet(u);
      p.mood = Math.min(100, p.mood + 2);
      store.save();
      pushMe(ws);
      break;
    }
    case 'no-visit':   // 0.17.8 🚫 출입 제한: 아무도 못 들어오고, 노크 · 초대를 못 받고, 나도 초대를 못 보냄 (지금 있는 손님은 그대로)
      u.noVisit = !!m.on;
      store.save();
      pushMe(ws);
      broadcast(u.code, { type: 'room-lock', locked: u.locked, noVisit: u.noVisit });
      notifyFriends(u);
      break;
    case 'lock':
      u.locked = !!m.locked;
      store.save();
      pushMe(ws);
      broadcast(u.code, { type: 'room-lock', locked: u.locked });
      notifyFriends(u);
      break;
    case 'kick': {
      if (ws.room !== u.code) return;
      const target = rooms.get(u.code)?.get(String(m.id || ''));
      if (!target || target === ws) return;
      send(target, { type: 'kicked', message: `${u.nickname}님의 방에서 나왔어요.` });
      leaveRoom(target);
      notifyFriends(u);
      break;
    }

    // ---------------- 캐릭터 그림
    case 'skin-set': {
      if (!perSocket(ws, 'skin', 12, 60_000)) return send(ws, { type: 'error', message: '잠시 후 다시 해 주세요.' });
      if (m.reset) {
        // 번호(v)는 되돌리지 않음: 다시 그림을 올렸을 때 예전 그림이 남아 보이는 걸 막음
        u.skin = { v: 0, faces: 'right', last: Math.max(u.skin.v || 0, u.skin.last || 0) };
      } else {
        const imgs = {};
        for (const pose of POSES) {
          const err = checkPng(m[pose]);
          if (err) return send(ws, { type: 'error', message: `${{ stand: '서 있는', sit: '앉은', walk: '걷는' }[pose]} 그림: ${err}` });
          imgs[pose] = m[pose];
        }
        for (const pose of EXTRA_POSES) {
          if (!m[pose]) continue;
          const err = checkPng(m[pose]);
          if (err) return send(ws, { type: 'error', message: `${{ lie: '누운', fall: '떨어지는' }[pose]} 그림: ${err}` });
          imgs[pose] = m[pose];
        }
        u.skin = { v: Math.max(u.skin.v || 0, u.skin.last || 0) + 1, faces: m.faces === 'left' ? 'left' : 'right', ...imgs };
      }
      skinChanged(ws);
      break;
    }
    case 'skin-get': {
      if (!perSocket(ws, 'skin-get', 150, 60_000)) return;
      const f = byName(m.username);
      if (!f || !f.skin.v) return;
      send(ws, { type: 'skin', username: f.username, v: f.skin.v, faces: f.skin.faces, stand: f.skin.stand, sit: f.skin.sit, walk: f.skin.walk, lie: f.skin.lie, fall: f.skin.fall });
      break;
    }

    // ---------------- 차단
    case 'block': {
      const f = byName(m.username);
      if (!f || f.id === u.id) return;
      if (!u.blocked.includes(f.id)) u.blocked.push(f.id);
      if (u.blocked.length > 200) u.blocked.shift();
      remove(u.friends, f.id); remove(f.friends, u.id);
      remove(u.reqIn, f.id); remove(f.reqOut, u.id); remove(u.reqOut, f.id); remove(f.reqIn, u.id);
      u.tradesIn = u.tradesIn.filter((t) => t.from !== f.id); f.tradesOut = f.tradesOut.filter((t) => t.to !== u.id);
      f.tradesIn = f.tradesIn.filter((t) => t.from !== u.id); u.tradesOut = u.tradesOut.filter((t) => t.to !== f.id);
      // 내 집에 있으면 내보냄
      const fs = sessions.get(f.id);
      if (fs && fs.room === u.code) { send(fs, { type: 'kicked', message: `${u.nickname}님의 방에서 나왔어요.` }); leaveRoom(fs); }
      store.save();
      pushFriends(u); pushFriends(f); pushMe(ws);
      send(ws, { type: 'notice', message: `${f.nickname}(@${f.username})님을 차단했어요. 이제 채팅이 안 보이고 내 집에 올 수 없어요.` });
      break;
    }
    case 'unblock': {
      const f = byName(m.username);
      if (!f) return;
      remove(u.blocked, f.id);
      store.save(); pushFriends(u);
      send(ws, { type: 'notice', message: `${f.nickname}(@${f.username})님 차단을 풀었어요.` });
      break;
    }

    // ---------------- 비밀번호 바꾸기
    case 'username-change': { // 아이디 바꾸기: 지금 아이디 + 비밀번호 확인 후
      const R = (ok, message, extra) => send(ws, { type: 'username-result', ok, message, ...extra });
      if (!perSocket(ws, 'uname', 5, 600_000)) return R(false, '잠시 후 다시 해 주세요.');
      const curName = String(m.current || '').trim(), next = String(m.next || '').trim();
      const pw = String(m.password || '').slice(0, 72);
      if (curName.toLowerCase() !== u.username.toLowerCase()) return R(false, '지금 아이디가 맞지 않아요.');
      if (!/^[A-Za-z0-9_가-힣]{2,16}$/.test(next)) return R(false, '새 아이디는 한글/영문/숫자/_ 2~16자예요.');
      if (next === u.username) return R(false, '지금 아이디와 같아요.');
      const last = u.renamedAt || 0, gap = (CATALOG.limits.renameHours ?? 24) * 3_600_000;
      if (now() - last < gap) return R(false, `아이디는 ${CATALOG.limits.renameHours ?? 24}시간에 한 번만 바꿀 수 있어요. (${Math.ceil((gap - (now() - last)) / 3_600_000)}시간 뒤 다시)`);
      verifyPassword(pw, u).then((ok) => {
        if (!ok) return R(false, '비밀번호가 맞지 않아요.');
        const key = next.toLowerCase(), oldKey = u.username.toLowerCase();
        db.nameHold ||= {};
        const hold = db.nameHold[key];
        if (hold && hold.until > now() && hold.id !== u.id) return R(false, '얼마 전까지 다른 친구가 쓰던 아이디라 아직 쓸 수 없어요.');
        if (db.names[key] && db.names[key] !== u.id) return R(false, '이미 사용 중인 아이디예요.');
        const old = u.username;
        if (oldKey !== key) {
          delete db.names[oldKey];
          // 옛 아이디는 7일 동안 다른 사람이 못 가져감 (친구들이 헷갈리지 않게)
          db.nameHold[oldKey] = { id: u.id, until: now() + 7 * 86_400_000 };
        }
        delete db.nameHold[key];
        db.names[key] = u.id;
        u.username = next; u.renamedAt = now();
        store.save();
        console.log(`[아이디 변경] @${old} → @${next}`);
        R(true, `아이디를 @${next}(으)로 바꿨어요. 다음 로그인부터 새 아이디를 쓰세요.`, { username: next });
        pushMe(ws);
        notifyFriends(u);
        if (ws.room) broadcast(ws.room, { type: 'peer-update', id: ws.peerId, profile: peerProfile(ws) }, ws);
        for (const id of u.friends) { const fs = sessions.get(id); if (fs) send(fs, { type: 'notice', message: `${u.nickname}님의 아이디가 @${old} → @${next}(으)로 바뀌었어요.` }); }
      }).catch(() => R(false, '잠시 후 다시 해 주세요.'));
      break;
    }

    case 'password-change': {
      if (!perSocket(ws, 'pw', 5, 600_000)) return send(ws, { type: 'password-result', ok: false, message: '잠시 후 다시 해 주세요.' });
      const cur = String(m.current || '').slice(0, 72), next = String(m.next || '');
      if (next.length < 8 || next.length > 72) return send(ws, { type: 'password-result', ok: false, message: '새 비밀번호는 8~72자로 정해 주세요.' });
      verifyPassword(cur, u).then(async (ok) => {
        if (!ok) return send(ws, { type: 'password-result', ok: false, message: '지금 비밀번호가 맞지 않아요.' });
        const { salt, hash } = await hashPassword(next);
        u.salt = salt; u.hash = hash;
        // 이 기기만 남기고 다른 기기의 자동 로그인은 풀림
        for (const t of u.tokens) if (t.hash !== ws.tokenHash) delete db.tokens[t.hash];
        u.tokens = u.tokens.filter((t) => t.hash === ws.tokenHash);
        store.save();
        send(ws, { type: 'password-result', ok: true, message: '비밀번호를 바꿨어요. 다른 기기는 다시 로그인해야 해요.' });
      }).catch(() => send(ws, { type: 'password-result', ok: false, message: '잠시 후 다시 해 주세요.' }));
      break;
    }

    case 'logout':
      revokeToken(u, m.token);
      store.save();
      ws.close(4003, 'logout');
      break;

    default:
      if (titles.handle(ws, m)) break;
      if (extras.handle(ws, m)) break;
      if (mg.handle(ws, m, (id) => db.users[id] || null)) break;
      if (board.handle(ws, m)) break;
      if (music.handle(ws, m)) break;
      game.handle(gameCtx(ws), m);
      break;
  }
}

// ------------------------------------------------------------ 0.17.2 🏅 칭호
const titles = titlesMod.create({
  send, now, store, pushMe, events: () => db.events || {},
  broadcastProfile: (ws) => { if (ws.room) broadcast(ws.room, { type: 'peer-update', id: ws.peerId, profile: peerProfile(ws) }, ws); },
});
// ------------------------------------------------------------ 0.17 💾 저장 슬롯 · 🪪 프로필
const extras = extrasMod.create({
  send, clean, now, store, pushMe, placeItems, skinChanged, byName, rooms, db,
  perSocket: (ws, key, max, ms) => perSocket(ws, key, max, ms),
  levelOf: (f) => f.pet?.level || 1,
  catalogItems: CATALOG.items,
  afterHomeChange: (ws) => { pushMe(ws); broadcast(ws.user.code, { type: 'home', home: game.homeView(ws.user) }); },
});
// ------------------------------------------------------------ 집 화이트보드 (흔적 남기기)
const music = musicMod.create({ send, clean, now, rooms, sessions, ownerOf, perSocket: (ws, key, max, ms) => perSocket(ws, key, max, ms), save: () => store.save(), pushMe: (ws) => pushMe(ws) });
const board = boardMod.create({ nameOf: (id) => db.users[id] && { username: db.users[id].username, nickname: db.users[id].nickname },
  send, clean, now, ownerOf, byName, sessions, rooms, store,
  perSocket: (ws, key, max, ms) => perSocket(ws, key, max, ms),
});

// ------------------------------------------------------------ 미니게임
const mg = minigame.create({
  send,
  sessionOf: (id) => sessions.get(id) || null,
  olderThan,
  rid: (p) => p + crypto.randomBytes(5).toString('hex'),
  canChallenge(ws, username) {
    const u = ws.user, f = byName(username);
    if (!f || f.id === u.id) return '그 사람을 찾을 수 없어요.';
    if (f.blocked.includes(u.id) || u.blocked.includes(f.id)) return '그 사람과는 대결할 수 없어요.';
    const fws = sessions.get(f.id);
    const sameRoom = !!(ws.room && fws && fws.room === ws.room);
    if (!u.friends.includes(f.id) && !sameRoom) return '친구이거나 같은 집에 있는 사람에게만 대결을 신청할 수 있어요.';
    return f;
  },
});

// 게임 기능(game.js)에 넘겨줄 도구들
function gameCtx(ws) {
  const u = ws.user;
  return {
    ws, u, send, store,
    save: () => store.save(),
    pushMe, pushMeTo: pushMe,
    byName, sessions,
    userById: (id) => db.users[id] || null,
    isFriend: (f) => u.friends.includes(f.id),
    blockedEither: (f) => f.blocked.includes(u.id) || u.blocked.includes(f.id),
    roomOf: (f) => ws.room && ws.room === f.code,
    perSocket: (key, max, ms) => perSocket(ws, key, max, ms),
    tickPet: () => tickPet(u),
    tickPetOf: (f) => tickPet(f),
    expNeeded,
    broadcastHome: () => broadcast(u.code, { type: 'home', home: game.homeView(u) }),
    roomBroadcast: (obj) => { if (ws.room) broadcast(ws.room, obj); },
    peerId: ws.peerId,
    events: () => db.events || {},
    // 같은 방에 있는 사람(peerId로)
    roomPeer: (id) => { const r = ws.room && rooms.get(ws.room); const c = r && r.get(String(id)); return c && c !== ws && c.user ? c : null; },
    // 낚시터에 같이 있는 사람들에게 내 낚시 상황 알리기
    fishPeer: (obj) => { if (ws.room && ws.fishingHere) broadcast(ws.room, { type: 'fish-peer', id: ws.peerId, here: true, ...obj }, ws); },
    profileChanged: () => { if (ws.room) broadcast(ws.room, { type: 'peer-update', id: ws.peerId, profile: peerProfile(ws) }, ws); },
  };
}

// ------------------------------------------------------------ 연결
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('desktop-buddy server ok');
});
// 캐릭터 그림 3장을 한 번에 보낼 수 있는 크기 (앱이 128px로 줄여서 보냄)
const wss = new WebSocketServer({ server, maxPayload: 420 * 1024 });

wss.on('connection', (ws, req) => {
  const fwd = TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  ws.ip = fwd || req.socket.remoteAddress || '?';
  const n = (ipConns.get(ws.ip) || 0) + 1;
  if (n > MAX_CONN_PER_IP) { ws.close(1013, 'too many connections'); return; }
  ipConns.set(ws.ip, n);

  ws.peerId = 'p' + (nextPeer++).toString(36) + crypto.randomBytes(3).toString('hex');
  ws.user = null;
  ws.room = null;
  ws.rate = {};
  ws.alive = true;
  ws.authTimer = setTimeout(() => { if (!ws.user) ws.close(4001, 'auth timeout'); }, 15_000);
  ws.on('pong', () => { ws.alive = true; });

  ws.on('message', (raw) => {
    if (!ws.user && raw.length > 4096) return; // 로그인 전에는 큰 메시지를 받지 않음
    let m;
    try { m = JSON.parse(raw.toString()); } catch { return; }
    if (!m || typeof m !== 'object') return;
    // 0.17.2: 캐릭터 위치(초당 몇 번씩 옴)는 따로 세요. 예전엔 위치 메시지가 전체 한도(5초에 60개)를 다 써서
    //         낚시 '당기기' 같은 중요한 메시지가 아무 말 없이 버려졌음 ('감는 중…'에서 멈춤)
    const POS = m.type === 'home-pos' || m.type === 'overlay-pos';
    if (!perSocket(ws, POS ? 'all-pos' : 'all', POS ? 80 : 60, 5000)) return;
    if (!ws.user) {
      if (m.type === 'auth') handleAuth(ws, m).catch((e) => console.error('auth error', e));
      return;
    }
    try { handle(ws, m); }
    catch (e) {   // 메시지 하나 때문에 서버 전체가 꺼지지 않게: 로그만 남기고 계속
      console.error(`[오류] ${m.type} @${ws.user?.username}:`, e);
      send(ws, { type: 'error', message: '앗, 서버에서 문제가 생겼어요. 다시 해 주세요.' });
    }
  });

  ws.on('close', () => {
    clearTimeout(ws.authTimer);
    clearInterval(ws.rewardTimer);
    clearInterval(ws.eventCoinTimer);
    leaveRoom(ws);
    if (ws.user && sessions.get(ws.user.id) === ws) {
      ws.user.lastSeen = now();
      mg.disconnect(ws.user);
      sessions.delete(ws.user.id);
      notifyFriends(ws.user);
    }
    const c = (ipConns.get(ws.ip) || 1) - 1;
    if (c <= 0) ipConns.delete(ws.ip); else ipConns.set(ws.ip, c);
  });
  ws.on('error', () => {});
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false;
    try { ws.ping(); } catch {}
  }
  for (const [k, t] of passes) if (t < now()) passes.delete(k);
  for (const [k, v] of fofInvites) if (v.exp < now()) fofInvites.delete(k);
}, 30_000);

function shutdown() { try { store.flush(); } catch (e) { console.error(e); } process.exit(0); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (e) => console.error('[오류] 처리 안 된 Promise:', e));   // 비동기 오류로 서버가 꺼지지 않게

// ------------------------------------------------------------ 관리자 (이 컴퓨터 안에서만 접속 가능)
// 비밀 키는 저장 파일 옆 admin.key 에 만들어지고, server/admin.js 가 읽어서 씀
const fsys = require('fs');
const ADMIN_KEY_FILE = path.join(path.dirname(DATA_FILE), 'admin.key');
let adminKey;
try { adminKey = fsys.readFileSync(ADMIN_KEY_FILE, 'utf8').trim(); } catch {
  adminKey = crypto.randomBytes(24).toString('hex');
  fsys.mkdirSync(path.dirname(ADMIN_KEY_FILE), { recursive: true });
  fsys.writeFileSync(ADMIN_KEY_FILE, adminKey, { mode: 0o600 });
}
const adminServer = http.createServer((req, res) => {
  const reply = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
  const given = Buffer.from(String(req.headers['x-admin-key'] || ''));
  const real = Buffer.from(adminKey);
  if (given.length !== real.length || !crypto.timingSafeEqual(given, real)) return reply(403, { error: '관리자 키가 맞지 않아요.' });
  let body = '';
  req.on('data', (d) => { body += d; if (body.length > 10_000) req.destroy(); });
  req.on('end', () => {
    let m = {};
    try { m = body ? JSON.parse(body) : {}; } catch { return reply(400, { error: '잘못된 요청' }); }
    if (req.url === '/notice') {
      const text = clean(m.message, 200);
      if (!text) return reply(400, { error: '공지 내용을 넣어 주세요.' });
      let n = 0;
      for (const s2 of sessions.values()) { send(s2, { type: 'notice', message: `📢 공지: ${text}`, popup: true }); n++; }
      console.log(`[관리자] 공지 → ${n}명: ${text}`);
      return reply(200, { sent: n });
    }
    if (req.url === '/give-all') {   // 모두에게 코인 (업데이트 · 점검 보상 등)
      const amount = Math.floor(Number(m.amount));
      if (!Number.isFinite(amount) || amount < 1 || amount > 100_000) return reply(400, { error: '코인 수는 1~100,000 사이로 넣어 주세요.' });
      const memo = clean(m.memo, 60);
      makeBackup(true);   // 혹시 몰라 주기 전에 백업
      let n = 0, online = 0;
      for (const u of Object.values(db.users)) {
        u.coins = Math.min(MAX_COINS, (u.coins || 0) + amount); n++;
        const s2 = sessions.get(u.id);
        if (s2) {
          online++;
          pushMe(s2, { amount, reason: 'admin' });
          send(s2, { type: 'notice', message: `🎁 모두에게 🪙${amount} 선물이 도착했어요!${memo ? ' (' + memo + ')' : ''}`, popup: true });
        }
      }
      store.save();
      console.log(`[관리자] 모두에게 +${amount} → ${n}명 (접속 중 ${online}명)${memo ? ' · ' + memo : ''}`);
      return reply(200, { n, online, amount });
    }
    if (req.url === '/backup') { const f = makeBackup(true); return reply(200, { file: f }); }
    if (req.url === '/backups') return reply(200, { files: listBackups() });
    if (req.url === '/list') {
      return reply(200, { users: Object.values(db.users).map((u) => ({ username: u.username, nickname: u.nickname, coins: u.coins, eventCoins: u.eventCoins || {}, online: sessions.has(u.id) })) });
    }
    if (req.url === '/event') {   // 시즌 이벤트 on/off: halloween · christmas · newyear
      const key = String(m.event || '');
      if (!CATALOG.events[key]) return reply(400, { error: `${key}은(는) 없는 이벤트예요. (halloween · christmas · newyear)` });
      const on = !!m.on;
      db.events ||= {};
      db.events[key] = on;
      store.save();
      let notified = 0;
      for (const s2 of sessions.values()) {
        send(s2, { type: 'catalog', catalog: catalogFor() });
        if (on) { send(s2, { type: 'notice', message: `${CATALOG.events[key].icon} ${CATALOG.events[key].name} 이벤트가 시작됐어요! 상점을 확인해 보세요.`, popup: true }); notified++; }
      }
      console.log(`[관리자] 이벤트 '${key}' → ${on ? '켬' : '끔'} (접속 중 ${notified}명에게 알림)`);
      return reply(200, { event: key, on, notified });
    }
    if (req.url === '/events') return reply(200, { events: db.events || {} });
    if (req.url === '/eventcoin-all') {   // 🎉 모두에게 이벤트 코인 (이벤트마다 따로)
      const key = String(m.event || '');
      const ev = CATALOG.events[key];
      if (!ev) return reply(400, { error: `'${key}'은(는) 없는 이벤트예요. halloween(🎃 호박 코인) · christmas(🎄 트리 코인) · newyear(🧧 복주머니 코인) 중에 넣어 주세요.` });
      const amount = Math.floor(Number(m.amount));
      if (!Number.isFinite(amount) || amount < 1 || amount > 100_000) return reply(400, { error: '코인 수는 1~100,000 사이로 넣어 주세요.' });
      const memo = clean(m.memo, 60);
      makeBackup(true);   // 혹시 몰라 주기 전에 백업
      let n = 0, online = 0;
      for (const u of Object.values(db.users)) {
        migrate(u);
        u.eventCoins[key] = (u.eventCoins[key] || 0) + amount; n++;
        const s2 = sessions.get(u.id);
        if (s2) {
          online++;
          pushMe(s2, { amount, reason: 'admin-eventcoin', event: key });
          send(s2, { type: 'notice', message: `🎁 모두에게 ${ev.coin.icon} ${ev.coin.name} ${amount}개 선물이 도착했어요!${memo ? ' (' + memo + ')' : ''}`, popup: true });
        }
      }
      store.save();
      console.log(`[관리자] 모두에게 ${ev.coin.name} +${amount} → ${n}명 (접속 중 ${online}명)${memo ? ' · ' + memo : ''}`);
      return reply(200, { n, online, amount, coinName: ev.coin.name, coinIcon: ev.coin.icon });
    }
    if (req.url === '/inbox') {   // ✉️ 운영자에게 온 쪽지 (all 이면 답장한 것까지 전부)
      const list = mailBox().list.filter((x) => m.all || !x.read).map(mailView);
      if (m.read) { for (const x of mailBox().list) x.read = true; store.save(); castMailToWriters(); }
      return reply(200, { list, unread: mailUnread(), total: mailBox().list.length });
    }
    if (req.url === '/mail-reply') {
      const x = mailBox().list.find((y) => y.id === Number(m.id));
      if (!x) return reply(404, { error: `#${m.id} 쪽지가 없어요. (inbox 로 번호 확인)` });
      const text = cleanMail(m.message);
      if (!text) return reply(400, { error: '답장 내용을 넣어 주세요.' });
      replyMail(x, text, null);
      console.log(`[관리자] 쪽지 #${x.id} 답장: ${text}`);
      return reply(200, { id: x.id, to: db.users[x.from]?.username || '?', online: sessions.has(x.from) });
    }
    if (req.url === '/mail-del') {
      const box = mailBox();
      const before = box.list.length;
      box.list = box.list.filter((y) => y.id !== Number(m.id));
      if (box.list.length === before) return reply(404, { error: `#${m.id} 쪽지가 없어요.` });
      store.save(); castMailToWriters();
      return reply(200, { id: Number(m.id) });
    }
    if (req.url === '/meet-seats') return reply(200, { seats: meetSeatList() });   // 🏢 회의장 자리 보기
    if (req.url === '/meet-end') {   // 🏢 회의 끝: 회의장에 있는 사람 모두 집으로 (자리는 그대로)
      const room = rooms.get(MEET_CODE);
      const list = room ? [...room.values()] : [];
      for (const c of list) meetSendHome(c, '🏢 회의가 끝나서 집으로 돌아왔어요.');
      console.log(`[관리자] 회의 끝 → ${list.length}명 집으로`);
      return reply(200, { n: list.length });
    }
    if (req.url === '/meet-seat' || req.url === '/meet-unseat') {
      const t = byName(String(m.username || '').replace(/^@/, ''));
      if (!t) return reply(404, { error: `@${m.username} 사용자가 없어요.` });
      const r = req.url === '/meet-seat' ? meetSetSeat(t, m.seat) : meetUnseat(t);
      if (r.error) return reply(400, { error: r.error });
      return reply(200, { username: t.username, text: r.text });
    }
    if (req.url === '/limited-all' || req.url === '/limited-list') {   // 0.17.5 🍫 안 받은 사람 모두에게 / 누가 받았는지
      const key = String(m.key || 'pepero');
      const g = CATALOG.limitedGifts[key];
      if (!g) return reply(400, { error: `${key} 선물이 없어요.` });
      const all = Object.values(db.users);
      if (req.url === '/limited-list') {
        const lines = all.map((x) => { const n = (x.pets || []).filter((p) => CATALOG.pets[p.kind]?.limited === key).length; return `${limitedMod.got(x, key) ? '✅' : '⬜'} @${x.username} (${x.nickname}) ${limitedMod.got(x, key) ? `받음(${CATALOG.pets[x.limited[key].kind]?.name || '?'})` : '자동 선물 아직'} · 가진 ${g.name} 펫 ${n}마리`; });
        return reply(200, { lines, got: all.filter((x) => limitedMod.got(x, key)).length, total: all.length, title: `${g.icon} ${g.name} (${g.dates.join(', ')}, 오늘 ${limitedMod.kstDate()}${limitedMod.isOpen(key) ? ' · 지금 받는 날' : ''})` });
      }
      const lines = [];
      for (const x of all) {
        if (limitedMod.got(x, key)) continue;
        migrate(x);
        const r = limitedMod.give(x, key);
        if (r.error) { lines.push(`⚠️ @${x.username}: ${r.error}`); continue; }
        lines.push(`🎁 @${x.username} ← ${r.def.code} ${r.def.name}`);
        const s2 = sessions.get(x.id);
        if (s2) { pushMe(s2); limitedNotice(s2, { key, ...r }); }
      }
      store.save();
      console.log(`[관리자] ${g.name} 펫 한꺼번에 지급 ${lines.filter((l) => l.startsWith('🎁')).length}명`);
      return reply(200, { lines, text: lines.length ? `${lines.filter((l) => l.startsWith('🎁')).length}명에게 줬어요` : '모두 이미 받았어요' });
    }
    if (req.url === '/users') {   // 👥 가입한 사람 전부 (가입일 · 마지막 접속 포함)
      const users = Object.values(db.users).map((x) => userInfo(x)).sort((a, b) => (a.created || 0) - (b.created || 0));
      const newest = users.map((x) => x.appVersion).filter(Boolean).reduce((a, b) => (!a || olderThan(a, b) ? b : a), null);
      return reply(200, { users, newest });
    }
    if (req.url === '/user') {   // 🔎 한 사람 자세히 (아이디로, 없으면 닉네임으로 찾기)
      let found = adminUser(m.username);
      if (!found) {
        const q = String(m.username || '').trim().toLowerCase();
        const hits = Object.values(db.users).filter((x) => String(x.nickname || '').toLowerCase() === q);
        if (hits.length > 1) return reply(400, { error: `닉네임이 '${m.username}'인 사람이 ${hits.length}명이에요: ${hits.map((x) => '@' + x.username).join(', ')} — 아이디로 다시 찾아 주세요.` });
        found = hits[0];
      }
      if (!found) return reply(404, { error: `@${m.username} 사용자가 없어요. (아이디 · 닉네임 둘 다 없음, users 로 전체 목록 보기)` });
      return reply(200, userInfo(found, true));
    }
    if (req.url === '/resetpw') {   // 🔑 비밀번호 재설정: 새 비밀번호를 정해 주거나(안 넣으면 임시 비밀번호 자동)
      const t = adminUser(m.username);
      if (!t) return reply(404, { error: `@${m.username} 사용자가 없어요. (닉네임 말고 아이디로 넣어 주세요. user 닉네임 으로 아이디 확인)` });
      const given = m.password != null && String(m.password) !== '';
      const pw = given ? String(m.password) : tempPassword();
      if (pw.length < 8 || pw.length > 72) return reply(400, { error: '새 비밀번호는 8~72자로 정해 주세요.' });
      hashPassword(pw).then(({ salt, hash }) => {
        t.salt = salt; t.hash = hash;
        // 다른 기기 자동 로그인은 전부 풀고, 지금 접속 중이면 다시 로그인하게
        for (const x of t.tokens) delete db.tokens[x.hash];
        t.tokens = [];
        loginNameFail.map.delete(t.username.toLowerCase());   // 틀려서 잠긴 것도 풀어 줌
        store.save();
        const s2 = sessions.get(t.id);
        if (s2) { send(s2, { type: 'session-replaced', message: '관리자가 비밀번호를 새로 정해 줬어요. 새 비밀번호로 다시 로그인해 주세요.' }); leaveRoom(s2); s2.close(4002, 'password-reset'); }
        console.log(`[관리자] @${t.username} 비밀번호 재설정 (모든 기기 로그아웃)`);   // 비밀번호는 로그에 안 남김
        reply(200, { username: t.username, nickname: t.nickname, password: pw, generated: !given, wasOnline: !!s2 });
      }).catch(() => reply(500, { error: '비밀번호를 바꾸지 못했어요. 다시 해 주세요.' }));
      return;
    }
    const u = adminUser(m.username);
    if (!u) return reply(404, { error: `@${m.username} 사용자가 없어요. (아이디나 데스크톱 코드 8자리로 넣어 주세요)` });
    if (req.url === '/coins') return reply(200, { username: u.username, nickname: u.nickname, coins: u.coins, eventCoins: u.eventCoins || {}, eventEarned: u.eventEarned || {} });
    if (req.url === '/level') {   // 캐릭터(내 고양이) 레벨 바꾸기
      const lv = Math.floor(Number(m.level));
      if (!(lv >= 1 && lv <= 99)) return reply(400, { error: '레벨은 1~99 사이로 넣어 주세요.' });
      u.pet.level = lv; u.pet.exp = 0;
      store.save();
      const s2 = sessions.get(u.id);
      if (s2) { pushMe(s2, { reason: 'admin-level', level: lv }); send(s2, { type: 'notice', message: `✨ 관리자가 레벨을 Lv.${lv}(으)로 바꿨어요`, popup: true }); }
      console.log(`[관리자] @${u.username} 캐릭터 레벨 → ${lv}`);
      return reply(200, { username: u.username, text: `캐릭터 레벨을 Lv.${lv}(으)로 바꿨어요` });
    }
    if (req.url === '/petlevel') {   // 펫 레벨 바꾸기 (1~5)
      const lv = Math.floor(Number(m.level));
      if (!(lv >= 1 && lv <= game.PET_MAX_LV)) return reply(400, { error: `펫 레벨은 1~${game.PET_MAX_LV} 사이로 넣어 주세요.` });
      const hit = Object.entries(CATALOG.pets).find(([, p]) => p.code.toUpperCase() === String(m.code || '').toUpperCase());
      if (!hit) return reply(400, { error: `${m.code} 펫 번호가 없어요. (petlist 로 확인)` });
      const kind = hit[0];
      const same = (u.pets || []).filter((x) => x.kind === kind);
      if (!same.length) return reply(400, { error: `@${u.username}은(는) ${hit[1].name}이(가) 없어요.` });
      const name = String(m.name || '').trim();
      let targets = name ? same.filter((x) => x.name === name) : same;   // 이름이 없으면 그 종류 전부 (예전 그대로)
      if (name && !targets.length) { const r = pickPet(same, name, hit[1].name); if (r.error) return reply(400, { error: r.error }); targets = [r.pet]; }   // 0.17.3 번호로도
      for (const t of targets) { t.level = lv; t.exp = 0; }
      store.save();
      const s2 = sessions.get(u.id);
      if (s2) { pushMe(s2); if (targets.some((t) => t.out)) { broadcast(u.code, { type: 'home', home: game.homeView(u) }); if (s2.room) broadcast(s2.room, { type: 'peer-update', id: s2.peerId, profile: peerProfile(s2) }, s2); } }
      console.log(`[관리자] @${u.username} 펫 ${hit[1].code} ${targets.map((t) => t.name).join(',')} → Lv.${lv}`);
      return reply(200, { username: u.username, text: `${targets.map((t) => `'${t.name}'`).join(', ')} (${hit[1].name}) 레벨을 Lv.${lv}(으)로 바꿨어요` });
    }
    if (req.url === '/pettrait') {   // 0.17.3 🐾 펫 성격 정해 주기 (같은 펫이 여럿이면 이름이나 번호로 한 마리만)
      const pcode = String(m.code || '').toUpperCase().replace(/^P?(\d+)$/, (_, d) => 'P' + d.padStart(2, '0'));   // p1 · 1 도 P01
      const hit = Object.entries(CATALOG.pets).find(([, p]) => p.code.toUpperCase() === pcode);
      if (!hit) return reply(400, { error: `${m.code} 펫 번호가 없어요. (petlist 로 확인)` });
      const want = String(m.trait || '').trim();
      const tid = want === 'random' || want === '랜덤' ? game.pickTrait()
        : Object.keys(CATALOG.petTraits).find((k) => k === want || CATALOG.petTraits[k].name === want);
      if (!tid) return reply(400, { error: `'${want}' 성격이 없어요. 영어로: ${Object.keys(CATALOG.petTraits).join(' · ')} · random (traitlist 로 확인)` });
      const same = (u.pets || []).filter((x) => x.kind === hit[0]);
      if (!same.length) return reply(400, { error: `@${u.username}은(는) ${hit[1].name}이(가) 없어요.` });
      const r = pickPet(same, m.name, hit[1].name);
      if (r.error) return reply(400, { error: r.error });
      const t = r.pet, tr = CATALOG.petTraits[tid];
      t.trait = tid;
      store.save();
      const s2 = sessions.get(u.id);
      if (s2) {
        pushMe(s2);
        if (t.level >= game.PET_MAX_LV) send(s2, { type: 'notice', message: `✨ 운영자가 '${t.name}'의 성격을 ${tr.icon} ${tr.name}(으)로 정했어요`, popup: true });   // 5레벨 전엔 비밀이라 안 알려 줌
        if (t.out) { broadcast(u.code, { type: 'home', home: game.homeView(u) }); if (s2.room) broadcast(s2.room, { type: 'peer-update', id: s2.peerId, profile: peerProfile(s2) }, s2); }
      }
      console.log(`[관리자] @${u.username} 펫 ${hit[1].code} '${t.name}' 성격 → ${tr.name}`);
      return reply(200, { username: u.username, text: `'${t.name}' (${hit[1].name}) 성격을 ${tr.icon} ${tr.name}(으)로 정했어요${t.level < game.PET_MAX_LV ? ` · 지금 Lv.${t.level}이라 5레벨이 되면 보여요` : ''}` });
    }
    if (req.url === '/eventpetlevel') {   // 🎉 이벤트 펫 레벨 한 번에 (event 를 빼거나 all 이면 이벤트 펫 전부)
      const lv = Math.floor(Number(m.level));
      if (!(lv >= 1 && lv <= game.PET_MAX_LV)) return reply(400, { error: `펫 레벨은 1~${game.PET_MAX_LV} 사이로 넣어 주세요.` });
      const key = String(m.event || 'all');
      if (key !== 'all' && !CATALOG.events[key]) return reply(400, { error: `'${key}'은(는) 없는 이벤트예요. halloween · christmas · newyear · all 중에 넣어 주세요.` });
      const targets = (u.pets || []).filter((x) => { const ev = CATALOG.pets[x.kind]?.event; return ev && (key === 'all' || ev === key); });
      if (!targets.length) return reply(400, { error: `@${u.username}은(는) ${key === 'all' ? '이벤트' : CATALOG.events[key].name + ' 이벤트'} 펫이 없어요.` });
      for (const t of targets) { t.level = lv; t.exp = 0; }
      store.save();
      const s2 = sessions.get(u.id);
      if (s2) {
        pushMe(s2);
        if (targets.some((t) => t.out)) { broadcast(u.code, { type: 'home', home: game.homeView(u) }); if (s2.room) broadcast(s2.room, { type: 'peer-update', id: s2.peerId, profile: peerProfile(s2) }, s2); }
        send(s2, { type: 'notice', message: `✨ 관리자가 이벤트 펫 ${targets.length}마리의 레벨을 Lv.${lv}(으)로 바꿨어요`, popup: true });
      }
      const names = targets.map((t) => `'${t.name}'(${CATALOG.pets[t.kind].code})`).join(', ');
      console.log(`[관리자] @${u.username} 이벤트 펫 ${names} → Lv.${lv}`);
      return reply(200, { username: u.username, text: `이벤트 펫 ${targets.length}마리 ${names} 레벨을 Lv.${lv}(으)로 바꿨어요` });
    }
    if (req.url === '/nameeffect') {   // 닉네임 효과: neon(네온) · rainbow(무지개) · gold(골드) · galaxy(은하수) · fire(불꽃) · none(없음) — 운영자만
      const eff = String(m.effect || '').toLowerCase();
      if (!NAME_EFFECTS[eff] && eff !== 'none') return reply(400, { error: `효과는 ${Object.keys(NAME_EFFECTS).join(' · ')} · none 중 하나예요.` });
      u.nameEffect = eff === 'none' ? null : eff;
      u.nameEffectOn = true;   // 새로 주면 켜진 채로 (본인이 설정에서 끌 수 있어요)
      store.save();
      const s2 = sessions.get(u.id);
      if (s2) {
        pushMe(s2);
        if (s2.room) broadcast(s2.room, { type: 'peer-update', id: s2.peerId, profile: peerProfile(s2) }, s2);
        if (u.nameEffect) send(s2, { type: 'notice', message: `✨ 운영자가 닉네임에 '${NAME_EFFECTS[eff]}' 효과를 줬어요!`, popup: true });
      }
      console.log(`[관리자] @${u.username} 닉네임 효과 → ${u.nameEffect || '없음'}`);
      return reply(200, { username: u.username, text: `닉네임 효과를 '${u.nameEffect || '없음'}'(으)로 바꿨어요` });
    }
    if (req.url === '/writer' || req.url === '/writer-remove') {   // 공지 패널 글쓰기 권한
      u.noticeWriter = req.url === '/writer';
      if (!u.noticeWriter) delete u.noticeWriter;
      store.save();
      const s2 = sessions.get(u.id);
      if (s2) { pushMe(s2); sendNotices(s2); sendMail(s2); }
      console.log(`[관리자] @${u.username} 공지 쓰기 ${u.noticeWriter ? '허용' : '해제'}`);
      return reply(200, { username: u.username, text: u.noticeWriter ? '이제 앱의 📢 공지 패널에서 공지를 쓰고 고칠 수 있고, ✉️ 쪽지함에서 운영자 쪽지를 받아요' : '공지 쓰기 권한을 뺐어요' });
    }
    if (req.url === '/fish') {
      const code = String(m.code || '').padStart(2, '0');
      const n = Math.max(1, Math.min(99, Math.floor(Number(m.amount) || 1)));
      migrate(u);
      if (!game.adminGiveFish(u, code, n)) return reply(400, { error: `#${code} 물고기는 없어요. (01~${Object.keys(CATALOG.fish).length})` });
      store.save();
      const s2 = sessions.get(u.id);
      const name = CATALOG.fish[code].name;
      if (s2) { pushMe(s2, { reason: 'fish-gift', code, from: '관리자' }); send(s2, { type: 'notice', message: `🎁 관리자에게 #${code} ${name} ${n}마리를 받았어요!`, popup: true }); }
      console.log(`[관리자] @${u.username} 물고기 #${code} ${name} ×${n}`);
      return reply(200, { username: u.username, code, name, n });
    }
    // ---- 번호로 찾기: 물고기 23 / 액세서리 A03 / 펫 P02
    const findBy = (table, code) => Object.entries(table).find(([, v]) => String(v.code).toUpperCase() === code);
    const notify = (msg, reward) => {
      const s2 = sessions.get(u.id);
      if (!s2) return;
      pushMe(s2, reward);
      if (msg) send(s2, { type: 'notice', message: msg, popup: true });
      if (s2.room) broadcast(s2.room, { type: 'peer-update', id: s2.peerId, profile: peerProfile(s2) }, s2);
      broadcast(u.code, { type: 'home', home: game.homeView(u) });
    };
    if (req.url === '/fish-take') {
      migrate(u);
      const code = String(m.code || '').padStart(2, '0');
      const f = CATALOG.fish[code];
      if (!f) return reply(400, { error: `#${code} 물고기는 없어요.` });
      const have = u.fishInv[code] || 0;
      const n = Math.min(have, Math.max(1, Math.floor(Number(m.amount) || 1)));
      if (!n) return reply(400, { error: `@${u.username}의 가방에 #${code} ${f.name}이(가) 없어요. (어항·아쿠아리움에 있는 건 먼저 꺼내야 해요)` });
      u.fishInv[code] -= n; if (u.fishInv[code] <= 0) delete u.fishInv[code];
      store.save(); notify(null);
      console.log(`[관리자] @${u.username} 물고기 #${code} ${f.name} -${n}`);
      return reply(200, { username: u.username, text: `#${code} ${f.name} ${n}마리를 뺐어요 (남은 ${u.fishInv[code] || 0})` });
    }
    if (req.url === '/acc' || req.url === '/acc-take') return reply(400, { error: '0.17.2부터 액세서리는 없어지고 칭호로 바뀌었어요. title-give · title-take 를 써 주세요.' });
    if (req.url === '/title-give' || req.url === '/title-take') {   // 🏅 칭호 주기 · 빼기 (운영자 전용 칭호 포함)
      migrate(u);
      const q = String(m.code || '').trim();
      const qq = q.toUpperCase().replace(/^T?(\d+)$/, (_, d) => 'T' + d.padStart(2, '0'));
      const hit = Object.entries(CATALOG.titles).find(([id, d]) => id === q || d.code === qq || d.name === q);
      if (!hit) return reply(400, { error: `'${q}' 칭호는 없어요. (titlelist 로 번호를 확인해 주세요)` });
      const [id, d] = hit;
      const s2 = sessions.get(u.id);
      if (req.url === '/title-give') {
        if (u.titles.owned[id]) return reply(400, { error: `@${u.username}은(는) 이미 ${d.icon} ${d.name} 칭호가 있어요.` });
        u.titles.owned[id] = true;
        store.save();
        if (s2) { pushMe(s2); send(s2, { type: 'notice', popup: true, message: `🏅 운영자에게 '${d.icon} ${d.name}' 칭호를 받았어요! 가방 → 🏅 칭호에서 달 수 있어요.` }); }
        console.log(`[관리자] @${u.username} 칭호 ${d.code} ${d.name} 지급`);
        return reply(200, { username: u.username, text: `${d.code} ${d.icon} ${d.name} 칭호를 줬어요` });
      }
      if (!u.titles.owned[id]) return reply(400, { error: `@${u.username}은(는) ${d.name} 칭호가 없어요.${id === 'op' ? ' (운영자 칭호는 공지 권한(writer)이 있으면 저절로 생겨요. writer-remove 로 빼요)' : ''}` });
      delete u.titles.owned[id];
      if (u.titles.eq === id) u.titles.eq = null;
      store.save();
      if (s2) { pushMe(s2); if (s2.room) broadcast(s2.room, { type: 'peer-update', id: s2.peerId, profile: peerProfile(s2) }, s2); }
      console.log(`[관리자] @${u.username} 칭호 ${d.code} ${d.name} 회수`);
      return reply(200, { username: u.username, text: `${d.code} ${d.icon} ${d.name} 칭호를 뺐어요` });
    }
    if (req.url === '/rod' || req.url === '/rod-take') {
      migrate(u);
      const code = String(m.code || '').toUpperCase().replace(/^R?(\d+)$/, (_, d) => 'R' + Number(d));
      const hit = findBy(CATALOG.rods, code);
      if (!hit) return reply(400, { error: `${code} 낚싯대는 없어요. (rodlist 로 번호를 확인해 주세요)` });
      const [id, r] = hit;
      if (req.url === '/rod') {
        if (u.rods[id]) return reply(400, { error: `@${u.username}은(는) 이미 ${r.name}을(를) 가지고 있어요.` });
        u.rods[id] = true; u.rod = id;
        store.save(); notify(`🎁 관리자에게 ${r.name}을(를) 받았어요! 바로 장착했어요 🎣`);
        console.log(`[관리자] @${u.username} 낚싯대 ${code} ${r.name} 지급`);
        return reply(200, { username: u.username, text: `${code} ${r.name}을(를) 줬어요` });
      }
      if (id === 'rod1') return reply(400, { error: '기본 낚싯대(R1)는 뺄 수 없어요.' });
      if (!u.rods[id]) return reply(400, { error: `@${u.username}은(는) ${r.name}이(가) 없어요.` });
      delete u.rods[id];
      if (u.rod === id) u.rod = 'rod1';
      store.save(); notify(null);
      console.log(`[관리자] @${u.username} 낚싯대 ${code} ${r.name} 회수`);
      return reply(200, { username: u.username, text: `${code} ${r.name}을(를) 뺐어요` });
    }
    if (req.url === '/event-give' || req.url === '/event-take') {   // 🎉 이벤트 벽지·가구·펫: 오류 생기면 관리자가 주거나 뺌 (이벤트 on/off와 무관하게 동작)
      migrate(u);
      const id = String(m.id || '');
      const def = CATALOG.walls[id] || CATALOG.items[id] || CATALOG.pets[id];
      if (!def || !def.event) return reply(400, { error: `'${id}'은(는) 이벤트 아이템이 아니에요.` });
      const give = req.url === '/event-give';
      if (CATALOG.walls[id]) {
        if (give) { if (u.owned[id]) return reply(400, { error: `@${u.username}은(는) 이미 '${def.name}'을(를) 가지고 있어요.` }); u.owned[id] = 1; }
        else { if (!u.owned[id]) return reply(400, { error: `@${u.username}은(는) '${def.name}'이(가) 없어요.` }); delete u.owned[id]; }
      } else if (CATALOG.items[id]) {
        if (give) u.owned[id] = (u.owned[id] || 0) + 1;
        else { if (!(u.owned[id] > 0)) return reply(400, { error: `@${u.username}은(는) '${def.name}'이(가) 없어요.` }); u.owned[id] -= 1; if (u.owned[id] <= 0) delete u.owned[id]; }
      } else {   // 펫
        if (give) {
          if (u.pets.length >= CATALOG.limits.petsMax) return reply(400, { error: `@${u.username}은(는) 펫이 이미 ${CATALOG.limits.petsMax}마리라 더 줄 수 없어요.` });
          const name = String(m.name || '').trim().slice(0, 10) || def.name;
          u.pets.push({ id: 'p' + crypto.randomBytes(5).toString('hex'), kind: id, name, out: false, floor: 1, full: 70, love: 10, level: 1, exp: 0, updated: now() });
        } else {
          const same = u.pets.filter((x) => x.kind === id);
          if (!same.length) return reply(400, { error: `@${u.username}은(는) ${def.name}이(가) 없어요.` });
          let pick = same[same.length - 1];   // 이름 · 번호가 없으면 가장 최근에 들어온 아이
      if (String(m.name || '').trim()) { const r = pickPet(same, m.name, p.name); if (r.error) return reply(400, { error: r.error }); pick = r.pet; }   // 0.17.3 번호로도, 틀린 이름이면 안 뺌
          u.pets = u.pets.filter((x) => x !== pick);
        }
      }
      store.save();
      notify(give ? `🎁 관리자에게 '${def.name}'을(를) 받았어요!` : null);
      console.log(`[관리자] @${u.username} 이벤트 아이템 ${id} ${give ? '지급' : '회수'}`);
      return reply(200, { username: u.username, text: `'${def.name}'을(를) ${give ? '줬어요' : '뺐어요'}` });
    }
    if (req.url === '/eventcoin' || req.url === '/eventcoin-take') {   // 🎉 이벤트 코인 지급 · 회수 (이벤트마다 따로)
      migrate(u);
      const key = String(m.event || '');
      const ev = CATALOG.events[key];
      if (!ev) return reply(400, { error: `'${key}'은(는) 없는 이벤트예요. halloween(🎃 호박 코인) · christmas(🎄 트리 코인) · newyear(🧧 복주머니 코인) 중에 넣어 주세요.` });
      const amount = Math.floor(Number(m.amount));
      if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) return reply(400, { error: '코인 수는 1~1,000,000 사이로 넣어 주세요.' });
      const have = u.eventCoins[key] || 0;
      const delta = req.url === '/eventcoin' ? amount : -Math.min(amount, have);
      u.eventCoins[key] = Math.max(0, have + delta);
      store.save();
      const s2 = sessions.get(u.id);
      if (s2) {
        pushMe(s2, { amount: delta, reason: 'admin-eventcoin', event: key });
        if (delta > 0) send(s2, { type: 'notice', message: `🎁 관리자에게 ${ev.coin.icon} ${ev.coin.name} ${delta}개를 받았어요!`, popup: true });
      }
      console.log(`[관리자] @${u.username} ${ev.coin.name} ${delta > 0 ? '+' : ''}${delta} → ${u.eventCoins[key]}`);
      return reply(200, { username: u.username, event: key, coinName: ev.coin.name, coinIcon: ev.coin.icon, coins: u.eventCoins[key], delta });
    }
    if (req.url === '/pet' || req.url === '/pet-take') {
      migrate(u);
      const code = String(m.code || '').toUpperCase().replace(/^P?(\d+)$/, (_, d) => 'P' + d.padStart(2, '0'));
      const hit = findBy(CATALOG.pets, code);
      if (!hit) return reply(400, { error: `${code} 펫은 없어요. (petlist 로 번호를 확인해 주세요)` });
      const [kind, p] = hit;
      if (req.url === '/pet') {
        if (u.pets.length >= CATALOG.limits.petsMax) return reply(400, { error: `@${u.username}은(는) 펫이 이미 ${CATALOG.limits.petsMax}마리라 더 줄 수 없어요.` });
        const name = String(m.name || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 10) || p.name;
        u.pets.push({ id: 'p' + crypto.randomBytes(5).toString('hex'), kind, name, out: false, floor: 1, full: 70, love: 10, level: 1, exp: 0, updated: Date.now() });
        store.save(); notify(`🎁 관리자에게 펫 '${name}'(${p.name})을(를) 받았어요!`);
        console.log(`[관리자] @${u.username} 펫 ${code} ${p.name} 지급`);
        return reply(200, { username: u.username, text: `${code} ${p.name}(${name})을(를) 줬어요` });
      }
      // 같은 종류가 여러 마리면 이름으로 고르고, 없으면 가장 최근에 들어온 아이
      const same = u.pets.filter((x) => x.kind === kind);
      if (!same.length) return reply(400, { error: `@${u.username}은(는) ${p.name}이(가) 없어요.` });
      let pick = same[same.length - 1];   // 이름 · 번호가 없으면 가장 최근에 들어온 아이
      if (String(m.name || '').trim()) { const r = pickPet(same, m.name, p.name); if (r.error) return reply(400, { error: r.error }); pick = r.pet; }   // 0.17.3 번호로도, 틀린 이름이면 안 뺌
      u.pets = u.pets.filter((x) => x !== pick);
      store.save(); notify(null);
      console.log(`[관리자] @${u.username} 펫 ${code} ${p.name}(${pick.name}) 회수`);
      return reply(200, { username: u.username, text: `${code} ${p.name}(${pick.name})을(를) 뺐어요${same.length > 1 ? ` · 남은 ${p.name} ${same.length - 1}마리` : ''}` });
    }
    if (req.url === '/limited-give' || req.url === '/limited-take') {   // 0.17.5 🍫 한정 선물 펫 지급 · 회수 (서버 오류로 못 받았을 때)
      migrate(u);
      const key = String(m.key || 'pepero');
      const g = CATALOG.limitedGifts[key];
      if (!g) return reply(400, { error: `${key} 선물이 없어요.` });
      if (req.url === '/limited-give') {
        let kind = null;
        if (m.code) {
          const code = String(m.code).toUpperCase().replace(/^P?(\d+)$/, (_, d) => 'P' + d.padStart(2, '0'));
          const hit = Object.entries(CATALOG.pets).find(([, p]) => p.code === code && p.limited === key);
          if (!hit) return reply(400, { error: `${code}는 ${g.name} 펫이 아니에요. (${limitedMod.kindsOf(key).map((k) => CATALOG.pets[k].code).join(' · ')})` });
          kind = hit[0];
        }
        const r = limitedMod.give(u, key, kind, Math.random, true);   // 0.17.5 고침: 관리자는 이미 받은 사람에게도 더 줌 (받음 표시는 안 건드림)
        if (r.error) return reply(400, { error: `@${u.username}: ${r.error}` });
        store.save();
        const s2 = sessions.get(u.id);
        if (s2) { pushMe(s2); limitedNotice(s2, { key, ...r }); if (s2.room) broadcast(s2.room, { type: 'peer-update', id: s2.peerId, profile: peerProfile(s2) }, s2); }
        console.log(`[관리자] @${u.username} ${g.name} 펫 ${r.def.code} ${r.def.name} 지급`);
        const has = u.pets.filter((x) => CATALOG.pets[x.kind]?.limited === key).length;
        return reply(200, { username: u.username, text: `${g.icon} ${r.def.code} ${r.def.name}을(를) 줬어요${kind ? '' : ' (랜덤)'} · 이제 ${g.name} 펫 ${has}마리${s2 ? ' · 접속 중이라 바로 축하 창이 떠요' : ''}${!limitedMod.got(u, key) ? ` · 그날 자동 선물은 아직 안 받아서 ${limitedMod.isOpen(key) ? '접속하면 하나 더 받아요' : '못 받은 상태예요 (pepero-all 로 줄 수 있어요)'}` : ''}` });
      }
      const r = limitedMod.take(u, key, m.name, pickPet);
      if (r.error) return reply(400, { error: `@${u.username}: ${r.error}` });
      store.save(); notify(null);
      if (r.pet) console.log(`[관리자] @${u.username} ${g.name} 펫 ${CATALOG.pets[r.pet.kind].name}(${r.pet.name}) 회수`);
      return reply(200, { username: u.username, text: `${g.icon} ${CATALOG.pets[r.pet.kind].name}('${r.pet.name}')을(를) 뺐어요 · 남은 ${g.name} 펫 ${r.left}마리` });
    }
    if (req.url === '/inv') { // 한 사람이 가진 것 전부 보기
      migrate(u);
      const fish = Object.entries(u.fishInv).filter(([, n]) => n > 0).sort().map(([c, n]) => `#${c} ${CATALOG.fish[c]?.name || '?'}×${n}`);
      const tankFish = Object.values(u.tanks || {}).flat().map((c) => `#${c}`);
      const acc = Object.keys(u.acc.owned).filter((k) => u.acc.owned[k] && CATALOG.accessories[k]).map((k) => `${CATALOG.accessories[k].code} ${CATALOG.accessories[k].name}${Object.values(u.acc.eq).includes(k) ? '(착용)' : ''}`);
      const nth = {};
      const pets = u.pets.map((x) => `${CATALOG.pets[x.kind]?.code} ${CATALOG.pets[x.kind]?.name} ${(nth[x.kind] = (nth[x.kind] || 0) + 1)}번 '${x.name}' Lv.${x.level}${CATALOG.petTraits[x.trait] ? ' ' + CATALOG.petTraits[x.trait].icon + CATALOG.petTraits[x.trait].name : ''}${x.ending ? ` 말끝'${x.ending}'` : ''}${x.out ? '(나와 있음)' : ''}`);
      const rods = Object.keys(u.rods || {}).filter((k) => CATALOG.rods[k]).map((k) => `${CATALOG.rods[k].code} ${CATALOG.rods[k].name}${u.rod === k ? '(장착)' : ''}`);
      return reply(200, { username: u.username, nickname: u.nickname, coins: u.coins, eventCoins: u.eventCoins || {}, eventEarned: u.eventEarned || {}, fish, tankFish, aquarium: u.aquarium.map((c) => `#${c}`), acc, pets, rods, dex: Object.keys(u.dex).length });
    }
    if (req.url === '/give' || req.url === '/take') {
      const amount = Math.floor(Number(m.amount));
      if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) return reply(400, { error: '코인 수는 1~1,000,000 사이로 넣어 주세요.' });
      const delta = req.url === '/give' ? amount : -Math.min(amount, u.coins);
      u.coins = Math.min(MAX_COINS, u.coins + delta);
      store.save();
      const s = sessions.get(u.id);
      if (s) {
        pushMe(s, { amount: delta, reason: 'admin' });
        const memo = clean(m.memo, 60);
        if (delta > 0) send(s, { type: 'notice', message: `🎁 관리자에게 🪙${delta}을 받았어요!${memo ? ' (' + memo + ')' : ''}`, popup: true });
      }
      console.log(`[관리자] @${u.username} ${delta > 0 ? '+' : ''}${delta} → ${u.coins}`);
      return reply(200, { username: u.username, coins: u.coins, delta });
    }
    reply(404, { error: '없는 명령' });
  });
});
// ------------------------------------------------------------ 자동 백업 (하루 한 번, 7일 보관)
const BACKUP_DIR = path.join(path.dirname(DATA_FILE), 'backups');
function listBackups() {
  try { return fsys.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json')).sort(); } catch { return []; }
}
function makeBackup(force = false) {
  try {
    fsys.mkdirSync(BACKUP_DIR, { recursive: true });
    const day = game.kstDay();
    const name = force ? `buddy-data-${day}-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.json` : `buddy-data-${day}.json`;
    const file = path.join(BACKUP_DIR, name);
    if (!force && fsys.existsSync(file)) return name;
    store.flush();
    fsys.copyFileSync(DATA_FILE, file);
    const all = listBackups();
    while (all.length > 7) fsys.unlinkSync(path.join(BACKUP_DIR, all.shift()));
    console.log(`💾 백업 저장: ${name}`);
    return name;
  } catch (e) { console.error('백업 실패:', e.message); return null; }
}
setTimeout(() => makeBackup(), 30_000);
setInterval(() => makeBackup(), 3600_000);

// 관리자 포트가 막혀 있어도 게임 서버는 계속 돌아가게
adminServer.on('error', (e) => {
  console.warn(`⚠️  관리자 기능을 켜지 못했어요 (포트 ${ADMIN_PORT}: ${e.code}). 게임 서버는 정상이에요.`);
  console.warn('   관리자 명령을 쓰려면 다른 번호로 켜 보세요. 예) set ADMIN_PORT=9788 && npm run server');
});
adminServer.listen(ADMIN_PORT, '127.0.0.1', () => console.log(`관리자 기능 준비됨 · 이 컴퓨터에서만 · 포트 ${ADMIN_PORT}`));

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`❌ ${PORT}번 포트를 이미 다른 프로그램이 쓰고 있어요.`);
    console.error('   다른 cmd 창에 예전 서버가 켜져 있으면 그 창을 닫고 다시 실행해 주세요.');
  } else if (e.code === 'EACCES') {
    console.error(`❌ Windows가 ${PORT}번 포트를 쓰지 못하게 막아 뒀어요.`);
    console.error('   다른 번호로 켜 보세요. 예) set PORT=9787 && npm run server  (앱 서버 주소도 ws://localhost:9787 로)');
  } else {
    console.error('❌ 서버를 켜지 못했어요:', e.message);
  }
  process.exit(1);
});
server.listen(PORT, () => {
  console.log(`Desktop Buddy 서버 실행 중 · 포트 ${PORT} · 저장 파일 ${DATA_FILE}`);
  if (process.env.RAILWAY_ENVIRONMENT_NAME && !process.env.RAILWAY_VOLUME_MOUNT_PATH && !process.env.DATA_FILE) {
    console.warn('⚠️  Volume이 연결되지 않았어요! 이대로면 서버가 다시 시작될 때 계정과 코인이 지워져요. Railway에서 Volume을 붙여 주세요.');
  }
});
module.exports = { server, wss, db, adminServer, ADMIN_KEY_FILE };
