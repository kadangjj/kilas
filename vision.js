'use strict';
/* ============================================================
   Zippy · vision.js
   Mesin pemindai visual untuk moderasi video (tanpa dependensi tambahan selain ffmpeg):
   - Ambil beberapa frame dari video lewat ffmpeg, analisis rasio area kulit, gumpalan terbesar, dan area tengah
   - Hash file (SHA-256) + hash perseptual (aHash) agar video yang pernah diblokir langsung terdeteksi saat diunggah ulang
   - Pembaca metadata (judul / komentar / nama file) supaya video tanpa caption tetap diperiksa
   - Normalisasi teks (leetspeak, huruf dipisah spasi) agar kata terlarang tidak mudah dikelabui
   - Hook opsional ke layanan klasifikasi gambar eksternal lewat NSFW_API_URL
   ============================================================ */
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');

const W = 96, H = 96, FRAME_BYTES = W * H * 3;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- Pengaturan sensitivitas ---------- */
const MODES = {
  off:     { label: 'Mati',     t: 9, k: 0 },
  lenient: { label: 'Longgar',  t: 0.58, k: 0.85 },
  normal:  { label: 'Normal',   t: 0.48, k: 1 },
  strict:  { label: 'Ketat',    t: 0.40, k: 1.1 }
};

