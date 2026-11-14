// 0.17.5 🍫 한정 선물 펫 (빼빼로 데이 등): 정해진 날(한국 시간)에 접속하면 목록 중 하나를 랜덤으로 1마리.
// 그날 자동 선물은 한 사람당 한 번 (u.limited[key]), 상점 · 되팔기 · 선물 없음.
// 관리자: pepero-give(몇 번이든 더 주기) / pepero-take(빼기) / pepero-all(자동 선물 못 받은 사람 모두) / pepero-list.
const crypto = require('crypto');
const C = require('./catalog');

const kstDate = (t = Date.now()) => new Date(t + 9 * 3600_000).toISOString().slice(0, 10);   // 'YYYY-MM-DD' (한국)
const kindsOf = (key) => Object.entries(C.pets).filter(([, p]) => p.limited === key).map(([k]) => k);
const isOpen = (key, t) => (C.limitedGifts[key]?.dates || []).includes(kstDate(t));
const got = (u, key) => !!(u.limited && u.limited[key]);

/** 한 마리 주기. kind 를 안 주면 랜덤.
 *  bonus: 관리자가 더 주는 것 (pepero-give) — 이미 받았어도 주고, 받음 표시는 안 건드림 (그날 자동 선물은 따로 받음) */
function give(u, key, kind = null, rnd = Math.random, bonus = false) {
  const g = C.limitedGifts[key];
  if (!g) return { error: '없는 선물이에요.' };
  const kinds = kindsOf(key);
  if (kind && !kinds.includes(kind)) return { error: '이 선물에 없는 펫이에요.' };
  if (!bonus && got(u, key)) return { error: `이미 ${g.name} 펫을 받았어요.` };
  if ((u.pets || []).length >= C.limits.petsMax) return { error: `펫이 이미 ${C.limits.petsMax}마리라 받을 수 없어요.`, full: true };
  const k = kind || kinds[Math.floor(rnd() * kinds.length)];
  const def = C.pets[k];
  const pet = { id: 'p' + crypto.randomBytes(5).toString('hex'), kind: k, name: def.name, out: false, floor: 1, full: 70, love: 10, level: 1, exp: 0, updated: Date.now() };
  u.pets.push(pet);
  if (!bonus) (u.limited ||= {})[key] = { kind: k, at: Date.now() };
  return { pet, def, gift: g, bonus };
}

/** 접속 중 · 로그인할 때 부름: 오늘이 선물 날이고 아직 안 받았으면 줌. 준 것들을 돌려줌 */
function check(u, t = Date.now()) {
  const out = [];
  for (const key of Object.keys(C.limitedGifts || {})) {
    if (!isOpen(key, t) || got(u, key)) continue;
    const r = give(u, key);
    if (r.full) { if (!u.limitedFullNote?.[key]) { (u.limitedFullNote ||= {})[key] = 1; out.push({ key, full: true, gift: C.limitedGifts[key] }); } continue; }
    if (!r.error) out.push({ key, ...r });
  }
  return out;
}

/** 회수: 그 선물 펫 중 하나(번호 · 이름으로 고름)를 뺌. 받음 표시는 그대로 (더 준 펫을 빼도 그날 선물을 또 받지 않게) */
function take(u, key, pick, pickPet) {
  const kinds = kindsOf(key);
  const same = (u.pets || []).filter((x) => kinds.includes(x.kind));
  if (!same.length) return { error: `${C.limitedGifts[key].name} 펫이 없어요.` };
  let pet = same[same.length - 1];
  if (String(pick || '').trim() || same.length > 1) {
    const r = pickPet(same, pick, `${C.limitedGifts[key].name} 펫`);
    if (r.error) return { error: r.error };
    pet = r.pet;
  }
  u.pets = u.pets.filter((x) => x !== pet);
  return { pet, left: same.length - 1 };
}

module.exports = { kstDate, kindsOf, isOpen, got, give, check, take };
