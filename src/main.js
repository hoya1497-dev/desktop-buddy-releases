// Desktop Buddy — Electron 메인 프로세스
// 오버레이(바탕화면 캐릭터) · 집 · 로그인 · 설정 창, 트레이, 창 목록, 자동 상태, 서버 연결

const {
  app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut, safeStorage, shell, Notification, session: electronSession, net,
} = require('electron');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { createUpdater } = require('./updater');

// ---------------------------------------------------------------- 베타 테스트 (npm run beta / beta2)
// 개발용으로 켤 때만: --profile=2 처럼 주면 저장 폴더를 따로 써서 앱을 여러 개 동시에 켤 수 있고,
// --server=ws://localhost:8787 처럼 주면 그 서버로 접속해요. 설치한 앱(친구들 앱)에는 영향이 없어요.
const argOf = (k) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const BETA = app.isPackaged ? {} : { profile: argOf('profile'), server: argOf('server') };
if (!app.isPackaged) {
  // 개발용은 설치한 앱과 설정 · 자동 로그인을 섞지 않도록 다른 폴더 사용
  app.setPath('userData', path.join(app.getPath('appData'), 'Desktop Buddy Dev' + (BETA.profile ? ' ' + BETA.profile : '')));
}
const BETA_TAG = BETA.profile ? `[베타 ${BETA.profile}] ` : !app.isPackaged ? '[개발] ' : '';

// ---------------------------------------------------------------- 설정
// 배포용 기본값: 서버를 인터넷에 올린 뒤 src/defaults.json의 serverUrl만 바꾸고 설치 파일을 만들면
// 친구들은 아무 설정 없이 바로 접속돼요.
let DEFAULTS = { serverUrl: 'ws://localhost:8787', releasesUrl: '' };
try { DEFAULTS = { ...DEFAULTS, ...require('./defaults.json') }; } catch {}

const PRESETS = ['📚 공부중', '🎮 게임중', '💻 작업중', '☕ 휴식중', '💤 자리비움'];

const DEFAULT_CONFIG = {
  nickname: '나',
  color: '#f2a65a',
  nameColor: null,   // 채팅·이름표에 쓰는 닉네임 글자색 (안 고르면 기본 흰색)
  serverUrl: DEFAULTS.serverUrl,
  status: 'auto',
  customStatus: '',
  targets: [],
  occlusion: true,
  hideOthers: false,
  petScale: 3,
  species: 'cat',
  theme: 'system',   // 'system' | 'light' | 'dark' | 'aurora' | 'custom'
  // 사용자 지정 색: 배경 · 카드 · 글자 · 강조색, 오로라(파스텔 그라데이션)를 켜면 그 3가지 색으로
  themeCustom: { bg: '#f6f3ee', card: '#ffffff', ink: '#26222b', accent: '#e8894a', aurora: false, a1: '#ffd1e8', a2: '#cfc4ff', a3: '#bff0e0' },
  autoStart: true,
  showPetsDesktop: true,   // 꺼내 둔 펫이 바탕화면에서도 캐릭터를 따라다님
  showAllPets: false,      // 친구들 펫 전부 보기 (꺼내 두지 않은 펫까지)
  pose: 'auto',            // 내 캐릭터 자세 고정: auto(자유롭게) · stand · sit · lie
  timers: [],              // 세션 타이머 [{ id, name, steps: [{ name, minutes }], step, repeat, times, state, endsAt, left, round }]
  timerPin: false,         // 화면에 타이머 고정
  timerSound: true,        // 타이머가 끝나면 삐비빅 소리
  miniPin: true,           // 집 창을 닫으면 미니맵으로 보이기 (기본 켜짐)
  stickyPin: false,        // 🗒 메모장(메모 · 할 일 · 체크리스트 · 다이어리)을 화면에 띄우기
  timerBounds: null, miniBounds: null,
  statusRules: [
    'steam = 🎮 게임중', 'league = 🎮 게임중', 'valorant = 🎮 게임중', 'minecraft = 🎮 게임중',
    'code = 💻 코딩중', 'notion = 📚 공부중', 'hwp = 📚 공부중', 'word = 📚 공부중',
    '.pdf = 📚 공부중', 'youtube = 📺 시청중',
  ].join('\n'),
};

const userFile = (name) => path.join(app.getPath('userData'), name);
let config = { ...DEFAULT_CONFIG };

function loadConfig() {
  try { config = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(userFile('config.json'), 'utf8')) }; } catch {}
  if (BETA.server) config.serverUrl = BETA.server;
  // 설치본인데 개발할 때 쓰던 내 컴퓨터 서버 주소가 남아 있으면 배포용 서버 주소로 바꿈
  if (app.isPackaged && /^wss?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(config.serverUrl || '') && !/localhost|127\.0\.0\.1/.test(DEFAULTS.serverUrl)) {
    config.serverUrl = DEFAULTS.serverUrl;
    saveConfig();
  }
}
function saveConfig() {
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(userFile('config.json'), JSON.stringify(config, null, 2));
  } catch (e) { console.error('설정 저장 실패', e); }
}

// ---------------------------------------------------------------- 자동 로그인 토큰 (OS 암호화 저장소 사용)
let token = null;
function saveToken(t) {
  try {
    const data = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(t)
      : Buffer.from('plain:' + t); // 리눅스 등 키링이 없을 때만
    fs.writeFileSync(userFile('session.dat'), data, { mode: 0o600 });
  } catch (e) { console.error('토큰 저장 실패', e); }
}
function loadToken() {
  try {
    const buf = fs.readFileSync(userFile('session.dat'));
    if (buf.subarray(0, 6).toString() === 'plain:') return buf.subarray(6).toString();
    return safeStorage.decryptString(buf);
  } catch { return null; }
}
function clearToken() {
  token = null;
  try { fs.unlinkSync(userFile('session.dat')); } catch {}
}

// ---------------------------------------------------------------- 컴퓨터 켜질 때 자동 실행
function applyAutoStart() {
  try {
    if (!app.isPackaged) {
      // 개발용(npm start)은 자동 실행에 등록하지 않고, 예전에 등록된 게 있으면 지움
      // (경로에 띄어쓰기가 있으면 잘려서 "앱을 못 찾음" 오류가 났었음)
      app.setLoginItemSettings({ openAtLogin: false, path: process.execPath, args: [path.resolve(app.getAppPath())] });
      app.setLoginItemSettings({ openAtLogin: false, path: process.execPath });
      return;
    }
    app.setLoginItemSettings({ openAtLogin: !!config.autoStart });
  } catch (e) { console.error('자동 실행 설정 실패', e); }
}

// ---------------------------------------------------------------- 서버 주소 안전 검사
function serverSafety(url) {
  let u;
  try { u = new URL(url); } catch { return { ok: false, message: '서버 주소가 올바르지 않아요.' }; }
  if (u.protocol === 'wss:') return { ok: true };
  if (u.protocol !== 'ws:') return { ok: false, message: '서버 주소는 ws:// 또는 wss:// 로 시작해야 해요.' };
  const h = u.hostname;
  const local = h === 'localhost' || h === '127.0.0.1' || h === '::1';
  const lan = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
  if (local) return { ok: true };
  if (lan) return { ok: true, warn: '같은 와이파이 안에서만 쓰는 암호화되지 않은 연결이에요.' };
  return { ok: false, message: '인터넷 서버는 보안 연결(wss://)만 쓸 수 있어요. 비밀번호를 지키기 위해서예요.' };
}

// ---------------------------------------------------------------- 창
let overlay = null, control = null, home = null, login = null, tray = null;
let mini = null, timerWin = null, stickyWin = null;   // 미니맵 · 화면 고정 타이머 · 붙이는 메모
let quitting = false;

const liveWindows = new Set();

function secure(win) {
  // 외부 페이지로 이동하거나 새 창을 여는 것을 막음
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  // 화면이 깜빡이다 가구 · 물고기 그림이 투명해지는 문제: GPU 프로세스가 죽거나 다시 시작되면
  // 캔버스에 미리 그려 캐시해 둔 그림(가구 · 물고기 · 펫 비트맵)의 내용이 사라져서, 캐시를 그대로
  // 쓰는 코드는 빈 그림만 계속 그리게 됨. 창 자체가 죽는 경우도 있음 (render-process-gone).
  // 두 경우 모두 그 창을 다시 불러오면 캐시가 전부 새로 만들어져서 복구됨.
  liveWindows.add(win);
  win.on('closed', () => liveWindows.delete(win));
  win.webContents.on('render-process-gone', (e, details) => {
    console.error('render-process-gone', details.reason, win.getTitle?.());
    if (details.reason === 'clean-exit') return;
    if (win.isDestroyed()) return;
    win.webContents.reload();
  });
}

// GPU 프로세스가 죽으면(그래픽 드라이버 문제 등) 모든 창의 화면이 한꺼번에 깜빡이고,
// 캔버스로 미리 그려 둔 가구 · 물고기 · 펫 그림이 전부 투명하게 변함(캐시된 캔버스의
// GPU 쪽 내용이 날아가기 때문). 창을 다시 불러오면 캐시가 새로 만들어져서 정상으로 돌아옴.
app.on('child-process-gone', (e, details) => {
  if (details.type !== 'GPU') return;
  console.error('GPU process gone:', details.reason);
  for (const w of liveWindows) {
    if (!w.isDestroyed()) w.webContents.reload();
  }
});
const webPreferences = (extra = {}) => ({
  preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, ...extra,
});

