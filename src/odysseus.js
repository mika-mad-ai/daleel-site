/* Odysseus (agent.daleel.io): programme logic carried over from the live page.
   Signing, the PDF, delivery to Daleel, referral links, the partner dashboard and the calculators are unchanged.
   Removed here because the new design replaces them: the canvas city, the drawn film, the old reveal helpers. */
/* ===== Settings you can edit ===== */
const DOCUSIGN_URL   = "";     // paste your DocuSign PowerForm URL here to embed DocuSign instead of the built-in signing
const TEAM_WHATSAPP   = "971501305942";    // Daleel team WhatsApp, international format without + (e.g. "9715XXXXXXXX"): "Talk with our team" buttons and signed agreements
const TEAM_HOURS      = {days: [1, 2, 3, 4, 5], from: 9, to: 19}; // Dubai time (Mon=1 … Sun=7): when "Online now" shows
const DALEEL_WHATSAPP = TEAM_WHATSAPP;
const DALEEL_EMAIL    = "admin@daleel.io"; // where signed agreements, Emirates ID and bank details are sent (clause 8)
const MAIN_PAGE_URL   = "https://daleel.io/"; // the Daleel presentation website for agency directors
const SUBMIT_URL      = "https://script.google.com/macros/s/AKfycby2JQ8fLkFGZx87VVtD1X5FhYyyiCyErAi8e_WccL06rj5AcXiz4LD4stOSBH8qtA/exec"; // Apps Script web app (odysseus-intake.gs)
const SUBMIT_SECRET   = "7777";
const PORTAL_URL      = "https://script.google.com/macros/s/AKfycbw4H_05ROjpxJnp4x_gZAj-nMb7UVcSyRBRldgIIC0k_LwWpxnTfpxarxQdksXkbwK3/exec"; // Apps Script web app odysseus-portal.gs (My earnings) // must match SECRET in odysseus-intake.gs
const SEAT_PRICE = 30000, RATE = 0.20, MIN_MONTHLY = 0; // agreement v2.0: no minimum
/* ================================= */
const $ = s => document.querySelector(s);
/* WhatsApp deep links: the app scheme on phones opens the contact picker with the text prefilled; api.whatsapp.com on desktop */
const IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const waLink = (text, number) => { const q = (number ? 'phone=' + number + '&' : '') + 'text=' + encodeURIComponent(text); return IS_MOBILE ? 'whatsapp://send?' + q : 'https://api.whatsapp.com/send?' + q; };

// on agent.daleel.io these open the public site; anywhere else (preview, same-domain hosting) the page next to this one
document.querySelectorAll('.js-main').forEach(a => a.href = location.hostname === 'agent.daleel.io' ? MAIN_PAGE_URL : './');
const fmt = n => Math.round(n).toLocaleString('en-US');
window.dataLayer = window.dataLayer || []; const track = (event, data) => { try { window.dataLayer.push(Object.assign({event}, data || {})); } catch (e) {} };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
addEventListener('scroll', () => { const h = document.documentElement; $('#progress').style.transform = 'scaleX(' + Math.min(1, scrollY/(h.scrollHeight-innerHeight)).toFixed(4) + ')'; }, {passive:true});

/* ---------- greeting in many languages ---------- */
(() => {
  const g = ["Hello.","مرحبا.","Bonjour.","Привет.","नमस्ते.","你好。","Hola.","Ciao.","Merhaba.","سلام.","Hallo.","Olá.","こんにちは。","Kumusta.","안녕하세요."];
  let i = 0; const el = $('#greet');
  if (reduce) return;
  setInterval(() => {
    el.style.transform = 'translateY(-100%)'; el.style.opacity = 0;
    setTimeout(() => { i = (i+1) % g.length; el.textContent = g[i]; el.style.transition = 'none'; el.style.transform = 'translateY(100%)';
      requestAnimationFrame(() => { el.style.transition = ''; el.style.transform = ''; el.style.opacity = 1; }); }, 450);
  }, 1900);
})();

/* hero payout stack */
(() => { const list = $('#plist'), tot = $('#ptotal'), pm = $('#pm'); let m = 0, total = 0;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function add(){ m++; const pay = SEAT_PRICE*RATE; total += pay; const li = document.createElement('li'); li.innerHTML = `<span>${months[(m-1)%12]} · Agency payment received</span><b>+${fmt(pay)} AED</b>`; list.prepend(li); if (list.children.length > 7) list.lastChild.remove(); pm.textContent = 'Month ' + m + ' of 12'; animate(total); if (m >= 12){ m = 0; total = 0; setTimeout(() => { list.innerHTML=''; }, 2600); } }
  let cur = 0; function animate(to){ const from = cur, t0 = performance.now(); (function f(now){ const p = Math.min(1,(now-t0)/700); cur = from + (to-from)*(1-Math.pow(1-p,3)); tot.textContent = fmt(cur); if (p<1) requestAnimationFrame(f); })(t0); }
  add(); if (!reduce) setInterval(add, 1800); })();


/* morning briefing */
(() => { const L = [["☀️","<b>Good morning Omar.</b> Here's your day."],["💬","<b>14 buyers replied overnight.</b> 6 are ready to view this week."],["📅","<b>3 viewings booked today:</b> 10:00 Marina · 14:30 JVC · 17:30 Downtown. Clients already briefed."],["🔥","<b>1 deal flagged:</b> 2 BR, Marina, 8% below recorded sales. 412 matched buyers pitched."],["✍️","<b>2 offers ready to sign.</b> Comparable sales attached for the sellers."],["🤝","<b>Your day is ready.</b> Go close."]];
  const ul = $('#brieflist'), tm = $('#brieftime'); let i = 0; const mins = ["07:30","07:30","07:31","07:31","07:32","07:32"];
  function step(){ if (i >= L.length){ setTimeout(() => { ul.innerHTML = ''; i = 0; step(); }, 3200); return; } const li = document.createElement('li'); li.innerHTML = `<span>${L[i][1]}</span>`; ul.append(li); tm.textContent = mins[i]; i++; setTimeout(step, 1100); }
  if (reduce){ L.forEach((l,k) => { const li = document.createElement('li'); li.innerHTML = `<span>${l[1]}</span>`; ul.append(li); }); } else step(); })();

/* calculator */
(() => { const a = $('#agencies'), s = $('#seats'), mo = $('#months');
  const paint = el => el.style.setProperty('--p', ((el.value-el.min)/(el.max-el.min)*100)+'%');
  function calc(){ [a,s,mo].forEach(paint); const A=+a.value, S=+s.value, M=+mo.value; const perAgency = Math.max(MIN_MONTHLY, SEAT_PRICE*RATE*S); const month = perAgency*A;
    $('#agencies-o').textContent = A; $('#seats-o').textContent = S; $('#months-o').textContent = M;
    $('#r-month').textContent = fmt(month)+' AED'; $('#r-total').textContent = fmt(month*M)+' AED'; $('#r-meet').textContent = A; }
  [a,s,mo].forEach(e => e.addEventListener('input', calc)); calc();
  let used = false; [a,s,mo].forEach(e => e.addEventListener('change', () => { if (!used){ used = true; track('earnings_calculator_used'); } track('earnings_values', {agencies: +a.value, seats: +s.value, months: +mo.value, monthly: Math.max(MIN_MONTHLY, SEAT_PRICE*RATE*+s.value) * +a.value}); })); })();

