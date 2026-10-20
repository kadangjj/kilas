/* ============================================================
   Zippy · notifikasi (termasuk Peringatan, Pengumuman, & Keputusan Banding Sistem),
   lencana belum dibaca, dan aliran realtime (SSE)
   ============================================================ */
const NT = {
  like: 'menyukai videomu',
  comment: 'mengomentari videomu',
  reply: 'membalas komentarmu',
  share: 'membagikan videomu',
  follow: 'mulai mengikutimu',
  friend: 'sekarang berteman denganmu',
  mention: 'menyebutmu',
  repost: 'me-repost videomu',
  request: 'meminta untuk mengikutimu',
  accepted: 'menerima permintaan ikutmu',
  verified: 'Selamat! Akunmu sudah terverifikasi oleh Sistem (centang biru)',
  verify_no: 'Pengajuan verifikasimu belum disetujui Sistem. Lihat alasannya di Pengaturan.',
  appeal_ok: 'Banding Disetujui Sistem Zippy! Videomu telah dipulihkan ke publik.',
  appeal_no: 'Banding Videomu Ditolak Sistem Zippy',
  warning: 'Peringatan dari Sistem Zippy',
  broadcast: 'Pengumuman Resmi Sistem Zippy'
};
const SYS = ['verified', 'verify_no', 'appeal_ok', 'appeal_no', 'warning', 'broadcast'];
const NI = { like: 'heart', comment: 'msg', reply: 'msg', share: 'share', follow: 'userplus', friend: 'users', mention: 'at', repost: 'repeat', request: 'userplus', accepted: 'check', verified: 'star', verify_no: 'info', appeal_ok: 'check', appeal_no: 'ban', warning: 'alert', broadcast: 'megaphone' };

function warnVideoChip(v) {
  if (!v || !v.code) return '';
  return `<div class="wn-v static${v.takedown ? ' td' : ''}">${ic('video', 's')}<span><b>${v.caption ? esc(String(v.caption).slice(0, 60)) : 'Video tanpa keterangan'}</b><small>Kode ${esc(v.code)}${v.takedown ? ' \u00b7 Ditakedown: tidak bisa diputar &amp; tidak tampil di publik' : ''}</small></span></div>`;
}
function warningSheet(note, created, isBroadcast = false, v = null, sysType = 'warning') {
  const isAppealOk = sysType === 'appeal_ok';
  const isAppealNo = sysType === 'appeal_no';
  const title = isBroadcast ? 'Pengumuman Sistem' : isAppealOk ? 'Banding Disetujui Sistem' : isAppealNo ? 'Banding Ditolak Sistem' : 'Peringatan Sistem';
  const iconName = isBroadcast ? 'megaphone' : isAppealOk ? 'check' : isAppealNo ? 'ban' : 'alert';
  sheet(`<div class="thanks">
    <span class="sa sysi ${isBroadcast ? '' : isAppealOk ? 'k-appeal_ok' : 'k-warning'}" style="width:56px;height:56px">${ic(iconName, 'f')}</span>
    <h3>${ic(iconName, 's')} ${title}</h3>
    <p style="font-weight:600;padding:10px 14px;border-radius:14px;background:var(--sf2);width:100%;line-height:1.5">${esc(note || 'Harap patuhi pedoman komunitas Zippy.')}</p>
    ${isBroadcast ? '' : warnVideoChip(v)}
    ${created ? `<small class="mu">Diterima ${dt(created)}</small>` : ''}
    ${!isBroadcast && v && v.code && !v.takedown ? '<button class="btn g" id="wv">Lihat videonya</button>' : ''}
    ${!isBroadcast && v && v.code && v.takedown ? `<button class="btn" id="td-ap">${ic('shield', 's')} Ajukan Banding / Detail Takedown</button>` : ''}
    <button class="btn${!isBroadcast && v && v.code && v.takedown ? ' g' : ''}" id="ok">Saya Mengerti</button>
  </div>`);
  $('#ok').onclick = closeSheet;
  const wv = $('#wv'); if (wv) wv.onclick = () => { closeSheet(); openVid(v.code) };
  const apBtn = $('#td-ap'); if (apBtn) apBtn.onclick = () => { closeSheet(); takedownSheet({ code: v.code, caption: v.caption || '', takedown: true }) };
}

