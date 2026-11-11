// Applies settings: { enabled: bool, allow: ["example.com", ...] }
const SCRIPTS = [
  { id: "hide", matches: ["<all_urls>"], css: ["hide.css"], js: ["content.js"], runAt: "document_start", allFrames: true },
  { id: "yt", matches: ["*://*.youtube.com/*"], js: ["yt.js"], runAt: "document_start", world: "MAIN" },
];
const ALLOW_PRIORITY = 10000; // above every static rule (max ~2010)

async function apply() {
  const { enabled = true, allow = [] } = await chrome.storage.local.get(["enabled", "allow"]);

  await chrome.declarativeNetRequest.updateEnabledRulesets(
    enabled ? { enableRulesetIds: ["filters"] } : { disableRulesetIds: ["filters"] });

  const old = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: old.map((r) => r.id),
    addRules: allow.map((d, i) => ({
      id: i + 1,
      priority: ALLOW_PRIORITY,
      action: { type: "allowAllRequests" },
      condition: { requestDomains: [d], resourceTypes: ["main_frame", "sub_frame"] },
    })),
  });

  await chrome.scripting.unregisterContentScripts();
  if (enabled) {
    const excludeMatches = allow.flatMap((d) => [`*://${d}/*`, `*://*.${d}/*`]);
    await chrome.scripting.registerContentScripts(
      SCRIPTS.map((s) => (excludeMatches.length ? { ...s, excludeMatches } : s)));
  }
  chrome.action.setBadgeText({ text: enabled ? "" : "off" });
}

// Serialize runs so overlapping unregister/register calls can't collide.
let queue = Promise.resolve();
const run = () => (queue = queue.then(apply, apply));
chrome.runtime.onInstalled.addListener(run);
chrome.runtime.onStartup.addListener(run);
// The popup saves settings, then sends "apply" and waits before reloading the tab.
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg === "apply") run().then(() => reply(true), (e) => reply(String(e)));
  return true;
});
