/* ===================================================
   선거제도 시뮬레이터 — app.js
   같은 표, 다른 의석
   =================================================== */

/* ─────────────────────────────────────────────
   1. 초기 데이터
───────────────────────────────────────────── */

// 정당 기본 데이터 (색상은 CSS 변수와 대응)
const PARTY_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'];
const PARTY_NAMES_DEFAULT = ['A당', 'B당', 'C당', 'D당', 'E당', 'F당'];
const PARTY_VOTES_DEFAULT = [40, 30, 20, 10, 0, 0];

// 정당별 이념 좌표 (절대다수제 결선투표 표 이동용, 기본값)
// 음수 = 좌파, 양수 = 우파
const IDEOLOGY_DEFAULT = [-40, 20, -10, 50, 0, 30];

// 기본 12개 소선거구 데이터
// 각 항목: [A, B, C, D] 득표율 (합계 100)
// ★ 표시 선거구는 1차 투표에서 과반(>50%) 달성 → 결선투표 불필요
const DISTRICTS_DEFAULT = [
  [52, 28, 13,  7],  // D1  ★ A당 52% → 1차 당선
  [38, 34, 20,  8],  // D2    결선 (A vs B)
  [33, 37, 20, 10],  // D3    결선 (B vs A)
  [55, 22, 16,  7],  // D4  ★ A당 55% → 1차 당선
  [28, 32, 30, 10],  // D5    결선 (B vs C)
  [41, 29, 18, 12],  // D6    결선 (A vs B)
  [36, 31, 23, 10],  // D7    결선 (A vs B)
  [25, 51, 18,  6],  // D8  ★ B당 51% → 1차 당선
  [39, 27, 24, 10],  // D9    결선 (A vs B)
  [30, 28, 32, 10],  // D10   결선 (C vs A)
  [44, 30, 16, 10],  // D11   결선 (A vs B)
  [53, 28, 12,  7],  // D12 ★ A당 53% → 1차 당선
];

// ── 기초의회 기본 데이터 (후보자 중심, 득표수 기반) ──
// partyIdx: 0=A당, 1=B당, 2=C당, 3=D당
const LOCAL_DISTRICTS_DEFAULT = [
  {
    name: '제1선거구', seats: 2,
    candidates: [
      { name: '김민준', partyIdx: 0, votes: 520 },
      { name: '이서연', partyIdx: 0, votes: 390 },
      { name: '박준혁', partyIdx: 1, votes: 480 },
      { name: '최지우', partyIdx: 1, votes: 340 },
      { name: '정하은', partyIdx: 2, votes: 270 },
    ],
  },
  {
    name: '제2선거구', seats: 3,
    candidates: [
      { name: '한지수', partyIdx: 0, votes: 610 },
      { name: '임서준', partyIdx: 0, votes: 380 },
      { name: '오준영', partyIdx: 1, votes: 550 },
      { name: '윤채린', partyIdx: 1, votes: 290 },
      { name: '강민아', partyIdx: 2, votes: 430 },
      { name: '전민호', partyIdx: 3, votes: 140 },
    ],
  },
  {
    name: '제3선거구', seats: 2,
    candidates: [
      { name: '송예린', partyIdx: 0, votes: 460 },
      { name: '신동현', partyIdx: 0, votes: 320 },
      { name: '황지훈', partyIdx: 1, votes: 500 },
      { name: '권민서', partyIdx: 2, votes: 310 },
      { name: '백준호', partyIdx: 3, votes: 210 },
    ],
  },
  {
    name: '제4선거구', seats: 3,
    candidates: [
      { name: '홍태민', partyIdx: 0, votes: 580 },
      { name: '남정우', partyIdx: 0, votes: 390 },
      { name: '구하린', partyIdx: 1, votes: 520 },
      { name: '변성호', partyIdx: 1, votes: 350 },
      { name: '탁은지', partyIdx: 2, votes: 440 },
      { name: '류지아', partyIdx: 3, votes: 130 },
    ],
  },
];

// 샘플 시나리오 (전국 득표율)
const SCENARIOS = {
  A: { name: '1위 우세형',    votes: [45, 30, 15, 10, 0, 0] },
  B: { name: '박빙 다당형',   votes: [32, 30, 25, 13, 0, 0] },
  C: { name: '소수 과소형',   votes: [38, 35, 20,  7, 0, 0] },
  D: { name: '극단 분산형',   votes: [28, 27, 25, 20, 0, 0] },
  // 실제 한국 선거 데이터 기반 (4당 단순화)
  E: { name: '2016 총선형',   votes: [35, 32, 26,  7, 0, 0] },  // 합계 100%
  F: { name: '2020 총선형',   votes: [49, 37,  9,  5, 0, 0] },  // 합계 100%
};

// ── 선거제도별 설명 데이터 (좌: 선거구 방식 / 우: 대표 결정 방식) ──
const SYSTEM_DESCS = {
  fptp: {
    leftTitle: '소선거구제', leftExample: '영국·미국·캐나다',
    leftItems: [
      '한 선거구에서 <strong>1명만</strong> 선출',
      '지역구 의원이 누구인지 명확함',
      '큰 정당에 유리 — 소수 정당은 표를 받아도 의석을 못 얻을 수 있음',
    ],
    rightTitle: '단순다수대표제', rightExample: '영국·미국·캐나다',
    rightItems: [
      '<strong>1위</strong>가 무조건 당선 — 과반 불필요',
      '33%만 받아도 나머지가 분산되면 당선 가능',
      '낙선자 표는 모두 <strong>사표(死票)</strong>',
    ],
  },
  majority: {
    leftTitle: '소선거구제', leftExample: '프랑스',
    leftItems: [
      '한 선거구에서 <strong>1명만</strong> 선출',
      '지역구 의원이 누구인지 명확함',
      '1·2위 결선에서 유권자 과반의 지지를 받은 후보 당선',
    ],
    rightTitle: '절대다수대표제', rightExample: '프랑스',
    rightItems: [
      '<strong>과반(50% 초과)</strong>을 얻은 후보만 당선',
      '과반 없으면 1·2위만 남아 <strong>결선투표</strong> 실시',
      '탈락 후보 지지자들의 표 이동 방향이 승부를 가름',
    ],
  },
  multi: {
    leftTitle: '중대선거구제', leftExample: '과거 한국(1973–1987)',
    leftItems: [
      '한 선거구에서 <strong>여러 명</strong> 선출',
      '소선거구 3개를 묶어 중선거구 1개(3석)로 운영',
      '2·3위 정당도 의석을 얻을 가능성이 생김',
    ],
    rightTitle: '비례배분 (동트 방식)', rightExample: null,
    rightItems: [
      '득표율을 1, 2, 3…으로 나눈 몫이 큰 순서대로 의석 배분',
      '득표율에 가깝게 의석이 배분됨',
      '소수 정당도 일정 득표율만 넘으면 의석 획득 가능',
    ],
  },
  'multi-plurality': {
    leftTitle: '중대선거구제', leftExample: null,
    leftItems: [
      '한 선거구에서 <strong>여러 명</strong> 선출',
      '소선거구 3개를 묶어 중선거구 1개(3석)로 운영',
      '2·3위 정당도 의석을 얻을 가능성이 있음',
    ],
    rightTitle: '단순다수 (블록투표)', rightExample: null,
    rightItems: [
      '각 중선거구에서 <strong>득표 상위 3개 정당이 각 1석</strong> 획득',
      '4위 이하 정당은 의석을 얻기 어려움',
      '득표율에 비례하지 않아 전략적 공천이 중요',
    ],
  },
  pr: {
    leftTitle: '전국 단일 선거구', leftExample: '독일·네덜란드·이스라엘',
    leftItems: [
      '전국이 하나의 선거구',
      '정당 득표율이 의석률로 직결됨',
      '지역 대표성은 낮지만 전국 비례성이 높음',
    ],
    rightTitle: '비례대표제', rightExample: '독일·네덜란드·이스라엘',
    rightItems: [
      '정당 득표율에 <strong>비례</strong>하여 의석 배분',
      '소수 정당도 득표율만큼 의석 획득 가능',
      '<strong>봉쇄조항</strong> 미달 정당은 배분에서 제외',
    ],
  },
  local: {
    leftTitle: '중선거구제 (기초의회)', leftExample: '한국 기초의회',
    leftItems: [
      '한 선거구에서 <strong>여러 명</strong> 선출 (보통 2~4명)',
      '유권자는 후보자 <strong>1명</strong>에게만 투표',
      '득표 순위 N위까지 당선 — 같은 정당 후보끼리도 경쟁',
    ],
    rightTitle: '단순다수대표제 (득표 순위)',
    rightExample: '한국 기초의회',
    rightItems: [
      '정당 공천 시 <strong>몇 명을 낼 것인가</strong>가 핵심 전략',
      '후보를 너무 많이 내면 표가 분산되어 공멸 위험',
      '후보를 너무 적게 내면 표가 남아도 의석 손실',
    ],
  },
  mixed: {
    leftTitle: '지역구 (소선거구)', leftExample: '한국 현행·일본',
    leftItems: [
      '전체 의석 중 일부를 소선거구 단순다수로 배분',
      '지역구 의원이 누구인지 명확',
      '지역구 비율이 높을수록 1위 정당에 유리',
    ],
    rightTitle: '비례 (전국)', rightExample: '한국 현행·일본',
    rightItems: [
      '나머지 의석을 전국 정당 득표율로 별도 배분',
      '지역구와 비례가 서로 영향을 주지 않음 (<strong>병립형</strong>)',
      '한국 현행: 지역구 254석 + 비례 46석',
    ],
  },
};

// ── 시나리오별 설명 + 수업 포인트 ──
const SCENARIO_DESCS = {
  A: {
    label: '1위 정당 우세형',
    point: '1위 정당(A당)이 45%로 뚜렷이 앞섭니다. 소선거구제에서 1위 정당이 얼마나 많은 "의석 보너스"를 받는지 확인해보세요.',
  },
  B: {
    label: '박빙 다당 경쟁형',
    point: '4당 모두 30% 안팎으로 경쟁합니다. 어떤 제도에서도 안정적 다수 형성이 어렵습니다. 비례대표제와 소선거구제의 결과 차이가 극명하게 드러납니다.',
  },
  C: {
    label: '소수 정당 과소대표형',
    point: 'D당이 7%로 봉쇄조항(5%)을 간신히 넘깁니다. 비례대표제 옵션에서 봉쇄조항을 켜고 끄며 D당의 운명이 어떻게 달라지는지 보세요.',
  },
  D: {
    label: '극단 분산형',
    point: '4당이 25~28%로 거의 같은 표를 나눕니다. "이 표들을 가장 비례성 있게 반영하는 제도는 무엇인가?"라는 질문에 집중해보세요.',
  },
  E: {
    label: '2016 총선 데이터',
    point: 'A당(새누리 계열) 35%, B당(민주) 32%, C당(국민의당) 26%, D당(정의당) 7%. C당이 26%를 받았지만 소선거구에서 의석을 거의 못 얻은 실제 상황입니다.',
  },
  F: {
    label: '2020 총선 데이터',
    point: 'A당(민주) 49%, B당(통합) 37%, C당(정의당) 9%, D당(기타) 5%. 거대 양당이 86%를 점유할 때 소수 정당은 어떻게 되는지 확인해보세요.',
  },
};

