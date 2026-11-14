// 게임 데이터: 상점 · 음식 · 펫 · 액세서리 · 물고기 · 보상 수치.
// 가격과 확률은 서버만 결정한다(앱이 보내는 값은 믿지 않음). 숫자를 바꾸려면 여기만 고치면 돼요.
// free: 기본 제공 / required: 방에서 뺄 수 없음 / scale: 도트 한 칸 크기(px) / wall: 벽에 거는 물건 / tank: 어항

// ---------------------------------------------------------------- 물고기 (도감)
// cat: T 쓰레기 · S 작은 · M 중간 · L 큰 / rar: C 일반 · U 고급 · R 희귀 · E 영웅 · L 전설 · X 신비
// size: [최소, 최대] cm / art: 앱이 도트 그림을 만드는 재료 (모양 · 색1 · 색2 · 무늬)
const F = (code, name, cat, rar, size, art, extra = {}) => ({ code, name, cat, rar, size, art, ...extra });
const FISH_LIST = [
  // 쓰레기 7
  F('01', '버려진 캔',     'T', 'C', null, { shape: 'can' }),
  F('02', '낡은 타이어',   'T', 'U', null, { shape: 'tire' }),
  F('03', '찢어진 장화',   'T', 'C', null, { shape: 'boot' }),
  F('04', '빈 병',         'T', 'C', null, { shape: 'bottle' }),
  F('05', '비닐봉지',      'T', 'C', null, { shape: 'bag' }),
  F('06', '젖은 신문',     'T', 'C', null, { shape: 'paper' }),
  F('07', '부러진 우산',   'T', 'U', null, { shape: 'umbrella' }),
  // 작은 물고기 16
  F('08', '송사리',        'S', 'C', [2, 4],     { shape: 'fish', c1: '#b9c4a8', c2: '#e8ecd8', pat: 'belly' }),
  F('09', '피라미',        'S', 'C', [8, 15],    { shape: 'fish', c1: '#9fb6c8', c2: '#e4708a', pat: 'stripe' }),
  F('10', '멸치',          'S', 'C', [5, 12],    { shape: 'long', c1: '#a9b8c6', c2: '#e9eef2', pat: 'belly' }),
  F('11', '정어리',        'S', 'C', [10, 20],   { shape: 'fish', c1: '#5f7f9c', c2: '#dfe7ee', pat: 'spot' }),
  F('12', '금붕어',        'S', 'C', [5, 15],    { shape: 'fancy', c1: '#f08a3c', c2: '#ffd2a0', pat: 'none' }),
  F('13', '구피',          'S', 'U', [3, 6],     { shape: 'fancy', c1: '#5fb0e8', c2: '#f46fb0', pat: 'spot' }),
  F('14', '네온테트라',    'S', 'U', [2, 4],     { shape: 'fish', c1: '#2f6fd8', c2: '#e8443a', pat: 'stripe' }),
  F('15', '베타',          'S', 'U', [5, 7],     { shape: 'fancy', c1: '#c0283e', c2: '#6a2bd8', pat: 'none' }),
  F('16', '흰동가리',      'S', 'R', [6, 11],    { shape: 'fish', c1: '#f07a20', c2: '#ffffff', pat: 'band' }),
  F('17', '블루탱',        'S', 'R', [15, 30],   { shape: 'flat', c1: '#2a6fe0', c2: '#f4d23c', pat: 'band' }),
  F('18', '엔젤피시',      'S', 'U', [10, 15],   { shape: 'flat', c1: '#e8e4d8', c2: '#3a3a3a', pat: 'stripe' }),
  F('19', '만다린피시',    'S', 'E', [5, 7],     { shape: 'fish', c1: '#2aa0c8', c2: '#f08a20', pat: 'spot' }),
  F('20', '해마',          'S', 'R', [5, 20],    { shape: 'seahorse', c1: '#f2b84c', c2: '#d98c2a' }),
  F('21', '복어',          'S', 'U', [10, 30],   { shape: 'puffer', c1: '#d8c068', c2: '#f4ecc8', pat: 'spot' }),
  F('22', '새우',          'S', 'C', [5, 15],    { shape: 'shrimp', c1: '#f08070', c2: '#f8c0b0' }),
  F('23', '소라게',        'S', 'U', [3, 8],     { shape: 'crab', c1: '#e05a3a', c2: '#e8d0a8' }),
  // 중간 물고기 12
  F('24', '붕어',          'M', 'C', [15, 35],   { shape: 'fish', c1: '#8a8a4a', c2: '#d8d0a0', pat: 'belly' }),
  F('25', '잉어',          'M', 'U', [30, 80],   { shape: 'fish', c1: '#f0f0f0', c2: '#e04030', pat: 'spot' }),
  F('26', '메기',          'M', 'U', [40, 100],  { shape: 'catfish', c1: '#5a5040', c2: '#a89878' }),
  F('27', '송어',          'M', 'U', [30, 70],   { shape: 'long', c1: '#7a9a6a', c2: '#e88a8a', pat: 'spot' }),
  F('28', '연어',          'M', 'R', [50, 100],  { shape: 'long', c1: '#8090a8', c2: '#f49a7a', pat: 'belly' }),
  F('29', '고등어',        'M', 'C', [25, 45],   { shape: 'long', c1: '#3a7a8a', c2: '#e8eef0', pat: 'stripe' }),
  F('30', '도미',          'M', 'U', [30, 60],   { shape: 'flat', c1: '#e86a7a', c2: '#ffd8e0', pat: 'belly' }),
  F('31', '광어',          'M', 'U', [40, 80],   { shape: 'flatfish', c1: '#8a7a5a', c2: '#c8b890', pat: 'spot' }),
  F('32', '갈치',          'M', 'R', [60, 150],  { shape: 'eel', c1: '#d8e0e8', c2: '#ffffff' }),
  F('33', '오징어',        'M', 'U', [20, 40],   { shape: 'squid', c1: '#f0d8d0', c2: '#e0a090' }),
  F('34', '문어',          'M', 'R', [40, 100],  { shape: 'octopus', c1: '#d0584a', c2: '#f0a090' }),
  F('35', '아로와나',      'M', 'E', [60, 90],   { shape: 'long', c1: '#d8b040', c2: '#f8e8a0', pat: 'spot' }),
  // 큰 물고기 21 (고래 · 상어 포함)
  F('36', '참치',          'L', 'R', [100, 300], { shape: 'tuna', c1: '#2a4a7a', c2: '#d8e0e8', pat: 'belly' }),
  F('37', '청새치',        'L', 'E', [200, 400], { shape: 'swordfish', c1: '#2a5aa0', c2: '#d0e0f0', pat: 'stripe' }),
  F('38', '황새치',        'L', 'E', [150, 450], { shape: 'swordfish', c1: '#5a4a6a', c2: '#d8d0e0', pat: 'belly' }),
  F('39', '개복치',        'L', 'E', [150, 330], { shape: 'sunfish', c1: '#9aa8b8', c2: '#e0e6ec' }),
  F('40', '가오리',        'L', 'R', [80, 200],  { shape: 'ray', c1: '#8a7a6a', c2: '#e0d8d0' }),
  F('41', '만타가오리',    'L', 'E', [300, 700], { shape: 'ray', c1: '#2a2a3a', c2: '#f0f0f0' }),
  F('42', '곰치',          'L', 'R', [100, 250], { shape: 'eel', c1: '#6a7a3a', c2: '#c8d070', pat: 'spot' }),
  F('43', '철갑상어',      'L', 'E', [100, 350], { shape: 'shark', c1: '#6a6a5a', c2: '#c8c0a8', pat: 'spot' }),
  F('44', '피라루쿠',      'L', 'E', [150, 300], { shape: 'long', c1: '#5a6a5a', c2: '#d0503a', pat: 'belly' }),
  F('45', '바다거북',      'L', 'R', [70, 150],  { shape: 'turtle', c1: '#5a8a4a', c2: '#a8783a' }),
  F('46', '실러캔스',      'L', 'L', [150, 200], { shape: 'fish', c1: '#2a3a6a', c2: '#e8e8f0', pat: 'spot' }),
  F('47', '대왕오징어',    'L', 'L', [500, 1300],{ shape: 'squid', c1: '#c04a3a', c2: '#f0a080' }),
  F('48', '돌고래',        'L', 'R', [200, 400], { shape: 'dolphin', c1: '#7a9ab8', c2: '#e8f0f8' }),
  F('49', '일각고래',      'L', 'L', [400, 550], { shape: 'narwhal', c1: '#a8b0b8', c2: '#e8ecf0', pat: 'spot' }),
  F('50', '범고래',        'L', 'E', [600, 900], { shape: 'orca', c1: '#1e1e26', c2: '#ffffff' }),
  F('51', '귀상어',        'L', 'E', [300, 600], { shape: 'hammer', c1: '#7a8a98', c2: '#e0e6ec' }),
  F('52', '백상아리',      'L', 'L', [400, 650], { shape: 'shark', c1: '#6a7a8a', c2: '#f0f2f4', pat: 'belly' }),
  F('53', '고래상어',      'L', 'L', [800, 1800],{ shape: 'shark', c1: '#3a5a7a', c2: '#f0f0f0', pat: 'spot' }),
  F('54', '혹등고래',      'L', 'L', [1200, 1600],{ shape: 'whale', c1: '#3a4a5a', c2: '#d8dde2' }),
  F('55', '향유고래',      'L', 'L', [1100, 1800],{ shape: 'sperm', c1: '#4a4a52', c2: '#9a9aa2' }),
  F('56', '대왕고래',      'L', 'L', [2000, 3000],{ shape: 'whale', c1: '#5a7a9a', c2: '#c8d4e0' }, { weight: 0.5 }),
  // 🔮 신비 등급 10 (특이한 바다 생물) — 전설만큼 귀하고, 좋은 낚싯대일수록 잘 걸려요
  F('57', '블롭피쉬',      'M', 'X', [25, 35],   { shape: 'blob', c1: '#f2b2b8', c2: '#e88a98' }),
  F('58', '바다의 천사',   'S', 'X', [1, 3],     { shape: 'clione', c1: '#e6f6ff', c2: '#ff7a3c' }),
  F('59', '크라켄',        'L', 'X', [1500, 3000],{ shape: 'kraken', c1: '#5a2e6e', c2: '#d8a0e8' }, { weight: 0.3 }),
  F('60', '산갈치',        'L', 'X', [300, 800], { shape: 'oarfish', c1: '#c8d0dc', c2: '#e0463a' }),
  F('61', '초롱아귀',      'M', 'X', [20, 100],  { shape: 'angler', c1: '#3a3448', c2: '#ffe76a' }),
  F('62', '배럴아이',      'M', 'X', [10, 15],   { shape: 'barreleye', c1: '#2e3a48', c2: '#5af07a' }),
  F('63', '덤보문어',      'S', 'X', [20, 30],   { shape: 'dumbo', c1: '#f4a98a', c2: '#ffcf9e' }),
  F('64', '나뭇잎해룡',    'S', 'X', [20, 35],   { shape: 'leafy', c1: '#d8a83a', c2: '#9ac84a' }),
  F('65', '우파루파',      'S', 'X', [15, 25],   { shape: 'axolotl', c1: '#ffc4d6', c2: '#ff5f96' }),
  F('66', '네시',          'L', 'X', [800, 1500],{ shape: 'nessie', c1: '#3f7a5a', c2: '#8fc89a' }, { weight: 0.3 }),
];
// ---------------------------------------------------------------- 낚싯대
// luck: 등급별로 뽑힐 무게에 곱하는 값 (T 쓰레기, N 꽝). 전설(L)은 '전설 1종당 확률'이
// 2번 0.07% · 3번 0.1% · 4번 0.2% · 5번 0.28% · 6번 0.38% · 7번 0.5%가 되도록 맞춘 값
const RODS = {
  rod1: { code: 'R1', name: '대나무 낚싯대', price: 0,     color: '#c9a45c', luck: { T: 1,    N: 1,   C: 1, U: 1,    R: 1,   E: 1,    L: 1 } },
  rod2: { code: 'R2', name: '나무 낚싯대',   price: 800,   color: '#8b5a3c', luck: { T: 0.85, N: 0.9, C: 1, U: 1.05, R: 1.1, E: 1.15, L: 1.24 } },
  rod3: { code: 'R3', name: '강철 낚싯대',   price: 2500,  color: '#9aa0a6', luck: { T: 0.7,  N: 0.8, C: 1, U: 1.1,  R: 1.2, E: 1.3,  L: 1.71 } },
  rod4: { code: 'R4', name: '카본 낚싯대',   price: 6000,  color: '#2a2a32', luck: { T: 0.6,  N: 0.7, C: 1, U: 1.15, R: 1.3, E: 1.6,  L: 3.36 } },
  rod5: { code: 'R5', name: '은빛 낚싯대',   price: 12000, color: '#d7dbe0', luck: { T: 0.5,  N: 0.6, C: 1, U: 1.2,  R: 1.4, E: 1.9,  L: 4.62 } },
  rod6: { code: 'R6', name: '황금 낚싯대',   price: 25000, color: '#f4cf4f', luck: { T: 0.4,  N: 0.5, C: 1, U: 1.25, R: 1.5, E: 2.2,  L: 6.17 } },
  rod7: { code: 'R7', name: '전설의 낚싯대', price: 50000, color: '#e8894a', luck: { T: 0.3,  N: 0.4, C: 1, U: 1.3,  R: 1.6, E: 2.5,  L: 8.01 } },
  // 운영자 전용: 상점엔 ??? 로만 보이고 살 수 없음. 관리자 rod 명령으로만 (전설 1종당 0.6%)
  rod8: { code: 'R8', name: '운영자 낚싯대', price: null, secret: true, color: '#b04ae0', luck: { T: 0.25, N: 0.35, C: 1, U: 1.35, R: 1.7, E: 2.8, L: 9.71 } },
};

