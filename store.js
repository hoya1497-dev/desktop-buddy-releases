// 아주 단순한 JSON 파일 저장소. 외부 DB 없이 돌아가도록.
// 사용자가 많아지면 SQLite/Postgres로 바꾸는 걸 권장.
const fs = require('fs');
const path = require('path');

class Store {
  constructor(file) {
    this.file = file;
    this.timer = null;
    this.data = { users: {}, names: {}, codes: {}, tokens: {}, events: { halloween: false, christmas: false, newyear: false } };
    try {
      this.data = { ...this.data, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch (e) {
      if (e.code !== 'ENOENT') {
        // 깨진 파일이면 덮어쓰지 않도록 멈춤
        console.error(`❌ 저장 파일을 읽지 못했어요: ${file}`);
        console.error(`   (${e.message}) 파일을 고치거나 백업으로 바꾼 뒤 다시 켜 주세요.`);
        process.exit(1);
      }
    }
  }
  save() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 3000);   // 사람이 많아도 너무 자주 쓰지 않게
  }
  flush() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data), { mode: 0o600 });
    fs.renameSync(tmp, this.file); // 저장 도중 꺼져도 파일이 깨지지 않게
  }
}

module.exports = { Store };
