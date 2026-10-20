/* ============================================================
   Zippy · pengaturan: mode + gaya tema, mode hemat data, arsip story, video privat, stiker custom
   Tagline: Swipe. Play. Repeat.
   ============================================================ */
const THEME_ART = {
  default: `<svg viewBox="0 0 96 120" aria-hidden="true"><rect width="96" height="120" rx="14" fill="#0a1430"/><rect x="8" y="10" width="80" height="60" rx="10" fill="#111f45"/><circle cx="21" cy="24" r="7" fill="url(#gB)"/><rect x="33" y="19" width="40" height="5" rx="2.5" fill="#93a4d0"/><rect x="33" y="28" width="26" height="4" rx="2" fill="#22356b"/><rect x="14" y="42" width="68" height="20" rx="7" fill="#1b2d5e"/><rect x="8" y="78" width="80" height="14" rx="7" fill="url(#gB)"/><rect x="8" y="98" width="80" height="14" rx="7" fill="#1b2d5e"/></svg>`,
  glass: `<svg viewBox="0 0 96 120" aria-hidden="true"><defs><linearGradient id="tgb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4c1d95"/><stop offset=".5" stop-color="#1e3a8a"/><stop offset="1" stop-color="#0e7490"/></linearGradient><radialGradient id="tg1"><stop offset="0" stop-color="#f472b6" stop-opacity=".95"/><stop offset="1" stop-color="#f472b6" stop-opacity="0"/></radialGradient><radialGradient id="tg2"><stop offset="0" stop-color="#38bdf8" stop-opacity=".95"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></radialGradient></defs><rect width="96" height="120" rx="14" fill="url(#tgb)"/><circle cx="24" cy="26" r="30" fill="url(#tg1)"/><circle cx="76" cy="92" r="34" fill="url(#tg2)"/><rect x="8" y="10" width="80" height="60" rx="12" fill="#fff" fill-opacity=".16" stroke="#fff" stroke-opacity=".5"/><path d="M12 16a8 8 0 0 1 8-6h40c-18 2-34 6-48 14z" fill="#fff" opacity=".22"/><circle cx="21" cy="25" r="7" fill="#fff" fill-opacity=".5"/><rect x="33" y="20" width="40" height="5" rx="2.5" fill="#fff" fill-opacity=".8"/><rect x="33" y="29" width="26" height="4" rx="2" fill="#fff" fill-opacity=".45"/><rect x="14" y="42" width="68" height="20" rx="8" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-opacity=".35"/><rect x="8" y="80" width="80" height="26" rx="13" fill="#fff" fill-opacity=".2" stroke="#fff" stroke-opacity=".55"/><circle cx="26" cy="93" r="5" fill="#fff" fill-opacity=".85"/><circle cx="48" cy="93" r="5" fill="#fff" fill-opacity=".45"/><circle cx="70" cy="93" r="5" fill="#fff" fill-opacity=".45"/></svg>`,
  brutal: `<svg viewBox="0 0 96 120" aria-hidden="true"><rect width="96" height="120" rx="6" fill="#fff4d6" stroke="#000" stroke-width="3"/><rect x="13" y="15" width="76" height="56" fill="#000"/><rect x="9" y="11" width="76" height="56" fill="#ffde59" stroke="#000" stroke-width="3"/><circle cx="22" cy="24" r="7" fill="#ff6b9d" stroke="#000" stroke-width="2.5"/><rect x="34" y="19" width="38" height="6" fill="#000"/><rect x="34" y="29" width="24" height="5" fill="#000" opacity=".55"/><rect x="16" y="42" width="62" height="18" fill="#4d96ff" stroke="#000" stroke-width="2.5"/><rect x="13" y="82" width="76" height="14" fill="#000"/><rect x="9" y="78" width="76" height="14" fill="#6bcb77" stroke="#000" stroke-width="3"/><rect x="13" y="104" width="76" height="9" fill="#000"/><rect x="9" y="100" width="76" height="9" fill="#ff6b9d" stroke="#000" stroke-width="3"/></svg>`,
};
const STYLES = [['default', 'Standar', 'Biru bersih dan modern'], ['glass', 'Liquid Glass', 'Kaca buram yang berkilau'], ['brutal', 'Neo Brutalism', 'Tebal, kontras, penuh warna']];

