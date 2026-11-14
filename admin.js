// 관리자 명령어 (서버가 켜져 있는 컴퓨터에서 실행)
//   npm run admin -- list                         전체 사용자와 코인
//   npm run admin -- users                        👥 가입한 사람 전부 (가입일 · 마지막 접속 · 레벨)
//   npm run admin -- user 아이디(또는 닉네임)     🔎 한 사람 자세히 (친구 · 기기 · 데스크톱 코드)
//   npm run admin -- resetpw 아이디 [새비밀번호]  🔑 비밀번호 재설정 (안 넣으면 임시 비밀번호를 만들어 보여줘요)
//   npm run admin -- coins 아이디                 한 사람 코인 · 이벤트 코인 확인
//   npm run admin -- give 아이디 500 [메모]       코인 넣기
//   npm run admin -- take 아이디 100              코인 빼기
//   npm run admin -- give-all 500 [메모]          모든 사람에게 코인 (보상용)
//   npm run admin -- fish 아이디 23 [개수]        물고기 주기 (#23 = 소라게)
//   npm run admin -- fish-take 아이디 23 [개수]   물고기 빼기
//   npm run admin -- title-give 아이디 T91        🏅 칭호 주기 (title-take 로 빼기, 운영자 전용 칭호도)
//   npm run admin -- rod 아이디 R4                낚싯대 주기     (rod-take 로 빼기)
//   npm run admin -- pet 아이디 P02 [이름]        펫 주기         (pet-take 로 빼기)
//   npm run admin -- inv 아이디                   가진 것 전부 보기
//   npm run admin -- fishlist / titlelist / petlist 번호표
//   npm run admin -- notice "공지 내용"           접속한 모두에게 공지
//   npm run admin -- level 아이디 10              캐릭터 레벨 바꾸기
//   npm run admin -- petlevel 아이디 P02 5 [이름] 펫 레벨 바꾸기 (1~5)
//   npm run admin -- pettrait 아이디 P02 grumpy [번호]  🐾 펫 성격 정해 주기 (random 이면 다시 뽑기, traitlist 성격 목록)
//   npm run admin -- pepero-give/pepero-take 아이디 · pepero-all · pepero-list  🍫 빼빼로 데이 한정 펫
//   ※ 한글을 못 치면: 아이디 대신 데스크톱 코드 8자리, 펫 이름 대신 번호(inv 에 나오는 1번 · 2번), 성격은 영어(grumpy 등)
//   npm run admin -- nameeffect 아이디 neon       닉네임 효과 (neon·rainbow·gold·galaxy·fire·none)
//   npm run admin -- event halloween on           시즌 이벤트 켜기/끄기 (event-give/take 로 아이템 지급, eventcoin 으로 코인 지급)
//   npm run admin -- eventcoin-all halloween 100 [메모]  모두에게 이벤트 코인
//   npm run admin -- eventpetlevel 아이디 [이벤트|all] 5  이벤트 펫 레벨 한 번에
//   npm run admin -- inbox [all]                  ✉️ 운영자에게 온 쪽지 보기 (reply 번호 "답장", mail-del 번호)
//   npm run admin -- writer 아이디                📢 공지 패널 글쓰기 권한 주기 (writer-remove 로 빼기)
//   npm run admin -- meet-seat 아이디 1           🏢 운영자 회의장 자리 정하기 (1=대표 ~ 8=구석 인형 자리)
//   npm run admin -- meet-unseat 아이디           🏢 회의장 자리 빼기 · meet-seats 자리 보기 · meet-end 모두 집으로
//   npm run admin -- backup                       지금 바로 백업
//   npm run admin -- backups                      백업 목록
// 서버와 같은 컴퓨터에서만 동작하고(127.0.0.1), 서버가 만든 admin.key 로 확인해요.
const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_FILE = process.env.DATA_FILE
  || (process.env.RAILWAY_VOLUME_MOUNT_PATH && path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'buddy-data.json'))
  || path.join(__dirname, 'data', 'buddy-data.json');
