// 화면(렌더러)과 메인 프로세스 사이의 안전한 통로. 허용된 채널만 열어 둔다.
const { contextBridge, ipcRenderer } = require('electron');

const SEND = [
  // 오버레이
  'set-ignore', 'pet-menu', 'open-control', 'poke', 'overlay-error',
  // 로그인
  'auth', 'offline-mode',
  // 설정
  'save-config', 'logout', 'open-settings',
  // 집
  'join-room', 'open-my-room', 'leave-room', 'send-chat', 'emote',
  'buy', 'place', 'wall', 'feed', 'pat', 'lock', 'kick',
  'friend-add', 'friend-accept', 'friend-decline', 'friend-remove', 'visit', 'knock', 'knock-answer', 'invite-answer',
  'skin-set', 'light', 'gift', 'overlay-focus', 'set-theme',
  'update-install', 'update-open', 'update-check', 'srv',
  // 캐릭터 메뉴 · 타이머 · 미니맵
  'char-menu', 'open-home', 'timer-cmd', 'timer-pin', 'mini-pin', 'widget-size', 'widget-close', 'timer-sound', 'timer-test', 'fishing-view',
];
const INVOKE = ['get-state', 'list-windows', 'get-chat', 'get-skins', 'get-theme', 'get-update', 'get-timers', 'yt-info'];
const ON = [
  'init', 'config', 'self', 'windows', 'peers', 'chat', 'emote', 'summon',
  'login-state', 'login-error', 'account',
  'home-state', 'reward', 'toast', 'focus-chat', 'skins', 'skin-saved', 'theme', 'update', 'srv',
  'timers', 'snack', 'alarm', 'open-dm',
];

contextBridge.exposeInMainWorld('buddy', {
  send: (ch, data) => { if (SEND.includes(ch)) ipcRenderer.send(ch, data); },
  invoke: (ch, data) => (INVOKE.includes(ch) ? ipcRenderer.invoke(ch, data) : Promise.reject(new Error('blocked'))),
  on: (ch, fn) => { if (ON.includes(ch)) ipcRenderer.on(ch, (_e, d) => fn(d)); },
});
