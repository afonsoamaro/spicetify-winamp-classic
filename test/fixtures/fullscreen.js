// @ts-check
// The expanded Now Playing view as Spotify 1.3.6 renders it, cut down to what
// the theme anchors on: no test id, no role, no readable class. A header with a
// group of Encore buttons (More options, Enter Full screen, Minimize) and the
// big cover with role="img". The player bar and the sidebar carry covers of
// their own, which must never be taken for the view.

export const FULLSCREEN_VIEW_HTML =
  '<div id="view">' +
  '<div class="hdr"><div id="group">' +
  '<button data-encore-id="buttonTertiary" aria-label="More options">m</button>' +
  '<button data-encore-id="buttonTertiary" aria-label="Enter Full screen">f</button>' +
  '<button data-encore-id="buttonTertiary" aria-label="Minimize Now Playing view">x</button>' +
  '</div></div>' +
  '<div class="body"><div class="cover" role="img" aria-label="Track artwork"></div></div>' +
  '</div>';

/** Covers that are not the view's: the player bar's and the sidebar's. */
export const OTHER_COVERS_HTML =
  '<aside data-testid="now-playing-bar"><div role="img" aria-label="Small artwork"></div></aside>' +
  '<aside aria-label="Now playing view"><div role="img" aria-label="Side artwork"></div></aside>';
