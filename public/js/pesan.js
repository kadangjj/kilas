/* ============================================================
   Zippy · pesan: daftar obrolan, status SVG Terkirim/Dibaca/Mengetik, api runtutan, Studio Stiker Custom
   ============================================================ */
const LBL = { image: 'Foto', audio: 'Pesan suara', sticker: 'Stiker', video: 'Video', story_reply: 'Membalas story', recalled: 'Pesan ditarik' };
const vcard = m => { const [i, f] = m.split(':'); return `<div class="vc vbox" data-vid="${i}"><video class="rv" src="${url(f)}#t=0.5" preload="${S.saver ? 'none' : 'metadata'}" muted playsinline></video><span>${ic('play', 'f')}</span></div>` };

// Kartu pratinjau story yang dibalas di dalam balon pesan
const sreply = m => {
  const [sid, skind, sfile] = String(m || '').split(':');
  if (!sfile) return '';
  return `<div class="srp" data-src="${url(sfile)}" data-kind="${esc(skind)}" data-sid="${esc(sid)}">
    <div class="srp-hd">${ic('camera', 's')} <span>Membalas story</span></div>
    <div class="srp-box vbox">${skind === 'video' ? `<video class="rv" src="${url(sfile)}#t=0.2" preload="metadata" muted playsinline></video><span>${ic('play', 's f')}</span>` : `<img class="rv" src="${url(sfile)}" alt="" loading="lazy">`}</div>
  </div>`;
};

const med = m => m.kind === 'image' ? `<img class="mi" src="${url(m.media)}" alt="" loading="lazy">`
  : m.kind === 'audio' ? `<audio controls preload="none" src="${url(m.media)}"></audio>`
  : m.kind === 'sticker' ? stk(m.media, 96)
  : m.kind === 'video' ? vcard(m.media)
  : m.kind === 'story_reply' ? sreply(m.media) : '';

// Evolusi Warna Api Runtutan (Streak Tiers) & Status Api Padam Jika Tidak Chat
const STREAK_TIERS = [
  { key: "dead", min: 0, name: "Api Padam (Mati)", short: "Padam", desc: "Mati karena >24 jam tidak saling balas chat" },
  { key: "t1", min: 1, name: "Api Oranye Hangat", short: "Api Baru", desc: "Hari 1–2 · Awal nyala runtutan obrolan" },
  { key: "t3", min: 3, name: "Api Merah Membara", short: "Membara", desc: "Hari 3–6 · Obrolan makin hangat setiap hari" },
  { key: "t7", min: 7, name: "Api Biru Elektrik", short: "Api Biru", desc: "Hari 7–9 · Seminggu penuh tanpa putus!" },
  { key: "t10", min: 10, name: "Api Ungu Kosmik", short: "Api Ungu", desc: "Hari 10–19 · Runtutan konsisten level kosmik" },
  { key: "t20", min: 20, name: "Api Hijau Zamrud", short: "Api Zamrud", desc: "Hari 20–29 · Api zamrud langka" },
  { key: "t30", min: 30, name: "Api Naga Crimson", short: "Api Naga", desc: "Hari 30–49 · Sebulan penuh saling terhubung!" },
  { key: "t50", min: 50, name: "Api Emas Surya", short: "Api Emas", desc: "Hari 50–99 · Kemilau emas sahabat sejati" },
  { key: "t100", min: 100, name: "Api Pelangi Abadi", short: "Api Abadi", desc: "Hari 100+ · Level legendaris warna pelangi!" }
];

function resolveStreakTier(n, dead = false) {
  if (dead || !n || n <= 0) return STREAK_TIERS[0];
  for (let i = STREAK_TIERS.length - 1; i >= 1; i--) {
    if (n >= STREAK_TIERS[i].min) return STREAK_TIERS[i];
  }
  return STREAK_TIERS[1];
}

function fireBadge(infoOrN, label = false, clickable = false) {
  const isObj = infoOrN && typeof infoOrN === "object";
  const n = isObj ? (infoOrN.n || 0) : (Number(infoOrN) || 0);
  const dead = isObj ? !!infoOrN.dead : false;
  const last = isObj ? (infoOrN.last || 0) : 0;
  const dying = isObj ? !!infoOrN.dying : false;
  const hrs = isObj ? (infoOrN.hours_left || 0) : 0;

  if (dead) {
    return `<span class="fire-anim tier-dead${clickable ? ' clk' : ''}" data-open-streak="1" title="Api Runtutan Padam (Sebelumnya ${last} hari)"><span class="flm">${ic('flame', 's f')}</span><b>Padam</b>${last ? `<small class="st-sub">(${last}h)</small>` : ''}</span>`;
  }
  if (!n || n <= 0) {
    return clickable ? `<span class="fire-anim tier-none clk" data-open-streak="1" title="Ketuk untuk lihat info Api Runtutan"><span class="flm">${ic('flame', 's')}</span><b>0</b>${label ? ' <small class="st-sub">Mulai Runtutan</small>' : ''}</span>` : '';
  }
  const t = resolveStreakTier(n, false);
  const dyHtml = dying ? `<em class="dy-tag" title="Hampir padam! Sisa ${hrs} jam untuk saling balas chat">⏳${label && hrs ? hrs + 'j' : ''}</em>` : '';
  return `<span class="fire-anim tier-${t.key}${dying ? ' dying' : ''}${clickable ? ' clk' : ''}" data-open-streak="1" title="${t.name} · ${n} hari beruntun"><span class="flm">${ic('flame', 's f')}</span><b>${n}</b>${label ? ` hari · <small class="st-sub">${t.short}</small>` : ''}${dyHtml}</span>`;
}

/* ---------- Koleksi Stiker Custom & Studio Pembuat Stiker Custom ---------- */
let myStickers = [], myStickersLoaded = false;

async function loadMyStickers(force = false) {
  if (!token) { myStickers = []; myStickersLoaded = false; return myStickers }
  if (myStickersLoaded && !force) return myStickers;
  try {
    const r = await api('/me/stickers', { cache: 'no-store' });
    myStickers = r.stickers || [];
    myStickersLoaded = true;
  } catch { myStickers = [] }
  return myStickers;
}

