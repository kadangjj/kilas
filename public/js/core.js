/* ============================================================
   Zippy · inti: pembantu, pengaturan, tema, API, router tab, sheet geser
   Tagline: Swipe. Play. Repeat.
   ============================================================ */
let SERVER = (localStorage.getItem('kserver') || window.ZIPPY_SERVER || window.KILAS_SERVER || '').replace(/\/+$/, '');
const isApkEnv = () => location.protocol === 'file:' || !!window.ZippyNative || !!window.KilasNative || !!window.Capacitor;
const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const url = f => `${SERVER}/uploads/${f}`;
const S = { theme: 'auto', style: 'default', sound: true, autoplay: true, saver: false, banner: true, beep: true, ...JSON.parse(localStorage.ks || '{}') };
const save = () => { try { localStorage.ks = JSON.stringify(S) } catch {} };
let token = localStorage.getItem('kt'), me = null;

/* ---------- Koneksi Server ---------- */
const cleanUrl = v => { v = String(v || '').trim().replace(/\/+$/, ''); if (v && !/^https?:\/\//i.test(v)) v = 'http://' + v; return v };
function serverSheet(msgTxt = '') {
  sheet(`<div class="auth-h">${logo(44)}<h3>Server Zippy</h3><span class="tag-pill">Swipe. Play. Repeat.</span><p class="mu">${msgTxt || 'Masukkan alamat server Zippy untuk menghubungkan aplikasi.'}</p></div>
  <form id="srv-f" class="col" autocomplete="off">
    <label class="fld">${ic('globe')}<input name="srv" value="${esc(SERVER)}" placeholder="https://zippy.domainmu.com" inputmode="url" autocapitalize="none" autocorrect="off" spellcheck="false"></label>
    <p id="srv-err" class="srv-err" role="alert"></p>
    <div class="row">
      ${SERVER ? '<button type="button" class="btn g" id="srv-rst">Reset ke bawaan</button>' : ''}
      <button class="btn" id="srv-ok">Simpan & hubungkan</button>
    </div>
  </form>`);
  const err = m => { const e = $('#srv-err'); e.textContent = m || ''; e.classList.toggle('on', !!m) };
  const run = async (reset) => {
    const f = $('#srv-f');
    const target = reset ? (window.ZIPPY_SERVER || window.KILAS_SERVER || '').replace(/\/+$/, '') : cleanUrl(f.srv.value);
    if (!reset && !isApkEnv() && !target) return err('Isi alamat server');
    f.querySelectorAll('button').forEach(b => b.disabled = true); err('');
    try {
      if (reset) localStorage.removeItem('kserver'); else localStorage.setItem('kserver', target);
      SERVER = target; closeSheet();
      toast(reset ? 'Server dikembalikan ke bawaan' : 'Terhubung ke server Zippy');
      if (typeof showHome === 'function') showHome(true);
    } catch (e) { err(e.message); f.querySelectorAll('button').forEach(b => b.disabled = false) }
  };
  $('#srv-f').onsubmit = e => { e.preventDefault(); run(false) };
  const rst = $('#srv-rst'); if (rst) rst.onclick = () => run(true);
}

/* ---------- Tema: mode (terang/gelap) + gaya (standar / liquid glass / neo brutalism) ---------- */
const mq = matchMedia('(prefers-color-scheme:dark)');
const THEME_COLOR = { default: ['#f4f8ff', '#0a1430'], glass: ['#e9e4ff', '#0b0a1f'], brutal: ['#fff4d6', '#121212'] };
function theme(anim) {
  const dark = S.theme === 'dark' || (S.theme === 'auto' && mq.matches), h = document.documentElement;
  if (anim) { h.classList.add('tt'); setTimeout(() => h.classList.remove('tt'), 450) }
  h.dataset.theme = dark ? 'dark' : 'light'; h.dataset.style = S.style;
  $('meta[name=theme-color]').content = (THEME_COLOR[S.style] || THEME_COLOR.default)[dark ? 1 : 0];
}
mq.onchange = () => theme(1); theme();

/* ---------- Format ---------- */
const nf = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + ' jt' : n >= 1e4 ? Math.floor(n / 1e3) + ' rb' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.', ',') + ' rb' : String(n || 0);
const ago = t => { const d = Date.now() / 1000 - t; return d < 60 ? 'baru saja' : d < 3600 ? Math.floor(d / 60) + ' mnt' : d < 86400 ? Math.floor(d / 3600) + ' jam' : Math.floor(d / 86400) + ' hari' };
const hm = t => new Date(t * 1000).toTimeString().slice(0, 5);
const ava = (n, a) => a ? `<img src="${url(a)}" alt="" loading="lazy">` : `<span class="ini">${esc((n || '?')[0].toUpperCase())}</span>`;

// teks dengan #hashtag dan @mention yang bisa diketuk
const cap = t => esc(t).replace(/(?<![&\p{L}\p{N}_])#([\p{L}\p{N}_]+)/gu, '<a class="ht" data-h="$1">#$1</a>')
  .replace(/(?<![\w@&])@([a-z0-9_.]{3,20})/gi, (m, u) => { const n = u.replace(/\.+$/, ''); return `<a class="mn" data-u="${n}">@${n}</a>` + u.slice(n.length) });

// bio dengan dukungan tautan URL yang bisa diklik + #hashtag + @mention
const normUrl = u => {
  let s = String(u || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  return s;
};
const prettyUrl = u => String(u || '').trim().replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
const bioCap = t => {
  if (!t) return '';
  const parts = String(t).split(/(https?:\/\/[^\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:id|com|net|org|io|me|co|app|dev|ly|ee|link|xyz|tv|gg|info|biz)(?:\/[^\s<>"']*)?)/gi);
  return parts.map((p, idx) => {
    if (idx % 2 === 1) {
      const clean = p.replace(/[.,!?;:)]+$/, '');
      const trail = p.slice(clean.length);
      return `<a class="bio-inl" href="${esc(normUrl(clean))}" target="_blank" rel="noopener noreferrer">${esc(prettyUrl(clean))}</a>${esc(trail)}`;
    }
    return cap(p);
  }).join('');
};

const GR = ['#2563eb,#60a5fa', '#1d4ed8,#7c3aed', '#0ea5e9,#2563eb', '#f59e0b,#f97316', '#0b1b46,#2563eb', '#06b6d4,#3b82f6', '#8b5cf6,#ec4899', '#11998e,#38ef7d'].map(g => `linear-gradient(135deg,${g})`);
const bnCss = (b, n) => b && b[0] === 'g' ? GR[b.slice(2) - 1] || GR[0] : b ? `url('${url(b)}')` : GR[[...String(n || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 8];
const toFD = o => { const fd = new FormData(); for (const k in o) fd.append(k, o[k]); return fd };
const isOwn = u => !!me && !!u && me.username.toLowerCase() === String(u).toLowerCase();
const buzz = (n = 14) => { try { navigator.vibrate && navigator.vibrate(n) } catch {} };
const empty = (k, t, sub = '') => `<div class="empty">${art(k)}<b>${t}</b>${sub ? `<p>${sub}</p>` : ''}</div>`;
const skel = (n = 5) => Array.from({ length: n }, () => '<div class="sk-row"><i class="sk-c"></i><span><i class="sk-l"></i><i class="sk-l s"></i></span></div>').join('');
const rotCls = v => v && v.rot ? ' r' + (v.rot | 0) : '';
const dnm = o => (o && (o.name || o.username)) || '';
const dt = t => t ? new Date(t * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

function toast(m, kind = '') {
  const t = $('#toast'); t.textContent = m; t.className = 'open ' + kind;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('open'), 2600);
}

/* ---------- Jaringan ---------- */
async function api(p, o = {}) {
  if (isApkEnv() && !SERVER) {
    setTimeout(() => serverSheet('Aplikasi belum terhubung ke server. Silakan atur alamat server.'), 100);
    throw new Error('Atur koneksi server Zippy terlebih dahulu');
  }
  o.headers = { ...(o.headers || {}) }; if (token) o.headers.Authorization = 'Bearer ' + token;
  if (o.json) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(o.json) }
  let r; try { r = await fetch(SERVER + '/api' + p, o) } catch { throw new Error('Tidak ada koneksi ke server' + (SERVER ? ' (' + SERVER + ')' : '')) }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error || 'Terjadi kesalahan'); e.status = r.status; throw e }
  return d;
}
const post = (p, json) => api(p, { method: 'POST', json: json || {} });
function xhr(p, fd, prog, method = 'POST') {
  return new Promise((ok, no) => {
    const x = new XMLHttpRequest(); x.open(method, SERVER + '/api' + p); x.setRequestHeader('Authorization', 'Bearer ' + token);
    x.upload.onprogress = e => prog && e.lengthComputable && prog(e.loaded / e.total);
    x.onload = () => { let d = {}; try { d = JSON.parse(x.responseText) } catch {} x.status < 300 ? ok(d) : no(new Error(d.error || 'Gagal mengunggah')) };
    x.onerror = () => no(new Error('Koneksi bermasalah')); x.send(fd);
  });
}

/* ---------- Manajemen Halaman Tab & Lapisan Overlay (Anti Numpuk) ---------- */
const L = [];
let activeTab = 'home', ignorePop = 0;

const shut = el => {
  if (!el) return;
  el.classList.remove('open');
  if (el._close) { const f = el._close; el._close = null; try { f() } catch {} }
};

function lay(el) {
  if (!el) return;
  closeSheet();
  if (typeof pauseAll === 'function') pauseAll();
  if (typeof stopAudioPreview === 'function' && el.id !== 'aud') stopAudioPreview();
  if (el.classList.contains('open')) {
    const idx = L.indexOf(el);
    if (idx !== -1 && idx !== L.length - 1) {
      L.splice(idx, 1);
      L.push(el);
    }
    if (el.dataset.over) el.style.zIndex = 250;
    else el.style.zIndex = 20 + L.length;
    return;
  }
  if (el.dataset.over) el.style.zIndex = 250;
  else el.style.zIndex = 20 + L.length;
  el.classList.add('open');
  L.push(el);
  history.pushState({ l: L.length }, '');
}

function closeAll() {
  closeSheet();
  if (typeof stopAudioPreview === 'function') stopAudioPreview();
  const n = L.length;
  while (L.length) shut(L.pop());
  $$('#app > .ov.open').forEach(el => shut(el));
  $$('#app > .ov.prof:not([data-tab]), #app > .ov.tg').forEach(el => { if (!el.classList.contains('open')) el.remove() });
  if (n > 0) {
    ignorePop += n;
    try { history.go(-n) } catch { ignorePop = 0 }
    setTimeout(() => { ignorePop = 0 }, 350);
  }
  syncNav();
  return Promise.resolve();
}

const TAB_MAP = { home: '#home-pg', msg: '#inbox', nt: '#notif', me: '#myprof' };
function switchTabView(k) {
  Object.entries(TAB_MAP).forEach(([key, sel]) => {
    const el = $(sel);
    if (el) el.classList.toggle('open', key === k);
  });
  activeTab = k;
  closeAll();
  if (typeof clearChatPoll === 'function') clearChatPoll();
  if (typeof pauseAll === 'function') pauseAll();
  activeTab = k;
  setNav(k);
}

function page(id, html) {
  const el = $(id), keep = el.classList.contains('open') ? el.scrollTop : 0;
  const k = id === '#inbox' ? 'msg' : id === '#notif' ? 'nt' : id === '#myprof' ? 'me' : 'home';
  switchTabView(k);
  el.innerHTML = html;
  el.scrollTop = keep;
}

let rootHook = null;
addEventListener('popstate', e => {
  if (ignorePop > 0) { ignorePop--; return }
  const t0 = L[L.length - 1];
  if (!(t0 && t0.dataset.over) && $('#sheet').classList.contains('open')) { closeSheet(); history.pushState({ l: L.length }, ''); return }
  if (rootHook && rootHook(e)) return;
  const el = L.pop();
  if (el) shut(el);
  syncNav();
  if (typeof resumeFeed === 'function') {
    resumeFeed();
    requestAnimationFrame(resumeFeed);
    setTimeout(resumeFeed, 120);
  }
});
addEventListener('scroll', () => scrollTo(0, 0));
const back = () => history.back();

/* ---------- Sheet Bawah (Bisa Digeser ke Atas / Bawah) ---------- */
function sheet(h) {
  const s = $('#sheet');
  s.classList.remove('full', 'dragging', 'cm');
  s.style.transform = '';
  s.innerHTML = `<div class="sh-grab" aria-hidden="true"><i></i></div>` + h;
  s.scrollTop = 0;
  s.classList.add('open');
}
function closeSheet() {
  const s = $('#sheet');
  if (s) { s.classList.remove('open', 'full', 'dragging'); s.style.transform = ''; setTimeout(() => { if (!s.classList.contains('open')) s.classList.remove('cm') }, 320) }
}
$('#shade').onclick = closeSheet;

(function initSheetDrag() {
  const s = $('#sheet');
  if (!s) return;
  let sy = 0, dy = 0, dragging = false, startFull = false;

  const canStartDrag = (target, clientY) => {
    if (!s.classList.contains('open')) return false;
    if (target.closest('input,textarea,.stg,.sug,.cm-pop')) return false;
    if (target.closest('.sh-grab,.sh-head,h3')) return true;
    const cl = s.querySelector('#cl');
    const r = s.getBoundingClientRect();
    if (clientY - r.top < 54) return true;
    if (cl && cl.scrollTop <= 0 && s.scrollTop <= 0) return 'down-only';
    return false;
  };

  let mode = false;
  const onStart = (y, target) => {
    mode = canStartDrag(target, y);
    if (!mode) return;
    sy = y; dy = 0; dragging = false; startFull = s.classList.contains('full');
  };
  const onMove = (y, ev) => {
    if (!mode) return;
    const delta = y - sy;
    if (mode === 'down-only' && delta <= 0) { mode = false; return }
    if (!dragging && Math.abs(delta) > 8) {
      dragging = true;
      s.classList.add('dragging');
    }
    if (!dragging) return;
    if (ev && ev.cancelable) ev.preventDefault();
    dy = delta;
    if (dy < 0) {
      const upShift = startFull ? Math.max(-24, dy * 0.2) : Math.max(-90, dy * 0.45);
      s.style.transform = `translateY(${upShift}px)`;
    } else {
      s.style.transform = `translateY(${dy}px)`;
    }
  };
  const onEnd = () => {
    if (!mode) return;
    const wasDragging = dragging;
    mode = false; dragging = false;
    s.classList.remove('dragging');
    s.style.transform = '';
    if (!wasDragging) return;
    if (dy < -45 && !startFull) {
      s.classList.add('full');
      buzz(8);
    } else if (dy > 65 && startFull && dy < 190) {
      s.classList.remove('full');
      buzz(8);
    } else if (dy > (startFull ? 190 : 95)) {
      closeSheet();
    }
    dy = 0;
  };

  s.addEventListener('touchstart', e => { if (e.touches.length === 1) onStart(e.touches[0].clientY, e.target) }, { passive: true });
  s.addEventListener('touchmove', e => { if (e.touches.length === 1) onMove(e.touches[0].clientY, e) }, { passive: false });
  s.addEventListener('touchend', onEnd);
  s.addEventListener('touchcancel', onEnd);

  let mDown = false;
  s.addEventListener('mousedown', e => { if (e.button === 0) { mDown = true; onStart(e.clientY, e.target) } });
  addEventListener('mousemove', e => { if (mDown) onMove(e.clientY, null) });
  addEventListener('mouseup', () => { if (mDown) { mDown = false; onEnd() } });
})();

function confirmSheet(t, fn, label = 'Hapus', sub = '') {
  sheet(`<h3>${t}</h3>${sub ? `<p class="mu sub">${sub}</p>` : ''}<div class="row"><button class="btn g" id="no">Batal</button><button class="btn dng" id="ok">${label}</button></div>`);
  $('#no').onclick = closeSheet; $('#ok').onclick = () => { closeSheet(); fn() };
}
const tiles = it => `<div class="tiles">${it.filter(Boolean).map(x => `<button class="tile${x.d ? ' dng' : ''}" data-k="${x.k}"><span class="ti">${ic(x.i)}</span><small>${x.t}</small></button>`).join('')}</div>`;
const rows = it => `<div class="mrows">${it.filter(Boolean).map(x => `<button class="mrow${x.d ? ' dng' : ''}" data-k="${x.k}"><span class="ci">${ic(x.i)}</span><span class="lt"><b>${x.t}</b>${x.s ? `<small>${x.s}</small>` : ''}</span>${x.on ? ic('check') : ''}</button>`).join('')}</div>`;
const onPick = fn => { $('#sheet').onclick = e => { const b = e.target.closest('[data-k]'); if (b) fn(b.dataset.k, b) } };

/* ---------- Navigasi bawah ---------- */
const NAV = [['home', 'home', 'Beranda'], ['msg', 'msg', 'Pesan'], ['up', 'plus', ''], ['nt', 'bell', 'Notif'], ['me', 'user', 'Profil']];
$('nav').innerHTML = NAV.map(([k, i, t]) => `<button data-n="${k}" class="${k === 'home' ? 'on' : k === 'up' ? 'plus' : ''}" ${t ? '' : 'aria-label="Posting video"'}><span class="pill">${ic(i, k === 'up' ? 'b3' : '')}<i></i></span>${t ? `<small>${t}</small>` : ''}</button>`).join('');
const setNav = k => $$('nav [data-n]').forEach(b => b.classList.toggle('on', b.dataset.n === k));
function syncNav() {
  const k = $('#myprof.open') ? 'me' : $('#notif.open') ? 'nt' : $('#inbox.open') ? 'msg' : 'home';
  activeTab = k;
  setNav(k);
}
const B = { msg: 0, nt: 0 };
function paint() { [['msg', B.msg], ['nt', B.nt]].forEach(([k, n]) => { const x = $(`nav [data-n=${k}] i`); if (x) { x.textContent = n > 9 ? '9+' : n; x.style.display = n ? 'block' : 'none' } }) }
async function badges() { if (!token) return; try { const b = await api('/badges'); B.msg = b.msgs; B.nt = b.notifs; paint() } catch {} }

/* ---------- Sinkronisasi Status Follow & Story Ring Global ---------- */
let followDirty = false;
function syncFollowState(username, r) {
  if (!username || !r) return;
  const uLow = String(username).toLowerCase();
  followDirty = true;
  $$('.it').forEach(c => {
    if (c._v && String(c._v.username).toLowerCase() === uLow) {
      c._v.following = !!r.following;
      c._v.requested = !!r.requested;
      if (typeof syncCard === 'function') syncCard(c);
      if (!r.following && typeof tab !== 'undefined' && tab === 'following' && c.closest('#feed') && !c._v.rp_u) {
        c.remove();
      }
    }
  });
  if (!r.following && typeof tab !== 'undefined' && tab === 'following' && $('#feed') && !$('#feed').querySelector('.it')) {
    if (typeof loadMore === 'function') loadMore(true);
  }
  $$('[data-f]').forEach(btn => {
    if (String(btn.dataset.f).toLowerCase() === uLow) {
      btn.textContent = r.following ? (r.friend ? 'Teman' : 'Mengikuti') : r.requested ? 'Diminta' : 'Ikuti';
      btn.classList.toggle('g', !!(r.following || r.requested));
    }
  });
}

function clearStoryRing(username) {
  if (!username) return;
  const uLow = String(username).toLowerCase();
  $$('.it').forEach(c => {
    if (c._v && String(c._v.username).toLowerCase() === uLow) {
      c._v.story_unseen = false;
      const av = c.querySelector('.rail .av');
      if (av) av.classList.remove('hs');
    }
  });
  $$('.prof').forEach(p => {
    if (p._u && String(p._u).toLowerCase() === uLow) {
      const pa = p.querySelector('.pa');
      if (pa) pa.classList.remove('hs', 'un');
    }
  });
  $$('.stray [data-su]').forEach(b => {
    if (String(b.dataset.su).toLowerCase() === uLow) {
      const sr = b.querySelector('.sr');
      if (sr) sr.classList.remove('un');
    }
  });
}

/* ---------- Masuk & Pendaftaran Multi-Halaman Terpisah (Halaman Tanggal Lahir Khusus) ---------- */
const ask = f => token ? f() : authSheet(false);

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function getZodiacInfo(day, month) {
  const z = [
    [20, "♑ Capricorn", "Tanah"], [19, "♒ Aquarius", "Udara"], [20, "♓ Pisces", "Air"],
    [20, "♈ Aries", "Api"], [21, "♉ Taurus", "Tanah"], [21, "♊ Gemini", "Udara"],
    [22, "♋ Cancer", "Air"], [23, "♌ Leo", "Api"], [23, "♍ Virgo", "Tanah"],
    [23, "♎ Libra", "Udara"], [22, "♏ Scorpio", "Air"], [21, "♐ Sagittarius", "Api"],
    [31, "♑ Capricorn", "Tanah"]
  ];
  const idx = day <= z[month - 1][0] ? month - 1 : month;
  return { name: z[idx][1], elem: z[idx][2] };
}

function calcExactAge(y, m, d) {
  const now = new Date();
  let age = now.getFullYear() - y;
  const mDiff = (now.getMonth() + 1) - m;
  if (mDiff < 0 || (mDiff === 0 && now.getDate() < d)) age--;
  return age;
}

function ensureRegOverlay() {
  let el = $('#reg-ov');
  if (!el) {
    el = document.createElement('div');
    el.id = 'reg-ov';
    el.className = 'ov reg-ov';
    el.dataset.over = '1';
    $('#app').appendChild(el);
  }
  return el;
}

let regState = { day: 17, month: 8, year: 2005, name: '', username: '', email: '' };

function authSheet(reg = false) {
  if (reg) return openRegisterFlow(1);
  sheet(`<div class="auth-h">${logo(46)}<h3>Masuk ke Zippy</h3><span class="tag-pill">Swipe. Play. Repeat.</span><p class="mu">Masuk untuk menyukai video, berkomentar, menjaga api runtutan, dan berbagi cerita.</p></div>
<form id="af" class="col">
  <label class="fld">${ic('user')}<input name="username" placeholder="Username atau email" autocomplete="username" autocapitalize="none" required></label>
  <label class="fld">${ic('lock')}<input name="password" type="password" placeholder="Kata sandi" autocomplete="current-password" required></label>
  <button class="btn">Masuk Sekarang</button>
  <div class="auth-sep"><span>Belum punya akun Zippy?</span></div>
  <button type="button" class="btn g" id="sw-reg">${ic('spark', 's')} Buat Akun Baru (Halaman Daftar)</button>
</form>`);
  $('#sw-reg').onclick = () => { closeSheet(); openRegisterFlow(1) };
  $('#af').onsubmit = async e => {
    e.preventDefault(); const b = e.target.querySelector('.btn'); b.disabled = true;
    try {
      const j = Object.fromEntries(new FormData(e.target));
      const r = await api('/login', { method: 'POST', json: j });
      token = r.token; me = r.user; localStorage.setItem('kt', token); closeSheet(); toast('Selamat datang kembali, @' + me.username); live(); showHome(true);
    } catch (err) { toast(err.message, 'err'); b.disabled = false }
  };
}

function openRegisterFlow(step = 1) {
  closeSheet();
  const o = ensureRegOverlay();
  if (!o.classList.contains('open')) lay(o);
  renderRegisterStep(o, step);
}

function renderRegisterStep(o, step) {
  const curYear = new Date().getFullYear();
  if (step === 1) {
    // HALAMAN 1 KHUSUS TANGGAL LAHIR (TERPISAH DARI FORM AKUN & LOGIN)
    const maxDaysInMonth = (y, m) => new Date(y, m, 0).getDate();
    const maxD = maxDaysInMonth(regState.year, regState.month);
    if (regState.day > maxD) regState.day = maxD;

    const years = [];
    for (let y = curYear; y >= 1935; y--) years.push(y);

    o.innerHTML = `<header class="ab reg-ab">
      <button type="button" class="ib" id="reg-close" aria-label="Kembali">${ic('back')}</button>
      <div class="reg-step-hd">
        <small>Pendaftaran Akun Baru · Langkah 1 dari 2</small>
        <div class="reg-prog"><i style="width:50%"></i></div>
      </div>
      <span style="width:40px"></span>
    </header>
    <div class="bd reg-bd">
      <div class="reg-hero">
        <div class="reg-bday-orb">
          <svg viewBox="0 0 64 64" width="54" height="54" fill="none">
            <rect x="10" y="30" width="44" height="24" rx="7" fill="url(#bdayG)" />
            <path d="M10 38c5 0 5 4 11 4s6-4 11-4 5 4 11 4 6-4 11-4" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
            <rect x="29" y="16" width="6" height="14" rx="3" fill="#ffd166"/>
            <path d="M32 6c3.5 4 4 7.5 0 10-4-2.5-3.5-6 0-10z" fill="#ff5400"/>
            <circle cx="32" cy="12" r="2" fill="#fff"/>
            <defs><linearGradient id="bdayG" x1="10" y1="30" x2="54" y2="54" gradientUnits="userSpaceOnUse"><stop stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
          </svg>
        </div>
        <h2>Kapan tanggal lahirmu?</h2>
        <p class="mu">Pilih tanggal, bulan, dan tahun lahirmu. Tanggal lahirmu bersifat pribadi dan tidak akan ditampilkan di profil publik.</p>
      </div>

      <div class="bday-picker-card">
        <div class="bday-cols">
          <div class="bday-col">
            <label>Tanggal</label>
            <select id="bd-d" size="5" class="bday-wheel"></select>
          </div>
          <div class="bday-col bday-col-m">
            <label>Bulan</label>
            <select id="bd-m" size="5" class="bday-wheel">
              ${MONTHS_ID.map((m, idx) => `<option value="${idx + 1}" ${regState.month === idx + 1 ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
          <div class="bday-col">
            <label>Tahun</label>
            <select id="bd-y" size="5" class="bday-wheel">
              ${years.map(y => `<option value="${y}" ${regState.year === y ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="bday-quick">
          <span>Pilih Cepat Tahun:</span>
          <div class="bday-qchips">
            ${[2010, 2008, 2006, 2004, 2002, 2000, 1998, 1995].map(y => `<button type="button" class="chip" data-qy="${y}">${y}</button>`).join('')}
          </div>
        </div>
      </div>

      <div class="bday-summary-card" id="bd-sum"></div>

      <div class="bday-priv-note">
        ${ic('lock', 's')}
        <span>Digunakan untuk memverifikasi syarat usia komunitas Zippy (minimal 13 tahun) dan menjaga keamanan ruang obrolan.</span>
      </div>

      <div class="reg-foot">
        <button type="button" class="btn" id="bd-next">Lanjut ke Pembuatan Akun ${ic('chev', 's')}</button>
        <button type="button" class="link" id="bd-to-login">Sudah punya akun? Masuk di halaman Login</button>
      </div>
    </div>`;

    const selD = o.querySelector('#bd-d'), selM = o.querySelector('#bd-m'), selY = o.querySelector('#bd-y');
    const sumEl = o.querySelector('#bd-sum'), nextBtn = o.querySelector('#bd-next');

    function populateDays() {
      const mDays = maxDaysInMonth(regState.year, regState.month);
      if (regState.day > mDays) regState.day = mDays;
      selD.innerHTML = Array.from({ length: mDays }, (_, i) => `<option value="${i + 1}" ${regState.day === i + 1 ? 'selected' : ''}>${String(i + 1).padStart(2, '0')}</option>`).join('');
    }

    function updateSummary() {
      const age = calcExactAge(regState.year, regState.month, regState.day);
      const zod = getZodiacInfo(regState.day, regState.month);
      const ok = age >= 13 && age <= 120;
      const dateStr = `${regState.day} ${MONTHS_ID[regState.month - 1]} ${regState.year}`;
      sumEl.innerHTML = `
        <div class="bday-sum-top">
          <div>
            <small class="mu">Tanggal Lahir Terpilih</small>
            <h4>${dateStr}</h4>
          </div>
          <div class="bday-badges">
            <span class="bday-pill ${ok ? 'ok' : 'bad'}">${age} Tahun</span>
            <span class="bday-pill zod">${zod.name}</span>
          </div>
        </div>
        <div class="bday-elig ${ok ? 'ok' : 'bad'}">
          ${ok ? `${ic('check', 's b3')} Memenuhi syarat usia Zippy (13+ tahun). Klik Lanjut untuk membuat username & sandi.`
               : `${ic('alert', 's')} Maaf, kamu harus berusia minimal 13 tahun untuk mendaftar di Zippy.`}
        </div>`;
      nextBtn.disabled = !ok;
    }

    populateDays();
    updateSummary();

    setTimeout(() => {
      [selD, selM, selY].forEach(s => {
        const opt = s.querySelector('option:checked');
        if (opt) s.scrollTop = Math.max(0, opt.offsetTop - s.clientHeight / 2 + 18);
      });
    }, 40);

    selD.onchange = () => { regState.day = +selD.value; buzz(6); updateSummary() };
    selM.onchange = () => { regState.month = +selM.value; populateDays(); buzz(6); updateSummary() };
    selY.onchange = () => { regState.year = +selY.value; populateDays(); buzz(6); updateSummary() };

    o.querySelector('.bday-qchips').onclick = e => {
      const b = e.target.closest('[data-qy]'); if (!b) return;
      regState.year = +b.dataset.qy;
      selY.value = String(regState.year);
      const opt = selY.querySelector('option:checked');
      if (opt) selY.scrollTop = Math.max(0, opt.offsetTop - selY.clientHeight / 2 + 18);
      populateDays(); buzz(8); updateSummary();
    };

    o.querySelector('#reg-close').onclick = () => back();
    o.querySelector('#bd-to-login').onclick = () => { back(); setTimeout(() => authSheet(false), 180) };
    nextBtn.onclick = () => {
      const age = calcExactAge(regState.year, regState.month, regState.day);
      if (age < 13) return toast('Usia minimal pendaftaran adalah 13 tahun', 'err');
      buzz(10);
      renderRegisterStep(o, 2);
    };
    return;
  }

  // HALAMAN 2 KHUSUS DETAIL AKUN (SETELAH TANGGAL LAHIR DIKONFIRMASI)
  const isoBdate = `${regState.year}-${String(regState.month).padStart(2, '0')}-${String(regState.day).padStart(2, '0')}`;
  const age = calcExactAge(regState.year, regState.month, regState.day);
  const prettyBdate = `${regState.day} ${MONTHS_ID[regState.month - 1]} ${regState.year} (${age} Thn)`;

  o.innerHTML = `<header class="ab reg-ab">
    <button type="button" class="ib" id="reg-back-step1" aria-label="Kembali ke Tanggal Lahir">${ic('back')}</button>
    <div class="reg-step-hd">
      <small>Pendaftaran Akun Baru · Langkah 2 dari 2</small>
      <div class="reg-prog"><i style="width:100%"></i></div>
    </div>
    <span style="width:40px"></span>
  </header>
  <div class="bd reg-bd">
    <div class="reg-hero" style="padding-bottom:2px">
      <h2>Lengkapi Profil Akunmu</h2>
      <p class="mu">Satu langkah lagi! Buat nama tampilan, username unik, dan kata sandi akun Zippy kamu.</p>
    </div>

    <div class="bday-confirmed-bar">
      <div class="row" style="gap:8px">
        <span class="bday-mini-ic">🎂</span>
        <div>
          <small class="mu" style="display:block;font-size:11px">Tanggal Lahir Terverifikasi</small>
          <b style="font-size:13.5px">${prettyBdate}</b>
        </div>
      </div>
      <button type="button" class="chip" id="reg-edit-bday">Ubah Tgl Lahir</button>
    </div>

    <form id="reg-f" class="col" style="gap:12px">
      <input type="hidden" name="birth_date" value="${isoBdate}">
      <label class="reg-lbl">
        <span>Nama Tampilan</span>
        <div class="fld">${ic('type')}<input name="name" id="rg-name" maxlength="30" value="${esc(regState.name)}" placeholder="Nama lengkap atau panggilanmu" autocomplete="name" required></div>
      </label>
      <label class="reg-lbl">
        <span>Username Unik</span>
        <div class="fld">${ic('user')}<input name="username" id="rg-user" maxlength="20" value="${esc(regState.username)}" placeholder="huruf, angka, titik, atau _" autocomplete="username" autocapitalize="none" required></div>
      </label>
      <label class="reg-lbl">
        <span>Email <small class="mu">(Opsional)</small></span>
        <div class="fld">${ic('mail')}<input name="email" id="rg-email" type="email" value="${esc(regState.email)}" placeholder="nama@email.com" autocomplete="email"></div>
      </label>
      <label class="reg-lbl">
        <span>Kata Sandi</span>
        <div class="fld">${ic('lock')}<input name="password" id="rg-pass" type="password" minlength="6" placeholder="Minimal 6 karakter" autocomplete="new-password" required><button type="button" class="ib sm" id="rg-pw-tg" aria-label="Tampilkan sandi">${ic('eye', 's')}</button></div>
        <div class="pw-meter" id="rg-pw-m"><i></i><small>Minimal 6 karakter</small></div>
      </label>

      <button class="btn" id="rg-sub">${ic('check', 's b3')} Selesaikan & Buat Akun Zippy</button>
    </form>
  </div>`;

  const saveInputs = () => {
    regState.name = o.querySelector('#rg-name').value;
    regState.username = o.querySelector('#rg-user').value;
    regState.email = o.querySelector('#rg-email').value;
  };
  o.querySelector('#reg-back-step1').onclick = () => { saveInputs(); renderRegisterStep(o, 1) };
  o.querySelector('#reg-edit-bday').onclick = () => { saveInputs(); renderRegisterStep(o, 1) };

  const pwInp = o.querySelector('#rg-pass'), pwTg = o.querySelector('#rg-pw-tg'), pwM = o.querySelector('#rg-pw-m');
  pwTg.onclick = () => {
    const show = pwInp.type === 'password';
    pwInp.type = show ? 'text' : 'password';
    pwTg.innerHTML = ic(show ? 'eyeoff' : 'eye', 's');
  };
  pwInp.oninput = () => {
    const v = pwInp.value;
    let sc = 0;
    if (v.length >= 6) sc++;
    if (v.length >= 9) sc++;
    if (/[A-Z]/.test(v) && /[0-9]/.test(v)) sc++;
    if (/[^A-Za-z0-9]/.test(v)) sc++;
    const cols = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#10b981'];
    const lbls = ['Terlalu pendek (min. 6 karakter)', 'Cukup', 'Kuat', 'Sangat Kuat', 'Sangat Aman'];
    pwM.querySelector('i').style.width = (v.length ? Math.max(20, sc * 25) : 0) + '%';
    pwM.querySelector('i').style.background = cols[sc];
    pwM.querySelector('small').textContent = v.length ? lbls[sc] : 'Minimal 6 karakter';
  };

  o.querySelector('#reg-f').onsubmit = async e => {
    e.preventDefault();
    saveInputs();
    const b = o.querySelector('#rg-sub'); b.disabled = true;
    try {
      const j = Object.fromEntries(new FormData(e.target));
      if (!j.email) delete j.email;
      const r = await api('/register', { method: 'POST', json: j });
      token = r.token; me = r.user; localStorage.setItem('kt', token);
      regState = { day: 17, month: 8, year: 2005, name: '', username: '', email: '' };
      await closeAll();
      toast('Selamat bergabung di Zippy, @' + me.username + '! 🎉');
      live();
      showHome(true);
    } catch (err) {
      toast(err.message, 'err');
      b.disabled = false;
    }
  };
}

/* ---------- Saran saat mengetik #hashtag atau @user ---------- */
function suggest(el, box) {
  let t = 0, last = '';
  const tok = () => {
    const v = el.value, p = el.selectionStart == null ? v.length : el.selectionStart, m = /(^|\s)([#@])([\p{L}\p{N}_.]*)$/u.exec(v.slice(0, p));
    return m ? { ch: m[2], q: m[3], start: p - m[3].length - 1, end: p } : null;
  };
  const hide = () => { box.innerHTML = ''; box.classList.remove('open'); last = '' };
  const run = async () => {
    const k = tok(); if (!k) return hide();
    const key = k.ch + k.q; if (key === last) return; last = key;
    try {
      const r = await api('/suggest?kind=' + (k.ch === '#' ? 'tag' : 'user') + '&q=' + encodeURIComponent(k.q)), now = tok();
      if (!now || now.ch + now.q !== key) return;
      let h;
      if (k.ch === '#') {
        const it = r.items.map(x => `<button type="button" class="chip" data-ins="#${esc(x.tag)}">${ic('hash', 's')}${esc(x.tag)}<small>${x.n}</small></button>`);
        if (k.q && !r.items.some(x => x.tag === k.q.toLowerCase())) it.unshift(`<button type="button" class="chip new" data-ins="#${esc(k.q)}">${ic('plus', 's')}#${esc(k.q)}</button>`);
        h = it.join('');
      } else h = r.items.map(x => `<button type="button" class="chip u" data-ins="@${esc(x.username)}"><span class="sa mini">${ava(x.username, x.avatar)}</span>@${esc(x.username)}</button>`).join('');
      box.innerHTML = h; box.classList.toggle('open', !!h);
    } catch { hide() }
  };
  const kick = () => { clearTimeout(t); t = setTimeout(run, 170) };
  ['input', 'click', 'keyup'].forEach(ev => el.addEventListener(ev, kick));
  box.onpointerdown = e => e.preventDefault();
  box.onclick = e => {
    const b = e.target.closest('[data-ins]'), k = tok(); if (!b || !k) return;
    const v = el.value, ins = b.dataset.ins + ' ';
    el.value = v.slice(0, k.start) + ins + v.slice(k.end); const pos = k.start + ins.length;
    try { el.setSelectionRange(pos, pos) } catch {} el.focus(); hide(); el.dispatchEvent(new Event('input'));
  };
}

/* ---------- Ketuk #hashtag / @mention / lokasi di mana saja ---------- */
document.addEventListener('click', e => {
  const h = e.target.closest('.ht'); if (h) { e.preventDefault(); closeSheet(); return openTag(h.dataset.h) }
  const m = e.target.closest('.mn'); if (m) { e.preventDefault(); closeSheet(); return openProfile(m.dataset.u) }
  const l = e.target.closest('.lc'); if (l) { e.preventDefault(); closeSheet(); return openLoc(l.dataset.l) }
});

/* ---------- Penampil foto: ketuk foto di obrolan atau komentar ---------- */
function openImage(src) {
  const o = $('#iv'); let sc = 1, tx = 0, ty = 0, pts = new Map(), d0 = 0, s0 = 1, last = 0;
  o.innerHTML = `<header class="ivh"><button class="ib" data-x aria-label="Tutup">${ic('close')}</button><span></span><button class="ib" data-dl aria-label="Simpan foto">${ic('download')}</button></header><div class="ivs"><img src="${esc(src)}" alt="" draggable="false"></div>`;
  const im = o.querySelector('img'), st = o.querySelector('.ivs'), apply = () => { im.style.transform = `translate(${tx}px,${ty}px) scale(${sc})` };
  const fit = () => { if (sc <= 1.01) { sc = 1; tx = ty = 0 } else { const r = st.getBoundingClientRect(), mx = (r.width * (sc - 1)) / 2, my = (r.height * (sc - 1)) / 2; tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty)) } apply() };
  st.onpointerdown = e => { pts.set(e.pointerId, [e.clientX, e.clientY]); st.setPointerCapture(e.pointerId); if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); s0 = sc } };
  st.onpointermove = e => {
    const p = pts.get(e.pointerId); if (!p) return;
    if (pts.size === 2) { pts.set(e.pointerId, [e.clientX, e.clientY]); const [a, b] = [...pts.values()]; sc = Math.max(1, Math.min(5, s0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / (d0 || 1))); fit(); return }
    if (sc > 1) { tx += e.clientX - p[0]; ty += e.clientY - p[1]; fit() } pts.set(e.pointerId, [e.clientX, e.clientY]);
  };
  const up = e => { pts.delete(e.pointerId); if (!pts.size) { const n = Date.now(); if (n - last < 300) { sc = sc > 1.2 ? 1 : 2.5; fit(); last = 0 } else last = n } };
  st.onpointerup = up; st.onpointercancel = e => pts.delete(e.pointerId);
  o.onclick = async e => {
    if (e.target.closest('[data-x]')) return back();
    if (e.target.closest('[data-dl]')) { try { const b = await (await fetch(src)).blob(), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'zippy-foto.' + (src.split('.').pop().split('?')[0] || 'jpg'); document.body.append(a); a.click(); a.remove(); toast('Foto disimpan') } catch { window.open(src, '_blank') } }
  };
  lay(o);
}
