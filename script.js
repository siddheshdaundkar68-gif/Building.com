/* ===== SETTINGS ===== */
const TOTAL_FRAMES = 238;   // your total number of frames
const FRAME_PATH = (n) =>
  `frames/ezgif-frame-${String(n).padStart(3, '0')}.jpg`;   // change .jpg to .png if yours are PNG
/* ===================== */

// Always start at the top of the page (stops the browser jumping down on open)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const root = document.documentElement;
root.style.scrollBehavior = 'auto';            // jump, do not slide
if (!location.hash) window.scrollTo(0, 0);
requestAnimationFrame(() => requestAnimationFrame(() => { root.style.scrollBehavior = ''; }));

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/* ---------- Hero frame animation ---------- */
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingQuality = 'high';
const scrollBox = $('.scroll'), stage = $('.stage');
const heroText = $('#heroText'), nav = $('#nav');

const frames = new Array(TOTAL_FRAMES).fill(null);
let finished = 0, current = -1, smooth = 0;

// Frame 1 loads first, so the building shows at once. The rest load in the background.
function load(i, tries = 0) {
  const img = new Image();
  img.onload = () => {
    frames[i] = img;
    if (i === 0) { resize(); startRest(); setTimeout(reveal, 1300); }
    step();
  };
  img.onerror = () => {
    if (tries < 3) setTimeout(() => load(i, tries + 1), 300);
    else { if (i === 0) { startRest(); fail(); } step(); }
  };
  img.src = FRAME_PATH(i + 1);
}
let started = false;
function startRest() {
  if (started) return; started = true;
  for (let i = 1; i < TOTAL_FRAMES; i++) load(i);
}
function step() { finished++; }
function reveal() { document.body.classList.remove('intro'); }
setTimeout(reveal, 4000);   // safety: never leave the page hidden
function fail() {
  const d = document.createElement('div');
  d.className = 'err';
  d.textContent = 'No frames found. Check the frames folder and file names.';
  document.body.appendChild(d);
  reveal();
}
load(0);

function resize() {
  const r = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = canvas.clientWidth * r;
  canvas.height = canvas.clientHeight * r;
  ctx.imageSmoothingQuality = 'high';
  current = -1;
  drawFrame(Math.round(smooth * (TOTAL_FRAMES - 1)));
}

function drawFrame(index) {
  index = clamp(index, 0, TOTAL_FRAMES - 1);
  if (index === current) return;
  let k = index;
  while (k > 0 && !frames[k]) k--;
  const img = frames[k];
  if (!img) return;
  current = index;
  const s = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
}

/* ---------- Everything that reacts to scroll ---------- */
const panels = $$('.panel');
function update() {
  const rect = scrollBox.getBoundingClientRect();
  const total = rect.height - stage.offsetHeight;
  const target = clamp(-rect.top / total);
  smooth += (target - smooth) * 0.25;
  if (Math.abs(target - smooth) < 0.002) smooth = target;
  drawFrame(Math.round(smooth * (TOTAL_FRAMES - 1)));

  const intro = document.body.classList.contains('intro');

  // hero text fades out near the end of the animation
  if (!intro) heroText.classList.toggle('off', target > 0.82);

  // nav turns light once the hero is over (never at the very top, never during the opening)
  nav.classList.toggle('solid', !intro && scrollY > 80 && rect.height > 0 && rect.bottom < innerHeight * 0.6);

  // full-screen project panels: slow zoom-out as each one arrives
  panels.forEach((p) => {
    const t = clamp(p.getBoundingClientRect().top / innerHeight);
    const img = $('img', p);
    if (img) img.style.transform = `scale(${1 + 0.12 * t})`;
  });

  requestAnimationFrame(update);
}
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(update);

/* ---------- Fade-in on scroll ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.15 });
$$('.rv').forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 90}ms`; io.observe(el); });

/* ---------- Sub navigation highlight ---------- */
const subLinks = $$('#subnav a');
const spy = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      subLinks.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
      const on = $('#subnav a.on');
      if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
subLinks.forEach((a) => { const s = $(a.getAttribute('href')); if (s) spy.observe(s); });

/* ---------- Highlights photo stack (tap or drag the top card) ---------- */
const deck = $('#deck');
let order = $$('.card', deck);
function layout() {
  order.forEach((c, i) => {
    c.style.zIndex = order.length - i;
    c.style.transform = `translate(${i * 18}px, ${i * -12}px) rotate(${i * 2.4}deg) scale(${1 - i * 0.04})`;
    c.style.opacity = i > 2 ? 0 : 1;
  });
}
function flick(dir = 1) {
  const top = order[0];
  top.style.transform = `translate(${dir * 130}%, -6%) rotate(${dir * 14}deg)`;
  top.style.opacity = 0;
  setTimeout(() => { order.push(order.shift()); layout(); }, 350);
}
layout();
let sx = null;
deck.addEventListener('pointerdown', (e) => { sx = e.clientX; });
deck.addEventListener('pointerup', (e) => {
  if (sx === null) return;
  const dx = e.clientX - sx; sx = null;
  flick(dx < 0 ? -1 : 1);
});

/* ---------- Menu, dropdown, lightbox, forms ---------- */
const menu = $('#menu');
menu.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', open);
});
$$('#links a').forEach((a) => a.addEventListener('click', (e) => {
  if (a.id === 'dropBtn' && innerWidth > 900) return;
  nav.classList.remove('open'); menu.setAttribute('aria-expanded', false);
}));
$('#dropBtn').addEventListener('click', (e) => {
  if (matchMedia('(hover: none)').matches && innerWidth > 900) {
    e.preventDefault(); e.currentTarget.parentElement.classList.toggle('open');
  }
});

const lb = $('#lb');
$$('.g').forEach((b) => b.addEventListener('click', () => {
  const img = $('img', b);
  if (!img) return;
  $('img', lb).src = img.src; lb.hidden = false;
}));
lb.addEventListener('click', () => { lb.hidden = true; });

$('#form').addEventListener('submit', (e) => {
  e.preventDefault();
  $('#ok').textContent = 'Thanks. We will call you within one working day.';
  e.target.reset();
});
