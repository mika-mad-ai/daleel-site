import '@fontsource-variable/outfit';
import '@fontsource-variable/instrument-sans';
import './style.css';

import arrow from '@phosphor-icons/core/assets/regular/arrow-right.svg?raw';
import arrowLeft from '@phosphor-icons/core/assets/regular/arrow-left.svg?raw';
import check from '@phosphor-icons/core/assets/regular/check.svg?raw';
import sound from '@phosphor-icons/core/assets/regular/speaker-high.svg?raw';
import play from '@phosphor-icons/core/assets/fill/play-fill.svg?raw';
import whatsapp from '@phosphor-icons/core/assets/regular/whatsapp-logo.svg?raw';
import waBrand from 'simple-icons/icons/whatsapp.svg?raw';
import lock from '@phosphor-icons/core/assets/regular/lock-simple.svg?raw';

/* ===== Settings you can edit ===== */
const WHATSAPP_NUMBER = '971501305942'; // international format, digits only
const DEMO_TEXT = "Hi Daleel team, I'd like to learn more about how you could help the brokers in my agency close more deals. Could we book a quick demo?";
const HIRE_TEXT = "Hi Daleel team, I'd like to hire Daleel for my agency. What are the next steps?";
const TRIAL_TEXT = "Hi Daleel team, I'd like to start the 30-day trial for my agency. What are the next steps?";
// Free month: secure payment page (for example a Stripe Payment Link with a 30-day trial).
// While this is empty, the form hands the request over to the Daleel team on WhatsApp instead.
const TRIAL_CHECKOUT_URL = '';
const PRICE_LIST = 30000;
const PRICE_CASE = 18000;
/* ================================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const aed = (n) => `AED ${fmt(n)}`;
window.dataLayer = window.dataLayer || [];
const track = (event, data) => window.dataLayer.push({ event, ...data });

/* icons (Phosphor) */
const ICONS = { arrow, 'arrow-left': arrowLeft, check, sound, play, whatsapp, lock, 'wa-brand': waBrand };
$$('[data-icon]').forEach((el) => {
  el.innerHTML = ICONS[el.dataset.icon] || '';
  el.setAttribute('aria-hidden', 'true');
  el.classList.add('ic');
});

/* WhatsApp links */
const wa = (text) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
$$('.js-hire').forEach((a) => { a.href = wa(HIRE_TEXT); });
$$('.js-wa').forEach((a) => { a.href = wa(DEMO_TEXT); });
$$('.js-trial').forEach((a) => { a.href = wa(TRIAL_TEXT); });
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href*="wa.me"]');
  if (a) track('whatsapp_click', { section: a.closest('section, header, footer')?.id || 'page', label: a.textContent.trim() });
});

/* hero: 3D scene + the three text beats */
const heroTrack = $('.hero-track');
const beats = $$('.beat');
const WINDOWS = [[-1, 0.13, 0.2], [0.3, 0.5, 0.58], [0.86, 2, 3]]; // [fade-in start, hold end, fade-out end]
function setBeats(p) {
  beats.forEach((el, i) => {
    const [a, b, c] = WINDOWS[i];
    const fin = i === 0 ? 1 : Math.min(1, Math.max(0, (p - a) / 0.07));
    const fout = 1 - Math.min(1, Math.max(0, (p - b) / (c - b)));
    const o = Math.min(fin, fout);
    el.style.opacity = o.toFixed(3);
    el.style.transform = `translate3d(0, ${((1 - fin) * 18 - (1 - fout) * 18).toFixed(1)}px, 0)`;
    el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    if (i > 0) el.setAttribute('aria-hidden', o < 0.5 ? 'true' : 'false');
  });
  $('.hero-veil').style.opacity = (1 - Math.min(1, Math.max(0, (p - 0.1) / 0.2))).toFixed(3);
  document.body.classList.toggle('in-hero-deep', p > 0.2);
}
setBeats(0);
import('./heroSequence.js')
  .then(({ initHero }) => initHero({
    canvas: $('#city'),
    track: heroTrack,
    onProgress: setBeats,
    onReady: () => document.body.classList.add('hero-ready'),
  }))
  .then((api) => { window.__hero = api; })
  .catch((err) => {
    console.error('[daleel] 3D hero failed to start', err);
    document.body.classList.add('hero-failed');
  });

/* nav state */
const bar = $('#bar');
new IntersectionObserver((es) => bar.classList.toggle('solid', !es[0].isIntersecting), { rootMargin: '-64px 0px 0px 0px' }).observe(heroTrack);