function buildStickerTrayHTML() {
  const addBtn = `<button type="button" class="stg-add" data-st-add title="Buat Stiker Custom">${ic('plus', 's b3')}<small>Buat</small></button>`;
  const customHTML = myStickers.map(s => `<div class="stg-it"><button type="button" data-s="c:${esc(s.file)}" title="Stiker Custom">${stk('c:' + s.file, 46)}</button><button type="button" class="stg-del" data-st-del="${s.id}" title="Hapus stiker" aria-label="Hapus stiker">${ic('close', 's')}</button></div>`).join('');
  const builtinHTML = STK.map((_, i) => `<button type="button" data-s="s:${i + 1}" aria-label="Stiker ${i + 1}">${stk('s:' + (i + 1), 46)}</button>`).join('');
  return addBtn + customHTML + builtinHTML;
}

function refreshAllStickerTrays() {
  $$('.cw .stg').forEach(el => { el.innerHTML = buildStickerTrayHTML() });
}

async function saveCustomStickerFile(fileCode) {
  return ask(async () => {
    try {
      await post('/me/stickers', { file: fileCode });
      await loadMyStickers(true);
      refreshAllStickerTrays();
      toast('Stiker disimpan ke koleksi Stiker Custom kamu');
    } catch (e) { toast(e.message, 'err') }
  });
}

