/* Sideline scoreboard: shown in landscape (isL()) while a match is live. Read-only, no score controls.
   Reads the same feed (S). Feed field `home` ('A'|'B', 1.0.3 (146)) picks the celebratory tier; anything else = calm for both. */
const SL_STORE = STORE_URL;
const SL_CUES = {}; // Sound Designer: { home: 'snd/cheer.m4a', opp: 'snd/tick.m4a' }. Empty = silent.
const SL = { on: false, view: 'board', prev: null, lastPt: Date.now(), att: false, attT0: 0, attPh: -1, tabT: 0, viewAt: 0, shareAt: 0, ffT: 0, fsTried: false, unlocked: false,
  snd: (() => { try { return localStorage.getItem('vgs.sideline.sound') === 'on'; } catch (e) { return false; } })() };
const SL_ATT_MS = 45000, SL_TAB_MS = 4000, SL_QR_MS = 30000, SL_PH = [8000, 3000, 8000];
const slRgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)).join(',');
const slWant = () => isL() && !UNAV && !!S && S.status === 'live' && !isOver();
const slHome = () => S && (S.home === 'A' || S.home === 'B') ? S.home : null;
function slQR(u, fg, bg, m) { const q = qrcode(0, 'M'); q.addData(u); q.make(); const n = q.getModuleCount(), w = n + 2 * m; let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  return `<svg viewBox="0 0 ${w} ${w}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="${w}" height="${w}" fill="${bg}"/><path d="${d}" fill="${fg}"/></svg>`; }
const SL_SPK = { off: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" fill="none"/></svg>',
  on: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none"/></svg>' };
function slBuild() {
  const d = document.createElement('div'); d.id = 'sl'; d.hidden = true; d.setAttribute('role', 'region'); d.setAttribute('aria-label', 'Sideline scoreboard');
  d.innerHTML = `<div class="slw"></div><div class="slb" id="slb"></div><div class="slv"></div><div class="shv" id="slsh" hidden></div>
    <div class="tabs" id="sltab" role="tablist"><span class="ind"></span><button role="tab" data-t="board" aria-selected="true">Score</button><button role="tab" data-t="share" aria-selected="false">Share</button></div>
    <button class="snd" id="slsnd"></button>`;
  document.body.appendChild(d);
  d.addEventListener('pointerdown', () => { SL.viewAt = Date.now(); if (SL.snd) SL.unlocked = true; slFs(); }, true);
  $('sltab').addEventListener('click', e => { const b = e.target.closest('button'); if (b) slGo(b.dataset.t); });
  $('slsnd').addEventListener('click', e => { e.stopPropagation(); SL.snd = !SL.snd; if (SL.snd) SL.unlocked = true;
    try { localStorage.setItem('vgs.sideline.sound', SL.snd ? 'on' : 'off'); } catch (x) {} slSnd(); slTabs(); });
  d.addEventListener('click', e => { const x = e.target; if (x.closest('.tabs,.snd')) return;
    if (SL.view === 'board') return slTabs();
    const c = x.closest('[data-q]'); if (c) return slGo(c.dataset.q);
    if (x.closest('.bk')) return slGo('share');
    if (!x.closest('.slc,.qb,.gc')) slGo(SL.view === 'share' ? 'board' : 'share'); });
  addEventListener('keydown', e => { if (SL.on && e.key === 'Escape' && SL.view !== 'board') slGo(SL.view === 'share' ? 'board' : 'share'); });
  document.addEventListener('visibilitychange', () => { if (SL.on && document.visibilityState === 'visible') wake(); });
  slSnd(); return d;
}
const slEl = () => $('sl') || slBuild();
function slSnd() { const b = $('slsnd'); b.innerHTML = SL.snd ? SL_SPK.on : SL_SPK.off; b.setAttribute('aria-label', SL.snd ? 'Sound on. Tap to mute' : 'Sound off. Tap to turn sound on'); b.setAttribute('aria-pressed', SL.snd ? 'true' : 'false'); }
function slCue(k) { if (!SL.snd || !SL.unlocked) return; const src = SL_CUES[k]; if (!src) return; try { const a = new Audio(src); a.play().catch(() => {}); } catch (e) {} }
function slFs() { if (SL.fsTried) return; SL.fsTried = true; const r = document.documentElement;
  try { if (document.fullscreenEnabled && !document.fullscreenElement && r.requestFullscreen) r.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch (e) {} }
function slTabs() { const s = slEl(); s.classList.remove('th'); clearTimeout(SL.tabT); if (SL.view === 'board') SL.tabT = setTimeout(() => { if (SL.view === 'board') { s.classList.add('th'); slFit(); } }, SL_TAB_MS); slFit(); }
function slShow() {
  const s = slEl(); SL.on = true; s.hidden = false; SL.prev = null; SL.lastPt = Date.now(); SL.view = 'board'; SL.fsTried = false;
  s.classList.remove('slshr'); const tb = $('sltab'); tb.classList.remove('s2'); tb.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === 'board')));
  if (qOpen) closeQR(); closeMs(); if (aboutOpen) closeAbout();
  const w = document.querySelector('.wrap'); w.style.visibility = 'hidden'; wake(); slTabs();
}
function slHide() {
  const s = $('sl'); SL.on = false; if (s) s.hidden = true; slAtt(false); clearTimeout(SL.tabT); SL.view = 'board'; if ($('slsh')) $('slsh').hidden = true;
  document.querySelector('.wrap').style.visibility = ''; if (!qOpen) unwake();
  try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch (e) {}
}
function slHalf(t, srv) {
  return `<div class="h" id="slh${t.k}" style="--tc:${t.c};--ti:${t.i};--rc:${slRgb(t.c)}"><div class="lift"></div><div class="rim"></div>
    <div class="hd"><span class="nm">${esc(t.n)}</span>${srv ? '<span class="ball" role="img" aria-label="Serving"></span>' : ''}<span class="sx">Sets <b>${t.sets}</b></span></div>
    <div class="dg"><span aria-label="${esc(t.n)} ${t.pts} points">${t.pts}</span></div></div>`;
}
function slBoard(A, B) {
  const nSets = Array.isArray(S.sets) ? S.sets.length : 0, setNo = +S.setNo || nSets + 1, bo = +S.bestOf >= 1 ? +S.bestOf : 0;
  $('slb').innerHTML = `${slHalf(A, S.serving === 'A')}<div class="net"><div class="sp"><i>SET</i><b>${setNo}</b>${bo ? `<small>of ${bo}</small>` : ''}</div><div class="at" id="slat"></div></div>${slHalf(B, S.serving === 'B')}`;
  SL.attPh = -1; slFit();
}
function slFit() { requestAnimationFrame(() => document.querySelectorAll('#sl .dg').forEach(box => { const sp = box.firstElementChild; if (!sp) return;
  const W = box.clientWidth / 1.09, H = box.clientHeight / 1.09; let f = Math.min(H * 1.12, innerHeight * .78); sp.style.fontSize = f + 'px';
  for (let i = 0; i < 40 && (sp.offsetWidth > W || sp.offsetHeight > H) && f > 20; i++) { f *= .95; sp.style.fontSize = f + 'px'; } })); }
