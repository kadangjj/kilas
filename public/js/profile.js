/* ============================================================
   Zippy · profil (banner, video privat, audio tersimpan, bisik-bisik, & ajukan banding video takedown)
   ============================================================ */
const newOv = cls => {
  const o = document.createElement('div');
  o.className = 'ov ' + cls;
  $('#app').append(o);
  o._close = () => setTimeout(() => { if (!o.classList.contains('open')) o.remove() }, 300);
  return o;
};

// Sampul video di grid profil bersih tanpa tanggal; ikon privasi tampil di kanan bawah; video takedown menampilkan status banding
const gridHTML = (vs, _showDate = false) => vs.map((v, i) => {
  if (v.takedown) {
    const ap = v.appeal;
    const apLbl = ap && ap.status === 'pending' ? 'Banding Ditinjau' : ap && ap.status === 'rejected' ? 'Banding Ditolak' : 'Ketuk untuk Banding';
    return `<button class="gc td" data-i="${i}" aria-label="Video ditakedown"><span class="td-ic">${ic('ban')}</span><b>Ditakedown</b><small>${apLbl}</small>${v.caption ? `<em>${esc(String(v.caption).slice(0, 36))}</em>` : ''}</button>`;
  }
  return `<button class="gc vbox" data-i="${i}"><video class="rv${rotCls(v)}" src="${url(v.file)}#t=0.5" preload="${S.saver ? 'none' : 'metadata'}" muted playsinline></video><span class="gl">${ic('play', 's f')}${nf(v.views)}</span>${v.privacy !== 'public' ? `<span class="gp">${ic(PRV[v.privacy][0], 's')}</span>` : ''}</button>`;
}).join('');

const repostHTML = vs => vs.map((v, i) => `<button class="rpi" data-i="${i}"><span class="rpt vbox"><video class="rv${rotCls(v)}" src="${url(v.file)}#t=0.5" preload="${S.saver ? 'none' : 'metadata'}" muted playsinline></video></span><span class="lt"><b>${esc(dnm(v))}${vbdg(v)}</b><small class="mu">${ic('repeat', 's')} Di-repost ${dt(v.rp_at)}${v.created ? ' · Post ' + dt(v.created) : ''}</small>${v.rp_note ? `<span class="rpn">${cap(v.rp_note)}</span>` : '<small class="mu">Tanpa catatan</small>'}<small class="mu">${ic('eye', 's')} ${nf(v.views)} tayangan</small></span></button>`).join('');

const savedAudioHTML = as => as.map(a => `<div class="li flat saud" data-aid="${a.id}">
  <button class="aud-av sm" data-aplay="${esc(a.file)}" aria-label="Putar pratinjau"><span class="aud-av-in">${ava(a.name || a.username, a.avatar)}</span></button>
  <span class="lt" data-aopen="${a.id}" style="cursor:pointer">
    <b>${esc(a.title || 'Suara Asli')}</b>
    <small>@${esc(a.username)} · ${nf(a.total || 1)} postingan</small>
  </span>
  <button class="btn sm g" data-aopen="${a.id}">Buka</button>
  <button class="ib sm" data-aunsave="${a.id}" title="Hapus dari simpanan">${ic('bookmark', 's f')}</button>
</div>`).join('');

const bindRp = (el, list, opts = { fromProfile: true }) => { el.onclick = e => { const b = e.target.closest('.rpi'); if (b && !e.target.closest('.ht,.mn')) openViewer(list, +b.dataset.i, opts) } };
const bindGrid = (el, list, opts = { fromProfile: false }) => {
  el.onclick = e => {
    const b = e.target.closest('.gc'); if (!b) return;
    const v = list[+b.dataset.i]; if (!v) return;
    if (v.takedown) return takedownSheet(v);          // video ditakedown: buka detail & pengajuan banding
    const play = list.filter(x => !x.takedown);       // pemutar tidak boleh menyentuh video ditakedown
    openViewer(play, play.indexOf(v), opts);
  };
};