/* headlines rise line by line, like floors being stacked */
function splitWords(node) {
  [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(' '); return; }
        const w = document.createElement('span');
        w.className = 'w';
        const wi = document.createElement('span');
        wi.className = 'wi';
        wi.textContent = part;
        w.append(wi);
        frag.append(w);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1) splitWords(n);
  });
}
const splits = $$('[data-split]');
function indexLines() {
  splits.forEach((el) => {
    let line = -1;
    let top = null;
    $$('.w', el).forEach((w) => {
      if (top === null || Math.abs(w.offsetTop - top) > 4) { line += 1; top = w.offsetTop; }
      w.style.setProperty('--l', line);
    });
  });
}
if (!reduce) {
  splits.forEach((el) => { el.setAttribute('aria-label', el.textContent); splitWords(el); el.classList.add('is-split'); });
  indexLines();
  document.fonts?.ready.then(indexLines);
  new ResizeObserver(indexLines).observe(document.body);
}

/* staggered groups: each child gets its index */
$$('[data-stagger]').forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty('--i', i)));
$$('.bento .cell').forEach((c, i) => c.style.setProperty('--i', i % 3));
$$('.vs > *').forEach((c, i) => c.style.setProperty('--i', i));

/* reveal on scroll */
if (reduce || !('IntersectionObserver' in window)) {
  $$('.reveal').forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal').forEach((el) => io.observe(el));
}

/* videos: play muted while on screen, pause when they leave */
function autoPlay(video) {
  let userPaused = false;
  let auto = false;
  video.muted = true;
  video.addEventListener('pause', () => { if (!auto && !video.ended) userPaused = true; auto = false; });
  video.addEventListener('play', () => { userPaused = false; });
  new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting && e.intersectionRatio >= 0.5) {
      if (!userPaused && video.paused && !reduce) video.play().catch(() => {});
    } else if (!video.paused) { auto = true; video.pause(); }
  }), { threshold: [0, 0.5] }).observe(video);
}
const walk = $('#walkvid');
autoPlay(walk);
autoPlay($('#demovid'));
$('#soundBtn').addEventListener('click', () => {
  walk.muted = false;
  walk.currentTime = 0;
  walk.play().catch(() => {});
  walk.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  track('film_play_with_sound');
});

/* flow rail */
const rail = $('#rail');
const railBar = $('#railBar');
const stepW = () => $('.step', rail).getBoundingClientRect().width + 16;
$('#railNext').addEventListener('click', () => rail.scrollBy({ left: stepW() * 2, behavior: reduce ? 'auto' : 'smooth' }));
$('#railPrev').addEventListener('click', () => rail.scrollBy({ left: -stepW() * 2, behavior: reduce ? 'auto' : 'smooth' }));
const railProgress = () => {
  const max = rail.scrollWidth - rail.clientWidth;
  const k = max > 0 ? rail.scrollLeft / max : 1;
  const vis = rail.clientWidth / rail.scrollWidth;
  railBar.style.transform = `translateX(${(k * (1 - vis) * 100) / vis}%)`;
  railBar.style.width = `${vis * 100}%`;
  $('#railPrev').disabled = k < 0.01;
  $('#railNext').disabled = k > 0.99;
};
rail.addEventListener('scroll', railProgress, { passive: true });
new ResizeObserver(railProgress).observe(rail);

/* calculator (same model as the current site: extra revenue = brokers x commission x multiplier) */
(() => {
  const br = $('#c-br'), cm = $('#c-cm'), rt = $('#c-rt'), cs = $('#c-case');
  const MULT = [0.5, 1, 1.5, 2, 2.6, 3, 3.5, 4];
  let price = PRICE_LIST;
  const cur = {};
  const paint = (el) => el.style.setProperty('--p', `${((el.value - el.min) / (el.max - el.min)) * 100}%`);
  function tween(sel, to, f) {
    const el = $(sel);
    if (!el) return;
    const from = cur[sel] ?? to;
    cur[sel] = to;
    if (reduce || from === to) { el.textContent = f(to); return; }
    const t0 = performance.now();
    (function k(now) {
      const p = Math.min(1, (now - t0) / 380), e = 1 - (1 - p) ** 3;
      el.textContent = f(from + (to - from) * e);
      if (p < 1 && cur[sel] === to) requestAnimationFrame(k);
    })(t0);
  }
  function calc() {
    [br, cm, rt].forEach(paint);
    const b = +br.value, c = +cm.value, m = MULT[+rt.value];
    $('#c-br-o').textContent = b;
    $('#c-cm-o').textContent = aed(c);
    $('#c-rt-o').textContent = `×${m}`;
    const per = c * m, rev = b * per, net = rev - price;
    tween('#c-rev', rev, aed);
    tween('#c-dl', per, aed);
    tween('#c-net', net, (v) => (v < 0 ? '-' : '') + aed(Math.abs(v)));
    tween('#c-roi', rev / price, (v) => `${v.toFixed(1)}×`);
    const days = Math.max(1, Math.round((30 * price) / rev));
    $('#c-pay').textContent = net >= 0
      ? `Daleel pays for itself in about ${days} day${days > 1 ? 's' : ''}`
      : 'Below break-even: covered by the money-back guarantee';
    $('#c-year').innerHTML = net >= 0
      ? `Over 12 months: <b>${aed(net * 12)}</b> of extra profit, after Daleel.`
      : 'Below break-even at these numbers. Your first month is <b>100% refundable</b>.';
  }
  [br, cm, rt].forEach((el) => el.addEventListener('input', calc));
  cs.addEventListener('change', () => {
    price = cs.checked ? PRICE_CASE : PRICE_LIST;
    track('calculator_case_study', { on: cs.checked });
    calc();
  });
  calc();
})();

