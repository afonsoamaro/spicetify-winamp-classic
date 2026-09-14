# [PP-05] Prototype: cards, buttons, inputs, modals, menus and cover art

## Type
Prototype (visual only)

## Description
The rest of the app gets the same 3D bevel and square corners: Home cards, generic buttons, inputs, modals, context menus, tooltips and cover art images.

## Visual Elements
- Cards with a `var(--spice-card)` background, a raised bevel, and hover brightening the light edge. Card title in green, subtitle in `var(--spice-subtext)`.
- Primary buttons with a `var(--spice-button)` background, a raised bevel and black text. Pressed inverts the bevel.
- Secondary and icon buttons with the bevel only, no fill.
- Inputs and selects as a sunken black display with green text.
- Modals with the panel background, a raised bevel and a title bar with the gradient and white pixel text.
- Context menus and dropdowns with the panel background, items in green, the hovered item with a blue background and white text.
- Black tooltips with green pixel text.
- Cover art and avatars with a 2px sunken border and no rounding, including the round profile avatar.
- Toasts and notifications with a `var(--spice-notification)` background and white text.

## Layout Notes
- One commented block per element. Keep Spotify's sizes and spacing.

## Mock Data
- Home with cards, the context menu of a track, the create playlist modal, the tooltip of any button.

## Acceptance Criteria
- [ ] Cards, buttons, inputs and modals with bevels and no rounding.
- [ ] Context menu and dropdowns in the panel style with blue hover.
- [ ] Square cover art and avatars with a sunken border.
- [ ] No text ended up unreadable because of contrast.
- [ ] Screenshots at `docs/screenshots/home.png`, `docs/screenshots/context-menu.png` and `docs/screenshots/modal.png`.

## Dependencies
- PP-01

---

# Implementation Plan

Research done on 2026-09-14 against Spotify 1.2.99.317, in the order that has worked since PP-03: the two actively maintained themes in the official collection, then Spicetify's class map, then every name checked against the bundle before it entered this plan.

## Prerequisites
- PP-01 through PP-04 done. This is the last CSS issue; it covers everything the earlier blocks did not claim.

## Reusable Code Found
- `user.css:28-42`: the `:root` block. This issue introduces no new colour.
- The key recipe, written three times already (transport keys, library keys, nav keys): `var(--spice-button)` fill, `var(--wa-raised)`, black icon or label, `var(--wa-sunken)` on press, and on hover a lighter gray with the label in `var(--spice-text)`. PP-04 settled the hover after two rounds with the owner: gray alone was too faint, and Spotify's default hover paints the theme's highlight blue under black text.
- The display recipe (black, sunken, green pixel text) for inputs, from the search field.
- The title strip recipe (gradient, white pixel text) for modal headers, from the library header.
- `[class*="chip" i]` from PP-04: substring matching on a design-system class when the element has no readable name. This issue leans on it for buttons and inputs.
- The lessons at the end of PP-02 and PP-04: ties on specificity go to Spotify, the element name in a selector breaks a tie, and `main-topBar-*` is the fading strip, not the navigation.

## Selectors, verified in this build
Readable and present:

- Cards: `.main-card-card`, `.main-card-cardLink`, `.main-card-imageContainer`, `.main-cardImage-imageWrapper`, `.main-cardImage-image`, `.main-card-cardMetadata`, `.main-cardHeader-text`, `.main-cardSubHeader-root`, `.main-card-PlayButtonContainer` (the green play that floats over a card on hover).
- Context menus and dropdowns: `.main-contextMenu-menu`, `.main-contextMenu-menuItem`, `.main-contextMenu-menuItemButton`, `.main-dropDown-dropDown`.
- Modals: `.GenericModal` and `.GenericModal__overlay`. The playlist edit dialog inside is `.main-playlistEditDetailsModal-*` (`-title`, `-textElement`, `-description`).
- Images: `.main-image-image`, `.main-entityHeader-image`, `.main-avatar-image` (the profile picture at the top right), `.main-coverSlotCollapsed-container`.
- Buttons with readable names: `.main-genericButton-button` and `.main-genericButton-buttonActive`, `.main-actionBar-ActionBar`, `.main-playButton-PlayButton`.
- Tooltips: nothing readable, but the element carries `role="tooltip"`.

Design-system classes, version-prefixed and reached by substring:

- Buttons are `.e-10810-button` with modifiers `--secondary-bordered`, `--tertiary`, `--active`, `--disabled`. The `10810` is a build number and will change, so the selector is `[class*="-button" i]` narrowed by `button` and by the modifier substring where it matters.
- Inputs are `.e-10810-form-input`, reached as `[class*="-form-input" i]`.

Gone or never readable, do not use: `main-contextMenu-disabled`, `main-avatar-avatar`, `main-modal-container`, `main-popupModal-content`, `main-tooltip-*`, `main-notificationBubble-*`, `main-buttons-button`.