/* copy + share */
$('#copymsg').addEventListener('click', async () => { track('message_copied'); const t = window.__personalMessage ? window.__personalMessage() : $('#wamsg').textContent.replace('[link]', MAIN_PAGE_URL); try { await navigator.clipboard.writeText(t); $('#copymsg').textContent = 'Copied ✓'; setTimeout(() => $('#copymsg').textContent = 'Copy message', 2000); } catch { prompt('Copy this message:', t); } });
const shareText = 'Daleel, the AI real estate agent for Dubai: the whole city in 3D, real-time market, WhatsApp pitches 24/7. See it here: ' + MAIN_PAGE_URL;
function showShareBox(){ const b = $('#sharebox'); b.hidden = false; $('#sharelink').value = MAIN_PAGE_URL; $('#sharewa').href = waLink(shareText); b.scrollIntoView({block:'nearest', behavior:'smooth'}); }
$('#sharepage').addEventListener('click', async () => { track('presentation_shared');
  let shared = false;
  if (navigator.share && !PREVIEW){ try { await navigator.share({title: 'Daleel · The AI agent that multiplies your real estate agents', text: shareText, url: MAIN_PAGE_URL}); shared = true; } catch (e) { shared = e && e.name === 'AbortError'; } }
  if (!shared) showShareBox();
});
$('#copylink').addEventListener('click', async () => { track('presentation_link_copied'); const inp = $('#sharelink'); inp.select(); try { await navigator.clipboard.writeText(MAIN_PAGE_URL); $('#copylink').textContent = 'Copied ✓'; } catch { try { document.execCommand('copy'); $('#copylink').textContent = 'Copied ✓'; } catch {} } setTimeout(() => $('#copylink').textContent = 'Copy link', 2000); });

/* reference */
const REF = 'ODY-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
$('#ref-view').textContent = REF;

/* DocuSign embed or built-in signing */
if (DOCUSIGN_URL){ $('#ds').style.display = 'block'; $('#dsframe').src = DOCUSIGN_URL; $('#fallback').style.display = 'none'; $('#signhint').textContent = 'Sign securely with DocuSign below. You will receive your copy by email.'; }

/* runtime: preview on claude.ai (no outside network, no external links) vs. the live site */
const PREVIEW = !!(window.claude && typeof window.claude.use === 'function');
let DL = null; if (PREVIEW) { try { window.claude.use('downloads').then(d => { DL = d; }).catch(() => {}); } catch (e) {} }
if (PREVIEW) { const n = document.createElement('div'); n.className = 'preview-note'; n.textContent = 'Preview on claude.ai: your signed copy is offered for download here, but it can only be sent to Daleel automatically from the live site. Everything else works as on the live site.'; $('#signhint').after(n); }

/* field validation */
const normPhone = raw => { let d = String(raw||'').replace(/\D/g,''); if (!d) return ''; if (d.startsWith('00')) d = d.slice(2); if (/^05\d{8}$/.test(d)) d = '971' + d.slice(1); else if (/^5\d{8}$/.test(d)) d = '971' + d; return /^[1-9]\d{7,14}$/.test(d) ? d : ''; };
const validEmail = v => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v) && !/\.\./.test(v);
const fieldOk = (id, ok) => { const lab = $(id).closest('label'); lab.classList.toggle('bad', !ok); if (ok && !document.querySelector('.form label.bad')){ const e = $('#err'); if (e && /highlighted in red/.test(e.textContent)) e.style.display = 'none'; } return ok; };
const checks = { '#f-name': v => v.trim().length >= 3 && /\s/.test(v.trim()), '#f-email': v => validEmail(v.trim()), '#f-phone': v => !!normPhone(v) };
Object.keys(checks).forEach(id => { const el = $(id); el.addEventListener('blur', () => { if (el.value.trim()) fieldOk(id, checks[id](el.value)); }); el.addEventListener('input', () => { if (el.closest('label').classList.contains('bad') && checks[id](el.value)) fieldOk(id, true); }); });
$('#f-phone').addEventListener('blur', () => { const d = normPhone($('#f-phone').value); if (d) $('#f-phone').value = '+' + d; });

/* signature pad */
/* typed signature: the full legal name typed in the signature field (clause 11) */
let has = false;
const sigEl = $('#f-name'), sigPrev = $('#sigpreview');
const sigMatches = () => { const v = sigEl.value.trim().replace(/\s+/g,' '); return v.length >= 3 && /\s/.test(v); };
const refreshSig = () => { has = sigMatches(); sigPrev.textContent = sigEl.value.trim(); sigPrev.classList.toggle('on', !!sigEl.value.trim()); if (has){ const e = $('#err'); if (e && /Signature/.test(e.textContent)) e.style.display = 'none'; } };
sigEl.addEventListener('input', refreshSig);
// signature image for the signed PDF: the typed name rendered in a handwriting style
const pad = document.createElement('canvas'); pad.width = 900; pad.height = 350;
const renderSig = () => { const c = pad.getContext('2d'); c.clearRect(0,0,pad.width,pad.height); c.fillStyle = '#0E0E10'; c.font = '600 120px Caveat, "Segoe Script", "Brush Script MT", "Apple Chancery", cursive'; c.textBaseline = 'middle'; let t = sigEl.value.trim(); while (c.measureText(t).width > 860 && c.font.indexOf('px') > 0){ const px = parseInt(c.font.match(/(\d+)px/)[1],10) - 8; if (px < 40) break; c.font = c.font.replace(/\d+px/, px + 'px'); } c.fillText(t, 20, 175); c.font = '400 28px Arial'; c.fillStyle = '#66625C'; c.fillText('Electronically signed · ' + new Date().toISOString().slice(0,10), 20, 300); };