function slGo(v) {
  const s = slEl(), sh = $('slsh'), was = SL.view; if (v === was) { if (v === 'board') slTabs(); return; }
  if (was === 'board' && v !== 'board') { SL.shareAt = Date.now(); slAtt(false); }
  if (v === 'board' && was !== 'board') SL.lastPt += Date.now() - SL.shareAt;
  SL.view = v; SL.viewAt = Date.now();
  const tb = $('sltab'); tb.classList.toggle('s2', v !== 'board'); tb.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String((b.dataset.t === 'board') === (v === 'board'))));
  s.classList.toggle('slshr', v !== 'board');
  if (v === 'board') { sh.hidden = true; sh.innerHTML = ''; slTabs(); return; }
  clearTimeout(SL.tabT); s.classList.remove('th');
  const wm = '<img class="slwm" src="img/vgs-wordmark-line-640.png" alt="Volley Good Show">';
  const gc = (cls) => `<div class="gc ${cls || ''}"><div class="qq">${slQR(SL_STORE, '#fff', '#111', 1)}</div><div class="gt">Get</div>${wm}</div>`;
  if (v === 'share') sh.innerHTML = `<div class="t">Share</div><div class="cards">
    <button class="slc" data-q="qrS"><span class="q">${slQR(shareUrl(), '#111', '#fff', 2)}</span>${wm}<b>Share score</b><strong>Live score page</strong><small>Anyone can follow this match.</small></button>
    <button class="slc k" data-q="qrA"><span class="q">${slQR(SL_STORE, '#fff', '#111', 1)}</span><span class="gt">Get</span>${wm}<b>Share the app</b><strong>Get Volley Good Show</strong><small>Scan to download the app.</small></button></div>`;
  else sh.innerHTML = `<div class="t">${v === 'qrS' ? 'Share score' : 'Share the app'}<button class="bk">Back</button></div>
    <div class="qz"><div class="slqw">${v === 'qrS' ? `<div class="qb">${slQR(shareUrl(), '#111', '#fff', 3)}</div>` : gc()}</div><div class="hn">Tap outside or tap Score to go back</div></div>`;
  sh.hidden = false; wake();
}
function slAtt(on) {
  const s = $('sl'); if (!s) return; if (on === SL.att) return; SL.att = on; s.classList.toggle('att', on); SL.attT0 = Date.now(); SL.attPh = -1;
  if (!on && $('slat')) $('slat').innerHTML = ''; slFit(); if (on) slAttTick();
}
function slAttTick() {
  const el = $('slat'); if (!SL.att || !el) return; const tot = SL_PH.reduce((a, b) => a + b, 0); let t = (Date.now() - SL.attT0) % tot, ph = 0;
  while (t >= SL_PH[ph]) { t -= SL_PH[ph]; ph++; }
  if (ph === SL.attPh) return; SL.attPh = ph; const [A, B] = teams();
  if (ph === 0) { const ss = (Array.isArray(S.sets) ? S.sets : []).slice(-4);
    const rows = ss.map((x, i) => { const w = +x.A > +x.B ? A : +x.B > +x.A ? B : null; return `<div class="r">${w ? `<i style="background:${w.c}"></i>` : ''}<small>S${S.sets.length - ss.length + i + 1}</small> ${+x.A || 0}–${+x.B || 0}</div>`; }).join('');
    el.innerHTML = `<div class="ac"><h4>SET HISTORY</h4>${rows}<div class="r now"><small>S${+S.setNo || (S.sets || []).length + 1}</small> ${A.pts}–${B.pts}</div></div>`; }
  else if (ph === 1) el.innerHTML = `<div class="ac k lg"><img class="slic" src="img/vgs-app-icon-light-256.png" alt="Volley Good Show app icon"><img class="slwm" src="img/vgs-wordmark-line-640.png" alt="Volley Good Show"></div>`;
  else el.innerHTML = `<div class="gc ac" style="border:0">${slQR(SL_STORE, '#fff', '#111', 1)}<div class="gt">Get</div><img class="slwm" src="img/vgs-wordmark-line-640.png" alt="Volley Good Show"></div>`;
}
function slFan(k) {
  const s = $('sl'), h = $('slh' + k); if (!s || !h) return; const [A, B] = teams(), t = k === 'A' ? A : B, full = slHome() === k, rm = calm();
  slCue(full ? 'home' : 'opp');
  clearTimeout(SL.ffT); s.classList.remove('ffa', 'ffc', 'ffra', 'ffrc'); s.style.setProperty('--fc', t.c); void s.offsetWidth;
  h.classList.add('hit'); s.classList.add(rm ? (full ? 'ffra' : 'ffrc') : (full ? 'ffa' : 'ffc'));
  SL.ffT = setTimeout(() => s.classList.remove('ffa', 'ffc', 'ffra', 'ffrc'), rm ? 1400 : full ? 950 : 650);
}
function slSync() {
  const want = slWant(); if (want !== SL.on) want ? slShow() : slHide(); if (!SL.on) return;
  const [A, B] = teams(), n = Array.isArray(S.sets) ? S.sets.length : 0, p = SL.prev; let hit = null;
  if (p && (p.n !== n || p.A !== A.pts || p.B !== B.pts)) { SL.lastPt = Date.now(); slAtt(false); if (p.n === n) hit = A.pts > p.A ? 'A' : B.pts > p.B ? 'B' : null; }
  slBoard(A, B); if (SL.att) slAttTick();
  if (hit && !TK.el) slFan(hit);
  SL.prev = { n, A: A.pts, B: B.pts };
}
setInterval(() => { if (!SL.on) return; const now = Date.now();
  if (SL.view === 'board') { if (!SL.att && !TK.el && now - SL.lastPt >= SL_ATT_MS) slAtt(true); else slAttTick(); }
  else if (now - SL.viewAt >= SL_QR_MS) slGo('board'); }, 500);
addEventListener('resize', () => { if (SL.on) slFit(); });
