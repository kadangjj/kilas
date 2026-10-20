/* ============================================================
   Zippy · beranda: kartu video (rasio asli tanpa zoom paksa), autoplay reliabel,
   sinkronisasi audio loop, multi-share, komentar, & deduplikasi video Beranda
   ============================================================ */
const PRV = { public: ['globe', 'Publik'], friends: ['users', 'Teman'], private: ['lock', 'Hanya saya'] };
let muted = !S.sound;
let autoMutedByBrowser = false;

function mbIcon() {
  const b = $('#mb');
  if (b) b.innerHTML = ic(muted ? 'mute' : 'vol');
}

function setMuted(m) {
  muted = !!m;
  autoMutedByBrowser = false;
  mbIcon();
  $$('video').forEach(v => {
    const hasExt = !!v._extAud;
    v.muted = muted || hasExt;
    v.defaultMuted = v.muted;
    if (hasExt) {
      v._extAud.muted = muted;
      if (!muted && !v.paused) v._extAud.play().catch(() => {});
    }
  });
  if (typeof SV !== 'undefined' && SV.aud) SV.aud.muted = muted;
}

// Jika browser memblokir suara otomatis saat halaman baru dibuka, aktifkan suara begitu pengguna menyentuh layar
function unlockAudioOnFirstTouch() {
  if (autoMutedByBrowser && S.sound && muted) {
    setMuted(false);
    const r = activeReel();
    if (r) {
      const c = currentVisibleCard(r);
      if (c && !c.classList.contains('ps')) play(c.querySelector('video'));
    }
  }
}
['pointerdown', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, unlockAudioOnFirstTouch, { passive: true }));

function chkAudio() {
  const r = activeReel(); if (!r) return;
  const c = currentVisibleCard(r);
  const v = c && c.querySelector('video');
  if (v && !v.paused && !v._extAud && v.mozHasAudio === false) {
    toast('Video ini tidak memiliki suara');
  }
}

/* ---------- Pelacakan Video yang Sudah Muncul di Beranda (Agar Tidak Dimunculkan Lagi) ---------- */
function seenStorageKey() {
  return 'zseen_' + (me && me.username ? me.username.toLowerCase() : 'guest');
}
function getHomeSeenSet() {
  try {
    const raw = JSON.parse(localStorage.getItem(seenStorageKey()) || '[]');
    return new Set(Array.isArray(raw) ? raw.map(Number).filter(n => Number.isInteger(n) && n > 0) : []);
  } catch {
    return new Set();
  }
}
function markHomeSeen(ids) {
  const list = (Array.isArray(ids) ? ids : [ids]).map(Number).filter(n => Number.isInteger(n) && n > 0);
  if (!list.length) return;
  const set = getHomeSeenSet();
  let changed = false;
  for (const id of list) {
    if (!set.has(id)) { set.add(id); changed = true }
  }
  if (changed) {
    try {
      const arr = [...set].slice(-2000);
      localStorage.setItem(seenStorageKey(), JSON.stringify(arr));
    } catch {}
    if (token) {
      post('/feed/seen', { ids: list }).catch(() => {});
    }
  }
}
function getHomeSeenParam() {
  return [...getHomeSeenSet()].slice(-600).join(',');
}

