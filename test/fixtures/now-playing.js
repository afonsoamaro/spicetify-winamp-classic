// @ts-check
// The now playing bar as Spotify 1.3.5 renders it, cut down to what the theme
// anchors on: the ASIDE with its test id, the inner bar, and the widget with
// the cover (a test id of its own), the text block (none) and the action
// buttons. None of the classes are readable; that is the point.

/** The widget: the display is its text block, the child with no test id and no button. */
export const WIDGET_HTML =
  '<div data-testid="now-playing-widget" role="region">' +
  '<div data-testid="CoverSlotCollapsed__container"><button data-testid="cover-art-button"></button></div>' +
  '<div class="hL0b"><div class="bXWo"><span>title</span></div><div class="rxts"><span>artist</span></div></div>' +
  '<div class="uUCH"><button data-encore-id="buttonTertiary"></button></div>' +
  '</div>';

/** @param {string} [inner] markup inside the inner bar, after the left column */
export function barHtml(inner = '') {
  return `<aside data-testid="now-playing-bar"><div class="dhrE"><div class="GT3b">${inner}</div></div></aside>`;
}

/** The bar with a widget inside, ready to set as body markup. */
export const BAR_WITH_WIDGET_HTML = barHtml(WIDGET_HTML);

/** @returns {HTMLElement} the text block of the widget in the document */
export function displayInDocument() {
  return /** @type {HTMLElement} */ (document.querySelector('[data-testid="now-playing-widget"] > div:not([data-testid], :has(button))'));
}

/** @returns {HTMLElement} the inner bar in the document */
export function innerBarInDocument() {
  return /** @type {HTMLElement} */ (document.querySelector('[data-testid="now-playing-bar"] > div'));
}

/**
 * Appends a fresh widget to `parent`, the way Spotify remounts it.
 * @param {Element} parent
 */
export function appendWidget(parent) {
  parent.insertAdjacentHTML('beforeend', WIDGET_HTML);
}
