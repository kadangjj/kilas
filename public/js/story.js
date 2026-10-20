/* ============================================================
   Zippy · story (24 jam), Arsip Story lengkap, balasan story bergambar, sorotan
   ============================================================ */
const SV = { users: [], ui: 0, si: 0, raf: 0, t0: 0, dur: 5000, paused: false, hold: 0, hl: null, isArch: false, el: null, gen: 0, aud: null, pendingViews: [] };

function stopStoryAudio() {
  if (SV.aud) {
    try { SV.aud.pause(); SV.aud.src = '' } catch {}
    SV.aud = null;
  }
}

/* ---------- Baki story (di halaman Pesan) ---------- */
async function storyTray() {
  if (!token) return '';
  try {
    const { stories } = await api('/stories', { cache: 'no-store' }), mine = stories.find(s => s.own);
    const ring = s => `<button class="stb" data-su="${esc(s.username)}"><span class="sr${s.unseen > 0 ? ' un' : ''}"><span class="sa">${ava(s.username, s.avatar)}</span></span><small>${esc(s.own ? 'Kamu' : s.name || s.username)}</small></button>`;
    const add = `<button class="stb add" data-sadd><span class="sr off"><span class="sa">${ava(me.username, me.avatar)}<i class="spb">${ic('plus', 'b3')}</i></span></span><small>${mine ? 'Tambah' : 'Kamu'}</small></button>`;
    return `<div class="stray">${mine ? ring(mine) + add : add}${stories.filter(s => !s.own).map(ring).join('')}</div>`;
  } catch { return '' }
}
function bindTray(el) {
  el.onclick = e => {
    const a = e.target.closest('[data-sadd]'); if (a) return storyComposer();
    const b = e.target.closest('[data-su]'); if (!b) return;
    const names = [...el.querySelectorAll('[data-su]')].map(x => x.dataset.su);
    openStories(names, names.indexOf(b.dataset.su));
  };
}

/* ---------- Penampil story (Aktif, Sorotan, maupun Arsip Story) ---------- */
const openStoriesFor = name => openStories([name], 0);
async function openStories(names, start = 0) {
  SV.users = names.map(n => ({ username: n, stories: null })); SV.hl = null; SV.isArch = false; await startViewer(start, 0);
}
async function openHighlight(id, own) {
  try {
    const r = await api('/highlights/' + id, { cache: 'no-store' });
    SV.users = [{ username: r.highlight.username, name: r.highlight.name, avatar: r.highlight.avatar, stories: r.stories, hl: r.highlight }];
    SV.hl = r.highlight; SV.hlOwn = own; SV.isArch = false;
    await startViewer(0, 0);
  } catch (e) { toast(e.message, 'err') }
}
async function openArchiveStories(stories, startIdx = 0) {
  if (!stories || !stories.length) return;
  SV.users = [{ username: me.username, name: me.name || me.username, avatar: me.avatar, verified: me.verified, stories: stories.slice() }];
  SV.hl = null; SV.isArch = true;
  await startViewer(0, startIdx);
}

