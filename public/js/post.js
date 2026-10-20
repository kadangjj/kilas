/* ============================================================
   Zippy · halaman posting: pilih audio Terpopuler/Tersimpan (bebas bug), privasi, lokasi, hashtag
   ============================================================ */
const OSM = 'https://nominatim.openstreetmap.org';
function placeLabel(r) {
  const a = r.address || {}, parts = [r.name && r.name !== a.road ? r.name : '', a.neighbourhood || a.suburb || a.village || a.hamlet, a.city_district || a.town || a.city || a.municipality || a.county, a.state].filter(Boolean);
  const u = [...new Set(parts)].slice(0, 3).join(', ');
  return u || (r.display_name || '').split(', ').filter(p => !/^\d{4,}$/.test(p)).slice(0, 3).join(', ');
}
async function myPlace() {
  if (!navigator.geolocation) throw new Error('Perangkat ini tidak mendukung lokasi');
  const pos = await new Promise((ok, no) => navigator.geolocation.getCurrentPosition(ok, e => no(new Error(e.code === 1 ? 'Izin lokasi ditolak. Ketik nama tempat saja.' : 'Lokasi belum bisa didapat')), { timeout: 12000, maximumAge: 60000 }));
  const r = await (await fetch(`${OSM}/reverse?format=jsonv2&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=15&addressdetails=1&accept-language=id`)).json();
  const l = placeLabel(r); if (!l) throw new Error('Nama tempat tidak ditemukan'); return l;
}
async function findPlaces(q) {
  const r = await (await fetch(`${OSM}/search?format=jsonv2&addressdetails=1&limit=5&accept-language=id&q=${encodeURIComponent(q)}`)).json();
  return [...new Set(r.map(placeLabel).filter(Boolean))];
}