/* ---------- Pasang sebagai aplikasi (PWA) ---------- */
let dip = null;
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || isApkEnv();
addEventListener('beforeinstallprompt', e => { e.preventDefault(); dip = e; const r = $('[data-r=install] small'); if (r) r.textContent = 'Tambahkan Zippy ke layar utama'; maybeInstallBanner() });
addEventListener('appinstalled', () => { dip = null; closeSheet(); $('#ib').classList.remove('open'); toast('Zippy terpasang di layar utamamu'); const r = $('[data-r=install]'); if (r) r.remove() });
async function installApp() {
  if (dip) { dip.prompt(); try { await dip.userChoice } catch {} dip = null; $('#ib').classList.remove('open'); return }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  sheet(`<div class="auth-h">${logo(44)}<h3>Pasang Zippy</h3><span class="tag-pill">Swipe. Play. Repeat.</span><p class="mu">Buka dari layar utama seperti aplikasi biasa: layar penuh, tanpa bilah browser.</p></div>
${ios ? `<ol class="steps"><li>Ketuk tombol <b>Bagikan</b> ${ic('share', 's')} di Safari</li><li>Pilih <b>Tambahkan ke Layar Utama</b></li><li>Ketuk <b>Tambah</b></li></ol>`
      : `<ol class="steps"><li>Ketuk menu <b>${ic('more', 's b3')}</b> di pojok kanan atas Chrome</li><li>Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b></li><li>Ketuk <b>Instal</b></li></ol>`}<button class="btn" id="ok">Mengerti</button>`);
  $('#ok').onclick = closeSheet;
}
function maybeInstallBanner() {
  if (!dip || standalone() || localStorage.ki || !$('#ib')) return;
  setTimeout(() => {
    if (!dip || L.length) return; const b = $('#ib');
    b.innerHTML = `<span class="lgw">${logo(38)}</span><span class="lt"><b>Pasang Zippy</b><small>Swipe. Play. Repeat. · Buka lebih cepat</small></span><button class="btn sm" data-i="1">Pasang</button><button class="ib sm" data-i="0" aria-label="Tutup">${ic('close')}</button>`;
    b.classList.add('open');
  }, 9000);
}