const KEY_FILE = path.join(path.dirname(DATA_FILE), 'admin.key');
const PORT = Number(process.env.ADMIN_PORT) || 8788;

const [cmd, ...args] = process.argv.slice(2);
const USAGE = `사용법:
  npm run admin -- list
  npm run admin -- users                          👥 가입한 사람 전부 (가입일 · 마지막 접속 · 레벨 · 코인)
  npm run admin -- user 아이디                    🔎 한 사람 자세히 (닉네임으로 찾아도 돼요)
  npm run admin -- resetpw 아이디 [새비밀번호]    🔑 비밀번호 재설정 (새 비밀번호를 안 넣으면 임시 비밀번호를 만들어 줘요)
  npm run admin -- coins 아이디                   코인 · 이벤트 코인 확인
  npm run admin -- give 아이디 500 [메모]
  npm run admin -- take 아이디 100
  npm run admin -- give-all 500 [메모]            모든 사람에게 코인 (보상용, 주기 전에 자동 백업)
  npm run admin -- fish 아이디 23 [개수]          물고기 주기
  npm run admin -- fish-take 아이디 23 [개수]     물고기 빼기
  npm run admin -- title-give 아이디 T91          🏅 칭호 주기 (번호 · 이름 다 돼요. T90 운영자 · T91 베타 테스터 · T92 명예 버디)
  npm run admin -- title-take 아이디 T91          🏅 칭호 빼기
  npm run admin -- rod 아이디 R4                  낚싯대 주기 (바로 장착)
  npm run admin -- rod-take 아이디 R4             낚싯대 빼기
  npm run admin -- pet 아이디 P02 [이름]          펫 주기
  npm run admin -- pet-take 아이디 P02 [이름]     펫 빼기 (같은 종류가 여럿이면 이름으로 골라요)
  npm run admin -- inv 아이디                     가진 것 전부 보기
  npm run admin -- fishlist | titlelist | petlist | rodlist   번호표
  npm run admin -- notice "공지 내용"
  npm run admin -- level 아이디 10                캐릭터 레벨 바꾸기 (1~99)
  npm run admin -- petlevel 아이디 P02 5 [이름]   펫 레벨 바꾸기 (1~5, 같은 펫이 여럿이면 이름으로)
  npm run admin -- pettrait 아이디 P02 grumpy [번호]   🐾 펫 성격 정해 주기 (같은 펫이 여럿이면 2 처럼 번호로 한 마리만, random 이면 다시 뽑기)
  npm run admin -- traitlist                      🐾 펫 성격 목록 (영어 이름 · 확률)
  npm run admin -- pepero-give 아이디 [P24~P28]    🍫 빼빼로 데이 펫 더 주기 (이미 받았어도 몇 번이든, 번호 없으면 랜덤)
  npm run admin -- pepero-take 아이디 [번호]       🍫 빼빼로 데이 펫 빼기 (여럿이면 inv 의 번호로)
  npm run admin -- pepero-all                     🍫 그날 자동 선물을 못 받은 사람 모두에게 랜덤으로 (서버가 멈췄던 날 등)
  npm run admin -- pepero-list                    🍫 누가 받았는지 보기
  ※ 한글을 못 치면: 아이디 대신 데스크톱 코드 8자리, 펫 이름 대신 번호 (inv 아이디 에 1번 · 2번으로 나와요), 성격은 영어로
  npm run admin -- nameeffect 아이디 neon         닉네임 효과 (neon=네온, rainbow=무지개, gold=골드, galaxy=은하수, fire=불꽃, none=없음)
  npm run admin -- event halloween on             시즌 이벤트 켜기/끄기 (halloween·christmas·newyear, on/off)
  npm run admin -- events                         이벤트 on/off 상태 보기
  npm run admin -- event-give 아이디 hwBat [이름] 이벤트 전용 벽지·가구·펫 주기 (event-take 로 빼기)
  npm run admin -- eventcoin 아이디 halloween 50  이벤트 코인 넣기 (halloween=🎃호박 · christmas=🎄트리 · newyear=🧧복주머니, eventcoin-take 로 빼기)
  npm run admin -- eventcoin-all halloween 100 [메모]   모든 사람에게 이벤트 코인 (주기 전에 자동 백업)
  npm run admin -- eventpetlevel 아이디 5          그 사람의 이벤트 펫 전부 레벨 바꾸기 (1~5)
  npm run admin -- eventpetlevel 아이디 halloween 5   한 이벤트 펫만 (christmas · newyear 도 돼요)
  npm run admin -- inbox                          ✉️ 운영자에게 온 안 읽은 쪽지 (inbox all = 전부, inbox read = 보고 모두 읽음 처리)
  npm run admin -- reply 3 "답장 내용"            3번 쪽지에 답장 (보낸 사람에게 알림이 가요)
  npm run admin -- mail-del 3                     3번 쪽지 지우기
  npm run admin -- writer 아이디                  📢 공지 패널에 글 쓰는 권한 주기
  npm run admin -- writer-remove 아이디           권한 빼기
  npm run admin -- meet-seat 아이디 1              🏢 운영자 회의장 자리 정하기 (1=대표 · 2~7 · 8=구석 인형 자리, 이미 자리가 있으면 바꿔요)
  npm run admin -- meet-unseat 아이디             🏢 회의장 자리 빼기 (회의장에 있으면 집으로 돌아가요)
  npm run admin -- meet-seats                     🏢 회의장 자리 보기 (누가 몇 번인지 · 지금 회의 중인지)
  npm run admin -- meet-end                       🏢 회의장에 있는 사람 모두 집으로 (자리는 그대로)
  npm run admin -- backup
  npm run admin -- backups`;