// Studio Pembuat Stiker Custom (Upload foto, Potong bentuk SVG/Canvas, Coretan Kuas, Teks Stiker, Garis Tepi)
function openStickerMaker(onCreated) {
  ask(() => {
    const o = newOv('st-maker');
    const W = 320, OUT = 512;
    let img = null, scale = 1, minScale = 1, ix = 0, iy = 0;
    let shape = 'round', borderOn = true, bgMode = 'none';
    let text = '', textPos = 'bottom', textColor = '#ffffff';
    let brushMode = false, brushColor = '#ff3b5c', brushSize = 10, strokes = [], curStroke = null;
    let ptr = null;

    const BG_PRESETS = [
      ['none', 'Transparan', ''],
      ['g1', 'Biru', ['#2563eb', '#60a5fa']],
      ['g2', 'Ungu', ['#7c3aed', '#ec4899']],
      ['g3', 'Emas', ['#f59e0b', '#ef4444']],
      ['g4', 'Hijau', ['#10b981', '#06b6d4']],
      ['g5', 'Gelap', ['#111827', '#374151']]
    ];
    const SHAPES = [
      ['round', 'Kotak Bulat'],
      ['circle', 'Lingkaran'],
      ['heart', 'Hati'],
      ['star', 'Bintang'],
      ['full', 'Penuh']
    ];
    const COLORS = ['#ffffff', '#ffde59', '#ff3b5c', '#3b82f6', '#10b981', '#a855f7', '#111827'];

    o.innerHTML = `<header class="ab">
      <button type="button" class="ib" data-x aria-label="Tutup">${ic('close')}</button>
      <h2>Studio Stiker Custom</h2>
      <button type="button" class="btn sm" id="stm-save">${ic('check', 's b3')} Simpan</button>
    </header>
    <div class="bd stm-bd">
      <div class="stm-stage-wrap">
        <canvas id="stm-cv" width="${W}" height="${W}" class="stm-cv"></canvas>
      </div>

      <div class="row" style="margin-top:0">
        <label class="btn g sm" style="flex:1;cursor:pointer">${ic('img', 's')} Pilih Foto<input type="file" id="stm-file" accept="image/*" hidden></label>
        <button type="button" class="btn g sm" id="stm-brush-tg" style="flex:1">${ic('brush', 's')} <span id="stm-br-lbl">Mode Geser Foto</span></button>
        <button type="button" class="ib sm" id="stm-undo" title="Hapus coretan terakhir" aria-label="Undo">${ic('rotate', 's')}</button>
      </div>

      <div class="stm-card" id="stm-zoom-box" hidden>
        <label class="stm-lbl"><span>Perbesar Foto</span><b id="stm-zv">1.0x</b></label>
        <input type="range" id="stm-zoom" min="1" max="3.5" step="0.02" value="1">
      </div>

      <div class="stm-card" id="stm-brush-box" hidden>
        <div class="stm-lbl"><span>Warna & Ukuran Kuas Coretan</span><button type="button" class="link" id="stm-clr-br" style="padding:0;font-size:12px">Bersihkan coretan</button></div>
        <div class="stm-colors" id="stm-bcols">${COLORS.map(c => `<button type="button" data-bc="${c}" class="${c === brushColor ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
        <input type="range" id="stm-bsize" min="4" max="26" step="1" value="${brushSize}">
      </div>

      <div class="stm-card">
        <span class="stm-lbl">Bentuk Potongan Stiker</span>
        <div class="stm-chips" id="stm-shapes">${SHAPES.map(([k, t]) => `<button type="button" data-sh="${k}" class="chip${k === shape ? ' set' : ''}">${t}</button>`).join('')}</div>
        <div class="stm-lbl" style="margin-top:6px"><span>Garis Tepi Stiker (Die-Cut)</span><label class="sw"><input type="checkbox" id="stm-bdr" checked><span></span></label></div>
      </div>

      <div class="stm-card">
        <span class="stm-lbl">Latar Stiker</span>
        <div class="stm-chips" id="stm-bgs">${BG_PRESETS.map(([k, t]) => `<button type="button" data-bg="${k}" class="chip${k === bgMode ? ' set' : ''}">${t}</button>`).join('')}</div>
      </div>

      <div class="stm-card">
        <span class="stm-lbl">Teks Stiker (Opsional)</span>
        <input id="stm-txt" maxlength="28" placeholder="Tulis teks stiker (mis. MANTAP, OTW, GAS)...">
        <div class="row" style="align-items:center;margin-top:6px">
          <div class="stm-chips" id="stm-tpos" style="flex:1">
            ${[['top', 'Atas'], ['mid', 'Tengah'], ['bottom', 'Bawah']].map(([k, t]) => `<button type="button" data-tp="${k}" class="chip${k === textPos ? ' set' : ''}">${t}</button>`).join('')}
          </div>
        </div>
        <div class="stm-colors" id="stm-tcols" style="margin-top:6px">${COLORS.map(c => `<button type="button" data-tc="${c}" class="${c === textColor ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>
      </div>

      <div class="stm-card">
        <span class="stm-lbl">Koleksi Stiker Custom Kamu (${myStickers.length})</span>
        <div class="stm-my-grid" id="stm-my">${myStickers.length ? myStickers.map(s => `<div class="stg-it"><img class="cstk" src="${url(s.file)}" style="width:58px;height:58px"><button type="button" class="stg-del" data-mydel="${s.id}">${ic('close', 's')}</button></div>`).join('') : '<small class="mu">Belum ada stiker custom tersimpan.</small>'}</div>
      </div>
    </div>`;

    const cv = o.querySelector('#stm-cv'), g = cv.getContext('2d');

    function traceShapePath(ctx, sz, sh, pad) {
      const x0 = pad, y0 = pad, w = sz - pad * 2, h = sz - pad * 2, cx = sz / 2, cy = sz / 2, r = w / 2;
      ctx.beginPath();
      if (sh === 'circle') {
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      } else if (sh === 'heart') {
        const top = y0 + h * 0.26;
        ctx.moveTo(cx, y0 + h * 0.92);
        ctx.bezierCurveTo(cx - w * 0.52, cy + h * 0.12, x0, top - h * 0.12, cx - w * 0.25, y0 + h * 0.08);
        ctx.bezierCurveTo(cx - w * 0.08, y0 + h * 0.08, cx, top, cx, top);
        ctx.bezierCurveTo(cx, top, cx + w * 0.08, y0 + h * 0.08, cx + w * 0.25, y0 + h * 0.08);
        ctx.bezierCurveTo(x0 + w, top - h * 0.12, cx + w * 0.52, cy + h * 0.12, cx, y0 + h * 0.92);
      } else if (sh === 'star') {
        const spikes = 5, outerR = r, innerR = r * 0.46;
        for (let i = 0; i < spikes * 2; i++) {
          const rad = i % 2 === 0 ? outerR : innerR;
          const ang = (i * Math.PI) / spikes - Math.PI / 2;
          const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
      } else if (sh === 'round') {
        const rr = sz * 0.16;
        ctx.roundRect ? ctx.roundRect(x0, y0, w, h, rr) : ctx.rect(x0, y0, w, h);
      } else {
        ctx.rect(0, 0, sz, sz);
      }
      ctx.closePath();
    }

    function renderStickerCanvas(ctx, sz) {
      const k = sz / W;
      ctx.clearRect(0, 0, sz, sz);
      const pad = shape === 'full' ? 0 : Math.round(14 * k);

      // Clipping bentuk stiker + isi latar & foto
      ctx.save();
      traceShapePath(ctx, sz, shape, pad);
      ctx.clip();

      const bgPreset = BG_PRESETS.find(b => b[0] === bgMode);
      if (bgPreset && bgPreset[2]) {
        const gr = ctx.createLinearGradient(0, 0, sz, sz);
        gr.addColorStop(0, bgPreset[2][0]);
        gr.addColorStop(1, bgPreset[2][1]);
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, sz, sz);
      } else if (!img && !strokes.length && !text) {
        const gr = ctx.createLinearGradient(0, 0, sz, sz);
        gr.addColorStop(0, '#2563eb');
        gr.addColorStop(1, '#60a5fa');
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, sz, sz);
      }

      if (img) {
        ctx.drawImage(img, ix * k, iy * k, img.width * scale * k, img.height * scale * k);
      }

      // Gambar semua coretan kuas
      const allStrokes = curStroke ? [...strokes, curStroke] : strokes;
      allStrokes.forEach(s => {
        if (!s.pts.length) return;
        ctx.save();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size * k;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        s.pts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p[0] * k, p[1] * k) : ctx.lineTo(p[0] * k, p[1] * k));
        if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] * k + 0.1, s.pts[0][1] * k + 0.1);
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();

      // Garis tepi putih khas stiker (Die-Cut)
      if (borderOn && shape !== 'full') {
        ctx.save();
        traceShapePath(ctx, sz, shape, pad);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(4, Math.round(10 * k));
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(0,0,0,0.32)';
        ctx.shadowBlur = Math.round(10 * k);
        ctx.stroke();
        ctx.restore();
      }

      // Teks Stiker
      const t = text.trim();
      if (t) {
        ctx.save();
        const fontSize = Math.round((t.length > 14 ? 32 : 42) * k);
        ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const ty = textPos === 'top' ? sz * 0.2 : textPos === 'mid' ? sz * 0.5 : sz * 0.82;
        ctx.lineWidth = Math.max(4, Math.round(8 * k));
        ctx.strokeStyle = textColor === '#111827' ? '#ffffff' : '#0b1b46';
        ctx.lineJoin = 'round';
        ctx.strokeText(t, sz / 2, ty, sz - 32 * k);
        ctx.fillStyle = textColor;
        ctx.fillText(t, sz / 2, ty, sz - 32 * k);
        ctx.restore();
      }
    }

    const draw = () => renderStickerCanvas(g, W);
    draw();

    // Pilih foto
    o.querySelector('#stm-file').onchange = e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      const im = new Image();
      im.onload = () => {
        img = im;
        minScale = scale = Math.max(W / im.width, W / im.height);
        ix = (W - im.width * scale) / 2;
        iy = (W - im.height * scale) / 2;
        const zm = o.querySelector('#stm-zoom');
        zm.value = '1';
        o.querySelector('#stm-zv').textContent = '1.0x';
        o.querySelector('#stm-zoom-box').hidden = false;
        draw();
      };
      im.src = URL.createObjectURL(f);
    };

    o.querySelector('#stm-zoom').oninput = e => {
      if (!img) return;
      const mult = +e.target.value, ns = minScale * mult, ratio = ns / scale;
      ix = W / 2 - (W / 2 - ix) * ratio;
      iy = HClamp(W / 2 - (W / 2 - iy) * ratio);
      scale = ns;
      o.querySelector('#stm-zv').textContent = mult.toFixed(1) + 'x';
      draw();
    };
    const HClamp = v => v;

    // Interaksi kanvas: geser foto atau gambar kuas
    const getPos = e => {
      const r = cv.getBoundingClientRect();
      return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (W / r.height)];
    };
    cv.onpointerdown = e => {
      cv.setPointerCapture(e.pointerId);
      const [px, py] = getPos(e);
      if (brushMode) {
        curStroke = { color: brushColor, size: brushSize, pts: [[px, py]] };
        draw();
      } else if (img) {
        ptr = [px, py];
      }
    };
    cv.onpointermove = e => {
      const [px, py] = getPos(e);
      if (brushMode && curStroke) {
        curStroke.pts.push([px, py]);
        draw();
      } else if (!brushMode && ptr && img) {
        ix += px - ptr[0];
        iy += py - ptr[1];
        ptr = [px, py];
        draw();
      }
    };
    const endPtr = () => {
      if (curStroke) { strokes.push(curStroke); curStroke = null; draw() }
      ptr = null;
    };
    cv.onpointerup = endPtr;
    cv.onpointercancel = endPtr;

    // Mode Kuas vs Geser
    o.querySelector('#stm-brush-tg').onclick = () => {
      brushMode = !brushMode;
      o.querySelector('#stm-brush-tg').classList.toggle('g', !brushMode);
      o.querySelector('#stm-br-lbl').textContent = brushMode ? 'Mode Gambar Kuas' : 'Mode Geser Foto';
      o.querySelector('#stm-brush-box').hidden = !brushMode;
    };
    o.querySelector('#stm-undo').onclick = () => { if (strokes.length) { strokes.pop(); draw() } };
    o.querySelector('#stm-clr-br').onclick = () => { strokes = []; draw() };
    o.querySelector('#stm-bcols').onclick = e => {
      const b = e.target.closest('[data-bc]'); if (!b) return;
      brushColor = b.dataset.bc;
      o.querySelectorAll('#stm-bcols button').forEach(x => x.classList.toggle('on', x === b));
    };
    o.querySelector('#stm-bsize').oninput = e => { brushSize = +e.target.value };

    // Bentuk, Garis Tepi, Latar, Teks
    o.querySelector('#stm-shapes').onclick = e => {
      const b = e.target.closest('[data-sh]'); if (!b) return;
      shape = b.dataset.sh;
      o.querySelectorAll('#stm-shapes button').forEach(x => x.classList.toggle('set', x === b));
      draw();
    };
    o.querySelector('#stm-bdr').onchange = e => { borderOn = e.target.checked; draw() };
    o.querySelector('#stm-bgs').onclick = e => {
      const b = e.target.closest('[data-bg]'); if (!b) return;
      bgMode = b.dataset.bg;
      o.querySelectorAll('#stm-bgs button').forEach(x => x.classList.toggle('set', x === b));
      draw();
    };
    o.querySelector('#stm-txt').oninput = e => { text = e.target.value; draw() };
    o.querySelector('#stm-tpos').onclick = e => {
      const b = e.target.closest('[data-tp]'); if (!b) return;
      textPos = b.dataset.tp;
      o.querySelectorAll('#stm-tpos button').forEach(x => x.classList.toggle('set', x === b));
      draw();
    };
    o.querySelector('#stm-tcols').onclick = e => {
      const b = e.target.closest('[data-tc]'); if (!b) return;
      textColor = b.dataset.tc;
      o.querySelectorAll('#stm-tcols button').forEach(x => x.classList.toggle('on', x === b));
      draw();
    };

    // Hapus stiker custom dari daftar di dalam studio
    o.querySelector('#stm-my').onclick = async e => {
      const d = e.target.closest('[data-mydel]'); if (!d) return;
      try {
        await api('/me/stickers/' + d.dataset.mydel, { method: 'DELETE' });
        await loadMyStickers(true);
        refreshAllStickerTrays();
        d.closest('.stg-it').remove();
        toast('Stiker dihapus');
      } catch (err) { toast(err.message, 'err') }
    };

    o.querySelector('[data-x]').onclick = back;
    o.querySelector('#stm-save').onclick = async () => {
      if (!img && !strokes.length && !text.trim()) return toast('Pilih foto, gambar coretan, atau tulis teks stiker dulu', 'err');
      const btn = o.querySelector('#stm-save');
      btn.disabled = true; btn.textContent = 'Menyimpan...';
      const outCv = document.createElement('canvas');
      outCv.width = OUT; outCv.height = OUT;
      renderStickerCanvas(outCv.getContext('2d'), OUT);
      outCv.toBlob(async blob => {
        try {
          const fd = new FormData();
          fd.append('sticker', new File([blob], 'sticker.png', { type: 'image/png' }));
          const r = await api('/me/stickers', { method: 'POST', body: fd });
          await loadMyStickers(true);
          refreshAllStickerTrays();
          back();
          toast('Stiker custom berhasil dibuat');
          if (onCreated && r.sticker) onCreated('c:' + r.sticker.file);
        } catch (err) {
          toast(err.message, 'err');
          btn.disabled = false; btn.innerHTML = `${ic('check', 's b3')} Simpan`;
        }
      }, 'image/png');
    };
    lay(o);
  });
}