/* ---------- Takedown, Pengajuan Banding & Peringatan Akun (hanya terlihat oleh pemilik) ---------- */
async function takedownSheet(v) {
  const vidKey = v.code || v.id;
  sheet(`<div class="thanks" id="td-box">
    <span class="sa sysi k-warning" style="width:56px;height:56px">${ic('ban', 'f')}</span>
    <h3>Video Ditakedown Sistem</h3>
    <p class="td-note">Video ini ditakedown oleh Sistem Zippy karena terindikasi melanggar Pedoman Komunitas, sehingga <b>tidak bisa diputar</b> dan <b>tidak muncul di publik</b>.</p>
    <div class="td-meta"><b>${v.caption ? esc(v.caption) : 'Tanpa keterangan'}</b><small class="mu">Kode video: ${esc(v.code || v.id || '')}${v.created ? ' · ' + dt(v.created) : ''}</small></div>
    <div id="td-appeal-area" style="width:100%"></div>
    <div class="row" style="width:100%"><button class="btn g" id="tdx">Tutup</button><button class="btn dng" id="tdd">Hapus video</button></div>
  </div>`);

  $('#tdx').onclick = closeSheet;
  $('#tdd').onclick = () => confirmSheet('Hapus video ini?', async () => {
    try { await api('/videos/' + (v.id || v.code), { method: 'DELETE' }); toast('Video dihapus'); reloadProfiles() } catch (e) { toast(e.message, 'err') }
  }, 'Hapus', 'Video yang sudah dihapus tidak bisa dikembalikan.');

  const renderAppealArea = (ap) => {
    const area = $('#td-appeal-area');
    if (!area) return;
    if (ap && ap.status === 'pending') {
      area.innerHTML = `<div class="td-ap-box pending">
        <div class="row" style="margin:0;gap:6px;align-items:center"><b>${ic('clock', 's')} Banding Sedang Ditinjau Sistem</b></div>
        <p class="mu" style="font-size:13px;margin-top:4px">Alasanmu: “${esc(ap.reason)}”</p>
        <small class="mu">Diajukan ${dt(ap.created)}. Kamu akan mendapat notifikasi begitu Sistem memberikan keputusan.</small>
      </div>`;
      return;
    }
    if (ap && ap.status === 'approved') {
      area.innerHTML = `<div class="td-ap-box ok">
        <b>${ic('check', 's b3')} Banding Disetujui Sistem!</b>
        <p class="mu" style="font-size:13px;margin-top:4px">Videomu sudah dipulihkan ke publik.</p>
      </div>`;
      return;
    }
    const rejectedNotice = ap && ap.status === 'rejected'
      ? `<div class="td-ap-box rejected"><b>Banding sebelumnya ditolak Sistem</b>${ap.note ? `<p style="font-size:12.5px;margin-top:3px">Catatan Sistem: ${esc(ap.note)}</p>` : ''}</div>`
      : '';
    area.innerHTML = `${rejectedNotice}
      <div class="td-ap-form-wrap" id="td-ap-wrap">
        <button type="button" class="btn" id="td-open-ap" style="width:100%">${ic('shield', 's')} ${ap && ap.status === 'rejected' ? 'Ajukan Banding Ulang' : 'Ajukan Banding ke Sistem'}</button>
        <form id="td-ap-form" class="col" style="margin-top:10px;display:none;text-align:left">
          <label style="font-weight:700;color:var(--tx)">Alasan Pengajuan Banding
            <textarea name="reason" id="td-ap-reason" rows="3" maxlength="500" placeholder="Jelaskan kepada Sistem kenapa video ini aman dan tidak melanggar Pedoman Komunitas Zippy..." required style="margin-top:6px"></textarea>
          </label>
          <button class="btn" id="td-send-ap">${ic('send', 's')} Kirim Banding Sekarang</button>
        </form>
      </div>`;
    const openBtn = $('#td-open-ap'), formEl = $('#td-ap-form');
    if (openBtn && formEl) {
      openBtn.onclick = () => {
        openBtn.style.display = 'none';
        formEl.style.display = 'grid';
        const ta = $('#td-ap-reason'); if (ta) ta.focus();
      };
      formEl.onsubmit = async e => {
        e.preventDefault();
        const sb = $('#td-send-ap'), rsn = ($('#td-ap-reason').value || '').trim();
        if (rsn.length < 5) return toast('Jelaskan alasan banding minimal 5 karakter', 'err');
        sb.disabled = true; sb.textContent = 'Mengirim...';
        try {
          const res = await post(`/videos/${vidKey}/appeal`, { reason: rsn });
          v.appeal = res.appeal;
          toast('Banding berhasil diajukan ke Sistem');
          renderAppealArea(res.appeal);
          reloadProfiles();
        } catch (err) {
          toast(err.message, 'err');
          sb.disabled = false;
          sb.innerHTML = `${ic('send', 's')} Kirim Banding Sekarang`;
        }
      };
    }
  };

  renderAppealArea(v.appeal || null);
  if (v.appeal === undefined && vidKey) {
    try {
      const d = await api(`/videos/${vidKey}/appeal`, { cache: 'no-store' });
      if (d && d.video) { v.id = d.video.id; v.code = d.video.code; v.appeal = d.appeal }
      renderAppealArea(d.appeal);
    } catch {}
  }
}

const WARN_KIND = { account: 'Peringatan akun', video: 'Peringatan video', takedown: 'Video ditakedown' };
function warningsSheet(list) {
  const rowsH = (list || []).map(w => {
    const vc = w.video
      ? `<button class="wn-v" data-wv="${esc(w.video.code)}" data-wtd="${w.video.takedown ? 1 : 0}" data-wid="${w.video.id}">${ic('video', 's')}<span><b>${w.video.caption ? esc(String(w.video.caption).slice(0, 50)) : 'Video tanpa keterangan'}</b><small>Kode ${esc(w.video.code)}${w.video.takedown ? ' · Ditakedown (Ketuk untuk Banding)' : ''}</small></span>${ic('chev', 's')}</button>`
      : w.video_gone ? `<div class="wn-v gone">${ic('video', 's')}<span><small>Video terkait sudah dihapus</small></span></div>` : '';
    return `<div class="wn"><div class="wn-h"><span class="sa sysi k-warning">${ic(w.kind === 'takedown' ? 'ban' : 'alert', 'f')}</span><b>${WARN_KIND[w.kind] || 'Peringatan'}</b><small class="mu">${dt(w.created)}</small></div><p>${esc(w.note || '')}</p>${vc}</div>`;
  }).join('');
  sheet(`<div class="sh-head"><h3>Peringatan sistem (${(list || []).length})</h3><div class="sh-actions"><button type="button" class="ib sm" id="wnx" aria-label="Tutup">${ic('close', 's')}</button></div></div>
    <p class="mu sub" style="margin-top:-4px">${ic('eye', 's')} Hanya kamu yang bisa melihat ini. Profil publikmu tidak menampilkan peringatan.</p>
    <div class="wn-list">${rowsH || empty('shield', 'Tidak ada peringatan')}</div>`);
  $('#wnx').onclick = closeSheet;
  $('#sheet .wn-list').onclick = e => {
    const b = e.target.closest('[data-wv]'); if (!b) return;
    closeSheet();
    const found = (list.find(w => w.video && w.video.code === b.dataset.wv) || {}).video;
    if (b.dataset.wtd === '1') takedownSheet({ id: +b.dataset.wid, code: b.dataset.wv, caption: found ? found.caption : '', appeal: found ? found.appeal : undefined });
    else openVid(b.dataset.wv);
  };
}
const userRow = (u, extra = '') => `<div class="li flat" data-u="${esc(u.username)}"><span class="sa">${ava(u.username, u.avatar)}</span><span class="lt"><b>${esc(u.name || u.username)}${vbdg(u)}</b><small>@${esc(u.username)}${u.followers != null ? ' · ' + nf(u.followers) + ' pengikut' : ''}</small></span>${extra}</div>`;

