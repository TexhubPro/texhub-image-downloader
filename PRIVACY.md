# Privacy Policy — TexHub Image Downloader

_Last updated: 2026-06-06_

**TexHub Image Downloader** is built privacy-first. This policy explains exactly what
the extension does — and does not — do with your data.

## Summary

> **The extension collects nothing.** No personal data, no browsing history, no
> analytics. Nothing is sent to us or any third party.

## What we collect

**Nothing.** TexHub Image Downloader does not collect, store on a remote server,
transmit, or sell any personal data, browsing history, or usage analytics. There is no
account, no tracking, and no telemetry.

## How it works

- When you click the toolbar icon, the extension scans **only the current tab** for
  images and shows them in the popup. The scan runs locally in your browser.
- A small content script runs on web pages to show a download button when you hover an
  image. It only reads image URLs locally to offer the download — it sends nothing
  anywhere and stores nothing.
- Downloads are made directly by your browser to the image servers you choose, using
  your existing browser session. The extension adds nothing to these requests.
- Your filter/sort preferences are stored in the browser's local storage on your own
  device. **Nothing ever leaves your device.**

## Permissions

| Permission | Use |
|---|---|
| `activeTab` | Access the page only when you open the extension on it |
| `scripting` | Inject a one-shot collector to list the page's images |
| `downloads` | Save the images you select |
| `storage` | Remember your filter/sort preferences |
| `<all_urls>` (host) | Show the hover download button on images while you browse |

These permissions are used solely to find and download images from the page you are
viewing. They are never used to track you.

## Changes to this policy

If this policy ever changes, the updated version will be published with the extension
and the “Last updated” date above will change.

## Contact

Questions about this policy? Contact the maintainer:

**TexHub Pro** — texus.tj@gmail.com