const composer = (id, ph) => `<div class="cw" id="${id}"><div class="stg">${buildStickerTrayHTML()}</div><div class="sug"></div><form class="mf"><button type="button" class="ib" data-c="img" aria-label="Foto">${ic('img')}</button><button type="button" class="ib" data-c="st" aria-label="Stiker">${ic('smile')}</button><input name="text" placeholder="${ph}" maxlength="1000" autocomplete="off"><input type="file" accept="image/*" hidden><button type="button" class="ib" data-c="mic" aria-label="Pesan suara">${ic('mic')}</button><button class="btn snd" aria-label="Kirim">${ic('send')}</button></form></div>`;
let rec = null;
async function recToggle(btn, send) {
  if (rec) { rec.stop(); return }
  try {
    const st = await navigator.mediaDevices.getUserMedia({ audio: true }), r = new MediaRecorder(st), ch = []; rec = r; btn.classList.add('rec');
    r.ondataavailable = e => ch.push(e.data);
    r.onstop = () => { st.getTracks().forEach(t => t.stop()); rec = null; btn.classList.remove('rec'); const b = new Blob(ch, { type: r.mimeType || 'audio/webm' }); if (b.size > 800) send(b) };
    r.start();
  } catch { toast('Izin mikrofon ditolak', 'err') }
}
function wire(cw, send, mentions, onTyping) {
  const f = cw.querySelector('form'), fi = cw.querySelector('input[type=file]'), stg = cw.querySelector('.stg');
  if (mentions) suggest(f.text, cw.querySelector('.sug'));
  if (onTyping) f.text.addEventListener('input', () => { if (f.text.value.trim()) onTyping() });
  if (token) loadMyStickers().then(() => { if (stg) stg.innerHTML = buildStickerTrayHTML() });
  f.onsubmit = e => { e.preventDefault(); const t = f.text.value.trim(); if (t) { f.reset(); cw.querySelector('.sug').innerHTML = ''; send({ text: t }) } };
  f.onclick = async e => {
    const b = e.target.closest('[data-c]'); if (!b) return; const c = b.dataset.c;
    if (c === 'img') fi.click();
    if (c === 'st') {
      const open = cw.classList.toggle('sk');
      if (open && token) { await loadMyStickers(); stg.innerHTML = buildStickerTrayHTML() }
    }
    if (c === 'mic') recToggle(b, bl => send({ file: new File([bl], 'vn.' + (bl.type.includes('mp4') ? 'm4a' : bl.type.includes('ogg') ? 'ogg' : 'webm'), { type: bl.type }) }));
  };
  fi.onchange = () => { const x = fi.files[0]; fi.value = ''; if (x) send({ file: x }) };
  stg.onclick = async e => {
    const add = e.target.closest('[data-st-add]');
    if (add) {
      return openStickerMaker();
    }
    const del = e.target.closest('[data-st-del]');
    if (del) {
      e.stopPropagation();
      try {
        await api('/me/stickers/' + del.dataset.stDel, { method: 'DELETE' });
        await loadMyStickers(true);
        refreshAllStickerTrays();
        toast('Stiker custom dihapus');
      } catch (err) { toast(err.message, 'err') }
      return;
    }
    const b = e.target.closest('[data-s]');
    if (b) { cw.classList.remove('sk'); send({ sticker: b.dataset.s }) }
  };
}

