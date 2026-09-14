# [FN-07] Spotify 1.3.0 compatibility

## Type
Functional (maintenance)

## Description
Spotify updated from 1.2.99.317 to 1.3.0.277 during PP-05 and stopped emitting some of the readable class names the theme relies on. Spicetify 2.45.0 brought a class map that restored most of them. Six did not come back, and the parts of the theme built on them render in Spotify's own font and colour.

## Requirements
- Find the name each broken selector now resolves to in 1.3.0, reading the bundle for `className:"..."` rather than counting occurrences, since the Marketplace app ships copies of the old names.
- Prefer, in this order: a readable name the new map restored, an ARIA attribute, a substring match on a design-system class, and only then a generated class recorded with its Spotify build.
- Where a name has no replacement in the map, contribute it upstream to Spicetify's class map, so the next theme does not have to find it again.

## Broken in 1.3.0
| Selector | Where it is used | What stopped rendering |
|---|---|---|
| `main-yourLibraryX-listItem` | sidebar block | library entries fell back to Spotify's font |
| `main-trackList-rowMainContentTitle` | track list block | track titles fell back to Spotify's font |
| `main-trackList-duration` | track list block | durations turned white |
| `main-cardHeader-text` | cards block | card titles fell back to Spotify's font |
| `main-cardSubHeader-root` | cards block | card subtitles fell back to Spotify's font |
| `main-shelf-title` | top bar block | shelf headings on Home fell back to Spotify's font |

Everything else survived, including the three generated class names for the playing row, repeat and shuffle.

## Acceptance Criteria
- [ ] Each of the six renders again on 1.3.0, confirmed on screen.
- [ ] No new generated class name unless the issue records why nothing better exists.
- [ ] The post-update ritual is in the README: `spicetify update`, then `spicetify backup apply`.
- [ ] Any name found by hand is proposed to Spicetify's class map.

## Dependencies
- PP-05
