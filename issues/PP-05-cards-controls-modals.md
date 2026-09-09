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