/* ---------- Halaman Pesan (Inbox) ---------- */
let chatsMap = {};
async function inbox() {
  try {
    const [{ chats }, tray] = await Promise.all([api('/chats', { cache: 'no-store' }), storyTray()]);
    chatsMap = Object.fromEntries(chats.map(c => [c.username, c]));
    page('#inbox', `<header class="ab"><h2>Pesan</h2><button class="ib" id="isr" aria-label="Cari">${ic('search')}</button></header>${tray}
${chats.length ? `<p class="hint">${ic('info', 's')} Tahan obrolan untuk menyematkan atau menghapus</p>` : ''}
${chats.length ? chats.map(c => `<button class="li${c.pinned ? ' pn' : ''}" data-u="${esc(c.username)}"><span class="sa">${ava(c.username, c.avatar)}</span><span class="lt"><b>${esc(c.nick || c.name || c.username)}${vbdg(c)}${c.friend ? `<span class="fr">${ic('users', 's')}</span>` : ''}${c.pinned ? `<span class="pnx">${ic('pin', 's')}</span>` : ''} ${fireBadge(c.streak_info || c.streak, false)}</b><small class="ib-sub${c.unread ? ' unr' : ''}" data-sub="${esc(c.username)}">${c.mine ? `<span class="ib-st${c.seen ? ' rd' : ''}">${c.seen ? `${ic('checks', 's b3')} Dibaca` : `${ic('check', 's b3')} Terkirim`}</span> · Kamu: ` : ''}${esc(c.last)}</small></span><span class="rt">${ago(c.created)}${c.unread ? `<i class="dot">${c.unread}</i>` : ''}</span></button>`).join('')
        : empty('msg', 'Belum ada obrolan', 'Buka profil seseorang lalu tekan Pesan.')}`);
    const el = $('#inbox'); bindTray(el.querySelector('.stray') || document.createElement('div')); $('#isr').onclick = () => openSearch();
    let t = 0, did = false;
    const stop = () => clearTimeout(t);
    el.onpointerdown = e => { const li = e.target.closest('.li[data-u]'); if (!li) return; did = false; t = setTimeout(() => { did = true; buzz(); chatActions(chatsMap[li.dataset.u]) }, 480) };
    ['pointerup', 'pointercancel', 'pointermove'].forEach(ev => el.addEventListener(ev, stop));
    el.oncontextmenu = e => { const li = e.target.closest('.li[data-u]'); if (li) { e.preventDefault(); stop(); did = true; chatActions(chatsMap[li.dataset.u]) } };
    el.onclick = e => { if (did) { did = false; return } const li = e.target.closest('.li[data-u]'); if (li) openChat(li.dataset.u) };
  } catch (e) { toast(e.message, 'err') }
}
function chatActions(c) {
  if (!c) return;
  sheet(`<div class="shu"><span class="sa">${ava(c.username, c.avatar)}</span><div><b>${esc(c.nick || c.name || c.username)}</b><small class="mu">@${esc(c.username)}</small></div></div>${rows([{ k: 'pin', i: 'pin', t: c.pinned ? 'Lepas sematan' : 'Sematkan obrolan', s: c.pinned ? '' : 'Tampil di paling atas' }, { k: 'pf', i: 'user', t: 'Lihat profil' }, { k: 'del', i: 'trash', t: 'Hapus obrolan', s: 'Pesan hanya hilang dari sisimu', d: 1 }])}`);
  const P = '/chats/' + encodeURIComponent(c.username);
  onPick(async k => {
    if (k === 'pf') { closeSheet(); return openProfile(c.username) }
    if (k === 'pin') { try { const r = await post(P + '/pin'); closeSheet(); toast(r.pinned ? 'Obrolan disematkan' : 'Sematan dilepas'); inbox() } catch (e) { toast(e.message, 'err') } }
    if (k === 'del') confirmSheet('Hapus obrolan ini?', async () => { try { await post(P + '/clear'); toast('Obrolan dihapus'); await inbox(); badges() } catch (e) { toast(e.message, 'err') } }, 'Hapus', 'Pesan hanya hilang dari sisimu. Lawan bicara tetap menyimpannya.');
  });
}

