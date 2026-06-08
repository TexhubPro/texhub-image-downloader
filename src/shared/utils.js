// TexHub Image Downloader — shared helpers (popup + injected collector use plain values).

// HTML-escape for safe insertion into innerHTML.
function esc(str) {
  if (str == null) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|svg|avif|ico|jfif|tiff?)(?:[?#]|$)/i;

function isImageUrl(url) {
  return typeof url === 'string' && IMAGE_EXT_RE.test(url);
}

// Best-effort file extension for a downloaded image.
function extFromUrl(url) {
  const m = String(url || '').match(IMAGE_EXT_RE);
  if (m) return m[1].toLowerCase().replace('jpeg', 'jpg');
  return 'jpg';
}

// A safe, readable download filename derived from the image URL.
function filenameFor(url, index = 0) {
  let name = '';
  try {
    const u = new URL(url);
    name = decodeURIComponent((u.pathname.split('/').pop() || '').split('?')[0]);
  } catch { /* keep empty */ }
  if (!name || !/\.[a-z0-9]{2,5}$/i.test(name)) {
    name = 'image_' + (index + 1) + '.' + extFromUrl(url);
  }
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 120);
}

// Largest pixel dimension of an image record (0 when unknown).
function maxSide(img) {
  return Math.max(img.width || 0, img.height || 0);
}

// Bucket an image by its largest side: 'small' | 'medium' | 'large' | 'unknown'.
function sizeBucket(img) {
  const s = maxSide(img);
  if (!s) return 'unknown';
  if (s < 200) return 'small';
  if (s < 640) return 'medium';
  return 'large';
}

function fmtDimensions(img) {
  if (img.width && img.height) return img.width + ' × ' + img.height;
  return '';
}
