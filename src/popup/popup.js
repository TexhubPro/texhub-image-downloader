// TexHub Image Downloader — popup logic
// Collects images from the active tab (and its frames), shows them in a grid with
// live filtering/sorting, multi-select, per-image and bulk downloads.
// Shared helpers (esc, filenameFor, sizeBucket, …) come from src/shared/utils.js.

let allImages = [];                 // { url, width, height, kind }
const selected = new Set();         // selected image urls
const dims = new Map();             // url -> { w, h } learned as previews load
let pageHost = 'images';
let resortTimer = null;

const els = {};
document.addEventListener('DOMContentLoaded', init);

async function init() {
  cache(['count', 'search', 'sizeFilter', 'sortBy', 'selectAll', 'downloadSel',
         'downloadSelLabel', 'grid', 'loadingState', 'emptyState']);

  await restorePrefs();
  bindEvents();
  await scanActiveTab();
}

function cache(ids) { ids.forEach((id) => els[id] = document.getElementById(id)); }

// ========================
// PAGE SCAN (injected)
// ========================

// Runs in the page context — must be fully self-contained (no outside references).
function collectImages() {
  const out = [];
  const seen = new Set();
  const LIMIT = 1500;

  const add = (raw, w, h, kind) => {
    if (out.length >= LIMIT || !raw || typeof raw !== 'string') return;
    if (raw.startsWith('data:') || raw.startsWith('blob:')) return;
    let abs;
    try { abs = new URL(raw, location.href).href; } catch { return; }
    if (!/^https?:/i.test(abs) || seen.has(abs)) return;
    seen.add(abs);
    out.push({ url: abs, width: Math.round(w) || 0, height: Math.round(h) || 0, kind });
  };

  document.querySelectorAll('img').forEach((img) => {
    add(img.currentSrc || img.src, img.naturalWidth, img.naturalHeight, 'img');
  });

  document.querySelectorAll('picture source[srcset], img[srcset]').forEach((el) => {
    el.srcset.split(',').forEach((part) => add(part.trim().split(/\s+/)[0], 0, 0, 'srcset'));
  });

  document.querySelectorAll('a[href]').forEach((a) => {
    if (/\.(jpe?g|png|gif|webp|bmp|svg|avif|ico|tiff?)(?:[?#]|$)/i.test(a.href)) {
      add(a.href, 0, 0, 'link');
    }
  });

  // Background images (cap the element sweep so huge pages stay responsive).
  const nodes = document.querySelectorAll('*');
  const cap = Math.min(nodes.length, 4000);
  for (let i = 0; i < cap; i++) {
    const bg = getComputedStyle(nodes[i]).backgroundImage;
    if (bg && bg !== 'none' && bg.includes('url(')) {
      const m = bg.match(/url\(\s*["']?(.*?)["']?\s*\)/i);
      if (m) add(m[1], 0, 0, 'bg');
    }
  }

  return out;
}

async function scanActiveTab() {
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch { /* ignore */ }

  if (!tab || !/^https?:/i.test(tab.url || '')) {
    return showEmpty("This page can't be scanned. Open a normal web page and try again.");
  }
  try { pageHost = new URL(tab.url).hostname.replace(/^www\./, ''); } catch {}

  let results;
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: collectImages
    });
  } catch {
    return showEmpty("This page can't be scanned (it may block extensions).");
  }

  const merged = [];
  const seen = new Set();
  for (const r of results || []) {
    for (const it of (r.result || [])) {
      if (!seen.has(it.url)) { seen.add(it.url); merged.push(it); }
    }
  }
  allImages = merged;

  els.loadingState.style.display = 'none';
  if (!allImages.length) return showEmpty();
  render();
}

function showEmpty(msg) {
  els.loadingState.style.display = 'none';
  els.grid.style.display = 'none';
  els.emptyState.style.display = 'flex';
  if (msg) els.emptyState.querySelector('span').textContent = msg;
  els.count.textContent = '0';
}

// ========================
// FILTER + SORT
// ========================

function visibleImages() {
  const q = els.search.value.trim().toLowerCase();
  const sizeF = els.sizeFilter.value;
  const sortBy = els.sortBy.value;

  let list = allImages.filter((img) => {
    if (q && !img.url.toLowerCase().includes(q)) return false;
    if (sizeF !== 'all' && sizeBucket(img) !== sizeF && sizeBucket(img) !== 'unknown') return false;
    return true;
  });

  if (sortBy === 'largest' || sortBy === 'smallest') {
    const area = (img) => (img.width || 0) * (img.height || 0);
    list = [...list].sort((a, b) => {
      const d = area(b) - area(a);
      return sortBy === 'largest' ? d : -d;
    });
  }
  return list;
}

// ========================
// RENDER
// ========================

function render() {
  const list = visibleImages();
  els.count.textContent = String(allImages.length);

  if (!allImages.length) return showEmpty();
  els.emptyState.style.display = 'none';
  els.grid.style.display = 'grid';

  const scroll = els.grid.scrollTop;
  els.grid.innerHTML = list.map(tileHtml).join('');
  els.grid.scrollTop = scroll;

  els.grid.querySelectorAll('.tile').forEach((tile) => {
    const url = tile.dataset.url;
    tile.addEventListener('click', (e) => {
      if (e.target.closest('.tile-dl')) return;     // download button handles itself
      toggleSelect(url);
    });
    tile.querySelector('.tile-dl').addEventListener('click', () => downloadOne(url, tile));
    const img = tile.querySelector('.tile-img');
    img.addEventListener('load', () => onPreviewLoad(url, img, tile));
    img.addEventListener('error', () => img.classList.add('broken'));
  });

  updateBulkUI();
}

function tileHtml(img) {
  const d = dims.get(img.url) || { w: img.width, h: img.height };
  const dimTxt = d.w && d.h ? d.w + ' × ' + d.h : '';
  const ext = extFromUrl(img.url);
  const sel = selected.has(img.url) ? ' selected' : '';
  return `
  <div class="tile${sel}" data-url="${esc(img.url)}">
    <img class="tile-img" src="${esc(img.url)}" loading="lazy" referrerpolicy="no-referrer">
    <div class="tile-check">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <button class="tile-dl" title="Download this image">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </button>
    <div class="tile-meta">
      <span class="tile-dim">${esc(dimTxt)}</span>
      <span class="tile-ext">${esc(ext)}</span>
    </div>
  </div>`;
}

// Learn real dimensions from the loaded preview; refresh label and (later) re-sort.
function onPreviewLoad(url, img, tile) {
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) return;
  const isNew = !dims.has(url);                 // avoid re-sorting on cached reloads
  dims.set(url, { w, h });
  const rec = allImages.find((i) => i.url === url);
  if (rec && (!rec.width || !rec.height)) { rec.width = w; rec.height = h; }
  const label = tile.querySelector('.tile-dim');
  if (label && !label.textContent) label.textContent = w + ' × ' + h;

  if (isNew && els.sortBy.value !== 'page') {
    clearTimeout(resortTimer);
    resortTimer = setTimeout(render, 600);   // batch many loads into one re-sort
  }
}

// ========================
// SELECTION
// ========================

function toggleSelect(url) {
  if (selected.has(url)) selected.delete(url); else selected.add(url);
  const tile = els.grid.querySelector(`.tile[data-url="${cssEscape(url)}"]`);
  if (tile) tile.classList.toggle('selected', selected.has(url));
  updateBulkUI();
}

function updateBulkUI() {
  const vis = visibleImages();
  const visSelected = vis.filter((i) => selected.has(i.url)).length;
  els.downloadSel.disabled = selected.size === 0;
  els.downloadSelLabel.textContent = selected.size
    ? `Download selected (${selected.size})`
    : 'Download selected';
  els.selectAll.checked = vis.length > 0 && visSelected === vis.length;
  els.selectAll.indeterminate = visSelected > 0 && visSelected < vis.length;
}

// ========================
// DOWNLOAD
// ========================

function downloadInfo(url, index) {
  return { url, filename: `TexHub Images/${sanitizeFolder(pageHost)}/${filenameFor(url, index)}` };
}

function sanitizeFolder(name) {
  return String(name || 'images').replace(/[^\w.\-]+/g, '_').slice(0, 60) || 'images';
}

function downloadOne(url, tile) {
  const btn = tile?.querySelector('.tile-dl');
  chrome.downloads.download({ ...downloadInfo(url, 0), saveAs: false }, () => {
    if (chrome.runtime.lastError) return;
    if (btn) {
      btn.classList.add('done');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
    }
  });
}

async function downloadSelected() {
  const urls = allImages.filter((i) => selected.has(i.url)).map((i) => i.url);
  if (!urls.length) return;
  els.downloadSel.disabled = true;
  els.downloadSelLabel.textContent = `Downloading… 0 / ${urls.length}`;

  for (let i = 0; i < urls.length; i++) {
    await new Promise((resolve) => {
      chrome.downloads.download({ ...downloadInfo(urls[i], i), saveAs: false }, () => resolve());
    });
    els.downloadSelLabel.textContent = `Downloading… ${i + 1} / ${urls.length}`;
    markTileDone(urls[i]);
    await new Promise((r) => setTimeout(r, 120));   // gentle pacing for big batches
  }

  els.downloadSelLabel.textContent = `Done — ${urls.length} saved`;
  setTimeout(updateBulkUI, 2500);
}

function markTileDone(url) {
  const tile = els.grid.querySelector(`.tile[data-url="${cssEscape(url)}"]`);
  const btn = tile?.querySelector('.tile-dl');
  if (btn) btn.classList.add('done');
}

// ========================
// EVENTS + PREFS
// ========================

function bindEvents() {
  els.search.addEventListener('input', debounce(() => { render(); }, 180));
  els.sizeFilter.addEventListener('change', () => { savePrefs(); render(); });
  els.sortBy.addEventListener('change', () => { savePrefs(); render(); });

  els.selectAll.addEventListener('change', () => {
    const vis = visibleImages();
    if (els.selectAll.checked) vis.forEach((i) => selected.add(i.url));
    else vis.forEach((i) => selected.delete(i.url));
    render();
  });

  els.downloadSel.addEventListener('click', downloadSelected);
}

function savePrefs() {
  chrome.storage.local.set({
    prefs: { sizeFilter: els.sizeFilter.value, sortBy: els.sortBy.value }
  }).catch(() => {});
}

async function restorePrefs() {
  try {
    const { prefs } = await chrome.storage.local.get('prefs');
    if (prefs?.sizeFilter) els.sizeFilter.value = prefs.sizeFilter;
    if (prefs?.sortBy) els.sortBy.value = prefs.sortBy;
  } catch {}
}

// ========================
// UTIL
// ========================

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Minimal CSS.escape fallback for attribute selectors.
function cssEscape(s) {
  return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');
}