/* ---------- Ruang Obrolan & Status Mengetik / Terkirim / Dibaca ---------- */
const WALLS = { 'p:1': 'linear-gradient(160deg,#241a4d,#12101c)', 'p:2': 'linear-gradient(160deg,#4a1d3a,#1a0f1e)', 'p:3': 'linear-gradient(160deg,#0f3a3a,#101c1c)', 'p:4': '#0b0b10', 'p:5': 'linear-gradient(160deg,#3b2a14,#1b130a)' };
const wallCss = w => !w ? 'var(--page)' : WALLS[w] || `url('${url(w)}') center/cover`;
let chatU = null, chatT = null, chatD = null, chatCur = null, typTimers = {};
function clearChatPoll() { clearInterval(chatT); chatT = null; chatU = null }

// Status tiap balon pesan milik sendiri: Mengirim... / Terkirim / Dibaca (SVG)
function msgStatusHTML(m) {
  if (!m.mine || m.kind === 'recalled') return '';
  if (String(m.id)[0] === 't') return ` · <b class="st-pend">Mengirim...</b>`;
  if (m.seen) return ` · <b class="rd">${ic('checks', 's b3')}Dibaca</b>`;
  return ` · <b class="st-sent">${ic('check', 's')}Terkirim</b>`;
}

const bub = (m, n) => `<div class="b${m.mine ? ' me' : ''}${m.kind === 'sticker' ? ' st' : ''}${m.kind === 'recalled' ? ' rc' : ''}${n ? ' new' : ''}" id="m${m.id}" data-id="${m.id}" data-p="${m.pinned ? 1 : 0}">${m.pinned ? `<small>${ic('pin', 's')} disematkan</small>` : ''}${m.kind === 'recalled' ? '<em>Pesan ditarik</em>' : med(m)}${m.text ? `<span>${cap(m.text)}</span>` : ''}<i>${hm(m.created)}${msgStatusHTML(m)}</i></div>`;

function addMsg(m) {
  const mg = $('#mg'); if (!mg) return;
  const tb = $('#typ-bub'); if (tb) tb.remove();
  mg.insertAdjacentHTML('beforeend', bub(m, 1));
  mg.scrollTop = mg.scrollHeight;
}

// Tampilkan indikator "Sedang mengetik..." secara realtime
function showTyping(fromUser) {
  if (!fromUser) return;
  const uLow = String(fromUser).toLowerCase();
  const sub = [...$$('#inbox [data-sub]')].find(el => String(el.dataset.sub).toLowerCase() === uLow);
  if (sub) {
    if (!sub.dataset.orig) sub.dataset.orig = sub.innerHTML;
    sub.innerHTML = `<span class="typ-tx"><i class="tdot"></i><i class="tdot"></i><i class="tdot"></i> Sedang mengetik...</span>`;
  }
  if (chatU && chatU.toLowerCase() === uLow && $('#chat').classList.contains('open')) {
    const cs = $('#cs'), mg = $('#mg');
    if (cs) {
      if (!cs.dataset.orig) cs.dataset.orig = cs.innerHTML;
      cs.innerHTML = `<span class="typ-tx"><i class="tdot"></i><i class="tdot"></i><i class="tdot"></i> Sedang mengetik...</span>`;
    }
    if (mg && !$('#typ-bub')) {
      const end = mg.scrollTop + mg.clientHeight >= mg.scrollHeight - 70;
      mg.insertAdjacentHTML('beforeend', `<div class="b typ-b" id="typ-bub"><span class="typ-dots"><i></i><i></i><i></i></span> <small>mengetik...</small></div>`);
      if (end) mg.scrollTop = mg.scrollHeight;
    }
  }
  clearTimeout(typTimers[uLow]);
  typTimers[uLow] = setTimeout(() => clearTyping(fromUser), 3400);
}

function clearTyping(fromUser) {
  const uLow = String(fromUser || '').toLowerCase();
  const sub = [...$$('#inbox [data-sub]')].find(el => String(el.dataset.sub).toLowerCase() === uLow);
  if (sub && sub.dataset.orig) { sub.innerHTML = sub.dataset.orig; delete sub.dataset.orig }
  if (chatU && chatU.toLowerCase() === uLow) {
    const cs = $('#cs'), tb = $('#typ-bub');
    if (cs && cs.dataset.orig) { cs.innerHTML = cs.dataset.orig; delete cs.dataset.orig }
    if (tb) tb.remove();
  }
}

