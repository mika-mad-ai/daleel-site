// Scroll-driven image sequence for the hero, Apple style.
// Same interface as hero.js, so main.js only needs: import('./heroSequence.js')
// Frames live in public/hero/1920/0000.webp ... and public/hero/1280/ for small screens.
//
// Built to stay smooth:
// - frames download many at a time, coarse to fine, so the whole scroll is covered within moments;
// - frames are decoded off the main thread, ahead of the scroll, and only decoded frames are ever drawn,
//   so painting never waits for a decode;
// - memory stays bounded: a window of decoded frames around the current one, plus sparse keyframes.

const FRAMES = 300;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export async function initHero({ canvas, track, onProgress, onReady }) {
  const small = matchMedia('(max-width: 760px)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dir = `${import.meta.env.BASE_URL}hero/${small ? 1280 : 1920}/`;
  const src = (i) => `${dir}${String(i).padStart(4, '0')}.webp`;
  let srcW = small ? 1280 : 1920;
  let srcH = small ? 720 : 1080;

  const PARALLEL = small ? 8 : 12; // downloads at once
  const DECODES = 4; // decodes at once
  const AHEAD = small ? 12 : 14; // decoded frames kept in the direction of travel
  const BEHIND = 6;
  const KEY = small ? 30 : 25; // every KEY-th frame stays decoded, so a fast flick always has something close
  const TAU = 110; // ms; how quickly the picture catches up with the scroll

  const ctx = canvas.getContext('2d', { alpha: false });
  const blobs = new Array(FRAMES); // compressed frames, as downloaded
  const frames = new Map(); // index -> decoded frame (ImageBitmap, or an <img> where bitmaps are unavailable)
  const decoding = new Set();
  const isKey = (i) => i % KEY === 0 || i === FRAMES - 1;

  const decode = async (blob) => {
    if ('createImageBitmap' in window) return createImageBitmap(blob);
    const im = new Image();
    im.src = URL.createObjectURL(blob);
    await im.decode();
    return im;
  };

  let center = 0; // the frame the scroll is asking for
  let travel = 1; // 1 scrolling down, -1 scrolling up
  let drawn = -1;
  let dirty = true;
  let visible = true;

  const inWindow = (i) => {
    const d = (i - center) * travel;
    return d <= AHEAD && d >= -BEHIND;
  };
  const wanted = (i) => i === drawn || isKey(i) || (visible && inWindow(i));

  // decode what the scroll is about to need, nearest first; release what it has left behind
  function pump() {
    for (const [i, f] of frames) {
      if (!wanted(i)) { f.close?.(); frames.delete(i); }
    }
    if (decoding.size >= DECODES) return;
    const todo = [];
    if (visible) {
      for (let d = 0; d <= AHEAD; d++) {
        const a = center + d * travel;
        const b = center - d * travel;
        if (a >= 0 && a < FRAMES) todo.push(a);
        if (d > 0 && d <= BEHIND && b >= 0 && b < FRAMES) todo.push(b);
      }
    }
    for (let i = 0; i < FRAMES; i += KEY) todo.push(i);
    todo.push(FRAMES - 1);
    for (const i of todo) {
      if (decoding.size >= DECODES) break;
      if (frames.has(i) || decoding.has(i) || !blobs[i]) continue;
      decoding.add(i);
      decode(blobs[i]).then((f) => {
        decoding.delete(i);
        if (wanted(i)) { frames.set(i, f); dirty = true; } else f.close?.();
        pump();
      }, () => { decoding.delete(i); });
    }
  }

  // nearest decoded frame, so scrolling ahead of the download or the decoder never shows a gap
  const nearest = (i) => {
    if (frames.has(i)) return i;
    let best = -1;
    let dist = Infinity;
    for (const k of frames.keys()) {
      const d = Math.abs(k - i);
      if (d < dist) { dist = d; best = k; }
    }
    return best;
  };

  let width = 1;
  let height = 1;
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    width = Math.max(1, r.width);
    height = Math.max(1, r.height);
    // never a bigger canvas than the frames can fill: CSS scales the rest, which costs nothing
    const k = Math.min(Math.min(devicePixelRatio || 1, 2), 1 / Math.max(width / srcW, height / srcH));
    canvas.width = Math.max(1, Math.round(width * k));
    canvas.height = Math.max(1, Math.round(height * k));
    dirty = true;
  }

  // cover-fit, like background-size: cover. One whole frame at a time: blending neighbours reads as blur.
  function draw(i) {
    const f = frames.get(i);
    const iw = f.width || f.naturalWidth;
    const ih = f.height || f.naturalHeight;
    const cw = canvas.width;
    const ch = canvas.height;
    const s = Math.max(cw / iw, ch / ih);
    ctx.drawImage(f, (cw - iw * s) / 2, (ch - ih * s) / 2, iw * s, ih * s);
  }

  const target = () => {
    const r = track.getBoundingClientRect();
    const span = r.height - innerHeight;
    return span <= 0 ? 0 : clamp01(-r.top / span);
  };

  let p = 0;
  let lastP = -1;
  let lastT = 0;
  let debugP = null;
  new ResizeObserver(resize).observe(canvas.parentElement);
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; pump(); }, { rootMargin: '10% 0px' }).observe(track);
  resize();

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(64, now - lastT);
    lastT = now;
    if (!visible) return;
    const t = debugP ?? target();
    p = reduce || debugP !== null ? t : p + (t - p) * (1 - Math.exp(-dt / TAU));
    if (Math.abs(t - p) < 0.0002) p = t;
    if (p !== lastP) {
      lastP = p;
      onProgress?.(p);
      const i = Math.round(p * (FRAMES - 1));
      if (i !== center) { travel = i > center ? 1 : -1; center = i; pump(); }
    }
    const best = nearest(center);
    if (best >= 0 && (best !== drawn || dirty)) { drawn = best; dirty = false; draw(best); }
  }

  const fetchFrame = async (i) => {
    try {
      const res = await fetch(src(i));
      if (!res.ok) return;
      blobs[i] = await res.blob();
      pump();
    } catch { /* a missing frame is covered by its neighbours */ }
  };

  // first frame, then the picture is ready
  await fetchFrame(0);
  if (blobs[0]) {
    const first = await decode(blobs[0]);
    srcW = first.width || first.naturalWidth || srcW;
    srcH = first.height || first.naturalHeight || srcH;
    frames.set(0, first);
    resize();
  }
  p = target();
  center = Math.round(p * (FRAMES - 1));
  const best = nearest(center);
  if (best >= 0) { drawn = best; draw(best); }
  onReady?.();
  requestAnimationFrame((now) => { lastT = now; frame(now); });

  // the rest: last frame and keyframes first, then every 10th, 5th, and all, several at a time
  const order = [];
  const seen = new Set([0]);
  const add = (i) => { if (i >= 0 && i < FRAMES && !seen.has(i)) { seen.add(i); order.push(i); } };
  add(FRAMES - 1);
  for (const step of [KEY, 10, 5, 2, 1]) for (let i = 0; i < FRAMES; i += step) add(i);
  let next = 0;
  const worker = async () => { while (next < order.length) await fetchFrame(order[next++]); };
  for (let k = 0; k < PARALLEL; k++) worker();

  return {
    setProgressForDebug: (v) => { debugP = clamp01(v); dirty = true; },
    clearDebug: () => { debugP = null; dirty = true; },
  };
}