/* ---------- Buka Profil (Tab Profil Saya vs Overlay Profil) ---------- */
async function openMyProfileTab() {
  if (!token || !me) return authSheet();
  switchTabView('me');
  const o = $('#myprof');
  try { await buildProfile(o, me.username, false, true) } catch (e) { toast(e.message, 'err') }
}

async function openProfile(name) {
  try {
    const own = isOwn(name);
    if (own && !L.length) return openMyProfileTab();
    const o = newOv('prof');
    await buildProfile(o, name, true, false);
    lay(o);
  } catch (e) { toast(e.message, 'err') }
}

const reloadProfiles = () => {
  $$('.prof.open').forEach(p => p._reload && p._reload());
};

async function buildProfile(o, name, visit, isTab = false) {
  const r = await api('/users/' + encodeURIComponent(name) + (visit ? '?visit=1' : ''), { cache: 'no-store' }), u = r.user, own = isOwn(u.username);
  o._u = u.username;
  o._reload = () => buildProfile(o, name, false, isTab).catch(() => {});
  const fbtn = () => r.isFollowing ? (r.friend ? 'Teman' : 'Mengikuti') : r.requested ? 'Diminta' : (r.followsMe ? 'Ikuti balik' : 'Ikuti');
  const hls = (r.highlights || []).map(h => `<button class="hl" data-h="${h.id}"><span class="hr">${h.cover_kind === 'video' ? `<video src="${url(h.cover)}#t=0.1" muted playsinline preload="metadata"></video>` : `<img src="${url(h.cover)}" alt="" loading="lazy">`}</span><small>${esc(h.title)}</small></button>`).join('');
  // Urutan tab ikon: Video | Privat (gembok) | Repost | Disimpan (pita) | Disukai (hati)
  const TABS = r.locked ? [] : [
    ['videos', 'grid', 'Video'],
    ...(own ? [['private', 'lock', 'Privat']] : []),
    ['reposts', 'repeat', 'Repost'],
    ...(own ? [['saved', 'bookmark', 'Disimpan'], ['liked', 'heart', 'Disukai']] : [])
  ];
  const keep = o.scrollTop;
  const storyRingCls = r.hasStory && r.storyUnseen ? ' hs un' : '';

  o.innerHTML = `
  <div class="p-banner-wrap">
    <div class="bn" style="background:${bnCss(u.banner, u.username)}"></div>
    <header class="p-top">
      <div class="p-top-l">
        ${isTab ? '' : `<button class="ib" data-x aria-label="Kembali">${ic('back')}</button>`}
        ${own ? `<button class="ib" data-edit aria-label="Ubah profil" title="Ubah profil">${ic('edit')}</button>` : ''}
      </div>
      <div class="p-top-r">
        ${own
          ? `<button class="ib" data-visitors aria-label="Pengunjung profil" title="Pengunjung profil">${ic('footprints')}</button>
             <button class="ib p-req-btn" data-reqs aria-label="Permintaan mengikuti" title="Permintaan mengikuti">${ic('userplus')}${r.requests ? `<i class="p-dot">${r.requests}</i>` : ''}</button>
             <button class="ib" data-gear aria-label="Pengaturan" title="Pengaturan">${ic('menu')}</button>`
          : `<button class="ib" data-more aria-label="Lainnya">${ic('more', 'b3')}</button>`}
      </div>
    </header>
  </div>

  <div class="p-body">
    <div class="p-hero">
      <div class="p-info">
        <div class="nm">
          ${u.private ? `<span class="p-lk" title="Akun Privat">${ic('lock', 's')}</span>` : ''}
          <h2>${esc(dnm(u))}</h2>${vbdg(u)}
          ${own && r.requests ? `<button class="nm-cnt" data-reqs title="Permintaan mengikuti">${r.requests}</button>` : ''}
          ${r.friend ? `<span class="chp fr">${ic('users', 's')} Teman</span>` : r.followsMe && !own ? '<span class="chp">Mengikutimu</span>' : ''}
        </div>
        <p class="p-uname">@${esc(u.username)}</p>
        ${own && r.warnings && r.warnings.length ? `<button class="p-warn" data-warns>${ic('alert', 's')}<span>${r.warnings.length} peringatan</span><small>hanya terlihat olehmu</small></button>` : ''}
        <div class="p-stats">
          <button class="p-st" ${own ? 'data-l="following"' : ''}><b>${nf(r.following)}</b><span>Mengikuti</span></button>
          <button class="p-st" ${own ? 'data-l="followers"' : ''}><b>${nf(r.followers)}</b><span>Pengikut</span></button>
          <div class="p-st"><b>${nf(r.likes)}</b><span>Suka</span></div>
        </div>
      </div>

      <div class="p-av-col">
        ${(own || u.note) ? `<button class="bisik-bub" ${own ? 'data-note' : ''}><span>${esc(u.note || 'Bisik-bisik')}</span></button>` : ''}
        <div class="pah">
          <button class="pa${storyRingCls}" data-story aria-label="Story">${ava(u.username, u.avatar)}</button>
          ${own ? `<button class="padd" data-addstory aria-label="Tambah story">${ic('plus', 'b3')}</button>` : ''}
        </div>
      </div>
    </div>

    <p class="p-bio">${bioCap(u.bio || 'Belum ada bio')}</p>
    ${u.link ? `<a class="p-link" href="${esc(normUrl(u.link))}" target="_blank" rel="noopener noreferrer">${ic('link', 's')} <span>${esc(prettyUrl(u.link))}</span></a>` : ''}

    ${own ? `<div class="p-pills">
      <button class="p-pill" data-archive><span class="p-pi pk">${ic('clock', 's')}</span><span>Arsip Story</span><i class="p-dot-s"></i></button>
      <button class="p-pill" data-privbox><span class="p-pi rd">${ic('lock', 's')}</span><span>Video Privat${r.privateCount ? ' (' + r.privateCount + ')' : ''}</span></button>
      <button class="p-pill" data-l="friends"><span class="p-pi ht">${ic('heart', 's f')}</span><span>Teman: ${nf(r.friends)}</span></button>
      <button class="p-pill" data-stmaker><span class="p-pi">${ic('smile', 's')}</span><span>Stiker Custom</span></button>
    </div>` : `<div class="row p-act">
      <button class="btn${r.isFollowing || r.requested ? ' g' : ''}" id="fb">${fbtn()}</button>
      ${r.canMessage ? `<button class="btn g" data-msg>${ic('msg', 's')} Pesan</button>` : ''}
    </div>`}

    ${own || hls ? `<div class="hls">${own ? `<button class="hl new" data-hnew><span class="hr">${ic('plus')}</span><small>Baru</small></button>` : ''}${hls}</div>` : ''}
  </div>

  ${r.locked ? `<div class="lockp"><span class="lki">${ic('lock')}</span><b>Akun ini privat</b><p class="mu">Ikuti ${esc(dnm(u))} untuk melihat video, repost, sorotan, dan mengirim pesan.</p></div>` : ''}
  <div class="ptabs">${TABS.map(([k, i, t]) => `<button data-t="${k}" class="${k === 'videos' ? 'on' : ''}" aria-label="${t}">${ic(i)}</button>`).join('')}</div>
  <div class="pnote" id="pn"></div>
  <div class="gr" id="pg"></div>`;
  o.scrollTop = keep;

  const cache = { videos: r.videos }, pg = o.querySelector('#pg'), pn = o.querySelector('#pn');
  let savedSub = 'videos';
  const EMP = {
    videos: ['video', 'Belum ada video', own ? 'Tekan + untuk posting video pertamamu.' : ''],
    reposts: ['users', 'Belum ada repost', ''],
    liked: ['heart', 'Belum ada video yang disukai', 'Video yang kamu sukai muncul di sini.'],
    saved: ['save', 'Belum ada video yang disimpan', 'Ketuk ikon Simpan di video untuk menyimpannya.'],
    saved_audio: ['save', 'Belum ada suara yang disimpan', 'Ketuk tombol Simpan di halaman Suara Asli untuk menyimpannya ke sini.'],
    private: ['lock', 'Belum ada video privat', 'Video dengan privasi "Hanya saya" tersimpan khusus di sini dan tidak muncul di Beranda maupun profil publik.']
  };

  async function renderSavedSub(sub) {
    savedSub = sub;
    pn.innerHTML = `<div class="seg sm-seg" id="sv-seg"><button data-svt="videos" class="${sub === 'videos' ? 'on' : ''}">${ic('video', 's')} Video Tersimpan</button><button data-svt="audios" class="${sub === 'audios' ? 'on' : ''}">${ic('music', 's')} Suara Tersimpan</button></div>`;
    if (sub === 'audios') {
      pg.className = 'saud-list';
      pg.innerHTML = skel(4);
      try {
        const { audios } = await api('/me/saved-audios', { cache: 'no-store' });
        pg.innerHTML = audios.length ? savedAudioHTML(audios) : `<div class="gempty">${empty(...EMP.saved_audio)}</div>`;
        pg.onclick = async ev => {
          const un = ev.target.closest('[data-aunsave]');
          if (un) {
            ev.stopPropagation();
            try { await post('/audio/' + un.dataset.aunsave + '/save'); toast('Suara dihapus dari simpanan'); renderSavedSub('audios') } catch (err) { toast(err.message, 'err') }
            return;
          }
          const pl = ev.target.closest('[data-aplay]');
          if (pl) {
            ev.stopPropagation();
            const row = pl.closest('.saud');
            return openAudio(+row.dataset.aid);
          }
          const op = ev.target.closest('[data-aopen]');
          if (op) return openAudio(+op.dataset.aopen);
        };
      } catch (e) { pg.innerHTML = ''; toast(e.message, 'err') }
      return;
    }
    if (!cache.saved) {
      pg.className = 'gr';
      pg.innerHTML = '<div class="gsk"><i></i><i></i><i></i><i></i><i></i><i></i></div>';
      try { cache.saved = (await api('/me/saved', { cache: 'no-store' })).videos } catch (e) { pg.innerHTML = ''; return toast(e.message, 'err') }
    }
    const l = cache.saved;
    pg.className = 'gr';
    pg.innerHTML = l.length ? gridHTML(l, false) : `<div class="gempty">${empty(...EMP.saved)}</div>`;
    bindGrid(pg, l, { fromProfile: true });
  }

  async function tabLoad(k) {
    if (k === 'saved' && own) return renderSavedSub(savedSub);
    pn.innerHTML = own && k === 'liked' ? `<span>${ic('lock', 's')} Hanya kamu yang bisa melihat video yang kamu sukai</span>`
      : own && k === 'private' ? `<span>${ic('lock', 's')} Video privat hanya bisa dilihat olehmu dan tidak muncul di Beranda</span>` : '';
    if (!cache[k]) {
      pg.innerHTML = '<div class="gsk"><i></i><i></i><i></i><i></i><i></i><i></i></div>';
      try {
        const ep = k === 'reposts' ? `/users/${encodeURIComponent(u.username)}/reposts` : k === 'liked' ? '/me/liked' : k === 'private' ? '/me/private-videos' : '/me/saved';
        cache[k] = (await api(ep, { cache: 'no-store' })).videos;
      } catch (e) { pg.innerHTML = ''; return toast(e.message, 'err') }
    }
    const l = cache[k];
    pg.className = k === 'reposts' ? 'rpl' : 'gr';
    pg.innerHTML = l.length ? (k === 'reposts' ? repostHTML(l) : gridHTML(l, false)) : `<div class="gempty">${empty(...EMP[k])}</div>`;
    k === 'reposts' ? bindRp(pg, l, { fromProfile: true }) : bindGrid(pg, l, { fromProfile: true });
  }
  if (!r.locked) tabLoad('videos');

  o.onclick = async e => {
    const svb = e.target.closest('[data-svt]');
    if (svb) return renderSavedSub(svb.dataset.svt);
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.x !== undefined) return back();
    if (b.dataset.t) { o.querySelectorAll('.ptabs button').forEach(x => x.classList.toggle('on', x === b)); return tabLoad(b.dataset.t) }
    if (b.dataset.l) return openFollows(b.dataset.l);
    if (b.dataset.note !== undefined) return noteSheet(u);
    if (b.dataset.story !== undefined) return r.hasStory ? openStoriesFor(u.username) : own ? storyComposer() : null;
    if (b.dataset.addstory !== undefined) return storyComposer();
    if (b.dataset.archive !== undefined) return openStoryArchive();
    if (b.dataset.stmaker !== undefined && typeof openStickerMaker === 'function') return openStickerMaker();
    if (b.dataset.hnew !== undefined) return highlightComposer();
    if (b.dataset.h) return openHighlight(+b.dataset.h, own);
    if (b.dataset.edit !== undefined) return editPage(u);
    if (b.dataset.warns !== undefined) return warningsSheet(r.warnings);
    if (b.dataset.visitors !== undefined) return openVisitors();
    if (b.dataset.privbox !== undefined) return openPrivateVideos();
    if (b.dataset.reqs !== undefined) return openRequests();
    if (b.dataset.gear !== undefined) return settings();
    if (b.dataset.msg !== undefined) return ask(() => openChat(u.username));
    if (b.dataset.more !== undefined) {
      sheet(`<h3>@${esc(u.username)}</h3>${rows([{ k: 'cp', i: 'link', t: 'Salin link profil' }, { k: 'rp', i: 'flag', t: 'Laporkan akun', d: 1 }])}`);
      return onPick(k => { if (k === 'cp') { cp(`${SERVER || location.origin}/#u=${u.username}`); closeSheet(); toast('Link disalin') } else ask(() => reportSheet('user', u.username, 'akun ini')) });
    }
    if (b.id === 'fb') ask(async () => {
      try {
        const was = r.isFollowing, f = await post(`/users/${encodeURIComponent(u.username)}/follow`);
        r.isFollowing = f.following; r.requested = f.requested; r.friend = f.friend; r.followers = f.followers;
        syncFollowState(u.username, f);
        b.textContent = fbtn(); b.classList.toggle('g', f.following || f.requested); buzz(10);
        if (f.friend) toast('Kalian sekarang berteman'); else if (f.requested) toast('Permintaan ikuti dikirim'); else if (!f.following && was) toast('Berhenti mengikuti ' + dnm(u));
        return o._reload();
      } catch (err) { toast(err.message, 'err') }
    });
  };

  let hT; o.querySelectorAll('.hl[data-h]').forEach(h => {
    h.addEventListener('pointerdown', () => { if (!own) return; hT = setTimeout(() => { hT = 'lp'; buzz(); editHighlightMenu(+h.dataset.h, (r.highlights.find(x => x.id == h.dataset.h) || {}).title) }, 520) });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => h.addEventListener(ev, () => { if (hT !== 'lp') clearTimeout(hT) }));
    h.addEventListener('click', e => { if (hT === 'lp') { hT = 0; e.stopImmediatePropagation(); e.preventDefault() } }, true);
  });
}

