/* ============================================================
   Zippy · halaman detail audio ("Suara Asli") sesuai desain referensi
   ============================================================ */
let audPlayer = null;
function stopAudioPreview() {
  if (audPlayer) {
    try { audPlayer.pause(); audPlayer.src = '' } catch {}
    audPlayer = null;
  }
  const pl = $('#aud-pl'), av = $('#aud .aud-av');
  if (pl) pl.innerHTML = ic('play', 's f');
  if (av) av.classList.remove('playing');
}

async function openAudio(audioId, fallbackVid = null) {
  const o = $('#aud'), id = Number(audioId) || (fallbackVid && fallbackVid.id) || 0;
  if (!id) return;
  stopAudioPreview();
  o.innerHTML = `<header class="aud-top">
    <button class="ib" data-x aria-label="Kembali">${ic('back')}</button>
    <label class="aud-sbox">${ic('search', 's')}<input id="aud-q" type="search" placeholder="Temukan konten terkait" autocomplete="off"></label>
    <button class="ib" id="aud-sh" aria-label="Bagikan">${ic('share')}</button>
  </header>
  <div class="aud-body" id="aud-bd">${skel(4)}</div>`;

  o._close = () => {
    stopAudioPreview();
    setTimeout(() => { if (!o.classList.contains('open')) o.innerHTML = '' }, 320);
  };
  lay(o);

  let data = null, list = [];
  const render = (a, vs) => {
    const bd = o.querySelector('#aud-bd');
    if (!bd) return;
    const myAv = me ? ava(me.username, me.avatar) : `<span class="ini">Z</span>`;
    bd.innerHTML = `
      <div class="aud-hero">
        <button class="aud-av" id="aud-av-btn" aria-label="Putar suara">
          <span class="aud-av-in">${ava(a.name || a.username, a.avatar)}</span>
        </button>
        <div class="aud-meta">
          <div class="aud-title-row">
            <h1>${esc(a.title || 'Suara Asli')}</h1>
            <button class="aud-play" id="aud-pl" aria-label="Putar pratinjau suara">${ic('play', 's f')}</button>
          </div>
          <button class="aud-creator" id="aud-u">
            <b>${esc(a.username)}</b>${vbdg(a)} ${ic('chev', 's')}
          </button>
          <p class="aud-cnt">${nf(a.total || vs.length)} postingan</p>
        </div>
      </div>
      <div class="aud-save-wrap">
        <button class="aud-save${a.saved ? ' on' : ''}" id="aud-sv">
          ${ic('bookmark', a.saved ? 's f' : 's')}
          <span>${a.saved ? 'Tersimpan' : 'Simpan'}</span>
        </button>
      </div>
      <div class="gr aud-grid" id="aud-gr">
        ${vs.length ? gridHTML(vs, false) : `<div class="gempty">${empty('video', 'Belum ada postingan', 'Jadilah yang pertama menggunakan suara ini.')}</div>`}
      </div>
      <div class="aud-foot">
        <button class="aud-btn story" id="aud-st">
          <span class="aud-mini-av">${myAv}</span>
          <span>Posting ke Story</span>
        </button>
        <button class="aud-btn use" id="aud-use">
          ${ic('video', 's f')}
          <span>Gunakan suara</span>
        </button>
      </div>`;
    const gr = bd.querySelector('#aud-gr');
    if (gr && vs.length) bindGrid(gr, vs, { fromProfile: false });
  };

  try {
    const r = await api('/audio/' + id, { cache: 'no-store' });
    data = r.audio; list = r.videos;
    render(data, list);
  } catch (e) {
    if (fallbackVid) {
      data = { id: fallbackVid.id, title: fallbackVid.audio_title || 'Suara Asli', file: fallbackVid.audio_file || fallbackVid.file, username: fallbackVid.audio_u || fallbackVid.username, name: fallbackVid.audio_name || dnm(fallbackVid), avatar: fallbackVid.audio_avatar || fallbackVid.avatar, verified: fallbackVid.verified, saved: false, total: 1 };
      list = [fallbackVid];
      render(data, list);
    } else {
      toast(e.message, 'err');
      return back();
    }
  }

  let qTmr = 0;
  const qInp = o.querySelector('#aud-q');
  if (qInp) {
    qInp.oninput = () => {
      clearTimeout(qTmr);
      qTmr = setTimeout(async () => {
        const q = qInp.value.trim();
        try {
          const r = await api(`/audio/${id}?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
          list = r.videos;
          const gr = o.querySelector('#aud-gr');
          if (gr) {
            gr.innerHTML = list.length ? gridHTML(list, false) : `<div class="gempty">${empty('search', 'Konten tidak ditemukan', 'Coba kata kunci lain.')}</div>`;
            if (list.length) bindGrid(gr, list, { fromProfile: false });
          }
        } catch {}
      }, 240);
    };
    qInp.onkeydown = e => {
      if (e.key === 'Enter' && qInp.value.trim()) {
        qInp.blur();
        openSearch(qInp.value.trim());
      }
    };
  }

  const togglePlayPreview = () => {
    if (!data || !data.file) return;
    const pl = o.querySelector('#aud-pl'), av = o.querySelector('.aud-av');
    if (audPlayer && !audPlayer.paused) {
      stopAudioPreview();
      return;
    }
    stopAudioPreview();
    const mediaEl = document.createElement('video');
    mediaEl.src = url(data.file);
    mediaEl.loop = true;
    mediaEl.playsInline = true;
    audPlayer = mediaEl;
    mediaEl.play().then(() => {
      if (pl) pl.innerHTML = ic('pause', 's f');
      if (av) av.classList.add('playing');
    }).catch(() => toast('Tidak dapat memutar pratinjau suara', 'err'));
    mediaEl.onended = () => stopAudioPreview();
  };

  o.onclick = async e => {
    if (e.target.closest('[data-x]')) return back();
    if (e.target.closest('#aud-sh')) {
      const link = `${SERVER || location.origin}/#a=${data.code || id}`;
      try { if (navigator.share) await navigator.share({ title: data.title || 'Suara Asli', text: `Dengarkan ${data.title || 'Suara Asli'} dari @${data.username} di Zippy — Swipe. Play. Repeat.`, url: link }); else throw 0 }
      catch (err) { if (err && err.name === 'AbortError') return; await cp(link); toast('Tautan suara disalin') }
      return;
    }
    if (e.target.closest('#aud-pl') || e.target.closest('#aud-av-btn')) return togglePlayPreview();
    if (e.target.closest('#aud-u')) {
      stopAudioPreview();
      return openProfile(data.username);
    }
    if (e.target.closest('#aud-sv')) {
      return ask(async () => {
        try {
          const r = await post(`/audio/${id}/save`);
          data.saved = r.saved;
          const btn = o.querySelector('#aud-sv');
          if (btn) {
            btn.classList.toggle('on', r.saved);
            btn.innerHTML = `${ic('bookmark', r.saved ? 's f' : 's')} <span>${r.saved ? 'Tersimpan' : 'Simpan'}</span>`;
          }
          toast(r.saved ? 'Suara disimpan' : 'Dihapus dari simpanan');
          buzz(10);
        } catch (err) { toast(err.message, 'err') }
      });
    }
    if (e.target.closest('#aud-st')) {
      stopAudioPreview();
      return ask(() => storyComposer(data));
    }
    if (e.target.closest('#aud-use')) {
      stopAudioPreview();
      return ask(() => uploadPage(null, data));
    }
  };
}