function displayInfo() {
  const d = screen.getPrimaryDisplay();
  return { bounds: d.bounds, floorY: d.workArea.y + d.workArea.height - d.bounds.y };
}

function createOverlay() {
  const { bounds } = displayInfo();
  overlay = new BrowserWindow({
    x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
    title: 'DesktopBuddyOverlay', transparent: true, frame: false, resizable: false, movable: false,
    hasShadow: false, skipTaskbar: true, focusable: false, alwaysOnTop: true, backgroundColor: '#00000000',
    // 타이머 알람 소리는 오버레이에서 냄 (누르지 않아도 소리가 나게)
    webPreferences: webPreferences({ autoplayPolicy: 'no-user-gesture-required', backgroundThrottling: false }),
  });
  secure(overlay);
  overlay.setAlwaysOnTop(true, 'screen-saver');
  if (process.platform === 'darwin') overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setIgnoreMouseEvents(true, { forward: true });
  overlay.loadFile(path.join(__dirname, 'overlay.html'));
  overlay.webContents.on('did-finish-load', sendInit);
}
function sendInit() {
  overlay?.webContents.send('init', { floorY: displayInfo().floorY, config: publicConfig(), self: selfProfile() });
  pushPeers();
}

// 🎵 유튜브 영상 넣기: 앱 화면은 file:// 이라 유튜브가 '어디서 틀었는지(Referer)'를 몰라서 막히는 경우가 있어요.
// 유튜브 요청에만 Referer 를 붙여 줘요.
function setupYoutube() {
  try {
    electronSession.defaultSession.webRequest.onBeforeSendHeaders(
      { urls: ['https://www.youtube-nocookie.com/*', 'https://www.youtube.com/*'] },
      (d, cb) => {
        const h = d.requestHeaders;
        if (!h.Referer && !h.referer) h.Referer = 'https://desktop-buddy.app/';
        cb({ requestHeaders: h });
      });
  } catch (e) { console.error('youtube setup', e); }
}
async function ytInfo(vid) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(String(vid))) return null;
  try {
    const r = await net.fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + vid)}`);
    if (!r.ok) return { ok: false, status: r.status };
    const j = await r.json();
    return { ok: true, title: String(j.title || '').slice(0, 100), author: String(j.author_name || '').slice(0, 40) };
  } catch { return null; }
}

function makeWindow(file, opts) {
  const win = new BrowserWindow({ show: false, autoHideMenuBar: true, webPreferences: webPreferences(), ...opts });
  secure(win);
  win.loadFile(path.join(__dirname, file));
  win.on('close', (e) => { if (!quitting) { e.preventDefault(); win.hide(); } });
  return win;
}
function showWin(win) { win.show(); win.focus(); }

function showControl() {
  if (!control || control.isDestroyed()) control = makeWindow('control.html', { width: 440, height: 720, minWidth: 380, minHeight: 520, title: 'Desktop Buddy 설정' });
  if (control.webContents.isLoading()) control.webContents.once('did-finish-load', () => showWin(control));
  else { showWin(control); control.webContents.send('account', session ? { username: session.user.username, code: session.user.code } : null); }
}
function showHome(focusChat = false, dmWith = null) {
  if (!session) { showLogin(); return; }
  if (!home || home.isDestroyed()) {
    // 레코드 플레이어 노래가 누르지 않아도 바로 나오게 (autoplay)
    home = makeWindow('home.html', { width: 1220, height: 720, minWidth: 720, minHeight: 560, title: `${BETA_TAG}🏠 Desktop Buddy 집`, webPreferences: webPreferences({ autoplayPolicy: 'no-user-gesture-required', backgroundThrottling: false }) });
    for (const ev of ['show', 'hide', 'minimize', 'restore']) home.on(ev, () => setTimeout(updateWidgets, 50));
  }
  const go = () => { showWin(home); pushHome(); pushTimers(); if (focusChat) home.webContents.send('focus-chat'); if (dmWith) home.webContents.send('open-dm', dmWith); updateWidgets(); };
  if (home.webContents.isLoading()) home.webContents.once('did-finish-load', go); else go();
}
function showLogin(note = '') {
  if (!login || login.isDestroyed()) login = makeWindow('login.html', { width: 400, height: 720, resizable: false, title: 'Desktop Buddy 로그인' });
  const go = () => { showWin(login); login.webContents.send('login-state', { note, serverUrl: config.serverUrl, autoStart: config.autoStart }); };
  if (login.webContents.isLoading()) login.webContents.once('did-finish-load', go); else go();
}

// ---------------------------------------------------------------- 트레이 (숨겨진 아이콘의 집)
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'home.png'));
  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  tray.on('click', () => showHome());
  tray.on('double-click', () => showHome());
  updateTray();
}
function updateTray() {
  if (!tray) return;
  const coins = session ? ` · 🪙 ${session.user.coins.toLocaleString()}` : '';
  tray.setToolTip(`${BETA_TAG}Desktop Buddy${coins}${room ? ` · ${room.owner.nickname}님의 방` : ''}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '🏠 집 열기', enabled: !!session, click: () => showHome() },
    { label: '🚪 방 나가기 (혼자 놀기)', enabled: !!room, click: () => leaveRoom() },
    { label: '🏠 내 집으로 돌아가기', enabled: !!session && !(room && room.isOwner), click: () => wsSend({ type: 'join', code: session.user.code }) },
    { label: '캐릭터 불러오기', click: () => overlay?.webContents.send('summon') },
    { label: '⏱️ 타이머 화면에 고정', type: 'checkbox', checked: !!config.timerPin, click: (i) => setPin('timer', i.checked) },
    { label: '🗺️ 미니맵 (집 창 닫으면 작게 보기)', type: 'checkbox', checked: !!config.miniPin, click: (i) => setPin('mini', i.checked) },
    { label: '🗒 메모장 화면에 띄우기', type: 'checkbox', checked: !!config.stickyPin, click: (i) => setPin('sticky', i.checked) },
    { label: '설정', click: () => showControl() },
    { type: 'separator' },
    ...(updateState.state === 'ready'
      ? [{ label: `🔄 업데이트 설치하고 다시 시작 (v${updateState.version})`, click: () => installUpdate() }]
      : updateState.state === 'manual'
        ? [{ label: `⬇️ 새 버전 받기 (v${updateState.version})`, click: () => updater.openDownload() }]
        : [{ label: `업데이트 확인 (지금 v${app.getVersion()})`, click: () => { updater.check(); notify('업데이트 확인', '새 버전이 있는지 확인하고 있어요.'); } }]),
    session
      ? { label: `로그아웃 (${session.user.username})`, click: () => logout() }
      : { label: '로그인', click: () => showLogin() },
    { label: '종료', click: () => app.quit() },
  ]));
}

// ---------------------------------------------------------------- 창 목록 / 자동 상태
let gw = null, gwError = '', latestWindows = [], autoStatus = '';

async function loadGetWindows() {
  try { gw = await import('get-windows'); } catch (e) {
    gwError = '창 정보 모듈(get-windows)을 불러오지 못했어요. 창 위 걷기와 자동 상태는 꺼진 채로 동작해요.';
  }
}
function toOverlayRect(b) {
  let r = b;
  if (process.platform === 'win32' && screen.screenToDipRect) r = screen.screenToDipRect(null, b);
  const ob = displayInfo().bounds;
  return { x: r.x - ob.x, y: r.y - ob.y, w: r.width, h: r.height };
}
async function pollWindows() {
  if (!gw) return;
  try {
    const list = await gw.openWindows();
    const wins = [];
    for (const w of list) {
      if (!w || !w.bounds || (w.owner && w.owner.processId === process.pid)) continue;
      if (w.bounds.width < 80 || w.bounds.height < 40) continue;
      wins.push({ id: String(w.id), owner: (w.owner && w.owner.name) || '', title: w.title || '', ...toOverlayRect(w.bounds) });
    }
    latestWindows = wins;
    const targets = new Set(config.targets.map((t) => t.toLowerCase()));
    overlay?.webContents.send('windows', wins.map((w) => ({ id: w.id, x: w.x, y: w.y, w: w.w, h: w.h, target: targets.has(w.owner.toLowerCase()) })));
  } catch (e) { gwError = '창 목록을 읽지 못했어요: ' + (e?.message || e); }
}
function parseRules() {
  return String(config.statusRules || '').split('\n').map((l) => l.split('='))
    .filter((p) => p.length >= 2 && p[0].trim())
    .map(([k, ...v]) => ({ key: k.trim().toLowerCase(), status: v.join('=').trim().slice(0, 24) }));
}
async function pollActive() {
  if (!gw || config.status !== 'auto') return;
  try {
    const w = await gw.activeWindow();
    let next = autoStatus;
    if (w && !(w.owner && w.owner.processId === process.pid)) {
      const hay = `${(w.owner && w.owner.name) || ''} ${w.title || ''}`.toLowerCase();
      const rule = parseRules().find((r) => hay.includes(r.key));
      next = rule ? rule.status : '';
    }
    if (next !== autoStatus) { autoStatus = next; onSelfChanged(); }
  } catch {}
}

