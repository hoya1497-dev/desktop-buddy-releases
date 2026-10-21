// Desktop Buddy — Electron 메인 프로세스
// 오버레이(바탕화면 캐릭터) · 집 · 로그인 · 설정 창, 트레이, 창 목록, 자동 상태, 서버 연결

const {
  app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut, safeStorage, shell, Notification,
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
  serverUrl: DEFAULTS.serverUrl,
  status: 'auto',
  customStatus: '',
  targets: [],
  occlusion: true,
  hideOthers: false,
  petScale: 3,
  species: 'cat',
  theme: 'system',   // 'system' | 'light' | 'dark'
  autoStart: true,
  showPetsDesktop: true,   // 꺼내 둔 펫이 바탕화면에서도 캐릭터를 따라다님
  timers: [],              // 세션 타이머 [{ id, name, minutes, repeat, state, endsAt, left, round }]
  timerPin: false,         // 화면에 타이머 고정
  timerSound: true,        // 타이머가 끝나면 삐비빅 소리
  miniPin: false,          // 집 창을 닫으면 미니맵으로 보이기
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
let mini = null, timerWin = null;   // 미니맵 · 화면 고정 타이머
let quitting = false;

function secure(win) {
  // 외부 페이지로 이동하거나 새 창을 여는 것을 막음
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
}
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
function showHome(focusChat = false) {
  if (!session) { showLogin(); return; }
  if (!home || home.isDestroyed()) {
    home = makeWindow('home.html', { width: 1220, height: 720, minWidth: 720, minHeight: 560, title: `${BETA_TAG}🏠 Desktop Buddy 집` });
    for (const ev of ['show', 'hide', 'minimize', 'restore']) home.on(ev, () => setTimeout(updateWidgets, 50));
  }
  const go = () => { showWin(home); pushHome(); pushTimers(); if (focusChat) home.webContents.send('focus-chat'); updateWidgets(); };
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
    nickname: config.nickname, color: config.color, status: effectiveStatus(), species: config.species,
    username: session?.user.username || '', hungry: !!pet && pet.full < 30, sad: !!pet && pet.mood < 25,
    skin: session?.user.skin?.v ? session.user.skin : null,
    acc: session?.user.acc?.eq || {},
    pets: (session?.user.pets || []).filter((x) => x.out).map((x) => ({ id: x.id, kind: x.kind, name: x.name })),
  };
}
function publicConfig() {
  return { petScale: config.petScale, occlusion: config.occlusion, hideOthers: config.hideOthers, showPetsDesktop: config.showPetsDesktop !== false };
}
let lastSentProfile = '';
function onSelfChanged() {
  const p = selfProfile();
  overlay?.webContents.send('self', p);
  control?.webContents.send('self', p);
  const wire = { nickname: p.nickname, color: p.color, status: p.status, species: p.species };
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
let friends = { friends: [], incoming: [], outgoing: [] };
let knocks = [];             // 내 방 문을 두드린 친구들
const skins = new Map();     // username -> { v, faces, stand, sit, walk }
const skinWanted = new Set();

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
      config.nickname = m.user.nickname; config.color = m.user.color; config.species = m.user.species || config.species; saveConfig();
      lastSentProfile = '';
      setNet('online');
      onSelfChanged();
      if (login && !login.isDestroyed() && login.isVisible()) { login.hide(); showHome(); }
      // 로그인하면 기본으로 내 집에 있음(친구가 놀러 올 수 있게). 끊겼다 다시 붙으면 있던 방으로.
      wsSend({ type: 'join', code: wantRoom || m.user.code });
      wantRoom = null;
      requestSkin(m.user.username, m.user.skin?.v);
      updateWidgets();
      break;
    }
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
      session.user = m.user;
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
      room = { code: m.room, owner: m.owner, isOwner: m.isOwner, locked: m.locked, home: m.home };
      peers = new Map(m.peers.map((p) => [p.id, p.profile]));
      pushPeers();
      addChat({ system: true, text: m.isOwner ? '내 집에 있어요. 친구들이 놀러 올 수 있어요.' : `${m.owner.nickname}(@${m.owner.username})님의 집에 들어왔어요. (${peers.size + 1}명)` });
      updateTray();
      break;
    case 'left':
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
      if (m.popup) { notify('Desktop Buddy', m.message); overlay?.webContents.send('emote', { from: 'me', kind: 'gift' }); }
      break;
    case 'knock':
      knocks = knocks.filter((k) => k.username !== m.from.username).concat([{ ...m.from, at: Date.now() }]);
      pushHome();
      overlay?.webContents.send('chat', { id: 'me', text: `똑똑! ${m.from.nickname}(@${m.from.username})님이 문을 두드려요` });
      notify('똑똑! 🚪', `${m.from.nickname}(@${m.from.username})님이 문을 두드려요. 눌러서 열어 주세요.`);
      break;
    case 'knock-result':
      if (m.accept) {
        home?.webContents.send('toast', `${m.nickname}님이 문을 열어 줬어요!`);
        wsSend({ type: 'visit', username: m.username });
      } else home?.webContents.send('toast', `${m.nickname}님이 지금은 들어올 수 없대요.`);
      break;
    case 'skin':
      skins.set(m.username, { v: m.v, faces: m.faces, stand: m.stand, sit: m.sit, walk: m.walk });
      skinWanted.delete(m.username + ':' + m.v);
      pushSkins();
      break;
    case 'chat': {
      const p = peers.get(m.id);
      overlay?.webContents.send('chat', { id: m.id, text: m.text });
      addChat({ pid: m.id, from: p ? p.nickname : '?', username: p?.username, color: p?.color, text: m.text });
      break;
    }
    case 'emote':
      overlay?.webContents.send('emote', {
        from: m.id, kind: m.kind, target: m.target ? (m.target === myPeerId ? 'me' : m.target) : null,
        fromName: peers.get(m.id)?.nickname || '',
      });
      for (const w of homes()) w.webContents.send('emote', { from: m.id, kind: m.kind, target: m.target ? (m.target === myPeerId ? 'me' : m.target) : null });
      break;
    case 'fish-peer':   // 미니맵에도 같이 낚시하는 친구가 보이게
      for (const w of homes()) w.webContents.send('srv', m);
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
  if (skinWanted.has(key)) return;
  skinWanted.add(key);
  wsSend({ type: 'skin-get', username });
}
function pushSkins() {
  const obj = Object.fromEntries(skins);
  overlay?.webContents.send('skins', obj);
  for (const w of homes()) w.webContents.send('skins', obj);
  control?.webContents.send('skins', obj);
}