/* ---------- optimisation pass: ticker, nav, personalisation, stepper, sticky CTA, invite, attribution, drafts ---------- */
const ODYSSEUS_URL = "https://agent.daleel.io/";
const QS = new URLSearchParams(location.search); const SRC = (QS.get('src') || QS.get('ref') || QS.get('utm_source') || '').slice(0,60);
try { if (SRC) localStorage.setItem('ody_src', SRC); } catch {}
const srcKnown = () => { try { return SRC || localStorage.getItem('ody_src') || ''; } catch { return SRC; } };
/* referral: ?ref=ODY-… from another agent's personal link. First code wins, kept 60 days. */
const REFCODE_RE = /^ODY-\d{8}-[A-Z0-9]{4}$/;
const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const myCode = () => { const c = lsGet('ody_mycode'); return REFCODE_RE.test(c) ? c : ''; };
const myLink = code => ODYSSEUS_URL + '?ref=' + encodeURIComponent(code);
/* WhatsApp invitation sent to another agent: short lines, easy to read on a phone */
const refMsg = (link, first, personal = true) => [
  personal ? 'Hi! ' + (first ? "It's " + first + '. ' : '') + "I'm a Daleel partner (Odysseus programme)." : 'Hi! Have you heard of Odysseus by Daleel?',
  '',
  'How it works:',
  '• You set up 1 meeting between Daleel and your agency director.',
  '• If the agency signs, you earn 20% of what it pays Daleel for 12 months.',
  '• Daleel does the demo and the follow-up. You just open the door.',
  '',
  personal ? 'Sign up online in 2 minutes with my link:' : 'Sign up online in 2 minutes:',
  link
].join('\n');
const PARRAIN = (() => {
  const fromUrl = (QS.get('ref') || '').trim().toUpperCase();
  let saved = lsGet('ody_parrain');
  if (saved && Date.now() - (Number(lsGet('ody_parrain_at')) || 0) > 60 * 864e5) saved = '';
  if (REFCODE_RE.test(saved)) return saved;
  if (REFCODE_RE.test(fromUrl) && fromUrl !== myCode()) { lsSet('ody_parrain', fromUrl); lsSet('ody_parrain_at', String(Date.now())); return fromUrl; }
  return '';
})();
if (PARRAIN) { const n = document.createElement('div'); n.className = 'invited'; n.textContent = 'You were invited by a Daleel partner (code ' + PARRAIN + '). Signing links you to them. Your own 20% stays exactly the same.'; const h = document.getElementById('signhint'); if (h) h.after(n); }
(() => {
  const facts = ["20% of every payment, for 12 months","+5% on agents you refer","One meeting with your director","Sign online in 2 minutes","Paid every quarter","Daleel runs the demo, you open the door","Every signed agency pays you separately"];
  $('#tk').innerHTML = facts.concat(facts).map(f => `<span>${f}</span>`).join('');
  const links = [...document.querySelectorAll('.navlinks a')], secs = links.map(a => document.querySelector(a.getAttribute('href')));
  const nav = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting){ const i = secs.indexOf(x.target); links.forEach((a,k) => a.classList.toggle('active', k === i)); } }), {rootMargin:'-40% 0px -55% 0px'});
  secs.forEach(sc => sc && nav.observe(sc));
})();
/* personalised message */
(() => {
  const msg = $('#wamsg'), tpl = msg.textContent; const dir = $('#p-dir');
  const build = () => tpl.replace('[Director]', dir.value.trim() || '[Director]');
  const render = () => { const n = dir.value.trim(); $('#wa-to').textContent = n || 'Your director'; $('#wa-av').textContent = (n || 'D')[0].toUpperCase(); msg.textContent = build(); $('#sendmsg').href = waLink(build().replace('[link]', MAIN_PAGE_URL)); };
  { let once = false; dir.addEventListener('input', () => { if (!once && dir.value.trim()){ once = true; track('director_name_entered'); } render(); }); } render();
  window.__personalMessage = () => build().replace('[link]', MAIN_PAGE_URL);
})();
/* stepper + contract reading hint */
(() => {
  const st = [...$('#stepper').children]; const f = id => $(id).value.trim();
  const update = () => { const d = f('#f-name') && f('#f-email') && f('#f-phone'); const sig = typeof has !== 'undefined' && has; const ok = $('#f-agree').checked;
    st[0].className = d ? 'ok' : 'now'; st[1].className = sig ? 'ok' : (d ? 'now' : ''); st[2].className = ok ? 'ok' : (d && sig ? 'now' : ''); };
  let started = false; ['#f-name','#f-email','#f-phone'].forEach(id => $(id).addEventListener('input', () => { if (!started){ started = true; track('sign_form_started'); } update(); })); $('#f-agree').addEventListener('change', () => { track('agreement_checked', {checked: $('#f-agree').checked}); update(); });
  let typed = false; $('#f-name').addEventListener('input', () => { if (!typed && typeof has !== 'undefined' && has){ typed = true; track('signature_typed'); } update(); }); update();
  const art = $('#contract'), hint = $('#readhint');
  let rs = false, rd = false; art.addEventListener('scroll', () => { if (!rs){ rs = true; track('contract_read_started'); } if (art.scrollTop + art.clientHeight >= art.scrollHeight - 40){ hint.classList.add('done'); if (!rd){ rd = true; track('contract_read_completed'); } } }, {passive:true});
  // drafts: keep what the agent typed (own domain only)
  if (!PREVIEW){ const ids = ['#f-name','#f-email','#f-phone']; try { const d = JSON.parse(localStorage.getItem('ody_draft') || '{}'); ids.forEach(id => { if (d[id] && !$(id).value) $(id).value = d[id]; }); update(); } catch {}
    ids.forEach(id => $(id).addEventListener('input', () => { try { const d = {}; ids.forEach(i => d[i] = $(i).value); localStorage.setItem('ody_draft', JSON.stringify(d)); if (id === '#f-name') localStorage.setItem('ody_me', $(id).value.split(' ')[0]); } catch {} })); }
})();
/* invite another agent */
(() => {
  let url = ODYSSEUS_URL, text = '';
  const refresh = () => {
    const c = myCode(); url = c ? myLink(c) : ODYSSEUS_URL;
    text = refMsg(url, '', !!c);
    $('#invitewa').href = waLink(text);
    const lbl = document.querySelector('#go .invite .lbl');
    if (lbl) lbl.textContent = c ? 'Invite agents with your personal link: you earn 5% of their deals for 12 months.' : 'Know another agent who could open a door?';
  };
  refresh(); window.__refreshInvite = refresh;
  $('#invite').addEventListener('click', async () => { track('odysseus_shared', {personal: myCode() ? 'yes' : 'no'}); if (navigator.share && !PREVIEW){ try { await navigator.share({title:'Odysseus · Daleel', text, url}); return; } catch (e) { if (e && e.name === 'AbortError') return; } } try { await navigator.clipboard.writeText(text); $('#invite').textContent = 'Copied ✓'; setTimeout(() => $('#invite').textContent = 'Share Odysseus with them', 2000); } catch { prompt('Copy this message:', text); } });
})();
/* earnings: animated numbers */
(() => {
  const els = ['#r-month','#r-total'].map(id => $(id)); const cur = {};
  els.forEach(el => { cur[el.id] = parseInt(el.textContent.replace(/\D/g,''),10) || 0; });
  const mo = new MutationObserver(ms => ms.forEach(m => { const el = m.target.nodeType === 3 ? m.target.parentElement : m.target; if (!el || !cur.hasOwnProperty(el.id) || el.dataset.anim) return;
    const to = parseInt(el.textContent.replace(/\D/g,''),10) || 0, from = cur[el.id]; if (to === from) return; cur[el.id] = to; el.dataset.anim = '1'; const t0 = performance.now();
    (function f(now){ const p = Math.min(1,(now-t0)/450); const v = Math.round(from + (to-from)*(1-Math.pow(1-p,3))); el.textContent = v.toLocaleString('en-US') + ' AED'; if (p < 1) requestAnimationFrame(f); else delete el.dataset.anim; })(t0); }));
  if (!reduce) els.forEach(el => mo.observe(el, {childList:true, characterData:true, subtree:true}));
})();