// ── 제도별 수업 발문 (제도 키와 동일) ──
const SYSTEM_QUESTIONS = {
  fptp: [
    '1위 정당의 득표율과 의석률을 비교해보자. 얼마나 차이가 나는가?',
    '과반도 안 됐는데 당선된 선거구는 몇 개인가? 왜 가능한가?',
    'C당·D당이 받은 표는 어디로 갔을까? 의석에 반영됐는가?',
    '1위 정당이 의석률을 더 많이 챙기는 이유는 무엇인가?',
  ],
  majority: [
    '1차 투표로 당선된 선거구와 결선이 필요했던 선거구의 차이는?',
    '결선에서 3·4위 표가 어디로 이동했는가? 왜 그리로 이동했는가?',
    '단순다수제 결과와 비교할 때 당선자가 달라진 선거구가 있는가?',
    '결선을 거치면 당선자의 지지율이 어떻게 달라지는가?',
  ],
  multi: [
    '소선거구제와 비교할 때 소수 정당의 의석이 어떻게 달라졌는가?',
    '중선거구 1~4 중 가장 다양한 정당이 의석을 나눈 곳은 어디인가?',
    '선거구 크기가 커지면 왜 소수 정당에 유리해질까?',
    '동트 방식에서 1위 정당이 항상 가장 많은 의석을 받는가?',
  ],
  'multi-plurality': [
    '블록투표와 비례배분(동트)의 결과를 비교해보자. 무엇이 다른가?',
    '상위 3당이 각 1석씩 가져가는 방식은 공정한가?',
    '4위 정당(D당)의 의석이 왜 0이 될 수 있는가?',
    '어떤 정당이 가장 전략적으로 이득을 볼 수 있는가?',
  ],
  pr: [
    '득표율과 의석률이 가장 비슷한 정당과 가장 차이 나는 정당은?',
    '봉쇄조항을 3%로 적용하면 어떤 변화가 생기는가?',
    '소수 정당(D당)의 대표성이 다른 제도에 비해 얼마나 높아졌는가?',
    '"최대잔여 방식"과 "동트 방식"에서 결과가 달라지는 경우는?',
  ],
  local: [
    '같은 정당 후보끼리 경쟁하면 어떤 문제가 생기는가?',
    '각 정당은 몇 명의 후보를 내는 것이 유리했는가?',
    '소수 정당(C당)이 후보를 1명만 내서 당선된 이유는?',
    'D당은 표를 얻었지만 왜 한 석도 얻지 못했는가?',
    '득표수가 많은 정당이 반드시 의석도 많이 얻는가?',
  ],
  mixed: [
    '지역구 결과와 비례 결과가 어떻게 다른가?',
    '지역구 의석 비율을 높이면 어떤 정당에 유리해지는가?',
    '비례 의석을 늘리면 득표율과 의석률의 차이가 어떻게 달라지는가?',
    '병립형과 순수 비례대표제의 결과를 비교해보자.',
  ],
  compare: [
    '같은 득표율인데 왜 제도마다 의석 수가 달라지는가?',
    '1위 정당에 가장 유리한 제도와 가장 불리한 제도는?',
    '소수 정당에 가장 유리한 제도는? 왜 그런가?',
    '득표율과 의석률이 가장 가까운 제도는 무엇인가?',
    '선거제도를 바꾸는 것은 단순한 절차 변경인가, 정치적 결과를 바꾸는 일인가?',
  ],
};

/* ─────────────────────────────────────────────
   2. 전역 상태
───────────────────────────────────────────── */
let state = {
  nation: '세종국',
  totalSeats: 12,
  numParties: 4,
  prMethod: 'largest-remainder', // 'largest-remainder' | 'dhondt'
  threshold: 0,                  // 봉쇄조항 (%)
  parties: [],                   // { name, color, vote, ideology }
  districts: [],                 // 12×n 배열 (각 선거구 정당별 득표율)
  results: null,                 // 계산 결과 캐시
  showDesc: true,                // 설명 카드 표시 여부
  activeSystem: 'fptp',          // 현재 선택된 선거제도
  localDistricts: [],            // 기초의회 선거구 데이터
  showCompare: false,            // 전체 비교 모드
  mixedConstituencySeats: 8,     // 병립형 지역구 의석 수 (나머지는 비례)
  activeScenario: null,          // 현재 선택된 시나리오 키 (A/B/C/D 또는 null)
};

/* ─────────────────────────────────────────────
   3. 초기화
───────────────────────────────────────────── */
function initState() {
  state.parties = [];
  for (let i = 0; i < state.numParties; i++) {
    state.parties.push({
      name: PARTY_NAMES_DEFAULT[i] || `P${i + 1}`,
      color: PARTY_COLORS[i],
      vote: PARTY_VOTES_DEFAULT[i] || 0,
      ideology: IDEOLOGY_DEFAULT[i] || 0,
    });
  }
  normalizeVotes();
  state.districts = DISTRICTS_DEFAULT.map(d => adjustDistrictToParties(d, state.numParties));
  // 기초의회 데이터 딥카피
  state.localDistricts = LOCAL_DISTRICTS_DEFAULT.map(d => ({
    ...d,
    candidates: d.candidates.map(c => ({ ...c })),
  }));
}

// 선거구 데이터를 현재 정당 수에 맞게 조정
function adjustDistrictToParties(d, n) {
  let arr = d.slice(0, n);
  // 부족하면 0 추가
  while (arr.length < n) arr.push(0);
  // 합계를 100으로 맞춤
  const sum = arr.reduce((a, b) => a + b, 0);
  if (sum === 0) return arr.map(() => Math.floor(100 / n));
  return arr.map(v => Math.round(v * 100 / sum));
}

// 정당 득표율 합계를 100으로 정규화
function normalizeVotes() {
  const sum = state.parties.reduce((a, p) => a + p.vote, 0);
  if (sum === 0) return;
  // 이미 100이면 패스
}

/* ─────────────────────────────────────────────
   4. UI 렌더링 — 설정 패널
───────────────────────────────────────────── */

// 정당 입력 행 렌더링
function renderPartyInputs() {
  const container = document.getElementById('party-inputs');
  container.innerHTML = '';
  state.parties.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'party-row';
    row.innerHTML = `
      <input type="color" class="party-color-dot" data-idx="${i}" value="${p.color}" title="색상 선택" />
      <input type="text" class="party-name-input" data-idx="${i}" value="${p.name}" maxlength="6" placeholder="정당명" />
      <input type="number" class="party-vote-input" data-idx="${i}" value="${p.vote}" min="0" max="100" step="1" />
      <span class="party-pct-label">%</span>
    `;
    container.appendChild(row);
  });

  // 이벤트 바인딩
  container.querySelectorAll('.party-color-dot').forEach(el => {
    el.addEventListener('input', e => {
      state.parties[+e.target.dataset.idx].color = e.target.value;
      updateVoteTotal();
    });
  });
  container.querySelectorAll('.party-name-input').forEach(el => {
    el.addEventListener('input', e => {
      state.parties[+e.target.dataset.idx].name = e.target.value;
      updateHeaderMeta();
    });
  });
  container.querySelectorAll('.party-vote-input').forEach(el => {
    el.addEventListener('input', e => {
      state.parties[+e.target.dataset.idx].vote = parseFloat(e.target.value) || 0;
      updateVoteTotal();
    });
  });
  updateVoteTotal();
}

// 득표율 합계 표시
function updateVoteTotal() {
  const total = state.parties.reduce((a, p) => a + (parseFloat(p.vote) || 0), 0);
  const numEl = document.getElementById('vote-total-num');
  const statusEl = document.getElementById('vote-total-status');
  const wrap = document.getElementById('vote-total-display');
  numEl.textContent = total.toFixed(1);
  wrap.className = 'vote-total';
  if (Math.abs(total - 100) < 0.01) {
    wrap.classList.add('ok');
    statusEl.textContent = '✅ 100% 완료';
  } else if (total > 100) {
    wrap.classList.add('over');
    statusEl.textContent = `⛔ ${(total - 100).toFixed(1)}% 초과`;
  } else {
    wrap.classList.add('under');
    statusEl.textContent = `⚠️ ${(100 - total).toFixed(1)}% 부족`;
  }
}

