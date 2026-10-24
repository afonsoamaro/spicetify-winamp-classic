// @ts-check
// The right sidebar as Spotify 1.3.6 renders it, cut down to what the theme
// anchors on: an ASIDE without a test id (the player bar is the other ASIDE,
// and has one), a scroller (overflow-y auto) with one child, the content, whose
// first block is the cover or the video.

/** The player bar's own ASIDE, which must never be taken for the sidebar. */
export const PLAYER_BAR_HTML = '<aside data-testid="now-playing-bar"><div></div></aside>';

/** @param {string} [mediaHtml] the first block of the content */
export function sidebarHtml(mediaHtml = '<div class="cover" role="img">cover</div>') {
  return (
    '<aside aria-label="Now playing view"><div><div id="scroller" style="overflow-y: auto">' +
    `<div id="content">${mediaHtml}<div class="credits">credits</div></div>` +
    '</div></div></aside>'
  );
}

/** The sidebar with a playing video, which Spotify draws in the same first block. */
export const SIDEBAR_WITH_VIDEO_HTML = sidebarHtml('<div class="media"><video></video></div>');
