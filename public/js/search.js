/* ============================================================
   Zippy · pencarian (tanpa saran akun terpopuler), halaman hashtag/lokasi, laporan
   ============================================================ */
/* ---------- Report ---------- */
const RSN = [['spam', 'Spam atau menyesatkan', 'alert'], ['kekerasan', 'Kekerasan atau konten berbahaya', 'alert'], ['kebencian', 'Ujaran kebencian', 'shield'], ['pelecehan', 'Pelecehan atau perundungan', 'users'], ['dewasa', 'Konten dewasa', 'eye'], ['hoaks', 'Informasi palsu', 'info'], ['hak_cipta', 'Pelanggaran hak cipta', 'tag'], ['lainnya', 'Lainnya', 'flag']];
function reportSheet(kind, target, label) {
  let sel = null;
  sheet(`<h3>Laporkan ${label}</h3><p class="mu sub">Pilih alasan yang paling sesuai. Laporanmu bersifat rahasia.</p>${rows(RSN.map(([k, t, i]) => ({ k, i, t })))}<textarea id="rn" rows="2" maxlength="300" placeholder="Detail tambahan (opsional)"></textarea><button class="btn dng" id="rs" disabled>Kirim laporan</button>`);
  onPick((k, b) => { sel = k; $$('#sheet .mrow').forEach(x => x.classList.toggle('sel', x === b)); $('#rs').disabled = false });
  $('#rs').onclick = async () => {
    try { await post('/report', { kind, target, reason: sel, note: $('#rn').value }); sheet(`<div class="thanks">${art('check')}<h3>Terima kasih</h3><p class="mu">Laporanmu sudah kami terima dan akan ditinjau.</p><button class="btn" id="ok">Selesai</button></div>`); $('#ok').onclick = closeSheet }
    catch (e) { toast(e.message, 'err') }
  };
}

/* ---------- Halaman hashtag / lokasi ---------- */
async function openTag(tag) { return openList('tag', tag) }
async function openLoc(loc) { return openList('loc', loc) }
async function openList(kind, val) {
  const o = newOv('tg'); let list = [], off = 0, moreP = true, total = 0;
  const title = kind === 'tag' ? '#' + val : val;
  o.innerHTML = `<header class="ab"><button class="ib" data-x aria-label="Kembali">${ic('back')}</button><h2 class="ell">${esc(title)}</h2></header>
<div class="thero"><span class="tbig">${ic(kind === 'tag' ? 'hash' : 'mapPin')}</span><div><h1 class="ell">${esc(title)}</h1><p class="mu" id="tc">Memuat...</p></div><button class="btn sm" id="pl" disabled>${ic('play', 's')} Putar</button></div>
<div class="gr" id="tg">${'<div class="gsk"><i></i><i></i><i></i></div>'}</div><button class="btn g more" id="tm" hidden>Muat lagi</button>`;
  const q = () => `/feed?${kind}=${encodeURIComponent(val)}&offset=${off}&limit=24`;
  const load = async () => {
    try {
      const r = await api(q()); list = list.concat(r.videos); off = r.next; moreP = r.more; total = r.total;
      $('#tg').innerHTML = list.length ? gridHTML(list, false) : `<div class="gempty">${empty(kind === 'tag' ? 'search' : 'video', 'Belum ada video', kind === 'tag' ? 'Belum ada video dengan hashtag ini.' : 'Belum ada video di lokasi ini.')}</div>`;
      bindGrid($('#tg'), list, { fromProfile: false }); $('#tc').textContent = total + ' video'; $('#tm').hidden = !moreP; $('#pl').disabled = !list.length;
    } catch (e) { toast(e.message, 'err') }
  };
  o.onclick = e => { if (e.target.closest('[data-x]')) back(); if (e.target.closest('#tm')) load(); if (e.target.closest('#pl') && list.length) openViewer(list, 0, { fromProfile: false }) };
  lay(o); load();
}