function noteSheet(u) {
  sheet(`<h3>Bisik-bisik (Catatan Singkat)</h3><p class="mu sub">Tampilkan gelembung catatan singkat di atas foto profilmu.</p>
  <form id="ntf" class="col">
    <input name="note" maxlength="40" value="${esc(u.note || '')}" placeholder="Tulis bisik-bisik (maks. 40 karakter)...">
    <div class="row">
      ${u.note ? '<button type="button" class="btn g" id="nt-clr">Hapus</button>' : ''}
      <button class="btn">Simpan</button>
    </div>
  </form>`);
  const clr = $('#nt-clr');
  if (clr) clr.onclick = async () => {
    try { const fd = new FormData(); fd.append('note', ''); const r = await api('/me', { method: 'PUT', body: fd }); me = r.user; closeSheet(); reloadProfiles(); toast('Catatan dihapus') } catch (e) { toast(e.message, 'err') }
  };
  $('#ntf').onsubmit = async e => {
    e.preventDefault();
    try { const fd = new FormData(); fd.append('note', e.target.note.value.trim()); const r = await api('/me', { method: 'PUT', body: fd }); me = r.user; closeSheet(); reloadProfiles(); toast('Bisik-bisik diperbarui') } catch (err) { toast(err.message, 'err') }
  };
}