// 등급별 뽑힐 무게(클수록 잘 나옴)와 판매 가격
const RARITY = {
  C: { name: '일반', color: '#9aa0a6', weight: 100, price: 1 },
  U: { name: '고급', color: '#4caf50', weight: 45,  price: 3 },
  R: { name: '희귀', color: '#2f7ae5', weight: 14,  price: 12 },
  E: { name: '영웅', color: '#9b4de0', weight: 4,   price: 40 },
  L: { name: '전설', color: '#f0a020', weight: 1.5, price: 150 },   // 낚시 무제한이 돼서 파는 값을 낮춤
  X: { name: '신비', color: '#e04ab0', weight: 0.8, price: 220 },   // 특이한 바다 생물 (낚싯대 운은 전설과 같게)
};
const NOTHING_WEIGHT = 450; // 꽝
const fish = {};
for (const f of FISH_LIST) {
  const r = RARITY[f.rar];
  f.weight = f.weight ?? r.weight * (f.cat === 'T' ? 1.3 : 1);
  f.price = f.cat === 'T' ? 1 : Math.round(r.price * (f.cat === 'L' ? 1.5 : f.cat === 'M' ? 1.2 : 1));
  fish[f.code] = f;
}
const totalWeight = NOTHING_WEIGHT + FISH_LIST.reduce((s, f) => s + f.weight, 0);
for (const f of FISH_LIST) f.chance = +(f.weight / totalWeight * 100).toFixed(3); // 한 번 던질 때 나올 확률(%) — 기본 낚싯대
// 낚싯대마다 물고기별 확률(%)과 꽝 확률을 미리 계산 (앱 도감에도 보여 줌)
const rodWeight = (rod, f) => f.weight * (f.cat === 'T' ? rod.luck.T : (rod.luck[f.rar] ?? rod.luck.L));
for (const rod of Object.values(RODS)) {
  const tot = NOTHING_WEIGHT * rod.luck.N + FISH_LIST.reduce((s, f) => s + rodWeight(rod, f), 0);
  rod.chance = Object.fromEntries(FISH_LIST.map((f) => [f.code, +(rodWeight(rod, f) / tot * 100).toFixed(3)]));
  rod.nothing = +(NOTHING_WEIGHT * rod.luck.N / tot * 100).toFixed(2);
  rod.legend = rod.chance['46'];   // 전설 1종당 확률 (대표값)
}