/* ---------- Normalisasi teks ---------- */
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '|': 'i', '+': 't', '€': 'e' };
function normalizeText(t) {
  let s = String(t || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[01345!7@$|+€]/g, c => LEET[c] || c);
  s = s.replace(/[._\-*#/\\~^]+/g, ' ').replace(/(.)\1{2,}/g, '$1$1').replace(/\s+/g, ' ').trim();
  return s;
}
// "b o k e p" -> "bokep" (hanya menggabung deretan huruf tunggal, tidak menggabung antar kata)
function despace(s) {
  const out = []; let run = [];
  const flush = () => { if (run.length >= 3) out.push(run.join('')); else out.push(...run); run = [] };
  for (const tok of String(s).split(' ')) { if (tok.length === 1) run.push(tok); else { flush(); out.push(tok) } }
  flush(); return out.join(' ');
}
function textVariants(raw) {
  const base = ` ${String(raw || '').toLowerCase()} `;
  const n = normalizeText(raw);
  const d = despace(n);
  return [base, ` ${n} `, ` ${d} `, ` ${d.replace(/(.)\1+/g, '$1')} `];
}
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function hasWord(text, needle) {
  if (!needle) return false;
  if (needle.length <= 4 && !/\s/.test(needle)) return new RegExp(`(?<![a-z0-9])${escRe(needle)}(?![a-z0-9])`).test(text);
  return text.includes(needle);
}
function findHits(variants, words) {
  const hits = [];
  for (const w of words) {
    const raw = String(w || '').trim().toLowerCase(); if (!raw) continue;
    const nrm = normalizeText(raw), nc = nrm.replace(/(.)\1+/g, '$1');
    if (variants.slice(0, 3).some(v => hasWord(v, raw) || (nrm && nrm !== raw && hasWord(v, nrm))) || (variants[3] && nc.length >= 5 && hasWord(variants[3], nc))) hits.push(raw);
  }
  return hits;
}

/* ---------- ffmpeg helpers ---------- */
function run(bin, args, { timeout = 12000, collect = 'stdout', max = 4e6 } = {}) {
  return new Promise(ok => {
    let p; try { p = spawn(bin, ['-hide_banner', '-nostdin', ...args], { stdio: ['ignore', 'pipe', 'pipe'] }) } catch { return ok({ code: -1, out: Buffer.alloc(0), err: '' }) }
    const out = [], err = []; let n = 0, done = false;
    const t = setTimeout(() => { try { p.kill('SIGKILL') } catch {} }, timeout);
    p.stdout.on('data', d => { if (n < max) { out.push(d); n += d.length } });
    p.stderr.on('data', d => { err.push(d); if (err.length > 60) err.shift() });
    const fin = code => { if (done) return; done = true; clearTimeout(t); ok({ code, out: Buffer.concat(out), err: Buffer.concat(err).toString('utf8') }) };
    p.on('error', () => fin(-1)); p.on('close', c => fin(c));
  });
}
async function probe(bin, file) {
  const r = await run(bin, ['-i', file], { timeout: 8000 });
  const e = r.err, m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(e);
  const duration = m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0;
  const meta = [];
  for (const line of e.split('\n')) {
    const mm = /^\s*(title|comment|description|artist|album|genre|synopsis|keywords|handler_name)\s*:\s*(.+)$/i.exec(line);
    if (mm && !/^(videohandler|soundhandler|isom|core media|video media handler|sound media handler)/i.test(mm[2].trim())) meta.push(mm[2].trim());
  }
  return { duration, meta: meta.join(' | ').slice(0, 300), hasVideo: /Stream #\d+:\d+.*Video:/.test(e) };
}
const grabFrame = (bin, file, t) => run(bin, ['-v', 'error', '-ss', t.toFixed(2), '-i', file, '-frames:v', '1', '-vf', `scale=${W}:${H}:flags=area,format=rgb24`, '-f', 'rawvideo', 'pipe:1'], { timeout: 10000, max: FRAME_BYTES + 16 })
  .then(r => (r.out.length >= FRAME_BYTES ? r.out.subarray(0, FRAME_BYTES) : null));
const grabJpeg = (bin, file, t) => run(bin, ['-v', 'error', '-ss', t.toFixed(2), '-i', file, '-frames:v', '1', '-vf', 'scale=320:-2', '-f', 'mjpeg', '-q:v', '5', 'pipe:1'], { timeout: 10000, max: 2e6 })
  .then(r => (r.out.length > 200 ? r.out : null));

function sha256File(file) {
  return new Promise(ok => {
    const h = crypto.createHash('sha256'), s = fs.createReadStream(file);
    s.on('data', d => h.update(d)); s.on('end', () => ok(h.digest('hex'))); s.on('error', () => ok(''));
  });
}

/* ---------- Analisis satu frame ---------- */
function analyzeFrame(buf) {
  const N = W * H, skin = new Uint8Array(N);
  let cnt = 0, cc = 0, cn = 0, lum = 0, lum2 = 0, sl = 0, sl2 = 0;
  const gray = new Uint8Array(N);
  for (let i = 0, p = 0; i < N; i++, p += 3) {
    const r = buf[p], g = buf[p + 1], b = buf[p + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b, cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b, cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    gray[i] = y; lum += y; lum2 += y * y;
    const isSkin = cb >= 77 && cb <= 127 && cr >= 134 && cr <= 173 && r > g && r > b && (r - b) >= 15 && r > 85 && y > 50 && y < 245 && (r - g) < 95;
    const x = i % W, yy = (i / W) | 0, center = x >= W * 0.2 && x < W * 0.8 && yy >= H * 0.15 && yy < H * 0.85;
    if (center) cn++;
    if (isSkin) { skin[i] = 1; cnt++; sl += y; sl2 += y * y; if (center) cc++ }
  }
  // gumpalan kulit terbesar (4-tetangga)
  const seen = new Uint8Array(N), stack = new Int32Array(N); let best = 0;
  for (let i = 0; i < N; i++) {
    if (!skin[i] || seen[i]) continue;
    let sp = 0, size = 0; stack[sp++] = i; seen[i] = 1;
    while (sp) {
      const k = stack[--sp]; size++;
      const x = k % W, nb = [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, k >= W ? k - W : -1, k < N - W ? k + W : -1];
      for (const q of nb) if (q >= 0 && skin[q] && !seen[q]) { seen[q] = 1; stack[sp++] = q }
    }
    if (size > best) best = size;
  }
  const ratio = cnt / N, blob = best / N, center = cn ? cc / cn : 0;
  const mean = lum / N, v = lum2 / N - mean * mean;
  const skinVar = cnt ? sl2 / cnt - (sl / cnt) * (sl / cnt) : 0;
  const base = 0.5 * ratio + 0.3 * blob + 0.2 * center;
  // aHash 8x8
  const cell = W / 8; const avg = new Float32Array(64); let tot = 0;
  for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) {
    let a = 0; for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) a += gray[(by * cell + y) * W + bx * cell + x];
    a /= cell * cell; avg[by * 8 + bx] = a; tot += a;
  }
  const m = tot / 64; let hash = '';
  for (let i = 0; i < 64; i += 4) hash += ((avg[i] > m ? 8 : 0) | (avg[i + 1] > m ? 4 : 0) | (avg[i + 2] > m ? 2 : 0) | (avg[i + 3] > m ? 1 : 0)).toString(16);
  return { ratio, blob, center, base, dark: mean < 22 && v < 80, flat: skinVar < 12 && ratio > 0.8, hash };
}

const POP = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
function hamming(a, b) {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0; for (let i = 0; i < a.length; i++) d += POP[parseInt(a[i], 16) ^ parseInt(b[i], 16)];
  return d;
}

/* ---------- Klasifikator eksternal (opsional) ---------- */
async function externalScore(jpegs) {
  const url = (process.env.NSFW_API_URL || '').trim(); if (!url || !jpegs.length) return null;
  let best = null;
  for (const j of jpegs) {
    try {
      const ac = new AbortController(), t = setTimeout(() => ac.abort(), 9000);
      const headers = { 'Content-Type': 'image/jpeg' }; if (process.env.NSFW_API_KEY) headers.Authorization = 'Bearer ' + process.env.NSFW_API_KEY;
      const r = await fetch(url, { method: 'POST', headers, body: j, signal: ac.signal }); clearTimeout(t);
      const d = await r.json(); let s = null;
      if (Array.isArray(d)) { const g = n => (d.find(x => String(x.className || x.label).toLowerCase() === n) || {}).probability || 0; s = Math.max(g('porn'), g('hentai'), g('sexy') * 0.7) }
      else if (d && typeof d === 'object') { const v = d.nsfw ?? d.score ?? d.unsafe ?? d.porn; if (typeof v === 'number') s = v > 1 ? v / 100 : v }
      if (s != null) best = Math.max(best || 0, s);
    } catch {}
  }
  return best;
}

/* ---------- Pindai video ---------- */
async function scanVideo(bin, file, { mode = 'normal', originalName = '' } = {}) {
  const cfg = MODES[mode] || MODES.normal;
  const res = { ts: Math.floor(Date.now() / 1000), mode, score: 0, frames: 0, flagged: 0, avg: 0, peak: 0, source: 'heuristik', sha: '', ah: [], meta: '', error: '' };
  res.sha = await sha256File(file);
  if (!bin) { res.error = 'ffmpeg tidak tersedia'; return res }
  const pr = await probe(bin, file);
  res.meta = [String(originalName || '').replace(/\.[a-z0-9]{1,5}$/i, ''), pr.meta].filter(Boolean).join(' | ').slice(0, 300);
  if (!pr.hasVideo) { res.error = 'tidak ada jalur video'; return res }
  const dur = pr.duration > 0.3 ? pr.duration : 0;
  const fr = !dur ? [0, 0.5, 1, 2, 3] : dur < 3 ? [0.1, 0.3, 0.5, 0.7, 0.9].map(f => f * dur) : [0.04, 0.14, 0.26, 0.38, 0.5, 0.62, 0.74, 0.86, 0.96].map(f => f * dur);
  const bufs = []; for (let i = 0; i < fr.length; i += 3) bufs.push(...await Promise.all(fr.slice(i, i + 3).map(t => grabFrame(bin, file, t))));
  const stats = bufs.filter(Boolean).map(analyzeFrame).filter(f => !f.dark);
  res.frames = stats.length;
  if (!stats.length) { res.error = res.error || 'frame tidak terbaca'; return res }
  const sc = stats.map(f => clamp((f.base - (cfg.t - 0.18)) / 0.40, 0, 1) * (f.flat ? 0.5 : 1));
  res.flagged = stats.filter(f => f.base >= cfg.t && !f.flat).length;
  res.avg = +(stats.reduce((a, f) => a + f.ratio, 0) / stats.length).toFixed(3);
  res.peak = +Math.max(...stats.map(f => f.ratio)).toFixed(3);
  const m = sc.reduce((a, b) => a + b, 0) / sc.length, fr2 = res.flagged / stats.length;
  let score = 100 * (0.55 * m + 0.45 * fr2) * cfg.k;
  if (fr2 >= 0.6 && res.avg >= 0.55) score = Math.max(score, 88 * cfg.k);
  res.score = cfg.k ? clamp(Math.round(score), 0, 100) : 0;
  const mid = stats.map(f => f.hash); res.ah = [mid[0], mid[Math.floor(mid.length / 2)], mid[mid.length - 1]].filter(Boolean);
  if (process.env.NSFW_API_URL && cfg.k) {
    const js = (await Promise.all([0.2, 0.5, 0.8].map(f => grabJpeg(bin, file, f * (dur || 2))))).filter(Boolean);
    const ext = await externalScore(js);
    if (ext != null) { const es = Math.round(ext * 100); if (es >= res.score) { res.score = es; res.source = 'klasifikator eksternal' } else res.source = 'heuristik + eksternal' }
  }
  return res;
}

module.exports = { MODES, scanVideo, analyzeFrame, hamming, normalizeText, despace, textVariants, findHits, hasWord, sha256File, W, H, FRAME_BYTES };
