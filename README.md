# noad

Chromium MV3 ad blocker built from EasyList + KoreanList. Works in Chrome, Edge, Aside and other Chromium browsers.

## Install

1. Open `chrome://extensions`, turn on Developer mode.
2. "Load unpacked" → select the `ext/` folder.

## Settings

Click the toolbar icon: turn blocking on/off everywhere, or off for the current site. Changing either reloads the tab.

## Update filters

```sh
npm install
npm run build
```

Then press reload on the extension card.

## What it does

- Network blocking: filter lists converted to `declarativeNetRequest` rules by `@eyeo/abp2dnr` (`ext/rules.json`).
- Extra rules: `filters/custom.txt` (Naver ad servers, Naver home ad slots).
- YouTube video and Shorts ads: `ext/yt.js` strips ad data from player and Shorts feed responses and skips any ad that still plays.
- Settings: `ext/bg.js` registers content scripts and toggles rulesets from `chrome.storage`; per-site off adds an `allowAllRequests` rule and excludes the site from content scripts.
- Element hiding: generic `##` selectors in `ext/hide.css`, per-site `domain##` selectors in `ext/content.js`.
- Not handled: extended cosmetic syntax (`#?#`, `#$#`, `:-abp-*`), per-site hiding exceptions.
