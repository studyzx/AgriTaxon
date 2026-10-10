/* AgriTaxon entity explorer: canvas map of every entity (t-SNE of label embeddings).
   entities.json (about 10 MB) is fetched only when the explorer is scrolled near or the load button is pressed. */
(() => {
  'use strict';
  const S = 'shared/';
  const TRACKS = ['crop', 'livestock', 'pest', 'weed'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (q) => document.querySelector(q);

  let ctx = null;            // { content, trackNames, nModels, icon }
  let P = null;              // points
  let state = null;
  let started = false;

  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k]; if (v == null || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return e;
  }
  const fint = (v) => Number(v).toLocaleString('en-US');
  const fpv = (v) => (Number.isInteger(+v) ? fint(v) : (+v).toLocaleString('en-US', { maximumFractionDigits: 1 }));

  /* ---------- colour scales ---------- */
  function hexToRgb(x) { const n = parseInt(x.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; }
  function ramp(stops, t) {
    // stops: [[pos, hex], ...]
    for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) {
      const [p0, c0] = stops[i - 1], [p1, c1] = stops[i];
      return mix(c0, c1, (t - p0) / (p1 - p0));
    }
    return stops[stops.length - 1][1];
  }
  let TC, ZERO, RED, BLUE;
  function initColors() {
    TC = { crop: css('--c-crop'), livestock: css('--c-livestock'), pest: css('--c-pest'), weed: css('--c-weed') };
    ZERO = '#8F999E';
    RED = [[0, '#EDB3AD'], [0.5, css('--oe')], [1, '#6E1A14']];
    BLUE = [[0, '#B7CCDD'], [0.5, css('--mc')], [1, '#0F3452']];
  }
  function seqColor(kind, v) {
    if (v <= 0) return ZERO;
    const t = (v - 1) / Math.max(1, ctx.nModels - 1);
    return ramp(kind === 'n' ? RED : BLUE, t);
  }
  function colorOf(p) { return state.color === 'track' ? TC[p.t] : seqColor(state.color, p[state.color]); }

  /* ---------- init ---------- */
  function init(c) {
    ctx = c;
    initColors();
    const hn = ctx.content.headline_numbers;
    $('#ex-lede').textContent = `Every one of the ${fint(hn.entities)} entities, placed by a t-SNE of its label's text embedding, so related names sit close together. Hover a point to see how many of the ${ctx.nModels} models select and name it.`;
    $('#ex-q').placeholder = `Search ${fint(hn.entities)} entities by name`;
    $('#ex-load-msg').textContent = `The explorer loads all ${fint(hn.entities)} entities with 48-pixel thumbnails (about 10 MB) when you reach it.`;
    $('#ex-load-btn').addEventListener('click', load);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '250px 0px' });
      io.observe($('#ex'));
    }
  }

  async function load() {
    if (started) return; started = true;
    const btn = $('#ex-load-btn'); btn.disabled = true; btn.textContent = 'Loading…';
    const prog = $('.ex-prog'); prog.classList.add('on');
    const bar = $('#ex-prog-bar');
    try {
      const res = await fetch(S + 'data/entities.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const total = +res.headers.get('Content-Length') || 0;
      let text;
      if (res.body && total) {
        const reader = res.body.getReader(); const chunks = []; let got = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value); got += value.length; bar.style.width = (100 * got / total).toFixed(1) + '%';
        }
        const all = new Uint8Array(got); let o = 0; chunks.forEach((c) => { all.set(c, o); o += c.length; });
        text = new TextDecoder().decode(all);
      } else text = await res.text();
      const data = JSON.parse(text);
      P = data.points;
      // keep the plain-language part of the file's note (the rest documents field names)
      setup();
      $('#ex-load').hidden = true;
    } catch (e) {
      console.error('[explorer]', e);
      $('#ex-load-msg').textContent = 'The entity file could not be loaded.';
      btn.disabled = false; btn.textContent = 'Try again'; started = false;
    }
  }

  /* ---------- setup after data ---------- */
  function setup() {
    const canvas = $('#ex-canvas'); const wrap = $('#ex-wrap');
    const g = canvas.getContext('2d');
    state = {
      color: 'track', vis: new Set(TRACKS), k: 1, tx: 0, ty: 0, W: 0, H: 0, dpr: 1,
      hover: -1, sel: -1, bin: null, imgs: new Map(), raf: 0, base: null,
    };
    // spatial grid in data space
    const GN = 80; const grid = new Array(GN * GN);
    P.forEach((p, i) => { const gx = Math.min(GN - 1, Math.floor(p.x * GN)), gy = Math.min(GN - 1, Math.floor(p.y * GN)); const k = gy * GN + gx; (grid[k] || (grid[k] = [])).push(i); });
    // draw orders
    const idx = P.map((_, i) => i);
    const ORDER = {
      track: idx,
      n: idx.slice().sort((a, b) => P[a].n - P[b].n),
      s: idx.slice().sort((a, b) => P[a].s - P[b].s),
    };

    function fit() {
      const r = wrap.getBoundingClientRect();
      state.W = r.width; state.H = r.height; state.dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(state.W * state.dpr); canvas.height = Math.round(state.H * state.dpr);
      const pad = 26;
      const sx = Math.min(state.W - 2 * pad, (state.H - 2 * pad) * 1.5);
      const sy = Math.min(state.H - 2 * pad, (state.W - 2 * pad) * 1.5);
      state.base = { sx, sy, ox: (state.W - sx) / 2, oy: (state.H - sy) / 2 };
      draw();
    }
    const toX = (x) => (state.base.ox + x * state.base.sx) * state.k + state.tx;
    const toY = (y) => (state.base.oy + y * state.base.sy) * state.k + state.ty;
    const fromX = (sx) => ((sx - state.tx) / state.k - state.base.ox) / state.base.sx;
    const fromY = (sy) => ((sy - state.ty) / state.k - state.base.oy) / state.base.sy;
    const radius = () => Math.min(2.3 + (state.k - 1) * 0.55, 6);
    const thumbMode = () => state.k >= 5;
    const thumbSize = () => Math.max(22, Math.min(64, state.k * 5));
    const visible = (p) => state.vis.has(p.t);
    const inBin = (p) => state.bin == null || state.color === 'track' || p[state.color] === state.bin;

    function getImg(i) {
      let im = state.imgs.get(i);
      if (!im) {
        im = new Image(); im.decoding = 'async';
        im.onload = schedule; im.src = 'data:image/jpeg;base64,' + P[i].img;
        state.imgs.set(i, im);
        if (state.imgs.size > 1500) { const first = state.imgs.keys().next().value; state.imgs.delete(first); }
      }
      return im;
    }
    function schedule() { if (!state.raf) state.raf = requestAnimationFrame(() => { state.raf = 0; draw(); }); }

    function draw() {
      const { W, H, dpr } = state;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const order = ORDER[state.color];
      const r = radius();
      const faded = [], strong = [];
      for (const i of order) {
        const p = P[i]; if (!visible(p)) continue;
        (inBin(p) ? strong : faded).push(i);
      }
      // faded first
      if (faded.length) {
        g.globalAlpha = 0.12; g.fillStyle = '#9AA3A8'; g.beginPath();
        for (const i of faded) { const x = toX(P[i].x), y = toY(P[i].y); if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue; g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832); }
        g.fill(); g.globalAlpha = 1;
      }
      if (thumbMode()) {
        const sz = thumbSize(); let drawn = 0;
        for (const i of strong) {
          const p = P[i]; const x = toX(p.x), y = toY(p.y);
          if (x < -sz || y < -sz || x > W + sz || y > H + sz) continue;
          const im = getImg(i); const c = colorOf(p);
          g.fillStyle = c; g.fillRect(x - sz / 2 - 2, y - sz / 2 - 2, sz + 4, sz + 4);
          if (im.complete && im.naturalWidth) g.drawImage(im, x - sz / 2, y - sz / 2, sz, sz);
          else { g.fillStyle = '#E7E9E8'; g.fillRect(x - sz / 2, y - sz / 2, sz, sz); }
          drawn++;
        }
        // labels when few are on screen
        if (drawn && drawn <= 70 && sz >= 40) {
          g.font = '500 11px "Instrument Sans", "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top';
          for (const i of strong) {
            const p = P[i]; const x = toX(p.x), y = toY(p.y);
            if (x < 0 || y < 0 || x > W || y > H) continue;
            const t = p.l.length > 22 ? p.l.slice(0, 21) + '…' : p.l;
            const tw = g.measureText(t).width;
            g.fillStyle = 'rgba(255,255,255,.88)'; g.fillRect(x - tw / 2 - 3, y + sz / 2 + 3, tw + 6, 15);
            g.fillStyle = '#172126'; g.fillText(t, x, y + sz / 2 + 5);
          }
        }
      } else {
        // batch by colour
        let cur = null; g.beginPath();
        for (const i of strong) {
          const p = P[i]; const x = toX(p.x), y = toY(p.y);
          if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
          const c = colorOf(p);
          if (c !== cur) { if (cur) g.fill(); g.fillStyle = c; cur = c; g.beginPath(); }
          g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832);
        }
        if (cur) g.fill();
      }
      // hover + selection rings
      [state.sel, state.hover].forEach((i, k) => {
        if (i < 0 || !P[i] || !visible(P[i])) return;
        const p = P[i]; const x = toX(p.x), y = toY(p.y);
        const rr = thumbMode() ? thumbSize() / 2 + 5 : r + 4;
        g.lineWidth = 2; g.strokeStyle = '#fff';
        if (thumbMode()) { g.strokeRect(x - rr - 1, y - rr - 1, 2 * rr + 2, 2 * rr + 2); g.strokeStyle = '#172126'; g.strokeRect(x - rr, y - rr, 2 * rr, 2 * rr); }
        else { g.beginPath(); g.arc(x, y, rr + 1, 0, 6.2832); g.stroke(); g.strokeStyle = '#172126'; g.beginPath(); g.arc(x, y, rr, 0, 6.2832); g.stroke(); g.fillStyle = colorOf(p); g.beginPath(); g.arc(x, y, r + 1, 0, 6.2832); g.fill(); }
        if (k === 0 && !thumbMode()) {
          g.font = '600 12px "Instrument Sans", "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
          const tw = g.measureText(p.l).width; const lx = Math.min(x + rr + 6, state.W - tw - 10);
          g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(lx - 4, y - 10, tw + 8, 20);
          g.fillStyle = '#172126'; g.fillText(p.l, lx, y);
        }
      });
    }

    /* ---------- hit testing ---------- */
    function nearest(sx, sy) {
      const thumb = thumbMode(); const rad = thumb ? thumbSize() / 2 + 2 : Math.max(radius() + 5, 9);
      const dx = rad / (state.base.sx * state.k), dy = rad / (state.base.sy * state.k);
      const x = fromX(sx), y = fromY(sy);
      const gx0 = Math.max(0, Math.floor((x - dx) * GN)), gx1 = Math.min(GN - 1, Math.floor((x + dx) * GN));
      const gy0 = Math.max(0, Math.floor((y - dy) * GN)), gy1 = Math.min(GN - 1, Math.floor((y + dy) * GN));
      let best = -1, bd = Infinity;
      for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
        const cell = grid[gy * GN + gx]; if (!cell) continue;
        for (const i of cell) {
          const p = P[i]; if (!visible(p) || !inBin(p)) continue;
          const ddx = toX(p.x) - sx, ddy = toY(p.y) - sy;
          const d = thumb ? Math.max(Math.abs(ddx), Math.abs(ddy)) : Math.hypot(ddx, ddy);
          if (d <= rad && d < bd) { bd = d; best = i; }
        }
      }
      return best;
    }

    /* ---------- tooltip card ---------- */
    const tipEl = $('#ex-tip');
    const urlOf = (p) => p.w || ('https://www.wikidata.org/wiki/' + p.q);
    function showTip(i, pinned) {
      if (i < 0) { tipEl.hidden = true; tipEl.classList.remove('pinned'); return; }
      const p = P[i]; const nM = ctx.nModels;
      const bar = (lbl, v, c) => h('div', null, h('span', { text: lbl }), h('span', { class: 'b' }, h('i', { style: { width: (100 * v / nM) + '%', background: c } })), h('b', { text: `${v}/${nM}` }));
      tipEl.replaceChildren(
        h('div', { class: 'eh' }, h('img', { src: 'data:image/jpeg;base64,' + p.img, alt: '' }),
          h('div', null, h('div', { class: 'el', text: p.l }), h('div', { class: 'et' }, h('i', { style: { background: TC[p.t] } }), ctx.trackNames[p.t]),
            h('div', { class: 'epv', text: `${fpv(p.pv)} monthly pageviews` }))),
        h('div', { class: 'em' }, bar('Selecting', p.s, css('--mc')), bar('Naming', p.n, css('--oe'))),
        pinned ? h('div', { class: 'ego' }, h('a', { href: urlOf(p), target: '_blank', rel: 'noopener' }, p.w ? 'Open on Wikipedia ↗' : 'Open on Wikidata ↗'), ' · ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); state.sel = -1; showTip(-1); draw(); canvas.focus(); } }, 'Close'))
          : h('div', { class: 'ego', text: p.w ? 'Click to open its Wikipedia article' : 'Click to open its Wikidata item' }));
      tipEl.hidden = false; tipEl.classList.toggle('pinned', !!pinned);
      const x = toX(p.x), y = toY(p.y);
      const tw = tipEl.offsetWidth, th = tipEl.offsetHeight; const off = thumbMode() ? thumbSize() / 2 + 10 : 14;
      let left = x + off, top = y - th / 2;
      if (left + tw > state.W - 8) left = x - off - tw;
      if (left < 8) left = Math.max(8, Math.min(state.W - tw - 8, x - tw / 2));
      top = Math.max(8, Math.min(state.H - th - 8, top));
      if (left === Math.max(8, Math.min(state.W - tw - 8, x - tw / 2))) top = y + off + th < state.H ? y + off : y - off - th;
      tipEl.style.left = left + 'px'; tipEl.style.top = Math.max(8, top) + 'px';
    }

    /* ---------- view changes ---------- */
    function clampView() {
      const k = state.k; const W = state.W, H = state.H;
      const minX = (state.base.ox) * k, maxX = (state.base.ox + state.base.sx) * k;
      const minY = (state.base.oy) * k, maxY = (state.base.oy + state.base.sy) * k;
      // keep at least a third of the viewport on the data
      state.tx = Math.min(W * 0.66 - minX, Math.max(W * 0.34 - maxX, state.tx));
      state.ty = Math.min(H * 0.66 - minY, Math.max(H * 0.34 - maxY, state.ty));
    }
    function zoomAt(f, px, py) {
      const nk = Math.max(1, Math.min(60, state.k * f));
      state.tx = px - (px - state.tx) * (nk / state.k); state.ty = py - (py - state.ty) * (nk / state.k);
      state.k = nk;
      if (nk === 1) { state.tx = 0; state.ty = 0; }
      clampView(); afterView();
    }
    function afterView() {
      draw();
      if (state.sel >= 0) showTip(state.sel, true); else if (state.hover >= 0) showTip(state.hover, false); else showTip(-1);
    }
    let anim = 0;
    function animateTo(k, tx, ty) {
      cancelAnimationFrame(anim);
      if (reduceMotion) { state.k = k; state.tx = tx; state.ty = ty; afterView(); return; }
      const k0 = state.k, x0 = state.tx, y0 = state.ty; const t0 = performance.now(); const D = 550;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / D); const e = 1 - Math.pow(1 - t, 3);
        state.k = k0 + (k - k0) * e; state.tx = x0 + (tx - x0) * e; state.ty = y0 + (ty - y0) * e;
        draw(); if (state.sel >= 0) showTip(state.sel, true);
        if (t < 1) anim = requestAnimationFrame(step); else afterView();
      };
      anim = requestAnimationFrame(step);
    }
    function focusPoint(i) {
      const p = P[i]; if (!state.vis.has(p.t)) { state.vis.add(p.t); legend(); }
      state.bin = null;
      const k = Math.max(state.k, 9);
      const bx = (state.base.ox + p.x * state.base.sx) * k, by = (state.base.oy + p.y * state.base.sy) * k;
      state.sel = i; state.hover = -1;
      animateTo(k, state.W / 2 - bx, state.H / 2 - by);
    }

    /* ---------- pointer interaction ---------- */
    const pts = new Map(); let drag = null, pinch = null, moved = 0;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      moved = 0;
      if (pts.size === 1) drag = { x: e.offsetX, y: e.offsetY, tx: state.tx, ty: state.ty, t: performance.now(), type: e.pointerType };
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: state.k, tx: state.tx, ty: state.ty, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
        drag = null;
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y); const nk = Math.max(1, Math.min(60, pinch.k * d / pinch.d));
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        state.tx = cx - (pinch.cx - pinch.tx) * (nk / pinch.k); state.ty = cy - (pinch.cy - pinch.ty) * (nk / pinch.k); state.k = nk;
        clampView(); moved = 99; afterView(); return;
      }
      if (drag) {
        const dx = e.offsetX - drag.x, dy = e.offsetY - drag.y; moved = Math.max(moved, Math.hypot(dx, dy));
        if (moved > 4) {
          canvas.classList.add('dragging');
          state.tx = drag.tx + dx; state.ty = drag.ty + dy; clampView();
          state.hover = -1; if (state.sel < 0) showTip(-1); draw(); if (state.sel >= 0) showTip(state.sel, true);
        }
        return;
      }
      if (e.pointerType === 'mouse') {
        const i = nearest(e.offsetX, e.offsetY);
        if (i !== state.hover) {
          state.hover = i; canvas.classList.toggle('pointing', i >= 0);
          draw(); if (state.sel < 0 || i >= 0) showTip(i >= 0 ? i : state.sel, i < 0 && state.sel >= 0);
        }
      }
    });
    const end = (e) => {
      pts.delete(e.pointerId);
      canvas.classList.remove('dragging');
      if (pinch && pts.size < 2) { pinch = null; drag = null; return; }
      if (drag && moved <= 4 && e.type === 'pointerup') {
        const i = nearest(e.offsetX, e.offsetY);
        if (drag.type === 'mouse') {
          if (i >= 0) window.open(urlOf(P[i]), '_blank', 'noopener');
        } else {
          state.sel = i; state.hover = -1; draw(); showTip(i, true);
        }
      }
      drag = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && state.hover >= 0) { state.hover = -1; canvas.classList.remove('pointing'); draw(); showTip(state.sel, state.sel >= 0); }
    });
    canvas.addEventListener('dblclick', (e) => { e.preventDefault(); zoomAt(2, e.offsetX, e.offsetY); });
    let wheelHintT = 0;
    canvas.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey || document.activeElement === canvas)) {
        const help = $('#ex-help'); help.textContent = 'Click the map first (or hold Ctrl) to zoom with the scroll wheel.';
        clearTimeout(wheelHintT); wheelHintT = setTimeout(() => { help.textContent = HELP; }, 2200);
        return;
      }
      e.preventDefault();
      const f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0022));
      zoomAt(f, e.offsetX, e.offsetY);
    }, { passive: false });
    canvas.addEventListener('mousedown', () => canvas.focus({ preventScroll: true }));
    const HELP = $('#ex-help').textContent;

    // keyboard
    canvas.addEventListener('keydown', (e) => {
      const step = 60; let used = true;
      switch (e.key) {
        case 'ArrowLeft': state.tx += step; break;
        case 'ArrowRight': state.tx -= step; break;
        case 'ArrowUp': state.ty += step; break;
        case 'ArrowDown': state.ty -= step; break;
        case '+': case '=': zoomAt(1.5, state.W / 2, state.H / 2); return e.preventDefault();
        case '-': case '_': zoomAt(1 / 1.5, state.W / 2, state.H / 2); return e.preventDefault();
        case '0': reset(); return e.preventDefault();
        case 'Escape': state.sel = -1; showTip(-1); break;
        case 'Enter': if (state.sel >= 0) window.open(urlOf(P[state.sel]), '_blank', 'noopener'); break;
        default: used = false;
      }
      if (used) { e.preventDefault(); clampView(); afterView(); }
    });
    function reset() { state.sel = -1; state.hover = -1; showTip(-1); animateTo(1, 0, 0); }
    $('#ex-zin').addEventListener('click', () => zoomAt(1.6, state.W / 2, state.H / 2));
    $('#ex-zout').addEventListener('click', () => zoomAt(1 / 1.6, state.W / 2, state.H / 2));
    $('#ex-reset').addEventListener('click', reset);

    /* ---------- legend + filters ---------- */
    function legend() {
      const root = $('#ex-legend'); root.replaceChildren();
      const tt = h('div', { class: 'trk-toggles', role: 'group', 'aria-label': 'Tracks shown' });
      TRACKS.forEach((t) => {
        const cb = h('input', { type: 'checkbox' }); cb.checked = state.vis.has(t);
        cb.addEventListener('change', () => { if (cb.checked) state.vis.add(t); else state.vis.delete(t); if (state.sel >= 0 && !state.vis.has(P[state.sel].t)) { state.sel = -1; showTip(-1); } legend(); draw(); });
        tt.append(h('label', null, cb, h('img', { src: ctx.icon(t), alt: '', width: 22, height: 22 }),
          h('span', null, state.color === 'track' ? h('span', { class: 'sw', style: { background: TC[t] } }) : null, ctx.trackNames[t])));
      });
      root.append(h('h4', { text: 'Tracks', style: { marginTop: '0' } }), tt);
    }

    /* ---------- search ---------- */
    const q = $('#ex-q'), sugg = $('#ex-sugg'); q.disabled = false;
    const names = P.map((p, i) => ({ i, l: p.l.toLowerCase() }));
    let hits = [], cur = -1;
    function renderSugg(showEmpty) {
      sugg.replaceChildren();
      if (!hits.length) {
        if (showEmpty && q.value.trim()) { sugg.append(h('li', { class: 'muted', role: 'option', 'aria-disabled': 'true', style: { gridTemplateColumns: '1fr' }, text: 'No entity matches.' })); sugg.hidden = false; q.setAttribute('aria-expanded', 'true'); }
        else { sugg.hidden = true; q.setAttribute('aria-expanded', 'false'); }
        return;
      }
      hits.forEach((i, k) => {
        const p = P[i];
        const li = h('li', { role: 'option', id: 'ex-opt-' + k, 'aria-selected': k === cur ? 'true' : 'false' },
          h('img', { src: 'data:image/jpeg;base64,' + p.img, alt: '' }), h('span', { text: p.l }), h('span', { class: 'tt', text: ctx.trackNames[p.t] }));
        li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(k); });
        sugg.append(li);
      });
      sugg.hidden = false; q.setAttribute('aria-expanded', 'true');
      if (cur >= 0) q.setAttribute('aria-activedescendant', 'ex-opt-' + cur); else q.removeAttribute('aria-activedescendant');
    }
    function choose(k) {
      const i = hits[k]; if (i == null) return;
      q.value = P[i].l; hits = []; cur = -1; renderSugg();
      focusPoint(i);
    }
    q.addEventListener('input', () => {
      const v = q.value.trim().toLowerCase(); cur = -1;
      if (!v) { hits = []; renderSugg(); return; }
      const starts = [], has = [];
      for (const n of names) { const j = n.l.indexOf(v); if (j === 0) starts.push(n.i); else if (j > 0) has.push(n.i); if (starts.length >= 8) break; }
      hits = starts.concat(has).slice(0, 8); renderSugg(true);
    });
    q.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); cur = (cur + 1) % hits.length; renderSugg(); }
      else if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); cur = (cur - 1 + hits.length) % hits.length; renderSugg(); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(cur >= 0 ? cur : 0); }
      else if (e.key === 'Escape') { hits = []; renderSugg(); }
    });
    q.addEventListener('blur', () => setTimeout(() => { hits = []; cur = -1; renderSugg(); }, 120));

    new ResizeObserver(() => fit()).observe(wrap);
    legend(); fit();
    // expose for scripted checks
    window.__agriExplorer = { focusByLabel: (l) => { const i = P.findIndex((p) => p.l === l); if (i >= 0) focusPoint(i); return i; }, state: () => ({ k: state.k, sel: state.sel, color: state.color, vis: [...state.vis], bin: state.bin }) };
  }

  window.AgriExplorer = { init };
  if (window.__agriExplorerCtx) init(window.__agriExplorerCtx);
})();