async function sendChat(o) {
  const tmp = o.text && !o.file && !o.sticker ? { id: 't' + Date.now(), mine: 1, text: o.text, created: Date.now() / 1000 | 0, pinned: 0, seen: 0 } : null;
  if (tmp) addMsg(tmp);
  try {
    const r = await api('/chats/' + encodeURIComponent(chatU), { method: 'POST', body: toFD(o) });
    if (tmp) {
      const el = $('#m' + tmp.id);
      if (el) {
        el.id = 'm' + r.msg.id;
        el.dataset.id = r.msg.id;
        const iEl = el.querySelector('i');
        if (iEl) iEl.innerHTML = `${hm(r.msg.created)} · <b class="st-sent">${ic('check', 's')}Terkirim</b>`;
      }
    } else addMsg({ ...r.msg, mine: 1, pinned: 0, seen: 0 });
    if (chatCur && r.streak_info) {
      chatCur.streak = r.streak;
      chatCur.streak_info = r.streak_info;
      renderChatHeaderStreak(chatCur);
    }
  } catch (err) { toast(err.message, 'err'); tmp && $('#m' + tmp.id) && $('#m' + tmp.id).remove() }
}

async function openChat(name) {
  chatU = name; chatD = null; const o = $('#chat');
  o.innerHTML = `<header class="ch"><button class="ib" data-x aria-label="Kembali">${ic('back')}</button><button class="sa" id="ca" aria-label="Profil"></button><div class="lt"><b id="cn"></b><small id="cs"></small></div><button class="ib" id="cmn" aria-label="Pengaturan obrolan">${ic('more', 'b3')}</button></header>
<button id="pb" class="pb"></button><div id="mg" class="mg"></div>${composer('cm', 'Tulis pesan')}`;
  o.querySelector('[data-x]').onclick = back; $('#cmn').onclick = chatMenu; $('#ca').onclick = () => openProfile(chatU);
  o.querySelector('.ch .lt').onclick = e => { if (e.target.closest('[data-open-streak]') || e.target.closest('#cs')) openStreakSheet() };
  let lastTypSent = 0;
  wire($('#cm'), sendChat, false, () => {
    const now = Date.now();
    if (now - lastTypSent > 2200 && chatU) {
      lastTypSent = now;
      post('/chats/' + encodeURIComponent(chatU) + '/typing').catch(() => {});
    }
  });
  $('#mg').onclick = e => {
    const srp = e.target.closest('.srp');
    if (srp) {
      if (srp.dataset.kind === 'image') return openImage(srp.dataset.src);
      const v = srp.querySelector('video');
      if (v) { v.paused ? v.play().catch(() => {}) : v.pause(); return }
    }
    const vcl = e.target.closest('.vc'); if (vcl) return openVid(vcl.dataset.vid);
    const im = e.target.closest('.mi'); if (im) return openImage(im.currentSrc || im.src);
    if (e.target.closest('.ht,.mn')) return;
    const b = e.target.closest('.b'); if (!b || b.classList.contains('rc') || b.classList.contains('typ-b') || String(b.dataset.id)[0] === 't') return;
    const mine = b.classList.contains('me'), tx = b.querySelector('span'), cstk = b.querySelector('.cstk');
    sheet(rows([
      { k: 'pn', i: 'pin', t: b.dataset.p === '1' ? 'Lepas sematan' : 'Sematkan pesan' },
      cstk && { k: 'svs', i: 'smile', t: 'Simpan ke Stiker Custom saya' },
      tx && { k: 'cp', i: 'link', t: 'Salin teks' },
      mine && { k: 'dm', i: 'trash', t: 'Tarik pesan', d: 1 }
    ]));
    onPick(async k => {
      if (k === 'strk') { closeSheet(); return openStreakSheet() }
    if (k === 'pn') { closeSheet(); try { await post(`/messages/${b.dataset.id}/pin`); loadChat(true) } catch (err) { toast(err.message, 'err') } }
      if (k === 'svs' && cstk) { closeSheet(); saveCustomStickerFile(cstk.dataset.cfile) }
      if (k === 'cp') { cp(tx.textContent).then(() => toast('Teks disalin')); closeSheet() }
      if (k === 'dm') { closeSheet(); try { await api('/messages/' + b.dataset.id, { method: 'DELETE' }); loadChat(true); toast('Pesan ditarik') } catch (err) { toast(err.message, 'err') } }
    });
  };
  o._close = () => { clearChatPoll(); if ($('#inbox').classList.contains('open')) inbox(); badges() };
  lay(o); await loadChat(true); badges(); clearInterval(chatT); chatT = setInterval(() => loadChat(false), 10000);
}

async function loadChat(force) {
  if (!chatU || !$('#chat').classList.contains('open')) return;
  try {
    const d = await api('/chats/' + encodeURIComponent(chatU), { cache: 'no-store' });
    const sig = JSON.stringify([d.msgs.map(m => [m.id, m.pinned, m.seen]), d.nick, d.wall, d.streak, d.streak_info]);
    if (!force && sig === chatD) return; chatD = sig; chatCur = d;
    const mg = $('#mg'), end = mg.scrollTop + mg.clientHeight >= mg.scrollHeight - 60;
    $('#chat').style.background = wallCss(d.wall); $('#ca').innerHTML = ava(d.user.username, d.user.avatar);
    $('#cn').innerHTML = esc(d.nick || d.user.name || d.user.username) + vbdg(d.user) + (d.friend ? `<span class="fr">${ic('users', 's')}</span>` : '');
    renderChatHeaderStreak(d);
    const pins = d.msgs.filter(m => m.pinned), pb = $('#pb'), last = pins[pins.length - 1];
    pb.style.display = last ? 'block' : 'none';
    if (last) { pb.innerHTML = ic('pin', 's') + ' ' + esc(last.text || LBL[last.kind] || ''); pb.onclick = () => { const el = document.getElementById('m' + last.id); el && el.scrollIntoView({ block: 'center' }) } }
    mg.innerHTML = d.msgs.map(m => bub(m, 0)).join('');
    if (force || end) mg.scrollTop = mg.scrollHeight;
  } catch (e) { if (force) toast(e.message, 'err') }
}

