const $ = (id) => document.getElementById(id);

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let host = "";
  try { const u = new URL(tab.url); if (/^https?:$/.test(u.protocol)) host = u.hostname.replace(/^www\./, ""); } catch {}
  const { enabled = true, allow = [] } = await chrome.storage.local.get(["enabled", "allow"]);

  $("enabled").checked = enabled;
  $("site").textContent = host || "이 페이지는 해당 없음";
  $("here").checked = host && !allow.includes(host);
  $("here").disabled = !host || !enabled;

  $("enabled").onchange = async (e) => {
    await chrome.storage.local.set({ enabled: e.target.checked });
    await chrome.runtime.sendMessage("apply");
    $("here").disabled = !host || !e.target.checked;
    chrome.tabs.reload(tab.id);
  };
  $("here").onchange = async (e) => {
    const { allow = [] } = await chrome.storage.local.get("allow");
    const next = e.target.checked ? allow.filter((d) => d !== host) : [...new Set([...allow, host])];
    await chrome.storage.local.set({ allow: next });
    await chrome.runtime.sendMessage("apply");
    chrome.tabs.reload(tab.id);
  };
})();
