const express = require('express'), cors = require('cors'), multer = require('multer'),
  bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), { DatabaseSync } = require('node:sqlite'),
  path = require('path'), fs = require('fs'), crypto = require('crypto'), { spawn, spawnSync } = require('child_process'),
  vision = require('./vision');

/* ---------- Baca .env secara kompatibel di semua versi Node ---------- */
function loadEnvFile(file) {
  try {
    if (!fs.existsSync(file)) return;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      else v = v.replace(/\s+#.*$/, '').trim();
      if (v !== '' && process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  } catch {}
}
loadEnvFile(path.join(__dirname, '.env'));
try { if (typeof process.loadEnvFile === 'function') process.loadEnvFile(path.join(__dirname, '.env')) } catch {}

const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
const SECRET = (process.env.JWT_SECRET || '').trim() || (() => {
  const f = path.join(__dirname, 'secret.key');
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString('hex'));
  return fs.readFileSync(f, 'utf8').trim();
})();

const UP = path.join(__dirname, 'uploads'); fs.mkdirSync(UP, { recursive: true });
const defaultDbFile = fs.existsSync(path.join(__dirname, 'kilas.db')) ? 'kilas.db' : 'zippy.db';
const db = new DatabaseSync(path.join(__dirname, process.env.DB_FILE || defaultDbFile)); db.pragma = p => db.exec('PRAGMA ' + p);
db.pragma('journal_mode=WAL'); db.pragma('foreign_keys=ON');

/* ---------- Skema ---------- */
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE NOT NULL COLLATE NOCASE,pass TEXT NOT NULL,bio TEXT DEFAULT '',avatar TEXT,banner TEXT);
CREATE TABLE IF NOT EXISTS videos(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,caption TEXT DEFAULT '',file TEXT NOT NULL,created INTEGER DEFAULT(strftime('%s','now')));
CREATE TABLE IF NOT EXISTS likes(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,PRIMARY KEY(user_id,video_id));
CREATE TABLE IF NOT EXISTS comments(id INTEGER PRIMARY KEY,video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,text TEXT NOT NULL,created INTEGER DEFAULT(strftime('%s','now')));
CREATE TABLE IF NOT EXISTS follows(a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,PRIMARY KEY(a,b));
CREATE TABLE IF NOT EXISTS notifs(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,type TEXT NOT NULL,actor INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,created INTEGER DEFAULT(strftime('%s','now')),seen INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS msgs(id INTEGER PRIMARY KEY,s INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,r INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,text TEXT NOT NULL,created INTEGER DEFAULT(strftime('%s','now')),pinned INTEGER DEFAULT 0,seen INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS streaks(a INTEGER,b INTEGER,la INTEGER DEFAULT 0,lb INTEGER DEFAULT 0,n INTEGER DEFAULT 0,sday INTEGER DEFAULT 0,PRIMARY KEY(a,b));
CREATE TABLE IF NOT EXISTS prefs(u INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,p INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,nick TEXT DEFAULT '',wall TEXT DEFAULT '',PRIMARY KEY(u,p));
CREATE TABLE IF NOT EXISTS admin_settings(k TEXT PRIMARY KEY,v TEXT NOT NULL);
`);
['msgs ADD media TEXT', 'msgs ADD kind TEXT', 'comments ADD media TEXT', 'comments ADD kind TEXT', 'comments ADD pinned INTEGER DEFAULT 0',
  'videos ADD stitch INTEGER', "users ADD name TEXT DEFAULT ''",
  'prefs ADD pinned INTEGER DEFAULT 0', 'prefs ADD cleared INTEGER DEFAULT 0',
  "videos ADD privacy TEXT DEFAULT 'public'", "videos ADD loc TEXT DEFAULT ''", 'videos ADD rot INTEGER DEFAULT 0', 'users ADD email TEXT',
  'users ADD verified INTEGER DEFAULT 0', 'users ADD private INTEGER DEFAULT 0', 'users ADD visitors_on INTEGER DEFAULT 1', 'videos ADD views INTEGER DEFAULT 0',
  "users ADD link TEXT DEFAULT ''", "users ADD note TEXT DEFAULT ''", 'users ADD banned INTEGER DEFAULT 0', "users ADD ban_reason TEXT DEFAULT ''",
  'videos ADD audio_id INTEGER', "videos ADD audio_title TEXT DEFAULT ''", 'stories ADD audio_id INTEGER', "notifs ADD note TEXT DEFAULT ''",
  "users ADD birth_date TEXT DEFAULT ''",
  "videos ADD mod_status TEXT DEFAULT 'auto'", "videos ADD mod_score INTEGER DEFAULT 0", "videos ADD mod_reasons TEXT DEFAULT ''", "videos ADD mod_checked INTEGER DEFAULT 0",
  "videos ADD mod_visual TEXT DEFAULT ''", "videos ADD mod_meta TEXT DEFAULT ''", "videos ADD mod_hash TEXT DEFAULT ''",
  "videos ADD code TEXT", "comments ADD parent INTEGER", "comments ADD rto INTEGER",
  "streaks ADD last_ts INTEGER DEFAULT 0", "streaks ADD peak INTEGER DEFAULT 0", "streaks ADD dead INTEGER DEFAULT 0"
].forEach(a => { try { db.exec('ALTER TABLE ' + a) } catch {} });
db.exec(`
CREATE TABLE IF NOT EXISTS mod_hashes(kind TEXT NOT NULL,h TEXT NOT NULL,video_id INTEGER NOT NULL,created INTEGER DEFAULT(strftime('%s','now')),PRIMARY KEY(kind,h,video_id));
CREATE UNIQUE INDEX IF NOT EXISTS ux_email ON users(email COLLATE NOCASE) WHERE email IS NOT NULL AND email<>'';
CREATE TABLE IF NOT EXISTS saves(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,created INTEGER DEFAULT(strftime('%s','now')),PRIMARY KEY(user_id,video_id));
CREATE TABLE IF NOT EXISTS audio_saves(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,audio_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,created INTEGER DEFAULT(strftime('%s','now')),PRIMARY KEY(user_id,audio_id));
CREATE TABLE IF NOT EXISTS custom_stickers(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,file TEXT NOT NULL,created INTEGER DEFAULT(strftime('%s','now')),UNIQUE(user_id,file));
CREATE TABLE IF NOT EXISTS reposts(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,created INTEGER DEFAULT(strftime('%s','now')),PRIMARY KEY(user_id,video_id));
CREATE TABLE IF NOT EXISTS vtags(video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,tag TEXT NOT NULL,PRIMARY KEY(video_id,tag));
CREATE INDEX IF NOT EXISTS ix_vtags_tag ON vtags(tag);
CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY,reporter INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,target TEXT NOT NULL,reason TEXT NOT NULL,note TEXT DEFAULT '',created INTEGER DEFAULT(strftime('%s','now')),UNIQUE(reporter,kind,target));
CREATE TABLE IF NOT EXISTS stories(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,file TEXT NOT NULL,kind TEXT NOT NULL,text TEXT DEFAULT '',created INTEGER DEFAULT(strftime('%s','now')));
CREATE INDEX IF NOT EXISTS ix_stories_user ON stories(user_id,created);
CREATE TABLE IF NOT EXISTS story_views(story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,created INTEGER DEFAULT(strftime('%s','now')),PRIMARY KEY(story_id,user_id));
CREATE TABLE IF NOT EXISTS highlights(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,created INTEGER DEFAULT(strftime('%s','now')));
CREATE TABLE IF NOT EXISTS highlight_items(highlight_id INTEGER NOT NULL REFERENCES highlights(id) ON DELETE CASCADE,story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,pos INTEGER DEFAULT 0,PRIMARY KEY(highlight_id,story_id));
CREATE TABLE IF NOT EXISTS follow_requests(a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,created INTEGER DEFAULT(strftime('%s','now')),PRIMARY KEY(a,b));
CREATE TABLE IF NOT EXISTS profile_visits(owner INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,visitor INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,created INTEGER DEFAULT(strftime('%s','now')),n INTEGER DEFAULT 1,PRIMARY KEY(owner,visitor));
CREATE TABLE IF NOT EXISTS verif_requests(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,reason TEXT NOT NULL,link TEXT DEFAULT '',status TEXT NOT NULL DEFAULT 'pending',note TEXT DEFAULT '',created INTEGER DEFAULT(strftime('%s','now')),decided INTEGER);
CREATE INDEX IF NOT EXISTS ix_verif_status ON verif_requests(status,created);
CREATE TABLE IF NOT EXISTS video_appeals(id INTEGER PRIMARY KEY,video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',note TEXT DEFAULT '',created INTEGER DEFAULT(strftime('%s','now')),decided INTEGER);
CREATE INDEX IF NOT EXISTS ix_appeals_status ON video_appeals(status,created);
CREATE INDEX IF NOT EXISTS ix_appeals_video ON video_appeals(video_id);
CREATE TABLE IF NOT EXISTS feed_seen(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,created INTEGER DEFAULT(strftime('%s','now')),PRIMARY KEY(user_id,video_id));
`);
["reposts ADD note TEXT DEFAULT ''", 'stories ADD audio_id INTEGER', 'comments ADD pinned INTEGER DEFAULT 0', "notifs ADD note TEXT DEFAULT ''"].forEach(a => { try { db.exec('ALTER TABLE ' + a) } catch {} });

/* ---------- Kode video acak (huruf), peringatan akun, indeks ---------- */
db.exec(`CREATE TABLE IF NOT EXISTS warnings(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,video_id INTEGER,kind TEXT NOT NULL DEFAULT 'account',note TEXT NOT NULL DEFAULT '',created INTEGER DEFAULT(strftime('%s','now')))`);
const CODE_CH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const genCode = () => {
  for (;;) {
    const b = crypto.randomBytes(8); let c = '';
    for (let i = 0; i < 8; i++) c += CODE_CH[b[i] % 52];
    if (!db.prepare('SELECT 1 FROM videos WHERE code=?').get(c)) return c;
  }
};
db.prepare("SELECT id FROM videos WHERE code IS NULL OR code=''").all().forEach(r => db.prepare('UPDATE videos SET code=? WHERE id=?').run(genCode(), r.id));
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_code ON videos(code)') } catch {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_videos_file ON videos(file)') } catch {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent)') } catch {}
if (!db.prepare("SELECT 1 FROM admin_settings WHERE k='mig_warnings_v1'").get()) {
  const codeOf0 = id => (db.prepare('SELECT code FROM videos WHERE id=?').get(id) || {}).code;
  db.prepare("SELECT id,user_id,video_id,note,created FROM notifs WHERE type='warning'").all().forEach(n => {
    let vid = n.video_id;
    const m = !vid && String(n.note || '').match(/#(\d+)/);
    if (m && codeOf0(m[1])) vid = Number(m[1]);
    const note = String(n.note || '').replace(/#(\d+)/g, (x, d) => codeOf0(d) || x);
    db.prepare('INSERT INTO warnings(user_id,video_id,kind,note,created) VALUES(?,?,?,?,?)').run(n.user_id, vid || null, vid ? 'video' : 'account', note, n.created);
    db.prepare('UPDATE notifs SET video_id=?,note=? WHERE id=?').run(vid || null, note, n.id);
  });
  db.prepare("INSERT INTO admin_settings(k,v) VALUES('mig_warnings_v1','1')").run();
}

/* ---------- Pembantu ---------- */
const TAG = /(?<![\p{L}\p{N}_&])#([\p{L}\p{N}_]{1,40})/gu;
const tagsOf = t => [...new Set([...String(t || '').matchAll(TAG)].map(m => m[1].toLowerCase()))].slice(0, 10);
const setTags = (vid, caption) => {
  db.prepare('DELETE FROM vtags WHERE video_id=?').run(vid);
  tagsOf(caption).forEach(t => db.prepare('INSERT OR IGNORE INTO vtags VALUES(?,?)').run(vid, t));
};
if (!db.prepare('SELECT 1 FROM vtags LIMIT 1').get()) db.prepare('SELECT id,caption FROM videos').all().forEach(v => setTags(v.id, v.caption));

const U = id => Number.isInteger(id) && id > 0 ? id : 0;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const like = s => String(s).replace(/[\\%_]/g, m => '\\' + m);
const bad = (s, c, m) => s.status(c).json({ error: m });
const PRIV = ['public', 'friends', 'private'];
const throttleMap = new Map();
const throttle = (key, max, ms) => { const n = Date.now(), a = (throttleMap.get(key) || []).filter(t => n - t < ms); a.push(n); throttleMap.set(key, a); return a.length > max };
setInterval(() => throttleMap.clear(), 3600e3).unref();
const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
const shuffle = (arr, seed) => { const r = rng(seed), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a };

/* ---------- ffmpeg (opsional): pangkas, crop, tambah audio ---------- */
const ffOk = b => { try { return !!b && spawnSync(b, ['-version'], { timeout: 8000 }).status === 0 } catch { return false } };
let FFMPEG = process.env.FFMPEG_PATH || ''; if (!FFMPEG) { try { FFMPEG = require('ffmpeg-static') || '' } catch {} }
if (!ffOk(FFMPEG)) FFMPEG = ffOk('ffmpeg') ? 'ffmpeg' : '';
const AMIX_NORM = !!FFMPEG && (() => { try { return spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=d=0.1', '-f', 'lavfi', '-i', 'anullsrc=d=0.1', '-filter_complex', 'amix=inputs=2:normalize=0', '-f', 'null', '-'], { timeout: 8000 }).status === 0 } catch { return false } })();
console.log(FFMPEG ? 'ffmpeg siap: fitur edit video aktif' : 'ffmpeg tidak ditemukan: fitur pangkas/crop/audio nonaktif (jalankan: npm i ffmpeg-static, atau isi FFMPEG_PATH)');
const num = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d };
function parseEdits(b) {
  b = b || {}; const ts = Math.max(0, num(b.trim_start, 0)), te = num(b.trim_end, 0); let crop = null;
  try { const c = JSON.parse(b.crop || 'null'); if (c) { const w = clamp(num(c.w, 1), .05, 1), h = clamp(num(c.h, 1), .05, 1); if (w < .995 || h < .995) crop = { x: clamp(num(c.x, 0), 0, 1 - w), y: clamp(num(c.y, 0), 0, 1 - h), w, h } } } catch {}
  return { ts, te: te > ts + .3 ? te : 0, crop, rot: clamp(parseInt(b.rot) || 0, 0, 3), vo: clamp(num(b.vol_orig, 100), 0, 200) / 100, vm: clamp(num(b.vol_music, 100), 0, 200) / 100, ao: Math.max(0, num(b.audio_offset, 0)) };
}
const ffRun = (args, ms = 300e3) => new Promise((ok, no) => {
  const p = spawn(FFMPEG, ['-hide_banner', '-nostdin', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] }); let err = '';
  p.stderr.on('data', d => { err = (err + d).slice(-3000) }); const t = setTimeout(() => p.kill('SIGKILL'), ms);
  p.on('error', e => { clearTimeout(t); no(e) }); p.on('close', c => { clearTimeout(t); c === 0 ? ok() : no(new Error(err || 'ffmpeg gagal')) });
});
const ffProbe = f => new Promise(ok => {
  const p = spawn(FFMPEG, ['-hide_banner', '-i', f], { stdio: ['ignore', 'ignore', 'pipe'] }); let e = '';
  p.stderr.on('data', d => { e = (e + d).slice(-8000) }); p.on('error', () => ok({ audio: false })); p.on('close', () => ok({ audio: /Stream #\d+:\d+.*Audio:/.test(e) }));
});
let busyFF = 0;
async function bake(file, audio, ed) {
  const out = crypto.randomBytes(12).toString('hex') + '.mp4', outp = path.join(UP, out), pr = await ffProbe(file.path), encode = !!(ed.te || ed.crop || ed.rot), vf = [];
  let useAud = audio;
  if (useAud) {
    const apr = await ffProbe(useAud.path);
    if (!apr.audio) useAud = null;
  }
  try {
    if (ed.rot) vf.push(['transpose=1', 'transpose=1,transpose=1', 'transpose=2'][ed.rot - 1]);
    if (ed.crop) { const c = ed.crop, e = (k, v) => `trunc(${k}*${v.toFixed(5)}/2)*2`; vf.push(`crop=${e('iw', c.w)}:${e('ih', c.h)}:${e('iw', c.x)}:${e('ih', c.y)}`) }
    if (encode) vf.push("scale='min(1080,iw)':-2");
    const a = ['-ss', String(ed.ts)].slice(ed.te ? 0 : 2); a.push('-i', file.path);
    if (useAud) { if (ed.ao) a.push('-ss', String(ed.ao)); a.push('-stream_loop', '-1', '-i', useAud.path) }
    const k = AMIX_NORM ? 1 : 2, hasA = pr.audio && ed.vo > 0; let fc = encode ? `[0:v:0]${vf.join(',')}[v];` : '', aMap = null;
    if (useAud && hasA) { fc += `[0:a:0]volume=${(ed.vo * k).toFixed(3)}[a0];[1:a:0]volume=${(ed.vm * k).toFixed(3)}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=0${AMIX_NORM ? ':normalize=0' : ''}[a];`; aMap = '[a]' }
    else if (useAud) { fc += `[1:a:0]volume=${ed.vm.toFixed(3)}[a];`; aMap = '[a]' }
    else if (hasA && ed.vo !== 1) { fc += `[0:a:0]volume=${ed.vo.toFixed(3)}[a];`; aMap = '[a]' }
    else if (hasA) aMap = '0:a:0';
    if (fc) a.push('-filter_complex', fc.replace(/;$/, ''));
    a.push('-map', encode ? '[v]' : '0:v:0'); if (aMap) a.push('-map', aMap);
    a.push(...(encode ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p'] : ['-c:v', 'copy']), '-c:a', 'aac', '-b:a', '128k', '-max_muxing_queue_size', '1024', '-movflags', '+faststart');
    if (ed.te) a.push('-t', String((ed.te - ed.ts).toFixed(3))); if (useAud) a.push('-shortest');
    await ffRun([...a, outp]);
    fs.unlink(file.path, () => {}); if (audio && !audio.keep) fs.unlink(audio.path, () => {}); return out;
  } catch (e) { fs.unlink(outp, () => {}); throw e }
}
const upload = multer({
  storage: multer.diskStorage({ destination: UP, filename: (q, f, cb) => cb(null, crypto.randomBytes(12).toString('hex') + (path.extname(f.originalname).toLowerCase().slice(0, 8) || '.png')) }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (q, f, cb) => cb(null, /^(video|image|audio)\//.test(f.mimetype))
});
const app = express(); app.set('trust proxy', 'loopback, linklocal, uniquelocal'); app.use(cors(), express.json());
['/admin', '/sistem', '/sistem.html'].forEach(rt => {
  app.get(rt, (q, s) => { s.setHeader('Cache-Control', 'no-store'); s.sendFile(path.join(__dirname, 'public', 'admin.html')) });
});
app.use((q, s, n) => {
  if (q.url.startsWith('/api/sistem')) q.url = '/api/admin' + q.url.slice(11);
  n();
});
app.use('/uploads', (q, s, n) => {   // file video yang ditakedown tidak boleh diputar publik, kecuali pratinjau panel sistem (?sistem=1)
  try {
    if (q.query && q.query.sistem === '1') return n();
    const f = decodeURIComponent(q.path.slice(1));
    if (f && db.prepare("SELECT 1 FROM videos WHERE file=? AND mod_status='blocked'").get(f)) return s.status(404).end();
  } catch {}
  n();
});
app.use('/uploads', express.static(UP, { maxAge: '7d', immutable: true }));
app.use(express.static(path.join(__dirname, 'public'), { setHeaders: (s, f) => { if (/(sw\.js|manifest\.webmanifest|index\.html|admin\.html|sistem\.html)$/.test(f)) s.setHeader('Cache-Control', 'no-store') } }));
const sign = u => jwt.sign({ id: u.id }, SECRET, { expiresIn: '30d' });
app.use((q, s, n) => { try { q.uid = jwt.verify(((q.headers.authorization || '').slice(7) || q.query.t || ''), SECRET).id } catch {} n() });
['/api/videos', '/api/audio'].forEach(base => app.use(base, (q, s, n) => {   // tautan memakai kode huruf acak, bukan nomor
  const m = q.url.match(/^\/([A-Za-z]{6,})(?=[\/?]|$)/);
  if (m) {
    const r = db.prepare('SELECT id FROM videos WHERE code=?').get(m[1]);
    if (!r) return s.status(404).json({ error: base === '/api/audio' ? 'Suara tidak ditemukan' : 'Video tidak ditemukan' });
    q.url = '/' + r.id + q.url.slice(m[0].length);
  }
  n();
}));
const me = id => db.prepare('SELECT * FROM users WHERE id=?').get(id);
const need = (q, s, n) => {
  if (!q.uid) return s.status(401).json({ error: 'Silakan masuk dulu' });
  const u = me(q.uid);
  if (!u) return s.status(401).json({ error: 'Silakan masuk dulu' });
  if (u.banned) return s.status(403).json({ error: 'Akun kamu telah diblokir oleh Sistem' + (u.ban_reason ? ': ' + u.ban_reason : ''), banned: true });
  n();
};
const cl = new Map();
const push = (u, ev, d) => (cl.get(u) || []).forEach(r => r.write(`event: ${ev}\ndata: ${JSON.stringify(d)}\n\n`));
app.get('/api/stream', need, (q, s) => {
  s.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  s.flushHeaders(); s.write('retry: 2000\n\n');
  if (!cl.has(q.uid)) cl.set(q.uid, new Set()); cl.get(q.uid).add(s);
  const hb = setInterval(() => s.write(':\n\n'), 20000);
  q.on('close', () => { clearInterval(hb); cl.get(q.uid).delete(s) });
});
const pub = u => ({ username: u.username, name: u.name, bio: u.bio, link: u.link || '', note: u.note || '', avatar: u.avatar, banner: u.banner, verified: !!u.verified, private: !!u.private, banned: !!u.banned });
const selfPub = u => ({ ...pub(u), email: u.email || '', birth_date: u.birth_date || '', visitors_on: u.visitors_on !== 0 });
const uidOf = name => (db.prepare('SELECT id FROM users WHERE username=?').get(String(name || '')) || {}).id;
const follows = (a, b) => !!db.prepare('SELECT 1 FROM follows WHERE a=? AND b=?').get(a, b);
const friends = (a, b) => follows(a, b) && follows(b, a);

/* Siapa boleh melihat video: publik, milik sendiri, atau 'friends' bila saling follow */
const VIS = u => `((v.privacy='public' OR v.privacy IS NULL OR v.user_id=${u} OR (v.privacy='friends' AND ${u}>0 AND EXISTS(SELECT 1 FROM follows f1 WHERE f1.a=${u} AND f1.b=v.user_id) AND EXISTS(SELECT 1 FROM follows f2 WHERE f2.a=v.user_id AND f2.b=${u})))
  AND (v.user_id=${u} OR NOT EXISTS(SELECT 1 FROM users po WHERE po.id=v.user_id AND po.private=1) OR (${u}>0 AND EXISTS(SELECT 1 FROM follows pf WHERE pf.a=${u} AND pf.b=v.user_id))))`;
const NON_PRIV = "IFNULL(v.privacy,'public')<>'private' AND IFNULL(v.mod_status,'auto')<>'blocked'";
const canView = (id, uid) => !!db.prepare(`SELECT 1 FROM videos v WHERE v.id=? AND IFNULL(v.mod_status,'auto')<>'blocked' AND ${VIS(U(uid))}`).get(id);
const owner = id => (db.prepare('SELECT user_id FROM videos WHERE id=?').get(id) || {}).user_id;

function notify(to, type, actor, vid, note = '') {
  if (!to || to === actor) return;
  vid = vid == null ? null : Number(vid);
  if (type !== 'comment' && type !== 'reply' && type !== 'warning' && type !== 'broadcast' && type !== 'appeal_ok' && type !== 'appeal_no' && db.prepare('SELECT 1 FROM notifs WHERE user_id=? AND type=? AND actor=? AND video_id IS ?').get(to, type, actor, vid)) return;
  const r = db.prepare('INSERT INTO notifs(user_id,type,actor,video_id,note) VALUES(?,?,?,?,?)').run(to, type, actor, vid, note), a = me(actor);
  push(to, 'notif', { id: Number(r.lastInsertRowid), type, video_id: vid, note, username: a.username, name: a.name, avatar: a.avatar, created: Math.floor(Date.now() / 1000), seen: 0 });
}
function mentions(text, actor, vid) {
  const done = new Set();
  for (const m of String(text || '').matchAll(/(?<![\w@])@([a-z0-9_.]{3,20})/gi)) {
    const name = m[1].replace(/\.+$/, '').toLowerCase();
    if (name.length < 3 || done.has(name)) continue; done.add(name);
    const t = uidOf(name); if (t && canView(vid, t)) notify(t, 'mention', actor, vid);
  }
}

/* ---------- Akun ---------- */
const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const cleanLink = raw => {
  let l = String(raw || '').trim().slice(0, 200);
  if (!l) return '';
  if (!/^https?:\/\//i.test(l)) l = 'https://' + l;
  try { const u = new URL(l); return /^https?:$/i.test(u.protocol) ? u.href.slice(0, 200) : '' } catch { return '' }
};
app.post('/api/register', (q, s) => {
  const { username, password } = q.body || {};
  let email = String((q.body || {}).email || '').trim();
  const dname = String((q.body || {}).name || '').replace(/\s+/g, ' ').trim().slice(0, 30);
  const bdate = String((q.body || {}).birth_date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bdate)) return bad(s, 400, 'Pilih tanggal lahir terlebih dahulu');
  const bdTime = Date.parse(bdate + 'T00:00:00Z');
  if (Number.isNaN(bdTime)) return bad(s, 400, 'Tanggal lahir tidak valid');
  const ageYears = (Date.now() - bdTime) / (365.25 * 86400 * 1000);
  if (ageYears < 13) return bad(s, 400, 'Maaf, kamu harus berusia minimal 13 tahun untuk mendaftar di Zippy');
  if (ageYears > 120) return bad(s, 400, 'Tahun lahir tidak valid');
  if (!/^[a-z0-9_.]{3,20}$/i.test(username || '')) return bad(s, 400, 'Username 3-20 karakter: huruf, angka, _ atau .');
  if ((password || '').length < 6) return bad(s, 400, 'Password minimal 6 karakter');
  if (email && (!EMAIL.test(email) || email.length > 100)) return bad(s, 400, 'Format email tidak valid');
  if (db.prepare('SELECT 1 FROM users WHERE username=?').get(username)) return bad(s, 409, 'Username sudah dipakai');
  if (email && db.prepare('SELECT 1 FROM users WHERE email=? COLLATE NOCASE').get(email)) return bad(s, 409, 'Email sudah dipakai akun lain');
  const r = db.prepare('INSERT INTO users(username,pass,email,name,birth_date) VALUES(?,?,?,?,?)').run(username, bcrypt.hashSync(password, 10), email || null, dname, bdate);
  s.json({ token: sign({ id: r.lastInsertRowid }), user: selfPub(me(r.lastInsertRowid)) });
});
app.post('/api/login', (q, s) => {
  const { username, password } = q.body || {}, id = String(username || '').trim();
  if (throttle('login:' + q.ip + ':' + id.toLowerCase(), 10, 600e3)) return bad(s, 429, 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.');
  const u = db.prepare('SELECT * FROM users WHERE username=? OR (email IS NOT NULL AND email=? COLLATE NOCASE)').get(id, id);
  if (!u || !bcrypt.compareSync(password || '', u.pass)) return bad(s, 401, 'Username/email atau password salah');
  if (u.banned) return bad(s, 403, 'Akun kamu telah diblokir oleh Sistem' + (u.ban_reason ? ': ' + u.ban_reason : ''));
  s.json({ token: sign(u), user: selfPub(u) });
});
app.get('/api/me', need, (q, s) => s.json({ user: selfPub(me(q.uid)) }));
app.put('/api/me', need, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), (q, s) => {
  const f = q.files || {}, u = me(q.uid);
  let link = u.link || '';
  if (q.body.link !== undefined) {
    const rawL = String(q.body.link || '').trim();
    if (rawL && !cleanLink(rawL)) return bad(s, 400, 'Format tautan tidak valid');
    link = cleanLink(rawL);
  }
  const note = q.body.note !== undefined ? String(q.body.note || '').trim().slice(0, 40) : (u.note || '');
  const bannerVal = f.banner ? f.banner[0].filename
    : /^g:[1-8]$/.test(q.body.banner_preset || q.body.banner || '') ? (q.body.banner_preset || q.body.banner)
    : u.banner;
  db.prepare('UPDATE users SET name=?,bio=?,link=?,note=?,avatar=?,banner=? WHERE id=?').run(
    q.body.name !== undefined ? String(q.body.name).trim().slice(0, 30) : u.name,
    q.body.bio !== undefined ? String(q.body.bio).slice(0, 150) : u.bio,
    link,
    note,
    f.avatar ? f.avatar[0].filename : u.avatar,
    bannerVal,
    q.uid
  );
  s.json({ user: selfPub(me(q.uid)) });
});
app.put('/api/me/password', need, (q, s) => {
  const { old, pass } = q.body || {}, u = me(q.uid);
  if (throttle('pw:' + q.uid, 8, 600e3)) return bad(s, 429, 'Terlalu banyak percobaan. Coba lagi nanti.');
  if (!bcrypt.compareSync(String(old || ''), u.pass)) return bad(s, 401, 'Sandi saat ini salah');
  if (String(pass || '').length < 6) return bad(s, 400, 'Sandi baru minimal 6 karakter');
  if (pass === old) return bad(s, 400, 'Sandi baru harus berbeda dari sandi lama');
  db.prepare('UPDATE users SET pass=? WHERE id=?').run(bcrypt.hashSync(String(pass), 10), q.uid); s.json({ ok: true });
});
app.put('/api/me/email', need, (q, s) => {
  const email = String((q.body || {}).email || '').trim(), u = me(q.uid);
  if (throttle('em:' + q.uid, 8, 600e3)) return bad(s, 429, 'Terlalu banyak percobaan. Coba lagi nanti.');
  if (!bcrypt.compareSync(String((q.body || {}).password || ''), u.pass)) return bad(s, 401, 'Sandi salah');
  if (email && (!EMAIL.test(email) || email.length > 100)) return bad(s, 400, 'Format email tidak valid');
  if (email && db.prepare('SELECT 1 FROM users WHERE email=? COLLATE NOCASE AND id<>?').get(email, q.uid)) return bad(s, 409, 'Email sudah dipakai akun lain');
  db.prepare('UPDATE users SET email=? WHERE id=?').run(email || null, q.uid); s.json({ user: selfPub(me(q.uid)) });
});

/* ---------- Stiker Kustom ---------- */
app.get('/api/me/stickers', need, (q, s) => {
  const rows = db.prepare('SELECT id,file,created FROM custom_stickers WHERE user_id=? ORDER BY id DESC LIMIT 120').all(q.uid);
  s.json({ stickers: rows });
});
app.post('/api/me/stickers', need, upload.single('sticker'), (q, s) => {
  let file = '';
  if (q.file) {
    if (!q.file.mimetype.startsWith('image/')) { fs.unlink(q.file.path, () => {}); return bad(s, 400, 'Stiker harus berupa gambar') }
    file = q.file.filename;
  } else if (q.body && q.body.file) {
    const clean = String(q.body.file).replace(/^c:/, '').trim();
    if (/^[a-z0-9_.-]+\.(png|jpg|jpeg|webp)$/i.test(clean) && fs.existsSync(path.join(UP, clean))) file = clean;
  }
  if (!file) return bad(s, 400, 'File stiker tidak valid');
  db.prepare('INSERT OR IGNORE INTO custom_stickers(user_id,file) VALUES(?,?)').run(q.uid, file);
  const st = db.prepare('SELECT id,file,created FROM custom_stickers WHERE user_id=? AND file=?').get(q.uid, file);
  s.json({ sticker: st });
});
app.delete('/api/me/stickers/:id', need, (q, s) => {
  const st = db.prepare('SELECT * FROM custom_stickers WHERE id=? AND user_id=?').get(q.params.id, q.uid);
  if (!st) return bad(s, 404, 'Stiker tidak ditemukan');
  db.prepare('DELETE FROM custom_stickers WHERE id=?').run(st.id);
  s.json({ ok: true });
});

/* ---------- Video & Audio ---------- */
const SEL = u => `SELECT v.id,v.code,COALESCE(av.code, v.code) audio_code,v.caption,v.file,v.created,v.privacy,v.loc,v.rot,u.username,u.name,u.avatar,u.verified,u.private,v.views,v.stitch,
COALESCE(av.id, v.id) audio_id,
COALESCE(NULLIF(v.audio_title,''), NULLIF(av.audio_title,''), 'Suara Asli - ' || COALESCE(NULLIF(au.name,''), au.username, NULLIF(u.name,''), u.username)) audio_title,
COALESCE(au.username, u.username) audio_u,
COALESCE(NULLIF(au.name,''), au.username, NULLIF(u.name,''), u.username) audio_name,
COALESCE(au.avatar, u.avatar) audio_avatar,
COALESCE(av.file, v.file) audio_file,
(SELECT x.username FROM videos w JOIN users x ON x.id=w.user_id WHERE w.id=v.stitch) stitch_u,
(SELECT COALESCE(NULLIF(x.name,''),x.username) FROM videos w JOIN users x ON x.id=w.user_id WHERE w.id=v.stitch) stitch_n,
(SELECT COUNT(*) FROM likes WHERE video_id=v.id) likes,
(SELECT COUNT(*) FROM comments WHERE video_id=v.id) comments,
(SELECT COUNT(*) FROM reposts WHERE video_id=v.id) reposts,
EXISTS(SELECT 1 FROM likes WHERE video_id=v.id AND user_id=${u}) liked,
EXISTS(SELECT 1 FROM saves WHERE video_id=v.id AND user_id=${u}) saved,
EXISTS(SELECT 1 FROM reposts WHERE video_id=v.id AND user_id=${u}) reposted,
(SELECT note FROM reposts WHERE video_id=v.id AND user_id=${u}) my_note,
(SELECT created FROM reposts WHERE video_id=v.id AND user_id=${u}) my_at,
EXISTS(SELECT 1 FROM follows WHERE a=${u} AND b=u.id) following,
EXISTS(SELECT 1 FROM follow_requests WHERE a=${u} AND b=u.id) requested,
EXISTS(SELECT 1 FROM stories st WHERE st.user_id=u.id AND st.created>strftime('%s','now')-86400 AND (u.id=${u} OR u.private=0 OR EXISTS(SELECT 1 FROM follows ff WHERE ff.a=${u} AND ff.b=u.id))) has_story,
EXISTS(SELECT 1 FROM stories st LEFT JOIN story_views sv ON sv.story_id=st.id AND sv.user_id=${u} WHERE st.user_id=u.id AND st.created>strftime('%s','now')-86400 AND (${u}=0 OR sv.user_id IS NULL) AND (u.id=${u} OR u.private=0 OR EXISTS(SELECT 1 FROM follows ff WHERE ff.a=${u} AND ff.b=u.id))) story_unseen
FROM videos v JOIN users u ON u.id=v.user_id
LEFT JOIN videos av ON av.id=v.audio_id
LEFT JOIN users au ON au.id=av.user_id`;

const fix = v => ({
  ...v,
  privacy: v.privacy || 'public',
  liked: !!v.liked,
  saved: !!v.saved,
  reposted: !!v.reposted,
  has_story: !!v.has_story,
  story_unseen: !!v.story_unseen,
  verified: !!v.verified,
  private: !!v.private,
  following: !!v.following,
  requested: !!v.requested,
  my_note: v.my_note || '',
  views: v.views || 0,
  audio_id: v.audio_id || v.id,
  audio_title: v.audio_title || ('Suara Asli - ' + (v.audio_name || v.name || v.username)),
  audio_u: v.audio_u || v.username,
  audio_name: v.audio_name || v.name || v.username,
  audio_avatar: v.audio_avatar !== undefined ? v.audio_avatar : v.avatar,
  audio_file: v.audio_file || v.file
});
const vids = (uid, where = '', args = [], tail = 'ORDER BY v.id DESC LIMIT 100') => {
  const u = U(uid);
  return db.prepare(`${SEL(u)} WHERE ${VIS(u)} AND IFNULL(v.mod_status,'auto')<>'blocked'${where ? ' AND (' + where + ')' : ''} ${tail}`).all(...args).map(fix);
};
const byIds = (uid, ids) => {
  if (!ids.length) return [];
  const m = new Map(vids(uid, `v.id IN (${ids.map(Number).join(',')})`, [], '').map(v => [v.id, v]));
  return ids.map(i => m.get(i)).filter(Boolean);
};
const noVideo = s => bad(s, 404, 'Video tidak ditemukan');

/* ---------- Beranda: Video yang sudah muncul tidak dimunculkan lagi ---------- */
app.post('/api/feed/seen', (q, s) => {
  const u = U(q.uid);
  if (!u) return s.json({ ok: true });
  const ids = Array.isArray((q.body || {}).ids) ? q.body.ids : [];
  const ins = db.prepare('INSERT OR IGNORE INTO feed_seen(user_id,video_id) VALUES(?,?)');
  for (const raw of ids.slice(0, 200)) {
    const id = parseInt(raw) || 0;
    if (id > 0) { try { ins.run(u, id) } catch {} }
  }
  s.json({ ok: true });
});

app.get('/api/feed', (q, s) => {
  const u = U(q.uid), lim = clamp(parseInt(q.query.limit) || 8, 1, 30), off = Math.max(0, parseInt(q.query.offset) || 0), Q = q.query;
  const tag = String(Q.tag || '').replace(/[^\p{L}\p{N}_]/gu, '').toLowerCase(), loc = String(Q.loc || '').trim().slice(0, 80);
  const page = (where, args) => {
    const total = db.prepare(`SELECT COUNT(*) c FROM videos v WHERE ${VIS(u)} AND ${NON_PRIV} AND (${where})`).get(...args).c;
    const videos = vids(u, `${NON_PRIV} AND (${where})`, args, `ORDER BY v.id DESC LIMIT ${lim} OFFSET ${off}`);
    return { videos, total, next: off + videos.length, more: off + videos.length < total };
  };
  if (tag) return s.json(page('v.id IN (SELECT video_id FROM vtags WHERE tag=?)', [tag]));
  if (loc) return s.json(page('v.loc=?', [loc]));

  // Kumpulkan ID video yang sudah pernah muncul di Beranda pengguna ini (dari parameter exclude + tabel feed_seen)
  const excludedSet = new Set(
    String(Q.exclude || '').split(',').map(x => parseInt(x)).filter(x => Number.isInteger(x) && x > 0)
  );
  if (u > 0) {
    db.prepare('SELECT video_id FROM feed_seen WHERE user_id=?').all(u).forEach(r => excludedSet.add(r.video_id));
  }
  const markSeenBatch = ids => {
    if (u > 0 && ids.length) {
      const ins = db.prepare('INSERT OR IGNORE INTO feed_seen(user_id,video_id) VALUES(?,?)');
      ids.forEach(id => { try { ins.run(u, id) } catch {} });
    }
  };

  if (Q.tab === 'following') {
    if (!u) return s.json({ videos: [], more: false, next: 0 });
    const allRows = db.prepare(`SELECT vid,MAX(ts) ts,rp FROM (
      SELECT v.id vid,v.created ts,NULL rp FROM videos v WHERE v.user_id IN (SELECT b FROM follows WHERE a=${u}) AND ${NON_PRIV}
      UNION ALL SELECT r.video_id,r.created,r.user_id FROM reposts r JOIN videos v ON v.id=r.video_id WHERE r.user_id IN (SELECT b FROM follows WHERE a=${u}) AND ${NON_PRIV}
    ) GROUP BY vid ORDER BY ts DESC LIMIT 1000`).all();
    const unseenRows = allRows.filter(r => !excludedSet.has(r.vid));
    const rows = unseenRows.slice(0, lim);
    const pickedIds = rows.map(r => r.vid);
    markSeenBatch(pickedIds);
    const rp = new Map(rows.map(r => [r.vid, r.rp])), info = id => rp.get(id) && db.prepare('SELECT x.username,x.name,r.note,r.created FROM reposts r JOIN users x ON x.id=r.user_id WHERE r.user_id=? AND r.video_id=?').get(rp.get(id), id),
      videos = byIds(u, pickedIds).map(v => { const i = info(v.id); return { ...v, rp_u: i ? i.username : null, rp_name: i ? (i.name || i.username) : null, rp_note: i ? i.note || '' : '', rp_at: i ? i.created : null } });
    return s.json({ videos, next: off + rows.length, more: unseenRows.length > rows.length });
  }
  const seed = parseInt(Q.seed) || 1, upto = parseInt(Q.upto) || 0;
  const all = db.prepare(`SELECT v.id FROM videos v WHERE ${VIS(u)} AND ${NON_PRIV}${upto ? ' AND v.id<=' + upto : ''} ORDER BY v.id DESC LIMIT 3000`).all().map(r => r.id);
  const order = shuffle(all, seed).filter(id => !excludedSet.has(id));
  const ids = order.slice(0, lim);
  markSeenBatch(ids);
  s.json({ videos: byIds(u, ids), next: off + ids.length, more: order.length > ids.length, top: all[0] || 0 });
});

/* ---------- Halaman Audio (Suara Asli) & Audio Terpopuler (Bebas Bug) ---------- */
app.get('/api/audios/popular', (q, s) => {
  const u = U(q.uid), sq = String(q.query.q || '').trim().slice(0, 40);
  let where = `${VIS(u)} AND ${NON_PRIV}`, args = [];
  if (sq) {
    const t = '%' + like(sq) + '%';
    where += " AND (COALESCE(NULLIF(av.audio_title,''), NULLIF(v.audio_title,''), 'Suara Asli') LIKE ? ESCAPE '\\' OR COALESCE(au.username, u.username) LIKE ? ESCAPE '\\' OR COALESCE(au.name, u.name) LIKE ? ESCAPE '\\' OR v.caption LIKE ? ESCAPE '\\')";
    args.push(t, t, t, t);
  }
  const rows = db.prepare(`SELECT COALESCE(av.id, v.id) id,
    COALESCE(NULLIF(av.audio_title,''), NULLIF(v.audio_title,''), 'Suara Asli - ' || COALESCE(NULLIF(au.name,''), au.username, NULLIF(u.name,''), u.username)) title,
    COALESCE(av.file, v.file) file,
    COALESCE(au.username, u.username) username,
    COALESCE(NULLIF(au.name,''), au.username, NULLIF(u.name,''), u.username) name,
    COALESCE(au.avatar, u.avatar) avatar,
    COALESCE(au.verified, u.verified) verified,
    COUNT(DISTINCT v.id) total,
    MAX(v.views) max_views,
    EXISTS(SELECT 1 FROM audio_saves a WHERE a.user_id=${u} AND a.audio_id=COALESCE(av.id, v.id)) saved
    FROM videos v
    JOIN users u ON u.id=v.user_id
    LEFT JOIN videos av ON av.id=v.audio_id
    LEFT JOIN users au ON au.id=av.user_id
    WHERE ${where}
    GROUP BY COALESCE(av.id, v.id)
    ORDER BY total DESC, max_views DESC, id DESC LIMIT 40`).all(...args);
  s.json({ audios: rows.map(r => ({ ...r, id: Number(r.id), total: Number(r.total || 1), verified: !!r.verified, saved: !!r.saved })) });
});

app.get('/api/audio/:id', (q, s) => {
  const u = U(q.uid), id = parseInt(q.params.id) || 0;
  const src = db.prepare("SELECT v.id,v.code,v.file,v.audio_title,v.created,u.username,u.name,u.avatar,u.verified FROM videos v JOIN users u ON u.id=v.user_id WHERE v.id=? AND IFNULL(v.mod_status,'auto')<>'blocked'").get(id);
  if (!src) return bad(s, 404, 'Suara tidak ditemukan');
  const sq = String(q.query.q || '').trim().slice(0, 40);
  let where = `${NON_PRIV} AND (v.id=? OR v.audio_id=?)`, args = [id, id];
  if (sq) {
    const t = '%' + like(sq) + '%';
    where += " AND (v.caption LIKE ? ESCAPE '\\' OR u.username LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\')";
    args.push(t, t, t);
  }
  const total = db.prepare(`SELECT COUNT(*) c FROM videos v WHERE ${VIS(u)} AND ${NON_PRIV} AND (v.id=? OR v.audio_id=?)`).get(id, id).c;
  const videos = vids(u, where, args, `ORDER BY (v.id=${id}) DESC, v.views DESC, v.id DESC LIMIT 90`);
  const saved = !!u && !!db.prepare('SELECT 1 FROM audio_saves WHERE user_id=? AND audio_id=?').get(u, id);
  s.json({
    audio: {
      id: src.id,
      code: src.code,
      title: src.audio_title || ('Suara Asli - ' + (src.name || src.username)),
      file: src.file,
      username: src.username,
      name: src.name || src.username,
      avatar: src.avatar,
      verified: !!src.verified,
      saved,
      total
    },
    videos
  });
});
app.post('/api/audio/:id/save', need, (q, s) => {
  const id = parseInt(q.params.id) || 0;
  if (!db.prepare('SELECT 1 FROM videos WHERE id=?').get(id)) return bad(s, 404, 'Suara tidak ditemukan');
  const had = db.prepare('DELETE FROM audio_saves WHERE user_id=? AND audio_id=?').run(q.uid, id).changes;
  if (!had) db.prepare('INSERT OR IGNORE INTO audio_saves(user_id,audio_id) VALUES(?,?)').run(q.uid, id);
  s.json({ saved: !had });
});
app.get('/api/me/saved-audios', need, (q, s) => {
  const u = U(q.uid);
  const rows = db.prepare(`SELECT v.id,COALESCE(NULLIF(v.audio_title,''),'Suara Asli - ' || COALESCE(NULLIF(u.name,''),u.username)) title,v.file,u.username,COALESCE(NULLIF(u.name,''),u.username) name,u.avatar,u.verified,
    (SELECT COUNT(*) FROM videos x WHERE ${VIS(u).replace(/v\./g, 'x.')} AND ${NON_PRIV.replace(/v\./g, 'x.')} AND (x.id=v.id OR x.audio_id=v.id)) total
    FROM audio_saves a JOIN videos v ON v.id=a.audio_id JOIN users u ON u.id=v.user_id
    WHERE a.user_id=? ORDER BY a.created DESC LIMIT 100`).all(q.uid);
  s.json({ audios: rows.map(r => ({ ...r, id: Number(r.id), total: Number(r.total || 1), verified: !!r.verified, saved: true })) });
});

/* ---------- Takedown & Pengajuan Banding Video ---------- */
const getLatestAppeal = vid => db.prepare('SELECT id,reason,status,note,created,decided FROM video_appeals WHERE video_id=? ORDER BY id DESC LIMIT 1').get(vid) || null;
const takedownStub = r => ({
  id: r.id,
  code: r.code,
  caption: r.caption || '',
  created: r.created,
  privacy: r.privacy || 'public',
  takedown: true,
  file: '',
  appeal: getLatestAppeal(r.id)
});
app.get('/api/videos/:id', (q, s) => {
  const row = db.prepare('SELECT id,code,caption,created,privacy,user_id,mod_status FROM videos WHERE id=?').get(q.params.id);
  if (row && row.mod_status === 'blocked') return q.uid && row.user_id === q.uid ? s.json({ video: takedownStub(row) }) : noVideo(s);
  const v = vids(q.uid, 'v.id=?', [q.params.id])[0]; v ? s.json({ video: v }) : noVideo(s);
});
app.get('/api/videos/:id/appeal', need, (q, s) => {
  const row = db.prepare('SELECT id,code,caption,created,privacy,user_id,mod_status FROM videos WHERE id=? AND user_id=?').get(q.params.id, q.uid);
  if (!row) return noVideo(s);
  s.json({ video: row.mod_status === 'blocked' ? takedownStub(row) : vids(q.uid, 'v.id=?', [row.id])[0], appeal: getLatestAppeal(row.id) });
});
app.post('/api/videos/:id/appeal', need, (q, s) => {
  const row = db.prepare('SELECT id,code,caption,created,privacy,user_id,mod_status FROM videos WHERE id=? AND user_id=?').get(q.params.id, q.uid);
  if (!row) return noVideo(s);
  if (row.mod_status !== 'blocked') return bad(s, 400, 'Video ini tidak dalam status takedown');
  const reason = String((q.body || {}).reason || '').trim().slice(0, 500);
  if (reason.length < 5) return bad(s, 400, 'Jelaskan alasan banding minimal 5 karakter');
  const last = getLatestAppeal(row.id);
  if (last && last.status === 'pending') return bad(s, 409, 'Pengajuan banding untuk video ini masih menunggu keputusan sistem');
  db.prepare("INSERT INTO video_appeals(video_id,user_id,reason,status) VALUES(?,?,?,'pending')").run(row.id, q.uid, reason);
  s.json({ ok: true, video: takedownStub(row), appeal: getLatestAppeal(row.id) });
});

const cleanLoc = t => String(t || '').replace(/\s+/g, ' ').trim().slice(0, 80);
app.get('/api/capabilities', (q, s) => s.json({ edit: !!FFMPEG }));
const dropFiles = (...fs_) => fs_.forEach(x => x && !x.keep && fs.unlink(x.path, () => {}));
async function applyEdits(q, file, audio) {
  const ed = parseEdits(q.body), need = !!(ed.te || ed.crop || audio || ed.vo !== 1);
  if (!need) return { file: file.filename, rot: ed.rot };
  if (!FFMPEG) {
    if (audio && audio.keep) return { file: file.filename, rot: ed.rot };
    throw { status: 501, msg: 'Fitur pangkas, crop, dan audio butuh ffmpeg di server. Posting tanpa edit, atau minta sistem memasang ffmpeg.' };
  }
  if (busyFF >= 2) throw { status: 503, msg: 'Server sedang memproses video lain. Coba lagi sebentar.' };
  busyFF++;
  try {
    return { file: await bake(file, audio, ed), rot: 0 };
  } catch (e) {
    console.error('ffmpeg:', String(e.message || e).slice(-400));
    if (audio && audio.keep && !ed.te && !ed.crop) return { file: file.filename, rot: ed.rot };
    throw { status: 422, msg: 'Video tidak bisa diproses. Coba video atau audio lain.' };
  } finally { busyFF-- }
}
const VF = [{ name: 'video', maxCount: 1 }, { name: 'audio', maxCount: 1 }];
app.post('/api/videos', need, upload.fields(VF), async (q, s) => {
  const f = ((q.files || {}).video || [])[0]; let au = ((q.files || {}).audio || [])[0];
  try {
    if (!f) { dropFiles(au); return bad(s, 400, 'Pilih file video') }
    if (!f.mimetype.startsWith('video/')) { dropFiles(f, au); return bad(s, 400, 'File harus berupa video') }
    const aid = parseInt(q.body.audio_id) || null;
    const srcVid = aid ? db.prepare("SELECT v.id,v.file,COALESCE(NULLIF(v.audio_title,''),'Suara Asli - ' || COALESCE(NULLIF(u.name,''),u.username)) title FROM videos v JOIN users u ON u.id=v.user_id WHERE v.id=?").get(aid) : null;
    const ed = parseEdits(q.body);
    const hasEditorChanges = !!(ed.te || ed.crop || au || ed.vo !== 1);
    if (srcVid && !au && FFMPEG && hasEditorChanges) {
      const sp = path.join(UP, srcVid.file);
      if (fs.existsSync(sp)) { au = { path: sp, keep: true }; if (q.body.vol_orig === undefined) q.body.vol_orig = '0' }
    }
    let r; try { r = await applyEdits(q, f, au) } catch (e) { dropFiles(f, au); return bad(s, e.status || 500, e.msg || 'Gagal memproses video') }
    const vscan = await visualScan(path.join(UP, r.file), f.originalname);   // dipindai sebelum tayang, caption kosong pun diperiksa
    const cap = String(q.body.caption || '').slice(0, 150), pv = PRIV.includes(q.body.privacy) ? q.body.privacy : 'public';
    const atitle = String(q.body.audio_title || (srcVid ? srcVid.title : '') || '').trim().slice(0, 60);
    const ins = db.prepare('INSERT INTO videos(user_id,caption,file,stitch,privacy,loc,rot,audio_id,audio_title,code) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .run(q.uid, cap, r.file, parseInt(q.body.stitch) || null, pv, cleanLoc(q.body.loc), r.rot, srcVid ? srcVid.id : null, atitle, genCode());
    const id = Number(ins.lastInsertRowid); setTags(id, cap); mentions(cap, q.uid, id);
    saveVisual(id, vscan); const mres = runVideoAutoMod(id);
    const blockedNow = !!mres && mres.mod_status === 'blocked';
    s.json({ video: blockedNow ? takedownStub(db.prepare('SELECT id,code,caption,created,privacy FROM videos WHERE id=?').get(id)) : vids(q.uid, 'v.id=?', [id])[0], moderation: { status: mres ? mres.mod_status : 'auto', blocked: blockedNow, review: !!mres && mres.mod_status === 'flagged', categories: mres ? mres.categories : [] } });
  } catch (e) { console.error(e); dropFiles(f, au); bad(s, 500, 'Terjadi kesalahan di server') }
});
app.put('/api/videos/:id', need, (q, s) => {
  const v = db.prepare('SELECT * FROM videos WHERE id=? AND user_id=?').get(q.params.id, q.uid); if (!v) return noVideo(s);
  const b = q.body || {}, cap = b.caption !== undefined ? String(b.caption).slice(0, 150) : v.caption;
  db.prepare('UPDATE videos SET caption=?,privacy=?,rot=?,loc=? WHERE id=?').run(cap, PRIV.includes(b.privacy) ? b.privacy : v.privacy,
    b.rot !== undefined ? clamp(parseInt(b.rot) || 0, 0, 3) : v.rot, b.loc !== undefined ? cleanLoc(b.loc) : v.loc, v.id);
  if (b.caption !== undefined) { setTags(v.id, cap); runVideoAutoMod(v.id); }
  s.json({ video: vids(q.uid, 'v.id=?', [v.id])[0] });
});
app.delete('/api/videos/:id', need, (q, s) => {
  const v = db.prepare('SELECT * FROM videos WHERE id=? AND user_id=?').get(q.params.id, q.uid);
  if (!v) return noVideo(s);
  db.prepare('DELETE FROM videos WHERE id=?').run(v.id); fs.unlink(path.join(UP, v.file), () => {}); s.json({ ok: true });
});
const toggle = (table, notifyType, fmt) => (q, s) => {
  if (!canView(q.params.id, q.uid)) return noVideo(s);
  const a = [q.uid, q.params.id];
  const had = db.prepare(`DELETE FROM ${table} WHERE user_id=? AND video_id=?`).run(...a).changes;
  if (!had) { db.prepare(`INSERT INTO ${table}(user_id,video_id) VALUES(?,?)`).run(...a); if (notifyType) notify(owner(q.params.id), notifyType, q.uid, q.params.id) }
  const n = c => db.prepare(`SELECT COUNT(*) c FROM ${c} WHERE video_id=?`).get(q.params.id).c;
  s.json(fmt({ on: !had, count: n(table) }));
};
app.post('/api/videos/:id/like', need, toggle('likes', 'like', d => ({ liked: d.on, likes: d.count })));
app.post('/api/videos/:id/save', need, toggle('saves', null, d => ({ saved: d.on })));
const repostCount = id => db.prepare('SELECT COUNT(*) c FROM reposts WHERE video_id=?').get(id).c;
app.post('/api/videos/:id/repost', need, (q, s) => {
  if (!canView(q.params.id, q.uid)) return noVideo(s);
  const v = db.prepare('SELECT v.user_id,v.privacy,u.private FROM videos v JOIN users u ON u.id=v.user_id WHERE v.id=?').get(q.params.id), id = Number(q.params.id);
  if (v.user_id === q.uid) return bad(s, 400, 'Kamu tidak bisa me-repost videomu sendiri');
  const note = String((q.body || {}).note || '').replace(/\s+/g, ' ').trim().slice(0, 200), had = db.prepare('SELECT 1 FROM reposts WHERE user_id=? AND video_id=?').get(q.uid, id);
  if (!had && (v.privacy !== 'public' || v.private)) return bad(s, 400, 'Video ini tidak bisa di-repost');
  if (had) db.prepare('UPDATE reposts SET note=? WHERE user_id=? AND video_id=?').run(note, q.uid, id);
  else { db.prepare('INSERT INTO reposts(user_id,video_id,note) VALUES(?,?,?)').run(q.uid, id, note); notify(v.user_id, 'repost', q.uid, id) }
  if (note) mentions(note, q.uid, id);
  s.json({ reposted: true, reposts: repostCount(id), note, created: Math.floor(Date.now() / 1000) });
});
app.delete('/api/videos/:id/repost', need, (q, s) => { db.prepare('DELETE FROM reposts WHERE user_id=? AND video_id=?').run(q.uid, q.params.id); s.json({ reposted: false, reposts: repostCount(q.params.id) }) });
const viewSeen = new Map(); setInterval(() => viewSeen.clear(), 3600e3).unref();
app.post('/api/videos/:id/view', (q, s) => {
  const id = parseInt(q.params.id) || 0; if (!id || !canView(id, q.uid)) return noVideo(s);
  if (q.uid) { try { db.prepare('INSERT OR IGNORE INTO feed_seen(user_id,video_id) VALUES(?,?)').run(q.uid, id) } catch {} }
  const v = db.prepare('SELECT user_id,views FROM videos WHERE id=?').get(id), key = (q.uid || 'ip:' + q.ip) + ':' + id; let n = v.views || 0;
  if (v.user_id !== q.uid && !viewSeen.has(key)) { viewSeen.set(key, 1); db.prepare('UPDATE videos SET views=IFNULL(views,0)+1 WHERE id=?').run(id); n++ }
  s.json({ views: n });
});
app.post('/api/videos/:id/share', need, (q, s) => {
  if (!canView(q.params.id, q.uid)) return noVideo(s);
  notify(owner(q.params.id), 'share', q.uid, q.params.id); s.json({ ok: true });
});

/* ---------- Komentar (mendukung Stiker Kustom, Pin Komentar & Lencana Pembuat) ---------- */
const CM = `SELECT c.id,c.text,c.created,c.media,c.kind,c.pinned,c.parent,c.rto,u.username,u.name,u.avatar,u.verified,
  (SELECT u2.username FROM comments c2 JOIN users u2 ON u2.id=c2.user_id WHERE c2.id=c.rto) reply_u,
  (SELECT COALESCE(NULLIF(u2.name,''),u2.username) FROM comments c2 JOIN users u2 ON u2.id=c2.user_id WHERE c2.id=c.rto) reply_n
  FROM comments c JOIN users u ON u.id=c.user_id`;
app.get('/api/videos/:id/comments', (q, s) => canView(q.params.id, q.uid)
  ? s.json({ comments: db.prepare(`${CM} WHERE c.video_id=? ORDER BY c.pinned DESC, c.id DESC LIMIT 200`).all(q.params.id).map(x => ({ ...x, pinned: !!x.pinned, verified: !!x.verified })) })
  : noVideo(s));
const mk = q => {
  const f = q.file, rawSt = String(q.body.sticker || '');
  const st = (/^s:([1-9]|1[0-2])$/.test(rawSt) || /^c:[a-z0-9_.-]+\.(png|jpg|jpeg|webp)$/i.test(rawSt)) ? rawSt : null;
  const sid = parseInt(q.body.story) || 0, sr = sid && db.prepare('SELECT id,file,kind FROM stories WHERE id=?').get(sid);
  if (sr) return ['story_reply', `${sr.id}:${sr.kind}:${sr.file}`];
  const vv = parseInt(q.body.video) || 0, vr = vv && canView(vv, q.uid) && db.prepare('SELECT file FROM videos WHERE id=?').get(vv);
  return vr ? ['video', vv + ':' + vr.file] : f ? [f.mimetype.startsWith('audio/') ? 'audio' : 'image', f.filename] : st ? ['sticker', st] : [null, null];
};
app.post('/api/videos/:id/comments', need, upload.single('file'), (q, s) => {
  const [kind, media] = mk(q), t = String(q.body.text || '').trim().slice(0, 300);
  if (!t && !kind) return bad(s, 400, 'Komentar masih kosong');
  if (!canView(q.params.id, q.uid)) return noVideo(s);
  let parent = null, rto = null, target = null;
  const pid = parseInt(q.body.parent) || 0;
  if (pid) {   // balasan: selalu digantung ke komentar utama, tujuan balasan disimpan di rto
    const pc = db.prepare('SELECT id,video_id,user_id,parent FROM comments WHERE id=?').get(pid);
    if (!pc || Number(pc.video_id) !== Number(q.params.id)) return bad(s, 404, 'Komentar yang dibalas sudah tidak ada');
    parent = pc.parent || pc.id; rto = pc.id; target = pc.user_id;
  }
  const r = db.prepare('INSERT INTO comments(video_id,user_id,text,media,kind,parent,rto) VALUES(?,?,?,?,?,?,?)').run(q.params.id, q.uid, t, media, kind, parent, rto);
  const vo = owner(q.params.id);
  if (target && target !== q.uid) notify(target, 'reply', q.uid, q.params.id, (t || '').slice(0, 80));
  if (vo !== target) notify(vo, 'comment', q.uid, q.params.id);
  mentions(t, q.uid, q.params.id);
  const cm = db.prepare(`${CM} WHERE c.id=?`).get(r.lastInsertRowid);
  s.json({ comment: { ...cm, pinned: !!cm.pinned, verified: !!cm.verified } });
});
app.post('/api/comments/:id/pin', need, (q, s) => {
  const c = db.prepare('SELECT c.id,c.video_id,c.pinned,c.parent,v.user_id vo FROM comments c JOIN videos v ON v.id=c.video_id WHERE c.id=?').get(q.params.id);
  if (!c) return bad(s, 404, 'Komentar tidak ditemukan');
  if (c.parent) return bad(s, 400, 'Hanya komentar utama yang bisa disematkan');
  if (c.vo !== q.uid) return bad(s, 403, 'Hanya pembuat video yang bisa menyematkan komentar');
  const next = c.pinned ? 0 : 1;
  db.prepare('UPDATE comments SET pinned=? WHERE id=?').run(next, c.id);
  s.json({ pinned: !!next });
});
app.delete('/api/comments/:id', need, (q, s) => {
  const c = db.prepare('SELECT c.*,v.user_id vo FROM comments c JOIN videos v ON v.id=c.video_id WHERE c.id=?').get(q.params.id);
  if (!c || (c.user_id !== q.uid && c.vo !== q.uid)) return bad(s, 404, 'Komentar tidak ditemukan');
  const reps = db.prepare('SELECT id,media,kind FROM comments WHERE parent=?').all(c.id);   // balasan ikut terhapus
  reps.forEach(x => { if (x.media && x.kind === 'image') fs.unlink(path.join(UP, x.media), () => {}) });
  db.prepare('DELETE FROM comments WHERE parent=?').run(c.id);
  db.prepare('DELETE FROM comments WHERE id=?').run(c.id); if (c.media && c.kind === 'image') fs.unlink(path.join(UP, c.media), () => {}); s.json({ ok: true, removed: 1 + reps.length });
});

/* ---------- Profil, follow, daftar teman, video privat terpisah ---------- */
const storyOk = (viewer, ownerId) => {
  if (viewer === ownerId) return true;
  const ow = me(ownerId);
  if (!ow) return false;
  if (!ow.private) return true;
  return !!viewer && follows(viewer, ownerId);
};
const ACTIVE = "s.created>strftime('%s','now')-86400";
app.get('/api/users/:name', (q, s) => {
  const u = db.prepare('SELECT * FROM users WHERE username=?').get(q.params.name), v = U(q.uid);
  if (!u) return bad(s, 404, 'Pengguna tidak ditemukan');
  const own = v === u.id, iFollow = !!v && follows(v, u.id), followsMe = !!v && follows(u.id, v), locked = !!u.private && !own && !iFollow;
  const videos = vids(v, `v.user_id=? AND ${NON_PRIV}`, [u.id]);
  const privateCount = own ? db.prepare("SELECT COUNT(*) c FROM videos WHERE user_id=? AND privacy='private' AND IFNULL(mod_status,'auto')<>'blocked'").get(u.id).c : 0;
  const stubs = own ? db.prepare("SELECT id,code,caption,created,privacy FROM videos WHERE user_id=? AND mod_status='blocked'").all(u.id).map(takedownStub) : [];
  const warnings = own ? db.prepare('SELECT w.id,w.kind,w.note,w.created,w.video_id,v.code vcode,v.caption vcap,v.mod_status vmod FROM warnings w LEFT JOIN videos v ON v.id=w.video_id WHERE w.user_id=? ORDER BY w.id DESC LIMIT 50').all(u.id)
    .map(r => ({ id: r.id, kind: r.kind, note: r.note, created: r.created, video: r.vcode ? { id: r.video_id, code: r.vcode, caption: r.vcap || '', takedown: r.vmod === 'blocked', appeal: r.vmod === 'blocked' ? getLatestAppeal(r.video_id) : null } : null, video_gone: !!r.video_id && !r.vcode })) : undefined;
  const cnt = (col) => db.prepare(`SELECT COUNT(*) c FROM follows WHERE ${col}=?`).get(u.id).c;
  const mutual = db.prepare('SELECT COUNT(*) c FROM follows x JOIN follows y ON y.a=x.b AND y.b=x.a WHERE x.a=?').get(u.id).c;
  if (q.query.visit === '1' && v && !own) {
    const vm = me(v); if (vm && vm.visitors_on !== 0 && u.visitors_on !== 0)
      db.prepare(`INSERT INTO profile_visits(owner,visitor,created,n) VALUES(?,?,strftime('%s','now'),1) ON CONFLICT(owner,visitor) DO UPDATE SET n=n+CASE WHEN created<strftime('%s','now')-600 THEN 1 ELSE 0 END,created=strftime('%s','now')`).run(u.id, v);
  }
  const st = storyOk(v, u.id) ? db.prepare(`SELECT COUNT(*) n,SUM(CASE WHEN ${v}>0 AND sv.user_id IS NOT NULL THEN 0 ELSE 1 END) unseen FROM stories s LEFT JOIN story_views sv ON sv.story_id=s.id AND sv.user_id=${v} WHERE s.user_id=? AND ${ACTIVE}`).get(u.id) : { n: 0, unseen: 0 };
  const highlights = locked ? [] : db.prepare(`SELECT h.id,h.title,(SELECT COUNT(*) FROM highlight_items WHERE highlight_id=h.id) n,
    (SELECT s.file FROM highlight_items hi JOIN stories s ON s.id=hi.story_id WHERE hi.highlight_id=h.id ORDER BY hi.pos LIMIT 1) cover,
    (SELECT s.kind FROM highlight_items hi JOIN stories s ON s.id=hi.story_id WHERE hi.highlight_id=h.id ORDER BY hi.pos LIMIT 1) cover_kind
    FROM highlights h WHERE h.user_id=? ORDER BY h.id DESC`).all(u.id).filter(h => h.n);
  s.json({ user: pub(u), videos: stubs.length ? [...videos, ...stubs].sort((a, b) => b.id - a.id) : videos, warnings, privateCount, likes: videos.reduce((a, x) => a + x.likes, 0), views: videos.reduce((a, x) => a + (x.views || 0), 0), followers: cnt('b'), following: cnt('a'), friends: mutual,
    isFollowing: iFollow, followsMe, friend: iFollow && followsMe, locked, canMessage: own || !u.private || iFollow || followsMe,
    requested: !!v && !iFollow && !!db.prepare('SELECT 1 FROM follow_requests WHERE a=? AND b=?').get(v, u.id),
    requests: own ? db.prepare('SELECT COUNT(*) c FROM follow_requests WHERE b=?').get(u.id).c : 0,
    hasStory: st.n > 0, storyUnseen: (st.unseen || 0) > 0, highlights,
    reposts: locked ? 0 : db.prepare('SELECT COUNT(*) c FROM reposts r JOIN videos v ON v.id=r.video_id WHERE r.user_id=? AND ' + VIS(v)).get(u.id).c });
});
app.get('/api/me/private-videos', need, (q, s) => {
  s.json({ videos: vids(q.uid, "v.user_id=? AND v.privacy='private'", [q.uid], 'ORDER BY v.id DESC LIMIT 200') });
});
app.get('/api/users/:name/reposts', (q, s) => {
  const u = uidOf(q.params.name); if (!u) return bad(s, 404, 'Pengguna tidak ditemukan');
  const w = U(q.uid), ow = me(u); if (ow.private && w !== u && !follows(w, u)) return s.json({ videos: [], locked: true });
  const rp = new Map(db.prepare('SELECT video_id,note,created FROM reposts WHERE user_id=?').all(u).map(r => [r.video_id, r]));
  s.json({ videos: vids(q.uid, `${NON_PRIV} AND v.id IN (SELECT video_id FROM reposts WHERE user_id=?)`, [u], `ORDER BY (SELECT created FROM reposts r WHERE r.user_id=${u} AND r.video_id=v.id) DESC LIMIT 100`)
    .map(x => ({ ...x, rp_u: ow.username, rp_name: ow.name || ow.username, rp_note: (rp.get(x.id) || {}).note || '', rp_at: (rp.get(x.id) || {}).created || null })) });
});
app.post('/api/users/:name/follow', need, (q, s) => {
  const t = uidOf(q.params.name);
  if (!t || t === q.uid) return bad(s, 400, 'Tidak bisa mengikuti akun ini');
  const fc = () => db.prepare('SELECT COUNT(*) c FROM follows WHERE b=?').get(t).c;
  if (db.prepare('DELETE FROM follows WHERE a=? AND b=?').run(q.uid, t).changes) return s.json({ following: false, requested: false, friend: false, followers: fc() });
  if (db.prepare('DELETE FROM follow_requests WHERE a=? AND b=?').run(q.uid, t).changes) {
    db.prepare("DELETE FROM notifs WHERE user_id=? AND actor=? AND type='request'").run(t, q.uid);
    return s.json({ following: false, requested: false, friend: false, followers: fc() });
  }
  if (me(t).private) { db.prepare('INSERT OR IGNORE INTO follow_requests(a,b) VALUES(?,?)').run(q.uid, t); db.prepare("DELETE FROM notifs WHERE user_id=? AND actor=? AND type='request'").run(t, q.uid); notify(t, 'request', q.uid, null); return s.json({ following: false, requested: true, friend: false, followers: fc() }) }
  db.prepare('INSERT INTO follows VALUES(?,?)').run(q.uid, t); notify(t, follows(t, q.uid) ? 'friend' : 'follow', q.uid, null);
  s.json({ following: true, requested: false, friend: follows(t, q.uid), followers: fc() });
});
app.get('/api/me/requests', need, (q, s) => s.json({ users: db.prepare('SELECT u.username,u.name,u.avatar,u.verified,r.created FROM follow_requests r JOIN users u ON u.id=r.a WHERE r.b=? ORDER BY r.created DESC LIMIT 200').all(q.uid) }));
app.post('/api/me/requests/:name', need, (q, s) => {
  const a = uidOf(q.params.name); if (!a) return bad(s, 404, 'Pengguna tidak ditemukan');
  if (!db.prepare('DELETE FROM follow_requests WHERE a=? AND b=?').run(a, q.uid).changes) return bad(s, 404, 'Permintaan tidak ditemukan');
  if ((q.body || {}).action === 'accept') { db.prepare('INSERT OR IGNORE INTO follows VALUES(?,?)').run(a, q.uid); notify(a, follows(q.uid, a) ? 'friend' : 'accepted', q.uid, null) }
  s.json({ ok: true, requests: db.prepare('SELECT COUNT(*) c FROM follow_requests WHERE b=?').get(q.uid).c });
});
app.put('/api/me/privacy', need, (q, s) => {
  const b = q.body || {};
  if (b.private !== undefined) {
    const on = b.private ? 1 : 0; db.prepare('UPDATE users SET private=? WHERE id=?').run(on, q.uid);
    if (!on) { db.prepare('SELECT a FROM follow_requests WHERE b=?').all(q.uid).forEach(r => { db.prepare('INSERT OR IGNORE INTO follows VALUES(?,?)').run(r.a, q.uid); notify(r.a, 'accepted', q.uid, null) }); db.prepare('DELETE FROM follow_requests WHERE b=?').run(q.uid) }
  }
  if (b.visitors_on !== undefined) db.prepare('UPDATE users SET visitors_on=? WHERE id=?').run(b.visitors_on ? 1 : 0, q.uid);
  s.json({ user: selfPub(me(q.uid)) });
});
app.get('/api/me/visitors', need, (q, s) => {
  if (me(q.uid).visitors_on === 0) return s.json({ on: false, visitors: [], total: 0, week: 0 });
  const c = w => db.prepare(`SELECT COUNT(*) c FROM profile_visits WHERE owner=?${w}`).get(q.uid).c;
  s.json({ on: true, total: c(''), week: c(" AND created>strftime('%s','now')-604800"),
    visitors: db.prepare('SELECT x.username,x.name,x.avatar,x.verified,p.created,p.n FROM profile_visits p JOIN users x ON x.id=p.visitor WHERE p.owner=? ORDER BY p.created DESC LIMIT 100').all(q.uid) });
});
app.delete('/api/me/visitors', need, (q, s) => { db.prepare('DELETE FROM profile_visits WHERE owner=?').run(q.uid); s.json({ ok: true }) });

/* ---------- Centang biru: ajukan ke sistem ---------- */
app.get('/api/me/verify', need, (q, s) => {
  const r = db.prepare('SELECT id,reason,link,status,note,created,decided FROM verif_requests WHERE user_id=? ORDER BY id DESC LIMIT 1').get(q.uid);
  s.json({ verified: !!me(q.uid).verified, request: r || null });
});
app.post('/api/me/verify', need, (q, s) => {
  const b = q.body || {}, reason = String(b.reason || '').trim().slice(0, 500), link = String(b.link || '').trim().slice(0, 200);
  if (me(q.uid).verified) return bad(s, 400, 'Akunmu sudah terverifikasi');
  if (reason.length < 10) return bad(s, 400, 'Jelaskan alasanmu minimal 10 karakter');
  if (link && !/^https?:\/\/\S+$/i.test(link)) return bad(s, 400, 'Tautan harus diawali http:// atau https://');
  const last = db.prepare('SELECT status,decided FROM verif_requests WHERE user_id=? ORDER BY id DESC LIMIT 1').get(q.uid);
  if (last && last.status === 'pending') return bad(s, 409, 'Pengajuanmu masih menunggu keputusan sistem');
  if (last && last.status === 'rejected' && last.decided && Date.now() / 1000 - last.decided < 3 * 86400) return bad(s, 429, 'Pengajuan ditolak. Coba lagi setelah 3 hari.');
  db.prepare('INSERT INTO verif_requests(user_id,reason,link) VALUES(?,?,?)').run(q.uid, reason, link); s.json({ ok: true });
});
app.get('/api/me/follows', need, (q, s) => {
  const t = ['followers', 'following', 'friends'].includes(q.query.type) ? q.query.type : 'followers', m = q.uid;
  const base = `SELECT u.username,u.name,u.avatar,u.verified,EXISTS(SELECT 1 FROM follows x WHERE x.a=${m} AND x.b=u.id) iFollow,EXISTS(SELECT 1 FROM follows y WHERE y.a=u.id AND y.b=${m}) followsMe FROM users u`;
  const where = t === 'followers' ? `u.id IN (SELECT a FROM follows WHERE b=${m})` : t === 'following' ? `u.id IN (SELECT b FROM follows WHERE a=${m})`
    : `u.id IN (SELECT a FROM follows WHERE b=${m}) AND u.id IN (SELECT b FROM follows WHERE a=${m})`;
  s.json({ users: db.prepare(`${base} WHERE ${where} ORDER BY u.username LIMIT 500`).all().map(x => ({ ...x, verified: !!x.verified, iFollow: !!x.iFollow, followsMe: !!x.followsMe, friend: !!x.iFollow && !!x.followsMe })) });
});
app.get('/api/me/liked', need, (q, s) => s.json({ videos: vids(q.uid, `${NON_PRIV} AND v.id IN (SELECT video_id FROM likes WHERE user_id=?)`, [q.uid], 'ORDER BY v.id DESC LIMIT 200') }));
app.get('/api/me/saved', need, (q, s) => s.json({ videos: vids(q.uid, `${NON_PRIV} AND v.id IN (SELECT video_id FROM saves WHERE user_id=?)`, [q.uid], `ORDER BY (SELECT created FROM saves x WHERE x.user_id=${U(q.uid)} AND x.video_id=v.id) DESC LIMIT 200`) }));

/* ---------- Pencarian ---------- */
app.get('/api/search', (q, s) => {
  const u = U(q.uid), raw = String(q.query.q || '').trim().slice(0, 40), term = like(raw.replace(/^[@#]+/, '')), type = q.query.type || 'users';
  if (type === 'users') {
    if (!term) return s.json({ users: [] });
    const users = db.prepare(`SELECT u.username,u.name,u.avatar,u.verified,(SELECT COUNT(*) FROM follows WHERE b=u.id) followers,EXISTS(SELECT 1 FROM follows WHERE a=${u} AND b=u.id) following
      FROM users u WHERE u.banned=0 AND (u.username LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\') ORDER BY (u.username LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\') DESC,followers DESC,u.username LIMIT 25`)
      .all('%' + term + '%', '%' + term + '%', term + '%', term + '%').map(x => ({ ...x, verified: !!x.verified, following: !!x.following }));
    return s.json({ users });
  }
  if (type === 'tags') {
    const tags = db.prepare(`SELECT t.tag,COUNT(*) n FROM vtags t JOIN videos v ON v.id=t.video_id WHERE ${VIS(u)} AND ${NON_PRIV} AND t.tag LIKE ? ESCAPE '\\' GROUP BY t.tag ORDER BY (t.tag LIKE ? ESCAPE '\\') DESC,n DESC,t.tag LIMIT ${term ? 25 : 15}`).all('%' + term + '%', term + '%');
    return s.json({ tags });
  }
  s.json({ videos: term ? vids(u, `${NON_PRIV} AND (v.caption LIKE ? ESCAPE '\\' OR v.loc LIKE ? ESCAPE '\\')`, ['%' + term + '%', '%' + term + '%'], 'ORDER BY v.id DESC LIMIT 36') : [] });
});
app.get('/api/suggest', (q, s) => {
  const u = U(q.uid), term = like(String(q.query.q || '').replace(/^[@#]+/, '').slice(0, 30));
  if (q.query.kind === 'user') return s.json({ items: db.prepare(`SELECT x.username,x.name,x.avatar FROM users x WHERE x.banned=0 AND (x.username LIKE ? ESCAPE '\\' OR x.name LIKE ? ESCAPE '\\')
    ORDER BY EXISTS(SELECT 1 FROM follows WHERE a=${u} AND b=x.id) DESC,(x.username LIKE ? ESCAPE '\\') DESC,x.username LIMIT 8`).all(term + '%', term + '%', term + '%') });
  s.json({ items: db.prepare(`SELECT t.tag,COUNT(*) n FROM vtags t JOIN videos v ON v.id=t.video_id WHERE ${VIS(u)} AND ${NON_PRIV} AND t.tag LIKE ? ESCAPE '\\' GROUP BY t.tag ORDER BY n DESC,t.tag LIMIT 8`).all(term + '%') });
});

/* ---------- Report & Panel Sistem (Tanpa Login, Kontrol Mudah, & Banding Takedown) ---------- */
const REASONS = ['spam', 'kekerasan', 'kebencian', 'pelecehan', 'dewasa', 'hoaks', 'hak_cipta', 'lainnya'];
app.post('/api/report', need, (q, s) => {
  const { kind, target, reason, note } = q.body || {};
  if (!['video', 'user', 'comment', 'story'].includes(kind) || !REASONS.includes(reason)) return bad(s, 400, 'Laporan tidak valid');
  let who;
  if (kind === 'video') who = owner(target); else if (kind === 'user') who = uidOf(target);
  else if (kind === 'comment') who = (db.prepare('SELECT user_id FROM comments WHERE id=?').get(target) || {}).user_id;
  else who = (db.prepare('SELECT user_id FROM stories WHERE id=?').get(target) || {}).user_id;
  if (!who) return bad(s, 404, 'Konten tidak ditemukan');
  if (who === q.uid) return bad(s, 400, 'Kamu tidak bisa melaporkan kontenmu sendiri');
  db.prepare('INSERT OR REPLACE INTO reports(reporter,kind,target,reason,note) VALUES(?,?,?,?,?)').run(q.uid, kind, String(target), reason, String(note || '').slice(0, 300));
  s.json({ ok: true });
});

// Panel Sistem langsung dapat diakses tanpa login
app.post('/api/admin/login', (q, s) => {
  const token = jwt.sign({ isAdmin: true, u: 'sistem' }, SECRET, { expiresIn: '30d' });
  s.json({ ok: true, token, username: 'sistem', ffmpeg: !!FFMPEG });
});

const admin = (q, s, n) => {
  q.adminUser = 'sistem';
  return n();
};

const addWarning = (uid, note, vid = null, kind = 'account') => db.prepare('INSERT INTO warnings(user_id,video_id,kind,note) VALUES(?,?,?,?)').run(uid, vid, kind, note);
const vLabel = v => { const c = String(v.caption || '').replace(/\s+/g, ' ').trim(); return c ? `\u201c${c.slice(0, 40)}${c.length > 40 ? '\u2026' : ''}\u201d (kode ${v.code})` : `(kode ${v.code})`; };
const codeOf = id => (db.prepare('SELECT code FROM videos WHERE id=?').get(id) || {}).code || String(id);
const sysNotify = (uid, type, note = '', vid = null, kind = null) => {
  const r = db.prepare('INSERT INTO notifs(user_id,type,actor,video_id,note) VALUES(?,?,?,?,?)').run(uid, type, uid, vid, note), a = me(uid);
  if (type === 'warning') addWarning(uid, note, vid, kind || (vid ? 'video' : 'account'));
  if (!a) return;
  const vv = vid ? db.prepare('SELECT code,caption,mod_status FROM videos WHERE id=?').get(vid) : null;
  push(uid, 'notif', { id: Number(r.lastInsertRowid), type, note, video_id: vid, vcode: vv ? vv.code : null, vcap: vv ? vv.caption : '', takedown: !!vv && vv.mod_status === 'blocked', username: a.username, name: a.name, avatar: a.avatar, created: Math.floor(Date.now() / 1000), seen: 0 });
};


/* ---------- Deteksi Pelanggaran Pedoman Komunitas (AI / Smart Rule Scanner) ---------- */
const MOD_CATEGORIES = [
  {
    id: "judi_spam",
    label: "Judi Online, Penipuan & Spam",
    weight: 65,
    words: ["slot gacor", "maxwin", "pragmatic", "judol", "judi online", "situs gacor", "jp paus", "scatter", "togel", "casino", "poker online", "deposit pulsa", "pinjol ilegal", "dana kaget", "investasi bodong", "klik link di bio", "uang instan", " Zeus ", "gacor hari ini", "rtp live"]
  },
  {
    id: "dewasa",
    label: "Konten Dewasa & Seksual (NSFW)",
    weight: 70,
    words: ["bokep", "porn", "nsfw", "bugil", "telanjang", "18+", "open bo", "vcs", "onlyfans", "hentai", "mesum", "video syur", "link pemersatu", "pemersatu bangsa", "skandal panas", "colmek", "ngentot", "memek", "kontol", "ngewe", "sange", "xxx", "jav", "video dewasa", "konten dewasa", "bokep indo", "tante girang", "bispak"]
  },
  {
    id: "kekerasan",
    label: "Kekerasan & Tindakan Berbahaya",
    weight: 75,
    words: ["bunuh", "pembunuhan", "darah segar", "sadis", "gore", "bom", "teroris", "tawuran", "senjata tajam", "celurit", "lukai diri", "suicide", "selfharm", "penganiayaan", "penyiksaan", "eksekusi"]
  },
  {
    id: "kebencian",
    label: "Ujaran Kebencian & Pelecehan",
    weight: 55,
    words: ["rasis", "anjing lo", "goblok lo", "tolol lo", "bangsat lo", "doxing", "buka aib", "ancaman", "pelecehan", "fitnah keji", "umat sesat"]
  },
  {
    id: "hoaks_hakcipta",
    label: "Hoaks & Pelanggaran Hak Cipta",
    weight: 40,
    words: ["full movie sub indo", "film bajakan", "link download film", "berita bohong", "hoaks", "hoax", "reupload tanpa izin"]
  }
];

function getCustomModWords() {
  const row = db.prepare("SELECT v FROM admin_settings WHERE k='mod_custom_words'").get();
  if (!row || !row.v) return [];
  return String(row.v).split(",").map(w => w.trim().toLowerCase()).filter(Boolean);
}

function getAutoBlockThreshold() {
  const row = db.prepare("SELECT v FROM admin_settings WHERE k='mod_autoblock'").get();
  return row && row.v ? clamp(parseInt(row.v) || 85, 50, 100) : 85;
}

function getVisualMode() {
  const row = db.prepare("SELECT v FROM admin_settings WHERE k='mod_visual'").get();
  return row && vision.MODES[row.v] ? row.v : 'normal';
}
const parseJSON = (t, d = null) => { try { return t ? JSON.parse(t) : d } catch { return d } };

/* Hash video yang pernah diblokir: unggah ulang langsung dikenali (file identik atau mirip secara visual) */
function registerBlockedHashes(vRow) {
  const h = parseJSON(vRow && vRow.mod_hash, null); if (!h) return;
  const ins = db.prepare("INSERT OR IGNORE INTO mod_hashes(kind,h,video_id) VALUES(?,?,?)");
  if (h.sha) ins.run('sha', h.sha, vRow.id);
  (h.ah || []).forEach(x => ins.run('ah', x, vRow.id));
}
const forgetBlockedHashes = vid => db.prepare("DELETE FROM mod_hashes WHERE video_id=?").run(vid);
function matchBlockedHash(vRow) {
  const h = parseJSON(vRow.mod_hash, null); if (!h) return null;
  if (h.sha) { const r = db.prepare("SELECT video_id FROM mod_hashes WHERE kind='sha' AND h=? AND video_id<>? LIMIT 1").get(h.sha, vRow.id); if (r) return { type: 'identik', video_id: r.video_id } }
  const ahs = (h.ah || []); if (!ahs.length) return null;
  const known = db.prepare("SELECT h,video_id FROM mod_hashes WHERE kind='ah' AND video_id<>?").all(vRow.id);
  const byVid = new Map();
  for (const k of known) for (const a of ahs) if (vision.hamming(a, k.h) <= 6) byVid.set(k.video_id, (byVid.get(k.video_id) || new Set()).add(a));
  for (const [vid, set] of byVid) if (set.size >= 2) return { type: 'mirip', video_id: vid };
  return null;
}

function analyzeVideoCompliance(vRow) {
  if (!vRow) return { score: 0, level: "safe", categories: [], reasons: [], matched: [] };
  const rawBlob = `${vRow.caption || ""} ${vRow.loc || ""} ${vRow.audio_title || ""} ${vRow.mod_meta || ""}`;
  const variants = vision.textVariants(rawBlob);
  let score = 0;
  const categories = [];
  const reasons = [];
  const matched = [];

  for (const cat of MOD_CATEGORIES) {
    const hits = vision.findHits(variants, cat.words);
    if (hits.length) {
      score += cat.weight + Math.min(20, (hits.length - 1) * 10);
      categories.push(cat.label);
      matched.push(...hits);
      reasons.push(`Terdeteksi kata kunci [${cat.label}]: "${hits.slice(0, 4).join(", ")}"${vRow.mod_meta && !String(vRow.caption || "").trim() ? " (dari nama file / metadata)" : ""}`);
    }
  }

  const customWords = getCustomModWords();
  if (customWords.length) {
    const chits = vision.findHits(variants, customWords);
    if (chits.length) {
      score += 65 + Math.min(20, (chits.length - 1) * 10);
      categories.push("Kata Terlarang Sistem");
      matched.push(...chits);
      reasons.push(`Melanggar kata terlarang Sistem: "${chits.slice(0, 4).join(", ")}"`);
    }
  }

  // Analisis visual (tetap bekerja walau caption kosong)
  const vis = parseJSON(vRow.mod_visual, null);
  let visual = null;
  if (vis && vis.frames) {
    visual = { score: vis.score || 0, flagged: vis.flagged || 0, frames: vis.frames, avg: vis.avg || 0, peak: vis.peak || 0, source: vis.source || "heuristik", mode: vis.mode || "normal" };
    if (visual.score >= 30) {
      score += Math.round(visual.score * 0.95);
      categories.push("Indikasi Visual Dewasa");
      reasons.push(`Analisis visual (${visual.source}): ${visual.flagged} dari ${visual.frames} frame didominasi area kulit (rata-rata ${Math.round(visual.avg * 100)}%, puncak ${Math.round(visual.peak * 100)}%), skor visual ${visual.score}`);
    }
  }

  // Video identik / mirip dengan konten yang sudah diblokir
  const hm = matchBlockedHash(vRow);
  if (hm) {
    score += 100;
    categories.push("Konten Terblokir Diunggah Ulang");
    reasons.push(hm.type === 'identik' ? `File identik dengan video ${codeOf(hm.video_id)} yang sudah diblokir` : `Visual sangat mirip dengan video ${codeOf(hm.video_id)} yang sudah diblokir`);
  }

  // Check spam heuristics (excessive hashtags, external links, phone/WA spam)
  const tagCount = (String(vRow.caption || "").match(/#/g) || []).length;
  if (tagCount >= 9) {
    score += 22;
    if (!categories.includes("Indikasi Spam")) categories.push("Indikasi Spam");
    reasons.push(`Terlalu banyak hashtag (${tagCount} hashtag)`);
  }
  if (/(https?:\/\/|bit\.ly\/|t\.me\/|wa\.me\/|s\.id\/)/i.test(vRow.caption || "")) {
    score += 28;
    if (!categories.includes("Tautan Eksternal Mencurigakan")) categories.push("Tautan Eksternal Mencurigakan");
    reasons.push("Mengandung tautan eksternal mencurigakan di caption");
  }

  // Check comments on this video for toxic/violation spikes
  const badComments = db.prepare("SELECT text FROM comments WHERE video_id=? LIMIT 50").all(vRow.id);
  let commentHits = 0;
  for (const c of badComments) {
    const cv = vision.textVariants(c.text);
    if (MOD_CATEGORIES.some(cat => vision.findHits(cv, cat.words).length)) commentHits++;
  }
  if (commentHits > 0) {
    score += Math.min(25, commentHits * 10);
    reasons.push(`${commentHits} komentar pada video ini mengandung kata sensitif`);
  }

  // Check user reports against this video
  const repRows = db.prepare("SELECT reason, note FROM reports WHERE kind='video' AND target=?").all(String(vRow.id));
  if (repRows.length > 0) {
    const repWeight = Math.min(65, repRows.length * 28);
    score += repWeight;
    const repReasons = [...new Set(repRows.map(r => r.reason))];
    categories.push(`Dilaporkan Pengguna (${repRows.length}x)`);
    reasons.push(`Dilaporkan ${repRows.length}x oleh komunitas dengan alasan: ${repReasons.join(", ")}`);
  }

  score = clamp(Math.round(score), 0, 100);
  let level = "safe";
  if (vRow.mod_status === "safe") {
    level = "safe";
  } else if (vRow.mod_status === "blocked") {
    level = "blocked";
    if (score < 70) score = 85;
  } else if (vRow.mod_status === "warning") {
    level = "warning";
    if (score < 40) score = 45;
  } else {
    if (score >= 60) level = "violation";
    else if (score >= 25) level = "warning";
    else level = "safe";
  }

  return {
    score,
    level,
    mod_status: vRow.mod_status || "auto",
    categories,
    reasons,
    matched: [...new Set(matched)],
    reports_count: repRows.length,
    visual,
    hash_match: hm
  };
}

/* Pindai visual video (sekali, hasil disimpan di kolom mod_visual) */
let scanBusy = 0; const scanWait = [];
const scanSlot = async () => { if (scanBusy >= 2) await new Promise(r => scanWait.push(r)); scanBusy++ };
const scanFree = () => { scanBusy--; const n = scanWait.shift(); if (n) n() };
async function visualScan(absFile, originalName = '') {
  await scanSlot();
  try {
    return await Promise.race([
      vision.scanVideo(FFMPEG, absFile, { mode: getVisualMode(), originalName }),
      new Promise(r => setTimeout(() => r(null), 45000))
    ]);
  } catch (e) { console.error('visualScan:', e); return null } finally { scanFree() }
}
const saveVisual = (vid, r) => {
  if (!r) return;
  db.prepare("UPDATE videos SET mod_visual=?,mod_hash=?,mod_meta=? WHERE id=?").run(
    JSON.stringify({ ts: r.ts, mode: r.mode, score: r.score, frames: r.frames, flagged: r.flagged, avg: r.avg, peak: r.peak, source: r.source, error: r.error }),
    JSON.stringify({ sha: r.sha, ah: r.ah }), r.meta || '', vid);
};

function runVideoAutoMod(vid) {
  try {
    const vRow = db.prepare("SELECT * FROM videos WHERE id=?").get(vid);
    if (!vRow) return null;
    const res = analyzeVideoCompliance(vRow);
    const now = Math.floor(Date.now() / 1000);
    let nextStatus = vRow.mod_status || "auto";
    if (nextStatus === "auto") {
      if (res.score >= getAutoBlockThreshold()) {
        nextStatus = "blocked";
        registerBlockedHashes(vRow);
        db.prepare("UPDATE videos SET mod_status='blocked' WHERE id=?").run(vid);   // sudah ditakedown sebelum notifikasi dibuat
        sysNotify(vRow.user_id, "warning", `Sistem Keamanan Zippy: Videomu ${vLabel(vRow)} ditakedown otomatis karena terdeteksi melanggar Pedoman Komunitas (${res.categories.join(", ")}). Video tidak bisa diputar dan tidak tampil di publik. Kamu dapat mengajukan banding dari halaman profilmu.`, vid, 'takedown');
      } else if (res.score >= 60) {
        nextStatus = "flagged";
      }
    }
    db.prepare("UPDATE videos SET mod_status=?,mod_score=?,mod_reasons=?,mod_checked=? WHERE id=?").run(
      nextStatus,
      res.score,
      JSON.stringify({ categories: res.categories, reasons: res.reasons }),
      now,
      vid
    );
    return { ...res, mod_status: nextStatus };
  } catch (e) {
    console.error("autoMod:", e);
    return null;
  }
}

app.get('/api/admin/ping', admin, (q, s) => {
  const stats = {
    users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
    banned: db.prepare('SELECT COUNT(*) c FROM users WHERE banned=1').get().c,
    videos: db.prepare('SELECT COUNT(*) c FROM videos').get().c,
    blocked: db.prepare("SELECT COUNT(*) c FROM videos WHERE mod_status='blocked'").get().c,
    stories: db.prepare(`SELECT COUNT(*) c FROM stories s WHERE ${ACTIVE}`).get().c,
    pending: db.prepare("SELECT COUNT(*) c FROM verif_requests WHERE status='pending'").get().c,
    appeals: db.prepare("SELECT COUNT(*) c FROM video_appeals WHERE status='pending'").get().c,
    reports: db.prepare('SELECT COUNT(*) c FROM reports').get().c,
    comments: db.prepare('SELECT COUNT(*) c FROM comments').get().c,
    stickers: db.prepare('SELECT COUNT(*) c FROM custom_stickers').get().c,
    flagged: db.prepare("SELECT COUNT(*) c FROM videos WHERE mod_score>=25 OR mod_status IN ('flagged','warning','blocked')").get().c
  };
  s.json({ ok: true, ffmpeg: !!FFMPEG, username: 'sistem', stats });
});

app.post('/api/admin/broadcast', admin, (q, s) => {
  const target = String((q.body || {}).target || 'all').trim().replace(/^@/, '');
  const message = String((q.body || {}).message || '').trim().slice(0, 400);
  if (!message) return bad(s, 400, 'Tulis isi pengumuman terlebih dahulu');
  if (target && target.toLowerCase() !== 'all') {
    const uid = uidOf(target);
    if (!uid) return bad(s, 404, 'Pengguna @' + target + ' tidak ditemukan');
    sysNotify(uid, 'broadcast', message);
    return s.json({ ok: true, sent: 1 });
  }
  const allUsers = db.prepare('SELECT id FROM users WHERE banned=0').all();
  allUsers.forEach(u => sysNotify(u.id, 'broadcast', message));
  s.json({ ok: true, sent: allUsers.length });
});

app.get('/api/admin/appeals', admin, (q, s) => {
  const st = ['pending', 'approved', 'rejected'].includes(q.query.status) ? q.query.status : '';
  const sq = String(q.query.q || '').trim().toLowerCase();
  const rows = db.prepare(`SELECT a.id,a.video_id,a.user_id,a.reason,a.status,a.note,a.created,a.decided,
    v.code,v.caption,v.file,v.created video_created,v.views,v.privacy,v.mod_status,v.mod_score,v.mod_reasons,
    u.username,u.name,u.avatar,u.verified
    FROM video_appeals a
    JOIN videos v ON v.id=a.video_id
    JOIN users u ON u.id=a.user_id
    ${st ? 'WHERE a.status=?' : ''}
    ORDER BY (a.status='pending') DESC, a.id DESC LIMIT 200`).all(...(st ? [st] : []));
  const items = rows.map(r => {
    const mr = parseJSON(r.mod_reasons, { categories: [], reasons: [] });
    return { ...r, verified: !!r.verified, categories: mr.categories || [], mod_reasons_list: mr.reasons || [] };
  }).filter(r => !sq || (String(r.username || '') + ' ' + String(r.name || '') + ' ' + String(r.caption || '') + ' ' + String(r.reason || '') + ' ' + String(r.code || '')).toLowerCase().includes(sq));
  s.json({ items });
});

app.post('/api/admin/appeals/bulk', admin, (q, s) => {
  const action = String((q.body || {}).action || 'approve');
  const ok = action === 'approve';
  const note = String((q.body || {}).note || '').trim().slice(0, 300);
  const pendings = db.prepare("SELECT * FROM video_appeals WHERE status='pending'").all();
  for (const r of pendings) {
    const v = db.prepare('SELECT * FROM videos WHERE id=?').get(r.video_id);
    db.prepare("UPDATE video_appeals SET status=?,note=?,decided=strftime('%s','now') WHERE id=?").run(ok ? 'approved' : 'rejected', note, r.id);
    if (ok && v) {
      db.prepare("UPDATE videos SET mod_status='safe',mod_score=0,mod_checked=strftime('%s','now') WHERE id=?").run(v.id);
      forgetBlockedHashes(v.id);
      db.prepare("DELETE FROM warnings WHERE video_id=? AND kind='takedown'").run(v.id);
      db.prepare("DELETE FROM reports WHERE kind='video' AND target=?").run(String(v.id));
      sysNotify(r.user_id, 'appeal_ok', note || `Banding disetujui oleh Sistem Zippy! Videomu ${vLabel(v)} telah dipulihkan ke publik.`, v.id, 'video');
    } else if (!ok && v) {
      sysNotify(r.user_id, 'appeal_no', note || `Banding untuk videomu ${vLabel(v)} ditolak oleh Sistem Zippy karena masih melanggar Pedoman Komunitas.`, v.id, 'takedown');
    }
  }
  s.json({ ok: true, count: pendings.length });
});

app.post('/api/admin/appeals/:id', admin, (q, s) => {
  const r = db.prepare('SELECT * FROM video_appeals WHERE id=?').get(q.params.id);
  if (!r) return bad(s, 404, 'Data banding tidak ditemukan');
  const v = db.prepare('SELECT * FROM videos WHERE id=?').get(r.video_id);
  const ok = (q.body || {}).action === 'approve';
  const note = String((q.body || {}).note || '').trim().slice(0, 300);
  db.prepare("UPDATE video_appeals SET status=?,note=?,decided=strftime('%s','now') WHERE id=?").run(ok ? 'approved' : 'rejected', note, r.id);
  if (ok && v) {
    db.prepare("UPDATE videos SET mod_status='safe',mod_score=0,mod_checked=strftime('%s','now') WHERE id=?").run(v.id);
    forgetBlockedHashes(v.id);
    db.prepare("DELETE FROM warnings WHERE video_id=? AND kind='takedown'").run(v.id);
    db.prepare("DELETE FROM reports WHERE kind='video' AND target=?").run(String(v.id));
    sysNotify(r.user_id, 'appeal_ok', note || `Banding disetujui oleh Sistem Zippy! Videomu ${vLabel(v)} telah dipulihkan dan tampil kembali di publik.`, v.id, 'video');
  } else if (!ok && v) {
    sysNotify(r.user_id, 'appeal_no', note || `Banding untuk videomu ${vLabel(v)} ditolak oleh Sistem Zippy. Video tetap ditakedown karena melanggar Pedoman Komunitas.`, v.id, 'takedown');
  }
  s.json({ ok: true, status: ok ? 'approved' : 'rejected' });
});

app.get('/api/admin/reports', admin, (q, s) => {
  const kindFilter = String(q.query.kind || '').trim();
  const rows = db.prepare(`SELECT r.*,u.username reporter_name FROM reports r JOIN users u ON u.id=r.reporter ${['video', 'comment', 'story', 'user'].includes(kindFilter) ? 'WHERE r.kind=?' : ''} ORDER BY r.id DESC LIMIT 300`).all(...(['video', 'comment', 'story', 'user'].includes(kindFilter) ? [kindFilter] : []));
  const reports = rows.map(r => {
    let detail = null;
    try {
      if (r.kind === 'video') detail = db.prepare('SELECT v.id,v.code,v.caption,v.file,v.created,u.username,u.name,u.avatar,u.banned FROM videos v JOIN users u ON u.id=v.user_id WHERE v.id=?').get(r.target);
      else if (r.kind === 'comment') detail = db.prepare('SELECT c.id,c.text,c.media,c.kind,c.video_id,c.created,u.username,u.name,u.avatar,u.banned FROM comments c JOIN users u ON u.id=c.user_id WHERE c.id=?').get(r.target);
      else if (r.kind === 'story') detail = db.prepare('SELECT s.id,s.file,s.kind,s.text,s.created,u.username,u.name,u.avatar,u.banned FROM stories s JOIN users u ON u.id=s.user_id WHERE s.id=?').get(r.target);
      else if (r.kind === 'user') detail = db.prepare('SELECT u.id,u.username,u.name,u.bio,u.link,u.avatar,u.banned,u.ban_reason FROM users u WHERE u.username=?').get(r.target);
    } catch {}
    return { ...r, detail: detail || null };
  });
  s.json({ reports });
});
app.delete('/api/admin/reports/:id', admin, (q, s) => {
  db.prepare('DELETE FROM reports WHERE id=?').run(q.params.id);
  s.json({ ok: true });
});
app.delete('/api/admin/reports', admin, (q, s) => {
  db.prepare('DELETE FROM reports').run();
  s.json({ ok: true });
});
app.delete('/api/admin/comments/:id', admin, (q, s) => {
  const c = db.prepare('SELECT * FROM comments WHERE id=?').get(q.params.id);
  if (!c) return bad(s, 404, 'Komentar tidak ditemukan');
  db.prepare('DELETE FROM comments WHERE id=?').run(c.id);
  db.prepare("DELETE FROM reports WHERE kind='comment' AND target=?").run(String(c.id));
  if (c.media && c.kind === 'image') fs.unlink(path.join(UP, c.media), () => {});
  s.json({ ok: true });
});
app.get('/api/admin/stories', admin, (q, s) => {
  const t = '%' + like(String(q.query.q || '').trim().slice(0, 40)) + '%';
  const rows = db.prepare(`SELECT s.id,s.file,s.kind,s.text,s.created,u.username,u.name,u.avatar,
    (s.created>strftime('%s','now')-86400) active,
    (SELECT COUNT(*) FROM story_views WHERE story_id=s.id AND user_id<>s.user_id) views
    FROM stories s JOIN users u ON u.id=s.user_id
    WHERE s.text LIKE ? ESCAPE '\\' OR u.username LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\'
    ORDER BY s.id DESC LIMIT 80`).all(t, t, t);
  s.json({ stories: rows.map(r => ({ ...r, active: !!r.active })) });
});
app.delete('/api/admin/stories/:id', admin, (q, s) => {
  const x = db.prepare('SELECT * FROM stories WHERE id=?').get(q.params.id);
  if (!x) return bad(s, 404, 'Story tidak ditemukan');
  db.prepare('DELETE FROM stories WHERE id=?').run(x.id);
  db.prepare("DELETE FROM reports WHERE kind='story' AND target=?").run(String(x.id));
  fs.unlink(path.join(UP, x.file), () => {});
  s.json({ ok: true });
});
app.get('/api/admin/verifications', admin, (q, s) => {
  const st = ['pending', 'approved', 'rejected'].includes(q.query.status) ? q.query.status : null;
  s.json({ items: db.prepare(`SELECT r.id,r.reason,r.link,r.status,r.note,r.created,r.decided,u.username,u.name,u.avatar,u.verified,
    (SELECT COUNT(*) FROM follows WHERE b=u.id) followers,(SELECT COUNT(*) FROM videos WHERE user_id=u.id) videos
    FROM verif_requests r JOIN users u ON u.id=r.user_id ${st ? 'WHERE r.status=?' : ''} ORDER BY (r.status='pending') DESC,r.id DESC LIMIT 200`).all(...(st ? [st] : [])) });
});
app.post('/api/admin/verifications/bulk', admin, (q, s) => {
  const ok = (q.body || {}).action === 'approve';
  const note = String((q.body || {}).note || '').trim().slice(0, 300);
  const pendings = db.prepare("SELECT * FROM verif_requests WHERE status='pending'").all();
  for (const r of pendings) {
    db.prepare("UPDATE verif_requests SET status=?,note=?,decided=strftime('%s','now') WHERE id=?").run(ok ? 'approved' : 'rejected', note, r.id);
    if (ok) db.prepare('UPDATE users SET verified=1 WHERE id=?').run(r.user_id);
    sysNotify(r.user_id, ok ? 'verified' : 'verify_no', note);
  }
  s.json({ ok: true, count: pendings.length });
});
app.post('/api/admin/verifications/:id', admin, (q, s) => {
  const r = db.prepare('SELECT * FROM verif_requests WHERE id=?').get(q.params.id); if (!r) return bad(s, 404, 'Pengajuan tidak ditemukan');
  const ok = (q.body || {}).action === 'approve', note = String((q.body || {}).note || '').trim().slice(0, 300);
  db.prepare("UPDATE verif_requests SET status=?,note=?,decided=strftime('%s','now') WHERE id=?").run(ok ? 'approved' : 'rejected', note, r.id);
  if (ok) db.prepare('UPDATE users SET verified=1 WHERE id=?').run(r.user_id);
  sysNotify(r.user_id, ok ? 'verified' : 'verify_no', note); s.json({ ok: true });
});
app.get('/api/admin/users', admin, (q, s) => {
  const t = '%' + like(String(q.query.q || '').trim().slice(0, 30)) + '%';
  const flt = String(q.query.filter || 'all');
  let extra = '';
  if (flt === 'verified') extra = ' AND u.verified=1';
  else if (flt === 'banned') extra = ' AND u.banned=1';
  else if (flt === 'private') extra = ' AND u.private=1';
  else if (flt === 'warned') extra = " AND EXISTS(SELECT 1 FROM notifs n WHERE n.user_id=u.id AND n.type='warning')";
  s.json({
    users: db.prepare(`SELECT u.id,u.username,u.name,u.email,u.birth_date,u.bio,u.avatar,u.verified,u.private,u.banned,u.ban_reason,
      (SELECT COUNT(*) FROM follows WHERE b=u.id) followers,
      (SELECT COUNT(*) FROM videos WHERE user_id=u.id) videos,
      (SELECT COUNT(*) FROM notifs WHERE user_id=u.id AND type='warning') warnings
      FROM users u
      WHERE (u.username LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\' OR IFNULL(u.email,'') LIKE ? ESCAPE '\\')${extra}
      ORDER BY u.banned DESC,u.verified DESC,followers DESC,u.id DESC LIMIT 120`).all(t, t, t)
  });
});
app.post('/api/admin/users/:name/verified', admin, (q, s) => {
  const id = uidOf(q.params.name); if (!id) return bad(s, 404, 'Pengguna tidak ditemukan');
  const on = (q.body || {}).on ? 1 : 0; db.prepare('UPDATE users SET verified=? WHERE id=?').run(on, id);
  if (on) sysNotify(id, 'verified'); s.json({ ok: true, verified: !!on });
});
app.post('/api/admin/users/:name/ban', admin, (q, s) => {
  const id = uidOf(q.params.name); if (!id) return bad(s, 404, 'Pengguna tidak ditemukan');
  const u = me(id), on = (q.body || {}).banned !== undefined ? (q.body.banned ? 1 : 0) : (u.banned ? 0 : 1);
  const reason = String((q.body || {}).reason || '').trim().slice(0, 200);
  db.prepare('UPDATE users SET banned=?,ban_reason=? WHERE id=?').run(on, on ? reason : '', id);
  if (on) push(id, 'banned', { reason: reason || 'Melanggar pedoman komunitas' });
  s.json({ ok: true, banned: !!on, ban_reason: on ? reason : '' });
});
app.post('/api/admin/users/:name/warn', admin, (q, s) => {
  const id = uidOf(q.params.name); if (!id) return bad(s, 404, 'Pengguna tidak ditemukan');
  const msg = String((q.body || {}).message || '').trim().slice(0, 300) || 'Peringatan Sistem: Harap patuhi pedoman komunitas Zippy.';
  sysNotify(id, 'warning', msg, null, 'account');
  s.json({ ok: true });
});
app.post('/api/admin/users/:name/password', admin, (q, s) => {
  const id = uidOf(q.params.name); if (!id) return bad(s, 404, 'Pengguna tidak ditemukan');
  const pass = String((q.body || {}).password || '').trim();
  if (pass.length < 6) return bad(s, 400, 'Sandi baru minimal 6 karakter');
  db.prepare('UPDATE users SET pass=? WHERE id=?').run(bcrypt.hashSync(pass, 10), id);
  s.json({ ok: true });
});
app.delete('/api/admin/users/:name', admin, (q, s) => {
  const id = uidOf(q.params.name); if (!id) return bad(s, 404, 'Pengguna tidak ditemukan');
  db.prepare('SELECT file FROM videos WHERE user_id=?').all(id).forEach(v => fs.unlink(path.join(UP, v.file), () => {}));
  db.prepare('SELECT file FROM stories WHERE user_id=?').all(id).forEach(st => fs.unlink(path.join(UP, st.file), () => {}));
  db.prepare('DELETE FROM users WHERE id=?').run(id);
  db.prepare("DELETE FROM reports WHERE kind='user' AND target=?").run(String(q.params.name));
  s.json({ ok: true });
});
app.get('/api/admin/videos', admin, (q, s) => {
  const t = '%' + like(String(q.query.q || '').trim().slice(0, 40)) + '%';
  const pv = PRIV.includes(q.query.privacy) ? q.query.privacy : '';
  const flt = String(q.query.filter || '');
  let extra = '';
  if (pv) extra += ` AND v.privacy='${pv}'`;
  if (flt === 'blocked') extra += " AND v.mod_status='blocked'";
  else if (flt === 'appealed') extra += " AND EXISTS(SELECT 1 FROM video_appeals a WHERE a.video_id=v.id AND a.status='pending')";
  const rows = db.prepare(`SELECT v.id,v.code,v.user_id,v.caption,v.file,v.loc,v.created,v.views,v.privacy,v.audio_title,v.mod_status,v.mod_score,v.mod_reasons,v.mod_checked,u.username,u.name,u.avatar,
    (SELECT COUNT(*) FROM likes WHERE video_id=v.id) likes,(SELECT COUNT(*) FROM comments WHERE video_id=v.id) comments,(SELECT COUNT(*) FROM reposts WHERE video_id=v.id) reposts
    FROM videos v JOIN users u ON u.id=v.user_id
    WHERE (v.caption LIKE ? ESCAPE '\\' OR u.username LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\' OR v.code LIKE ? ESCAPE '\\')${extra}
    ORDER BY v.id DESC LIMIT 120`).all(t, t, t, t);
  s.json({ videos: rows.map(v => ({ ...v, mod: analyzeVideoCompliance(v), appeal: getLatestAppeal(v.id) })) });
});

app.get('/api/admin/moderation', admin, (q, s) => {
  const flt = String(q.query.filter || 'all').trim();
  const sq = String(q.query.q || '').trim().toLowerCase();
  const rows = db.prepare(`SELECT v.id,v.code,v.user_id,v.caption,v.file,v.loc,v.created,v.views,v.privacy,v.audio_title,v.mod_status,v.mod_score,v.mod_reasons,v.mod_checked,v.mod_visual,v.mod_meta,v.mod_hash,
    u.username,u.name,u.avatar,u.banned,
    (SELECT COUNT(*) FROM likes WHERE video_id=v.id) likes,(SELECT COUNT(*) FROM comments WHERE video_id=v.id) comments
    FROM videos v JOIN users u ON u.id=v.user_id ORDER BY v.id DESC LIMIT 200`).all();

  const analyzed = rows.map(v => {
    const mod = analyzeVideoCompliance(v);
    if (!v.mod_checked || v.mod_score !== mod.score) {
      db.prepare("UPDATE videos SET mod_score=?,mod_reasons=?,mod_checked=? WHERE id=?").run(
        mod.score,
        JSON.stringify({ categories: mod.categories, reasons: mod.reasons }),
        Math.floor(Date.now() / 1000),
        v.id
      );
    }
    return { ...v, mod, appeal: getLatestAppeal(v.id) };
  });

  const summary = {
    total: analyzed.length,
    violation: analyzed.filter(x => x.mod.level === 'violation' || (x.mod.score >= 60 && x.mod.mod_status !== 'safe')).length,
    warning: analyzed.filter(x => x.mod.level === 'warning').length,
    blocked: analyzed.filter(x => x.mod.mod_status === 'blocked').length,
    appealed: analyzed.filter(x => x.appeal && x.appeal.status === 'pending').length,
    safe: analyzed.filter(x => x.mod.level === 'safe' && x.mod.mod_status !== 'blocked').length
  };

  let items = analyzed.filter(x => {
    if (sq && !(String(x.caption || '').toLowerCase().includes(sq) || String(x.username || '').toLowerCase().includes(sq) || String(x.code || '').toLowerCase().includes(sq) || x.mod.categories.join(' ').toLowerCase().includes(sq))) return false;
    if (flt === 'violation') return x.mod.level === 'violation' || (x.mod.score >= 60 && x.mod.mod_status !== 'safe');
    if (flt === 'warning') return x.mod.level === 'warning';
    if (flt === 'blocked') return x.mod.mod_status === 'blocked';
    if (flt === 'appealed') return x.appeal && x.appeal.status === 'pending';
    if (flt === 'safe') return x.mod.level === 'safe' && x.mod.mod_status !== 'blocked';
    return true;
  }).sort((a, b) => (Number(!!(b.appeal && b.appeal.status === 'pending')) - Number(!!(a.appeal && a.appeal.status === 'pending'))) || b.mod.score - a.mod.score || b.id - a.id);

  s.json({
    summary,
    customWords: getCustomModWords(),
    autoBlockScore: getAutoBlockThreshold(),
    visualMode: getVisualMode(),
    visualModes: Object.entries(vision.MODES).map(([id, m]) => ({ id, label: m.label })),
    ffmpeg: !!FFMPEG,
    categories: MOD_CATEGORIES.map(c => ({ id: c.id, label: c.label, count: c.words.length, sample: c.words.slice(0, 6) })),
    videos: items
  });
});

app.post('/api/admin/moderation/scan', admin, async (q, s) => {
  const force = !!(q.body || {}).force, LIMIT = 12;
  const all = db.prepare("SELECT * FROM videos ORDER BY id DESC").all();
  const todo = all.filter(v => FFMPEG && (force || !v.mod_visual) && v.mod_status !== 'safe');
  const batch = todo.slice(0, LIMIT);
  for (const v of batch) { const vs = await visualScan(path.join(UP, v.file), ''); if (vs) saveVisual(v.id, vs) }
  let flagged = 0, blocked = 0;
  for (const v of all) {
    const r = runVideoAutoMod(v.id);
    if (r && (r.level === 'violation' || r.level === 'warning')) flagged++;
    if (r && r.mod_status === 'blocked') blocked++;
  }
  s.json({ ok: true, scanned: all.length, visual_scanned: batch.length, remaining: Math.max(0, todo.length - batch.length), flagged, blocked, ffmpeg: !!FFMPEG });
});

app.post('/api/admin/moderation/rules', admin, (q, s) => {
  const b = q.body || {};
  if (b.customWords !== undefined) {
    const clean = String(b.customWords || '').split(',').map(w => w.trim().toLowerCase()).filter(Boolean).join(', ');
    db.prepare("INSERT INTO admin_settings(k,v) VALUES('mod_custom_words',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(clean);
  }
  if (b.autoBlockScore !== undefined) {
    const th = clamp(parseInt(b.autoBlockScore) || 85, 50, 100);
    db.prepare("INSERT INTO admin_settings(k,v) VALUES('mod_autoblock',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(String(th));
  }
  if (b.visualMode !== undefined && vision.MODES[b.visualMode]) {
    db.prepare("INSERT INTO admin_settings(k,v) VALUES('mod_visual',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(b.visualMode);
  }
  s.json({ ok: true, customWords: getCustomModWords(), autoBlockScore: getAutoBlockThreshold(), visualMode: getVisualMode() });
});

app.post('/api/admin/moderation/bulk', admin, (q, s) => {
  const act = String((q.body || {}).action || '').trim();
  if (act === 'approve_warnings') {
    const res = db.prepare("UPDATE videos SET mod_status='safe',mod_score=0,mod_checked=strftime('%s','now') WHERE mod_status IN ('warning','flagged') OR (mod_status='auto' AND mod_score>=25 AND mod_score<60)").run();
    return s.json({ ok: true, count: res.changes });
  }
  if (act === 'unblock_all') {
    const blocked = db.prepare("SELECT * FROM videos WHERE mod_status='blocked'").all();
    for (const v of blocked) {
      db.prepare("UPDATE videos SET mod_status='safe',mod_score=0,mod_checked=strftime('%s','now') WHERE id=?").run(v.id);
      forgetBlockedHashes(v.id);
      db.prepare("UPDATE video_appeals SET status='approved',decided=strftime('%s','now') WHERE video_id=? AND status='pending'").run(v.id);
      db.prepare("DELETE FROM warnings WHERE video_id=? AND kind='takedown'").run(v.id);
    }
    return s.json({ ok: true, count: blocked.length });
  }
  return bad(s, 400, 'Aksi massal tidak valid');
});

app.post('/api/admin/moderation/videos/:id', admin, async (q, s) => {
  const v = db.prepare('SELECT * FROM videos WHERE id=?').get(q.params.id);
  if (!v) return noVideo(s);
  const action = String((q.body || {}).action || '').trim();
  const note = String((q.body || {}).note || '').trim();
  if (action === 'approve') {
    db.prepare("UPDATE videos SET mod_status='safe',mod_score=0,mod_checked=strftime('%s','now') WHERE id=?").run(v.id);
    forgetBlockedHashes(v.id);
    db.prepare("DELETE FROM reports WHERE kind='video' AND target=?").run(String(v.id));
    db.prepare("DELETE FROM warnings WHERE video_id=? AND kind='takedown'").run(v.id);
    const ap = getLatestAppeal(v.id);
    if (ap && ap.status === 'pending') {
      db.prepare("UPDATE video_appeals SET status='approved',note=?,decided=strftime('%s','now') WHERE id=?").run(note, ap.id);
      sysNotify(v.user_id, 'appeal_ok', note || `Banding disetujui oleh Sistem Zippy! Videomu ${vLabel(v)} telah dipulihkan ke publik.`, v.id, 'video');
    }
    return s.json({ ok: true, status: 'safe' });
  }
  if (action === 'warn') {
    db.prepare("UPDATE videos SET mod_status='warning',mod_checked=strftime('%s','now') WHERE id=?").run(v.id);
    sysNotify(v.user_id, 'warning', note || `Peringatan Pedoman Komunitas: Videomu ${vLabel(v)} terdeteksi melanggar kebijakan komunitas Zippy.`, v.id, 'video');
    return s.json({ ok: true, status: 'warning' });
  }
  if (action === 'block') {
    db.prepare("UPDATE videos SET mod_status='blocked',mod_checked=strftime('%s','now') WHERE id=?").run(v.id);
    registerBlockedHashes(v);
    sysNotify(v.user_id, 'warning', note || `Tindakan Moderasi Sistem Zippy: Videomu ${vLabel(v)} ditakedown karena melanggar Pedoman Komunitas. Video tidak bisa diputar dan tidak tampil di publik. Kamu dapat mengajukan banding dari halaman profilmu.`, v.id, 'takedown');
    return s.json({ ok: true, status: 'blocked' });
  }
  if (action === 'unblock') {
    db.prepare("UPDATE videos SET mod_status='safe',mod_score=0,mod_checked=strftime('%s','now') WHERE id=?").run(v.id);
    forgetBlockedHashes(v.id);
    db.prepare("DELETE FROM warnings WHERE video_id=? AND kind='takedown'").run(v.id);
    const ap = getLatestAppeal(v.id);
    if (ap && ap.status === 'pending') {
      db.prepare("UPDATE video_appeals SET status='approved',note=?,decided=strftime('%s','now') WHERE id=?").run(note, ap.id);
      sysNotify(v.user_id, 'appeal_ok', note || `Banding disetujui oleh Sistem Zippy! Videomu ${vLabel(v)} telah dipulihkan ke publik.`, v.id, 'video');
    }
    return s.json({ ok: true, status: 'safe' });
  }
  if (action === 'rescan') {
    const vs = await visualScan(path.join(UP, v.file), '');
    if (!vs) return bad(s, 503, 'Pemindaian visual gagal atau melewati batas waktu');
    saveVisual(v.id, vs);
    db.prepare("UPDATE videos SET mod_status=CASE WHEN mod_status IN ('flagged','warning') THEN 'auto' ELSE mod_status END WHERE id=?").run(v.id);
    const r = runVideoAutoMod(v.id);
    return s.json({ ok: true, status: r ? r.mod_status : 'auto', score: r ? r.score : 0, error: vs.error || '' });
  }
  return bad(s, 400, 'Aksi moderasi tidak valid');
});
app.put('/api/admin/videos/:id/privacy', admin, (q, s) => {
  const v = db.prepare('SELECT * FROM videos WHERE id=?').get(q.params.id);
  if (!v) return noVideo(s);
  const pv = PRIV.includes((q.body || {}).privacy) ? q.body.privacy : 'public';
  db.prepare('UPDATE videos SET privacy=? WHERE id=?').run(pv, v.id);
  s.json({ ok: true, privacy: pv });
});
app.delete('/api/admin/videos/:id', admin, (q, s) => {
  const v = db.prepare('SELECT * FROM videos WHERE id=?').get(q.params.id);
  if (!v) return noVideo(s);
  db.prepare('DELETE FROM videos WHERE id=?').run(v.id);
  db.prepare("DELETE FROM reports WHERE kind='video' AND target=?").run(String(v.id));
  fs.unlink(path.join(UP, v.file), () => {});
  s.json({ ok: true });
});

/* ---------- Story, Arsip Story, & Sorotan ---------- */
const STO = `SELECT s.id,s.file,s.kind,s.text,s.created,s.audio_id,
  av.file audio_file,COALESCE(NULLIF(av.audio_title,''),'Suara Asli') audio_title,
  au.username audio_u,COALESCE(NULLIF(au.name,''),au.username) audio_name`;
const STO_JOIN = `FROM stories s LEFT JOIN videos av ON av.id=s.audio_id LEFT JOIN users au ON au.id=av.user_id`;

app.get('/api/stories', need, (q, s) => {
  const m = q.uid, rows = db.prepare(`SELECT u.username,u.name,u.avatar,u.verified,COUNT(s.id) n,MAX(s.created) latest,
    SUM(CASE WHEN sv.user_id IS NOT NULL THEN 0 ELSE 1 END) unseen
    FROM stories s JOIN users u ON u.id=s.user_id LEFT JOIN story_views sv ON sv.story_id=s.id AND sv.user_id=${m}
    WHERE ${ACTIVE} AND (s.user_id=${m} OR s.user_id IN (SELECT b FROM follows WHERE a=${m})) GROUP BY u.id`).all();
  const mine = me(m).username;
  s.json({ stories: rows.map(r => ({ ...r, own: r.username === mine, unseen: Number(r.unseen || 0) })).sort((a, b) => (b.own - a.own) || ((b.unseen > 0) - (a.unseen > 0)) || b.latest - a.latest) });
});
app.get('/api/users/:name/stories', (q, s) => {
  const t = uidOf(q.params.name), m = U(q.uid);
  if (!t) return bad(s, 404, 'Pengguna tidak ditemukan');
  if (!storyOk(m, t)) return s.json({ stories: [] });
  s.json({ stories: db.prepare(`${STO},(sv.user_id IS NOT NULL) seen,(SELECT COUNT(*) FROM story_views WHERE story_id=s.id AND user_id<>s.user_id) views ${STO_JOIN}
    LEFT JOIN story_views sv ON sv.story_id=s.id AND sv.user_id=${m} WHERE s.user_id=? AND ${ACTIVE} ORDER BY s.id`).all(t).map(x => ({ ...x, seen: !!x.seen, views: t === m ? x.views : undefined })) });
});
app.post('/api/stories', need, upload.fields([{ name: 'media', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), async (q, s) => {
  const f = ((q.files || {}).media || [])[0]; let au = ((q.files || {}).audio || [])[0];
  try {
    if (!f || !/^(video|image)\//.test(f.mimetype)) { dropFiles(f, au); return bad(s, 400, 'Pilih foto atau video untuk story') }
    const kind = f.mimetype.startsWith('video/') ? 'video' : 'image'; let file = f.filename;
    const aid = parseInt(q.body.audio_id) || null;
    const srcVid = aid ? db.prepare('SELECT id,file FROM videos WHERE id=?').get(aid) : null;
    if (kind === 'video') {
      const ed = parseEdits(q.body);
      if (srcVid && !au && FFMPEG && (ed.te || ed.crop || ed.vo !== 1)) {
        const sp = path.join(UP, srcVid.file);
        if (fs.existsSync(sp)) au = { path: sp, keep: true };
      }
      try { file = (await applyEdits(q, f, au)).file } catch (e) { dropFiles(f, au); return bad(s, e.status || 500, e.msg || 'Gagal memproses video') }
    } else dropFiles(au);
    const r = db.prepare('INSERT INTO stories(user_id,file,kind,text,audio_id) VALUES(?,?,?,?,?)').run(q.uid, file, kind, String(q.body.text || '').slice(0, 120), srcVid ? srcVid.id : null);
    db.prepare('INSERT OR IGNORE INTO story_views(story_id,user_id) VALUES(?,?)').run(r.lastInsertRowid, q.uid);
    s.json({ story: db.prepare(`${STO} ${STO_JOIN} WHERE s.id=?`).get(r.lastInsertRowid) });
  } catch (e) { console.error(e); dropFiles(f, au); bad(s, 500, 'Terjadi kesalahan di server') }
});
app.delete('/api/stories/:id', need, (q, s) => {
  const x = db.prepare('SELECT * FROM stories WHERE id=? AND user_id=?').get(q.params.id, q.uid); if (!x) return bad(s, 404, 'Story tidak ditemukan');
  db.prepare('DELETE FROM stories WHERE id=?').run(x.id); fs.unlink(path.join(UP, x.file), () => {}); s.json({ ok: true });
});
app.post('/api/stories/:id/view', need, (q, s) => {
  const x = db.prepare('SELECT user_id FROM stories WHERE id=?').get(q.params.id);
  if (x && storyOk(q.uid, x.user_id)) db.prepare('INSERT OR IGNORE INTO story_views(story_id,user_id) VALUES(?,?)').run(q.params.id, q.uid);
  s.json({ ok: true });
});
app.get('/api/stories/:id/views', need, (q, s) => {
  if (!db.prepare('SELECT 1 FROM stories WHERE id=? AND user_id=?').get(q.params.id, q.uid)) return bad(s, 404, 'Story tidak ditemukan');
  s.json({ views: db.prepare('SELECT u.username,u.name,u.avatar,v.created FROM story_views v JOIN users u ON u.id=v.user_id WHERE v.story_id=? AND v.user_id<>? ORDER BY v.created DESC LIMIT 200').all(q.params.id, q.uid) });
});
app.get('/api/me/stories/archive', need, (q, s) => {
  const rows = db.prepare(`${STO},(SELECT COUNT(*) FROM story_views WHERE story_id=s.id AND user_id<>s.user_id) views ${STO_JOIN} WHERE s.user_id=? ORDER BY s.id DESC LIMIT 200`).all(q.uid);
  s.json({ stories: rows.map(x => ({ ...x, seen: true, views: x.views || 0 })) });
});

const hlStories = id => db.prepare(`${STO} FROM highlight_items hi JOIN stories s ON s.id=hi.story_id LEFT JOIN videos av ON av.id=s.audio_id LEFT JOIN users au ON au.id=av.user_id WHERE hi.highlight_id=? ORDER BY hi.pos,s.id`).all(id);
const hlSet = (hid, uid, ids) => {
  db.prepare('DELETE FROM highlight_items WHERE highlight_id=?').run(hid);
  [...new Set((Array.isArray(ids) ? ids : []).map(Number))].slice(0, 100).forEach((sid, i) => {
    if (db.prepare('SELECT 1 FROM stories WHERE id=? AND user_id=?').get(sid, uid)) db.prepare('INSERT INTO highlight_items VALUES(?,?,?)').run(hid, sid, i);
  });
};
app.get('/api/highlights/:id', (q, s) => {
  const h = db.prepare('SELECT h.id,h.title,h.user_id,u.username,u.name,u.avatar,u.verified,u.private FROM highlights h JOIN users u ON u.id=h.user_id WHERE h.id=?').get(q.params.id);
  if (!h) return bad(s, 404, 'Sorotan tidak ditemukan');
  if (h.private && U(q.uid) !== h.user_id && !follows(U(q.uid), h.user_id)) return bad(s, 403, 'Akun ini privat. Ikuti untuk melihat sorotan.');
  s.json({ highlight: { id: h.id, title: h.title, username: h.username, name: h.name, avatar: h.avatar, verified: !!h.verified }, stories: hlStories(h.id).map(x => ({ ...x, seen: true })) });
});
app.post('/api/highlights', need, (q, s) => {
  const t = String((q.body || {}).title || '').trim().slice(0, 20) || 'Sorotan', ids = (q.body || {}).story_ids;
  if (!Array.isArray(ids) || !ids.length) return bad(s, 400, 'Pilih minimal satu story');
  const r = db.prepare('INSERT INTO highlights(user_id,title) VALUES(?,?)').run(q.uid, t), id = Number(r.lastInsertRowid); hlSet(id, q.uid, ids);
  if (!db.prepare('SELECT 1 FROM highlight_items WHERE highlight_id=?').get(id)) { db.prepare('DELETE FROM highlights WHERE id=?').run(id); return bad(s, 400, 'Story tidak valid') }
  s.json({ id });
});
app.put('/api/highlights/:id', need, (q, s) => {
  const h = db.prepare('SELECT * FROM highlights WHERE id=? AND user_id=?').get(q.params.id, q.uid); if (!h) return bad(s, 404, 'Sorotan tidak ditemukan');
  const b = q.body || {}; if (b.title !== undefined) db.prepare('UPDATE highlights SET title=? WHERE id=?').run(String(b.title).trim().slice(0, 20) || h.title, h.id);
  if (b.story_ids !== undefined) { if (!Array.isArray(b.story_ids) || !b.story_ids.length) return bad(s, 400, 'Pilih minimal satu story'); hlSet(h.id, q.uid, b.story_ids) }
  s.json({ ok: true });
});
app.delete('/api/highlights/:id', need, (q, s) => {
  if (!db.prepare('DELETE FROM highlights WHERE id=? AND user_id=?').run(q.params.id, q.uid).changes) return bad(s, 404, 'Sorotan tidak ditemukan');
  s.json({ ok: true });
});

/* ---------- Notifikasi ---------- */
app.get('/api/notifs', need, (q, s) => s.json({ notifs: (rows => rows.map(r => ({ ...r, verified: !!r.verified, pending: !!r.pending, takedown: !!r.takedown, vcap: r.vcap || '', note: r.note || '' })))(db.prepare("SELECT n.id,n.type,n.video_id,n.note,n.created,n.seen,u.username,u.name,u.avatar,u.verified,nv.code vcode,nv.caption vcap,(nv.mod_status='blocked') takedown,(n.type='request' AND EXISTS(SELECT 1 FROM follow_requests r WHERE r.a=n.actor AND r.b=n.user_id)) pending FROM notifs n JOIN users u ON u.id=n.actor LEFT JOIN videos nv ON nv.id=n.video_id WHERE n.user_id=? ORDER BY n.id DESC LIMIT 60").all(q.uid)) }));
app.post('/api/notifs/read', need, (q, s) => { db.prepare('UPDATE notifs SET seen=1 WHERE user_id=?').run(q.uid); s.json({ ok: true }) });
app.get('/api/badges', need, (q, s) => s.json({
  notifs: db.prepare('SELECT COUNT(*) c FROM notifs WHERE user_id=? AND seen=0').get(q.uid).c,
  msgs: db.prepare(`SELECT COUNT(*) c FROM msgs m WHERE m.r=? AND m.seen=0 AND IFNULL(m.kind,'')<>'recalled' AND m.id>IFNULL((SELECT cleared FROM prefs WHERE u=m.r AND p=m.s),0)`).get(q.uid).c }));

/* ---------- Pesan ---------- */
const DAY = () => Math.floor((Date.now() / 1000 + 25200) / 86400);
const pair = (x, y) => x < y ? [x, y] : [y, x];

function getStreakTierMeta(n, isDead = false) {
  if (isDead || !n || n <= 0) return { tier: "dead", label: "Api Padam", min: 0, next: 1, nextLabel: "Api Baru (1 Hari)" };
  if (n >= 100) return { tier: "t100", label: "Api Pelangi Abadi", min: 100, next: null, nextLabel: "Level Maksimal!" };
  if (n >= 50) return { tier: "t50", label: "Api Emas Surya", min: 50, next: 100, nextLabel: "Api Pelangi Abadi (100 Hari)" };
  if (n >= 30) return { tier: "t30", label: "Api Naga Crimson", min: 30, next: 50, nextLabel: "Api Emas Surya (50 Hari)" };
  if (n >= 20) return { tier: "t20", label: "Api Hijau Zamrud", min: 20, next: 30, nextLabel: "Api Naga Crimson (30 Hari)" };
  if (n >= 10) return { tier: "t10", label: "Api Ungu Kosmik", min: 10, next: 20, nextLabel: "Api Hijau Zamrud (20 Hari)" };
  if (n >= 7) return { tier: "t7", label: "Api Biru Elektrik", min: 7, next: 10, nextLabel: "Api Ungu Kosmik (10 Hari)" };
  if (n >= 3) return { tier: "t3", label: "Api Merah Membara", min: 3, next: 7, nextLabel: "Api Biru Elektrik (7 Hari)" };
  return { tier: "t1", label: "Api Oranye Hangat", min: 1, next: 3, nextLabel: "Api Merah Membara (3 Hari)" };
}

function streakInfo(uid, peerId) {
  const [a, b] = pair(uid, peerId), r = db.prepare('SELECT * FROM streaks WHERE a=? AND b=?').get(a, b);
  const nowSec = Math.floor(Date.now() / 1000), d = DAY();
  const nextMidnightSec = (d + 1) * 86400 - 25200;
  const hoursLeft = Math.max(1, Math.ceil((nextMidnightSec - nowSec) / 3600));
  if (!r || (!r.n && !r.peak && !r.dead)) {
    return { n: 0, dead: false, last: 0, dying: false, need: "both", hours_left: hoursLeft, ...getStreakTierMeta(0, false) };
  }
  const expiredByDay = (d - (r.sday || 0)) > 1;
  const expiredByIdle = r.last_ts > 0 && (nowSec - r.last_ts) > 36 * 3600 && r.sday < d;
  const isDead = !!(r.dead || expiredByDay || expiredByIdle || r.n <= 0);
  if (isDead) {
    const lastN = Math.max(r.n || 0, r.peak || 0, 1);
    if (!r.dead || r.n > 0) {
      try { db.prepare("UPDATE streaks SET n=0,dead=1,peak=? WHERE a=? AND b=?").run(lastN, a, b) } catch {}
    }
    return { n: 0, dead: true, last: lastN, dying: false, need: "both", hours_left: 0, ...getStreakTierMeta(0, true) };
  }
  const mySentToday = (uid === a ? r.la : r.lb) === d;
  const peerSentToday = (uid === a ? r.lb : r.la) === d;
  const need = (mySentToday && peerSentToday) ? "done" : (!mySentToday && !peerSentToday) ? "both" : !mySentToday ? "me" : "them";
  const dying = r.sday < d && need !== "done";
  return {
    n: r.n,
    dead: false,
    last: r.peak || r.n,
    dying,
    need,
    hours_left: hoursLeft,
    ...getStreakTierMeta(r.n, false)
  };
}

function streak(x, y) {
  return streakInfo(x, y).n;
}

function bump(from, to) {
  const [a, b] = pair(from, to), d = DAY(), nowSec = Math.floor(Date.now() / 1000);
  db.prepare('INSERT OR IGNORE INTO streaks(a,b) VALUES(?,?)').run(a, b);
  const r0 = db.prepare('SELECT * FROM streaks WHERE a=? AND b=?').get(a, b);
  if (r0 && ((d - (r0.sday || 0)) > 1 || r0.dead)) {
    const lastPeak = Math.max(r0.n || 0, r0.peak || 0);
    db.prepare("UPDATE streaks SET n=0,dead=1,peak=? WHERE a=? AND b=?").run(lastPeak, a, b);
  }
  db.prepare(`UPDATE streaks SET ${from === a ? 'la' : 'lb'}=?,last_ts=? WHERE a=? AND b=?`).run(d, nowSec, a, b);
  const r = db.prepare('SELECT * FROM streaks WHERE a=? AND b=?').get(a, b);
  if (r.la === d && r.lb === d && r.sday < d) {
    const nextN = (d - r.sday <= 1 && r.n > 0 && !r.dead) ? r.n + 1 : 1;
    const nextPeak = Math.max(nextN, r.peak || 0);
    db.prepare('UPDATE streaks SET n=?,sday=?,dead=0,peak=?,last_ts=? WHERE a=? AND b=?').run(nextN, d, nextPeak, nowSec, a, b);
  }
}
const prefs = (u, p) => db.prepare('SELECT nick,wall,pinned,cleared FROM prefs WHERE u=? AND p=?').get(u, p) || { nick: '', wall: '', pinned: 0, cleared: 0 };
const LB = { image: 'Foto', audio: 'Pesan suara', sticker: 'Stiker', video: 'Video', story_reply: 'Membalas story', recalled: 'Pesan ditarik' }, PR = 'SELECT username,name,avatar,verified,private FROM users WHERE id=?';
const PAIR = '((s=? AND r=?) OR (s=? AND r=?))';
const canMessageUser = (sender, target) => {
  if (!sender || !target || sender === target) return false;
  const t = me(target);
  if (!t) return false;
  if (!t.private) return true;
  if (follows(sender, target) || follows(target, sender)) return true;
  return !!db.prepare('SELECT 1 FROM msgs WHERE s=? AND r=? LIMIT 1').get(target, sender);
};
const markRead = (from, to) => {
  const n = db.prepare('UPDATE msgs SET seen=1 WHERE s=? AND r=? AND seen=0').run(from, to).changes;
  if (n) push(from, 'read', { by: me(to).username });
};
app.get('/api/chats', need, (q, s) => {
  const ids = db.prepare('SELECT DISTINCT CASE WHEN s=? THEN r ELSE s END p FROM msgs WHERE s=? OR r=?').all(q.uid, q.uid, q.uid).map(x => x.p);
  const chats = ids.map(p => {
    const pf = prefs(q.uid, p), u = db.prepare(PR).get(p);
    if (!u) return null;
    const m = db.prepare(`SELECT text,kind,created,s,seen FROM msgs WHERE id>? AND ${PAIR} ORDER BY id DESC LIMIT 1`).get(pf.cleared, q.uid, p, p, q.uid);
    if (!m) return null;
    return { ...u, nick: pf.nick, pinned: pf.pinned, last: m.text || LB[m.kind] || '', mine: m.s === q.uid, seen: !!m.seen, created: m.created, streak: streak(q.uid, p), streak_info: streakInfo(q.uid, p), friend: friends(q.uid, p),
      unread: db.prepare("SELECT COUNT(*) c FROM msgs WHERE s=? AND r=? AND seen=0 AND id>? AND IFNULL(kind,'')<>'recalled'").get(p, q.uid, pf.cleared).c };
  }).filter(Boolean).sort((x, y) => y.pinned - x.pinned || y.created - x.created);
  s.json({ chats });
});
app.get('/api/chats/:name', need, (q, s) => {
  const p = uidOf(q.params.name);
  if (!p) return bad(s, 404, 'Pengguna tidak ditemukan');
  if (!canMessageUser(q.uid, p)) return bad(s, 403, 'Akun ini privat. Ikuti dan tunggu disetujui untuk mengirim pesan.');
  markRead(p, q.uid);
  const pf = prefs(q.uid, p);
  s.json({ user: db.prepare(PR).get(p), ...pf, streak: streak(q.uid, p), streak_info: streakInfo(q.uid, p), friend: friends(q.uid, p),
    msgs: db.prepare(`SELECT id,s=? mine,text,created,pinned,media,kind,seen FROM msgs WHERE id>? AND ${PAIR} ORDER BY id DESC LIMIT 200`).all(q.uid, pf.cleared, q.uid, p, p, q.uid).reverse() });
});
app.post('/api/chats/:name/typing', need, (q, s) => {
  const p = uidOf(q.params.name);
  if (p && p !== q.uid && canMessageUser(q.uid, p)) {
    const u = me(q.uid);
    push(p, 'typing', { from: u.username, name: u.name || u.username });
  }
  s.json({ ok: true });
});
app.post('/api/chats/:name', need, upload.single('file'), (q, s) => {
  const p = uidOf(q.params.name), t = String(q.body.text || '').trim().slice(0, 1000), [kind, media] = mk(q);
  if (!p || p === q.uid) return bad(s, 400, 'Penerima tidak valid');
  if (!canMessageUser(q.uid, p)) return bad(s, 403, 'Akun @' + q.params.name + ' privat. Ikuti dulu untuk mengirim pesan.');
  if (!t && !kind) return bad(s, 400, 'Pesan masih kosong');
  const r = db.prepare('INSERT INTO msgs(s,r,text,media,kind) VALUES(?,?,?,?,?)').run(q.uid, p, t, media, kind); bump(q.uid, p);
  const msg = { id: Number(r.lastInsertRowid), text: t, created: Math.floor(Date.now() / 1000), kind, media, seen: 0 }, u = me(q.uid);
  push(p, 'msg', { ...msg, from: u.username, name: u.name, avatar: u.avatar });
  s.json({ streak: streak(q.uid, p), streak_info: streakInfo(q.uid, p), msg });
});
app.post('/api/chats/:name/pin', need, (q, s) => {
  const p = uidOf(q.params.name); if (!p) return bad(s, 404, 'Pengguna tidak ditemukan');
  db.prepare('INSERT INTO prefs(u,p,pinned) VALUES(?,?,1) ON CONFLICT(u,p) DO UPDATE SET pinned=1-pinned').run(q.uid, p);
  s.json({ pinned: !!prefs(q.uid, p).pinned });
});
app.post('/api/chats/:name/clear', need, (q, s) => {
  const p = uidOf(q.params.name); if (!p) return bad(s, 404, 'Pengguna tidak ditemukan');
  const mx = db.prepare(`SELECT MAX(id) m FROM msgs WHERE ${PAIR}`).get(q.uid, p, p, q.uid).m || 0;
  db.prepare('INSERT INTO prefs(u,p,cleared) VALUES(?,?,?) ON CONFLICT(u,p) DO UPDATE SET cleared=excluded.cleared').run(q.uid, p, mx);
  markRead(p, q.uid);
  s.json({ ok: true });
});
app.delete('/api/messages/:id', need, (q, s) => {
  const m = db.prepare('SELECT * FROM msgs WHERE id=? AND s=?').get(q.params.id, q.uid);
  if (!m) return bad(s, 404, 'Pesan tidak ditemukan');
  db.prepare("UPDATE msgs SET text='',media=NULL,kind='recalled',pinned=0 WHERE id=?").run(m.id);
  if (m.media && !['sticker', 'video', 'story_reply'].includes(m.kind)) fs.unlink(path.join(UP, m.media), () => {});
  push(m.r, 'del', { id: m.id }); s.json({ ok: true });
});
app.post('/api/chats/:name/seen', need, (q, s) => { const p = uidOf(q.params.name); if (p) markRead(p, q.uid); s.json({ ok: true }) });
app.post('/api/messages/:id/pin', need, (q, s) => {
  const m = db.prepare('SELECT * FROM msgs WHERE id=? AND (s=? OR r=?)').get(q.params.id, q.uid, q.uid);
  if (!m) return bad(s, 404, 'Pesan tidak ditemukan');
  db.prepare('UPDATE msgs SET pinned=? WHERE id=?').run(m.pinned ? 0 : 1, m.id); s.json({ pinned: !m.pinned });
});
app.put('/api/chats/:name/prefs', need, upload.single('wall'), (q, s) => {
  const p = uidOf(q.params.name);
  if (!p) return bad(s, 404, 'Pengguna tidak ditemukan');
  if (q.file && !q.file.mimetype.startsWith('image/')) { fs.unlink(q.file.path, () => {}); return bad(s, 400, 'File harus berupa gambar') }
  const o = prefs(q.uid, p);
  const nick = q.body.nick !== undefined ? String(q.body.nick).trim().slice(0, 30) : o.nick;
  const wall = q.file ? q.file.filename : q.body.wall !== undefined ? String(q.body.wall).slice(0, 40) : o.wall;
  db.prepare('INSERT INTO prefs(u,p,nick,wall) VALUES(?,?,?,?) ON CONFLICT(u,p) DO UPDATE SET nick=excluded.nick,wall=excluded.wall').run(q.uid, p, nick, wall);
  s.json({ nick, wall });
});
app.use((e, q, s, n) => { console.error(e); s.status(500).json({ error: 'Terjadi kesalahan di server' }) });
app.listen(PORT, () => console.log(`Zippy v2.9 (Swipe. Play. Repeat.) jalan di http://localhost:${PORT} · Panel Sistem: http://localhost:${PORT}/admin.html`));