/* morning brief checklist */
(() => {
  const boxes = $$('#tasks input');
  const out = $('#taskCount');
  const paint = () => {
    const n = boxes.filter((b) => b.checked).length;
    out.textContent = n === boxes.length ? 'All done. Daleel keeps following up.' : `${n} of ${boxes.length} done`;
  };
  boxes.forEach((b) => b.addEventListener('change', paint));
})();

/* floors: every section arrives as a floor, and a small tower on the side is built as you scroll */
(() => {
  const floors = $$('.floor');
  if (!floors.length) return;
  const NS = 'http://www.w3.org/2000/svg';
  const A = 20, B = 9, T = 5, STEP = 9, N = floors.length;
  const H = (N - 1) * STEP + 2 * B + T;
  const tower = document.createElement('nav');
  tower.className = 'tower';
  tower.setAttribute('aria-label', 'Page sections');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `-1 -16 ${2 * A + 2} ${H + 18}`);
  svg.setAttribute('width', 2 * A + 2);
  svg.setAttribute('height', H + 18);
  const label = document.createElement('span');
  label.className = 'tower-label';
  const plates = floors.map((sec, k) => {
    const y = (N - 1 - k) * STEP;
    const a = document.createElementNS(NS, 'a');
    a.setAttribute('href', `#${sec.id}`);
    a.setAttribute('aria-label', sec.dataset.floor);
    a.classList.add('plate');
    const g = document.createElementNS(NS, 'g');
    const poly = (cls, pts) => {
      const p = document.createElementNS(NS, 'polygon');
      p.setAttribute('class', cls);
      p.setAttribute('points', pts.map(([x, yy]) => `${x},${yy + y}`).join(' '));
      g.append(p);
    };
    poly('pl', [[0, B], [A, 2 * B], [A, 2 * B + T], [0, B + T]]);
    poly('pr', [[A, 2 * B], [2 * A, B], [2 * A, B + T], [A, 2 * B + T]]);
    poly('pt', [[A, 0], [2 * A, B], [A, 2 * B], [0, B]]);
    a.append(g);
    a.addEventListener('pointerenter', () => { label.textContent = sec.dataset.floor; label.style.top = `${y + 16 + B}px`; tower.classList.add('show-label'); });
    a.addEventListener('pointerleave', () => tower.classList.remove('show-label'));
    a.addEventListener('focus', () => { label.textContent = sec.dataset.floor; label.style.top = `${y + 16 + B}px`; tower.classList.add('show-label'); });
    a.addEventListener('blur', () => tower.classList.remove('show-label'));
    svg.append(a);
    return a;
  });
  tower.append(svg, label);
  document.body.append(tower);

  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => t * t * (3 - 2 * t);
  let lastY = -1, lastH = 0, current = -2;
  const stage = $('#filmStage');
  const bento = $('.bento');
  const cells = $$('.cell', bento);
  let scrollPick = -1, hoverPick = -1, painted = -2;
  const paintCells = () => {
    const pick = hoverPick >= 0 ? hoverPick : scrollPick;
    if (pick === painted) return;
    painted = pick;
    cells.forEach((c, i) => c.classList.toggle('is-active', i === pick));
  };
  cells.forEach((c, i) => {
    c.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') { hoverPick = i; paintCells(); } });
    // once a tile has landed, drop its entry delay so selection responds at once
    c.addEventListener('transitionend', (e) => { if (e.propertyName === 'opacity' && c.classList.contains('in')) c.classList.add('settled'); });
  });
  bento.addEventListener('pointerleave', () => { hoverPick = -1; paintCells(); });
  function tick() {
    requestAnimationFrame(tick);
    const y = scrollY, vh = innerHeight;
    if (y === lastY && vh === lastH) return;
    lastY = y; lastH = vh;
    let cur = -1;
    floors.forEach((el, i) => {
      const top = el.getBoundingClientRect().top;
      if (top < vh * 0.55) cur = i;
      if (reduce) return;
      // plates grow as the section rises into view, then tuck away once it has landed
      const enter = ease(clamp((vh - top) / (vh * 0.45)));
      const tuck = ease(clamp((vh * 0.4 - top) / (vh * 0.3)));
      el.style.setProperty('--plate', (enter * (1 - tuck)).toFixed(3));
    });
    if (!reduce) {
      // the film opens from a card to the full width of the page
      const st = stage.getBoundingClientRect();
      stage.style.setProperty('--open', ease(clamp((vh * 0.96 - st.top) / (vh * 0.6))).toFixed(3));
      // abilities: the tiles are selected one after the other while scrolling through them
      const br = bento.getBoundingClientRect();
      const inView = br.top < vh * 0.62 && br.bottom > vh * 0.38;
      // tiles are revealed from here (their hidden state is clipped, which an observer can miss)
      cells.forEach((c) => { if (!c.classList.contains('in') && c.getBoundingClientRect().top - 80 < vh * 0.9) c.classList.add('in'); });
      scrollPick = inView ? Math.min(cells.length - 1, Math.floor(clamp((vh * 0.62 - br.top) / (br.height * 0.92)) * cells.length)) : -1;
      paintCells();
    }
    if (cur !== current) {
      current = cur;
      plates.forEach((p, i) => { p.classList.toggle('on', i <= cur); p.classList.toggle('now', i === cur); });
      tower.classList.toggle('visible', cur >= 0);
    }
  }
  requestAnimationFrame(tick);
})();