function card(v, opts = {}) {
  const el = document.createElement('section'); el.className = 'it'; el._v = v; el._opts = opts;
  const preloadMode = S.saver ? 'metadata' : 'auto';
  const aTitle = v.audio_title || ('Suara asli - ' + dnm({ username: v.audio_user || v.username, name: v.audio_user_name || v.name }));
  const aAva = v.audio_avatar !== undefined ? v.audio_avatar : v.avatar;
  const aUser = v.audio_user || v.username;
  // Gunakan audio eksternal bila memakai suara orang lain / suara asli video lain
  const useExtAudio = !!(v.audio_file && v.audio_file !== v.file);
  const startMuted = muted || useExtAudio || !(navigator.userActivation && navigator.userActivation.hasBeenActive);

  el.innerHTML = `<video class="rv contain${rotCls(v)}" src="${url(v.file)}" loop playsinline webkit-playsinline preload="${preloadMode}" ${startMuted ? 'muted' : ''}></video>
<div class="scrim"></div><div class="pz">${ic('play', 'f')}</div><div class="vx">${ic('alert')}<small>Video tidak bisa diputar</small></div>
<div class="rail">
  <div class="avw"><button class="av${v.has_story && v.story_unseen ? ' hs' : ''}" data-a="avatar" aria-label="Profil ${esc(v.username)}"><span class="ring">${ava(v.username, v.avatar)}</span></button><span class="fpw"></span></div>
  <button data-a="like" aria-label="Suka"><span class="rb">${ic('heart')}</span><b class="lk"></b></button>
  <button data-a="cm" aria-label="Komentar"><span class="rb">${ic('msg')}</span><b class="cm"></b></button>
  <button data-a="repost" aria-label="Repost"><span class="rb">${ic('repeat')}</span><b class="rp"></b></button>
  <button data-a="save" aria-label="Simpan"><span class="rb">${ic('save')}</span><b class="sv">Simpan</b></button>
  <button data-a="more" aria-label="Lainnya"><span class="rb">${ic('more', 'b3')}</span><b>Lainnya</b></button>
  <button class="aud-disc" data-a="audio" aria-label="Suara asli"><span class="disc-in">${ava(aUser, aAva)}</span></button>
</div>
<div class="inf">
  <div class="rpx"></div>
  <div class="who"><b data-a="user">${esc(dnm(v))}</b>${vbdg(v)}<span class="fcw"></span><em class="pvc"></em></div>
  ${v.caption ? `<p>${cap(v.caption)}</p>` : ''}
  ${v.stitch_of && v.stitch_user ? `<span class="meta">${ic('stitch', 's')} Stitch dengan <a class="mn" data-u="${esc(v.stitch_user)}">@${esc(v.stitch_user)}</a></span>` : ''}
  ${v.loc ? `<span class="meta lc" data-loc="${esc(v.loc)}">${ic('mapPin', 's')} ${esc(v.loc)}</span>` : ''}
  ${opts.fromProfile ? `<div class="prof-meta"><span class="meta vw">${ic('eye', 's')} <b class="vwn">${nf(v.views)}</b> tayangan</span>${v.created ? `<span class="meta dt-post">${ic('calendar', 's')} Diposting ${dt(v.created)}</span>` : ''}</div>` : ''}
  <button class="aud-bar" data-a="audio">${ic('music', 's')}<span class="aud-txt">${esc(aTitle)}</span></button>
</div>
<div class="pgb"><i></i></div>`;

  const vid = el.querySelector('video'), bar = el.querySelector('.pgb i');
  let extAud = null, lastTime = 0;
  if (useExtAudio) {
    extAud = document.createElement('video');
    extAud.src = url(v.audio_file);
    extAud.loop = false;
    extAud.playsInline = true;
    extAud.preload = preloadMode;
    extAud.muted = muted;
    vid._extAud = extAud;
  }

  // Pastikan begitu frame pertama siap, jika kartu ini sedang aktif di layar maka langsung putar otomatis
  const autoStartWhenReady = () => {
    const ar = activeReel();
    if (ar && ar.contains(el) && currentVisibleCard(ar) === el && S.autoplay !== false && !el.classList.contains('ps') && vid.paused) {
      play(vid);
    }
  };
  vid.addEventListener('loadeddata', autoStartWhenReady);
  vid.addEventListener('canplay', autoStartWhenReady);

  vid.ontimeupdate = () => {
    if (vid.duration) bar.style.width = (vid.currentTime / vid.duration * 100) + '%';
    // Deteksi saat video loop kembali ke awal: paksa audio eksternal mengulang dari detik 0
    if (extAud) {
      if (vid.currentTime < lastTime - 0.35) {
        try {
          extAud.currentTime = 0;
          if (!vid.paused && !extAud.muted) extAud.play().catch(() => {});
        } catch {}
      }
      lastTime = vid.currentTime;
    }
  };
  vid.onplay = () => {
    el.classList.remove('ps');
    if (extAud) {
      vid.muted = true;
      extAud.muted = muted;
      if (Math.abs(extAud.currentTime - vid.currentTime) > 0.45) {
        try { extAud.currentTime = vid.currentTime % (extAud.duration || 9999) } catch {}
      }
      if (!extAud.muted) extAud.play().catch(() => {});
    }
  };
  vid.onpause = () => {
    if (extAud) { try { extAud.pause() } catch {} }
  };
  vid.onseeking = () => {
    if (extAud) { try { extAud.currentTime = vid.currentTime % (extAud.duration || 9999) } catch {} }
  };
  vid.onerror = () => el.classList.add('bad');
  syncCard(el);
  return el;
}

function syncCard(c) {
  const v = c._v; if (!v) return;
  const vid = c.querySelector('video'); if (vid) vid.className = 'rv contain' + rotCls(v);
  c.querySelector('.lk').textContent = nf(v.likes);
  c.querySelector('.cm').textContent = nf(v.comments);
  c.querySelector('.rp').textContent = v.reposts ? nf(v.reposts) : 'Repost';
  c.querySelector('.sv').textContent = v.saved ? 'Tersimpan' : 'Simpan';
  const vwn = c.querySelector('.vwn'); if (vwn) vwn.textContent = nf(v.views);
  c.querySelector('[data-a=like]').classList.toggle('on', !!v.liked);
  c.querySelector('[data-a=save]').classList.toggle('on', !!v.saved);
  c.querySelector('[data-a=repost]').classList.toggle('on', !!v.reposted);
  const pv = c.querySelector('.pvc');
  pv.innerHTML = v.privacy && v.privacy !== 'public' ? `${ic(PRV[v.privacy][0], 's')} ${PRV[v.privacy][1]}` : '';
  pv.hidden = !pv.innerHTML;
  const own = isOwn(v.username);
  c.querySelector('.fpw').innerHTML = !own && !v.following && !v.requested ? `<button class="fplus" data-a="follow" aria-label="Ikuti">${ic('plus', 's b3')}</button>` : '';
  c.querySelector('.fcw').innerHTML = !own && !v.following ? `<button class="fchip${v.requested ? ' off' : ''}" data-a="follow">${v.requested ? 'Diminta' : (v.follows_me ? 'Ikuti balik' : 'Ikuti')}</button>` : '';
  c.querySelector('.rpx').innerHTML = v.rp_by ? `<div class="rp">${ic('repeat', 's')} Di-repost oleh <a class="mn" data-u="${esc(v.rp_by)}">@${esc(v.rp_by)}</a>${v.rp_at ? ' · ' + ago(v.rp_at) : ''}</div>${v.rp_note ? `<div class="rpn">“${cap(v.rp_note)}”</div>` : ''}` : '';
}