/* ---------- Halaman Khusus Video Privat ("Hanya Saya") ---------- */
async function openPrivateVideos() {
  const o = newOv('tg');
  o.innerHTML = `<header class="ab"><button class="ib" data-x aria-label="Kembali">${ic('back')}</button><h2>Video Privat Saya</h2></header>
  <p class="note mu">${ic('lock', 's')} Video dengan privasi "Hanya saya" disimpan terpisah di sini dan tidak muncul di Beranda maupun halaman profil publikmu.</p>
  <div class="gr" id="pvg"><div class="gsk"><i></i><i></i><i></i></div></div>`;
  o.onclick = e => { if (e.target.closest('[data-x]')) back() };
  lay(o);
  try {
    const { videos } = await api('/me/private-videos', { cache: 'no-store' });
    const g = o.querySelector('#pvg');
    g.innerHTML = videos.length ? gridHTML(videos, false) : `<div class="gempty">${empty('lock', 'Belum ada video privat', 'Saat memposting atau mengatur privasi video ke "Hanya saya", videomu akan tersimpan di sini.')}</div>`;
    if (videos.length) bindGrid(g, videos, { fromProfile: true });
  } catch (e) { toast(e.message, 'err') }
}

/* ---------- Pengikut / mengikuti / teman (hanya milik sendiri) ---------- */
function openFollows(type = 'followers') {
  const o = $('#fl'); let list = [], q = '';
  o.innerHTML = `<header class="ab"><button class="ib" data-x aria-label="Kembali">${ic('back')}</button><h2>@${esc(me.username)}</h2></header>
<div class="seg">${[['followers', 'Pengikut'], ['following', 'Mengikuti'], ['friends', 'Teman']].map(([k, t]) => `<button data-t="${k}" class="${k === type ? 'on' : ''}">${t}</button>`).join('')}</div>
<div class="sbar"><label class="fld">${ic('search')}<input id="fq" placeholder="Cari di daftar" autocomplete="off"></label></div><p class="note mu" id="fnote"></p><div id="fr" class="flist"></div>`;
  const NOTE = { followers: 'Akun yang mengikutimu.', following: 'Akun yang kamu ikuti.', friends: 'Teman adalah akun yang saling follow denganmu.' };
  const draw = () => {
    const l = list.filter(x => !q || (x.username + ' ' + (x.name || '')).toLowerCase().includes(q));
    $('#fr').innerHTML = l.length ? l.map(x => userRow(x, `<button class="btn sm${x.iFollow ? ' g' : ''}" data-f="${esc(x.username)}">${x.iFollow ? (x.friend ? 'Teman' : 'Mengikuti') : (x.followsMe ? 'Ikuti balik' : 'Ikuti')}</button>`)).join('')
      : empty(type === 'friends' ? 'users' : 'heart', q ? 'Tidak ditemukan' : type === 'friends' ? 'Belum ada teman' : type === 'followers' ? 'Belum ada pengikut' : 'Belum mengikuti siapa pun', q ? '' : type === 'friends' ? 'Kalau kalian saling follow, kalian otomatis berteman.' : '');
  };
  const load = async t => {
    type = t; q = ''; $('#fq').value = ''; o.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x.dataset.t === t)); $('#fnote').textContent = NOTE[t];
    $('#fr').innerHTML = skel(6);
    try { list = (await api('/me/follows?type=' + t, { cache: 'no-store' })).users } catch (e) { list = []; toast(e.message, 'err') } draw();
  };
  o.onclick = async e => {
    if (e.target.closest('[data-x]')) return back();
    const t = e.target.closest('.seg button'); if (t) return load(t.dataset.t);
    const f = e.target.closest('[data-f]');
    if (f) {
      e.stopPropagation();
      try {
        const x = list.find(i => i.username === f.dataset.f), r = await post(`/users/${encodeURIComponent(x.username)}/follow`);
        x.iFollow = r.following; x.friend = r.following && x.followsMe;
        syncFollowState(x.username, r);
        draw(); reloadProfiles();
      } catch (err) { toast(err.message, 'err') }
      return;
    }
    const row = e.target.closest('.li'); if (row) openProfile(row.dataset.u);
  };
  $('#fq').oninput = e => { q = e.target.value.trim().toLowerCase(); draw() };
  lay(o); load(type);
}