async function startViewer(ui, si0 = 0) {
  const o = $('#sv'); SV.el = o; SV.ui = ui; SV.si = si0; SV.pendingViews = [];
  stopStoryAudio();
  o.innerHTML = `<div class="sv-bars"></div><header class="sv-h"><button class="sa" data-p></button><div class="lt"><b></b><small></small></div><button class="ib" data-more aria-label="Lainnya">${ic('more', 'b3')}</button><button class="ib" data-x aria-label="Tutup">${ic('close')}</button></header>
<div class="sv-stage"></div><div class="sv-cap"></div><div class="sv-l"></div><div class="sv-r"></div><footer class="sv-f"></footer>`;
  o._close = () => {
    SV.gen++; cancelAnimationFrame(SV.raf); SV.raf = 0;
    stopStoryAudio();
    setTimeout(() => { if (!o.classList.contains('open')) o.innerHTML = '' }, 300);
    Promise.allSettled(SV.pendingViews.splice(0)).then(() => tray_refresh());
  };
  bindStoryEvents(o); lay(o); await showStory(ui, si0);
}
const tray_refresh = () => { if ($('#inbox').classList.contains('open')) inbox(); reloadProfiles(); if (typeof refreshArchiveGrid === 'function') refreshArchiveGrid() };
async function ensure(u) {
  if (u.stories) return u.stories;
  try {
    const r = await api(`/users/${encodeURIComponent(u.username)}/stories`, { cache: 'no-store' }); u.stories = r.stories;
    if (!u.name || u.verified === undefined) { try { const p = await api('/users/' + encodeURIComponent(u.username), { cache: 'no-store' }); u.name = p.user.name; u.avatar = p.user.avatar; u.verified = p.user.verified } catch { u.verified = false } }
  } catch { u.stories = [] }
  return u.stories;
}
async function showStory(ui, si) {
  const o = SV.el, u = SV.users[ui], my = ++SV.gen; if (!u) return back();
  stopStoryAudio();
  const list = await ensure(u); if (my !== SV.gen) return;
  if (!list.length) { if (ui + 1 < SV.users.length) return showStory(ui + 1, 0); toast('Belum ada story'); return back() }
  if (si >= list.length) return nextUser(); if (si < 0) return prevUser();
  SV.ui = ui; SV.si = si; const s = list[si], own = isOwn(u.username); cancelAnimationFrame(SV.raf);

  if (!SV.hl && !SV.isArch && !s.seen) {
    s.seen = true;
    if (token) {
      const p = post(`/stories/${s.id}/view`).catch(() => {});
      SV.pendingViews.push(p);
    }
  }
  if (!SV.hl && !SV.isArch && list.every(x => x.seen)) {
    clearStoryRing(u.username);
  }

  o.querySelector('.sv-bars').innerHTML = list.map((_, i) => `<i class="${i < si ? 'done' : ''}"><b></b></i>`).join('');
  o.querySelector('[data-p]').innerHTML = ava(u.username, u.avatar);
  o.querySelector('.lt b').innerHTML = SV.hl ? esc(SV.hl.title) : SV.isArch ? 'Arsip Story · ' + dt(s.created) : esc(u.name || u.username) + vbdg(u);
  const subTxt = SV.hl ? '@' + u.username + ' · ' + dt(s.created) : '@' + u.username + ' · ' + (SV.isArch ? ago(s.created) : ago(s.created));
  const audBadge = s.audio_id ? ` · ${ic('music', 's')} ${esc(s.audio_title || 'Suara Asli')}` : '';
  o.querySelector('.lt small').innerHTML = esc(subTxt) + audBadge;

  const stage = o.querySelector('.sv-stage'), media = s.kind === 'video'
    ? `<video src="${url(s.file)}" playsinline autoplay ${muted ? 'muted' : ''}></video>` : `<img src="${url(s.file)}" alt="">`;
  stage.innerHTML = media; stage.classList.remove('hold');
  o.querySelector('.sv-cap').innerHTML = s.text ? `<span>${cap(s.text)}</span>` : '';

  if (s.audio_file && (s.kind === 'image' || s.audio_file !== s.file)) {
    const aEl = document.createElement('video');
    aEl.src = url(s.audio_file);
    aEl.loop = true;
    aEl.muted = muted;
    aEl.playsInline = true;
    SV.aud = aEl;
    aEl.play().catch(() => {});
  }

  SV.paused = false; SV.t0 = 0; SV.dur = 5000;
  const el = stage.firstElementChild, bar = () => o.querySelectorAll('.sv-bars b')[si];
  let started = false, gone = false;
  const begin = () => { if (started || my !== SV.gen) return; started = true; SV.t0 = performance.now(); SV.raf = requestAnimationFrame(tick) };
  const next = () => { if (gone || my !== SV.gen) return; gone = true; showStory(ui, si + 1) };
  let elapsed = 0, last = 0;
  const tick = now => {
    if (my !== SV.gen || !o.classList.contains('open')) return;
    if (!SV.paused) { elapsed += now - (last || now); last = now } else last = 0;
    const p = s.kind === 'video' && el.duration ? el.currentTime / el.duration : Math.min(1, elapsed / SV.dur);
    const b = bar(); if (b) b.style.transform = `scaleX(${p})`;
    if ((s.kind === 'video' ? el.ended || p >= .999 : p >= 1)) return next();
    SV.raf = requestAnimationFrame(tick);
  };
  SV.pause = on => {
    SV.paused = on;
    if (s.kind === 'video') on ? el.pause() : el.play().catch(() => {});
    if (SV.aud) on ? SV.aud.pause() : SV.aud.play().catch(() => {});
    stage.classList.toggle('hold', on);
  };
  if (s.kind === 'video') { el.muted = muted; el.onplaying = () => { if (!SV.t0) begin() }; el.onerror = next; el.play().catch(() => { el.muted = true; el.play().catch(() => {}) }) }
  else { el.onload = begin; el.onerror = next; if (el.complete && el.naturalWidth) begin() }

  const f = o.querySelector('.sv-f');
  if (own && !SV.hl) f.innerHTML = `<div class="row" style="justify-content:center;gap:10px"><button class="vws" data-views>${ic('eye', 's')} <b>${s.views || 0}</b> dilihat</button><button class="vws" data-addhl>${ic('star', 's')} Sorotan</button></div>`;
  else if (SV.hl) f.innerHTML = '';
  else f.innerHTML = `<form class="rep"><input name="t" placeholder="Balas story @${esc(u.username)}" autocomplete="off" maxlength="300"><button type="button" class="ib hrt" data-heart aria-label="Suka">${ic('heart', 'f')}</button><button class="ib snd" aria-label="Kirim">${ic('send')}</button></form>`;

  const nx = list[si + 1]; if (nx && nx.kind === 'image') (new Image).src = url(nx.file);
}
async function nextUser() { if (SV.ui + 1 < SV.users.length) return showStory(SV.ui + 1, 0); back() }
async function prevUser() { if (SV.ui > 0) { const p = SV.users[SV.ui - 1], l = await ensure(p); return showStory(SV.ui - 1, Math.max(0, l.length - 1)) } showStory(SV.ui, 0) }
function bindStoryEvents(o) {
  let sy = 0, sx = 0, down = 0, held = false, ht = 0;
  o.onpointerdown = e => {
    if (e.target.closest('button,input,form,.sv-f')) return;
    down = 1; held = false; sx = e.clientX; sy = e.clientY; ht = setTimeout(() => { held = true; SV.pause && SV.pause(true) }, 220);
  };
  const up = e => {
    if (!down) return; down = 0; clearTimeout(ht);
    const dy = e.clientY - sy;
    if (dy > 110) return back();
    if (held) { SV.pause && SV.pause(false); return }
    if (Math.abs(dy) > 20 || Math.abs(e.clientX - sx) > 20) return;
    const r = o.getBoundingClientRect(); (e.clientX - r.left) < r.width * .33 ? showStory(SV.ui, SV.si - 1) : showStory(SV.ui, SV.si + 1);
  };
  o.onpointerup = up; o.onpointercancel = () => { down = 0; clearTimeout(ht); if (held) SV.pause && SV.pause(false) };
  o.addEventListener('focusin', e => { if (e.target.matches('input')) SV.pause && SV.pause(true) });
  o.addEventListener('focusout', e => { if (e.target.matches('input')) SV.pause && SV.pause(false) });
  o.onclick = async e => {
    const u = SV.users[SV.ui], s = (u.stories || [])[SV.si]; if (!s) return;
    if (e.target.closest('[data-x]')) return back();
    if (e.target.closest('[data-p]')) { const n = u.username; await closeAll(); return openProfile(n) }
    if (e.target.closest('[data-views]')) return storyViews(s);
    if (e.target.closest('[data-addhl]')) { await closeAllStoryOnly(); return highlightComposer([s.id]) }
    if (e.target.closest('[data-heart]')) {
      try { await api('/chats/' + encodeURIComponent(u.username), { method: 'POST', body: toFD({ text: 'Menyukai story kamu', story: s.id }) }); toast('Reaksi story terkirim'); buzz(12) } catch (err) { toast(err.message, 'err') }
      return;
    }
    if (e.target.closest('[data-more]')) return storyMenu(u, s);
  };
  o.onsubmit = async e => {
    e.preventDefault(); const u = SV.users[SV.ui], s = (u.stories || [])[SV.si], t = e.target.t.value.trim(); if (!t || !s) return;
    try {
      await api('/chats/' + encodeURIComponent(u.username), { method: 'POST', body: toFD({ text: t, story: s.id }) });
      e.target.reset(); e.target.t.blur(); toast('Balasan story terkirim');
    } catch (err) { toast(err.message, 'err') }
  };
}
async function storyViews(s) {
  SV.pause && SV.pause(true);
  sheet(`<h3>Dilihat oleh ${s.views || 0} orang</h3><div id="vl" class="cl">${skel(3)}</div>`);
  try { const { views } = await api(`/stories/${s.id}/views`); $('#vl').innerHTML = views.length ? views.map(v => userRow(v, `<small class="mu">${ago(v.created)}</small>`)).join('') : empty('story', 'Belum ada yang melihat'); } catch (e) { $('#vl').innerHTML = '' }
  $('#vl').onclick = async e => { const r = e.target.closest('.li'); if (r) { closeSheet(); const n = r.dataset.u; await closeAll(); openProfile(n) } };
}
function storyMenu(u, s) {
  const own = isOwn(u.username); SV.pause && SV.pause(true);
  const items = own ? (SV.hl ? [SV.hlOwn && { k: 'ed', i: 'edit', t: 'Ubah sorotan' }] : [{ k: 'hl', i: 'star', t: 'Tambah ke sorotan', s: 'Simpan story ini di profilmu' }, { k: 'del', i: 'trash', t: 'Hapus story', d: 1 }])
    : [{ k: 'rp', i: 'flag', t: 'Laporkan story', d: 1 }];
  sheet(rows(items));
  onPick(async k => {
    if (k === 'del') return confirmSheet('Hapus story ini?', async () => {
      try {
        await api('/stories/' + s.id, { method: 'DELETE' });
        u.stories = u.stories.filter(x => x.id !== s.id);
        toast('Story dihapus');
        if (typeof refreshArchiveGrid === 'function') refreshArchiveGrid();
        showStory(SV.ui, Math.min(SV.si, u.stories.length - 1));
      } catch (e) { toast(e.message, 'err') }
    }, 'Hapus');
    if (k === 'hl') { closeSheet(); await closeAllStoryOnly(); return highlightComposer([s.id]) }
    if (k === 'ed') { closeSheet(); return editHighlightMenu(SV.hl.id, SV.hl.title) }
    if (k === 'rp') ask(() => reportSheet('story', s.id, 'story ini'));
  });
  const sh = $('#sheet'), obs = new MutationObserver(() => { if (!sh.classList.contains('open')) { obs.disconnect(); SV.pause && SV.paused && SV.pause(false) } }); obs.observe(sh, { attributes: true, attributeFilter: ['class'] });
}

