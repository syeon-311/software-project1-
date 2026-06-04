let selectedRoom = '424';
const ROOMS = ['424', '445', '447', '611'];

/* ─────────────────────────────────────────
   Seat data generation (seeded pseudo-random)
───────────────────────────────────────── */
function seededRand(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function genSeats(roomSeed) {
  const rows = 'ABCDEFGHIJ'.split('');
  const seats = [];
  let idx = 0;

  rows.forEach(r => {
    for (let c = 1; c <= 10; c++) {
      const occ    = seededRand(roomSeed * 100 + idx)      < 0.44;
      const outlet = seededRand(roomSeed * 100 + idx + 50) < 0.26;
      seats.push({ id: r + c, occ, outlet });
      idx++;
    }
  });

  // Pick a recommended seat: empty + outlet, rows C–E, cols 4–7
  const recCandidates = seats.filter(s =>
    !s.occ && s.outlet &&
    'CDE'.includes(s.id[0]) &&
    parseInt(s.id.slice(1)) >= 4 &&
    parseInt(s.id.slice(1)) <= 7
  );
  const rec =
    recCandidates.length
      ? recCandidates[0]
      : seats.find(s => !s.occ && s.outlet) || seats.find(s => !s.occ);

  return { seats, rec };
}

// Pre-generate data for every room
const ROOM_DATA = {};
ROOMS.forEach((r, i) => { ROOM_DATA[r] = genSeats(i + 1); });

/* ─────────────────────────────────────────
   Room selection
───────────────────────────────────────── */
function selectRoom(r) {
  selectedRoom = r;
  ROOMS.forEach(id => {
    document.getElementById('room-' + id)
      .classList.toggle('selected', id === r);
  });
}

/* ─────────────────────────────────────────
   Screen navigation
───────────────────────────────────────── */
function goTo(id) {
  document.querySelectorAll('.screen')
    .forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  if (id === 's2') initScreenS2();
  if (id === 's3') initScreenS3();
}

/* ─────────────────────────────────────────
   S2: Scanning screen
───────────────────────────────────────── */
function initScreenS2() {
  // Update room references
  document.querySelectorAll('#s2-room, .s2r')
    .forEach(el => el.textContent = selectedRoom);

  const data = ROOM_DATA[selectedRoom];
  const empty       = data.seats.filter(s => !s.occ).length;
  const outletEmpty = data.seats.filter(s => !s.occ && s.outlet).length;

  document.getElementById('s2-empty').textContent  = empty + '석';
  document.getElementById('s2-outlet').textContent = outletEmpty + '석';

  startLoading();
}

function startLoading() {
  const bar = document.getElementById('lbar');
  const txt = document.getElementById('ltext');
  const btn = document.getElementById('nextBtn2');

  bar.style.width = '0%';
  btn.disabled    = true;
  btn.style.opacity = '0.4';

  const steps = [
    [20,  'KCard 인증 중...'],
    [45,  '좌석 데이터 조회 중...'],
    [70,  'AI 분석 결과 수신 중...'],
    [90,  '콘센트 좌석 필터링...'],
    [100, '✅ 완료! 추천 자리 확정'],
  ];
  let i = 0;

  const iv = setInterval(() => {
    if (i >= steps.length) {
      clearInterval(iv);
      btn.disabled = false;
      btn.style.opacity = '1';
      return;
    }
    bar.style.width = steps[i][0] + '%';
    txt.textContent  = steps[i][1];
    i++;
  }, 520);
}

/* ─────────────────────────────────────────
   S3: Seat map screen
───────────────────────────────────────── */
function initScreenS3() {
  document.querySelectorAll('.s2r')
    .forEach(el => el.textContent = selectedRoom);

  const data = ROOM_DATA[selectedRoom];
  document.getElementById('rec-seat').textContent  = data.rec.id;
  document.getElementById('rec-seat2').textContent = data.rec.id;
  buildGrid(data);
}

function buildGrid(data) {
  const g = document.getElementById('seatGrid');
  g.innerHTML = '';

  data.seats.forEach(s => {
    const d = document.createElement('div');
    let cls = 'seat';
    if      (s.id === data.rec.id) cls += ' recommended';
    else if (s.occ)                cls += ' occupied';
    else                           cls += ' empty';
    if (s.outlet) cls += ' outlet';

    d.className = cls;
    d.textContent = s.id;
    d.title = s.id
      + (s.outlet ? ' ⚡콘센트' : '')
      + (s.occ    ? ' (사용중)' : ' (빈자리)');
    g.appendChild(d);
  });
}

/* ─────────────────────────────────────────
   S4: CCTV tab switch
───────────────────────────────────────── */
function switchTab(t) {
  document.getElementById('tab-live').classList.toggle('active',  t === 'live');
  document.getElementById('tab-stats').classList.toggle('active', t === 'stats');
  document.getElementById('tab-live-content').style.display  = t === 'live'  ? 'block' : 'none';
  document.getElementById('tab-stats-content').style.display = t === 'stats' ? 'block' : 'none';
}