// 선거구 편집 테이블 렌더링
function renderDistrictEditor() {
  const container = document.getElementById('district-inputs');
  container.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'district-edit-table';

  // 헤더
  let headerHTML = '<tr><th>선거구</th>';
  state.parties.forEach(p => { headerHTML += `<th>${p.name}</th>`; });
  headerHTML += '<th>계</th></tr>';
  table.innerHTML = `<thead>${headerHTML}</thead>`;

  const tbody = document.createElement('tbody');
  state.districts.forEach((d, di) => {
    const tr = document.createElement('tr');
    let rowHTML = `<td style="text-align:center;color:var(--text-muted)">${di + 1}</td>`;
    d.forEach((v, pi) => {
      rowHTML += `<td><input type="number" min="0" max="100" value="${v}" data-d="${di}" data-p="${pi}" /></td>`;
    });
    const sum = d.reduce((a, b) => a + b, 0);
    rowHTML += `<td id="dsum-${di}" style="text-align:center;color:${Math.abs(sum - 100) < 1 ? 'var(--success)' : 'var(--danger)'}">${sum}</td>`;
    tr.innerHTML = rowHTML;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  // 이벤트
  container.querySelectorAll('input[type=number]').forEach(el => {
    el.addEventListener('input', e => {
      const di = +e.target.dataset.d;
      const pi = +e.target.dataset.p;
      state.districts[di][pi] = parseFloat(e.target.value) || 0;
      const sum = state.districts[di].reduce((a, b) => a + b, 0);
      const sumEl = document.getElementById(`dsum-${di}`);
      if (sumEl) {
        sumEl.textContent = sum;
        sumEl.style.color = Math.abs(sum - 100) < 1 ? 'var(--success)' : 'var(--danger)';
      }
    });
  });
}

// 헤더 메타 업데이트
function updateHeaderMeta() {
  document.getElementById('display-nation').textContent = state.nation;
  document.getElementById('display-seats').textContent = `${state.totalSeats}석`;
  document.getElementById('display-parties').textContent = `${state.numParties}개`;
}

/* ─────────────────────────────────────────────
   5. 계산 로직
───────────────────────────────────────────── */

/**
 * 소선거구제 + 단순다수대표제 (FPTP)
 * 각 선거구에서 득표율이 가장 높은 정당이 1석 획득
 */
function calculateFPTP() {
  const n = state.numParties;
  const seats = new Array(n).fill(0);
  const districtResults = [];
  let wastedVotes = 0; // 낙선자 득표 합계 (%)

  state.districts.forEach((d, di) => {
    // 최고 득표 정당 찾기 (동률이면 인덱스 낮은 정당 우선)
    let winIdx = 0;
    for (let i = 1; i < n; i++) {
      if (d[i] > d[winIdx]) winIdx = i;
    }
    seats[winIdx]++;
    // 낙선 표 누적
    const totalDist = d.reduce((a, b) => a + b, 0);
    wastedVotes += totalDist - d[winIdx];

    districtResults.push({
      districtIdx: di,
      votes: [...d],
      winnerIdx: winIdx,
      needRunoff: false,
    });
  });

  const totalDistricts = state.districts.length;
  const wastedPct = (wastedVotes / (totalDistricts * 100)) * 100;

  return { seats, districtResults, wastedPct, method: 'fptp' };
}

/**
 * 소선거구제 + 절대다수대표제 (Majority Runoff)
 * 과반(>50%) 없으면 1·2위 결선투표
 * 결선에서 탈락 정당 표는 이념 좌표 기준 가까운 쪽으로 이동
 */
function calculateMajorityRunoff() {
  const n = state.numParties;
  const seats = new Array(n).fill(0);
  const districtResults = [];
  let wastedVotes = 0;

  state.districts.forEach((d, di) => {
    const sorted = d.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    const first = sorted[0];
    const second = sorted[1];

    let winIdx;
    let needRunoff = false;
    let runoffDetail = null;

    if (first.v > 50) {
      // 1차 과반 당선
      winIdx = first.i;
      const totalDist = d.reduce((a, b) => a + b, 0);
      wastedVotes += totalDist - d[winIdx];
    } else {
      // 결선투표
      needRunoff = true;
      const finalist1 = first.i;
      const finalist2 = second.i;
      let votes1 = d[finalist1];
      let votes2 = d[finalist2];

      // 탈락 정당 표 이동
      const transfers = [];
      for (let i = 0; i < n; i++) {
        if (i === finalist1 || i === finalist2) continue;
        if (d[i] === 0) continue;
        const ideo1 = state.parties[finalist1].ideology;
        const ideo2 = state.parties[finalist2].ideology;
        const ideoI = state.parties[i].ideology;
        const dist1 = Math.abs(ideoI - ideo1);
        const dist2 = Math.abs(ideoI - ideo2);
        let transfer1, transfer2;
        if (dist1 < dist2) {
          transfer1 = d[i];
          transfer2 = 0;
        } else if (dist2 < dist1) {
          transfer1 = 0;
          transfer2 = d[i];
        } else {
          // 동거리: 반반
          transfer1 = d[i] / 2;
          transfer2 = d[i] / 2;
        }
        votes1 += transfer1;
        votes2 += transfer2;
        transfers.push({ fromIdx: i, to1: transfer1, to2: transfer2 });
      }

      winIdx = votes1 >= votes2 ? finalist1 : finalist2;
      runoffDetail = { finalist1, finalist2, votes1, votes2, transfers };
      // 낙선 표: 탈락 정당 표 합산
      const loserIdx = winIdx === finalist1 ? finalist2 : finalist1;
      const totalDist = d.reduce((a, b) => a + b, 0);
      wastedVotes += totalDist - d[winIdx];
    }

    seats[winIdx]++;
    districtResults.push({
      districtIdx: di,
      votes: [...d],
      winnerIdx: winIdx,
      needRunoff,
      runoffDetail,
    });
  });

  const totalDistricts = state.districts.length;
  const wastedPct = (wastedVotes / (totalDistricts * 100)) * 100;

  return { seats, districtResults, wastedPct, method: 'majority' };
}

/**
 * 중대선거구제 (Multi-Member District)
 * 12개 소선거구 → 4개 중선거구(각 3석)
 * 의석 배분: 동트 방식
 */
function calculateMultiMemberDistrict() {
  const n = state.numParties;
  const seatsPerDistrict = 3; // 각 중선거구 의석
  const numMD = 4; // 중선거구 수
  const seats = new Array(n).fill(0);
  const mdResults = [];

  for (let md = 0; md < numMD; md++) {
    // 중선거구에 포함된 소선거구 인덱스
    const districtIndices = [md * 3, md * 3 + 1, md * 3 + 2];
    // 평균 득표율 계산
    const avgVotes = new Array(n).fill(0);
    districtIndices.forEach(di => {
      if (di < state.districts.length) {
        state.districts[di].forEach((v, pi) => { avgVotes[pi] += v; });
      }
    });
    const cnt = districtIndices.filter(di => di < state.districts.length).length;
    const avgPct = avgVotes.map(v => v / cnt);

    // 동트 방식으로 seatsPerDistrict석 배분
    const mdSeats = calculateDHondt(avgPct, seatsPerDistrict);
    mdSeats.forEach((s, i) => { seats[i] += s; });

    mdResults.push({
      mdIdx: md,
      districtIndices,
      avgPct,
      seats: mdSeats,
    });
  }

  return { seats, mdResults, method: 'multi' };
}

/**
 * 중대선거구제 + 단순다수 (블록투표, Block Voting)
 * 각 중선거구(3석)에서 득표율 상위 3개 정당이 각 1석 획득
 * 동률이면 인덱스 낮은 정당 우선
 */
function calculateBlockVoting() {
  const n = state.numParties;
  const seatsPerDistrict = 3;
  const numMD = 4;
  const seats = new Array(n).fill(0);
  const mdResults = [];

  for (let md = 0; md < numMD; md++) {
    const districtIndices = [md * 3, md * 3 + 1, md * 3 + 2];
    const avgVotes = new Array(n).fill(0);
    districtIndices.forEach(di => {
      if (di < state.districts.length) {
        state.districts[di].forEach((v, pi) => { avgVotes[pi] += v; });
      }
    });
    const cnt = districtIndices.filter(di => di < state.districts.length).length;
    const avgPct = avgVotes.map(v => v / cnt);

    // 득표율 내림차순 정렬 후 상위 seatsPerDistrict개 정당이 각 1석
    const ranked = avgPct
      .map((v, i) => ({ v, i }))
      .sort((a, b) => b.v - a.v || a.i - b.i);
    const mdSeats = new Array(n).fill(0);
    for (let j = 0; j < Math.min(seatsPerDistrict, n); j++) {
      if (ranked[j].v > 0) mdSeats[ranked[j].i]++;
    }
    mdSeats.forEach((s, i) => { seats[i] += s; });
    mdResults.push({ mdIdx: md, districtIndices, avgPct, seats: mdSeats });
  }

  return { seats, mdResults, method: 'block-voting' };
}

/**
 * 비례대표제
 * 전국 득표율 기준 전체 의석 배분
 * 봉쇄조항 적용 후 배분
 */
function calculatePR() {
  const n = state.numParties;
  const totalSeats = state.totalSeats;
  const threshold = state.threshold;
  const votes = state.parties.map(p => p.vote);
  const totalVotes = votes.reduce((a, b) => a + b, 0);

  // 봉쇄조항 적용: 미달 정당 제외
  const eligible = votes.map((v, i) => (v / totalVotes) * 100 >= threshold ? i : -1).filter(i => i >= 0);
  const eligibleVotes = votes.map((v, i) => eligible.includes(i) ? v : 0);
  const wastedVotes = votes.map((v, i) => eligible.includes(i) ? 0 : v);
  const wastedPct = wastedVotes.reduce((a, b) => a + b, 0);

  let seatsArr;
  if (state.prMethod === 'dhondt') {
    seatsArr = calculateDHondt(eligibleVotes, totalSeats);
  } else {
    seatsArr = calculateLargestRemainder(eligibleVotes, totalSeats);
  }

  // 이상적 의석 수 (참고용)
  const eligibleSum = eligibleVotes.reduce((a, b) => a + b, 0);
  const idealSeats = eligibleVotes.map(v => eligibleSum > 0 ? (v / eligibleSum) * totalSeats : 0);

  return { seats: seatsArr, idealSeats, wastedPct, eligible, method: 'pr' };
}

/**
 * 병립형 혼합제 계산
 * 지역구(소선거구 단순다수) + 비례대표 의석을 독립적으로 배분하여 합산
 */
function calculateMixed() {
  const n = state.numParties;
  const totalSeats = state.totalSeats;
  const consCount = Math.min(state.mixedConstituencySeats, state.districts.length);
  const prCount   = totalSeats - consCount;

  // 지역구: 앞 consCount개 선거구에서 FPTP
  const consSeats = new Array(n).fill(0);
  const consResults = [];
  for (let di = 0; di < consCount; di++) {
    const d = state.districts[di];
    const winIdx = d.reduce((best, v, i) => v > d[best] ? i : best, 0);
    consSeats[winIdx]++;
    consResults.push({ districtIdx: di, votes: [...d], winnerIdx: winIdx, needRunoff: false });
  }

  // 비례: 전국 득표율 기준
  const votes = state.parties.map(p => parseFloat(p.vote) || 0);
  const eligibleVotes = votes.slice(); // 봉쇄조항 없이 단순화
  const prSeats = prCount > 0
    ? (state.prMethod === 'dhondt'
        ? calculateDHondt(eligibleVotes, prCount)
        : calculateLargestRemainder(eligibleVotes, prCount))
    : new Array(n).fill(0);

  const seats = consSeats.map((c, i) => c + prSeats[i]);
  return { seats, consSeats, prSeats, consResults, consCount, prCount, method: 'mixed' };
}

/**
 * 동트(D'Hondt) 방식으로 totalSeats개 배분
 * @param {number[]} votes - 각 정당 득표율/수 배열
 * @param {number} totalSeats - 배분할 총 의석 수
 */
function calculateDHondt(votes, totalSeats) {
  const n = votes.length;
  const seats = new Array(n).fill(0);
  // 각 정당의 몫 목록: [득표/1, 득표/2, 득표/3 ...]
  for (let s = 0; s < totalSeats; s++) {
    // 현재 각 정당의 몫(votes / (seats + 1)) 중 최대 찾기
    let bestIdx = 0;
    let bestQuotient = -1;
    for (let i = 0; i < n; i++) {
      const q = votes[i] / (seats[i] + 1);
      // 동률이면 인덱스 낮은 정당 우선
      if (q > bestQuotient) {
        bestQuotient = q;
        bestIdx = i;
      }
    }
    seats[bestIdx]++;
  }
  return seats;
}

/**
 * 최대잔여(Largest Remainder) 방식으로 totalSeats 개 배분
 * @param {number[]} votes - 각 정당 득표율/수 배열
 * @param {number} totalSeats - 배분할 총 의석 수
 * @returns {number[]} 각 정당 의석 수
 */
function calculateLargestRemainder(votes, totalSeats) {
  const total = votes.reduce((a, b) => a + b, 0);
  if (total === 0) return new Array(votes.length).fill(0);

  // 이상적 의석 수
  const ideal = votes.map(v => (v / total) * totalSeats);
  // 정수 부분 먼저 배분
  const seats = ideal.map(v => Math.floor(v));
  const remainders = ideal.map((v, i) => ({ remainder: v - seats[i], idx: i }));
  // 남은 의석 수
  let remaining = totalSeats - seats.reduce((a, b) => a + b, 0);
  // 잔여가 큰 순서대로 1석씩 배분 (동률이면 인덱스 낮은 정당 우선)
  remainders.sort((a, b) => b.remainder - a.remainder || a.idx - b.idx);
  for (let i = 0; i < remaining; i++) {
    seats[remainders[i].idx]++;
  }
  return seats;
}

/**
 * 전체 비교 결과 계산
 * 4개 제도의 의석 배분 결과를 한꺼번에 반환
 */
/* ─────────────────────────────────────────────
   6. 유틸 함수
───────────────────────────────────────────── */

// 의석률 계산
function seatPct(seats, total) {
  return total > 0 ? (seats / total) * 100 : 0;
}

// 전체 득표율 합계 검증
function validateVotes() {
  const total = state.parties.reduce((a, p) => a + (parseFloat(p.vote) || 0), 0);
  return Math.abs(total - 100) < 0.5;
}

// 토스트 메시지
function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add('hidden'), duration);
}

// 숫자 포맷
function fmt(n, digits = 1) {
  return Number(n).toFixed(digits);
}

// 색상 점 HTML
function colorDot(color, size = 12) {
  return `<span class="color-dot" style="background:${color};width:${size}px;height:${size}px;border-radius:50%;display:inline-block;flex-shrink:0"></span>`;
}

// 용어 툴팁 래퍼 — data-tip 속성으로 CSS 툴팁 표시
function tip(word, tooltip) {
  return `<span data-tip="${tooltip}">${word}</span>`;
}

// 사표 시각화 바 HTML 생성
// wonPct: 당선자 득표율 비율 (0~100)
function wastedVisBar(wonPct) {
  const w = Math.round(wonPct);
  const l = 100 - w;
  return `<div class="wasted-vis">
    <div class="wasted-vis-label">당선표 vs ${tip('사표', '낙선자에게 간 표. 의석에 반영되지 않습니다.')}</div>
    <div class="wasted-vis-bar">
      <div class="wasted-vis-won" style="width:${w}%">${w}%</div>
      <div class="wasted-vis-lost">사표 ${l}%</div>
    </div>
  </div>`;
}

/* ─────────────────────────────────────────────
   7. 렌더링 — 의석 아이콘
───────────────────────────────────────────── */

/**
 * 의석 아이콘 HTML 생성
 * @param {number[]} seats - 각 정당 의석 수
 * @param {object[]} parties - 정당 배열
 * @param {number} delay - 애니메이션 시작 딜레이 (ms)
 */
function renderSeatChart(seats, parties, delay = 0) {
  const total = seats.reduce((a, b) => a + b, 0);
  let html = '<div class="seat-icons">';
  let iconIdx = 0;
  seats.forEach((s, pi) => {
    for (let j = 0; j < s; j++) {
      const animDelay = (iconIdx * 40 + delay) + 'ms';
      html += `<div class="seat-icon" style="background:${parties[pi].color};animation-delay:${animDelay}" title="${parties[pi].name}">${parties[pi].name.charAt(0)}</div>`;
      iconIdx++;
    }
  });
  html += '</div>';
  return html;
}

/* ─────────────────────────────────────────────
   8. 렌더링 — 결과 테이블
───────────────────────────────────────────── */

