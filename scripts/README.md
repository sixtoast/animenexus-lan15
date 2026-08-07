# SPA assets

Run from repo root:

```bash
python3 scripts/reconstitute.py
```

This expands `index.gz.part*` and `lantern.css.gz.b64` into:

- `public/index.html` (full Lantern SPA)
- `styles/lantern.css`

If the part files are missing (e.g. incomplete clone of large blobs), copy your original `index.html` to `public/index.html` instead.