/* ---------- Ubah profil + banner + pemotong gambar + tautan bio + bisik-bisik ---------- */
function cropper(file, ar, ow) {
  return new Promise(res => {
    const o = $('#crop'), im = new Image();
    im.onload = () => {
      const W = Math.min(innerWidth - 32, 420), H = W / ar; let s, mn, x, y, done = false, p = null;
      o.innerHTML = `<header class="ab"><button class="ib" data-x aria-label="Batal">${ic('close')}</button><h2>Potong gambar</h2><button class="btn" id="cok">Pakai</button></header><div class="bd" style="justify-items:center"><canvas id="cv" width="${W}" height="${H}" style="width:${W}px;height:${H}px;border-radius:${ar === 1 ? '50%' : '16px'};touch-action:none;background:#000"></canvas><input type="range" id="zm" min="1" max="4" step="0.01" value="1" style="max-width:${W}px"><p class="mu">Geser dan atur zoom</p></div>`;
      const cv = $('#cv'), g = cv.getContext('2d'); mn = s = Math.max(W / im.width, H / im.height); x = (W - im.width * s) / 2; y = (H - im.height * s) / 2;
      const draw = () => { const w = im.width * s, h = im.height * s; x = Math.min(0, Math.max(W - w, x)); y = Math.min(0, Math.max(H - h, y)); g.clearRect(0, 0, W, H); g.drawImage(im, x, y, w, h) }; draw();
      $('#zm').oninput = e => { const n = mn * e.target.value, k = n / s; x = W / 2 - (W / 2 - x) * k; y = H / 2 - (H / 2 - y) * k; s = n; draw() };
      cv.onpointerdown = e => { p = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId) };
      cv.onpointermove = e => { if (!p) return; x += e.clientX - p[0]; y += e.clientY - p[1]; p = [e.clientX, e.clientY]; draw() };
      cv.onpointerup = () => p = null;
      o.querySelector('[data-x]').onclick = back;
      $('#cok').onclick = () => { const k = ow / W, c = document.createElement('canvas'); c.width = ow; c.height = Math.round(H * k); c.getContext('2d').drawImage(im, x * k, y * k, im.width * s * k, im.height * s * k); c.toBlob(b => { done = true; back(); res(new File([b], 'crop.jpg', { type: 'image/jpeg' })) }, 'image/jpeg', .9) };
      lay(o); const iv = setInterval(() => { if (!o.classList.contains('open')) { clearInterval(iv); if (!done) res(null) } }, 200);
    };
    im.src = URL.createObjectURL(file);
  });
}