/* free month: WhatsApp number, then the payment step */
(() => {
  const form = $('#startForm');
  const input = $('#waNumber');
  const error = $('#waError');
  const done = $('#startDone');
  const clean = (v) => v.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  const valid = (v) => /^\+?\d{9,15}$/.test(v);
  const setError = (on) => { error.hidden = !on; input.setAttribute('aria-invalid', on ? 'true' : 'false'); form.classList.toggle('has-error', on); };
  input.addEventListener('input', () => { if (!error.hidden && valid(clean(input.value))) setError(false); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const number = clean(input.value);
    if (!valid(number)) { setError(true); input.focus(); return; }
    setError(false);
    track('free_month_submit', { payment_step: TRIAL_CHECKOUT_URL ? 'checkout' : 'whatsapp' });
    if (TRIAL_CHECKOUT_URL) {
      done.textContent = 'Taking you to the secure payment step.';
      done.hidden = false;
      window.location.href = TRIAL_CHECKOUT_URL;
      return;
    }
    const text = `Hi Daleel team, I'd like to start my free month. My WhatsApp number is ${number}. Please send me the link to add a payment method.`;
    window.open(wa(text), '_blank', 'noopener');
    done.textContent = 'WhatsApp is opening with your request. Send the message and we will reply with the payment link.';
    done.hidden = false;
  });
})();

/* small screens: menu sheet and action dock */
(() => {
  const btn = document.querySelector('#menuBtn');
  const sheet = document.querySelector('#sheet');
  const dock = document.querySelector('#dock');
  const setMenu = (open) => {
    sheet.hidden = false;
    requestAnimationFrame(() => document.body.classList.toggle('menu-open', open));
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (!open) setTimeout(() => { if (!document.body.classList.contains('menu-open')) sheet.hidden = true; }, 450);
  };
  btn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); btn.focus(); }
  });
  matchMedia('(min-width: 941px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  // the dock shows once the hero is passed, and steps aside where the page already offers the same action
  const state = { hero: true, start: false, contact: false };
  const paint = () => {
    const on = !state.hero && !state.start && !state.contact;
    dock.classList.toggle('on', on);
    dock.setAttribute('aria-hidden', on ? 'false' : 'true');
    dock.querySelectorAll('a').forEach((a) => { a.tabIndex = on ? 0 : -1; });
  };
  const watch = (el, key, margin) => new IntersectionObserver((es) => { state[key] = es[0].isIntersecting; paint(); }, { rootMargin: margin }).observe(el);
  watch(heroTrack, 'hero', '-40% 0px 0px 0px');
  watch(document.querySelector('#startForm'), 'start', '0px');
  watch(document.querySelector('#contact .row'), 'contact', '0px');
})();

/* liquid glass: a soft highlight follows the pointer across each glass surface */
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
  document.querySelectorAll('.glass').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
      el.style.setProperty('--lit', '1');
    });
    el.addEventListener('pointerleave', () => el.style.setProperty('--lit', '0'));
  });
}