module.exports = {
  minClientVersion: '0.6.0', // 이보다 오래된 앱은 접속 대신 업데이트 안내를 받음
  room: {
    w: 600, h: 600,
    floors: { 2: { top: 0, wall: 200, bottom: 292 }, 1: { top: 300, wall: 500, bottom: 600 } },
    ladderX: 556,
    // 🏗️ 집 넓히기: 가로로 넓어져요 (사다리는 늘 오른쪽 끝)
    expand: [
      { w: 600, name: '기본 집' },
      { w: 800, name: '1단계 증축', price: 5000 },
      { w: 1000, name: '2단계 증축', price: 15000 },
      { w: 1200, name: '3단계 증축', price: 30000 },
    ],
  },
  items: {
    computer:      { name: '컴퓨터',       price: 0,   scale: 4, free: true, required: true, start: { x: 110, y: 586 } },
    bed:           { name: '침대',         price: 600, scale: 4, free: 1, bed: true, start: { x: 420, y: 284 } },
    bedBlue:       { name: '하늘색 침대',  price: 600, scale: 4, bed: true },
    bedCanopy:     { name: '공주 침대',    price: 1200, scale: 4, bed: true },
    bedBunk:       { name: '이층 침대',    price: 900, scale: 4, bed: true },
    desk:          { name: '책상',         price: 300, scale: 4 },
    wardrobe:      { name: '옷장',         price: 450, scale: 4 },
    fridge:        { name: '냉장고',       price: 400, scale: 4 },
    arcade:        { name: '오락기',       price: 900, scale: 4 },
    record:        { name: '레코드 플레이어 🎵', price: 10000, scale: 4, music: true, max: 1, noSell: true },   // max: 한 사람이 가질 수 있는 수 (0.16)
    mirrorBall:    { name: '미러볼 🪩',        price: 8000, scale: 3, ceiling: true, max: 1, noSell: true },   // 천장에 매달림 · 레코드에서 노래가 나오면 돌면서 방을 반짝반짝 (0.16)
    partWhite:     { name: '하얀 가벽',     price: 2000, scale: 4, divider: true },   // 🧱 층 높이만큼 서는 벽: 방 나누기 · 캐릭터는 뒤로 가려지고 빛은 못 넘어감 (0.16)
    partWood:      { name: '원목 가벽',     price: 2000, scale: 4, divider: true },
    beanbag:       { name: '빈백',         price: 250, scale: 4 },
    globe:         { name: '지구본',       price: 220, scale: 3 },
    speaker:       { name: '스피커',       price: 280, scale: 3 },
    mirror:        { name: '전신 거울',    price: 300, scale: 4 },
    cattower:      { name: '캣타워',       price: 500, scale: 4 },
    sofa:          { name: '소파',         price: 450, scale: 4 },
    chair:         { name: '의자',         price: 180, scale: 4 },
    table:         { name: '탁자',         price: 220, scale: 4 },
    rug:           { name: '러그',         price: 180, scale: 4 },
    rugRound:      { name: '동그란 러그',  price: 220, scale: 4 },
    rugStripe:     { name: '줄무늬 러그',  price: 220, scale: 4 },
    tvStand:       { name: '낮은 TV장',    price: 350, scale: 4 },
    cushion:       { name: '쿠션',         price: 90,  scale: 4 },
    plant:         { name: '화분',         price: 120,  scale: 4 },
    cactus:        { name: '선인장',       price: 90,  scale: 4 },
    lamp:          { name: '스탠드',       price: 150, scale: 4 },
    books:         { name: '책장',         price: 380, scale: 4 },
    tv:            { name: 'TV',           price: 750, scale: 4 },
    guitar:        { name: '기타',         price: 520, scale: 4 },
    piano:         { name: '피아노',       price: 1050, scale: 4 },
    tree:          { name: '트리',         price: 900, scale: 4 },
    teddy:         { name: '곰 인형',      price: 270, scale: 3 },
    bunny:         { name: '토끼 인형',    price: 270, scale: 3 },
    catdoll:       { name: '고양이 인형',  price: 270, scale: 3 },
    duck:          { name: '오리 인형',    price: 220, scale: 3 },
    tankS:         { name: '작은 어항',    price: 220, scale: 4, tank: { cap: 3, allow: ['S'] } },
    tankM:         { name: '중간 어항',    price: 450, scale: 4, tank: { cap: 5, allow: ['S', 'M'] } },
    tankL:         { name: '큰 어항',      price: 900, scale: 4, tank: { cap: 8, allow: ['S', 'M'] } },
    frame:         { name: '액자',         price: 220, scale: 4, wall: true },
    clock:         { name: '벽시계',       price: 300, scale: 4, wall: true },
    window:        { name: '창문',         price: 220, scale: 4, wall: true },
    windowBig:     { name: '큰 창문',      price: 380, scale: 4, wall: true },
    windowRound:   { name: '동그란 창문',  price: 300, scale: 4, wall: true },
    poster:        { name: '포스터',       price: 150, scale: 4, wall: true },
    shelf:         { name: '벽 선반',      price: 200, scale: 4, wall: true },
    neon:          { name: '하트 네온사인', price: 350, scale: 4, wall: true },
    curtainWindow: { name: '커튼 창문',    price: 420, scale: 4, wall: true },
    // 💡 조명 (0.14): 불을 끄면 주변이 은은하게 밝아져요
    wallLamp:      { name: '벽등',         price: 260, scale: 4, wall: true },
    pendant:       { name: '펜던트 조명',  price: 320, scale: 4, wall: true },
    fairyLights:   { name: '줄전구',       price: 300, scale: 4, wall: true },
    moodLamp:      { name: '버섯 무드등',  price: 220, scale: 3 },
    candles:       { name: '캔들 세트',    price: 180, scale: 3 },
    // 🍷 와인바 가구 (분위기용)
    wineRack:      { name: '와인 랙',      price: 420, scale: 4, wall: true },
    wineCounter:   { name: '와인 바 카운터', price: 950, scale: 4 },
    barStool:      { name: '바 스툴',      price: 230, scale: 3 },
    // 🎃 할로윈 이벤트 전용 가구 10 (이벤트 켜져 있을 때만 상점에 보이고, 이벤트 코인으로만 구매)
    hwPumpkinLamp:   { name: '호박 등',       price: 1650, scale: 4, event: 'halloween' },
    hwCauldron:      { name: '마녀 솥',       price: 1650, scale: 4, event: 'halloween' },
    hwTombstone:     { name: '묘비',          price: 1400, scale: 4, event: 'halloween' },
    hwGhostDoll:     { name: '유령 인형',     price: 1250, scale: 3, event: 'halloween' },
    hwCandyBowl:     { name: '사탕 바구니',   price: 1150, scale: 4, event: 'halloween' },
    hwSkullJar:      { name: '해골 단지',     price: 1400, scale: 4, event: 'halloween' },
    hwBlackCatDoll:  { name: '검은 고양이 인형', price: 1250, scale: 3, event: 'halloween' },
    hwSpiderWeb:     { name: '거미줄',        price: 1150, scale: 4, wall: true, event: 'halloween' },
    hwBatGarland:    { name: '박쥐 장식',     price: 1250, scale: 4, wall: true, event: 'halloween' },
    hwCobwebRug:     { name: '거미줄 러그',   price: 1250, scale: 4, event: 'halloween' },
    // 🎄 크리스마스 이벤트 전용 가구 10
    xmasTree2:        { name: '크리스마스 트리',     price: 2150, scale: 4, event: 'christmas' },
    xmasFireplace:    { name: '벽난로',               price: 1900, scale: 4, event: 'christmas' },
    xmasGiftBox:      { name: '선물 상자',           price: 1150, scale: 4, event: 'christmas' },
    xmasSnowman:      { name: '눈사람',              price: 1500, scale: 4, event: 'christmas' },
    xmasCandyCane:    { name: '캔디 케인',           price: 1000, scale: 3, event: 'christmas' },
    xmasSleigh:       { name: '루돌프 썰매',         price: 1750, scale: 4, event: 'christmas' },
    xmasBell:         { name: '크리스마스 종',       price: 1150, scale: 3, event: 'christmas' },
    xmasStocking:     { name: '양말 장식',           price: 1150, scale: 4, wall: true, event: 'christmas' },
    xmasWreath:       { name: '리스',                price: 1250, scale: 4, wall: true, event: 'christmas' },
    xmasLightsGarland:{ name: '트리전구 장식',       price: 1250, scale: 4, wall: true, event: 'christmas' },
    // 🧧 새해 이벤트 전용 가구 10
    nyFortuneBox:     { name: '복주머니',           price: 1250, scale: 4, event: 'newyear' },
    nyLanternStand:   { name: '등불 스탠드',        price: 1500, scale: 4, event: 'newyear' },
    nyGoldCoinJar:    { name: '금화 항아리',        price: 1650, scale: 4, event: 'newyear' },
    nyRiceCakeTable:  { name: '떡국상',             price: 1400, scale: 4, event: 'newyear' },
    nyConfettiBalloon:{ name: '색종이 풍선',        price: 1150, scale: 3, event: 'newyear' },
    nyDrumSet:        { name: '사물놀이 북',        price: 1500, scale: 4, event: 'newyear' },
    nyZodiacFlag:     { name: '십이지 깃발',        price: 1150, scale: 4, wall: true, event: 'newyear' },
    nyNewYearClock:   { name: '제야의 종 시계',     price: 1250, scale: 4, wall: true, event: 'newyear' },
    nyKiteDeco:       { name: '연 장식',            price: 1150, scale: 4, wall: true, event: 'newyear' },
    nyFireworkFrame:  { name: '불꽃놀이 액자',      price: 1250, scale: 4, wall: true, event: 'newyear' },
  },
  walls: {
    basic:       { name: '크림 방',       price: 0 },
    sky:         { name: '하늘 방',       price: 300 },
    mint:        { name: '민트 방',       price: 300 },
    peach:       { name: '복숭아 방',     price: 380 },
    lavender:    { name: '라벤더 방',     price: 380 },
    navy:        { name: '밤 방',         price: 450 },
    moodVintage: { name: '빈티지 줄무늬 방', price: 500 },
    moodHanok:   { name: '한옥 방',       price: 550 },
    moodBrick:   { name: '벽돌 카페 방',  price: 550 },
    moodWalnut:  { name: '원목 패널 방',  price: 600 },
    moodForest:  { name: '숲 서재 방',    price: 600 },
    moodVelvet:  { name: '와인 벨벳 방',  price: 650 },
    meadowDay:   { name: '초원 (낮)',     price: 600 },
    meadowNight: { name: '초원 (밤)',     price: 600 },
    roofDay:     { name: '옥상 (낮)',     price: 600 },
    roofNight:   { name: '옥상 (밤하늘)', price: 750 },
    // 🎃 할로윈 이벤트 전용 (이벤트 켜져 있을 때만 상점에 보이고, 이벤트 코인으로만 구매)
    hwWallPumpkin:  { name: '호박밭 방',     price: 1500, event: 'halloween' },
    hwWallGraveyard:{ name: '묘지 방',       price: 1500, event: 'halloween' },
    hwWallBat:      { name: '박쥐동굴 방',   price: 1500, event: 'halloween' },
    hwWallHaunted:  { name: '폐가 방',       price: 1800, event: 'halloween' },
    hwWallCandy:    { name: '캔디 방',       price: 1800, event: 'halloween' },
    // 🎄 크리스마스 이벤트 전용
    xmasWallSnow:      { name: '설경 방',      price: 1500, event: 'christmas' },
    xmasWallFireplace: { name: '벽난로 방',    price: 1500, event: 'christmas' },
    xmasWallLights:    { name: '트리전구 방',  price: 1500, event: 'christmas' },
    xmasWallGift:      { name: '선물상자 방',  price: 1800, event: 'christmas' },
    xmasWallNorthPole: { name: '북극 방',      price: 1800, event: 'christmas' },
    // 🧧 새해 이벤트 전용
    nyWallFirework: { name: '불꽃놀이 방',   price: 1500, event: 'newyear' },
    nyWallGold:     { name: '금빛 방',       price: 1500, event: 'newyear' },
    nyWallSunrise:  { name: '해돋이 방',     price: 1500, event: 'newyear' },
    nyWallConfetti: { name: '색종이 방',     price: 1800, event: 'newyear' },
    nyWallLantern:  { name: '등불 방',       price: 1800, event: 'newyear' },
  },
  // 내 캐릭터 음식 (상점에서 사서 가방에 보관 → 먹이기)
  foods: {
    milk:     { name: '우유',       icon: '🥛', price: 20,  full: 15, mood: 3,  exp: 5 },
    apple:    { name: '사과',       icon: '🍎', price: 25,  full: 15, mood: 5,  exp: 6 },
    carrot:   { name: '당근',       icon: '🥕', price: 25,  full: 18, mood: 3,  exp: 6 },
    cookie:   { name: '쿠키',       icon: '🍪', price: 30,  full: 10, mood: 10, exp: 8 },
    donut:    { name: '도넛',       icon: '🍩', price: 45,  full: 15, mood: 14, exp: 10 },
    fish:     { name: '생선',       icon: '🐟', price: 50,  full: 35, mood: 6,  exp: 15 },
    ramen:    { name: '라면',       icon: '🍜', price: 60,  full: 40, mood: 8,  exp: 15 },
    icecream: { name: '아이스크림', icon: '🍦', price: 60,  full: 12, mood: 20, exp: 14 },
    watermelon:{ name: '수박',      icon: '🍉', price: 70,  full: 25, mood: 15, exp: 18 },
    pizza:    { name: '피자',       icon: '🍕', price: 80,  full: 45, mood: 12, exp: 22 },
    meat:     { name: '고기',       icon: '🍖', price: 90,  full: 55, mood: 10, exp: 25 },
    cake:     { name: '케이크',     icon: '🍰', price: 150, full: 40, mood: 25, exp: 40 },
  },
  // 펫 먹이 (상점 → 가방 → 펫/어항에게)
  petFoods: {
    kibble:    { name: '펫 사료',      icon: '🥣', price: 30, full: 30, love: 3 },
    seeds:     { name: '해바라기씨',   icon: '🌻', price: 25, full: 25, love: 3 },
    veggies:   { name: '채소 바구니',  icon: '🥬', price: 30, full: 30, love: 3 },
    bamboo:    { name: '대나무',       icon: '🎋', price: 40, full: 40, love: 4 },
    fishsnack: { name: '생선 간식',    icon: '🍤', price: 40, full: 35, love: 4 },
    fishfood:  { name: '물고기 밥',    icon: '🫙', price: 15, tank: true },
  },
  // 홈에서 키우는 동물
  pets: {
    hamster:  { code: 'P01', name: '햄스터',   price: 450,  likes: ['seeds'] },
    chick:    { code: 'P02', name: '병아리',   price: 380,  likes: ['seeds'] },
    turtle:   { code: 'P03', name: '거북이',   price: 600,  likes: ['veggies'] },
    hedgehog: { code: 'P04', name: '고슴도치', price: 750,  likes: ['kibble'] },
    parrot:   { code: 'P05', name: '앵무새',   price: 900,  likes: ['seeds'] },
    penguin:  { code: 'P06', name: '펭귄',     price: 1350,  likes: ['fishsnack'] },
    fox:      { code: 'P07', name: '여우',     price: 1800, likes: ['fishsnack', 'kibble'] },
    panda:    { code: 'P08', name: '판다',     price: 3000, likes: ['bamboo'] },
    // 운영자 전용 펫: 상점엔 ??? 로만 보이고 살 수 없음, 되팔기도 안 됨. 관리자 pet 명령으로만
    unicorn:  { code: 'P09', name: '유니콘',     price: null, secret: true, likes: ['veggies', 'seeds'] },
    dragon:   { code: 'P10', name: '아기 드래곤', price: null, secret: true, likes: ['fishsnack', 'kibble'] },
    phoenix:  { code: 'P11', name: '불사조',     price: null, secret: true, likes: ['seeds', 'fishsnack'] },
    // 🎃 할로윈 이벤트 전용 펫 4 (이벤트 켜져 있을 때만 상점에 보이고, 이벤트 코인으로만 구매)
    hwBat:        { code: 'P12', name: '박쥐',         price: 2400, event: 'halloween', likes: ['fishsnack'] },
    hwGhost:      { code: 'P13', name: '유령',         price: 3000, event: 'halloween', likes: ['seeds'] },
    hwBlackCat:   { code: 'P14', name: '검은 고양이', price: 3000, event: 'halloween', likes: ['kibble'] },
    hwPumpkinSlime:{ code: 'P15', name: '호박 슬라임', price: 3600, event: 'halloween', likes: ['veggies'] },
    // 🎄 크리스마스 이벤트 전용 펫 4
    xmasReindeer:  { code: 'P16', name: '루돌프',       price: 3000, event: 'christmas', likes: ['veggies'] },
    xmasSnowOwl:   { code: 'P17', name: '설빛 올빼미', price: 3000, event: 'christmas', likes: ['fishsnack'] },
    xmasElfMouse:  { code: 'P18', name: '엘프 쥐',     price: 2400, event: 'christmas', likes: ['seeds'] },
    xmasGingerbread:{ code: 'P19', name: '생강빵 친구', price: 3600, event: 'christmas', likes: ['kibble'] },
    // 🧧 새해 이벤트 전용 펫 4
    nyGoldMouse:   { code: 'P20', name: '황금 쥐',     price: 3600, event: 'newyear', likes: ['seeds'] },
    nyLuckyRabbit: { code: 'P21', name: '복토끼',      price: 3000, event: 'newyear', likes: ['veggies'] },
    nyDragonling:  { code: 'P22', name: '꼬마 용',     price: 3600, event: 'newyear', likes: ['fishsnack'] },
    nyCrane:       { code: 'P23', name: '학',          price: 3000, event: 'newyear', likes: ['kibble'] },
    // 🍫 0.17.5 빼빼로 데이 한정 펫 5 (limitedGifts.pepero 날 접속하면 랜덤 1마리, 상점 · 되팔기 · 선물 없음)
    ppOriginal:    { code: 'P24', name: '오리지널 초코', price: null, limited: 'pepero', likes: ['kibble'] },
    ppMatcha:      { code: 'P25', name: '녹차',         price: null, limited: 'pepero', likes: ['veggies'] },
    ppNude:        { code: 'P26', name: '누드',         price: null, limited: 'pepero', likes: ['seeds'] },
    ppAlmond:      { code: 'P27', name: '아몬드',       price: null, limited: 'pepero', likes: ['seeds', 'kibble'] },
    ppStrawberry:  { code: 'P28', name: '딸기',         price: null, limited: 'pepero', likes: ['veggies', 'fishsnack'] },
  },
  // 🍫 0.17.5 한정 선물 펫: dates(한국 시간) 중 하루에 접속하면 그 limited 펫 중 하나를 랜덤으로. 한 사람당 한 번.
  limitedGifts: {
    pepero: { name: '빼빼로 데이', icon: '🍫', dates: ['2026-11-11'] },
  },
  // 🎉 시즌 이벤트: 할로윈 · 크리스마스 · 새해. 관리자가 켜면 위의 event 표시된 벽지·가구·펫이 상점에 보이고
  // 이벤트 코인으로만 살 수 있음. on/off 상태는 서버 데이터(db.events)에 저장.
  // 이벤트마다 전용 코인이 따로 있고(일반 코인 🪙과 별개), 그 이벤트 아이템은 그 코인으로만 삼.
  events: {
    halloween: { name: '할로윈', icon: '🎃', coin: { name: '호박 코인', icon: '🎃' } },
    christmas: { name: '크리스마스', icon: '🎄', coin: { name: '트리 코인', icon: '🎄' } },
    newyear:   { name: '새해', icon: '🧧', coin: { name: '복주머니 코인', icon: '🧧' } },
  },
  // 캐릭터 액세서리 (price: null 이면 출석 7일째에만 나옴, secret: true 면 운영자 전용)
  accessories: {
    ribbon:     { code: 'A01', name: '리본',         slot: 'head', price: 300 },
    beanie:     { code: 'A02', name: '비니',         slot: 'head', price: 380 },
    strawhat:   { code: 'A03', name: '밀짚모자',     slot: 'head', price: 450 },
    flower:     { code: 'A04', name: '꽃 핀',        slot: 'head', price: 220 },
    partyhat:   { code: 'A05', name: '파티 모자',    slot: 'head', price: 300 },
    headphones: { code: 'A06', name: '헤드폰',       slot: 'head', price: 600 },
    glasses:    { code: 'A07', name: '안경',         slot: 'face', price: 300 },
    sunglasses: { code: 'A08', name: '선글라스',     slot: 'face', price: 450 },
    bowtie:     { code: 'A09', name: '나비넥타이',   slot: 'neck', price: 220 },
    crown:      { code: 'A10', name: '왕관',         slot: 'head', price: null },
    wizard:     { code: 'A11', name: '마법사 모자',  slot: 'head', price: null },
    halo:       { code: 'A12', name: '천사 링',      slot: 'head', price: null },
    // 운영자 전용 (secret): 상점엔 ??? 로만 보이고 살 수 없음, 출석 보상에도 안 나옴. 관리자 acc 명령으로만 지급
    starband:   { code: 'A13', name: '별빛 머리띠',  slot: 'head', price: null, secret: true },
    flamecrown: { code: 'A14', name: '불꽃 왕관',    slot: 'head', price: null, secret: true },
    pirate:     { code: 'A15', name: '해적 모자',    slot: 'head', price: null, secret: true },
    knight:     { code: 'A16', name: '기사 투구',    slot: 'head', price: null, secret: true },
    horns:      { code: 'A17', name: '악마 뿔',      slot: 'head', price: null, secret: true },
    visor:      { code: 'A18', name: '사이버 고글',  slot: 'face', price: null, secret: true },
    eyepatch:   { code: 'A19', name: '해적 안대',    slot: 'face', price: null, secret: true },
    heartglass: { code: 'A20', name: '하트 안경',    slot: 'face', price: null, secret: true },
    medal:      { code: 'A21', name: '금메달',       slot: 'neck', price: null, secret: true },
    scarf:      { code: 'A22', name: '빨간 목도리',  slot: 'neck', price: null, secret: true },
  },
  // 🏅 칭호 (0.17.2, 액세서리 대신): 조건이 열리면 사서 닉네임 앞에 하나 달아요. 그림(글씨체 · 꾸밈)은 앱의 src/titles.js
  // need: days(가입한 지 며칠) · attend(출석 횟수) · legend(전설 물고기 종류) · dexAll(물고기 도감 다 채우기) · pets(펫 수) · furniture(가구 수) · event(그 이벤트 중 접속)
  // secret: 운영자 전용 (상점에 안 나오고 관리자 명령 title-give 로 줌. op 는 공지 권한이 있으면 저절로)
  titles: {
    newbie:    { code: 'T01', icon: '🌱', name: '뉴비',         price: 300,   need: { days: 0 } },
    month1:    { code: 'T02', icon: '🌙', name: '한 달',        price: 1000,  need: { days: 30 } },
    day100:    { code: 'T03', icon: '💯', name: '100일',        price: 2000,  need: { days: 100 } },
    day200:    { code: 'T04', icon: '🌷', name: '200일',        price: 3000,  need: { days: 200 } },
    day300:    { code: 'T05', icon: '🍀', name: '300일',        price: 4000,  need: { days: 300 } },
    year1:     { code: 'T06', icon: '🎂', name: '1주년',        price: 6000,  need: { days: 365 } },
    day500:    { code: 'T07', icon: '🎈', name: '500일',        price: 8000,  need: { days: 500 } },
    year2:     { code: 'T08', icon: '🏆', name: '2주년',        price: 10000, need: { days: 730 } },
    attend:    { code: 'T09', icon: '📅', name: '개근',         price: 2000,  need: { attend: 30 } },
    fisher:    { code: 'T10', icon: '🎣', name: '낚시왕',       price: 3000,  need: { legend: 1 } },
    dex:       { code: 'T11', icon: '📖', name: '도감왕',       price: 5000,  need: { dexAll: true } },
    petlover:  { code: 'T12', icon: '🐾', name: '펫 부자',      price: 2000,  need: { pets: 5 } },
    decorator: { code: 'T13', icon: '🏠', name: '인테리어 장인', price: 3000, need: { furniture: 50 } },
    halloween: { code: 'T14', icon: '🎃', name: '할로윈',       price: 3000,  event: 'halloween', need: { event: 'halloween' } },
    xmas:      { code: 'T15', icon: '🎄', name: '크리스마스',   price: 3000,  event: 'christmas', need: { event: 'christmas' } },
    newyear:   { code: 'T16', icon: '🧧', name: '새해',         price: 3000,  event: 'newyear',   need: { event: 'newyear' } },
    op:        { code: 'T90', icon: '🛡️', name: '운영자',       price: null,  secret: true },
    beta:      { code: 'T91', icon: '🧪', name: '베타 테스터',  price: null,  secret: true },
    honor:     { code: 'T92', icon: '🎖️', name: '명예 버디',    price: null,  secret: true },
  },
  rods: RODS, rodWeight, nothingWeight: NOTHING_WEIGHT,
  fish, rarity: RARITY, nothingChance: +(NOTHING_WEIGHT / totalWeight * 100).toFixed(2),
  // 출석: 1~6번째는 코인, 7번째는 보너스 코인 day7Fallback (0.17.2부터, 예전엔 액세서리)
  attendance: { coins: [30, 40, 50, 60, 80, 100], day7Fallback: 300 },
  // 0.17.3 🐾 펫 성격: 5레벨이 되는 순간 weight 확률로 하나 정해짐 (같은 펫 종류여도 다를 수 있음). 대사는 앱 src/petvoice.js
  petTraits: {
    sweet:   { name: '다정',     icon: '💗', weight: 18 },
    cheer:   { name: '발랄',     icon: '🌟', weight: 18 },
    lazy:    { name: '느긋',     icon: '☁️', weight: 13 },
    foodie:  { name: '먹보',     icon: '🍖', weight: 12 },
    grumpy:  { name: '까칠',     icon: '💢', weight: 10 },
    shy:     { name: '수줍',     icon: '🌸', weight: 10 },
    polite:  { name: '의젓',     icon: '🎩', weight: 8 },
    prank:   { name: '장난꾸러기', icon: '😜', weight: 6 },
    swag:    { name: '허세',     icon: '😎', weight: 3 },
    weird:   { name: '엉뚱',     icon: '🌀', weight: 2 },
  },
  petEndingMax: 5,   // 0.17.3 펫 말끝에 붙이는 말 (예: 냥 · 멍 · 뿌) 글자 수
  species: ['cat', 'dog', 'rabbit'],
  limits: {
    onlinePerDay: 1000,   // 접속해 있기만 해서 받는 코인 하루 상한
    castsPerDay: 0,       // 낚시 하루 횟수 (0이면 제한 없음)
    fishGiftPerDay: 5,    // 친구에게 물고기 선물 하루 횟수
    tradesPerDay: 10,     // 교환 하루 횟수
    petsMax: 99,          // 키울 수 있는 펫 수
    petsOut: 4,           // 동시에 집에 꺼내 둘 수 있는 펫 수
    aquariumCap: 100,     // 아쿠아리움 수용량
    snackPerDay: 20,      // 간식 나눠먹기 하루 횟수
    renameHours: 24,      // 아이디 바꾸기: 한 번 바꾸면 몇 시간 뒤에 또 바꿀 수 있는지
    // 0.17 💾 저장 슬롯: free 개는 무료, 그다음부터 step 씩 비싸짐 (캐릭터 3번째 1,000 → 4번째 2,000 …)
    charSlots: { free: 2, max: 10, step: 1000 },
    homeSlots: { free: 1, max: 8, step: 10000 },
    sellRate: 0.3,        // 0.17 가구 되팔기: 산 값의 30% (noSell 가구는 못 팔아요)
    bioMax: 100,          // 0.17 프로필 자기소개 글자 수
  },
  rewards: { online: 10, chat: 30, chatCooldownSec: 30, giftPerDay: 100, eventCoin: 10, eventCoinEveryMs: 5 * 60_000 },
};