// ---------------------------------------------------------------- 내 프로필
function effectiveStatus() {
  if (config.status === 'auto') return autoStatus;
  if (config.status === 'none') return '';
  if (config.status === 'custom') return String(config.customStatus || '').slice(0, 24);
  return config.status;
}
function selfProfile() {
  const pet = session?.user.pet;
  return {
    nickname: config.nickname, color: config.color, nameColor: config.nameColor || null,
    nameEffect: session?.user.nameEffect || null, status: effectiveStatus(), species: config.species,
    pose: POSES.includes(config.pose) ? config.pose : 'auto',
    username: session?.user.username || '', hungry: !!pet && pet.full < 30, sad: !!pet && pet.mood < 25,
    skin: session?.user.skin?.v ? session.user.skin : null,
    acc: session?.user.acc?.eq || {},
    pets: (session?.user.pets || []).filter((x) => x.out).map((x) => ({ id: x.id, kind: x.kind, name: x.name, level: x.level, hungry: x.full < 30 })),
  };
}
function publicConfig() {
  return { petScale: config.petScale, occlusion: config.occlusion, hideOthers: config.hideOthers, showPetsDesktop: config.showPetsDesktop !== false, showAllPets: !!config.showAllPets };
}
let lastSentProfile = '';
function onSelfChanged() {
  const p = selfProfile();
  overlay?.webContents.send('self', p);
  control?.webContents.send('self', p);
  const wire = { nickname: p.nickname, color: p.color, nameColor: p.nameColor, status: p.status, species: p.species, pose: p.pose };
  const key = JSON.stringify(wire);
  if (session && key !== lastSentProfile) { lastSentProfile = key; wsSend({ type: 'profile', profile: wire }); }
  pushHome();
}

// ---------------------------------------------------------------- 서버 연결
let ws = null;
let session = null;    // { user, catalog } — 로그인된 상태
let pendingAuth = null; // 로그인 창에서 보낸 요청 (비밀번호는 연결 직후 지움)
let remember = true;
let wantRoom = null;
let room = null;       // { code, owner, isOwner, locked, home }
let myPeerId = null;
let peers = new Map();
let retry = 0, retryTimer = null;
let netState = 'offline';
let fishingView = false;   // 집 창에서 낚시터에 있는지 (미니맵에 낚시터를 보여 줌)
const chatLog = [];
let clockSkew = 0;   // 서버 시계 - 내 컴퓨터 시계 (채팅 시간을 컴퓨터 시계가 틀려도 정확하게)
const serverTime = () => Date.now() + clockSkew;
let friends = { friends: [], incoming: [], outgoing: [] };
let knocks = [];             // 내 방 문을 두드린 친구들
let invites = [];            // 나를 자기 집으로 초대한 친구들
const skins = new Map();     // username -> { v, faces, stand, sit, walk }
const skinWanted = new Map(); // 'username:v' -> 요청한 시각 (응답이 없으면 10초 뒤 다시 요청)

function wsSend(obj) { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); }
function setNet(s) { netState = s; pushHome(); updateTray(); }
function closeSocket() {
  clearTimeout(retryTimer);
  const s = ws; ws = null;
  if (s) { try { s.close(); } catch {} }
}

function connect() {
  closeSocket();
  const safety = serverSafety(config.serverUrl);
  if (!safety.ok) {
    if (pendingAuth) loginError(safety.message); else showLogin(safety.message);
    pendingAuth = null;
    return;
  }
  setNet('connecting');
  let sock;
  try { sock = new WebSocket(config.serverUrl, { handshakeTimeout: 8000 }); } catch (e) { loginError('서버에 연결하지 못했어요.'); return; }
  ws = sock;
  sock.on('open', () => {
    const req = pendingAuth || (token ? { mode: 'token', token } : null);
    pendingAuth = pendingAuth ? { mode: pendingAuth.mode } : null; // 비밀번호는 메모리에서 지움
    if (!req) { sock.close(); return; }
    sock.send(JSON.stringify({ type: 'auth', ...req, device: process.platform, version: app.getVersion() }));
  });
  sock.on('message', (d) => { let m; try { m = JSON.parse(d.toString()); } catch { return; } handleServer(m, sock); });
  sock.on('error', () => {});
  sock.on('close', () => {
    if (ws !== sock) return;
    ws = null;
    const wasRoom = room?.code;
    room = null; myPeerId = null; peers.clear(); pushPeers();
    if (sock.replaced) { session = null; setNet('offline'); onSelfChanged(); showLogin(sock.replaced); return; }
    if (pendingAuth) { pendingAuth = null; loginError('서버에 연결하지 못했어요. 서버 주소를 확인해 주세요.'); setNet('offline'); return; }
    if (token && !quitting) {
      if (wasRoom) wantRoom = wasRoom;
      const delay = Math.min(30000, 1000 * 2 ** retry++);
      setNet('reconnecting');
      retryTimer = setTimeout(connect, delay);
    } else setNet('offline');
  });
}

function loginError(message) { login?.webContents.send('login-error', message); }

