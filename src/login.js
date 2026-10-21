(() => {
  const $ = (id) => document.getElementById(id);
  let mode = 'login';
  let busy = false;

  Sprites.drawPet($('hero').getContext('2d'), 0, 0, { scale: 3, color: '#f2a65a', legs: 'stand', eyes: 'happy' });

  function setMode(m) {
    mode = m;
    $('tabLogin').classList.toggle('on', m === 'login');
    $('tabRegister').classList.toggle('on', m === 'register');
    $('confirmWrap').hidden = m !== 'register';
    $('nickWrap').hidden = m !== 'register';
    $('regInfo').hidden = m !== 'register';
    $('submit').textContent = m === 'login' ? '로그인' : '가입하고 시작하기';
    $('password').autocomplete = m === 'login' ? 'current-password' : 'new-password';
    $('err').textContent = '';
  }
  $('tabLogin').onclick = () => setMode('login');
  $('tabRegister').onclick = () => setMode('register');

  function checkServer() {
    const v = $('serverUrl').value.trim();
    let warn = '';
    try {
      const u = new URL(v);
      if (u.protocol === 'ws:' && !/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) {
        warn = '⚠️ 암호화되지 않은 주소예요. 인터넷 서버라면 wss:// 를 써야 로그인돼요.';
      }
    } catch { warn = v ? '주소 형식이 올바르지 않아요.' : ''; }
    $('serverWarn').textContent = warn;
  }
  $('serverUrl').oninput = checkServer;

  $('form').onsubmit = (e) => {
    e.preventDefault();
    if (busy) return;
    const username = $('username').value.trim();
    const password = $('password').value;
    if (mode === 'register') {
      if (!/^[A-Za-z0-9_가-힣]{2,16}$/.test(username)) { $('err').textContent = '아이디는 한글/영문/숫자/_ 2~16자예요.'; return; }
      if (password.length < 8) { $('err').textContent = '비밀번호는 8자 이상으로 정해 주세요.'; return; }
      if (password !== $('confirm').value) { $('err').textContent = '비밀번호 확인이 달라요.'; return; }
    }
    busy = true;
    $('submit').disabled = true;
    $('err').textContent = '';
    $('submit').textContent = '연결 중…';
    buddy.send('auth', {
      mode, username, password, nickname: $('nickname').value.trim(),
      remember: $('remember').checked,
      autoStart: $('autoStart').checked,
      serverUrl: $('serverUrl').value.trim(),
    });
    // 이 창에서도 비밀번호를 바로 지움
    $('password').value = ''; $('confirm').value = '';
  };

  function reset() {
    busy = false;
    $('submit').disabled = false;
    setMode(mode);
  }
  buddy.on('login-error', (msg) => { reset(); $('err').textContent = msg; });
  buddy.on('login-state', ({ note, serverUrl, autoStart }) => {
    reset();
    $('note').textContent = note || '화면 위의 작은 친구';
    $('serverUrl').value = serverUrl || '';
    $('autoStart').checked = autoStart !== false;
    checkServer();
  });
  $('offline').onclick = () => buddy.send('offline-mode');
  function renderUpdate(u) {
    const note = $('updateNote'), b = $('updateBtn');
    note.hidden = true; b.hidden = true;
    if (!u) return;
    if (u.state === 'downloading') { note.hidden = false; note.textContent = `🔄 새 버전을 받는 중… ${u.percent || 0}%`; }
    if (u.state === 'ready') { note.hidden = false; note.textContent = `새 버전(v${u.version})이 준비됐어요.`; b.hidden = false; b.textContent = '업데이트하고 다시 시작'; b.onclick = () => buddy.send('update-install'); }
    if (u.state === 'manual') { note.hidden = false; note.textContent = `새 버전(v${u.version})이 나왔어요.`; b.hidden = false; b.textContent = '받으러 가기'; b.onclick = () => buddy.send('update-open'); }
  }
  buddy.on('update', renderUpdate);
  buddy.invoke('get-update').then(renderUpdate).catch(() => {});
})();
