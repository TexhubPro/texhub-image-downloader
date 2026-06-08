// TexHub Image Downloader — in-page hover button
// Shows a download button when hovering any image and downloads the highest-quality
// source available (full-res from a parent link, data-* attributes or srcset),
// even when the page only displays a small thumbnail.

(function () {
  'use strict';
  if (window.__texhubImageDl) return;
  window.__texhubImageDl = true;

  const MIN_SIZE = 64;          // ignore tiny icons/sprites
  const BTN_SIZE = 34;
  let currentImg = null;

  injectStyles();

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'texhub-imgdl-btn';
  btn.title = 'Download image in best quality — TexHub';
  btn.innerHTML = downloadSvg();
  btn.style.display = 'none';
  btn.addEventListener('click', onClick, true);
  (document.body || document.documentElement).appendChild(btn);

  // Track the hovered image.
  document.addEventListener('mouseover', (e) => {
    const t = e.target;
    if (t === btn || btn.contains(t)) return;
    const img = t && t.closest ? t.closest('img') : null;
    if (img && bigEnough(img)) showFor(img);
    else hide();
  }, true);

  // Keep the button glued to the image while scrolling/resizing.
  window.addEventListener('scroll', () => currentImg && position(currentImg), true);
  window.addEventListener('resize', () => currentImg && position(currentImg));

  function showFor(img) {
    currentImg = img;
    position(img);
    btn.classList.remove('done');
    btn.innerHTML = downloadSvg();
    btn.style.display = 'flex';
  }

  function hide() {
    btn.style.display = 'none';
    currentImg = null;
  }

  function bigEnough(img) {
    const r = visibleRect(img);
    return (r.right - r.left) >= MIN_SIZE && (r.bottom - r.top) >= MIN_SIZE;
  }

  function position(img) {
    const r = visibleRect(img);
    if ((r.right - r.left) < MIN_SIZE || (r.bottom - r.top) < MIN_SIZE) {
      hide();
      return;
    }
    // Pin to the top-right corner of the image's *visible* area.
    btn.style.top = (r.top + 8) + 'px';
    btn.style.left = (r.right - 8 - BTN_SIZE) + 'px';
  }

  // The on-screen region of the image, clipped by any overflow-hidden/scroll
  // ancestors and the viewport — so the button lands on the visible corner even
  // when the image is cropped by its container.
  function visibleRect(el) {
    const b = el.getBoundingClientRect();
    const r = { top: b.top, left: b.left, right: b.right, bottom: b.bottom };
    let p = el.parentElement;
    while (p && p !== document.body && p !== document.documentElement) {
      const st = getComputedStyle(p);
      if (/(hidden|clip|auto|scroll)/.test(st.overflow + st.overflowX + st.overflowY)) {
        const pr = p.getBoundingClientRect();
        r.top = Math.max(r.top, pr.top);
        r.left = Math.max(r.left, pr.left);
        r.right = Math.min(r.right, pr.right);
        r.bottom = Math.min(r.bottom, pr.bottom);
      }
      p = p.parentElement;
    }
    r.top = Math.max(r.top, 0);
    r.left = Math.max(r.left, 0);
    r.right = Math.min(r.right, innerWidth);
    r.bottom = Math.min(r.bottom, innerHeight);
    return r;
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentImg) return;
    const url = bestQualityUrl(currentImg);
    if (!url) return;
    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_IMAGE',
      url,
      filename: 'TexHub Images/' + folder() + '/' + nameFromUrl(url)
    });
    btn.classList.add('done');
    btn.innerHTML = checkSvg();
  }

  // ── Best-quality source resolution ──

  function bestQualityUrl(img) {
    const cands = [];
    const push = (u, score) => { if (u) { const a = abs(u); if (a) cands.push({ url: a, score }); } };

    // 1) A parent link that points straight at an image is usually the full-res file.
    const a = img.closest('a[href]');
    if (a && looksLikeImage(a.href)) push(a.href, 9e6);

    // 2) Common "full / zoom / original" data attributes.
    const dataAttrs = [
      'data-zoom-image', 'data-large-image', 'data-large', 'data-original',
      'data-hi-res', 'data-highres', 'data-full', 'data-image', 'data-src',
      'data-lazy-src', 'data-fallback-src'
    ];
    for (const at of dataAttrs) {
      const v = img.getAttribute(at);
      if (v && /^(https?:|\/|\.)/.test(v.trim())) push(v.trim(), 8e6);
    }

    // 3) Largest candidate from srcset (img or data-srcset).
    pickSrcset(img.getAttribute('srcset') || img.srcset, push);
    pickSrcset(img.getAttribute('data-srcset'), push);

    // 4) Whatever is actually displayed.
    push(img.currentSrc, (img.naturalWidth || 0) + 1);
    push(img.src, img.naturalWidth || 0);

    if (!cands.length) return '';
    cands.sort((x, y) => y.score - x.score);
    return cands[0].url;
  }

  function pickSrcset(srcset, push) {
    if (!srcset) return;
    String(srcset).split(',').forEach((part) => {
      const seg = part.trim().split(/\s+/);
      const u = seg[0];
      const desc = seg[1] || '';
      const w = /(\d+)w/.exec(desc);
      const x = /([\d.]+)x/.exec(desc);
      const score = w ? parseInt(w[1], 10) : (x ? Math.round(parseFloat(x[1]) * 1000) : 1);
      push(u, 1000 + score);   // above plain src, below explicit full-res links
    });
  }

  function looksLikeImage(u) {
    return /\.(jpe?g|png|gif|webp|bmp|svg|avif|tiff?)(?:[?#]|$)/i.test(u || '');
  }

  function abs(u) {
    try {
      const a = new URL(u, location.href).href;
      return /^https?:/i.test(a) ? a : '';
    } catch { return ''; }
  }

  function nameFromUrl(u) {
    let name = '';
    try { name = decodeURIComponent((new URL(u).pathname.split('/').pop() || '').split('?')[0]); } catch {}
    if (!name || !/\.[a-z0-9]{2,5}$/i.test(name)) {
      const ext = (looksLikeImage(u) && /\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(u)?.[1]) || 'jpg';
      name = 'image_' + Date.now() + '.' + ext.toLowerCase().replace('jpeg', 'jpg');
    }
    return name.replace(/[^\w.\-]+/g, '_').slice(0, 120);
  }

  function folder() {
    return (location.hostname || 'images').replace(/^www\./, '').replace(/[^\w.\-]+/g, '_').slice(0, 60) || 'images';
  }

  // ── UI ──

  function downloadSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">' +
      '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>' +
      '<polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  }
  function checkSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">' +
      '<polyline points="20 6 9 17 4 12"/></svg>';
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent =
      '.texhub-imgdl-btn{position:fixed;z-index:2147483647;width:' + BTN_SIZE + 'px;height:' + BTN_SIZE + 'px;' +
      'padding:0;border:none;border-radius:9px;background:#f09018;color:#fff;cursor:pointer;' +
      'display:none;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.45);' +
      'transition:transform .12s ease, background .15s ease;line-height:0;}' +
      '.texhub-imgdl-btn:hover{background:#d97e10;transform:scale(1.08);}' +
      '.texhub-imgdl-btn:active{transform:scale(.94);}' +
      '.texhub-imgdl-btn.done{background:#10b981;}' +
      '.texhub-imgdl-btn svg{width:18px;height:18px;display:block;}';
    (document.head || document.documentElement).appendChild(style);
  }
})();