function editPage(u) {
  const o = $('#edit'), st = { p: null, bf: null, af: null };
  o.innerHTML = `<header class="ab"><button class="ib" data-x aria-label="Tutup">${ic('close')}</button><h2>Ubah profil</h2><button class="btn" id="sv-prof">Simpan</button></header>
<form id="ef" class="bd">
  <div>
    <label style="margin-bottom:6px">Banner profil</label>
    <div class="bn ed-bn" id="bp" style="background:${bnCss(u.banner, u.username)}">
      <label class="ed-bn-btn">${ic('camera', 's')} <span>Foto banner</span><input type="file" id="bf" accept="image/*"></label>
    </div>
    <div class="sws" id="bgr" style="margin-top:10px">${GR.map((g, i) => `<button type="button" data-g="g:${i + 1}" class="${u.banner === 'g:' + (i + 1) ? 'on' : ''}" style="background:${g}" aria-label="Warna banner ${i + 1}"></button>`).join('')}</div>
  </div>
  <div class="row" style="align-items:center"><div class="pa sm" id="ap">${ava(u.username, u.avatar)}</div><div style="flex:1;display:grid;gap:6px"><label class="btn g sm" style="width:fit-content">${ic('camera', 's')} Ubah foto profil<input type="file" id="af" accept="image/*"></label></div></div>
  <label>Nama tampilan<input name="name" maxlength="30" value="${esc(u.name || '')}" placeholder="${esc(u.username)}" style="margin-top:6px"></label>
  <label>Bisik-bisik (gelembung di atas foto profil)<input name="note" maxlength="40" value="${esc(u.note || '')}" placeholder="Bisik-bisik..." style="margin-top:6px"></label>
  <label>Bio<textarea name="bio" rows="3" maxlength="150" placeholder="Bio, boleh pakai #hashtag, @mention, atau tautan" style="margin-top:6px">${esc(u.bio || '')}</textarea></label><div class="sug" id="bsg"></div>
  <label>Tautan di bio (opsional)<div class="fld" style="margin-top:6px">${ic('link')}<input name="link" maxlength="200" value="${esc(u.link || '')}" placeholder="https://lieva.my.id"></div></label>
</form>`;
  o.querySelector('[data-x]').onclick = back; suggest($('#ef').bio, $('#bsg'));
  $('#bf').onchange = async e => {
    const x = e.target.files[0]; e.target.value = ''; if (!x) return;
    const f = await cropper(x, 2.5, 1080);
    if (f) {
      st.bf = f; st.p = null;
      $('#bp').style.background = `url('${URL.createObjectURL(f)}') center/cover`;
      $$('#bgr button').forEach(b => b.classList.remove('on'));
    }
  };
  $('#bgr').onclick = e => {
    const b = e.target.closest('[data-g]'); if (!b) return;
    st.p = b.dataset.g; st.bf = null;
    $('#bp').style.background = GR[st.p.slice(2) - 1] || GR[0];
    $$('#bgr button').forEach(x => x.classList.toggle('on', x === b));
  };
  $('#af').onchange = async e => { const x = e.target.files[0]; e.target.value = ''; if (!x) return; const f = await cropper(x, 1, 512); if (f) { st.af = f; $('#ap').innerHTML = `<img src="${URL.createObjectURL(f)}" alt="">` } };
  $('#sv-prof').onclick = async () => {
    const f = $('#ef'), fd = new FormData();
    fd.append('name', f.name.value);
    fd.append('note', f.note.value.trim());
    fd.append('bio', f.bio.value);
    fd.append('link', f.link.value.trim());
    if (st.af) fd.append('avatar', st.af);
    if (st.bf) fd.append('banner', st.bf);
    else if (st.p) fd.append('banner_preset', st.p);
    try { const r = await api('/me', { method: 'PUT', body: fd }); me = r.user; back(); setTimeout(reloadProfiles, 60); toast('Profil disimpan') } catch (err) { toast(err.message, 'err') }
  };
  lay(o);
}