/* ---------- Pemilih Audio (Terpopuler & Tersimpan) Saat Posting Video ---------- */
function openPostAudioPicker(curAud, onSelect) {
  let tab = 'pop', q = '', previewEl = null, playingId = 0;
  const stopPrev = () => {
    if (previewEl) {
      try { previewEl.pause(); previewEl.removeAttribute('src'); previewEl.load() } catch {}
      previewEl = null;
    }
    playingId = 0;
    $$('#sheet [data-aprev].aud-play').forEach(b => b.innerHTML = ic('play', 's f'));
    $$('#sheet [data-aprev].aud-av').forEach(b => b.classList.remove('playing'));
  };

  sheet(`<div class="sh-head"><h3>Pilih Suara</h3><button type="button" class="ib sm" id="apx">${ic('close', 's')}</button></div>
  <div class="seg sm-seg" id="ap-tabs">
    <button type="button" data-apt="pop" class="on">${ic('flame', 's')} Terpopuler</button>
    <button type="button" data-apt="saved">${ic('bookmark', 's')} Tersimpan</button>
  </div>
  <label class="fld" style="margin:6px 0 8px">${ic('search')}<input id="ap-q" placeholder="Cari judul suara atau pembuat..." autocomplete="off"></label>
  <div id="ap-list" class="cl sh-list">${skel(4)}</div>`);

  // Pastikan pratinjau suara otomatis mati saat sheet ditutup dengan cara apa pun
  const sh = $('#sheet'), obs = new MutationObserver(() => {
    if (!sh.classList.contains('open')) { obs.disconnect(); stopPrev() }
  });
  obs.observe(sh, { attributes: true, attributeFilter: ['class'] });
  $('#apx').onclick = () => { stopPrev(); closeSheet() };

  let items = [];
  const load = async () => {
    stopPrev();
    const box = $('#ap-list'); if (!box) return;
    box.innerHTML = skel(4);
    try {
      const ep = tab === 'saved' ? '/me/saved-audios' : '/audios/popular?q=' + encodeURIComponent(q);
      const r = await api(ep, { cache: 'no-store' });
      items = (r.audios || []).filter(a => !q || tab === 'pop' || (String(a.title || '') + ' ' + String(a.username || '') + ' ' + String(a.name || '')).toLowerCase().includes(q.toLowerCase()));
      box.innerHTML = items.length ? items.map(a => {
        const isSel = curAud && Number(curAud.id) === Number(a.id);
        return `<div class="li flat saud" data-id="${a.id}">
          <button type="button" class="aud-av sm" data-aprev="${a.id}" aria-label="Putar pratinjau"><span class="aud-av-in">${ava(a.name || a.username, a.avatar)}</span></button>
          <button type="button" class="aud-play" data-aprev="${a.id}" aria-label="Putar">${ic('play', 's f')}</button>
          <span class="lt" data-apick="${a.id}" style="cursor:pointer">
            <b>${esc(a.title || ('Suara Asli - ' + (a.name || a.username)))}</b>
            <small>@${esc(a.username)} · ${nf(a.total || 1)} postingan</small>
          </span>
          <button type="button" class="btn sm${isSel ? ' g' : ''}" data-apick="${a.id}">${isSel ? `Dipakai ${ic('check', 's b3')}` : 'Pakai'}</button>
        </div>`;
      }).join('') : empty(tab === 'saved' ? 'save' : 'search', tab === 'saved' ? 'Belum ada suara tersimpan' : 'Belum ada suara populer', tab === 'saved' ? 'Simpan suara dari video di Beranda untuk memakainya di sini.' : 'Unggah video pertamamu untuk membuat suara asli baru.');
    } catch (e) { box.innerHTML = `<p class="mu" style="padding:16px;text-align:center">${esc(e.message)}</p>` }
  };

  $('#ap-tabs').onclick = e => {
    const b = e.target.closest('[data-apt]'); if (!b) return;
    tab = b.dataset.apt;
    $$('#ap-tabs button').forEach(x => x.classList.toggle('on', x === b));
    load();
  };
  let tmr = 0;
  $('#ap-q').oninput = e => {
    q = e.target.value.trim();
    clearTimeout(tmr); tmr = setTimeout(load, 220);
  };
  $('#ap-list').onclick = e => {
    const pv = e.target.closest('[data-aprev]');
    if (pv) {
      e.stopPropagation();
      const id = Number(pv.dataset.aprev), a = items.find(x => Number(x.id) === id);
      if (!a || !a.file) return;
      if (playingId === id) { stopPrev(); return }
      stopPrev();
      const v = document.createElement('video');
      v.src = url(a.file);
      v.loop = true;
      v.playsInline = true;
      v.muted = false;
      previewEl = v;
      playingId = id;
      v.play().then(() => {
        $$(`#ap-list [data-aprev="${id}"].aud-play`).forEach(b => b.innerHTML = ic('pause', 's f'));
        $$(`#ap-list [data-aprev="${id}"].aud-av`).forEach(b => b.classList.add('playing'));
      }).catch(() => {
        stopPrev();
        toast('Tidak dapat memutar pratinjau suara ini', 'err');
      });
      return;
    }
    const pk = e.target.closest('[data-apick]');
    if (pk) {
      e.stopPropagation();
      const id = Number(pk.dataset.apick), a = items.find(x => Number(x.id) === id);
      stopPrev();
      closeSheet();
      if (a) {
        onSelect({
          id: Number(a.id),
          title: a.title || ('Suara Asli - ' + (a.name || a.username)),
          file: a.file,
          username: a.username,
          name: a.name || a.username,
          avatar: a.avatar
        });
        toast('Suara dipilih: ' + (a.title || ('Suara Asli - @' + a.username)));
      }
    }
  };
  load();
}

