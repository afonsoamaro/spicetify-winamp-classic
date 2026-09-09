# [PP-01] Prototype: base, pixel font and bevel utilities

## Type
Prototype (visual only)

## Description
The foundation of `user.css`: the embedded pixel font, the utility classes for the 3D bevels, and the global removal of rounded corners. Everything the other PP issues build on.

## Visual Elements
- `@font-face` for Silkscreen (SIL OFL) with `src: url(data:font/woff2;base64,...)`, generated from the official woff2 by a single Node script in `scripts/embed-font.js`.
- Variables in `:root`: `--wa-bevel-light` #5a5a6e, `--wa-bevel-dark` #14141c, `--wa-titlebar-start` #1c1c2a, `--wa-titlebar-end` #3a3a52, `--wa-white` #ffffff, and `--wa-font-pixel` with Silkscreen plus a monospace fallback.
- Reusable utility selectors that work as mixins inside the CSS: raised bevel (light on the top and left, dark on the bottom and right) and sunken bevel (the reverse), always through a 1px inset `box-shadow`.
- A global `border-radius: 0` rule on every element of the app.

## Layout Notes
- Pixel font at a minimum size of 11px, and only where the following PP issues ask for it. The rest of the app keeps Spotify's default font.
- No literal color outside `:root` and `color.ini`. Rules use `var(--spice-*)` and `var(--wa-*)`.

## Mock Data
- Not applicable. The check happens in Spotify with the palette from FN-00.

## Acceptance Criteria
- [ ] The font loads in local Spotify with no external request (confirm in DevTools that no font request goes out).
- [ ] No element of the app has a rounded corner.
- [ ] stylelint passes, with no `border-radius` other than 0 and no literal color outside `:root`.
- [ ] `user.css` stays under 200 KB with the font embedded.

## Dependencies
- FN-00
