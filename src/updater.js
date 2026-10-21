// 자동 업데이트: 설치된 앱이 켜질 때 GitHub의 새 버전을 확인
// - Windows: 몰래 받아 두었다가 다음에 껐다 켤 때(또는 "지금 다시 시작"을 누르면) 자동으로 바뀜
// - macOS: 애플 서명이 없으면 자동 설치가 안 돼서, 새 버전이 있다고 알려 주고 다운로드 페이지를 엶
const { app, shell } = require('electron');

function createUpdater({ releasesUrl, onStatus }) {
  const noop = { check() {}, install() {}, openDownload() { if (releasesUrl) shell.openExternal(releasesUrl); } };
  if (!app.isPackaged) return noop; // npm start 로 실행할 때는 업데이트 확인 안 함

  let autoUpdater;
  try { ({ autoUpdater } = require('electron-updater')); } catch { return noop; }

  const canInstall = process.platform === 'win32';
  autoUpdater.autoDownload = canInstall;
  autoUpdater.autoInstallOnAppQuit = canInstall;

  autoUpdater.on('update-available', (info) => onStatus({ state: canInstall ? 'downloading' : 'manual', version: info.version, percent: 0 }));
  autoUpdater.on('download-progress', (p) => onStatus({ state: 'downloading', percent: Math.round(p.percent || 0) }));
  autoUpdater.on('update-downloaded', (info) => onStatus({ state: 'ready', version: info.version }));
  autoUpdater.on('update-not-available', () => onStatus({ state: 'latest' }));
  autoUpdater.on('error', (e) => onStatus({ state: 'error', message: String((e && e.message) || e).slice(0, 200) }));

  const check = () => { autoUpdater.checkForUpdates().catch(() => {}); };
  setTimeout(check, 10_000);               // 켜고 10초 뒤
  setInterval(check, 6 * 3600 * 1000);     // 그 뒤로 6시간마다

  return {
    check,
    install: () => autoUpdater.quitAndInstall(true, true),
    openDownload: () => { if (releasesUrl) shell.openExternal(releasesUrl); },
  };
}

module.exports = { createUpdater };
