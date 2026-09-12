const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "components", "Navbar.tsx");
if (!fs.existsSync(file)) process.exit(0);
let t = fs.readFileSync(file, "utf8");
if (t.includes("NexusIcon name={item.icon}") && t.includes("lantern:open-ai")) {
  console.log("[patch-navbar-ui] already applied");
  process.exit(0);
}

if (!t.includes("NexusIcon")) {
  t = t.replace(
    'import { openOmniSearch } from "@/components/CommandPalette";',
    'import { openOmniSearch } from "@/components/CommandPalette";\nimport { NexusIcon } from "@/components/ui/NexusIcon";',
  );
}

t = t.replace(
  /const DOCK\s*=\s*\[[\s\S]*?\];/,
  `const DOCK: { href: string; label: string; icon: "home" | "shelf" | "search" | "taste" | "tools" }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/watchlist", label: "Shelf", icon: "shelf" },
  { href: "__search__", label: "Search", icon: "search" },
  { href: "/taste", label: "Taste", icon: "taste" },
  { href: "__more__", label: "More", icon: "tools" },
];`,
);

t = t.replace(
  /<span className="nav-dock-icon" aria-hidden>\s*\{item\.icon\}\s*<\/span>/g,
  `<span className="nav-dock-icon" aria-hidden>
                <NexusIcon name={item.icon} size={20} />
              </span>`,
);

if (!t.includes("lantern:open-ai") && t.includes("Open search")) {
  t = t.replace(
    `{\n                  Open search\n                </Button>`,
    `{\n                  Open search\n                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    closeMenu();
                    window.dispatchEvent(new Event("lantern:open-ai"));
                  }}
                >
                  Open AI desk
                </Button>`,
  );
}

fs.writeFileSync(file, t);
console.log("[patch-navbar-ui] applied", t.length);
