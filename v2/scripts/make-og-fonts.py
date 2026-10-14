#!/usr/bin/env python3
"""Regenera v2/lib/cupo/og-fonts.ts (tipografias de marca para la tarjeta OG).

Descarga Space Grotesk (500/700) y JetBrains Mono (400) desde Google Fonts,
instancia el variable en el peso pedido, recorta al subconjunto latin + acentos
+ simbolos que usa la tarjeta y emite los .ttf en base64 dentro de un modulo TS.

Uso (requiere fontTools + brotli):
    python3 v2/scripts/make-og-fonts.py

El resultado (og-fonts.ts) SI se commitea: la tarjeta no depende de la red.
"""
from __future__ import annotations

import base64
import io
import os
import re
import sys
import urllib.request

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.subset import Subsetter, Options

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
OUT = os.path.join(os.path.dirname(__file__), "..", "lib", "cupo", "og-fonts.ts")

# Subconjunto de caracteres que la tarjeta puede mostrar.
UNICODES: list[int] = []
for a, b in [
    (0x20, 0x7E), (0xA0, 0xFF), (0x100, 0x17F),
    (0x2000, 0x200F), (0x2010, 0x201F), (0x2020, 0x2030), (0x2039, 0x203A),
    (0x20AC, 0x20AC), (0x2122, 0x2122), (0x2192, 0x2192), (0x2713, 0x2713),
]:
    UNICODES += list(range(a, b + 1))


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def latin_woff2(family: str, weight: int) -> bytes:
    """URL del woff2 latin (unicode-range que arranca en U+0000-00FF)."""
    css_url = f"https://fonts.googleapis.com/css2?family={family.replace(' ', '+')}:wght@{weight}&display=swap"
    css = fetch(css_url).decode("utf-8")
    # Bloques @font-face con su unicode-range.
    blocks = re.findall(r"@font-face\s*\{(.*?)\}", css, re.S)
    for block in blocks:
        ur = re.search(r"unicode-range:\s*([^;]+);", block)
        if ur and "U+0000-00FF" in ur.group(1):
            url = re.search(r"url\((https://[^)]+\.woff2)\)", block)
            if url:
                return fetch(url.group(1))
    raise SystemExit(f"no encontre el woff2 latin de {family} {weight}")


def build(data: bytes, weight: int) -> bytes:
    f = TTFont(io.BytesIO(data))
    if "fvar" in f:
        instantiateVariableFont(f, {"wght": weight}, inplace=True)
    opts = Options()
    opts.layout_features = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk"]
    opts.notdef_outline = True
    opts.recalc_bounds = True
    opts.drop_tables += ["DSIG"]
    ss = Subsetter(options=opts)
    ss.populate(unicodes=UNICODES)
    ss.subset(f)
    f.flavor = None
    buf = io.BytesIO()
    f.save(buf)
    return buf.getvalue()


def main() -> None:
    sg500 = build(latin_woff2("Space Grotesk", 500), 500)
    sg700 = build(latin_woff2("Space Grotesk", 700), 700)
    jbm400 = build(latin_woff2("JetBrains Mono", 400), 400)

    def b64(b: bytes) -> str:
        return base64.b64encode(b).decode("ascii")

    out = f'''// GENERADO — tipografias de marca para la tarjeta OG (subconjunto latin).
// Space Grotesk 500/700 + JetBrains Mono 400, instancias estaticas del variable
// de Google Fonts, recortadas a latin + acentos + simbolos que usa la tarjeta.
// Regenerar: v2/scripts/make-og-fonts.py (requiere fontTools).
export const OG_FONT_SG_500 = "{b64(sg500)}";
export const OG_FONT_SG_700 = "{b64(sg700)}";
export const OG_FONT_JBM_400 = "{b64(jbm400)}";
'''
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(out)
    print(f"escrito {os.path.normpath(OUT)} ({len(out)} bytes)")


if __name__ == "__main__":
    sys.exit(main())
