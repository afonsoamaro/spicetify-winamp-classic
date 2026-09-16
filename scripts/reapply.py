#!/usr/bin/env python3
"""Reapply the Winamp Classic theme after a Spotify restart or update.

A Spotify *update* (and sometimes a plain relaunch) wipes Spicetify's patch,
and the app comes back with the stock look. This script performs the whole
ritual: it checks the preconditions, fixes the symlink and the Spicetify
config, takes a fresh backup and applies the theme, then verifies the patch
landed by looking for the theme fingerprint in Spotify's files.

Usage:  python3 scripts/reapply.py
"""

from __future__ import annotations

import os
import plistlib
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SPOTIFY_APP = Path("/Applications/Spotify.app")
XPUI_DIR = SPOTIFY_APP / "Contents/Resources/Apps/xpui"
THEMES_DIR = Path.home() / ".config/spicetify/Themes"
LINK_NAME = "WinampClassic"
EXPECTED_CONFIG = {
    "current_theme": "WinampClassic",
    "color_scheme": "Classic",
    "inject_css": "1",
    "inject_theme_js": "1",
    "replace_colors": "1",
}
# Theme fingerprint: must appear in Spotify's patched CSS after apply.
MARKER = "--wa-font-pixel"


def fail(message: str) -> "NoReturn":
    print(f"reapply: error: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    if subprocess.run(["spicetify", "--version"], capture_output=True).returncode != 0:
        fail("spicetify binary not found on PATH")
    if not SPOTIFY_APP.is_dir():
        fail(f"{SPOTIFY_APP} not found")
    if not (REPO / "theme.js").is_file():
        fail("theme.js missing: run `pnpm build` first")
    for name in ("manifest.json", "user.css", "color.ini"):
        if not (REPO / name).is_file():
            fail(f"{name} missing in {REPO}")

    with open(SPOTIFY_APP / "Contents/Info.plist", "rb") as handle:
        version = plistlib.load(handle).get("CFBundleShortVersionString", "?")
    spicetify_version = subprocess.run(
        ["spicetify", "--version"], capture_output=True, text=True
    ).stdout.strip()
    print(f"reapply: Spotify {version}, Spicetify {spicetify_version}")

    link = THEMES_DIR / LINK_NAME
    try:
        same = link.is_symlink() and os.path.samefile(link, REPO)
    except OSError:
        same = False
    if not same:
        THEMES_DIR.mkdir(parents=True, exist_ok=True)
        if link.is_symlink() or link.exists():
            link.unlink()
        link.symlink_to(REPO)
        print(f"reapply: linked {link} -> {REPO}")
    else:
        print(f"reapply: symlink ok ({link} -> {REPO})")

    for key, want in EXPECTED_CONFIG.items():
        proc = subprocess.run(["spicetify", "config", key, want], capture_output=True, text=True)
        if proc.returncode != 0:
            fail(f"spicetify config {key}: {proc.stderr.strip()}")
    print("reapply: config ok (WinampClassic/Classic, css+js inject, replace_colors)")

    # A stale backup from a previous Spotify build makes `backup apply`
    # refuse. Restoring first is always safe (stock files back in place) and
    # makes the ritual idempotent; its failure just means there was nothing
    # to restore.
    print("reapply: restoring stock Spotify before the fresh backup...")
    subprocess.run(["spicetify", "restore"], capture_output=True)

    print("reapply: running `spicetify backup apply` (Spotify will restart)...")
    proc = subprocess.run(["spicetify", "backup", "apply"])
    if proc.returncode != 0:
        fail("spicetify backup apply failed; output above")

    hits = [path for path in XPUI_DIR.glob("*.css") if MARKER in path.read_text(errors="replace")]
    if not hits:
        fail(f"theme fingerprint {MARKER!r} not found in {XPUI_DIR}: patch did not land")
    print(f"reapply: theme applied ({MARKER!r} found in {', '.join(p.name for p in hits)})")


if __name__ == "__main__":
    main()
