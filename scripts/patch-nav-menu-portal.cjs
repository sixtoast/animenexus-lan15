/** Portal mobile nav sheet + scrim to document.body (navbar backdrop-filter traps fixed). */
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "components", "Navbar.tsx");
if (!fs.existsSync(file)) {
  console.log("[patch-nav-menu] skip");
  process.exit(0);
}
let t = fs.readFileSync(file, "utf8");
if (t.includes("dockReady && (open || closing)")) {
  console.log("[patch-nav-menu] already portaled");
  process.exit(0);
}
if (!t.includes("createPortal")) {
  console.log("[patch-nav-menu] no createPortal import — skip");
  process.exit(0);
}

const start = t.indexOf("{open || closing ? (");
if (start < 0) {
  console.log("[patch-nav-menu] menu block not found");
  process.exit(0);
}
const endMark = ") : null}\n      </header>";
let end = t.indexOf(endMark, start);
if (end < 0) {
  end = t.indexOf(") : null}\r\n      </header>", start);
}
if (end < 0) {
  console.log("[patch-nav-menu] menu end not found");
  process.exit(0);
}
end = end + ") : null}".length;
t = t.slice(0, start) + t.slice(end);

const oldDock = "{dockReady ? createPortal(dock, document.body) : null}";
if (!t.includes(oldDock)) {
  console.log("[patch-nav-menu] dock portal not found");
  process.exit(0);
}

const portal = `{dockReady && (open || closing)
        ? createPortal(
            <>
              <button
                type="button"
                className={"nav-scrim" + (closing ? " nav-scrim--out" : "")}
                aria-label="Close menu"
                onClick={closeMenu}
              />
              <nav
                id="mobile-nav"
                className={
                  "nav-mobile nav-mobile--frequency" +
                  (closing ? " nav-mobile--out" : "")
                }
                aria-label="More destinations"
              >
                <div className="nav-mobile-head">
                  <p className="nav-mobile-kicker">More</p>
                  <p className="nav-mobile-sub">
                    Catalog, moods, account — primary tabs stay on the dock
                  </p>
                </div>
                <ul>
                  {[...PRIMARY, ...MORE].map((l) => {
                    const active = isActive(pathname, l.href);
                    return (
                      <li key={l.href + l.label}>
                        <Link
                          href={l.href}
                          className={
                            "nav-mobile-link" + (active ? " active" : "")
                          }
                          aria-current={active ? "page" : undefined}
                          onClick={() => closeMenu()}
                        >
                          <span className="nav-mobile-main">
                            <span className="nav-mobile-label">{l.label}</span>
                            {l.poetic ? (
                              <span className="nav-mobile-poetic">{l.poetic}</span>
                            ) : null}
                          </span>
                          {active ? (
                            <span className="nav-mobile-here">Here</span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <div className="nav-mobile-foot">
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => {
                      closeMenu();
                      onSearch();
                    }}
                  >
                    Open search
                  </Button>
                  {ready && session ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        disconnect();
                        playCue("filter_select");
                        closeMenu();
                      }}
                    >
                      Log out · {session.username}
                    </Button>
                  ) : null}
                  <NavSoundToggle />
                </div>
              </nav>
            </>,
            document.body,
          )
        : null}

      {dockReady ? createPortal(dock, document.body) : null}`;

t = t.replace(oldDock, portal);

const pathClose = `  useEffect(() => {
    setOpen(false);
    setClosing(false);
  }, [pathname]);
`;
if (t.includes(pathClose) && !t.includes("document.body.style.overflow")) {
  t = t.replace(
    pathClose,
    pathClose +
      `
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
`,
  );
}

fs.writeFileSync(file, t);
console.log("[patch-nav-menu] portaled mobile menu to body", t.length);
