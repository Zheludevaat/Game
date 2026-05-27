# Fonts — Credits

## `abyss-glyphs.woff2`

A custom 8 KB subset of **Noto Sans Symbols 2** containing only the
33 unique alchemical, astrological, and weapon glyphs the game
actually references (☿ 🜔 ♄ ♀ ✦ etc.). Used as a fallback so the
glyphs render identically pixel-monochrome on iOS Safari, Android
Chrome, and desktop browsers — without this, several SMP alchemy
characters (U+1F702 etc.) fall back to colour emoji or
`.notdef` boxes depending on system fonts.

Source: <https://fonts.google.com/noto/specimen/Noto+Sans+Symbols+2>
License: SIL Open Font License 1.1
<https://scripts.sil.org/OFL>

Downloaded 2026-05-27 from
<https://fonts.gstatic.com/s/notosanssymbols2/v25/I_uyMoGduATTei9eI8daxVHDyfisHr71ypM.ttf>
and subset with `pyftsubset` to the exact code-point range used by
`src/game/data/{relics,spells,weapons,consumables,spheres,statusEffects}.ts`.

To regenerate after adding a new glyph:
```
pyftsubset notosanssymbols2.ttf \
  --unicodes="2604,2609,2620,263D,263E,263F,2640,2642,2643,2644,2646,2665,2692,2693,2694,2696,269B,26A1,26B7,271A,2726,2734,2744,2745,2746,29D6,1F525,1F5E1,1F6E1,1F702,1F70D,1F714,1F738,1F73A,1FA93,<new-hex>" \
  --output-file=public/fonts/abyss-glyphs.woff2 --flavor=woff2
```