const usage = () => { console.log(USAGE); process.exit(1); };
const KST = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: '2-digit', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const when = (t) => (t ? KST.format(new Date(t)) : '-');
// '3시간 전' 같은 짧은 표시
const ago = (t) => {
  if (!t) return '기록 없음';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
};
const EV_COINS = [['halloween', '🎃'], ['christmas', '🎄'], ['newyear', '🧧']];
// 이벤트 코인 한 줄: 🎃12 🎄0 🧧30 (skipZero 면 0 인 건 빼고)
const evLine = (o, skipZero) => EV_COINS.filter(([k]) => !skipZero || (o && o[k])).map(([k, i]) => ` ${i}${(o && o[k]) || 0}`).join(skipZero ? '' : ' ');

// 번호표는 서버 없이도 볼 수 있음
if (cmd === 'fishlist' || cmd === 'acclist' || cmd === 'petlist' || cmd === 'rodlist' || cmd === 'titlelist' || cmd === 'traitlist') {
  const C = require('./catalog');
  if (cmd === 'traitlist') { const tot = Object.values(C.petTraits).reduce((n, t) => n + t.weight, 0); for (const [id, t] of Object.entries(C.petTraits)) console.log(`${id.padEnd(7)} ${t.icon} ${t.name.padEnd(6)} ${(t.weight / tot * 100).toFixed(0).padStart(2)}%`); }
  if (cmd === 'fishlist') for (const f of Object.values(C.fish).sort((a, b) => a.code.localeCompare(b.code))) console.log(`#${f.code} ${f.name.padEnd(8)} ${C.rarity[f.rar].name} ${f.chance}%`);
  const SLOT = { head: '머리', face: '얼굴', neck: '목' };
  if (cmd === 'titlelist') for (const [id, t] of Object.entries(C.titles)) { const n = t.need || {}; console.log(`${t.code} ${t.icon} ${t.name.padEnd(7)} ${t.secret ? '운영자 전용 (title-give 로 주기' + (id === 'op' ? ' · 공지 권한 있으면 저절로' : '') + ')' : (t.event ? C.events[t.event].coin.icon : '🪙') + t.price + '  ' + ('days' in n ? `가입 ${n.days}일` : n.attend ? `출석 ${n.attend}번` : n.legend ? '전설 물고기' : n.dexAll ? '물고기 도감 다 채우기' : n.pets ? `펫 ${n.pets}마리` : n.furniture ? `가구 ${n.furniture}개` : n.event ? `${C.events[n.event].name} 이벤트 중 접속` : '')}`); }
  if (cmd === 'acclist') { console.log('0.17.2부터 액세서리는 없어지고 칭호로 바뀌었어요. titlelist 를 써 주세요.'); process.exit(0); }
  if (cmd === 'rodlist') for (const r of Object.values(C.rods)) console.log(`${r.code} ${r.name.padEnd(7)} ${r.secret ? '운영자 전용' : '🪙' + r.price}  전설 1종당 ${r.legend}% · 꽝 ${r.nothing}%`);
  if (cmd === 'petlist') for (const p of Object.values(C.pets)) console.log(`${p.code} ${p.name.padEnd(5)} ${p.limited ? `${C.limitedGifts[p.limited].icon} ${C.limitedGifts[p.limited].name} 한정 (pepero-give)` : p.secret ? '운영자 전용' : p.event ? `${C.events[p.event].coin.icon}${p.price} (${C.events[p.event].name} 이벤트)` : '🪙' + p.price}`);
  process.exit(0);
}

