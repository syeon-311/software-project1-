let selectedRoom = '424';
const ROOMS = ['424', '445', '447', '611'];

/* ─────────────────────────────────────────
   Broken outlet reports (per room)
───────────────────────────────────────── */
const brokenOutlets = { '424': new Set(), '445': new Set(), '447': new Set(), '611': new Set() };
let reportTargetSeat = null;

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

  // Pick recommended seat: empty + outlet, rows C–E, cols 4–7
  const recCandidates = seats.filter(s =>
    !s.occ && s.outlet &&
    !brokenOutlets[selectedRoom]?.has(s.id) &&
    'CDE'.includes(s.id[0]) &&
    parseInt(s.id.slice(1)) >= 4 &&
    parseInt(s.id.slice(1)) <= 7
  );
  const rec =
    recCandidates.length
      ? recCandidates[0]
      : seats.find(s => !s.occ && s.outlet && !brokenOutlets[selectedRoom]?.has(s.id))
        || seats.find(s => !s.occ);

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
  document.querySelectorAll('#s2-room, .s2r')
    .forEach(el => el.textContent = selectedRoom);

  const data = ROOM_DATA[selectedRoom];
  const broken = brokenOutlets[selectedRoom];
  const empty       = data.seats.filter(s => !s.occ).length;
  const outletEmpty = data.seats.filter(s => !s.occ && s.outlet && !broken.has(s.id)).length;

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
  // Re-pick rec considering broken outlets
  const broken = brokenOutlets[selectedRoom];
  const recCandidates = data.seats.filter(s =>
    !s.occ && s.outlet && !broken.has(s.id) &&
    'CDE'.includes(s.id[0]) &&
    parseInt(s.id.slice(1)) >= 4 &&
    parseInt(s.id.slice(1)) <= 7
  );
  data.rec = recCandidates.length
    ? recCandidates[0]
    : data.seats.find(s => !s.occ && s.outlet && !broken.has(s.id))
      || data.seats.find(s => !s.occ);

  document.getElementById('rec-seat').textContent  = data.rec.id;
  document.getElementById('rec-seat2').textContent = data.rec.id;

  updateBrokenBadge();
  buildGrid(data);
}

function updateBrokenBadge() {
  const count = brokenOutlets[selectedRoom].size;
  let badge = document.getElementById('broken-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'broken-badge';
    badge.className = 'report-badge';
    const title = document.querySelector('#s3 .notif-title');
    if (title) title.appendChild(badge);
  }
  badge.textContent = count > 0 ? `🔧 고장 신고 ${count}건` : '';
  badge.style.display = count > 0 ? 'inline-block' : 'none';
}

function buildGrid(data) {
  const g = document.getElementById('seatGrid');
  g.innerHTML = '';
  const broken = brokenOutlets[selectedRoom];

  data.seats.forEach(s => {
    const d = document.createElement('div');
    const isBroken = s.outlet && broken.has(s.id);
    let cls = 'seat';

    if      (s.id === data.rec.id) cls += ' recommended';
    else if (s.occ)                cls += ' occupied';
    else                           cls += ' empty';

    if (isBroken)     cls += ' broken';
    else if (s.outlet) cls += ' outlet';

    d.className = cls;
    d.textContent = s.id;
    d.title = s.id
      + (isBroken    ? ' 🔧 콘센트 고장' : s.outlet ? ' ⚡콘센트' : '')
      + (s.occ       ? ' (사용중)' : ' (빈자리)');

    // Click to report broken outlet
    if (s.outlet && !s.occ && s.id !== data.rec.id) {
      d.style.cursor = 'pointer';
      d.addEventListener('click', () => openReportModal(s.id));
    }

    g.appendChild(d);
  });
}

/* ─────────────────────────────────────────
   Report modal
───────────────────────────────────────── */
function openReportModal(seatId) {
  reportTargetSeat = seatId;
  const broken = brokenOutlets[selectedRoom].has(seatId);
  document.getElementById('modal-seat-id').textContent = seatId;
  document.getElementById('modal-action-btn').textContent = broken ? '✅ 고장 신고 취소' : '🔧 고장 신고하기';
  document.getElementById('modal-action-btn').onclick = broken ? cancelReport : submitReport;
  document.getElementById('report-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('report-modal').classList.remove('open');
  reportTargetSeat = null;
}

function submitReport() {
  if (!reportTargetSeat) return;
  brokenOutlets[selectedRoom].add(reportTargetSeat);
  closeModal();
  initScreenS3(); // rebuild grid
  showToast(`${reportTargetSeat} 콘센트 고장 신고 완료 🔧`);
}

function cancelReport() {
  if (!reportTargetSeat) return;
  brokenOutlets[selectedRoom].delete(reportTargetSeat);
  closeModal();
  initScreenS3();
  showToast(`${reportTargetSeat} 신고가 취소됐어요`);
}

/* ─────────────────────────────────────────
   Toast notification
───────────────────────────────────────── */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
      background:#1e293b;color:#fff;padding:10px 18px;border-radius:20px;
      font-size:13px;font-weight:600;z-index:200;opacity:0;
      transition:opacity .3s;white-space:nowrap;font-family:'Noto Sans KR',sans-serif;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2500);
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
