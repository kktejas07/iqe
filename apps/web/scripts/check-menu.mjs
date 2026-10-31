// Fails if the menu and the screens disagree.
//   node scripts/check-menu.mjs
// Checks: the eleven departments from the "Menu structure" slide, in order;
// every menu link points at a real screen; every screen is reachable from the
// menu (or is on the short list of screens that deliberately are not); nothing
// is listed twice except the one screen the slide itself puts in two menus.
import { readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MENU, pathOf } from "../src/lib/menu.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "app");
const SLIDE = ["Sales", "Operations", "Projects", "HR", "Finance", "QMS", "Field Portal",
  "Admin", "Asset Integrity", "Equipment Design", "Training"];
// Not menu items: home (the logo) and sign-in.
const NOT_IN_MENU = new Set(["dashboard", "login"]);
// The slide lists NCR under Projects and NCR/CA under QMS.
const SHARED = new Set(["/ncrs"]);

const problems = [];
const titles = MENU.map((g) => g.title);
if (JSON.stringify(titles) !== JSON.stringify(SLIDE)) {
  problems.push(`menus are [${titles.join(", ")}], the slide has [${SLIDE.join(", ")}]`);
}

const screens = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(root, d.name, "page.tsx")))
  .map((d) => "/" + d.name);

const seen = new Map();
for (const g of MENU) {
  if (!g.items.length) problems.push(`${g.title} has no items`);
  for (const i of g.items) {
    const p = pathOf(i.href);
    if (!screens.includes(p)) problems.push(`${g.title} → ${i.name}: no screen at ${p}`);
    if (seen.has(i.href) && !SHARED.has(p)) problems.push(`${i.href} is in both ${seen.get(i.href)} and ${g.title}`);
    seen.set(i.href, g.title);
  }
}
const reached = new Set([...seen.keys()].map(pathOf));
for (const s of screens) {
  if (!NOT_IN_MENU.has(s.slice(1)) && !reached.has(s)) problems.push(`${s} has a screen but no menu item`);
}
// A path in two menus is only allowed for shared screens and ?line= variants.
const byPath = new Map();
for (const [href, grp] of seen) byPath.set(pathOf(href), [...(byPath.get(pathOf(href)) || []), grp]);
for (const [p, groups] of byPath) {
  if (groups.length > 1 && !SHARED.has(p) && p !== "/engagements") problems.push(`${p} appears in ${groups.join(", ")}`);
}

if (problems.length) {
  console.error("Menu check failed:\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log(`Menu OK: ${MENU.length} departments, ${seen.size} links, ${reached.size} of ${screens.length} screens reached.`);
