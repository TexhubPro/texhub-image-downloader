<div align="center">

<img src="icons/icon128.png" width="96" height="96" alt="TexHub Image Downloader logo">

# TexHub Image Downloader

**Find every image on a page, preview them in a grid, and download what you want — in one click.**

[![Manifest](https://img.shields.io/badge/Manifest-V3-f09018)](manifest.json)
[![Version](https://img.shields.io/badge/version-1.0.0-f09018)](manifest.json)
[![License](https://img.shields.io/badge/license-MIT-f09018)](LICENSE)

</div>

---

## Features

- **Full page scan** — collects images from `<img>`, `srcset`, CSS backgrounds and
 image links, across the page and its frames.
- **Two-column preview grid** — every image as a thumbnail with its real
 dimensions and format.
- **Filter & sort** — filter by URL text and by size (small / medium / large),
 sort **largest first**, **smallest first**, or page order. Sorting refines itself as
 real image dimensions load in.
- **Multi-select + bulk download** — tick the images you want (or **Select all**)
 and **Download selected** saves them together.
- **One-click per image** — each thumbnail has its own download button; click it and
 the image saves instantly.
- **On-page hover button** — hover any image on a web page and a TexHub button
 appears; one click saves it in the **highest quality available** (resolved from a
 parent link, `data-*` full-res attributes or `srcset`), even when only a small
 thumbnail is shown.
- **Tidy output** — batches are saved into `TexHub Images/<site>/` inside your
 Downloads folder.
- **Private & lightweight** — no background tracking, no data collection, minimal
 permissions.

## Install (developer mode)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** and select this folder
4. Pin **TexHub Image Downloader** and open it on any page

> Works in Chrome, Edge, Brave and other Chromium browsers.

## How to use

1. Open a page with images and click the TexHub toolbar icon.
2. Use the toolbar to filter (by URL or size) and sort the previews.
3. Click thumbnails to select them, or use **Select all**.
4. Hit **Download selected** — or click the button on any single image.

## Project structure

```
texhub-image-downloader/
├── manifest.json            # MV3 manifest
├── icons/                   # 16 / 32 / 48 / 128 px icons
└── src/
    ├── background.js        # Service worker: relays in-page download requests
    ├── content/
    │   └── content.js       # On-page hover download button + best-quality resolver
    ├── popup/               # Toolbar popup UI (html / css / js + injected collector)
    └── shared/
        └── utils.js         # Shared helpers (filenames, sizes, escaping)
```

## Permissions

| Permission | Why it's needed |
|---|---|
| `activeTab` | Read the page when you open the popup on it |
| `scripting` | Inject the one-shot image collector into that page |
| `downloads` | Save the images you choose |
| `storage` | Remember your filter/sort preferences |
| `<all_urls>` (host) | Show the hover download button on images across sites |

No background tracking, no analytics. See [PRIVACY.md](PRIVACY.md).

## Legal

Only download images you own or are authorised to download. Respect the terms of
service of the sites you use and applicable copyright law.

## License

[MIT](LICENSE) © 2026 **TexHub Pro**

## Contact

Maintained by **TexHub Pro** — texus.tj@gmail.com