function uploadPage(st = null, audObj = null) {
  ask(() => {
    const o = $('#up'); let rot = 0, privacy = 'public', loc = '', picked = null, edits = null, selAud = audObj ? { ...audObj } : null, pvAud = null, customAudTitle = '';
    const stopPvAud = () => {
      if (pvAud) {
        try { pvAud.pause(); pvAud.removeAttribute('src'); pvAud.load() } catch {}
        pvAud = null;
      }
    };

    o.innerHTML = `<header class="ab"><button class="ib" data-x aria-label="Tutup">${ic('close')}</button><h2>Video baru</h2><button class="btn" id="go" disabled>Posting</button></header>
<form id="uf" class="bd" onsubmit="return false">
${st ? `<p class="chp fr wide">${ic('stitch', 's')} Stitch dari @${esc(st.username)}</p>` : ''}
<div id="aud-bar-up"></div>
<label class="pick" id="pk">${art('video', 96)}<b>Pilih video dari galeri</b><small>Maksimal 100 MB</small><input type="file" name="video" accept="video/*" hidden></label>
<div class="vbox prevbox" id="pvb" hidden><video id="pv" class="rv contain" autoplay muted loop playsinline></video><button type="button" class="rotb" id="rotb" aria-label="Putar video">${ic('rotate')}<span>Putar</span></button><button type="button" class="rotb ed" id="edb" aria-label="Edit video">${ic('scissors')}<span>Edit</span></button></div><div class="chips ed-sum" id="eds"></div>
<div class="field"><textarea name="caption" id="cap" rows="3" maxlength="150" placeholder="Tulis keterangan. Ketik # untuk hashtag, @ untuk menandai orang">${st ? '#stitch ' : ''}</textarea><span class="cnt" id="cnt">0/150</span></div><div class="sug" id="sug"></div>
<div class="locbox"><div class="locrow"><button type="button" class="chip big" id="lcb">${ic('mapPin', 's')}<span id="lct">Tambah lokasi</span></button><button type="button" class="ib sm" id="lcx" hidden aria-label="Hapus lokasi">${ic('close')}</button></div>
<div class="locp" id="lcp" hidden><label class="fld">${ic('search')}<input id="lci" placeholder="Cari tempat, mis. Surabaya" autocomplete="off"></label><button type="button" class="btn g sm" id="lcg">${ic('mapPin', 's')} Gunakan lokasiku</button><div id="lcl" class="lcl"></div></div></div>
<div><h4 class="sh">Siapa yang bisa melihat?</h4><div class="pvs" id="pvs">${Object.keys(PRV).map(k => `<button type="button" class="pvo${k === privacy ? ' on' : ''}" data-p="${k}"><span class="ci">${ic(PRV[k][0])}</span><span class="lt"><b>${PRV[k][1]}</b><small>${PRV_DESC[k]}</small></span><i class="rad"></i></button>`).join('')}</div></div>
<div class="bar" id="bar"><i></i></div></form>`;

    o.querySelector('[data-x]').onclick = back;
    const f = o.querySelector('input[type=file]'), pv = $('#pv'), capEl = $('#cap'); suggest(capEl, $('#sug'));

    const syncPvAudio = () => {
      stopPvAud();
      if (selAud && selAud.file && picked) {
        pv.muted = true;
        const aEl = document.createElement('video');
        aEl.src = url(selAud.file);
        aEl.loop = true;
        aEl.playsInline = true;
        aEl.muted = false;
        pvAud = aEl;
        try { pv.currentTime = 0 } catch {}
        aEl.play().catch(() => {});
      }
    };
    pv.ontimeupdate = () => {
      if (pvAud && pv.currentTime < 0.28 && pvAud.currentTime > 0.65) {
        try { pvAud.currentTime = 0; if (pvAud.paused) pvAud.play().catch(() => {}) } catch {}
      }
    };

    const renderAudBar = () => {
      const box = o.querySelector('#aud-bar-up'); if (!box) return;
      if (selAud) {
        box.innerHTML = `<div class="up-aud-sel">
          <span class="ci" style="width:36px;height:36px;border-radius:10px">${ic('music', 's')}</span>
          <span class="lt"><b>${esc(selAud.title || 'Suara Asli')}</b><small>Suara dari @${esc(selAud.username)}</small></span>
          <button type="button" class="btn sm g" id="aud-chg">Ganti</button>
          <button type="button" class="ib sm" id="aud-rm" aria-label="Hapus suara">${ic('close', 's')}</button>
        </div>`;
        box.querySelector('#aud-chg').onclick = () => {
          stopPvAud();
          openPostAudioPicker(selAud, a => { selAud = a; renderAudBar(); syncPvAudio() });
        };
        box.querySelector('#aud-rm').onclick = () => {
          selAud = null;
          stopPvAud();
          renderAudBar();
          toast('Suara dilepas, memakai suara asli video');
        };
      } else {
        box.innerHTML = `<div style="display:grid;gap:8px">
          <button type="button" class="up-aud-btn" id="aud-pick">${ic('music', 's')} <span>Tambahkan suara (Terpopuler / Tersimpan)</span> ${ic('chev', 's')}</button>
          <label class="fld" style="height:42px;padding:0 12px">${ic('music', 's')}<input id="aud-custom-ttl" maxlength="60" value="${esc(customAudTitle)}" placeholder="Nama suara asli videomu (opsional)" style="padding:8px 0;font-size:13.5px"></label>
        </div>`;
        box.querySelector('#aud-pick').onclick = () => {
          stopPvAud();
          openPostAudioPicker(null, a => { selAud = a; renderAudBar(); syncPvAudio() });
        };
        const ttlInp = box.querySelector('#aud-custom-ttl');
        if (ttlInp) ttlInp.oninput = e => { customAudTitle = e.target.value };
      }
    };
    renderAudBar();

    const cnt = () => $('#cnt').textContent = capEl.value.length + '/150'; capEl.oninput = cnt; cnt();
    f.onchange = () => {
      const x = f.files[0]; if (!x) return; picked = x; pv.src = URL.createObjectURL(x); $('#pvb').hidden = false; $('#pk').style.display = 'none'; $('#go').disabled = false;
      if (x.size > 100 * 1024 * 1024) { toast('Ukuran video melebihi 100 MB', 'err'); $('#go').disabled = true }
      syncPvAudio();
    };
    $('#rotb').onclick = () => { rot = (rot + 1) % 4; pv.className = 'rv contain r' + rot; if (edits) { edits.rot = rot; edits.crop = null; sum() } buzz(8) };
    const sum = () => { $('#eds').innerHTML = edits ? editSummary(edits).map(t => `<span class="chip">${esc(t)}</span>`).join('') : '' };
    $('#edb').onclick = async () => { if (!picked) return; stopPvAud(); const r = await openVideoEditor(picked, edits || { rot }); if (r) { edits = r; rot = r.rot; pv.className = 'rv contain r' + rot; sum() } syncPvAudio() };
    $('#pvs').onclick = e => { const b = e.target.closest('.pvo'); if (!b) return; privacy = b.dataset.p; o.querySelectorAll('.pvo').forEach(x => x.classList.toggle('on', x === b)) };
    const setLoc = l => { loc = l; $('#lct').textContent = l || 'Tambah lokasi'; $('#lcb').classList.toggle('set', !!l); $('#lcx').hidden = !l; $('#lcp').hidden = true };
    $('#lcb').onclick = () => { $('#lcp').hidden = !$('#lcp').hidden; if (!$('#lcp').hidden) setTimeout(() => $('#lci').focus(), 50) };
    $('#lcx').onclick = () => setLoc('');
    $('#lcg').onclick = async () => { const b = $('#lcg'); b.disabled = true; b.textContent = 'Mencari lokasi...'; try { setLoc(await myPlace()) } catch (e) { toast(e.message, 'err') } b.disabled = false; b.innerHTML = `${ic('mapPin', 's')} Gunakan lokasiku` };
    let lt = 0, ltok = 0;
    $('#lci').oninput = e => {
      const q = e.target.value.trim(), my = ++ltok; clearTimeout(lt);
      if (!q) return $('#lcl').innerHTML = '';
      $('#lcl').innerHTML = `<button type="button" class="lcr" data-l="${esc(q)}">${ic('plus', 's')} Pakai “${esc(q)}”</button>`;
      lt = setTimeout(async () => {
        try { const l = await findPlaces(q); if (my !== ltok) return; $('#lcl').innerHTML = `<button type="button" class="lcr" data-l="${esc(q)}">${ic('plus', 's')} Pakai “${esc(q)}”</button>` + l.map(x => `<button type="button" class="lcr" data-l="${esc(x)}">${ic('mapPin', 's')} ${esc(x)}</button>`).join('') } catch {}
      }, 650);
    };
    $('#lcl').onclick = e => { const b = e.target.closest('[data-l]'); if (b) setLoc(b.dataset.l.slice(0, 80)) };
    $('#go').onclick = async () => {
      const b = $('#go'), bar = $('#bar'); b.disabled = true; b.textContent = 'Mengunggah'; bar.style.display = 'block';
      stopPvAud();
      try {
        const fd = new FormData(); fd.append('video', picked); fd.append('caption', capEl.value); fd.append('privacy', privacy);
        if (edits) editFields(fd, edits); else fd.append('rot', rot);
        if (loc) fd.append('loc', loc);
        if (st) fd.append('stitch', st.id);
        if (selAud && selAud.id) {
          fd.append('audio_id', selAud.id);
          if (selAud.title) fd.append('audio_title', selAud.title);
        } else if (customAudTitle.trim()) {
          fd.append('audio_title', customAudTitle.trim());
        }
        const res = await xhr('/videos', fd, p => { bar.firstChild.style.width = p * 100 + '%'; if (p >= 1) { b.textContent = (edits && edits.changed) ? 'Memeriksa & memproses video...' : 'Memeriksa video...'; bar.classList.add('ind') } });
        const mo = (res && res.moderation) || {};
        back();
        if (mo.blocked) toast('Video tidak ditayangkan: terdeteksi melanggar Pedoman Komunitas Zippy. Kamu bisa mengajukan banding di Profil.', 'err');
        else if (mo.review) toast('Video diposting dan sedang ditinjau sistem');
        else toast('Video diposting' + (privacy === 'public' ? '' : ' · ' + PRV[privacy][1]));
        setTimeout(() => { if (privacy === 'private' || mo.blocked) openMyProfileTab(); else showHome(true) }, 260);
      } catch (err) { toast(err.message, 'err'); b.disabled = false; b.textContent = 'Posting' }
    };
    o._close = () => { stopPvAud(); if (pv.src) URL.revokeObjectURL(pv.src) };
    lay(o);
  });
}