// 공통 결과 테이블 (득표율 / 의석 / 의석률 / 차이)
function renderResultTable(seats, parties, totalSeats) {
  const total = seats.reduce((a, b) => a + b, 0);
  let html = `
    <table class="result-table">
      <thead><tr>
        <th>정당</th>
        <th>득표율</th>
        <th>의석 수</th>
        <th>의석률</th>
        <th>차이</th>
      </tr></thead>
      <tbody>
  `;
  parties.forEach((p, i) => {
    const votePct = parseFloat(p.vote) || 0;
    const sp = seatPct(seats[i], totalSeats);
    const diff = sp - votePct;
    const diffClass = diff > 0.5 ? 'diff-positive' : diff < -0.5 ? 'diff-negative' : 'diff-zero';
    const diffStr = diff > 0 ? `+${fmt(diff)}` : fmt(diff);
    html += `<tr>
      <td><div class="party-cell">${colorDot(p.color)}${p.name}</div></td>
      <td>${fmt(votePct)}%</td>
      <td><strong>${seats[i]}</strong></td>
      <td>${fmt(sp)}%</td>
      <td class="${diffClass}">${diffStr}%p</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

/* ─────────────────────────────────────────────
   9. 렌더링 — 소선거구제 탭
───────────────────────────────────────────── */

/**
 * 선거구 지도 렌더링 — 3열×4행 고정 직사각형 지도 (FPTP / 절대다수)
 * @param {object[]} districtResults - 선거구별 결과
 * @param {object[]} parties - 정당 배열
 */
function renderDistrictResults(districtResults, parties) {
  let html = '<div class="district-map">';
  districtResults.forEach(dr => {
    const winner = parties[dr.winnerIdx];
    const distVotes = dr.votes;
    const maxV = Math.max(...distVotes);

    html += `<div class="district-card" style="border-color:${winner.color};--winner-color:${winner.color}">
      <div class="district-card-bg" style="background:${winner.color}"></div>
      <div class="district-card-title">제${dr.districtIdx + 1}구</div>
      <div class="district-winner-badge" style="background:${winner.color}">${winner.name}</div>`;

    if (dr.needRunoff) {
      html += `<div class="district-runoff-badge">⚡ 결선</div>`;
    }

    distVotes.forEach((v, pi) => {
      const barW = maxV > 0 ? (v / maxV) * 100 : 0;
      html += `<div class="mini-bar-row">
        <span class="mini-bar-label" style="color:${parties[pi].color}">${parties[pi].name.charAt(0)}</span>
        <div class="mini-bar-wrap"><div class="mini-bar-fill" style="width:${barW}%;background:${parties[pi].color}"></div></div>
        <span class="mini-bar-val">${fmt(v, 0)}%</span>
      </div>`;
    });
    html += `</div>`;
  });
  html += '</div>';
  return html;
}

function renderFPTP(result) {
  const { seats, districtResults, wastedPct } = result;
  const container = document.getElementById('fptp-results');
  let html = '';

  html += `<div class="section-title">📍 선거구별 결과</div>`;
  html += renderDistrictResults(districtResults, state.parties);

  // 사표 시각화
  html += wastedVisBar(100 - wastedPct);

  html += `<div class="section-title">💺 의석 배분</div>`;
  html += renderSeatChart(seats, state.parties);
  html += renderResultTable(seats, state.parties, state.totalSeats);

  html += `<div class="interpretation"><ul>
    <li>단순다수대표제에서는 과반을 얻지 못해도 1등이면 당선됩니다.</li>
    <li>득표율보다 의석률이 크게 높아지는 정당이 생길 수 있습니다.</li>
    <li>2등 이하 표는 의석으로 연결되지 않아 ${tip('사표', '낙선자에게 간 표. 의석에 반영되지 않습니다.')}가 많이 발생할 수 있습니다.</li>
    <li>이번 선거의 추정 ${tip('사표율', '전체 유효 표 중 낙선자에게 간 표의 비율')}: <strong>${fmt(wastedPct)}%</strong></li>
  </ul></div>`;

  container.innerHTML = html;
}

/* ─────────────────────────────────────────────
   10. 렌더링 — 절대다수대표제 탭
───────────────────────────────────────────── */

function renderMajority(result) {
  const { seats, districtResults, wastedPct } = result;
  const container = document.getElementById('majority-results');
  const parties = state.parties;
  let html = '';

  const runoffCount = districtResults.filter(d => d.needRunoff).length;
  const directCount = districtResults.length - runoffCount;

  // ── 1. 선거구 지도 (항상 먼저) ──
  html += `<div class="section-title">📍 선거구별 결과
    <span style="font-size:0.75rem;font-weight:400;color:var(--text-muted);margin-left:8px">
      1차 당선 ${directCount}개 · 결선투표 ${runoffCount}개
    </span>
  </div>`;
  html += renderDistrictResults(districtResults, parties);

  // ── 2. 결선투표 상세 — 3×4 지도 형태 ──
  if (runoffCount > 0) {
    html += `<div class="runoff-section">
      <div class="runoff-title">⚡ 결선투표 상세 (${runoffCount}개 선거구) — 1·2위만 진출</div>
      <div class="district-map" style="margin-top:8px">`;

    districtResults.filter(d => d.needRunoff).forEach(dr => {
      const rd = dr.runoffDetail;
      if (!rd) return;
      const p1     = parties[rd.finalist1];
      const p2     = parties[rd.finalist2];
      const winner = parties[dr.winnerIdx];
      const maxV   = Math.max(rd.votes1, rd.votes2);

      html += `<div class="district-card" style="border-color:${winner.color}">
        <div class="district-card-bg" style="background:${winner.color}"></div>
        <div class="district-card-title">제${dr.districtIdx + 1}구 결선</div>
        <div class="district-winner-badge" style="background:${winner.color}">${winner.name} 당선</div>`;

      // 결선 1위·2위 막대
      [{ p: p1, v: rd.votes1 }, { p: p2, v: rd.votes2 }].forEach(({ p, v }) => {
        const barW = maxV > 0 ? (v / maxV) * 100 : 0;
        html += `<div class="mini-bar-row">
          <span class="mini-bar-label" style="color:${p.color};text-shadow:0 0 4px rgba(0,0,0,0.8)">${p.name.charAt(0)}</span>
          <div class="mini-bar-wrap"><div class="mini-bar-fill" style="width:${barW}%;background:${p.color}"></div></div>
          <span class="mini-bar-val">${fmt(v, 1)}%</span>
        </div>`;
      });

      // 표 이동 요약
      if (rd.transfers && rd.transfers.length > 0) {
        const transferSummary = rd.transfers.map(t => {
          const fromP = parties[t.fromIdx];
          if (t.to1 > 0) return `<span style="color:${fromP.color}">${fromP.name}</span>→${colorDot(p1.color, 8)}`;
          if (t.to2 > 0) return `<span style="color:${fromP.color}">${fromP.name}</span>→${colorDot(p2.color, 8)}`;
          return '';
        }).filter(Boolean).join(' ');
        html += `<div style="font-size:0.68rem;margin-top:4px;color:var(--text-muted)">${transferSummary}</div>`;
      }
      html += `</div>`;
    });

    html += `</div></div>`; // .district-map, .runoff-section
  }

  // ── 3. 의석 배분 ──
  html += `<div class="section-title">💺 의석 배분</div>`;
  html += renderSeatChart(seats, parties);
  html += renderResultTable(seats, parties, state.totalSeats);

  html += `<div class="interpretation"><ul>
    <li>절대다수대표제에서는 과반(50%+1) 지지를 받은 후보만 1차에서 당선됩니다.</li>
    <li>결선투표에서는 탈락한 후보의 지지층이 어디로 이동하는지가 중요합니다.</li>
    <li>단순다수대표제와 다른 당선 결과가 나올 수 있습니다.</li>
  </ul></div>`;

  container.innerHTML = html;
}

/* ─────────────────────────────────────────────
   11. 렌더링 — 중대선거구제 탭
───────────────────────────────────────────── */

/**
 * 중대선거구 지도 공통 렌더링 함수
 * 각 중선거구를 섹션 헤더 + 3열 소선거구 카드로 표시
 * @param {object[]} mdResults - 중선거구 결과 배열
 * @param {string[]} mdColors  - 중선거구별 색상
 * @param {string}   method    - 배분 방식 설명 ('비례배분(동트)' | '단순다수(블록투표)')
 */
/**
 * @param {boolean} highlightWinner - true면 소선거구 내 1위 정당을 시각적으로 강조
 *   블록투표(단순다수) 방식에서만 true로 설정
 */
function renderMDMap(mdResults, mdColors, method, highlightWinner = false) {
  const parties = state.parties;
  let html = `<div class="section-title">🗺 중선거구 지도 — ${method}</div>`;

  mdResults.forEach(md => {
    const mdColor = mdColors[md.mdIdx];

    // 헤더: 의석 배분 — 검정 텍스트 + 색상 점으로 가독성 확보
    const seatDots = md.seats.flatMap((s, pi) =>
      Array(s).fill(`<span class="md-dot" style="background:${parties[pi].color};border:1.5px solid rgba(0,0,0,0.25)" title="${parties[pi].name}"></span>`)
    ).join('');
    const seatText = md.seats.map((s, pi) => s > 0
      ? `<span style="color:#000;font-weight:700;display:inline-flex;align-items:center;gap:3px">
           <span style="width:10px;height:10px;border-radius:50%;background:${parties[pi].color};display:inline-block;border:1px solid rgba(0,0,0,0.2)"></span>
           ${parties[pi].name} ${s}석
         </span>`
      : '').filter(Boolean).join('<span style="color:rgba(0,0,0,0.4)"> · </span>');

    html += `
      <div class="md-section" style="border-color:${mdColor}">
        <div class="md-section-header" style="background:${mdColor}">
          <span style="color:#000">중선거구 ${md.mdIdx + 1}
            <small style="font-weight:400;margin-left:4px">(제${md.districtIndices.map(i=>i+1).join('·')}구)</small>
          </span>
          <div class="md-section-seats">
            <div class="md-dot-row">${seatDots}</div>
            <div style="margin-top:2px">${seatText}</div>
          </div>
        </div>
        <div class="md-section-body">`;

    // 소선거구 카드 3개
    md.districtIndices.forEach(di => {
      if (di >= state.districts.length) { html += `<div></div>`; return; }
      const d = state.districts[di];
      const maxV = Math.max(...d);
      const topIdx = d.reduce((best, v, i) => v > d[best] ? i : best, 0);
      const topParty = parties[topIdx];

      // highlightWinner: 블록투표 모드에서는 1위 정당 색으로 카드 테두리 강조
      const cardBorder = highlightWinner ? topParty.color : mdColor;
      const cardBg     = highlightWinner ? topParty.color : mdColor;

      html += `<div class="district-card" style="border-color:${cardBorder};${highlightWinner ? `box-shadow:0 0 10px ${topParty.color}55` : ''}">
        <div class="district-card-bg" style="background:${cardBg}"></div>
        <div class="district-card-title">제${di + 1}구</div>
        <div class="district-winner-badge" style="background:${topParty.color}">${topParty.name} 1위</div>`;

      d.forEach((v, pi) => {
        const isTop   = pi === topIdx;
        const barW    = maxV > 0 ? (v / maxV) * 100 : 0;
        // highlightWinner: 1위 막대는 굵게, 나머지는 흐리게
        const barH    = highlightWinner ? (isTop ? '10px' : '6px') : '6px';
        const barOp   = highlightWinner && !isTop ? '0.35' : '1';
        const labelOp = highlightWinner && !isTop ? '0.4' : '1';

        html += `<div class="mini-bar-row" style="margin-bottom:${highlightWinner && isTop ? '4px' : '2px'}">
          <span class="mini-bar-label" style="color:${parties[pi].color};text-shadow:0 0 4px rgba(0,0,0,0.8);opacity:${labelOp};font-weight:${isTop && highlightWinner ? '700' : '400'}">${parties[pi].name.charAt(0)}</span>
          <div class="mini-bar-wrap" style="height:${barH}"><div class="mini-bar-fill" style="width:${barW}%;background:${parties[pi].color};opacity:${barOp}"></div></div>
          <span class="mini-bar-val" style="color:var(--text);opacity:${labelOp};font-weight:${isTop && highlightWinner ? '700' : '400'}">${fmt(v, 0)}%</span>
        </div>`;
      });
      html += `</div>`;
    });

    html += `</div>`; // .md-section-body

    // ── 중선거구 평균 득표율 요약 행 ──
    // avgPct는 calculateMultiMemberDistrict / calculateBlockVoting에서 계산된 값
    const maxAvg = Math.max(...md.avgPct);
    html += `<div class="md-avg-row">
      <span class="md-avg-label">중선거구 평균</span>
      <div class="md-avg-bars">`;
    md.avgPct.forEach((v, pi) => {
      const barW = maxAvg > 0 ? (v / maxAvg) * 100 : 0;
      html += `<div class="md-avg-party">
        <span class="md-avg-name" style="color:${parties[pi].color}">${parties[pi].name}</span>
        <div class="mini-bar-wrap" style="height:7px"><div class="mini-bar-fill" style="width:${barW}%;background:${parties[pi].color}"></div></div>
        <span class="md-avg-val">${fmt(v, 1)}%</span>
      </div>`;
    });
    html += `</div></div>`; // .md-avg-bars, .md-avg-row

    html += `</div>`; // .md-section
  });

  return html;
}

function renderMulti(result) {
  const { seats, mdResults } = result;
  const container = document.getElementById('multi-results');
  const parties = state.parties;
  const mdColors = ['#38bdf8', '#a78bfa', '#34d399', '#fb923c'];
  let html = '';

  html += renderMDMap(mdResults, mdColors, '비례배분 (동트 방식)');

  html += `<div class="section-title">💺 전체 의석 배분</div>`;
  html += renderSeatChart(seats, parties);
  html += renderResultTable(seats, parties, state.totalSeats);

  html += `<div class="interpretation"><ul>
    <li>한 선거구에서 여러 명을 뽑기 때문에 소수 정당도 의석을 얻을 가능성이 커집니다.</li>
    <li>소선거구제보다 득표율과 의석률의 차이가 줄어들 수 있습니다.</li>
    <li>동트 방식: 득표율을 1, 2, 3…으로 나눈 몫 중 큰 순서대로 3석 배분.</li>
  </ul></div>`;

  container.innerHTML = html;
}

/* ─────────────────────────────────────────────
   12. 렌더링 — 비례대표제 탭
───────────────────────────────────────────── */

function renderPR(result) {
  const { seats, idealSeats, wastedPct, eligible } = result;
  const container = document.getElementById('pr-results');
  let html = '';

  html += `<div class="section-title">📊 득표율 → 의석 배분 (${state.prMethod === 'dhondt' ? '동트 방식' : '최대잔여 방식'})</div>`;

  // 봉쇄조항 표시
  if (state.threshold > 0) {
    const excluded = state.parties.filter((_, i) => !eligible.includes(i));
    if (excluded.length > 0) {
      html += `<div class="runoff-section"><div class="runoff-title">🚫 ${tip('봉쇄조항', '일정 득표율 미만의 정당을 의석 배분에서 제외하는 규정입니다.')} ${state.threshold}% 미달 — 배분 제외</div>`;
      excluded.forEach(p => {
        html += `<div style="font-size:0.78rem;margin:2px 0">${colorDot(p.color)} ${p.name} (득표율 ${fmt(p.vote)}%) <span class="wasted-tag">사표</span></div>`;
      });
      html += `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">사표 합계: ${fmt(wastedPct)}%</div></div>`;
    }
  }

  // 정당별 상세
  html += `<div class="pr-rows">`;
  state.parties.forEach((p, i) => {
    const votePct = parseFloat(p.vote) || 0;
    const isEligible = eligible.includes(i);
    html += `<div class="pr-row" style="opacity:${isEligible ? 1 : 0.4}">
      <div class="pr-party-name">${colorDot(p.color)} ${p.name} ${!isEligible ? '<span class="wasted-tag">제외</span>' : ''}</div>
      <div class="mini-bar-row">
        <span style="font-size:0.72rem;color:var(--text-muted);width:48px">득표율</span>
        <div class="mini-bar-wrap" style="height:8px"><div class="mini-bar-fill" style="width:${votePct}%;background:${p.color}"></div></div>
        <span style="width:36px;text-align:right;font-size:0.72rem">${fmt(votePct)}%</span>
      </div>
      <div class="mini-bar-row">
        <span style="font-size:0.72rem;color:var(--text-muted);width:48px">의석률</span>
        <div class="mini-bar-wrap" style="height:8px"><div class="mini-bar-fill" style="width:${seatPct(seats[i], state.totalSeats)}%;background:${p.color}"></div></div>
        <span style="width:36px;text-align:right;font-size:0.72rem">${fmt(seatPct(seats[i], state.totalSeats))}%</span>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-top:1px">
        이상적 의석: ${fmt(idealSeats[i], 2)}석 → 실제 배분: <strong>${seats[i]}석</strong>
      </div>
    </div>`;
  });
  html += `</div>`;

  html += `<div class="section-title">💺 의석 배분</div>`;
  html += renderSeatChart(seats, state.parties);
  html += renderResultTable(seats, state.parties, state.totalSeats);

  html += `<div class="interpretation"><ul>
    <li>비례대표제는 정당 득표율과 의석률을 가깝게 만드는 제도입니다.</li>
    <li>소수 정당의 대표성이 높아질 수 있습니다.</li>
    <li>다만 정당이 많아지면 의회 구성이 복잡해질 수 있습니다.</li>
    ${state.threshold > 0 ? `<li>봉쇄조항 ${state.threshold}% 적용 시 사표율: <strong>${fmt(wastedPct)}%</strong></li>` : ''}
  </ul></div>`;

  container.innerHTML = html;
}