/* ---------- Halaman Arsip Story Lengkap ---------- */
let refreshArchiveGrid = null;
async function openStoryArchive() {
  const o = newOv('tg'); let arch = [];
  o.innerHTML = `<header class="ab"><button class="ib" data-x aria-label="Kembali">${ic('back')}</button><h2>Arsip Story</h2><button class="btn sm" id="arch-hl">${ic('plus', 's')} Sorotan</button></header>
  <p class="note mu">${ic('clock', 's')} Semua story yang pernah kamu bagikan tersimpan otomatis di arsip pribadimu walaupun sudah lewat 24 jam.</p>
  <div class="gr" id="arch-gr"><div class="gsk"><i></i><i></i><i></i></div></div>`;
  const loadArch = async () => {
    const gr = o.querySelector('#arch-gr'); if (!gr) return;
    try {
      arch = (await api('/me/stories/archive', { cache: 'no-store' })).stories || [];
      gr.innerHTML = arch.length ? arch.map((s, i) => `<button class="gc vbox" data-ai="${i}">
        ${s.kind === 'video' ? `<video class="rv" src="${url(s.file)}#t=0.1" muted playsinline preload="metadata"></video>` : `<img class="rv" src="${url(s.file)}" alt="" loading="lazy">`}
        <span class="gd">${dt(s.created)}</span>
        <span class="gl">${ic('eye', 's')} ${nf(s.views || 0)}</span>
      </button>`).join('') : `<div class="gempty">${empty('story', 'Arsip story masih kosong', 'Story yang kamu buat akan otomatis tersimpan di sini.')}<button class="btn" id="arch-new" style="margin-top:8px">${ic('camera', 's')} Buat Story</button></div>`;
    } catch (e) { toast(e.message, 'err') }
  };
  refreshArchiveGrid = loadArch;
  const origClose = o._close;
  o._close = () => { refreshArchiveGrid = null; if (origClose) origClose() };
  o.onclick = e => {
    if (e.target.closest('[data-x]')) return back();
    if (e.target.closest('#arch-hl')) return highlightComposer();
    if (e.target.closest('#arch-new')) return storyComposer();
    const c = e.target.closest('[data-ai]');
    if (c) return openArchiveStories(arch, +c.dataset.ai);
  };
  lay(o);
  await loadArch();
}

