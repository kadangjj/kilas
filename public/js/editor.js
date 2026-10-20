/* ============================================================
   Zippy · editor video sebelum posting: pangkas, crop, audio
   Hasil suntingan dikirim sebagai parameter; server (ffmpeg) yang memprosesnya.
   ============================================================ */
let CAPS = null;
async function caps() { if (!CAPS) { try { CAPS = await api('/capabilities') } catch { CAPS = { edit: false } } } return CAPS }
const clk = t => { t = Math.max(0, t || 0); return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') + '.' + Math.floor(t * 10 % 10) };
const ASP = [['free', 'Bebas'], ['9:16', '9:16'], ['1:1', '1:1'], ['4:5', '4:5'], ['16:9', '16:9']];

function editFields(fd, ed) { // tambahkan parameter suntingan ke FormData
  if (!ed) return;
  if (ed.trim) { fd.append('trim_start', ed.ts.toFixed(2)); fd.append('trim_end', ed.te.toFixed(2)) }
  if (ed.crop) fd.append('crop', JSON.stringify(ed.crop));
  fd.append('rot', ed.rot || 0);
  if (ed.vo !== 100) fd.append('vol_orig', ed.vo);
  if (ed.audio) { fd.append('audio', ed.audio, ed.audio.name || 'audio.m4a'); fd.append('vol_music', ed.vm); fd.append('audio_offset', ed.ao.toFixed(2)) }
}
function editSummary(ed) {
  const l = [];
  if (ed.trim) l.push('Pangkas ' + clk(ed.ts) + ' - ' + clk(ed.te));
  if (ed.crop) l.push('Crop ' + Math.round(ed.crop.w * 100) + '% x ' + Math.round(ed.crop.h * 100) + '%');
  if (ed.audio) l.push('Audio: ' + (ed.audio.name || 'rekaman').slice(0, 22));
  if (ed.vo !== 100) l.push('Suara asli ' + ed.vo + '%');
  if (ed.rot) l.push('Diputar ' + ed.rot * 90 + '°');
  return l;
}

function openVideoEditor(file, init = {}) {
  return new Promise(async res => {
    const cp = await caps(), o = $('#ve'), src = URL.createObjectURL(file);
    const E = { ts: init.ts || 0, te: init.te || 0, dur: 0, crop: init.crop || null, rot: init.rot || 0, audio: init.audio || null, vo: init.vo == null ? 100 : init.vo, vm: init.vm == null ? 80 : init.vm, ao: init.ao || 0, ad: 0, asp: 'free', tool: cp.edit ? 'trim' : 'rot' };
    let fin = false, aud = null, audUrl = '', raf = 0, thumbsFor = 0;
    const TOOLS = cp.edit ? [['trim', 'scissors', 'Pangkas'], ['crop', 'crop', 'Crop'], ['audio', 'music', 'Audio']] : [];
    o.innerHTML = `<header class="ab"><button class="ib" data-x aria-label="Batal">${ic('close')}</button><h2>Edit video</h2><button class="btn" id="vdone" disabled>Selesai</button></header>
<div class="ve-stage" id="vst"><div class="ve-frame" id="vfr"><video id="vev" src="${src}" playsinline preload="auto" loop></video><div class="ve-crop" id="vcr" hidden><i data-h="nw"></i><i data-h="ne"></i><i data-h="sw"></i><i data-h="se"></i></div></div><button class="ve-pl" id="vpl" aria-label="Putar">${ic('play', 'f')}</button></div>
${cp.edit ? '' : `<p class="ve-note">${ic('info', 's')} Pangkas, crop, dan audio butuh ffmpeg di server. Untuk saat ini kamu hanya bisa memutar video.</p>`}
<div class="ve-tabs">${TOOLS.map(([k, i, t]) => `<button data-tool="${k}" class="${k === E.tool ? 'on' : ''}">${ic(i)}<small>${t}</small></button>`).join('')}<button data-rot>${ic('rotate')}<small>Putar</small></button></div>
<div class="ve-panel" id="vpn"></div>`;
    const $o = s => o.querySelector(s), vev = $o('#vev'), fr = $o('#vfr'), st = $o('#vst'), cr = $o('#vcr'), pn = $o('#vpn');
    const done = r => { if (fin) return; fin = true; cancelAnimationFrame(raf); vev.pause(); aud && aud.pause(); if (audUrl) URL.revokeObjectURL(audUrl); URL.revokeObjectURL(src); res(r) };
    o._close = () => done(null);
    o.querySelector('[data-x]').onclick = back;
    vev.onerror = () => { toast('Video ini tidak bisa dibuka di editor', 'err'); back() };

    /* ----- bingkai: ukuran tampilan setelah diputar ----- */
    const frame = () => ({ w: fr.clientWidth || 1, h: fr.clientHeight || 1 });
    function layout() {
      const vw = vev.videoWidth || 16, vh = vev.videoHeight || 9, odd = E.rot % 2, dw = odd ? vh : vw, dh = odd ? vw : vh;
      const k = Math.min(st.clientWidth / dw, st.clientHeight / dh) || 1, fw = dw * k, fh = dh * k;
      fr.style.width = fw + 'px'; fr.style.height = fh + 'px';
      vev.style.width = (odd ? fh : fw) + 'px'; vev.style.height = (odd ? fw : fh) + 'px'; vev.style.transform = `translate(-50%,-50%) rotate(${E.rot * 90}deg)`;
      drawCrop();
    }
    addEventListener('resize', layout);
    const prevClose = o._close; o._close = () => { removeEventListener('resize', layout); prevClose() };

    /* ----- crop ----- */
    const ratio = k => { const [a, b] = k.split(':').map(Number); return a / b };
    function drawCrop() {
      const on = E.tool === 'crop' && E.crop; cr.hidden = !on; if (!on) return;
      const c = E.crop; cr.style.cssText = `left:${c.x * 100}%;top:${c.y * 100}%;width:${c.w * 100}%;height:${c.h * 100}%`;
    }
    function setAspect(k) {
      E.asp = k; if (k === 'orig') { E.crop = null; drawCrop(); return panel() }
      if (k === 'free') { E.crop = E.crop || { x: 0, y: 0, w: 1, h: 1 }; drawCrop(); return panel() }
      const f = frame(), fr0 = f.w / f.h, ar = ratio(k); let w = 1, h = fr0 / ar; if (h > 1) { h = 1; w = ar / fr0 }
      E.crop = { x: (1 - w) / 2, y: (1 - h) / 2, w, h }; drawCrop(); panel();
    }
    let drag = null;
    cr.onpointerdown = e => { drag = { m: e.target.dataset.h || 'move', x: e.clientX, y: e.clientY, c: { ...E.crop } }; cr.setPointerCapture(e.pointerId); e.preventDefault() };
    cr.onpointermove = e => {
      if (!drag) return; const f = fr.getBoundingClientRect(), dx = (e.clientX - drag.x) / f.width, dy = (e.clientY - drag.y) / f.height, c0 = drag.c, MIN = .1;
      if (drag.m === 'move') { E.crop = { ...c0, x: Math.min(1 - c0.w, Math.max(0, c0.x + dx)), y: Math.min(1 - c0.h, Math.max(0, c0.y + dy)) }; return drawCrop() }
      let l = c0.x, r = c0.x + c0.w, t = c0.y, b = c0.y + c0.h; const m = drag.m;
      if (m[1] === 'w') l = Math.min(r - MIN, Math.max(0, l + dx)); else r = Math.max(l + MIN, Math.min(1, r + dx));
      if (m[0] === 'n') t = Math.min(b - MIN, Math.max(0, t + dy)); else b = Math.max(t + MIN, Math.min(1, b + dy));
      if (E.asp !== 'free' && E.asp !== 'orig') { // kunci rasio: lebar menentukan tinggi
        const ar = ratio(E.asp), fx = f.width / f.height; let w = r - l, h = w * fx / ar;
        if (m[0] === 'n') { if (b - h < 0) { h = b; w = h * ar / fx } t = b - h; } else { if (t + h > 1) { h = 1 - t; w = h * ar / fx } b = t + h }
        if (m[1] === 'w') l = r - w; else r = l + w;
        if (l < 0) { l = 0; w = r; h = w * fx / ar; if (m[0] === 'n') t = b - h; else b = t + h } if (r > 1) { r = 1; w = r - l; h = w * fx / ar; if (m[0] === 'n') t = b - h; else b = t + h }
      }
      E.crop = { x: l, y: t, w: r - l, h: b - t }; drawCrop();
    };
    cr.onpointerup = cr.onpointercancel = () => { drag = null };

    /* ----- audio pratinjau ----- */
    function setAudio(f) {
      if (audUrl) URL.revokeObjectURL(audUrl); aud && aud.pause();
      E.audio = f; aud = null; E.ao = 0; E.ad = 0;
      if (f) { audUrl = URL.createObjectURL(f); aud = new Audio(audUrl); aud.loop = true; aud.onloadedmetadata = () => { E.ad = aud.duration || 0; if (E.tool === 'audio') panel() } }
      applyVol(); panel(); if (!vev.paused) { syncAudio(); aud && aud.play().catch(() => {}) }
    }
    function applyVol() { vev.volume = E.vo / 100; if (aud) aud.volume = Math.min(1, E.vm / 100) }
    function syncAudio() { if (!aud) return; const d = aud.duration || 0, t = E.ao + Math.max(0, vev.currentTime - E.ts); try { aud.currentTime = d ? t % d : t } catch {} }
    vev.onplay = () => { $o('#vpl').classList.add('hide'); syncAudio(); aud && aud.play().catch(() => {}) };
    vev.onpause = () => { $o('#vpl').classList.remove('hide'); aud && aud.pause() };
    $o('#vpl').onclick = () => { if (vev.paused) { if (vev.currentTime < E.ts || vev.currentTime >= E.te - .05) vev.currentTime = E.ts; vev.play().catch(() => {}) } else vev.pause() };
    vev.onclick = () => $o('#vpl').click(); cr.onclick = e => e.stopPropagation();

    /* ----- pangkas ----- */
    const pct = t => (t / (E.dur || 1) * 100) + '%';
    function drawTrim() {
      const sl = $o('#vsl'); if (!sl) return; sl.style.left = pct(E.ts); sl.style.width = ((E.te - E.ts) / (E.dur || 1) * 100) + '%';
      $o('#vts').textContent = clk(E.ts); $o('#vte').textContent = clk(E.te); $o('#vtd').textContent = (E.te - E.ts).toFixed(1) + ' detik';
    }
    function bindTrim() {
      const tl = $o('#vtl'); let h = null;
      const tAt = e => { const r = tl.getBoundingClientRect(); return Math.min(E.dur, Math.max(0, (e.clientX - r.left) / r.width * E.dur)) };
      tl.onpointerdown = e => { h = e.target.dataset.t || 'seek'; tl.setPointerCapture(e.pointerId); mv(e) };
      const mv = e => {
        if (!h) return; const t = tAt(e);
        if (h === 's') { E.ts = Math.min(t, E.te - 1); vev.currentTime = E.ts } else if (h === 'e') { E.te = Math.max(t, E.ts + 1); vev.currentTime = Math.max(E.ts, E.te - .1) } else vev.currentTime = Math.min(E.te, Math.max(E.ts, t));
        drawTrim();
      };
      tl.onpointermove = mv; tl.onpointerup = tl.onpointercancel = () => { if (h === 's' || h === 'e') { vev.currentTime = E.ts; syncAudio() } h = null };
      drawTrim(); thumbs();
    }
    async function thumbs() { // deretan bingkai kecil sebagai latar linimasa
      const sp = $o('#vsp'), id = ++thumbsFor; if (!sp || !E.dur) return; sp.innerHTML = '';
      try {
        const tv = document.createElement('video'); tv.muted = true; tv.preload = 'auto'; tv.src = src; await new Promise(r => { tv.onloadeddata = r; tv.onerror = r; setTimeout(r, 4000) });
        const N = 8, cv = document.createElement('canvas'), H = 52, W = Math.round(H * (tv.videoWidth || 16) / (tv.videoHeight || 9)); cv.width = W; cv.height = H; const g = cv.getContext('2d');
        for (let i = 0; i < N && id === thumbsFor && !fin; i++) {
          tv.currentTime = (i + .5) / N * E.dur; await new Promise(r => { tv.onseeked = r; setTimeout(r, 1500) });
          g.drawImage(tv, 0, 0, W, H); const im = new Image(); im.src = cv.toDataURL('image/jpeg', .5); if (E.rot) im.style.transform = `rotate(${E.rot * 90}deg)`; sp.append(im);
        }
      } catch {}
    }

    /* ----- panel alat ----- */
    function panel() {
      o.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === E.tool)); drawCrop();
      if (E.tool === 'trim') {
        pn.innerHTML = `<div class="ve-tl" id="vtl"><div class="ve-strip" id="vsp"></div><div class="ve-sel" id="vsl"><i class="hd l" data-t="s"></i><i class="hd r" data-t="e"></i></div><div class="ve-ph" id="vph"></div></div><div class="ve-tt"><span id="vts"></span><b id="vtd"></b><span id="vte"></span></div><p class="mu ve-h">Geser pegangan kiri dan kanan untuk memilih bagian video yang dipakai. Minimal 1 detik.</p>`;
        if (E.dur) bindTrim();
      } else if (E.tool === 'crop') {
        pn.innerHTML = `<div class="ve-asp">${[['orig', 'Asli'], ...ASP].map(([k, t]) => `<button data-asp="${k}" class="${(k === E.asp && (E.crop || k === 'orig')) || (k === 'orig' && !E.crop) ? 'on' : ''}">${t}</button>`).join('')}</div><p class="mu ve-h">${E.crop ? 'Geser kotak untuk memindahkan, tarik sudutnya untuk mengubah ukuran.' : 'Pilih rasio untuk mulai memotong. Asli berarti tanpa crop.'}</p>`;
      } else if (E.tool === 'audio') {
        pn.innerHTML = `<div class="row"><label class="btn g">${ic('music', 's')} Pilih audio<input type="file" id="vaf" accept="audio/*" hidden></label><button class="btn g" id="vrec" type="button">${ic('mic', 's')} Rekam suara</button></div>
${E.audio ? `<div class="ve-trk"><span class="ci">${ic('music')}</span><span class="lt"><b>${esc(E.audio.name || 'Rekaman suara')}</b><small>${E.ad ? clk(E.ad) : '...'}</small></span><button class="ib" id="vax" aria-label="Hapus audio">${ic('close')}</button></div>` : '<p class="mu ve-h">Tambahkan lagu dari perangkat atau rekam suaramu sendiri. Kalau audio lebih pendek dari video, audio diulang.</p>'}
<label class="ve-sl"><span>Suara asli <b id="vv1">${E.vo}%</b></span><input type="range" id="vo" min="0" max="100" value="${E.vo}"></label>
${E.audio ? `<label class="ve-sl"><span>Volume audio tambahan <b id="vv2">${E.vm}%</b></span><input type="range" id="vm" min="0" max="100" value="${E.vm}"></label>
<label class="ve-sl"><span>Mulai audio dari menit <b id="vv3">${clk(E.ao)}</b></span><input type="range" id="va" min="0" max="${Math.max(0, Math.floor((E.ad || 0) * 10) / 10)}" step="0.1" value="${E.ao}"></label>` : ''}`;
        const rg = (id, fn) => { const x = $o(id); if (x) x.oninput = () => { fn(+x.value); applyVol() } };
        rg('#vo', v => { E.vo = v; $o('#vv1').textContent = v + '%' }); rg('#vm', v => { E.vm = v; $o('#vv2').textContent = v + '%' });
        rg('#va', v => { E.ao = v; $o('#vv3').textContent = clk(v); if (!vev.paused) syncAudio() });
        $o('#vaf').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) setAudio(f) };
        const ax = $o('#vax'); if (ax) ax.onclick = () => setAudio(null);
        $o('#vrec').onclick = e => {
          const b = e.currentTarget, was = !!rec; recToggle(b, bl => { vev.muted = false; vev.pause(); setAudio(new File([bl], 'rekaman.' + (bl.type.includes('mp4') ? 'm4a' : bl.type.includes('ogg') ? 'ogg' : 'webm'), { type: bl.type })); E.vo = 0; applyVol(); panel(); toast('Rekaman ditambahkan. Suara asli dibisukan.') });
          if (!was) { aud && aud.pause(); vev.muted = true; vev.currentTime = E.ts; vev.play().catch(() => {}); toast('Merekam... ketuk lagi untuk berhenti') }
        };
      } else pn.innerHTML = '';
    }
    o.onclick = e => {
      const t = e.target.closest('[data-tool]'); if (t) { E.tool = t.dataset.tool; return panel() }
      if (e.target.closest('[data-rot]')) { E.rot = (E.rot + 1) % 4; E.crop = null; E.asp = 'free'; layout(); panel(); buzz(8); return }
      const a = e.target.closest('[data-asp]'); if (a) return setAspect(a.dataset.asp);
      if (e.target.closest('#vdone')) {
        const trim = E.ts > .05 || E.te < E.dur - .05, crop = E.crop && (E.crop.w < .995 || E.crop.h < .995) ? { ...E.crop } : null;
        const out = { ts: E.ts, te: E.te, dur: E.dur, trim, crop, rot: E.rot, audio: E.audio, vo: E.vo, vm: E.vm, ao: E.ao };
        out.changed = trim || !!crop || !!E.audio || E.vo !== 100; done(out); back();
      }
    };

    /* ----- putar dalam rentang pangkas ----- */
    const loop = () => {
      if (fin) return; raf = requestAnimationFrame(loop);
      const ph = $o('#vph'); if (ph && E.dur) ph.style.left = pct(vev.currentTime);
      if (E.tool !== 'trim' && !E.te) return;
      if (!vev.paused && E.te && vev.currentTime >= E.te - .04) { vev.currentTime = E.ts; syncAudio() }
    };
    vev.onloadedmetadata = () => {
      E.dur = isFinite(vev.duration) ? vev.duration : 0;
      if (!E.dur) { toast('Durasi video tidak terbaca, editor dibatasi', 'err') }
      E.te = Math.min(E.dur || 0, E.te || E.dur); E.ts = Math.min(E.ts, Math.max(0, E.te - 1));
      $o('#vdone').disabled = false; vev.currentTime = E.ts; layout(); panel(); loop();
      if (init.audio) setAudio(init.audio);
    };
    lay(o); setTimeout(layout, 300);
  });
}
