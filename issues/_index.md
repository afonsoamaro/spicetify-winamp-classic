# Winamp Classic: issue index

Source: `SPECS.md`. Spicetify theme that recreates the Winamp 2.x look with CSS, an embedded pixel font and a small extension for the spectrum analyzer, marquee and title bar. Publishable on the Marketplace.

## Setup (do this first)
| Issue | Name | Status | Dependencies |
|-------|------|--------|--------------|
| FN-00 | Base setup and quality gate | ✅ done (Sep 7) | none |
| FN-00b | Git repository and GitHub | ✅ done (Sep 9) | FN-00 |

## Prototype Issues (visual, CSS only)
| Issue | Name | Status | Dependencies |
|-------|------|--------|--------------|
| PP-01 | Base, pixel font and bevel utilities | ✅ done (Sep 10) | FN-00 |
| PP-02 | Now playing bar as the main panel | ✅ done (Sep 12) | PP-01 |
| PP-03 | Track list as the playlist window | ✅ done (Sep 13) | PP-01 |
| PP-04 | Sidebar, top bar, navigation and scrollbars | ✅ done (Sep 13) | PP-01 |
| PP-05 | Cards, buttons, inputs, modals, menus and cover art | planned | PP-01 |

## Functional Issues (extension and release)
| Issue | Name | Status | Dependencies |
|-------|------|--------|--------------|
| FN-01 | Extension skeleton and build script | todo | FN-00, PP-02 |
| FN-02 | Time formatting and display marquee | todo | FN-01 |
| FN-03 | Synthetic spectrum analyzer in the display | todo | FN-01 |
| FN-04 | Spectrum analyzer synced with getAudioData (spike, optional) | todo | FN-03 |
| FN-05 | WINAMP title bar | todo | FN-01, PP-02 |
| FN-06 | Marketplace release | todo | FN-00b, PP-01 to PP-05, FN-02, FN-03, FN-05 |

## Critical path
FN-00 → FN-00b → PP-01 → PP-02 → FN-01 → FN-02 → FN-03 → FN-05 → FN-06.
PP-03, PP-04 and PP-05 are independent of each other once PP-01 is done. FN-04 can be closed as not applicable.