/* ---------- Halaman pengaturan (Tanpa URL di menu setting) ---------- */
function settings() {
  const o = $('#set');
  const sw = (k, t, s, i) => `<div class="si"><span class="ci">${ic(i)}</span><span class="lt"><b>${t}</b><small>${s}</small></span><label class="sw"><input type="checkbox" data-k="${k}" ${S[k] ? 'checked' : ''}><span></span></label></div>`;
  const svsw = (k, t, s, i, on) => `<div class="si"><span class="ci">${ic(i)}</span><span class="lt"><b>${t}</b><small>${s}</small></span><label class="sw"><input type="checkbox" data-sv="${k}" ${on ? 'checked' : ''}><span></span></label></div>`;
  const row = (x, i, t, s, d) => `<button class="si${d ? ' dng' : ''}" data-r="${x}"><span class="ci">${ic(i)}</span><span class="lt"><b>${t}</b><small>${s}</small></span>${d ? '' : ic('chev')}</button>`;
  o.innerHTML = `<header class="ab"><button class="ib" data-x aria-label="Kembali">${ic('back')}</button><h2>Pengaturan</h2></header>
<p class="sec">Tampilan</p><div class="si"><span class="ci">${ic(document.documentElement.dataset.theme === 'dark' ? 'moon' : 'sun')}</span><span class="lt"><b>Mode</b><small>Terang, gelap, atau ikut sistem</small></span></div>
<div class="seg">${[['auto', 'Otomatis'], ['light', 'Terang'], ['dark', 'Gelap']].map(([k, t]) => `<button data-th="${k}" class="${S.theme === k ? 'on' : ''}">${t}</button>`).join('')}</div>
<div class="si"><span class="ci">${ic('palette')}</span><span class="lt"><b>Gaya tema</b><small>Ubah tampilan seluruh aplikasi</small></span></div>
<div class="tcards">${STYLES.map(([k, t, s]) => `<button class="tcard${S.style === k ? ' on' : ''}" data-st="${k}"><span class="tart">${THEME_ART[k]}</span><b>${t}</b><small>${s}</small><i class="tck">${ic('check', 'b3')}</i></button>`).join('')}</div>
<p class="sec">Video & Data</p>${sw('sound', 'Suara otomatis', 'Putar video dengan suara', 'vol')}${sw('autoplay', 'Putar otomatis', 'Mulai saat video terlihat', 'play')}${sw('saver', 'Mode hemat data', 'Matikan preload video berikutnya dan hemat kuota internet', 'spark')}
<p class="sec">Notifikasi</p>${sw('banner', 'Banner notifikasi', 'Tampilkan pesan masuk di atas layar', 'bell')}${sw('beep', 'Bunyi notifikasi', 'Nada singkat saat ada pesan', 'msg')}
${token ? `<p class="sec">Privasi dan keamanan</p>${svsw('private', 'Akun privat', 'Hanya pengikut yang kamu setujui yang bisa melihat video, repost, sorotan, dan mengirim pesan kepadamu', 'lock', me.private)}${svsw('visitors_on', 'Riwayat pengunjung profil', 'Lihat siapa yang membuka profilmu. Kalau mati, kunjunganmu ke profil orang lain juga tidak tercatat', 'eye', me.visitors_on)}${row('archive', 'clock', 'Arsip story', 'Lihat semua story yang pernah kamu bagikan')}${row('priv_vids', 'lock', 'Ruang video privat', 'Lihat video yang diatur Hanya Saya (tidak tampil di Beranda & profil publik)')}${row('stickers', 'smile', 'Studio Stiker Custom', 'Buat dan kelola stiker custom milikmu')}${row('visitors', 'footprints', 'Lihat pengunjung profil', 'Siapa saja yang baru mampir')}${row('requests', 'userplus', 'Permintaan mengikuti', 'Setujui atau tolak pengikut baru')}${row('verify', 'star', 'Centang biru', me.verified ? 'Akunmu sudah terverifikasi' : 'Ajukan verifikasi ke sistem')}` : ''}
<p class="sec">Akun</p>${token ? row('edit', 'edit', 'Ubah profil', 'Banner, foto, nama, bisik-bisik, bio, dan tautan') + row('email', 'mail', 'Email', me.email ? esc(me.email) : 'Belum ditambahkan') + (me.birth_date ? `<div class="si"><span class="ci">${ic('spark')}</span><span class="lt"><b>Tanggal lahir</b><small>${esc(me.birth_date)} (Privat)</small></span></div>` : '') + row('pass', 'key', 'Ubah sandi', 'Ganti password akunmu') + row('out', 'out', 'Keluar', '@' + esc(me.username), 1) : row('in', 'user', 'Masuk', 'Masuk atau buat akun')}
${standalone() ? '' : `<p class="sec">Aplikasi</p>${row('install', 'phone', 'Pasang aplikasi', dip ? 'Tambahkan Zippy ke layar utama' : 'Buka seperti aplikasi Android')}`}
<div class="si"><span class="ci">${ic('info')}</span><span class="lt"><b>Zippy 2.9.0</b><small>Swipe. Play. Repeat.</small></span></div>`;
  o.onclick = e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.x !== undefined) back();
    if (t.dataset.th) { S.theme = t.dataset.th; save(); theme(1); o.querySelectorAll('[data-th]').forEach(x => x.classList.toggle('on', x === t)) }
    if (t.dataset.st) { S.style = t.dataset.st; save(); theme(1); buzz(10); o.querySelectorAll('[data-st]').forEach(x => x.classList.toggle('on', x === t)) }
    const r = t.dataset.r;
    if (r === 'edit') editPage(me); if (r === 'in') authSheet(); if (r === 'email') emailSheet(); if (r === 'pass') passSheet(); if (r === 'install') installApp(); if (r === 'archive') openStoryArchive(); if (r === 'visitors') openVisitors(); if (r === 'priv_vids') openPrivateVideos(); if (r === 'stickers' && typeof openStickerMaker === 'function') openStickerMaker(); if (r === 'requests') openRequests(); if (r === 'verify') verifySheet();
    if (r === 'out') confirmSheet('Keluar dari akun?', () => { unlive(); token = me = null; B.msg = B.nt = 0; paint(); localStorage.removeItem('kt'); ['#inbox', '#notif', '#myprof'].forEach(k => { const el = $(k); if (el) el.innerHTML = '' }); toast('Kamu sudah keluar'); showHome(true) }, 'Keluar');
  };
  o.onchange = async e => {
    const sv = e.target.dataset.sv;
    if (sv) { try { me = (await api('/me/privacy', { method: 'PUT', json: { [sv]: e.target.checked } })).user; toast(sv === 'private' ? (me.private ? 'Akunmu sekarang privat' : 'Akunmu sekarang publik') : (me.visitors_on ? 'Riwayat pengunjung dinyalakan' : 'Riwayat pengunjung dimatikan')); reloadProfiles() } catch (err) { e.target.checked = !e.target.checked; toast(err.message, 'err') } return }
    const k = e.target.dataset.k; if (!k) return; S[k] = e.target.checked; save();
    if (k === 'sound') setMuted(!S.sound);
    if (k === 'saver') toast(S.saver ? 'Mode hemat data diaktifkan' : 'Mode hemat data dimatikan');
  };
  lay(o);
}
function emailSheet() {
  sheet(`<h3>Email</h3><p class="mu sub">Email dipakai untuk masuk dan tidak tampil di profilmu. Kosongkan untuk menghapusnya.</p><form id="emf" class="col"><label class="fld">${ic('mail')}<input name="email" type="email" placeholder="nama@email.com" value="${esc(me.email || '')}" autocomplete="email"></label><label class="fld">${ic('lock')}<input name="password" type="password" placeholder="Sandi saat ini" autocomplete="current-password" required></label><button class="btn">Simpan email</button></form>`);
  $('#emf').onsubmit = async e => {
    e.preventDefault(); const b = e.target.querySelector('.btn'); b.disabled = true;
    try { const r = await api('/me/email', { method: 'PUT', json: Object.fromEntries(new FormData(e.target)) }); me = r.user; closeSheet(); toast(me.email ? 'Email disimpan' : 'Email dihapus'); if ($('#set').classList.contains('open')) settings_refresh() } catch (err) { toast(err.message, 'err'); b.disabled = false }
  };
}
function passSheet() {
  sheet(`<h3>Ubah sandi</h3><form id="pwf" class="col"><label class="fld">${ic('lock')}<input name="old" type="password" placeholder="Sandi saat ini" autocomplete="current-password" required></label><label class="fld">${ic('key')}<input name="pass" type="password" placeholder="Sandi baru (min. 6 karakter)" autocomplete="new-password" minlength="6" required></label><label class="fld">${ic('key')}<input name="again" type="password" placeholder="Ulangi sandi baru" autocomplete="new-password" required></label><button class="btn">Simpan sandi</button></form>`);
  $('#pwf').onsubmit = async e => {
    e.preventDefault(); const j = Object.fromEntries(new FormData(e.target)), b = e.target.querySelector('.btn');
    if (j.pass !== j.again) return toast('Sandi baru dan pengulangannya tidak sama', 'err');
    b.disabled = true; try { await api('/me/password', { method: 'PUT', json: { old: j.old, pass: j.pass } }); closeSheet(); toast('Sandi berhasil diubah') } catch (err) { toast(err.message, 'err'); b.disabled = false }
  };
}
const settings_refresh = () => { const y = $('#set').scrollTop; settings(); $('#set').scrollTop = y };

