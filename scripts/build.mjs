// Downloads filter lists and writes ext/rules.json, ext/hide.css, ext/content.js.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const LISTS = [
  "https://easylist.to/easylist/easylist.txt",
  "https://easylist-downloads.adblockplus.org/koreanlist.txt",
];
const MAX_RULES = 300000; // Chrome's shared static-rule pool for all extensions is 330k

const text = (await Promise.all(LISTS.map(async (u) => {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`);
  return r.text();
}))).join("\n");

// Network rules: abp2dnr ignores cosmetic lines itself.
const rules = JSON.parse(execFileSync("npx", ["abp2dnr"], { input: text, maxBuffer: 1 << 28 }));
if (rules.length > MAX_RULES) throw new Error(`${rules.length} rules exceeds ${MAX_RULES}`);
writeFileSync("ext/rules.json", JSON.stringify(rules));

// Cosmetic rules. Only plain "##" hiding; extended syntax (#?#, #$#, :-abp-*) is skipped.
// ponytail: domain exceptions (site#@#sel) are ignored, add if a site breaks.
const generic = new Set(), genericExc = new Set(), byDomain = {};
for (const line of text.split("\n").map((l) => l.trim())) {
  if (!line || line.startsWith("!") || line.includes(":-abp-")) continue;
  let m;
  if ((m = line.match(/^#@#(.+)$/))) genericExc.add(m[1]);
  else if ((m = line.match(/^##(.+)$/))) generic.add(m[1]);
  else if ((m = line.match(/^([^#]+)##(.+)$/))) {
    for (const d of m[1].split(",")) {
      if (d.startsWith("~")) continue;
      (byDomain[d] ??= []).push(m[2]);
    }
  }
}
for (const s of genericExc) generic.delete(s);

// One rule per selector so a single invalid selector can't void the rest.
writeFileSync("ext/hide.css", [...generic].map((s) => `${s}{display:none!important}`).join("\n") + "\n");
writeFileSync("ext/content.js", `const SELECTORS = ${JSON.stringify(byDomain)};
const parts = location.hostname.split(".");
const css = [];
for (let i = 0; i < parts.length - 1; i++) {
  for (const s of SELECTORS[parts.slice(i).join(".")] || []) css.push(s + "{display:none!important}");
}
if (css.length) {
  const style = document.createElement("style");
  style.textContent = css.join("\\n");
  (document.head || document.documentElement).appendChild(style);
}
`);

console.log(`rules=${rules.length} genericCss=${generic.size} domains=${Object.keys(byDomain).length}`);
