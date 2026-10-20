/* ============================================================
   Zippy · mulai: bilah atas, navigasi tab terpisah, deep link, mode aplikasi (PWA)
   Tagline: Swipe. Play. Repeat.
   ============================================================ */
$('#top').innerHTML = `<span class="wm">${logo(26)}<span class="wm-txt"><span>Zip<b>py</b></span><small class="wm-tag">Swipe. Play. Repeat.</small></span></span><div id="tabs"><button data-t="for" class="on">Untuk kamu</button><button data-t="following">Mengikuti</button></div><div class="tr"><button id="sbtn" class="ib" aria-label="Cari">${ic('search')}</button><button id="mb" class="ib" aria-label="Suara"></button></div>`;
mbIcon();
$('#mb').onclick = () => { setMuted(!muted); if (!muted) setTimeout(chkAudio, 1800) };
$('#sbtn').onclick = () => openSearch();
$('#ib').onclick = e => {
  const b = e.target.closest('[data-i]'); if (!b) return;
  $('#ib').classList.remove('open');
  if (b.dataset.i === '1') installApp(); else localStorage.ki = '1';
};
$('#tabs').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.t === 'following' && !token) return authSheet();
  tab = b.dataset.t; $$('#tabs button').forEach(x => x.classList.toggle('on', x === b)); showHome(true);
};
$('nav').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return; const k = b.dataset.n;
  if (k === 'home') {
    const f = $('#feed');
    if (!L.length && $('#home-pg.open')) {
      f.scrollTop > 10 ? f.scrollTo({ top: 0, behavior: 'smooth' }) : loadMore(true);
    } else {
      showHome(false);
    }
  } else if (k === 'up') {
    uploadPage();
  } else if (k === 'msg') {
    ask(inbox);
  } else if (k === 'nt') {
    ask(notifs);
  } else if (k === 'me') {
    ask(openMyProfileTab);
  }
};
addEventListener('online', () => { toast('Kembali online'); badges() });
addEventListener('offline', () => toast('Kamu sedang offline', 'err'));

/* Mode aplikasi terpasang: layar penuh, dan tombol kembali Android tidak langsung keluar */
if (standalone()) {
  history.replaceState({ g: 'exit' }, ''); history.pushState({ g: 'app' }, '');
  let armed = 0;
  rootHook = e => {
    if (!(e.state && e.state.g === 'exit')) return false;
    if (armed) { armed = 0; history.back(); return true }
    armed = 1; toast('Tekan sekali lagi untuk keluar'); history.pushState({ g: 'app' }, ''); setTimeout(() => armed = 0, 2000); return true;
  };
}
if ('serviceWorker' in navigator && !window.Capacitor && /^https?:$/.test(location.protocol)) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

(async () => {
  if (token) {
    try { me = (await api('/me')).user; live() }
    catch (e) { if (e.status === 401) { token = null; localStorage.removeItem('kt') } }
  }
  await showHome(true);
  // deep link: #v=KODE (video), #u=nama (profil), #a=KODE (audio), ?a=new|msg|search (angka lama tetap dikenali)
  const h = location.hash, qa = new URLSearchParams(location.search).get('a');
  const mv = h.match(/v=([A-Za-z0-9]+)/), mu = h.match(/u=([\w.]+)/), ma = h.match(/a=([A-Za-z0-9]+)/);
  if (h || qa) history.replaceState(history.state, '', location.pathname);
  if (mv) openVid(mv[1]); else if (mu) openProfile(mu[1]); else if (ma) { try { const ra = await api('/audio/' + ma[1]); openAudio(ra.audio.id) } catch (e) { toast(e.message, 'err') } }
  else if (qa === 'search') openSearch(); else if (qa === 'new') uploadPage(); else if (qa === 'msg') ask(inbox);
  maybeInstallBanner();
})();