function handleServer(m, sock) {
  switch (m.type) {
    case 'auth-ok': {
      retry = 0;
      if (m.token) { token = m.token; if (remember) saveToken(token); }
      pendingAuth = null;
      session = { user: m.user, catalog: m.catalog };
      if (typeof m.serverNow === 'number') clockSkew = m.serverNow - Date.now();
      config.nickname = m.user.nickname; config.color = m.user.color; config.nameColor = m.user.nameColor || config.nameColor; config.species = m.user.species || config.species; saveConfig();
      lastSentProfile = '';
      setNet('online');
      onSelfChanged();
      if (login && !login.isDestroyed() && login.isVisible()) { login.hide(); showHome(); }
      // 로그인하면 기본으로 내 집에 있음(친구가 놀러 올 수 있게). 끊겼다 다시 붙으면 있던 방으로.
      wsSend({ type: 'join', code: wantRoom || m.user.code });
      wantRoom = null;
      skinWanted.clear();
      requestSkin(m.user.username, m.user.skin?.v);
      updateWidgets();
      break;
    }
    case 'catalog':   // 🎉 관리자가 시즌 이벤트를 켜거나 꺼서 상점 목록이 바뀜
      if (session) { session.catalog = m.catalog; pushHome(); }
      break;
    case 'auth-fail':
      if (m.code === 'update-required') {
        // 앱이 너무 오래됨: 로그인 정보는 지우지 않고 업데이트를 안내
        pendingAuth = null; closeSocket(); setNet('offline');
        updateState = { ...updateState, required: true };
        loginError(m.message);
        showLogin(m.message);
        notify('업데이트가 필요해요', m.message);
        updater.check();
        break;
      }
      if (pendingAuth) { pendingAuth = null; loginError(m.message); closeSocket(); setNet('offline'); }
      else { clearToken(); closeSocket(); session = null; setNet('offline'); showLogin(m.message); }
      break;
    case 'session-replaced':
      sock.replaced = m.message;
      break;
    case 'me': {
      if (!session) return;
      const renamed = session.user.username !== m.user.username;
      session.user = m.user;
      if (renamed) control?.webContents.send('account', { username: m.user.username, code: m.user.code });
      requestSkin(m.user.username, m.user.skin?.v);
      if (m.reward?.reason === 'skin') control?.webContents.send('skin-saved', true);
      if (m.reward) {
        home?.webContents.send('reward', m.reward);
        if (m.reward.amount > 0 && (m.reward.reason === 'chat' || m.reward.reason === 'levelup')) {
          overlay?.webContents.send('emote', { from: 'me', kind: 'coin' });
        }
      }
      onSelfChanged();
      updateTray();
      break;
    }
    case 'welcome':
      wantRoom = null;
      myPeerId = m.id;
      // 🏢 운영자 회의장: 집 대신 회의실 (집 그림은 내 집 걸로 채워 두고, 화면은 회의장만 그림)
      room = { code: m.room, owner: m.owner, isOwner: m.isOwner, locked: m.locked, max: m.max, home: m.home || session?.user.home || null, meeting: m.meeting || null };
      peers = new Map(m.peers.map((p) => [p.id, p.profile]));
      // 이미 방에 있던 사람들 그림도 받아 오기 (예전엔 빠져서 집주인이 기본 고양이로 보였음)
      for (const p of peers.values()) requestSkin(p.username, p.skin?.v);
      pushPeers();
      addChat({ system: true, text: m.meeting ? `🏢 운영자 회의장에 들어왔어요. (${peers.size + 1}명) 여기서는 채팅만 할 수 있어요.`
        : m.isOwner ? '내 집에 있어요. 친구들이 놀러 올 수 있어요.' : `${m.owner.nickname}(@${m.owner.username})님의 집에 들어왔어요. (${peers.size + 1}명)` });
      updateTray();
      break;
    case 'left':
      break;
    case 'meet-seats':   // 🏢 회의장 자리가 바뀜
      if (room?.meeting) { room.meeting = { seats: m.seats || {} }; pushHome(); }
      break;
    case 'peer-join':
      peers.set(m.id, m.profile); pushPeers();
      requestSkin(m.profile.username, m.profile.skin?.v);
      addChat({ system: true, text: `${m.profile.nickname}(@${m.profile.username})님이 들어왔어요.` });
      if (room?.isOwner) home?.webContents.send('toast', `🚪 ${m.profile.nickname}(@${m.profile.username})님이 놀러 왔어요`);
      break;
    case 'peer-update':
      if (peers.has(m.id)) { peers.set(m.id, m.profile); pushPeers(); requestSkin(m.profile.username, m.profile.skin?.v); }
      break;
    case 'peer-leave': {
      const p = peers.get(m.id);
      peers.delete(m.id); pushPeers();
      if (p) addChat({ system: true, text: `${p.nickname}님이 나갔어요.` });
      break;
    }
    case 'home':
      if (room) { room.home = m.home; pushHome(); }
      break;
    case 'room-lock':
      if (room) { room.locked = m.locked; pushHome(); }
      break;
    case 'kicked':
    case 'room-closed':
      room = null; myPeerId = null; peers.clear(); pushPeers();
      addChat({ system: true, text: m.message }); updateTray();
      home?.webContents.send('toast', m.message);
      break;
    case 'friends':
      friends = { friends: m.friends, incoming: m.incoming, outgoing: m.outgoing, blocked: m.blocked || [] };
      pushHome();
      control?.webContents.send('srv', { type: 'friends', ...friends });
      break;
    case 'notice':
      home?.webContents.send('toast', m.message);
      addChat({ system: true, text: m.message });
      if (m.friendRequest) notify('친구 신청', m.message);
      if (m.popup) { notify('Desktop Buddy', m.message); overlay?.webContents.send('emote', { from: 'me', kind: 'mail' }); }
      break;
    case 'knock':
      knocks = knocks.filter((k) => k.username !== m.from.username).concat([{ ...m.from, via: m.via || null, at: Date.now() }]);
      pushHome();
      if (m.via) {   // 👥 친구의 친구가 들어오고 싶어해요
        overlay?.webContents.send('chat', { id: 'me', text: `${m.via.nickname}님의 친구 ${m.from.nickname}님이 놀러 오고 싶어해요` });
        notify('👥 들어가도 될까요?', `${m.via.nickname}님이 초대한 ${m.from.nickname}(@${m.from.username})님이 들어오고 싶어해요. 눌러서 허락해 주세요.`);
        break;
      }
      overlay?.webContents.send('chat', { id: 'me', text: `똑똑! ${m.from.nickname}(@${m.from.username})님이 문을 두드려요` });
      notify('똑똑! 🚪', `${m.from.nickname}(@${m.from.username})님이 문을 두드려요. 눌러서 열어 주세요.`);
      break;
    case 'invite':
      invites = invites.filter((k) => k.username !== m.from.username).concat([{ ...m.from, via: m.via || null, count: m.count, max: m.max, at: Date.now() }]).slice(-5);
      pushHome();
      if (m.via) {
        overlay?.webContents.send('chat', { id: 'me', text: `📨 ${m.via.nickname}님이 ${m.from.nickname}님 집으로 초대했어요!` });
        notify('📨 초대장', `${m.via.nickname}님이 ${m.from.nickname}(@${m.from.username})님 집으로 초대했어요. 수락하면 ${m.from.nickname}님이 허락해야 들어가요.`);
        break;
      }
      overlay?.webContents.send('chat', { id: 'me', text: `📨 ${m.from.nickname}님이 집으로 초대했어요!` });
      notify('📨 초대장', `${m.from.nickname}(@${m.from.username})님이 집으로 초대했어요. 눌러서 놀러 가세요!`);
      break;
    case 'knock-result':
      if (m.accept) {
        home?.webContents.send('toast', `${m.nickname}님이 문을 열어 줬어요!`);
        wsSend({ type: 'visit', username: m.username });
      } else home?.webContents.send('toast', `${m.nickname}님이 지금은 들어올 수 없대요.`);
      break;
    case 'skin':
      skins.set(m.username, { v: m.v, faces: m.faces, stand: m.stand, sit: m.sit, walk: m.walk, lie: m.lie, fall: m.fall });
      skinWanted.delete(m.username + ':' + m.v);
      pushSkins();
      break;
    case 'chat': {
      const p = peers.get(m.id);
      overlay?.webContents.send('chat', { id: m.id, text: m.text });
      addChat({ pid: m.id, from: p ? p.nickname : '?', username: p?.username, color: p?.color, nameColor: p?.nameColor, nameEffect: p?.nameEffect, text: m.text, ts: typeof m.ts === 'number' ? m.ts : serverTime() });
      break;
    }
    case 'emote':
      overlay?.webContents.send('emote', {
        from: m.id, kind: m.kind, target: m.target ? (m.target === myPeerId ? 'me' : m.target) : null,
        fromName: peers.get(m.id)?.nickname || '',
      });
      for (const w of homes()) w.webContents.send('emote', { from: m.id, kind: m.kind, target: m.target ? (m.target === myPeerId ? 'me' : m.target) : null });
      if (!m.target && EMOTE_LABEL[m.kind]) {   // 💬 이모티콘도 채팅 로그에 남김
        const p = peers.get(m.id);
        addChat({ pid: m.id, from: p ? p.nickname : '?', username: p?.username, color: p?.color, nameColor: p?.nameColor, nameEffect: p?.nameEffect, text: EMOTE_LABEL[m.kind] });
      }
      break;
    case 'peer-pos':   // 🧍 친구가 보낸 집 안 위치 → 내 화면의 그 친구 캐릭터도 같은 자리로
      for (const w of homes()) w.webContents.send('peer-pos', { id: m.id, x: m.x, y: m.y, state: m.state, dir: m.dir, inBed: m.inBed });
      break;
    case 'fish-peer':   // 미니맵에도 같이 낚시하는 친구가 보이게
    case 'fish-show':   // 🐟 잡은 물고기 자랑
      for (const w of homes()) w.webContents.send('srv', m);
      break;
    case 'dm':   // 개인 채팅
      home?.webContents.send('srv', m);
      if (m.msg?.from !== session?.user.username && !(home && home.isVisible() && home.isFocused?.())) {
        notify(`✉️ ${m.nickname || m.peer}(@${m.peer})`, m.msg.text);
        overlay?.webContents.send('emote', { from: 'me', kind: 'gift' });
      }
      break;
    case 'notices':   // 📢 공지 패널
      home?.webContents.send('srv', m);
      if (m.fresh && m.list?.[0] && !m.canEdit) notify('📢 새 공지', m.list[0].title);
      break;
    case 'music':   // 🎵 레코드 플레이어
      home?.webContents.send('srv', m);
      break;
    case 'dm-history':
      home?.webContents.send('srv', m);
      break;
    case 'mail':   // ✉️ 운영자 쪽지
      home?.webContents.send('srv', m);
      if (m.fresh && !(home && home.isVisible() && home.isFocused?.())) notify(`✉️ ${m.fresh.from}님의 쪽지`, m.fresh.text);
      break;
    case 'board':
    case 'board-upd':
    case 'board-style':
    case 'board-item':
    case 'board-del':
    case 'board-clear':
      home?.webContents.send('srv', m);
      break;
    case 'fish-cast':
    case 'fish-result':
    case 'fish-view':
    case 'aqua':
    case 'mg-state':
    case 'mg-end':
      home?.webContents.send('srv', m);
      break;
    case 'mg-invite': {
      // 대결 신청: 집 창에 수락/거절 상자 + 알림
      const name = { ttt: '틱택토', rps: '가위바위보', basket: '바구니 받기' }[m.game] || '미니게임';
      if (!home || home.isDestroyed()) showHome();
      const go = () => home.webContents.send('srv', m);
      if (home.webContents.isLoading()) home.webContents.once('did-finish-load', go); else go();
      notify('🎮 대결 신청!', `${m.from.nickname}(@${m.from.username})님이 ${name} 대결을 신청했어요. 눌러서 확인해요.`);
      overlay?.webContents.send('chat', { id: 'me', text: `🎮 ${m.from.nickname}님이 ${name} 대결 신청!` });
      break;
    }
    case 'mg-start': {
      showHome();
      const go = () => home.webContents.send('srv', m);
      if (home.webContents.isLoading()) home.webContents.once('did-finish-load', go); else go();
      break;
    }
    case 'snack': {
      const idOf = (x) => (x === myPeerId ? 'me' : x);
      const food = session?.catalog.foods[m.food];
      const d = { from: idOf(m.from), to: idOf(m.to), icon: food ? food.icon : '🍪', name: food ? food.name : '간식' };
      overlay?.webContents.send('snack', d);
      for (const w of homes()) w.webContents.send('snack', d);
      break;
    }
    case 'password-result':
    case 'username-result':
      control?.webContents.send('srv', m);
      break;
    case 'brag': {
      const f = session?.catalog.fish[m.code];
      if (!f) break;
      const r = session.catalog.rarity[f.rar];
      const text = `🎣 ${m.nickname}(@${m.username})님이 ${r.name} 등급 ${f.name}${m.size ? `(${m.size}cm)` : ''}을(를) 낚았어요!`;
      addChat({ system: true, text });
      home?.webContents.send('toast', text);
      break;
    }
    case 'error':
      addChat({ system: true, text: m.message });
      home?.webContents.send('toast', m.message);
      if (/그림/.test(m.message)) control?.webContents.send('skin-saved', m.message);
      break;
    default: break;
  }
}

