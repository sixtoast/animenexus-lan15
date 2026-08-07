#!/usr/bin/env python3
"""Rebuild public/index.html and styles/lantern.css from gzipped base64 parts."""
from pathlib import Path
import base64, gzip

root = Path(__file__).resolve().parent
out = root.parent

def load_parts(prefix):
    parts = sorted(root.glob(f"{prefix}*"))
    return "".join(p.read_text().strip() for p in parts)

# HTML from parts
html_b64 = load_parts("index.gz.part")
html = gzip.decompress(base64.b64decode(html_b64))
(out / "public").mkdir(exist_ok=True)
(out / "public" / "index.html").write_bytes(html)
print(f"Wrote public/index.html ({len(html)} bytes)")

# CSS single blob
css_b64 = (root / "lantern.css.gz.b64").read_text().strip()
css = gzip.decompress(base64.b64decode(css_b64))
(out / "styles").mkdir(exist_ok=True)
(out / "styles" / "lantern.css").write_bytes(css)
print(f"Wrote styles/lantern.css ({len(css)} bytes)")
print("Done.")