## Architecture Decisions
- **One hover rule, defined once, applied everywhere in this block.** Fill lightens to `var(--wa-bevel-light)`, label goes `var(--spice-text)`. It matches what PP-04 landed on and what the owner approved, and it pre-empts the highlight-blue problem in every new button.
- **Play stays green.** The owner kept the green play in the now playing bar; the green play on cards and in the action bar follows, with a raised bevel added so it reads as a key. `.main-playButton-PlayButton` and `.main-card-PlayButtonContainer` are excluded from the gray key rule.
- **Substring matching for design-system classes, scoped.** `button[class*="-button" i]` inside `.main-view-container`, `.GenericModal` and `.main-contextMenu-menu`, never at the root, so it cannot reach the now playing bar or the sidebar, which have their own rules already.
- **Cards keep their layout.** Only colour, bevel and font change. The image container's radius is already zero from the global reset; the sunken 2px border goes on the image wrapper.
- **The profile avatar loses its circle** through the same global reset that squared everything else; this block only adds the sunken border. The issue asks for square avatars and the reset already delivers that.
- **Toasts are best effort.** No readable class exists for them and the notification library's markup is not in the CSS. `[role="alert"]` and `[role="status"]` are tried, scoped to the body, and the result is recorded either way. Not an acceptance criterion by itself.
- **Nothing structural.** No `display`, `position`, `overflow` or size on cards, menus or modals. Menus are positioned by Spotify against the pointer and modals are centred by it.

## Files to Create
None.

## Files to Modify
| File | Changes |
|------|---------|
| `user.css` | fills the `/* === Cards, buttons, inputs, modals, menus, covers === */` block |

### user.css, cards
- `.main-card-card`: `var(--spice-card)` fill, `var(--wa-raised)`. On hover the fill lightens.
- `.main-cardImage-imageWrapper`: 2px `var(--wa-bevel-dark)` border and `var(--wa-sunken)`.
- `.main-cardHeader-text` in `var(--spice-text)`, `.main-cardSubHeader-root` in `var(--spice-subtext)`, both in the pixel font at 11px, uppercase, clipped.
- `.main-card-PlayButtonContainer button`: `var(--wa-raised)` on the green.

### user.css, buttons
- Inside `.main-view-container`, `.GenericModal` and `.main-contextMenu-menu`: `button[class*="-button" i]` takes the key recipe, `[class*="--secondary" i]` and `[class*="--tertiary" i]` take the bevel with no fill, and the hover rule covers all of them. `.main-playButton-PlayButton` is excluded.
- `.main-actionBar-ActionBar button`: same recipe, same exclusion.

### user.css, inputs
- `[class*="-form-input" i]` and `.x-filterBox-filterInput` inside `.main-view-container` and `.GenericModal`: the display recipe, with the placeholder in `var(--spice-subtext)`.

### user.css, modals
- `.GenericModal`: `var(--spice-player)` fill, `var(--wa-raised)`. `.GenericModal__overlay` darkens with `var(--wa-display-bg)` at 70% through `color-mix`, which stylelint accepts and keeps the colour a token.
- `.main-playlistEditDetailsModal-title` and any `h1` or `h2` in the modal: the title strip recipe.

### user.css, menus, dropdowns, tooltips
- `.main-contextMenu-menu` and `.main-dropDown-dropDown`: `var(--spice-sidebar)` fill, `var(--wa-raised)`.
- `.main-contextMenu-menuItemButton`: `var(--spice-text)` pixel text at 11px, uppercase; on hover `var(--spice-selected-row)` with `var(--wa-white)`, the same bar as a selected track.
- `[role="tooltip"]`: `var(--wa-display-bg)` fill, `var(--spice-text)` pixel text, `var(--wa-raised)`.

### user.css, images and toasts
- `.main-image-image`, `.main-entityHeader-image`, `.main-avatar-image`: 2px `var(--wa-bevel-dark)` border, `var(--wa-sunken)`.
- `[role="alert"]`, `[role="status"]`: `var(--spice-notification)` fill, `var(--wa-white)` pixel text, `var(--wa-raised)`, recorded as best effort.

## Data Requirements
None.

## Testing Strategy
- No unit test applies. `pnpm check` must pass; stylelint is the gate.
- Visual check on Home (cards, shelf titles), a playlist page (action bar buttons, the Following button on an artist page), the context menu on a track, the create-playlist dialog, a tooltip on any button, and the profile avatar.
- Interaction check: click a card, open and close a context menu, open and close a modal, type in a modal input, and confirm every button still responds.
- Screenshots saved to `docs/screenshots/home.png`, `docs/screenshots/context-menu.png` and `docs/screenshots/modal.png`, which the issue asks for. The menu and the modal need the pointer, so the owner captures those two.

## Implementation Order
1. Cards, then look at Home.
2. Buttons and inputs.
3. Context menus, dropdowns, tooltips.
4. Modals.
5. Images and the avatar.
6. Toasts, best effort.
7. `pnpm check`, the interaction pass, the screenshots.

## Unknowns
- Whether `button[class*="-button" i]` catches the encore button or a wrapper. The chips needed the element requirement dropped; buttons may need the same. Decide on screen.
- Whether the toast markup carries any ARIA role. If not, toasts stay Spotify's and the issue says so.
- Whether the modal's own scrollable body uses OverlayScrollbars, which PP-04 already styled, or a native scrollbar. If native, it stays native.
