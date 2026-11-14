// 0.17.3 🐾 펫 성격 · 말투 — 성격마다 말하는 방식이 달라요 (집 화면 · 바탕화면 같이 씀)
// 성격은 서버가 5레벨이 되는 순간 확률로 정함 (server/catalog.js petTraits). 5레벨 전엔 trait 가 안 옴.
// 대사의 {n} 은 주인 닉네임. 말끝 단어(ending)는 문장 끝마다 붙고, 이름 뒤에는 안 붙어요.
window.PetVoice = (() => {
  const L = {
    sweet: {   // 💗 다정: 부드러운 반말, ~ 와 하트
      greet: ['{n} 왔어? 💕', '{n}, 오늘도 고마워~', '{n} 옆이 제일 좋아~', '{n} 사랑해~ 💕'],
      idle: ['오늘 하루 어땠어?', '무리하지 마~', '같이 있어서 좋다~', '물은 마셨어? 💧'],
      pat: ['헤헤, 따뜻해~', '더 쓰다듬어 줘~ 💕', '기분 좋아~'],
      hungry: ['배고파… 밥 줄래?', '꼬르륵… 같이 먹자~'],
      fed: ['고마워, 맛있어~ 💕', '냠냠, 행복해~'],
    },
    cheer: {   // 🌟 발랄: 느낌표 가득, 신남
      greet: ['{n}!! 놀자!!', '{n} 최고야!!', '{n} 왔다!! 야호!', '{n}, 오늘도 신나!'],
      idle: ['뛰어놀고 싶어!!', '야호~!!', '심심해! 놀아 줘!', '오늘 기분 최고!'],
      pat: ['꺄하하! 간지러워!', '한 번 더! 한 번 더!', '좋아좋아!!'],
      hungry: ['배고파!! 밥밥밥!', '밥 먹고 놀자!!'],
      fed: ['우와 맛있다!!', '최고의 밥이야!!'],
    },
    lazy: {   // ☁️ 느긋: 졸림, 말 늘어짐
      greet: ['{n}… 왔구나~', '음냐… {n}…', '{n}, 천천히 해~'],
      idle: ['하암… 졸려…', '오늘은 뒹굴뒹굴~', '서두를 거 없어~', '음냐음냐…'],
      pat: ['음… 거기 좋아…', '그대로 잠들 것 같아…'],
      hungry: ['배고픈데… 움직이기 싫어…', '밥… 누가 갖다줘…'],
      fed: ['배부르니… 졸리다…', '냠… 맛있네…'],
    },
    foodie: {   // 🍖 먹보: 머릿속엔 먹을 것뿐
      greet: ['{n}! 간식 있어?', '{n}, 밥 먹었어?', '{n} 왔다! 간식도 왔어?'],
      idle: ['뭐 먹을까…', '아까 그거 또 먹고 싶다', '간식 시간 아직이야?', '배는 늘 고파!'],
      pat: ['쓰다듬기보다 간식!', '헤헤, 간식 주는 거지?'],
      hungry: ['배고파서 쓰러질 거야…', '밥!! 지금 당장 밥!!'],
      fed: ['한 그릇 더!!', '최고! 또 줘!'],
    },
    grumpy: {   // 💢 까칠: 툭툭 내뱉지만 사실은 좋아함
      greet: ['흥, {n} 왔어?', '{n}… 늦었잖아.', '딱히 기다린 거 아냐.'],
      idle: ['흥.', '뭘 봐?', '귀찮게 하지 마.', '…심심한 거 아니거든.'],
      pat: ['…만지지 마. 아니, 계속해.', '흥, 이번만 봐준다.', '…싫은 건 아니야.'],
      hungry: ['배고프다고. 안 들려?', '밥. 빨리.'],
      fed: ['…나쁘지 않네.', '흥, 맛있다곤 안 했어.'],
    },
    shy: {   // 🌸 수줍: 말을 더듬음
      greet: ['{n}… 아, 안녕…', '저, 저기… {n}…', '{n} 와서… 좋아…'],
      idle: ['(빼꼼)', '부, 부끄러워…', '여기 있어도 돼…?', '……'],
      pat: ['히익… 부끄러워…', '조, 좋아…'],
      hungry: ['저기… 배, 배고파…', '밥… 주면 좋겠어…'],
      fed: ['고, 고마워…', '마, 맛있어…'],
    },
    polite: {   // 🎩 의젓: 존댓말, 집사 같은 말투
      greet: ['{n}님, 오셨습니까.', '{n}님, 좋은 하루입니다.', '기다렸습니다, {n}님.'],
      idle: ['집은 제가 지키겠습니다.', '오늘도 평화롭군요.', '차 한잔 하시겠습니까?'],
      pat: ['감사합니다.', '흠흠, 영광입니다.'],
      hungry: ['실례지만 식사 시간입니다.', '배가 조금 고픕니다.'],
      fed: ['훌륭한 식사였습니다.', '잘 먹었습니다.'],
    },
    prank: {   // 😜 장난꾸러기
      greet: ['{n}! 메롱~', '{n} 놀래 줄까? 히히', '{n}, 잡아 봐라~'],
      idle: ['히히, 뭐 숨겨 놨지~', '메롱메롱~', '장난칠 거 없나~', '나 찾아 봐라~'],
      pat: ['간지럼 공격이다!', '히히, 잡혔다~'],
      hungry: ['밥 안 주면 장난칠 거야!', '배고파~ 밥 내놔라~'],
      fed: ['냠! 장난 충전 완료!', '맛있다 히히~'],
    },
    swag: {   // 😎 허세
      greet: ['{n}, 나 보러 왔구나?', '후훗, {n} 왔어?', '{n}, 내 팬이지?'],
      idle: ['후훗, 오늘도 멋있군.', '이 집 주인공은 나지.', '역시 나야.'],
      pat: ['훗, 내 털 멋지지?', '영광인 줄 알아.'],
      hungry: ['멋진 나도 배는 고프지.', '고급 사료로 부탁해.'],
      fed: ['훗, 합격이다.', '이 정도면 봐줄게.'],
    },
    weird: {   // 🌀 엉뚱: 4차원
      greet: ['{n}… 혹시 외계인이야?', '{n}, 구름 맛 알아?', '{n}! 나 우주에서 왔어!'],
      idle: ['구름은 무슨 맛일까…', '양말이 날 부르고 있어', '오늘은 감자 기분이야', '나는 사실 별이야'],
      pat: ['찌릿! 전기 충전 완료!', '쓰다듬으면 키가 커져'],
      hungry: ['배에서 고래 소리 나', '달 한 조각 먹고 싶다'],
      fed: ['이건 우주의 맛이야!', '냠, 별이 반짝여!'],
    },
  };
  // 성격 없을 때 (5레벨 전 · 예전 서버)
  const BASE = {
    greet: ['{n} 안녕!', '{n}, 안녕~ 💕', '{n} 좋아!', '{n} 보고 싶었어!'],
    hungry: ['배고파…', '배고파… 밥 줘 🍖'],
  };
  const NAME = '\u0001';
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const isWord = (ch) => /[\p{L}\p{N}]/u.test(ch);
  const isEnd = (ch) => /[!?.~…,)\s♪♡]|\p{Extended_Pictographic}|️|‍/u.test(ch);
  const isStop = (ch) => /[!?.~…)♪♡]/u.test(ch);

  /** 문장 끝마다 말끝 단어를 붙임: '안녕! 보고 싶었어~ 💕' + '냥' → '안녕냥! 보고 싶었어냥~ 💕' */
  function applyEnding(text, ending) {
    const e = String(ending || '').trim();
    if (!e || !text) return text;
    const ch = [...text];
    let out = '';
    for (let i = 0; i < ch.length; i++) {
      out += ch[i];
      if (!isWord(ch[i])) continue;
      const rest = ch.slice(i + 1);
      // 바로 뒤가 마침 부호(! ? . ~ …)이거나, 뒤에 남은 게 이모지 · 공백 · 부호뿐이면 문장 끝
      if ((rest.length && isStop(rest[0])) || rest.every((c) => isEnd(c) && c !== ',')) out += e;
    }
    return out;
  }

  /** 펫 대사 하나. kind: 'idle' | 'pat' | 'fed'. 할 말이 없으면 null */
  function line(p, kind, owner) {
    p = p || {};
    const n = owner || '주인님';
    const t = L[p.trait];
    const hungry = p.hungry ?? (p.full != null && p.full < 30);
    const lv5 = (p.level || 1) >= 5;
    let s = null;
    if (hungry && kind !== 'fed') s = pick(lv5 && t ? t.hungry : BASE.hungry);
    else if (!lv5) s = null;
    else if (!t) s = kind === 'fed' ? null : pick(BASE.greet);
    else if (kind === 'pat') s = pick(t.pat);
    else if (kind === 'fed') s = pick(t.fed);
    else s = Math.random() < 0.5 ? pick(t.greet) : pick(t.idle);
    if (!s) return null;
    return applyEnding(s.split('{n}').join(NAME), p.ending).split(NAME).join(n);
  }

  /** 펫 창 미리보기용: 그 성격의 대사 몇 개 */
  function samples(trait, ending, owner, count = 3) {
    const t = L[trait];
    const src = t ? [t.greet[0], t.idle[0], t.pat[0]] : BASE.greet.slice(0, 2);
    return src.slice(0, count).map((s) => applyEnding(s.split('{n}').join(NAME), ending).split(NAME).join(owner || '주인님'));
  }

  return { line, samples, applyEnding, traits: Object.keys(L), LINES: L };
})();