// ---------------------------------------------------------------- 자동 업데이트
let updateState = { state: 'idle' };
let updater = { check() {}, install() {}, openDownload() {} };
function pushUpdate() {
  for (const w of [home, login, control]) if (w && !w.isDestroyed()) w.webContents.send('update', updateState);
  updateTray();
}
function installUpdate() {
  quitting = true;   // 창 닫기를 막지 않도록
  closeSocket();
  updater.install();
}
function startUpdater() {
  updater = createUpdater({
    releasesUrl: DEFAULTS.releasesUrl,
    onStatus: (st) => {
      const prev = updateState.state;
      updateState = { ...updateState, ...st };
      if (st.state === 'ready' && prev !== 'ready') {
        notify('업데이트 준비 완료 🔄', `새 버전(v${st.version})을 받았어요. 다음에 껐다 켜면 바뀌어요.`);
        // 업데이트가 꼭 필요한 상황이면 바로 설치
        if (updateState.required) setTimeout(installUpdate, 1500);
      }
      if (st.state === 'manual' && prev !== 'manual') notify('새 버전이 나왔어요', `v${st.version}을 받아 설치해 주세요.`);
      pushUpdate();
    },
  });
}

function notify(title, body) {
  try {
    if (!Notification.isSupported()) return;
    const n = new Notification({ title, body, silent: false });
    n.on('click', () => showHome());
    n.show();
  } catch {}
}
function requestSkin(username, v) {
  if (!username || !v) return;
  const have = skins.get(username);
  if (have && have.v === v) return;
  const key = username + ':' + v;
  if (Date.now() - (skinWanted.get(key) || 0) < 10_000) return;
  skinWanted.set(key, Date.now());
  wsSend({ type: 'skin-get', username });
}
// 그림이 아직 안 왔거나 예전 것이면 다시 요청 (요청이 막혔거나 끊겼을 때 대비)
function refreshSkins() {
  if (!session) return;
  requestSkin(session.user.username, session.user.skin?.v);
  for (const p of peers.values()) requestSkin(p.username, p.skin?.v);
}
setInterval(refreshSkins, 15_000).unref?.();
function pushSkins() {
  const obj = Object.fromEntries(skins);
  overlay?.webContents.send('skins', obj);
  for (const w of homes()) w.webContents.send('skins', obj);
  control?.webContents.send('skins', obj);
}

function peerList() { return [...peers.entries()].map(([id, p]) => ({ id, ...p })); }
function pushPeers() {
  // 🏢 회의장 사람들은 바탕화면에는 안 나오고 회의장 안에만 보여요
  overlay?.webContents.send('peers', room?.meeting ? [] : peerList());
  pushHome();
}
function homeState() {
  return {
    net: netState, session, room, myPeerId, peers: peerList(), self: selfProfile(), friends, knocks, invites: invites.filter((k) => Date.now() - k.at < 5 * 60_000), fishing: fishingView,
    view: { showAllPets: !!config.showAllPets },
  };
}
// 집 창 + 미니맵 (미니맵은 같은 집 화면을 작게 보여 줌)
function homes() { return [home, mini].filter((w) => w && !w.isDestroyed()); }
function pushHome() { const st = homeState(); for (const w of homes()) w.webContents.send('home-state', st); }
function addChat(entry) {
  chatLog.push({ ts: serverTime(), ...entry });
  if (chatLog.length > 200) chatLog.shift();
  for (const w of homes()) w.webContents.send('chat', chatLog[chatLog.length - 1]);
}

function joinRoom(code) {
  const c = String(code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(c)) { home?.webContents.send('toast', '데스크톱 코드는 영문/숫자 8자예요.'); return; }
  if (!session) { showLogin(); return; }
  wsSend({ type: 'join', code: c });
}
function leaveRoom() {
  if (!room) return;
  wsSend({ type: 'leave' });
  addChat({ system: true, text: `${room.isOwner ? '집을 비웠어요(방 닫힘)' : room.owner.nickname + '님의 집에서 나왔어요'}. 이제 혼자 돌아다녀요.` });
  room = null; myPeerId = null; peers.clear();
  pushPeers(); updateTray();
}
function logout() {
  wsSend({ type: 'logout', token });
  clearToken();
  session = null; room = null; wantRoom = null; peers.clear();
  setTimeout(closeSocket, 300);
  pushPeers(); setNet('offline'); onSelfChanged();
  home?.hide();
  updateWidgets();
  showLogin('로그아웃했어요.');
}
const MEET_CMD = /^\/(회의장|회의|자리빼기|자리)(\s|$)/;
function sendChat(text) {
  const t = String(text || '').trim().slice(0, 200);
  if (!t) return;
  // 🏢 회의장 명령: 말풍선 · 채팅으로 안 띄우고 서버에만 (방에 없어도 보냄)
  if (MEET_CMD.test(t)) {
    addChat({ system: true, text: `› ${t}` });
    if (ws && ws.readyState === WebSocket.OPEN) wsSend({ type: 'chat', text: t });
    else addChat({ system: true, text: '서버에 연결돼 있을 때만 쓸 수 있어요.' });
    return;
  }
  overlay?.webContents.send('chat', { id: 'me', text: t });
  addChat({ pid: 'me', from: config.nickname, username: session?.user.username, color: config.color, nameColor: config.nameColor, nameEffect: session?.user.nameEffect, text: t, mine: true });
  if (room) wsSend({ type: 'chat', text: t });
}
function sendEmote(kind, target = null) {
  overlay?.webContents.send('emote', { from: 'me', kind, target, fromName: config.nickname });
  for (const w of homes()) w.webContents.send('emote', { from: 'me', kind, target });
  if (!target && EMOTE_LABEL[kind]) {   // 💬 내가 보낸 이모티콘도 채팅 로그에 남김
    addChat({ pid: 'me', from: config.nickname, username: session?.user.username, color: config.color, nameColor: config.nameColor, nameEffect: session?.user.nameEffect, text: EMOTE_LABEL[kind], mine: true });
  }
  if (room && !room.meeting) wsSend({ type: 'emote', kind, target: target || undefined });   // 회의장에서는 이모트를 안 보냄
}

// ---------------------------------------------------------------- 캐릭터 우클릭 메뉴
const EMOTE_LABEL = { wave: '👋 안녕!', bye: '🚶 잘가!', zzz: '💤 잘자...', good: '👍 굿!', dislike: '👎 싫어...', heart: '💖 좋아!', cheer: '🎉 신난다!' };
const EMOTES = [['wave', '👋 안녕'], ['bye', '🚶 잘가'], ['zzz', '💤 잘자'], ['good', '👍 굿'], ['dislike', '👎 싫어'], ['heart', '💖 좋아'], ['cheer', '🎉 응원']];
const POSES = ['auto', 'stand', 'sit', 'lie'];
const THEME_MODES = ['system', 'light', 'dark', 'aurora', 'custom'];
const themePayload = () => ({ mode: THEME_MODES.includes(config.theme) ? config.theme : 'system', custom: { ...DEFAULT_CONFIG.themeCustom, ...(config.themeCustom || {}) } });
function setPose(v) {
  if (!POSES.includes(v)) return;
  config.pose = v; saveConfig();
  onSelfChanged();
}
function setStatus(s) {
  config.status = s; saveConfig();
  if (s === 'auto') pollActive();
  control?.webContents.send('config', config);
  onSelfChanged();
}
function snackMenu(id) {
  const foods = session?.user.food || {};
  const cat = session?.catalog.foods || {};
  const have = Object.keys(foods).filter((k) => cat[k] && foods[k] > 0);
  if (!have.length) return [{ label: '가방에 음식이 없어요 (상점 → 음식)', enabled: false }];
  return have.map((k) => ({ label: `${cat[k].icon} ${cat[k].name} ×${foods[k]}`, click: () => wsSend({ type: 'share-snack', target: id, food: k }) }));
}
function petMenu({ id }, win = overlay) {
  let template;
  if (id === 'me') {
    template = [
      { label: '🏠 집 열기', enabled: !!session, click: () => showHome() },
      { label: '💬 채팅', enabled: !!session, click: () => showHome(true) },
      { type: 'separator' },
      {
        label: '상태',
        submenu: [
          { label: '자동 감지', type: 'radio', checked: config.status === 'auto', click: () => setStatus('auto') },
          ...PRESETS.map((s) => ({ label: s, type: 'radio', checked: config.status === s, click: () => setStatus(s) })),
          { label: '표시 안 함', type: 'radio', checked: config.status === 'none', click: () => setStatus('none') },
        ],
      },
      {
        label: '자세',
        submenu: [['auto', '🐾 자유롭게 움직이기'], ['stand', '🧍 서 있기'], ['sit', '🪑 앉기'], ['lie', '🛏️ 눕기']]
          .map(([k, l]) => ({ label: l, type: 'radio', checked: (config.pose || 'auto') === k, click: () => setPose(k) })),
      },
      { label: '이모트', submenu: EMOTES.map(([k, l]) => ({ label: l, click: () => sendEmote(k) })) },
      { label: '🚪 방 나가기 (혼자 놀기)', enabled: !!room, click: () => leaveRoom() },
      { label: '설정', click: () => showControl() },
      { type: 'separator' },
      { label: '종료', click: () => app.quit() },
    ];
  } else {
    const p = peers.get(id);
    template = [
      { label: p ? `${p.nickname} (@${p.username})${p.status ? ' · ' + p.status : ''}` : '친구', enabled: false },
      { type: 'separator' },
      { label: '🍪 간식 나눠먹기', enabled: !!(room && p), submenu: snackMenu(id) },
      ...EMOTES.slice(0, 3).map(([k, l]) => ({ label: l + ' 보내기', click: () => sendEmote(k, id) })),
      { label: '💬 채팅하기', click: () => showHome(true) },
      ...(p && !friends.friends?.some((f) => f.username === p.username) && p.username !== session?.user.username
        ? [{ label: friends.outgoing?.some((f) => f.username === p.username) ? '👋 친구 신청 보냄' : '👋 친구 신청', enabled: !friends.outgoing?.some((f) => f.username === p.username), click: () => wsSend({ type: 'friend-add-peer', id }) }] : []),
      { label: '✉️ 개인 채팅', enabled: !!(p && friends.friends?.some((f) => f.username === p.username)), click: () => showHome(false, p.username) },
      { label: '🎮 미니게임 대결 신청', enabled: !!p, submenu: [['ttt', '⭕ 틱택토'], ['rps', '✊ 가위바위보'], ['basket', '🧺 바구니 받기']].map(([g, l]) => ({ label: l, click: () => wsSend({ type: 'mg-invite', game: g, to: p.username }) })) },
    ];
    if (room?.isOwner) template.push({ type: 'separator' }, { label: '내 방에서 내보내기', click: () => wsSend({ type: 'kick', id }) });
    if (p) template.push({ type: 'separator' }, { label: '🚫 차단하기', click: () => wsSend({ type: 'block', username: p.username }) });
  }
  Menu.buildFromTemplate(template).popup({ window: win && !win.isDestroyed() ? win : overlay });
}