let body;
switch (cmd) {
  case 'list': case 'users': case 'backup': case 'backups': case 'meet-seats': case 'meet-end': body = {}; break;
  case 'meet-seat': if (!args[0] || !args[1]) usage(); body = { username: args[0], seat: Number(args[1]) }; break;
  case 'meet-unseat': if (!args[0]) usage(); body = { username: args[0] }; break;
  case 'user': if (!args[0]) usage(); body = { username: args.join(' ') }; break;
  case 'resetpw': if (!args[0]) usage(); body = { username: args[0], password: args.slice(1).join(' ') }; break;
  case 'level': if (!args[0] || !args[1]) usage(); body = { username: args[0], level: Number(args[1]) }; break;
  case 'petlevel': if (!args[0] || !args[1] || !args[2]) usage(); body = { username: args[0], code: args[1], level: Number(args[2]), name: args.slice(3).join(' ') }; break;
  case 'pettrait': if (!args[0] || !args[1] || !args[2]) usage(); body = { username: args[0], code: args[1], trait: args[2], name: args.slice(3).join(' ') }; break;
  case 'pepero-give': if (!args[0]) usage(); body = { key: 'pepero', username: args[0], code: args[1] || null }; break;   // 0.17.5 🍫
  case 'pepero-take': if (!args[0]) usage(); body = { key: 'pepero', username: args[0], name: args.slice(1).join(' ') }; break;
  case 'pepero-all': case 'pepero-list': body = { key: 'pepero' }; break;
  case 'nameeffect': if (!args[0] || !args[1]) usage(); body = { username: args[0], effect: args[1] }; break;
  case 'event': if (!args[0] || !args[1]) usage(); body = { event: args[0], on: args[1] === 'on' }; break;
  case 'events': body = {}; break;
  case 'event-give': case 'event-take': if (!args[0] || !args[1]) usage(); body = { username: args[0], id: args[1], name: args.slice(2).join(' ') }; break;
  case 'eventcoin': case 'eventcoin-take': if (!args[0] || !args[1] || !args[2]) usage(); body = { username: args[0], event: args[1], amount: Number(args[2]) }; break;
  case 'eventcoin-all': if (!args[0] || !args[1]) usage(); body = { event: args[0], amount: Number(args[1]), memo: args.slice(2).join(' ') }; break;
  case 'eventpetlevel': if (!args[0] || !args[1]) usage(); body = args[2] ? { username: args[0], event: args[1], level: Number(args[2]) } : { username: args[0], event: 'all', level: Number(args[1]) }; break;
  case 'inbox': body = { all: args[0] === 'all', read: args[0] === 'read' }; break;
  case 'reply': if (!args[0] || !args[1]) usage(); body = { id: Number(String(args[0]).replace(/^#/, '')), message: args.slice(1).join(' ') }; break;
  case 'mail-del': if (!args[0]) usage(); body = { id: Number(String(args[0]).replace(/^#/, '')) }; break;
  case 'give-all': if (!args[0]) usage(); body = { amount: Number(args[0]), memo: args.slice(1).join(' ') }; break;
  case 'coins': if (!args[0]) usage(); body = { username: args[0] }; break;
  case 'give': case 'take': if (!args[0] || !args[1]) usage(); body = { username: args[0], amount: Number(args[1]), memo: args.slice(2).join(' ') }; break;
  case 'fish': case 'fish-take': if (!args[0] || !args[1]) usage(); body = { username: args[0], code: args[1].replace(/^#/, ''), amount: Number(args[2] || 1) }; break;
  case 'acc': case 'acc-take': case 'rod': case 'rod-take': if (!args[0] || !args[1]) usage(); body = { username: args[0], code: args[1] }; break;
  case 'title-give': case 'title-take': if (!args[0] || !args[1]) usage(); body = { username: args[0], code: args.slice(1).join(' ') }; break;
  case 'pet': case 'pet-take': if (!args[0] || !args[1]) usage(); body = { username: args[0], code: args[1], name: args.slice(2).join(' ') }; break;
  case 'inv': case 'writer': case 'writer-remove': if (!args[0]) usage(); body = { username: args[0] }; break;
  case 'notice': if (!args.length) usage(); body = { message: args.join(' ') }; break;
  default: usage();
}

let key;
try { key = fs.readFileSync(KEY_FILE, 'utf8').trim(); } catch {
  console.error(`관리자 키 파일(${KEY_FILE})이 없어요. 서버를 한 번 켜면 만들어져요.`);
  process.exit(1);
}

const PATHS = { 'pepero-give': '/limited-give', 'pepero-take': '/limited-take', 'pepero-all': '/limited-all', 'pepero-list': '/limited-list' };   // 0.17.5
const req = http.request({ host: '127.0.0.1', port: PORT, path: PATHS[cmd] || '/' + cmd, method: 'POST', headers: { 'x-admin-key': key, 'content-type': 'application/json' } }, (res) => {
  let data = '';
  res.on('data', (d) => { data += d; });
  res.on('end', () => {
    let r;
    try { r = JSON.parse(data); } catch { console.error('알 수 없는 응답:', data); process.exit(1); }
    if (r.error) { console.error('❌ ' + r.error); process.exit(1); }
    if (cmd === 'list') {
      for (const u of r.users) console.log(`${u.online ? '🟢' : '⚪'} @${u.username} (${u.nickname})  🪙${u.coins}${evLine(u.eventCoins, true)}`);
      console.log(`총 ${r.users.length}명`);
    } else if (cmd === 'users') {
      for (const u of r.users) console.log(`${u.online ? '🟢' : '⚪'} @${u.username} (${u.nickname})  Lv.${u.level}  🪙${u.coins}  친구 ${u.friends}명  가입 ${when(u.created)}  마지막 접속 ${u.online ? '지금 접속 중' : ago(u.lastSeen)}  앱 ${u.appVersion ? 'v' + u.appVersion + (r.newest && u.appVersion !== r.newest ? ' ⚠️예전 버전' : '') : '?'}`);
      console.log(`총 ${r.users.length}명 (접속 중 ${r.users.filter((u) => u.online).length}명)${r.newest ? ` · 가장 새 앱 v${r.newest} (안 바뀐 사람 ${r.users.filter((u) => u.appVersion && u.appVersion !== r.newest).length}명)` : ''}`);
    } else if (cmd === 'user') {
      console.log(`${r.online ? '🟢 접속 중' : '⚪ 접속 안 함'}  @${r.username} (${r.nickname})`);
      console.log(`  데스크톱 코드: ${r.code}   앱 버전: ${r.appVersion ? 'v' + r.appVersion + ' (마지막 접속 때)' : '아직 모름'}`);
      console.log(`  가입: ${when(r.created)}   마지막 접속: ${r.online ? '지금' : `${when(r.lastSeen)} (${ago(r.lastSeen)})`}`);
      console.log(`  Lv.${r.level}  🪙${r.coins}${evLine(r.eventCoins, true)}  📖 도감 ${r.dex}종  🐾 펫 ${r.pets}마리`);
      console.log(`  닉네임 효과: ${r.nameEffect || '없음'}   공지 글쓰기: ${r.noticeWriter ? '있음' : '없음'}   방 잠금: ${r.locked ? '잠금' : '열림'}`);
      console.log(`  친구 ${r.friends}명: ${r.friendList.join(', ') || '없음'}`);
      if (r.reqIn.length) console.log(`  받은 친구 신청: ${r.reqIn.join(', ')}`);
      if (r.reqOut.length) console.log(`  보낸 친구 신청: ${r.reqOut.join(', ')}`);
      if (r.blocked) console.log(`  차단한 사람: ${r.blocked}명`);
      console.log(`  로그인된 기기 ${r.devices.length}개${r.devices.length ? ':' : ''}`);
      for (const d of r.devices) console.log(`    · ${d.device || '이름 없음'}  (처음 ${when(d.created)} · 마지막 ${ago(d.lastUsed)})`);
      console.log('  ※ 비밀번호는 암호처럼 바꿔서 저장돼 있어서 볼 수 없어요. 까먹었으면 resetpw 로 새로 정해 주세요.');
    } else if (cmd === 'resetpw') {
      console.log(`✅ @${r.username} (${r.nickname}) 비밀번호를 바꿨어요.`);
      console.log(`   새 비밀번호: ${r.password}${r.generated ? '   (자동으로 만든 임시 비밀번호)' : ''}`);
      console.log('   이 비밀번호를 친구에게 알려주고, 로그인한 뒤 설정 → 비밀번호 바꾸기로 자기 비밀번호로 바꾸라고 해 주세요.');
      console.log(`   모든 기기에서 로그아웃됐어요${r.wasOnline ? ' (접속 중이어서 바로 로그인 화면으로 바뀌었어요)' : ''}.`);
    } else if (cmd === 'coins') { console.log(`@${r.username} (${r.nickname}) 🪙${r.coins}`); console.log(`이벤트 코인:${evLine(r.eventCoins)}`); console.log(`접속으로 번 누적:${evLine(r.eventEarned)}`); }
    else if (cmd === 'fish') console.log(`✅ @${r.username}에게 #${r.code} ${r.name} ${r.n}마리를 줬어요`);
    else if (['fish-take', 'acc', 'acc-take', 'pet', 'pet-take', 'rod', 'rod-take', 'writer', 'writer-remove', 'title-give', 'title-take', 'level', 'petlevel', 'pettrait', 'nameeffect', 'event-give', 'event-take', 'eventpetlevel'].includes(cmd)) console.log(`✅ @${r.username}: ${r.text}`);
    else if (cmd === 'pepero-give' || cmd === 'pepero-take') console.log(`✅ @${r.username}: ${r.text}`);
    else if (cmd === 'pepero-all') { for (const l of r.lines) console.log(l); console.log(`✅ ${r.text}`); }
    else if (cmd === 'pepero-list') { console.log(r.title); for (const l of r.lines) console.log(l); console.log(`받은 사람 ${r.got} / ${r.total}명`); }
    else if (cmd === 'event') console.log(`✅ ${r.event} 이벤트 → ${r.on ? '켬' : '끔'} (접속 중 ${r.notified}명에게 알림)`);
    else if (cmd === 'events') for (const [k, v] of Object.entries(r.events)) console.log(`${v ? '🟢' : '⚪'} ${k}`);
    else if (cmd === 'eventcoin' || cmd === 'eventcoin-take') console.log(`✅ @${r.username} ${r.coinIcon} ${r.coinName} ${r.delta > 0 ? '+' : ''}${r.delta} → 지금 ${r.coins}`);
    else if (cmd === 'inv') {
      console.log(`@${r.username} (${r.nickname})  🪙${r.coins}  📖 도감 ${r.dex}종`);
      console.log(`🎉 이벤트 코인:${evLine(r.eventCoins)}  (접속으로 번 누적:${evLine(r.eventEarned)})`);
      console.log(`🎒 물고기: ${r.fish.join(', ') || '없음'}`);
      if (r.tankFish.length) console.log(`🐠 어항 속: ${r.tankFish.join(' ')}`);
      if (r.aquarium.length) console.log(`🐋 아쿠아리움: ${r.aquarium.join(' ')}`);
      console.log(`👒 액세서리: ${r.acc.join(', ') || '없음'}`);
      console.log(`🐾 펫: ${r.pets.join(', ') || '없음'}`);
      if (r.rods) console.log(`🎣 낚싯대: ${r.rods.join(', ')}`);
    }
    else if (cmd === 'eventcoin-all') console.log(`✅ 모두 ${r.n}명에게 ${r.coinIcon} ${r.coinName} ${r.amount}개를 줬어요 (지금 접속 중인 ${r.online}명은 바로 알림을 받았어요)`);
    else if (cmd === 'inbox') {
      const KT = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      if (!r.list.length) console.log(args[0] === 'all' ? '받은 쪽지가 없어요.' : '안 읽은 쪽지가 없어요. (inbox all 로 전부 보기)');
      for (const x of r.list) {
        console.log(`${x.read ? '  ' : '🆕'} #${x.id}  @${x.from} (${x.nickname})  ${KT.format(new Date(x.at))}`);
        console.log(`     ${x.text.replace(/\n/g, '\n     ')}`);
        for (const y of x.replies) console.log(`     ↳ ${y.by}: ${y.text}`);
      }
      console.log(`안 읽은 쪽지 ${r.unread}개 · 전체 ${r.total}개${args[0] === 'read' ? ' (방금 모두 읽음으로 바꿨어요)' : ''}`);
    }
    else if (cmd === 'reply') console.log(`✅ #${r.id} 쪽지에 답장했어요 → @${r.to}${r.online ? ' (접속 중이라 바로 알림)' : ' (다음에 접속하면 쪽지함에서 보여요)'}`);
    else if (cmd === 'mail-del') console.log(`✅ #${r.id} 쪽지를 지웠어요`);
    else if (cmd === 'give-all') console.log(`✅ 모두 ${r.n}명에게 🪙${r.amount}을 줬어요 (지금 접속 중인 ${r.online}명은 바로 알림을 받았어요)`);
    else if (cmd === 'notice') console.log(`✅ 접속 중인 ${r.sent}명에게 공지를 보냈어요`);
    else if (cmd === 'meet-seat' || cmd === 'meet-unseat') console.log(`✅ 🏢 ${r.text}`);
    else if (cmd === 'meet-seats') {
      for (const x of r.seats) console.log(`${x.n}번${x.n === 1 ? '(대표)' : x.n === 8 ? '(인형)' : ''}  ${x.username ? `@${x.username} (${x.nickname})${x.here ? '  🟢 회의 중' : x.online ? '  · 접속 중' : ''}` : '- 비어 있음'}`);
    }
    else if (cmd === 'meet-end') console.log(`✅ 🏢 회의장에 있던 ${r.n}명을 집으로 보냈어요`);
    else if (cmd === 'backup') console.log(r.file ? `✅ 백업 저장: ${r.file}` : '❌ 백업 실패');
    else if (cmd === 'backups') { console.log(r.files.length ? r.files.join('\n') : '아직 백업이 없어요'); }
    else console.log(`✅ @${r.username} ${r.delta > 0 ? '+' : ''}${r.delta} → 지금 🪙${r.coins}`);
  });
});
req.on('error', () => { console.error('서버에 연결하지 못했어요. 서버가 켜져 있는지 확인해 주세요.'); process.exit(1); });
req.end(JSON.stringify(body));