/* ---------- Pengunjung profil ---------- */
async function openVisitors() {
  const o = newOv('tg'); let d = { on: me.visitors_on, visitors: [], total: 0, week: 0 };
  const draw = () => {
    o.innerHTML = `<header class="ab"><button class="ib" data-x aria-label="Kembali">${ic('back')}</button><h2>Pengunjung profil</h2></header>
<div class="si"><span class="ci">${ic(d.on ? 'eye' : 'eyeoff')}</span><span class="lt"><b>Catat pengunjung</b><small>Kalau dimatikan, kamu tidak bisa melihat pengunjungmu dan kunjunganmu ke profil orang lain juga tidak tercatat.</small></span><label class="sw"><input type="checkbox" id="vton" ${d.on ? 'checked' : ''}><span></span></label></div>
${d.on ? `<div class="stats vstat"><div class="stat"><b>${nf(d.week)}</b><span>7 hari terakhir</span></div><div class="stat"><b>${nf(d.total)}</b><span>total pengunjung</span></div></div>
${d.visitors.length ? d.visitors.map(x => userRow(x, `<small class="mu">${ago(x.created)}${x.n > 1 ? ' · ' + x.n + 'x' : ''}</small>`)).join('') : empty('eye', 'Belum ada pengunjung', 'Orang yang membuka profilmu akan muncul di sini.')}
${d.visitors.length ? '<button class="btn g more" id="vtc">Hapus riwayat</button>' : ''}` : empty('eyeoff', 'Riwayat pengunjung mati', 'Nyalakan untuk melihat siapa yang membuka profilmu.')}`;
  };
  const load = async () => { try { d = await api('/me/visitors') } catch (e) { toast(e.message, 'err') } draw() };
  o.onclick = async e => {
    if (e.target.closest('[data-x]')) return back();
    const row = e.target.closest('.li[data-u]'); if (row) return openProfile(row.dataset.u);
    if (e.target.closest('#vtc')) return confirmSheet('Hapus riwayat pengunjung?', async () => { try { await api('/me/visitors', { method: 'DELETE' }); toast('Riwayat dihapus'); load() } catch (err) { toast(err.message, 'err') } }, 'Hapus');
  };
  o.onchange = async e => {
    if (e.target.id !== 'vton') return;
    try { const r = await api('/me/privacy', { method: 'PUT', json: { visitors_on: e.target.checked } }); me = r.user; toast(e.target.checked ? 'Riwayat pengunjung dinyalakan' : 'Riwayat pengunjung dimatikan'); load() } catch (err) { e.target.checked = !e.target.checked; toast(err.message, 'err') }
  };
  draw(); lay(o); load();
}

/* ---------- Permintaan mengikuti (akun privat) ---------- */
async function openRequests() {
  const o = newOv('tg'); let list = [];
  const draw = () => o.querySelector('#rql').innerHTML = list.length ? list.map(x => userRow(x, `<span class="rq"><button class="btn sm" data-a="1" data-n="${esc(x.username)}">Terima</button><button class="btn sm g" data-a="0" data-n="${esc(x.username)}">Tolak</button></span>`)).join('') : empty('userplus', 'Tidak ada permintaan', 'Permintaan mengikuti muncul di sini kalau akunmu privat.');
  o.innerHTML = `<header class="ab"><button class="ib" data-x aria-label="Kembali">${ic('back')}</button><h2>Permintaan mengikuti</h2></header><div id="rql">${skel(3)}</div>`;
  o.onclick = async e => {
    if (e.target.closest('[data-x]')) return back();
    const b = e.target.closest('[data-a]');
    if (b) { try { await post('/me/requests/' + encodeURIComponent(b.dataset.n), { action: b.dataset.a === '1' ? 'accept' : 'decline' }); list = list.filter(x => x.username !== b.dataset.n); draw(); reloadProfiles(); badges() } catch (err) { toast(err.message, 'err') } return }
    const row = e.target.closest('.li[data-u]'); if (row) openProfile(row.dataset.u);
  };
  lay(o); try { list = (await api('/me/requests')).users } catch (e) { toast(e.message, 'err') } draw();
}
