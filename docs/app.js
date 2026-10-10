/* AgriTaxon project page (final: variant B's content and interactions, variant C's typography and rules).
   Every number shown is read from shared/data/*.json; nothing numeric is hard-coded here. */
(() => {
  'use strict';

  const S = 'shared/';
  const TRACKS = ['crop', 'livestock', 'pest', 'weed'];
  let TRACK_NAME = { crop: 'Crops', livestock: 'Livestock', pest: 'Pests', weed: 'Weeds' };
  const ICON = (t) => `assets/icons/icon_${t}.webp`;
  // downscaled copies of the provider logos; any logo not in this set is read from shared/ directly
  const SMALL_LOGOS = new Set(['anthropic.png', 'deepseek.png', 'gemini.png', 'Kimi-logo-2025.png', 'openai.png',
    'Qwen-Ai-Logo-PNG-Vector.png', 'seed-logo.png', 'zai.png']);
  const logoSrc = (f) => (SMALL_LOGOS.has(f) ? 'assets/logo/' + f : S + 'img/logo/' + f);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HARD_NOTE = 'Evaluated after AgriTaxon-Hard had been selected against the other 14 models';

  /* ---------------- helpers ---------------- */
  const $ = (q, r = document) => r.querySelector(q);
  const $$ = (q, r = document) => Array.from(r.querySelectorAll(q));
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      e.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return e;
  }
  const NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, ...kids) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'text') e.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return e;
  }
  const f1 = (v) => (v == null ? '–' : Number(v).toFixed(1));
  const f2 = (v) => Number(v).toFixed(2);
  const fint = (v) => Number(v).toLocaleString('en-US');
  const fpv = (v) => (Number.isInteger(+v) ? fint(v) : (+v).toLocaleString('en-US', { maximumFractionDigits: 1 }));
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // images below the fold get their src only when they come near the viewport
  const lazyIO = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const im = e.target; if (im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; }
    lazyIO.unobserve(im);
  }), { rootMargin: '400px 0px' }) : null;
  function lazy(img, src) { if (!lazyIO) img.src = src; else { img.dataset.src = src; lazyIO.observe(img); } return img; }
  const by = (f, dir = 1) => (a, b) => { const x = f(a), y = f(b); return x < y ? -dir : x > y ? dir : 0; };
  const maxBy = (arr, f) => arr.reduce((m, r) => (f(r) > f(m) ? r : m), arr[0]);
  const minBy = (arr, f) => arr.reduce((m, r) => (f(r) < f(m) ? r : m), arr[0]);
  function onResize(el, fn) {
    let w = -1, raf = 0;
    const ro = new ResizeObserver((es) => {
      const nw = Math.round(es[0].contentRect.width);
      if (nw === w || nw <= 0) return;
      w = nw; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => fn(nw));
    });
    ro.observe(el);
  }
  function radioGroup(root, attr, onChange) {
    const btns = $$('[role="radio"]', root);
    const set = (val, focus) => {
      btns.forEach((b) => {
        const on = b.dataset[attr] === val;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        if (on && focus) b.focus();
      });
    };
    btns.forEach((b) => {
      b.addEventListener('click', () => {
        if (b.getAttribute('aria-disabled') === 'true') return;
        set(b.dataset[attr]); onChange(b.dataset[attr]);
      });
      b.addEventListener('keydown', (e) => {
        if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        const enabled = btns.filter((x) => x.getAttribute('aria-disabled') !== 'true');
        let i = enabled.indexOf(b);
        if (e.key === 'Home') i = 0; else if (e.key === 'End') i = enabled.length - 1;
        else i = (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length;
        const nb = enabled[i]; set(nb.dataset[attr], true); onChange(nb.dataset[attr]);
      });
    });
    const cur = btns.find((b) => b.getAttribute('aria-checked') === 'true');
    btns.forEach((b) => { b.tabIndex = b === cur ? 0 : -1; });
    return { set, btns };
  }
  function tabList(root, onChange) {
    const tabs = $$('[role="tab"]', root);
    const select = (t, focus) => {
      tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; });
      if (focus) t.focus();
      onChange(t);
    };
    tabs.forEach((t) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        let i = tabs.indexOf(t);
        if (e.key === 'ArrowRight') i = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') i = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') i = 0;
        else if (e.key === 'End') i = tabs.length - 1;
        else return;
        e.preventDefault(); select(tabs[i], true);
      });
    });
    return { select, tabs };
  }

  /* ---------------- tooltip ---------------- */
  const tipEl = $('#tip');
  const tip = {
    show(anchor, build) {
      tipEl.replaceChildren(...[].concat(build()));
      tipEl.hidden = false;
      let x, y;
      if (anchor && anchor.clientX != null && anchor.pointerType !== 'touch') { x = anchor.clientX; y = anchor.clientY; }
      else {
        const el = anchor && anchor.currentTarget ? anchor.currentTarget : anchor && anchor.target ? anchor.target : anchor;
        const r = el.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top;
      }
      const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
      let left = x + 14, top = y - th - 12;
      if (left + tw > window.innerWidth - 8) left = x - tw - 14;
      if (left < 8) left = 8;
      if (top < 8) top = y + 18;
      tipEl.style.left = left + 'px'; tipEl.style.top = top + 'px';
    },
    hide() { tipEl.hidden = true; },
  };
  const tipRow = (color, label, value) => h('div', { class: 'tr' }, h('i', { style: { background: color } }), h('span', { text: label }), h('b', { text: value }));
  window.addEventListener('scroll', () => tip.hide(), { passive: true });
  function hoverable(el, build) {
    el.addEventListener('pointerenter', (e) => tip.show(e, build));
    el.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') tip.show(e, build); });
    el.addEventListener('pointerleave', () => tip.hide());
    el.addEventListener('focus', () => tip.show(el, build));
    el.addEventListener('blur', () => tip.hide());
  }

  /* ---------------- copy buttons ---------------- */
  function wireCopy() {
    $$('.copy').forEach((b) => b.addEventListener('click', async () => {
      const txt = $('#' + b.dataset.copy).textContent;
      let ok = false;
      try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) {
        const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } }); ta.value = txt; document.body.append(ta); ta.select();
        try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } ta.remove();
      }
      const old = b.dataset.label || b.textContent; b.dataset.label = old;
      b.textContent = ok ? 'Copied' : 'Press Ctrl+C'; b.classList.toggle('done', ok);
      setTimeout(() => { b.textContent = old; b.classList.remove('done'); }, 1600);
    }));
  }

  /* =========================================================
     data
     ========================================================= */
  async function loadJSON(name) {
    const r = await fetch(S + 'data/' + name);
    if (!r.ok) throw new Error(name + ': HTTP ' + r.status);
    return r.json();
  }

  async function main() {
    let C, L, E, W;
    try {
      [C, L, E, W] = await Promise.all(['content.json', 'leaderboard.json', 'examples.json', 'wild_examples.json'].map(loadJSON));
    } catch (err) {
      console.error(err);
      $('#thesis').textContent = 'The data files could not be loaded. Serve this folder over HTTP (for example python3 -m http.server) and reload.';
      return;
    }
    C.tracks.forEach((t) => { TRACK_NAME[t.id] = t.name; });
    const ctx = { C, L, E, W, rows: L.rows.slice() };
    const run = (name, fn) => { try { fn(ctx); } catch (e) { console.error('[' + name + ']', e); } };
    $$('img[data-src]').forEach((im) => lazy(im, im.dataset.src));
    run('text', bindText);
    run('hero', hero);
    run('leaderboard', leaderboard);
    run('items', items);
    run('findings', findings);
    run('glance', glance);
    run('use', use);
    run('nav', scrollspy);
    wireCopy();
    const ex = { content: C, trackNames: TRACK_NAME, nModels: E.models.length, icon: ICON };
    if (window.AgriExplorer) window.AgriExplorer.init(ex); else window.__agriExplorerCtx = ex;
    document.documentElement.classList.add('ready');
  }

  /* ---------------- text binding, links ---------------- */
  function bindText({ C }) {
    $$('[data-bind]').forEach((e) => { const v = get(C, e.dataset.bind); if (v != null) e.textContent = v; });
    $$('[data-link]').forEach((a) => {
      const url = C.links[a.dataset.link];
      if (url) a.href = url; else a.hidden = true;
    });
    const pb = $('#paper-btn');
    if (C.links.paper) {
      const a = h('a', { class: 'btn', href: C.links.paper, target: '_blank', rel: 'noopener' }, 'Paper');
      pb.replaceWith(a);
    }
    // thesis with the gap phrase marked
    const th = $('#thesis'); const phrase = 'seeing-without-naming gap';
    const i = C.thesis.indexOf(phrase);
    if (i >= 0) th.append(C.thesis.slice(0, i), h('mark', { text: phrase }), C.thesis.slice(i + phrase.length));
    else th.textContent = C.thesis;
    // authors
    const au = $('#authors');
    const names = h('p');
    C.authors.forEach((a, k) => {
      names.append(h('span', { class: 'au' }, h('span', { class: 'who' }, a.name), h('sup', { text: a.aff.join(',') + (a.corresponding ? '*' : '') })));
      if (k < C.authors.length - 1) names.append(', ');
    });
    const affs = h('ol');
    Object.keys(C.affiliations).sort((a, b) => a - b).forEach((k) => affs.append(h('li', { value: k, text: C.affiliations[k] })));
    au.append(names, h('details', null, h('summary', null, 'Affiliations'), affs, h('p', { class: 'small', text: '* Corresponding author' })));
  }

  /* =========================================================
     hero: dumbbell
     ========================================================= */
  function hero(ctx) {
    const { rows } = ctx;
    const root = $('#db');
    const ticks = [0, 25, 50, 75, 100];
    const mkAxis = () => h('div', { class: 'db-axis', 'aria-hidden': 'true' }, h('span', { class: 'nm' }),
      h('div', { class: 'ticks' }, ticks.map((v) => h('span', { style: { left: v + '%' }, text: v }))), h('span', { class: 'gap-h', text: 'Gap' }));
    const body = h('div', { style: { position: 'relative' } });
    const grid = h('div', { class: 'db-grid', 'aria-hidden': 'true' }, ticks.map((v) => h('i', { style: { left: v + '%' } })));
    const list = h('ol', { class: 'db-list', 'aria-label': 'MC accuracy and OE-Acc of each model' });
    body.append(grid, list);
    root.append(body, mkAxis());

    const bestOE = maxBy(rows, (r) => r.oe_acc);
    const items = new Map();
    rows.forEach((r) => {
      const plot = h('span', { class: 'db-plot' });
      const line = h('span', { class: 'db-line' });
      const dOE = h('span', { class: 'db-dot oe' });
      const dMC = h('span', { class: 'db-dot mc' });
      const vOE = h('span', { class: 'db-val oe', text: f1(r.oe_acc) });
      const vMC = h('span', { class: 'db-val mc', text: f1(r.mc.all) });
      plot.append(line, dOE, dMC, vOE, vMC);
      const btn = h('button', {
        type: 'button', class: 'db-row' + (r === bestOE ? ' on' : ''),
        'aria-label': `${r.model}: MC accuracy ${f1(r.mc.all)}, OE-Acc ${f1(r.oe_acc)}, gap ${f1(r.gap)} points. Show in the leaderboard.`,
      },
      h('span', { class: 'db-name' }, h('img', { class: 'logo', src: logoSrc(r.logo), alt: '', width: 16, height: 16 }), h('span', { text: r.model })),
      plot, h('span', { class: 'db-gap', text: f1(r.gap) }));
      btn.addEventListener('click', () => jumpToModel(r.model));
      const li = h('li', null, btn);
      items.set(r.model, { li, btn, r, line, dOE, vOE });
      // position: MC fixed, OE starts at MC and moves to its value (the gap opens)
      dMC.style.left = r.mc.all + '%'; vMC.style.left = r.mc.all + '%';
      const place = (v) => { dOE.style.left = v + '%'; vOE.style.left = v + '%'; line.style.left = v + '%'; line.style.width = (r.mc.all - v) + '%'; };
      place(reduceMotion ? r.oe_acc : r.mc.all);
      items.get(r.model).place = place;
    });
    let sortKey = 'oe_acc';
    const keyFn = { oe_acc: (r) => r.oe_acc, gap: (r) => r.gap };
    function order(animate) {
      const sorted = rows.slice().sort((a, b) => keyFn[sortKey](b) - keyFn[sortKey](a) || b.oe_acc - a.oe_acc);
      const first = new Map();
      if (animate && !reduceMotion) items.forEach((it, k) => first.set(k, it.li.getBoundingClientRect().top));
      sorted.forEach((r) => list.append(items.get(r.model).li));
      if (animate && !reduceMotion) {
        items.forEach((it, k) => {
          const d = first.get(k) - it.li.getBoundingClientRect().top;
          if (!d) return;
          it.btn.style.transition = 'none'; it.btn.style.transform = `translateY(${d}px)`;
          requestAnimationFrame(() => requestAnimationFrame(() => { it.btn.style.transition = ''; it.btn.style.transform = ''; }));
        });
      }
    }
    order(false);
    if (!reduceMotion) {
      const go = () => items.forEach((it, k) => setTimeout(() => it.place(it.r.oe_acc), 0));
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(go, 250)));
    }
    radioGroup($('#db-sort'), 'sort', (v) => { sortKey = v; order(true); });
  }

  /* =========================================================
     leaderboard
     ========================================================= */
  const METRIC_NAME = { mc: 'MC accuracy', oe_em: 'OE-EM', oe_acc: 'OE-Acc', gap: 'Gap' };
  let lbApi = null;
  function jumpToModel(model) {
    if (!lbApi) return;
    lbApi.showModel(model);
  }

  function leaderboard(ctx) {
    const { C, rows } = ctx;
    const st = { setting: 'main', sort: { main: { key: 'oe_acc', dir: -1 }, hard: { key: 'hard_mc', dir: -1 } } };
    const hn = C.headline_numbers;
    const desc = {
      main: `${fint(C.settings.main.entities)} entities, one Wiki image each`,
      hard: `${fint(C.settings.hard.entities)} entities that nearly every model fails`,
      wild: `${fint(C.settings.wild.entities)} entities, ${Math.round(hn.wild_images / hn.wild_entities)} field images each`,
    };
    $$('[data-desc]').forEach((e) => { e.textContent = desc[e.dataset.desc]; });
    const tabs = tabList($('#lb-tabs'), (t) => {
      st.setting = t.dataset.setting;
      $('#lb-panel').setAttribute('aria-labelledby', t.id);
      render();
    });

    const COLS = {
      main() {
        const cols = [
          { key: 'model', label: 'Model', cls: 'mcell l', sv: (r) => r.model, text: true },
          { key: 'release', label: 'Release', cls: 'l', sv: (r) => r.release, text: true },
        ];
        TRACKS.forEach((t) => cols.push({ key: 'mc_' + t, group: 'mc', label: TRACK_NAME[t], icon: t, sv: (r) => r.mc[t] }));
        cols.push({ key: 'mc_all', group: 'mc', label: 'All', sv: (r) => r.mc.all });
        TRACKS.forEach((t) => cols.push({ key: 'oe_em_' + t, group: 'oe', label: TRACK_NAME[t], icon: t, sv: (r) => r.oe_em[t] }));
        cols.push({ key: 'oe_em_all', group: 'oe', label: 'All', sv: (r) => r.oe_em.all });
        cols.push({ key: 'oe_acc', group: 'acc', label: 'All', sv: (r) => r.oe_acc });
        cols.push({ key: 'gap', group: 'gap', label: 'MC − OE-Acc', sv: (r) => r.gap, cls: 'gapcol' });
        return cols;
      },
      hard() {
        return [
          { key: 'model', label: 'Model', cls: 'mcell l', sv: (r) => r.model, text: true },
          { key: 'release', label: 'Release', cls: 'l', sv: (r) => r.release, text: true },
          { key: 'hard_mc', label: 'MC accuracy', sv: (r) => r.hard_mc },
        ];
      },
    };
    const GROUP = { mc: 'Multiple-choice Accuracy', oe: 'Open-ended Exact Match', acc: 'Open-ended Accuracy', gap: 'Gap' };
    // the gap drawn as in the first-screen chart: the naming dot, the line, the selection dot
    const gapIcon = () => s('svg', { class: 'gapicon', viewBox: '0 0 30 12', width: 30, height: 12, 'aria-hidden': 'true' },
      s('line', { x1: 6, x2: 15, y1: 6, y2: 6, stroke: css('--oe-l'), 'stroke-width': 3 }), s('line', { x1: 15, x2: 24, y1: 6, y2: 6, stroke: css('--mc-l'), 'stroke-width': 3 }),
      s('circle', { cx: 5, cy: 6, r: 4, fill: css('--oe') }), s('circle', { cx: 25, cy: 6, r: 4, fill: css('--mc') }));
    const colName = (c) => (c.group ? (c.label === 'All' ? GROUP[c.group] : `${GROUP[c.group]} · ${c.label}`) : c.label);

    function rankRows(list, col, dir) {
      const valid = list.filter((r) => col.sv(r) != null);
      const nulls = list.filter((r) => col.sv(r) == null);
      valid.sort((a, b) => {
        const x = col.sv(a), y = col.sv(b);
        if (x === y) return b.oe_acc - a.oe_acc || (a.model < b.model ? -1 : 1);
        return (x < y ? -1 : 1) * dir;
      });
      let prev, rank = 0;
      valid.forEach((r, i) => { const v = col.sv(r); if (v !== prev) rank = i + 1; prev = v; r._rank = col.text ? null : rank; });
      nulls.forEach((r) => { r._rank = null; });
      return valid.concat(nulls);
    }
    function headerCell(col, sortState) {
      const sorted = sortState.key === col.key;
      const attrs = { scope: 'col', class: col.cls || '' };
      if (sorted) attrs['aria-sort'] = sortState.dir < 0 ? 'descending' : 'ascending';
      const inner = [];
      if (col.icon) inner.push(h('img', { class: 'ticon', src: ICON(col.icon), alt: '', width: 16, height: 16, loading: 'lazy' }));
      inner.push(col.label);
      const b = h('button', { type: 'button', 'aria-label': `Rank by ${colName(col)}` }, ...inner,
        h('span', { class: 'arr', 'aria-hidden': 'true', text: sorted ? (sortState.dir < 0 ? '▼' : '▲') : '' }));
      b.addEventListener('click', () => {
        const cur = st.sort[st.setting];
        if (cur.key === col.key) cur.dir = -cur.dir;
        else { cur.key = col.key; cur.dir = col.text ? 1 : -1; }
        render(true);
      });
      return h('th', attrs, b);
    }
    function modelCell(r, name, extra) {
      return h('td', { class: 'mcell' }, h('span', { class: 'mbtn' },
        h('span', { class: 'rk' + (r && r._rank === 1 ? ' top' : ''), text: r && r._rank != null ? r._rank : '' }),
        r ? h('img', { class: 'logo', src: logoSrc(r.logo), alt: '', width: 16, height: 16, loading: 'lazy' }) : null,
        h('span', null, h('span', { class: 'mname', text: name }), extra)));
    }
    const provLine = (r) => h('span', { class: 'mprov' }, r.provider,
      h('span', { class: 'wbadge ' + (r.open_weights ? 'open' : 'prop'), text: r.open_weights ? 'Open weights' : 'Proprietary' }));

    function render(focusSorted) {
      const table = $('#lb-table'); table.replaceChildren();
      const notes = $('#lb-notes'); notes.replaceChildren();
      const ctxLine = $('#lb-context'); ctxLine.replaceChildren();
      if (st.setting === 'wild') { renderWild(table); return; }
      const cols = COLS[st.setting]();
      const sortState = st.sort[st.setting];
      const sortCol = cols.find((c) => c.key === sortState.key);
      const list = rankRows(rows, sortCol, sortState.dir);
      const vis = cols.slice();
      // on narrow screens the ranking column sits next to the (sticky) model column
      const sc = $('#lb-scroll');
      if (st.setting === 'main' && sc && sc.clientWidth && sc.clientWidth < 720 && !sortCol.text) {
        vis.splice(vis.indexOf(sortCol), 1); vis.splice(1, 0, sortCol);
        vis.push(vis.splice(vis.findIndex((c) => c.key === 'release'), 1)[0]);
      }
      const thead = h('thead');
      if (st.setting === 'main') {
        const grp = h('tr', { class: 'grp' });
        let i = 0;
        while (i < vis.length) {
          const g = vis[i].group; let n = 1;
          while (i + n < vis.length && g && vis[i + n].group === g) n++;
          const gcls = { mc: 'g g-mc', oe: 'g g-oe', acc: 'g g-oe g-acc', gap: 'g g-gap' }[g] || (i === 0 ? 'mcell' : '');
          const glabel = g === 'gap' ? h('span', { class: 'gaplbl' }, gapIcon(), GROUP[g])
            : g === 'acc' ? h('span', null, GROUP[g], h('small', { class: 'gnote', text: 'LLM judge' })) : (g ? GROUP[g] : '');
          grp.append(h('th', { colspan: n, class: gcls, scope: g ? 'colgroup' : null }, glabel));
          i += n;
        }
        thead.append(grp);
      }
      thead.append(h('tr', null, vis.map((c) => headerCell(c, sortState))));
      table.append(h('caption', { class: 'sr-only' }, `${C.settings[st.setting].name} leaderboard, ranked by ${colName(sortCol)}`), thead);
      const tb = h('tbody');
      list.forEach((r) => {
        const tr = h('tr', { 'data-model': r.model });
        vis.forEach((c) => {
          if (c.key === 'model') tr.append(modelCell(r, r.model, provLine(r)));
          else if (c.key === 'release') tr.append(h('td', { class: 'l rcell', text: r.release }));
          else {
            const v = c.sv(r);
            const cls = [r.best && r.best.includes(c.key) ? 'best' : '', c.key === sortState.key ? 'sorted' : '', c.cls || ''].join(' ').trim();
            tr.append(v == null
              ? h('td', { class: cls + ' na' }, '–', h('sup', { 'aria-hidden': 'true', text: '†' }), h('span', { class: 'sr-only', text: ' (' + HARD_NOTE + ')' }))
              : h('td', { class: cls }, f1(v)));
          }
        });
        tb.append(tr);
      });
      table.append(tb);
      if (st.setting === 'main') {
        notes.append(h('div', null, 'Scores in %; the metrics are defined under ', h('a', { href: '#protocol' }, 'Protocol'), '. ', C.protocol.aggregation, ' ', h('b', null, 'Bold'), ': best value in the paper\'s table.'));
      } else {
        ctxLine.append(`MC accuracy on the ${fint(C.settings.hard.entities)} entities of ${C.settings.hard.name}: ${C.settings.hard.selection.toLowerCase()}. `, h('a', { href: '#f-tools' }, 'Tools on this setting'));
        if (list.some((r) => r.hard_mc == null)) notes.append(h('div', null, h('sup', { text: '†' }), ' ', HARD_NOTE, '.'));
      }
      if (focusSorted) { const b = table.querySelector('th[aria-sort] button'); if (b) b.focus(); }
    }

    function renderWild(table) {
      $('#lb-context').append(C.wild_results.caption, ' ', h('a', { href: '#f-wild' }, 'Field images vs the Wiki image'));
      const lead = new Map(rows.map((r) => [r.model, r]));
      table.append(h('caption', { class: 'sr-only' }, C.wild_results.caption),
        h('thead', null, h('tr', null, h('th', { scope: 'col', class: 'mcell' }, 'Model'), h('th', { scope: 'col', class: 'l' }, 'Images'),
          ['MC accuracy', 'OE-EM', 'OE-Acc'].map((x) => h('th', { scope: 'col' }, x)))));
      const tb = h('tbody'); let last = null;
      C.wild_results.rows.forEach((w) => {
        const first = w.model !== last; last = w.model;
        const isWiki = !/^K\s*=/.test(w.images);
        const lr = lead.get(w.model);
        const tr = h('tr', { class: first && tb.children.length ? 'wild-first' : '' });
        tr.append(first ? modelCell(lr ? { ...lr, _rank: null } : null, w.model, lr ? h('span', { class: 'mprov', text: lr.provider }) : null) : h('td', { class: 'mcell' }));
        tr.append(h('td', { class: 'l' }, h('span', { class: 'imgtag' }, h('i', { class: isWiki ? 'wiki' : 'field' }),
          isWiki ? w.images : `${w.images.replace(/^K\s*=\s*/, '')} field image${/=\s*1$/.test(w.images) ? '' : 's'}`)));
        [w.mc, w.oe_em, w.oe_acc].forEach((v) => tr.append(h('td', null, f1(v))));
        tb.append(tr);
      });
      table.append(tb);
    }

    render();
    let wasNarrow = $('#lb-scroll').clientWidth < 720;
    new ResizeObserver(() => {
      const n = $('#lb-scroll').clientWidth < 720;
      if (n !== wasNarrow) { wasNarrow = n; if (st.setting === 'main') render(); }
    }).observe($('#lb-scroll'));
    lbApi = {
      showModel(model) {
        if (st.setting !== 'main') tabs.select(tabs.tabs[0]);
        const tr = $(`#lb-table tr[data-model="${CSS.escape(model)}"]`);
        if (!tr) return;
        tr.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        tr.classList.remove('flash'); void tr.offsetWidth; tr.classList.add('flash');
      },
    };

    // submit
    const mail = (C.links.contact || '').replace(/^mailto:/, '');
    const hfId = C.links.dataset.replace(/^https?:\/\/huggingface\.co\/datasets\//, '');
    $('#submit-steps').append(
      h('li', null, 'Get the entities and Wiki images from Hugging Face (', h('code', { text: hfId }), ').'),
      h('li', null, 'Run both settings on every entity: ', h('b', { class: 't-mc' }, 'multiple-choice selection'), ' (one option letter, A–D) and ', h('b', { class: 't-oe' }, 'open-ended naming'), ' (the name, no options).'),
      h('li', null, 'Email the predictions to ', h('a', { href: C.links.contact + '?subject=' + encodeURIComponent('AgriTaxon leaderboard submission'), text: mail }), '; the model is then added to this leaderboard.'));
  }

  /* =========================================================
     items: one entity, two settings
     ========================================================= */
  const CHECK = () => s('svg', { viewBox: '0 0 12 12', 'aria-hidden': 'true' }, s('path', { d: 'M2.5 6.3 5 8.6l4.6-5.2' }));
  const CROSS = () => s('svg', { viewBox: '0 0 12 12', 'aria-hidden': 'true' }, s('path', { d: 'M3.2 3.2l5.6 5.6M8.8 3.2 3.2 8.8' }));

  function items(ctx) {
    const { C, E } = ctx;

    const models = E.models;
    const nM = models.length;
    const byTrack = {};
    TRACKS.forEach((t) => { byTrack[t] = E.items.filter((it) => it.track === t); });
    // default: the item with the widest gap between selecting and naming (ties: more pageviews)
    const best = E.items.slice().sort((a, b) => (b.models_selecting - b.models_naming) - (a.models_selecting - a.models_naming) || b.monthly_pageviews - a.monthly_pageviews)[0];
    const st = { track: best.track, item: best, quiz: false, guess: null, typed: '', stage: 0 };

    $('#insp-hint').textContent = `Each card: models selecting the label (blue) and naming it, aliases credited (red), of ${nM}. Pick an item to see every model's answer.`;
    const tabsRoot = $('#insp-tracks');
    TRACKS.forEach((t) => tabsRoot.append(h('button', { type: 'button', role: 'tab', 'data-track': t, 'aria-selected': t === st.track ? 'true' : 'false', 'aria-controls': 'insp-grid' },
      h('img', { src: ICON(t), alt: '', width: 22, height: 22 }), TRACK_NAME[t])));
    tabList(tabsRoot, (t) => { st.track = t.dataset.track; if (st.item.track !== st.track) select(byTrack[st.track][0], false); renderGrid(); });

    function renderGrid() {
      const g = $('#insp-grid'); g.replaceChildren();
      byTrack[st.track].forEach((it) => {
        const on = it === st.item;
        const nameEl = st.quiz && on && st.stage < 2 ? h('span', { class: 'nm hidden-name', text: 'Which entity?' }) : h('span', { class: 'nm', text: it.label });
        const b = h('button', { type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': `${st.quiz && on && st.stage < 2 ? 'Current quiz item' : it.label}: ${it.models_selecting} of ${nM} models select it, ${it.models_naming} name it` },
          lazy(h('img', { class: 'th', alt: '', decoding: 'async' }), S + it.image),
          it.hard ? h('span', { class: 'badge badge-hard', text: 'Hard' }) : null,
          h('span', { class: 'cap' }, nameEl,
            h('span', { class: 'meter', 'aria-hidden': 'true' },
              h('span', { class: 'm s' }, h('span', { class: 'b' }, h('i', { style: { width: (100 * it.models_selecting / nM) + '%' } })), h('span', { text: `${it.models_selecting}/${nM}` })),
              h('span', { class: 'm n' }, h('span', { class: 'b' }, h('i', { style: { width: (100 * it.models_naming / nM) + '%' } })), h('span', { text: `${it.models_naming}/${nM}` })))));
        b.addEventListener('click', () => select(it, true));
        g.append(h('li', null, b));
      });
    }
    function select(it, scroll) {
      st.item = it; st.guess = null; st.typed = ''; st.stage = st.quiz ? 0 : 2;
      renderGrid(); renderMain();
      if (scroll && window.innerWidth < 980) $('#insp-main').scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    function step(d) {
      const list = byTrack[st.track]; const i = list.indexOf(st.item);
      select(list[(i + d + list.length) % list.length], false);
    }

    function renderMain() {
      const it = st.item; const root = $('#insp-main'); root.replaceChildren();
      const hidden = st.quiz && st.stage < 2;
      const P = it.predictions;
      // header: image + meta
      const kb = it.knowledge_base;
      const facts = h('dl', { class: 'im-facts' },
        h('dt', { text: 'Monthly pageviews' }), h('dd', { text: fpv(it.monthly_pageviews) }),
        h('dt', { text: 'Knowledge base' }), h('dd', null, kb.url && !hidden ? h('a', { href: kb.url, target: '_blank', rel: 'noopener' }, `${kb.name} · ${kb.id}`) : (hidden ? kb.name : `${kb.name} · ${kb.id}`)),
        hidden ? null : h('dt', { text: 'Links' }), hidden ? null : h('dd', null, h('a', { href: it.wikipedia, target: '_blank', rel: 'noopener' }, 'Wikipedia'), ' · ', h('a', { href: it.wikidata, target: '_blank', rel: 'noopener' }, it.qid)),
        h('dt', { class: 'k-mc', text: 'Select it (MC)' }), h('dd', { class: 'v-mc' }, h('b', { text: hidden ? '?' : String(it.models_selecting) }), ` of ${nM} models`),
        h('dt', { class: 'k-oe', text: 'Name it (OE-Acc)' }), h('dd', { class: 'v-oe' }, h('b', { text: hidden ? '?' : String(it.models_naming) }), ` of ${nM} models`));
      const meta = h('div', { class: 'im-meta' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' } },
          h('span', { class: 'im-track' }, h('img', { src: ICON(it.track), alt: '', width: 20, height: 20 }), TRACK_NAME[it.track], it.hard ? h('span', { class: 'badge badge-hard', text: 'In AgriTaxon-Hard' }) : null),
          h('span', { class: 'im-nav' },
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Previous item', onclick: () => step(-1) }, '‹'),
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Next item', onclick: () => step(1) }, '›'))),
        h('h3', { class: 'im-label' + (hidden ? ' concealed' : ''), text: hidden ? 'Which entity is this?' : it.label }),
        facts);
      const img = h('div', { class: 'im-img' }, lazy(h('img', { alt: hidden ? `Wiki image of a ${TRACK_NAME[it.track].toLowerCase()} entity (name hidden for the quiz)` : `Wiki image of ${it.label}`, width: it.image_size ? it.image_size[0] : null, height: it.image_size ? it.image_size[1] : null, decoding: 'async' }), S + it.image));
      root.append(h('div', { class: 'im-top' }, img, meta));

      // MC column
      const counts = { A: 0, B: 0, C: 0, D: 0 }; let other = 0;
      models.forEach((m) => { const c = P[m] && P[m].mc; if (c in counts) counts[c]++; else other++; });
      const opts = h('ul', { class: 'opts' });
      Object.keys(it.options).forEach((k) => {
        const ok = k === it.answer;
        if (st.quiz && st.stage === 1) {
          const b = h('button', { type: 'button', class: 'pick' }, it.options[k]);
          b.addEventListener('click', () => { st.guess = k; st.stage = 2; renderGrid(); renderMain(); $('#insp-main .quiz-res') && $('#insp-main .quiz-res').focus(); });
          opts.append(h('li', { class: 'opt' }, h('span', { class: 'k', text: k }), h('span', { class: 't' }, b)));
          return;
        }
        if (hidden) { opts.append(h('li', { class: 'opt' }, h('span', { class: 'k', text: k }), h('span', { class: 't' }, h('span', { class: 'nm muted', text: 'option hidden until you name it' })))); return; }
        opts.append(h('li', { class: 'opt' + (ok ? ' ok' : '') }, h('span', { class: 'k', text: k }),
          h('span', { class: 't' }, h('span', { class: 'nm' }, it.options[k], ok ? h('span', { class: 'sr-only', text: ' (label)' }) : null),
            h('span', { class: 'ob' }, h('span', { class: 'b', 'aria-hidden': 'true' }, h('i', { style: { width: (100 * counts[k] / nM) + '%' } })), h('span', { text: String(counts[k]) })))));
      });
      const mcCol = h('div', { class: 'im-col' }, h('h4', null, h('i', { style: { background: css('--mc') } }), 'Multiple-choice selection'),
        hidden ? null : h('p', { class: 'opt-h', text: `Four options; bars: how many of the ${nM} models chose each` }), opts,
        !hidden && other ? h('p', { class: 'small muted', style: { marginTop: '8px' }, text: `${other} model${other > 1 ? 's' : ''} returned no valid option letter.` }) : null,
        !hidden ? h('p', { class: 'small muted', style: { marginTop: '8px' }, text: 'Distractors: the three labels nearest to the answer by text embedding.' }) : null);

      // OE column
      const oeCol = h('div', { class: 'im-col' }, h('h4', null, h('i', { style: { background: css('--oe') } }), 'Open-ended naming: each model\'s answer'));
      if (hidden) {
        oeCol.append(h('p', { class: 'small muted', text: 'Hidden until you answer.' }));
      } else {
        const rank = (p) => (p.oe_em ? 0 : p.oe_ok ? 1 : 2);
        const order = models.slice().sort((a, b) => rank(P[a]) - rank(P[b]) || models.indexOf(a) - models.indexOf(b));
        const ul = h('ul', { class: 'preds' });
        order.forEach((m) => {
          const p = P[m]; const r = rank(p);
          const mk = h('span', { class: 'mk ' + ['em', 'al', 'no'][r], title: ['Exact match', 'Alias accepted by the judge', 'Not the label'][r] }, r < 2 ? CHECK() : CROSS(),
            h('span', { class: 'sr-only', text: ['exact match', 'alias accepted by the judge', 'wrong'][r] }));
          const txt = (p.oe == null || String(p.oe).trim() === '') ? h('span', { class: 'pv none', text: '(no answer)' }) : h('span', { class: 'pv', text: p.oe });
          ul.append(h('li', null, mk, h('span', { class: 'md', text: m, title: m }), txt));
        });
        oeCol.append(ul, h('div', { class: 'pkey' }, h('span', null, h('i', { class: 'mk em' }), 'exact match (OE-EM)'), h('span', null, h('i', { class: 'mk al' }), 'alias accepted by the judge'), h('span', null, h('i', { class: 'mk no' }), 'not the label')));
      }
      root.append(h('div', { class: 'im-cols' }, mcCol, oeCol));

      // quiz bar
      if (st.quiz && st.stage === 0) {
        const inp = h('input', { type: 'text', placeholder: 'Type a name (open-ended naming)', 'aria-label': 'Your name for this entity', autocomplete: 'off', spellcheck: 'false' });
        inp.value = st.typed;
        const go = () => { st.typed = inp.value.trim(); st.stage = 1; renderMain(); const f = $('#insp-main .pick'); if (f) f.focus(); };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        root.append(h('div', { class: 'quiz-bar' }, h('div', { class: 'quiz-in' }, h('b', { text: '1 · Name it:' }), inp,
          h('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: go }, 'Show the options'),
          h('button', { type: 'button', class: 'btn btn-sm', onclick: () => setQuiz(false) }, 'Exit'))));
        setTimeout(() => inp.focus({ preventScroll: true }), 0);
      } else if (st.quiz && st.stage === 1) {
        root.append(h('div', { class: 'quiz-bar' }, h('b', { text: '2 · Now choose among the four options above.' }), h('button', { type: 'button', class: 'btn btn-sm', onclick: () => setQuiz(false) }, 'Exit')));
      } else if (st.quiz && st.stage === 2) {
        const norm = (x) => x.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        const exact = st.typed && norm(st.typed) === norm(it.label);
        const res = h('div', { class: 'quiz-res', tabindex: '-1' },
          h('p', null, 'You selected ', h('b', { text: `${st.guess}` }), st.guess === it.answer ? ', the label' : `; the label is ${it.answer}`, `, as did ${it.models_selecting} of ${nM} models. `),
          h('p', null, st.typed ? ['You named it ', h('b', { text: `“${st.typed}”` }), exact ? ': an exact match.' : ': not an exact match. (The benchmark\'s LLM judge also credits aliases, which this page cannot check.)'] : 'You did not type a name.',
            ` ${it.models_naming} of ${nM} models named it.`),
          h('div', { class: 'cta-row', style: { marginTop: '8px' } },
            h('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: () => step(1) }, 'Next item'),
            h('button', { type: 'button', class: 'btn btn-sm', onclick: () => setQuiz(false) }, 'Exit the quiz')));
        root.append(res);
      } else {
        root.append(h('div', { class: 'quiz-bar' }, h('span', { class: 'muted', text: 'Can you do better than the models? Name the entity first, then choose.' }),
          h('button', { type: 'button', class: 'btn btn-sm', onclick: () => setQuiz(true) }, 'Try it yourself')));
      }
    }
    function setQuiz(on) { st.quiz = on; st.stage = on ? 0 : 2; st.guess = null; st.typed = ''; renderGrid(); renderMain(); }
    renderGrid(); renderMain();
  }

  /* =========================================================
     findings
     ========================================================= */
  function findings(ctx) {
    const { C } = ctx;
    const grid = $('#fgrid');
    const F = C.findings;
    const cards = [
      { id: 'f-gap', k: 'Selection vs naming', f: F[0], cls: 'wide', build: chartGap },
      { id: 'f-open', k: 'Open weights', f: F[1], cls: 'w5', build: chartOpen },
      { id: 'f-tracks', k: 'Tracks', f: F[2], cls: 'w7', build: chartTracks },
      { id: 'f-tail', k: 'Long tail', f: F[4], cls: 'w7', build: chartPop },
      { id: 'f-tools', k: 'AgriTaxon-Hard · tools', f: F[6], cls: 'w5', build: chartTools },
      { id: 'f-wild', k: 'AgriTaxon-Wild · field images', f: F[5], cls: 'wide', build: chartWild },
      { id: 'f-errors', k: 'Errors', f: F[3], cls: 'wide', build: chartErrors },
    ];
    cards.forEach((c) => {
      if (!c.f) return;
      const card = h('article', { class: 'card fcard ' + c.cls, id: c.id, 'aria-labelledby': c.id + '-t' },
        h('h3', { id: c.id + '-t', text: c.f.title }), h('p', { class: 'ftext', text: c.f.text }));
      grid.append(card);
      try { c.build(card, ctx); } catch (e) { console.error('[finding ' + c.id + ']', e); }
    });
  }

  // a chart body, redrawn on resize, with at most one caption line under it
  function chartShell(card, { legend, draw, note }) {
    if (legend) card.append(h('div', { class: 'fleg', 'aria-hidden': 'true' }, legend));
    const box = h('div', { class: 'fchart' });
    card.append(box);
    const foot = h('div', { class: 'ffoot' });
    if (note) foot.append(h('p', { class: 'small muted' }, note()));
    card.append(foot);
    let width = 0;
    const redraw = () => { if (width) { box.replaceChildren(); draw(box, width); } };
    onResize(box, (w) => { width = w; redraw(); });
    return { redraw, box };
  }
  function axisX(g, x, y0, y1, ticks, fmt = (v) => v) {
    ticks.forEach((t) => {
      g.append(s('line', { x1: x(t), x2: x(t), y1: y0, y2: y1, stroke: css('--track'), 'stroke-width': 1 }));
      g.append(s('text', { x: x(t), y: y1 + 14, 'text-anchor': 'middle', 'font-size': 11, fill: css('--muted'), class: 'num', text: fmt(t) }));
    });
  }
  function focusableMark(el, label, build) {
    el.setAttribute('tabindex', '0'); el.setAttribute('role', 'img'); el.setAttribute('aria-label', label);
    hoverable(el, build);
  }

  /* --- 1. decomposition of MC accuracy --- */
  function chartGap(card, { rows }) {
    const legend = [
      h('span', null, h('i', { style: { background: css('--oe') } }), 'Named exactly (OE-EM)'),
      h('span', null, h('i', { style: { background: css('--oe-l') } }), 'Alias credited by the judge'),
      h('span', null, h('i', { style: { background: css('--mc-l') } }), 'Selected but not named (gap)'),
      h('span', null, h('i', { style: { background: css('--track') } }), 'Not selected'),
    ];
    chartShell(card, {
      legend,
      draw(box, W) {
        const narrow = W < 560;
        const fs = narrow ? 10.5 : 12;
        const longest = Math.max(...rows.map((r) => r.model.length));
        const lw = Math.min(W * 0.42, longest * fs * 0.61 + 14), rw = 8, rh = narrow ? 24 : 26, top = 20;
        const sorted = rows.slice().sort((a, b) => b.mc.all - a.mc.all);
        const H = top + sorted.length * rh + 22;
        const x = (v) => lw + (W - lw - rw) * v / 100;
        const svg = s('svg', { width: W, height: H, role: 'group', 'aria-label': 'MC accuracy of each model split into exact naming, alias credit and the gap' });
        const g = s('g'); svg.append(g);
        box.append(svg); // attached first, so model labels can be measured and shortened to fit
        axisX(g, x, top - 2, H - 22, [0, 20, 40, 60, 80, 100]);
        sorted.forEach((r, i) => {
          const y = top + i * rh + 4; const bh = rh - 10;
          const row = s('g', { class: 'hrow' });
          const bg = s('rect', { x: 0, y: y - 4, width: W, height: rh, fill: 'transparent' });
          row.append(bg);
          const lab = s('text', { x: lw - 10, y: y + bh / 2 + 4, 'text-anchor': 'end', 'font-size': fs, fill: css('--ink'), class: 'num', text: r.model });
          row.append(lab);
          const segs = [[0, r.oe_em.all, css('--oe')], [r.oe_em.all, r.oe_acc, css('--oe-l')], [r.oe_acc, r.mc.all, css('--mc-l')], [r.mc.all, 100, css('--track')]];
          segs.forEach(([a, b, c], j) => {
            const x0 = x(a) + (j ? 1 : 0), x1 = x(b) - (j < 3 ? 1 : 0);
            if (x1 - x0 > 0.3) row.append(s('rect', { x: x0, y, width: x1 - x0, height: bh, rx: 2, fill: c }));
          });
          const hit = s('rect', { x: 0, y: y - 4, width: W, height: rh, fill: 'transparent' });
          row.append(hit);
          focusableMark(hit, `${r.model}: OE-EM ${f1(r.oe_em.all)}, OE-Acc ${f1(r.oe_acc)}, MC accuracy ${f1(r.mc.all)}, gap ${f1(r.gap)}`, () => [
            h('div', { class: 'tt', text: r.model }),
            tipRow(css('--mc'), 'MC accuracy', f1(r.mc.all)), tipRow(css('--oe'), 'OE-Acc', f1(r.oe_acc)), tipRow(css('--oe-l'), 'alias credit', '+' + f1(r.oe_acc - r.oe_em.all)),
            tipRow(css('--oe'), 'OE-EM', f1(r.oe_em.all)), tipRow(css('--mc-l'), 'gap', f1(r.gap))]);
          const on = () => bg.setAttribute('fill', '#F1F3F3'), off = () => bg.setAttribute('fill', 'transparent');
          hit.addEventListener('pointerenter', on); hit.addEventListener('pointerleave', off);
          hit.addEventListener('focus', on); hit.addEventListener('blur', off);
          g.append(row);
          // a model id longer than the label column is shortened with an ellipsis (the tooltip names it in full)
          let txt = r.model;
          while (txt.length > 4 && lab.getComputedTextLength() > lw - 12) { txt = txt.slice(0, -1); lab.textContent = txt + '…'; }
        });
      },
    });
  }

  /* --- 2. open weights vs proprietary --- */
  function chartOpen(card, { rows }) {
    const lanes = [{ k: 'mc', label: 'MC accuracy', v: (r) => r.mc.all, c: css('--mc') }, { k: 'oe', label: 'OE-Acc', v: (r) => r.oe_acc, c: css('--oe') }];
    let hl = null; let shellRef;
    const shell = chartShell(card, {
      legend: [h('span', null, h('i', { class: 'c', style: { background: css('--ink') } }), 'Proprietary'), h('span', null, h('i', { class: 'ring', style: { borderColor: css('--ink') } }), 'Open weights')],
      draw(box, W) {
        const top = 8, laneH = 72, H = top + lanes.length * laneH + 20;
        const x = (v) => 10 + (W - 20) * v / 100;
        const svg = s('svg', { width: W, height: H, role: 'group', 'aria-label': 'MC accuracy and OE-Acc of proprietary and open-weights models' });
        axisX(svg, x, top, H - 20, [0, 20, 40, 60, 80, 100]);
        const pos = new Map();
        lanes.forEach((ln, li) => {
          const yc = top + li * laneH + 42;
          svg.append(s('text', { x: 10, y: top + li * laneH + 14, 'font-size': 12, 'font-weight': 600, fill: css('--ink'), text: ln.label }));
          // dodge
          const placed = [];
          rows.slice().sort((a, b) => ln.v(a) - ln.v(b)).forEach((r) => {
            const px = x(ln.v(r)); let lvl = 0; const offs = [0, 9, -9, 18, -18];
            while (placed.some((p) => p.l === lvl && Math.abs(p.x - px) < 9) && lvl < offs.length - 1) lvl++;
            placed.push({ x: px, l: lvl });
            const py = yc + offs[lvl];
            pos.set(r.model + ln.k, [px, py]);
            const dimmed = hl && hl !== r.model;
            const c = s('circle', { cx: px, cy: py, r: hl === r.model ? 6 : 4.5, fill: r.open_weights ? '#fff' : ln.c, stroke: r.open_weights ? ln.c : '#fff', 'stroke-width': r.open_weights ? 2 : 1.5, opacity: dimmed ? 0.25 : 1 });
            svg.append(c);
            const hit = s('circle', { cx: px, cy: py, r: 10, fill: 'transparent' });
            svg.append(hit);
            focusableMark(hit, `${r.model} (${r.open_weights ? 'open weights' : 'proprietary'}): ${ln.label} ${f1(ln.v(r))}`, () => [
              h('div', { class: 'tt', text: r.model }), h('div', { class: 'tn', text: r.open_weights ? 'open weights' : 'proprietary' }),
              tipRow(css('--mc'), 'MC accuracy', f1(r.mc.all)), tipRow(css('--oe'), 'OE-Acc', f1(r.oe_acc))]);
            hit.addEventListener('pointerenter', () => { if (hl !== r.model) { hl = r.model; shellRef.redraw(); } });
            hit.addEventListener('focus', () => { if (hl !== r.model) { hl = r.model; } });
          });
        });
        svg.addEventListener('pointerleave', () => { if (hl) { hl = null; shellRef.redraw(); } });
        if (hl && pos.get(hl + 'mc')) {
          const [x1, y1] = pos.get(hl + 'mc'), [x2, y2] = pos.get(hl + 'oe');
          svg.insertBefore(s('line', { x1, y1, x2, y2, stroke: css('--muted'), 'stroke-width': 1 }), svg.firstChild.nextSibling);
        }
        box.append(svg);
      },
    });
    shellRef = shell;
  }

  /* --- 3. track difficulty --- */
  function chartTracks(card, { rows }) {
    const hl = '';
    let hover = null;
    const shell = chartShell(card, {
      legend: [h('span', null, h('i', { class: 'c', style: { background: css('--mc') } }), 'MC accuracy'), h('span', null, h('i', { class: 'c', style: { background: css('--oe') } }), 'OE-EM')],
      draw(box, W) {
        const narrow = W < 520;
        const lw = narrow ? 94 : 108, top = 6, laneH = 52, H = top + TRACKS.length * laneH + 22;
        const x = (v) => lw + (W - lw - 12) * v / 100;
        const svg = s('svg', { width: W, height: H, role: 'group', 'aria-label': 'MC accuracy and OE-EM of every model in each track' });
        axisX(svg, x, top, H - 22, [0, 25, 50, 75, 100]);
        const active = hover || hl;
        TRACKS.forEach((t, i) => {
          const y0 = top + i * laneH;
          if (i) svg.append(s('line', { x1: 0, x2: W, y1: y0, y2: y0, stroke: css('--rule-2') }));
          svg.append(s('image', { href: ICON(t), x: 0, y: y0 + 12, width: 26, height: 26 }));
          svg.append(s('text', { x: 32, y: y0 + 30, 'font-size': narrow ? 11.5 : 12.5, 'font-weight': 600, fill: css('--ink'), text: TRACK_NAME[t] }));
          [['mc', 18, css('--mc')], ['oe_em', 36, css('--oe')]].forEach(([k, dy, c]) => {
            const vals = rows.map((r) => r[k][t]);
            svg.append(s('line', { x1: x(Math.min(...vals)), x2: x(Math.max(...vals)), y1: y0 + dy, y2: y0 + dy, stroke: c, 'stroke-opacity': 0.25, 'stroke-width': 6, 'stroke-linecap': 'butt' }));
            rows.forEach((r) => {
              const on = active === r.model;
              const cx = x(r[k][t]);
              const dot = s('circle', { cx, cy: y0 + dy, r: on ? 6 : 3.6, fill: c, stroke: '#fff', 'stroke-width': on ? 2 : 1, opacity: active && !on ? 0.22 : 0.9 });
              svg.append(dot);
              if (on) svg.append(s('text', { x: cx, y: y0 + dy + (k === 'mc' ? -9 : 17), 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 600, fill: css('--ink'), class: 'num', text: f1(r[k][t]) }));
            });
          });
          // hit layer per lane: nearest model
          [['mc', 18], ['oe_em', 36]].forEach(([k, dy]) => {
            const hit = s('rect', { x: lw - 6, y: y0 + dy - 9, width: W - lw, height: 18, fill: 'transparent' });
            hit.addEventListener('pointermove', (e) => {
              const bx = svg.getBoundingClientRect().left; const px = e.clientX - bx;
              const r = minBy(rows, (rr) => Math.abs(x(rr[k][t]) - px));
              if (hover !== r.model) { hover = r.model; shell.redraw(); }
              tip.show(e, () => [h('div', { class: 'tt', text: r.model }), h('div', { class: 'tn', text: TRACK_NAME[t] }),
                tipRow(css('--mc'), 'MC accuracy', f1(r.mc[t])), tipRow(css('--oe'), 'OE-EM', f1(r.oe_em[t]))]);
            });
            hit.addEventListener('pointerleave', () => { tip.hide(); });
            svg.append(hit);
          });
        });
        svg.addEventListener('pointerleave', () => { if (hover) { hover = null; tip.hide(); shell.redraw(); } });
        box.append(svg);
      },
    });
  }

  /* --- 4. popularity / resolution --- */
  function chartPop(card, { C, E }) {
    const P = C.popularity; const nM = E.models.length;
    const panels = [
      { D: P.by_pageviews, title: 'Monthly Wikipedia pageviews', tip: 'Pageviews ' },
      { D: P.by_resolution_mp, title: 'Wiki image resolution (megapixels)', tip: 'Resolution (MP) ' },
    ];
    chartShell(card, {
      legend: [h('span', null, h('i', { style: { background: css('--mc') } }), 'Models selecting (MC)'), h('span', null, h('i', { style: { background: css('--oe') } }), 'Models naming (OE-Acc)')],
      draw(box, W) {
        const cols = W < 620 ? 1 : 2;
        const pw = (W - (cols - 1) * 28) / cols;
        const wrap = h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '16px 28px' } });
        panels.forEach(({ D, title, tip: tp }) => {
          const top = 18, bot = 56, ch = 190, H = top + ch + bot, lw = 26;
          const y = (v) => top + ch - ch * v / nM;
          const svg = s('svg', { width: pw, height: H, role: 'group', 'aria-label': 'Mean number of models selecting and naming entities, by ' + title.toLowerCase() });
          for (let t = 0; t <= nM; t += 5) {
            svg.append(s('line', { x1: lw, x2: pw, y1: y(t), y2: y(t), stroke: css('--track') }));
            svg.append(s('text', { x: lw - 6, y: y(t) + 4, 'text-anchor': 'end', 'font-size': 11, fill: css('--muted'), class: 'num', text: t }));
          }
          svg.append(s('text', { x: lw, y: 10, 'font-size': 11, fill: css('--muted'), text: `models of ${nM}` }));
          const band = (pw - lw) / D.length; const bw = Math.min(24, band * 0.3);
          D.forEach((d, i) => {
            const cx = lw + band * (i + 0.5);
            [['selecting', -1, css('--mc')], ['naming', 1, css('--oe')]].forEach(([k, side, c]) => {
              const x0 = cx + (side < 0 ? -bw - 1 : 1);
              const v = d[k];
              svg.append(s('path', { d: roundTop(x0, y(v), bw, y(0) - y(v), 2), fill: c }));
              svg.append(s('text', { x: side < 0 ? x0 + bw : x0, y: y(v) - 5, 'text-anchor': side < 0 ? 'end' : 'start', 'font-size': 10.5, 'font-weight': 600, fill: css('--ink'), class: 'num', text: f2(v) }));
            });
            svg.append(s('text', { x: cx, y: top + ch + 17, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 500, fill: css('--ink'), text: d.bin }));
            svg.append(s('text', { x: cx, y: top + ch + 31, 'text-anchor': 'middle', 'font-size': 10.5, fill: css('--muted'), class: 'num', text: 'n=' + fint(d.n) }));
            const hit = s('rect', { x: cx - band / 2, y: top, width: band, height: ch + 36, fill: 'transparent' });
            focusableMark(hit, `${tp}${d.bin}: ${fint(d.n)} entities; ${f2(d.selecting)} models select, ${f2(d.naming)} name`, () => [
              h('div', { class: 'tt', text: tp + d.bin }), h('div', { class: 'tn', text: fint(d.n) + ' entities' }),
              tipRow(css('--mc'), 'models selecting', f2(d.selecting)), tipRow(css('--oe'), 'models naming', f2(d.naming))]);
            svg.append(hit);
          });
          svg.append(s('text', { x: lw + (pw - lw) / 2, y: H - 4, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 500, fill: css('--muted'), text: title }));
          wrap.append(svg);
        });
        box.append(wrap);
      },
      note: () => P.resolution_note,
    });
  }
  function roundTop(x, y, w, hgt, r) {
    if (hgt <= 0) return '';
    r = Math.min(r, w / 2, hgt);
    return `M${x},${y + hgt}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hgt}Z`;
  }

  /* --- 5. tools on Hard --- */
  function chartTools(card, { C }) {
    const T = C.tool_results;
    const pairs = [];
    T.rows.forEach((r) => {
      const m = r.method.split(' w/ ');
      if (m.length === 2) { const base = T.rows.find((b) => b.method === m[0]); pairs.push({ base: m[0], tool: m[1], b: base ? base.mc : null, t: r.mc }); }
    });
    chartShell(card, {
      draw(box, W) {
        const maxV = Math.max(...pairs.map((p) => Math.max(p.b || 0, p.t)));
        const dom = Math.ceil(maxV / 10) * 10 + 0;
        const top = 6, rh = 76, H = top + pairs.length * rh + 22, lp = 8, rp = 16;
        const x = (v) => lp + (W - lp - rp) * v / dom;
        const svg = s('svg', { width: W, height: H, role: 'group', 'aria-label': 'MC accuracy on AgriTaxon-Hard with and without tools' });
        const ticks = []; for (let t = 0; t <= dom; t += dom > 40 ? 20 : 10) ticks.push(t);
        axisX(svg, x, top, H - 22, ticks);
        pairs.forEach((p, i) => {
          const y0 = top + i * rh;
          svg.append(s('text', { x: lp, y: y0 + 16, 'font-size': 12.5, 'font-weight': 600, fill: css('--ink'), class: 'num', text: p.base }));
          svg.append(s('text', { x: W - rp, y: y0 + 16, 'text-anchor': 'end', 'font-size': 12, fill: css('--muted'), text: '+ ' + p.tool }));
          const yc = y0 + 48;
          if (p.b != null) {
            svg.append(s('line', { x1: x(p.b) + 6, x2: x(p.t) - 9, y1: yc, y2: yc, stroke: css('--mc'), 'stroke-width': 2 }));
            svg.append(s('path', { d: `M${x(p.t) - 13},${yc - 4.5}L${x(p.t) - 7},${yc}L${x(p.t) - 13},${yc + 4.5}`, fill: 'none', stroke: css('--mc'), 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
            svg.append(s('circle', { cx: x(p.b), cy: yc, r: 5.5, fill: css('--mc-l'), stroke: '#fff', 'stroke-width': 2 }));
            svg.append(s('text', { x: x(p.b), y: yc + 19, 'text-anchor': 'middle', 'font-size': 11, fill: css('--muted'), class: 'num', text: f1(p.b) }));
            svg.append(s('text', { x: (x(p.b) + x(p.t)) / 2, y: yc - 8, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: css('--ink'), class: 'num', text: '+' + f1(p.t - p.b) }));
          }
          svg.append(s('circle', { cx: x(p.t), cy: yc, r: 6, fill: css('--mc'), stroke: '#fff', 'stroke-width': 2 }));
          svg.append(s('text', { x: x(p.t), y: yc + 19, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: css('--ink'), class: 'num', text: f1(p.t) }));
          const hit = s('rect', { x: 0, y: y0, width: W, height: rh, fill: 'transparent' });
          focusableMark(hit, `${p.base}: ${f1(p.b)} without tools, ${f1(p.t)} with ${p.tool}`, () => [h('div', { class: 'tt', text: p.base }),
            tipRow(css('--mc-l'), 'without tools', f1(p.b)), tipRow(css('--mc'), 'with ' + p.tool, f1(p.t))]);
          svg.append(hit);
        });
        box.append(svg);
      },
      note: () => `${T.caption} ${T.notes}`,
    });
  }

  /* --- 6. AgriTaxon-Wild --- */
  function chartWild(card, { C, W: WX }) {
    const R = C.wild_results.rows; const metric = 'oe_acc';
    const models = [...new Set(R.map((r) => r.model))];
    const kOf = (r) => { const m = /^K\s*=\s*(\d+)/.exec(r.images); return m ? +m[1] : null; };
    chartShell(card, {
      draw(box, Wd) {
        const cols = Wd < 620 ? 1 : models.length;
        const pw = (Wd - (cols - 1) * 24) / cols; const ph = 210;
        const wrap = h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '12px 24px' } });
        models.forEach((m) => {
          const rows = R.filter((r) => r.model === m);
          const wiki = rows.find((r) => kOf(r) == null); const field = rows.filter((r) => kOf(r) != null).sort((a, b) => kOf(a) - kOf(b));
          const top = 26, bot = 26, lw = 30, rp = 64;
          const vals = rows.map((r) => r[metric]);
          const lo = Math.max(0, Math.floor((Math.min(...vals) - 4) / 10) * 10), hi = Math.min(100, Math.ceil((Math.max(...vals) + 4) / 10) * 10);
          const y = (v) => top + (ph - top - bot) * (1 - (v - lo) / (hi - lo));
          const Ks = field.map(kOf); const kmin = Math.min(...Ks), kmax = Math.max(...Ks);
          const x = (k) => lw + 18 + (pw - lw - rp - 36) * (k - kmin) / Math.max(1, kmax - kmin);
          const svg = s('svg', { width: pw, height: ph, role: 'group', 'aria-label': `${m}: ${METRIC_NAME[metric]} with the Wiki image and with K field images` });
          svg.append(s('text', { x: 0, y: 13, 'font-size': 12.5, 'font-weight': 600, fill: css('--ink'), class: 'num', text: m }));
          const yt = []; for (let t = lo; t <= hi; t += 10) yt.push(t);
          yt.forEach((t) => {
            svg.append(s('line', { x1: lw, x2: pw - rp + 8, y1: y(t), y2: y(t), stroke: css('--track') }));
            svg.append(s('text', { x: lw - 6, y: y(t) + 4, 'text-anchor': 'end', 'font-size': 10.5, fill: css('--muted'), class: 'num', text: t }));
          });
          if (wiki) {
            const wv = wiki[metric];
            svg.append(s('line', { x1: lw, x2: pw - rp + 8, y1: y(wv), y2: y(wv), stroke: css('--at'), 'stroke-width': 2 }));
            svg.append(s('text', { x: pw - rp + 12, y: y(wv) + 4, 'font-size': 11, fill: css('--at'), 'font-weight': 600, class: 'num', text: f1(wv) }));
            svg.append(s('text', { x: pw - rp + 12, y: y(wv) + 16, 'font-size': 10, fill: css('--muted'), text: 'Wiki image' }));
            const hitw = s('rect', { x: lw, y: y(wv) - 6, width: pw - rp - lw + 8, height: 12, fill: 'transparent' });
            focusableMark(hitw, `${m}, Wiki image: ${METRIC_NAME[metric]} ${f1(wv)}`, () => [h('div', { class: 'tt', text: m }), tipRow(css('--at'), 'Wiki image', f1(wv))]);
            svg.append(hitw);
          }
          const pts = field.map((r) => [x(kOf(r)), y(r[metric])]);
          svg.append(s('path', { d: 'M' + pts.map((p) => p.join(',')).join('L'), fill: 'none', stroke: css('--field'), 'stroke-width': 2, 'stroke-linejoin': 'round' }));
          field.forEach((r, i) => {
            const [px, py] = pts[i];
            svg.append(s('circle', { cx: px, cy: py, r: 5, fill: css('--field'), stroke: '#fff', 'stroke-width': 2 }));
            const above = !wiki || r[metric] >= wiki[metric] - 4;
            svg.append(s('text', { x: px, y: above ? py - 10 : py + 18, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: css('--ink'), class: 'num', text: f1(r[metric]) }));
            svg.append(s('text', { x: px, y: ph - 8, 'text-anchor': 'middle', 'font-size': 11, fill: css('--muted'), text: 'K=' + kOf(r) }));
            const hit = s('circle', { cx: px, cy: py, r: 12, fill: 'transparent' });
            focusableMark(hit, `${m}, ${kOf(r)} field images: ${METRIC_NAME[metric]} ${f1(r[metric])}`, () => [h('div', { class: 'tt', text: m }), h('div', { class: 'tn', text: `${kOf(r)} field image${kOf(r) > 1 ? 's' : ''}` }),
              tipRow(css('--mc'), 'MC accuracy', f1(r.mc)), tipRow(css('--oe'), 'OE-EM', f1(r.oe_em)), tipRow(css('--oe'), 'OE-Acc', f1(r.oe_acc))]);
            svg.append(hit);
          });
          wrap.append(svg);
        });
        box.append(wrap);
      },
      note: () => `OE-Acc (%) on the ${fint(C.settings.wild.entities)} aligned entities with K = 1, 3 or 5 field images; the green line is the same entities with their single Wiki image.`,
    });

    // example strip: Wiki image vs field images, per track
    const pick = h('div', { class: 'wild-pick' });
    const tabs = h('div', { class: 'tabs tabs-sm', role: 'tablist', 'aria-label': 'AgriTaxon-Wild example' });
    const strip = h('div', { class: 'wild-strip', role: 'tabpanel', id: 'wild-strip' });
    WX.items.forEach((it, i) => tabs.append(h('button', { type: 'button', role: 'tab', 'aria-selected': i === 0 ? 'true' : 'false', 'aria-controls': 'wild-strip', 'data-i': i, tabindex: i === 0 ? '0' : '-1' },
      h('img', { src: ICON(it.track), alt: '', width: 18, height: 18, style: { width: '18px', height: '18px', objectFit: 'contain' } }), it.label)));
    const show = (i) => {
      const it = WX.items[i]; strip.replaceChildren();
      strip.append(h('figure', { class: 'wiki' }, h('div', { class: 'wi' }, lazy(h('img', { alt: `Wiki image of ${it.label}`, decoding: 'async' }), S + it.wiki_image), h('span', { class: 'tagw', text: 'Wiki image' })),
        h('figcaption', null, h('a', { href: it.wikipedia, target: '_blank', rel: 'noopener' }, it.label), ' · Wikimedia Commons')));
      it.field_images.forEach((f, k) => strip.append(h('figure', { class: 'field' },
        h('a', { href: f.observation, target: '_blank', rel: 'noopener', title: f.attribution }, lazy(h('img', { alt: `Field image ${k + 1} of ${it.label} from iNaturalist`, decoding: 'async' }), S + f.image), h('span', { class: 'tagw', text: 'Field ' + (k + 1) })),
        h('figcaption', { text: f.attribution }))));
    };
    tabList(tabs, (t) => show(+t.dataset.i));
    pick.append(h('h4', { class: 'pick-h', text: 'Examples of Wiki and its Wild Images' }), tabs, strip);
    card.querySelector('.ffoot').before(pick);
    show(0);
  }

  /* --- 7. error types --- */
  function chartErrors(card, { C }) {
    const R = C.errors.rows; let cur = 0;
    const wrap = h('div', { class: 'err-wrap' });
    const list = h('ul', { class: 'err-list', 'aria-label': 'Error types' });
    const caseBox = h('div', { class: 'err-case', 'aria-live': 'polite' });
    const btns = R.map((r, i) => {
      const b = h('button', { type: 'button', 'aria-pressed': i === cur ? 'true' : 'false' },
        h('span', { class: 'et', text: r.type }), h('span', { class: 'ev', text: r.share + '%' }),
        h('span', { class: 'eb', 'aria-hidden': 'true' }, h('i', { style: { width: r.share + '%' } })));
      b.addEventListener('click', () => { cur = i; update(); });
      list.append(h('li', null, b));
      return b;
    });
    function update() {
      btns.forEach((b, i) => b.setAttribute('aria-pressed', i === cur ? 'true' : 'false'));
      const r = R[cur];
      caseBox.replaceChildren(
        lazy(h('img', { alt: `Wiki image of ${r.label} (${r.track})`, decoding: 'async' }), S + r.image),
        h('div', { class: 'ec' },
          h('p', { class: 'fnum', text: `${r.type} · ${r.track}` }),
          h('dl', { class: 'vs' }, h('dt', { text: 'Label' }), h('dd', { text: r.label }), h('dt', { text: 'Prediction' }), h('dd', { class: 'pred', text: r.prediction })),
          h('p', { text: r.rationale })));
    }
    wrap.append(h('div', null, list), caseBox);
    card.append(wrap);
    update();
  }

  /* =========================================================
     benchmark at a glance
     ========================================================= */
  function glance({ C }) {
    // the one why-naming sentence the abstract does not already say
    $('#bm-lede').textContent = C.why_naming[C.why_naming.length - 1].replace(/^AgriTaxon therefore /, 'AgriTaxon ');
    $('#abstract').textContent = C.abstract;
    const tr = $('#tracks');
    C.tracks.forEach((t) => tr.append(h('article', { class: 'card trk' },
      h('div', { class: 'trk-h' }, h('img', { src: ICON(t.id), alt: '', width: 46, height: 46, loading: 'lazy' }), h('div', null, h('b', { text: t.name }), h('span', { text: fint(t.entities) }))),
      h('dl', null, h('dt', { text: 'Knowledge base' }), h('dd', { text: t.knowledge_base }),
        h('dt', { text: 'Wikidata link' }), h('dd', null, h('a', { href: 'https://www.wikidata.org/wiki/Property:' + t.wikidata_property, target: '_blank', rel: 'noopener', text: t.wikidata_property })),
        h('dt', { text: 'Label level' }), h('dd', { text: t.label_level })))));
    // the three settings, as the paper's overview table
    const se = $('#settings');
    se.append(h('table', { class: 'plain' },
      h('thead', null, h('tr', null, ['Setting', 'Entities', 'Images', 'Selection'].map((x, i) => h('th', { scope: 'col', class: i === 1 ? 'n' : '' }, x)))),
      h('tbody', null, ['main', 'hard', 'wild'].map((k) => {
        const x = C.settings[k];
        return h('tr', null, h('th', { scope: 'row' }, x.name), h('td', { class: 'n', text: fint(x.entities) }), h('td', { text: x.images }), h('td', { text: x.selection }));
      }))));
    // the two settings of every entity, each with the metrics it is scored by (defined only here)
    const M = C.protocol.metrics;
    const mt = (keys) => h('div', { class: 'mt' }, keys.map((k) => h('div', null, h('b', { text: k }), M[k])));
    $('#proto').append(
      h('div', { class: 'pc' }, h('h4', { class: 't-mc', text: 'Multiple-choice selection (MC)' }), h('p', { text: C.protocol.selection.replace(/^Multiple-choice selection \(MC\):\s*/, '').replace(/^./, (c) => c.toUpperCase()) }),
        mt(Object.keys(M).filter((k) => k.startsWith('MC')))),
      h('div', { class: 'pc oe' }, h('h4', { class: 't-oe', text: 'Open-ended naming (OE)' }), h('p', { text: C.protocol.naming.replace(/^Open-ended naming \(OE\):\s*/, '').replace(/^./, (c) => c.toUpperCase()) }),
        mt(Object.keys(M).filter((k) => !k.startsWith('MC')))));
    $('#judge-text').textContent = C.judge_validation;
    const co = $('#construct'); C.construction.forEach((x) => co.append(h('li', { text: x })));
  }

  /* =========================================================
     use
     ========================================================= */
  function use({ C }) {
    const hfId = C.links.dataset.replace(/^https?:\/\/huggingface\.co\/datasets\//, '');
    const snippets = {
      py: [['c', '# pip install datasets'], ['', 'from datasets import load_dataset'], ['', ''], ['c', '# AgriTaxon on the Hugging Face Hub'], ['', 'ds = load_dataset('], ['s', `"${hfId}"`], ['', ')'], ['', '\nprint(ds)']],
      cli: [['c', '# download the full dataset repository'], ['', `huggingface-cli download `], ['s', hfId], ['', ' --repo-type dataset --local-dir AgriTaxon']],
    };
    const code = $('#code-body');
    const paint = (k) => {
      code.replaceChildren();
      const parts = snippets[k];
      if (k === 'py') {
        code.append(h('span', { class: 'c', text: parts[0][1] }), '\n', h('span', { class: 'k', text: 'from' }), ' datasets ', h('span', { class: 'k', text: 'import' }), ' load_dataset\n\n',
          h('span', { class: 'c', text: parts[3][1] }), '\nds = load_dataset(', h('span', { class: 's', text: `"${hfId}"` }), ')\nprint(ds)');
      } else {
        code.append(h('span', { class: 'c', text: parts[0][1] }), '\nhuggingface-cli download ', h('span', { class: 's', text: hfId }), ' \\\n  --repo-type dataset --local-dir AgriTaxon');
      }
    };
    paint('py');
    tabList($('#code-tabs'), (t) => { paint(t.dataset.code); $('#code-pre').setAttribute('aria-labelledby', t.id); });
    const lic = $('#licenses'); const LN = { annotations: 'Annotations', wiki_images: 'Wiki images', wild_images: 'Field images (AgriTaxon-Wild)', code: 'Code' };
    Object.keys(C.license).forEach((k) => lic.append(h('div', null, h('dt', { text: LN[k] || k }), h('dd', { text: C.license[k] }))));
    $('#bibtex').textContent = C.bibtex;
    $('#limitations').textContent = C.limitations;
  }

  /* ---------------- nav scroll-spy ---------------- */
  function scrollspy() {
    const links = $$('.secnav a');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
        const a = map.get(e.target.id); if (a) { a.classList.add('active'); a.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((a, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    // back at the top (the hero has no nav link), no section is marked as current
    const heroEl = $('.hero'); if (heroEl) io.observe(heroEl);
  }

  main();
})();