// ---------------------------------------------------------------- 세션 타이머
// 타이머 하나에 단계를 여러 개 넣을 수 있어요 (예: 공부 50분 → 휴식 10분).
// 단계가 끝나면 다음 단계로, 마지막 단계가 끝나면 반복을 켰을 때 처음부터 다시 (times번까지, 0이면 계속).
// 시간 계산은 여기(메인)에서 해서, 창을 닫아도 계속 흘러가요.
const tid = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clampMin = (m, def = 25) => Math.min(600, Math.max(1, Math.round(Number(m) || def)));
const stepMs = (t) => Math.round(t.steps[t.step || 0].minutes * 60_000);
function normTimer(t) {
  // 예전 타이머(단계 없이 minutes만 있던 것)도 단계 1개짜리로
  if (!Array.isArray(t.steps) || !t.steps.length) t.steps = [{ name: t.name || '타이머', minutes: clampMin(t.minutes) }];
  t.step = Math.min(t.steps.length - 1, Math.max(0, t.step || 0));
  t.times = Math.max(0, Math.min(99, Math.round(Number(t.times) || 0)));
  t.round = t.round || 1;
  return t;
}
function timerView() {
  return {
    timers: config.timers.map((t) => {
      normTimer(t);
      const cur = t.steps[t.step];
      // minutes · stepName: 지금 단계 기준 (화면 고정 타이머가 진행 막대를 그릴 때 씀)
      return { ...t, steps: t.steps.map((s) => ({ ...s })), minutes: cur.minutes, stepName: cur.name, stepCount: t.steps.length };
    }),
    pin: !!config.timerPin, miniPin: !!config.miniPin, stickyPin: !!config.stickyPin, sound: config.timerSound !== false, now: Date.now(),
  };
}
function pushTimers() {
  const v = timerView();
  for (const w of [home, timerWin]) if (w && !w.isDestroyed()) w.webContents.send('timers', v);
}
function timerCmd(d) {
  if (!d || typeof d !== 'object') return;
  const t = config.timers.find((x) => x.id === d.id);
  switch (d.op) {
    case 'add': {
      if (config.timers.length >= 12) return;
      let steps = Array.isArray(d.steps) ? d.steps : [{ name: d.name, minutes: d.minutes }];
      steps = steps.slice(0, 8).map((s, i) => ({ name: String(s && s.name || '').trim().slice(0, 12) || `${i + 1}단계`, minutes: clampMin(s && s.minutes) }));
      if (!steps.length) return;
      const name = String(d.name || '').trim().slice(0, 20) || (steps.length > 1 ? steps.map((s) => s.name).join(' + ') : `${steps[0].minutes}분 타이머`);
      if (steps.length === 1 && !String(d.steps?.[0]?.name || '').trim()) steps[0].name = name;
      config.timers.push({ id: tid(), name, steps, step: 0, repeat: !!d.repeat, times: Math.max(0, Math.min(99, Math.round(Number(d.times) || 0))),
        state: 'idle', endsAt: 0, left: steps[0].minutes * 60_000, round: 1 });
      break;
    }
    case 'del': config.timers = config.timers.filter((x) => x.id !== d.id); break;
    case 'start':
      if (!t || t.state === 'running') return;
      normTimer(t);
      if (t.state === 'done' || t.state === 'idle') { t.step = 0; t.round = 1; t.left = stepMs(t); }
      t.state = 'running'; t.endsAt = Date.now() + t.left;
      break;
    case 'pause':
      if (!t || t.state !== 'running') return;
      t.left = Math.max(0, t.endsAt - Date.now()); t.state = 'paused';
      break;
    case 'reset':
      if (!t) return;
      normTimer(t);
      t.state = 'idle'; t.step = 0; t.round = 1; t.left = stepMs(t); t.endsAt = 0;
      break;
    case 'skip': {   // 지금 단계 건너뛰기 (다음 단계로)
      if (!t || (t.state !== 'running' && t.state !== 'paused')) return;
      advance(normTimer(t), Date.now(), true);
      break;
    }
    case 'update':
      if (!t) return;
      normTimer(t);
      if ('name' in d) t.name = String(d.name || '').trim().slice(0, 20) || t.name;
      if ('repeat' in d) t.repeat = !!d.repeat;
      if ('times' in d) t.times = Math.max(0, Math.min(99, Math.round(Number(d.times) || 0)));
      break;
    default: return;
  }
  saveConfig(); pushTimers(); updateWidgets();
}
function alarm(kind) { if (config.timerSound !== false) overlay?.webContents.send('alarm', { kind }); }
function say(text) { overlay?.webContents.send('chat', { id: 'me', text }); }
// 지금 단계가 끝났을 때: 다음 단계 → 다음 바퀴 → 끝
function advance(t, nowT, skipped) {
  const done = t.steps[t.step];
  if (t.step < t.steps.length - 1) {
    t.step += 1;
    const next = t.steps[t.step];
    t.endsAt = nowT + stepMs(t); t.left = stepMs(t);
    if (t.state === 'paused') t.state = 'running';
    if (!skipped) {
      notify(`⏰ ${t.name}`, `${done.name} 끝! 이제 ${next.name} ${next.minutes}분이에요.`);
      say(`⏰ ${done.name} 끝! 이제 ${next.name} ${next.minutes}분!`);
      alarm('round');
    }
    return;
  }
  const more = t.repeat && (!t.times || t.round < t.times);
  if (more) {
    t.round += 1; t.step = 0;
    t.endsAt = nowT + stepMs(t); t.left = stepMs(t);
    if (t.state === 'paused') t.state = 'running';
    if (!skipped) {
      const first = t.steps[0];
      notify(`⏰ ${t.name}`, `${t.round - 1}바퀴 끝! ${t.round}바퀴째 ${first.name} ${first.minutes}분 시작해요.`);
      say(`⏰ ${t.round - 1}바퀴 끝! 다시 ${first.name} 시작!`);
      alarm('round');
    }
    return;
  }
  t.state = 'done'; t.left = 0;
  if (!skipped) {
    notify(`⏰ ${t.name}`, t.repeat && t.times ? `${t.times}바퀴를 다 했어요! 수고했어요 🎉` : '시간이 다 됐어요! 수고했어요 🎉');
    say(`⏰ ${t.name} 끝! 수고했어요 🎉`);
    overlay?.webContents.send('emote', { from: 'me', kind: 'cheer' });
    alarm('done');
  }
}
function tickTimers() {
  updateWidgets();   // 창 이벤트를 놓쳐도 1초 안에 미니맵 · 타이머 창 상태를 맞춤
  const nowT = Date.now();
  let changed = false;
  for (const t of config.timers) {
    if (t.state !== 'running' || t.endsAt > nowT) continue;
    changed = true;
    advance(normTimer(t), nowT, false);
  }
  if (changed) { saveConfig(); pushTimers(); }
}