/* ─────────────────────────────────────────────
   12-b. 렌더링 — 중대선거구 + 블록투표
───────────────────────────────────────────── */

/**
 * 중대선거구 + 단순다수(블록투표) 결과 렌더링
 * renderMDMap() 공통 함수 사용
 */
function renderMultiPlurality(result) {
  const { seats, mdResults } = result;
  const container = document.getElementById('multi-plurality-results');
  const parties = state.parties;
  const mdColors = ['#38bdf8', '#a78bfa', '#34d399', '#fb923c'];
  let html = '';

  html += renderMDMap(mdResults, mdColors, '단순다수 (블록투표)', true);

  html += `<div class="section-title">💺 전체 의석 배분</div>`;
  html += renderSeatChart(seats, parties);
  html += renderResultTable(seats, parties, state.totalSeats);

  html += `<div class="interpretation"><ul>
    <li>블록투표: 각 중선거구에서 득표율 상위 3개 정당이 각 1석을 가져갑니다.</li>
    <li>비례 배분(동트)과 달리 득표율이 낮아도 3위 안에 들면 의석을 얻을 수 있습니다.</li>
    <li>소수 정당(4위 이하)은 의석을 얻기 어렵습니다.</li>
  </ul></div>`;

  container.innerHTML = html;
}

/* ─────────────────────────────────────────────
   기초의회 — 계산 / 렌더링 / 편집 UI
───────────────────────────────────────────── */

/**
 * 기초의회 계산: 후보자 득표수 기반, 상위 N명 당선
 */
function calculateLocalCouncil() {
  const n = state.numParties;
  const partySeatTotals = new Array(n).fill(0);
  const partyVoteTotals = new Array(n).fill(0);
  const districtResults = [];

  state.localDistricts.forEach(district => {
    const ranked = district.candidates
      .map(c => ({ ...c }))
      .sort((a, b) => b.votes - a.votes || a.partyIdx - b.partyIdx);

    ranked.forEach((c, rank) => {
      c.rank = rank + 1;
      c.isWinner = rank < district.seats;
      if (c.isWinner) partySeatTotals[c.partyIdx]++;
      partyVoteTotals[c.partyIdx] += c.votes;
    });

    districtResults.push({ name: district.name, seats: district.seats, ranked });
  });

  const totalSeats = districtResults.reduce((a, d) => a + d.seats, 0);
  const totalVotes = partyVoteTotals.reduce((a, b) => a + b, 0);

  return { districtResults, partySeatTotals, partyVoteTotals, totalSeats, totalVotes, method: 'local' };
}

/**
 * 기초의회 결과 렌더링
 */
function renderLocalCouncil(result) {
  const container = document.getElementById('local-results');
  if (!container) return;
  const parties = state.parties;
  const { districtResults, partySeatTotals, partyVoteTotals, totalSeats, totalVotes } = result;
  let html = '';

  html += `<div class="section-title">📍 선거구별 후보자 득표 순위</div>`;
  html += `<div class="local-district-grid">`;

  districtResults.forEach(dr => {
    const maxVotes = dr.ranked[0]?.votes || 1;
    html += `<div class="local-district-card">
      <div class="local-district-header">
        <span class="local-district-name">${dr.name}</span>
        <span class="local-seats-badge">${dr.seats}석 배분</span>
      </div>`;

    dr.ranked.forEach((c, rank) => {
      const party = parties[c.partyIdx] || { name: '?', color: '#888' };
      const barW  = (c.votes / maxVotes) * 100;
      if (rank === dr.seats) html += `<div class="local-cutoff"></div>`;
      html += `<div class="local-cand-row ${c.isWinner ? 'winner' : 'loser'}">
        <span class="local-rank-num ${c.isWinner ? 'win' : 'lose'}">${rank + 1}위</span>
        <span class="local-party-pip" style="background:${party.color}"></span>
        <span class="local-cand-name">${c.name}</span>
        <span class="local-party-label" style="color:${party.color}">${party.name}</span>
        <div class="mini-bar-wrap" style="flex:1;height:8px">
          <div class="mini-bar-fill" style="width:${barW}%;background:${party.color};opacity:${c.isWinner ? 1 : 0.4}"></div>
        </div>
        <span class="local-votes-num">${c.votes.toLocaleString()}표</span>
        ${c.isWinner ? `<span class="local-win-check" style="background:${party.color}">✓</span>` : ''}
      </div>`;
    });
    html += `</div>`;
  });
  html += `</div>`;

  html += `<div class="section-title">💺 정당별 의석 · 득표 요약</div>`;
  html += renderSeatChart(partySeatTotals, parties);

  html += `<table class="result-table"><thead><tr>
    <th>정당</th><th>총 득표수</th><th>득표율</th><th>의석 수</th><th>의석률</th><th>차이</th>
  </tr></thead><tbody>`;
  parties.forEach((p, i) => {
    if (!partyVoteTotals[i] && !partySeatTotals[i]) return;
    const vp   = totalVotes > 0 ? (partyVoteTotals[i] / totalVotes * 100) : 0;
    const sp   = totalSeats > 0 ? (partySeatTotals[i] / totalSeats * 100) : 0;
    const diff = sp - vp;
    const dCls = diff > 1 ? 'diff-positive' : diff < -1 ? 'diff-negative' : 'diff-zero';
    html += `<tr>
      <td><div class="party-cell">${colorDot(p.color)}${p.name}</div></td>
      <td>${partyVoteTotals[i].toLocaleString()}표</td>
      <td>${fmt(vp)}%</td>
      <td><strong>${partySeatTotals[i]}석</strong></td>
      <td>${fmt(sp)}%</td>
      <td class="${dCls}">${diff > 0 ? '+' : ''}${fmt(diff)}%p</td>
    </tr>`;
  });
  html += `</tbody></table>`;

  html += `<div class="interpretation"><ul>
    <li>같은 정당 후보끼리 같은 선거구에서 경쟁 — 동료가 곧 경쟁자입니다.</li>
    <li>후보를 너무 많이 내면 표가 분산되어 공멸, 너무 적게 내면 의석 기회를 놓칩니다.</li>
    <li><strong>"몇 명을 공천할 것인가"</strong>가 정당 전략의 핵심입니다.</li>
    <li>이것이 우리나라 기초의회 지역구 선거의 실제 방식입니다.</li>
  </ul></div>`;

  container.innerHTML = html;
}

/**
 * 기초의회 후보자 편집 UI
 */
