// Scroll-driven image sequence for the hero, Apple style.
// Same interface as hero.js, so main.js only needs: import('./heroSequence.js')
// Frames live in public/hero/1920/0000.webp ... and public/hero/1280/ for small screens.

const FRAMES = 300;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export async function initHero({ canvas, track, onProgress, onReady }) {
  const small = matchMedia('(max-width: 760px)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dir = `${import.meta.env.BASE_URL}hero/${small ? 1280 : 1920}/`;
  const src = (i) => `${dir}${String(i).padStart(4, '0')}.webp`;

  const ctx = canvas.getContext('2d', { alpha: false });
  const imgs = new Array(FRAMES);
  const ready = new Array(FRAMES).fill(false);

  // load every 10th frame first so the whole scroll works early, then fill in the gaps
  const order = [];
  for (let step of [10, 5, 1]) for (let i = 0; i < FRAMES; i += step) if (!order.includes(i)) order.push(i);
  if (!order.includes(FRAMES - 1)) order.splice(1, 0, FRAMES - 1);

  const load = (i) => new Promise((res) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { imgs[i] = im; ready[i] = true; dirty = true; res(); };
    im.onerror = () => res();
    im.src = src(i);
  });

  // nearest frame that has arrived, so scrolling ahead of the download never shows a gap
  const nearest = (i) => {
    if (ready[i]) return i;
    for (let d = 1; d < FRAMES; d++) {
      if (i - d >= 0 && ready[i - d]) return i - d;
      if (i + d < FRAMES && ready[i + d]) return i + d;
    }
    return -1;
  };

  let width = 1, height = 1, dpr = 1;
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    width = Math.max(1, r.width);
    height = Math.max(1, r.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    dirty = true;
  }

  // cover-fit, like background-size: cover
  function drawImage(im, alpha) {
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.globalAlpha = alpha;
    ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  // one whole frame at a time: blending neighbours doubles every edge and reads as blur
  function draw(p) {
    const a = nearest(Math.round(p * (FRAMES - 1)));
    if (a < 0) return;
    drawImage(imgs[a], 1);
    ctx.globalAlpha = 1;
  }

  const target = () => {
    const r = track.getBoundingClientRect();
    const span = r.height - innerHeight;
    return span <= 0 ? 0 : clamp01(-r.top / span);
  };

  let p = 0, lastP = -1, dirty = true, visible = true, debugP = null;
  new ResizeObserver(resize).observe(canvas.parentElement);
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { rootMargin: '10% 0px' }).observe(track);
  resize();

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = debugP ?? target();
    p = reduce || debugP !== null ? t : p + (t - p) * 0.085;
    if (Math.abs(t - p) < 0.0002) p = t;
    if (!dirty && Math.abs(p - lastP) < 1e-5) return;
    dirty = false;
    lastP = p;
    draw(p);
    onProgress?.(p);
  }

  await load(0);
  p = target();
  draw(p);
  onReady?.();
  requestAnimationFrame(frame);
  (async () => { for (const i of order) if (!ready[i]) await load(i); })();

  return {
    setProgressForDebug: (v) => { debugP = clamp01(v); dirty = true; },
    clearDebug: () => { debugP = null; dirty = true; },
  };
}