// ---------------------------------------------------------------- 화면 위 작은 창 (타이머 · 미니맵)
function loadStickies() {
  try { return JSON.parse(fs.readFileSync(userFile('stickies.json'), 'utf8')); } catch { return null; }
}
function setPin(which, on) {
  if (which === 'timer') config.timerPin = on; else if (which === 'sticky') config.stickyPin = on; else config.miniPin = on;
  saveConfig(); updateWidgets(); pushTimers(); updateTray();
}
function widgetWindow(file, opts, boundsKey, query) {
  const def = screen.getPrimaryDisplay().workArea;
  const b = config[boundsKey];
  const w = new BrowserWindow({
    width: opts.width, height: opts.height,
    x: b ? b.x : def.x + def.width - opts.width - 24, y: b ? b.y : def.y + opts.y,
    frame: false, resizable: !!opts.resizable, minWidth: opts.minWidth, minHeight: opts.minHeight,
    alwaysOnTop: true, skipTaskbar: true, maximizable: false, fullscreenable: false, show: false,
    transparent: !!opts.transparent, backgroundColor: opts.transparent ? '#00000000' : '#f6f1ea', hasShadow: !opts.transparent,
    title: opts.title, webPreferences: webPreferences(),
  });
  secure(w);
  w.setAlwaysOnTop(true, 'floating');
  if (process.platform === 'darwin') w.setVisibleOnAllWorkspaces(true);
  if (b && b.width && opts.resizable) w.setSize(Math.max(opts.minWidth || 100, b.width), Math.max(opts.minHeight || 100, b.height));
  w.loadFile(path.join(__dirname, file), query ? { query } : undefined);
  const remember = () => { if (!w.isDestroyed()) { config[boundsKey] = w.getBounds(); saveConfig(); } };
  w.on('moved', remember); w.on('resized', remember);
  w.on('close', (e) => { if (!quitting) { e.preventDefault(); w.hide(); } });
  return w;
}
function homeShowing() { return !!(home && !home.isDestroyed() && home.isVisible() && !home.isMinimized()); }
function updateWidgets() {
  // 타이머: 고정을 켜면 항상
  if (config.timerPin) {
    if (!timerWin || timerWin.isDestroyed()) {
      timerWin = widgetWindow('timer.html', { width: 270, height: 120, y: 80, transparent: true, title: 'Desktop Buddy 타이머' }, 'timerBounds');
      timerWin.webContents.on('did-finish-load', () => { pushTimers(); timerWin.showInactive(); });
    } else if (!timerWin.isVisible() && !timerWin.webContents.isLoading()) timerWin.showInactive();
  } else if (timerWin && !timerWin.isDestroyed() && timerWin.isVisible()) timerWin.hide();

  // 🗒 메모장: 켜 두면 항상 (로그인 안 해도 돼요)
  if (config.stickyPin) {
    if (!stickyWin || stickyWin.isDestroyed()) {
      stickyWin = widgetWindow('sticky.html', { width: 310, height: 420, y: 420, resizable: true, minWidth: 230, minHeight: 220, title: 'Desktop Buddy 메모장' }, 'stickyBounds');
      stickyWin.webContents.on('did-finish-load', () => stickyWin.showInactive());
    } else if (!stickyWin.isVisible() && !stickyWin.webContents.isLoading()) stickyWin.showInactive();
  } else if (stickyWin && !stickyWin.isDestroyed() && stickyWin.isVisible()) stickyWin.hide();

  // 미니맵: 고정을 켰고, 로그인했고, 집 창이 안 보일 때만
  const wantMini = !!(config.miniPin && session && !homeShowing());
  if (wantMini) {
    if (!mini || mini.isDestroyed()) {
      mini = widgetWindow('home.html', { width: 250, height: 282, y: 220, resizable: true, minWidth: 170, minHeight: 200, title: 'Desktop Buddy 미니맵' }, 'miniBounds', { mini: '1' });
      mini.webContents.on('did-finish-load', () => { pushHome(); pushSkins(); if (config.miniPin && !homeShowing()) mini.showInactive(); });
    } else if (!mini.isVisible() && !mini.webContents.isLoading()) { pushHome(); mini.showInactive(); }
  } else if (mini && !mini.isDestroyed() && mini.isVisible()) mini.hide();
}

