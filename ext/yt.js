// Runs in YouTube's page (MAIN world) at document_start.
// 1) Strip ads from every YouTube data response (player, home, search, watch page, Shorts)
//    so they are never rendered and leave no gaps.
const AD_KEYS = ["adPlacements", "adSlots", "playerAds", "adBreakHeartbeatParams"];
const AD_ITEMS = new Set([
  "adSlotRenderer", "promotedSparklesWebRenderer", "searchPyvRenderer", "promotedVideoRenderer",
  "compactPromotedVideoRenderer", "merchandiseShelfRenderer", "statementBannerRenderer",
  "bannerPromoRenderer", "mealbarPromoRenderer",
]);
const isAd = (e) => {
  if (!e || typeof e !== "object") return false;
  for (const k in e) if (AD_ITEMS.has(k)) return true;
  return !!(e.richItemRenderer?.content?.adSlotRenderer || e.command?.reelWatchEndpoint?.adClientParams?.isAd);
};
const strip = (o, depth = 0) => {
  if (!o || typeof o !== "object" || depth > 80) return o;
  if (Array.isArray(o)) {
    for (let i = o.length - 1; i >= 0; i--) if (isAd(o[i])) o.splice(i, 1); else strip(o[i], depth + 1);
  } else {
    for (const k of AD_KEYS) delete o[k];
    for (const k in o) strip(o[k], depth + 1);
  }
  return o;
};
const parse = JSON.parse;
JSON.parse = function (...args) { return strip(parse.apply(this, args)); };
const json = Response.prototype.json;
Response.prototype.json = async function () { return strip(await json.call(this)); };
// First page load embeds these as inline script globals instead of fetching them.
for (const name of ["ytInitialPlayerResponse", "ytInitialData"]) {
  let value;
  Object.defineProperty(window, name, { configurable: true, get: () => value, set: (v) => { value = strip(v); } });
}

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