/* ---------- Pencarian: akun, hashtag, video (tanpa saran akun terpopuler) ---------- */
function openSearch(q0 = '') {
  const o = $('#sr'); let type = 'users', tmr = 0, tok = 0;
  const getR = () => { try { return JSON.parse(localStorage.kr || '[]') } catch { return [] } };
  const addR = t => { t = t.trim(); if (!t) return; try { localStorage.kr = JSON.stringify([t, ...getR().filter(x => x !== t)].slice(0, 8)) } catch {} };
  o.innerHTML = `<header class="sb"><button class="ib" data-x aria-label="Kembali">${ic('back')}</button><label class="sbox">${ic('search')}<input id="sq" type="search" placeholder="Cari akun, #hashtag, atau video" autocomplete="off" autocapitalize="none" enterkeyhint="search"><button type="button" class="ib sm" id="sx" hidden aria-label="Hapus">${ic('close')}</button></label></header>
<div class="seg stabs">${[['users', 'Akun', 'user'], ['tags', 'Hashtag', 'hash'], ['videos', 'Video', 'video']].map(([k, t, i]) => `<button data-t="${k}" class="${k === type ? 'on' : ''}">${ic(i, 's')} ${t}</button>`).join('')}</div><div id="sres" class="sres"></div>`;
  const inp = $('#sq'), res = $('#sres');
  const setType = t => { type = t; o.querySelectorAll('.stabs button').forEach(x => x.classList.toggle('on', x.dataset.t === t)) };
  const recentHTML = () => {
    const r = getR();
    return r.length ? `<div class="row sp" style="padding:10px 16px 4px"><h4 class="sh" style="padding:0">Pencarian terakhir</h4><button type="button" class="link" id="clr-r" style="font-size:12.5px;padding:0">Hapus</button></div><div class="chips">${r.map(t => `<button class="chip" data-rq="${esc(t)}">${ic('clock', 's')}${esc(t)}</button>`).join('')}</div>` : '';
  };

  async function run() {
    const raw = inp.value.trim(), my = ++tok; $('#sx').hidden = !raw;
    if (raw[0] === '#' && type !== 'tags') setType('tags'); else if (raw[0] === '@' && type !== 'users') setType('users');
    if (!raw && type === 'users') {
      res.innerHTML = recentHTML() + empty('users', 'Cari akun', 'Ketik username atau nama tampilan untuk mencari pengguna.');
      return;
    }
    if (!raw && type === 'videos') {
      res.innerHTML = recentHTML() + empty('search', 'Cari video', 'Cari berdasarkan keterangan atau lokasi.');
      return;
    }
    res.innerHTML = skel(5);
    try {
      const r = await api(`/search?type=${type}&q=${encodeURIComponent(raw)}`, { cache: 'no-store' }); if (my !== tok) return;
      if (type === 'users') res.innerHTML = r.users.length ? r.users.map(u => userRow(u, isOwn(u.username) ? '' : `<button class="btn sm${u.following ? ' g' : ''}" data-f="${esc(u.username)}">${u.following ? 'Mengikuti' : 'Ikuti'}</button>`)).join('') : empty('users', 'Akun tidak ditemukan', 'Coba username atau nama lain.');
      if (type === 'tags') res.innerHTML = (raw ? '' : '<h4 class="sh">Sedang tren</h4>') + (r.tags.length ? r.tags.map((t, i) => `<button class="li flat tg" data-tag="${esc(t.tag)}"><span class="hb">${ic('hash')}</span><span class="lt"><b>#${esc(t.tag)}</b><small>${t.n} video</small></span>${!raw ? `<span class="rk">${i + 1}</span>` : ''}</button>`).join('') : empty('search', 'Hashtag tidak ditemukan', 'Belum ada video dengan hashtag itu.'));
      if (type === 'videos') { res.innerHTML = r.videos.length ? `<div class="gr">${gridHTML(r.videos, false)}</div>` : empty('video', 'Video tidak ditemukan'); bindGrid(res.firstElementChild || res, r.videos, { fromProfile: false }); if (r.videos.length) { res.firstElementChild.onclick = e => { const b = e.target.closest('.gc'); if (b) { addR(raw); openViewer(r.videos, +b.dataset.i, { fromProfile: false }) } } } }
    } catch (e) { if (my === tok) res.innerHTML = empty('search', 'Gagal mencari', e.message) }
  }
  inp.oninput = () => { clearTimeout(tmr); tmr = setTimeout(run, 260) };
  inp.onkeydown = e => { if (e.key === 'Enter') { clearTimeout(tmr); addR(inp.value); run(); inp.blur() } };
  o.onclick = async e => {
    if (e.target.closest('[data-x]')) return back();
    if (e.target.closest('#sx')) { inp.value = ''; inp.focus(); return run() }
    if (e.target.closest('#clr-r')) { localStorage.removeItem('kr'); return run() }
    const t = e.target.closest('.stabs button'); if (t) { setType(t.dataset.t); return run() }
    const rq = e.target.closest('[data-rq]'); if (rq) { inp.value = rq.dataset.rq; return run() }
    const f = e.target.closest('[data-f]');
    if (f) {
      e.stopPropagation();
      ask(async () => {
        try {
          const r = await post(`/users/${encodeURIComponent(f.dataset.f)}/follow`);
          syncFollowState(f.dataset.f, r);
          f.textContent = r.following ? 'Mengikuti' : r.requested ? 'Diminta' : 'Ikuti';
          f.classList.toggle('g', !!(r.following || r.requested));
          reloadProfiles();
        } catch (err) { toast(err.message, 'err') }
      });
      return;
    }
    const tg = e.target.closest('[data-tag]'); if (tg) { addR('#' + tg.dataset.tag); return openTag(tg.dataset.tag) }
    const row = e.target.closest('.li[data-u]'); if (row) { addR('@' + row.dataset.u); openProfile(row.dataset.u) }
  };
  lay(o); inp.value = q0; run(); setTimeout(() => { if (!q0) inp.focus() }, 280);
}