function play(vid) {
  if (!vid) return;
  // Hentikan video lain agar hanya 1 video aktif yang berputar
  $$('video').forEach(other => {
    if (other !== vid && !other.paused) {
      other.pause();
      if (other._extAud) { try { other._extAud.pause() } catch {} }
    }
  });
  const cardEl = vid.closest('.it');
  if (cardEl) cardEl.classList.remove('ps');

  const hasExt = !!vid._extAud;
  const userInteracted = !!(navigator.userActivation && navigator.userActivation.hasBeenActive);
  if (!userInteracted && !muted) {
    muted = true;
    autoMutedByBrowser = true;
    mbIcon();
  }
  vid.muted = muted || hasExt;
  vid.defaultMuted = vid.muted;
  if (vid.muted) vid.setAttribute('muted', '');
  if (hasExt) vid._extAud.muted = muted;

  const p = vid.play();
  if (p && typeof p.catch === 'function') {
    p.catch(() => {
      muted = true;
      autoMutedByBrowser = true;
      mbIcon();
      vid.muted = true;
      vid.defaultMuted = true;
      vid.setAttribute('muted', '');
      if (hasExt) vid._extAud.muted = true;
      vid.play().catch(() => {});
    });
  }
}

function pauseAll() {
  $$('video').forEach(v => {
    v.pause();
    if (v._extAud) { try { v._extAud.pause() } catch {} }
  });
}

function activeReel() {
  const top = L[L.length - 1];
  if (top) return top.id === 'vw' ? top.querySelector('.reel') : null;
  return (activeTab === 'home' || $('#home-pg.open')) ? $('#feed') : null;
}

function currentVisibleCard(r) {
  if (!r) return null;
  const cards = [...r.querySelectorAll('.it')];
  if (!cards.length) return null;
  const rh = r.clientHeight || innerHeight;
  const idx = Math.round(r.scrollTop / Math.max(1, rh));
  if (cards[idx]) return cards[idx];
  return cards.find(el => {
    const b = el.getBoundingClientRect();
    return b.top < innerHeight * .65 && b.bottom > innerHeight * .35;
  }) || cards[0];
}

function resumeFeed() {
  const r = activeReel(); if (!r) return;
  const c = currentVisibleCard(r);
  if (!c) return;
  const v = c.querySelector('video');
  if (!v) return;
  if (r.id === 'feed' && c._v && c._v.id) {
    markHomeSeen(c._v.id);
  }
  if (S.autoplay !== false) {
    c.classList.remove('ps');
    play(v);
  } else {
    c.classList.add('ps');
  }
}

const io = new IntersectionObserver(es => es.forEach(e => {
  const v = e.target.querySelector('video'); if (!v) return;
  if (e.isIntersecting && e.intersectionRatio >= .5) {
    const ar = activeReel(); if (!ar || !ar.contains(e.target)) return;
    if (S.autoplay !== false) { e.target.classList.remove('ps'); play(v) } else e.target.classList.add('ps');
    const d = e.target._v;
    if (d && e.target.closest('#feed')) markHomeSeen(d.id);
    if (d && !d._seen) { d._seen = 1; post(`/videos/${d.id}/view`).then(r => { if (r.views != null) { d.views = r.views; const n = e.target.querySelector('.vwn'); if (n) n.textContent = nf(r.views) } }).catch(() => {}) }
  } else {
    v.pause();
    if (v._extAud) { try { v._extAud.pause() } catch {} }
  }
}), { threshold: [.5] });