/* ---------- Pembuat story: foto/video atau teks ---------- */
const TXT_BG = [['#2563eb', '#7c3aed'], ['#f43f5e', '#fb923c'], ['#0ea5e9', '#22d3ee'], ['#10b981', '#84cc16'], ['#111827', '#4b5563'], ['#ec4899', '#8b5cf6']];
function storyComposer(audObj = null) {
  ask(() => {
    const audNote = audObj ? `<p class="chp fr wide" style="margin-bottom:10px">${ic('music', 's')} Menggunakan suara: ${esc(audObj.title || 'Suara Asli')} · @${esc(audObj.username)}</p>` : '';
    sheet(`<h3>Story baru</h3>${audNote}${rows([{ k: 'media', i: 'camera', t: 'Foto atau video', s: 'Ambil atau pilih dari galeri' }, { k: 'text', i: 'type', t: 'Teks', s: 'Tulis sesuatu dengan latar warna' }, { k: 'arch', i: 'clock', t: 'Buka Arsip Story', s: 'Lihat semua story milikmu yang tersimpan' }])}<input type="file" id="sfile" accept="image/*,video/*" hidden>`);
    onPick(k => {
      if (k === 'media') $('#sfile').click();
      else if (k === 'arch') { closeSheet(); openStoryArchive() }
      else { closeSheet(); textStory(audObj) }
    });
    $('#sfile').onchange = e => { const f = e.target.files[0]; if (f) { closeSheet(); mediaStory(f, audObj) } };
  });
}
function publishStory(file, text, done, ed, audObj = null) {
  const fd = new FormData(); fd.append('media', file); if (text) fd.append('text', text); if (audObj && audObj.id) fd.append('audio_id', audObj.id); editFields(fd, ed);
  return xhr('/stories', fd, done).then(() => { toast('Story diposting'); tray_refresh() });
}
function mediaStory(file, audObj = null) {
  const o = $('#sc'), isV = file.type.startsWith('video/'), src = URL.createObjectURL(file);
  o.innerHTML = `<header class="ab"><button class="ib" data-x aria-label="Tutup">${ic('close')}</button><h2>Story</h2><button class="btn" id="spost">Bagikan</button></header>
<div class="scp">${audObj ? `<p class="chp fr wide">${ic('music', 's')} ${esc(audObj.title || 'Suara Asli')} · @${esc(audObj.username)}</p>` : ''}<div class="scp-m">${isV ? `<video src="${src}" controls playsinline muted loop></video>` : `<img src="${src}" alt="">`}</div>${isV ? `<button class="btn g" id="sed">${ic('scissors', 's')} Pangkas, crop, atau tambah audio</button><div class="chips ed-sum" id="seds"></div>` : ''}<label class="fld">${ic('type')}<input id="stx" maxlength="120" placeholder="Tambahkan teks (opsional)" autocomplete="off"></label><div class="bar" id="sbar"><i></i></div></div>`;
  o.querySelector('[data-x]').onclick = back; o._close = () => URL.revokeObjectURL(src);
  let ed = null;
  if (isV) $('#sed').onclick = async () => { const r = await openVideoEditor(file, ed || {}); if (r) { ed = r; $('#seds').innerHTML = editSummary(r).map(t => `<span class="chip">${esc(t)}</span>`).join('') } };
  $('#spost').onclick = async () => {
    const b = $('#spost'); b.disabled = true; b.textContent = 'Mengunggah'; $('#sbar').style.display = 'block';
    try { await publishStory(file, $('#stx').value.trim(), p => { $('#sbar').firstChild.style.width = p * 100 + '%'; if (p >= 1) b.textContent = ed && ed.changed ? 'Memproses...' : 'Menyimpan...' }, ed, audObj); back() } catch (e) { toast(e.message, 'err'); b.disabled = false; b.textContent = 'Bagikan' }
  };
  lay(o);
}
function textStory(audObj = null) {
  const o = $('#sc'); let bg = 0;
  o.innerHTML = `<header class="ab"><button class="ib" data-x aria-label="Tutup">${ic('close')}</button><h2>Story teks</h2><button class="btn" id="spost" disabled>Bagikan</button></header>
<div class="scp">${audObj ? `<p class="chp fr wide">${ic('music', 's')} ${esc(audObj.title || 'Suara Asli')} · @${esc(audObj.username)}</p>` : ''}<div class="txs" id="txs" style="background:linear-gradient(160deg,${TXT_BG[0].join(',')})"><textarea id="stt" maxlength="120" placeholder="Ketik sesuatu..." rows="4"></textarea></div><div class="sws">${TXT_BG.map((g, i) => `<button type="button" data-bg="${i}" class="${i ? '' : 'on'}" style="background:linear-gradient(135deg,${g.join(',')})" aria-label="Warna ${i + 1}"></button>`).join('')}</div></div>`;
  o.querySelector('[data-x]').onclick = back;
  $('#stt').oninput = e => { $('#spost').disabled = !e.target.value.trim() };
  o.querySelector('.sws').onclick = e => { const b = e.target.closest('[data-bg]'); if (!b) return; bg = +b.dataset.bg; $('#txs').style.background = `linear-gradient(160deg,${TXT_BG[bg].join(',')})`; o.querySelectorAll('.sws button').forEach(x => x.classList.toggle('on', x === b)) };
  $('#spost').onclick = async () => {
    const t = $('#stt').value.trim(), b = $('#spost'); if (!t) return; b.disabled = true; b.textContent = 'Mengunggah';
    const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, W * .6, H);
    gr.addColorStop(0, TXT_BG[bg][0]); gr.addColorStop(1, TXT_BG[bg][1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 84px "Plus Jakarta Sans",system-ui,sans-serif';
    const words = t.split(/\s+/), lines = []; let cur = ''; words.forEach(w => { const n = cur ? cur + ' ' + w : w; if (g.measureText(n).width > W - 200 && cur) { lines.push(cur); cur = w } else cur = n }); if (cur) lines.push(cur);
    const lh = 110, y0 = H / 2 - (lines.length - 1) * lh / 2; lines.forEach((l, i) => g.fillText(l, W / 2, y0 + i * lh));
    c.toBlob(async blob => { try { await publishStory(new File([blob], 'story.jpg', { type: 'image/jpeg' }), '', null, null, audObj); back() } catch (e) { toast(e.message, 'err'); b.disabled = false; b.textContent = 'Bagikan' } }, 'image/jpeg', .9);
  };
  lay(o); setTimeout(() => $('#stt').focus(), 300);
}

/* ---------- Sorotan dari story ---------- */
async function highlightComposer(pre = [], editId = 0, title0 = '') {
  const o = $('#hl'); let sel = new Set(pre), arch = [];
  o.innerHTML = `<header class="ab"><button class="ib" data-x aria-label="Tutup">${ic('close')}</button><h2>${editId ? 'Ubah sorotan' : 'Sorotan baru'}</h2><button class="btn" id="hsv" disabled>Simpan</button></header>
<div class="bd"><label class="fld">${ic('star')}<input id="htl" maxlength="20" placeholder="Nama sorotan" value="${esc(title0)}"></label><p class="mu">Pilih story dari arsipmu. Story di sorotan tetap tampil di profil setelah 24 jam.</p><div class="gr" id="hg">${'<div class="gsk"><i></i><i></i><i></i></div>'}</div></div>`;
  const upd = () => { $('#hsv').disabled = !sel.size; o.querySelectorAll('.sc').forEach(b => { const on = sel.has(+b.dataset.id); b.classList.toggle('sel', on) }) };
  lay(o); o.querySelector('[data-x]').onclick = back;
  try { arch = (await api('/me/stories/archive', { cache: 'no-store' })).stories || [] } catch (e) { toast(e.message, 'err') }
  $('#hg').innerHTML = arch.length ? arch.map(s => `<button class="gc sc" data-id="${s.id}">${s.kind === 'video' ? `<video class="rv" src="${url(s.file)}#t=0.1" muted playsinline preload="metadata"></video>` : `<img class="rv" src="${url(s.file)}" alt="" loading="lazy">`}<span class="gp ck">${ic('check', 's b3')}</span><span class="gd">${dt(s.created)}</span><span class="gl">${ago(s.created)}</span></button>`).join('') : `<div class="gempty">${empty('story', 'Belum ada story di arsip', 'Posting story dulu, lalu simpan ke sorotan.')}</div>`;
  $('#hg').onclick = e => { const b = e.target.closest('.sc'); if (!b) return; const id = +b.dataset.id; sel.has(id) ? sel.delete(id) : sel.add(id); upd() }; upd();
  $('#hsv').onclick = async () => {
    const title = $('#htl').value.trim() || 'Sorotan'; $('#hsv').disabled = true;
    try { editId ? await api('/highlights/' + editId, { method: 'PUT', json: { title, story_ids: [...sel] } }) : await post('/highlights', { title, story_ids: [...sel] }); back(); toast('Sorotan disimpan'); setTimeout(reloadProfiles, 60) }
    catch (e) { toast(e.message, 'err'); $('#hsv').disabled = false }
  };
}
async function editHighlightMenu(id, title) {
  sheet(`<h3>${esc(title || 'Sorotan')}</h3>${rows([{ k: 'ed', i: 'edit', t: 'Ubah nama dan isi' }, { k: 'del', i: 'trash', t: 'Hapus sorotan', d: 1 }])}`);
  onPick(async k => {
    if (k === 'ed') { closeSheet(); try { const r = await api('/highlights/' + id); await closeAllStoryOnly(); highlightComposer(r.stories.map(s => s.id), id, r.highlight.title) } catch (e) { toast(e.message, 'err') } }
    if (k === 'del') confirmSheet('Hapus sorotan ini?', async () => { try { await api('/highlights/' + id, { method: 'DELETE' }); await closeAllStoryOnly(); toast('Sorotan dihapus'); reloadProfiles() } catch (e) { toast(e.message, 'err') } }, 'Hapus', 'Story di dalamnya tetap ada di arsipmu.');
  });
}
const closeAllStoryOnly = async () => { const sv = $('#sv'); if (sv.classList.contains('open')) { const i = L.indexOf(sv); if (i === L.length - 1) { back(); await new Promise(r => setTimeout(r, 120)) } } };
