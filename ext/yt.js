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