function chatMenu() {
  const d = chatCur; if (!d) return; const P = '/chats/' + encodeURIComponent(chatU);
  sheet(`<h3>Pengaturan obrolan</h3>${rows([{ k: 'strk', i: 'flame', t: 'Info & Evolusi Warna Api Runtutan', s: 'Lihat level warna api (7, 10, 20, 30, 50, 100+ hari)' }, { k: 'pn', i: 'pin', t: d.pinned ? 'Lepas sematan obrolan' : 'Sematkan obrolan' }, { k: 'dl', i: 'trash', t: 'Hapus obrolan', s: 'Pesan hanya hilang dari sisimu', d: 1 }])}
<form id="nf" class="col"><label>Nama panggilan untuk @${esc(d.user.username)}<input name="nick" maxlength="30" value="${esc(d.nick || '')}" placeholder="${esc(d.user.name || d.user.username)}" style="margin-top:6px"></label><button class="btn">Simpan nama</button></form>
<h3 style="margin:16px 0 10px">Wallpaper</h3><div class="wl">${Object.keys(WALLS).map(k => `<button data-w="${k}" style="background:${WALLS[k]}" aria-label="Wallpaper ${k.slice(2)}"></button>`).join('')}</div>
<label style="margin-top:10px">Atau pilih gambar<input type="file" id="wf" accept="image/*" style="margin-top:6px"></label>`);
  onPick(async k => {
    if (k === 'pn') { closeSheet(); try { const r = await post(P + '/pin'); chatCur.pinned = r.pinned ? 1 : 0; toast(r.pinned ? 'Obrolan disematkan' : 'Sematan dilepas') } catch (e) { toast(e.message, 'err') } }
    if (k === 'dl') confirmSheet('Hapus obrolan ini?', async () => { try { await post(P + '/clear'); back(); toast('Obrolan dihapus') } catch (e) { toast(e.message, 'err') } }, 'Hapus', 'Pesan hanya hilang dari sisimu.');
  });
  const sv = async fd => { try { await api(P + '/prefs', { method: 'PUT', body: fd }); closeSheet(); loadChat(true) } catch (err) { toast(err.message, 'err') } };
  $('#nf').onsubmit = e => { e.preventDefault(); sv(new FormData(e.target)) };
  $('#sheet').querySelectorAll('.wl button').forEach(b => b.onclick = () => { const f = new FormData(); f.append('wall', b.dataset.w); sv(f) });
  $('#wf').onchange = e => { const f = new FormData(); f.append('wall', e.target.files[0]); sv(f) };
}


function renderChatHeaderStreak(d) {
  const cs = $('#cs');
  if (!cs || !d) return;
  const stInfo = d.streak_info || { n: d.streak || 0, dead: false };
  const prefix = (d.nick || d.user.name) ? '@' + esc(d.user.username) + ' · ' : '';
  delete cs.dataset.orig;
  cs.innerHTML = prefix + fireBadge(stInfo, true, true);
}

function openStreakSheet() {
  const d = chatCur;
  if (!d || !chatU) return;
  const st = d.streak_info || { n: d.streak || 0, dead: false, last: 0, dying: false, need: 'both', hours_left: 12 };
  const curTier = resolveStreakTier(st.n, st.dead);

  let statusBanner = '';
  if (st.dead) {
    statusBanner = `<div class="strk-alert dead">
      <b>💀 Api Runtutan Padam! (Sebelumnya ${st.last || 1} Hari)</b>
      <p>Api kalian mati karena melewati batas hari tanpa saling membalas chat. Kirim pesan & saling balas hari ini untuk menyalakan kembali dari Hari 1!</p>
    </div>`;
  } else if (!st.n || st.n <= 0) {
    statusBanner = `<div class="strk-alert idle">
      <b>Mulai Api Runtutan dengan @${esc(d.user.username)}</b>
      <p>Saling kirim minimal 1 pesan setiap hari untuk menyalakan api runtutan. Jika absen 1 hari penuh tidak saling chat, api akan mati/padam!</p>
    </div>`;
  } else if (st.dying) {
    const whoTxt = st.need === 'me' ? 'Giliranmu membalas pesan hari ini!' : st.need === 'them' ? `Menunggu @${esc(d.user.username)} membalas hari ini.` : 'Kalian berdua belum saling chat hari ini.';
    statusBanner = `<div class="strk-alert dying">
      <b>⏳ Hampir Padam! Sisa ~${st.hours_left || 6} Jam Lagi</b>
      <p>${whoTxt} Jika tidak saling balas sebelum tengah malam, api ${st.n} hari kalian akan mati (padam)!</p>
    </div>`;
  } else {
    statusBanner = `<div class="strk-alert safe">
      <b>✓ Runtutan Hari Ini Aman! (${st.n} Hari Beruntun)</b>
      <p>Kalian sudah saling berkirim pesan hari ini. Pertahankan terus agar warna apimu berevolusi ke level berikutnya!</p>
    </div>`;
  }

  sheet(`<div class="strk-sheet">
    <div class="strk-hero tier-${curTier.key}">
      <div class="strk-big-orb">${fireBadge(st, false, false) || `<span class="fire-anim tier-dead"><span class="flm">${ic('flame', 'f')}</span><b>0</b></span>`}</div>
      <h3>${st.dead ? 'Api Runtutan Padam' : st.n ? `${st.n} Hari Beruntun` : 'Belum Ada Runtutan'}</h3>
      <span class="strk-tier-pill">${curTier.name}</span>
    </div>
    ${statusBanner}
    <div class="strk-sec-hd">Daftar Evolusi Warna Api Runtutan</div>
    <div class="strk-tiers-list">
      ${STREAK_TIERS.map(t => {
        const isCur = (st.dead && t.key === 'dead') || (!st.dead && st.n > 0 && curTier.key === t.key);
        const sampleBadge = t.key === 'dead'
          ? fireBadge({ n: 0, dead: true, last: 7 }, false)
          : fireBadge({ n: t.min, dead: false }, false);
        return `<div class="strk-tier-row${isCur ? ' on' : ''}">
          <div class="strk-tier-l">${sampleBadge}</div>
          <div class="strk-tier-m">
            <b>${t.name} ${isCur ? '<span class="strk-now">Saat Ini</span>' : ''}</b>
            <small>${t.desc}</small>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`);
}