function peerList() { return [...peers.entries()].map(([id, p]) => ({ id, ...p })); }
function pushPeers() {
  overlay?.webContents.send('peers', peerList());
  pushHome();
}
function homeState() {
  return {
    net: netState, session, room, myPeerId, peers: peerList(), self: selfProfile(), friends, knocks, fishing: fishingView,
  };
}
// 집 창 + 미니맵 (미니맵은 같은 집 화면을 작게 보여 줌)
function homes() { return [home, mini].filter((w) => w && !w.isDestroyed()); }
function pushHome() { const st = homeState(); for (const w of homes()) w.webContents.send('home-state', st); }
function addChat(entry) {
  chatLog.push({ ts: Date.now(), ...entry });
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
function sendChat(text) {
  const t = String(text || '').trim().slice(0, 200);
  if (!t) return;
  overlay?.webContents.send('chat', { id: 'me', text: t });
  addChat({ pid: 'me', from: config.nickname, username: session?.user.username, color: config.color, text: t, mine: true });
  if (room) wsSend({ type: 'chat', text: t });
}
function sendEmote(kind, target = null) {
  overlay?.webContents.send('emote', { from: 'me', kind, target, fromName: config.nickname });
  for (const w of homes()) w.webContents.send('emote', { from: 'me', kind, target });
  if (room) wsSend({ type: 'emote', kind, target: target || undefined });
}

// ---------------------------------------------------------------- 캐릭터 우클릭 메뉴
const EMOTES = [['wave', '👋 손 흔들기'], ['heart', '💖 하트'], ['cheer', '🎉 응원'], ['zzz', '💤 졸려요']];
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
      { label: '🎮 미니게임 대결 신청', enabled: !!p, submenu: [['ttt', '⭕ 틱택토'], ['rps', '✊ 가위바위보'], ['basket', '🧺 바구니 받기']].map(([g, l]) => ({ label: l, click: () => wsSend({ type: 'mg-invite', game: g, to: p.username }) })) },
    ];
    if (room?.isOwner) template.push({ type: 'separator' }, { label: '내 방에서 내보내기', click: () => wsSend({ type: 'kick', id }) });
    if (p) template.push({ type: 'separator' }, { label: '🚫 차단하기', click: () => wsSend({ type: 'block', username: p.username }) });
  }
  Menu.buildFromTemplate(template).popup({ window: win && !win.isDestroyed() ? win : overlay });
}

