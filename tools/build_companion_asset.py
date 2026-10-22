#!/usr/bin/env python3
"""Build the self-contained Yaya companion asset for the Flutter WebView.

The editable source lives in pet-building/companion/index.html. Flutter's
loadFlutterAsset cannot resolve the relative source files used by the preview
page, so release builds inline every script into one HTML file.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

PET_ROOT = Path(__file__).resolve().parents[1]
COMPANION_DIR = PET_ROOT / "companion"
SOURCE_HTML = COMPANION_DIR / "index.html"


def inline_scripts(html: str) -> str:
    pattern = re.compile(r'<script\s+src="([^"]+)"\s*></script>')

    def replace(match: re.Match[str]) -> str:
        relative = match.group(1).split("?", 1)[0]
        path = (COMPANION_DIR / relative).resolve()
        if not path.is_file():
            raise FileNotFoundError(f"companion script not found: {path}")
        body = path.read_text(encoding="utf-8")
        if "</script" in body.lower():
            raise ValueError(f"script contains a closing tag and cannot be inlined: {path}")
        return f"<script>\n{body}\n</script>"

    return pattern.sub(replace, html)


def main() -> None:
    app_root = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else None
    if app_root is None:
        raise SystemExit("usage: build_companion_asset.py <app-root>")
    html = inline_scripts(SOURCE_HTML.read_text(encoding="utf-8"))
    target = app_root / "assets" / "pet" / "companion.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html, encoding="utf-8")
    print(f"wrote {target} ({target.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
