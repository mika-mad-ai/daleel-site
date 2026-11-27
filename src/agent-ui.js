// Agents page: interface behaviour that belongs to the new design (the programme logic stays in odysseus.js).
// Message composer: three steps that light up in order, so it is clear what to do.
const $ = (s, r = document) => r.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

(() => {
  const comp = $('#composer');
  const dir = $('#p-dir');
  const msg = $('#wamsg');
  if (!comp || !dir || !msg) return;
  const steps = [...comp.querySelectorAll('.fs')];
  const bar = $('.namebar', comp);
  const hint = $('#dirHint');
  const TOKEN = '[Director]';
  const REST = 'e.g. Khalid';

  // the message as written in the page, split around the name
  const tpl = msg.textContent;
  const at = tpl.indexOf(TOKEN);
  if (at < 0) return;
  const pre = tpl.slice(0, at);
  const post = tpl.slice(at + TOKEN.length);
  const tok = document.createElement('span');
  tok.className = 'tok';

  let ghost = '';
  let last = null;
  function paint() {
    const name = dir.value.trim();
    const shown = name || ghost || TOKEN;
    tok.textContent = shown;
    tok.classList.toggle('is-ghost', !name && !!ghost);
    tok.classList.toggle('is-empty', !name && !ghost);
    msg.replaceChildren(pre, tok, post);
    if (shown !== last && last !== null && !reduce) { tok.classList.remove('pop'); void tok.offsetWidth; tok.classList.add('pop'); }
    if (name && !last?.startsWith('name:') && !reduce) { msg.classList.remove('sheen'); void msg.offsetWidth; msg.classList.add('sheen'); }
    last = name ? `name:${name}` : shown;
    bar.classList.toggle('filled', !!name);
    steps[0].className = name ? 'fs is-done' : 'fs is-now';
    steps[1].className = name ? 'fs is-done' : 'fs';
    steps[2].className = name ? 'fs is-now' : 'fs';
    if (name) hint.textContent = '';
  }

  // sample names type themselves in the field (as its placeholder only) until the agent starts typing
  const NAMES = ['Khalid', 'Sara', 'Ahmed', 'Elena'];
  let timer = 0;
  let inView = false;
  let n = 0;
  const idle = () => !dir.value && document.activeElement !== dir;
  function stop() {
    clearTimeout(timer); timer = 0;
    ghost = '';
    dir.placeholder = document.activeElement === dir ? 'First name' : REST;
    paint();
  }
  function run() {
    if (timer || reduce || !inView || !idle()) return;
    const word = NAMES[n % NAMES.length];
    n += 1;
    let i = 0;
    let erasing = false;
    const tick = () => {
      if (!inView || !idle()) { timer = 0; stop(); return; }
      if (!erasing) {
        i += 1;
        if (i > word.length) { erasing = true; timer = setTimeout(tick, 1500); return; }
      } else {
        i -= 1;
        if (i < 0) { timer = 0; ghost = ''; dir.placeholder = '▏'; paint(); timer = setTimeout(() => { timer = 0; run(); }, 380); return; }
      }
      ghost = word.slice(0, i);
      dir.placeholder = `${ghost}▏`;
      paint();
      timer = setTimeout(tick, erasing ? 55 : 120);
    };
    timer = setTimeout(tick, 500);
  }
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; if (inView) run(); else stop(); }, { threshold: 0.25 }).observe(comp);
  dir.addEventListener('focus', stop);
  dir.addEventListener('blur', () => { dir.placeholder = REST; run(); });
  dir.addEventListener('input', paint); // runs after the programme script has rebuilt the message

  // sending or copying without a name would send "[Director]": point back to the field instead
  comp.addEventListener('click', (e) => {
    if (!e.target.closest('#sendmsg, #copymsg') || dir.value.trim()) return;
    e.preventDefault();
    e.stopPropagation();
    hint.textContent = "Add your director's first name first.";
    bar.classList.remove('nudge'); void bar.offsetWidth; bar.classList.add('nudge');
    dir.focus();
  }, true);
  bar.addEventListener('animationend', (e) => { if (e.animationName === 'nudge') bar.classList.remove('nudge'); });

  paint();
})();