// ---------------------------------------------------------------- 세션 타이머
// 이름 붙인 타이머를 여러 개 만들 수 있고, 반복하면 끝날 때마다 다음 회차를 바로 시작해요.
// 시간 계산은 여기(메인)에서 해서, 창을 닫아도 계속 흘러가요.
const tid = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function timerView() {
  return { timers: config.timers.map((t) => ({ ...t })), pin: !!config.timerPin, miniPin: !!config.miniPin, sound: config.timerSound !== false, now: Date.now() };
}
function pushTimers() {
  const v = timerView();
  for (const w of [home, timerWin]) if (w && !w.isDestroyed()) w.webContents.send('timers', v);
}
function timerCmd(d) {
  if (!d || typeof d !== 'object') return;
  const t = config.timers.find((x) => x.id === d.id);
  const ms = (x) => Math.round(x.minutes * 60_000);
  switch (d.op) {
    case 'add': {
      if (config.timers.length >= 12) return;
      const minutes = Math.min(600, Math.max(1, Math.round(Number(d.minutes) || 25)));
      const name = String(d.name || '').trim().slice(0, 20) || `${minutes}분 타이머`;
      config.timers.push({ id: tid(), name, minutes, repeat: !!d.repeat, state: 'idle', endsAt: 0, left: minutes * 60_000, round: 1 });
      break;
    }
    case 'del': config.timers = config.timers.filter((x) => x.id !== d.id); break;
    case 'start':
      if (!t || t.state === 'running') return;
      if (t.state === 'done' || t.state === 'idle') { t.left = ms(t); if (t.state === 'done') t.round = 1; }
      t.state = 'running'; t.endsAt = Date.now() + t.left;
      break;
    case 'pause':
      if (!t || t.state !== 'running') return;
      t.left = Math.max(0, t.endsAt - Date.now()); t.state = 'paused';
      break;
    case 'reset':
      if (!t) return;
      t.state = 'idle'; t.left = ms(t); t.round = 1; t.endsAt = 0;
      break;
    case 'update':
      if (!t) return;
      if ('name' in d) t.name = String(d.name || '').trim().slice(0, 20) || t.name;
      if ('repeat' in d) t.repeat = !!d.repeat;
      if ('minutes' in d) {
        t.minutes = Math.min(600, Math.max(1, Math.round(Number(d.minutes) || t.minutes)));
        if (t.state === 'idle' || t.state === 'done') t.left = ms(t);
      }
      break;
    default: return;
  }
  saveConfig(); pushTimers(); updateWidgets();
}
function alarm(kind) { if (config.timerSound !== false) overlay?.webContents.send('alarm', { kind }); }
function tickTimers() {
  const nowT = Date.now();
  let changed = false;
  for (const t of config.timers) {
    if (t.state !== 'running' || t.endsAt > nowT) continue;
    changed = true;
    if (t.repeat) {
      t.round = (t.round || 1) + 1;
      t.endsAt = nowT + Math.round(t.minutes * 60_000);
      notify(`⏰ ${t.name}`, `${t.round - 1}번째가 끝났어요! 바로 ${t.round}번째를 시작해요.`);
      alarm('round');
      overlay?.webContents.send('chat', { id: 'me', text: `⏰ ${t.name} ${t.round - 1}번째 끝! 계속 가 보자!` });
    } else {
      t.state = 'done'; t.left = 0;
      notify(`⏰ ${t.name}`, '시간이 다 됐어요! 수고했어요 🎉');
      alarm('done');
      overlay?.webContents.send('chat', { id: 'me', text: `⏰ ${t.name} 끝! 수고했어요 🎉` });
      overlay?.webContents.send('emote', { from: 'me', kind: 'cheer' });
    }
  }
  if (changed) { saveConfig(); pushTimers(); }
}

