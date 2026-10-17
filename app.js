(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const API = 'https://script.google.com/macros/s/AKfycbxMs5nKhAOf0AGR4d-PYG0YrDpjJ_iIAmYxeNuC3A3MYdK4Iwc2auK1wqaWOEx1xzoj/exec';
  const EVENT_START = new Date('2026-10-24T16:00:00+07:00');
  const EVENT_END = new Date('2026-10-24T22:00:00+07:00');
  const RSVP_DEADLINE = new Date('2026-10-20T23:59:59+07:00');

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= Nhạc theo ga ================= */
  const MAXVOL = 0.55;
  const volOK = (() => { try { const a = new Audio(); a.volume = 0.5; return a.volume === 0.5; } catch (e) { return false; } })();
  const tracks = {
    1: { el: new Audio('audio/ga1.mp3'), title: 'Nụ hồng mong manh' },
    2: { el: new Audio('audio/ga2.mp3'), title: 'Tình bạn – Đan Trường' },
  };
  Object.values(tracks).forEach(t => { t.el.loop = true; t.el.preload = 'none'; });

  let started = false, muted = false, desired = 1, playing = 0;
  const musicBtn = $('#music'), np = $('#np');
  let npTimer;

  function fade(el, to, ms, done) {
    if (!volOK || reduce) { try { el.volume = to; } catch (e) {} if (done) done(); return; }
    clearInterval(el._f);
    const from = el.volume, t0 = performance.now();
    el._f = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      try { el.volume = from + (to - from) * k; } catch (e) {}
      if (k >= 1) { clearInterval(el._f); if (done) done(); }
    }, 50);
  }
  function showNow(n) {
    np.textContent = 'Đang phát: ' + tracks[n].title;
    np.classList.add('show');
    clearTimeout(npTimer);
    npTimer = setTimeout(() => np.classList.remove('show'), 3600);
  }
  function unlock(el) {
    // Cho phép phát bài thứ hai về sau trên iOS: chạm một lần ở nút "Mở thiệp".
    try {
      el.muted = true;
      const p = el.play();
      const back = () => { el.pause(); el.currentTime = 0; el.muted = false; };
      if (p && p.then) p.then(back).catch(() => { el.muted = false; }); else back();
    } catch (e) { el.muted = false; }
  }
  function sync() {
    if (!started) return;
    if (muted || document.hidden) {
      Object.values(tracks).forEach(t => { clearInterval(t.el._f); t.el.pause(); });
      return;
    }
    if (playing === desired && !tracks[desired].el.paused) return;
    const prev = tracks[playing];
    if (prev && playing !== desired) fade(prev.el, 0, 1400, () => prev.el.pause());
    const t = tracks[desired];
    if (volOK) { try { t.el.volume = 0; } catch (e) {} }
    const p = t.el.play();
    if (p && p.catch) p.catch(() => {});
    fade(t.el, MAXVOL, 1800);
    if (playing !== desired) showNow(desired);
    playing = desired;
  }
  musicBtn.addEventListener('click', () => {
    muted = !muted;
    musicBtn.setAttribute('aria-pressed', String(muted));
    musicBtn.setAttribute('aria-label', muted ? 'Bật nhạc' : 'Tắt nhạc');
    if (!muted) { const keep = playing; playing = 0; sync(); if (!keep) showNow(desired); }
    else sync();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !muted) playing = 0; sync(); });

  /* ================= Mở thiệp ================= */
  const cover = $('#cover');
  $('#open').addEventListener('click', () => {
    started = true;
    cover.classList.add('opening');
    unlock(tracks[2].el);
    setTimeout(() => { desired = 1; playing = 0; sync(); }, 120);
    setTimeout(() => {
      document.body.classList.remove('locked');
      document.body.classList.add('opened');
      window.scrollTo(0, 0);
      layoutRail(); onScroll();
    }, reduce ? 50 : 900);
    setTimeout(() => { cover.hidden = true; }, reduce ? 200 : 1700);
  });

  /* ================= Đường ray + con tàu ================= */
  const rail = $('#rail'), tr = $('#rail .tr');
  const stations = [['#ga1', 'Ga 1'], ['#ga2', 'Ga 2'], ['#cuoi', 'Ga cuối']];
  function maxScroll() { return Math.max(1, document.documentElement.scrollHeight - innerHeight); }
  function layoutRail() {
    $$('.st', rail).forEach(n => n.remove());
    const H = rail.clientHeight - 34;
    stations.forEach(([sel, name]) => {
      const el = $(sel); if (!el) return;
      const d = document.createElement('i');
      d.className = 'st'; d.title = name;
      const top = el.getBoundingClientRect().top + scrollY;
      d.style.top = (Math.min(1, Math.max(0, top / maxScroll())) * H + 17) + 'px';
      rail.appendChild(d);
    });
  }
  let tick = false;
  function onScroll() {
    if (tick) return; tick = true;
    requestAnimationFrame(() => {
      tick = false;
      const H = rail.clientHeight - 34;
      const p = Math.min(1, Math.max(0, scrollY / maxScroll()));
      tr.style.transform = 'translate(-50%,' + (p * H) + 'px)';
      const ga2 = $('#ga2');
      const want = (scrollY + innerHeight * 0.55 >= ga2.getBoundingClientRect().top + scrollY) ? 2 : 1;
      if (want !== desired) { desired = want; sync(); }
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { layoutRail(); onScroll(); });
  addEventListener('load', () => { layoutRail(); onScroll(); });

  /* ================= Xem ảnh lớn ================= */
  const lb = $('#lb'), lbImg = $('#lb-img'), lbCap = $('#lb-cap'), lbCt = $('#lb-ct');
  const shots = $$('.ph img');
  let cur = 0, lastFocus = null;
  function show(i) {
    cur = (i + shots.length) % shots.length;
    const im = shots[cur];
    lbImg.src = im.currentSrc || im.src; lbImg.alt = im.alt;
    lbCap.textContent = im.alt; lbCt.textContent = (cur + 1) + ' / ' + shots.length;
  }
  function openLb(i) { lastFocus = document.activeElement; show(i); lb.classList.add('open'); document.body.style.overflow = 'hidden'; $('#lb-close').focus(); }
  function closeLb() { lb.classList.remove('open'); document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
  shots.forEach((im, i) => im.closest('.ph-btn').addEventListener('click', () => openLb(i)));
  $('#lb-close').addEventListener('click', closeLb);
  $('#lb-prev').addEventListener('click', () => show(cur - 1));
  $('#lb-next').addEventListener('click', () => show(cur + 1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });
  let sx = 0;
  lb.addEventListener('touchstart', e => { sx = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); }, { passive: true });

  /* ================= Đếm ngược, thêm vào lịch ================= */
  const cdD = $('#cd-d'), cdH = $('#cd-h'), cdM = $('#cd-m'), cdNote = $('#cd-note');
  function countdown() {
    const now = new Date();
    if (now >= EVENT_END) { cdD.textContent = cdH.textContent = cdM.textContent = '0'; cdNote.textContent = 'Buổi gặp mặt đã diễn ra. Hẹn gặp lại các bạn!'; return; }
    if (now >= EVENT_START) { cdD.textContent = cdH.textContent = cdM.textContent = '0'; cdNote.textContent = 'Buổi gặp mặt đang diễn ra.'; return; }
    const s = Math.floor((EVENT_START - now) / 60000);
    cdD.textContent = Math.floor(s / 1440);
    cdH.textContent = Math.floor((s % 1440) / 60);
    cdM.textContent = s % 60;
    cdNote.textContent = 'Đến 16:00 thứ Bảy 24/10/2026, giờ bắt đầu đón khách.';
  }
  countdown(); setInterval(countdown, 30000);

  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hop lop 10-12A4//VI', 'BEGIN:VEVENT',
    'UID:hoplop-12a4-25nam@hoplop', 'DTSTAMP:20261018T000000Z',
    'DTSTART:20261024T090000Z', 'DTEND:20261024T150000Z',
    'SUMMARY:Họp lớp 25 năm – Lớp 10-12A4 (K38) THPT số 1 Lào Cai',
    'LOCATION:Đức Huy Grand Lào Cai\\, 074 Trần Hưng Đạo',
    'DESCRIPTION:Trang phục: Đen & Trắng hoặc Trắng.', 'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  $('#ics').href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);

  /* ================= Gửi dữ liệu về Google Sheets ================= */
  async function send(payload) {
    await fetch(API, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
  }
  const setMsg = (el, text, kind) => { el.textContent = text; el.className = 'msg' + (kind ? ' ' + kind : ''); };

  /* RSVP */
  const rf = $('#rsvp-form'), rMsg = $('#rsvp-msg'), rBtn = $('#rsvp-btn'), rOk = $('#rsvp-ok');
  const nEl = $('#r-n'), nWrap = $('#r-n-wrap');
  let n = 1;
  const setN = v => { n = Math.max(1, Math.min(10, v)); nEl.value = n; nEl.textContent = n; };
  $('#r-minus').addEventListener('click', () => setN(n - 1));
  $('#r-plus').addEventListener('click', () => setN(n + 1));
  rf.addEventListener('change', () => {
    const v = (rf.elements.thamGia.value || '');
    nWrap.hidden = v === 'Không';
  });
  if (new Date() > RSVP_DEADLINE) $('#rsvp-late').hidden = false;
  rf.addEventListener('submit', async e => {
    e.preventDefault();
    const ten = rf.elements.ten.value.trim();
    const thamGia = rf.elements.thamGia.value;
    if (ten.length < 2) return setMsg(rMsg, 'Bạn nhập họ tên giúp ban tổ chức nhé.', 'err');
    if (!thamGia) return setMsg(rMsg, 'Bạn chọn một lựa chọn: có, không hoặc chưa chắc.', 'err');
    rBtn.disabled = true; setMsg(rMsg, 'Đang gửi…');
    try {
      await send({
        type: 'rsvp', ten, tenGoi: rf.elements.tenGoi.value.trim(), sdt: rf.elements.sdt.value.trim(),
        thamGia, soNguoi: thamGia === 'Không' ? 1 : n, ghiChu: rf.elements.ghiChu.value.trim(), website: rf.elements.website.value
      });
      rf.hidden = true; rOk.hidden = false;
      $('#rsvp-ok-name').textContent = ten;
      $('#rsvp-ok-text').textContent = thamGia === 'Có' ? 'Hẹn gặp bạn ngày 24/10 tại Đức Huy Grand Lào Cai.' : thamGia === 'Không' ? 'Tiếc quá, hẹn bạn dịp khác. Bạn vẫn có thể viết lưu bút bên dưới.' : 'Khi chắc chắn, bạn gửi lại xác nhận giúp ban tổ chức nhé.';
      setMsg(rMsg, '');
    } catch (err) {
      setMsg(rMsg, 'Chưa gửi được. Bạn kiểm tra mạng rồi bấm gửi lại, thông tin đã nhập vẫn còn.', 'err');
    }
    rBtn.disabled = false;
  });
  $('#rsvp-again').addEventListener('click', () => {
    rf.reset(); setN(1); nWrap.hidden = false; rf.hidden = false; rOk.hidden = true; rf.elements.ten.focus();
  });

  /* Lưu bút */
  const gf = $('#gb-form'), gMsg = $('#gb-msg'), gBtn = $('#gb-btn'), gCount = $('#g-count'), wall = $('#wall');
  gf.elements.loiNhan.addEventListener('input', () => { gCount.textContent = gf.elements.loiNhan.value.length + ' / 500'; });
  gf.addEventListener('submit', async e => {
    e.preventDefault();
    const ten = gf.elements.ten.value.trim(), loiNhan = gf.elements.loiNhan.value.trim();
    if (ten.length < 2) return setMsg(gMsg, 'Bạn nhập tên để các bạn biết ai gửi nhé.', 'err');
    if (loiNhan.length < 5) return setMsg(gMsg, 'Lời nhắn hơi ngắn, bạn viết thêm vài chữ nhé.', 'err');
    gBtn.disabled = true; setMsg(gMsg, 'Đang gửi…');
    try {
      await send({ type: 'guestbook', ten, loiNhan, website: gf.elements.website.value });
      gf.reset(); gCount.textContent = '0 / 500';
      setMsg(gMsg, 'Đã gửi. Lời nhắn sẽ hiện trên trang sau khi ban tổ chức duyệt.', 'ok');
    } catch (err) {
      setMsg(gMsg, 'Chưa gửi được. Bạn kiểm tra mạng rồi bấm gửi lại, lời nhắn vẫn còn.', 'err');
    }
    gBtn.disabled = false;
  });

  function renderWall(list) {
    wall.replaceChildren();
    if (!list.length) {
      const p = document.createElement('p'); p.className = 'wall-empty';
      p.textContent = 'Chưa có lời nhắn nào. Bạn hãy là người viết đầu tiên.';
      wall.appendChild(p); return;
    }
    list.forEach(m => {
      const a = document.createElement('article'); a.className = 'note';
      const p = document.createElement('p'); p.textContent = m.loiNhan;
      const b = document.createElement('b'); b.textContent = m.ten;
      a.append(p, b); wall.appendChild(a);
    });
  }
  async function loadWall() {
    try {
      const r = await fetch(API, { cache: 'no-store' });
      const d = await r.json();
      if (!d || !d.ok) throw new Error('bad');
      renderWall(Array.isArray(d.messages) ? d.messages : []);
      if (d.people > 0) {
        const c = $('#rsvp-count');
        c.textContent = 'Đã có ' + d.confirmed + ' bạn xác nhận tham gia (' + d.people + ' người, tính cả người đi cùng).';
        c.hidden = false;
      }
    } catch (err) {
      wall.replaceChildren();
      const p = document.createElement('p'); p.className = 'wall-empty';
      p.textContent = 'Chưa tải được các lời nhắn. Bạn vẫn có thể viết lưu bút ở trên.';
      wall.appendChild(p);
    }
  }
  loadWall();

  /* ================= Sao chép số tài khoản ================= */
  $('#copy-stk').addEventListener('click', async e => {
    const btn = e.currentTarget, txt = $('#stk').textContent.trim();
    try { await navigator.clipboard.writeText(txt); }
    catch (err) {
      const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (e2) {} t.remove();
    }
    const old = btn.textContent; btn.textContent = 'Đã sao chép';
    setTimeout(() => { btn.textContent = old; }, 1800);
  });

  onScroll();
})();