function renderLocalCouncilInputs() {
  const container = document.getElementById('local-district-inputs');
  if (!container) return;
  let html = '';

  state.localDistricts.forEach((district, di) => {
    html += `<div class="local-editor-district">
      <div class="local-editor-district-head">
        <span class="local-editor-district-name">${district.name}</span>
        <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
          <span style="font-size:0.7rem;color:var(--text-muted)">배분:</span>
          ${[1,2,3,4].map(n => `<button class="btn-opt${district.seats===n?' active':''}" data-ld-di="${di}" data-ld-seats="${n}">${n}석</button>`).join('')}
          <button class="btn-small" data-ld-del-dist="${di}" style="color:var(--danger)">구 삭제</button>
        </div>
      </div>`;

    district.candidates.forEach((c, ci) => {
      html += `<div class="local-editor-cand-row">
        <select class="local-editor-party-sel" data-ld-di="${di}" data-ld-ci="${ci}" data-ld-field="partyIdx">
          ${state.parties.map((p, pi) => `<option value="${pi}"${c.partyIdx===pi?' selected':''}>${p.name}</option>`).join('')}
        </select>
        <input class="local-editor-name-inp" type="text" data-ld-di="${di}" data-ld-ci="${ci}" data-ld-field="name" value="${c.name}" maxlength="8" />
        <input class="local-editor-votes-inp" type="number" data-ld-di="${di}" data-ld-ci="${ci}" data-ld-field="votes" value="${c.votes}" min="0" max="99999" />
        <span style="font-size:0.7rem;color:var(--text-muted)">표</span>
        <button class="btn-small" data-ld-del-cand-di="${di}" data-ld-del-cand-ci="${ci}" style="color:var(--danger)">✕</button>
      </div>`;
    });

    html += `<button class="btn-secondary full-width" data-ld-add-cand="${di}" style="font-size:0.75rem;padding:4px;margin-top:3px">+ 후보 추가</button>
    </div>`;
  });

  container.innerHTML = html;

  container.querySelectorAll('[data-ld-seats]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.localDistricts[+btn.dataset.ldDi].seats = +btn.dataset.ldSeats;
      renderLocalCouncilInputs();
    });
  });
  container.querySelectorAll('[data-ld-field]').forEach(el => {
    const update = () => {
      const di = +el.dataset.ldDi, ci = +el.dataset.ldCi, f = el.dataset.ldField;
      state.localDistricts[di].candidates[ci][f] =
        f === 'partyIdx' ? +el.value : f === 'votes' ? (parseInt(el.value) || 0) : el.value;
    };
    el.addEventListener('change', update);
    if (el.tagName === 'INPUT') el.addEventListener('input', update);
  });
  container.querySelectorAll('[data-ld-del-dist]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.localDistricts.length <= 1) { showToast('선거구는 최소 1개 필요합니다.'); return; }
      state.localDistricts.splice(+btn.dataset.ldDelDist, 1);
      renderLocalCouncilInputs();
    });
  });
  container.querySelectorAll('[data-ld-del-cand-ci]').forEach(btn => {
    btn.addEventListener('click', () => {
      const di = +btn.dataset.ldDelCandDi, ci = +btn.dataset.ldDelCandCi;
      if (state.localDistricts[di].candidates.length <= 1) { showToast('후보는 최소 1명 필요합니다.'); return; }
      state.localDistricts[di].candidates.splice(ci, 1);
      renderLocalCouncilInputs();
    });
  });
  container.querySelectorAll('[data-ld-add-cand]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.localDistricts[+btn.dataset.ldAddCand].candidates.push({ name: '신규후보', partyIdx: 0, votes: 0 });
      renderLocalCouncilInputs();
    });
  });
}

/**
 * 병립형 혼합제 결과 렌더링
 * 지역구 지도 + 비례 배분 + 합산 결과
 */
function renderMixed(result) {
  const { seats, consSeats, prSeats, consResults, consCount, prCount } = result;
  const container = document.getElementById('mixed-results');
  if (!container) return;
  const parties = state.parties;
  let html = '';

  // 지역구 결과 지도
  html += `<div class="section-title">📍 지역구 결과 (${consCount}석 — 소선거구 단순다수)</div>`;
  html += renderDistrictResults(consResults, parties);

  // 비례대표 결과
  if (prCount > 0) {
    html += `<div class="section-title">📊 비례대표 결과 (${prCount}석)</div>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">`;
    parties.forEach((p, i) => {
      const vp = parseFloat(p.vote) || 0;
      html += `<div style="display:flex;align-items:center;gap:5px;background:var(--bg3);padding:5px 10px;border-radius:var(--radius-sm)">
        ${colorDot(p.color)} <span style="font-weight:700">${p.name}</span>
        <span style="color:var(--text-muted);font-size:0.8rem">${vp}% →</span>
        <span style="font-weight:700;color:${p.color}">${prSeats[i]}석</span>
      </div>`;
    });
    html += `</div>`;
  }

  // 합산 결과
  html += `<div class="section-title">💺 합산 의석 (지역구 ${consCount} + 비례 ${prCount})</div>`;
  html += renderSeatChart(seats, parties);
  html += renderResultTable(seats, parties, state.totalSeats);

  html += `<div class="interpretation"><ul>
    <li>병립형 혼합제는 지역구 의석과 비례 의석을 <strong>독립적으로</strong> 배분합니다.</li>
    <li>지역구는 소선거구 단순다수로, 비례는 전국 득표율로 따로 계산합니다.</li>
    <li>한국 국회가 현재 채택하고 있는 방식의 기본 구조입니다.</li>
    <li>왼쪽 패널에서 지역구 의석 수를 바꿔가며 비율 변화를 관찰해보세요.</li>
  </ul></div>`;

  container.innerHTML = html;
}

/* ─────────────────────────────────────────────
   12-c. 탭 선택 → 활성 패널 매핑
───────────────────────────────────────────── */

/**
 * 선거구제 + 대표방식 조합으로 표시할 tab-panel ID 반환
 */
// 시스템 키 → 탭 패널 ID
function getActiveTabId() {
  if (state.showCompare) return 'tab-compare';
  const map = {
    local:            'tab-local',
    fptp:             'tab-fptp',
    majority:         'tab-majority',
    multi:            'tab-multi',
    'multi-plurality':'tab-multi-plurality',
    pr:               'tab-pr',
    mixed:            'tab-mixed',
  };
  return map[state.activeSystem] || 'tab-fptp';
}

// 시스템 키 → 표시 이름
const SYSTEM_NAMES = {
  local:            '기초의회 선거 (중선거구 + 단순다수 / 후보자 중심)',
  fptp:             '소선거구제 + 단순다수대표제',
  majority:         '소선거구제 + 절대다수대표제',
  multi:            '중대선거구제 (비례배분)',
  'multi-plurality':'중대선거구제 (단순다수)',
  pr:               '비례대표제',
  mixed:            '병립형 혼합제',
};

/**
 * 2열 설명 패널을 현재 선거제도에 맞게 갱신
 */
function updateDescPanel() {
  const panel = document.getElementById('desc-panel');
  if (!panel) return;

  if (state.showCompare) {
    panel.classList.add('compare-mode');
    document.getElementById('desc-district-header').textContent = '📊 전체 비교';
    document.getElementById('desc-district-list').innerHTML = [
      '같은 득표율을 5가지 제도에 동시 적용한 결과입니다.',
      '어느 제도가 1위 정당에 유리한지 비교해 보세요.',
      '어느 제도가 소수 정당에 유리한지 비교해 보세요.',
      '득표율↔의석률 차이가 가장 작은 제도는?',
    ].map(t => `<li>${t}</li>`).join('');
    document.getElementById('desc-method-header').textContent = '';
    document.getElementById('desc-method-list').innerHTML = '';
  } else {
    panel.classList.remove('compare-mode');
    const d = SYSTEM_DESCS[state.activeSystem];
    if (!d) return;
    document.getElementById('desc-district-header').textContent =
      d.leftExample ? `${d.leftTitle} — ${d.leftExample}` : d.leftTitle;
    document.getElementById('desc-district-list').innerHTML =
      d.leftItems.map(t => `<li>${t}</li>`).join('');
    document.getElementById('desc-method-header').textContent =
      d.rightExample ? `${d.rightTitle} — ${d.rightExample}` : d.rightTitle;
    document.getElementById('desc-method-list').innerHTML =
      d.rightItems.map(t => `<li>${t}</li>`).join('');
  }
  panel.style.display = state.showDesc ? '' : 'none';
}

/**
 * 탭 전환 + 배너/설명/발문 업데이트
 */
function updateActiveTab() {
  // 탭 active 클래스
  document.querySelectorAll('.tab-system').forEach(b => {
    b.classList.toggle('active', !state.showCompare && b.dataset.system === state.activeSystem);
  });
  document.getElementById('btn-show-compare')?.classList.toggle('active', state.showCompare);

  // 탭 패널 전환
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(getActiveTabId())?.classList.add('active');

  // 배너
  const name = state.showCompare ? '전체 비교' : (SYSTEM_NAMES[state.activeSystem] || '—');
  const bannerEl = document.getElementById('banner-system');
  if (bannerEl) bannerEl.textContent = name;
  document.getElementById('display-system').textContent = name;

  // 병립형 설정 카드
  const mixedCard = document.getElementById('card-mixed-settings');
  if (mixedCard) mixedCard.classList.toggle('hidden', state.activeSystem !== 'mixed');

  // 기초의회 편집 카드
  const localCard = document.getElementById('card-local-settings');
  if (localCard) {
    const show = state.activeSystem === 'local';
    localCard.classList.toggle('hidden', !show);
    if (show) renderLocalCouncilInputs();
  }

  // 오른쪽 패널
  if (state.results) {
    const rKey = state.showCompare ? 'pr' : state.activeSystem;
    if (rKey && state.results[rKey]) renderRightPanel(state.results[rKey]);
  }

  updateDescPanel();
  updateContextQuestions();
}

/**
 * 현재 제도에 맞는 수업 발문을 오른쪽 패널에 표시
 */
function updateContextQuestions() {
  const qEl = document.getElementById('question-list');
  if (!qEl) return;
  const key = state.showCompare ? 'compare' : state.activeSystem;
  const qs = SYSTEM_QUESTIONS[key] || SYSTEM_QUESTIONS['compare'];
  qEl.innerHTML = '<ol>' + qs.map(q => `<li>${q}</li>`).join('') + '</ol>';
}

/* ─────────────────────────────────────────────
   13. 렌더링 — 전체 비교 탭
───────────────────────────────────────────── */