/* ---------- marketing analytics (dataLayer) ---------- */
(() => {
  const PAGE = location.hostname.includes('agent') || document.title.startsWith('Odysseus') ? 'odysseus' : 'product';
  const sec = el => { const s = el && el.closest ? el.closest('section,footer,header,.stickycta') : null; return s ? (s.id || s.className.split(' ')[0] || s.tagName.toLowerCase()) : 'page'; };
  const label = el => (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g,' ').slice(0,60);
  track('page_ready', {page: PAGE, source: (typeof srcKnown === 'function' ? srcKnown() : '') || 'direct', viewport: innerWidth < 720 ? 'mobile' : innerWidth < 1100 ? 'tablet' : 'desktop'});
  // clicks: CTAs, nav, outbound, WhatsApp, mail
  document.addEventListener('click', e => {
    const a = e.target.closest('a,button'); if (!a) return;
    const href = a.getAttribute('href') || '';
    if (a.matches('.navlinks a')) track('nav_click', {target: href});
    else if (a.classList.contains('btn')) track('cta_click', {label: label(a), section: sec(a), href});
    if (/^https?:/.test(href) && !href.includes(location.hostname)){ const h = new URL(href).hostname; track(h.includes('whatsapp') ? 'whatsapp_link_click' : 'outbound_click', {href, domain: h, section: sec(a), label: label(a)}); }
    if (href.startsWith('mailto:')) track('email_link_click', {section: sec(a)});
    if (href.startsWith('whatsapp:')) track('whatsapp_link_click', {section: sec(a), label: label(a)});
  }, true);
  // section views (once each)
  const seen = new Set();
  const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting && !seen.has(x.target.id)){ seen.add(x.target.id); track('section_view', {section: x.target.id}); } }), {threshold:.35});
  document.querySelectorAll('section[id]').forEach(s => io.observe(s));
  // scroll depth
  const marks = [25,50,75,100]; let next = 0;
  addEventListener('scroll', () => { const h = document.documentElement; const pct = (scrollY + innerHeight) / h.scrollHeight * 100; while (next < marks.length && pct >= marks[next]){ track('scroll_depth', {percent: marks[next]}); next++; } }, {passive:true});
  // engagement time
  [15,30,60,120,300].forEach(t => setTimeout(() => { if (document.visibilityState === 'visible') track('engaged_time', {seconds: t}); }, t*1000));
  // film
  const seg = document.getElementById('segs');
  if (seg){ let last = -1, done = false; const mo = new MutationObserver(() => { const i = [...seg.children].findIndex(b => b.classList.contains('on')); if (i >= 0 && i !== last){ last = i; track('film_chapter', {step: i+1, title: (document.getElementById('ft')||{}).textContent}); if (i === seg.children.length-1 && !done){ done = true; track('film_completed'); } } }); mo.observe(seg, {attributes:true, subtree:true, attributeFilter:['class']}); }
  const fp = document.getElementById('fplay'); if (fp) fp.addEventListener('click', () => track('film_toggle', {action: fp.getAttribute('aria-label') === 'Pause' ? 'play' : 'pause'}));
  // FAQ
  document.querySelectorAll('.faq details').forEach(d => d.addEventListener('toggle', () => { if (d.open) track('faq_opened', {question: d.querySelector('summary').textContent.trim().slice(0,80)}); }));
  // ticker hover / city hover
  const tip = document.getElementById('tip'); if (tip){ let once = false; const mo2 = new MutationObserver(() => { if (!once && tip.classList.contains('on')){ once = true; track('city_explored'); } }); mo2.observe(tip, {attributes:true, attributeFilter:['class']}); }
  window.__track = track;
})();