async function notifs() {
  try {
    const { notifs: items } = await api('/notifs', { cache: 'no-store' });
    const row = n => SYS.includes(n.type)
      ? `<button class="li${n.seen ? '' : ' new'}${n.type === 'warning' || n.type === 'appeal_no' ? ' warn-li' : ''}" data-sys="${n.type}" data-note="${esc(n.note || '')}" data-ts="${n.created || 0}" data-vcode="${esc(n.vcode || '')}" data-vcap="${esc(n.vcap || '')}" data-td="${n.takedown ? 1 : 0}"><span class="sa sysi k-${n.type}">${ic(NI[n.type], 'f')}</span><span class="lt"><b>${NT[n.type]}</b>${n.note ? `<span>${esc(n.note)}</span>` : ''}${(n.type === 'warning' || n.type === 'appeal_ok' || n.type === 'appeal_no') && n.vcode ? `<span class="n-vid${n.takedown ? ' td' : ''}">${ic('video', 's')} ${n.takedown ? 'Ditakedown \u00b7 ' : ''}${n.vcap ? esc(String(n.vcap).slice(0, 34)) : 'Video tanpa keterangan'} \u00b7 ${esc(n.vcode)}</span>` : ''}<small>${ago(n.created)}</small></span>${ic('chev')}</button>`
      : n.type === 'request'
        ? `<div class="li req${n.seen ? '' : ' new'}" data-u="${esc(n.username)}"><span class="sa">${ava(n.username, n.avatar)}<span class="tp k-request">${ic('userplus', 'f')}</span></span><span class="lt"><span><b>${esc(n.name || '@' + n.username)}</b>${vbdg(n)} ${NT.request}</span><small>${ago(n.created)}</small></span>${n.pending ? '<span class="rq"><button class="btn sm" data-acc="1">Terima</button><button class="btn sm g" data-acc="0">Tolak</button></span>' : '<small class="mu">Selesai</small>'}</div>`
        : `<button class="li${n.seen ? '' : ' new'}" data-u="${esc(n.username)}" data-v="${n.video_id || ''}"><span class="sa">${ava(n.username, n.avatar)}<span class="tp k-${n.type}">${ic(NI[n.type] || 'bell', 'f')}</span></span><span class="lt"><span><b>${esc(n.name || '@' + n.username)}</b>${vbdg(n)} ${NT[n.type] || ''}</span>${n.type === 'reply' && n.note ? `<span class="mu n-snip">${esc(n.note)}</span>` : ''}<small>${ago(n.created)}</small></span>${n.video_id ? ic('chev') : ''}</button>`;
    page('#notif', `<header class="ab"><h2>Notifikasi</h2></header>${items.length ? items.map(row).join('') : empty('bell', 'Belum ada notifikasi', 'Suka, komentar, dan pengikut baru muncul di sini.')}`);
    $('#notif').onclick = async e => {
      const a = e.target.closest('[data-acc]'), li = e.target.closest('.li'); if (!li) return;
      if (a) { try { await post('/me/requests/' + encodeURIComponent(li.dataset.u), { action: a.dataset.acc === '1' ? 'accept' : 'decline' }); toast(a.dataset.acc === '1' ? 'Permintaan diterima' : 'Permintaan ditolak'); notifs() } catch (err) { toast(err.message, 'err'); notifs() } return }
      if (['warning', 'appeal_ok', 'appeal_no'].includes(li.dataset.sys)) {
        return warningSheet(li.dataset.note, +li.dataset.ts, false, li.dataset.vcode ? { code: li.dataset.vcode, caption: li.dataset.vcap, takedown: li.dataset.td === '1' } : null, li.dataset.sys);
      }
      if (li.dataset.sys === 'broadcast') return warningSheet(li.dataset.note, +li.dataset.ts, true, null, 'broadcast');
      if (li.dataset.sys) return verifySheet();
      li.dataset.v ? openVid(li.dataset.v) : openProfile(li.dataset.u);
    };
    post('/notifs/read').then(badges);
  } catch (e) { toast(e.message, 'err') }
}

/* ---------- Banner, bunyi, realtime (SSE) ---------- */
function beep() { if (!S.beep) return; try { const c = beep.c || (beep.c = new AudioContext()), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.setValueAtTime(.12, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .25); o.start(); o.stop(c.currentTime + .25) } catch {} }
function headsUp(av, title, txt, fn) {
  beep(); if (!S.banner) return; const h = $('#hb');
  h.innerHTML = `<span class="sa">${av}</span><span class="lt"><b>${esc(title)}</b><small>${esc(txt)}</small></span>`; h.onclick = () => { h.classList.remove('open'); fn() }; h.classList.add('open');
  clearTimeout(headsUp.t); headsUp.t = setTimeout(() => h.classList.remove('open'), 4000);
}
let es = null;
function live() {
  if (!token || es) return;
  es = new EventSource(`${SERVER}/api/stream?t=${encodeURIComponent(token)}`);
  es.onopen = badges;
  es.addEventListener('del', () => loadChat(true));
  es.addEventListener('read', () => {
    loadChat(true);
    if ($('#inbox').classList.contains('open')) inbox();
  });
  es.addEventListener('typing', e => {
    try { const d = JSON.parse(e.data); if (typeof showTyping === 'function') showTyping(d.from) } catch {}
  });
  es.addEventListener('banned', e => {
    let reason = '';
    try { reason = JSON.parse(e.data).reason || '' } catch {}
    unlive(); token = me = null; B.msg = B.nt = 0; paint(); localStorage.removeItem('kt');
    ['#inbox', '#notif', '#myprof'].forEach(k => { const el = $(k); if (el) el.innerHTML = '' });
    showHome(true);
    toast('Akun kamu telah diblokir oleh Sistem' + (reason ? ': ' + reason : ''), 'err');
  });
  es.addEventListener('msg', e => {
    const m = JSON.parse(e.data);
    if (typeof clearTyping === 'function') clearTyping(m.from);
    if (chatU && chatU.toLowerCase() === m.from.toLowerCase() && $('#chat').classList.contains('open') && !document.hidden) {
      addMsg({ ...m, mine: 0, pinned: 0 }); post('/chats/' + encodeURIComponent(chatU) + '/seen').then(badges).catch(() => {}); return;
    }
    B.msg++; paint(); headsUp(ava(m.from, m.avatar), m.name || '@' + m.from, m.text || LBL[m.kind] || '', () => openChat(m.from));
    if ($('#inbox').classList.contains('open')) inbox();
  });
  es.addEventListener('notif', e => {
    const n = JSON.parse(e.data); B.nt++; paint();
    headsUp(ava(n.username, n.avatar), SYS.includes(n.type) ? 'Sistem Zippy' : (n.name || '@' + n.username), n.type === 'reply' ? NT.reply + (n.note ? ': ' + n.note : '') : (n.note || NT[n.type] || ''), () => notifs());
    if ($('#notif').classList.contains('open')) notifs();
    if (n.type === 'appeal_ok' || n.type === 'appeal_no') reloadProfiles();
  });
}
function unlive() { es && es.close(); es = null }
setInterval(badges, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { badges(); loadChat(false) } });
