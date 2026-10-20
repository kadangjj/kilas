/* ============================================================
   Zippy · sistem SVG: ikon duotone, logo, stiker, ilustrasi
   Setiap ikon = [lapisan isi, garis]. Lapisan isi memakai warna
   teks saat ini dengan opasitas rendah, jadi otomatis ikut tema.
   ============================================================ */
const P = (d, x = '') => [d, d + x];
const IC = {
  home: ['M4 10.6 12 4l8 6.6V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z', 'M4 10.6 12 4l8 6.6V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19zM9.8 20.5v-5a1.2 1.2 0 0 1 1.2-1.2h2a1.2 1.2 0 0 1 1.2 1.2v5'],
  msg: P('M12 3.6c-4.7 0-8.5 3.3-8.5 7.5 0 2.2 1 4.1 2.7 5.4-.1 1.3-.6 2.4-1.6 3.3 1.9-.1 3.4-.7 4.5-1.6.9.2 1.9.4 2.9.4 4.7 0 8.5-3.3 8.5-7.5S16.7 3.6 12 3.6z', 'M8.4 11.2h.01M12 11.2h.01M15.6 11.2h.01'),
  plus: ['', 'M12 5v14M5 12h14'],
  bell: P('M6 10a6 6 0 0 1 12 0c0 4.4 1.4 5.9 2 6.5.2.2.1.5-.3.5H4.3c-.4 0-.5-.3-.3-.5.6-.6 2-2.1 2-6.5z', 'M10 20a2 2 0 0 0 4 0'),
  user: ['M4.5 20.5c.6-3.6 3.6-5.5 7.5-5.5s6.9 1.9 7.5 5.5zM12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z', 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4.5 20.5c.6-3.6 3.6-5.5 7.5-5.5s6.9 1.9 7.5 5.5'],
  heart: P('M12 20.6S3.5 15.4 3.5 9.5A4.6 4.6 0 0 1 12 7.1a4.6 4.6 0 0 1 8.5 2.4c0 5.9-8.5 11.1-8.5 11.1z'),
  share: P('M13 4.6 20.6 11 13 17.4v-3.9c-4.5 0-7.5 1.2-9.6 4.5.5-5 3.6-8.7 9.6-9.4z'),
  send: P('M20.6 3.4 3.4 10.2l6.7 2.7 2.7 6.7z', 'M10.1 12.9l4.5-4.5'),
  trash: ['M6 7.5h12l-.9 11.2a1.5 1.5 0 0 1-1.5 1.3H8.4a1.5 1.5 0 0 1-1.5-1.3z', 'M4 7.5h16M9.5 7.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2.5M6 7.5l.9 11.2a1.5 1.5 0 0 0 1.5 1.3h7.2a1.5 1.5 0 0 0 1.5-1.3L18 7.5M10 11.5v5M14 11.5v5'],
  back: ['', 'M14.5 5.5 8 12l6.5 6.5'],
  more: ['', 'M12 5.5h.01M12 12h.01M12 18.5h.01'],
  pin: P('M9 3.5h6l-.8 5.2 3.3 3.8h-11l3.3-3.8z', 'M12 12.5v8'),
  flame: P('M12 21.6c4 0 6.8-2.8 6.8-6.6 0-3.6-2.4-5.5-3.6-9.4-2.9 1.7-4.2 4.3-4.2 6.8-1.3-.8-2-2-2.2-3.4C6.7 11.1 5.2 13.6 5.2 15.3c0 3.8 3 6.3 6.8 6.3z'),
  gear: ['M15 4.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM9 14.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z', 'M4 7h8.8M17.2 7H20M4 17h2.8M11.2 17H20M15 4.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM9 14.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z'],
  sun: P('M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z', 'M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4'),
  moon: P('M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z'),
  vol: P('M4 9.5v5h3.5l4.5 3.8V5.7L7.5 9.5z', 'M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11'),
  mute: P('M4 9.5v5h3.5l4.5 3.8V5.7L7.5 9.5z', 'M16 9.5l5 5M21 9.5l-5 5'),
  play: P('M8 5.2v13.6a.8.8 0 0 0 1.2.7l11-6.8a.8.8 0 0 0 0-1.4l-11-6.8A.8.8 0 0 0 8 5.2z'),
  pause: ['M7 5h3.4v14H7zM13.6 5H17v14h-3.4z', 'M7 5h3.4v14H7zM13.6 5H17v14h-3.4z'],
  img: P('M5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4z', 'M4 16l4.5-4.5 4 4 2.5-2.5L20 17M9 8.5h.01'),
  out: ['', 'M9.5 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3.5M15.5 8l4 4-4 4M19.5 12H9.5'],
  edit: P('M4 20l.8-4.2L16.4 4.2a1.6 1.6 0 0 1 2.3 0l1.1 1.1a1.6 1.6 0 0 1 0 2.3L8.2 19.2z', 'M14.5 6.1l3.4 3.4'),
  close: ['', 'M6 6l12 12M18 6L6 18'],
  video: P('M3.5 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z', 'M15.5 10.5l5-3v9l-5-3'),
  info: P('M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z', 'M12 11v5.2M12 7.8h.01'),
  chev: ['', 'M9 5.5l6.5 6.5L9 18.5'],
  check: ['', 'M5 12.5l4.5 4.5L19 7.5'],
  smile: P('M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z', 'M8.2 14s1.4 2.2 3.8 2.2 3.8-2.2 3.8-2.2M9 9.5h.01M15 9.5h.01'),
  mic: P('M12 3.5a3 3 0 0 1 3 3V12a3 3 0 0 1-6 0V6.5a3 3 0 0 1 3-3z', 'M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3M9 20.5h6'),
  dl: ['', 'M12 4v11.5M7.5 11 12 15.5 16.5 11M5 20h14'],
  link: ['', 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  stitch: P('M4 6.5A1.5 1.5 0 0 1 5.5 5H10v14H5.5A1.5 1.5 0 0 1 4 17.5zM14 5h4.5A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5H14z', 'M10 12h4'),
  search: P('M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z', 'M16.2 16.2 21 21'),
  bookmark: P('M6.5 4h11A1.5 1.5 0 0 1 19 5.5v14.7a.5.5 0 0 1-.8.4L12 15.8l-6.2 4.8a.5.5 0 0 1-.8-.4V5.5A1.5 1.5 0 0 1 6.5 4z'),
  save: P('M6.5 4h11A1.5 1.5 0 0 1 19 5.5v14.7a.5.5 0 0 1-.8.4L12 15.8l-6.2 4.8a.5.5 0 0 1-.8-.4V5.5A1.5 1.5 0 0 1 6.5 4z'),
  flag: P('M5 4.5h11.5l-2 4 2 4H5z', 'M5 4v17'),
  lock: ['M6.5 10.5h11A1.5 1.5 0 0 1 19 12v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5z', 'M6.5 10.5h11A1.5 1.5 0 0 1 19 12v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5zM8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.8v2'],
  users: ['M9.5 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM3 20c.5-3.2 3-5 6.5-5s6 1.8 6.5 5z', 'M9.5 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM3 20c.5-3.2 3-5 6.5-5s6 1.8 6.5 5M16 4.4a3.5 3.5 0 0 1 0 6.2M18.5 15.3c1.6.7 2.4 2.1 2.7 4.2'],
  globe: P('M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z', 'M3.5 12h17M12 3.5c2.5 2.4 3.6 5.3 3.6 8.5s-1.1 6.1-3.6 8.5c-2.5-2.4-3.6-5.3-3.6-8.5S9.5 5.9 12 3.5z'),
  mapPin: P('M12 21s6.5-5.7 6.5-11A6.5 6.5 0 0 0 5.5 10c0 5.3 6.5 11 6.5 11z', 'M12 8.2a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6z'),
  hash: ['', 'M9.5 4 8 20M16 4l-1.5 16M4.5 9h15.5M4 15h15.5'],
  repeat: ['', 'M17 3.5l3.5 3.5-3.5 3.5M20.5 7H8a4 4 0 0 0-4 4v1M7 20.5 3.5 17 7 13.5M3.5 17H16a4 4 0 0 0 4-4v-1'],
  at: ['', 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM15.5 8.5v5a2 2 0 0 0 4 0V12a7.5 7.5 0 1 0-3 6'],
  mail: P('M5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9A2.5 2.5 0 0 1 5.5 5z', 'M3.5 8l8.5 6 8.5-6'),
  key: P('M8 9.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z', 'M11 14.5l9-9M16.5 9l2.5 2.5'),
  palette: P('M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-1 1.5-2.2-.5-1.2.2-2.3 1.5-2.3H17a3.5 3.5 0 0 0 3.5-3.5C20.5 7 16.7 3.5 12 3.5z', 'M7.5 11h.01M10 7.5h.01M14.5 7.5h.01'),
  eye: P('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z', 'M12 9.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6z'),
  phone: P('M8 3.5h8A1.5 1.5 0 0 1 17.5 5v14a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 19V5A1.5 1.5 0 0 1 8 3.5z', 'M10.5 17.5h3'),
  spark: P('M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z', 'M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z'),
  clock: P('M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z', 'M12 7.5V12l3 2'),
  camera: P('M4.5 8h2.2l1.4-2h7.8l1.4 2h2.2A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-8A1.5 1.5 0 0 1 4.5 8z', 'M12 10.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'),
  grid: P('M5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4A1.5 1.5 0 0 1 5.5 4zM14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5v-4A1.5 1.5 0 0 1 14.5 4zM5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4A1.5 1.5 0 0 1 5.5 13zM14.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4a1.5 1.5 0 0 1 1.5-1.5z'),
  star: P('M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z'),
  rotate: ['', 'M20 12a8 8 0 1 1-2.4-5.7M20 4v4.5h-4.5'],
  refresh: ['', 'M20 12a8 8 0 1 1-2.4-5.7M20 4v4.5h-4.5'],
  crop: ['', 'M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14'],
  scissors: ['', 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.1 7.9 20 20M8.1 16.1 20 4'],
  music: ['', 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'],
  eyeoff: ['', 'M3 3l18 18M10.6 5.7a9.6 9.6 0 0 1 1.4-.2c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3.3 4M6.5 7C3.9 8.7 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9.4 9.4 0 0 0 4.1-.9M9.9 9.9a2.8 2.8 0 0 0 3.9 3.9'],
  calendar: ['M4 6.5h16V20H4z', 'M4 6.5h16V20H4zM4 10.5h16M8 3.5v4M16 3.5v4'],
  download: ['', 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14'],
  userplus: ['M9.5 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM3 20c.5-3.2 3-5 6.5-5 1.3 0 2.4.3 3.4.8L13 20z', 'M9.5 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM3 20c.5-3.2 3-5 6.5-5 1.2 0 2.3.3 3.2.7M18 14.5v6M15 17.5h6'],
  type: ['', 'M5 7V5h14v2M12 5v14M9 19h6'],
  alert: P('M12 3.8 21 19.5H3z', 'M12 10v4.2M12 17h.01'),
  shield: P('M12 3.5 19 6v5.5c0 4.2-2.9 7.3-7 9-4.1-1.7-7-4.8-7-9V6z', 'M9 12l2.2 2.2L15.5 10'),
  checks: ['', 'M2.5 12.5l4 4L15 8M9.5 12.5l4 4L22 8'],
  ban: ['M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z', 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM6 6l12 12'],
  brush: ['M18.4 3.6a2.2 2.2 0 0 1 3.1 3.1L12 16.2l-4 1 1-4z', 'M18.4 3.6a2.2 2.2 0 0 1 3.1 3.1L12 16.2l-4 1 1-4zM5 17c-1.5 1-2 3-3 4 2.5 0 4.5-.5 5.5-2'],
  megaphone: P('M4 10v4h3l5 4V6L7 10zm11-3.5v11l5 2V4.5z', 'M7 14l1 4.5a1.5 1.5 0 0 0 3 0L10.2 14'),
  menu: ['', 'M4 6.5h16M4 12h16M4 17.5h16'],
  footprints: ['M8.5 4.5a2.2 3.2 0 1 0 0 6.4 2.2 3.2 0 0 0 0-6.4zM15.5 8a2.2 3.2 0 1 0 0 6.4 2.2 3.2 0 0 0 0-6.4z', 'M8.5 4.5a2.2 3.2 0 1 0 0 6.4 2.2 3.2 0 0 0 0-6.4zM7 13c0 1.4.7 2.2 1.5 2.2S10 14.4 10 13zM15.5 8a2.2 3.2 0 1 0 0 6.4 2.2 3.2 0 0 0 0-6.4zM14 16.5c0 1.4.7 2.2 1.5 2.2s1.5-.8 1.5-2.2z'],
  tag: P('M3.5 12.4V4.5a1 1 0 0 1 1-1h7.9a1 1 0 0 1 .7.3l7.6 7.6a1 1 0 0 1 0 1.4l-7.9 7.9a1 1 0 0 1-1.4 0l-7.6-7.6a1 1 0 0 1-.3-.7z', 'M8 8h.01'),
};
const ic = (n, c = '') => {
  const [f, s] = IC[n] || ['', ''];
  return `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${f ? `<path class="d" d="${f}"/>` : ''}<path d="${s}"/></svg>`;
};

/* ---------- Gradasi bersama (satu kali, tidak di-display:none) ---------- */
document.body.insertAdjacentHTML('afterbegin', `<svg id="defs" width="0" height="0" style="position:absolute;pointer-events:none" aria-hidden="true"><defs>
<linearGradient id="gB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#60a5fa"/></linearGradient>
<linearGradient id="gHeart" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8aa0"/><stop offset="1" stop-color="#ff2f58"/></linearGradient>
<linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a0"/><stop offset="1" stop-color="#ffb21e"/></linearGradient>
<linearGradient id="gFire" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset=".55" stop-color="#ff8a1f"/><stop offset="1" stop-color="#ff3d2e"/></linearGradient>
<linearGradient id="gPurple" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#6366f1"/></linearGradient>
<linearGradient id="gMint" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6ee7b7"/><stop offset="1" stop-color="#10b981"/></linearGradient>
<linearGradient id="gPink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbcfe8"/><stop offset="1" stop-color="#ec4899"/></linearGradient>
<radialGradient id="rGold" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#fff4b0"/><stop offset=".5" stop-color="#ffd23f"/><stop offset="1" stop-color="#ff9f1c"/></radialGradient>
<radialGradient id="rPink" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#ffe0ec"/><stop offset=".5" stop-color="#ff93bd"/><stop offset="1" stop-color="#ff5f9a"/></radialGradient>
<radialGradient id="rSky" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#e2f6ff"/><stop offset=".5" stop-color="#86d3ff"/><stop offset="1" stop-color="#3b9bff"/></radialGradient>
</defs></svg>`);

/* ---------- Logo ---------- */
// lencana centang biru (hanya untuk akun yang disetujui sistem)
const VBP = (() => { let p = ''; for (let i = 0; i < 24; i++) { const a = Math.PI * i / 12, r = i % 2 ? 8.4 : 10.3; p += (i ? 'L' : 'M') + (12 + r * Math.sin(a)).toFixed(2) + ' ' + (12 - r * Math.cos(a)).toFixed(2) } return p + 'z' })();
const vbdg = o => o && o.verified ? `<svg class="vb" viewBox="0 0 24 24" role="img" aria-label="Terverifikasi"><path d="${VBP}" fill="#1d9bf0" stroke="#1d9bf0" stroke-width="1.4" stroke-linejoin="round"/><path d="M7.6 12.4l3 3 5.8-6.2" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>` : '';
const logo = (z = 28) => `<svg class="logo" width="${z}" height="${z}" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="url(#gB)"/><path d="M18.4 4.6 8 18.2h6.5L13 27.4 24.2 13.2h-6.6z" fill="#fff"/><path d="M4 9a9 9 0 0 1 9-5h9c-5 .6-10 2.7-18 5z" fill="#fff" opacity=".18"/></svg>`;

/* ---------- Stiker (id s:1 … s:12, atau c:<filename> untuk stiker custom) ---------- */
const eyes = (c = '#3b2400') => `<ellipse cx="22.5" cy="27" rx="3.6" ry="4.6" fill="${c}"/><ellipse cx="41.5" cy="27" rx="3.6" ry="4.6" fill="${c}"/><circle cx="23.8" cy="25.2" r="1.3" fill="#fff"/><circle cx="42.8" cy="25.2" r="1.3" fill="#fff"/>`;
const fc = (g, inner) => `<ellipse cx="32" cy="60" rx="17" ry="2.6" fill="#000" opacity=".12"/><circle cx="32" cy="31" r="28.5" fill="url(#${g})"/><ellipse cx="22" cy="14.5" rx="11" ry="5.5" fill="#fff" opacity=".32" transform="rotate(-22 22 14.5)"/>${inner}`;
const stroke = (d, w = 3.6, c = '#3b2400') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const blush = '<ellipse cx="15" cy="38" rx="4.5" ry="3" fill="#ff6b6b" opacity=".35"/><ellipse cx="49" cy="38" rx="4.5" ry="3" fill="#ff6b6b" opacity=".35"/>';
const STK = [
  fc('rGold', eyes() + stroke('M19 38q13 14 26 0') + blush),
  fc('rGold', eyes() + stroke('M21 48q11-12 22 0') + '<path d="M44 33c2 3 3 5 3 7a3 3 0 0 1-6 0c0-2 1.600-4 3-7z" fill="#6cc4ff"/>'),
  fc('rSky', eyes('#0b2b55') + stroke('M24 44h16', 3.6, '#0b2b55')),
  fc('rPink', stroke('M15 29q7-8 14 0M35 29q7-8 14 0') + stroke('M20 40q12 12 24 0') + blush),
  fc('rGold', '<rect x="10" y="21" width="21" height="14" rx="6" fill="#1f2937"/><rect x="33" y="21" width="21" height="14" rx="6" fill="#1f2937"/><path d="M31 26h2" stroke="#1f2937" stroke-width="3"/><path d="M14 24l6 0M37 24l6 0" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".5"/>' + stroke('M20 44q12 10 24 0')),
  '<ellipse cx="32" cy="60" rx="17" ry="2.6" fill="#000" opacity=".12"/><path d="M32 4.5l8.2 17.2 18.8 2.3-13.800 13 3.600 18.600L32 46.300 15.200 55.600l3.600-18.600L5 24l18.800-2.300z" fill="url(#gGold)" stroke="#ffb21e" stroke-width="1.500" stroke-linejoin="round"/><path d="M32 10l5 11" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>',
  '<ellipse cx="32" cy="60" rx="17" ry="2.6" fill="#000" opacity=".12"/><path d="M32 57S5 41 5 22a13 13 0 0 1 27-4 13 13 0 0 1 27 4c0 19-27 35-27 35z" fill="url(#gHeart)"/><path d="M13 20a8 8 0 0 1 8-7" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/>',
  '<ellipse cx="32" cy="60" rx="17" ry="2.6" fill="#000" opacity=".12"/><path d="M32 60c14 0 22-10 22-22 0-14-10-20-14-34-10 7-14 16-14 24-4-3-6-7-6-12C10 25 6 33 6 40c0 13 10 20 26 20z" fill="url(#gFire)"/><path d="M32 58c7 0 11-5 11-10 0-6-5-9-7-14-5 4-7 8-7 12-2-1-3-3-3-5-3 3-5 6-5 9 0 5 4 8 11 8z" fill="#ffe27a" opacity=".85"/>',
  fc('rGold', eyes() + '<ellipse cx="32" cy="45" rx="6" ry="8" fill="#5b2b00"/><ellipse cx="32" cy="49" rx="3.500" ry="3" fill="#ff7b7b"/>' + stroke('M15 18q5-4 10-2M39 16q5-2 10 2', 2.6)),
  fc('rGold', '<path d="M22.500 33c-5-3.500-6-7-3.500-9a4.200 4.200 0 0 1 3.500 1.600A4.200 4.200 0 0 1 26 24c2.500 2 1.500 5.500-3.500 9zM41.500 33c-5-3.500-6-7-3.500-9a4.200 4.200 0 0 1 3.500 1.600A4.200 4.200 0 0 1 45 24c2.500 2 1.500 5.500-3.500 9z" fill="#ff3d6e" transform="translate(0 -1)"/>' + stroke('M19 40q13 14 26 0') + blush),
  fc('rGold', stroke('M16 25l9 4-9 4M48 25l-9 4 9 4', 3.4) + '<path d="M17 38h30c0 9-6.500 14-15 14s-15-5-15-14z" fill="#5b2b00"/><path d="M24 48c2-3 14-3 16 0-2 3-14 3-16 0z" fill="#ff7b7b"/><path d="M8 33c3 2 3 5 0 7-3-2-3-5 0-7zM56 33c3 2 3 5 0 7-3-2-3-5 0-7z" fill="#6cc4ff"/>'),
  '<ellipse cx="32" cy="60" rx="17" ry="2.6" fill="#000" opacity=".12"/><path d="M36 3 12 35h14l-4 26 28-36H34z" fill="url(#gGold)" stroke="#ffb21e" stroke-width="1.500" stroke-linejoin="round"/>',
];
const stk = (id, z) => {
  const s = String(id || '');
  if (s.startsWith('c:')) {
    const fn = s.slice(2).replace(/[&"<>]/g, '');
    return `<img class="cstk" data-cfile="${fn}" src="${(window.ZIPPY_SERVER || window.KILAS_SERVER || '') + '/uploads/' + fn}" width="${z}" height="${z}" alt="Stiker" loading="lazy">`;
  }
  return `<svg viewBox="0 0 64 64" width="${z}" height="${z}" aria-hidden="true">${STK[s.slice(2) - 1] || ''}</svg>`;
};

/* ---------- Ilustrasi keadaan kosong ---------- */
const sp = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0-6 1.600-1.600 6 0 1.600 1.600 0 6-1.600 1.600-6 0-1.600-1.600z" fill="${c}"/>`;
const shadow = '<ellipse cx="60" cy="88" rx="32" ry="4.500" fill="currentColor" opacity=".09"/>';
const ART = {
  video: shadow + '<rect x="24" y="16" width="46" height="64" rx="11" fill="url(#gPurple)" opacity=".55" transform="rotate(-9 47 48)"/><g transform="rotate(7 71 44)"><rect x="48" y="12" width="46" height="64" rx="11" fill="url(#gB)"/><path d="M65 33.500 81 44 65 54.500z" fill="#fff"/></g>' + sp(20, 26, 1.100, '#ffb21e') + sp(104, 20, .9, '#ff6fa8') + '<circle cx="103" cy="70" r="3.500" fill="#6ee7b7"/>',
  msg: shadow + '<path d="M22 22a10 10 0 0 1 10-10h34a10 10 0 0 1 10 10v22a10 10 0 0 1-10 10H46L32 66V54a10 10 0 0 1-10-10z" fill="url(#gB)"/><circle cx="40" cy="33" r="3" fill="#fff"/><circle cx="50" cy="33" r="3" fill="#fff"/><circle cx="60" cy="33" r="3" fill="#fff"/><path d="M62 52a9 9 0 0 1 9-9h22a9 9 0 0 1 9 9v14a9 9 0 0 1-9 9v9L82 75H71a9 9 0 0 1-9-9z" fill="url(#gPink)" opacity=".95"/>' + sp(100, 22, .9, '#ffb21e'),
  bell: shadow + '<path d="M60 14c-14 0-22 10-22 24 0 16-7 20-9 23-.8 1.100 0 2.500 1.400 2.500h59.200c1.400 0 2.200-1.400 1.400-2.500-2-3-9-7-9-23 0-14-8-24-22-24z" fill="url(#gGold)"/><path d="M52 69a8 8 0 0 0 16 0z" fill="#ff9f1c"/><circle cx="60" cy="11" r="4" fill="#ff9f1c"/><path d="M44 28c3-6 8-9 14-10" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6" fill="none"/>' + sp(26, 30, 1, '#6366f1') + sp(98, 36, 1.200, '#ff6fa8'),
  search: shadow + '<circle cx="54" cy="44" r="26" fill="#fff" opacity=".4"/><circle cx="54" cy="44" r="26" fill="none" stroke="url(#gB)" stroke-width="9"/><path d="M74 64l18 18" stroke="url(#gPurple)" stroke-width="11" stroke-linecap="round"/><path d="M40 34a16 16 0 0 1 10-7" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8" fill="none"/>' + sp(94, 26, 1.100, '#ffb21e') + sp(22, 70, .8, '#6ee7b7'),
  save: shadow + '<path d="M36 12h48a8 8 0 0 1 8 8v62a2 2 0 0 1-3.200 1.600L60 66 31.200 83.600A2 2 0 0 1 28 82V20a8 8 0 0 1 8-8z" fill="url(#gGold)"/><path d="M60 52S46 44 46 35a7.500 7.500 0 0 1 14-3.500A7.500 7.500 0 0 1 74 35c0 9-14 17-14 17z" fill="#fff"/>' + sp(98, 24, 1, '#ff6fa8') + sp(20, 40, .9, '#6366f1'),
  users: shadow + '<circle cx="36" cy="38" r="12" fill="url(#gPink)"/><path d="M14 74c1-13 10-20 22-20s21 7 22 20z" fill="url(#gPink)" opacity=".8"/><circle cx="84" cy="38" r="12" fill="url(#gMint)"/><path d="M62 74c1-13 10-20 22-20s21 7 22 20z" fill="url(#gMint)" opacity=".8"/><circle cx="60" cy="32" r="14" fill="url(#gB)"/><path d="M34 80c1.500-16 12-24 26-24s24.500 8 26 24z" fill="url(#gB)"/>',
  heart: shadow + '<path d="M60 82S22 58 22 34a20 20 0 0 1 38-9 20 20 0 0 1 38 9c0 24-38 48-38 48z" fill="url(#gHeart)"/><path d="M36 30a12 12 0 0 1 12-11" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55" fill="none"/>' + sp(100, 22, 1.200, '#ffb21e') + sp(18, 62, .9, '#6366f1'),
  story: shadow + '<circle cx="60" cy="46" r="34" fill="none" stroke="url(#gPink)" stroke-width="7" stroke-dasharray="14 7"/><circle cx="60" cy="46" r="25" fill="url(#gB)"/><path d="M60 34v24M48 46h24" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' + sp(100, 18, 1, '#ffb21e') + sp(18, 20, .8, '#6ee7b7'),
  lock: shadow + '<path d="M42 44V34a18 18 0 0 1 36 0v10" fill="none" stroke="url(#gPurple)" stroke-width="9" stroke-linecap="round"/><rect x="30" y="42" width="60" height="42" rx="12" fill="url(#gPurple)"/><circle cx="60" cy="60" r="6" fill="#fff"/><path d="M60 64v9" stroke="#fff" stroke-width="5" stroke-linecap="round"/>' + sp(98, 28, 1, '#ffb21e'),
  check: shadow + '<circle cx="60" cy="46" r="34" fill="url(#gMint)"/><path d="M44 47l11 11 22-24" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' + sp(100, 22, 1.100, '#ffb21e') + sp(20, 62, .9, '#ff6fa8'),
};
const art = (k, z = 120) => `<svg class="art" width="${z}" height="${z * .8}" viewBox="0 0 120 96" aria-hidden="true">${ART[k] || ''}</svg>`;
