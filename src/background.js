// TexHub Image Downloader — background service worker
// Handles single-image download requests from the in-page hover button.
// (The popup downloads directly via chrome.downloads; only content scripts need this relay.)

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== 'DOWNLOAD_IMAGE' || !msg.url) return;
  chrome.downloads.download(
    { url: msg.url, filename: msg.filename || undefined, saveAs: false },
    () => void chrome.runtime.lastError   // swallow "Download interrupted" etc.
  );
});