function renderCompare(results) {
  const container = document.getElementById('compare-results');
  const { fptp, majority, multi, pr } = results;
  const multiPlurality = results['multi-plurality'];
  const parties = state.parties;
  const totalSeats = state.totalSeats;

  const systems = [
    { key: 'fptp',             label: '소선거구\n단순다수',     result: fptp },
    { key: 'majority',         label: '소선거구\n절대다수',     result: majority },
    { key: 'multi-plurality',  label: '중대선거구\n블록투표',   result: multiPlurality },
    { key: 'multi',            label: '중대선거구\n비례배분',   result: multi },
    { key: 'pr',               label: '비례대표제',             result: pr },
  ];

  let html = '<div class="compare-grid">';
  systems.forEach(sys => {
    const { seats } = sys.result;
    html += `<div class="compare-card">
      <div class="compare-card-title">${sys.label.replace('\n', ' ')}</div>`;
    html += renderSeatChart(seats, parties, 0);
    parties.forEach((p, pi) => {
      const sp = seatPct(seats[pi], totalSeats);
      const diff = sp - (parseFloat(p.vote) || 0);
      const diffClass = diff > 0.5 ? 'diff-positive' : diff < -0.5 ? 'diff-negative' : 'diff-zero';
      html += `<div style="display:flex;align-items:center;gap:5px;font-size:0.75rem;margin:2px 0">
        ${colorDot(p.color, 10)} ${p.name}: <strong>${seats[pi]}석</strong>
        <span class="${diffClass}" style="margin-left:auto">${diff > 0 ? '+' : ''}${fmt(diff)}%p</span>
      </div>`;
    });
    html += `</div>`;
  });
  html += '</div>';

  // 비교 종합 테이블 (5개 제도)
  html += `<div class="section-title">📊 제도별 의석 수 종합 비교</div>`;
  html += `<table class="result-table">
    <thead><tr>
      <th>정당</th><th>득표율</th>
      <th>소선거구<br>단순다수</th><th>소선거구<br>절대다수</th>
      <th>중대선거구<br>블록투표</th><th>중대선거구<br>비례배분</th><th>비례대표제</th>
    </tr></thead><tbody>`;
  parties.forEach((p, pi) => {
    const vp = parseFloat(p.vote) || 0;
    const mpSeats = multiPlurality ? multiPlurality.seats[pi] : '—';
    html += `<tr>
      <td><div class="party-cell">${colorDot(p.color)}${p.name}</div></td>
      <td>${fmt(vp)}%</td>
      <td>${fptp.seats[pi]}석 <small>(${fmt(seatPct(fptp.seats[pi], totalSeats))}%)</small></td>
      <td>${majority.seats[pi]}석 <small>(${fmt(seatPct(majority.seats[pi], totalSeats))}%)</small></td>
      <td>${mpSeats}석 <small>(${multiPlurality ? fmt(seatPct(mpSeats, totalSeats)) : '—'}%)</small></td>
      <td>${multi.seats[pi]}석 <small>(${fmt(seatPct(multi.seats[pi], totalSeats))}%)</small></td>
      <td>${pr.seats[pi]}석 <small>(${fmt(seatPct(pr.seats[pi], totalSeats))}%)</small></td>
    </tr>`;
  });
  html += `</tbody></table>`;

  html += `<div class="interpretation"><ul>
    <li>같은 유권자 분포라도 소선거구제에서는 1위 정당이 더 많은 의석을 얻을 수 있습니다.</li>
    <li>비례대표제에서는 득표율과 의석률이 가장 비슷하게 나타납니다.</li>
    <li>중대선거구제는 소선거구제와 비례대표제의 중간적 성격을 보일 수 있습니다.</li>
    <li>절대다수대표제에서는 결선투표 과정에서 2순위 선호가 중요해집니다.</li>
  </ul></div>`;

  container.innerHTML = html;
}

/* ─────────────────────────────────────────────
   14. 렌더링 — 오른쪽 요약 패널
───────────────────────────────────────────── */

function renderRightPanel(activeResult) {
  const { seats } = activeResult;
  const totalSeats = state.totalSeats;
  const summaryEl   = document.getElementById('seat-summary-content');
  const distortionEl = document.getElementById('distortion-content');
  const parties = state.parties;

  // ── 의석 배분 요약 ──
  let shtml = renderSeatChart(seats, parties);
  parties.forEach((p, i) => {
    const sp   = seatPct(seats[i], totalSeats);
    const vp   = parseFloat(p.vote) || 0;
    const diff = sp - vp;
    const diffStr = diff > 0.5
      ? `<span class="diff-positive">+${fmt(diff)}%p</span>`
      : diff < -0.5
        ? `<span class="diff-negative">${fmt(diff)}%p</span>`
        : `<span class="diff-zero">±0</span>`;
    shtml += `<div class="summary-party-row">
      ${colorDot(p.color)}
      <span class="summary-party-name">${p.name}</span>
      <span class="summary-seat-num" style="color:${p.color}">${seats[i]}석</span>
      ${diffStr}
    </div>`;
  });
  summaryEl.innerHTML = shtml;

  // ── 이 제도의 핵심 지표 (학생 눈높이) ──
  // 1위 정당 의석 보너스
  const votes = parties.map(p => parseFloat(p.vote) || 0);
  const topVote = Math.max(...votes);
  const topIdx  = votes.indexOf(topVote);
  const topSeatPct = seatPct(seats[topIdx], totalSeats);
  const bonus = topSeatPct - topVote;

  // 사표율 (낙선자 득표 비율 추정)
  const wastedPct = 'wastedPct' in activeResult ? activeResult.wastedPct : null;

  // 비례성 (Gallagher LSq — 학생에게는 별 등급으로만 표시)
  const lsq = Math.sqrt(0.5 * parties.reduce((acc, p, i) => {
    const vi = parseFloat(p.vote) || 0;
    const si = seatPct(seats[i], totalSeats);
    return acc + Math.pow(vi - si, 2);
  }, 0));
  // 별 5개 중 몇 개 (낮을수록 비례성 높음)
  const stars = lsq < 3 ? 5 : lsq < 6 ? 4 : lsq < 10 ? 3 : lsq < 15 ? 2 : 1;
  const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);
  const starColor = stars >= 4 ? 'var(--success)' : stars === 3 ? 'var(--warning)' : 'var(--danger)';

  // 소수 정당(최저 득표 정당) 의석 확보 여부
  const minVoteIdx = votes.indexOf(Math.min(...votes.filter(v => v > 0)));
  const minParty = parties[minVoteIdx];
  const minSeats = seats[minVoteIdx] || 0;

  let dhtml = '';

  // 1위 정당 보너스
  dhtml += `<div class="distortion-item">
    <span class="distortion-label">1위 정당(${parties[topIdx].name}) 의석 보너스</span>
    <span class="distortion-value ${bonus > 5 ? 'diff-positive' : bonus < -2 ? 'diff-negative' : 'diff-zero'}">
      ${bonus > 0 ? '+' : ''}${fmt(bonus)}%p
    </span>
  </div>`;

  // 사표율 (있을 때만)
  if (wastedPct !== null) {
    const wastedPeople = Math.round(wastedPct);
    dhtml += `<div class="distortion-item">
      <span class="distortion-label">사표율 <small>(낙선자 표 비율)</small></span>
      <span class="distortion-value ${wastedPct > 50 ? 'text-danger' : wastedPct > 30 ? 'text-warning' : 'text-success'}">
        ${fmt(wastedPct)}%
      </span>
    </div>`;
    dhtml += `<div style="font-size:0.72rem;color:var(--text-muted);margin:-4px 0 6px;padding:0 2px">
      → 유권자 100명 중 약 ${wastedPeople}명의 표가 의석에 반영되지 않음
    </div>`;
  }

  // 소수 정당 의석
  dhtml += `<div class="distortion-item">
    <span class="distortion-label">소수 정당(${minParty ? minParty.name : '—'}) 의석</span>
    <span class="distortion-value">${minSeats}석 ${minSeats === 0 ? '<span style="color:var(--danger)">❌</span>' : '<span style="color:var(--success)">✓</span>'}</span>
  </div>`;

  // 비례성 등급
  dhtml += `<div class="distortion-item">
    <span class="distortion-label">득표율↔의석률 비례성</span>
    <span class="distortion-value" style="color:${starColor};font-size:0.95rem;letter-spacing:1px">${starStr}</span>
  </div>`;
  dhtml += `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px">★★★★★ 완전 비례 / ★☆☆☆☆ 매우 낮음</div>`;

  distortionEl.innerHTML = dhtml;
}

/* ─────────────────────────────────────────────
   15. 시뮬레이션 실행
───────────────────────────────────────────── */

function runSimulation() {
  // 입력값을 state에 먼저 동기화 (검증 전에 수행)
  document.querySelectorAll('.party-vote-input').forEach(el => {
    state.parties[+el.dataset.idx].vote = parseFloat(el.value) || 0;
  });
  document.querySelectorAll('.party-name-input').forEach(el => {
    state.parties[+el.dataset.idx].name = el.value;
  });
  document.querySelectorAll('.party-color-dot').forEach(el => {
    state.parties[+el.dataset.idx].color = el.value;
  });

  // 유효성 검사
  if (!validateVotes()) {
    showToast('⚠️ 득표율 합계가 100%가 아닙니다. 다시 확인하세요.', 3000);
    return;
  }

  // 계산 (모든 제도를 미리 계산해 캐싱)
  const fptp           = calculateFPTP();
  const majority       = calculateMajorityRunoff();
  const multi          = calculateMultiMemberDistrict();
  const multiPlurality = calculateBlockVoting();
  const pr             = calculatePR();
  const mixed          = calculateMixed();
  const local          = calculateLocalCouncil();
  state.results = { fptp, majority, multi, 'multi-plurality': multiPlurality, pr, mixed, local };

  // 렌더링 (모든 패널을 백그라운드 계산)
  renderFPTP(fptp);
  renderMajority(majority);
  renderMulti(multi);
  renderMultiPlurality(multiPlurality);
  renderMixed(mixed);
  renderLocalCouncil(local);
  renderPR(pr);
  renderCompare(state.results);

  // 현재 탭 선택에 맞게 패널 표시 + 오른쪽 패널 업데이트
  updateActiveTab();
  updateHeaderMeta();
  showToast('✅ 시뮬레이션 완료!');

  // 시나리오가 선택된 상태면 팝업 자동 표시
  if (state.activeScenario) openScenarioModal(state.activeScenario);
}

/* ─────────────────────────────────────────────
   16. 결과 복사
───────────────────────────────────────────── */

function copyResults() {
  if (!state.results) { showToast('먼저 시뮬레이션을 실행하세요.'); return; }
  const { fptp, majority, multi, pr } = state.results;
  const parties = state.parties;
  const totalSeats = state.totalSeats;

  let text = `[같은 표, 다른 의석 — 선거제도 시뮬레이터 결과]\n`;
  text += `국가: ${state.nation} | 전체 의석: ${totalSeats}석\n\n`;
  text += `■ 득표율\n`;
  parties.forEach(p => { text += `  ${p.name}: ${fmt(p.vote)}%\n`; });
  text += `\n■ 의석 배분 결과\n`;
  text += `${'정당'.padEnd(6)}${'단순다수'.padEnd(8)}${'절대다수'.padEnd(8)}${'중대선거구'.padEnd(10)}${'비례대표'.padEnd(8)}\n`;
  parties.forEach((p, i) => {
    text += `${p.name.padEnd(6)}${(fptp.seats[i]+'석').padEnd(8)}${(majority.seats[i]+'석').padEnd(8)}${(multi.seats[i]+'석').padEnd(10)}${(pr.seats[i]+'석').padEnd(8)}\n`;
  });
  text += `\n생성: ${new Date().toLocaleString('ko-KR')}`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 결과가 클립보드에 복사되었습니다.');
  }).catch(() => {
    showToast('복사 실패. 브라우저 권한을 확인하세요.');
  });
}

/* ─────────────────────────────────────────────
   17. 시나리오 적용
───────────────────────────────────────────── */

// 시나리오 선택 시 전국 득표율 + 선거구 득표율 자동 조정
function applyScenario(key) {
  const s = SCENARIOS[key];
  if (!s) return;

  // 전국 득표율 적용 (정당 수에 맞게 슬라이스)
  state.parties.forEach((p, i) => {
    p.vote = s.votes[i] !== undefined ? s.votes[i] : 0;
  });

  // 선거구별 득표율: 기본 데이터를 시나리오 비율로 스케일링
  const baseTotal = s.votes.slice(0, state.numParties).reduce((a, b) => a + b, 0);
  state.districts = DISTRICTS_DEFAULT.map(d => {
    let arr = adjustDistrictToParties(d, state.numParties);
    // 전국 득표율 방향으로 약간 당겨줌 (50% 블렌딩)
    const arrSum = arr.reduce((a, b) => a + b, 0);
    arr = arr.map((v, i) => {
      const nationalShare = baseTotal > 0 ? (s.votes[i] || 0) / baseTotal : 0;
      const distShare = arrSum > 0 ? v / arrSum : 0;
      return (distShare * 0.5 + nationalShare * 0.5) * 100;
    });
    // 재정규화
    const sum2 = arr.reduce((a, b) => a + b, 0);
    arr = arr.map(v => Math.round(v * 100 / sum2));
    // 합계 보정
    const diff = 100 - arr.reduce((a, b) => a + b, 0);
    arr[0] += diff;
    return arr;
  });

  renderPartyInputs();
  if (document.getElementById('district-editor').classList.contains('hidden') === false) {
    renderDistrictEditor();
  }
  showToast(`📂 시나리오 ${key}: ${s.name} 적용됨`);
}