function reelEvents(sc) {
  let tapT = 0, lastTap = 0, lpT = 0, lp = false, scrollT = 0;
  sc.addEventListener('scroll', () => {
    clearTimeout(scrollT);
    scrollT = setTimeout(() => {
      if (activeReel() === sc) resumeFeed();
    }, 120);
  }, { passive: true });
  sc.addEventListener('click', async e => {
    if (lp) { lp = false; return }
    const ht = e.target.closest('.ht'); if (ht) return openTag(ht.dataset.h);
    const mn = e.target.closest('.mn'); if (mn) return openProfile(mn.dataset.u);
    const lc = e.target.closest('.lc'); if (lc) return openLoc(lc.dataset.loc);
    const c = e.target.closest('.it'); if (!c) return;
    const v = c._v, vid = c.querySelector('video'), b = e.target.closest('[data-a]');
    if (!b) {
      const n = Date.now(); clearTimeout(tapT);
      if (n - lastTap < 320) { lastTap = 0; burst(c, e); like(v, c, 1); return }
      lastTap = n;
      tapT = setTimeout(() => {
        if (vid.paused) {
          c.classList.remove('ps');
          play(vid);
        } else {
          vid.pause();
          c.classList.add('ps');
        }
      }, 280);
      return;
    }
    const a = b.dataset.a;
    try {
      if (a === 'avatar') v.has_story && v.story_unseen ? openStoriesFor(v.username) : openProfile(v.username);
      if (a === 'user') openProfile(v.username);
      if (a === 'audio') openAudio(v.audio_id || v.id, v);
      if (a === 'like') await like(v, c);
      if (a === 'cm') comments(v, c);
      if (a === 'save') await toggleSave(v, c);
      if (a === 'repost') await toggleRepost(v, c);
      if (a === 'follow') await followUser(v);
      if (a === 'more') videoMenu(v, c);
    } catch (err) { toast(err.message, 'err') }
  });
  sc.addEventListener('pointerdown', e => {
    const c = e.target.closest('.it'); if (!c || e.target.closest('[data-a],.ht,.mn,.lc')) return;
    lpT = setTimeout(() => { lp = true; buzz(); videoMenu(c._v, c) }, 520);
  });
  ['pointerup', 'pointercancel', 'pointermove'].forEach(ev => sc.addEventListener(ev, () => clearTimeout(lpT)));
  sc.addEventListener('contextmenu', e => e.preventDefault());
}
function burst(c, e) { const r = c.getBoundingClientRect(), d = document.createElement('div'); d.className = 'burst'; d.style.left = e.clientX - r.left + 'px'; d.style.top = e.clientY - r.top + 'px'; d.innerHTML = ic('heart', 'f'); c.append(d); setTimeout(() => d.remove(), 750) }
async function like(v, c, addOnly) {
  if (addOnly && v.liked) return;
  await ask(async () => {
    try {
      const r = await post(`/videos/${v.id}/like`); v.liked = r.liked; v.likes = r.likes; syncCard(c);
      const b = c.querySelector('[data-a=like]'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); if (r.liked) buzz(10);
    } catch (e) { toast(e.message, 'err') }
  });
}
async function toggleSave(v, c) {
  await ask(async () => {
    const r = await post(`/videos/${v.id}/save`); v.saved = r.saved; syncCard(c);
    const b = c.querySelector('[data-a=save]'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    toast(r.saved ? 'Disimpan. Lihat di Profil › Disimpan' : 'Dihapus dari simpanan');
  });
}
async function followUser(v) {
  await ask(async () => {
    try {
      const r = await post(`/users/${encodeURIComponent(v.username)}/follow`);
      syncFollowState(v.username, r);
      toast(r.requested ? 'Permintaan ikuti dikirim' : r.following ? 'Kamu mengikuti ' + dnm(v) : 'Berhenti mengikuti ' + dnm(v));
      buzz(10);
      if (typeof reloadProfiles === 'function') reloadProfiles();
    } catch (e) { toast(e.message, 'err') }
  });
}
function toggleRepost(v, c) {
  ask(() => {
    if (isOwn(v.username)) return toast('Kamu tidak bisa me-repost videomu sendiri');
    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    sheet(`<h3>${v.reposted ? 'Ubah repost' : 'Repost video'}</h3><p class="mu sub">Video ${esc(dnm(v))} akan muncul di profilmu dan di beranda pengikutmu.</p>
<div class="field"><textarea id="rpn" rows="3" maxlength="200" placeholder="Tambahkan catatan (opsional). Ketik # untuk hashtag, @ untuk menandai">${esc(v.my_note || '')}</textarea><span class="cnt" id="rpc">0/200</span></div><div class="sug" id="rps"></div>
<p class="mu rpd">${ic('calendar', 's')} ${v.reposted ? 'Di-repost pada ' + dt(v.my_at) : 'Tanggal repost: ' + today}</p>
<div class="row">${v.reposted ? '<button class="btn g" id="rpx">Batalkan repost</button>' : ''}<button class="btn" id="rpo">${v.reposted ? 'Simpan catatan' : 'Repost'}</button></div>`);
    const t = $('#rpn'), cnt = () => $('#rpc').textContent = t.value.length + '/200'; t.oninput = cnt; cnt(); suggest(t, $('#rps'));
    const fin = (r, msg) => { v.reposts = r.reposts; syncCard(c); closeSheet(); toast(msg) };
    $('#rpo').onclick = async () => { try { const r = await post(`/videos/${v.id}/repost`, { note: t.value }); v.my_note = r.note; v.my_at = v.my_at || r.created; v.reposted = true; fin(r, 'Di-repost ke profilmu') } catch (e) { toast(e.message, 'err') } };
    if (v.reposted) $('#rpx').onclick = async () => { try { const r = await api(`/videos/${v.id}/repost`, { method: 'DELETE' }); v.reposted = false; v.my_note = ''; v.my_at = null; fin(r, 'Repost dibatalkan') } catch (e) { toast(e.message, 'err') } };
  });
}

/* ---------- Beranda & Pull-to-Refresh (Tanpa Mengulang Video yang Sudah Muncul) ---------- */
let tab = 'for', offset = 0, more = true, busy = false, seed = 0, upto = 0, feedLoaded = false;
const feedSkel = () => '<div class="fsk"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i></div>';
function addHome(arr) {
  const f = $('#feed');
  const existingIds = new Set([...f.querySelectorAll('.it')].map(el => el._v && el._v.id).filter(Boolean));
  const addedIds = [];
  arr.forEach(v => {
    if (!v || existingIds.has(v.id)) return;
    existingIds.add(v.id);
    addedIds.push(v.id);
    const c = card(v, { fromProfile: false });
    f.append(c);
    io.observe(c);
  });
  if (addedIds.length) markHomeSeen(addedIds);
}
async function loadMore(reset) {
  if (busy || (!more && !reset)) return; busy = true; const f = $('#feed');
  try {
    if (reset) { offset = 0; more = true; followDirty = false; if (tab === 'for') { seed = (Math.random() * 2147483646 | 0) + 1; upto = 0 } io.disconnect(); pauseAll(); f.innerHTML = feedSkel() }
    const lim = S.saver ? 4 : 8;
    const seenIds = getHomeSeenSet();
    const excludeParam = getHomeSeenParam();
    const r = await api(`/feed?offset=${offset}&limit=${lim}&tab=${tab}&seed=${seed}&upto=${upto}&exclude=${encodeURIComponent(excludeParam)}`, { cache: 'no-store' });
    const freshVideos = (r.videos || []).filter(v => v && !seenIds.has(v.id));
    offset = r.next; more = r.more && freshVideos.length > 0; if (reset && r.top) upto = r.top;
    if (reset) {
      f.innerHTML = ''; feedLoaded = true;
      if (!freshVideos.length) {
        const hadHistory = seenIds.size > 0;
        f.innerHTML = `<div class="fempty">${empty('video', tab === 'following' ? 'Belum ada video baru dari akun yang kamu ikuti' : (hadHistory ? 'Semua video di Beranda sudah kamu tonton' : 'Belum ada video'), tab === 'following' ? 'Semua video dari akun yang kamu ikuti sudah tampil, atau ikuti akun baru.' : (hadHistory ? 'Video yang sudah muncul di Beranda tidak ditampilkan lagi. Tekan + untuk memposting video baru!' : 'Tekan + untuk posting yang pertama.'))}</div>`;
      }
      f.scrollTop = 0;
    }
    addHome(freshVideos);
    if (reset && freshVideos.length) {
      requestAnimationFrame(resumeFeed);
      setTimeout(resumeFeed, 140);
    }
  } catch (e) {
    toast(e.message, 'err');
    if (reset) { f.innerHTML = `<div class="fempty">${empty('video', 'Gagal memuat video', e.message)}<button class="btn" id="rt">Coba lagi</button></div>`; $('#rt').onclick = () => loadMore(true); feedLoaded = false }
  }
  busy = false;
}

async function showHome(refresh) {
  switchTabView('home');
  if (refresh || !feedLoaded || (followDirty && tab === 'following')) await loadMore(true);
  else {
    requestAnimationFrame(resumeFeed);
    setTimeout(resumeFeed, 100);
  }
  badges();
}
$('#feed').addEventListener('scroll', e => { const f = e.target; if (f.scrollTop + f.clientHeight * 2 > f.scrollHeight) loadMore() });
reelEvents($('#feed'));

/* ---------- Tarik ke Bawah untuk Refresh (Pull-to-Refresh) di Beranda ---------- */
(function initPullToRefresh() {
  const f = $('#feed'), ptr = $('#ptr'), txt = $('#ptr-txt');
  if (!f || !ptr) return;
  let sy = 0, sx = 0, pulling = false, dist = 0, armed = false;
  const THRESH = 72;

  const start = (x, y) => {
    if (busy || f.scrollTop > 2 || L.length || !$('#home-pg.open')) return;
    sy = y; sx = x; pulling = true; dist = 0; armed = false;
    ptr.classList.remove('anim', 'loading');
  };
  const move = (x, y, ev) => {
    if (!pulling) return;
    const dy = y - sy, dx = x - sx;
    if (dy <= 0 || f.scrollTop > 2 || (Math.abs(dx) > Math.abs(dy) && dist === 0)) {
      if (dist > 0) resetPtr();
      pulling = false;
      return;
    }
    if (ev && ev.cancelable && dy > 6) ev.preventDefault();
    dist = Math.min(115, dy * 0.46);
    ptr.style.transform = `translate(-50%, ${dist - 56}px)`;
    ptr.style.opacity = String(Math.min(1, dist / 48));
    const nowArmed = dist >= THRESH;
    if (nowArmed !== armed) {
      armed = nowArmed;
      ptr.classList.toggle('ready', armed);
      if (txt) txt.textContent = armed ? 'Lepas untuk memuat ulang' : 'Tarik untuk menyegarkan';
      if (armed) buzz(8);
    }
  };
  const resetPtr = () => {
    ptr.classList.add('anim');
    ptr.classList.remove('ready', 'loading');
    ptr.style.transform = 'translate(-50%, -64px)';
    ptr.style.opacity = '0';
  };
  const end = async () => {
    if (!pulling) return;
    pulling = false;
    if (armed && !busy) {
      ptr.classList.add('anim', 'loading');
      ptr.style.transform = 'translate(-50%, 16px)';
      ptr.style.opacity = '1';
      if (txt) txt.textContent = 'Memuat ulang...';
      await loadMore(true);
      toast('Beranda diperbarui');
      setTimeout(resetPtr, 220);
    } else if (dist > 0) {
      resetPtr();
    }
    dist = 0; armed = false;
  };

  f.addEventListener('touchstart', e => { if (e.touches.length === 1) start(e.touches[0].clientX, e.touches[0].clientY) }, { passive: true });
  f.addEventListener('touchmove', e => { if (e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY, e) }, { passive: false });
  f.addEventListener('touchend', end);
  f.addEventListener('touchcancel', end);

  let mDown = false;
  f.addEventListener('mousedown', e => { if (e.button === 0) { mDown = true; start(e.clientX, e.clientY) } });
  addEventListener('mousemove', e => { if (mDown) move(e.clientX, e.clientY, null) });
  addEventListener('mouseup', () => { if (mDown) { mDown = false; end() } });
})();

/* ---------- Pemutar overlay ---------- */
function openViewer(list, i = 0, opts = {}) {
  if (!list.length) return;
  const o = $('#vw'), sc = document.createElement('div'); sc.className = 'reel';
  o.innerHTML = `<button class="fb l" data-x aria-label="Kembali">${ic('back')}</button>`; o.append(sc);
  list.forEach(v => { const c = card(v, opts); sc.append(c); io.observe(c) });
  reelEvents(sc); o.querySelector('[data-x]').onclick = back;
  o._close = () => {
    sc.querySelectorAll('video').forEach(v => { v.pause(); if (v._extAud) { try { v._extAud.pause(); v._extAud.src = '' } catch {} } });
    setTimeout(() => { if (!o.classList.contains('open')) o.innerHTML = '' }, 320);
  };
  lay(o);
  sc.scrollTop = i * sc.clientHeight;
  requestAnimationFrame(() => {
    sc.scrollTop = i * sc.clientHeight;
    resumeFeed();
    setTimeout(resumeFeed, 120);
  });
}
async function openVid(id, opts = {}) {
  try { const { video } = await api('/videos/' + id); if (video.takedown) return takedownSheet(video); openViewer([video], 0, opts) } catch (e) { toast(e.message, 'err') }
}
const removeCard = c => {
  const vid = c.querySelector('video');
  if (vid && vid._extAud) { try { vid._extAud.pause(); vid._extAud.src = '' } catch {} }
  const sc = c.parentElement, inVw = !!c.closest('#vw'); c.remove();
  if (inVw && !sc.children.length) back();
  if (!inVw && !sc.children.length) sc.innerHTML = `<div class="fempty">${empty('video', 'Belum ada video')}</div>`;
};

/* ---------- Bagikan Video ke Banyak Obrolan Sekaligus (Multi-Select) ---------- */
const cp = async t => { try { await navigator.clipboard.writeText(t) } catch { const a = document.createElement('textarea'); a.value = t; document.body.append(a); a.select(); document.execCommand('copy'); a.remove() } };
async function share(v, copy) {
  const link = `${SERVER || location.origin}/#v=${v.code || v.id}`;
  try { if (!copy && navigator.share) await navigator.share({ title: 'Zippy — Swipe. Play. Repeat.', text: v.caption || 'Lihat video ini di Zippy', url: link }); else throw 0 }
  catch (e) { if (e && e.name === 'AbortError') return; await cp(link); toast('Link disalin') }
  if (token) post(`/videos/${v.id}/share`).catch(() => {});
}
async function dl(v) {
  toast('Mengunduh...');
  try { const b = await (await fetch(url(v.file))).blob(), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'zippy-' + v.id + '.' + v.file.split('.').pop(); document.body.append(a); a.click(); a.remove(); toast('Video diunduh') } catch { window.open(url(v.file), '_blank') }
}
async function shareChat(v) {
  sheet(`<div class="sh-head"><h3>Kirim ke obrolan</h3><button type="button" class="ib sm" id="shx">${ic('close', 's')}</button></div>
  <label class="fld" style="margin-bottom:8px">${ic('search')}<input id="shq" placeholder="Cari atau ketik username..." autocomplete="off" autocapitalize="none"></label>
  <div id="sl" class="cl sh-list">${skel(3)}</div>
  <div class="sh-foot">
    <input id="sh-note" placeholder="Tambahkan pesan (opsional)..." maxlength="200">
    <button class="btn" id="sh-go" disabled>Pilih penerima</button>
  </div>`);
  $('#shx').onclick = closeSheet;
  const sel = new Set();
  let allUsers = [], q = '';

  const updBtn = () => {
    const btn = $('#sh-go'); if (!btn) return;
    btn.disabled = !sel.size;
    btn.textContent = sel.size ? `Kirim ke ${sel.size} obrolan` : 'Pilih penerima';
  };
  const draw = () => {
    const filtered = allUsers.filter(u => !q || (u.username + ' ' + (u.name || '') + ' ' + (u.nick || '')).toLowerCase().includes(q));
    let html = filtered.map(c => {
      const on = sel.has(c.username);
      return `<button type="button" class="li flat sh-row${on ? ' sel' : ''}" data-u="${esc(c.username)}"><span class="sa">${ava(c.username, c.avatar)}</span><span class="lt"><b>${esc(c.nick || c.name || c.username)}${vbdg(c)}</b><small>@${esc(c.username)}</small></span><span class="sh-chk${on ? ' on' : ''}">${on ? ic('check', 's b3') : ''}</span></button>`;
    }).join('');
    if (q && !allUsers.some(u => u.username.toLowerCase() === q)) {
      const on = sel.has(q);
      html = `<button type="button" class="li flat sh-row${on ? ' sel' : ''}" data-u="${esc(q)}"><span class="sa">${ava(q, null)}</span><span class="lt"><b>@${esc(q)}</b><small>Kirim ke username ini</small></span><span class="sh-chk${on ? ' on' : ''}">${on ? ic('check', 's b3') : ''}</span></button>` + html;
    }
    $('#sl').innerHTML = html || '<p class="mu" style="padding:16px;text-align:center">Tidak ada obrolan ditemukan. Ketik username di atas.</p>';
    updBtn();
  };

  try {
    const [chRes, flRes] = await Promise.all([
      api('/chats').catch(() => ({ chats: [] })),
      api('/me/follows?type=following').catch(() => ({ users: [] }))
    ]);
    const map = new Map();
    (chRes.chats || []).forEach(c => map.set(c.username.toLowerCase(), c));
    (flRes.users || []).forEach(u => { if (!map.has(u.username.toLowerCase())) map.set(u.username.toLowerCase(), u) });
    allUsers = [...map.values()];
  } catch {}
  draw();

  $('#shq').oninput = e => { q = e.target.value.replace(/^@/, '').trim().toLowerCase(); draw() };
  $('#sl').onclick = e => {
    const b = e.target.closest('[data-u]'); if (!b) return;
    const u = b.dataset.u;
    sel.has(u) ? sel.delete(u) : sel.add(u);
    draw();
  };
  $('#sh-go').onclick = async () => {
    if (!sel.size) return;
    const btn = $('#sh-go'), note = ($('#sh-note').value || '').trim();
    btn.disabled = true; btn.textContent = 'Mengirim...';
    const targets = [...sel];
    let okCount = 0, lastErr = '';
    await Promise.all(targets.map(async u => {
      try {
        const fd = { video: v.id };
        if (note) fd.text = note;
        await api('/chats/' + encodeURIComponent(u), { method: 'POST', body: toFD(fd) });
        okCount++;
      } catch (err) { lastErr = err.message }
    }));
    closeSheet();
    if (okCount > 0) {
      post(`/videos/${v.id}/share`).catch(() => {});
      toast(`Video terkirim ke ${okCount} obrolan`);
    } else toast(lastErr || 'Gagal mengirim video', 'err');
  };
}

function videoMenu(v, c) {
  const own = isOwn(v.username), pv = PRV[v.privacy] || PRV.public;
  sheet(`<h3>Video ${esc(dnm(v))}</h3>${tiles([
    { k: 'ch', i: 'send', t: 'Kirim' }, { k: 'sh', i: 'share', t: 'Bagikan' }, { k: 'cp', i: 'link', t: 'Salin link' },
    { k: 'au', i: 'music', t: 'Lihat suara' }, { k: 'st', i: 'stitch', t: 'Stitch' }, { k: 'dl', i: 'dl', t: 'Unduh' },
    own ? { k: 'pv', i: pv[0], t: pv[1] } : { k: 'rp', i: 'flag', t: 'Laporkan', d: 1 },
    own && { k: 'rot', i: 'rotate', t: 'Putar video' }, own && { k: 'del', i: 'trash', t: 'Hapus', d: 1 }])}`);
  onPick(k => {
    if (k === 'del') return confirmSheet('Hapus video ini?', async () => { try { await api('/videos/' + v.id, { method: 'DELETE' }); removeCard(c); if (typeof reloadProfiles === 'function') reloadProfiles(); toast('Video dihapus') } catch (err) { toast(err.message, 'err') } }, 'Hapus', 'Video akan dihapus permanen.');
    if (k === 'pv') return privacySheet(v, c);
    closeSheet();
    ({
      ch: () => ask(() => shareChat(v)), sh: () => share(v), cp: () => share(v, 1), dl: () => dl(v),
      au: () => openAudio(v.audio_id || v.id, v),
      st: () => ask(() => uploadPage(v)),
      rp: () => ask(() => reportSheet('video', v.id, 'video ini')),
      rot: async () => { try { const r = await api('/videos/' + v.id, { method: 'PUT', json: { rot: ((v.rot | 0) + 1) % 4 } }); v.rot = r.video.rot; syncCard(c); toast('Video diputar') } catch (err) { toast(err.message, 'err') } }
    })[k]();
  });
}
const PRV_DESC = { public: 'Semua orang bisa melihat', friends: 'Hanya akun yang saling follow denganmu', private: 'Hanya kamu yang bisa melihat (tidak muncul di Beranda & masuk ke tab Privat)' };
function privacySheet(v, c) {
  sheet(`<h3>Siapa yang bisa melihat?</h3>${rows(Object.keys(PRV).map(k => ({ k, i: PRV[k][0], t: PRV[k][1], s: PRV_DESC[k], on: v.privacy === k })))}`);
  onPick(async k => {
    try {
      const r = await api('/videos/' + v.id, { method: 'PUT', json: { privacy: k } });
      v.privacy = r.video.privacy; syncCard(c); closeSheet();
      if (k === 'private' && c.closest('#feed')) removeCard(c);
      if (typeof reloadProfiles === 'function') reloadProfiles();
      toast('Privasi: ' + PRV[k][1] + (k === 'private' ? ' (dipindah ke tab Privat)' : ''));
    } catch (e) { toast(e.message, 'err') }
  });
}

/* ---------- Komentar (balasan, Lencana "Pembuat", Pin Komentar, Stiker Custom & Sheet Geser Atas/Bawah) ---------- */
async function comments(v, c) {
  sheet(`<div class="sh-head"><h3>Komentar <span class="mu" id="ccnt">(${nf(v.comments)})</span></h3><div class="sh-actions"><button type="button" class="ib sm" id="cexp" aria-label="Perbesar/perkecil">${ic('chev', 's')}</button><button type="button" class="ib sm" id="cx" aria-label="Tutup">${ic('close', 's')}</button></div></div><div id="cl" class="cl">${skel(3)}</div><div class="rp-bar" id="rpb" hidden><span id="rpt"></span><button type="button" class="ib sm" id="rpx" aria-label="Batal membalas">${ic('close', 's')}</button></div>${composer('cc', 'Komentar, @ untuk menandai')}`);
  $('#sheet').classList.add('cm');
  $('#cx').onclick = closeSheet;
  $('#cexp').onclick = () => $('#sheet').classList.toggle('full');
  const mineV = isOwn(v.username);
  let l = [], replyTo = null;
  const open = new Set();   // komentar utama yang balasannya sedang dibuka
  const setReply = x => {
    replyTo = x || null;
    const bar = $('#rpb'); if (!bar) return;
    bar.hidden = !x;
    if (x) { $('#rpt').innerHTML = `Membalas <b>${esc(dnm(x))}</b>`; const inp = $('#cc input[name=text]'); if (inp) inp.focus() }
  };
  $('#rpx').onclick = () => setReply(null);
  const rowH = (x, isRep) => {
    const isCreator = String(x.username).toLowerCase() === String(v.username).toLowerCase();
    const toNote = isRep && x.rto && x.rto !== x.parent && x.reply_u ? `<span class="rp-to">${ic('chev', 's')} ${esc(x.reply_n || x.reply_u)}</span>` : '';
    return `<div class="c${x.pinned ? ' pinned' : ''}${isRep ? ' rep' : ''}" data-id="${x.id}" data-u="${esc(x.username)}" data-pin="${x.pinned ? 1 : 0}" data-rep="${isRep ? 1 : 0}">
        <button class="sa" data-p="${esc(x.username)}">${ava(dnm(x), x.avatar)}</button>
        <div class="cb">
          <div class="cb-top">
            <b>${esc(dnm(x))}</b>${vbdg(x)}
            ${isCreator ? `<span class="creator-bdg">Pembuat</span>` : ''}
            ${x.pinned ? `<span class="pin-bdg">${ic('pin', 's')} Disematkan</span>` : ''}
            ${toNote}
            <small class="mu">${ago(x.created)}</small>
          </div>
          ${x.text ? `<p>${cap(x.text)}</p>` : ''}${med(x)}
          <button type="button" class="c-rp" data-reply="${x.id}">Balas</button>
        </div>
      </div>`;
  };
  const draw = () => {
    const cntEl = $('#ccnt'); if (cntEl) cntEl.textContent = `(${nf(v.comments)})`;
    const tops = l.filter(x => !x.parent).sort((a, b) => (Number(!!b.pinned) - Number(!!a.pinned)) || (b.id - a.id));
    const kids = {};
    l.filter(x => x.parent).sort((a, b) => a.id - b.id).forEach(x => (kids[x.parent] = kids[x.parent] || []).push(x));
    $('#cl').innerHTML = tops.length ? tops.map(x => {
      const k = kids[x.id] || [], on = open.has(x.id);
      return `<div class="cg">${rowH(x, false)}${k.length ? `<div class="cr-wrap"><button type="button" class="c-more" data-more="${x.id}">${on ? 'Sembunyikan balasan' : `Lihat ${k.length} balasan`}</button>${on ? `<div class="cr">${k.map(y => rowH(y, true)).join('')}</div>` : ''}</div>` : ''}</div>`;
    }).join('') : empty('msg', 'Belum ada komentar', 'Mulai percakapan.');
  };
  try { l = (await api(`/videos/${v.id}/comments`, { cache: 'no-store' })).comments } catch (e) { toast(e.message, 'err') }
  draw();

  $('#cl').onclick = e => {
    const p = e.target.closest('[data-p]'); if (p) { closeSheet(); return openProfile(p.dataset.p) }
    const im = e.target.closest('.mi'); if (im) return openImage(im.currentSrc || im.src);
    const mr = e.target.closest('[data-more]'); if (mr) { const k = +mr.dataset.more; open.has(k) ? open.delete(k) : open.add(k); return draw() }
    const rb = e.target.closest('[data-reply]'); if (rb) { const x = l.find(y => y.id === +rb.dataset.reply); if (x) setReply(x); return }
    const row = e.target.closest('.c'); if (!row || e.target.closest('.ht,.mn,.vc,audio')) return;
    const id = +row.dataset.id, mine = isOwn(row.dataset.u), isPinned = row.dataset.pin === '1', isRep = row.dataset.rep === '1', cstk = row.querySelector('.cstk');
    const closePop = () => { const el = $('#sheet .cm-pop'); if (el) { el.classList.remove('on'); setTimeout(() => el.remove(), 180) } };
    closePop();
    const pop = document.createElement('div'); pop.className = 'cm-pop';
    pop.innerHTML = `<div class="cm-pop-shade"></div><div class="cm-pop-card" role="menu"><div class="cm-pop-hd">${row.querySelector('p') ? esc(row.querySelector('p').textContent.slice(0, 80)) : 'Komentar'}</div>${rows([
      { k: 'reply', i: 'msg', t: 'Balas' },
      mineV && !isRep && { k: 'pin', i: 'pin', t: isPinned ? 'Lepas sematan komentar' : 'Sematkan komentar', s: isPinned ? '' : 'Tampilkan komentar ini di paling atas' },
      cstk && { k: 'svs', i: 'smile', t: 'Simpan ke Stiker Custom saya' },
      { k: 'cp', i: 'link', t: 'Salin teks' },
      (mine || mineV) && { k: 'del', i: 'trash', t: 'Hapus komentar', d: 1 },
      !mine && { k: 'rp', i: 'flag', t: 'Laporkan komentar', d: 1 }
    ])}</div>`;
    $('#sheet').appendChild(pop); requestAnimationFrame(() => pop.classList.add('on'));
    pop.onclick = async e => {
      if (e.target.classList.contains('cm-pop-shade')) return closePop();
      const bt = e.target.closest('[data-k]'); if (!bt) return;
      const k = bt.dataset.k;
      if (k === 'reply') { closePop(); const x = l.find(y => y.id === id); if (x) setReply(x) }
      if (k === 'pin') {
        closePop();
        try {
          const r = await post('/comments/' + id + '/pin');
          const item = l.find(x => x.id === id); if (item) item.pinned = r.pinned;
          toast(r.pinned ? 'Komentar disematkan' : 'Sematan komentar dilepas');
          draw(); const box = $('#cl'); if (box) box.scrollTop = 0;
        } catch (err) { toast(err.message, 'err') }
      }
      if (k === 'svs' && cstk) { closePop(); await saveCustomStickerFile(cstk.dataset.cfile) }
      if (k === 'cp') { cp(row.querySelector('p') ? row.querySelector('p').textContent : ''); closePop(); toast('Teks disalin') }
      if (k === 'rp') { closePop(); ask(() => reportSheet('comment', id, 'komentar ini')) }
      if (k === 'del') {
        closePop();
        try {
          const r = await api('/comments/' + id, { method: 'DELETE' });
          l = l.filter(x => x.id !== id && x.parent !== id);   // balasan ikut terhapus
          v.comments = Math.max(0, v.comments - ((r && r.removed) || 1));
          if (replyTo && (replyTo.id === id || replyTo.parent === id)) setReply(null);
          draw(); syncCard(c); toast('Komentar dihapus');
        } catch (err) { toast(err.message, 'err') }
      }
    };
  };
  wire($('#cc'), o => ask(async () => {
    try {
      const body = replyTo ? { ...o, parent: replyTo.id } : o;
      const r = await api(`/videos/${v.id}/comments`, { method: 'POST', body: toFD(body) });
      l.unshift(r.comment); v.comments++;
      if (r.comment.parent) open.add(r.comment.parent);
      setReply(null); draw(); syncCard(c);
    } catch (err) { toast(err.message, 'err') }
  }), true);
}