// ---------------------------------------------------------------- 화면 위 작은 창 (타이머 · 미니맵)
function setPin(which, on) {
  if (which === 'timer') config.timerPin = on; else config.miniPin = on;
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
  ipcMain.on('pet-menu', (_e, d) => petMenu(d || { id: 'me' }));
  ipcMain.on('char-menu', (_e, d) => { if (d && typeof d.id === 'string' && d.id !== 'me') petMenu({ id: d.id }, home); });
  ipcMain.on('open-home', () => showHome());
  ipcMain.on('fishing-view', (_e, on) => { if (fishingView !== !!on) { fishingView = !!on; pushHome(); } });
  // 타이머 · 미니맵
  ipcMain.handle('get-timers', () => timerView());
  ipcMain.on('timer-cmd', (_e, d) => timerCmd(d));
  ipcMain.on('timer-pin', (_e, on) => setPin('timer', !!on));
  ipcMain.on('mini-pin', (_e, on) => setPin('mini', !!on));
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
  });
  ipcMain.on('open-control', () => showHome());
  ipcMain.on('poke', (_e, { target }) => sendEmote('poke', target));

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
    const allowed = ['nickname', 'color', 'serverUrl', 'status', 'customStatus', 'targets',
      'occlusion', 'hideOthers', 'petScale', 'statusRules', 'autoStart', 'species', 'showPetsDesktop'];
    for (const k of allowed) if (partial && k in partial) config[k] = partial[k];
    config.nickname = String(config.nickname || '나').slice(0, 16);
    config.petScale = Math.min(8, Math.max(2, Number(config.petScale) || 3));
    if (!['cat', 'dog', 'rabbit'].includes(config.species)) config.species = 'cat';
    saveConfig();
    if (partial && 'autoStart' in partial) applyAutoStart();
    overlay?.webContents.send('config', publicConfig());
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
  ipcMain.on('emote', (_e, { kind, target }) => sendEmote(kind, target));
  ipcMain.on('buy', (_e, item) => wsSend({ type: 'buy', item: String(item) }));
  ipcMain.on('place', (_e, items) => wsSend({ type: 'place', items }));
  ipcMain.on('wall', (_e, d) => wsSend({ type: 'wall', item: String(d && d.item), floor: d && d.floor === 2 ? 2 : 1 }));
  ipcMain.on('light', (_e, on) => wsSend({ type: 'light', on: !!on }));
  ipcMain.on('gift', (_e, d) => wsSend({ type: 'gift', username: String(d && d.username), amount: Math.floor(Number(d && d.amount)) }));
  // 바탕화면 말풍선에 글자를 입력하는 동안만 오버레이가 키보드를 받음
  ipcMain.on('overlay-focus', (_e, on) => {
    if (!overlay) return;
    overlay.setFocusable(!!on);
    if (on) overlay.focus(); else overlay.blur();
  });
  ipcMain.handle('get-theme', () => config.theme);
  // 게임 기능 요청은 정해진 종류만 서버로 전달
  const SRV_TYPES = new Set(['checkin', 'acc-equip', 'buy', 'feed', 'pet-out', 'pet-rename', 'pet-pat',
    'fish-cast', 'fish-reel', 'fish-sell', 'fish-gift', 'fish-view', 'trade-offer', 'trade-answer', 'trade-cancel',
    'tank-put', 'tank-take', 'tank-feed', 'aqua-put', 'aqua-take', 'aqua-view', 'block', 'unblock', 'password-change',
    'fish-here', 'share-snack', 'mg-invite', 'mg-answer', 'mg-move', 'mg-quit']);
  ipcMain.on('srv', (_e, m) => {
    if (!m || typeof m !== 'object' || !SRV_TYPES.has(m.type)) return;
    const json = JSON.stringify(m);
    if (json.length > 4000) return;
    wsSend(JSON.parse(json));
  });
  ipcMain.handle('get-update', () => ({ ...updateState, current: app.getVersion() }));
  ipcMain.on('update-install', () => { if (updateState.state === 'ready') installUpdate(); });
  ipcMain.on('update-open', () => updater.openDownload());
  ipcMain.on('update-check', () => updater.check());
  ipcMain.on('set-theme', (_e, t) => {
    if (!['system', 'light', 'dark'].includes(t)) return;
    config.theme = t; saveConfig();
    for (const w of [home, control, login, mini, timerWin]) if (w && !w.isDestroyed()) w.webContents.send('theme', t);
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
  ipcMain.on('knock-answer', (_e, { username, accept }) => {
    knocks = knocks.filter((k) => k.username !== username);
    wsSend({ type: 'knock-answer', username: String(username), accept: !!accept });
    pushHome();
  });
  ipcMain.on('skin-set', (_e, d) => {
    if (!session) { control?.webContents.send('skin-saved', false); return; }
    if (d && d.reset) wsSend({ type: 'skin-set', reset: true });
    else if (d) wsSend({ type: 'skin-set', stand: d.stand, sit: d.sit, walk: d.walk, faces: d.faces });
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