/* ─────────────────────────────────────────────
   18. 이벤트 바인딩
───────────────────────────────────────────── */

function bindEvents() {
  // ── 선거제도 탭 (단일 행) ──
  document.querySelectorAll('.tab-system').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeSystem = btn.dataset.system;
      state.showCompare = false;
      updateActiveTab();
    });
  });

  // ── 전체 비교 버튼 ──
  document.getElementById('btn-show-compare').addEventListener('click', () => {
    state.showCompare = !state.showCompare;
    updateActiveTab();
  });

  // ── 공통: 사이드바 아이콘 상태 갱신 ──
  function syncSidebarBtns() {
    const main = document.getElementById('app-main');
    const leftHidden  = main.classList.contains('sidebar-hidden');
    const rightHidden = main.classList.contains('panel-right-hidden');

    const btnL = document.getElementById('btn-toggle-left-panel');
    const btnR = document.getElementById('btn-toggle-right-panel');
    const btnH = document.getElementById('btn-toggle-sidebar'); // 헤더 ☰

    if (btnL) {
      btnL.textContent = leftHidden ? '▶' : '◀';
      btnL.classList.toggle('is-collapsed', leftHidden);
    }
    if (btnR) {
      btnR.textContent = rightHidden ? '◀' : '▶';
      btnR.classList.toggle('is-collapsed', rightHidden);
    }
    if (btnH) btnH.style.opacity = leftHidden ? '0.5' : '1';
  }

  // ── 왼쪽 패널 토글 (탭 행 버튼) ──
  document.getElementById('btn-toggle-left-panel').addEventListener('click', () => {
    document.getElementById('app-main').classList.toggle('sidebar-hidden');
    syncSidebarBtns();
  });

  // ── 오른쪽 패널 토글 (탭 행 버튼) ──
  document.getElementById('btn-toggle-right-panel').addEventListener('click', () => {
    document.getElementById('app-main').classList.toggle('panel-right-hidden');
    syncSidebarBtns();
  });

  // ── 헤더 ☰ 버튼 (왼쪽 패널, 기존 유지) ──
  document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
    document.getElementById('app-main').classList.toggle('sidebar-hidden');
    syncSidebarBtns();
  });

  // ── 기본 설정 접기/펼치기 ──
  document.getElementById('btn-toggle-basic').addEventListener('click', () => {
    const body = document.getElementById('basic-settings-body');
    const btn  = document.getElementById('btn-toggle-basic');
    if (body.classList.contains('hidden')) {
      body.classList.remove('hidden');
      btn.textContent = '접기 ▲';
    } else {
      body.classList.add('hidden');
      btn.textContent = '펼치기 ▼';
    }
  });

  // 전체 의석 수 선택
  document.querySelectorAll('[data-seats]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-seats]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.totalSeats = parseInt(btn.dataset.seats);
      document.getElementById('input-seats-custom').value = '';
      updateHeaderMeta();
    });
  });
  document.getElementById('input-seats-custom').addEventListener('input', e => {
    const v = parseInt(e.target.value);
    if (v >= 2 && v <= 100) {
      state.totalSeats = v;
      document.querySelectorAll('[data-seats]').forEach(b => b.classList.remove('active'));
      updateHeaderMeta();
    }
  });

  // 정당 수 선택
  document.querySelectorAll('[data-parties]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-parties]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const n = parseInt(btn.dataset.parties);
      state.numParties = n;
      // 정당 배열 재구성
      while (state.parties.length < n) {
        const i = state.parties.length;
        state.parties.push({ name: PARTY_NAMES_DEFAULT[i] || `P${i+1}`, color: PARTY_COLORS[i], vote: 0, ideology: IDEOLOGY_DEFAULT[i] || 0 });
      }
      state.parties = state.parties.slice(0, n);
      state.districts = DISTRICTS_DEFAULT.map(d => adjustDistrictToParties(d, n));
      // SNTV 후보 수도 정당 수에 맞게 조정
      renderPartyInputs();
      if (!document.getElementById('district-editor').classList.contains('hidden')) {
        renderDistrictEditor();
      }
      updateHeaderMeta();
    });
  });

  // 국가명
  document.getElementById('input-nation').addEventListener('input', e => {
    state.nation = e.target.value;
    document.getElementById('display-nation').textContent = state.nation;
  });

  // 비례대표 배분 방식
  document.getElementById('select-pr-method').addEventListener('change', e => {
    state.prMethod = e.target.value;
  });

  // 봉쇄조항
  document.querySelectorAll('[data-threshold]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-threshold]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.threshold = parseInt(btn.dataset.threshold);
    });
  });

  // 시나리오
  document.querySelectorAll('.btn-scenario').forEach(btn => {
    btn.addEventListener('click', () => {
      // 활성 표시 전환
      document.querySelectorAll('.btn-scenario').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const key = btn.dataset.scenario;
      state.activeScenario = key;
      applyScenario(key);
      showScenarioDesc(key);
    });
  });

  // 초기화 버튼
  document.getElementById('btn-reset').addEventListener('click', () => {
    document.querySelectorAll('.btn-scenario').forEach(b => b.classList.remove('active'));
    state.activeScenario = null;
    initState();
    renderPartyInputs();
    hideScenarioDesc();
    if (!document.getElementById('district-editor').classList.contains('hidden')) {
      renderDistrictEditor();
    }
    showToast('기본값으로 초기화했습니다.');
  });

  // 시뮬레이션 실행
  document.getElementById('btn-run').addEventListener('click', runSimulation);

  // 결과 복사
  document.getElementById('btn-copy-result').addEventListener('click', copyResults);

  // 전체화면
  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => showToast('전체화면 전환 실패'));
    } else {
      document.exitFullscreen();
    }
  });

  // 설명 숨기기 (desc-panel + interpretation 블록 동시 토글)
  document.getElementById('btn-toggle-desc').addEventListener('click', () => {
    state.showDesc = !state.showDesc;
    const descPanel = document.getElementById('desc-panel');
    if (descPanel) descPanel.style.display = state.showDesc ? '' : 'none';
    document.querySelectorAll('.interpretation').forEach(el => {
      el.style.display = state.showDesc ? '' : 'none';
    });
    document.getElementById('btn-toggle-desc').textContent = state.showDesc ? '👁' : '🙈';
    showToast(state.showDesc ? '설명 표시 중' : '설명 숨김');
  });

  // 선거구 편집 토글
  document.getElementById('btn-toggle-districts').addEventListener('click', () => {
    const el = document.getElementById('district-editor');
    const btn = document.getElementById('btn-toggle-districts');
    if (el.classList.contains('hidden')) {
      el.classList.remove('hidden');
      btn.textContent = '접기 ▲';
      renderDistrictEditor();
    } else {
      el.classList.add('hidden');
      btn.textContent = '펼치기 ▼';
    }
  });

  // ── 기초의회 선거구 추가 ──
  document.getElementById('btn-local-add-district').addEventListener('click', () => {
    const newIdx = state.localDistricts.length + 1;
    state.localDistricts.push({
      name: `제${newIdx}선거구`, seats: 2,
      candidates: [
        { name: '후보1', partyIdx: 0, votes: 0 },
        { name: '후보2', partyIdx: 1, votes: 0 },
      ],
    });
    renderLocalCouncilInputs();
  });

  // ── 병립형 지역구 의석 수 설정 ──
  document.querySelectorAll('[data-mixed-cons]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-mixed-cons]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mixedConstituencySeats = parseInt(btn.dataset.mixedCons);
      const descEl = document.getElementById('mixed-ratio-desc');
      if (descEl) descEl.textContent = `지역구 ${state.mixedConstituencySeats}석 + 비례 ${state.totalSeats - state.mixedConstituencySeats}석 = 총 ${state.totalSeats}석`;
    });
  });

  // ── 결과 숨기기 / 공개 ──
  document.getElementById('btn-hide-results').addEventListener('click', () => {
    const cover = document.getElementById('result-cover');
    const hidden = cover.classList.toggle('hidden');
    document.getElementById('btn-hide-results').textContent = hidden ? '🔒' : '🔓';
    document.getElementById('btn-hide-results').title = hidden ? '결과 가리기' : '결과 공개됨 (클릭하면 다시 가림)';
  });
  document.getElementById('btn-reveal-results').addEventListener('click', () => {
    document.getElementById('result-cover').classList.add('hidden');
    document.getElementById('btn-hide-results').textContent = '🔒';
    document.getElementById('btn-hide-results').title = '결과 가리기';
  });

  // ── 사용법 가이드 ──
  document.getElementById('btn-lesson-guide').addEventListener('click', () => {
    document.getElementById('lesson-guide-modal').classList.remove('hidden');
  });
  document.getElementById('btn-lesson-guide-close').addEventListener('click', () => {
    document.getElementById('lesson-guide-modal').classList.add('hidden');
  });
  document.getElementById('lesson-guide-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) document.getElementById('lesson-guide-modal').classList.add('hidden');
  });

  // 개념 패널 접기/펼치기
  document.getElementById('btn-toggle-desc-panel').addEventListener('click', () => {
    const panel = document.getElementById('desc-panel');
    const btn   = document.getElementById('btn-toggle-desc-panel');
    const collapsed = panel.classList.toggle('collapsed');
    btn.textContent = collapsed ? '▼' : '▲';
    btn.title = collapsed ? '개념 패널 펼치기' : '개념 패널 접기';
  });

  // 시나리오 팝업 닫기
  document.getElementById('btn-modal-close').addEventListener('click', closeScenarioModal);
  document.getElementById('scenario-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeScenarioModal(); // 오버레이 클릭 시 닫기
  });

}

/* ─────────────────────────────────────────────
   19. 시나리오 설명 헬퍼
───────────────────────────────────────────── */

function showScenarioDesc(key) {
  const el = document.getElementById('scenario-desc');
  if (!el) return;
  const s = SCENARIO_DESCS[key];
  if (!s) { hideScenarioDesc(); return; }
  el.innerHTML = `<strong>수업 포인트</strong> — ${s.point}`;
  el.classList.add('visible');
}

function hideScenarioDesc() {
  const el = document.getElementById('scenario-desc');
  if (el) { el.classList.remove('visible'); el.innerHTML = ''; }
}

/**
 * 시나리오 팝업 열기 — 시나리오 설명 + 득표율을 전면으로 표시
 */
function openScenarioModal(key) {
  const s = SCENARIO_DESCS[key];
  if (!s) return;

  // 레이블
  document.getElementById('modal-scenario-label').textContent =
    `시나리오 ${key}: ${s.label}`;

  // 득표율 막대
  const maxVote = Math.max(...state.parties.map(p => parseFloat(p.vote) || 0));
  let votesHTML = '<h3>현재 득표율</h3>';
  state.parties.forEach(p => {
    const v = parseFloat(p.vote) || 0;
    const barW = maxVote > 0 ? (v / maxVote) * 100 : 0;
    votesHTML += `<div class="modal-vote-row">
      <span class="modal-vote-name" style="color:${p.color}">${p.name}</span>
      <div class="modal-vote-bar-wrap">
        <div class="modal-vote-bar-fill" style="width:${barW}%;background:${p.color}"></div>
      </div>
      <span class="modal-vote-pct" style="color:${p.color}">${fmt(v, 0)}%</span>
    </div>`;
  });
  document.getElementById('modal-votes').innerHTML = votesHTML;

  // 수업 포인트
  document.getElementById('modal-point').innerHTML = `
    <h3>수업 포인트</h3>
    <p>${s.point}</p>`;

  document.getElementById('scenario-modal').classList.remove('hidden');
}

function closeScenarioModal() {
  document.getElementById('scenario-modal').classList.add('hidden');
}

/* ─────────────────────────────────────────────
   20. 앱 시작
───────────────────────────────────────────── */

function bootstrap() {
  initState();
  renderPartyInputs();
  bindEvents();
  updateHeaderMeta();
  updateContextQuestions(); // 초기 발문 세팅

  // 빠른 시작: 페이지 로드 시 자동 실행
  runSimulation();
}

document.addEventListener('DOMContentLoaded', bootstrap);