/* sign & generate PDF */
$('#signbtn').addEventListener('click', () => {
  const v = id => $(id).value.trim();
  const name = v('#f-name'), brn = '', agency = '', email = v('#f-email'), phone = v('#f-phone');
  const err = $('#err'); err.style.display = 'none';
  const fail = m => { err.textContent = m; err.style.display = 'block'; track('sign_attempt_failed', {reason: m.slice(0,60)}); };
  const okN = fieldOk('#f-name', checks['#f-name'](name)), okE = fieldOk('#f-email', checks['#f-email'](email)), okP = fieldOk('#f-phone', checks['#f-phone'](phone));
  if (!okN || !okE || !okP) return fail('Please correct the fields highlighted in red.');
  const phoneNorm = '+' + normPhone(phone); $('#f-phone').value = phoneNorm;
  if (!has) return fail('Please type your full legal name (first and last name) in the Signature field.');
  renderSig();
  if (!$('#f-agree').checked) return fail('Please tick the box to confirm you agree to the agreement.');
  const hasPdf = !!(window.jspdf && window.jspdf.jsPDF);
  if (!hasPdf && (PREVIEW || !SUBMIT_URL)) return fail('The PDF library could not load. Check your connection and try again.');
  // contract as HTML, so Daleel's server can build the PDF itself if the browser could not (ad blockers, offline libraries)
  const contractHtml = `<h1 style="font-family:Arial;color:#DF3F00;font-size:11pt;margin:0">DALEEL · PROGRAMME ODYSSEUS</h1><h2 style="font-family:Arial;font-size:18pt;margin:4px 0">Business Introducer Agreement</h2><p style="font-family:Arial;font-size:9pt;color:#666">Realize Capital Properties L.L.C (Daleel) · Version 2.0 · Signing record ${REF} · Signed electronically on ${new Date().toUTCString()}</p>` +
    [...$('#contract').children].filter(el => !(el.tagName === 'H3' || el.classList.contains('meta') || el.classList.contains('readhint'))).map(el => `<div style="font-family:Arial;font-size:10pt;line-height:1.5;${el.tagName==='H4'?'font-weight:bold;margin-top:12px':''}">${el.innerHTML}</div>`).join('') +
    `<hr><p style="font-family:Arial;font-size:10pt"><b>Signature block</b><br>Introducer: ${name}${brn ? ' · RERA BRN: ' + brn : ''}<br>Email: ${email} · Phone: ${phoneNorm}<br>Type B referral link/code used at signing: ${PARRAIN || 'none'}<br>Acceptance checkbox ticked: agreement Version 2.0, Type A and Type B terms (clauses 1 and 1A)<br><b>Signed by the Introducer (typed name as electronic signature, clause 11):</b></p><img src="${pad.toDataURL('image/png')}" style="width:180pt;height:70pt"><p style="font-family:Arial;font-size:9pt;color:#666">Date: ${new Date().toISOString().slice(0,10)} (UTC) · Reference: ${REF}</p><p style="font-family:Arial;font-size:10pt"><b>For the Company (Realize Capital Properties L.L.C, operating Daleel): electronic countersignature by its authorised signatory on receipt (clause 11). Activation subject to clause 8.</b></p>`;
  let doc = null;
  if (hasPdf){
  const { jsPDF } = window.jspdf; doc = new jsPDF({unit:'pt', format:'a4'}); const W = 595, M = 56; let y = M;
  const line = (t, size=10, style='normal', color=[30,30,36]) => { doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color); const lines = doc.splitTextToSize(t, W - 2*M); lines.forEach(l => { if (y > 790){ doc.addPage(); y = M; } doc.text(l, M, y); y += size*1.4; }); y += 4; };
  doc.setFillColor(223,63,0); doc.rect(0,0,W,6,'F');
  line('DALEEL · PROGRAMME ODYSSEUS', 9, 'bold', [223,63,0]);
  line('Business Introducer Agreement', 20, 'bold');
  line('Realize Capital Properties L.L.C (Daleel) · Version 2.0 · Signing record ' + REF + ' · Signed electronically on ' + new Date().toUTCString(), 9, 'normal', [110,110,118]);
  y += 6;
  const art = $('#contract');
  [...art.children].forEach(el => { if (el.tagName === 'H3' || el.classList.contains('meta')) return; if (el.tagName === 'H4') line(el.textContent, 11, 'bold'); else if (el.classList.contains('hl')) [...el.querySelectorAll('p')].forEach(p => line(p.textContent, 10)); else if (el.tagName === 'P') line(el.textContent, 10); });
  if (y > 600){ doc.addPage(); y = M; }
  y += 10; doc.setDrawColor(200,200,205); doc.line(M, y, W-M, y); y += 20;
  line('Signature block', 11, 'bold');
  line(`Introducer: ${name}` + (brn ? `   ·   RERA BRN: ${brn}` : ''), 10);
  line(`Email: ${email}   ·   Phone: ${phoneNorm}`, 10); line('Type B referral link/code used at signing: ' + (PARRAIN || 'none'), 10); line('Acceptance checkbox ticked: agreement Version 2.0, Type A and Type B terms (clauses 1 and 1A)', 10);
  line('Signed by the Introducer (typed name as electronic signature, clause 11):', 10, 'bold');
  try { doc.addImage(pad.toDataURL('image/png'), 'PNG', M, y, 180, 70); } catch(e) {}
  y += 80; line(`Date: ${new Date().toISOString().slice(0,10)} (UTC)   ·   Reference: ${REF}`, 9, 'normal', [110,110,118]);
  y += 10; line('For the Company (Realize Capital Properties L.L.C, operating Daleel): electronic countersignature by its authorised signatory on receipt (clause 11). Activation subject to clause 8.', 10, 'bold');
  }
  const fname = `Daleel_Odysseus_Introducer_Agreement_${REF}.pdf`;
  // signed copy: automatic download, plus a button to get it again (some phones open it instead of saving it)
  let blobUrl = '';
  if (doc){ try { blobUrl = URL.createObjectURL(doc.output('blob')); } catch (e) {} }
  const download = () => { if (!doc) return; if (PREVIEW){ if (DL) DL.save({filename: fname, data: doc.output('blob')}).catch(() => {}); return; } try { doc.save(fname); } catch (e) { if (blobUrl) window.open(blobUrl, '_blank'); } };
  download();
  const dl = $('#redl'); if (dl && doc){ dl.hidden = false; dl.onclick = ev => { ev.preventDefault(); track('agreement_redownload', {ref: REF}); download(); }; }
  // automatic delivery to Daleel (live site only: the claude.ai preview blocks outside requests)
  if (PREVIEW){
    $('#donetxt').textContent = `Signed (${REF}). This is the claude.ai preview: on the live site your agreement is sent to Daleel automatically. If you are testing, copy your details below and send them to your Daleel contact.`;
  } else if (SUBMIT_URL){
    const payload = {secret: SUBMIT_SECRET, ref: REF, name, brn, agency, email, phone: phoneNorm, source: PARRAIN ? 'ref:' + PARRAIN : (srcKnown() || 'odysseus-page'), referredBy: PARRAIN, signedAt: new Date().toISOString(), pdfBase64: doc ? doc.output('datauristring').split(',')[1] : '', contractHtml, signaturePng: pad.toDataURL('image/png').split(',')[1], page: location.href};
    $('#donetxt').innerHTML = `<b style="color:#16794a">Sent to Daleel ✓</b> Reference ${REF}. ${doc ? 'Your signed copy is downloading.' : 'Your signed copy will be emailed to you.'} <b>To activate (clause 8):</b> email admin@daleel.io this signed copy, a copy of your Emirates ID (front and back) and your bank details (account in your own name).`;
    const delivered = () => { track('agreement_delivered', {ref: REF, source: srcKnown() || 'direct'}); $('#donetxt').innerHTML = `<b style="color:#16794a">Received by Daleel ✓</b> Reference ${REF}, registered. <b>Last step to activate (clause 8):</b> email to admin@daleel.io this signed copy, a clear copy of the front and back of your Emirates ID, and the bank details of an account in your own name. We countersign and confirm your Effective Date by email.`; };
    const unconfirmed = () => { track('agreement_delivery_unconfirmed', {ref: REF}); $('#sendrow').hidden = false; $('#donetxt').innerHTML = `<b style="color:#16794a">Sent to Daleel ✓</b> Reference ${REF}. Your signed copy has been downloaded. To activate (clause 8), email admin@daleel.io this signed copy, your Emirates ID (front and back) and your bank details. You can also reach us with the buttons below.`; };
    // 1) send (an opaque request is never blocked by cross-origin rules), 2) confirm by polling the registry through a script tag
    const send = async () => { try { await fetch(SUBMIT_URL, {method:'POST', mode:'cors', headers:{'Content-Type':'text/plain'}, body: JSON.stringify(payload)}); } catch (e) { try { await fetch(SUBMIT_URL, {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'}, body: JSON.stringify(payload)}); } catch (e2) {} } };
    const check = () => new Promise(res => { const cb = 'ody_' + Math.random().toString(36).slice(2); const sc = document.createElement('script'); let done = false;
      window[cb] = r => { done = true; delete window[cb]; sc.remove(); res(!!(r && r.found)); };
      sc.onerror = () => { if (!done){ done = true; delete window[cb]; sc.remove(); res(null); } };
      sc.src = SUBMIT_URL + '?check=' + encodeURIComponent(REF) + '&secret=' + encodeURIComponent(SUBMIT_SECRET) + '&callback=' + cb + '&t=' + Date.now(); document.head.appendChild(sc);
      setTimeout(() => { if (!done){ done = true; delete window[cb]; sc.remove(); res(null); } }, 6000); });
    (async () => { await send(); for (let i = 0; i < 10; i++) { await new Promise(r => setTimeout(r, i ? 2500 : 1500)); const f = await check(); if (f){ delivered(); return; } } unconfirmed(); })();
  }
  const summary = `Odysseus introducer agreement signed · ${REF} · ${name}${brn ? ' · BRN ' + brn : ''}${agency ? ' · ' + agency : ''} · ${email} · ${phoneNorm}. PDF attached.`;
  if (!SUBMIT_URL) $('#donetxt').textContent = `Your signed copy has been downloaded (${REF}). Send it to Daleel so we can countersign and register your first agency.`;
  if (SUBMIT_URL && !PREVIEW) $('#sendrow').hidden = true;
  $('#sendwa').href = waLink(summary, DALEEL_WHATSAPP || '');
  $('#sendmail').href = `mailto:${DALEEL_EMAIL}?subject=${encodeURIComponent('Odysseus introducer agreement · ' + REF)}&body=${encodeURIComponent(summary + '\n\n(Attach the PDF you just downloaded.)')}`;
  if (PREVIEW){
    const wa = $('#sendwa'), ml = $('#sendmail');
    wa.textContent = 'Copy my details'; wa.removeAttribute('href'); wa.removeAttribute('target'); wa.addEventListener('click', async ev => { ev.preventDefault(); try { await navigator.clipboard.writeText(summary); wa.textContent = 'Copied ✓'; } catch { prompt('Copy your details:', summary); } });
    ml.style.display = 'none';
  }
  track('agreement_signed', {ref: REF, source: srcKnown() || 'direct', pdf: hasPdf ? 'browser' : 'server', referred: PARRAIN ? 'yes' : 'no'});
  $('#done').style.display = 'block'; $('#signbtn').style.display = 'none';
  /* personal referral link: the signing reference is the agent's referral code */
  lsSet('ody_mycode', REF);
  lsSet('ody_claim', JSON.stringify({ref: REF, email: email.trim().toLowerCase(), at: Date.now()})); lsSet('ody_portal_email', email.trim().toLowerCase());
  (() => {
    const link = myLink(REF), first = name.split(' ')[0];
    const msg = refMsg(link, first);
    $('#myreflink').value = link;
    $('#copyref').onclick = async () => { track('referral_link_copied'); try { await navigator.clipboard.writeText(link); } catch { $('#myreflink').select(); try { document.execCommand('copy'); } catch {} } $('#copyref').textContent = 'Copied ✓'; setTimeout(() => $('#copyref').textContent = 'Copy link', 2000); };
    const wa = $('#sharerefwa');
    if (PREVIEW) { wa.textContent = 'Copy the message'; wa.removeAttribute('href'); wa.removeAttribute('target'); wa.onclick = async ev => { ev.preventDefault(); try { await navigator.clipboard.writeText(msg); wa.textContent = 'Copied ✓'; } catch { prompt('Copy this message:', msg); } }; }
    else { wa.href = waLink(msg); wa.onclick = () => track('referral_link_shared'); }
    $('#refbox').style.display = 'block';
    if (window.__refreshInvite) window.__refreshInvite();
  })();
});


/* ===== Talk with our team (WhatsApp) ===== */
(() => {
  const els = document.querySelectorAll('.js-team');
  if (!TEAM_WHATSAPP && !PREVIEW) return;
  els.forEach(e => { e.hidden = false; });
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dubai = () => { const d = new Date(Date.now() + 4 * 3600e3); return {day: d.getUTCDay() || 7, h: d.getUTCHours() + d.getUTCMinutes() / 60}; };
  const status = () => {
    const n = dubai(), workday = d => TEAM_HOURS.days.includes(d);
    if (workday(n.day) && n.h >= TEAM_HOURS.from && n.h < TEAM_HOURS.to) return {on: true, text: 'Online now · we reply in minutes'};
    const hh = String(TEAM_HOURS.from).padStart(2, '0') + ':00';
    if (workday(n.day) && n.h < TEAM_HOURS.from) return {on: false, text: 'We reply today from ' + hh + ' (Dubai time)'};
    for (let k = 1; k <= 7; k++) { const d = ((n.day - 1 + k) % 7) + 1; if (workday(d)) return {on: false, text: 'We reply ' + (k === 1 ? 'tomorrow' : 'on ' + DAYS[d % 7]) + ' from ' + hh + ' (Dubai time)'}; }
    return {on: false, text: 'We reply as soon as we can'};
  };
  const paint = () => { const st = status(); document.querySelectorAll('.js-status').forEach(e => { e.classList.toggle('on', st.on); e.querySelector('span').textContent = st.text; }); };
  paint(); setInterval(paint, 60000);
  /* video in the call mock: decoded to a blob URL (plays everywhere, Safari included), paused when off screen */
  const v = document.getElementById('tvc-video');
  if (v) {
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!still) new IntersectionObserver(es => { if (es[0].isIntersecting) v.play().catch(() => {}); else v.pause(); }, {threshold: .2}).observe(v);
  }
  const t = document.getElementById('tvc-t');
  if (t && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let sec = 0, run = false;
    new IntersectionObserver(es => { run = es[0].isIntersecting; }).observe(t.closest('.tvc'));
    setInterval(() => { if (!run) return; sec++; t.textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); }, 1000);
  }
  const msgs = {
    chat: "Hi Daleel team! I'm on the Odysseus page and I have a question about the programme.",
    call: "Hi Daleel team! I'd like a 15-min WhatsApp video call about Odysseus.\nBest time for me: ",
  };
  const wire = (sel, kind) => document.querySelectorAll(sel).forEach(a => {
    const where = a.closest('#team') ? 'band' : a.closest('#sign') ? 'sign' : a.closest('#faq') ? 'faq' : 'page';
    if (TEAM_WHATSAPP) a.href = waLink(msgs[kind], TEAM_WHATSAPP);
    a.addEventListener('click', e => {
      track(kind === 'chat' ? 'team_chat_clicked' : 'team_call_requested', {from: where, online: status().on ? 'yes' : 'no'});
      if (!TEAM_WHATSAPP) { e.preventDefault(); alert('Preview: add the team WhatsApp number in TEAM_WHATSAPP to activate this button.'); }
    });
  });
  wire('.js-chat', 'chat'); wire('.js-call', 'call');
})();

/* ===== Referral section ===== */
(() => {
  const n = $('#rf-n'), fmtA = v => v.toLocaleString('en-US') + ' AED';
  const per = Math.round(SEAT_PRICE * 0.05);
  const upd = () => { const k = +n.value; $('#rf-n-o').textContent = k; $('#rf-month').textContent = fmtA(k * per); $('#rf-total').textContent = fmtA(k * per * 12); };
  n.addEventListener('input', upd); n.addEventListener('change', () => track('referral_calc', {referees: +n.value})); upd();
  const show = () => {
    const c = myCode(); $('#rf-out').hidden = !!c; $('#rf-in').hidden = !c; if (!c) return;
    const link = myLink(c); $('#rf-link').value = link;
    const msg = refMsg(link, '');
    $('#rf-copy').onclick = async () => { track('referral_link_copied', {from: 'section'}); try { await navigator.clipboard.writeText(link); } catch { $('#rf-link').select(); try { document.execCommand('copy'); } catch {} } $('#rf-copy').textContent = 'Copied ✓'; setTimeout(() => $('#rf-copy').textContent = 'Copy link', 2000); };
    const wa = $('#rf-wa');
    if (PREVIEW) { wa.removeAttribute('target'); wa.onclick = async e => { e.preventDefault(); try { await navigator.clipboard.writeText(msg); wa.textContent = 'Copied ✓'; } catch { prompt('Copy this message:', msg); } }; }
    else { wa.href = waLink(msg); wa.onclick = () => track('referral_link_shared', {from: 'section'}); }
  };
  show(); const prev = window.__refreshInvite; window.__refreshInvite = () => { if (prev) prev(); show(); };
})();

/* ===== My earnings: partner space (data from odysseus-portal.gs) ===== */
(() => {
  const P = $('#portal'), body = $('#p-body');
  const available = !!PORTAL_URL || PREVIEW;
  document.querySelectorAll('.js-my').forEach(el => { el.hidden = !available; });
  if (!available) return;

  const T_KEY = 'ody_portal_token', E_KEY = 'ody_portal_email';
  const aed = n => Math.round(n || 0).toLocaleString('en-US') + ' AED';
  const fdate = d => { if (!d) return ''; const x = new Date(String(d).slice(0, 10) + 'T12:00:00'); return isNaN(x) ? '' : x.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}); };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; };
  const add = (parent, ...kids) => { kids.flat().forEach(k => k && parent.append(k)); return parent; };
  let lastFocus = null, email = lsGet(E_KEY);

  const call = params => new Promise((resolve, reject) => {
    const cb = 'odp_' + Math.random().toString(36).slice(2), sc = document.createElement('script'); let done = false;
    const end = (v, err) => { if (done) return; done = true; delete window[cb]; sc.remove(); err ? reject(err) : resolve(v); };
    window[cb] = r => end(r);
    sc.onerror = () => end(null, {error: 'network'});
    sc.src = PORTAL_URL + '?' + new URLSearchParams(Object.assign({}, params, {callback: cb, t: Date.now()}));
    document.head.appendChild(sc);
    setTimeout(() => end(null, {error: 'timeout'}), 20000);
  });
  const MSG = {
    invalid_email: 'Enter the email address you signed your agreement with.',
    not_found: 'We have no signed agreement with this email. Use the email you signed with, or sign the agreement first.',
    wait: 'A code was just sent. Wait a minute before asking for a new one.',
    wrong_code: 'This code is not right. Check the latest email from Daleel.',
    expired: 'This code has expired. Ask for a new one.',
    network: 'No connection to Daleel. Check your internet and try again.',
    timeout: 'Daleel took too long to answer. Try again.',
    server: 'Something went wrong on our side. Try again in a minute.',
  };
  const msgOf = e => MSG[(e && e.error) || e] || MSG.server;

  function open() {
    if (!P.hidden) return;
    email = lsGet(E_KEY) || email; lastFocus = document.activeElement; P.hidden = false; document.body.style.overflow = 'hidden';
    track('portal_opened');
    route();
  }
  function close() {
    P.hidden = true; document.body.style.overflow = '';
    if (location.hash === '#my') history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $('#p-close').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !P.hidden) close(); });
  document.addEventListener('click', e => { const a = e.target.closest('a[href="#my"]'); if (a) { e.preventDefault(); history.replaceState(null, '', '#my'); open(); } });
  window.addEventListener('hashchange', () => { if (location.hash === '#my') open(); });

  function screen(...kids) { body.replaceChildren(...kids.flat().filter(Boolean)); const h = body.querySelector('h2'); if (h) { h.id = 'p-title'; h.tabIndex = -1; h.focus({preventScroll: true}); } P.scrollTop = 0; }

  async function route() {
    if (PREVIEW) return dashboard(DEMO, true);
    const token = lsGet(T_KEY);
    if (token) return load(token);
    // just signed on this device: open the dashboard directly, no email code
    let cl = null; try { cl = JSON.parse(lsGet('ody_claim') || 'null'); } catch {}
    if (cl && cl.ref && cl.email && Date.now() - (cl.at || 0) < 2 * 3600e3) {
      screen(el('h2', '', 'Opening your dashboard…'));
      for (let i = 0; i < 8; i++) {
        try {
          const r = await call({action: 'claim', ref: cl.ref, email: cl.email});
          if (r && r.ok && r.token) { lsSet(T_KEY, r.token); try { localStorage.removeItem('ody_claim'); } catch {} track('portal_claimed'); return load(r.token); }
          if (r && (r.error === 'claimed' || r.error === 'too_late')) break;
        } catch {}
        await new Promise(res => setTimeout(res, 2500));
      }
      try { localStorage.removeItem('ody_claim'); } catch {}
    }
    loginScreen();
  }

  function loginScreen(prefill, error) {
    const f = el('form'); const inp = el('input'); inp.type = 'email'; inp.required = true; inp.autocomplete = 'email'; inp.placeholder = 'you@agency.ae'; inp.value = prefill || email || lsGet(E_KEY) || '';
    inp.setAttribute('aria-label', 'Email');
    const err = el('p', 'perr', error || ''); err.setAttribute('role', 'alert');
    const btn = el('button', 'btn', 'Email me a sign-in code'); btn.type = 'submit';
    add(f, inp, err, btn);
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = ''; const v = inp.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { err.textContent = MSG.invalid_email; return; }
      btn.disabled = true; btn.textContent = 'Sending…';
      try { const r = await call({action: 'requestCode', email: v}); if (r && r.ok) { email = v; lsSet(E_KEY, v); codeScreen(); } else err.textContent = msgOf(r); }
      catch (x) { err.textContent = msgOf(x); }
      btn.disabled = false; btn.textContent = 'Email me a sign-in code';
    });
    screen(el('h2', '', 'Your Odysseus dashboard'), el('p', 'lead', 'Enter the email you signed your agreement with. We send you a 6-digit code, no password needed. On the device where you signed, your dashboard opens directly.'), f);
  }

  function codeScreen() {
    const f = el('form'); const inp = el('input', 'code'); inp.inputMode = 'numeric'; inp.autocomplete = 'one-time-code'; inp.maxLength = 6; inp.required = true; inp.setAttribute('aria-label', '6-digit code');
    const err = el('p', 'perr'); err.setAttribute('role', 'alert');
    const btn = el('button', 'btn', 'Open my dashboard'); btn.type = 'submit';
    const back = el('button', 'plink', 'Use another email or get a new code'); back.type = 'button'; back.onclick = () => loginScreen(email);
    add(f, inp, err, btn, back);
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = ''; const c = inp.value.replace(/\D/g, '');
      if (c.length !== 6) { err.textContent = 'Enter the 6 digits from the email.'; return; }
      btn.disabled = true; btn.textContent = 'Checking…';
      try { const r = await call({action: 'verify', email, code: c}); if (r && r.ok && r.token) { lsSet(T_KEY, r.token); track('portal_signed_in'); return load(r.token); } err.textContent = msgOf(r); }
      catch (x) { err.textContent = msgOf(x); }
      btn.disabled = false; btn.textContent = 'Open my dashboard';
    });
    screen(el('h2', '', 'Check your email'), el('p', 'lead', 'We sent a 6-digit code to ' + email + '. It works for 10 minutes. Nothing after two minutes? Look in your spam folder.'), f);
    setTimeout(() => inp.focus(), 50);
  }

  async function load(token) {
    screen(el('h2', '', 'Loading your dashboard…'));
    try {
      const r = await call({action: 'me', token});
      if (r && r.ok) return dashboard(r, false);
      if (r && r.error === 'auth') { try { localStorage.removeItem(T_KEY); } catch {} return loginScreen(email, 'Your session has ended. Sign in again.'); }
      screen(el('h2', '', 'Your Odysseus dashboard'), el('p', 'perr', msgOf(r)), retryBtn(token));
    } catch (x) { screen(el('h2', '', 'Your Odysseus dashboard'), el('p', 'perr', msgOf(x)), retryBtn(token)); }
  }
  const retryBtn = token => { const b = el('button', 'btn', 'Try again'); b.type = 'button'; b.onclick = () => load(token); return b; };

  function segs(paid, months) { const s = el('div', 'seg'); s.setAttribute('aria-label', paid + ' of ' + months + ' months paid'); for (let i = 0; i < months; i++) s.append(el('i', i < paid ? 'on' : '')); return s; }
  function pair(label, value) { const d = el('div'); add(d, el('em', '', label), el('span', '', value)); return d; }

  function dashboard(d, demo) {
    const kids = [];
    if (demo) kids.push(el('div', 'demo', 'Preview with example figures. On agent.daleel.io, each agent signs in with their email and sees their own agencies, referees and payments.'));
    if (!d.me) {
      kids.push(el('h2', '', 'Your Odysseus dashboard'), el('p', 'lead', 'Your account is being set up. Your agencies and referees appear here once Daleel has registered your agreement.'));
      kids.push(signOutRow(d));
      return screen(kids);
    }
    const me = d.me, t = d.totals, rate = Math.round((d.rates && d.rates.referral || .05) * 100), months = (d.rates && d.rates.months) || 12;
    kids.push(el('h2', '', 'Hello ' + (me.firstName || '') ));
    kids.push(el('p', 'lead', 'Partner since ' + (fdate(me.signedAt) || 'recently') + '. ' + (me.introduced ? me.introduced + ' agenc' + (me.introduced > 1 ? 'ies' : 'y') + ' introduced, ' + me.meetings + ' meeting' + (me.meetings === 1 ? '' : 's') + ' held.' : 'Introduce your first agency to start earning.')));

    const tot = el('div', 'ptot');
    const tile = (v, l) => { const x = el('div'); add(x, el('b', '', v), el('span', '', l)); return x; };
    add(tot, tile(aed(t.paid), 'Paid to you'), tile(aed(t.toCome), 'Still to come'), tile(String(d.referees.length), d.referees.length === 1 ? 'Referee' : 'Referees'));
    kids.push(tot);

    if (me.link) {
      const box = el('div', 'refbox'); box.style.display = 'block';
      const row = el('div', 'reflink'); const inp = el('input'); inp.readOnly = true; inp.value = me.link; inp.setAttribute('aria-label', 'Your personal referral link');
      const cp = el('button', 'btn light', 'Copy link'); cp.type = 'button';
      cp.onclick = async () => { track('referral_link_copied', {from: 'portal'}); try { await navigator.clipboard.writeText(me.link); } catch { inp.select(); try { document.execCommand('copy'); } catch {} } cp.textContent = 'Copied ✓'; setTimeout(() => cp.textContent = 'Copy link', 2000); };
      const msg = refMsg(me.link, me.firstName || '');
      const wa = el('a', 'btn dark', 'Share on WhatsApp');
      if (PREVIEW) { wa.href = '#'; wa.onclick = async e => { e.preventDefault(); try { await navigator.clipboard.writeText(msg); wa.textContent = 'Copied ✓'; } catch { prompt('Copy this message:', msg); } }; }
      else { wa.href = waLink(msg); wa.target = '_blank'; wa.rel = 'noopener'; wa.onclick = () => track('referral_link_shared', {from: 'portal'}); }
      add(row, inp, cp, wa);
      add(box, el('h4', '', 'Your referral link'), el('p', '', 'Every agent who signs with it earns you ' + rate + '% of each payment from the agencies they bring in, for their first ' + months + ' months, on top of their own 20%.'), row);
      kids.push(box);
    }

    kids.push(el('h3', '', 'Your agencies'));
    if (d.deals.length) {
      d.deals.forEach(x => {
        const c = el('div', 'pcard'); const top = el('div', 'top');
        add(top, el('b', '', x.agency || 'Agency'), el('span', 'muted', aed(x.monthly) + ' per month'));
        const left = x.monthly * (x.months - x.paid);
        add(c, top, segs(x.paid, x.months), el('div', 'muted', x.paid + ' of ' + x.months + ' months paid' + (x.startedAt ? ', since ' + fdate(x.startedAt) : '') + (left ? '. ' + aed(left) + ' still to come.' : '. Completed.')));
        kids.push(c);
      });
    } else kids.push(el('div', 'empty', 'No signed agency yet. When an agency you introduced signs and pays Daleel, it appears here with your 20% month by month.'));

    kids.push(el('h3', '', 'Your referees'));
    if (d.referees.length) {
      d.referees.forEach(r => {
        const c = el('div', 'pcard'); const top = el('div', 'top');
        add(top, el('b', '', r.name), el('span', 'muted', r.joinedAt ? 'Joined ' + fdate(r.joinedAt) : 'Joined'));
        const st = el('div', 'p-steps'); const lvl = r.signedAgencies ? 3 : r.introduced ? 2 : 1;
        ['Signed up', 'Agency introduced', 'Agency signed'].forEach((l, i) => st.append(el('span', i < lvl ? 'on' : '', l)));
        const two = el('div', 'two');
        add(two,
          pair('Their activity', r.introduced + ' introduced, ' + r.meetings + ' met, ' + r.signedAgencies + ' signed'),
          pair('Their commission', r.theirMonthly ? aed(r.theirMonthly) + ' per month' : 'None yet'),
          pair('Your ' + rate + '% bonus', r.bonusMonthly ? aed(r.bonusMonthly) + ' per month' : 'Starts when their agency signs'),
          pair('Bonus paid / to come', aed(r.bonusPaid) + ' / ' + aed(r.bonusToCome)));
        add(c, top, st, two);
        kids.push(c);
      });
    } else kids.push(el('div', 'empty', 'No referee yet. Share your link with agents you know: when they sign, they appear here and you earn ' + rate + '% on their agencies.'));

    kids.push(signOutRow(d));
    screen(kids);
  }

  function signOutRow(d) {
    const f = el('div', 'foot');
    add(f, el('span', '', (d.updatedAt ? 'Updated ' + fdate(d.updatedAt) + '. ' : '') + 'Figures are indicative; your quarterly calculation statement prevails (clauses 1A and 2).'));
    if (!PREVIEW) { const b = el('button', 'plink', 'Sign out'); b.type = 'button'; b.onclick = () => { try { localStorage.removeItem(T_KEY); } catch {} track('portal_signed_out'); loginScreen(email); }; f.append(b); }
    return f;
  }

  const DEMO = { me: {firstName: 'Sara', signedAt: '2026-09-02', link: ODYSSEUS_URL + '?ref=ODY-20260902-K7M2', introduced: 3, meetings: 2},
    totals: {paid: 13800, toCome: 77400},
    deals: [{agency: 'Example Properties LLC', monthly: 6000, paid: 2, months: 12, startedAt: '2026-08-15'}],
    referees: [
      {name: 'Karim B.', joinedAt: '2026-09-10', introduced: 2, meetings: 1, signedAgencies: 1, theirMonthly: 6000, bonusMonthly: 900, bonusPaid: 1800, bonusToCome: 9000},
      {name: 'Lina H.', joinedAt: '2026-10-05', introduced: 0, meetings: 0, signedAgencies: 0, theirMonthly: 0, bonusMonthly: 0, bonusPaid: 0, bonusToCome: 0}],
    rates: {direct: .2, referral: .05, months: 12}, updatedAt: '' };

  if (location.hash === '#my') open();
})();