/* ---------- Centang biru: harus disetujui sistem ---------- */
async function verifySheet() {
  sheet(`<h3>Centang biru ${vbdg({ verified: 1 })}</h3><div id="vfb">${skel(2)}</div>`);
  let d; try { d = await api('/me/verify'); if (d.verified !== !!me.verified) { me.verified = d.verified } } catch (e) { closeSheet(); return toast(e.message, 'err') }
  const r = d.request, box = $('#vfb');
  const form = (msg) => `${msg || ''}<p class="mu sub">Centang biru hanya diberikan setelah sistem meninjau pengajuanmu. Jelaskan siapa kamu dan kenapa akunmu layak diverifikasi.</p>
<form id="vff" class="col"><label>Alasan pengajuan<textarea name="reason" rows="4" maxlength="500" placeholder="Contoh: Saya kreator edukasi, akun resmi toko ..." required style="margin-top:6px"></textarea></label><label>Tautan bukti (opsional)<input name="link" type="url" maxlength="200" placeholder="https://instagram.com/akunmu" style="margin-top:6px"></label><button class="btn">Kirim pengajuan</button></form>`;
  if (d.verified) box.innerHTML = `<div class="thanks">${art('check')}<b>Akunmu sudah terverifikasi</b><p class="mu">Lencana biru tampil di samping namamu.</p><button class="btn" id="ok">Selesai</button></div>`;
  else if (r && r.status === 'pending') box.innerHTML = `<div class="thanks">${art('check')}<b>Menunggu keputusan sistem</b><p class="mu">Diajukan ${dt(r.created)}. Kamu akan mendapat notifikasi saat sudah diputuskan.</p><button class="btn" id="ok">Mengerti</button></div>`;
  else box.innerHTML = form(r && r.status === 'rejected' ? `<p class="chp wide" style="background:#ef44441f;color:var(--dng)">Pengajuan sebelumnya ditolak${r.note ? ': ' + esc(r.note) : ''}</p>` : '');
  const ok = $('#ok'); if (ok) ok.onclick = closeSheet;
  const f = $('#vff'); if (f) f.onsubmit = async e => {
    e.preventDefault(); const b = f.querySelector('.btn'); b.disabled = true;
    try { await post('/me/verify', Object.fromEntries(new FormData(f))); toast('Pengajuan terkirim ke sistem'); verifySheet() } catch (err) { toast(err.message, 'err'); b.disabled = false }
  };
}
