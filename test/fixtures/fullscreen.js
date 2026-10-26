// @ts-check
// The expanded Now Playing view as Spotify 1.3.6 renders it, cut down to what
// the theme anchors on: no test id, no role, no readable class. A header with a
// group of Encore buttons (More options, Enter Full screen, Minimize) and the
// big cover with role="img". The player bar and the sidebar carry covers of
// their own, which must never be taken for the view.

// The header buttons are radio-like icon buttons: Spotify's own classes, a role,
// aria-checked, the Encore id, and an icon in a span. The toggle borrows all of it.
const ICON = '<span aria-hidden="true" class="icon-wrap"><svg data-encore-id="icon" role="img" aria-hidden="true" class="icon-cls" viewBox="0 0 16 16" width="16" height="16"><path d="M0 0z"></path></svg></span>';

/** @param {string} label @param {boolean} checked */
const headerButton = (label, checked) =>
  `<button class="btn-cls btn-tertiary" role="radio" value="${label}" aria-checked="${checked}" aria-label="${label}" data-encore-id="buttonTertiary">${ICON}</button>`;

export const FULLSCREEN_VIEW_HTML =
  '<div id="view">' +
  '<div class="hdr"><div id="group">' +
  headerButton('Show artwork', true) +
  headerButton('Show lyrics', false) +
  headerButton('More options', false) +
  '</div></div>' +
  '<div class="body"><div class="cover" role="img" aria-label="Track artwork"></div></div>' +
  '</div>';

/** Covers that are not the view's: the player bar's and the sidebar's. */
export const OTHER_COVERS_HTML =
  '<aside data-testid="now-playing-bar"><div role="img" aria-label="Small artwork"></div></aside>' +
  '<aside aria-label="Now playing view"><div role="img" aria-label="Side artwork"></div></aside>';
