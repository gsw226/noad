// Runs in YouTube's page (MAIN world) at document_start.
// 1) Strip ad data from player responses so ads never get scheduled.
const AD_KEYS = ["adPlacements", "adSlots", "playerAds"];
const strip = (o) => {
  if (o && typeof o === "object") {
    for (const k of AD_KEYS) delete o[k];
    if (o.playerResponse) strip(o.playerResponse);
  }
  return o;
};
const parse = JSON.parse;
JSON.parse = function (...args) { return strip(parse.apply(this, args)); };
const json = Response.prototype.json;
Response.prototype.json = async function () { return strip(await json.call(this)); };
let initial;
Object.defineProperty(window, "ytInitialPlayerResponse", {
  configurable: true,
  get: () => initial,
  set: (v) => { initial = strip(v); },
});

// 2) Fallback if an ad still plays: jump to its end and press skip.
// ponytail: YouTube renames these classes now and then; update selectors when ads reappear.
setInterval(() => {
  const player = document.querySelector(".html5-video-player.ad-showing");
  if (!player) return;
  const video = player.querySelector("video");
  if (video && Number.isFinite(video.duration)) video.currentTime = video.duration;
  document.querySelector(".ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern")?.click();
}, 250);

// 3) Close the gaps hidden feed ads leave in the home grid.
// A full-width shelf (Shorts etc.) placed mid-row leaves empty cells, so push each
// shelf back with CSS order until its row is full. DOM nodes are never moved.
let pending = false;
const reflow = () => {
  pending = false;
  for (const grid of document.querySelectorAll("ytd-rich-grid-renderer > #contents")) {
    const kids = [...grid.children];
    const perRow = +kids.find((k) => k.hasAttribute("items-per-row"))?.getAttribute("items-per-row") || 0;
    if (!perRow) continue;
    let order = 0, count = 0;
    const deferred = [];
    const flush = () => { for (const d of deferred.splice(0)) d.style.order = order++; };
    for (const k of kids) {
      if (k.tagName !== "YTD-RICH-ITEM-RENDERER") {
        if (count % perRow) deferred.push(k); else k.style.order = order++;
        continue;
      }
      k.style.order = order++;
      if (getComputedStyle(k).display === "none") continue;
      if (++count % perRow === 0) flush();
    }
    flush();
  }
};
new MutationObserver(() => {
  if (!pending) { pending = true; setTimeout(reflow, 200); }
}).observe(document, { childList: true, subtree: true });
