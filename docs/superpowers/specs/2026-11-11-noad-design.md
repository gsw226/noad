# noad design

Goal: personal ad blocker for the Aside browser (Chromium-based, loads unpacked MV3 extensions).

- MV3 extension in `ext/`, no UI.
- Network: EasyList + KoreanList converted with `@eyeo/abp2dnr` into one static `declarativeNetRequest` ruleset. Build fails above 300k rules.
- Cosmetic: generic `##` selectors (minus `#@#` exceptions) as `hide.css`; `domain##` selectors embedded in `content.js`, matched against hostname suffixes at `document_start`.
- Updates: manual `npm run build` + reload. Generated files are committed so the extension loads without building.
- Out of scope: popup/allowlist UI, extended syntax, scriptlets, YouTube ads.