// ---------------------------------------------------------------- IPC
function registerIpc() {
  // 오버레이
  ipcMain.on('set-ignore', (_e, v) => overlay?.setIgnoreMouseEvents(!!v, { forward: true }));
  // 바탕화면 캐릭터 화면에서 난 오류를 파일로 남김 (버그 찾을 때 씀)
  ipcMain.on('overlay-error', (_e, msg) => {
    try {
      const f = userFile('overlay-errors.log');
      if (fs.existsSync(f) && fs.statSync(f).size > 200_000) fs.renameSync(f, f + '.old');
      fs.appendFileSync(f, `[${new Date().toISOString()}] v${app.getVersion()}\n${String(msg).slice(0, 2000)}\n\n`);
    } catch {}
  });
  ipcMain.on('pet-menu', (_e, d) => petMenu(d || { id: 'me' }));
  ipcMain.on('char-menu', (_e, d) => { if (d && typeof d.id === 'string') petMenu({ id: d.id }, BrowserWindow.fromWebContents(_e.sender) || home); });
  ipcMain.on('open-home', () => showHome());
  ipcMain.on('fishing-view', (_e, on) => { if (fishingView !== !!on) { fishingView = !!on; pushHome(); } });
  // 타이머 · 미니맵
  ipcMain.handle('get-timers', () => timerView());
  ipcMain.on('timer-cmd', (_e, d) => timerCmd(d));
  ipcMain.on('timer-pin', (_e, on) => setPin('timer', !!on));
  ipcMain.on('mini-pin', (_e, on) => setPin('mini', !!on));
  // 🗒 메모장: 이 컴퓨터에만 저장 (stickies.json)
  ipcMain.on('sticky-pin', (_e, on) => setPin('sticky', !!on));
  ipcMain.handle('sticky-get', () => loadStickies());
  ipcMain.on('sticky-save', (e, data) => {
    const json = JSON.stringify(data || {});
    if (json.length > 400_000) return;
    try { fs.writeFileSync(userFile('stickies.json'), json); } catch {}
    for (const w of [stickyWin, home]) if (w && !w.isDestroyed() && w.webContents !== e.sender) w.webContents.send('sticky-data', data);
  });
  ipcMain.on('timer-sound', (_e, on) => { config.timerSound = !!on; saveConfig(); pushTimers(); });
  ipcMain.on('timer-test', () => overlay?.webContents.send('alarm', { kind: 'done' }));
  ipcMain.on('widget-size', (e, d) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win !== timerWin || !d) return;
    const [w] = win.getSize();
    win.setSize(w, Math.max(60, Math.min(600, Math.round(Number(d.h) || 100))));
  });
  ipcMain.on('widget-close', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win === timerWin) setPin('timer', false);
    if (win === mini) setPin('mini', false);
    if (win === stickyWin) setPin('sticky', false);
  });
  ipcMain.on('open-control', () => showHome());
  ipcMain.on('poke', (_e, { target }) => sendEmote('poke', target));
  // 🧍 집 캐릭터 위치: 같은 방 친구들에게 그대로 전달해서 모두의 화면에서 같은 자리로 보이게 (바탕화면 버디는 각자 따로 움직임)
  ipcMain.on('home-pos', (_e, pos) => { if (room) wsSend({ type: 'home-pos', ...pos }); });

  // 로그인
  ipcMain.on('auth', (_e, d) => {
    if (!d || !['login', 'register'].includes(d.mode)) return;
    const url = String(d.serverUrl || config.serverUrl).trim();
    const safety = serverSafety(url);
    if (!safety.ok) { loginError(safety.message); return; }
    config.serverUrl = url;
    config.autoStart = !!d.autoStart;
    saveConfig(); applyAutoStart();
    remember = d.remember !== false;
    pendingAuth = { mode: d.mode, username: String(d.username || ''), password: String(d.password || ''), nickname: String(d.nickname || '').slice(0, 16) };
    connect();
  });
  ipcMain.on('offline-mode', () => { login?.hide(); });

  // 설정 창
  ipcMain.handle('get-state', () => ({
    config, presets: PRESETS, self: selfProfile(), gwError, platform: process.platform,
    account: session ? { username: session.user.username, code: session.user.code } : null,
    blocked: friends.blocked || [],
  }));
  ipcMain.handle('list-windows', async () => {
    await pollWindows();
    const byOwner = new Map();
    for (const w of latestWindows) {
      if (!w.owner) continue;
      if (!byOwner.has(w.owner)) byOwner.set(w.owner, []);
      if (w.title) byOwner.get(w.owner).push(w.title);
    }
    return { gwError, apps: [...byOwner.entries()].map(([owner, titles]) => ({ owner, titles: titles.slice(0, 3) })) };
  });
  ipcMain.on('save-config', (_e, partial) => {
    const allowed = ['nickname', 'color', 'nameColor', 'serverUrl', 'status', 'customStatus', 'targets',
      'occlusion', 'hideOthers', 'petScale', 'statusRules', 'autoStart', 'species', 'showPetsDesktop', 'showAllPets'];
    for (const k of allowed) if (partial && k in partial) config[k] = partial[k];
    config.nickname = String(config.nickname || '나').slice(0, 16);
    if (config.nameColor && !/^#[0-9a-f]{6}$/i.test(config.nameColor)) config.nameColor = null;
    config.petScale = Math.min(8, Math.max(2, Number(config.petScale) || 3));
    if (!['cat', 'dog', 'rabbit'].includes(config.species)) config.species = 'cat';
    saveConfig();
    if (partial && 'autoStart' in partial) applyAutoStart();
    overlay?.webContents.send('config', publicConfig());
    pushHome();
    if (config.status === 'auto') pollActive();
    onSelfChanged();
    pollWindows();
  });
  ipcMain.on('logout', () => logout());

  // 집
  ipcMain.handle('get-chat', () => chatLog);
  ipcMain.on('join-room', (_e, code) => joinRoom(code));
  ipcMain.on('open-my-room', () => session && joinRoom(session.user.code));
  ipcMain.on('leave-room', () => leaveRoom());
  ipcMain.on('send-chat', (_e, t) => sendChat(t));
  // confirm/alert 뒤 입력칸 먹통 고치기: 창 포커스를 한 번 놓았다가 다시 잡아요
  ipcMain.on('refocus', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w || w.isDestroyed()) return;
    w.blur(); w.focus(); e.sender.focus();
  });
  ipcMain.on('emote', (_e, { kind, target }) => sendEmote(kind, target));
  ipcMain.on('buy', (_e, item) => wsSend({ type: 'buy', item: String(item) }));
  ipcMain.on('place', (_e, items) => wsSend({ type: 'place', items }));
  ipcMain.on('wall', (_e, d) => wsSend({ type: 'wall', item: String(d && d.item), floor: d && d.floor === 2 ? 2 : 1 }));
  ipcMain.on('light', (_e, v) => {   // true/false 또는 { on, floor: 1|2 } (층마다 따로)
    if (v && typeof v === 'object') wsSend({ type: 'light', on: !!v.on, ...(v.floor === 1 || v.floor === 2 ? { floor: v.floor } : {}) });
    else wsSend({ type: 'light', on: !!v });
  });
  ipcMain.on('gift', (_e, d) => wsSend({ type: 'gift', username: String(d && d.username), amount: Math.floor(Number(d && d.amount)) }));
  // 바탕화면 말풍선에 글자를 입력하는 동안만 오버레이가 키보드를 받음
  ipcMain.on('overlay-focus', (_e, on) => {
    if (!overlay) return;
    overlay.setFocusable(!!on);
    if (on) overlay.focus(); else overlay.blur();
  });
  ipcMain.handle('get-theme', () => themePayload());
  ipcMain.handle('yt-info', (_e, vid) => ytInfo(vid));
  // 게임 기능 요청은 정해진 종류만 서버로 전달
  const SRV_TYPES = new Set(['checkin', 'acc-equip', 'buy', 'feed', 'pet-out', 'pet-rename', 'pet-pat',
    'fish-cast', 'fish-reel', 'fish-sell', 'fish-gift', 'fish-view', 'trade-offer', 'trade-answer', 'trade-cancel',
    'tank-put', 'tank-take', 'tank-feed', 'aqua-put', 'aqua-take', 'aqua-view', 'block', 'unblock', 'password-change', 'username-change',
    'fish-here', 'share-snack', 'mg-invite', 'mg-answer', 'mg-move', 'mg-quit', 'rod-equip', 'pet-sell', 'pet-private',
    'board-get', 'board-add', 'board-del', 'board-clear', 'board-edit', 'board-style', 'dm-send', 'dm-get', 'dm-read', 'mail-get', 'mail-send', 'mail-reply', 'mail-read', 'mail-del', 'fish-sell-many', 'fish-show', 'invite-fof', 'friend-add-peer', 'notices-get', 'notice-post', 'notice-edit', 'notice-del', 'invite',
    'home-expand', 'music-get', 'music-add', 'music-request', 'music-answer', 'music-skip', 'music-remove', 'music-move', 'music-duration', 'music-error']);
  ipcMain.on('srv', (_e, m) => {
    if (!m || typeof m !== 'object' || !SRV_TYPES.has(m.type)) return;
    const json = JSON.stringify(m);
    if (json.length > (m.type === 'board-add' || m.type === 'board-edit' ? 90_000 : /^notice-(post|edit)$/.test(m.type) ? 16_000 : 4000)) return;   // 화이트보드 그림만 크게 허용
    wsSend(JSON.parse(json));
  });
  ipcMain.handle('get-update', () => ({ ...updateState, current: app.getVersion() }));
  ipcMain.on('update-install', () => { if (updateState.state === 'ready') installUpdate(); });
  ipcMain.on('update-open', () => updater.openDownload());
  ipcMain.on('update-check', () => updater.check());
  ipcMain.on('set-theme', (_e, t) => {
    const mode = typeof t === 'string' ? t : t && t.mode;
    if (!THEME_MODES.includes(mode)) return;
    config.theme = mode;
    if (t && typeof t === 'object' && t.custom) {
      const hex = (v, d) => (/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v) : d);
      const c = t.custom, d = DEFAULT_CONFIG.themeCustom;
      config.themeCustom = { bg: hex(c.bg, d.bg), card: hex(c.card, d.card), ink: hex(c.ink, d.ink), accent: hex(c.accent, d.accent), aurora: !!c.aurora, a1: hex(c.a1, d.a1), a2: hex(c.a2, d.a2), a3: hex(c.a3, d.a3) };
    }
    saveConfig();
    const p = themePayload();
    for (const w of [home, control, login, mini, timerWin, stickyWin]) if (w && !w.isDestroyed()) w.webContents.send('theme', p);
  });
  ipcMain.on('feed', (_e, food) => wsSend({ type: 'feed', food: String(food) }));
  ipcMain.on('pat', () => wsSend({ type: 'pat' }));
  ipcMain.on('lock', (_e, locked) => wsSend({ type: 'lock', locked: !!locked }));
  ipcMain.on('kick', (_e, id) => wsSend({ type: 'kick', id: String(id) }));
  ipcMain.on('open-settings', () => showControl());
  ipcMain.on('friend-add', (_e, q) => wsSend({ type: 'friend-add', query: String(q || '') }));
  ipcMain.on('friend-accept', (_e, u) => wsSend({ type: 'friend-accept', username: String(u) }));
  ipcMain.on('friend-decline', (_e, u) => wsSend({ type: 'friend-decline', username: String(u) }));
  ipcMain.on('friend-remove', (_e, u) => wsSend({ type: 'friend-remove', username: String(u) }));
  ipcMain.on('visit', (_e, u) => wsSend({ type: 'visit', username: String(u) }));
  ipcMain.on('knock', (_e, u) => wsSend({ type: 'knock', username: String(u) }));
  ipcMain.on('invite-answer', (_e, { username, accept }) => {
    const inv = invites.find((k) => k.username === username);
    invites = invites.filter((k) => k.username !== username);
    if (accept && inv?.via) { wsSend({ type: 'fof-accept', username: String(username) }); home?.webContents.send('toast', `${inv.nickname}님에게 들어가도 되는지 물어봤어요. 허락하면 바로 들어가요.`); }
    else if (accept) wsSend({ type: 'visit', username: String(username) });
    else wsSend({ type: 'invite-answer', username: String(username), accept: false });
    pushHome();
  });
  ipcMain.on('knock-answer', (_e, { username, accept }) => {
    knocks = knocks.filter((k) => k.username !== username);
    wsSend({ type: 'knock-answer', username: String(username), accept: !!accept });
    pushHome();
  });
  ipcMain.on('skin-set', (_e, d) => {
    if (!session) { control?.webContents.send('skin-saved', false); return; }
    if (d && d.reset) wsSend({ type: 'skin-set', reset: true });
    else if (d) wsSend({ type: 'skin-set', stand: d.stand, sit: d.sit, walk: d.walk, lie: d.lie || undefined, fall: d.fall || undefined, faces: d.faces });
  });
  ipcMain.handle('get-skins', () => Object.fromEntries(skins));
}

// ---------------------------------------------------------------- 시작
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => (session ? showHome() : showLogin()));

  app.whenReady().then(async () => {
    loadConfig();
    setupYoutube();
    if (process.platform === 'darwin' && app.dock) app.dock.hide();
    registerIpc();
    await loadGetWindows();
    createOverlay();
    createTray();
    applyAutoStart();
    startUpdater();

    globalShortcut.register('CommandOrControl+Shift+B', () => showHome(true));
    setInterval(pollWindows, process.platform === 'darwin' ? 700 : 250);
    setInterval(pollActive, 2000);
    pollActive();
    setInterval(tickTimers, 1000);
    updateWidgets();

    screen.on('display-metrics-changed', () => {
      if (!overlay) return;
      overlay.setBounds(displayInfo().bounds);
      sendInit();
    });

    token = loadToken();
    if (token) connect();   // 자동 로그인 (창은 띄우지 않음)
    else showLogin();
  });

  app.on('before-quit', () => { quitting = true; closeSocket(); });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', (e) => e.preventDefault());
}
