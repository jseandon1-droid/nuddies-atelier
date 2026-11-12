/* Nuddies Atelier — Collection lookup (F-13). Find any Nuddie by number or name.
   Data: collection/nuddies.json, one row per Nuddie, pulled once from the chain:
     [name, number|0, givenName|"", oneOfOneSet|"", rarityRank|0, [[trait,value]…], mint]
   Art:  collection/thumbs/<mint>.webp (grid) and collection/art/<mint>.webp (detail).
   Nothing here talks to a wallet, an API or a marketplace; it only reads this site's own files.
   window.NU_COLLECTION may override {data, src} (used by the preview build). */
(function () {
  'use strict';
  const CFG = Object.assign({
    data: 'collection/nuddies.json',
    src: (it, kind) => 'collection/' + (kind === 'art' ? 'art' : 'thumbs') + '/' + it.mint + '.webp',
  }, window.NU_COLLECTION || {});
  const PAGE = 32;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString('en-US');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  let items = null, loading = null, filter = 'all', shown = PAGE, results = [], cur = -1, lastFocus = null, paintGen = 0;

  function load() {
    if (items) return Promise.resolve();
    if (!loading) loading = Promise.resolve(typeof CFG.data === 'string' ? fetch(CFG.data).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }) : CFG.data)
      .then((rows) => {
        items = rows.map((r, i) => ({ i, name: r[0], num: r[1], given: r[2], set: r[3], rank: r[4], traits: r[5], mint: r[6], hay: (r[0] + ' ' + r[2] + ' ' + r[3]).toLowerCase() }));
        const one = items.filter((x) => x.set).length;
        $('nuTabAll').textContent = 'All · ' + fmt(items.length); $('nuTabCore').textContent = 'Nuddies · ' + fmt(items.length - one); $('nuTabOne').textContent = '1:1s · ' + fmt(one);
      })
      .catch((e) => { loading = null; $('nuCount').textContent = 'Could not load the collection. Check your connection and try again.'; throw e; });
    return loading;
  }
  // Fill an <img> for one Nuddie. src() may answer with a URL or a promise of one.
  function paint(img, it, kind, gen) {
    Promise.resolve(CFG.src(it, kind)).then((u) => { if (gen == null || gen === paintGen) img.src = u; }).catch(() => {});
  }
  const sub = (it) => (it.set ? '1:1 · ' + it.set : (it.rank ? 'Rank ' + fmt(it.rank) : ''));

  function search() {
    if (!items) return;
    const raw = $('nuQ').value.trim(); $('nuClear').hidden = !raw;
    const pool = filter === 'core' ? items.filter((x) => !x.set) : filter === 'one' ? items.filter((x) => x.set) : items;
    let note = '';
    const m = raw.match(/^#?\s*(\d{1,4})$/);
    if (m) {
      const n = parseInt(m[1], 10), d = String(n);
      const exact = pool.filter((x) => x.num === n);
      const rest = exact.length ? [] : pool.filter((x) => x.num && String(x.num).startsWith(d));
      results = exact.concat(rest);
      if (!exact.length) note = (n >= 1 && n <= 2222)
        ? 'Nuddies #' + n + ' is not in the collection on-chain' + (rest.length ? '. Closest numbers:' : '.')
        : 'Nuddies are numbered 1 to 2,222.';
    } else if (raw) {
      const words = raw.toLowerCase().replace(/#/g, ' ').split(/\s+/).filter(Boolean), q = words.join(' ');
      results = pool.filter((x) => words.every((w) => x.hay.includes(w)));
      results.sort((a, b) => (b.name.toLowerCase().startsWith(q) - a.name.toLowerCase().startsWith(q)) || (a.i - b.i));
    } else results = pool;
    shown = PAGE;
    $('nuCount').textContent = note || (raw ? (results.length === 1 ? '1 match' : fmt(results.length) + ' matches')
      : fmt(results.length) + (filter === 'one' ? ' one-of-ones' : ' goddesses'));
    render(true);
  }
  function render(fresh) {
    const g = $('nuGrid'), n = results.length;
    if (fresh) { g.textContent = ''; paintGen++; }
    const gen = paintGen, from = g.children.length, frag = document.createDocumentFragment();
    results.slice(from, shown).forEach((it, k) => {
      const b = el('button', 'panel nu-card'); b.type = 'button'; b.dataset.idx = from + k;
      b.setAttribute('aria-label', it.name + (it.given ? ', ' + it.given : ''));
      const im = el('img'); im.alt = ''; im.width = 400; im.height = 400; im.decoding = 'async'; paint(im, it, 'thumb', gen);
      const cap = el('span', 'nu-cap'); cap.append(el('span', 'lbl', sub(it)), el('span', 'val', it.name));
      b.append(im, cap); frag.append(b);
    });
    g.append(frag);
    $('nuEmpty').hidden = n > 0;
    $('nuMore').hidden = shown >= n;
    if (shown < n) $('nuMore').textContent = 'Show more · ' + fmt(n - shown) + ' left';
  }

  function open(idx) {
    const it = results[idx]; if (!it) return; cur = idx;
    const img = $('nuArt'); img.removeAttribute('src'); img.alt = it.name;
    const gen = paintGen;
    paint(img, it, 'thumb', gen);                                   // instant, then the full-size art replaces it
    Promise.resolve(CFG.src(it, 'art')).then((u) => { const hi = new Image(); hi.onload = () => { if (cur === idx && gen === paintGen) img.src = u; }; hi.src = u; }).catch(() => {});
    $('nuName').textContent = it.name;
    $('nuGiven').hidden = !it.given; $('nuGiven').textContent = it.given;
    $('nuMeta').textContent = [it.set ? '1:1 · ' + it.set : '', it.rank ? 'Rarity rank ' + fmt(it.rank) : ''].filter(Boolean).join('  ·  ');
    const tr = $('nuTraits'); tr.textContent = ''; tr.hidden = !it.traits.length;
    it.traits.forEach(([k, v]) => { const d = el('div', 'nu-t'); d.append(el('div', 'lbl', k), el('div', 'val', v)); tr.append(d); });
    $('nuLink').href = 'https://magiceden.us/item-details/' + it.mint;
    $('nuPos').textContent = fmt(idx + 1) + ' / ' + fmt(results.length);
    $('nuPrev').disabled = idx <= 0; $('nuNext').disabled = idx >= results.length - 1;
    if ($('nuSheet').hidden) { lastFocus = document.activeElement; $('nuSheet').hidden = false; document.body.style.overflow = 'hidden'; $('nuClose').focus(); }
    $('nuSheet').querySelector('.sheet-card').scrollTop = 0;
  }
  function shut() { $('nuSheet').hidden = true; document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }

  function mode(which, fromHash) {
    const col = which === 'collection';
    $('atelierView').hidden = col; $('collectionView').hidden = !col;
    $('modeAtelier').setAttribute('aria-pressed', String(!col)); $('modeCollection').setAttribute('aria-pressed', String(col));
    document.body.classList.toggle('nu-collection', col);
    if (!fromHash) { try { history.replaceState(null, '', col ? '#collection' : location.pathname + location.search); } catch (e) { if (col) location.hash = 'collection'; } }
    if (col) { scrollTo(0, 0); if (!items) { $('nuCount').textContent = 'Summoning the collection…'; load().then(search).catch(() => {}); } }
  }

  let t;
  $('nuQ').addEventListener('input', () => { clearTimeout(t); t = setTimeout(search, 90); });
  $('nuQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(t); search(); if (results.length === 1) open(0); $('nuQ').blur(); } });
  $('nuClear').addEventListener('click', () => { $('nuQ').value = ''; search(); $('nuQ').focus(); });
  [['nuTabAll', 'all'], ['nuTabCore', 'core'], ['nuTabOne', 'one']].forEach(([id, f]) => $(id).addEventListener('click', () => {
    filter = f; ['nuTabAll', 'nuTabCore', 'nuTabOne'].forEach((x) => $(x).setAttribute('aria-pressed', String(x === id))); search(); }));
  $('nuGrid').addEventListener('click', (e) => { const c = e.target.closest('.nu-card'); if (c) open(+c.dataset.idx); });
  $('nuMore').addEventListener('click', () => { shown += PAGE; render(false); });
  $('nuPrev').addEventListener('click', () => open(cur - 1)); $('nuNext').addEventListener('click', () => open(cur + 1));
  $('nuClose').addEventListener('click', shut); $('nuClose2').addEventListener('click', shut);
  $('nuSheet').addEventListener('click', (e) => { if (e.target === $('nuSheet')) shut(); });
  document.addEventListener('keydown', (e) => { if ($('nuSheet').hidden) return;
    if (e.key === 'Escape') shut(); else if (e.key === 'ArrowLeft' && cur > 0) open(cur - 1); else if (e.key === 'ArrowRight' && cur < results.length - 1) open(cur + 1); });
  $('modeAtelier').addEventListener('click', () => mode('atelier')); $('modeCollection').addEventListener('click', () => mode('collection'));
  addEventListener('hashchange', () => mode(location.hash === '#collection' ? 'collection' : 'atelier', true));
  if (location.hash === '#collection') mode('collection', true);
  window.NuLookup = { get items() { return items; }, get results() { return results; }, mode };
})();
