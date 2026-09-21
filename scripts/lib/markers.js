// @ts-check
// Replaces a generated block inside a hand-written file, delimited by a pair
// of marker comments. Used by the embed:* scripts so user.css can carry
// generated content (the inlined font, the colour scheme) next to the rules
// written by hand.

/**
 * Replaces whatever sits between the markers, keeping the markers themselves.
 * @param {string} css
 * @param {string} block
 * @param {{ start: string, end: string }} markers
 * @returns {string}
 */
export function replaceBlock(css, block, { start, end }) {
  const from = css.indexOf(start);
  const to = css.indexOf(end);
  if (from === -1 || to === -1 || to < from) {
    throw new Error(`user.css must contain ${start} and ${end}, in that order`);
  }
  // The blank line before the end marker keeps stylelint's
  // comment-empty-line-before happy in the generated file.
  return `${css.slice(0, from + start.length)}\n${block}\n\n${css.slice(to)}`;
}
